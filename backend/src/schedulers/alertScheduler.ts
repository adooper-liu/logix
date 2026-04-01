import { AlertService } from '../services/alertService';
import { logger } from '../utils/logger';

export class AlertScheduler {
  private alertService: AlertService;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.alertService = new AlertService();
  }

  // 启动预警检查调度器
  start(): void {
    // 每小时检查一次预警
    this.intervalId = setInterval(
      async () => {
        try {
          logger.info('[AlertScheduler] 开始定时预警检查');
          await this.alertService.checkAllAlerts();
          logger.info('[AlertScheduler] 定时预警检查完成');
        } catch (error) {
          logger.error('[AlertScheduler] 定时预警检查失败', error);
        }
      },
      60 * 60 * 1000
    ); // 1小时

    logger.info('[AlertScheduler] 预警检查调度器已启动');
  }

  // 停止预警检查调度器
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('[AlertScheduler] 预警检查调度器已停止');
    }
  }

  // 立即执行一次预警检查
  async runOnce(): Promise<void> {
    try {
      logger.info('[AlertScheduler] 手动触发预警检查');
      await this.alertService.checkAllAlerts();
      logger.info('[AlertScheduler] 手动预警检查完成');
    } catch (error) {
      logger.error('[AlertScheduler] 手动预警检查失败', error);
    }
  }
}

export const alertScheduler = new AlertScheduler();
