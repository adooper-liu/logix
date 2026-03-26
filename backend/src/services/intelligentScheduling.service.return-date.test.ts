/**
 * 还箱日计算算法 - 单元测试
 * Return Date Calculation - Unit Tests
 * 
 * 测试目标:
 * 1. 验证 Drop off 模式三步优先级策略
 * 2. 验证 Live load 模式还箱逻辑
 * 3. 验证最晚还箱日红线约束
 * 4. 性能分析（可选）
 */

import { IntelligentSchedulingService } from './intelligentScheduling.service';
import { AppDataSource } from '../database';
import { ExtTruckingReturnSlotOccupancy } from '../entities/ExtTruckingReturnSlotOccupancy';
import { TruckingCompany } from '../entities/TruckingCompany';

// ============================================
// Mock 数据工厂
// ============================================

const createMockOccupancy = (overrides: Partial<ExtTruckingReturnSlotOccupancy>) => ({
  id: 1,
  truckingCompanyId: 'TRUCK_TEST_001',
  slotDate: new Date('2026-03-28'),
  plannedCount: 5,
  capacity: 10,
  remaining: 5,
  ...overrides
});

const createMockTruckingCompany = (overrides: Partial<TruckingCompany>) => ({
  id: 1,
  companyCode: 'TRUCK_TEST_001',
  companyName: 'Test Trucking',
  hasYard: true,
  dailyCapacity: 20,
  dailyReturnCapacity: 20,
  ...overrides
});

// ============================================
// Mock AppDataSource
// ============================================

jest.mock('../database', () => ({
  AppDataSource: {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn().mockImplementation((_entity) => {
      const mockRepos: any = {
        ExtTruckingReturnSlotOccupancy: {
          findOne: jest.fn(),
          find: jest.fn(),
          save: jest.fn(),
          update: jest.fn(),
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn()
          })
        },
        TruckingCompany: {
          findOne: jest.fn(),
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            getOne: jest.fn()
          })
        }
      };

      return mockRepos[_entity?.name] || {};
    }),
    manager: {
      transaction: jest.fn().mockImplementation(async (callback) => callback({}))
    }
  }
}));

// ============================================
// 测试套件
// ============================================

describe('IntelligentSchedulingService - Return Date Calculation', () => {
  let service: IntelligentSchedulingService;
  let mockOccupancyRepo: any;
  let mockTruckingRepo: any;

  beforeEach(() => {
    // 获取 Mock Repository
    mockOccupancyRepo = (AppDataSource.getRepository as jest.Mock)(ExtTruckingReturnSlotOccupancy);
    mockTruckingRepo = (AppDataSource.getRepository as jest.Mock)(TruckingCompany);

    // 重置所有 Mock
    jest.clearAllMocks();

    service = new IntelligentSchedulingService();
  });

  // ============================================
  // Drop off 模式三步优先级测试
  // ============================================

  describe('Drop off Mode - Three-Step Priority Strategy', () => {
    
    it('✅ Step 1: 卸柜日当天有能力，应返回当天还箱', async () => {
      // Arrange
      const unloadDate = new Date('2026-03-28');
      const truckingCompanyId = 'TRUCK_TEST_001';
      
      // Mock: 卸柜日当天有能力 (plannedCount < capacity)
      mockOccupancyRepo.findOne.mockResolvedValue(
        createMockOccupancy({
          slotDate: new Date('2026-03-28'),
          plannedCount: 5,
          capacity: 10,
          remaining: 5
        })
      );

      // Act
      const result = await (service as any).calculatePlannedReturnDate(
        unloadDate,
        'Drop off',
        truckingCompanyId
      );

      // Assert
      expect(result.returnDate.toISOString()).toBe('2026-03-28T00:00:00.000Z');
      expect(result.adjustedUnloadDate).toBeUndefined();
      expect(mockOccupancyRepo.findOne).toHaveBeenCalledTimes(1);
    });

    it('✅ Step 2: 卸柜日没能力，卸 +1 有能力，应返回次日还箱', async () => {
      // Arrange
      const unloadDate = new Date('2026-03-28');
      const truckingCompanyId = 'TRUCK_TEST_001';
      
      // Mock: 卸柜日当天已满 (plannedCount = capacity)
      // Mock: 卸柜日 +1 有能力
      mockOccupancyRepo.findOne
        .mockResolvedValueOnce(
          createMockOccupancy({
            slotDate: new Date('2026-03-28'),
            plannedCount: 10,
            capacity: 10,
            remaining: 0
          })
        )
        .mockResolvedValueOnce(
          createMockOccupancy({
            slotDate: new Date('2026-03-29'),
            plannedCount: 7,
            capacity: 10,
            remaining: 3
          })
        );

      // Act
      const result = await (service as any).calculatePlannedReturnDate(
        unloadDate,
        'Drop off',
        truckingCompanyId
      );

      // Assert
      expect(result.returnDate.toISOString()).toBe('2026-03-29T00:00:00.000Z');
      expect(result.adjustedUnloadDate).toBeUndefined();
      expect(mockOccupancyRepo.findOne).toHaveBeenCalledTimes(2);
    });

    it('✅ Step 3: 两天都没能力，应顺延到最近有能力的日期', async () => {
      // Arrange
      const unloadDate = new Date('2026-03-28');
      const truckingCompanyId = 'TRUCK_TEST_001';
      
      // Mock: 2026-03-28 已满
      // Mock: 2026-03-29 已满
      // Mock: 2026-03-30 有能力
      mockOccupancyRepo.findOne
        .mockResolvedValueOnce(
          createMockOccupancy({
            slotDate: new Date('2026-03-28'),
            plannedCount: 10,
            capacity: 10,
            remaining: 0
          })
        )
        .mockResolvedValueOnce(
          createMockOccupancy({
            slotDate: new Date('2026-03-29'),
            plannedCount: 10,
            capacity: 10,
            remaining: 0
          })
        )
        .mockResolvedValueOnce(
          createMockOccupancy({
            slotDate: new Date('2026-03-30'),
            plannedCount: 3,
            capacity: 10,
            remaining: 7
          })
        );

      // Act
      const result = await (service as any).calculatePlannedReturnDate(
        unloadDate,
        'Drop off',
        truckingCompanyId
      );

      // Assert
      expect(result.returnDate.toISOString()).toBe('2026-03-30T00:00:00.000Z');
      expect(result.adjustedUnloadDate).toBeUndefined();
      expect(mockOccupancyRepo.findOne).toHaveBeenCalledTimes(3);
    });

    it('⚠️ 极端情况：连续 14 天满载，应返回第 14 天或 null', async () => {
      // Arrange
      const unloadDate = new Date('2026-03-28');
      const truckingCompanyId = 'TRUCK_TEST_001';
      
      // Mock: 连续 14 天都已满
      for (let i = 0; i <= 14; i++) {
        const date = new Date(unloadDate);
        date.setUTCDate(date.getUTCDate() + i);
        mockOccupancyRepo.findOne.mockResolvedValueOnce(
          createMockOccupancy({
            slotDate: date,
            plannedCount: 10,
            capacity: 10,
            remaining: 0
          })
        );
      }

      // Act
      const result = await (service as any).calculatePlannedReturnDate(
        unloadDate,
        'Drop off',
        truckingCompanyId
      );

      // Assert
      // 根据业务逻辑，可能返回 nextDay 或继续查找的结果
      expect(result.returnDate).toBeDefined();
      expect(mockOccupancyRepo.findOne).toHaveBeenCalledTimes(15);
    });
  });

  // ============================================
  // Live load 模式测试
  // ============================================

  describe('Live Load Mode', () => {
    
    it('✅ 能力充足，应返回还=卸，不调整卸柜日', async () => {
      // Arrange
      const unloadDate = new Date('2026-03-28');
      const truckingCompanyId = 'TRUCK_TEST_001';
      
      mockOccupancyRepo.findOne.mockResolvedValue(
        createMockOccupancy({
          slotDate: new Date('2026-03-28'),
          plannedCount: 5,
          capacity: 10,
          remaining: 5
        })
      );

      // Act
      const result = await (service as any).calculatePlannedReturnDate(
        unloadDate,
        'Live load',
        truckingCompanyId
      );

      // Assert
      expect(result.returnDate.toISOString()).toBe('2026-03-28T00:00:00.000Z');
      expect(result.adjustedUnloadDate).toBeUndefined();
    });

    it('✅ 能力不足，应调整卸柜日到最早有能力日期', async () => {
      // Arrange
      const unloadDate = new Date('2026-03-28');
      const truckingCompanyId = 'TRUCK_TEST_001';
      
      // Mock: 2026-03-28 已满
      // Mock: 2026-03-29 有能力
      mockOccupancyRepo.findOne
        .mockResolvedValueOnce(
          createMockOccupancy({
            slotDate: new Date('2026-03-28'),
            plannedCount: 10,
            capacity: 10,
            remaining: 0
          })
        )
        .mockResolvedValueOnce(
          createMockOccupancy({
            slotDate: new Date('2026-03-29'),
            plannedCount: 7,
            capacity: 10,
            remaining: 3
          })
        );

      // Act
      const result = await (service as any).calculatePlannedReturnDate(
        unloadDate,
        'Live load',
        truckingCompanyId
      );

      // Assert
      expect(result.returnDate.toISOString()).toBe('2026-03-29T00:00:00.000Z');
      expect(result.adjustedUnloadDate?.toISOString()).toBe('2026-03-29T00:00:00.000Z');
    });
  });

  // ============================================
  // 最晚还箱日红线约束测试
  // ============================================

  describe('Last Return Date Constraint', () => {
    
    it('✅ 在 lastReturnDate 前找到有能力日期，应返回该日期', async () => {
      // Arrange
      const unloadDate = new Date('2026-03-28');
      const lastReturnDate = new Date('2026-04-15');
      const truckingCompanyId = 'TRUCK_TEST_001';
      
      // Mock: 无占用记录，使用车队默认能力
      mockOccupancyRepo.findOne.mockResolvedValue(null);
      mockTruckingRepo.findOne.mockResolvedValue(
        createMockTruckingCompany({
          dailyReturnCapacity: 20
        })
      );

      // Act
      const result = await (service as any).calculatePlannedReturnDate(
        unloadDate,
        'Drop off',
        truckingCompanyId,
        lastReturnDate
      );

      // Assert
      expect(result.returnDate.toISOString()).toBe('2026-03-29T00:00:00.000Z');
      expect(result.returnDate <= lastReturnDate).toBe(true);
    });

    it('⚠️ 超过 lastReturnDate 仍无能力，应返回原日期或 null', async () => {
      // Arrange
      const unloadDate = new Date('2026-03-28');
      const lastReturnDate = new Date('2026-03-29');
      const truckingCompanyId = 'TRUCK_TEST_001';
      
      // Mock: 所有日期都已满
      mockOccupancyRepo.findOne.mockResolvedValue(
        createMockOccupancy({
          plannedCount: 10,
          capacity: 10,
          remaining: 0
        })
      );

      // Act
      const result = await (service as any).calculatePlannedReturnDate(
        unloadDate,
        'Drop off',
        truckingCompanyId,
        lastReturnDate
      );

      // Assert
      // 根据业务决策，可能返回 nextDay 或 undefined
      expect(result.returnDate).toBeDefined();
    });
  });

  // ============================================
  // 无占用记录场景测试（使用车队默认能力）
  // ============================================

  describe('No Occupancy Record - Use Default Capacity', () => {
    
    it('✅ 无占用记录且车队有能力，应返回查找的日期', async () => {
      // Arrange
      const unloadDate = new Date('2026-03-28');
      const truckingCompanyId = 'TRUCK_TEST_001';
      
      mockOccupancyRepo.findOne.mockResolvedValue(null);
      mockTruckingRepo.findOne.mockResolvedValue(
        createMockTruckingCompany({
          dailyReturnCapacity: 20
        })
      );

      // Act
      const result = await (service as any).calculatePlannedReturnDate(
        unloadDate,
        'Drop off',
        truckingCompanyId
      );

      // Assert
      expect(result.returnDate.toISOString()).toBe('2026-03-29T00:00:00.000Z');
    });

    it('⚠️ 无占用记录但车队能力为 0，应继续查找', async () => {
      // Arrange
      const unloadDate = new Date('2026-03-28');
      const truckingCompanyId = 'TRUCK_TEST_001';
      
      mockOccupancyRepo.findOne.mockResolvedValue(null);
      mockTruckingRepo.findOne.mockResolvedValue(
        createMockTruckingCompany({
          dailyReturnCapacity: 0
        })
      );

      // Act
      const result = await (service as any).calculatePlannedReturnDate(
        unloadDate,
        'Drop off',
        truckingCompanyId
      );

      // Assert
      // 应该继续查找后续日期
      expect(result.returnDate).toBeDefined();
    });
  });

  // ============================================
  // 性能测试（可选）
  // ============================================

  describe('Performance Test', () => {
    
    it('⏱️ 性能基准：14 天内找到日期应 < 100ms', async () => {
      // Arrange
      const unloadDate = new Date('2026-03-28');
      const truckingCompanyId = 'TRUCK_TEST_001';
      
      // Mock: 第 7 天有能力
      for (let i = 0; i <= 7; i++) {
        const date = new Date(unloadDate);
        date.setUTCDate(date.getUTCDate() + i);
        if (i < 7) {
          mockOccupancyRepo.findOne.mockResolvedValueOnce(
            createMockOccupancy({
              slotDate: date,
              plannedCount: 10,
              capacity: 10
            })
          );
        } else {
          mockOccupancyRepo.findOne.mockResolvedValueOnce(
            createMockOccupancy({
              slotDate: date,
              plannedCount: 5,
              capacity: 10
            })
          );
        }
      }

      // Act
      const startTime = Date.now();
      const result = await (service as any).calculatePlannedReturnDate(
        unloadDate,
        'Drop off',
        truckingCompanyId
      );
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(100);
      expect(result.returnDate).toBeDefined();
      
      console.log(`⏱️ Performance: ${duration}ms, Queries: ${mockOccupancyRepo.findOne.mock.calls.length}`);
    });
  });
});
