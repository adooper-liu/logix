/**
 * 滞港费日期批量写回定时任务
 * Demurrage Write-Back Scheduler
 *
 * 对「last_free_date 为空且已到目的港」「已提柜但 last_return_date 为空」的货柜
 * 批量计算并写回最晚提柜日/最晚还箱日
 *
 * 同时轮转预计算 ext_demurrage_records，避免永远只刷新货柜列表首页。
 */

import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { Country } from '../entities/Country';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { PortOperation } from '../entities/PortOperation';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { DemurrageService } from '../services/demurrage.service';
import { DistributedLock, generateSchedulerLockKey } from '../utils/DistributedLock';
import { logger } from '../utils/logger';

export class DemurrageWriteBackScheduler {
  private demurrageService: DemurrageService;
  private intervalId: NodeJS.Timeout | null = null;
  private currentExecution: Promise<void> | null = null;
  /** 轮转分页游标：跨次调度推进，避免永远只刷新物理首页 */
  private nextOffset = 0;

  constructor(demurrageService?: DemurrageService) {
    this.demurrageService =
      demurrageService ??
      new DemurrageService(
        AppDataSource.getRepository(ExtDemurrageStandard),
        AppDataSource.getRepository(Container),
        AppDataSource.getRepository(PortOperation),
        AppDataSource.getRepository(SeaFreight),
        AppDataSource.getRepository(TruckingTransport),
        AppDataSource.getRepository(EmptyReturn),
        AppDataSource.getRepository(ReplenishmentOrder),
        AppDataSource.getRepository(Country),
        AppDataSource.getRepository(ExtDemurrageRecord)
      );
  }

  /**
   * 启动定时任务
   * @param intervalMinutes 间隔时间（分钟），默认 360（6 小时）
   * @param delaySeconds 首次执行延迟（秒），默认5秒（启动优化：避免启动时阻塞）
   */
  start(intervalMinutes: number = 360, delaySeconds: number = 5): void {
    if (this.intervalId) {
      logger.warn('[DemurrageWriteBackScheduler] Scheduler already running');
      return;
    }

    logger.info(
      `[DemurrageWriteBackScheduler] Starting scheduler with ${intervalMinutes} minute interval, ` +
        `first execution delayed ${delaySeconds}s`
    );

    const intervalMs = intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      void this.executeTask();
    }, intervalMs);

    // 延迟首次执行（启动优化）
    const delayMs = delaySeconds * 1000;
    setTimeout(() => {
      void this.executeTask();
      logger.info('[DemurrageWriteBackScheduler] First execution completed after initial delay');
    }, delayMs);

    logger.info('[DemurrageWriteBackScheduler] Scheduler started successfully');
  }

  stop(): void {
    if (!this.intervalId) {
      logger.warn('[DemurrageWriteBackScheduler] Scheduler not running');
      return;
    }
    logger.info('[DemurrageWriteBackScheduler] Stopping scheduler');
    clearInterval(this.intervalId);
    this.intervalId = null;
    logger.info('[DemurrageWriteBackScheduler] Scheduler stopped successfully');
  }

  /**
   * 优雅停止：先停止定时器，再等待正在执行的任务完成
   */
  async stopAsync(): Promise<void> {
    if (!this.intervalId && !this.currentExecution) {
      logger.warn('[DemurrageWriteBackScheduler] Scheduler not running');
      return;
    }

    logger.info('[DemurrageWriteBackScheduler] Stopping scheduler (waiting for current task)...');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.currentExecution) {
      await this.currentExecution;
    }
    logger.info('[DemurrageWriteBackScheduler] Scheduler stopped successfully');
  }

  private async executeTask(): Promise<void> {
    // In-process reentrancy guard: setInterval can fire while a prior run is still going.
    if (this.currentExecution) {
      logger.info('[DemurrageWriteBackScheduler] Task skipped (previous run still in progress)');
      return;
    }

    const lockKey = generateSchedulerLockKey('demurrage-writeback');
    const task = (async () => {
      const lockedResult = await DistributedLock.executeWithLock(
        lockKey,
        () => this.runBatchTasks(),
        1800,
        true
      );
      if (lockedResult === null) {
        logger.info('[DemurrageWriteBackScheduler] Task skipped (lock held)');
      }
    })();

    this.currentExecution = task;
    try {
      await task;
    } finally {
      this.currentExecution = null;
    }
  }

  private async runBatchTasks(): Promise<void> {
    const startTime = Date.now();
    logger.info('[DemurrageWriteBackScheduler] Starting batch tasks');

    const batchSize = parseInt(process.env.DEMURRAGE_BATCH_SIZE || '200', 10);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const shipmentStart = sixMonthsAgo.toISOString().slice(0, 10);
    const shipmentEnd = new Date().toISOString().slice(0, 10);

    const computeResult = await this.runRotatingComputeBatch(
      batchSize,
      shipmentStart,
      shipmentEnd
    );
    logger.info('[DemurrageWriteBackScheduler] Batch compute records completed', {
      ...computeResult,
      nextOffset: this.nextOffset
    });

    const writeBackResult = await this.demurrageService.runScheduledFreeDateUpdate({
      limitLastFree: Math.floor(batchSize / 2),
      limitLastReturn: Math.floor(batchSize / 2)
    });

    logger.info('[DemurrageWriteBackScheduler] Batch write-back completed', {
      ...writeBackResult,
      computeRecords: computeResult,
      nextOffset: this.nextOffset,
      duration: `${Date.now() - startTime}ms`
    });
  }

  /**
   * 按柜号稳定排序取一页并推进游标；末页或空页后回到 0。
   */
  private async runRotatingComputeBatch(
    batchSize: number,
    shipmentStartDate: string,
    shipmentEndDate: string
  ): Promise<{ computed: number; saved: number; finalized: number; processedCount: number }> {
    let offset = this.nextOffset;
    let result = await this.demurrageService.batchComputeAndSaveRecords({
      shipmentStartDate,
      shipmentEndDate,
      limit: batchSize,
      offset
    });

    // offset 超出列表尾（例如货柜被删除）时，本轮从 0 重试一次，避免空转
    if (result.processedCount === 0 && offset > 0) {
      offset = 0;
      result = await this.demurrageService.batchComputeAndSaveRecords({
        shipmentStartDate,
        shipmentEndDate,
        limit: batchSize,
        offset: 0
      });
    }

    if (result.processedCount < batchSize) {
      this.nextOffset = 0;
    } else {
      this.nextOffset = offset + result.processedCount;
    }

    return result;
  }

  /**
   * 手动触发（用于测试或立即执行）
   */
  async triggerManualUpdate(): Promise<{
    lastFreeWritten: number;
    lastReturnWritten: number;
    lastFreeProcessed: number;
    lastReturnProcessed: number;
  }> {
    logger.info('[DemurrageWriteBackScheduler] Manual write-back triggered');
    return this.demurrageService.runManualFreeDateUpdate({
      limitLastFree: 100,
      limitLastReturn: 100
    });
  }

  /**
   * 手动触发一轮预计算（测试/诊断用，走与定时任务相同的轮转逻辑）
   */
  async triggerManualComputeBatch(): Promise<{
    computed: number;
    saved: number;
    finalized: number;
    processedCount: number;
  }> {
    const batchSize = parseInt(process.env.DEMURRAGE_BATCH_SIZE || '200', 10);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const today = new Date();
    return this.runRotatingComputeBatch(
      batchSize,
      sixMonthsAgo.toISOString().slice(0, 10),
      today.toISOString().slice(0, 10)
    );
  }

  /** 测试/诊断用：当前轮转 offset */
  getNextOffset(): number {
    return this.nextOffset;
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

export const demurrageWriteBackScheduler = new DemurrageWriteBackScheduler();
