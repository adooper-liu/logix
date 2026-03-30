import { logger } from '../utils/logger';

/**
 * 成本估算服务
 *
 * 职责：负责整合和计算智能排产的总成本
 * - 运输费计算
 * - 滞港费计算（外部传入）
 * - 滞箱费计算（外部传入）
 * - 堆场费计算（如适用）
 * - 总成本汇总
 *
 * @packageDocumentation
 */

/**
 * 成本明细接口
 */
export interface CostBreakdown {
  /** 运输费 */
  transportFee: number;

  /** 滞港费 */
  demurrageCost: number;

  /** 滞箱费 */
  detentionCost: number;

  /** 堆场操作费 */
  yardOperationFee?: number;

  /** 堆场堆存费 */
  yardStorageCost?: number;

  /** 总成本 */
  totalCost: number;
}

/**
 * D&D 费用接口
 */
export interface DemurrageDetentionCost {
  /** 滞港费 */
  demurrageCost: number;

  /** 滞箱费 */
  detentionCost: number;
}

/**
 * 成本计算选项接口
 */
export interface CostCalculationOptions {
  /** 货柜编号 */
  containerNumber: string;

  /** 车队代码 */
  truckingCompanyId?: string;

  /** 仓库代码 */
  warehouseCode?: string;

  /** 港口代码 */
  portCode?: string;

  /** 计划提柜日期 */
  plannedPickupDate?: Date;

  /** 计划送货日期 */
  plannedDeliveryDate?: Date;

  /** D&D 费用（可选，不提供则自动计算） */
  ddCosts?: DemurrageDetentionCost;
}

/**
 * 成本估算服务类
 *
 * @example
 * ```typescript
 * const estimator = new CostEstimationService();
 *
 * // 计算总成本
 * const cost = await estimator.calculateTotalCost({
 *   containerNumber: 'CNTR001',
 *   truckingCompanyId: 'TRUCK001',
 *   warehouseCode: 'WH001'
 * });
 *
 * console.log('总成本:', cost.totalCost);
 * console.log('明细:', cost);
 * ```
 */
export class CostEstimationService {
  /**
   * 创建成本估算服务实例
   */
  constructor() {}

  /**
   * 计算总成本
   *
   * 计算逻辑：
   * 1. 获取 D&D 费用（用户提供或默认为 0）
   * 2. 获取运输费
   * 3. 获取堆场费（如适用）
   * 4. 汇总总成本
   *
   * @param options - 计算选项
   * @returns 成本明细
   */
  async calculateTotalCost(options: CostCalculationOptions): Promise<CostBreakdown> {
    logger.info('[CostEstimationService] 开始计算总成本', {
      containerNumber: options.containerNumber,
      truckingCompanyId: options.truckingCompanyId,
      warehouseCode: options.warehouseCode
    });

    try {
      // Step 1: 获取 D&D 费用（用户提供或默认为 0）
      const ddCosts = options.ddCosts || { demurrageCost: 0, detentionCost: 0 };

      // Step 2: 计算运输费（包含堆场费）
      const transportCosts = await this.calculateTransportCost(
        options.truckingCompanyId,
        options.warehouseCode,
        options.portCode
      );

      // Step 3: 汇总总成本
      const totalCost =
        ddCosts.demurrageCost +
        ddCosts.detentionCost +
        transportCosts.transportFee +
        (transportCosts.yardOperationFee || 0) +
        (transportCosts.yardStorageCost || 0);

      const breakdown: CostBreakdown = {
        transportFee: transportCosts.transportFee,
        demurrageCost: ddCosts.demurrageCost,
        detentionCost: ddCosts.detentionCost,
        yardOperationFee: transportCosts.yardOperationFee,
        yardStorageCost: transportCosts.yardStorageCost,
        totalCost
      };

      logger.info('[CostEstimationService] 总成本计算完成', {
        totalCost,
        breakdown
      });

      return breakdown;
    } catch (error) {
      logger.error('[CostEstimationService] 总成本计算失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 计算运输费（含堆场费）
   *
   * @param truckingCompanyId - 车队代码
   * @param warehouseCode - 仓库代码
   * @param portCode - 港口代码
   * @returns 运输费用明细
   */
  private async calculateTransportCost(
    truckingCompanyId?: string,
    warehouseCode?: string,
    portCode?: string
  ): Promise<{
    transportFee: number;
    yardOperationFee?: number;
    yardStorageCost?: number;
  }> {
    try {
      if (!truckingCompanyId || !warehouseCode) {
        return { transportFee: 0 };
      }

      // TODO: 从 mapping 表获取基础运费
      // 这里可以复用 TruckingSelectorService 的 calculateTruckingCost 方法

      // 模拟计算（实际应该从数据库查询）
      const baseTransportFee = 100;

      // TODO: 如果车队有堆场且需要 Drop off，计算堆场费
      const yardOperationFee = 0;
      const yardStorageCost = 0;

      return {
        transportFee: baseTransportFee,
        yardOperationFee,
        yardStorageCost
      };
    } catch (error) {
      logger.warn('[CostEstimationService] 计算运输费失败，返回默认值', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { transportFee: 100 };
    }
  }
}
