/**
 * 集装箱展示工具函数
 *
 * 提供集装箱列表展示相关的纯函数工具，包括：
 * - 日期计算和格式化
 * - 状态文本转换
 * - 费用展示
 * - 五节点状态判断
 *
 * @packageDocumentation
 */

import type { PortOperation } from '@/types/container'

/**
 * 获取 UTC 天数（用于日期比较）
 *
 * 将日期字符串或 Date 对象转换为 UTC 天数（从 Unix 纪元开始的天数）。
 * 主要用于日期差异计算，避免时区问题。
 *
 * @param input - 日期字符串 (YYYY-MM-DD) 或 Date 对象
 * @returns UTC 天数，如果输入无效则返回 null
 *
 * @example
 * ```typescript
 * getUtcDayNumber('2024-03-15') // 19796
 * getUtcDayNumber(new Date('2024-03-15')) // 19796
 * getUtcDayNumber(null) // null
 * ```
 */
export const getUtcDayNumber = (input: string | Date | null | undefined): number | null => {
  if (!input) return null
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
      const y = Number(m[1])
      const mon = Number(m[2]) - 1
      const d = Number(m[3])
      return Math.floor(Date.UTC(y, mon, d) / 86400000)
    }
  }
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000
  )
}

/**
 * 获取日期标签类型
 *
 * 根据日期与最晚日期的差异，返回 Element Plus Tag 组件的类型：
 * - success (绿色): 早于或等于最晚日期
 * - warning (黄色): 晚于最晚日期 1-3 天
 * - danger (红色): 晚于最晚日期 >3 天
 * - info (灰色): 其他情况或无日期
 *
 * @param date - 要判断的日期
 * @param _actualDate - 实际日期（保留参数，暂未使用）
 * @param type - 日期类型：'eta' | 'pickup' | 'return' | 'shipment' | 'update' | 'delivery' | 'unload'
 * @param lastDate - 最晚日期（提柜日/还箱日）
 * @returns Tag 类型：'success' | 'warning' | 'danger' | 'info'
 *
 * @remarks
 * 特殊规则：
 * - 提柜日和还箱日：如果等于最晚日期，显示为灰色（info）
 * - 其他日期类型：统一显示为灰色（info）
 *
 * @example
 * ```typescript
 * // 早于最晚提柜日
 * getDateTagType('2024-03-10', undefined, 'pickup', '2024-03-15') // 'success'
 *
 * // 晚于最晚还箱日 2 天
 * getDateTagType('2024-03-17', undefined, 'return', '2024-03-15') // 'warning'
 *
 * // 晚于最晚提柜日 5 天
 * getDateTagType('2024-03-20', undefined, 'pickup', '2024-03-15') // 'danger'
 * ```
 */
export const getDateTagType = (
  date: string | Date | null | undefined,
  _actualDate?: string | Date | null | undefined,
  type?: 'eta' | 'pickup' | 'return' | 'shipment' | 'update' | 'delivery' | 'unload',
  lastDate?: string | Date | null | undefined
): 'success' | 'warning' | 'danger' | 'info' => {
  if (!date) return 'info'

  // 提柜日和还箱日的特殊规则
  if (type === 'pickup' || type === 'return') {
    // 最晚提柜日或最晚还箱日固定为灰色
    if ((type === 'pickup' && date === lastDate) || (type === 'return' && date === lastDate)) {
      return 'info'
    }

    // 计划提柜日、实际提柜日、计划还箱日、实际还箱日
    if (lastDate) {
      const dateDay = getUtcDayNumber(date)
      const lastDateDay = getUtcDayNumber(lastDate)
      if (dateDay == null || lastDateDay == null) return 'info'
      const diffDays = dateDay - lastDateDay

      if (diffDays <= 0) {
        return 'success' // 早于或等于最晚提柜日/还箱日为绿色
      } else if (diffDays <= 3) {
        return 'warning' // 晚于最晚提柜日/还箱日 3 天内为黄色
      } else {
        return 'danger' // 晚于最晚提柜日/还箱日>3 天为红色
      }
    }
  }

  // 其他日期（包括 ETA、修正 ETA、ATA、出运日期、更新日期、送仓日期、卸柜日期）都显示为灰色
  return 'info'
}

/**
 * 获取目的地港口显示文本
 *
 * 优先使用港口名称，如果没有则使用港口代码，最后降级为 '-'
 *
 * @param row - 集装箱数据行
 * @param row.destinationPortName - 目的港名称
 * @param row.destinationPort - 目的港代码
 * @returns 港口显示文本
 *
 * @example
 * ```typescript
 * getDestinationPortDisplay({ destinationPortName: '洛杉矶港', destinationPort: 'USLAX' }) // '洛杉矶港'
 * getDestinationPortDisplay({ destinationPort: 'USLAX' }) // 'USLAX'
 * getDestinationPortDisplay({}) // '-'
 * ```
 */
export const getDestinationPortDisplay = (row: any): string => {
  return row.destinationPortName || row.destinationPort || '-'
}

/**
 * 五节点状态类型
 *
 * @remarks
 * - ok: 已完成/正常状态（绿色图标）
 * - bad: 未完成/异常状态（红色图标）
 * - warn: 进行中/需关注状态（黄色图标）
 */
export type FiveNodeKind = 'ok' | 'bad' | 'warn'

/**
 * 获取五节点状态图标类型
 *
 * 根据集装箱数据判断五个关键节点的状态：
 * 1. 清关状态 (customs)
 * 2. 提柜状态 (pickup)
 * 3. 卸柜状态 (unload)
 * 4. 还箱状态 (emptyReturn)
 * 5. 查验状态 (inspection)
 *
 * @param row - 集装箱数据行
 * @param row.customsStatus - 清关状态：'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | 'PENDING'
 * @param row.plannedPickupDate - 计划提柜日期
 * @param row.pickupDate - 实际提柜日期
 * @param row.logisticsStatus - 物流状态
 * @param row.returnTime - 还箱时间
 * @param row.inspectionRequired - 是否需要查验
 * @returns 五个节点的状态类型对象
 *
 * @example
 * ```typescript
 * getFiveNodeKinds({
 *   customsStatus: 'COMPLETED',
 *   plannedPickupDate: '2024-03-15',
 *   logisticsStatus: 'unloaded',
 *   returnTime: '2024-03-20',
 *   inspectionRequired: false
 * })
 * // { customs: 'ok', pickup: 'ok', unload: 'ok', emptyReturn: 'ok', inspection: 'ok' }
 * ```
 */
export const getFiveNodeKinds = (
  row: any
): {
  customs: FiveNodeKind
  pickup: FiveNodeKind
  unload: FiveNodeKind
  emptyReturn: FiveNodeKind
  inspection: FiveNodeKind
} => {
  const customsStatus = row.customsStatus as string | undefined
  let customs: FiveNodeKind = 'bad'
  if (!customsStatus) customs = 'bad'
  else if (customsStatus === 'COMPLETED') customs = 'ok'
  else if (customsStatus === 'FAILED') customs = 'bad'
  else customs = 'warn'

  const pickup: FiveNodeKind = row.plannedPickupDate || row.pickupDate ? 'ok' : 'bad'

  const s = String(row.logisticsStatus || '').toLowerCase()
  let unload: FiveNodeKind = 'bad'
  if (['unloaded', 'returned_empty'].includes(s)) unload = 'ok'
  else if (['at_port', 'picked_up'].includes(s)) unload = 'warn'
  else unload = 'bad'

  let emptyReturn: FiveNodeKind = 'bad'
  if (row.returnTime) emptyReturn = 'ok'
  else if (['unloaded', 'picked_up'].includes(s)) emptyReturn = 'warn'
  else emptyReturn = 'bad'

  const inspection: FiveNodeKind = row.inspectionRequired ? 'warn' : 'ok'

  return { customs, pickup, unload, emptyReturn, inspection }
}

/**
 * 获取五节点行数据
 *
 * 生成用于展示的五个节点的完整信息，包括状态图标类型、标签类型和显示文本。
 *
 * @param row - 集装箱数据行
 * @returns 五个节点的展示数据数组
 *
 * @example
 * ```typescript
 * getFiveNodeRows(containerData)
 * // [
 * //   { kind: 'ok', type: 'info', text: '已完成' },
 * //   { kind: 'ok', type: 'warning', text: '已计划提柜' },
 * //   { kind: 'ok', type: 'primary', text: '已卸柜' },
 * //   { kind: 'ok', type: 'success', text: '已还箱' },
 * //   { kind: 'ok', type: 'info', text: '免查验' }
 * // ]
 * ```
 */
export const getFiveNodeRows = (row: any) => {
  const k = getFiveNodeKinds(row)
  const unloaded = ['unloaded', 'returned_empty'].includes(
    String(row.logisticsStatus || '').toLowerCase()
  )
  return [
    {
      kind: k.customs,
      type: 'info' as const,
      text: getCustomsStatusText(row.customsStatus),
    },
    {
      kind: k.pickup,
      type: 'warning' as const,
      text: row.plannedPickupDate ? '已计划提柜' : '未计划提柜',
    },
    {
      kind: k.unload,
      type: 'primary' as const,
      text: unloaded ? '已卸柜' : '未卸柜',
    },
    {
      kind: k.emptyReturn,
      type: 'success' as const,
      text: row.returnTime ? '已还箱' : '未还箱',
    },
    {
      kind: k.inspection,
      type: (row.inspectionRequired ? 'warning' : 'info') as 'warning' | 'info',
      text: row.inspectionRequired ? '需查验' : '免查验',
    },
  ]
}

/**
 * 获取清关状态文本
 *
 * 将清关状态枚举值转换为中文显示文本。
 *
 * @param status - 清关状态：'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | 'PENDING'
 * @returns 中文状态文本
 *
 * @example
 * ```typescript
 * getCustomsStatusText('COMPLETED') // '已完成'
 * getCustomsStatusText('IN_PROGRESS') // '清关中'
 * getCustomsStatusText('FAILED') // '失败'
 * getCustomsStatusText() // '未清关'
 * ```
 */
export const getCustomsStatusText = (status?: string): string => {
  if (!status) return '未清关'
  const customsStatusMap: Record<string, { text: string }> = {
    COMPLETED: { text: '已完成' },
    IN_PROGRESS: { text: '清关中' },
    FAILED: { text: '失败' },
    PENDING: { text: '待清关' },
  }
  const mapped = customsStatusMap[status]?.text
  return mapped || '未知状态'
}

/**
 * 获取修正 ETA（从港口操作记录中获取）
 *
 * 从目的港的港口操作记录中提取修正后的预计到港时间（ETA Correction）。
 *
 * @param container - 集装箱数据对象
 * @param container.portOperations - 港口操作记录数组
 * @param portOperations - 可选的港口操作记录数组（优先使用此参数）
 * @returns 修正 ETA 日期，如果没有则返回 null
 *
 * @example
 * ```typescript
 * // 从容器对象中获取
 * getEtaCorrection(container)
 *
 * // 直接传入港口操作记录
 * getEtaCorrection(null, portOperations)
 * ```
 */
export const getEtaCorrection = (
  container: any,
  portOperations?: PortOperation[]
): string | Date | null => {
  const portOps = portOperations || (container.portOperations as PortOperation[] | undefined)
  if (!portOps) return null

  const destPortOp = portOps.find(po => po.portType === 'destination')
  return destPortOp?.etaCorrection || null
}

/**
 * 列表预警列徽章文案
 *
 * 将预警类型枚举值转换为中文显示文本，用于列表预警列的徽章展示。
 *
 * @param type - 预警类型
 * @returns 中文预警类型文本
 *
 * @example
 * ```typescript
 * formatAlertTypeBadge('customs') // '清关'
 * formatAlertTypeBadge('demurrage') // '滞港'
 * formatAlertTypeBadge('inspection') // '查验'
 * formatAlertTypeBadge(undefined) // '—'
 * ```
 */
export const formatAlertTypeBadge = (type: string | undefined): string => {
  if (!type) return '—'
  const map: Record<string, string> = {
    customs: '清关',
    trucking: '拖卡',
    unloading: '卸柜',
    emptyReturn: '还箱',
    inspection: '查验',
    demurrage: '滞港',
    detention: '滞箱',
    rollover: '甩柜',
    shipmentChange: '船期',
    other: '其他',
  }
  return map[type] || type
}

/**
 * 费用模式文本
 *
 * 将费用模式转换为中文显示文本。
 *
 * @param mode - 费用模式：'actual' (实际) | 'forecast' (预计)
 * @returns 中文费用模式文本
 *
 * @example
 * ```typescript
 * formatCostModeText('actual') // '实际'
 * formatCostModeText('forecast') // '预计'
 * ```
 */
export const formatCostModeText = (mode?: 'actual' | 'forecast' | string): string => {
  if (mode === 'actual') return '实际'
  if (mode === 'forecast') return '预计'
  return '预计'
}

/**
 * 费用项名称
 *
 * 获取费用项的显示名称，优先使用 chargeName，否则根据 chargeType 映射为标准名称。
 *
 * @param item - 费用项对象
 * @param item.chargeName - 费用名称（优先使用）
 * @param item.chargeType - 费用类型代码
 * @returns 中文费用项名称
 *
 * @example
 * ```typescript
 * formatCostItemName({ chargeName: '码头操作费', chargeType: 'THC' }) // '码头操作费'
 * formatCostItemName({ chargeType: 'DEMURRAGE' }) // '滞港费'
 * formatCostItemName({ chargeType: 'DETENTION' }) // '滞箱费'
 * ```
 */
export const formatCostItemName = (item: {
  chargeType?: string | null
  chargeName?: string | null
}): string => {
  if (item.chargeName) return item.chargeName
  const type = String(item.chargeType || '').toUpperCase()
  const typeMap: Record<string, string> = {
    DEMURRAGE: '滞港费',
    DETENTION: '滞箱费',
    STORAGE: '堆存费',
    D_AND_D: 'D&D',
    PICKUP: '提柜费',
    DELIVERY: '送仓费',
    INSPECTION: '查验费',
  }
  return typeMap[type] || '费用项'
}

/**
 * 获取货币前缀
 *
 * 根据销往国家、国家货币或费用明细中的货币，返回对应的货币符号。
 *
 * 优先级顺序：
 * 1. countryCurrency（国家货币）
 * 2. sellToCountry（销往国家）→ 国家对应货币
 * 3. costBreakdown.currency（费用明细货币）
 * 4. 默认：'$' (美元)
 *
 * @param row - 集装箱数据行
 * @param row.countryCurrency - 国家货币代码
 * @param row.sellToCountry - 销往国家代码
 * @param row.costBreakdown.currency - 费用明细货币代码
 * @returns 货币符号（如 '$', '¥', '€' 等）
 *
 * @example
 * ```typescript
 * getRowCurrencyPrefix({ countryCurrency: 'USD' }) // '$'
 * getRowCurrencyPrefix({ sellToCountry: 'CN' }) // '¥'
 * getRowCurrencyPrefix({ costBreakdown: { currency: 'EUR' } }) // '€'
 * ```
 */
export const getRowCurrencyPrefix = (row: any): string => {
  const COUNTRY_CURRENCY_SYMBOL_MAP: Record<string, string> = {
    CN: '¥',
    US: '$',
    GB: '£',
    EU: '€',
    DE: '€',
    FR: '€',
    ES: '€',
    IT: '€',
    NL: '€',
    BE: '€',
    JP: '¥',
    KR: '₩',
    CA: 'C$',
    AU: 'A$',
  }

  const CURRENCY_SYMBOL_MAP: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    KRW: '₩',
    CAD: 'C$',
    AUD: 'A$',
  }

  const countryCurrency = String(row.countryCurrency || '')
    .trim()
    .toUpperCase()
  if (countryCurrency && CURRENCY_SYMBOL_MAP[countryCurrency]) {
    return CURRENCY_SYMBOL_MAP[countryCurrency]
  }
  if (countryCurrency) return `${countryCurrency} `

  const countryCode = String(row.sellToCountry || '')
    .trim()
    .toUpperCase()
  if (countryCode && COUNTRY_CURRENCY_SYMBOL_MAP[countryCode]) {
    return COUNTRY_CURRENCY_SYMBOL_MAP[countryCode]
  }
  const currency = String(row.costBreakdown?.currency || '')
    .trim()
    .toUpperCase()
  if (currency && CURRENCY_SYMBOL_MAP[currency]) return CURRENCY_SYMBOL_MAP[currency]
  if (currency) return `${currency} `
  return '$'
}

/**
 * HTML 转义
 *
 * 将字符串中的特殊字符转换为 HTML 实体，防止 XSS 攻击。
 *
 * @param s - 要转义的字符串
 * @returns 转义后的字符串
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("XSS")</script>')
 * // '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 *
 * escapeHtml('Tom & Jerry')
 * // 'Tom &amp; Jerry'
 * ```
 */
export const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/**
 * 获取费用详情文本
 *
 * 生成包含所有费用项的 HTML 格式详情文本，用于 Tooltip 或弹窗展示。
 *
 * @param row - 集装箱数据行
 * @param row.costBreakdown.items - 费用项数组
 * @param row.costBreakdown.items[].mode - 费用模式：'actual' | 'forecast'
 * @param row.costBreakdown.items[].amount - 费用金额
 * @param row.costBreakdown.items[].chargeType - 费用类型
 * @param row.costBreakdown.items[].chargeName - 费用名称
 * @returns HTML 格式的费用详情文本（使用<br/>分隔各项）
 *
 * @example
 * ```typescript
 * getCostDetailsText({
 *   costBreakdown: {
 *     items: [
 *       { chargeType: 'DEMURRAGE', amount: 500, mode: 'actual' },
 *       { chargeType: 'DETENTION', amount: 300, mode: 'forecast' }
 *     ]
 *   }
 * })
 * // '滞港费（实际）：$500.00<br/>滞箱费（预计）：$300.00'
 * ```
 */
export const getCostDetailsText = (row: any): string => {
  const items = row.costBreakdown?.items || []
  if (!items.length) return '暂无费用明细'
  const prefix = getRowCurrencyPrefix(row)
  const lines = items.map(
    (item: any) =>
      `${escapeHtml(formatCostItemName(item))}（${formatCostModeText(item.mode)}）：${prefix}${Number(item.amount || 0).toFixed(2)}`
  )
  return lines.join('<br/>')
}
