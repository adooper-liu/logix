/**
 * 滞港费日期批量写回定时任务
 * Demurrage Write-Back Scheduler
 *
 * 对「last_free_date 为空且已到目的港」「已提柜但 last_return_date 为空」的货柜
 * 批量计算并写回最晚提柜日/最晚还箱日
 */

import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { PortOperation } from '../entities/PortOperation';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingTransport } from '../entities/TruckingTransport';
import { DemurrageService } from '../services/demurrage.service';
import { logger } from '../utils/logger';

export class DemurrageWriteBackScheduler {
  private demurrageService: DemurrageService;
  private intervalId: NodeJS.Timeout | null = null;
  private currentExecution: Promise<void> | null = null;

  constructor() {
    this.demurrageService = new DemurrageService(
      AppDataSource.getRepository(ExtDemurrageStandard),
      AppDataSource.getRepository(Container),
      AppDataSource.getRepository(PortOperation),
      AppDataSource.getRepository(SeaFreight),
      AppDataSource.getRepository(TruckingTransport),
      AppDataSource.getRepository(EmptyReturn),
      AppDataSource.getRepository(ReplenishmentOrder),
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
      `[DemurrageWriteBackScheduler] Starting scheduler with ${intervalMinutes} minute interval, first execution delayed ${delaySeconds}s`
    );

    const intervalMs = intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.executeTask();
    }, intervalMs);

    // 延迟首次执行（启动优化）
    const delayMs = delaySeconds * 1000;
    setTimeout(() => {
      this.executeTask();
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
    const task = (async () => {
      const startTime = Date.now();
      logger.info('[DemurrageWriteBackScheduler] Starting batch tasks');

      try {
        const batchSize = parseInt(process.env.DEMURRAGE_BATCH_SIZE || '200', 10);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const today = new Date();
        const shipmentStart = sixMonthsAgo.toISOString().slice(0, 10);
        const shipmentEnd = today.toISOString().slice(0, 10);

        const computeResult = await this.demurrageService.batchComputeAndSaveRecords({
          shipmentStartDate: shipmentStart,
          shipmentEndDate: shipmentEnd,
          limit: batchSize
        });
        logger.info('[DemurrageWriteBackScheduler] Batch compute records completed', computeResult);

        const writeBackResult = await this.demurrageService.runScheduledFreeDateUpdate({
          limitLastFree: Math.floor(batchSize / 2),
          limitLastReturn: Math.floor(batchSize / 2)
        });
        const duration = Date.now() - startTime;

        logger.info('[DemurrageWriteBackScheduler] Batch write-back completed', {
          ...writeBackResult,
          computeRecords: computeResult,
          duration: `${duration}ms`
        });
      } catch (error) {
        logger.error('[DemurrageWriteBackScheduler] Batch task failed', error);
      } finally {
        this.currentExecution = null;
      }
    })();
    this.currentExecution = task;
    await task;
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

  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

export const demurrageWriteBackScheduler = new DemurrageWriteBackScheduler();
