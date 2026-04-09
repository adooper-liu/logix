/**
 * 日历化能力管理工具
 * Smart Calendar Capacity Utility
 *
 * 用于根据日历规则自动计算每日能力（仓库/车队）
 * 支持周末、节假日、特殊日期等配置
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';
import { Warehouse } from '../entities/Warehouse';
import { TruckingCompany } from '../entities/TruckingCompany';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { HolidayService } from '../services/HolidayService'; // ✅ Phase 2 Task 2: 新增
import { log } from './logger';

/**
 * 日历配置接口
 */
interface CalendarConfig {
  enabled: boolean;
  weekendDays: number[]; // 0=周日，1=周一...6=周六
  weekdayMultiplier: number;
}

export class SmartCalendarCapacity {
  private configRepo: Repository<DictSchedulingConfig>;
  private warehouseRepo: Repository<Warehouse>;
  private truckingCompanyRepo: Repository<TruckingCompany>;
  private warehouseOccupancyRepo: Repository<ExtWarehouseDailyOccupancy>;
  private truckingOccupancyRepo: Repository<ExtTruckingSlotOccupancy>;
  private holidayService: HolidayService; // ✅ Phase 2 Task 2: 新增

  constructor() {
    this.configRepo = AppDataSource.getRepository(DictSchedulingConfig);
    this.warehouseRepo = AppDataSource.getRepository(Warehouse);
    this.truckingCompanyRepo = AppDataSource.getRepository(TruckingCompany);
    this.warehouseOccupancyRepo = AppDataSource.getRepository(ExtWarehouseDailyOccupancy);
    this.truckingOccupancyRepo = AppDataSource.getRepository(ExtTruckingSlotOccupancy);
    this.holidayService = new HolidayService(); // ✅ Phase 2 Task 2: 初始化
  }

  /**
   * 获取日历配置
   */
  async getCalendarConfig(): Promise<CalendarConfig> {
    try {
      const [enabledConfig, weekendConfig, multiplierConfig] = await Promise.all([
        this.configRepo.findOne({ where: { configKey: 'enable_smart_calendar_capacity' } }),
        this.configRepo.findOne({ where: { configKey: 'weekend_days' } }),
        this.configRepo.findOne({ where: { configKey: 'weekday_capacity_multiplier' } })
      ]);

      const enabled = enabledConfig?.configValue === 'true';

      // 解析周末定义（默认周六、周日）
      let weekendDays = [6, 0];
      if (weekendConfig?.configValue) {
        weekendDays = weekendConfig.configValue.split(',').map((d) => parseInt(d.trim()));
      }

      const multiplier = multiplierConfig?.configValue
        ? parseFloat(multiplierConfig.configValue)
        : 1.0;

      return {
        enabled,
        weekendDays,
        weekdayMultiplier: isNaN(multiplier) ? 1.0 : multiplier
      };
    } catch (error) {
      log.error(`[SmartCalendar] Failed to load calendar config:`, error);
      // 返回默认配置
      return {
        enabled: true,
        weekendDays: [6, 0], // 周六、周日
        weekdayMultiplier: 1.0
      };
    }
  }

  /**
   * 判断指定日期是否为休息日
   * @param date 日期
   * @returns 是否为休息日
   */
  async isRestDay(date: Date): Promise<boolean> {
    const config = await this.getCalendarConfig();
    if (!config.enabled) {
      return false; // 未启用时不判断休息日
    }

    const dayOfWeek = date.getDay(); // 0=周日，1=周一...6=周六
    return config.weekendDays.includes(dayOfWeek);
  }

  /**
   * 判断是否为节假日
   * 
   * ✅ Phase 2 Task 2: 使用 HolidayService 查询数据库
   * 
   * @param date 日期
   * @returns 是否为节假日
   */
  async isHoliday(date: Date): Promise<boolean> {
    // TODO: 接入国家代码（从仓库或车队配置读取）
    return await this.holidayService.isHoliday(date);
  }

  /**
   * 判断是否为周末
   * 
   * ✅ Phase 2 Task 3: 完善周末检查方法
   * 
   * @param date 日期
   * @returns 是否为周末
   */
  async isWeekend(date: Date): Promise<boolean> {
    const config = await this.getCalendarConfig();
    if (!config.enabled) {
      return false; // 未启用时不判断周末
    }

    const dayOfWeek = date.getDay(); // 0=周日，1=周一...6=周六
    return config.weekendDays.includes(dayOfWeek);
  }

  /**
   * 计算仓库在指定日期的能力
   * 
   * 支持：
   * - 工作日：使用 dailyUnloadCapacity
   * - 周末：容量为 0
   * - 节假日：容量为 0
   * 
   * @param warehouseCode 仓库代码
   * @param date 日期
   * @returns 计算后的能力值
   */
  async calculateWarehouseCapacity(warehouseCode: string, date: Date): Promise<number> {
    try {
      // 1. 获取仓库信息
      const warehouse = await this.warehouseRepo.findOne({
        where: { warehouseCode }
      });

      if (!warehouse) {
        log.warn(`[SmartCalendar] Warehouse ${warehouseCode} not found`);
        return 0;
      }

      // 2. 获取日历配置
      const config = await this.getCalendarConfig();

      if (!config.enabled) {
        // 未启用智能日历，使用字典表默认值
        return warehouse.dailyUnloadCapacity || 10;
      }

      // 3. 判断日期类型
      const dayOfWeek = date.getDay(); // 0=周日，1=周一...6=周六
      const isWeekend = config.weekendDays.includes(dayOfWeek);
      const isHoliday = await this.isHoliday(date); // ✅ Phase 2: 新增节假日检查

      if (isHoliday) {
        // 节假日：容量为 0
        log.debug(
          `[SmartCalendar] ${date.toISOString().split('T')[0]} is holiday, capacity=0 for ${warehouseCode}`
        );
        return 0;
      }

      if (isWeekend) {
        // 周末产能为 0
        log.debug(
          `[SmartCalendar] ${date.toISOString().split('T')[0]} is weekend, capacity=0 for ${warehouseCode}`
        );
        return 0;
      }

      // 4. 工作日能力 = 字典表能力
      const weekdayCapacity = warehouse.dailyUnloadCapacity || 10;
      log.debug(
        `[SmartCalendar] ${date.toISOString().split('T')[0]} weekday capacity for ${warehouseCode}: ${weekdayCapacity}`
      );

      return weekdayCapacity;
    } catch (error) {
      log.error(`[SmartCalendar] Failed to calculate warehouse capacity:`, error);
      return 10; // 出错时返回默认值
    }
  }

  /**
   * 计算车队在指定日期的能力
   * @param truckingCompanyId 车队 ID
   * @param date 日期
   * @returns 计算后的能力值
   */
  async calculateTruckingCapacity(truckingCompanyId: string, date: Date): Promise<number> {
    try {
      // 1. 获取车队信息
      const truckingCompany = await this.truckingCompanyRepo.findOne({
        where: { companyCode: truckingCompanyId }
      });

      if (!truckingCompany) {
        log.warn(`[SmartCalendar] Trucking company ${truckingCompanyId} not found`);
        return 0;
      }

      // 2. 获取日历配置
      const config = await this.getCalendarConfig();

      if (!config.enabled) {
        // 未启用智能日历，使用字典表默认值
        return truckingCompany.dailyCapacity || 10;
      }

      // 3. 判断是否为休息日
      const isRest = await this.isRestDay(date);

      if (isRest) {
        log.debug(
          `[SmartCalendar] ${date.toISOString().split('T')[0]} is rest day for trucking ${truckingCompanyId}, capacity=0`
        );
        return 0; // 休息日能力为 0
      }

      // 4. 工作日能力 = 字典表能力 × 倍率
      const baseCapacity = truckingCompany.dailyCapacity || 10;
      const calculatedCapacity = Math.floor(baseCapacity * config.weekdayMultiplier);

      log.debug(
        `[SmartCalendar] ${date.toISOString().split('T')[0]} weekday capacity for ${truckingCompanyId}: ` +
          `${baseCapacity} × ${config.weekdayMultiplier} = ${calculatedCapacity}`
      );

      return calculatedCapacity;
    } catch (error) {
      log.error(`[SmartCalendar] Failed to calculate trucking capacity:`, error);
      return 10; // 出错时返回默认值
    }
  }

  /**
   * 确保档期记录存在并设置正确的能力
   * @param warehouseCode 仓库代码
   * @param date 日期
   * @returns 档期记录
   */
  async ensureWarehouseOccupancy(
    warehouseCode: string,
    date: Date
  ): Promise<ExtWarehouseDailyOccupancy> {
    // 格式化日期为 YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    const normalizedDate = new Date(dateStr);

    // 查找现有记录
    let occupancy = await this.warehouseOccupancyRepo.findOne({
      where: {
        warehouseCode,
        date: normalizedDate
      }
    });

    if (occupancy) {
      // 如果已有记录且 capacity > 0，直接返回
      if (occupancy.capacity > 0) {
        return occupancy;
      }

      // 否则更新 capacity
      const calculatedCapacity = await this.calculateWarehouseCapacity(warehouseCode, date);
      occupancy.capacity = calculatedCapacity;
      occupancy.remaining = Math.max(0, calculatedCapacity - occupancy.plannedCount);
      occupancy.updatedAt = new Date();

      await this.warehouseOccupancyRepo.save(occupancy);
      log.info(
        `[SmartCalendar] Updated warehouse ${warehouseCode} capacity on ${dateStr} to ${calculatedCapacity}`
      );

      return occupancy;
    }

    // 创建新记录
    const calculatedCapacity = await this.calculateWarehouseCapacity(warehouseCode, date);
    occupancy = this.warehouseOccupancyRepo.create({
      warehouseCode,
      date: normalizedDate,
      plannedCount: 0,
      capacity: calculatedCapacity,
      remaining: calculatedCapacity,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.warehouseOccupancyRepo.save(occupancy);
    log.info(
      `[SmartCalendar] Created warehouse ${warehouseCode} occupancy on ${dateStr} with capacity ${calculatedCapacity}`
    );

    return occupancy;
  }

  /**
   * 确保车队档期记录存在并设置正确的能力
   * @param truckingCompanyId 车队 ID
   * @param date 日期
   * @param portCode 港口代码（可选）
   * @param warehouseCode 仓库代码（可选）
   * @returns 档期记录
   */
  async ensureTruckingOccupancy(
    truckingCompanyId: string,
    date: Date,
    portCode?: string,
    warehouseCode?: string
  ): Promise<ExtTruckingSlotOccupancy> {
    // 格式化日期为 YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    const normalizedDate = new Date(dateStr);

    // 查找现有记录
    let occupancy = await this.truckingOccupancyRepo.findOne({
      where: {
        truckingCompanyId,
        date: normalizedDate,
        portCode: portCode || undefined,
        warehouseCode: warehouseCode || undefined
      }
    });

    if (occupancy) {
      // 如果已有记录且 capacity > 0，直接返回
      if (occupancy.capacity > 0) {
        return occupancy;
      }

      // 否则更新 capacity
      const calculatedCapacity = await this.calculateTruckingCapacity(truckingCompanyId, date);
      occupancy.capacity = calculatedCapacity;
      occupancy.remaining = Math.max(0, calculatedCapacity - occupancy.plannedTrips);
      occupancy.updatedAt = new Date();

      await this.truckingOccupancyRepo.save(occupancy);
      log.info(
        `[SmartCalendar] Updated trucking ${truckingCompanyId} capacity on ${dateStr} to ${calculatedCapacity}`
      );

      return occupancy;
    }

    // 创建新记录
    const calculatedCapacity = await this.calculateTruckingCapacity(truckingCompanyId, date);
    occupancy = this.truckingOccupancyRepo.create({
      truckingCompanyId,
      date: normalizedDate,
      portCode: portCode || undefined,
      warehouseCode: warehouseCode || undefined,
      plannedTrips: 0,
      capacity: calculatedCapacity,
      remaining: calculatedCapacity,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await this.truckingOccupancyRepo.save(occupancy);
    log.info(
      `[SmartCalendar] Created trucking ${truckingCompanyId} occupancy on ${dateStr} with capacity ${calculatedCapacity}`
    );

    return occupancy;
  }

  /**
   * 批量初始化未来 N 天的档期数据
   * @param days 天数（默认 30 天）
   */
  async initializeFutureOccupancy(days: number = 30): Promise<void> {
    try {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      // 获取所有活跃仓库
      const warehouses = await this.warehouseRepo.find({
        where: { status: 'ACTIVE' }
      });

      // 获取所有活跃车队
      const truckingCompanies = await this.truckingCompanyRepo.find({
        where: { status: 'ACTIVE' }
      });

      log.info(`[SmartCalendar] Initializing occupancy for next ${days} days...`);

      // 初始化仓库档期
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);

        for (const warehouse of warehouses) {
          await this.ensureWarehouseOccupancy(warehouse.warehouseCode, currentDate);
        }

        // 初始化车队档期（全局容量，不指定港口和仓库）
        for (const trucking of truckingCompanies) {
          await this.ensureTruckingOccupancy(trucking.companyCode, currentDate);
        }
      }

      log.info(`[SmartCalendar] Successfully initialized occupancy for ${days} days`);
    } catch (error) {
      log.error(`[SmartCalendar] Failed to initialize future occupancy:`, error);
      throw error;
    }
  }

  /**
   * 手动设置特定日期的能力（用于覆盖日历规则）
   * @param type 类型：'warehouse' | 'trucking'
   * @param code 仓库代码或车队 ID
   * @param date 日期
   * @param capacity 手动设置的能力值
   */
  async setManualCapacity(
    type: 'warehouse' | 'trucking',
    code: string,
    date: Date,
    capacity: number
  ): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];
    const normalizedDate = new Date(dateStr);

    if (type === 'warehouse') {
      const occupancy = await this.ensureWarehouseOccupancy(code, normalizedDate);
      occupancy.capacity = capacity;
      occupancy.remaining = Math.max(0, capacity - occupancy.plannedCount);
      await this.warehouseOccupancyRepo.save(occupancy);
      log.info(
        `[SmartCalendar] Manually set warehouse ${code} capacity on ${dateStr} to ${capacity}`
      );
    } else {
      const occupancy = await this.ensureTruckingOccupancy(code, normalizedDate);
      occupancy.capacity = capacity;
      occupancy.remaining = Math.max(0, capacity - occupancy.plannedTrips);
      await this.truckingOccupancyRepo.save(occupancy);
      log.info(
        `[SmartCalendar] Manually set trucking ${code} capacity on ${dateStr} to ${capacity}`
      );
    }
  }

  /**
   * 计算两个日期之间的工作日天数（排除周末和节假日）
   * 
   * ✅ Phase 2 Task 3: 优化性能 - 使用批量查询替代循环
   * 
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param countryCode 国家代码（可选）
   * @param excludeWeekends 是否排除周末（默认 true）
   * @returns 工作日天数
   */
  async getWorkingDays(
    startDate: Date,
    endDate: Date,
    countryCode?: string,
    excludeWeekends: boolean = true
  ): Promise<number> {
    try {
      // ✅ Phase 2 Task 3: 优化 - 一次性获取所有节假日，避免 N+1 查询
      const holidays = await this.holidayService.getHolidaysInRange(startDate, endDate, countryCode);
      const holidaySet = new Set(holidays.map(h => h.holidayDate.toISOString().split('T')[0]));

      let workingDays = 0;
      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidaySet.has(dateStr);

        if ((!isWeekend || !excludeWeekends) && !isHoliday) {
          workingDays++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      log.info(
        `[SmartCalendar] Working days between ${startDate.toISOString().split('T')[0]} and ${endDate.toISOString().split('T')[0]}: ${workingDays}`
      );

      return workingDays;
    } catch (error) {
      log.error(`[SmartCalendar] Failed to calculate working days:`, error);
      return 0;
    }
  }

  /**
   * 计算从指定日期开始的 N 个工作日后的日期
   * 
   * ✅ Phase 2 Task 3: 新增方法 - 支持排产日期推算
   * 
   * @param startDate 起始日期
   * @param workDays 工作日天数
   * @param countryCode 国家代码（可选）
   * @returns N 个工作日后的日期
   */
  async addWorkDays(
    startDate: Date,
    workDays: number,
    countryCode?: string
  ): Promise<Date> {
    try {
      if (workDays <= 0) {
        return new Date(startDate);
      }

      // ✅ Phase 2 Task 3: 优化 - 预加载未来 N 天的节假日
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.ceil(workDays * 1.5)); // 估算一个范围
      
      const holidays = await this.holidayService.getHolidaysInRange(startDate, endDate, countryCode);
      const holidaySet = new Set(holidays.map(h => h.holidayDate.toISOString().split('T')[0]));

      const result = new Date(startDate);
      let addedDays = 0;

      while (addedDays < workDays) {
        result.setDate(result.getDate() + 1);
        
        const dateStr = result.toISOString().split('T')[0];
        const dayOfWeek = result.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidaySet.has(dateStr);

        if (!isWeekend && !isHoliday) {
          addedDays++;
        }
      }

      log.info(
        `[SmartCalendar] ${workDays} work days after ${startDate.toISOString().split('T')[0]} is ${result.toISOString().split('T')[0]}`
      );

      return result;
    } catch (error) {
      log.error(`[SmartCalendar] Failed to add work days:`, error);
      return new Date(startDate);
    }
  }
}

// 导出单例实例
export const smartCalendarCapacity = new SmartCalendarCapacity();
