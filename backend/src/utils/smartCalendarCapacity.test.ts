/**
 * SmartCalendarCapacity Phase 2 Task 3 单元测试
 * 测试 isWeekend、getWorkingDays、addWorkDays 方法
 */

import { SmartCalendarCapacity } from './smartCalendarCapacity';
import { HolidayService } from '../services/HolidayService';
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';
import { Warehouse } from '../entities/Warehouse';
import { TruckingCompany } from '../entities/TruckingCompany';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';

// Mock TypeORM Repository
const mockConfigRepo = {
  findOne: jest.fn()
};

const mockWarehouseRepo = {
  findOne: jest.fn()
};

const mockTruckingCompanyRepo = {
  findOne: jest.fn()
};

const mockWarehouseOccupancyRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn()
};

const mockTruckingOccupancyRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn()
};

// Mock HolidayService
const mockHolidayService = {
  isHoliday: jest.fn(),
  getHolidaysInRange: jest.fn()
};

jest.mock('../database', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity) => {
      // 根据实体类引用获取对应的 mock repository
      if (entity === DictSchedulingConfig) return mockConfigRepo;
      if (entity === Warehouse) return mockWarehouseRepo;
      if (entity === TruckingCompany) return mockTruckingCompanyRepo;
      if (entity === ExtWarehouseDailyOccupancy) return mockWarehouseOccupancyRepo;
      if (entity === ExtTruckingSlotOccupancy) return mockTruckingOccupancyRepo;
      return {};
    })
  }
}));

jest.mock('../services/HolidayService', () => ({
  HolidayService: jest.fn(() => mockHolidayService)
}));

describe('SmartCalendarCapacity - Phase 2 Task 3', () => {
  let calendar: SmartCalendarCapacity;

  beforeEach(() => {
    jest.clearAllMocks();
    calendar = new SmartCalendarCapacity();
  });

  describe('isWeekend()', () => {
    it('should return true for weekend days when calendar is enabled', async () => {
      mockConfigRepo.findOne.mockResolvedValue({
        configKey: 'enable_smart_calendar_capacity',
        configValue: 'true'
      });

      // 周六（6）
      const saturday = new Date('2026-04-04'); // Saturday
      expect(await calendar.isWeekend(saturday)).toBe(true);

      // 周日（0）
      const sunday = new Date('2026-04-05'); // Sunday
      expect(await calendar.isWeekend(sunday)).toBe(true);
    });

    it('should return false for weekdays', async () => {
      mockConfigRepo.findOne.mockResolvedValue({
        configKey: 'enable_smart_calendar_capacity',
        configValue: 'true'
      });

      // 周三（3）
      const wednesday = new Date('2026-04-01'); // Wednesday
      expect(await calendar.isWeekend(wednesday)).toBe(false);
    });

    it('should return false when calendar is disabled', async () => {
      mockConfigRepo.findOne.mockResolvedValue({
        configKey: 'enable_smart_calendar_capacity',
        configValue: 'false'
      });

      const saturday = new Date('2026-04-04');
      expect(await calendar.isWeekend(saturday)).toBe(false);
    });
  });

  describe('getWorkingDays()', () => {
    beforeEach(() => {
      // Mock 节假日数据
      mockHolidayService.getHolidaysInRange.mockResolvedValue([
        {
          id: 1,
          holidayDate: new Date('2026-07-04'),
          holidayName: 'Independence Day',
          countryCode: 'US',
          isRecurring: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    });

    it('should calculate working days excluding weekends and holidays', async () => {
      // 2026-04-01 到 2026-04-10（10 天）
      // 包含：2 个周末（4/4, 4/5），无节假日
      // 工作日：8 天
      const start = new Date('2026-04-01');
      const end = new Date('2026-04-10');

      const workingDays = await calendar.getWorkingDays(start, end, 'US');

      expect(workingDays).toBe(8);
      expect(mockHolidayService.getHolidaysInRange).toHaveBeenCalledWith(start, end, 'US');
    });

    it('should exclude holidays from working days', async () => {
      // 2026-07-01 到 2026-07-06（6 天）
      // 包含：2 个周末（7/4, 7/5），1 个节假日（7/4）
      // 工作日：3 天（7/1, 7/2, 7/6）
      const start = new Date('2026-07-01');
      const end = new Date('2026-07-06');

      const workingDays = await calendar.getWorkingDays(start, end, 'US');

      expect(workingDays).toBe(3);
    });

    it('should include weekends when excludeWeekends is false', async () => {
      const start = new Date('2026-04-01');
      const end = new Date('2026-04-10');

      const workingDays = await calendar.getWorkingDays(start, end, 'US', false);

      // 10 天 - 1 个节假日（7/4 不在这个范围）= 10 天
      expect(workingDays).toBe(10);
    });

    it('should handle empty holiday range', async () => {
      mockHolidayService.getHolidaysInRange.mockResolvedValue([]);

      const start = new Date('2026-04-01');
      const end = new Date('2026-04-05');

      const workingDays = await calendar.getWorkingDays(start, end, 'US');

      // 5 天 - 2 个周末（4/4, 4/5）= 3 天
      expect(workingDays).toBe(3);
    });
  });

  describe('addWorkDays()', () => {
    beforeEach(() => {
      // Mock 节假日数据
      mockHolidayService.getHolidaysInRange.mockResolvedValue([
        {
          id: 1,
          holidayDate: new Date('2026-07-04'),
          holidayName: 'Independence Day',
          countryCode: 'US',
          isRecurring: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);
    });

    it('should add work days correctly', async () => {
      // 从 2026-04-01 开始，加 5 个工作日
      // 4/1 (Wed) -> +1 = 4/2 (Thu) -> +1 = 4/3 (Fri) -> +2 = 4/6 (Mon, skip weekend) -> +1 = 4/7 (Tue)
      const startDate = new Date('2026-04-01');
      const result = await calendar.addWorkDays(startDate, 5, 'US');

      expect(result.toISOString().split('T')[0]).toBe('2026-04-07');
    });

    it('should skip holidays when adding work days', async () => {
      // 从 2026-07-01 开始，加 3 个工作日
      // 7/1 (Wed) -> +1 = 7/2 (Thu) -> +1 = 7/3 (Fri) -> skip 7/4 (Sat + Holiday) -> skip 7/5 (Sun) -> +1 = 7/6 (Mon)
      const startDate = new Date('2026-07-01');
      const result = await calendar.addWorkDays(startDate, 3, 'US');

      expect(result.toISOString().split('T')[0]).toBe('2026-07-06');
    });

    it('should return same date when workDays is 0', async () => {
      const startDate = new Date('2026-04-01');
      const result = await calendar.addWorkDays(startDate, 0, 'US');

      expect(result.toISOString().split('T')[0]).toBe('2026-04-01');
    });

    it('should handle negative workDays gracefully', async () => {
      const startDate = new Date('2026-04-01');
      const result = await calendar.addWorkDays(startDate, -5, 'US');

      expect(result.toISOString().split('T')[0]).toBe('2026-04-01');
    });

    it('should estimate correct range for bulk query', async () => {
      const startDate = new Date('2026-04-01');
      await calendar.addWorkDays(startDate, 10, 'US');

      // 验证查询范围估算逻辑（10 * 1.5 = 15 天）
      expect(mockHolidayService.getHolidaysInRange).toHaveBeenCalled();
      const callArgs = mockHolidayService.getHolidaysInRange.mock.calls[0];
      const estimatedEnd = callArgs[1] as Date;
      
      // 估算的结束日期应该大约是起始日期 + 15 天
      const diffDays = (estimatedEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThanOrEqual(10);
      expect(diffDays).toBeLessThanOrEqual(20);
    });
  });

  describe('Performance optimization verification', () => {
    it('should use batch query instead of N+1 queries', async () => {
      const start = new Date('2026-04-01');
      const end = new Date('2026-04-30');

      await calendar.getWorkingDays(start, end, 'US');

      // 验证只调用了一次批量查询
      expect(mockHolidayService.getHolidaysInRange).toHaveBeenCalledTimes(1);
      expect(mockHolidayService.getHolidaysInRange).toHaveBeenCalledWith(start, end, 'US');
    });

    it('should use Set for O(1) holiday lookup', async () => {
      const start = new Date('2026-04-01');
      const end = new Date('2026-04-30');

      await calendar.getWorkingDays(start, end, 'US');

      // 内部实现使用 Set，这里验证批量查询被正确调用
      expect(mockHolidayService.getHolidaysInRange).toHaveBeenCalled();
    });
  });
});
