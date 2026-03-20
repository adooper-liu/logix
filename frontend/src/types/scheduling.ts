/**
 * 智能排柜相关类型定义
 */

import type { Warehouse } from './warehouse'
import type { TruckingCompany } from './trucking'

/**
 * 卸柜方案选项
 */
export interface UnloadOption {
  containerNumber: string
  warehouse: Warehouse
  unloadDate: string
  strategy: 'Direct' | 'Drop off' | 'Expedited'
  truckingCompany?: TruckingCompany
  isWithinFreePeriod: boolean
  estimatedDemurrage?: number
  estimatedStorage?: number
  estimatedTransport?: number
  totalCost?: number
}

/**
 * 成本明细
 */
export interface CostBreakdown {
  demurrageCost: number      // 滞港费
  detentionCost: number      // 滞箱费
  storageCost: number        // 堆存费
  transportationCost: number // 运输费
  handlingCost: number       // 操作费（加急费等）
  totalCost: number          // 总成本
}

/**
 * 方案对比结果
 */
export interface OptionComparison {
  option: UnloadOption
  costBreakdown: CostBreakdown
  rank: number
}

/**
 * 推荐方案结果
 */
export interface RecommendationResult {
  option: UnloadOption
  reason: string
  savings: number
}
