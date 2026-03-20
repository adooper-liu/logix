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
  
  // 成本相关（待评估）
  estimatedDemurrage?: number;
  estimatedStorage?: number;
  estimatedTransport?: number;
  totalCost?: number;
}

/**
 * 港口 - 仓库距离配置
 */
interface PortWarehouseDistance {
  portCode: string;
  warehouseCode: string;
  distanceMiles: number; // 英里
}

/**
 * 运输费率配置
 */
interface TransportRateConfig {
  baseRatePerMile: number;     // 每英里基础费率（USD）
  directMultiplier: number;    // Direct 模式倍数
  dropOffMultiplier: number;   // Drop off 模式倍数
  expeditedMultiplier: number; // Expedited 模式倍数
}

/**
 * 成本明细
 */
export interface CostBreakdown {
  demurrageCost: number;      // 滞港费
  detentionCost: number;      // 滞箱费
  storageCost: number;        // 堆存费
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
          portCode: portCode,
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
      transportationCost: 0,
      handlingCost: 0,
      totalCost: 0
    };
    
    try {
      // 1. 滞港费（复用 demurrage.service.ts）
      const demurrage = await this.demurrageService.predictDemurrageForUnloadDate(
        option.containerNumber,
        option.unloadDate
      );
      breakdown.demurrageCost = demurrage.demurrageCost;
    } catch (error) {
      log.warn(`[CostOptimizer] Demurrage prediction failed for ${option.containerNumber}:`, error);
    }
    
    // 2. 滞箱费（可选链调用，Phase 2 可暂不计入）
    // TODO: 需要实际提柜日和还箱日
    // if (this.demurrageService.predictDetentionForReturnDate) {
    //   try {
    //     const detention = await this.demurrageService.predictDetentionForReturnDate(
    //       option.containerNumber,
    //       option.returnDate || option.unloadDate
    //     );
    //     breakdown.detentionCost = detention.detentionCost;
    //   } catch (error) {
    //     log.warn(`[CostOptimizer] Detention prediction failed:`, error);
    //   }
    // }
    
    // 3. 堆存费（Drop off 模式，从 TruckingPortMapping 读取）
    if (option.strategy === 'Drop off') {
      const storageDays = this.calculateStorageDays(option);
      
      // 从 TruckingPortMapping 获取外部堆场费用
      let dailyRate = await this.getConfigNumber('external_storage_daily_rate', 50);
      let operationFee = 0;
      
      try {
        // 获取与仓库关联的车队
        const warehouseTruckingMappings = await this.warehouseTruckingMappingRepo.find({
          where: {
            warehouseCode: option.warehouse.warehouseCode,
            country: option.warehouse.country || 'US',
            isActive: true
          }
        });
        
        if (warehouseTruckingMappings.length > 0) {
          // 获取货柜信息以确定港口
          const container = await AppDataSource.getRepository(Container).findOne({
            where: { containerNumber: option.containerNumber },
            relations: ['portOperations']
          });
          
          if (container) {
            const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');
            const portCode = destPo?.portCode || 'USLAX';
            
            // 从 TruckingPortMapping 获取费用
            for (const mapping of warehouseTruckingMappings) {
              const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
                where: {
                  country: option.warehouse.country || 'US',
                  portCode: portCode,
                  truckingCompanyId: mapping.truckingCompanyId,
                  isActive: true
                }
              });
              
              if (truckingPortMapping) {
                dailyRate = truckingPortMapping.standardRate || dailyRate;
                operationFee = truckingPortMapping.yardOperationFee || 0;
                break;
              }
            }
          }
        }
      } catch (error) {
        log.warn(`[CostOptimizer] Failed to get storage cost from TruckingPortMapping:`, error);
      }
      
      breakdown.storageCost = (dailyRate * storageDays) + operationFee;
    }
    
    // 4. 运输费（基于距离和卸柜方式估算）
    breakdown.transportationCost = await this.calculateTransportationCost(
      option.containerNumber,
      option.warehouse,
      option.strategy
    );
    
    // 5. 操作费（加急费，从配置读取）
    if (option.strategy === 'Expedited') {
      breakdown.handlingCost = await this.getConfigNumber('expedited_handling_fee', 50);
    }
    
    // 6. 总成本
    breakdown.totalCost = 
      breakdown.demurrageCost +
      breakdown.detentionCost +
      breakdown.storageCost +
      breakdown.transportationCost +
      breakdown.handlingCost;
    
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
            portCode: portCode,
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
  private calculateStorageDays(option: UnloadOption): number {
    // Drop off 模式：从卸柜日到还箱日
    // 考虑 TruckingPortMapping 中的堆场容量和费用
    
    // 简化处理：假设 3 天堆存
    // 实际项目中，应该根据堆场容量和还箱计划动态计算
    return 3;
  }

  /**
   * 计算运输费（基于 TruckingPortMapping）
   * @param containerNumber 柜号
   * @param warehouse 仓库
   * @param strategy 策略（Direct/Drop off/Expedited）
   * @returns 运输费（USD）
   */
  private async calculateTransportationCost(
    containerNumber: string,
    warehouse: Warehouse,
    strategy: 'Direct' | 'Drop off' | 'Expedited'
  ): Promise<number> {
    try {
      // 1. 获取货柜的目的港
      const container = await AppDataSource.getRepository(Container).findOne({
        where: { containerNumber },
        relations: ['portOperations']
      });
      
      if (!container) {
        log.warn(`[CostOptimizer] Container ${containerNumber} not found, using default transport cost`);
        return 0;
      }
      
      const destPo = container.portOperations?.find((po: any) => po.portType === 'destination');
      const portCode = destPo?.portCode || 'USLAX'; // 默认洛杉矶港
      const countryCode = warehouse.country || 'US';
      
      // 2. 获取与仓库关联的车队
      const warehouseTruckingMappings = await this.warehouseTruckingMappingRepo.find({
        where: {
          warehouseCode: warehouse.warehouseCode,
          country: countryCode,
          isActive: true
        }
      });
      
      if (warehouseTruckingMappings.length === 0) {
        log.warn(`[CostOptimizer] No trucking mapping found for warehouse ${warehouse.warehouseCode}`);
        return 0;
      }
      
      // 3. 从 TruckingPortMapping 获取运输费用
      let totalTransportCost = 0;
      
      for (const mapping of warehouseTruckingMappings) {
        const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
          where: {
            country: countryCode,
            portCode: portCode,
            truckingCompanyId: mapping.truckingCompanyId,
            isActive: true
          }
        });
        
        if (truckingPortMapping) {
          // 使用 TruckingPortMapping 中的费用作为运输费
          totalTransportCost = truckingPortMapping.standardRate || 0;
          break; // 只使用第一个匹配的映射
        }
      }
      
      // 4. 如果没有找到映射，使用默认值
      if (totalTransportCost === 0) {
        log.warn(`[CostOptimizer] No trucking-port mapping found for port ${portCode}, using default cost`);
        totalTransportCost = await this.getConfigNumber('transport_default_cost', 100);
      }
      
      // 5. 根据策略调整费用
      let multiplier = 1.0;
      switch (strategy) {
        case 'Direct':
          multiplier = await this.getConfigNumber('transport_direct_multiplier', 1.0);
          break;
        case 'Drop off':
          multiplier = await this.getConfigNumber('transport_dropoff_multiplier', 1.2);
          break;
        case 'Expedited':
          multiplier = await this.getConfigNumber('transport_expedited_multiplier', 1.5);
          break;
      }
      
      const finalCost = totalTransportCost * multiplier;
      
      log.info(
        `[CostOptimizer] Transport cost for ${containerNumber}: ` +
        `Port=${portCode}, Warehouse=${warehouse.warehouseCode}, ` +
        `Strategy=${strategy}, Cost=$${finalCost.toFixed(2)}`
      );
      
      return finalCost;
    } catch (error) {
      log.warn(`[CostOptimizer] Failed to calculate transportation cost:`, error);
      return 0; // 出错时返回 0
    }
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
