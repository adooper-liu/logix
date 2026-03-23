/**
 * 统计接口与按条件列表接口对账（CI 可跑）
 *
 * 对比 GET /containers/statistics-detailed 各分组数值
 * 与 GET /containers/by-filter?filterCondition=... 返回的 count 是否一致，
 * 防止「统计口径」与「列表筛选口径」漂移。
 *
 * 用法：
 *   cd backend && npx tsx scripts/verify-statistics-by-filter-consistency.ts
 *
 * 环境变量：
 *   API_BASE_URL   默认 http://localhost:3001/api/v1
 *   START_DATE     可选，YYYY-MM-DD；未设置时默认本年 1 月 1 日（与 Shipments 默认窗口对齐，避免无日期时状态统计与 by-filter 口径不一致）
 *   END_DATE       可选，YYYY-MM-DD；未设置时默认今天
 *   AUTH_TOKEN     可选，Bearer Token（需登录的接口）
 *   COUNTRY_CODE   可选，对应请求头 X-Country-Code
 *   VERBOSE        设为 1 时打印每条 OK
 *
 * CI 示例：
 *   - 先启动后端，再执行 npm run verify:stats-filter
 */

type Check = {
  group: string
  statKey: string
  filterCondition: string
}

const CHECKS: Check[] = [
  // statusDistribution → filterCondition（与 ContainerStatisticsService.getContainersByCondition 一致）
  { group: 'statusDistribution', statKey: 'not_shipped', filterCondition: 'not_shipped' },
  { group: 'statusDistribution', statKey: 'shipped', filterCondition: 'shipped' },
  { group: 'statusDistribution', statKey: 'in_transit', filterCondition: 'in_transit' },
  { group: 'statusDistribution', statKey: 'at_port', filterCondition: 'at_port' },
  { group: 'statusDistribution', statKey: 'arrived_at_transit', filterCondition: 'arrived_at_transit' },
  { group: 'statusDistribution', statKey: 'arrived_at_destination', filterCondition: 'arrived_at_destination' },
  { group: 'statusDistribution', statKey: 'picked_up', filterCondition: 'picked_up' },
  { group: 'statusDistribution', statKey: 'unloaded', filterCondition: 'unloaded' },
  { group: 'statusDistribution', statKey: 'returned_empty', filterCondition: 'returned_empty' },

  // arrivalDistribution（与 useContainerCountdown / FilterConditions 一致）
  { group: 'arrivalDistribution', statKey: 'arrivedAtDestination', filterCondition: 'arrivedAtDestination' },
  { group: 'arrivalDistribution', statKey: 'arrivedAtTransit', filterCondition: 'arrivedAtTransit' },
  { group: 'arrivalDistribution', statKey: 'expectedArrival', filterCondition: 'expectedArrival' },
  { group: 'arrivalDistribution', statKey: 'today', filterCondition: 'arrivalToday' },
  { group: 'arrivalDistribution', statKey: 'arrivedBeforeTodayNotPickedUp', filterCondition: 'arrivedBeforeTodayNotPickedUp' },
  { group: 'arrivalDistribution', statKey: 'arrivedBeforeTodayPickedUp', filterCondition: 'arrivedBeforeTodayPickedUp' },
  { group: 'arrivalDistribution', statKey: 'arrivedBeforeTodayNoATA', filterCondition: 'arrivedBeforeTodayNoATA' },
  { group: 'arrivalDistribution', statKey: 'transitOverdue', filterCondition: 'transitOverdue' },
  { group: 'arrivalDistribution', statKey: 'transitWithin3Days', filterCondition: 'transitWithin3Days' },
  { group: 'arrivalDistribution', statKey: 'transitWithin7Days', filterCondition: 'transitWithin7Days' },
  { group: 'arrivalDistribution', statKey: 'transitOver7Days', filterCondition: 'transitOver7Days' },
  { group: 'arrivalDistribution', statKey: 'transitNoETA', filterCondition: 'transitNoETA' },
  { group: 'arrivalDistribution', statKey: 'overdue', filterCondition: 'overdue' },
  { group: 'arrivalDistribution', statKey: 'within3Days', filterCondition: 'within3Days' },
  { group: 'arrivalDistribution', statKey: 'within7Days', filterCondition: 'within7Days' },
  { group: 'arrivalDistribution', statKey: 'over7Days', filterCondition: 'over7Days' },
  { group: 'arrivalDistribution', statKey: 'other', filterCondition: 'otherRecords' },

  // pickupDistribution（字段名与 PlannedPickupStatistics.getDistribution 返回一致）
  { group: 'pickupDistribution', statKey: 'overdue', filterCondition: 'overduePlanned' },
  { group: 'pickupDistribution', statKey: 'todayPlanned', filterCondition: 'todayPlanned' },
  { group: 'pickupDistribution', statKey: 'within3Days', filterCondition: 'plannedWithin3Days' },
  { group: 'pickupDistribution', statKey: 'within7Days', filterCondition: 'plannedWithin7Days' },
  { group: 'pickupDistribution', statKey: 'pending', filterCondition: 'pendingArrangement' },

  // lastPickupDistribution
  { group: 'lastPickupDistribution', statKey: 'expired', filterCondition: 'expired' },
  { group: 'lastPickupDistribution', statKey: 'urgent', filterCondition: 'urgent' },
  { group: 'lastPickupDistribution', statKey: 'warning', filterCondition: 'warning' },
  { group: 'lastPickupDistribution', statKey: 'normal', filterCondition: 'normal' },
  { group: 'lastPickupDistribution', statKey: 'noLastFreeDate', filterCondition: 'noLastFreeDate' },

  // returnDistribution → lastReturn 筛选键
  { group: 'returnDistribution', statKey: 'expired', filterCondition: 'returnExpired' },
  { group: 'returnDistribution', statKey: 'urgent', filterCondition: 'returnUrgent' },
  { group: 'returnDistribution', statKey: 'warning', filterCondition: 'returnWarning' },
  { group: 'returnDistribution', statKey: 'normal', filterCondition: 'returnNormal' },
  { group: 'returnDistribution', statKey: 'noLastReturnDate', filterCondition: 'noLastReturnDate' }
]

function getStatValue(data: Record<string, Record<string, unknown>>, group: string, key: string): number {
  const g = data[group]
  if (!g || typeof g !== 'object') return 0
  const v = g[key]
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

async function fetchJson(
  url: string,
  headers: Record<string, string>
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(url, { headers })
  const text = await res.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    body = { raw: text }
  }
  return { ok: res.ok, status: res.status, body }
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 与页面「有出运日期筛选」一致：无环境变量时使用本年 1/1～今天 */
function resolveDateRange(): { startDate: string; endDate: string } {
  const fromEnv = process.env.START_DATE?.trim()
  const toEnv = process.env.END_DATE?.trim()
  if (fromEnv && toEnv) {
    return { startDate: fromEnv, endDate: toEnv }
  }
  const now = new Date()
  const y = now.getFullYear()
  const startDate = `${y}-01-01`
  const endDate = `${y}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
  return { startDate, endDate }
}

async function main(): Promise<void> {
  const base =
    process.env.API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3001/api/v1'
  const { startDate, endDate } = resolveDateRange()
  const verbose = process.env.VERBOSE === '1'

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache'
  }
  if (process.env.AUTH_TOKEN) {
    headers.Authorization = `Bearer ${process.env.AUTH_TOKEN}`
  }
  if (process.env.COUNTRY_CODE) {
    headers['X-Country-Code'] = process.env.COUNTRY_CODE
  }

  const qs = new URLSearchParams()
  qs.set('startDate', startDate)
  qs.set('endDate', endDate)
  const statsUrl = `${base}/containers/statistics-detailed?${qs}`

  const statsRes = await fetchJson(statsUrl, headers)
  if (!statsRes.ok || typeof statsRes.body !== 'object' || statsRes.body === null) {
    console.error('[verify] statistics-detailed failed:', statsRes.status, statsRes.body)
    process.exit(1)
  }

  const payload = statsRes.body as { success?: boolean; data?: Record<string, Record<string, unknown>> }
  if (!payload.success || !payload.data) {
    console.error('[verify] statistics-detailed invalid payload:', payload)
    process.exit(1)
  }

  const data = payload.data
  const mismatches: string[] = []

  for (const { group, statKey, filterCondition } of CHECKS) {
    const expected = getStatValue(data as Record<string, Record<string, unknown>>, group, statKey)
    const filterQs = new URLSearchParams({ filterCondition })
    filterQs.set('startDate', startDate)
    filterQs.set('endDate', endDate)
    const filterUrl = `${base}/containers/by-filter?${filterQs}`

    const filterRes = await fetchJson(filterUrl, headers)
    if (!filterRes.ok || typeof filterRes.body !== 'object' || filterRes.body === null) {
      mismatches.push(
        `${group}.${statKey} → ${filterCondition}: by-filter HTTP ${filterRes.status} ${JSON.stringify(filterRes.body)}`
      )
      continue
    }

    const fr = filterRes.body as { success?: boolean; count?: number }
    const actual = Number(fr.count ?? 0)
    if (!Number.isFinite(actual)) {
      mismatches.push(`${group}.${statKey} → ${filterCondition}: invalid count in response`)
      continue
    }

    if (expected !== actual) {
      mismatches.push(
        `${group}.${statKey} → ${filterCondition}: expected=${expected} actual=${actual}`
      )
    } else if (verbose) {
      console.log(`OK ${group}.${statKey} → ${filterCondition}: ${expected}`)
    }
  }

  if (mismatches.length > 0) {
    console.error('[verify] Statistics vs by-filter MISMATCH:')
    for (const line of mismatches) {
      console.error('  -', line)
    }
    console.error(`[verify] Failed: ${mismatches.length} mismatch(es)`)
    process.exit(1)
  }

  console.log(`[verify] OK: ${CHECKS.length} pairs matched (date ${startDate}..${endDate})`)
}

main().catch(err => {
  console.error('[verify] Fatal:', err)
  process.exit(1)
})
