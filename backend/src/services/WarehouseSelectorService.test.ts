/**
 * WarehouseSelectorService 单元测试
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { Warehouse } from '../entities/Warehouse';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { WarehouseSelectorService } from './WarehouseSelectorService';

// Mock TypeORM Repository
jest.mock('../database', () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('WarehouseSelectorService', () => {
  let service: WarehouseSelectorService;

  // Mock Repositories
  let mockTruckingPortMappingRepo: Partial<Repository<TruckingPortMapping>>;
  let mockWarehouseTruckingMappingRepo: Partial<Repository<WarehouseTruckingMapping>>;
  let mockWarehouseRepo: Partial<Repository<Warehouse>>;
  let mockWarehouseOccupancyRepo: Partial<Repository<ExtWarehouseDailyOccupancy>>;

  beforeEach(() => {
    // 初始化 Mock Repositories
    mockTruckingPortMappingRepo = {
      find: jest.fn(),
      query: jest.fn()
    } as any;

    mockWarehouseTruckingMappingRepo = {
      find: jest.fn(),
      query: jest.fn()
    } as any;

    mockWarehouseRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      query: jest.fn()
    } as any;

    mockWarehouseOccupancyRepo = {
      findOne: jest.fn()
    } as any;

    // 配置 Mock
    (AppDataSource.getRepository as jest.Mock)
      .mockReturnValueOnce(mockTruckingPortMappingRepo)
      .mockReturnValueOnce(mockWarehouseTruckingMappingRepo)
      .mockReturnValueOnce(mockWarehouseRepo)
      .mockReturnValueOnce(mockWarehouseOccupancyRepo);

    service = new WarehouseSelectorService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCandidateWarehouses', () => {
    it('should return empty array when portCode is missing', async () => {
      // Arrange
      const result = await service.getCandidateWarehouses('US', undefined);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when countryCode is missing', async () => {
      // Arrange
      const result = await service.getCandidateWarehouses(undefined, 'USLAX');

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when no port mappings found', async () => {
      // Arrange
      (mockTruckingPortMappingRepo.find as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getCandidateWarehouses('US', 'USLAX');

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when no warehouse mappings found', async () => {
      // Arrange
      (mockTruckingPortMappingRepo.find as jest.Mock).mockResolvedValue([
        { truckingCompanyId: 'TRUCK001' }
      ]);
      (mockWarehouseTruckingMappingRepo.find as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getCandidateWarehouses('US', 'USLAX');

      // Assert
      expect(result).toEqual([]);
    });

    it('should return sorted warehouses when mapping chain exists', async () => {
      // Arrange
      const portMappings = [{ truckingCompanyId: 'TRUCK001' }];
      const warehouseMappings = [
        { truckingCompanyId: 'TRUCK001', warehouseCode: 'WH001', isDefault: true },
        { truckingCompanyId: 'TRUCK001', warehouseCode: 'WH002', isDefault: false }
      ];

      const warehouses = [
        { warehouseCode: 'WH001', propertyType: '自营仓', country: 'US', status: 'ACTIVE' },
        { warehouseCode: 'WH002', propertyType: '平台仓', country: 'US', status: 'ACTIVE' }
      ] as any[];

      (mockTruckingPortMappingRepo.find as jest.Mock).mockResolvedValue(portMappings);
      (mockWarehouseTruckingMappingRepo.find as jest.Mock).mockResolvedValue(warehouseMappings);
      (mockWarehouseRepo.find as jest.Mock).mockResolvedValue(warehouses);

      // Act
      const result = await service.getCandidateWarehouses('US', 'USLAX');

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].warehouseCode).toBe('WH001'); // 默认仓库优先
      expect(result[1].warehouseCode).toBe('WH002');
    });

    it('should filter inactive warehouses', async () => {
      // Arrange
      const portMappings = [{ truckingCompanyId: 'TRUCK001' }];
      const warehouseMappings = [{ truckingCompanyId: 'TRUCK001', warehouseCode: 'WH001' }];

      (mockTruckingPortMappingRepo.find as jest.Mock).mockResolvedValue(portMappings);
      (mockWarehouseTruckingMappingRepo.find as jest.Mock).mockResolvedValue(warehouseMappings);
      // Mock: 查询 ACTIVE 仓库，返回空数组
      (mockWarehouseRepo.find as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getCandidateWarehouses('US', 'USLAX');

      // Assert
      expect(result).toEqual([]); // INACTIVE 仓库应该被过滤
    });
  });

  describe('findEarliestAvailableWarehouse', () => {
    it('should return null when no warehouses available', async () => {
      // Arrange
      const warehouses: Warehouse[] = [];
      const earliestDate = new Date();

      // Act
      const result = await service.findEarliestAvailableWarehouse(warehouses, earliestDate);

      // Assert
      expect(result.warehouse).toBeNull();
      expect(result.plannedUnloadDate).toBeNull();
    });

    it('should return first warehouse with available capacity', async () => {
      // Arrange
      const warehouses = [{ warehouseCode: 'WH001' }] as any[];
      const earliestDate = new Date('2026-03-28');

      // Mock: 无占用记录（直接可用）
      (mockWarehouseOccupancyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockWarehouseRepo.findOne as jest.Mock).mockResolvedValue({
        dailyUnloadCapacity: 10
      } as any);

      // Act
      const result = await service.findEarliestAvailableWarehouse(warehouses, earliestDate);

      // Assert
      expect(result.warehouse).toBeDefined();
      expect(result.warehouse?.warehouseCode).toBe('WH001');
      expect(result.plannedUnloadDate).toBeDefined();
    });

    it('should skip fully occupied days and find next available', async () => {
      // Arrange
      const warehouses = [{ warehouseCode: 'WH001' }] as any[];
      const earliestDate = new Date('2026-03-28');

      // Mock: 第一天已满，第二天可用
      (mockWarehouseOccupancyRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ plannedCount: 10, capacity: 10 } as any) // Day 1: 满
        .mockResolvedValueOnce(null); // Day 2: 无记录

      (mockWarehouseRepo.findOne as jest.Mock).mockResolvedValue({
        dailyUnloadCapacity: 10
      } as any);

      // Act
      const result = await service.findEarliestAvailableWarehouse(warehouses, earliestDate);

      // Assert
      expect(result.warehouse).toBeDefined();
      expect(result.plannedUnloadDate).toBeDefined();
      // 应该是第二天
      const expectedDate = new Date(earliestDate);
      expectedDate.setUTCDate(expectedDate.getUTCDate() + 1);
      expect(result.plannedUnloadDate?.toDateString()).toBe(expectedDate.toDateString());
    });

    it('should return null when all 30 days are full', async () => {
      // Arrange
      const warehouses = [{ warehouseCode: 'WH001' }] as any[];
      const earliestDate = new Date('2026-03-28');

      // Mock: 30 天全部已满
      (mockWarehouseOccupancyRepo.findOne as jest.Mock).mockResolvedValue({
        plannedCount: 10,
        capacity: 10
      } as any);

      // Act
      const result = await service.findEarliestAvailableWarehouse(warehouses, earliestDate);

      // Assert
      expect(result.warehouse).toBeNull();
      expect(result.plannedUnloadDate).toBeNull();
    });
  });
});
