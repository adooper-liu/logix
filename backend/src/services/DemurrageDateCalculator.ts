/**
 * 滞港费日期计算服务
 * Demurrage Date Calculator Service
 *
 * 职责：计算免费期、计费天数、日期区间
 * - 工作日/自然日计算
 * - 最晚免费日计算
 * - 计费天数计算
 * - 日期区间验证
 *
 * @since 2026-03-30 (从 DemurrageService 拆分)
 */

import { logger } from '../utils/logger';

export interface DateRangeResult {
  startDate: Date;
  endDate: Date;
  startDateSource: string | null;
  endDateSource: string | null;
  startDateMode: 'actual' | 'forecast';
  endDateMode: 'actual' | 'forecast';
}

export interface FreePeriodResult {
  lastFreeDate: Date;
  lastFreeDateMode: 'actual' | 'forecast';
  freeDays: number;
  freeDaysBasis?: string;
}

export interface ChargeDaysResult {
  chargeDays: number;
  chargeStart: Date;
  chargeEnd: Date;
  isWorkingDaysOnly: boolean;
}

export class DemurrageDateCalculator {
  /**
   * 添加天数到指定日期
   *
   * **业务规则**:
   * 1. 使用 UTC 时间避免时区问题
   * 2. 支持负数（向前推算）
   *
   * **算法复杂度**: O(1)
   *
   * @param d 起始日期
   * @param days 要添加的天数
   * @returns 结果日期
   */
  addDays(d: Date, days: number): Date {
    const result = new Date(d);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  /**
   * 计算两个日期之间的天数
   *
   * **业务规则**:
   * 1. 包含首尾两天（+1）
   * 2. 使用 UTC 时间
   *
   * **算法复杂度**: O(1)
   *
   * @param start 开始日期
   * @param end 结束日期
   * @returns 天数差
   */
  daysBetween(start: Date, end: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
  }

  /**
   * 判断是否为周末（周六或周日）
   *
   * **业务规则**:
   * 1. 周六 (6)、周日 (0) 为非工作日
   * 2. 使用 UTC 时间
   *
   * @param d 日期
   * @returns 是否为周末
   */
  isWeekend(d: Date): boolean {
    const dow = d.getUTCDay();
    return dow === 0 || dow === 6;
  }

  /**
   * 添加工作日到指定日期
   *
   * **业务规则**:
   * 1. 跳过周六和周日
   * 2. n=免费天数 -1（例如 7 天免费期，实际上是往后数 6 天）
   * 3. 支持 n=0（返回原日期）
   *
   * **算法复杂度**: O(n)，n=工作日天数
   *
   * @param start 起始日期
   * @param n 要添加的工作日天数 (freeDays - 1)
   * @returns 结果日期
   */
  addWorkingDays(start: Date, n: number): Date {
    if (n <= 0) return new Date(start.getTime());

    const result = new Date(start.getTime());
    let count = 0;

    while (count < n) {
      // 先检查当前是否为工作日，如果是则计数
      if (!this.isWeekend(result)) {
        count++;
      }
      // 如果还没达到目标天数，继续下一天
      if (count < n) {
        result.setUTCDate(result.getUTCDate() + 1);
      }
    }

    return result;
  }

  /**
   * 计算两个日期之间的工作日天数
   *
   * **业务规则**:
   * 1. 排除周六和周日
   * 2. 包含首尾两天
   * 3. 使用 UTC 时间遍历
   *
   * **算法复杂度**: O(n)，n=总天数
   *
   * @param start 开始日期
   * @param end 结束日期
   * @returns 工作日天数
   */
  workingDaysBetween(start: Date, end: Date): number {
    let count = 0;
    const cur = new Date(start.getTime());
    const endTime = end.getTime();

    while (cur.getTime() <= endTime) {
      if (!this.isWeekend(cur)) count++;
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    return count;
  }

  /**
   * 判断免费期是否使用工作日计算
   *
   * **业务规则**:
   * 1. 检查 freeDaysBasis 字段
   * 2. 支持的关键词：工作日、working、工作 + 自然、natural+working
   *
   * @param basis 免费期计算基础
   * @returns 是否使用工作日
   */
  freePeriodUsesWorkingDays(basis: string | null | undefined): boolean {
    const b = (basis ?? '').toLowerCase();
    return (
      b.includes('工作 + 自然') ||
      b.includes('natural+working') ||
      b === '工作日' ||
      b === 'working'
    );
  }

  /**
   * 判断计费期是否使用工作日计算
   *
   * **业务规则**:
   * 1. 检查 freeDaysBasis 字段
   * 2. 支持的关键词：工作日、working、自然 + 工作、working+natural
   *
   * @param basis 免费期计算基础
   * @returns 是否使用工作日
   */
  chargePeriodUsesWorkingDays(basis: string | null | undefined): boolean {
    const b = (basis ?? '').toLowerCase();
    return (
      b.includes('自然 + 工作') ||
      b.includes('working+natural') ||
      b === '工作日' ||
      b === 'working'
    );
  }

  /**
   * 计算最晚免费日
   *
   * **业务规则**:
   * 1. 免费天数 = N，则免费期为 N-1 天（第 N 天是最后一天免费）
   * 2. 根据 freeDaysBasis 选择自然日或工作日
   * 3. 标注计算模式（actual/forecast）
   *
   * **算法复杂度**: O(n)，n=免费天数
   *
   * @param startDate 起算日
   * @param freeDays 免费天数
   * @param freeDaysBasis 免费期计算基础
   * @param mode 计算模式
   * @returns 免费期计算结果
   *
   * @example
   * // 示例：7 天免费期，自然日
   * const result = calculateLastFreeDate(new Date('2026-03-01'), 7, '自然日', 'actual');
   * // 返回：lastFreeDate = 2026-03-07, lastFreeDateMode = 'actual'
   */
  calculateLastFreeDate(
    startDate: Date,
    freeDays: number,
    freeDaysBasis?: string | null,
    mode: 'actual' | 'forecast' = 'forecast'
  ): FreePeriodResult {
    const n = Math.max(0, freeDays - 1);

    const lastFreeDate = this.freePeriodUsesWorkingDays(freeDaysBasis)
      ? this.addWorkingDays(startDate, n)
      : this.addDays(startDate, n);

    logger.debug(`[DemurrageDate] Last free date calculation:`, {
      startDate,
      freeDays,
      freeDaysBasis,
      usesWorkingDays: this.freePeriodUsesWorkingDays(freeDaysBasis),
      lastFreeDate
    });

    return {
      lastFreeDate,
      lastFreeDateMode: mode,
      freeDays,
      freeDaysBasis: freeDaysBasis ?? undefined
    };
  }

  /**
   * 计算计费天数
   *
   * **业务规则**:
   * 1. 从免费期次日起算
   * 2. 根据 freeDaysBasis 选择自然日或工作日
   * 3. 如果结束日期 <= 免费期截止日，则计费天数 = 0
   *
   * **算法复杂度**: O(n)，n=计费天数
   *
   * @param lastFreeDate 最晚免费日
   * @param endDate 结束日期
   * @param freeDaysBasis 免费期计算基础
   * @returns 计费天数结果
   *
   * @example
   * // 示例：免费期 3/7 截止，3/8 开始计费，到 3/15
   * const result = calculateChargeDays(new Date('2026-03-07'), new Date('2026-03-15'), '自然日');
   * // 返回：chargeDays = 8, chargeStart = 2026-03-08, chargeEnd = 2026-03-15
   */
  calculateChargeDays(
    lastFreeDate: Date,
    endDate: Date,
    freeDaysBasis?: string | null
  ): ChargeDaysResult {
    const chargeStart = this.addDays(lastFreeDate, 1);
    const isWorkingDaysOnly = this.chargePeriodUsesWorkingDays(freeDaysBasis);

    const chargeDays = isWorkingDaysOnly
      ? this.workingDaysBetween(chargeStart, endDate)
      : this.daysBetween(chargeStart, endDate);

    logger.debug(`[DemurrageDate] Charge days calculation:`, {
      lastFreeDate,
      endDate,
      freeDaysBasis,
      chargeStart,
      chargeDays,
      isWorkingDaysOnly
    });

    return {
      chargeDays: Math.max(0, chargeDays),
      chargeStart,
      chargeEnd: endDate,
      isWorkingDaysOnly
    };
  }

  /**
   * 计算单项费用的完整日期逻辑
   *
   * **业务规则**:
   * 1. 先计算最晚免费日
   * 2. 再计算计费天数
   * 3. 如果在免费期内，返回 0 费用
   *
   * **算法复杂度**: O(n)，n=免费天数 + 计费天数
   *
   * @param startDate 起算日
   * @param endDate 结束日期
   * @param freeDays 免费天数
   * @param freeDaysBasis 免费期计算基础
   * @param mode 计算模式
   * @returns 免费期和计费天数结果
   */
  calculateSingleItemDates(
    startDate: Date,
    endDate: Date,
    freeDays: number,
    freeDaysBasis?: string | null,
    mode: 'actual' | 'forecast' = 'forecast'
  ): {
    freePeriod: FreePeriodResult;
    chargePeriod: ChargeDaysResult;
    hasCharges: boolean;
  } {
    // 1. 计算最晚免费日
    const freePeriod = this.calculateLastFreeDate(startDate, freeDays, freeDaysBasis, mode);

    // 2. 判断是否在免费期内
    if (endDate <= freePeriod.lastFreeDate) {
      return {
        freePeriod,
        chargePeriod: {
          chargeDays: 0,
          chargeStart: this.addDays(freePeriod.lastFreeDate, 1),
          chargeEnd: endDate,
          isWorkingDaysOnly: this.chargePeriodUsesWorkingDays(freeDaysBasis)
        },
        hasCharges: false
      };
    }

    // 3. 计算计费天数
    const chargePeriod = this.calculateChargeDays(freePeriod.lastFreeDate, endDate, freeDaysBasis);

    return {
      freePeriod,
      chargePeriod,
      hasCharges: chargePeriod.chargeDays > 0
    };
  }

  /**
   * 验证日期范围的合理性
   *
   * **业务规则**:
   * 1. 开始日期不能晚于结束日期
   * 2. 日期不能早于 2000-01-01
   * 3. 日期不能晚于当前日期 + 365 天（预测场景）
   *
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param context 上下文描述
   * @returns 验证结果
   */
  validateDateRange(
    startDate: Date,
    endDate: Date,
    context?: string
  ): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // 错误：开始日期晚于结束日期
    if (startDate > endDate) {
      errors.push(`开始日期 (${startDate.toISOString()}) 晚于结束日期 (${endDate.toISOString()})`);
    }

    // 警告：日期过早
    const minDate = new Date('2000-01-01');
    if (startDate < minDate || endDate < minDate) {
      warnings.push(`日期早于 ${minDate.toISOString()}，可能不准确`);
    }

    // 警告：日期过晚
    const maxDate = this.addDays(new Date(), 365);
    if (startDate > maxDate || endDate > maxDate) {
      warnings.push(`日期晚于 ${maxDate.toISOString()}，超出合理预测范围`);
    }

    const isValid = errors.length === 0;

    if (!isValid || warnings.length > 0 || errors.length > 0) {
      logger.debug(`[DemurrageDate] Date range validation:`, {
        context,
        startDate,
        endDate,
        isValid,
        warnings,
        errors
      });
    }

    return { isValid, warnings, errors };
  }
}
