/**
 * 还箱日计算基础函数（前后端共享）
 *
 * 规则说明：
 * - Live load 模式: 还箱日 = 卸柜日
 * - Drop off 模式有历史数据: max(卸柜日, 原还箱日)，若提供 oldUnloadDate 则保持原有间隔
 * - Drop off 模式无历史数据: 卸柜日 + 1天
 *
 * @module returnDateCalculator
 */

export interface ReturnDateCalculationOptions {
  /** 卸柜日 (Date 对象或 YYYY-MM-DD 字符串) */
  unloadDate: Date | string;

  /** 卸柜模式 */
  unloadMode: "Live load" | "Drop off";

  /** 现有还箱日 (可选，用于 Drop off 模式) */
  existingReturnDate?: Date | string | null;

  /** 原有卸柜日 (可选，用于保持间隔) */
  oldUnloadDate?: Date | string | null;
}

export interface ReturnDateCalculationResult {
  /** 计算得到的还箱日 (UTC Date 对象) */
  returnDate: Date;

  /** 计算说明（用于调试和日志） */
  explanation: string;
}

/**
 * 将输入转换为 UTC Date 对象（时间归零到当天 00:00:00）
 */
function normalizeToDate(input: Date | string): Date {
  if (input instanceof Date) {
    const normalized = new Date(input);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
  }

  // 处理日期字符串
  const dateStr = typeof input === "string" ? input.trim() : "";
  
  // 支持 YYYY-MM-DD 格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const result = new Date(Date.UTC(year, month - 1, day));
    result.setUTCHours(0, 0, 0, 0);
    return result;
  }
  
  // 支持 ISO 8601 格式 (YYYY-MM-DDTHH:mm:ss.sssZ)
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    const result = new Date(dateStr);
    if (isNaN(result.getTime())) {
      throw new Error(`Invalid date format: ${input}. Expected YYYY-MM-DD or ISO 8601`);
    }
    result.setUTCHours(0, 0, 0, 0);
    return result;
  }

  throw new Error(`Invalid date format: ${input}. Expected YYYY-MM-DD or ISO 8601`);
}

/**
 * 格式化 Date 为 YYYY-MM-DD 字符串（UTC）
 */
function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 计算两个日期之间的天数差
 */
function daysBetween(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date2.getTime() - date1.getTime()) / msPerDay);
}

/**
 * 给日期增加指定天数
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * 返回两个日期中较晚的那个
 */
function maxDate(date1: Date, date2: Date): Date {
  return date1.getTime() >= date2.getTime() ? date1 : date2;
}

/**
 * 共享还箱日计算基础函数
 *
 * 计算规则：
 * 1. Live load 模式: 还箱日 = 卸柜日
 * 2. Drop off 模式有历史数据且提供 oldUnloadDate: 保持原有间隔，但不早于卸柜日
 * 3. Drop off 模式有历史数据但未提供 oldUnloadDate: max(卸柜日, 原还箱日)
 * 4. Drop off 模式无历史数据: 卸柜日 + 1天
 *
 * @param options 计算参数
 * @returns 计算结果（包含还箱日和说明）
 *
 * @example
 * ```typescript
 * // Live load 模式
 * const result1 = calculatePlannedReturnDateBasic({
 *   unloadDate: '2026-04-10',
 *   unloadMode: 'Live load'
 * })
 * // result1.returnDate => 2026-04-10
 * // result1.explanation => "Live load: 还箱日=卸柜日"
 *
 * // Drop off 模式无历史数据
 * const result2 = calculatePlannedReturnDateBasic({
 *   unloadDate: '2026-04-10',
 *   unloadMode: 'Drop off'
 * })
 * // result2.returnDate => 2026-04-11
 * // result2.explanation => "Drop off: 无历史数据，默认卸柜日+1天"
 *
 * // Drop off 模式保持原有间隔
 * const result3 = calculatePlannedReturnDateBasic({
 *   unloadDate: '2026-04-10',
 *   unloadMode: 'Drop off',
 *   existingReturnDate: '2026-04-15',
 *   oldUnloadDate: '2026-04-08'
 * })
 * // result3.returnDate => 2026-04-17 (间隔7天)
 * // result3.explanation => "Drop off: 保持原有间隔(7天)"
 * ```
 */
export function calculatePlannedReturnDateBasic(options: ReturnDateCalculationOptions): ReturnDateCalculationResult {
  const { unloadDate, unloadMode, existingReturnDate, oldUnloadDate } = options;

  // 标准化卸柜日
  const unloadDateObj = normalizeToDate(unloadDate);

  // Live load 模式：还箱日 = 卸柜日
  if (unloadMode === "Live load") {
    return {
      returnDate: unloadDateObj,
      explanation: "Live load: 还箱日=卸柜日",
    };
  }

  // Drop off 模式
  const hasExistingReturn = existingReturnDate != null && existingReturnDate !== "";

  if (hasExistingReturn) {
    const existingReturnDateObj = normalizeToDate(existingReturnDate!);

    // 如果提供了原有卸柜日，尝试保持原有间隔
    if (oldUnloadDate != null && oldUnloadDate !== "") {
      const oldUnloadDateObj = normalizeToDate(oldUnloadDate);

      // 计算原有间隔天数
      const deltaDays = daysBetween(oldUnloadDateObj, existingReturnDateObj);

      // 新还箱日 = 新卸柜日 + 原有间隔
      const calculatedReturn = addDays(unloadDateObj, deltaDays);

      // Drop off 模式下，还箱日不能早于卸柜日
      const returnDate = maxDate(unloadDateObj, calculatedReturn);

      return {
        returnDate,
        explanation: `Drop off: 保持原有间隔(${deltaDays}天)`,
      };
    } else {
      // 没有原有卸柜日，使用 max(卸柜日, 原还箱日)
      const returnDate = maxDate(unloadDateObj, existingReturnDateObj);

      return {
        returnDate,
        explanation: "Drop off: max(卸柜日, 原还箱日)",
      };
    }
  } else {
    // 无历史数据，默认卸柜日 + 1天
    const returnDate = addDays(unloadDateObj, 1);

    return {
      returnDate,
      explanation: "Drop off: 无历史数据，默认卸柜日+1天",
    };
  }
}

/**
 * 便捷函数：直接返回格式化后的 YYYY-MM-DD 字符串
 *
 * @param options 计算参数
 * @returns 格式化后的还箱日字符串
 */
export function calculatePlannedReturnDateString(options: ReturnDateCalculationOptions): string {
  const result = calculatePlannedReturnDateBasic(options);
  return formatDate(result.returnDate);
}
