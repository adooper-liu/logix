/**
 * DemurrageDateCalculator 单元测试
 */

import { DemurrageDateCalculator } from './DemurrageDateCalculator';

describe('DemurrageDateCalculator', () => {
  let calculator: DemurrageDateCalculator;

  beforeEach(() => {
    calculator = new DemurrageDateCalculator();
  });

  describe('addDays', () => {
    it('应该正确添加天数', () => {
      const startDate = new Date('2026-03-01');
      const result = calculator.addDays(startDate, 7);
      expect(result.toISOString()).toBe('2026-03-08T00:00:00.000Z');
    });

    it('应该支持负数（向前推算）', () => {
      const startDate = new Date('2026-03-08');
      const result = calculator.addDays(startDate, -7);
      expect(result.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    });

    it('应该支持 0 天', () => {
      const startDate = new Date('2026-03-01');
      const result = calculator.addDays(startDate, 0);
      expect(result.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    });
  });

  describe('daysBetween', () => {
    it('应该正确计算天数差（包含首尾）', () => {
      const start = new Date('2026-03-01');
      const end = new Date('2026-03-07');
      const result = calculator.daysBetween(start, end);
      expect(result).toBe(7); // 1,2,3,4,5,6,7 = 7 天
    });

    it('应该处理同一天的情况', () => {
      const start = new Date('2026-03-01');
      const end = new Date('2026-03-01');
      const result = calculator.daysBetween(start, end);
      expect(result).toBe(1);
    });

    it('应该处理跨月情况', () => {
      const start = new Date('2026-02-28');
      const end = new Date('2026-03-01');
      const result = calculator.daysBetween(start, end);
      expect(result).toBe(2);
    });
  });

  describe('isWeekend', () => {
    it('应该识别周六为周末', () => {
      // 2026-03-07 is Saturday
      const saturday = new Date('2026-03-07');
      expect(calculator.isWeekend(saturday)).toBe(true);
    });

    it('应该识别周日为周末', () => {
      // 2026-03-08 is Sunday
      const sunday = new Date('2026-03-08');
      expect(calculator.isWeekend(sunday)).toBe(true);
    });

    it('应该识别工作日为非周末', () => {
      // 2026-03-09 is Monday
      const monday = new Date('2026-03-09');
      expect(calculator.isWeekend(monday)).toBe(false);
    });
  });

  describe('addWorkingDays', () => {
    it('应该跳过周末添加工作日', () => {
      // 从周一开始添加 5 个工作日
      const monday = new Date('2026-03-09');
      const result = calculator.addWorkingDays(monday, 5);
      // Mon(1), Tue(2), Wed(3), Thu(4), Fri(5) -> 2026-03-13
      expect(result.toISOString()).toBe('2026-03-13T00:00:00.000Z');
    });

    it('应该正确处理跨越周末的情况', () => {
      // 从周五开始添加 3 个工作日
      const friday = new Date('2026-03-13');
      const result = calculator.addWorkingDays(friday, 3);
      // Fri(1), skip Sat/Sun, Mon(2), Tue(3) -> 2026-03-17
      expect(result.toISOString()).toBe('2026-03-17T00:00:00.000Z');
    });

    it('应该处理 0 天的情况', () => {
      const date = new Date('2026-03-09');
      const result = calculator.addWorkingDays(date, 0);
      expect(result.toISOString()).toBe('2026-03-09T00:00:00.000Z');
    });
  });

  describe('workingDaysBetween', () => {
    it('应该正确计算工作日天数（排除周末）', () => {
      const start = new Date('2026-03-09'); // Monday
      const end = new Date('2026-03-13'); // Friday
      const result = calculator.workingDaysBetween(start, end);
      expect(result).toBe(5); // Mon-Fri = 5 days
    });

    it('应该排除周末', () => {
      const start = new Date('2026-03-07'); // Saturday
      const end = new Date('2026-03-08'); // Sunday
      const result = calculator.workingDaysBetween(start, end);
      expect(result).toBe(0); // Weekend only
    });

    it('应该处理跨周情况', () => {
      const start = new Date('2026-03-06'); // Friday
      const end = new Date('2026-03-09'); // Monday
      const result = calculator.workingDaysBetween(start, end);
      expect(result).toBe(2); // Fri + Mon = 2 days
    });
  });

  describe('freePeriodUsesWorkingDays', () => {
    it('应该识别"工作日"为使用工作日', () => {
      expect(calculator.freePeriodUsesWorkingDays('工作日')).toBe(true);
    });

    it('应该识别"working"为使用工作日', () => {
      expect(calculator.freePeriodUsesWorkingDays('working')).toBe(true);
    });

    it('应该识别"工作 + 自然"为使用工作日', () => {
      expect(calculator.freePeriodUsesWorkingDays('工作 + 自然')).toBe(true);
    });

    it('应该识别"natural+working"为使用工作日', () => {
      expect(calculator.freePeriodUsesWorkingDays('natural+working')).toBe(true);
    });

    it('应该识别"自然日"为不使用工作日', () => {
      expect(calculator.freePeriodUsesWorkingDays('自然日')).toBe(false);
    });

    it('应该处理 null/undefined', () => {
      expect(calculator.freePeriodUsesWorkingDays(null)).toBe(false);
      expect(calculator.freePeriodUsesWorkingDays(undefined)).toBe(false);
    });
  });

  describe('chargePeriodUsesWorkingDays', () => {
    it('应该识别"自然 + 工作"为使用工作日', () => {
      expect(calculator.chargePeriodUsesWorkingDays('自然 + 工作')).toBe(true);
    });

    it('应该识别"working+natural"为使用工作日', () => {
      expect(calculator.chargePeriodUsesWorkingDays('working+natural')).toBe(true);
    });

    it('应该识别"自然日"为不使用工作日', () => {
      expect(calculator.chargePeriodUsesWorkingDays('自然日')).toBe(false);
    });
  });

  describe('calculateLastFreeDate', () => {
    it('应该正确计算自然日免费期', () => {
      const startDate = new Date('2026-03-01');
      const result = calculator.calculateLastFreeDate(startDate, 7, '自然日', 'actual');
      
      expect(result.lastFreeDate.toISOString()).toBe('2026-03-07T00:00:00.000Z');
      expect(result.lastFreeDateMode).toBe('actual');
      expect(result.freeDays).toBe(7);
    });

    it('应该正确计算工作日免费期', () => {
      // 从周一开始 7 个工作日
      const monday = new Date('2026-03-09');
      const result = calculator.calculateLastFreeDate(monday, 7, '工作日', 'forecast');
      
      // n = 7-1 = 6 个工作日
      // Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), skip Sat/Sun, Mon(6) -> 2026-03-16
      expect(result.lastFreeDate.toISOString()).toBe('2026-03-16T00:00:00.000Z');
      expect(result.lastFreeDateMode).toBe('forecast');
    });

    it('应该处理 0 免费天的情况', () => {
      const startDate = new Date('2026-03-01');
      const result = calculator.calculateLastFreeDate(startDate, 0, '自然日');
      
      // n = max(0, 0-1) = 0, so lastFreeDate = startDate
      expect(result.lastFreeDate.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    });
  });

  describe('calculateChargeDays', () => {
    it('应该正确计算自然日计费天数', () => {
      const lastFreeDate = new Date('2026-03-07');
      const endDate = new Date('2026-03-15');
      const result = calculator.calculateChargeDays(lastFreeDate, endDate, '自然日');
      
      expect(result.chargeDays).toBe(8); // 3/8 to 3/15 = 8 days
      expect(result.chargeStart.toISOString()).toBe('2026-03-08T00:00:00.000Z');
      expect(result.isWorkingDaysOnly).toBe(false);
    });

    it('应该正确计算工作日计费天数', () => {
      // 从周一开始计费
      const lastFreeDate = new Date('2026-03-06'); // Friday
      const endDate = new Date('2026-03-10'); // Tuesday (skip weekend)
      const result = calculator.calculateChargeDays(lastFreeDate, endDate, '工作日');
      
      expect(result.chargeDays).toBe(2); // Mon(1), Tue(2)
      expect(result.isWorkingDaysOnly).toBe(true);
    });

    it('应该返回 0 如果结束日期在免费期内', () => {
      const lastFreeDate = new Date('2026-03-07');
      const endDate = new Date('2026-03-05');
      const result = calculator.calculateChargeDays(lastFreeDate, endDate, '自然日');
      
      expect(result.chargeDays).toBe(0);
    });
  });

  describe('calculateSingleItemDates', () => {
    it('应该完整计算免费期和计费期', () => {
      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-15');
      const result = calculator.calculateSingleItemDates(startDate, endDate, 7, '自然日', 'actual');
      
      expect(result.freePeriod.lastFreeDate.toISOString()).toBe('2026-03-07T00:00:00.000Z');
      expect(result.chargePeriod.chargeDays).toBe(8);
      expect(result.hasCharges).toBe(true);
    });

    it('应该返回无费用如果在免费期内', () => {
      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-05');
      const result = calculator.calculateSingleItemDates(startDate, endDate, 7, '自然日');
      
      expect(result.freePeriod.lastFreeDate.toISOString()).toBe('2026-03-07T00:00:00.000Z');
      expect(result.chargePeriod.chargeDays).toBe(0);
      expect(result.hasCharges).toBe(false);
    });
  });

  describe('validateDateRange', () => {
    it('应该验证有效的日期范围', () => {
      const start = new Date('2026-03-01');
      const end = new Date('2026-03-15');
      const result = calculator.validateDateRange(start, end, 'test');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应该检测开始日期晚于结束日期', () => {
      const start = new Date('2026-03-15');
      const end = new Date('2026-03-01');
      const result = calculator.validateDateRange(start, end, 'test');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该警告过早的日期', () => {
      const start = new Date('1990-01-01');
      const end = new Date('1990-12-31');
      const result = calculator.validateDateRange(start, end, 'test');
      
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('应该警告过晚的日期', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 2);
      const start = future;
      const end = new Date(future.getTime() + 86400000); // +1 day
      
      const result = calculator.validateDateRange(start, end, 'test');
      
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
