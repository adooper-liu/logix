/**
 * 日期时间工具 - 周末处理测试
 * @see backend/src/utils/dateTimeUtils.ts - adjustForWeekend()
 */

import { describe, expect, it } from 'vitest';
import { adjustForWeekend, isWeekend } from '../../src/utils/dateTimeUtils';

describe('DateTimeUtils - Weekend Handling', () => {
  describe('isWeekend()', () => {
    it('应该正确识别周六', () => {
      // 2026-03-28 是周六
      const saturday = new Date('2026-03-28');
      expect(isWeekend(saturday)).toBe(true);
    });

    it('应该正确识别周日', () => {
      // 2026-03-29 是周日
      const sunday = new Date('2026-03-29');
      expect(isWeekend(sunday)).toBe(true);
    });

    it('应该正确识别工作日', () => {
      // 2026-03-27 是周五
      const friday = new Date('2026-03-27');
      expect(isWeekend(friday)).toBe(false);

      // 2026-03-30 是周一
      const monday = new Date('2026-03-30');
      expect(isWeekend(monday)).toBe(false);

      // 2026-04-01 是周三
      const wednesday = new Date('2026-04-01');
      expect(isWeekend(wednesday)).toBe(false);
    });

    it('应该正确处理一周的每一天', () => {
      // 2026-03-29 (周日) 到 2026-04-04 (周六)
      const testCases = [
        { date: '2026-03-29', expected: true, day: '周日' },
        { date: '2026-03-30', expected: false, day: '周一' },
        { date: '2026-03-31', expected: false, day: '周二' },
        { date: '2026-04-01', expected: false, day: '周三' },
        { date: '2026-04-02', expected: false, day: '周四' },
        { date: '2026-04-03', expected: false, day: '周五' },
        { date: '2026-04-04', expected: true, day: '周六' }
      ];

      testCases.forEach(({ date, expected, day }) => {
        expect(isWeekend(new Date(date))).toBe(expected);
      });
    });
  });

  describe('adjustForWeekend()', () => {
    it('应该将周六调整为下周一 (+2 天)', () => {
      // 2026-03-28 是周六
      const saturday = new Date('2026-03-28');
      const adjusted = adjustForWeekend(saturday);

      // 应该调整为 2026-03-30 (周一)
      expect(adjusted.getFullYear()).toBe(2026);
      expect(adjusted.getMonth()).toBe(2); // 3 月 (0-based)
      expect(adjusted.getDate()).toBe(30);
      expect(adjusted.getDay()).toBe(1); // 周一
    });

    it('应该将周日调整为下周一 (+1 天)', () => {
      // 2026-03-29 是周日
      const sunday = new Date('2026-03-29');
      const adjusted = adjustForWeekend(sunday);

      // 应该调整为 2026-03-30 (周一)
      expect(adjusted.getFullYear()).toBe(2026);
      expect(adjusted.getMonth()).toBe(2); // 3 月 (0-based)
      expect(adjusted.getDate()).toBe(30);
      expect(adjusted.getDay()).toBe(1); // 周一
    });

    it('非周末日期应该保持不变', () => {
      const testDates = [
        '2026-03-27', // 周五
        '2026-03-30', // 周一
        '2026-03-31', // 周二
        '2026-04-01', // 周三
        '2026-04-02' // 周四
      ];

      testDates.forEach((dateStr) => {
        const original = new Date(dateStr);
        const adjusted = adjustForWeekend(original);

        expect(adjusted.getTime()).toBe(original.getTime());
      });
    });

    it('skipWeekends=false 时不应该调整日期', () => {
      // 2026-03-28 是周六
      const saturday = new Date('2026-03-28');
      const adjusted = adjustForWeekend(saturday, false);

      // 应该保持不变
      expect(adjusted.getTime()).toBe(saturday.getTime());
    });

    it('应该返回新对象而不是修改原对象', () => {
      const saturday = new Date('2026-03-28');
      const originalTime = saturday.getTime();

      const adjusted = adjustForWeekend(saturday);

      // 原对象不应该被修改
      expect(saturday.getTime()).toBe(originalTime);
      // 返回的是新对象
      expect(adjusted).not.toBe(saturday);
    });

    it('跨月调整应该正确', () => {
      // 2026-05-30 是周六 (月末)
      const saturdayEndOfMonth = new Date('2026-05-30');
      const adjusted = adjustForWeekend(saturdayEndOfMonth);

      // 应该调整为 2026-06-01 (周一)
      expect(adjusted.getMonth()).toBe(5); // 6 月
      expect(adjusted.getDate()).toBe(1);
    });

    it('跨年调整应该正确', () => {
      // 2026-12-26 是周六
      const saturdayEndOfYear = new Date('2026-12-26');
      const adjusted = adjustForWeekend(saturdayEndOfYear);

      // 应该调整为 2026-12-28 (周一)
      expect(adjusted.getFullYear()).toBe(2026);
      expect(adjusted.getMonth()).toBe(11); // 12 月
      expect(adjusted.getDate()).toBe(28);
    });
  });

  describe('边界场景', () => {
    it('应该处理无效日期', () => {
      const invalidDate = new Date('invalid');
      const result = adjustForWeekend(invalidDate);

      // 无效日期应该保持无效
      expect(isNaN(result.getTime())).toBe(true);
    });

    it('应该处理带时间的日期', () => {
      // 2026-03-28 10:30:00 (周六)
      const saturdayWithTime = new Date('2026-03-28T10:30:00');
      const adjusted = adjustForWeekend(saturdayWithTime);

      // 应该调整为周一，但保留时间部分
      expect(adjusted.getHours()).toBe(10);
      expect(adjusted.getMinutes()).toBe(30);
      expect(adjusted.getSeconds()).toBe(0);
    });
  });

  describe('实际应用场景', () => {
    it('lastFreeDate 为周末时应该顺延', () => {
      // 假设 lastFreeDate 是周六
      const lastFreeDate = new Date('2026-03-28');
      const adjustedLastFreeDate = adjustForWeekend(lastFreeDate);

      // 提柜日应该在调整后的 lastFreeDate 之前
      const plannedPickupDate = new Date(adjustedLastFreeDate);
      plannedPickupDate.setDate(plannedPickupDate.getDate() - 1);

      expect(plannedPickupDate.getDay()).not.toBe(6); // 不是周六
      expect(plannedPickupDate.getDay()).not.toBe(0); // 不是周日
    });

    it('deadLine 为周末时应该顺延至周一', () => {
      // 假设截止日期是周日
      const deadline = new Date('2026-03-29');
      const adjustedDeadline = adjustForWeekend(deadline);

      // 调整后的截止日期应该是周一
      expect(adjustedDeadline.getDay()).toBe(1); // 周一

      // 实际作业日期可以在调整后的截止日期之前
      const workDate = new Date(adjustedDeadline);
      workDate.setDate(workDate.getDate() - 1); // 周日

      // 但由于 skipWeekends，实际应该安排在周五
      const actualWorkDate = adjustForWeekend(workDate);
      expect(actualWorkDate.getDay()).toBe(1); // 周一
    });
  });
});
