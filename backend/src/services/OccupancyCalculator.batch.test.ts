/**
 * OccupancyCalculator 批量查询单元测试
 */

import { OccupancyCalculator } from './OccupancyCalculator';
import { Warehouse } from '../entities/Warehouse';
import { TruckingCompany } from '../entities/TruckingCompany';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';

// Mock TypeORM Repository
const mockWarehouseRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn()
};

const mockTruckingCompanyRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn()
};

const mockWarehouseOccupancyRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn()
};

const mockTruckingOccupancyRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn()
};

jest.mock('../database', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity) => {
      // 根据实体类引用获取对应的 mock repository
      if (entity === Warehouse) {
        return mockWarehouseRepo;
      }
      if (entity === TruckingCompany) {
        return mockTruckingCompanyRepo;
      }
      if (entity === ExtWarehouseDailyOccupancy) {
        return mockWarehouseOccupancyRepo;
      }
      if (entity === ExtTruckingSlotOccupancy) {
        return mockTruckingOccupancyRepo;
      }
      return {};
    })
  }
}));

describe('OccupancyCalculator - Batch Queries', () => {
  let calculator: OccupancyCalculator;

  beforeEach(() => {
    // 重置所有 mock 调用历史
    jest.resetAllMocks();
    
    // 重新创建计算器实例
    calculator = new OccupancyCalculator();
  });

  describe('getBatchWarehouseOccupancy', () => {
    it('should fetch warehouse occupancy for date range', async () => {
      const warehouseCodes = ['WH001', 'WH002'];
      const startDate = new Date('2026-04-01');
      const endDate = new Date('2026-05-01');

      const mockOccupancies: Partial<ExtWarehouseDailyOccupancy>[] = [
        {
          warehouseCode: 'WH001',
          date: new Date('2026-04-01'),
          plannedCount: 5,
          capacity: 10,
          remaining: 5
        },
        {
          warehouseCode: 'WH002',
          date: new Date('2026-04-01'),
          plannedCount: 3,
          capacity: 8,
          remaining: 5
        }
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockOccupancies)
      };

      mockWarehouseOccupancyRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await calculator.getBatchWarehouseOccupancy(warehouseCodes, startDate, 30);

      expect(result).toBeInstanceOf(Map);
      expect(result.has('WH001')).toBe(true);
      expect(result.has('WH002')).toBe(true);
      expect(result.get('WH001')?.has('2026-04-01')).toBe(true);
    });

    it('should handle empty results', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([])
      };

      mockWarehouseOccupancyRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await calculator.getBatchWarehouseOccupancy(['WH999'], new Date(), 30);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should use default 30 days when not specified', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([])
      };

      mockWarehouseOccupancyRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await calculator.getBatchWarehouseOccupancy(['WH001'], new Date());

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'occ.date <= :endDate',
        expect.any(Object)
      );
    });
  });

  describe('getBatchTruckingOccupancy', () => {
    it('should fetch trucking occupancy for date range', async () => {
      const truckingCompanyIds = ['TRUCK001', 'TRUCK002'];
      const startDate = new Date('2026-04-01');

      const mockOccupancies: Partial<ExtTruckingSlotOccupancy>[] = [
        {
          truckingCompanyId: 'TRUCK001',
          date: new Date('2026-04-01'),
          portCode: 'USLAX',
          warehouseCode: 'WH001',
          plannedTrips: 2,
          capacity: 5,
          remaining: 3
        }
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockOccupancies)
      };

      mockTruckingOccupancyRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await calculator.getBatchTruckingOccupancy(truckingCompanyIds, startDate, 30);

      expect(result).toBeInstanceOf(Map);
      expect(result.has('TRUCK001')).toBe(true);
      expect(result.get('TRUCK001')?.has('2026-04-01')).toBe(true);
    });

    it('should organize results in nested Map structure', async () => {
      const mockOccupancies = [
        {
          truckingCompanyId: 'TRUCK001',
          date: new Date('2026-04-01'),
          portCode: 'USLAX',
          warehouseCode: 'WH001',
          plannedTrips: 2,
          capacity: 5,
          remaining: 3
        },
        {
          truckingCompanyId: 'TRUCK001',
          date: new Date('2026-04-02'),
          portCode: 'USLAX',
          warehouseCode: 'WH001',
          plannedTrips: 3,
          capacity: 5,
          remaining: 2
        }
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockOccupancies)
      };

      mockTruckingOccupancyRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await calculator.getBatchTruckingOccupancy(['TRUCK001'], new Date('2026-04-01'), 30);

      const truckingMap = result.get('TRUCK001');
      expect(truckingMap?.size).toBe(2);
      expect(truckingMap?.has('2026-04-01')).toBe(true);
      expect(truckingMap?.has('2026-04-02')).toBe(true);
    });
  });
});
