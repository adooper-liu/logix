/**
 * 统一的调试日志工具
 * 提供结构化的调试输出，便于快速定位问题
 */

export enum DebugCategory {
  CLICK = '🖱️',
  API = '🌐',
  DATA = '📊',
  FILTER = '🎯',
  NAVIGATION = '🧭',
  ERROR = '❌',
  SUCCESS = '✅',
  WARNING = '⚠️',
  INFO = 'ℹ️'
}

interface DebugContext {
  page?: string
  component?: string
  action?: string
  path?: string // 完整调用路径
}

/**
 * 调试日志记录器
 */
class DebugLogger {
  private prefix = '[LogiX-Debug]'

  /**
   * 记录点击事件
   */
  click(context: DebugContext, data: any) {
    console.log(`${DebugCategory.CLICK} ${this.prefix} Click`, {
      ...context,
      data,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录API调用
   */
  api(context: DebugContext, data: any) {
    console.log(`${DebugCategory.API} ${this.prefix} API Call`, {
      ...context,
      data,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录API响应
   */
  apiResponse(context: DebugContext, response: any) {
    console.log(`${DebugCategory.API} ${this.prefix} API Response`, {
      ...context,
      response: {
        success: response.success,
        count: response.count,
        itemsLength: response.items?.length || 0
      },
      timestamp: new Date().toISOString()
    })

    if (response.items && response.items.length > 0) {
      console.log(`${DebugCategory.DATA} ${this.prefix} First 3 items:`, response.items.slice(0, 3).map(item => ({
        containerNumber: item.containerNumber,
        logisticsStatus: item.logisticsStatus,
        etaDestPort: item.etaDestPort,
        ataDestPort: item.ataDestPort
      })))
    }
  }

  /**
   * 记录过滤操作
   */
  filter(context: DebugContext, data: any) {
    console.log(`${DebugCategory.FILTER} ${this.prefix} Filter`, {
      ...context,
      data,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录导航
   */
  navigation(context: DebugContext, data: any) {
    console.log(`${DebugCategory.NAVIGATION} ${this.prefix} Navigation`, {
      ...context,
      data,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录成功
   */
  success(context: DebugContext, message: string, data?: any) {
    console.log(`${DebugCategory.SUCCESS} ${this.prefix} Success: ${message}`, {
      ...context,
      data,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录警告
   */
  warning(context: DebugContext, message: string, data?: any) {
    console.warn(`${DebugCategory.WARNING} ${this.prefix} Warning: ${message}`, {
      ...context,
      data,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录错误
   */
  error(context: DebugContext, error: any) {
    console.error(`${DebugCategory.ERROR} ${this.prefix} Error`, {
      ...context,
      error: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  }

  /**
   * 记录信息
   */
  info(context: DebugContext, message: string, data?: any) {
    console.log(`${DebugCategory.INFO} ${this.prefix} Info: ${message}`, {
      ...context,
      data,
      timestamp: new Date().toISOString()
    })
  }
}

export const debugLogger = new DebugLogger()
