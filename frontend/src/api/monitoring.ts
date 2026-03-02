/**
 * 监控API接口
 */
import { httpClient } from './httpClient'

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  cpuUsage: number         // CPU使用率 (%)
  memoryUsage: number      // 内存使用率 (%)
  responseTime: number     // 响应时间 (ms)
  throughput: number       // 每秒请求数
}

/**
 * 优化数据接口
 */
export interface OptimizationData {
  apiCacheHits: number     // 缓存命中次数
  apiCacheTotal: number    // 总请求数
  searchRequestsSaved: number // 节省的搜索请求
  slowComponents: number   // 慢组件数量
  avgLoadTime: number      // 平均加载时间 (秒)
}

/**
 * 告警信息接口
 */
export interface Alert {
  id: number
  level: 'error' | 'warning' | 'info'
  message: string
  time: string
  advice?: string
}

/**
 * 服务健康度接口
 */
export interface ServiceHealth {
  apiService: number
  database: number
  redis: number
  feituoAdapter: number
  logisticsAdapter: number
}

/**
 * 性能趋势数据接口
 */
export interface PerformanceTrend {
  timestamps: string[]
  cpuUsage: number[]
  memoryUsage: number[]
}

/**
 * 监控数据接口
 */
export interface MonitoringData {
  performanceMetrics: PerformanceMetrics
  optimizationData: OptimizationData
  alerts: Alert[]
  serviceHealth: ServiceHealth
  performanceTrend: PerformanceTrend
}

/**
 * 获取监控数据
 */
export async function getMonitoringData(): Promise<MonitoringData> {
  return httpClient.get<MonitoringData>('/monitoring')
}

/**
 * 刷新监控数据
 */
export async function refreshMonitoringData(): Promise<MonitoringData> {
  return httpClient.get<MonitoringData>('/monitoring/refresh')
}

/**
 * 获取性能指标
 */
export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  return httpClient.get<PerformanceMetrics>('/monitoring/performance')
}

/**
 * 获取优化数据
 */
export async function getOptimizationData(): Promise<OptimizationData> {
  return httpClient.get<OptimizationData>('/monitoring/optimization')
}

/**
 * 获取告警信息
 */
export async function getAlerts(): Promise<Alert[]> {
  return httpClient.get<Alert[]>('/monitoring/alerts')
}

/**
 * 获取服务健康度
 */
export async function getServiceHealth(): Promise<ServiceHealth> {
  return httpClient.get<ServiceHealth>('/monitoring/health')
}

/**
 * 获取性能趋势数据
 */
export async function getPerformanceTrend(): Promise<PerformanceTrend> {
  return httpClient.get<PerformanceTrend>('/monitoring/trend')
}
