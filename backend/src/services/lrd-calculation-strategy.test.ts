/**
 * LRD (Last Return Date) 计算与写回策略测试
 *
 * 验证三种场景的完整支持：
 *   场景① forecast + 无计划提柜：从 LFD 起算
 *   场景② forecast + 有计划提柜：从计划提柜日起算
 *   场景③ actual + 有实际提柜：从实际提柜日起算
 */

import { describe, it, expect } from '@jest/globals';

/**
 * 辅助函数：模拟 LRD 计算逻辑（修复后的版本）
 */
function calculateLRD(
  calculationMode: 'actual' | 'forecast',
  pickupDateActual: Date | null,
  plannedPickupDate: Date | null,
  computedLastFreeDate: Date | null,
  freeDays: number = 7
): { lrd: Date | null; scenario: string } {
  // ⭐ 三种场景完整支持
  let pickupBasisForDetention: Date | null;

  if (calculationMode === 'actual') {
    // ③ actual 模式：使用实际提柜日
    pickupBasisForDetention = pickupDateActual;
  } else {
    // forecast 模式
    if (plannedPickupDate) {
      // ② 有计划提柜日：使用计划提柜日
      pickupBasisForDetention = plannedPickupDate;
    } else if (computedLastFreeDate) {
      // ① 无计划提柜日：使用 LFD 作为 fallback
      pickupBasisForDetention = computedLastFreeDate;
    } else {
      // 都没有：无法计算
      pickupBasisForDetention = null;
    }
  }

  let computedLastReturnDate: Date | null = null;
  if (pickupBasisForDetention) {
    const n = freeDays - 1;
    computedLastReturnDate = new Date(pickupBasisForDetention);
    computedLastReturnDate.setDate(computedLastReturnDate.getDate() + n);
  }

  // 确定场景标识
  let scenario: string;
  if (calculationMode === 'actual' && pickupDateActual) {
    scenario = '③ actual + 有实际提柜';
  } else if (calculationMode === 'forecast' && plannedPickupDate) {
    scenario = '② forecast + 有计划提柜';
  } else if (calculationMode === 'forecast' && !plannedPickupDate && computedLastFreeDate) {
    scenario = '① forecast + 无计划提柜 (LFD fallback)';
  } else {
    scenario = '无法计算';
  }

  return { lrd: computedLastReturnDate, scenario };
}

/**
 * 辅助函数：模拟 LRD 写回逻辑（修复后的版本）
 */
function shouldWriteBackLRD(
  computedLastReturnDate: Date | null,
  _isSingleContainerUpdate: boolean = false
): boolean {
  // ✅ 修复后：只要有计算结果就写回
  if (computedLastReturnDate) {
    return true;
  }
  return false;
}

describe('LRD 计算与写回策略 - 三种场景验证', () => {
  describe('场景①: Forecast + 无计划提柜 (使用 LFD fallback)', () => {
    it('应该使用 LFD 计算 LRD', () => {
      // Arrange
      const mode = 'forecast';
      const actualPickup = null;
      const plannedPickup = null;
      const lfd = new Date('2026-02-18');

      // Act
      const { lrd, scenario } = calculateLRD(mode, actualPickup, plannedPickup, lfd);

      // Assert
      expect(scenario).toBe('① forecast + 无计划提柜 (LFD fallback)');
      expect(lrd).not.toBeNull();
      expect(lrd?.toISOString().split('T')[0]).toBe('2026-02-24'); // LFD + 6 天
    });

    it('应该允许写回 LRD（批量更新）', () => {
      const lrd = new Date('2026-02-24');
      expect(shouldWriteBackLRD(lrd)).toBe(true);
    });
  });

  describe('场景②: Forecast + 有计划提柜', () => {
    it('应该使用计划提柜日计算 LRD', () => {
      // Arrange
      const mode = 'forecast';
      const actualPickup = null;
      const plannedPickup = new Date('2026-02-20');
      const lfd = new Date('2026-02-18');

      // Act
      const { lrd, scenario } = calculateLRD(mode, actualPickup, plannedPickup, lfd);

      // Assert
      expect(scenario).toBe('② forecast + 有计划提柜');
      expect(lrd).not.toBeNull();
      expect(lrd?.toISOString().split('T')[0]).toBe('2026-02-26'); // Planned + 6 天
    });

    it('应该允许写回 LRD（批量更新）', () => {
      const lrd = new Date('2026-02-26');
      expect(shouldWriteBackLRD(lrd)).toBe(true);
    });
  });

  describe('场景③: Actual + 有实际提柜', () => {
    it('应该使用实际提柜日计算 LRD', () => {
      // Arrange
      const mode = 'actual';
      const actualPickup = new Date('2026-02-15');
      const plannedPickup = null;
      const lfd = new Date('2026-02-18');

      // Act
      const { lrd, scenario } = calculateLRD(mode, actualPickup, plannedPickup, lfd);

      // Assert
      expect(scenario).toBe('③ actual + 有实际提柜');
      expect(lrd).not.toBeNull();
      expect(lrd?.toISOString().split('T')[0]).toBe('2026-02-21'); // Actual + 6 天
    });

    it('应该允许写回 LRD（批量更新）', () => {
      const lrd = new Date('2026-02-21');
      expect(shouldWriteBackLRD(lrd)).toBe(true);
    });
  });

  describe('写回策略对比', () => {
    it('批量/定时更新应该支持所有三种场景', () => {
      const lrd1 = new Date('2026-02-24'); // 场景①
      const lrd2 = new Date('2026-02-26'); // 场景②
      const lrd3 = new Date('2026-02-21'); // 场景③

      expect(shouldWriteBackLRD(lrd1)).toBe(true);
      expect(shouldWriteBackLRD(lrd2)).toBe(true);
      expect(shouldWriteBackLRD(lrd3)).toBe(true);
    });

    it('单柜更新应该强制覆盖所有场景', () => {
      const lrd1 = new Date('2026-02-24'); // 场景①
      const lrd2 = new Date('2026-02-26'); // 场景②
      const lrd3 = new Date('2026-02-21'); // 场景③

      expect(shouldWriteBackLRD(lrd1, true)).toBe(true);
      expect(shouldWriteBackLRD(lrd2, true)).toBe(true);
      expect(shouldWriteBackLRD(lrd3, true)).toBe(true);
    });
  });

  describe('边界情况测试', () => {
    it('当没有任何可用日期时应该返回 null', () => {
      const mode = 'forecast';
      const actualPickup = null;
      const plannedPickup = null;
      const lfd = null;

      const { lrd, scenario } = calculateLRD(mode, actualPickup, plannedPickup, lfd);

      expect(scenario).toBe('无法计算');
      expect(lrd).toBeNull();
    });

    it('当没有计算结果时不应该写回', () => {
      expect(shouldWriteBackLRD(null)).toBe(false);
    });
  });
});
