/**
 * 成本优化服务
 * Cost Optimization Service
 */

import type { CostBreakdown, UnloadOption } from '@/types/scheduling'
import api from './api'

export interface OptionComparison {
  option: UnloadOption
  costBreakdown: CostBreakdown
  rank: number
}

export interface RecommendationResult {
  option: UnloadOption
  reason: string
  savings: number
}

export interface CompareResponse {
  containerNumber: string
  comparisons: OptionComparison[]
  recommendedOption: RecommendationResult
}

export interface OptimizeContainerRequest {
  warehouseCode: string
  truckingCompanyId: string
  basePickupDate: string // YYYY-MM-DD
}

export interface Alternative {
  pickupDate: string
  strategy: 'Direct' | 'Drop off' | 'Expedited'
  totalCost: number
  savings: number
  breakdown: CostBreakdown
  warehouseCode: string
  truckingCompanyCode: string
}

export interface OptimizeContainerResponse {
  containerNumber: string
  originalCost: number
  optimizedCost: number
  savings: number
  savingsPercent: number
  suggestedPickupDate: string
  suggestedStrategy: 'Direct' | 'Drop off' | 'Expedited'
  alternatives: Alternative[]
}

export class CostOptimizationService {
  /**
   * 评估单个方案的成本
   */
  async evaluateCost(
    containerNumber: string,
    option: UnloadOption
  ): Promise<{
    success: boolean
    data: {
      containerNumber: string
      option: UnloadOption
      costBreakdown: CostBreakdown
    }
  }> {
    const response = await api.post('/scheduling/evaluate-cost', {
      containerNumber,
      option,
    })
    return response.data
  }

  /**
   * 对比多个方案
   */
  async compareOptions(
    containerNumber: string,
    options: UnloadOption[]
  ): Promise<{
    success: boolean
    data: CompareResponse
  }> {
    const response = await api.post('/scheduling/compare-options', {
      containerNumber,
      options,
    })
    return response.data
  }

  /**
   * 获取推荐方案
   */
  async getRecommendation(containerNumber: string): Promise<{
    success: boolean
    data: {
      containerNumber: string
      optimalOption: UnloadOption | null
      costBreakdown: CostBreakdown | null
      alternatives: UnloadOption[]
      reasoning: string
    }
  }> {
    const response = await api.get(`/scheduling/recommend-option/${containerNumber}`)
    return response.data
  }

  /**
   * 🎯 单柜成本优化（拖拽圆点后调用）
   * POST /api/v1/scheduling/optimize-container/:containerNumber
   *
   * @param containerNumber 柜号
   * @param params 优化参数
   * @returns 优化结果（包含最优方案和备选方案）
   */
  async optimizeContainer(
    containerNumber: string,
    params: OptimizeContainerRequest
  ): Promise<{
    success: boolean
    data: OptimizeContainerResponse
  }> {
    const response = await api.post(`/scheduling/optimize-container/${containerNumber}`, params, {
      timeout: 30000, // 30秒超时
    })
    return response.data
  }
}

export const costOptimizationService = new CostOptimizationService()
