/**
 * 节假日服务
 * Holiday Service
 * 
 * ✅ Phase 2 Task 2: 节假日配置管理
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { DictHoliday } from '../entities/DictHoliday';
import * as dateTimeUtils from '../utils/dateTimeUtils';
import * as loggerModule from '../utils/logger';

const log = loggerModule.log || {
  info: console.log,
  warn: console.warn,
  error: console.error,
  debug: console.debug
};

export class HolidayService {
  private holidayRepo: Repository<DictHoliday>;

  constructor() {
    this.holidayRepo = AppDataSource.getRepository(DictHoliday);
  }

  /**
   * 判断指定日期是否为节假日
   * 
   * @param date 日期
   * @param countryCode 国家代码（可选）
   * @returns 是否为节假日
   */
  async isHoliday(date: Date, countryCode?: string): Promise<boolean> {
    try {
      const dateStr = dateTimeUtils.formatDateToLocal(date, 'date');

      // 构建查询条件
      const where: any = {
        holidayDate: dateStr
      };

      if (countryCode) {
        where.countryCode = countryCode;
      }

      const holiday = await this.holidayRepo.findOne({ where });

      if (holiday) {
        log.debug(
          `[HolidayService] ${dateStr} is holiday: ${holiday.holidayName} (${holiday.countryCode})`
        );
        return true;
      }

      // 如果不是每年重复的节假日，检查历史数据中的同月同日
      const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      // 查找每年重复的节假日
      const recurringHoliday = await this.holidayRepo
        .createQueryBuilder('holiday')
        .where('holiday.is_recurring = :recurring', { recurring: true })
        .andWhere(`TO_CHAR(holiday.holiday_date, 'MM-DD') = :monthDay`, { monthDay })
        .andWhere(countryCode ? 'holiday.country_code = :countryCode' : '1=1', { countryCode })
        .getOne();

      if (recurringHoliday) {
        log.debug(
          `[HolidayService] ${dateStr} is recurring holiday: ${recurringHoliday.holidayName} (${recurringHoliday.countryCode})`
        );
        return true;
      }

      return false;
    } catch (error) {
      log.error(`[HolidayService] Failed to check holiday:`, error);
      return false; // 出错时返回 false，不影响业务
    }
  }

  /**
   * 获取指定日期范围内的所有节假日
   * 
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param countryCode 国家代码（可选）
   * @returns 节假日列表
   */
  async getHolidaysInRange(
    startDate: Date,
    endDate: Date,
    countryCode?: string
  ): Promise<DictHoliday[]> {
    try {
      const startStr = dateTimeUtils.formatDateToLocal(startDate, 'date');
      const endStr = dateTimeUtils.formatDateToLocal(endDate, 'date');

      const queryBuilder = this.holidayRepo
        .createQueryBuilder('holiday')
        .where('holiday.holiday_date BETWEEN :start AND :end', {
          start: startStr,
          end: endStr
        });

      if (countryCode) {
        queryBuilder.andWhere('holiday.country_code = :countryCode', {
          countryCode
        });
      }

      const holidays = await queryBuilder.orderBy('holiday.holiday_date', 'ASC').getMany();

      log.info(
        `[HolidayService] Found ${holidays.length} holidays between ${startStr} and ${endStr}` +
          (countryCode ? ` for ${countryCode}` : '')
      );

      return holidays;
    } catch (error) {
      log.error(`[HolidayService] Failed to get holidays in range:`, error);
      return [];
    }
  }

  /**
   * 计算工作日天数（排除周末和节假日）
   * 
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param countryCode 国家代码
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
      let workingDays = 0;
      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = await this.isHoliday(currentDate, countryCode);

        if ((!isWeekend || !excludeWeekends) && !isHoliday) {
          workingDays++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      log.info(
        `[HolidayService] Working days between ${startDate.toISOString().split('T')[0]} and ${endDate.toISOString().split('T')[0]}: ${workingDays}`
      );

      return workingDays;
    } catch (error) {
      log.error(`[HolidayService] Failed to calculate working days:`, error);
      return 0;
    }
  }

  /**
   * 添加节假日
   * 
   * @param countryCode 国家代码
   * @param holidayDate 节假日日期
   * @param holidayName 节假日名称
   * @param isRecurring 是否每年重复
   * @returns 创建的节假日实体
   */
  async addHoliday(
    countryCode: string,
    holidayDate: Date,
    holidayName: string,
    isRecurring: boolean = true
  ): Promise<DictHoliday> {
    try {
      const holiday = this.holidayRepo.create({
        countryCode,
        holidayDate,
        holidayName,
        isRecurring
      });

      const saved = await this.holidayRepo.save(holiday);
      log.info(`[HolidayService] Added holiday: ${holidayName} (${countryCode}) on ${holidayDate.toISOString().split('T')[0]}`);

      return saved;
    } catch (error) {
      log.error(`[HolidayService] Failed to add holiday:`, error);
      throw error;
    }
  }

  /**
   * 删除节假日
   * 
   * @param id 节假日 ID
   */
  async deleteHoliday(id: number): Promise<void> {
    try {
      await this.holidayRepo.delete(id);
      log.info(`[HolidayService] Deleted holiday with id: ${id}`);
    } catch (error) {
      log.error(`[HolidayService] Failed to delete holiday:`, error);
      throw error;
    }
  }

  /**
   * 获取所有支持的节假日国家列表
   * 
   * @returns 国家代码列表
   */
  async getSupportedCountries(): Promise<string[]> {
    try {
      const countries = await this.holidayRepo
        .createQueryBuilder('holiday')
        .select('DISTINCT holiday.country_code', 'countryCode')
        .getRawMany();

      return countries.map((c) => c.countryCode).sort();
    } catch (error) {
      log.error(`[HolidayService] Failed to get supported countries:`, error);
      return [];
    }
  }
}
