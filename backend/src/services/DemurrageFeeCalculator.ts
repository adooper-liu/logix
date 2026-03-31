/**
 * 滞港费费用计算服务
 * Demurrage Fee Calculator Service
 * 
 * 职责：计算阶梯费率和费用汇总
 * - 阶梯费率解析与标准化
 * - 单项费用计算
 * - 多费用项汇总
 * - 费用明细拆分
 * 
 * @since 2026-03-30 (从 DemurrageService 拆分)
 */

import { logger } from '../utils/logger';
import type { DemurrageDateCalculator } from './DemurrageDateCalculator';

/** 阶梯费率项 */
export interface DemurrageTierDto {
  fromDay: number;
  toDay: number | null;
  ratePerDay: number;
}

interface ParsedTierEntry {
  fromDay?: number;
  toDay?: number;
  day?: number;
  rate: number;
  isOpenEnded: boolean;
  isRange: boolean;
}

/** 单项费用计算结果 */
export interface DemurrageItemResult {
  standardId: number;
  chargeName: string;
  chargeTypeCode: string;
  freeDays: number;
  freeDaysBasis?: string;
  calculationBasis?: string;
  calculationMode: 'actual' | 'forecast';
  startDate: Date;
  endDate: Date;
  startDateSource: string | null;
  endDateSource: string | null;
  startDateMode: 'actual' | 'forecast';
  endDateMode: 'actual' | 'forecast';
  lastFreeDate: Date;
  lastFreeDateMode: 'actual' | 'forecast';
  chargeDays: number;
  amount: number;
  currency: string;
  tierBreakdown: Array<{
    fromDay: number;
    toDay: number;
    days: number;
    ratePerDay: number;
    subtotal: number;
  }>;
}

/** 暂不计算项 */
export interface DemurrageSkippedItem {
  standardId: number;
  chargeName: string;
  chargeTypeCode: string;
  reasonCode:
    | 'missing_pickup_date_actual'
    | 'missing_planned_pickup_date'
    | 'missing_eta_combined_forecast'
    | 'missing_arrival_for_combined_actual'
    | 'missing_eta_storage_forecast'
    | 'missing_arrival_storage_actual';
  reason: string;
}

/** 汇总结果 */
export interface FeeCalculationResult {
  items: DemurrageItemResult[];
  skippedItems: DemurrageSkippedItem[];
  totalAmount: number;
  currency: string;
}

export class DemurrageFeeCalculator {
  constructor(private dateCalculator: DemurrageDateCalculator) {}

  /**
   * 标准化阶梯费率格式
   * 
   * **业务规则**:
   * 1. 支持数组格式：[{ fromDay, toDay, ratePerDay }] 或 [{ minDays, maxDays, rate }]
   * 2. 支持对象格式：{ "1": 50, "2-5": 60, "6+": 100 }
   * 3. 过滤无效数据（fromDay < 1）
   * 
   * **算法复杂度**: O(n log n)，n=费率阶梯数（排序）
   * 
   * @param raw 原始费率数据
   * @returns 标准化的费率数组
   * 
   * @example
   * // 示例：数组格式
   * normalizeTiers([{ fromDay: 1, toDay: 7, ratePerDay: 50 }, { fromDay: 8, toDay: null, ratePerDay: 100 }])
   * // 返回：[{ fromDay: 1, toDay: 7, ratePerDay: 50 }, { fromDay: 8, toDay: null, ratePerDay: 100 }]
   * 
   * @example
   * // 示例：对象格式
   * normalizeTiers({ "1-7": 50, "8+": 100 })
   * // 返回：[{ fromDay: 1, toDay: 7, ratePerDay: 50 }, { fromDay: 8, toDay: null, ratePerDay: 100 }]
   */
  normalizeTiers(raw: unknown): DemurrageTierDto[] | null {
    if (!raw) return null;

    // 处理数组格式
    if (Array.isArray(raw)) {
      const arr = raw as Array<Record<string, unknown>>;
      if (arr.length === 0) return null;

      return arr
        .map((t) => {
          const fromDay = Number(t.fromDay ?? t.minDays ?? 0);
          const toDay =
            t.toDay != null ? Number(t.toDay) : t.maxDays != null ? Number(t.maxDays) : null;
          const ratePerDay = Number(t.ratePerDay ?? t.rate ?? 0);

          if (fromDay < 1) return null;
          return { fromDay, toDay, ratePerDay };
        })
        .filter((t): t is DemurrageTierDto => t != null);
    }

    // 处理对象格式
    if (typeof raw === 'object' && raw !== null) {
      const obj = raw as Record<string, number>;
      const entries = Object.entries(obj)
        .filter(([k]) => /^\d+$|^\d+\+$|^\d+-\d+$/.test(String(k).trim())) // 支持 "1", "8+", "1-7"
        .map(([k, v]) => {
          const key = String(k).trim();
          const isOpenEnded = key.includes('+');
          const isRange = key.includes('-') && !isOpenEnded;
          
          if (isRange) {
            // 处理 "1-7" 格式
            const [fromStr, toStr] = key.split('-');
            const fromDay = parseInt(fromStr, 10);
            const toDay = parseInt(toStr, 10);
            return { fromDay, toDay, rate: Number(v), isOpenEnded: false, isRange };
          } else {
            // 处理 "1" 或 "8+" 格式
            const num = parseInt(key.replace(/\D/g, ''), 10);
            return { day: num, rate: Number(v), isOpenEnded, isRange: false };
          }
        })
        .sort((a, b) => (a.fromDay ?? a.day) - (b.fromDay ?? b.day));

      if (entries.length === 0) return null;

      const tiers: DemurrageTierDto[] = [];
      let i = 0;

      while (i < entries.length) {
        const entry = entries[i];
        
        if (entry.isRange) {
          // 直接添加区间
          tiers.push({
            fromDay: entry.fromDay!,
            toDay: entry.toDay ?? null,
            ratePerDay: entry.rate
          });
        } else {
          const fromDay = entry.day;
          const rate = entry.rate;
          const isOpenEnded = entry.isOpenEnded;

          let toDay: number | null;
          if (isOpenEnded) {
            toDay = null;
          } else if (i + 1 < entries.length && !entries[i + 1]?.isOpenEnded) {
            toDay = (entries[i + 1]?.day ?? 0) - 1;
          } else {
            toDay = null;
          }

          tiers.push({ fromDay, toDay, ratePerDay: rate });
        }
        i++;
      }

      return tiers.length > 0 ? tiers : null;
    }

    return null;
  }

  /**
   * 计算单项滞港费
   * 
   * **业务规则**:
   * 1. 先计算免费期截止日
   * 2. 再计算计费天数
   * 3. 按阶梯费率计算费用
   * 4. 如果在免费期内，返回 0 费用
   * 
   * **算法复杂度**: O(n log n)，n=阶梯数（排序）
   * 
   * @param params 计算参数
   * @returns 单项费用结果
   * 
   * @example
   * // 示例：有阶梯费率
   * calculateSingleItem({
   *   standardId: 1,
   *   chargeName: '滞港费',
   *   startDate: new Date('2026-03-01'),
   *   endDate: new Date('2026-03-15'),
   *   freeDays: 7,
   *   ratePerDay: 50,
   *   tiers: [{ fromDay: 1, toDay: 7, ratePerDay: 50 }, { fromDay: 8, toDay: null, ratePerDay: 100 }],
   *   currency: 'USD'
   * })
   * // 返回：{ chargeDays: 8, amount: 800, tierBreakdown: [...] }
   */
  calculateSingleItem(params: {
    standardId: number;
    chargeName: string;
    chargeTypeCode: string;
    startDate: Date;
    endDate: Date;
    startDateSource: string | null;
    endDateSource: string | null;
    startDateMode: 'actual' | 'forecast';
    endDateMode: 'actual' | 'forecast';
    freeDays: number;
    freeDaysBasis?: string | null;
    calculationBasis?: string | null;
    ratePerDay: number;
    tiers?: DemurrageTierDto[] | null;
    currency: string;
    calculationMode?: 'actual' | 'forecast';
  }): DemurrageItemResult {
    const {
      standardId,
      chargeName,
      chargeTypeCode,
      startDate,
      endDate,
      startDateSource,
      endDateSource,
      startDateMode,
      endDateMode,
      freeDays,
      freeDaysBasis,
      calculationBasis,
      ratePerDay,
      tiers,
      currency,
      calculationMode = 'forecast'
    } = params;

    // 1. 计算最晚免费日
    const freePeriodResult = this.dateCalculator.calculateLastFreeDate(
      startDate,
      freeDays,
      freeDaysBasis,
      calculationMode
    );

    const { lastFreeDate, lastFreeDateMode } = freePeriodResult;

    // 2. 判断是否在免费期内
    if (endDate <= lastFreeDate) {
      return {
        standardId,
        chargeName,
        chargeTypeCode,
        freeDays,
        freeDaysBasis: freeDaysBasis ?? undefined,
        calculationBasis: calculationBasis ?? undefined,
        calculationMode,
        startDate,
        endDate,
        startDateSource,
        endDateSource,
        startDateMode,
        endDateMode,
        lastFreeDate,
        lastFreeDateMode,
        chargeDays: 0,
        amount: 0,
        currency,
        tierBreakdown: []
      };
    }

    // 3. 计算计费天数
    const chargePeriodResult = this.dateCalculator.calculateChargeDays(
      lastFreeDate,
      endDate,
      freeDaysBasis
    );

    const { chargeDays, chargeStart } = chargePeriodResult;

    if (chargeDays <= 0) {
      return {
        standardId,
        chargeName,
        chargeTypeCode,
        freeDays,
        freeDaysBasis: freeDaysBasis ?? undefined,
        calculationBasis: calculationBasis ?? undefined,
        calculationMode,
        startDate,
        endDate,
        startDateSource,
        endDateSource,
        startDateMode,
        endDateMode,
        lastFreeDate,
        lastFreeDateMode,
        chargeDays: 0,
        amount: 0,
        currency,
        tierBreakdown: []
      };
    }

    // 4. 计算费用和阶梯明细
    const { totalAmount, tierBreakdown } = this.calculateFeeWithTiers(
      chargeDays,
      freeDays,
      ratePerDay,
      tiers,
      currency
    );

    logger.debug(`[DemurrageFee] Single item calculation:`, {
      standardId,
      chargeName,
      chargeDays,
      freeDays,
      totalAmount,
      tierBreakdown
    });

    return {
      standardId,
      chargeName,
      chargeTypeCode,
      freeDays,
      freeDaysBasis: freeDaysBasis ?? undefined,
      calculationBasis: calculationBasis ?? undefined,
      calculationMode,
      startDate,
      endDate,
      startDateSource,
      endDateSource,
      startDateMode,
      endDateMode,
      lastFreeDate,
      lastFreeDateMode,
      chargeDays,
      amount: totalAmount,
      currency,
      tierBreakdown
    };
  }

  /**
   * 使用阶梯费率计算费用
   * 
   * **业务规则**:
   * 1. 优先使用阶梯费率
   * 2. 如果没有阶梯，使用统一费率
   * 3. 计费天数从免费期后的第一天开始（currentDay = freeDays + 1）
   * 4. 每个阶梯独立计算
   * 
   * **算法复杂度**: O(n log n)，n=阶梯数（排序 + 遍历）
   * 
   * @param chargeDays 计费天数
   * @param freeDays 免费天数
   * @param ratePerDay 统一费率
   * @param tiers 阶梯费率
   * @param currency 货币
   * @returns 总费用和明细
   */
  private calculateFeeWithTiers(
    chargeDays: number,
    freeDays: number,
    ratePerDay: number,
    tiers: DemurrageTierDto[] | null | undefined,
    currency: string
  ): {
    totalAmount: number;
    tierBreakdown: Array<{
      fromDay: number;
      toDay: number;
      days: number;
      ratePerDay: number;
      subtotal: number;
    }>;
  } {
    let totalAmount = 0;
    const tierBreakdown: Array<{
      fromDay: number;
      toDay: number;
      days: number;
      ratePerDay: number;
      subtotal: number;
    }> = [];

    if (tiers && tiers.length > 0) {
      // 使用阶梯费率
      const sorted = [...tiers].sort((a, b) => a.fromDay - b.fromDay);
      let remainingDays = chargeDays;
      
      // ✅ 关键修复：计费天数应该从免费期后的第一天开始计算
      // 例如：免费天数 7 天，计费从第 8 天开始
      let currentDay = freeDays + 1;

      logger.debug(`[DemurrageFee] Tier calculation:`, {
        freeDays,
        chargeDays,
        currentDay,
        tiers: sorted.map((t) => ({
          fromDay: t.fromDay,
          toDay: t.toDay,
          ratePerDay: t.ratePerDay
        }))
      });

      for (const tier of sorted) {
        if (remainingDays <= 0) break;

        const tierToDay = tier.toDay ?? 99999;
        const tierFromDay = Math.max(tier.fromDay, currentDay);
        const tierEndDay = Math.min(tierToDay, currentDay + remainingDays - 1);

        if (tierEndDay < tierFromDay) continue;

        const daysInTier = tierEndDay - tierFromDay + 1;
        const subtotal = daysInTier * tier.ratePerDay;

        tierBreakdown.push({
          fromDay: tierFromDay,
          toDay: tierEndDay,
          days: daysInTier,
          ratePerDay: tier.ratePerDay,
          subtotal
        });

        totalAmount += subtotal;
        remainingDays -= daysInTier;
        currentDay = tierEndDay + 1;
      }
    } else {
      // 使用统一费率
      totalAmount = chargeDays * ratePerDay;

      if (chargeDays > 0 && ratePerDay > 0) {
        tierBreakdown.push({
          fromDay: 1,
          toDay: chargeDays,
          days: chargeDays,
          ratePerDay,
          subtotal: totalAmount
        });
      }
    }

    return { totalAmount, tierBreakdown };
  }

  /**
   * 汇总多个费用项
   * 
   * **业务规则**:
   * 1. 累加所有费用项的金额
   * 2. 统一货币单位
   * 3. 分离正常计算项和跳过项
   * 
   * **算法复杂度**: O(n)，n=费用项数量
   * 
   * @param items 费用项列表
   * @param skippedItems 跳过项列表
   * @returns 汇总结果
   */
  summarizeFees(
    items: DemurrageItemResult[],
    skippedItems: DemurrageSkippedItem[] = []
  ): FeeCalculationResult {
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    
    // 假设所有项使用相同货币（第一项的货币）
    const currency = items.length > 0 ? items[0].currency : 'USD';

    logger.info(`[DemurrageFee] Fee summary:`, {
      itemCount: items.length,
      skippedCount: skippedItems.length,
      totalAmount,
      currency
    });

    return {
      items,
      skippedItems,
      totalAmount,
      currency
    };
  }
}
