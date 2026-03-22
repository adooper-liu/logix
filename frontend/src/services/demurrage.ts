/**
 * 滞港费服务
 * Demurrage Service
 */

import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { useAppStore } from '@/store/app'

export interface DemurrageStandard {
  id: number
  destinationPortCode?: string
  destinationPortName?: string
  shippingCompanyCode?: string
  shippingCompanyName?: string
  originForwarderCode?: string
  freeDays: number
  freeDaysBasis?: string
  calculationBasis?: string
  ratePerDay?: number
  tiers?: Array<{ fromDay: number; toDay: number | null; ratePerDay: number }>
  currency?: string
  chargeName?: string
}

/** 匹配的滞港费标准 */
export interface MatchedDemurrageStandard {
  id: number
  chargeName: string
  chargeTypeCode: string
  foreignCompanyCode?: string
  foreignCompanyName?: string
  destinationPortCode?: string
  destinationPortName?: string
  shippingCompanyCode?: string
  shippingCompanyName?: string
  originForwarderCode?: string
  originForwarderName?: string
  freeDays: number
  freeDaysBasis?: string
  calculationBasis?: string
  isChargeable?: string
  ratePerDay?: number
  tiers?: Array<{ fromDay: number; toDay: number | null; ratePerDay: number }>
  currency: string
}

/** 单项计算结果 */
export interface DemurrageItemResult {
  standardId: number
  chargeName: string
  chargeTypeCode: string
  freeDays: number
  freeDaysBasis?: string
  calculationBasis?: string
  startDate: string
  endDate: string
  startDateSource?: string | null
  endDateSource?: string | null
  lastFreeDate: string
  chargeDays: number
  amount: number
  currency: string
  calculationMode?: 'actual' | 'forecast'
  startDateMode?: 'actual' | 'forecast'
  endDateMode?: 'actual' | 'forecast'
  lastFreeDateMode?: 'actual' | 'forecast'
  tierBreakdown: Array<{
    fromDay: number
    toDay: number
    days: number
    ratePerDay: number
    subtotal: number
  }>
}

export interface DemurrageSkippedItem {
  standardId: number
  chargeName: string
  chargeTypeCode: string
  reasonCode:
    | 'missing_pickup_date_actual'
    | 'missing_planned_pickup_date'
    | 'missing_eta_combined_forecast'
    | 'missing_arrival_for_combined_actual'
  reason: string
}

/** 用于滞港费/滞箱费计算的原始日期（含自动计算的最晚提柜日、最晚还箱日） */
export interface CalculationDates {
  ataDestPort?: string | null
  etaDestPort?: string | null
  revisedEtaDestPort?: string | null
  dischargeDate?: string | null
  /** 最晚提柜日（从 process_port_operations.last_free_date 读取） */
  lastPickupDate?: string | null
  /** 计划提柜日（process_trucking_transport.planned_pickup_date；forecast 滞港费截止日 = max(今天, 计划提柜日)） */
  plannedPickupDate?: string | null
  /** 最晚提柜日（计算出的） */
  lastPickupDateComputed?: string | null
  /** 最晚提柜日计算模式 */
  lastPickupDateMode?: 'actual' | 'forecast' | null
  lastReturnDate?: string | null
  lastReturnDateComputed?: string | null
  lastReturnDateMode?: 'actual' | 'forecast' | null
  pickupDateActual?: string | null
  returnTime?: string | null
  /** 计划还箱日（process_empty_return.planned_return_date；forecast 滞箱截止 = max(今天, 计划还箱)） */
  plannedReturnDate?: string | null
  /** 出运日（备货 actual_ship_date / 海运 shipment_date） */
  shipmentDate?: string | null
  today: string
}

/** 关键日期时间线（与后端 GET /demurrage/calculate/:containerNumber 的 keyTimeline 对齐） */
export type KeyTimelineMilestoneKey =
  | 'shipment'
  | 'eta'
  | 'revised_eta'
  | 'ata'
  | 'discharge'
  | 'last_pickup'
  | 'pickup_actual'
  | 'last_return'
  | 'return_actual'

export type KeyTimelineDisplayMode = 'elapsed' | 'countdown' | 'overdue' | 'none'

export interface KeyTimelineNodeDto {
  milestoneKey: KeyTimelineMilestoneKey
  date: string | null
  hasNextEffective: boolean
  nextMilestoneDate: string | null
  prevMilestoneDate: string | null
  displayMode: KeyTimelineDisplayMode
  isKeyNode: boolean
  standardHours: number
  displayDays?: number
  displayText?: string
}

export interface KeyTimelineMetaDto {
  calculationMode: 'actual' | 'forecast'
  arrivedAtDestinationPort: boolean
  warnings?: string[]
}

export interface KeyTimelineResult {
  nodes: KeyTimelineNodeDto[]
  meta: KeyTimelineMetaDto
}

export interface DemurrageCalculationResponse {
  success: boolean
  data?: {
    containerNumber: string
    startDate: string
    endDate: string
    startDateSource?: string | null
    endDateSource?: string | null
    calculationDates?: CalculationDates
    calculationMode?: 'actual' | 'forecast'
    matchedStandards: MatchedDemurrageStandard[]
    items: DemurrageItemResult[]
    skippedItems?: DemurrageSkippedItem[]
    totalAmount: number
    currency: string
    /** 与状态机顺序不一致时的提示（后端 dateOrderWarnings） */
    dateOrderWarnings?: string[]
    /** 滞港费 actual/forecast 所依据的状态机快照（calculateLogisticsStatus） */
    logisticsStatusSnapshot?: {
      status: string
      reason: string
      arrivedAtDestinationPort: boolean
      currentPortType: 'origin' | 'transit' | 'destination' | null
    }
    /** 关键日期历时/倒计时/超期（Phase 1 占位 nodes 可为空） */
    keyTimeline?: KeyTimelineResult
  }
  message?: string
  /** 无法计算时的原因，用于前端区分展示样式：
   *   - no_arrival_at_dest: 未到港友好提示（预测模式下无计划提柜日）
   *   - missing_dates: 缺少必要日期（包括预测模式下未实际到港且无计划提柜日）
   *   - no_matching_standards: 未匹配到滞港费标准
   *   - missing_arrival_dates: 已有实际提柜但缺少到港/ETA/卸船日
   */
  reason?:
    | 'no_arrival_at_dest'
    | 'missing_arrival_dates'
    | 'no_matching_standards'
    | 'missing_dates'
    | 'missing_pickup_date_actual'
}

class DemurrageService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
      timeout: 15000
    })

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        const appStore = useAppStore()
        if (appStore.scopedCountryCode) {
          config.headers['X-Country-Code'] = appStore.scopedCountryCode
        }
        return config
      },
      (error) => Promise.reject(error)
    )
  }

  /**
   * 新建滞港费标准
   */
  async createStandard(payload: {
    foreign_company_code: string
    foreign_company_name?: string
    effective_date?: string
    expiry_date?: string
    destination_port_code: string
    destination_port_name?: string
    shipping_company_code: string
    shipping_company_name?: string
    origin_forwarder_code: string
    origin_forwarder_name?: string
    free_days: number
    free_days_basis?: string
    calculation_basis?: string
    rate_per_day?: number
    tiers?: Record<string, number>
    currency?: string
    charge_name?: string
  }): Promise<{ success: boolean; data?: { id: number }; message?: string }> {
    const response = await this.api.post('/demurrage/standards', payload)
    return response.data
  }

  /**
   * 获取滞港费标准列表
   * 后端接收 snake_case 查询参数
   */
  async getStandards(params?: {
    destinationPortCode?: string
    shippingCompanyCode?: string
  }): Promise<{ success: boolean; data: DemurrageStandard[] }> {
    const queryParams: Record<string, string> = {}
    if (params?.destinationPortCode) queryParams.destination_port_code = params.destinationPortCode
    if (params?.shippingCompanyCode) queryParams.shipping_company_code = params.shippingCompanyCode
    const response = await this.api.get('/demurrage/standards', { params: queryParams })
    return response.data
  }

  /**
   * 诊断滞港费匹配失败原因
   */
  async diagnoseMatch(
    containerNumber: string
  ): Promise<{
    success: boolean
    data?: {
      containerExists: boolean
      containerParams: Record<string, string | null>
      standardsTotal: number
      standardsAfterEffectiveDate: number
      excludedByIsChargeable: number
      standardsAfterFourFieldMatch: number
      effectiveDateConstraint: { today: string; rule: string }
      allStandardsSample: Array<Record<string, unknown>>
    }
  }> {
    const response = await this.api.get(
      `/demurrage/diagnose/${encodeURIComponent(containerNumber)}`
    )
    return response.data
  }

  /**
   * 计算单柜滞港费
   */
  async calculateForContainer(
    containerNumber: string
  ): Promise<DemurrageCalculationResponse> {
    const response = await this.api.get(
      `/demurrage/calculate/${encodeURIComponent(containerNumber)}`
    )
    return response.data
  }

  /**
   * 滞港费汇总统计（批量计算可能较慢，超时 90 秒）
   */
  async getSummary(params?: {
    startDate?: string
    endDate?: string
    limit?: number
  }): Promise<{
    success: boolean
    data?: {
      totalAmount: number
      currency: string
      containerCount: number
      containerCountWithCharge: number
      avgPerContainer: number
      partialResults?: boolean
      totalContainersInRange?: number
      byPort?: Array<{ port: string; totalAmount: number; containerCount: number }>
    }
  }> {
    const queryParams: Record<string, string | number> = {}
    if (params?.startDate) queryParams.startDate = params.startDate
    if (params?.endDate) queryParams.endDate = params.endDate
    if (params?.limit != null) queryParams.limit = params.limit
    const response = await this.api.get('/demurrage/summary', {
      params: queryParams,
      timeout: 90000
    })
    return response.data
  }

  /**
   * 高费用货柜 Top N（批量计算可能较慢，超时 90 秒）
   */
  async getTopContainers(params?: {
    startDate?: string
    endDate?: string
    topN?: number
  }): Promise<{
    success: boolean
    data?: {
      items: Array<{
        containerNumber: string
        totalAmount: number
        currency: string
        chargeDays: number
        lastFreeDate: string | null
        destinationPort?: string
        logisticsStatus?: string
      }>
      partialResults?: boolean
      totalContainersInRange?: number
    }
  }> {
    const queryParams: Record<string, string | number> = {}
    if (params?.startDate) queryParams.startDate = params.startDate
    if (params?.endDate) queryParams.endDate = params.endDate
    if (params?.topN != null) queryParams.topN = params.topN
    const response = await this.api.get('/demurrage/top-containers', {
      params: queryParams,
      timeout: 90000
    })
    return response.data
  }
}

export const demurrageService = new DemurrageService()
