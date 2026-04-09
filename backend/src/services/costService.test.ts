/**
 * CostService 单元测试
 * Tests for CostService dependency injection and error handling
 */

import { beforeEach, describe, expect, it } from '@jest/globals';
import { Repository } from 'typeorm';
import { InspectionRecord } from '../entities/InspectionRecord';
import { CostService } from '../services/costService';
import { DemurrageService } from '../services/demurrage.service';

describe('CostService', () => {
  let mockDemurrageService: jest.Mocked<DemurrageService>;
  let mockInspectionRepository: jest.Mocked<Repository<InspectionRecord>>;
  let costService: CostService;

  beforeEach(() => {
    // 创建 mock 依赖
    mockDemurrageService = {
      calculateForContainer: jest.fn()
    } as any;

    mockInspectionRepository = {
      find: jest.fn(),
      findOne: jest.fn()
    } as any;

    // 正常构造
    costService = new CostService(mockDemurrageService, mockInspectionRepository);
  });

  describe('构造函数依赖检查', () => {
    it('应该在 demurrageService 为 null 时抛出错误', () => {
      expect(() => {
        new CostService(null as any, mockInspectionRepository);
      }).toThrow('[CostService] DemurrageService dependency is required');
    });

    it('应该在 inspectionRepository 为 null 时抛出错误', () => {
      expect(() => {
        new CostService(mockDemurrageService, null as any);
      }).toThrow('[CostService] InspectionRecord repository is required');
    });

    it('应该在两个依赖都为 null 时抛出第一个错误', () => {
      expect(() => {
        new CostService(null as any, null as any);
      }).toThrow('[CostService] DemurrageService dependency is required');
    });
  });

  describe('calculateContainerCosts - 基本流程', () => {
    it('应该正确处理滞港费计算结果', async () => {
      // Mock 滞港费返回
      mockDemurrageService.calculateForContainer.mockResolvedValue({
        result: {
          containerNumber: 'TEST001',
          totalAmount: 100,
          currency: 'USD',
          items: [
            {
              chargeName: 'Demurrage',
              amount: 100,
              currency: 'USD',
              days: 5
            }
          ]
        } as any
      });

      const result = await costService.calculateContainerCosts('TEST001');

      expect(result.containerNumber).toBe('TEST001');
      expect(result.currency).toBe('USD');
      expect(result.items.length).toBeGreaterThan(0);
      expect(mockDemurrageService.calculateForContainer).toHaveBeenCalledWith('TEST001');
    });

    it('应该处理滞港费为空的情况', async () => {
      // Mock 滞港费返回空结果
      mockDemurrageService.calculateForContainer.mockResolvedValue({
        result: null
      } as any);

      const result = await costService.calculateContainerCosts('TEST001');

      expect(result.containerNumber).toBe('TEST001');
      // 即使没有滞港费，也应该有其他费用项或返回空数组
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('calculateMultipleContainersCosts - 批量计算', () => {
    it('应该能够处理多个货柜的批量计算', async () => {
      mockDemurrageService.calculateForContainer.mockResolvedValue({
        result: {
          containerNumber: 'TEST001',
          totalAmount: 100,
          currency: 'USD',
          items: []
        } as any
      });

      const results = await costService.calculateMultipleContainersCosts(['TEST001', 'TEST002']);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(mockDemurrageService.calculateForContainer).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCostSummary - 费用汇总', () => {
    it('应该返回汇总数据结构', async () => {
      const summary = await costService.getCostSummary({});

      expect(summary).toBeDefined();
      // 汇总应该包含基本的统计字段
      expect(typeof summary).toBe('object');
    });
  });
});
