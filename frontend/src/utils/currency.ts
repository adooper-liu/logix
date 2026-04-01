/**
 * 货币格式化工具
 * Currency Formatting Utilities
 */

/** 国家/地区代码到货币符号映射 */
export const COUNTRY_CURRENCY_MAP: Record<string, { symbol: string; code: string }> = {
  US: { symbol: '$', code: 'USD' },
  CN: { symbol: '¥', code: 'CNY' },
  GB: { symbol: '£', code: 'GBP' },
  EU: { symbol: '€', code: 'EUR' },
  DE: { symbol: '€', code: 'EUR' },
  FR: { symbol: '€', code: 'EUR' },
  IT: { symbol: '€', code: 'EUR' },
  ES: { symbol: '€', code: 'EUR' },
  NL: { symbol: '€', code: 'EUR' },
  BE: { symbol: '€', code: 'EUR' },
  JP: { symbol: '¥', code: 'JPY' },
  KR: { symbol: '₩', code: 'KRW' },
  CA: { symbol: 'C$', code: 'CAD' },
  AU: { symbol: 'A$', code: 'AUD' },
  IN: { symbol: '₹', code: 'INR' },
  BR: { symbol: 'R$', code: 'BRL' },
  MX: { symbol: '$', code: 'MXN' },
  RU: { symbol: '₽', code: 'RUB' },
  ZA: { symbol: 'R', code: 'ZAR' },
  SE: { symbol: 'kr', code: 'SEK' },
  NO: { symbol: 'kr', code: 'NOK' },
  DK: { symbol: 'kr', code: 'DKK' },
  CH: { symbol: 'Fr', code: 'CHF' },
  PL: { symbol: 'zł', code: 'PLN' },
  TH: { symbol: '฿', code: 'THB' },
  MY: { symbol: 'RM', code: 'MYR' },
  SG: { symbol: 'S$', code: 'SGD' },
  HK: { symbol: 'HK$', code: 'HKD' },
  TW: { symbol: 'NT$', code: 'TWD' },
  VN: { symbol: '₫', code: 'VND' },
  PH: { symbol: '₱', code: 'PHP' },
  ID: { symbol: 'Rp', code: 'IDR' },
}

/**
 * 根据货币代码获取货币符号
 * @param currencyCode 货币代码（如 USD, EUR, CNY）
 * @returns 货币符号（如 $, €, ¥）
 */
export function getCurrencySymbol(currencyCode: string): string {
  if (!currencyCode) return '$' // 默认 USD

  // 尝试直接匹配货币代码
  for (const [countryCode, currency] of Object.entries(COUNTRY_CURRENCY_MAP)) {
    if (currency.code === currencyCode.toUpperCase()) {
      return currency.symbol
    }
  }

  // 如果货币代码是两位，尝试作为国家代码匹配
  if (currencyCode.length === 2) {
    const countryCode = currencyCode.toUpperCase()
    return COUNTRY_CURRENCY_MAP[countryCode]?.symbol || '$'
  }

  // 默认返回 $
  return '$'
}

/**
 * 格式化货币金额（带千分位和指定小数位）
 * @param amount 金额
 * @param currencyCode 货币代码（如 USD, EUR, CNY）
 * @param options 格式化选项
 * @returns 格式化后的货币字符串（如 $1,000.00）
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  options: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    showSymbol?: boolean
    showCode?: boolean
  } = {}
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSymbol = true,
    showCode = false,
  } = options

  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  })

  if (showCode && showSymbol) {
    const symbol = getCurrencySymbol(currencyCode)
    return `${currencyCode} ${symbol}${formattedAmount}`
  }

  if (showCode) {
    return `${currencyCode} ${formattedAmount}`
  }

  if (showSymbol) {
    const symbol = getCurrencySymbol(currencyCode)
    return `${symbol}${formattedAmount}`
  }

  return formattedAmount
}

/**
 * 格式化滞港费金额（兼容旧代码，显示货币代码 + 金额）
 * @param amount 金额
 * @param currency 货币代码
 * @deprecated 请使用 formatCurrency
 */
export function formatDemurrageAmount(amount: number, currency: string): string {
  return formatCurrency(amount, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    showSymbol: false,
    showCode: true,
  })
}
