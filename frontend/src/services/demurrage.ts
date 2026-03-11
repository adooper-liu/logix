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
  tierBreakdown: Array<{
    fromDay: number
    toDay: number
    days: number
    ratePerDay: number
    subtotal: number
  }>
}

/** 用于滞港费/滞箱费计算的原始日期（含自动计算的最晚提柜日、最晚还箱日） */
export interface CalculationDates {
  ataDestPort?: string | null
  etaDestPort?: string | null
  dischargeDate?: string | null
  lastPickupDate?: string | null
  lastPickupDateComputed?: string | null
  lastReturnDate?: string | null
  lastReturnDateComputed?: string | null
  pickupDateActual?: string | null
  returnTime?: string | null
  today: string
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
    matchedStandards: MatchedDemurrageStandard[]
    items: DemurrageItemResult[]
    totalAmount: number
    currency: string
  }
  message?: string
  /** 无法计算时的原因，用于前端区分展示样式：no_arrival_at_dest=未到港（友好提示），其他=报错 */
  reason?: 'no_arrival_at_dest' | 'missing_arrival_dates' | 'no_matching_standards' | 'missing_dates'
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
