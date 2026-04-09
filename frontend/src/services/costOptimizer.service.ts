/**
 * 成本优化服务
 * Cost Optimization Service
 *
 * 功能：
 * 1. 智能推荐最优提柜日期
 * 2. 多方案成本对比
 * 3. 成本优化建议生成
 */

import { useAppStore } from '@/store/app'
import axios, { type AxiosInstance } from 'axios'
import { logger } from '@/utils/logger'

/**
 * 创建私有 axios 实例（带拦截器）
 */
const createApiClient = (): AxiosInstance => {
  const client: AxiosInstance = axios.create({
    baseURL: '/api/v1',
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  })
  client.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    const appStore = useAppStore()
    if (appStore?.scopedCountryCode) config.headers['X-Country-Code'] = appStore.scopedCountryCode
    return config
  })
  return client
}

const apiClient = createApiClient()

export interface OptimizationResult {
  originalCost: number // 原始总成本
  optimizedCost: number // 优化后总成本
  savings: number // 节省金额
  savingsPercent: number // 节省百分比
  suggestedPickupDate: string // 建议提柜日
  suggestedStrategy: string // 建议策略
  alternatives: Alternative[] // Top 3 方案
}

export interface Alternative {
  containerNumber: string // 柜号
  pickupDate: string // 提柜日
  strategy: 'Direct' | 'Drop off' | 'Expedited' // 策略
  totalCost: number // 总成本
  savings: number // 节省金额
  warehouseCode?: string // 仓库代码
  truckingCompanyCode?: string // 车队代码
}

export interface OptimizeRequest {
  containers: string[] // 柜号列表
  warehouseCode: string // 仓库代码
  truckingCompanyId: string // 车队 ID
  basePickupDate: string // 基础提柜日
  // ✅ lastFreeDate 字段已删除：后端应该自行从 DemurrageService 查询每个容器的免费期
}

class CostOptimizerService {
  private baseUrl = '/scheduling'

  /**
   * 🎯 智能成本优化建议
   *
   * @param request 优化请求参数
   * @returns 优化结果
   */
  async suggestOptimalUnloadDate(request: OptimizeRequest): Promise<OptimizationResult> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/optimize-cost`, request)

      // ✅ 修复：后端返回格式为 { success: true, data: {...} }
      // 需要从 response.data.data 读取实际数据
      return {
        originalCost: response.data.data.originalCost,
        optimizedCost: response.data.data.optimizedCost,
        savings: response.data.data.savings,
        savingsPercent: response.data.data.savingsPercent,
        suggestedPickupDate: response.data.data.suggestedPickupDate,
        suggestedStrategy: response.data.data.suggestedStrategy,
        alternatives: response.data.data.alternatives || [],
      }
    } catch (error) {
      logger.error('[CostOptimizer] 成本优化失败', { error })
      throw error
    }
  }

  /**
   * 💰 批量成本优化
   *
   * @param containerNumbers 柜号列表
   * @param basePickupDate 基础提柜日
   * @param lastFreeDate 免费期截止
   * @returns 批量优化结果
   */
  async batchOptimize(
    containerNumbers: string[],
    basePickupDate: string,
    lastFreeDate: string
  ): Promise<OptimizationResult[]> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/batch-optimize`, {
        containerNumbers,
        basePickupDate,
        lastFreeDate,
      })

      return response.data.results || []
    } catch (error) {
      logger.error('[CostOptimizer] 批量优化失败', { error })
      throw error
    }
  }

  /**
   * 📊 获取成本对比报告
   *
   * @param containerNumber 柜号
   * @returns 成本对比数据
   */
  async getCostComparison(containerNumber: string): Promise<{
    forecast: any
    actual: any
    variance: number
    variancePercent: number
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/cost-comparison/${containerNumber}`)

      return {
        forecast: response.data.forecast,
        actual: response.data.actual,
        variance: response.data.variance,
        variancePercent: response.data.variancePercent,
      }
    } catch (error) {
      logger.error('[CostOptimizer] 获取成本对比失败', { error })
      throw error
    }
  }
}

// 导出单例
export const costOptimizerService = new CostOptimizerService()
export default costOptimizerService
