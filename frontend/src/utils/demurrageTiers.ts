/**
 * 滞港费标准：从阶梯列 1～60、60+ 推导「免费天数」
 * 规则：从第 1 天起连续费率为 0 视为免费；首个费率 >0 的日期 d 表示前 d-1 天为免费期。
 * 若 1～60 天均为 0 且 60+ 列 >0，则免费天数为 60；若全部为 0，则记为 60（表内均为免费档）。
 */

export function deriveFreeDaysFromTiers(tiers: Record<string, unknown> | null | undefined): number {
  if (!tiers || typeof tiers !== 'object') return 0

  const rate = (key: string): number => {
    const v = tiers[key]
    if (v === undefined || v === null || v === '') return 0
    const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '').trim())
    return Number.isFinite(n) ? n : 0
  }

  for (let d = 1; d <= 60; d++) {
    const n = rate(String(d))
    if (n > 0) return d - 1
  }

  const r60p = rate('60+')
  if (r60p > 0) return 60
  return 60
}

/** 无 Excel「免费天数」列时，用 tiers 回填 free_days（已有显式值则不覆盖） */
export function applyDemurrageDerivedFreeDays(transformed: Record<string, unknown>): void {
  const explicit = transformed.free_days
  const hasExplicit = explicit !== undefined && explicit !== null && explicit !== ''
  if (hasExplicit) return
  if (!transformed.tiers || typeof transformed.tiers !== 'object') return
  if (Object.keys(transformed.tiers as object).length === 0) return
  transformed.free_days = deriveFreeDaysFromTiers(transformed.tiers as Record<string, unknown>)
}
