/**
 * 免费天数计算服务
 * Free Days Calculation Service
 *
 * 职责：计算提柜和还箱的免费天数
 * - 委托给 DemurrageService 计算
 * - 提取 MIN(滞港，堆存，D&D) 作为提柜免费天数
 * - 提取 D&D 或 滞箱 作为还箱免费天数
 *
 * @since 2026-03-30 (从 IntelligentSchedulingService 拆分)
 */

import { logger } from '../utils/logger';
import { DemurrageService } from './demurrage.service';

/**
 * 免费天数计算结果接口
 */
export interface FreeDaysResult {
  pickupFreeDays?: number; // 提柜免费天数
  returnFreeDays?: number; // 还箱免费天数
}

export class FreeDaysCalculationService {
  private demurrageService: DemurrageService;

  constructor() {
    // 注意：DemurrageService 需要多个 Repository，这里简化处理
    // 实际使用时应该通过依赖注入获取
    this.demurrageService = new DemurrageService(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any
    );
  }

  /**
   * 计算免费天数
   *
   * **业务规则**:
   * 1. 提柜免费天数 = MIN(滞港，堆存，D&D)
   * 2. 还箱免费天数 = D&D 或 滞箱
   * 3. 支持组合费用类型（D&D）
   *
   * **算法复杂度**: O(n)，n=DemurrageService 计算时间
   *
   * @param containerNumber 柜号
   * @returns 免费天数结果
   *
   * @example
   * // 示例 1：完整数据
   * const result = await calculateFreeDays('CNTR001');
   * // 返回：{ pickupFreeDays: 5, returnFreeDays: 7 }
   *
   * @example
   * // 示例 2：只有 D&D
   * const result = await calculateFreeDays('CNTR001');
   * // 返回：{ pickupFreeDays: 7, returnFreeDays: 7 }
   */
  async calculateFreeDays(containerNumber: string): Promise<FreeDaysResult> {
    try {
      // 1. 使用 DemurrageService 计算
      const result = await this.demurrageService.calculateForContainer(containerNumber);

      if (!result?.result?.matchedStandards) {
        logger.warn(`[FreeDaysCalculation] No standards found for ${containerNumber}`);
        return {};
      }

      const standards = result.result.matchedStandards;

      // 2. 根据费用类型分类
      const classifiedStandards = this.classifyByChargeType(standards);

      // 3. 提取免费天数
      const freeDaysMap = this.extractFreeDays(classifiedStandards);

      // 4. 计算提柜免费天数 = MIN(滞港，堆存，D&D)
      const pickupFreeDays = this.calculatePickupFreeDays(freeDaysMap);

      // 5. 计算还箱免费天数 = D&D 或 滞箱
      const returnFreeDays = this.calculateReturnFreeDays(freeDaysMap);

      logger.debug(
        `[FreeDaysCalculation] Container ${containerNumber}: ` +
          `pickup=${pickupFreeDays}, return=${returnFreeDays}`
      );

      return {
        pickupFreeDays,
        returnFreeDays
      };
    } catch (error) {
      logger.error('[FreeDaysCalculation] Error calculating free days:', error);
      return {};
    }
  }

  /**
   * 批量计算免费天数
   *
   * **业务场景**:
   * - 批量排产前预计算
   * - 避免重复查询数据库
   *
   * **算法复杂度**: O(n * m)，n=柜号数量，m=单次计算时间
   *
   * @param containerDataList 柜号数据列表
   * @returns 柜号到免费天数的映射
   *
   * @example
   * // 示例：批量计算
   * const results = await batchCalculateFreeDays([
   *   { containerNumber: 'CNTR001', portCode: 'USLAX', country: 'US' },
   *   { containerNumber: 'CNTR002', portCode: 'USLGB', country: 'US' }
   * ]);
   * // 返回：{ 'CNTR001': { pickupFreeDays: 5, returnFreeDays: 7 }, ... }
   */
  async batchCalculateFreeDays(
    containerDataList: Array<{ containerNumber: string; portCode?: string; country?: string }>
  ): Promise<Record<string, FreeDaysResult>> {
    const results: Record<string, FreeDaysResult> = {};

    for (const data of containerDataList) {
      // 直接调用 calculateFreeDays，它会自动从 Container 实体中获取港口和国家信息
      results[data.containerNumber] = await this.calculateFreeDays(data.containerNumber);
    }

    return results;
  }

  /**
   * 根据费用类型分类
   */
  private classifyByChargeType(standards: any[]): Record<string, any[]> {
    const isCombined = (std: any) => {
      const code = (std.chargeTypeCode ?? '').toUpperCase();
      const name = (std.chargeName ?? '').toLowerCase();
      return (
        (code.includes('D') && code.includes('D')) ||
        name.includes('d&d') ||
        name.includes('demurrage & detention') ||
        name.includes('combined')
      );
    };

    const isDetention = (std: any) => {
      if (isCombined(std)) return false;
      const code = (std.chargeTypeCode ?? '').toUpperCase();
      const name = (std.chargeName ?? '').toLowerCase();
      return code.includes('DETENTION') || name.includes('detention') || name.includes('滞箱');
    };

    const isStorage = (std: any) => {
      if (isCombined(std)) return false;
      if (isDetention(std)) return false;
      const code = (std.chargeTypeCode ?? '').toUpperCase();
      const name = (std.chargeName ?? '').toLowerCase();
      return code.includes('STORAGE') || name.includes('storage') || name.includes('堆存');
    };

    const isDemurrage = (std: any) => {
      if (isCombined(std)) return false;
      if (isDetention(std)) return false;
      if (isStorage(std)) return false;
      const code = (std.chargeTypeCode ?? '').toUpperCase();
      const name = (std.chargeName ?? '').toLowerCase();
      return code.includes('DEMURRAGE') || name.includes('demurrage') || name.includes('滞港');
    };

    return {
      DEMURRAGE: standards.filter(isDemurrage),
      STORAGE: standards.filter(isStorage),
      DETENTION: standards.filter(isDetention),
      DND: standards.filter(isCombined)
    };
  }

  /**
   * 提取免费期天数
   */
  private extractFreeDays(classifiedStandards: Record<string, any[]>): Record<string, number> {
    const demurrageStandard = classifiedStandards.DEMURRAGE[0];
    const storageStandard = classifiedStandards.STORAGE[0];
    const detentionStandard = classifiedStandards.DETENTION[0];
    const dndStandard = classifiedStandards.DND[0];

    const freeDaysResult: Record<string, number | undefined> = {
      demurrageFreeDays: this.toNumber(demurrageStandard?.freeDays),
      storageFreeDays: this.toNumber(storageStandard?.freeDays),
      detentionFreeDays: this.toNumber(detentionStandard?.freeDays),
      dnDFreeDays: this.toNumber(dndStandard?.freeDays)
    };

    // 过滤掉 undefined
    return Object.fromEntries(
      Object.entries(freeDaysResult).filter(([_, value]) => value !== undefined) as Array<
        [string, number]
      >
    );
  }

  /**
   * 计算提柜免费天数 = MIN(滞港，堆存，D&D)
   */
  private calculatePickupFreeDays(freeDaysMap: Record<string, number>): number | undefined {
    const candidates = [
      freeDaysMap.demurrageFreeDays,
      freeDaysMap.storageFreeDays,
      freeDaysMap.dnDFreeDays
    ].filter((d): d is number => d !== undefined);

    return candidates.length > 0 ? Math.min(...candidates) : undefined;
  }

  /**
   * 计算还箱免费天数 = D&D 或 滞箱
   */
  private calculateReturnFreeDays(freeDaysMap: Record<string, number>): number | undefined {
    return freeDaysMap.dnDFreeDays ?? freeDaysMap.detentionFreeDays;
  }

  /**
   * 安全转换为数字
   */
  private toNumber(value: any): number | undefined {
    if (value === null || value === undefined) return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  }
}
