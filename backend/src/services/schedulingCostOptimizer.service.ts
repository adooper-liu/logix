/**
 * 智能排柜成本优化服务
 * Scheduling Cost Optimization Service
 *
 * 负责生成所有可行方案、评估成本、选择最优方案
 */

import { Repository, In } from 'typeorm';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { Warehouse } from '../entities/Warehouse';
import { TruckingCompany } from '../entities/TruckingCompany';
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';
import { ExtDemurrageStandard } from '../entities/ExtDemurrageStandard';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { SeaFreight } from '../entities/SeaFreight';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { DemurrageService } from './demurrage.service';
// 导入日志工具，添加降级方案
import * as loggerModule from '../utils/logger';
const log = loggerModule.log || {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};
import * as dateTimeUtils from '../utils/dateTimeUtils';
import { smartCalendarCapacity } from '../utils/smartCalendarCapacity';

/**
 * 卸柜方案选项
 */
export interface UnloadOption {
  containerNumber: string;
  warehouse: Warehouse;
  unloadDate: Date;
  strategy: 'Direct' | 'Drop off' | 'Expedited';
  truckingCompany?: TruckingCompany;
  isWithinFreePeriod: boolean;
  totalCost?: number; // 总成本（由 evaluateTotalCost 计算后填充）
}

/**
 * 成本明细
 */
export interface CostBreakdown {
  demurrageCost: number;      // 滞港费
  detentionCost: number;      // 滞箱费
  storageCost: number;        // 港口存储费
  yardStorageCost: number;    // 外部堆场堆存费（Drop off 模式专属）
  transportationCost: number; // 运输费
  handlingCost: number;       // 操作费（加急费等）
  totalCost: number;          // 总成本
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

export class SchedulingCostOptimizerService {
  private schedulingConfigRepo: Repository<DictSchedulingConfig>;
  private warehouseRepo: Repository<Warehouse>;
  private warehouseOccupancyRepo: Repository<ExtWarehouseDailyOccupancy>;
  private warehouseTruckingMappingRepo: Repository<WarehouseTruckingMapping>;
  private truckingPortMappingRepo: Repository<TruckingPortMapping>;
  private truckingCompanyRepo: Repository<TruckingCompany>;
  private demurrageService: DemurrageService;

  // 港口 - 仓库距离矩阵（英里）- 示例数据，实际应从数据库或配置文件读取
  private readonly distanceMatrix: Record<string, Record<string, number>> = {
    'USLAX': { // 洛杉矶港
      'WH001': 25, // LAX → 1 号仓库
      'WH002': 35, // LAX → 2 号仓库
      'WH003': 45, // LAX → 3 号仓库
    },
    'USLGB': { // 长滩港
      'WH001': 30,
      'WH002': 40,
      'WH003': 50,
    },
    'USOAK': { // 奥克兰港
      'WH004': 20,
      'WH005': 35,
    },
    'USSEA': { // 西雅图港
      'WH006': 25,
    },
    // 默认值：如果找不到具体距离，使用 50 英里作为默认值
  };

  constructor() {
    this.schedulingConfigRepo = AppDataSource.getRepository(DictSchedulingConfig);
    this.warehouseRepo = AppDataSource.getRepository(Warehouse);
    this.warehouseOccupancyRepo = AppDataSource.getRepository(ExtWarehouseDailyOccupancy);
    this.warehouseTruckingMappingRepo = AppDataSource.getRepository(WarehouseTruckingMapping);
    this.truckingPortMappingRepo = AppDataSource.getRepository(TruckingPortMapping);
    this.truckingCompanyRepo = AppDataSource.getRepository(TruckingCompany);
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
  async getCandidateWarehouses(
    countryCode: string,
    portCode: string
  ): Promise<Warehouse[]> {
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
      const truckingCompanyIds = truckingPortMappings.map(mapping => mapping.truckingCompanyId);

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
        const warehouseCodes = warehouseTruckingMappings.map(mapping => mapping.warehouseCode);

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
  async isWarehouseAvailable(
    warehouse: Warehouse,
    date: Date
  ): Promise<boolean> {
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
        log.warn(`[CostOptimizer] No occupancy record for warehouse ${warehouse.warehouseCode} on ${queryDate.toISOString().split('T')[0]}`);
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
        if (this.isWeekend(candidateDate) && await this.shouldSkipWeekends()) {
          continue;
        }

        // 检查仓库档期
        if (!await this.isWarehouseAvailable(warehouse, candidateDate)) {
          continue;
        }

        options.push({
          containerNumber: container.containerNumber,
          warehouse,
          unloadDate: candidateDate,
          strategy: 'Direct',
          isWithinFreePeriod: candidateDate <= lastFreeDate
        });
      }
    }

    // 3. 生成 Drop off 方案（简化版）
    const dropOffOptions = await this.generateDropOffOptions(
      container,
      pickupDate,
      lastFreeDate
    );
    options.push(...dropOffOptions);

    // 4. 生成 Expedited 方案（简化版）
    const expeditedOptions = await this.generateExpeditedOptions(
      container,
      lastFreeDate
    );
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
      // 预测模式下使用计划提柜日和计划还箱日
      // Live load: 提柜日 = 送仓日 = 卸柜日
      // Drop off: 提柜日 < 送仓日 = 卸柜日，还箱日通常在卸柜后 3-5 天
      const plannedPickupDate = option.unloadDate;
      
      // 估算还箱日：根据卸柜方式不同
      let plannedReturnDate: Date;
      if (option.strategy === 'Drop off') {
        // Drop off 模式：假设堆场堆存 3 天后还箱
        plannedReturnDate = dateTimeUtils.addDays(option.unloadDate, 3);
      } else {
        // Live load / Expedited: 当天还箱
        plannedReturnDate = option.unloadDate;
      }

      // 使用统一的 calculateTotalCost 方法计算所有费用
      const totalCostResult = await this.demurrageService.calculateTotalCost(option.containerNumber, {
        mode: 'forecast',
        plannedDates: {
          plannedPickupDate,
          plannedUnloadDate: option.unloadDate,
          plannedReturnDate
        },
        includeTransport: true,
        warehouse: option.warehouse,
        truckingCompany: option.truckingCompany,
        unloadMode: option.strategy === 'Drop off' ? 'Drop off' : 'Live load'
      });

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
            const plannedDeliveryDate = option.unloadDate; // Drop off: 送 = 卸
            
            // ✅ 判断是否实际使用了堆场：提柜日 < 送仓日
            // 注意：option.unloadDate 在这里是提柜日（plannedPickupDate）
            const pickupDayStr = option.unloadDate.toISOString().split('T')[0];
            const deliveryDayStr = plannedDeliveryDate.toISOString().split('T')[0];
            
            if (pickupDayStr !== deliveryDayStr) {
              // ✅ 提 < 送，说明货柜在堆场存放了
              // ✅ 预计堆场存放天数（从提柜日到送仓日）
              const yardStorageDays = dateTimeUtils.daysBetween(option.unloadDate, plannedDeliveryDate);
            
              // 从 TruckingPortMapping 获取堆场费率
              const destPo = await AppDataSource.getRepository(Container)
                .createQueryBuilder('c')
                .leftJoinAndSelect('c.portOperations', 'po')
                .where('c.containerNumber = :containerNumber', { containerNumber: option.containerNumber })
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
    evaluatedOptions.forEach(item => {
      item.option.totalCost = item.costBreakdown.totalCost;
    });

    // 选择成本最低的方案
    const best = evaluatedOptions.sort((a, b) => (a.option.totalCost || 0) - (b.option.totalCost || 0))[0];

    log.info(
      `[CostOptimizer] Selected optimal option: ` +
      `Strategy=${best.option.strategy}, ` +
      `Date=${best.option.unloadDate.toISOString().split('T')[0]}, ` +
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
        log.warn(`[CostOptimizer] No trucking companies with yard found for country: ${countryCode}`);
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
          if (this.isWeekend(candidateDate) && await this.shouldSkipWeekends()) {
            continue;
          }

          // 获取车队关联的仓库
          const warehouse = await this.warehouseRepo.findOne({
            where: { warehouseCode: mappings.find(m => m.truckingCompanyId === truckingId)?.warehouseCode }
          });

          if (!warehouse) continue;

          // 检查仓库档期
          if (!await this.isWarehouseAvailable(warehouse, candidateDate)) {
            continue;
          }

          options.push({
            containerNumber: container.containerNumber,
            warehouse,
            unloadDate: candidateDate,
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
        log.info(`[CostOptimizer] Not urgent (${daysUntilFreezeExpires} days left), skipping expedited options`);
        return [];
      }

      log.info(`[CostOptimizer] Urgent case detected (${daysUntilFreezeExpires} days left), generating expedited options`);

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
          if (this.isWeekend(candidateDate) && await this.shouldSkipWeekends()) {
            continue;
          }

          // 检查仓库档期
          if (!await this.isWarehouseAvailable(warehouse, candidateDate)) {
            continue;
          }

          options.push({
            containerNumber: container.containerNumber,
            warehouse,
            unloadDate: candidateDate,
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
    log.warn(`[CostOptimizer] No distance found for Port=${portCode}, Warehouse=${warehouseCode}, using default 50 miles`);
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
}
