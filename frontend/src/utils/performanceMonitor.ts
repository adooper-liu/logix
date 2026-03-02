/**
 * 性能监控工具
 */
import type { App } from 'vue'

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  // 页面加载
  pageLoad: {
    domContentLoaded: number
    loadComplete: number
    firstPaint: number
    firstContentfulPaint: number
  }

  // 网络请求
  network: {
    totalRequests: number
    failedRequests: number
    avgResponseTime: number
  }

  // 组件渲染
  components: {
    renderTime: Map<string, number>
    slowComponents: Array<{ name: string; time: number }>
  }

  // 内存使用
  memory: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

/**
 * 性能数据收集器
 */
class PerformanceCollector {
  private metrics: PerformanceMetrics = {
    pageLoad: {
      domContentLoaded: 0,
      loadComplete: 0,
      firstPaint: 0,
      firstContentfulPaint: 0
    },
    network: {
      totalRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0
    },
    components: {
      renderTime: new Map(),
      slowComponents: []
    },
    memory: {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    }
  }

  private requestTimes: Map<string, number[]> = new Map()

  /**
   * 初始化页面加载性能监控
   */
  initPageLoadMonitoring() {
    if (typeof window === 'undefined' || !window.performance) return

    // 监听页面加载事件
    window.addEventListener('DOMContentLoaded', () => {
      const perfData = window.performance.timing
      this.metrics.pageLoad.domContentLoaded =
        perfData.domContentLoadedEventEnd - perfData.navigationStart
    })

    window.addEventListener('load', () => {
      const perfData = window.performance.timing
      this.metrics.pageLoad.loadComplete =
        perfData.loadEventEnd - perfData.navigationStart
      console.log('[Performance] 页面加载完成:', this.metrics.pageLoad)
    })

    // 监听 Paint 事件
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.name === 'first-paint') {
            this.metrics.pageLoad.firstPaint = entry.startTime
          } else if (entry.name === 'first-contentful-paint') {
            this.metrics.pageLoad.firstContentfulPaint = entry.startTime
          }
        })
      })
      observer.observe({ entryTypes: ['paint'] })
    }
  }

  /**
   * 记录网络请求
   */
  recordRequest(url: string, duration: number, success: boolean) {
    this.metrics.network.totalRequests++

    if (!success) {
      this.metrics.network.failedRequests++
    }

    // 记录请求时间
    if (!this.requestTimes.has(url)) {
      this.requestTimes.set(url, [])
    }
    this.requestTimes.get(url)!.push(duration)

    // 计算平均响应时间
    const allTimes = Array.from(this.requestTimes.values()).flat()
    this.metrics.network.avgResponseTime =
      allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length
  }

  /**
   * 记录组件渲染时间
   */
  recordComponentRender(name: string, time: number) {
    this.metrics.components.renderTime.set(name, time)

    // 记录慢组件（>50ms）
    if (time > 50) {
      this.metrics.components.slowComponents.push({ name, time })

      // 只保留前10个慢组件
      if (this.metrics.components.slowComponents.length > 10) {
        this.metrics.components.slowComponents.sort((a, b) => b.time - a.time)
        this.metrics.components.slowComponents = this.metrics.components.slowComponents.slice(0, 10)
      }
    }
  }

  /**
   * 收集内存使用情况
   */
  collectMemoryMetrics() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.metrics.memory = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    this.collectMemoryMetrics()
    return JSON.parse(JSON.stringify(this.metrics))
  }

  /**
   * 重置指标
   */
  reset() {
    this.metrics.components.renderTime.clear()
    this.metrics.components.slowComponents = []
    this.requestTimes.clear()
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const metrics = this.getMetrics()
    const report = [
      '=== 性能报告 ===',
      `页面加载:`,
      `  - DOM 内容加载: ${metrics.pageLoad.domContentLoaded}ms`,
      `  - 完全加载: ${metrics.pageLoad.loadComplete}ms`,
      `  - 首次绘制: ${metrics.pageLoad.firstPaint.toFixed(2)}ms`,
      `  - 首次内容绘制: ${metrics.pageLoad.firstContentfulPaint.toFixed(2)}ms`,
      ``,
      `网络请求:`,
      `  - 总请求数: ${metrics.network.totalRequests}`,
      `  - 失败请求数: ${metrics.network.failedRequests}`,
      `  - 平均响应时间: ${metrics.network.avgResponseTime.toFixed(2)}ms`,
      ``,
      `组件渲染:`,
      `  - 慢组件 (>50ms):`,
      ...metrics.components.slowComponents.map(
        c => `    - ${c.name}: ${c.time}ms`
      ),
      ``,
      `内存使用:`,
      `  - 已使用: ${(metrics.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      `  - 总分配: ${(metrics.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
      `  - 限制: ${(metrics.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
    ].join('\n')

    return report
  }
}

/**
 * 创建全局性能监控实例
 */
const performanceCollector = new PerformanceCollector()

/**
 * 性能监控插件
 */
export const performanceMonitorPlugin = {
  install(app: App) {
    // 初始化页面加载监控
    performanceCollector.initPageLoadMonitoring()

    // 注册全局性能指标
    app.config.globalProperties.$performance = {
      getMetrics: () => performanceCollector.getMetrics(),
      report: () => performanceCollector.generateReport(),
      reset: () => performanceCollector.reset()
    }

    // 监听组件渲染
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.startsWith('render-')) {
            const componentName = entry.name.replace('render-', '')
            performanceCollector.recordComponentRender(
              componentName,
              entry.duration
            )
          }
        })
      })
      observer.observe({ entryTypes: ['measure'] })
    }

    console.log('[Performance] 性能监控已启用')
  }
}

/**
 * 组件性能测量装饰器
 */
export function measurePerformance(componentName: string) {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = function (...args: any[]) {
      const start = performance.now()
      const result = originalMethod.apply(this, args)
      const end = performance.now()

      if (end - start > 16) {
        console.warn(
          `[Performance] ${componentName}.${propertyKey} 执行耗时: ${(end - start).toFixed(2)}ms`
        )
      }

      return result
    }

    return descriptor
  }
}

/**
 * 测量函数执行时间
 */
export function measureTime<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return (function (this: any, ...args: Parameters<T>) {
    const start = performance.now()
    const result = fn.apply(this, args)
    const end = performance.now()

    const duration = end - start
    if (duration > 16) {
      console.warn(`[Performance] ${name} 执行耗时: ${duration.toFixed(2)}ms`)
    }

    return result
  }) as T
}

/**
 * 请求拦截器 - 用于监控API请求性能
 */
export function createRequestMonitor(axiosInstance: any) {
  axiosInstance.interceptors.request.use((config: any) => {
    config.metadata = { startTime: Date.now() }
    return config
  })

  axiosInstance.interceptors.response.use(
    (response: any) => {
      const { config } = response
      const duration = Date.now() - (config.metadata?.startTime || Date.now())

      performanceCollector.recordRequest(
        config.url,
        duration,
        true
      )

      // 记录慢请求
      if (duration > 1000) {
        console.warn(
          `[Performance] 慢请求: ${config.url} - ${duration}ms`
        )
      }

      return response
    },
    (error: any) => {
      const { config } = error
      const duration = Date.now() - (config.metadata?.startTime || Date.now())

      performanceCollector.recordRequest(
        config?.url || 'unknown',
        duration,
        false
      )

      return Promise.reject(error)
    }
  )
}

/**
 * 导出性能监控实例
 */
export { performanceCollector }
