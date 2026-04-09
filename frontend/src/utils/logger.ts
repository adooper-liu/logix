/**
 * 前端日志工具
 *
 * 功能:
 * 1. 分级日志(debug/info/warn/error)
 * 2. 生产环境自动过滤 debug 日志
 * 3. 统一日志格式,便于追踪和监控
 * 4. 支持日志上报(预留接口)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogConfig {
  level: LogLevel
  enableReport: boolean // 是否启用日志上报
  reportUrl?: string // 日志上报地址
}

const DEFAULT_CONFIG: LogConfig = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableReport: false,
}

class Logger {
  private config: LogConfig

  constructor(config: Partial<LogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 判断日志级别是否应该输出
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.config.level)
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    return `${prefix} ${message}`
  }

  /**
   * 上报日志(预留接口)
   */
  private reportLog(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.config.enableReport || !this.config.reportUrl) {
      return
    }

    // TODO: 实现日志上报逻辑
    // fetch(this.config.reportUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     level,
    //     message,
    //     args,
    //     timestamp: new Date().toISOString(),
    //     url: window.location.href,
    //     userAgent: navigator.userAgent,
    //   }),
    // }).catch(err => {
    //   console.error('[Logger] Failed to report log:', err);
    // });
  }

  /**
   * Debug 日志
   */
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog('debug')) return

    const formatted = this.formatMessage('debug', message)
    console.debug(formatted, ...args)
    this.reportLog('debug', message, ...args)
  }

  /**
   * Info 日志
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog('info')) return

    const formatted = this.formatMessage('info', message)
    console.info(formatted, ...args)
    this.reportLog('info', message, ...args)
  }

  /**
   * Warn 日志
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog('warn')) return

    const formatted = this.formatMessage('warn', message)
    console.warn(formatted, ...args)
    this.reportLog('warn', message, ...args)
  }

  /**
   * Error 日志
   */
  error(message: string, ...args: any[]): void {
    if (!this.shouldLog('error')) return

    const formatted = this.formatMessage('error', message)
    console.error(formatted, ...args)
    this.reportLog('error', message, ...args)
  }

  /**
   * 更新配置
   */
  setConfig(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取当前配置
   */
  getConfig(): LogConfig {
    return { ...this.config }
  }
}

// 导出单例实例
export const logger = new Logger()

// 导出配置函数
export function configureLogger(config: Partial<LogConfig>): void {
  logger.setConfig(config)
}
