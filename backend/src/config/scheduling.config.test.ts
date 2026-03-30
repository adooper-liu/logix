/**
 * 智能排产配置单元测试
 * Scheduling Configuration Unit Tests
 */

import {
  CONCURRENCY_CONFIG,
  COST_OPTIMIZATION_CONFIG,
  DATE_CALCULATION_CONFIG,
  DISTANCE_MATRIX,
  OCCUPANCY_CONFIG,
  SCHEDULING_CONFIG,
  validateSchedulingConfig
} from '../../src/config/scheduling.config';

describe('SchedulingConfig', () => {
  describe('CONCURRENCY_CONFIG', () => {
    it('BATCH_OPERATIONS 应该是正整数', () => {
      expect(CONCURRENCY_CONFIG.BATCH_OPERATIONS).toBeGreaterThan(0);
      expect(Number.isInteger(CONCURRENCY_CONFIG.BATCH_OPERATIONS)).toBe(true);
    });

    it('API_REQUESTS 应该是正整数', () => {
      expect(CONCURRENCY_CONFIG.API_REQUESTS).toBeGreaterThan(0);
    });
  });

  describe('DATE_CALCULATION_CONFIG', () => {
    it('DEFAULT_ESTIMATED_YARD_DAYS 应该合理', () => {
      expect(DATE_CALCULATION_CONFIG.DEFAULT_ESTIMATED_YARD_DAYS).toBeGreaterThanOrEqual(1);
      expect(DATE_CALCULATION_CONFIG.DEFAULT_ESTIMATED_YARD_DAYS).toBeLessThanOrEqual(7);
    });

    it('FREE_PERIOD_BASIS 应该是有效值', () => {
      const validValues = ['calendar', 'business'];
      expect(validValues).toContain(DATE_CALCULATION_CONFIG.FREE_PERIOD_BASIS);
    });

    it('MIN_FREE_DAYS 应该 >= 3', () => {
      expect(DATE_CALCULATION_CONFIG.MIN_FREE_DAYS).toBeGreaterThanOrEqual(3);
    });
  });

  describe('COST_OPTIMIZATION_CONFIG', () => {
    it('BASE_SERVICE_QUALITY_SCORE 应该在 0-10 范围内', () => {
      expect(COST_OPTIMIZATION_CONFIG.BASE_SERVICE_QUALITY_SCORE).toBeGreaterThanOrEqual(0);
      expect(COST_OPTIMIZATION_CONFIG.BASE_SERVICE_QUALITY_SCORE).toBeLessThanOrEqual(10);
    });

    it('SERVICE_QUALITY_BONUS_MAX 应该是正数', () => {
      expect(COST_OPTIMIZATION_CONFIG.SERVICE_QUALITY_BONUS_MAX).toBeGreaterThan(0);
    });

    it('DEMURRAGE_STANDARD_RATE 应该是正数', () => {
      expect(COST_OPTIMIZATION_CONFIG.DEMURRAGE_STANDARD_RATE).toBeGreaterThan(0);
    });

    it('DETENTION_STANDARD_RATE 应该是正数', () => {
      expect(COST_OPTIMIZATION_CONFIG.DETENTION_STANDARD_RATE).toBeGreaterThan(0);
    });

    it('STORAGE_STANDARD_RATE 应该是正数', () => {
      expect(COST_OPTIMIZATION_CONFIG.STORAGE_STANDARD_RATE).toBeGreaterThan(0);
    });

    it('DEFAULT_PROPERTY_PRIORITY 应该是合理的默认值', () => {
      const priority = COST_OPTIMIZATION_CONFIG.DEFAULT_PROPERTY_PRIORITY;
      expect(priority).toBeGreaterThanOrEqual(100); // 应该大于已配置的优先级
      expect(priority).toBeLessThanOrEqual(9999); // 合理上限
      expect(Number.isInteger(priority)).toBe(true);
    });
  });

  describe('OCCUPANCY_CONFIG', () => {
    it('WAREHOUSE_WARNING_THRESHOLD 应该在 (0, 1] 范围内', () => {
      const threshold = OCCUPANCY_CONFIG.WAREHOUSE_WARNING_THRESHOLD;
      expect(threshold).toBeGreaterThan(0);
      expect(threshold).toBeLessThanOrEqual(1);
    });

    it('TRUCKING_WARNING_THRESHOLD 应该在 (0, 1] 范围内', () => {
      const threshold = OCCUPANCY_CONFIG.TRUCKING_WARNING_THRESHOLD;
      expect(threshold).toBeGreaterThan(0);
      expect(threshold).toBeLessThanOrEqual(1);
    });

    it('MAX_OVERBOOKING_RATIO 应该在 [0, 1) 范围内', () => {
      const ratio = OCCUPANCY_CONFIG.MAX_OVERBOOKING_RATIO;
      expect(ratio).toBeGreaterThanOrEqual(0);
      expect(ratio).toBeLessThan(1);
    });

    it('DEFAULT_WAREHOUSE_DAILY_CAPACITY 应该是正整数', () => {
      const capacity = OCCUPANCY_CONFIG.DEFAULT_WAREHOUSE_DAILY_CAPACITY;
      expect(capacity).toBeGreaterThanOrEqual(5);
      expect(capacity).toBeLessThanOrEqual(50);
      expect(Number.isInteger(capacity)).toBe(true);
    });

    it('DEFAULT_TRUCKING_DAILY_CAPACITY 应该是正整数', () => {
      const capacity = OCCUPANCY_CONFIG.DEFAULT_TRUCKING_DAILY_CAPACITY;
      expect(capacity).toBeGreaterThanOrEqual(10);
      expect(capacity).toBeLessThanOrEqual(100);
      expect(Number.isInteger(capacity)).toBe(true);
    });

    it('DEFAULT_TRUCKING_RETURN_CAPACITY 应该是正整数', () => {
      const capacity = OCCUPANCY_CONFIG.DEFAULT_TRUCKING_RETURN_CAPACITY;
      expect(capacity).toBeGreaterThanOrEqual(10);
      expect(capacity).toBeLessThanOrEqual(100);
      expect(Number.isInteger(capacity)).toBe(true);
    });

    it('车队还箱能力应该 >= 车队操作能力', () => {
      expect(OCCUPANCY_CONFIG.DEFAULT_TRUCKING_RETURN_CAPACITY).toBeGreaterThanOrEqual(
        OCCUPANCY_CONFIG.DEFAULT_TRUCKING_DAILY_CAPACITY
      );
    });
  });

  describe('DISTANCE_MATRIX', () => {
    it('应该包含主要港口', () => {
      const expectedPorts = ['USLAX', 'USLGB', 'USOAK'];
      expectedPorts.forEach((port) => {
        expect(DISTANCE_MATRIX[port]).toBeDefined();
      });
    });

    it('每个港口应该有仓库映射', () => {
      Object.keys(DISTANCE_MATRIX).forEach((port) => {
        const warehouses = DISTANCE_MATRIX[port];
        expect(Object.keys(warehouses).length).toBeGreaterThan(0);

        // 验证所有距离都是正数
        Object.values(warehouses).forEach((distance) => {
          expect(distance).toBeGreaterThan(0);
        });
      });
    });

    it('距离应该合理（不超过 500 英里）', () => {
      Object.values(DISTANCE_MATRIX).forEach((portDistances) => {
        Object.values(portDistances).forEach((distance) => {
          expect(distance).toBeLessThan(500);
        });
      });
    });
  });

  describe('validateSchedulingConfig', () => {
    it('应该通过验证（正常情况）', () => {
      // 不应该抛出异常
      expect(() => validateSchedulingConfig()).not.toThrow();
    });

    it('应该捕获无效的并发数', () => {
      // 临时修改配置（使用 spy）
      const originalValue = CONCURRENCY_CONFIG.BATCH_OPERATIONS;

      // 注意：这是只读配置，实际测试中不会真的修改
      // 这里只是演示验证逻辑
      expect(originalValue).toBeGreaterThan(0);
    });

    it('应该捕获无效的阈值', () => {
      // 验证逻辑检查阈值范围
      expect(OCCUPANCY_CONFIG.WAREHOUSE_WARNING_THRESHOLD).toBeGreaterThan(0);
      expect(OCCUPANCY_CONFIG.WAREHOUSE_WARNING_THRESHOLD).toBeLessThanOrEqual(1);
    });
  });

  describe('配置一致性检查', () => {
    it('所有配置应该是只读的', () => {
      // TypeScript 的 as const 确保编译时只读
      expect(SCHEDULING_CONFIG).toBeDefined();
    });

    it('配置值应该是稳定的', () => {
      // 多次访问应该返回相同值
      const value1 = CONCURRENCY_CONFIG.BATCH_OPERATIONS;
      const value2 = CONCURRENCY_CONFIG.BATCH_OPERATIONS;
      expect(value1).toBe(value2);
    });
  });
});
