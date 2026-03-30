import { COST_OPTIMIZATION_CONFIG } from '../config/scheduling.config';
import { Container } from '../entities/Container';
import { Warehouse } from '../entities/Warehouse';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { logger } from '../utils/logger';

/**
 * 排产排序服务
 *
 * 职责：负责各种排产相关的排序逻辑
 * - 按清关可放行日排序（货柜）
 * - 按优先级排序（仓库）
 *
 * @packageDocumentation
 */

/**
 * 排序选项接口
 */
export interface SortOptions {
  /** 排序字段 */
  sortBy?: 'clearanceDate' | 'priority' | 'warehouseCode';

  /** 排序方向 */
  order?: 'asc' | 'desc';
}

/**
 * 排产排序服务类
 *
 * @example
 * ```typescript
 * const sorter = new SchedulingSorter();
 *
 * // 按清关日期排序货柜
 * const sorted = sorter.sortByClearanceDate(containers);
 *
 * // 按优先级排序仓库
 * const sortedWarehouses = sorter.sortWarehousesByPriority(warehouses, mappings);
 * ```
 */
export class SchedulingSorter {
  /**
   * 静态属性：仓库类型优先级
   * 数值越小，优先级越高
   */
  private static readonly PROPERTY_TYPE_PRIORITY: Record<string, number> = {
    自营仓: 1,
    平台仓: 2,
    第三方仓: 3
  };

  /**
   * 按清关可放行日排序（先到先得）
   *
   * 排序规则：
   * 1. 优先使用 ATA（实际到港时间）
   * 2. 其次使用 ETA（预计到港时间）
   * 3. 同日内按 last_free_date（免租期截止日）升序
   *
   * @param containers - 待排序的货柜数组
   * @returns 排序后的货柜数组
   *
   * @example
   * ```typescript
   * // 基本用法
   * const sorted = sorter.sortByClearanceDate(containers);
   *
   * // 排序结果：先到期的货柜排在前面
   * ```
   */
  sortByClearanceDate(containers: Container[]): Container[] {
    logger.info('[SchedulingSorter] 开始按清关日期排序', {
      count: containers.length
    });

    try {
      const sorted = containers.sort((a, b) => {
        // 获取目的港操作记录
        const aDestPo = a.portOperations?.find((po: any) => po.portType === 'destination');
        const bDestPo = b.portOperations?.find((po: any) => po.portType === 'destination');

        // 确定比较日期：ATA > ETA
        const aDate = aDestPo?.ata || aDestPo?.eta || a.seaFreight?.eta;
        const bDate = bDestPo?.ata || bDestPo?.eta || b.seaFreight?.eta;

        // 两个都没有日期，保持原顺序
        if (!aDate && !bDate) return 0;
        // a 没有日期，排后面
        if (!aDate) return 1;
        // b 没有日期，排前面
        if (!bDate) return -1;

        // 按日期升序排序
        const dateCompare = new Date(aDate).getTime() - new Date(bDate).getTime();
        if (dateCompare !== 0) return dateCompare;

        // 同日内按 last_free_date 升序（免租期快结束的优先）
        const aLastFree = aDestPo?.lastFreeDate ? new Date(aDestPo.lastFreeDate).getTime() : 0;
        const bLastFree = bDestPo?.lastFreeDate ? new Date(bDestPo.lastFreeDate).getTime() : 0;
        return aLastFree - bLastFree;
      });

      logger.info('[SchedulingSorter] 清关日期排序完成', {
        count: sorted.length
      });

      return sorted;
    } catch (error) {
      logger.error('[SchedulingSorter] 清关日期排序失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 按优先级排序候选仓库
   *
   * 排序规则：
   * 1. is_default = true 的仓库优先
   * 2. 自营仓 > 平台仓 > 第三方仓
   * 3. warehouse_code 字典序
   *
   * @param warehouses - 待排序的仓库数组
   * @param warehouseMappings - 仓库映射配置（用于判断 is_default）
   * @returns 排序后的仓库数组
   *
   * @example
   * ```typescript
   * const sorted = sorter.sortWarehousesByPriority(warehouses, mappings);
   * // 排序结果：默认仓库 > 自营仓 > 平台仓 > 第三方仓
   * ```
   */
  sortWarehousesByPriority(
    warehouses: Warehouse[],
    warehouseMappings: WarehouseTruckingMapping[]
  ): Warehouse[] {
    logger.info('[SchedulingSorter] 开始按优先级排序仓库', {
      count: warehouses.length
    });

    try {
      // 提取所有默认仓库的代码
      const defaultWarehouseCodes = new Set(
        warehouseMappings.filter((m) => m.isDefault).map((m) => m.warehouseCode)
      );

      // 获取仓库类型优先级的辅助函数
      const getPriority = (p: string) =>
        SchedulingSorter.PROPERTY_TYPE_PRIORITY[p] ??
        COST_OPTIMIZATION_CONFIG.DEFAULT_PROPERTY_PRIORITY;

      const sorted = [...warehouses].sort((a, b) => {
        // 是否為默认仓库（优先级最高）
        const aDefault = defaultWarehouseCodes.has(a.warehouseCode) ? 0 : 1;
        const bDefault = defaultWarehouseCodes.has(b.warehouseCode) ? 0 : 1;
        if (aDefault !== bDefault) return aDefault - bDefault;

        // 仓库类型优先级
        const pa = getPriority(a.propertyType);
        const pb = getPriority(b.propertyType);
        if (pa !== pb) return pa - pb;

        // warehouse_code 字典序
        return (a.warehouseCode || '').localeCompare(b.warehouseCode || '');
      });

      logger.info('[SchedulingSorter] 仓库优先级排序完成', {
        count: sorted.length
      });

      return sorted;
    } catch (error) {
      logger.error('[SchedulingSorter] 仓库优先级排序失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
