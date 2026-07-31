/**
 * 货柜状态定时任务
 * Container Status Scheduler
 * 负责定时批量更新货柜状态
 */

import { ContainerStatusService } from '../services/containerStatus.service';
import { DistributedLock, generateSchedulerLockKey } from '../utils/DistributedLock';
import { logger } from '../utils/logger';

export class ContainerStatusScheduler {
  private statusService: ContainerStatusService;
  private intervalId: NodeJS.Timeout | null = null;
  private currentExecution: Promise<void> | null = null;
  /** 轮转分页游标：跨次调度推进，避免永远只刷新物理首页 */
  private nextOffset = 0;

  constructor(statusService?: ContainerStatusService) {
    this.statusService = statusService ?? new ContainerStatusService();
  }

  /**
   * 启动定时任务
   * @param intervalMinutes 间隔时间（分钟），默认60分钟（1小时）
   * @param delaySeconds 首次执行延迟（秒），默认5秒（启动优化：避免启动时阻塞）
   */
  start(intervalMinutes: number = 60, delaySeconds: number = 5): void {
    if (this.intervalId) {
      logger.warn('[ContainerStatusScheduler] Scheduler already running');
      return;
    }

    logger.info(
      `[ContainerStatusScheduler] Starting scheduler with ${intervalMinutes} minute interval, first execution delayed ${delaySeconds}s`
    );

    // 设置定时任务
    const intervalMs = intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.executeTask();
    }, intervalMs);

    // 延迟首次执行（启动优化）
    const delayMs = delaySeconds * 1000;
    setTimeout(() => {
      this.executeTask();
      logger.info('[ContainerStatusScheduler] First execution completed after initial delay');
    }, delayMs);

    logger.info(`[ContainerStatusScheduler] Scheduler started successfully`);
  }

  /**
   * 停止定时任务（同步，不等待正在执行的任务）
   */
  stop(): void {
    if (!this.intervalId) {
      logger.warn('[ContainerStatusScheduler] Scheduler not running');
      return;
    }

    logger.info('[ContainerStatusScheduler] Stopping scheduler');
    clearInterval(this.intervalId);
    this.intervalId = null;
    logger.info('[ContainerStatusScheduler] Scheduler stopped successfully');
  }

  /**
   * 优雅停止：先停止定时器，再等待正在执行的任务完成
   */
  async stopAsync(): Promise<void> {
    if (!this.intervalId && !this.currentExecution) {
      logger.warn('[ContainerStatusScheduler] Scheduler not running');
      return;
    }

    logger.info('[ContainerStatusScheduler] Stopping scheduler (waiting for current task)...');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.currentExecution) {
      await this.currentExecution;
    }
    logger.info('[ContainerStatusScheduler] Scheduler stopped successfully');
  }

  /**
   * 执行批量更新任务
   */
  private async executeTask(): Promise<void> {
    const lockKey = generateSchedulerLockKey('container-status-recalc');

    // 使用分布式锁防止重叠执行
    const result = await DistributedLock.executeWithLock(
      lockKey,
      async () => {
        const startTime = Date.now();
        logger.info('[ContainerStatusScheduler] Starting batch status update');

        try {
          const batchSize = parseInt(process.env.STATUS_BATCH_SIZE || '200', 10);
          const result = await this.runRotatingBatch(batchSize);
          const duration = Date.now() - startTime;

          logger.info('[ContainerStatusScheduler] Batch status update completed', {
            updatedCount: result.updatedCount,
            processedCount: result.processedCount,
            nextOffset: this.nextOffset,
            duration: `${duration}ms`
          });
        } catch (error) {
          logger.error('[ContainerStatusScheduler] Batch status update failed', error);
        }
      },
      1800, // 30分钟超时
      true // 如果锁已被持有则跳过
    );

    if (result === null) {
      logger.info('[ContainerStatusScheduler] Task skipped (already running)');
    }
  }

  /**
   * 手动触发批量更新（用于测试或立即执行）
   */
  async triggerManualUpdate(): Promise<number> {
    logger.info('[ContainerStatusScheduler] Manual update triggered');
    const batchSize = parseInt(process.env.STATUS_BATCH_SIZE || '200', 10);
    const result = await this.runRotatingBatch(batchSize);
    return result.updatedCount;
  }

  /**
   * 按 containerNumber ASC 取一页并推进游标；末页或空页后回到 0。
   */
  private async runRotatingBatch(
    batchSize: number
  ): Promise<{ updatedCount: number; processedCount: number }> {
    let offset = this.nextOffset;
    let result = await this.statusService.batchUpdateStatuses(batchSize, offset);

    // offset 超出表尾（例如货柜被删除）时，本轮从 0 重试一次，避免空转
    if (result.processedCount === 0 && offset > 0) {
      offset = 0;
      result = await this.statusService.batchUpdateStatuses(batchSize, 0);
    }

    if (result.processedCount < batchSize) {
      this.nextOffset = 0;
    } else {
      this.nextOffset = offset + result.processedCount;
    }

    return result;
  }

  /** 测试/诊断用：当前轮转 offset */
  getNextOffset(): number {
    return this.nextOffset;
  }

  /**
   * 检查调度器是否正在运行
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }
}

// 导出单例实例
export const containerStatusScheduler = new ContainerStatusScheduler();
