/**
 * 滞港费标准：从阶梯列 1～60、60+ 推导「免费天数」（与 frontend/src/utils/demurrageTiers.ts 保持一致）
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

/** 若 Excel 显式提供「免费天数」则用之；否则从 tiers 推导 */
export function resolveDemurrageFreeDays(
  freeDaysRaw: unknown,
  tiers: Record<string, unknown> | null | undefined
): number {
  const explicit = parseExplicitFreeDays(freeDaysRaw)
  if (explicit !== null) return explicit
  if (tiers && typeof tiers === 'object' && Object.keys(tiers).length > 0) {
    return deriveFreeDaysFromTiers(tiers)
  }
  return 0
}

function parseExplicitFreeDays(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null
  if (raw === '') return null
  if (typeof raw === 'string' && raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}
