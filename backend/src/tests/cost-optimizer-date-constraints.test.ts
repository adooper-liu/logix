/**
 * 成本优化日期约束测试
 * Tests for Cost Optimization Date Constraints
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SchedulingCostOptimizerService } from '../services/schedulingCostOptimizer.service';
import * as dateTimeUtils from '../utils/dateTimeUtils';

describe('SchedulingCostOptimizerService - Date Constraints', () => {
  let service: SchedulingCostOptimizerService;

  beforeEach(() => {
    service = new SchedulingCostOptimizerService();
  });

  describe('generateSearchRange - 日期约束', () => {
    it('应该过滤掉早于原计划日期的日期（免费期内）', () => {
      const basePickupDate = new Date('2026-03-28');
      const lastFreeDate = new Date('2026-03-27');
      const strategy = {
        searchDirection: 'backward' as const,
        searchStartOffset: 0,
        searchEndOffset: -7,
        prioritizeZeroCost: true,
        allowSkipIfNoCapacity: true
      };
      const category = {
        category: 'within_free_period' as const,
        containerNumber: 'TEST123',
        plannedPickupDate: basePickupDate,
        lastFreeDate,
        remainingDays: -1,
        originalCost: 0,
        warehouseCode: 'WH001',
        truckingCompanyId: 'TC001'
      };

      // @ts-ignore - 访问私有方法
      const dates = service.generateSearchRange(basePickupDate, lastFreeDate, strategy, category);

      // 验证：所有日期都应该 >= basePickupDate
      dates.forEach((date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const baseStr = basePickupDate.toISOString().split('T')[0];
        expect(dateStr >= baseStr).toBe(true);
      });
    });

    it('应该过滤掉当天的日期（除非原计划就是当天）', () => {
      const today = new Date(); // 今天
      const basePickupDate = new Date('2026-03-28'); // 原计划明天
      const lastFreeDate = new Date('2026-03-27');
      const strategy = {
        searchDirection: 'backward' as const,
        searchStartOffset: 0,
        searchEndOffset: -7,
        prioritizeZeroCost: true,
        allowSkipIfNoCapacity: true
      };
      const category = {
        category: 'within_free_period' as const,
        containerNumber: 'TEST123',
        plannedPickupDate: basePickupDate,
        lastFreeDate,
        remainingDays: -1,
        originalCost: 0,
        warehouseCode: 'WH001',
        truckingCompanyId: 'TC001'
      };

      // @ts-ignore - 访问私有方法
      const dates = service.generateSearchRange(basePickupDate, lastFreeDate, strategy, category);

      // 验证：不应该包含今天的日期
      const todayStr = today.toISOString().split('T')[0];
      const hasToday = dates.some((date: Date) => date.toISOString().split('T')[0] === todayStr);
      expect(hasToday).toBe(false);
    });

    it('应该允许原计划是当天的情况', () => {
      const today = new Date(); // 今天
      const basePickupDate = new Date(today.toISOString().split('T')[0]); // 原计划就是今天
      const lastFreeDate = dateTimeUtils.addDays(today, 7); // 免费期 7 天后
      const strategy = {
        searchDirection: 'backward' as const,
        searchStartOffset: 0,
        searchEndOffset: -7,
        prioritizeZeroCost: true,
        allowSkipIfNoCapacity: true
      };
      const category = {
        category: 'within_free_period' as const,
        containerNumber: 'TEST123',
        plannedPickupDate: basePickupDate,
        lastFreeDate,
        remainingDays: 7,
        originalCost: 0,
        warehouseCode: 'WH001',
        truckingCompanyId: 'TC001'
      };

      // @ts-ignore - 访问私有方法
      const dates = service.generateSearchRange(basePickupDate, lastFreeDate, strategy, category);

      // 验证：应该包含今天的日期（因为原计划就是今天）
      const todayStr = today.toISOString().split('T')[0];
      const hasToday = dates.some((date: Date) => date.toISOString().split('T')[0] === todayStr);
      expect(hasToday).toBe(true);
    });

    it('应该过滤掉过去的日期', () => {
      const today = new Date();
      const basePickupDate = dateTimeUtils.addDays(today, 5); // 5 天后
      const lastFreeDate = dateTimeUtils.addDays(today, 10); // 10 天后
      const strategy = {
        searchDirection: 'backward' as const,
        searchStartOffset: 0,
        searchEndOffset: -7,
        prioritizeZeroCost: true,
        allowSkipIfNoCapacity: true
      };
      const category = {
        category: 'within_free_period' as const,
        containerNumber: 'TEST123',
        plannedPickupDate: basePickupDate,
        lastFreeDate,
        remainingDays: 10,
        originalCost: 0,
        warehouseCode: 'WH001',
        truckingCompanyId: 'TC001'
      };

      // @ts-ignore - 访问私有方法
      const dates = service.generateSearchRange(basePickupDate, lastFreeDate, strategy, category);

      // 验证：所有日期都应该 >= today
      const todayStr = today.toISOString().split('T')[0];
      dates.forEach((date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        expect(dateStr >= todayStr).toBe(true);
      });
    });

    it('已超期时应该允许找到比原计划更早的日期', () => {
      const today = new Date();
      const basePickupDate = dateTimeUtils.addDays(today, 2); // 原计划 2 天后
      const lastFreeDate = dateTimeUtils.addDays(today, -1); // 已经超期 1 天
      const strategy = {
        searchDirection: 'forward' as const,
        searchStartOffset: 0,
        searchEndOffset: 7,
        prioritizeZeroCost: false,
        allowSkipIfNoCapacity: false
      };
      const category = {
        category: 'overdue' as const,
        containerNumber: 'TEST123',
        plannedPickupDate: basePickupDate,
        lastFreeDate,
        remainingDays: -1,
        originalCost: 100,
        warehouseCode: 'WH001',
        truckingCompanyId: 'TC001'
      };

      // @ts-ignore - 访问私有方法
      const dates = service.generateSearchRange(basePickupDate, lastFreeDate, strategy, category);

      // 验证：应该包含今天（尽早处理）
      const todayStr = today.toISOString().split('T')[0];
      const hasToday = dates.some((date: Date) => date.toISOString().split('T')[0] === todayStr);
      expect(hasToday).toBe(true);
    });
  });
});
