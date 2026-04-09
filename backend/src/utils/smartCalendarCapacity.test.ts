/**
 * SmartCalendarCapacity 单元测试（重建版）
 * 只覆盖当前实现稳定的行为：isWeekend / getWorkingDays / addWorkDays
 */

import { AppDataSource } from '../database';
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { TruckingCompany } from '../entities/TruckingCompany';
import { Warehouse } from '../entities/Warehouse';

const mockConfigRepo = { findOne: jest.fn() };
const mockWarehouseRepo = { findOne: jest.fn(), find: jest.fn() };
const mockTruckingCompanyRepo = { findOne: jest.fn(), find: jest.fn() };
const mockWarehouseOccupancyRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
const mockTruckingOccupancyRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };

jest.mock('../database', () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

jest.mock('../services/HolidayService', () => {
  const service = {
    isHoliday: jest.fn().mockResolvedValue(false),
    getHolidaysInRange: jest.fn().mockResolvedValue([])
  };
  return {
    HolidayService: jest.fn(() => service),
    __service: service
  };
});

const holidayMock = (jest.requireMock('../services/HolidayService') as any).__service;

describe('SmartCalendarCapacity', () => {
  let calendar: any;

  const useDefaultCalendarConfig = (enabled: 'true' | 'false' = 'true') => {
    mockConfigRepo.findOne.mockImplementation(async ({ where }: any) => {
      const key = where?.configKey;
      if (key === 'enable_smart_calendar_capacity') return { configKey: key, configValue: enabled };
      if (key === 'weekend_days') return { configKey: key, configValue: '6,0' };
      if (key === 'weekday_capacity_multiplier') return { configKey: key, configValue: '1.0' };
      return null;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const holidayModule = jest.requireMock('../services/HolidayService') as any;
    (holidayModule.HolidayService as jest.Mock).mockImplementation(() => holidayModule.__service);

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      const name = entity?.name;
      if (name === DictSchedulingConfig.name) return mockConfigRepo;
      if (name === Warehouse.name) return mockWarehouseRepo;
      if (name === TruckingCompany.name) return mockTruckingCompanyRepo;
      if (name === ExtWarehouseDailyOccupancy.name) return mockWarehouseOccupancyRepo;
      if (name === ExtTruckingSlotOccupancy.name) return mockTruckingOccupancyRepo;
      return {};
    });

    useDefaultCalendarConfig('true');
    holidayMock.isHoliday.mockResolvedValue(false);
    holidayMock.getHolidaysInRange.mockResolvedValue([]);
    // 先完成 mock，再加载模块，避免导入时机导致的未命中 mock
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { SmartCalendarCapacity } = require('./smartCalendarCapacity');
    calendar = new SmartCalendarCapacity();
  });

  it('isWeekend: 智能日历启用时，周末返回 true', async () => {
    expect(await calendar.isWeekend(new Date('2026-04-04'))).toBe(true);
    expect(await calendar.isWeekend(new Date('2026-04-05'))).toBe(true);
    expect(await calendar.isWeekend(new Date('2026-04-08'))).toBe(false);
  });

  it('isWeekend: 智能日历禁用时，周末返回 false', async () => {
    useDefaultCalendarConfig('false');
    expect(await calendar.isWeekend(new Date('2026-04-04'))).toBe(false);
  });

  it('getWorkingDays: 排除周末与节假日（含边界）', async () => {
    holidayMock.getHolidaysInRange.mockResolvedValue([
      { holidayDate: new Date('2026-04-03') } // 周五
    ]);

    const start = new Date('2026-04-01'); // Wed
    const end = new Date('2026-04-07'); // Tue
    const days = await calendar.getWorkingDays(start, end, 'US');

    // 共 7 天，周末 2 天（4/4, 4/5），节假日 1 天（4/3）=> 4 天
    expect(days).toBe(4);
    expect(holidayMock.getHolidaysInRange).toHaveBeenCalledWith(start, end, 'US');
  });

  it('addWorkDays: 跳过周末与节假日', async () => {
    holidayMock.getHolidaysInRange.mockResolvedValue([
      { holidayDate: new Date('2026-04-03') } // 周五
    ]);

    const start = new Date('2026-04-01'); // Wed
    const result = await calendar.addWorkDays(start, 3, 'US');

    // +1: 4/2, +2: 4/6(跳过4/3假日+周末), +3: 4/7
    expect(result.toISOString().split('T')[0]).toBe('2026-04-07');
    expect(holidayMock.getHolidaysInRange).toHaveBeenCalledTimes(1);
  });

  it('addWorkDays: workDays<=0 时返回原日期', async () => {
    const start = new Date('2026-04-01');
    const zero = await calendar.addWorkDays(start, 0, 'US');
    const negative = await calendar.addWorkDays(start, -2, 'US');

    expect(zero.toISOString().split('T')[0]).toBe('2026-04-01');
    expect(negative.toISOString().split('T')[0]).toBe('2026-04-01');
  });
});
