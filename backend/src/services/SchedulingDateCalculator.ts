/**
 * 排柜日期计算服务
 * Scheduling Date Calculator Service
 *
 * 负责所有与排柜相关的日期计算逻辑：
 * - 计划提柜日
 * - 计划送仓日
 * - 计划还箱日
 * - 周末跳过逻辑
 * - 车队还箱可用日查找
 */

import { AppDataSource } from '../database';
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';
import { ExtTruckingReturnSlotOccupancy } from '../entities/ExtTruckingReturnSlotOccupancy';
import { TruckingCompany } from '../entities/TruckingCompany';
import { OCCUPANCY_CONFIG } from '../config/scheduling.config';
import { logger } from '../utils/logger';

export interface ReturnDateResult {
  returnDate: Date;
  adjustedUnloadDate?: Date;
}

export class SchedulingDateCalculator {
  private schedulingConfigRepo = AppDataSource.getRepository(DictSchedulingConfig);
  private truckingReturnOccupancyRepo = AppDataSource.getRepository(ExtTruckingReturnSlotOccupancy);
  private truckingCompanyRepo = AppDataSource.getRepository(TruckingCompany);

  /**
   * 计算计划提柜日
   * 规则：清关日 + 1天，受 lastFreeDate 约束
   *
   * @param customsDate 清关日期
   * @param lastFreeDate 最后免费日（可选，超出则强制为该日）
   * @returns 计划提柜日
   */
  async calculatePlannedPickupDate(customsDate: Date, lastFreeDate?: Date): Promise<Date> {
    // 验证输入日期
    if (!customsDate || isNaN(customsDate.getTime())) {
      logger.warn('[SchedulingDateCalculator] Invalid customsDate passed to calculatePlannedPickupDate');
      return new Date(); // 返回今天作为默认值
    }

    const pickupDate = new Date(customsDate);
    pickupDate.setDate(pickupDate.getDate() + 1); // 清关后次日提柜

    if (lastFreeDate) {
      const lastFree = new Date(lastFreeDate);
      lastFree.setHours(0, 0, 0, 0);
      if (pickupDate > lastFree) {
        pickupDate.setTime(lastFree.getTime());
      }
    }

    // 跳过周末（如果配置了 skip_weekends = true）
    await this.skipWeekendsIfNeeded(pickupDate);

    return pickupDate;
  }

  /**
   * 计算计划送仓日
   * 规则：
   * - Live load（直接送）：提 = 送 = 卸（同日）
   * - Drop off（先放堆场）：提 < 送 = 卸
   *
   * @param pickupDate 提柜日
   * @param unloadMode 卸柜方式
   * @param unloadDate 卸柜日
   * @returns 计划送仓日
   */
  calculatePlannedDeliveryDate(pickupDate: Date, unloadMode: string, unloadDate: Date): Date {
    if (unloadMode === 'Live load') {
      return new Date(pickupDate); // 提 = 送（同日）
    }
    // Drop off：送 = 卸（送仓日即卸柜日）
    return new Date(unloadDate);
  }

  /**
   * 计算计划还箱日
   * 规则：
   * - Drop off 模式：还 = 卸 + 1，受车队还箱能力约束，最晚不超过 lastReturnDate
   * - Live load 模式：还 = 卸（同日），若能力不足需调整卸柜日
   *
   * @param unloadDate 卸柜日
   * @param unloadMode 卸柜方式
   * @param truckingCompanyId 车队ID
   * @param lastReturnDate 最晚还箱日
   * @param plannedPickupDate 计划提柜日（Live load 模式使用）
   * @returns { returnDate: 还箱日, adjustedUnloadDate: 调整后的卸柜日 }
   */
  async calculatePlannedReturnDate(
    unloadDate: Date,
    unloadMode: string,
    truckingCompanyId: string,
    lastReturnDate?: Date,
    plannedPickupDate?: Date
  ): Promise<ReturnDateResult> {
    const returnDateOnly = new Date(unloadDate);
    returnDateOnly.setUTCHours(0, 0, 0, 0);

    let adjustedUnloadDate: Date | undefined;

    if (unloadMode === 'Live load') {
      // Live load 模式：还 = 卸（同日）
      const availableDate = await this.findEarliestAvailableReturnDate(
        truckingCompanyId,
        returnDateOnly,
        lastReturnDate
      );

      if (!availableDate) {
        return {
          returnDate: returnDateOnly,
          adjustedUnloadDate: undefined
        };
      }

      if (availableDate.getTime() !== returnDateOnly.getTime()) {
        adjustedUnloadDate = availableDate;
      }

      return {
        returnDate: availableDate,
        adjustedUnloadDate
      };
    } else {
      // Drop off 模式：优先当天还箱，其次卸 +1，再往后顺延

      // Step 1: 先检查卸柜日当天的还箱能力
      const availableOnUnloadDate = await this.findEarliestAvailableReturnDate(
        truckingCompanyId,
        returnDateOnly,
        lastReturnDate
      );

      if (availableOnUnloadDate) {
        return {
          returnDate: availableOnUnloadDate,
          adjustedUnloadDate: undefined
        };
      }

      // Step 2: 如果卸柜日当天没能力，再检查卸柜日 +1
      const nextDay = new Date(returnDateOnly);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      const availableOnNextDay = await this.findEarliestAvailableReturnDate(
        truckingCompanyId,
        nextDay,
        lastReturnDate
      );

      if (availableOnNextDay) {
        return {
          returnDate: availableOnNextDay,
          adjustedUnloadDate: undefined
        };
      }

      // Step 3: 如果都没能力，继续顺延查找
      const availableDate = await this.findEarliestAvailableReturnDate(
        truckingCompanyId,
        nextDay,
        lastReturnDate
      );

      if (!availableDate) {
        return {
          returnDate: nextDay,
          adjustedUnloadDate: undefined
        };
      }

      return {
        returnDate: availableDate,
        adjustedUnloadDate: undefined
      };
    }
  }

  /**
   * 查找车队从 earliestDate 起首个有还箱能力的日期
   *
   * @param truckingCompanyId 车队ID
   * @param earliestDate 起始日期
   * @param lastReturnDate 最晚还箱日
   * @returns 最早可用的还箱日，若找不到则返回 null
   */
  async findEarliestAvailableReturnDate(
    truckingCompanyId: string,
    earliestDate: Date,
    lastReturnDate?: Date
  ): Promise<Date | null> {
    const maxDaysToSearch = lastReturnDate
      ? Math.min(
          14,
          Math.ceil((lastReturnDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24))
        )
      : 14;

    for (let i = 0; i <= maxDaysToSearch; i++) {
      const date = new Date(earliestDate);
      date.setUTCDate(date.getUTCDate() + i);
      date.setUTCHours(0, 0, 0, 0);

      // 如果超过最晚还箱日，停止查找
      if (lastReturnDate) {
        const lastReturn = new Date(lastReturnDate);
        lastReturn.setUTCHours(0, 0, 0, 0);
        if (date > lastReturn) {
          return null;
        }
      }

      // 查询车队当日的还箱档期占用
      const occupancy = await this.truckingReturnOccupancyRepo.findOne({
        where: {
          truckingCompanyId,
          slotDate: date
        }
      });

      if (!occupancy) {
        // 无占用记录，使用车队默认还箱能力
        const trucking = await this.truckingCompanyRepo.findOne({
          where: { companyCode: truckingCompanyId },
          select: ['dailyReturnCapacity', 'dailyCapacity']
        });
        const capacity =
          trucking?.dailyReturnCapacity ??
          trucking?.dailyCapacity ??
          OCCUPANCY_CONFIG.DEFAULT_TRUCKING_RETURN_CAPACITY;
        if (capacity > 0) {
          return date;
        }
      } else if (occupancy.plannedCount < occupancy.capacity) {
        // 有剩余能力
        return date;
      }
    }

    // 找不到可用日期
    return null;
  }

  /**
   * 检查配置并跳过周末（如果 skip_weekends = true）
   *
   * @param date 要检查的日期（会被直接修改）
   */
  async skipWeekendsIfNeeded(date: Date): Promise<void> {
    try {
      const config = await this.schedulingConfigRepo.findOne({
        where: { configKey: 'skip_weekends' }
      });

      const shouldSkipWeekends = config?.configValue === 'true';
      if (!shouldSkipWeekends) {
        return;
      }

      // 跳过周六（6）和周日（0）
      while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
      }
    } catch (error) {
      logger.warn('[SchedulingDateCalculator] Error checking weekend config:', error);
    }
  }

  /**
   * 检查日期是否为周末（周六或周日）
   *
   * @param date 要检查的日期
   * @returns 是否为周末
   */
  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }
}
