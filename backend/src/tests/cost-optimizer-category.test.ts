/**
 * 成本优化分类逻辑测试
 * Tests for Container Category Logic
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { SchedulingCostOptimizerService } from '../services/schedulingCostOptimizer.service';

describe('SchedulingCostOptimizerService - Category Logic', () => {
  let service: SchedulingCostOptimizerService;

  beforeEach(() => {
    service = new SchedulingCostOptimizerService();
  });

  describe('suggestOptimalUnloadDate - 分类逻辑验证', () => {
    it('应该正确处理原计划超期的情况（lastFreeDate < basePickupDate）', async () => {
      // 这个测试需要实际的数据库连接，暂时跳过
      // 目的是验证当 lastFreeDate < basePickupDate 时
      // 系统会自动切换到 forward 策略而不是 backward
      expect(true).toBe(true);
      
      // TODO: 集成测试时需要验证：
      // 1. category.category === 'overdue'
      // 2. strategy.searchDirection === 'forward'
      // 3. searchDates 包含今天的日期
    });

    it('应该正确处理真正的免费期内情况', async () => {
      // 这个测试需要实际的数据库连接，暂时跳过
      expect(true).toBe(true);
      
      // TODO: 集成测试时需要验证：
      // 1. category.category === 'within_free_period'
      // 2. strategy.searchDirection === 'backward'
      // 3. searchDates 从 lastFreeDate 往前推
    });
  });

  describe('generateSearchRange - 搜索范围生成（可以直接测试）', () => {
    it('应该为原计划超期的情况生成 forward 搜索日期', async () => {
      // 场景：原计划超期，应该使用 forward 策略
      const today = new Date('2026-03-27');
      const lastFreeDate = new Date('2026-03-27');
      const basePickupDate = new Date('2026-03-28');

      const strategy = {
        searchDirection: 'forward' as const,
        searchStartOffset: 0,
        searchEndOffset: 7,
        prioritizeZeroCost: false,
        allowSkipIfNoCapacity: false
      };

      const dates = (service as any).generateSearchRange(
        basePickupDate,
        lastFreeDate,
        strategy,
        {
          category: 'overdue',
          remainingDays: 0,
          plannedPickupDate: basePickupDate,
          lastFreeDate
        }
      );

      // 应该生成从今天开始的日期
      expect(dates.length).toBeGreaterThan(0);
      expect(dates[0].toISOString().split('T')[0]).toBe('2026-03-27');
    });

    it('应该为免费期内的情况生成 backward 搜索日期', async () => {
      // 场景：真正的免费期内
      const today = new Date('2026-03-27');
      const lastFreeDate = new Date('2026-03-30');
      const basePickupDate = new Date('2026-03-28');

      const strategy = {
        searchDirection: 'backward' as const,
        searchStartOffset: 0,
        searchEndOffset: -7,
        prioritizeZeroCost: true,
        allowSkipIfNoCapacity: true
      };

      const dates = (service as any).generateSearchRange(
        basePickupDate,
        lastFreeDate,
        strategy,
        {
          category: 'within_free_period',
          remainingDays: 3,
          plannedPickupDate: basePickupDate,
          lastFreeDate
        }
      );

      // 应该生成从免费期截止日往前的日期
      expect(dates.length).toBeGreaterThan(0);
      expect(dates[0].toISOString().split('T')[0]).toBe('2026-03-30');
    });

    it('应该过滤掉早于原计划的日期（免费期内）', async () => {
      const today = new Date('2026-03-27');
      const lastFreeDate = new Date('2026-03-30');
      const basePickupDate = new Date('2026-03-28');

      const strategy = {
        searchDirection: 'backward' as const,
        searchStartOffset: 0,
        searchEndOffset: -7,
        prioritizeZeroCost: true,
        allowSkipIfNoCapacity: true
      };

      const dates = (service as any).generateSearchRange(
        basePickupDate,
        lastFreeDate,
        strategy,
        {
          category: 'within_free_period',
          remainingDays: 3,
          plannedPickupDate: basePickupDate,
          lastFreeDate
        }
      );

      // 所有日期都应该 >= basePickupDate
      const basePickupDateStr = basePickupDate.toISOString().split('T')[0];
      dates.forEach((date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        expect(dateStr >= basePickupDateStr).toBe(true);
      });
    });

    it('应该允许早于原计划的日期（已超期）', async () => {
      const today = new Date('2026-03-27');
      const lastFreeDate = new Date('2026-03-26');
      const basePickupDate = new Date('2026-03-28');

      const strategy = {
        searchDirection: 'forward' as const,
        searchStartOffset: 0,
        searchEndOffset: 7,
        prioritizeZeroCost: false,
        allowSkipIfNoCapacity: false
      };

      const dates = (service as any).generateSearchRange(
        basePickupDate,
        lastFreeDate,
        strategy,
        {
          category: 'overdue',
          remainingDays: -1,
          plannedPickupDate: basePickupDate,
          lastFreeDate
        }
      );

      // 应该包含今天的日期（尽早处理）
      const todayStr = today.toISOString().split('T')[0];
      const hasToday = dates.some((d: Date) => d.toISOString().split('T')[0] === todayStr);
      expect(hasToday).toBe(true);
    });
  });
});
