/**
 * 滞港费计算可复用逻辑
 * Reusable Demurrage Calculation Logic
 *
 * 支持单日费率与阶梯费率，按自然日计算
 * 可在货柜详情、列表、批量计算等多处复用
 */

import { computed, type Ref } from 'vue'

/** 阶梯费率项 */
export interface DemurrageTier {
  fromDay: number
  toDay: number | null
  ratePerDay: number
}

/** 计算入参 */
export interface DemurrageCalculationInput {
  /** 起算日（ATA/ETA/卸船日） */
  startDate: Date | string | null
  /** 截止日（提柜日或计算日，null 表示今天） */
  endDate?: Date | string | null
  /** 免费天数 */
  freeDays: number
  /** 单日费率（无阶梯时使用） */
  ratePerDay?: number
  /** 阶梯费率（优先于 ratePerDay） */
  tiers?: DemurrageTier[]
  /** 币种 */
  currency?: string
}

/** 阶梯明细 */
export interface DemurrageTierBreakdown {
  fromDay: number
  toDay: number
  days: number
  ratePerDay: number
  subtotal: number
}

/** 计算结果 */
export interface DemurrageCalculationResult {
  /** 免费期截止日 */
  lastFreeDate: Date | null
  /** 计费天数 */
  chargeDays: number
  /** 总费用 */
  totalAmount: number
  /** 阶梯明细 */
  tierBreakdown: DemurrageTierBreakdown[]
  /** 币种 */
  currency: string
  /** 是否在免费期内（无费用） */
  isWithinFreePeriod: boolean
}

/** 日期转 YYYY-MM-DD，忽略时分秒 */
function toDateOnly(d: Date | string): Date {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** 两日期间的自然日差（含起止） */
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1
}

/**
 * 计算滞港费（纯函数，可复用）
 * 按自然日：免费期结束日 = startDate + (freeDays - 1)
 * 计费天数 = max(0, endDate - lastFreeDate 的天数)
 */
export function calculateDemurrage(input: DemurrageCalculationInput): DemurrageCalculationResult {
  const {
    startDate,
    endDate,
    freeDays = 0,
    ratePerDay = 0,
    tiers = [],
    currency = 'USD'
  } = input

  const emptyResult: DemurrageCalculationResult = {
    lastFreeDate: null,
    chargeDays: 0,
    totalAmount: 0,
    tierBreakdown: [],
    currency,
    isWithinFreePeriod: true
  }

  if (!startDate || freeDays < 0) {
    return emptyResult
  }

  const start = toDateOnly(startDate)
  const end = endDate ? toDateOnly(endDate) : toDateOnly(new Date())

  if (end < start) {
    return emptyResult
  }

  // 免费期结束日 = start + (freeDays - 1) 天
  const lastFreeDate = new Date(start)
  lastFreeDate.setDate(lastFreeDate.getDate() + Math.max(0, freeDays - 1))

  if (end <= lastFreeDate) {
    return {
      lastFreeDate,
      chargeDays: 0,
      totalAmount: 0,
      tierBreakdown: [],
      currency,
      isWithinFreePeriod: true
    }
  }

  // 计费天数 = end 与 lastFreeDate 次日之间的天数
  const chargeStart = new Date(lastFreeDate)
  chargeStart.setDate(chargeStart.getDate() + 1)
  const chargeDays = daysBetween(chargeStart, end)

  if (chargeDays <= 0) {
    return {
      lastFreeDate,
      chargeDays: 0,
      totalAmount: 0,
      tierBreakdown: [],
      currency,
      isWithinFreePeriod: false
    }
  }

  let totalAmount = 0
  const tierBreakdown: DemurrageTierBreakdown[] = []

  if (tiers && tiers.length > 0) {
    let remainingDays = chargeDays
    let currentDay = 1

    for (const tier of tiers.sort((a, b) => a.fromDay - b.fromDay)) {
      if (remainingDays <= 0) break

      const tierToDay = tier.toDay ?? 99999
      const tierFromDay = Math.max(tier.fromDay, currentDay)
      const tierEndDay = Math.min(tierToDay, currentDay + remainingDays - 1)

      if (tierEndDay < tierFromDay) continue

      const daysInTier = tierEndDay - tierFromDay + 1
      const subtotal = daysInTier * tier.ratePerDay

      tierBreakdown.push({
        fromDay: tierFromDay,
        toDay: tierEndDay,
        days: daysInTier,
        ratePerDay: tier.ratePerDay,
        subtotal
      })

      totalAmount += subtotal
      remainingDays -= daysInTier
      currentDay = tierEndDay + 1
    }
  } else {
    totalAmount = chargeDays * (ratePerDay || 0)
    if (chargeDays > 0 && (ratePerDay || 0) > 0) {
      tierBreakdown.push({
        fromDay: 1,
        toDay: chargeDays,
        days: chargeDays,
        ratePerDay: ratePerDay || 0,
        subtotal: totalAmount
      })
    }
  }

  return {
    lastFreeDate,
    chargeDays,
    totalAmount,
    tierBreakdown,
    currency,
    isWithinFreePeriod: false
  }
}

/**
 * 从货柜数据解析滞港费计算所需参数
 */
export interface ContainerDemurrageParams {
  startDate: Date | null
  endDate: Date | null
  /** 免费天数（由 lastFreeDate 推导，无则 undefined） */
  freeDays?: number
  destinationPortCode?: string
  shippingCompanyCode?: string
  originForwarderCode?: string
}

export function parseContainerForDemurrage(containerData: {
  portOperations?: Array<{
    portType?: string
    portCode?: string
    ataDestPort?: Date | string
    etaDestPort?: Date | string
    destPortUnloadDate?: Date | string
    dischargedTime?: Date | string
    lastFreeDate?: Date | string
  }>
  seaFreight?: Array<{ shippingCompanyCode?: string }> | { shippingCompanyCode?: string }
  truckingTransports?: Array<{ pickupDate?: Date | string }>
  order?: { freightForwarderCode?: string }
}): ContainerDemurrageParams {
  const destPort = containerData.portOperations?.find(
    (po) => po.portType === 'destination'
  )

  if (!destPort) {
    return { startDate: null, endDate: null }
  }

  // 起算日：按到港优先 ATA，无则 ETA；按卸船则用 destPortUnloadDate / dischargedTime
  const ata = destPort.ataDestPort
    ? toDateOnly(destPort.ataDestPort as Date)
    : null
  const eta = destPort.etaDestPort
    ? toDateOnly(destPort.etaDestPort as Date)
    : null
  const discharge = (destPort.destPortUnloadDate || destPort.dischargedTime)
    ? toDateOnly(
        (destPort.destPortUnloadDate || destPort.dischargedTime) as Date
      )
    : null

  const startDate = ata || eta || discharge

  // 免费天数：由 lastFreeDate 推导（免费期截止日与起算日之间的自然日数）
  let freeDays: number | undefined
  const lastFree = destPort.lastFreeDate
    ? toDateOnly(destPort.lastFreeDate as Date)
    : null
  if (startDate && lastFree && lastFree >= startDate) {
    freeDays = daysBetween(startDate, lastFree)
  }

  // 截止日：提柜日优先，无则今天
  const pickups = containerData.truckingTransports?.filter(
    (tt) => tt.pickupDate
  )
  const pickupDate =
    pickups && pickups.length > 0
      ? toDateOnly((pickups[0].pickupDate as Date) || new Date())
      : null
  const endDate = pickupDate || toDateOnly(new Date())

  return {
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    freeDays,
    destinationPortCode: destPort.portCode as string | undefined,
    shippingCompanyCode: Array.isArray(containerData.seaFreight)
      ? containerData.seaFreight[0]?.shippingCompanyCode
      : (containerData.seaFreight as any)?.shippingCompanyCode,
    originForwarderCode: (containerData.order as any)?.freightForwarderCode
  }
}

/**
 * 组合式：滞港费计算
 */
export function useDemurrageCalculation(input: Ref<DemurrageCalculationInput | null>) {
  const result = computed<DemurrageCalculationResult | null>(() => {
    const params = input.value
    if (!params) return null
    return calculateDemurrage(params)
  })

  return { result, calculateDemurrage }
}
