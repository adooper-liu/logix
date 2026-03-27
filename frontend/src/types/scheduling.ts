/**
 * 智能排柜相关类型定义
 */

export interface Warehouse {
  id?: string | number
  code?: string
  warehouseCode?: string
  name?: string
  warehouseName?: string
  country?: string
  dailyCapacity?: number
}

export interface TruckingCompany {
  id?: string | number
  code?: string
  truckingCompanyId?: string
  name?: string
  truckingCompanyName?: string
  country?: string
  dailyCapacity?: number
  dailyReturnCapacity?: number
}

/**
 * 卸柜方案选项
 */
export interface UnloadOption {
  containerNumber: string
  warehouse: Warehouse
  /**
   * ⚠️ 重命名：原 unloadDate → plannedPickupDate
   * 计划提柜日（核心输入）
   */
  plannedPickupDate: string
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
  demurrageCost: number // 滞港费
  detentionCost: number // 滞箱费
  storageCost: number // 港口存储费
  yardStorageCost: number // 外部堆场堆存费（Drop off 模式专属）
  transportationCost: number // 运输费
  handlingCost: number // 操作费（加急费等）
  totalCost: number // 总成本
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

/**
 * ✅ 新增：成本优化建议（Task 2.1）
 */
export interface OptimizationSuggestion {
  originalCost: number // 原方案成本
  optimizedCost: number // 优化后成本
  savings: number // 节省金额
  suggestedPickupDate: string // 建议提柜日
  suggestedStrategy?: string // 建议策略
  shouldOptimize: boolean // 是否建议优化（savings > 0）
}

/**
 * 排产结果
 */
export interface ScheduleResult {
  containerNumber: string
  success: boolean
  message?: string
  plannedData?: Record<string, any>
  estimatedCosts?: CostBreakdown
  lastFreeDate?: string
  lastReturnDate?: string
  freeDaysRemaining?: number
  destinationPort?: string
  destinationPortName?: string
  warehouseName?: string
  etaDestPort?: string
  ataDestPort?: string
  optimizationSuggestions?: OptimizationSuggestion // ✅ 新增：成本优化建议（可选）
}
