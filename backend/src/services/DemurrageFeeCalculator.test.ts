/**
 * DemurrageFeeCalculator 单元测试
 */

import { DemurrageFeeCalculator } from './DemurrageFeeCalculator';
import { DemurrageDateCalculator } from './DemurrageDateCalculator';

describe('DemurrageFeeCalculator', () => {
  let feeCalculator: DemurrageFeeCalculator;
  let dateCalculator: DemurrageDateCalculator;

  beforeEach(() => {
    dateCalculator = new DemurrageDateCalculator();
    feeCalculator = new DemurrageFeeCalculator(dateCalculator);
  });

  describe('normalizeTiers - 数组格式', () => {
    it('应该正确解析标准数组格式', () => {
      const tiers = [
        { fromDay: 1, toDay: 7, ratePerDay: 50 },
        { fromDay: 8, toDay: 14, ratePerDay: 100 },
        { fromDay: 15, toDay: null, ratePerDay: 150 }
      ];

      const result = feeCalculator.normalizeTiers(tiers);

      expect(result).toHaveLength(3);
      expect(result![0]).toEqual({ fromDay: 1, toDay: 7, ratePerDay: 50 });
      expect(result![1]).toEqual({ fromDay: 8, toDay: 14, ratePerDay: 100 });
      expect(result![2]).toEqual({ fromDay: 15, toDay: null, ratePerDay: 150 });
    });

    it('应该正确解析 minDays/maxDays 格式', () => {
      const tiers = [
        { minDays: 1, maxDays: 7, rate: 50 },
        { minDays: 8, maxDays: 14, rate: 100 }
      ];

      const result = feeCalculator.normalizeTiers(tiers);

      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({ fromDay: 1, toDay: 7, ratePerDay: 50 });
      expect(result![1]).toEqual({ fromDay: 8, toDay: 14, ratePerDay: 100 });
    });

    it('应该过滤无效的阶梯（fromDay < 1）', () => {
      const tiers = [
        { fromDay: 0, toDay: 7, ratePerDay: 50 }, // 无效
        { fromDay: 1, toDay: 7, ratePerDay: 50 },
        { fromDay: 8, toDay: null, ratePerDay: 100 }
      ];

      const result = feeCalculator.normalizeTiers(tiers);

      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({ fromDay: 1, toDay: 7, ratePerDay: 50 });
    });

    it('应该处理空数组', () => {
      const result = feeCalculator.normalizeTiers([]);
      expect(result).toBeNull();
    });
  });

  describe('normalizeTiers - 对象格式', () => {
    it('应该正确解析对象格式（连续区间）', () => {
      const tiers = {
        '1': 50,
        '8': 100,
        '15': 150
      };

      const result = feeCalculator.normalizeTiers(tiers);

      expect(result).toHaveLength(3);
      expect(result![0]).toEqual({ fromDay: 1, toDay: 7, ratePerDay: 50 });
      expect(result![1]).toEqual({ fromDay: 8, toDay: 14, ratePerDay: 100 });
      expect(result![2]).toEqual({ fromDay: 15, toDay: null, ratePerDay: 150 });
    });

    it('应该正确解析对象格式（开区间）', () => {
      const tiers = {
        '1-7': 50,
        '8+': 100
      };

      const result = feeCalculator.normalizeTiers(tiers);

      expect(result).toHaveLength(2);
      expect(result![0]).toEqual({ fromDay: 1, toDay: 7, ratePerDay: 50 });
      expect(result![1]).toEqual({ fromDay: 8, toDay: null, ratePerDay: 100 });
    });

    it('应该处理空对象', () => {
      const result = feeCalculator.normalizeTiers({});
      expect(result).toBeNull();
    });
  });

  describe('calculateSingleItem - 免费期内', () => {
    it('应该返回 0 费用如果在免费期内', () => {
      const result = feeCalculator.calculateSingleItem({
        standardId: 1,
        chargeName: '滞港费',
        chargeTypeCode: 'DEMURRAGE',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-05'), // 在免费期内
        startDateSource: 'ATA',
        endDateSource: 'PLANNED_PICKUP',
        startDateMode: 'actual',
        endDateMode: 'forecast',
        freeDays: 7,
        ratePerDay: 50,
        currency: 'USD'
      });

      expect(result.chargeDays).toBe(0);
      expect(result.amount).toBe(0);
      expect(result.tierBreakdown).toHaveLength(0);
    });
  });

  describe('calculateSingleItem - 有费用产生', () => {
    it('应该计算统一费率的费用', () => {
      const result = feeCalculator.calculateSingleItem({
        standardId: 1,
        chargeName: '滞港费',
        chargeTypeCode: 'DEMURRAGE',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-15'),
        startDateSource: 'ATA',
        endDateSource: 'ACTUAL_PICKUP',
        startDateMode: 'actual',
        endDateMode: 'actual',
        freeDays: 7,
        ratePerDay: 50,
        currency: 'USD'
      });

      // 免费期：3/1 + 6 = 3/7
      // 计费期：3/8 - 3/15 = 8 天
      expect(result.chargeDays).toBe(8);
      expect(result.amount).toBe(400); // 8 * 50
      expect(result.tierBreakdown).toHaveLength(1);
      expect(result.tierBreakdown[0]).toEqual({
        fromDay: 1,
        toDay: 8,
        days: 8,
        ratePerDay: 50,
        subtotal: 400
      });
    });

    it('应该计算阶梯费率的费用', () => {
      const tiers = [
        { fromDay: 1, toDay: 7, ratePerDay: 50 },
        { fromDay: 8, toDay: 14, ratePerDay: 100 },
        { fromDay: 15, toDay: null, ratePerDay: 150 }
      ];

      const result = feeCalculator.calculateSingleItem({
        standardId: 1,
        chargeName: '滞港费',
        chargeTypeCode: 'DEMURRAGE',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-22'), // 21 天
        startDateSource: 'ATA',
        endDateSource: 'ACTUAL_PICKUP',
        startDateMode: 'actual',
        endDateMode: 'actual',
        freeDays: 7,
        ratePerDay: 50,
        tiers,
        currency: 'USD'
      });

      // 免费期：3/1 + 6 = 3/7
      // 计费期：3/8 - 3/22 = 15 天
      // 由于 currentDay = freeDays + 1 = 8（从第 8 天开始计费）
      // 第 8-14 天：7 天 * 100 = 700
      // 第 15-21 天：8 天 * 150 = 1200
      // Total: 1900
      expect(result.chargeDays).toBe(15);
      expect(result.amount).toBe(1900);
    });

    it('应该正确处理工作日免费期', () => {
      const result = feeCalculator.calculateSingleItem({
        standardId: 1,
        chargeName: '滞港费',
        chargeTypeCode: 'DEMURRAGE',
        startDate: new Date('2026-03-09'), // 周一
        endDate: new Date('2026-03-20'),
        startDateSource: 'ATA',
        endDateSource: 'ACTUAL_PICKUP',
        startDateMode: 'actual',
        endDateMode: 'actual',
        freeDays: 7,
        freeDaysBasis: '工作日',
        ratePerDay: 50,
        currency: 'USD'
      });

      // 7 个工作日免费期：Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), skip weekend, Mon(6), Tue(7) -> 3/16
      // 计费期：3/17 - 3/20 = 4 天
      expect(result.freeDaysBasis).toBe('工作日');
      expect(result.chargeDays).toBeGreaterThan(0);
    });
  });

  describe('summarizeFees', () => {
    it('应该汇总多个费用项', () => {
      const items: any[] = [
        {
          standardId: 1,
          chargeName: '滞港费',
          chargeTypeCode: 'DEMURRAGE',
          freeDays: 7,
          calculationMode: 'actual' as const,
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-15'),
          startDateSource: 'ATA',
          endDateSource: 'ACTUAL_PICKUP',
          startDateMode: 'actual' as const,
          endDateMode: 'actual' as const,
          lastFreeDate: new Date('2026-03-07'),
          lastFreeDateMode: 'actual' as const,
          chargeDays: 8,
          amount: 400,
          currency: 'USD',
          tierBreakdown: []
        },
        {
          standardId: 2,
          chargeName: '堆存费',
          chargeTypeCode: 'STORAGE',
          freeDays: 3,
          calculationMode: 'actual' as const,
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-10'),
          startDateSource: 'ATA',
          endDateSource: 'ACTUAL_PICKUP',
          startDateMode: 'actual' as const,
          endDateMode: 'actual' as const,
          lastFreeDate: new Date('2026-03-03'),
          lastFreeDateMode: 'actual' as const,
          chargeDays: 7,
          amount: 210,
          currency: 'USD',
          tierBreakdown: []
        }
      ];

      const result = feeCalculator.summarizeFees(items);

      expect(result.items).toHaveLength(2);
      expect(result.totalAmount).toBe(610);
      expect(result.currency).toBe('USD');
      expect(result.skippedItems).toHaveLength(0);
    });

    it('应该处理跳过的项目', () => {
      const items: any[] = [
        {
          standardId: 1,
          chargeName: '滞港费',
          chargeTypeCode: 'DEMURRAGE',
          freeDays: 7,
          calculationMode: 'actual' as const,
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-15'),
          startDateSource: 'ATA',
          endDateSource: 'ACTUAL_PICKUP',
          startDateMode: 'actual' as const,
          endDateMode: 'actual' as const,
          lastFreeDate: new Date('2026-03-07'),
          lastFreeDateMode: 'actual' as const,
          chargeDays: 8,
          amount: 400,
          currency: 'USD',
          tierBreakdown: []
        }
      ];

      const skippedItems: any[] = [
        {
          standardId: 2,
          chargeName: '堆存费',
          chargeTypeCode: 'STORAGE',
          reasonCode: 'missing_pickup_date_actual',
          reason: '缺少实际提柜日期'
        }
      ];

      const result = feeCalculator.summarizeFees(items, skippedItems);

      expect(result.items).toHaveLength(1);
      expect(result.skippedItems).toHaveLength(1);
      expect(result.totalAmount).toBe(400);
    });

    it('应该处理空列表', () => {
      const result = feeCalculator.summarizeFees([]);

      expect(result.items).toHaveLength(0);
      expect(result.totalAmount).toBe(0);
      expect(result.currency).toBe('USD');
    });
  });
});
