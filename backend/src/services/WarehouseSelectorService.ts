import { Repository, In } from 'typeorm';
import { AppDataSource } from '../database';
import { Warehouse } from '../entities/Warehouse';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { logger } from '../utils/logger';
import { CacheService } from './CacheService';
import { SchedulingSorter } from './SchedulingSorter';
import { OCCUPANCY_CONFIG } from '../config/scheduling.config';
import {
  SchedulingCacheKeys,
  SchedulingCacheTTL,
  getSchedulingCacheKey
} from '../constants/SchedulingCacheStrategy';
import type { TruckingPortMapping as PortTruckingMapping } from '../entities/TruckingPortMapping';

/**
 * 仓库选择服务
 *
 * 职责：负责基于映射关系和档期可用性选择最优仓库
 * - 候选仓库筛选（基于港口 - 车队 - 仓库映射链）
 * - 最早可用仓库查找
 * - 档期可用性检查
 *
 * @packageDocumentation
 */

/**
 * 仓库选择结果接口
 */
export interface WarehouseSelectionResult {
  /** 选中的仓库 */
  warehouse: Warehouse | null;

  /** 计划卸柜日期 */
  plannedUnloadDate: Date | null;
}

/**
 * 仓库选择选项接口
 */
export interface WarehouseSelectionOptions {
  /** 国家代码 */
  countryCode?: string;

  /** 港口代码 */
  portCode?: string;

  /** 最早可开始日期 */
  earliestDate?: Date;
}

/**
 * 仓库选择服务类
 *
 * @example
 * ```typescript
 * const selector = new WarehouseSelectorService();
 *
 * // 获取候选仓库列表
 * const candidates = await selector.getCandidateWarehouses('US', 'USLAX');
 *
 * // 查找最早可用仓库
 * const result = await selector.findEarliestAvailableWarehouse(candidates, new Date());
 * ```
 */
export class WarehouseSelectorService {
  private truckingPortMappingRepo: Repository<TruckingPortMapping>;
  private warehouseTruckingMappingRepo: Repository<WarehouseTruckingMapping>;
  private warehouseRepo: Repository<Warehouse>;
  private warehouseOccupancyRepo: Repository<ExtWarehouseDailyOccupancy>;
  private sorter: SchedulingSorter;
  private cacheService: CacheService;

  /**
   * 创建仓库选择服务实例
   */
  constructor() {
    this.truckingPortMappingRepo = AppDataSource.getRepository(TruckingPortMapping);
    this.warehouseTruckingMappingRepo = AppDataSource.getRepository(WarehouseTruckingMapping);
    this.warehouseRepo = AppDataSource.getRepository(Warehouse);
    this.warehouseOccupancyRepo = AppDataSource.getRepository(ExtWarehouseDailyOccupancy);
    this.sorter = new SchedulingSorter();
    this.cacheService = new CacheService();
  }

  /**
   * 获取候选仓库列表（基于港口 + 车队 + 仓库映射链）
   *
   * 查询逻辑：
   * 1. 港口 → 车队（dict_trucking_port_mapping）
   * 2. 车队 → 仓库（dict_warehouse_trucking_mapping）
   * 3. 按优先级排序
   *
   * @param countryCode - 国家代码
   * @param portCode - 港口代码
   * @returns 候选仓库列表
   *
   * @example
   * ```typescript
   * // 基本用法
   * const warehouses = await selector.getCandidateWarehouses('US', 'USLAX');
   *
   * // 返回空数组的场景：
   * - 无港口代码或国家代码
   * - 港口无映射车队
   * - 车队无映射仓库
   * ```
   */
  async getCandidateWarehouses(countryCode?: string, portCode?: string): Promise<Warehouse[]> {
    logger.info('[WarehouseSelectorService] 开始获取候选仓库', {
      countryCode,
      portCode
    });

    try {
      // 参数验证
      if (!portCode || !countryCode) {
        logger.warn('[WarehouseSelectorService] 缺少必要参数，返回空数组');
        return [];
      }

      // Step 1: 港口 → 车队（dict_trucking_port_mapping）- 带缓存
      const portMappingCacheKey = getSchedulingCacheKey(
        SchedulingCacheKeys.PORT_TRUCKING_MAPPING,
        countryCode,
        portCode
      );
      let portMappings = await this.cacheService.get<PortTruckingMapping[]>(portMappingCacheKey);
      
      if (!portMappings) {
        portMappings = await this.truckingPortMappingRepo.find({
          where: { portCode, country: countryCode, isActive: true }
        });
        // 缓存映射关系（6小时）
        if (portMappings.length > 0) {
          await this.cacheService.set(portMappingCacheKey, portMappings, SchedulingCacheTTL.MAPPING);
        }
      }

      if (portMappings.length === 0) {
        logger.warn('[WarehouseSelectorService] 港口无映射车队');
        return [];
      }

      const truckingCompanyIds = portMappings.map((m) => m.truckingCompanyId);

      // Step 2: 车队 → 仓库（dict_warehouse_trucking_mapping）- 带缓存
      const warehouseMappingCacheKey = getSchedulingCacheKey(
        SchedulingCacheKeys.WAREHOUSE_TRUCKING_MAPPING,
        countryCode,
        truckingCompanyIds.sort().join(',')
      );
      let warehouseMappings = await this.cacheService.get<WarehouseTruckingMapping[]>(warehouseMappingCacheKey);
      
      if (!warehouseMappings) {
        warehouseMappings = await this.warehouseTruckingMappingRepo.find({
          where: {
            truckingCompanyId: In(truckingCompanyIds),
            country: countryCode,
            isActive: true
          }
        });
        // 缓存映射关系（6小时）
        if (warehouseMappings.length > 0) {
          await this.cacheService.set(warehouseMappingCacheKey, warehouseMappings, SchedulingCacheTTL.MAPPING);
        }
      }

      if (warehouseMappings.length === 0) {
        logger.warn('[WarehouseSelectorService] 车队无映射仓库');
        return [];
      }

      const warehouseCodes = [...new Set(warehouseMappings.map((m) => m.warehouseCode))];

      // Step 3: 查询仓库实体
      const warehouses = await this.warehouseRepo.find({
        where: {
          warehouseCode: In(warehouseCodes),
          country: countryCode,
          status: 'ACTIVE'
        }
      });

      // Step 4: 按优先级排序
      const sorted = this.sorter.sortWarehousesByPriority(warehouses, warehouseMappings);

      logger.info('[WarehouseSelectorService] 候选仓库查询完成', {
        count: sorted.length,
        fromCache: portMappings !== null
      });

      return sorted;
    } catch (error) {
      logger.error('[WarehouseSelectorService] 候选仓库查询失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 找到最早可用的仓库和卸柜日
   *
   * 算法：
   * 1. 遍历所有候选仓库
   * 2. 对每个仓库查找从 earliestDate 起的首个可用日
   * 3. 返回第一个有可用日的仓库
   *
   * @param warehouses - 候选仓库列表
   * @param earliestDate - 最早可开始日期
   * @returns 仓库选择结果
   *
   * @example
   * ```typescript
   * const result = await selector.findEarliestAvailableWarehouse(warehouses, new Date());
   * // result.warehouse: 找到的仓库
   * // result.plannedUnloadDate: 计划卸柜日期
   * ```
   */
  async findEarliestAvailableWarehouse(
    warehouses: Warehouse[],
    earliestDate: Date
  ): Promise<WarehouseSelectionResult> {
    logger.info('[WarehouseSelectorService] 开始查找最早可用仓库', {
      count: warehouses.length,
      earliestDate
    });

    try {
      for (const warehouse of warehouses) {
        // 查找该仓库从 earliestDate 起的可用日
        const availableDate = await this.findEarliestAvailableDay(
          warehouse.warehouseCode,
          earliestDate
        );

        if (availableDate) {
          logger.info('[WarehouseSelectorService] 找到可用仓库', {
            warehouseCode: warehouse.warehouseCode,
            availableDate
          });
          return { warehouse, plannedUnloadDate: availableDate };
        }
      }

      logger.warn('[WarehouseSelectorService] 未找到可用仓库');
      return { warehouse: null, plannedUnloadDate: null };
    } catch (error) {
      logger.error('[WarehouseSelectorService] 查找最早可用仓库失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * 找到某仓库 earliestDate 起首个有产能的日期
   *
   * 查找策略：
   * - 向前查找最多 30 天
   * - 检查每日档期占用情况
   * - 若有剩余产能则返回该日期
   *
   * @param warehouseCode - 仓库代码
   * @param earliestDate - 最早可开始日期
   * @returns 最早可用日期，找不到返回 null
   */
  private async findEarliestAvailableDay(
    warehouseCode: string,
    earliestDate: Date
  ): Promise<Date | null> {
    // 向前查找最多 30 天
    for (let i = 0; i < 30; i++) {
      const date = new Date(earliestDate);
      // 使用 UTC 方法，避免时区问题
      date.setUTCDate(date.getUTCDate() + i);
      date.setUTCHours(0, 0, 0, 0); // 去除时间部分，只保留日期

      // 使用日期字符串查询，避免时区转换问题
      // 将日期格式化为 'YYYY-MM-DD' 字符串
      const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
        2,
        '0'
      )}-${String(date.getUTCDate()).padStart(2, '0')}`;

      // 查找或创建当日占用记录
      const occupancy = await this.warehouseOccupancyRepo.findOne({
        where: {
          warehouseCode,
          date: dateStr as any // TypeORM 会将字符串转换为 DATE
        }
      });

      if (!occupancy) {
        // 无占用记录，使用仓库默认产能
        const warehouse = await this.warehouseRepo.findOne({
          where: { warehouseCode }
        });
        const _capacity =
          warehouse?.dailyUnloadCapacity || OCCUPANCY_CONFIG.DEFAULT_WAREHOUSE_DAILY_CAPACITY;
        return date;
      }

      if (occupancy.plannedCount < occupancy.capacity) {
        // 有剩余能力
        return date;
      }

      // 已满，继续检查下一天
    }

    // 30 天内都无可用日期
    return null;
  }
}
