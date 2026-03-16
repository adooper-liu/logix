/**
 * 错误监控器
 * Error Monitor
 * 
 * 监控和分析系统错误，提供错误统计和告警
 */

import { logger } from '../../utils/logger';
import { ErrorType, ErrorSeverity, AppError } from './errorManager';

/**
 * 错误统计接口
 */
export interface ErrorStats {
  total: number;
  byType: Record<ErrorType, number>;
  bySeverity: Record<ErrorSeverity, number>;
  byStatusCode: Record<number, number>;
  recentErrors: AppError[];
  errorRates: {
    lastHour: number;
    lastDay: number;
    lastWeek: number;
  };
}

/**
 * 告警级别
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

/**
 * 告警接口
 */
export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  timestamp: Date;
  details?: any;
  resolved: boolean;
}

/**
 * 错误监控器类
 */
export class ErrorMonitor {
  private errorStore: AppError[] = [];
  private alerts: Alert[] = [];
  private alertIdCounter = 0;
  private maxErrorStoreSize = 1000;
  private maxRecentErrors = 50;

  /**
   * 记录错误
   */
  recordError(error: AppError): void {
    // 添加错误到存储
    this.errorStore.unshift(error);

    // 限制存储大小
    if (this.errorStore.length > this.maxErrorStoreSize) {
      this.errorStore = this.errorStore.slice(0, this.maxErrorStoreSize);
    }

    // 检查是否需要生成告警
    this.checkForAlerts(error);
  }

  /**
   * 检查是否需要生成告警
   */
  private checkForAlerts(error: AppError): void {
    // 基于错误严重程度生成告警
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.generateAlert(
        AlertLevel.CRITICAL,
        `Critical error detected: ${error.message}`,
        { errorType: error.type, statusCode: error.statusCode }
      );
    } else if (error.severity === ErrorSeverity.HIGH) {
      this.generateAlert(
        AlertLevel.WARNING,
        `High severity error: ${error.message}`,
        { errorType: error.type, statusCode: error.statusCode }
      );
    }

    // 检查错误率
    const errorRate = this.calculateErrorRate(60 * 60 * 1000); // 1小时
    if (errorRate > 10) { // 每小时超过10个错误
      this.generateAlert(
        AlertLevel.WARNING,
        `High error rate detected: ${errorRate.toFixed(2)} errors/hour`,
        { errorRate }
      );
    }
  }

  /**
   * 生成告警
   */
  private generateAlert(level: AlertLevel, message: string, details?: any): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${this.alertIdCounter++}`,
      level,
      message,
      timestamp: new Date(),
      details,
      resolved: false
    };

    this.alerts.unshift(alert);

    // 记录告警
    switch (level) {
      case AlertLevel.CRITICAL:
        logger.error('Critical Alert:', alert);
        break;
      case AlertLevel.WARNING:
        logger.warn('Warning Alert:', alert);
        break;
      case AlertLevel.INFO:
        logger.info('Info Alert:', alert);
        break;
    }
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(timeWindowMs: number): number {
    const now = Date.now();
    const errorsInWindow = this.errorStore.filter(
      error => now - error.timestamp.getTime() <= timeWindowMs
    );

    return (errorsInWindow.length / (timeWindowMs / 1000 / 60 / 60)) * 60 * 60; // 转换为每小时错误数
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): ErrorStats {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;
    const lastDay = now - 24 * 60 * 60 * 1000;
    const lastWeek = now - 7 * 24 * 60 * 60 * 1000;

    const byType: Record<ErrorType, number> = {} as Record<ErrorType, number>;
    const bySeverity: Record<ErrorSeverity, number> = {} as Record<ErrorSeverity, number>;
    const byStatusCode: Record<number, number> = {};

    // 初始化统计对象
    Object.values(ErrorType).forEach(type => byType[type] = 0);
    Object.values(ErrorSeverity).forEach(severity => bySeverity[severity] = 0);

    // 统计错误
    this.errorStore.forEach(error => {
      byType[error.type]++;
      bySeverity[error.severity]++;
      byStatusCode[error.statusCode] = (byStatusCode[error.statusCode] || 0) + 1;
    });

    return {
      total: this.errorStore.length,
      byType,
      bySeverity,
      byStatusCode,
      recentErrors: this.errorStore.slice(0, this.maxRecentErrors),
      errorRates: {
        lastHour: this.calculateErrorRate(60 * 60 * 1000),
        lastDay: this.calculateErrorRate(24 * 60 * 60 * 1000),
        lastWeek: this.calculateErrorRate(7 * 24 * 60 * 60 * 1000)
      }
    };
  }

  /**
   * 获取告警
   */
  getAlerts(resolved: boolean | null = null): Alert[] {
    if (resolved === null) {
      return this.alerts;
    }
    return this.alerts.filter(alert => alert.resolved === resolved);
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info(`Alert resolved: ${alertId} - ${alert.message}`);
      return true;
    }
    return false;
  }

  /**
   * 清理过期错误
   */
  cleanupOldErrors(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    const initialLength = this.errorStore.length;

    this.errorStore = this.errorStore.filter(
      error => now - error.timestamp.getTime() <= maxAgeMs
    );

    const deletedCount = initialLength - this.errorStore.length;
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old errors`);
    }

    return deletedCount;
  }

  /**
   * 清理过期告警
   */
  cleanupOldAlerts(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    const initialLength = this.alerts.length;

    this.alerts = this.alerts.filter(
      alert => now - alert.timestamp.getTime() <= maxAgeMs
    );

    const deletedCount = initialLength - this.alerts.length;
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old alerts`);
    }

    return deletedCount;
  }

  /**
   * 获取错误趋势
   */
  getErrorTrend(timeWindowMs: number = 24 * 60 * 60 * 1000, intervalMs: number = 60 * 60 * 1000): {
    timestamps: string[];
    counts: number[];
  } {
    const now = Date.now();
    const startTime = now - timeWindowMs;
    
    const timestamps: string[] = [];
    const counts: number[] = [];

    for (let time = startTime; time <= now; time += intervalMs) {
      const intervalEnd = time + intervalMs;
      const errorCount = this.errorStore.filter(
        error => error.timestamp.getTime() >= time && error.timestamp.getTime() < intervalEnd
      ).length;

      timestamps.push(new Date(time).toISOString());
      counts.push(errorCount);
    }

    return { timestamps, counts };
  }
}

/**
 * 默认错误监控器实例
 */
export const errorMonitor = new ErrorMonitor();
