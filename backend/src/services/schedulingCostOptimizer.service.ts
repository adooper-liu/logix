/**
 * 智能排柜成本优化服务
 * Scheduling Cost Optimization Service
 *
 * 负责生成所有可行方案、评估成本、选择最优方案
 */

import { In, Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { PortOperation } from '../entities/PortOperation';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { SeaFreight } from '../entities/SeaFreight';
import { TruckingCompany } from '../entities/TruckingCompany';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { TruckingTransport } from '../entities/TruckingTransport';
import { Warehouse } from '../entities/Warehouse';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { DemurrageService } from './demurrage.service';
// 导入日志工具，添加降级方案
import * as dateTimeUtils from '../utils/dateTimeUtils';
import * as loggerModule from '../utils/logger';
import { smartCalendarCapacity } from '../utils/smartCalendarCapacity';
const log = loggerModule.log || {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

/**
 * 卸柜方案选项
 *
 * ⚠️ 关键说明：
 * - plannedPickupDate: 计划提柜日（核心输入）
 * - plannedUnloadDate: 计划卸柜日（可选，未提供时根据策略计算）
 *   • Direct/Live load: plannedPickupDate = plannedUnloadDate
 *   • Drop off: plannedPickupDate < plannedUnloadDate
 *   • Expedited: plannedPickupDate = plannedUnloadDate（免费期内）
 */
export interface UnloadOption {
  containerNumber: string;
  warehouse: Warehouse;
  plannedPickupDate: Date; // ← 重命名：计划提柜日（原 unloadDate）
  plannedUnloadDate?: Date; // ← 新增：计划卸柜日（可选，由策略推导）
  strategy: 'Direct' | 'Drop off' | 'Expedited';
  truckingCompany?: TruckingCompany;
  isWithinFreePeriod: boolean;
  totalCost?: number; // 总成本（由 evaluateTotalCost 计算后填充）
}

/**
 * 成本明细
 */
export interface CostBreakdown {
  demurrageCost: number; // 滞港费
  detentionCost: number; // 滞箱费
  storageCost: number; // 港口存储费
  yardStorageCost: number; // 外部堆场堆存费（Drop off 模式专属）
  transportationCost: number; // 运输费
  handlingCost: number; // 操作费（加急费等）
  totalCost: number; // 总成本
}

/**
 * 最优方案结果
 */
export interface OptimalUnloadResult {
  warehouse: Warehouse;
  unloadDate: Date;
  strategy: string;
  totalCost: number;
  costBreakdown: CostBreakdown;
  alternatives: UnloadOption[]; // 备选方案
}

/**
 * 🎯 批量优化 - 货柜分类
 *
 * @description 按免费期状态分类货柜
 * @since 2026-03-27
 */
export interface ContainerCategory {
  containerNumber: string;
  category: 'within_free_period' | 'overdue'; // 免费期内 | 已超期
  plannedPickupDate: Date;
  lastFreeDate: Date;
  remainingDays: number; // 剩余免费天数（正数=免费期内，负数=已超期）
  originalCost: number;
  warehouseCode: string;
  truckingCompanyId: string;
}

/**
 * 🎯 批量优化 - 优先级货柜
 *
 * @description 带优先级的货柜容器
 * @since 2026-03-27
 */
export interface PriorityContainer extends ContainerCategory {
  priority: number; // 优先级（数字越小优先级越高）
  optimizedPickupDate?: Date; // 优化后的提柜日
  optimizedCost?: number; // 优化后的成本
  savings?: number; // 节省金额
}

/**
 * 🎯 优化策略配置
 *
 * @description 定义不同类别货柜的搜索策略
 * @since 2026-03-27
 */
interface OptimizationStrategyConfig {
  searchDirection: 'forward' | 'backward';
  searchStartOffset: number;
  searchEndOffset: number;
  prioritizeZeroCost: boolean;
  allowSkipIfNoCapacity: boolean;
}

export class SchedulingCostOptimizerService {
  private schedulingConfigRepo: Repository<DictSchedulingConfig>;
  private warehouseRepo: Repository<Warehouse>;
  private warehouseOccupancyRepo: Repository<ExtWarehouseDailyOccupancy>;
  private warehouseTruckingMappingRepo: Repository<WarehouseTruckingMapping>;
  private truckingPortMappingRepo: Repository<TruckingPortMapping>;
  private truckingCompanyRepo: Repository<TruckingCompany>;
  private containerRepo: Repository<Container>; // ← 新增
  private demurrageService: DemurrageService;

  // 港口 - 仓库距离矩阵（英里）- 示例数据，实际应从数据库或配置文件读取
  private readonly distanceMatrix: Record<string, Record<string, number>> = {
    USLAX: {
      // 洛杉矶港
      WH001: 25, // LAX → 1 号仓库
      WH002: 35, // LAX → 2 号仓库
      WH003: 45 // LAX → 3 号仓库
    },
    USLGB: {
      // 长滩港
      WH001: 30,
      WH002: 40,
      WH003: 50
    },
    USOAK: {
      // 奥克兰港
      WH004: 20,
      WH005: 35
    },
    USSEA: {
      // 西雅图港
      WH006: 25
    }
    // 默认值：如果找不到具体距离，使用 50 英里作为默认值
  };

  constructor() {
    this.schedulingConfigRepo = AppDataSource.getRepository(DictSchedulingConfig);
    this.warehouseRepo = AppDataSource.getRepository(Warehouse);
    this.warehouseOccupancyRepo = AppDataSource.getRepository(ExtWarehouseDailyOccupancy);
    this.warehouseTruckingMappingRepo = AppDataSource.getRepository(WarehouseTruckingMapping);
    this.truckingPortMappingRepo = AppDataSource.getRepository(TruckingPortMapping);
    this.truckingCompanyRepo = AppDataSource.getRepository(TruckingCompany);
    this.containerRepo = AppDataSource.getRepository(Container); // ← 新增
    this.demurrageService = new DemurrageService(
      AppDataSource.getRepository(ExtDemurrageStandard),
      AppDataSource.getRepository(Container),
      AppDataSource.getRepository(PortOperation),
      AppDataSource.getRepository(SeaFreight),
      AppDataSource.getRepository(TruckingTransport),
      AppDataSource.getRepository(EmptyReturn),
      AppDataSource.getRepository(ReplenishmentOrder)
    );
  }

  /**
   * 根据国家和港口选择候选仓库
   * @param countryCode 国家代码
   * @param portCode 港口代码
   * @returns 候选仓库列表
   */
  async getCandidateWarehouses(countryCode: string, portCode: string): Promise<Warehouse[]> {
    try {
      // 1. 首先获取该国家和港口的车队映射
      const truckingPortMappings = await this.truckingPortMappingRepo.find({
        where: {
          country: countryCode,
          portCode,
          isActive: true
        }
      });

      // 2. 提取车队ID列表
      const truckingCompanyIds = truckingPortMappings.map((mapping) => mapping.truckingCompanyId);

      // 3. 获取与这些车队关联的仓库
      let warehouses: Warehouse[] = [];

      if (truckingCompanyIds.length > 0) {
        // 通过 WarehouseTruckingMapping 获取关联的仓库
        const warehouseTruckingMappings = await this.warehouseTruckingMappingRepo.find({
          where: {
            country: countryCode,
            truckingCompanyId: In(truckingCompanyIds),
            isActive: true
          }
        });

        // 提取仓库代码列表
        const warehouseCodes = warehouseTruckingMappings.map((mapping) => mapping.warehouseCode);

        if (warehouseCodes.length > 0) {
          // 查询仓库信息
          const warehouseList = await this.warehouseRepo.find({
            where: {
              warehouseCode: In(warehouseCodes),
              status: 'ACTIVE'
            }
          });

          warehouses = warehouseList;
        }
      }

      // 4. 如果没有找到映射的仓库，返回同一国家的活跃仓库
      if (warehouses.length === 0) {
        warehouses = await this.warehouseRepo.find({
          where: {
            country: countryCode,
            status: 'ACTIVE'
          },
          order: {
            warehouseCode: 'ASC'
          }
        });
      }

      // 5. 如果仍然没有找到，返回所有活跃仓库
      if (warehouses.length === 0) {
        warehouses = await this.warehouseRepo.find({
          where: { status: 'ACTIVE' },
          order: { warehouseCode: 'ASC' }
        });
      }

      return warehouses;
    } catch (error) {
      log.warn(`[CostOptimizer] Failed to get candidate warehouses:`, error);
      // 出错时返回同一国家的活跃仓库作为后备
      try {
        return await this.warehouseRepo.find({
          where: {
            country: countryCode,
            status: 'ACTIVE'
          },
          order: {
            warehouseCode: 'ASC'
          }
        });
      } catch (backupError) {
        log.warn(`[CostOptimizer] Failed to get backup warehouses:`, backupError);
        return [];
      }
    }
  }

  /**
   * 检查仓库在指定日期是否可用
   * @param warehouse 仓库
   * @param date 日期
   * @returns 是否可用
   */
  async isWarehouseAvailable(warehouse: Warehouse, date: Date): Promise<boolean> {
    try {
      // 使用 Date 对象进行查询
      // 格式化日期为 YYYY-MM-DD（去除时间部分）
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);

      // 使用智能日历能力确保档期记录存在并设置正确的 capacity
      const occupancy = await smartCalendarCapacity.ensureWarehouseOccupancy(
        warehouse.warehouseCode,
        queryDate
      );

      if (!occupancy) {
        log.warn(
          `[CostOptimizer] No occupancy record for warehouse ${warehouse.warehouseCode} on ${queryDate.toISOString().split('T')[0]}`
        );
        return false;
      }

      // 检查剩余容量
      const available = occupancy.remaining > 0;

      if (!available) {
        log.debug(
          `[CostOptimizer] Warehouse ${warehouse.warehouseCode} not available on ${queryDate.toISOString().split('T')[0]}: ` +
            `capacity=${occupancy.capacity}, planned=${occupancy.plannedCount}, remaining=${occupancy.remaining}`
        );
      }

      return available;
    } catch (error) {
      log.warn(`[CostOptimizer] Failed to check warehouse availability:`, error);
      return true; // 出错时默认可用
    }
  }

  /**
   * 生成所有可行的卸柜方案
   * @param container 货柜信息
   * @param pickupDate 提柜日
   * @param lastFreeDate 免费期截止日
   * @param searchWindowDays 搜索窗口（默认 7 天）
   * @returns 所有可行方案列表
   */
  async generateAllFeasibleOptions(
    container: Container,
    pickupDate: Date,
    lastFreeDate: Date,
    searchWindowDays: number = 7
  ): Promise<UnloadOption[]> {
    const options: UnloadOption[] = [];

    // 1. 获取候选仓库列表
    const warehouses = await this.getCandidateWarehouses(
      (container as any).countryCode || 'US',
      (container as any).portCode || 'LAX'
    );

    // 2. 为每个仓库生成 Direct 方案
    for (const warehouse of warehouses) {
      for (let offset = 0; offset < searchWindowDays; offset++) {
        const candidateDate = dateTimeUtils.addDays(pickupDate, offset);

        // 跳过周末（如果配置了）
        if (this.isWeekend(candidateDate) && (await this.shouldSkipWeekends())) {
          continue;
        }

        // 检查仓库档期
        if (!(await this.isWarehouseAvailable(warehouse, candidateDate))) {
          continue;
        }

        options.push({
          containerNumber: container.containerNumber,
          warehouse,
          plannedPickupDate: candidateDate, // ← 重命名
          strategy: 'Direct',
          isWithinFreePeriod: candidateDate <= lastFreeDate
        });
      }
    }

    // 3. 生成 Drop off 方案（简化版）
    const dropOffOptions = await this.generateDropOffOptions(container, pickupDate, lastFreeDate);
    options.push(...dropOffOptions);

    // 4. 生成 Expedited 方案（简化版）
    const expeditedOptions = await this.generateExpeditedOptions(container, lastFreeDate);
    options.push(...expeditedOptions);

    return options;
  }

  /**
   * 评估单个卸柜方案的总成本
   * @param option 卸柜方案
   * @returns 成本明细
   */
  async evaluateTotalCost(option: UnloadOption): Promise<CostBreakdown> {
    const breakdown: CostBreakdown = {
      demurrageCost: 0,
      detentionCost: 0,
      storageCost: 0,
      yardStorageCost: 0,
      transportationCost: 0,
      handlingCost: 0,
      totalCost: 0
    };

    try {
      // 1. 根据策略计算计划日期
      // Direct/Live load: 提=送=卸
      // Drop off: 提<送=卸
      // Expedited: 提=送=卸（免费期内）

      // ✅ 关键修复：明确区分提柜日和卸柜日
      const plannedPickupDate = option.plannedPickupDate;

      // 如果未提供 plannedUnloadDate，根据策略推导
      let actualPlannedUnloadDate = option.plannedUnloadDate;
      if (!actualPlannedUnloadDate) {
        if (option.strategy === 'Drop off') {
          // Drop off 模式：假设提柜后 2 天卸柜（堆场堆存）
          actualPlannedUnloadDate = dateTimeUtils.addDays(option.plannedPickupDate, 2);
        } else {
          // Direct/Expedited: 提=卸
          actualPlannedUnloadDate = option.plannedPickupDate;
        }
      }

      // 估算还箱日：根据卸柜方式不同
      let plannedReturnDate: Date;
      if (option.strategy === 'Drop off') {
        // Drop off 模式：假设堆场堆存 3 天后还箱
        plannedReturnDate = dateTimeUtils.addDays(actualPlannedUnloadDate, 3);
      } else {
        // Live load / Expedited: 当天还箱
        plannedReturnDate = actualPlannedUnloadDate;
      }

      // 使用统一的 calculateTotalCost 方法计算所有费用
      const totalCostResult = await this.demurrageService.calculateTotalCost(
        option.containerNumber,
        {
          mode: 'forecast',
          plannedDates: {
            plannedPickupDate,
            plannedUnloadDate: actualPlannedUnloadDate,
            plannedReturnDate
          },
          includeTransport: true,
          warehouse: option.warehouse,
          truckingCompany: option.truckingCompany,
          unloadMode: option.strategy === 'Drop off' ? 'Drop off' : 'Live load'
        }
      );

      breakdown.demurrageCost = totalCostResult.demurrageCost;
      breakdown.detentionCost = totalCostResult.detentionCost;
      breakdown.storageCost = totalCostResult.storageCost; // 港口存储费
      breakdown.transportationCost = totalCostResult.transportationCost;
      breakdown.yardStorageCost = 0;

      // ✅ 关键修复：外部堆场堆存费（仅在 Drop off 模式、车队有堆场且实际使用时计算）
      if (option.strategy === 'Drop off' && option.truckingCompany) {
        try {
          // 检查车队是否有堆场
          const hasYard = option.truckingCompany.hasYard || false;

          if (hasYard) {
            // ✅ 送仓日计算：Drop off 模式下，送仓日 = 卸柜日
            const plannedDeliveryDate = actualPlannedUnloadDate; // Drop off: 送 = 卸

            // ✅ 判断是否实际使用了堆场：提柜日 < 送仓日
            const pickupDayStr = option.plannedPickupDate.toISOString().split('T')[0];
            const deliveryDayStr = plannedDeliveryDate.toISOString().split('T')[0];

            if (pickupDayStr !== deliveryDayStr) {
              // ✅ 提 < 送，说明货柜在堆场存放了
              // ✅ 预计堆场存放天数（从提柜日到送仓日）
              const yardStorageDays = dateTimeUtils.daysBetween(
                option.plannedPickupDate,
                plannedDeliveryDate
              );

              // 从 TruckingPortMapping 获取堆场费率
              const destPo = await AppDataSource.getRepository(Container)
                .createQueryBuilder('c')
                .leftJoinAndSelect('c.portOperations', 'po')
                .where('c.containerNumber = :containerNumber', {
                  containerNumber: option.containerNumber
                })
                .andWhere('po.portType = :portType', { portType: 'destination' })
                .getOne();

              const po = destPo?.portOperations?.find((p: any) => p.portType === 'destination');
              const portCode = po?.portCode || 'USLAX';
              const countryCode = option.warehouse.country || 'US';

              const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
                where: {
                  country: countryCode,
                  portCode,
                  truckingCompanyId: option.truckingCompany.companyCode,
                  isActive: true
                }
              });

              if (truckingPortMapping) {
                // 计算外部堆场堆存费 = 每日费率 × 天数 + 操作费
                breakdown.yardStorageCost =
                  (truckingPortMapping.standardRate || 0) * yardStorageDays +
                  (truckingPortMapping.yardOperationFee || 0);
              }
            } // ← 添加闭合括号
          }
        } catch (error) {
          log.warn(`[CostOptimizer] Yard storage cost calculation failed:`, error);
          // 计算失败不影响整体，yardStorageCost 保持为 0
        }
      }

      // 加急费单独计算
      if (option.strategy === 'Expedited') {
        breakdown.handlingCost = await this.getConfigNumber('expedited_handling_fee', 50);
      }

      // 总成本（包含外部堆场堆存费）
      breakdown.totalCost =
        breakdown.demurrageCost +
        breakdown.detentionCost +
        breakdown.storageCost +
        breakdown.transportationCost +
        breakdown.yardStorageCost +
        breakdown.handlingCost;
    } catch (error) {
      log.warn(`[CostOptimizer] Cost evaluation failed for ${option.containerNumber}:`, error);
    }

    return breakdown;
  }

  /**
   * 选择最优方案
   * @param options 所有可行方案
   * @returns 最优方案
   */
  async selectBestOption(options: UnloadOption[]): Promise<{
    option: UnloadOption;
    costBreakdown: CostBreakdown;
  }> {
    if (options.length === 0) {
      throw new Error('No feasible options available');
    }

    // 评估所有方案的成本
    const evaluatedOptions = await Promise.all(
      options.map(async (option) => ({
        option,
        costBreakdown: await this.evaluateTotalCost(option)
      }))
    );

    // 填充 totalCost
    evaluatedOptions.forEach((item) => {
      item.option.totalCost = item.costBreakdown.totalCost;
    });

    // 选择成本最低的方案
    const best = evaluatedOptions.sort(
      (a, b) => (a.option.totalCost || 0) - (b.option.totalCost || 0)
    )[0];

    log.info(
      `[CostOptimizer] Selected optimal option: ` +
        `Strategy=${best.option.strategy}, ` +
        `PickupDate=${best.option.plannedPickupDate.toISOString().split('T')[0]}, ` + // ← 重命名
        `Cost=$${best.option.totalCost}`
    );

    return best;
  }

  /**
   * 生成 Drop off 方案
   * @param container 货柜信息
   * @param pickupDate 提柜日
   * @param lastFreeDate 免费期截止日
   * @returns Drop off 方案列表
   */
  private async generateDropOffOptions(
    container: Container,
    pickupDate: Date,
    lastFreeDate: Date
  ): Promise<UnloadOption[]> {
    const options: UnloadOption[] = [];

    try {
      // 1. 查询有堆场的车队（从 warehouse_trucking_mapping）
      const countryCode = (container as any).countryCode || 'US';
      const portCode = (container as any).portCode || 'LAX';

      const mappings = await this.warehouseTruckingMappingRepo.find({
        where: {
          country: countryCode,
          isActive: true
        },
        relations: ['truckingCompany']
      });

      // 筛选有堆场的车队
      const truckingCompaniesWithYard = new Map<string, TruckingCompany>();
      for (const mapping of mappings) {
        const trucking = await this.truckingCompanyRepo.findOne({
          where: { companyCode: mapping.truckingCompanyId }
        });

        if (trucking && trucking.hasYard) {
          truckingCompaniesWithYard.set(mapping.truckingCompanyId, trucking);
        }
      }

      if (truckingCompaniesWithYard.size === 0) {
        log.warn(
          `[CostOptimizer] No trucking companies with yard found for country: ${countryCode}`
        );
        return options; // 没有堆场车队，返回空数组
      }

      // 2. 为每个有堆场的车队生成 Drop off 方案（仅在免费期外）
      for (const [truckingId, trucking] of truckingCompaniesWithYard) {
        // 检查 TruckingPortMapping 中的堆场容量
        const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
          where: {
            country: countryCode,
            portCode,
            truckingCompanyId: truckingId,
            isActive: true
          }
        });

        // 检查堆场容量
        if (truckingPortMapping && truckingPortMapping.yardCapacity <= 0) {
          log.warn(`[CostOptimizer] Trucking company ${truckingId} has no yard capacity`);
          continue;
        }

        // Drop off 模式通常用于免费期外，搜索免费期后 3 天
        for (let offset = 0; offset < 3; offset++) {
          const candidateDate = dateTimeUtils.addDays(lastFreeDate, offset + 1);

          // 跳过周末（如果配置了）
          if (this.isWeekend(candidateDate) && (await this.shouldSkipWeekends())) {
            continue;
          }

          // 获取车队关联的仓库
          const warehouse = await this.warehouseRepo.findOne({
            where: {
              warehouseCode: mappings.find((m) => m.truckingCompanyId === truckingId)?.warehouseCode
            }
          });

          if (!warehouse) continue;

          // 检查仓库档期
          if (!(await this.isWarehouseAvailable(warehouse, candidateDate))) {
            continue;
          }

          options.push({
            containerNumber: container.containerNumber,
            warehouse,
            plannedPickupDate: candidateDate,
            strategy: 'Drop off',
            truckingCompany: trucking,
            isWithinFreePeriod: false
          });
        }
      }
    } catch (error) {
      log.warn(`[CostOptimizer] Failed to generate drop off options:`, error);
    }

    return options;
  }

  /**
   * 生成 Expedited 方案
   * @param container 货柜信息
   * @param lastFreeDate 免费期截止日
   * @returns Expedited 方案列表
   */
  private async generateExpeditedOptions(
    container: Container,
    lastFreeDate: Date
  ): Promise<UnloadOption[]> {
    const options: UnloadOption[] = [];

    try {
      // 1. 判断是否紧急（距离免费期截止 ≤ 2 天）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastFreeOnly = new Date(lastFreeDate);
      lastFreeOnly.setHours(0, 0, 0, 0);

      const daysUntilFreezeExpires = Math.ceil(
        (lastFreeOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 只有在紧急情况下才生成加急方案
      if (daysUntilFreezeExpires > 2) {
        log.info(
          `[CostOptimizer] Not urgent (${daysUntilFreezeExpires} days left), skipping expedited options`
        );
        return [];
      }

      log.info(
        `[CostOptimizer] Urgent case detected (${daysUntilFreezeExpires} days left), generating expedited options`
      );

      // 2. 获取候选仓库
      const warehouses = await this.getCandidateWarehouses(
        (container as any).countryCode || 'US',
        (container as any).portCode || 'LAX'
      );

      // 3. 为每个仓库生成 Expedited 方案（在免费期内加急）
      for (const warehouse of warehouses) {
        // Expedited 模式通常用于免费期即将到期时，搜索免费期前 2 天到当天
        for (let offset = -2; offset <= 0; offset++) {
          const candidateDate = dateTimeUtils.addDays(lastFreeDate, offset);

          // 确保日期在合理范围内（不能是过去）
          if (candidateDate < today) {
            continue;
          }

          // 跳过周末（如果配置了）
          if (this.isWeekend(candidateDate) && (await this.shouldSkipWeekends())) {
            continue;
          }

          // 检查仓库档期
          if (!(await this.isWarehouseAvailable(warehouse, candidateDate))) {
            continue;
          }

          options.push({
            containerNumber: container.containerNumber,
            warehouse,
            plannedPickupDate: candidateDate,
            strategy: 'Expedited',
            isWithinFreePeriod: candidateDate <= lastFreeDate
          });
        }
      }
    } catch (error) {
      log.warn(`[CostOptimizer] Failed to generate expedited options:`, error);
    }

    return options;
  }

  /**
   * 🎯 成本优化建议：智能推荐最优卸柜日期
   *
   * **SKILL 原则**:
   * - Single Fact Source: 免费期从 DemurrageService 获取
   * - Lazy Evaluation: 只计算必要的日期（分类后智能搜索）
   * - Leverage: 复用 categorizeSingleContainer、selectOptimizationStrategy、generateSearchRange
   *
   * @param containerNumber 柜号
   * @param warehouse 仓库信息
   * @param truckingCompany 车队信息
   * @param basePickupDate 基础提柜日（通常为智能排产计算的日期）
   * @param lastFreeDate 免费期截止日（可选，如果不传则从 DemurrageService 查询）
   * @returns 最优方案建议
   * @since 2026-03-27 (重构于 2026-03-27)
   */
  async suggestOptimalUnloadDate(
    containerNumber: string,
    warehouse: Warehouse,
    truckingCompany: TruckingCompany,
    basePickupDate: Date,
    lastFreeDate?: Date // ✅ 改为可选参数：允许不传，后端自行查询
  ): Promise<{
    suggestedPickupDate: Date;
    suggestedStrategy: 'Direct' | 'Drop off' | 'Expedited';
    originalCost: number;
    optimizedCost: number;
    savings: number;
    savingsPercent: number;
    alternatives: Array<{
      pickupDate: Date;
      strategy: 'Direct' | 'Drop off' | 'Expedited';
      totalCost: number;
      savings: number;
      breakdown: CostBreakdown; // ✅ 新增：费用明细
    }>;
  }> {
    try {
      log.info(`[CostOptimizer] Starting cost optimization for ${containerNumber}`);

      // 1. 获取货柜信息
      const container = await this.containerRepo.findOne({
        where: { containerNumber },
        relations: ['portOperations']
      });

      if (!container) {
        throw new Error(`Container ${containerNumber} not found`);
      }

      // ✅ SKILL 原则：从权威数据源获取免费期
      // 调用 DemurrageService 计算滞港费/滞箱费，获取准确的免费期截止日
      const demurrageResult = await this.demurrageService.calculateForContainer(containerNumber);

      let effectiveLastFreeDate: Date;
      if (demurrageResult.result?.calculationDates?.lastPickupDateComputed) {
        // 优先使用滞港费免费期（从 process_port_operations.last_free_date 计算）
        effectiveLastFreeDate = new Date(
          demurrageResult.result.calculationDates.lastPickupDateComputed
        );
        log.info(
          `[CostOptimizer] Using demurrage lastFreeDate from DB: ${effectiveLastFreeDate.toISOString().split('T')[0]}`
        );
      } else if (lastFreeDate) {
        // 其次使用传入的参数
        effectiveLastFreeDate = lastFreeDate;
        log.info(
          `[CostOptimizer] Using passed lastFreeDate parameter: ${effectiveLastFreeDate.toISOString().split('T')[0]}`
        );
      } else {
        // 最后兜底：使用 basePickupDate + 7 天
        effectiveLastFreeDate = dateTimeUtils.addDays(basePickupDate, 7);
        log.warn(
          `[CostOptimizer] No lastFreeDate available, using default (basePickupDate + 7 days): ${effectiveLastFreeDate.toISOString().split('T')[0]}`
        );
      }

      // 2. ✅ 新增：分类判断（SKILL: Lazy Evaluation）
      const category = await this.categorizeSingleContainer(
        containerNumber,
        basePickupDate,
        effectiveLastFreeDate
      );

      log.info(
        `[CostOptimizer] Categorized ${containerNumber}: ${category.category} ` +
          `(remaining days: ${category.remainingDays})`
      );

      // 3. 计算当前方案的成本
      const currentOption: UnloadOption = {
        containerNumber,
        warehouse,
        plannedPickupDate: basePickupDate,
        strategy: truckingCompany.hasYard ? 'Drop off' : 'Direct',
        truckingCompany,
        isWithinFreePeriod: basePickupDate <= effectiveLastFreeDate
      };

      const currentBreakdown = await this.evaluateTotalCost(currentOption);
      const originalCost = currentBreakdown.totalCost;

      // ✅ 关键修复：确保 originalCost 是数字类型
      if (typeof originalCost !== 'number' || isNaN(originalCost)) {
        log.warn(`[CostOptimizer] Invalid originalCost for ${currentOption.containerNumber}:`, {
          originalCost,
          breakdown: currentBreakdown
        });
        // 返回当前方案，但不进行优化
        return {
          suggestedPickupDate: basePickupDate,
          suggestedStrategy: currentOption.strategy,
          originalCost: 0,
          optimizedCost: 0,
          savings: 0,
          savingsPercent: 0,
          alternatives: []
        };
      }

      log.info(`[CostOptimizer] Current cost: $${originalCost.toFixed(2)}`);

      // ✅ 关键调试：输出当前方案的详细信息
      log.info(`[CostOptimizer] Current option details:`, {
        pickupDate: basePickupDate.toISOString().split('T')[0],
        strategy: currentOption.strategy,
        warehouse: warehouse.warehouseCode,
        isWithinFreePeriod: currentOption.isWithinFreePeriod
      });

      // 4. ✅ 新增：选择优化策略（SKILL: Keep It Logical）
      const strategy = this.selectOptimizationStrategy(category);

      log.info(
        `[CostOptimizer] Using strategy: ${strategy.searchDirection} ` +
          `(offset: ${strategy.searchStartOffset} ~ ${strategy.searchEndOffset})`
      );

      // 5. ✅ 新增：生成智能搜索范围（SKILL: Lazy Evaluation）
      const searchDates = this.generateSearchRange(
        basePickupDate,
        effectiveLastFreeDate,
        strategy,
        category // ✅ 传入分类参数，用于智能过滤
      );

      log.info(`[CostOptimizer] Search range: ${searchDates.length} dates (reduced from 15)`);

      // 6. 遍历搜索日期，评估成本
      const candidates: Array<{
        pickupDate: Date;
        strategy: 'Direct' | 'Drop off' | 'Expedited';
        totalCost: number;
        breakdown: CostBreakdown;
      }> = [];

      log.info(`[CostOptimizer] Starting to evaluate ${searchDates.length} candidate dates...`);

      for (const candidateDate of searchDates) {
        const candidateDateStr = candidateDate.toISOString().split('T')[0];
        log.debug(`[CostOptimizer] Evaluating date: ${candidateDateStr}`);

        // 跳过周末（如果配置了）
        if (this.isWeekend(candidateDate) && (await this.shouldSkipWeekends())) {
          log.debug(`[CostOptimizer] Skipping weekend: ${candidateDateStr}`);
          continue;
        }

        // 检查仓库档期
        if (!(await this.isWarehouseAvailable(warehouse, candidateDate))) {
          // ✅ 新增：无能力时的处理（SKILL: allowSkipIfNoCapacity）
          if (strategy.allowSkipIfNoCapacity) {
            log.debug(
              `[CostOptimizer] No capacity on ${candidateDateStr}, skipping (allowSkipIfNoCapacity=true)`
            );
            continue; // 免费期内的可以跳过
          } else {
            log.warn(
              `[CostOptimizer] No capacity on ${candidateDateStr}, but must process (allowSkipIfNoCapacity=false)`
            );
            // 超期的必须处理，继续找其他日期
          }
        }

        // 为每个候选日期评估不同策略的成本
        const strategies: Array<'Direct' | 'Drop off' | 'Expedited'> = [
          'Direct',
          ...(truckingCompany.hasYard ? (['Drop off'] as const) : []),
          ...(candidateDate <= effectiveLastFreeDate ? (['Expedited'] as const) : [])
        ];

        log.debug(`[CostOptimizer] Strategies for ${candidateDateStr}: ${strategies.join(', ')}`);

        for (const strat of strategies) {
          const option: UnloadOption = {
            containerNumber,
            warehouse,
            plannedPickupDate: candidateDate,
            strategy: strat,
            truckingCompany,
            isWithinFreePeriod: candidateDate <= effectiveLastFreeDate
          };

          const breakdown = await this.evaluateTotalCost(option);

          // ✅ 关键调试：输出每个方案的费用明细
          log.info(`[CostOptimizer] Cost breakdown for ${candidateDateStr} ${strat}:`, {
            container: option.containerNumber,
            pickupDate: candidateDateStr,
            strategy: strat,
            demurrage: breakdown.demurrageCost,
            detention: breakdown.detentionCost,
            storage: breakdown.storageCost,
            yardStorage: breakdown.yardStorageCost,
            transportation: breakdown.transportationCost,
            handling: breakdown.handlingCost,
            total: breakdown.totalCost,
            isWithinFreePeriod: option.isWithinFreePeriod
          });

          // ✅ 新增：优先零成本（SKILL: prioritizeZeroCost）
          if (strategy.prioritizeZeroCost && breakdown.totalCost > 0) {
            log.debug(
              `[CostOptimizer] Skipping non-zero cost option: $${breakdown.totalCost.toFixed(2)}`
            );
            continue; // 跳过非零成本的选项
          }

          candidates.push({
            pickupDate: candidateDate,
            strategy: strat,
            totalCost: breakdown.totalCost,
            breakdown // ✅ 保存完整的费用明细
          });

          // ✅ 新增：找到第一个满足条件的就停止（SKILL: Lazy Evaluation）
          if (strategy.prioritizeZeroCost && breakdown.totalCost === 0) {
            log.debug(
              `[CostOptimizer] Found zero-cost option on ${candidateDateStr}, stopping early`
            );
            break; // 找到成本为 0 的就停止
          }
        }

        // 如果已经找到候选，且是免费期内的，可以提前停止
        if (candidates.length > 0 && strategy.prioritizeZeroCost) {
          log.debug(`[CostOptimizer] Found ${candidates.length} candidates, stopping date loop`);
          break;
        }
      }

      log.info(`[CostOptimizer] Total candidates found: ${candidates.length}`);

      // 7. 找到成本最低的方案
      if (candidates.length === 0) {
        log.warn(`[CostOptimizer] No candidates found for ${containerNumber}`);

        // ✅ 新增：如果没有候选方案，且允许跳过
        if (strategy.allowSkipIfNoCapacity) {
          log.info(`[CostOptimizer] Skipping optimization, using original date`);
          return {
            suggestedPickupDate: basePickupDate,
            suggestedStrategy: truckingCompany.hasYard ? 'Drop off' : 'Direct',
            originalCost,
            optimizedCost: originalCost,
            savings: 0,
            savingsPercent: 0,
            alternatives: [
              {
                pickupDate: basePickupDate,
                strategy: truckingCompany.hasYard ? 'Drop off' : 'Direct',
                totalCost: originalCost,
                savings: 0,
                breakdown: currentBreakdown
              }
            ]
          };
        }

        // 不允许跳过，使用当前方案
        return {
          suggestedPickupDate: basePickupDate,
          suggestedStrategy: truckingCompany.hasYard ? 'Drop off' : 'Direct',
          originalCost,
          optimizedCost: originalCost,
          savings: 0,
          savingsPercent: 0,
          alternatives: [
            {
              pickupDate: basePickupDate,
              strategy: truckingCompany.hasYard ? 'Drop off' : 'Direct',
              totalCost: originalCost,
              savings: 0,
              breakdown: currentBreakdown
            }
          ]
        };
      }

      // 8. 选择最优方案
      const optimalCandidate = candidates.reduce((min, curr) =>
        curr.totalCost < min.totalCost ? curr : min
      );

      const optimizedCost = optimalCandidate.totalCost;
      const savings = originalCost - optimizedCost;
      const savingsPercent = originalCost > 0 ? (savings / originalCost) * 100 : 0;

      log.info(`[CostOptimizer] Found optimal solution:`, {
        date: optimalCandidate.pickupDate.toISOString().split('T')[0],
        strategy: optimalCandidate.strategy,
        cost: `$${optimalCandidate.totalCost.toFixed(2)}`,
        savings: `$${savings.toFixed(2)}`,
        savingsPercent: `${savingsPercent.toFixed(2)}%`
      });

      // ✅ 关键调试：输出所有候选方案对比
      log.info(
        `[CostOptimizer] All candidates comparison:`,
        candidates.map((c) => ({
          date: c.pickupDate.toISOString().split('T')[0],
          strategy: c.strategy,
          cost: `$${c.totalCost.toFixed(2)}`
        }))
      );

      // 9. 返回前 3 个最优方案
      const sortedCandidates = candidates
        .sort((a, b) => a.totalCost - b.totalCost)
        .slice(0, 3)
        .map((candidate) => ({
          pickupDate: candidate.pickupDate, // 保持 Date 类型
          strategy: candidate.strategy,
          totalCost: candidate.totalCost,
          savings: originalCost - candidate.totalCost,
          breakdown: candidate.breakdown
        }));

      return {
        suggestedPickupDate: optimalCandidate.pickupDate,
        suggestedStrategy: optimalCandidate.strategy,
        originalCost,
        optimizedCost,
        savings,
        savingsPercent,
        alternatives: sortedCandidates
      };
    } catch (error) {
      log.error(`[CostOptimizer] Failed to suggest optimal date:`, error);
      throw error;
    }
  }

  /**
   * 计算堆存天数（Drop off 模式）
   * @param option 卸柜方案
   * @returns 堆存天数
   */
  private calculateStorageDays(_option: UnloadOption): number {
    // Drop off 模式：从卸柜日到还箱日
    // 考虑 TruckingPortMapping 中的堆场容量和费用

    // 简化处理：假设 3 天堆存
    // 实际项目中，应该根据堆场容量和还箱计划动态计算
    return 3;
  }

  /**
   * 获取港口到仓库的距离（英里）
   * @param portCode 港口代码
   * @param warehouseCode 仓库代码
   * @returns 距离（英里）
   */
  private getDistance(portCode: string, warehouseCode: string): number {
    // 从距离矩阵中查找
    const portDistances = this.distanceMatrix[portCode];
    if (portDistances) {
      const distance = portDistances[warehouseCode];
      if (distance !== undefined) {
        return distance;
      }
    }

    // 找不到具体距离，返回默认值 50 英里
    log.warn(
      `[CostOptimizer] No distance found for Port=${portCode}, Warehouse=${warehouseCode}, using default 50 miles`
    );
    return 50; // 默认 50 英里
  }

  /**
   * 从配置读取数值
   * @param key 配置键
   * @param defaultValue 默认值
   * @returns 配置值
   */
  private async getConfigNumber(key: string, defaultValue: number): Promise<number> {
    try {
      const config = await this.schedulingConfigRepo.findOne({
        where: { configKey: key }
      });
      return config ? parseFloat(config.configValue || '0') : defaultValue;
    } catch (error) {
      log.warn(`[Config] Failed to read config ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * 判断是否为周末
   * @param date 日期
   * @returns 是否为周末
   */
  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 周日或周六
  }

  /**
   * 是否应该跳过周末（从配置读取）
   * @returns 是否跳过周末
   */
  private async shouldSkipWeekends(): Promise<boolean> {
    try {
      const config = await this.schedulingConfigRepo.findOne({
        where: { configKey: 'skip_weekends' }
      });
      return config ? config.configValue === 'true' : false;
    } catch (error) {
      log.warn(`[Config] Failed to read skip_weekends config:`, error);
      return false; // 默认不跳过
    }
  }

  // ============================================================================
  // 🎯 批量成本优化功能
  // ============================================================================

  /**
   * 🎯 策略配置接口
   *
   * @description 定义不同类别货柜的优化策略
   * @since 2026-03-27
   */
  private readonly OPTIMIZATION_STRATEGIES = {
    // 已超期：尽量往前排（日期越早越好，减少损失）
    OVERDUE: {
      searchDirection: 'forward' as const,
      searchStartOffset: 0, // 从今天开始
      searchEndOffset: 7, // 往后 7 天
      prioritizeZeroCost: false, // 已经不可能的，尽量减少损失
      allowSkipIfNoCapacity: false // 超期的必须处理
    },

    // 免费期内：从免费日往前优化（日期越大越好，成本为 0）
    WITHIN_FREE_PERIOD: {
      searchDirection: 'backward' as const,
      searchStartOffset: 0, // 从免费期截止日开始
      searchEndOffset: -7, // 往前 7 天
      prioritizeZeroCost: true, // 必须成本为 0
      allowSkipIfNoCapacity: true // 无能力时保持原日期
    }
  };

  /**
   * 🎯 分类单个货柜：判断属于哪个子集
   *
   * **SKILL 原则**:
   * - Single Fact Source: 免费期数据从 DemurrageService 获取
   * - Leverage: 复用现有的 DemurrageService
   *
   * @param containerNumber 柜号
   * @param basePickupDate 基础提柜日
   * @param lastFreeDate 免费期截止日（可选）
   * @returns 分类结果
   * @since 2026-03-27
   */
  private async categorizeSingleContainer(
    containerNumber: string,
    basePickupDate: Date,
    lastFreeDate?: Date
  ): Promise<ContainerCategory> {
    try {
      // ✅ SKILL: 从权威数据源获取免费期
      const demurrageResult = await this.demurrageService.calculateForContainer(containerNumber, {
        freeDateWriteMode: 'none'
      });

      const effectiveLastFreeDate =
        lastFreeDate || demurrageResult.result?.items?.[0]?.lastFreeDate;
      if (!effectiveLastFreeDate) {
        log.warn(`[CostOptimizer] Last free date not found for ${containerNumber}, using default`);
      }

      // ✅ 计算剩余天数（相对于当前日期）
      const today = new Date();
      const remainingDays = dateTimeUtils.daysBetween(
        today,
        effectiveLastFreeDate || basePickupDate
      );

      // ✅ 关键修复：判断原计划是否已经超期
      // 即使今天还在免费期内，如果 lastFreeDate < basePickupDate，说明原计划已经超期了
      const todayOnly = new Date(today);
      todayOnly.setHours(0, 0, 0, 0);
      const basePickupOnly = new Date(basePickupDate);
      basePickupOnly.setHours(0, 0, 0, 0);
      const effectiveLastFreeOnly = effectiveLastFreeDate
        ? new Date(effectiveLastFreeDate)
        : new Date(basePickupDate);
      effectiveLastFreeOnly.setHours(0, 0, 0, 0);

      const isOriginalPlanOverdue = effectiveLastFreeOnly < basePickupOnly;

      log.info(`[CostOptimizer] Categorization for ${containerNumber}:`, {
        today: todayOnly.toISOString().split('T')[0],
        basePickupDate: basePickupOnly.toISOString().split('T')[0],
        lastFreeDate: effectiveLastFreeOnly.toISOString().split('T')[0],
        remainingDays,
        isOriginalPlanOverdue
      });

      // ✅ 分类逻辑：
      // 1. 如果原计划已经超期（lastFreeDate < basePickupDate），无论今天如何，都是 overdue
      // 2. 否则，根据剩余天数判断
      let category: 'within_free_period' | 'overdue';
      let actualRemainingDays = remainingDays;

      if (isOriginalPlanOverdue) {
        // 原计划超期，即使今天还在免费期内，也是 overdue
        category = 'overdue';
        log.info(`[CostOptimizer] Original plan is overdue, using 'overdue' category`);
      } else {
        // 原计划未超期，根据剩余天数判断
        category = remainingDays >= 0 ? 'within_free_period' : 'overdue';
      }

      return {
        containerNumber,
        category,
        plannedPickupDate: basePickupDate,
        lastFreeDate: effectiveLastFreeDate || basePickupDate,
        remainingDays: actualRemainingDays,
        originalCost: 0,
        warehouseCode: '',
        truckingCompanyId: ''
      };
    } catch (error) {
      log.error(`[CostOptimizer] Failed to categorize ${containerNumber}:`, error);
      // 防御性编程：出错时默认为免费期内
      return {
        containerNumber,
        category: 'within_free_period',
        plannedPickupDate: basePickupDate,
        lastFreeDate: basePickupDate,
        remainingDays: 0,
        originalCost: 0,
        warehouseCode: '',
        truckingCompanyId: ''
      };
    }
  }

  /**
   * 🎯 选择优化策略：根据分类
   *
   * **SKILL 原则**:
   * - Keep It Logical: 不同类别使用不同策略
   *
   * @param category 货柜分类
   * @returns 优化策略
   * @since 2026-03-27
   */
  private selectOptimizationStrategy(category: ContainerCategory): OptimizationStrategyConfig {
    if (category.category === 'overdue') {
      return this.OPTIMIZATION_STRATEGIES.OVERDUE;
    } else {
      return this.OPTIMIZATION_STRATEGIES.WITHIN_FREE_PERIOD;
    }
  }

  /**
   * 🎯 生成智能搜索范围：根据策略
   *
   * **SKILL 原则**:
   * - Lazy Evaluation: 只计算必要的日期
   * - Leverage: 复用现有的 dateTimeUtils
   *
   * @param basePickupDate 基础提柜日
   * @param lastFreeDate 免费期截止日
   * @param strategy 优化策略
   * @returns 搜索日期列表
   * @since 2026-03-27
   */
  private generateSearchRange(
    basePickupDate: Date,
    lastFreeDate: Date,
    strategy: OptimizationStrategyConfig,
    category?: ContainerCategory // ✅ 新增参数：用于智能过滤
  ): Date[] {
    const dates: Date[] = [];
    const today = new Date();

    // ✅ 关键修复：获取日期字符串用于比较
    const todayStr = today.toISOString().split('T')[0];
    const basePickupDateStr = basePickupDate.toISOString().split('T')[0];

    if (strategy.searchDirection === 'forward') {
      // ✅ 已超期：从今天开始往后找（尽早处理）
      for (let offset = strategy.searchStartOffset; offset <= strategy.searchEndOffset; offset++) {
        const date = dateTimeUtils.addDays(today, offset);
        const dateStr = date.toISOString().split('T')[0];

        // ✅ 修复 1: 不能是过去
        if (dateStr < todayStr) {
          continue;
        }

        // ✅ 修复 2: 根据分类决定是否过滤
        // 只有免费期内的才过滤：不能早于原计划（避免不必要的提前）
        // 已超期的不过滤：允许找到比原计划更早的日期（尽早处理）
        if (category?.category === 'within_free_period' && dateStr < basePickupDateStr) {
          continue; // 免费期内的：跳过早于原计划的日期
        }

        dates.push(date);
      }
    } else if (strategy.searchDirection === 'backward') {
      // ✅ 免费期内：从免费日往前找（靠近免费期）
      for (let offset = strategy.searchStartOffset; offset >= strategy.searchEndOffset; offset--) {
        const date = dateTimeUtils.addDays(lastFreeDate, offset);
        const dateStr = date.toISOString().split('T')[0];

        // ✅ 修复 1: 不能是过去
        if (dateStr < todayStr) {
          continue;
        }

        // ✅ 修复 2: 不能早于原计划（避免不必要的提前）
        if (dateStr < basePickupDateStr) {
          continue;
        }

        // ✅ 修复 3: 不能是当天（除非原计划就是当天）
        // 约束：不能优化到当天，避免操作过于仓促
        if (dateStr === todayStr && dateStr !== basePickupDateStr) {
          continue; // 当天且原计划不是当天，跳过
        }

        dates.push(date);
      }
    }

    log.debug(
      `[CostOptimizer] Generated ${dates.length} dates for ${strategy.searchDirection} search: ` +
        `${dates.map((d) => d.toISOString().split('T')[0]).join(', ')}`
    );

    return dates;
  }

  /**
   * 🎯 分配优先级：根据分类和紧急程度
   *
   * **SKILL 原则**:
   * - Keep It Logical: 超期的优先级最高
   * - Lazy Evaluation: 只计算必要的优先级
   *
   * @param withinFreePeriod 免费期内的货柜
   * @param overdue 已超期的货柜
   * @returns 带优先级的货柜列表
   * @since 2026-03-27
   */
  assignPriorities(
    withinFreePeriod: ContainerCategory[],
    overdue: ContainerCategory[]
  ): PriorityContainer[] {
    const priorityQueue: PriorityContainer[] = [];

    log.info(`[BatchOptimizer] Assigning priorities...`);

    // ✅ 已超期的优先级最高（1 ~ N）
    overdue.forEach((container, index) => {
      priorityQueue.push({
        ...container,
        priority: index + 1 // 超期的优先级最高
      });
    });

    // ✅ 免费期内的优先级较低（N+1 ~ M）
    withinFreePeriod.forEach((container, index) => {
      priorityQueue.push({
        ...container,
        priority: overdue.length + index + 1
      });
    });

    log.info(
      `[BatchOptimizer] Priorities assigned:` +
        ` Total: ${priorityQueue.length},` +
        ` Highest priority: ${priorityQueue[0]?.priority},` +
        ` Lowest priority: ${priorityQueue[priorityQueue.length - 1]?.priority}`
    );

    return priorityQueue;
  }

  // ============================================================================
  // 🎯 批量成本优化主方法（复用单柜优化逻辑）
  // ============================================================================

  /**
   * 🎯 批量成本优化：智能分类 + 优先级排序 + 能力约束
   *
   * **SKILL 原则**:
   * - Single Fact Source: 免费期从 DemurrageService 获取
   * - Leverage: 直接复用 suggestOptimalUnloadDate 方法，不重复造轮子
   * - Keep It Logical: 分类 → 排序 → 逐个优化
   *
   * @param containerNumbers 货柜列表
   * @param basePickupDate 基础提柜日
   * @param lastFreeDate 免费期截止日（可选）
   * @returns 优化结果
   * @since 2026-03-27
   */
  async batchOptimize(
    containerNumbers: string[],
    basePickupDate: Date,
    lastFreeDate?: Date
  ): Promise<{
    results: PriorityContainer[];
    summary: {
      totalContainers: number;
      withinFreePeriodCount: number;
      overdueCount: number;
      totalSavings: number;
      optimizedCount: number;
    };
  }> {
    try {
      log.info(
        `[BatchOptimizer] Starting batch optimization for ${containerNumbers.length} containers`
      );

      // 1. ✅ 分类货柜（手动实现，因为还没有 categorizeContainers 方法）
      const withinFreePeriod: ContainerCategory[] = [];
      const overdue: ContainerCategory[] = [];

      for (const containerNumber of containerNumbers) {
        const category = await this.categorizeSingleContainer(
          containerNumber,
          basePickupDate,
          lastFreeDate
        );

        if (category.category === 'within_free_period') {
          withinFreePeriod.push(category);
        } else {
          overdue.push(category);
        }
      }

      const categories = { withinFreePeriod, overdue };

      log.info(
        `[BatchOptimizer] Categorized:` +
          ` Within free period: ${categories.withinFreePeriod.length},` +
          ` Overdue: ${categories.overdue.length}`
      );

      // 2. ✅ 分配优先级（复用 assignPriorities 方法）
      const priorityQueue = this.assignPriorities(categories.withinFreePeriod, categories.overdue);

      // 3. ✅ 预计算仓库能力（简化版，暂不实现）
      // TODO: 后续可以添加 precomputeWarehouseCapacities 方法
      const warehouseCapacities = new Map<string, Map<string, any>>();

      // 4. ✅ 按优先级优化每个货柜（关键：直接复用 suggestOptimalUnloadDate！）
      const results: PriorityContainer[] = [];

      for (const container of priorityQueue) {
        log.info(
          `[BatchOptimizer] Processing ${container.containerNumber} ` +
            `(Priority: ${container.priority}, Category: ${container.category})`
        );

        // 获取车队信息
        const truckingCompany = await this.truckingCompanyRepo.findOne({
          where: { companyCode: container.truckingCompanyId }
        });

        if (!truckingCompany) {
          log.warn(`[BatchOptimizer] Trucking company not found for ${container.containerNumber}`);
          continue;
        }

        // ✅ 关键：直接复用单柜优化方法！不重复造轮子
        const warehouse = await this.warehouseRepo.findOne({
          where: { warehouseCode: container.warehouseCode }
        });

        if (!warehouse) {
          log.warn(`[BatchOptimizer] Warehouse not found for ${container.containerNumber}`);
          continue;
        }

        const optimalResult = await this.suggestOptimalUnloadDate(
          container.containerNumber,
          warehouse,
          truckingCompany,
          container.plannedPickupDate,
          container.lastFreeDate
        );

        results.push({
          ...container,
          optimizedPickupDate: optimalResult.suggestedPickupDate,
          optimizedCost: optimalResult.optimizedCost,
          savings: optimalResult.savings
        });

        // 更新仓库能力（占用一个位置）
        if (optimalResult.suggestedPickupDate) {
          const capacity = warehouseCapacities
            .get(container.warehouseCode)
            ?.get(optimalResult.suggestedPickupDate.toISOString());

          if (capacity) {
            capacity.usedCapacity++;
            capacity.availableCapacity--;
          }
        }
      }

      // 5. ✅ 统计汇总
      const summary = {
        totalContainers: containerNumbers.length,
        withinFreePeriodCount: categories.withinFreePeriod.length,
        overdueCount: categories.overdue.length,
        totalSavings: results.reduce((sum, r) => sum + (r.savings || 0), 0),
        optimizedCount: results.filter((r) => r.optimizedPickupDate !== r.plannedPickupDate).length
      };

      log.info(
        `[BatchOptimizer] Completed:` +
          ` Optimized: ${summary.optimizedCount}/${summary.totalContainers},` +
          ` Total savings: $${summary.totalSavings.toFixed(2)}`
      );

      return {
        results,
        summary
      };
    } catch (error) {
      log.error(`[BatchOptimizer] Failed:`, error);
      throw error;
    }
  }
}
