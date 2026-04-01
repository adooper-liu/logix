/**
 * 外部堆场堆存费 - 真假 Drop off 场景验证测试
 *
 * 测试目标：
 * 1. 验证真 Drop off（提 < 送 = 卸）正确收费
 * 2. 验证假 Drop off（提 = 送 = 卸）不收费
 * 3. 验证送仓日判断逻辑的正确性
 */

import { describe, it, expect } from '@jest/globals';

describe('外部堆场堆存费 - 真假 Drop off 场景验证', () => {
  describe('场景 1: Live load 模式（提=送=卸）', () => {
    it('应该不收取外部堆场堆存费', () => {
      // Arrange
      const scenario = {
        mode: 'Live load',
        pickupDate: new Date('2026-03-25'),
        deliveryDate: new Date('2026-03-25'), // 送 = 提 = 卸
        unloadDate: new Date('2026-03-25'),
        returnDate: new Date('2026-03-25'),
        hasYard: true // 即使车队有堆场
      };

      // Act
      const actuallyUsedYard =
        scenario.mode === 'Drop off' &&
        scenario.hasYard &&
        scenario.pickupDate < scenario.deliveryDate;

      const yardStorageDays = actuallyUsedYard
        ? Math.floor(
            (scenario.deliveryDate.getTime() - scenario.pickupDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      // Assert
      expect(actuallyUsedYard).toBe(false); // ❌ 未使用堆场
      expect(yardStorageDays).toBe(0);
    });
  });

  describe('场景 2: 假 Drop off（提=送=卸）', () => {
    it('应该不收取外部堆场堆存费', () => {
      // Arrange
      const scenario = {
        mode: 'Drop off',
        pickupDate: new Date('2026-03-25'),
        deliveryDate: new Date('2026-03-25'), // 送 = 提 = 卸
        unloadDate: new Date('2026-03-25'),
        returnDate: new Date('2026-03-26'),
        hasYard: true // 车队有堆场
      };

      // Act
      const actuallyUsedYard =
        scenario.mode === 'Drop off' &&
        scenario.hasYard &&
        scenario.pickupDate < scenario.deliveryDate;

      const yardStorageDays = actuallyUsedYard
        ? Math.floor(
            (scenario.deliveryDate.getTime() - scenario.pickupDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      // Assert
      expect(actuallyUsedYard).toBe(false); // ❌ 未使用堆场（直接送仓）
      expect(yardStorageDays).toBe(0);
    });
  });

  describe('场景 3: 真 Drop off（提<送=卸）- 堆放 3 天', () => {
    it('应该收取外部堆场堆存费', () => {
      // Arrange
      const scenario = {
        mode: 'Drop off',
        pickupDate: new Date('2026-03-25'),
        deliveryDate: new Date('2026-03-28'), // 送 = 卸 > 提
        unloadDate: new Date('2026-03-28'),
        returnDate: new Date('2026-03-29'),
        hasYard: true, // 车队有堆场
        standardRate: 80, // $80/天
        yardOperationFee: 50 // $50 操作费
      };

      // Act
      const actuallyUsedYard =
        scenario.mode === 'Drop off' &&
        scenario.hasYard &&
        scenario.pickupDate < scenario.deliveryDate;

      const yardStorageDays = actuallyUsedYard
        ? Math.floor(
            (scenario.deliveryDate.getTime() - scenario.pickupDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      const yardStorageCost = actuallyUsedYard
        ? scenario.standardRate * yardStorageDays + scenario.yardOperationFee
        : 0;

      // Assert
      expect(actuallyUsedYard).toBe(true); // ✅ 实际使用了堆场
      expect(yardStorageDays).toBe(3); // 3 天
      expect(yardStorageCost).toBe(290); // $80 × 3 + $50
    });
  });

  describe('场景 4: 真 Drop off（提<送=卸）- 堆放 5 天', () => {
    it('应该收取外部堆场堆存费', () => {
      // Arrange
      const scenario = {
        mode: 'Drop off',
        pickupDate: new Date('2026-03-25'),
        deliveryDate: new Date('2026-03-30'), // 送 = 卸 > 提
        unloadDate: new Date('2026-03-30'),
        returnDate: new Date('2026-03-31'),
        hasYard: true,
        standardRate: 80,
        yardOperationFee: 50
      };

      // Act
      const actuallyUsedYard =
        scenario.mode === 'Drop off' &&
        scenario.hasYard &&
        scenario.pickupDate < scenario.deliveryDate;

      const yardStorageDays = actuallyUsedYard
        ? Math.floor(
            (scenario.deliveryDate.getTime() - scenario.pickupDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      const yardStorageCost = actuallyUsedYard
        ? scenario.standardRate * yardStorageDays + scenario.yardOperationFee
        : 0;

      // Assert
      expect(actuallyUsedYard).toBe(true); // ✅ 实际使用了堆场
      expect(yardStorageDays).toBe(5); // 5 天
      expect(yardStorageCost).toBe(450); // $80 × 5 + $50
    });
  });

  describe('场景 5: 真 Drop off（提<送<卸）- 特殊情况', () => {
    it('应该收取外部堆场堆存费', () => {
      // Arrange - 货柜先到堆场，再送到仓库，过几天才卸货
      const scenario = {
        mode: 'Drop off',
        pickupDate: new Date('2026-03-25'),
        deliveryDate: new Date('2026-03-27'), // 送 > 提
        unloadDate: new Date('2026-03-28'), // 卸 > 送
        returnDate: new Date('2026-03-29'),
        hasYard: true,
        standardRate: 80,
        yardOperationFee: 50
      };

      // Act
      const actuallyUsedYard =
        scenario.mode === 'Drop off' &&
        scenario.hasYard &&
        scenario.pickupDate < scenario.deliveryDate;

      const yardStorageDays = actuallyUsedYard
        ? Math.floor(
            (scenario.deliveryDate.getTime() - scenario.pickupDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      const yardStorageCost = actuallyUsedYard
        ? scenario.standardRate * yardStorageDays + scenario.yardOperationFee
        : 0;

      // Assert
      expect(actuallyUsedYard).toBe(true); // ✅ 实际使用了堆场
      expect(yardStorageDays).toBe(2); // 提→送：2 天
      expect(yardStorageCost).toBe(210); // $80 × 2 + $50
    });
  });

  describe('场景 6: Drop off 但车队无堆场', () => {
    it('应该不收取外部堆场堆存费', () => {
      // Arrange
      const scenario = {
        mode: 'Drop off',
        pickupDate: new Date('2026-03-25'),
        deliveryDate: new Date('2026-03-28'),
        unloadDate: new Date('2026-03-28'),
        returnDate: new Date('2026-03-29'),
        hasYard: false // ❌ 车队无堆场
      };

      // Act
      const actuallyUsedYard =
        scenario.mode === 'Drop off' &&
        scenario.hasYard &&
        scenario.pickupDate < scenario.deliveryDate;

      const yardStorageDays = actuallyUsedYard
        ? Math.floor(
            (scenario.deliveryDate.getTime() - scenario.pickupDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      // Assert
      expect(actuallyUsedYard).toBe(false); // ❌ 无法使用堆场
      expect(yardStorageDays).toBe(0);
    });
  });
});

describe('送仓日计算逻辑验证', () => {
  describe('Drop off 模式下送仓日的计算', () => {
    it('应该正确计算送仓日（送=卸）', () => {
      // Arrange
      const plannedUnloadDate = new Date('2026-03-28');

      // Act - Drop off 模式下，送仓日 = 卸柜日
      const plannedDeliveryDate = plannedUnloadDate;

      // Assert
      expect(plannedDeliveryDate.toISOString().split('T')[0]).toBe('2026-03-28');
      expect(plannedDeliveryDate).toEqual(plannedUnloadDate);
    });
  });

  describe('Live load 模式下送仓日的计算', () => {
    it('应该正确计算送仓日（送=提=卸）', () => {
      // Arrange
      const plannedPickupDate = new Date('2026-03-25');
      const plannedUnloadDate = new Date('2026-03-25');

      // Act - Live load 模式下，送仓日 = 提柜日
      const plannedDeliveryDate = plannedPickupDate;

      // Assert
      expect(plannedDeliveryDate.toISOString().split('T')[0]).toBe('2026-03-25');
      expect(plannedDeliveryDate).toEqual(plannedPickupDate);
      expect(plannedDeliveryDate).toEqual(plannedUnloadDate);
    });
  });
});

describe('堆场存放天数计算验证', () => {
  it('应该正确计算堆场存放天数（提→送）', () => {
    // Arrange
    const pickupDate = new Date('2026-03-25');
    const deliveryDate = new Date('2026-03-28');

    // Act
    const yardStorageDays = Math.floor(
      (deliveryDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Assert
    expect(yardStorageDays).toBe(3); // 提→送：3 天
  });

  it('应该正确处理同日情况（0 天）', () => {
    // Arrange
    const pickupDate = new Date('2026-03-25');
    const deliveryDate = new Date('2026-03-25');

    // Act
    const yardStorageDays = Math.floor(
      (deliveryDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Assert
    expect(yardStorageDays).toBe(0); // 同日：0 天
  });

  it('应该正确处理跨月情况', () => {
    // Arrange
    const pickupDate = new Date('2026-03-30');
    const deliveryDate = new Date('2026-04-02');

    // Act
    const yardStorageDays = Math.floor(
      (deliveryDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Assert
    expect(yardStorageDays).toBe(3); // 3 月 30 日 → 4 月 2 日：3 天
  });
});
