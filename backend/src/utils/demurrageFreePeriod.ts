/**
 * 滞港费免费期截止日（last free date）解析。
 *
 * 规则：
 * - freeDays > 0 且自然日：起算日含首日，共 freeDays 个自然日 → LFD = start + (freeDays - 1)
 * - freeDays > 0 且工作日：起算日含首日，共 freeDays 个工作日（跳过周末）
 * - freeDays <= 0：无免费期，LFD = 起算日前一天，使计费从起算日当天开始
 */

/** 周六(6)、周日(0) 为非工作日（UTC） */
export function isWeekendUtc(d: Date): boolean {
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

export function addDaysUtc(d: Date, days: number): Date {
  const result = new Date(d.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * 从起算日起前进 n 个工作日（含起算日本身若为工作日）。
 * n <= 0 时返回起算日副本。
 */
export function addWorkingDaysInclusive(start: Date, n: number): Date {
  if (n <= 0) return new Date(start.getTime());
  const result = new Date(start.getTime());
  let count = 0;
  while (count < n) {
    if (!isWeekendUtc(result)) count++;
    if (count < n) result.setUTCDate(result.getUTCDate() + 1);
  }
  return result;
}

export function freePeriodUsesWorkingDays(basis: string | null | undefined): boolean {
  const b = (basis ?? '').toLowerCase();
  return (
    b.includes('工作+自然') ||
    b.includes('工作 + 自然') ||
    b.includes('natural+working') ||
    b === '工作日' ||
    b === 'working'
  );
}

/**
 * 计算免费期最后一天（含）。计费从次日开始。
 */
export function resolveLastFreeDate(
  startDate: Date,
  freeDays: number,
  freeDaysBasis?: string | null
): Date {
  const days = Number(freeDays);
  if (!Number.isFinite(days) || days <= 0) {
    return addDaysUtc(startDate, -1);
  }
  if (freePeriodUsesWorkingDays(freeDaysBasis)) {
    // inclusive 工作日计数：传入 freeDays，而非 freeDays-1
    return addWorkingDaysInclusive(startDate, days);
  }
  return addDaysUtc(startDate, days - 1);
}
