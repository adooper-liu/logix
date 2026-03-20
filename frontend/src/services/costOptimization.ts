/**
 * 成本优化服务
 * Cost Optimization Service
 */

import api from './api'
import type { UnloadOption, CostBreakdown } from '@/types/scheduling'

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

export class CostOptimizationService {
  /**
   * 评估单个方案的成本
   */
  async evaluateCost(containerNumber: string, option: UnloadOption): Promise<{
    success: boolean
    data: {
      containerNumber: string
      option: UnloadOption
      costBreakdown: CostBreakdown
    }
  }> {
    const response = await api.post('/scheduling/evaluate-cost', {
      containerNumber,
      option
    })
    return response.data
  }

  /**
   * 对比多个方案
   */
  async compareOptions(containerNumber: string, options: UnloadOption[]): Promise<{
    success: boolean
    data: CompareResponse
  }> {
    const response = await api.post('/scheduling/compare-options', {
      containerNumber,
      options
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
}

export const costOptimizationService = new CostOptimizationService()
