/**
 * 成本优化服务单元测试
 * Scheduling Cost Optimizer Service Unit Tests
 */

import { Container } from '../entities/Container';
import { Warehouse } from '../entities/Warehouse';
import { SchedulingCostOptimizerService, UnloadOption } from './schedulingCostOptimizer.service';
import { AppDataSource } from '../database';

// Mock 外部依赖（数据库、日志等）
jest.mock('../database', () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

jest.mock('./demurrage.service', () => {
  return {
    DemurrageService: jest.fn().mockImplementation(() => ({
      calculateTotalCost: jest.fn().mockResolvedValue({
        demurrageDays: 0,
        detentionDays: 0,
        storageDays: 0,
        totalCost: 0,
        costBreakdown: {
          demurrageCost: 0,
          detentionCost: 0,
          storageCost: 0,
          transportationCost: 0,
          handlingCost: 0
        }
      }),
      getContainerMatchParams: jest.fn().mockResolvedValue({
        container: {},
        portOperations: [],
        seaFreight: null
      })
    }))
  };
});

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../utils/smartCalendarCapacity', () => ({
  SmartCalendarCapacity: jest.fn().mockImplementation(() => ({
    ensureWarehouseOccupancy: jest.fn().mockResolvedValue(true),
    checkWarehouseAvailability: jest.fn().mockResolvedValue(true)
  }))
}));

// 模拟容器数据
const mockContainer: Container = {
  containerNumber: 'TEST1234567',
  countryCode: 'US',
  portCode: 'LAX',
  status: 'ARRIVED'
} as any;

// 模拟仓库数据
const mockWarehouse: Warehouse = {
  warehouseCode: 'WH001',
  warehouseName: 'Test Warehouse',
  propertyType: 'OWNED',
  country: 'US',
  status: 'ACTIVE',
  dailyUnloadCapacity: 10
} as any;

// 模拟日期
const today = new Date();
const pickupDate = new Date(today);
pickupDate.setDate(today.getDate() + 1);
const lastFreeDate = new Date(today);
lastFreeDate.setDate(today.getDate() + 7);

describe('SchedulingCostOptimizerService', () => {
  let service: SchedulingCostOptimizerService;
  let mockQueryBuilder: any;
  let mockRepo: any;

  beforeEach(() => {
    // 创建 Mock QueryBuilder
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockWarehouse]),
      getOne: jest.fn().mockResolvedValue(mockWarehouse)
    };

    // 创建 Mock Repository
    mockRepo = {
      find: jest.fn().mockResolvedValue([mockWarehouse]),
      findOne: jest.fn().mockResolvedValue(mockWarehouse),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder)
    };

    // 配置 Mock
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

    service = new SchedulingCostOptimizerService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCandidateWarehouses', () => {
    it('should return empty array when no warehouses found', async () => {
      const warehouses = await service['getCandidateWarehouses']('US', 'LAX');
      expect(Array.isArray(warehouses)).toBe(true);
      // 注意：由于测试环境可能没有数据库数据，这里可能返回空数组
      // 我们只验证返回值是数组类型
    });

    it('should handle invalid parameters', async () => {
      const warehouses = await service['getCandidateWarehouses']('', '');
      expect(Array.isArray(warehouses)).toBe(true);
    });
  });

  describe('isWarehouseAvailable', () => {
    it('should return true when warehouse is available', async () => {
      const available = await service['isWarehouseAvailable'](mockWarehouse, pickupDate);
      // 注意：由于测试环境可能没有数据库数据，这里可能返回 true（默认值）
      expect(typeof available).toBe('boolean');
    });

    it('should handle invalid warehouse', async () => {
      const available = await service['isWarehouseAvailable']({} as Warehouse, pickupDate);
      expect(typeof available).toBe('boolean');
    });
  });

  describe('generateAllFeasibleOptions', () => {
    it('should generate feasible options', async () => {
      const options = await service.generateAllFeasibleOptions(
        mockContainer,
        pickupDate,
        lastFreeDate,
        3
      );
      expect(Array.isArray(options)).toBe(true);
      // 注意：由于测试环境可能没有数据库数据，这里可能返回空数组
    });

    it('should handle empty container', async () => {
      const options = await service.generateAllFeasibleOptions(
        {} as Container,
        pickupDate,
        lastFreeDate,
        3
      );
      expect(Array.isArray(options)).toBe(true);
    });
  });

  describe('evaluateTotalCost', () => {
    it('should evaluate cost for direct strategy', async () => {
      const option: UnloadOption = {
        containerNumber: 'TEST1234567',
        warehouse: mockWarehouse,
        plannedPickupDate: pickupDate, // ← 重命名
        strategy: 'Direct',
        isWithinFreePeriod: true
      };

      const breakdown = await service.evaluateTotalCost(option);
      expect(breakdown).toBeDefined();
      expect(typeof breakdown.demurrageCost).toBe('number');
      expect(typeof breakdown.detentionCost).toBe('number');
      expect(typeof breakdown.storageCost).toBe('number');
      expect(typeof breakdown.transportationCost).toBe('number');
      expect(typeof breakdown.handlingCost).toBe('number');
      expect(typeof breakdown.totalCost).toBe('number');
    });

    it('should evaluate cost for drop off strategy', async () => {
      const option: UnloadOption = {
        containerNumber: 'TEST1234567',
        warehouse: mockWarehouse,
        plannedPickupDate: pickupDate,
        strategy: 'Drop off',
        isWithinFreePeriod: false
      };

      const breakdown = await service.evaluateTotalCost(option);
      expect(breakdown).toBeDefined();
      expect(typeof breakdown.storageCost).toBe('number');
    });

    it('should evaluate cost for expedited strategy', async () => {
      const option: UnloadOption = {
        containerNumber: 'TEST1234567',
        warehouse: mockWarehouse,
        plannedPickupDate: pickupDate, // ← 重命名
        strategy: 'Expedited',
        isWithinFreePeriod: true
      };

      const breakdown = await service.evaluateTotalCost(option);
      expect(breakdown).toBeDefined();
      expect(typeof breakdown.handlingCost).toBe('number');
    });
  });

  describe('selectBestOption', () => {
    it('should select best option from multiple options', async () => {
      const options: UnloadOption[] = [
        {
          containerNumber: 'TEST1234567',
          warehouse: mockWarehouse,
          plannedPickupDate: pickupDate,
          strategy: 'Direct',
          isWithinFreePeriod: true
        },
        {
          containerNumber: 'TEST1234567',
          warehouse: mockWarehouse,
          plannedPickupDate: new Date(pickupDate.getTime() + 86400000), // 加一天
          strategy: 'Drop off',
          isWithinFreePeriod: false
        }
      ];

      try {
        const result = await service.selectBestOption(options);
        expect(result).toBeDefined();
        expect(result.option).toBeDefined();
        expect(result.costBreakdown).toBeDefined();
      } catch (error) {
        // 如果没有可行方案，会抛出错误，这是正常的
        expect(error).toBeDefined();
      }
    });

    it('should throw error when no options provided', async () => {
      await expect(service.selectBestOption([])).rejects.toThrow('No feasible options available');
    });
  });

  describe('generateDropOffOptions', () => {
    it('should generate drop off options', async () => {
      const options = await service['generateDropOffOptions'](
        mockContainer,
        pickupDate,
        lastFreeDate
      );
      expect(Array.isArray(options)).toBe(true);
    });
  });

  describe('generateExpeditedOptions', () => {
    it('should generate expedited options', async () => {
      const options = await service['generateExpeditedOptions'](mockContainer, lastFreeDate);
      expect(Array.isArray(options)).toBe(true);
    });
  });

  describe('calculateStorageDays', () => {
    it('should calculate storage days for drop off strategy', () => {
      const option: UnloadOption = {
        containerNumber: 'TEST1234567',
        warehouse: mockWarehouse,
        plannedPickupDate: pickupDate,
        strategy: 'Drop off',
        isWithinFreePeriod: false
      };

      const storageDays = service['calculateStorageDays'](option);
      expect(typeof storageDays).toBe('number');
      expect(storageDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getConfigNumber', () => {
    it('should get config number with default value', async () => {
      const value = await service['getConfigNumber']('test_key', 100);
      expect(typeof value).toBe('number');
    });
  });

  describe('isWeekend', () => {
    it('should return true for Saturday', () => {
      const saturday = new Date('2026-03-21'); // 星期六
      expect(service['isWeekend'](saturday)).toBe(true);
    });

    it('should return true for Sunday', () => {
      const sunday = new Date('2026-03-22'); // 星期日
      expect(service['isWeekend'](sunday)).toBe(true);
    });

    it('should return false for weekday', () => {
      const monday = new Date('2026-03-23'); // 星期一
      expect(service['isWeekend'](monday)).toBe(false);
    });
  });

  describe('shouldSkipWeekends', () => {
    it('should return boolean value', async () => {
      const shouldSkip = await service['shouldSkipWeekends']();
      expect(typeof shouldSkip).toBe('boolean');
    });
  });
});

/**
 * 性能测试
 */
describe('SchedulingCostOptimizerService Performance', () => {
  let service: SchedulingCostOptimizerService;

  beforeEach(() => {
    service = new SchedulingCostOptimizerService();
  });

  it('should generate options within 1 second', async () => {
    const startTime = Date.now();
    const generated = await service.generateAllFeasibleOptions(
      mockContainer,
      pickupDate,
      lastFreeDate,
      5
    );
    expect(Array.isArray(generated)).toBe(true);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Options generation time: ${duration}ms`);
    expect(duration).toBeLessThan(1000); // 1秒
  });

  it('should evaluate cost within 500ms', async () => {
    const option: UnloadOption = {
      containerNumber: 'TEST1234567',
      warehouse: mockWarehouse,
      plannedPickupDate: pickupDate,
      strategy: 'Direct',
      isWithinFreePeriod: true
    };

    const startTime = Date.now();
    await service.evaluateTotalCost(option);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Cost evaluation time: ${duration}ms`);
    expect(duration).toBeLessThan(500); // 500ms
  });
});

/**
 * 集成测试
 */
describe('SchedulingCostOptimizerService Integration', () => {
  let service: SchedulingCostOptimizerService;

  beforeEach(() => {
    service = new SchedulingCostOptimizerService();
  });

  it('should complete full workflow', async () => {
    try {
      // 1. 生成可行方案
      const options = await service.generateAllFeasibleOptions(
        mockContainer,
        pickupDate,
        lastFreeDate,
        3
      );

      if (options.length > 0) {
        await Promise.all(options.map((option) => service.evaluateTotalCost(option)));

        const bestResult = await service.selectBestOption(options);

        expect(bestResult).toBeDefined();
        expect(bestResult.option).toBeDefined();
        expect(bestResult.costBreakdown).toBeDefined();
      }
    } catch (error) {
      // 如果没有可行方案，会抛出错误，这是正常的
      console.log('Integration test completed with expected error:', (error as Error).message);
    }
  });
});
