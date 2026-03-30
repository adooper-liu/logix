import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { Warehouse } from '../entities/Warehouse';
import { TruckingCompany } from '../entities/TruckingCompany';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { logger } from '../utils/logger';
import { OCCUPANCY_CONFIG } from '../config/scheduling.config';

/**
 * 档期计算器服务
 * 
 * 职责：负责仓库和车队的档期扣减计算
 * - 仓库日产能扣减
 * - 车队运输档期扣减
 * - 车队还箱档期扣减（Drop off 模式）
 * 
 * @packageDocumentation
 */

/**
 * 档期扣减选项接口
 */
export interface OccupancyDecrementOptions {
  /** 仓库代码 */
  warehouseCode?: string;
  
  /** 车队代码 */
  truckingCompanyId?: string;
  
  /** 日期 */
  date: Date;
  
  /** 港口代码 */
  portCode?: string;
}

/**
 * 档期计算器服务类
 * 
 * @example
 * ```typescript
 * const calculator = new OccupancyCalculator();
 * 
 * // 扣减仓库档期
 * await calculator.decrementWarehouseOccupancy('WH001', new Date());
 * 
 * // 扣减车队档期
 * await calculator.decrementTruckingOccupancy({
 *   truckingCompanyId: 'TRUCK001',
 *   date: new Date(),
 *   portCode: 'USLAX'
 * });
 * ```
 */
export class OccupancyCalculator {
  private warehouseRepo: Repository<Warehouse>;
  private truckingCompanyRepo: Repository<TruckingCompany>;
  private warehouseOccupancyRepo: Repository<ExtWarehouseDailyOccupancy>;
  private truckingOccupancyRepo: Repository<ExtTruckingSlotOccupancy>;
  
  /**
   * 创建档期计算器服务实例
   */
  constructor() {
    this.warehouseRepo = AppDataSource.getRepository(Warehouse);
    this.truckingCompanyRepo = AppDataSource.getRepository(TruckingCompany);
    this.warehouseOccupancyRepo = AppDataSource.getRepository(ExtWarehouseDailyOccupancy);
    this.truckingOccupancyRepo = AppDataSource.getRepository(ExtTruckingSlotOccupancy);
  }
  
  /**
   * 扣减仓库日产能
   * 
   * 逻辑：
   * 1. 查找当日占用记录
   * 2. 若存在则 plannedCount + 1
   * 3. 若不存在则创建新记录
   * 
   * @param warehouseCode - 仓库代码
   * @param date - 日期
   * @throws Error 当扣减失败时抛出异常
   */
  async decrementWarehouseOccupancy(warehouseCode: string, date: Date): Promise<void> {
    logger.info('[OccupancyCalculator] 开始扣减仓库档期', {
      warehouseCode,
      date
    });
    
    try {
      // 查找当日占用记录
      const occupancy = await this.warehouseOccupancyRepo.findOne({
        where: { warehouseCode, date }
      });
      
      if (occupancy) {
        // 已存在记录，plannedCount + 1
        occupancy.plannedCount += 1;
        await this.warehouseOccupancyRepo.save(occupancy);
        
        logger.debug('[OccupancyCalculator] 仓库档期扣减成功（更新）', {
          warehouseCode,
          plannedCount: occupancy.plannedCount,
          capacity: occupancy.capacity
        });
      } else {
        // 不存在记录，创建新记录
        const warehouse = await this.warehouseRepo.findOne({
          where: { warehouseCode }
        });
        
        const capacity = warehouse?.dailyUnloadCapacity || OCCUPANCY_CONFIG.DEFAULT_WAREHOUSE_DAILY_CAPACITY;
        
        await this.warehouseOccupancyRepo.save({
          warehouseCode,
          date,
          plannedCount: 1,
          capacity
        });
        
        logger.debug('[OccupancyCalculator] 仓库档期扣减成功（新建）', {
          warehouseCode,
          capacity
        });
      }
      
    } catch (error) {
      logger.error('[OccupancyCalculator] 扣减仓库档期失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * 扣减拖车档期
   * 
   * 逻辑：
   * 1. 查找当日占用记录
   * 2. 若存在则 plannedTrips + 1
   * 3. 若不存在则创建新记录
   * 
   * @param options - 扣减选项
   * @throws Error 当扣减失败时抛出异常
   */
  async decrementTruckingOccupancy(options: {
    truckingCompanyId: string;
    date: Date;
    portCode?: string;
    warehouseCode?: string;
  }): Promise<void> {
    logger.info('[OccupancyCalculator] 开始扣减拖车档期', {
      truckingCompanyId: options.truckingCompanyId,
      date: options.date,
      portCode: options.portCode,
      warehouseCode: options.warehouseCode
    });
    
    try {
      // 查找当日占用记录
      const occupancy = await this.truckingOccupancyRepo.findOne({
        where: {
          truckingCompanyId: options.truckingCompanyId,
          date: options.date,
          portCode: options.portCode ?? undefined,
          warehouseCode: options.warehouseCode
        }
      });
      
      if (occupancy) {
        // 已存在记录，plannedTrips + 1
        occupancy.plannedTrips += 1;
        await this.truckingOccupancyRepo.save(occupancy);
        
        logger.debug('[OccupancyCalculator] 拖车档期扣减成功（更新）', {
          truckingCompanyId: options.truckingCompanyId,
          plannedTrips: occupancy.plannedTrips,
          capacity: occupancy.capacity
        });
      } else {
        // 不存在记录，创建新记录
        const trucking = await this.truckingCompanyRepo.findOne({
          where: { companyCode: options.truckingCompanyId },
          select: ['dailyCapacity']
        });
        
        const capacity = trucking?.dailyCapacity ?? OCCUPANCY_CONFIG.DEFAULT_TRUCKING_DAILY_CAPACITY;
        
        await this.truckingOccupancyRepo.save({
          truckingCompanyId: options.truckingCompanyId,
          date: options.date,
          portCode: options.portCode ?? undefined,
          warehouseCode: options.warehouseCode,
          plannedTrips: 1,
          capacity
        });
        
        logger.debug('[OccupancyCalculator] 拖车档期扣减成功（新建）', {
          truckingCompanyId: options.truckingCompanyId,
          capacity
        });
      }
      
    } catch (error) {
      logger.error('[OccupancyCalculator] 扣减拖车档期失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * 扣减车队还箱档期（Drop off 模式使用）
   * 
   * 注意：当前版本中，还箱档期使用与运输档期相同的字段
   * 后续可以考虑扩展实体增加独立的 plannedReturns 和 returnCapacity
   * 
   * @param truckingCompanyId - 车队代码
   * @param returnDate - 还箱日期
   * @param warehouseCode - 仓库代码（可选）
   * @throws Error 当扣减失败时抛出异常
   */
  async decrementFleetReturnOccupancy(
    truckingCompanyId: string,
    returnDate: Date,
    warehouseCode?: string
  ): Promise<void> {
    logger.info('[OccupancyCalculator] 开始扣减还箱档期', {
      truckingCompanyId,
      returnDate,
      warehouseCode
    });
    
    try {
      // 查找当日占用记录
      const occupancy = await this.truckingOccupancyRepo.findOne({
        where: {
          truckingCompanyId,
          date: returnDate,
          warehouseCode
        }
      });
      
      if (occupancy) {
        // 已存在记录，plannedTrips + 1（复用运输档期字段）
        occupancy.plannedTrips += 1;
        await this.truckingOccupancyRepo.save(occupancy);
        
        logger.debug('[OccupancyCalculator] 还箱档期扣减成功（更新）', {
          truckingCompanyId,
          plannedTrips: occupancy.plannedTrips,
          capacity: occupancy.capacity
        });
      } else {
        // 不存在记录，创建新记录
        const trucking = await this.truckingCompanyRepo.findOne({
          where: { companyCode: truckingCompanyId },
          select: ['dailyCapacity']
        });
        
        const capacity = trucking?.dailyCapacity ?? OCCUPANCY_CONFIG.DEFAULT_TRUCKING_DAILY_CAPACITY;
        
        await this.truckingOccupancyRepo.save({
          truckingCompanyId,
          date: returnDate,
          warehouseCode,
          plannedTrips: 1,
          capacity
        });
        
        logger.debug('[OccupancyCalculator] 还箱档期扣减成功（新建）', {
          truckingCompanyId,
          capacity
        });
      }
      
    } catch (error) {
      logger.error('[OccupancyCalculator] 扣减还箱档期失败', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}
