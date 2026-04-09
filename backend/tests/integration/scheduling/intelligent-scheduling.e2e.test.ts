/**
 * 智能排产服务集成测试
 * Intelligent Scheduling Service Integration Tests
 *
 * 端到端业务流程测试，验证完整功能链
 */

import { AppDataSource } from '../../../src/database';
import { IntelligentSchedulingService } from '../../../src/services/intelligentScheduling.service';

describe('IntelligentSchedulingService - E2E Tests', () => {
  let service: IntelligentSchedulingService;

  // 测试前初始化
  beforeAll(async () => {
    // 初始化数据库连接
    await AppDataSource.initialize();

    // 创建服务实例
    service = new IntelligentSchedulingService();
  });

  // 测试后清理
  afterAll(async () => {
    await AppDataSource.destroy();
  });

  describe('batchSchedule - 批量排产完整流程', () => {
    it('should handle empty container list gracefully', async () => {
      // Arrange: 空数据集（使用不存在的港口）
      const mockRequest = {
        portCode: 'INVALID_PORT',
        skip: 0,
        limit: 10
      };

      // Act: 执行排产
      const result = await service.batchSchedule(mockRequest);

      // Assert: 应该返回空结果但不报错
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should respect pagination parameters (skip/limit)', async () => {
      // Arrange: 测试分页参数
      const mockRequest = {
        skip: 0,
        limit: 5
      };

      // Act: 执行排产
      const result = await service.batchSchedule(mockRequest);

      // Assert: 验证分页逻辑
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Edge Cases - 边界条件测试', () => {
    it('should handle null/undefined inputs gracefully', async () => {
      // Test various invalid inputs
      await expect(service.batchSchedule(null as any)).rejects.toThrow();
      await expect(service.batchSchedule(undefined as any)).rejects.toThrow();
    });
  });
});
