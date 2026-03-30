/**
 * OccupancyCalculator 单元测试
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { TruckingCompany } from '../entities/TruckingCompany';
import { Warehouse } from '../entities/Warehouse';
import { OccupancyCalculator } from './OccupancyCalculator';

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
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('OccupancyCalculator', () => {
  let calculator: OccupancyCalculator;

  // Mock Repositories
  let mockWarehouseRepo: Partial<Repository<Warehouse>>;
  let mockTruckingCompanyRepo: Partial<Repository<TruckingCompany>>;
  let mockWarehouseOccupancyRepo: Partial<Repository<ExtWarehouseDailyOccupancy>>;
  let mockTruckingOccupancyRepo: Partial<Repository<ExtTruckingSlotOccupancy>>;

  beforeEach(() => {
    // 初始化 Mock Repositories
    mockWarehouseRepo = {
      findOne: jest.fn()
    } as any;

    mockTruckingCompanyRepo = {
      findOne: jest.fn()
    } as any;

    mockWarehouseOccupancyRepo = {
      findOne: jest.fn(),
      save: jest.fn()
    } as any;

    mockTruckingOccupancyRepo = {
      findOne: jest.fn(),
      save: jest.fn()
    } as any;

    // 配置 Mock（按顺序注入）
    (AppDataSource.getRepository as jest.Mock)
      .mockReturnValueOnce(mockWarehouseRepo)
      .mockReturnValueOnce(mockTruckingCompanyRepo)
      .mockReturnValueOnce(mockWarehouseOccupancyRepo)
      .mockReturnValueOnce(mockTruckingOccupancyRepo);

    calculator = new OccupancyCalculator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('decrementWarehouseOccupancy', () => {
    it('should increment plannedCount when occupancy record exists', async () => {
      // Arrange
      const warehouseCode = 'WH001';
      const date = new Date('2026-03-28');
      const existingOccupancy = {
        warehouseCode,
        date,
        plannedCount: 5,
        capacity: 10
      } as any;

      (mockWarehouseOccupancyRepo.findOne as jest.Mock).mockResolvedValue(existingOccupancy);
      (mockWarehouseOccupancyRepo.save as jest.Mock).mockResolvedValue({
        ...existingOccupancy,
        plannedCount: 6
      });

      // Act
      await calculator.decrementWarehouseOccupancy(warehouseCode, date);

      // Assert
      expect(mockWarehouseOccupancyRepo.save).toHaveBeenCalledTimes(1);
      expect(mockWarehouseOccupancyRepo.save).toHaveBeenCalledWith({
        ...existingOccupancy,
        plannedCount: 6
      });
    });

    it('should create new occupancy record when not exists', async () => {
      // Arrange
      const warehouseCode = 'WH001';
      const date = new Date('2026-03-28');
      const warehouse = { dailyUnloadCapacity: 15 } as any;

      (mockWarehouseOccupancyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockWarehouseRepo.findOne as jest.Mock).mockResolvedValue(warehouse);
      (mockWarehouseOccupancyRepo.save as jest.Mock).mockResolvedValue({
        warehouseCode,
        date,
        plannedCount: 1,
        capacity: 15
      } as any);

      // Act
      await calculator.decrementWarehouseOccupancy(warehouseCode, date);

      // Assert
      expect(mockWarehouseOccupancyRepo.save).toHaveBeenCalledTimes(1);
      expect(mockWarehouseOccupancyRepo.save).toHaveBeenCalledWith({
        warehouseCode,
        date,
        plannedCount: 1,
        capacity: 15
      });
    });

    it('should use DEFAULT_WAREHOUSE_DAILY_CAPACITY when warehouse not found', async () => {
      // Arrange
      const warehouseCode = 'WH001';
      const date = new Date('2026-03-28');

      (mockWarehouseOccupancyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockWarehouseRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockWarehouseOccupancyRepo.save as jest.Mock).mockResolvedValue({
        warehouseCode,
        date,
        plannedCount: 1,
        capacity: 10 // 默认值
      } as any);

      // Act
      await calculator.decrementWarehouseOccupancy(warehouseCode, date);

      // Assert
      expect(mockWarehouseOccupancyRepo.save).toHaveBeenCalledWith({
        warehouseCode,
        date,
        plannedCount: 1,
        capacity: 10 // 使用默认值
      });
    });
  });

  describe('decrementTruckingOccupancy', () => {
    it('should increment plannedTrips when occupancy record exists', async () => {
      // Arrange
      const options = {
        truckingCompanyId: 'TRUCK001',
        date: new Date('2026-03-28'),
        portCode: 'USLAX'
      };
      const existingOccupancy = {
        truckingCompanyId: options.truckingCompanyId,
        date: options.date,
        plannedTrips: 3,
        capacity: 10
      } as any;

      (mockTruckingOccupancyRepo.findOne as jest.Mock).mockResolvedValue(existingOccupancy);
      (mockTruckingOccupancyRepo.save as jest.Mock).mockResolvedValue({
        ...existingOccupancy,
        plannedTrips: 4
      });

      // Act
      await calculator.decrementTruckingOccupancy(options);

      // Assert
      expect(mockTruckingOccupancyRepo.save).toHaveBeenCalledTimes(1);
      expect(mockTruckingOccupancyRepo.save).toHaveBeenCalledWith({
        ...existingOccupancy,
        plannedTrips: 4
      });
    });

    it('should create new occupancy record when not exists', async () => {
      // Arrange
      const options = {
        truckingCompanyId: 'TRUCK001',
        date: new Date('2026-03-28'),
        portCode: 'USLAX'
      };
      const trucking = { dailyCapacity: 12 } as any;

      (mockTruckingOccupancyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockTruckingCompanyRepo.findOne as jest.Mock).mockResolvedValue(trucking);
      (mockTruckingOccupancyRepo.save as jest.Mock).mockResolvedValue({
        ...options,
        plannedTrips: 1,
        capacity: 12
      } as any);

      // Act
      await calculator.decrementTruckingOccupancy(options);

      // Assert
      expect(mockTruckingOccupancyRepo.save).toHaveBeenCalledTimes(1);
      expect(mockTruckingOccupancyRepo.save).toHaveBeenCalledWith({
        truckingCompanyId: options.truckingCompanyId,
        date: options.date,
        portCode: options.portCode,
        warehouseCode: undefined,
        plannedTrips: 1,
        capacity: 12
      });
    });

    it('should use DEFAULT_TRUCKING_DAILY_CAPACITY when trucking not found', async () => {
      // Arrange
      const options = {
        truckingCompanyId: 'TRUCK001',
        date: new Date('2026-03-28')
      };

      (mockTruckingOccupancyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockTruckingCompanyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockTruckingOccupancyRepo.save as jest.Mock).mockResolvedValue({
        ...options,
        plannedTrips: 1,
        capacity: 20 // 默认值
      } as any);

      // Act
      await calculator.decrementTruckingOccupancy(options);

      // Assert
      expect(mockTruckingOccupancyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          capacity: 20 // 使用默认值
        })
      );
    });
  });

  describe('decrementFleetReturnOccupancy', () => {
    it('should increment plannedTrips when occupancy record exists', async () => {
      // Arrange
      const truckingCompanyId = 'TRUCK001';
      const returnDate = new Date('2026-03-28');
      const existingOccupancy = {
        truckingCompanyId,
        date: returnDate,
        plannedTrips: 2,
        capacity: 10
      } as any;

      (mockTruckingOccupancyRepo.findOne as jest.Mock).mockResolvedValue(existingOccupancy);
      (mockTruckingOccupancyRepo.save as jest.Mock).mockResolvedValue({
        ...existingOccupancy,
        plannedTrips: 3
      });

      // Act
      await calculator.decrementFleetReturnOccupancy(truckingCompanyId, returnDate);

      // Assert
      expect(mockTruckingOccupancyRepo.save).toHaveBeenCalledTimes(1);
      expect(mockTruckingOccupancyRepo.save).toHaveBeenCalledWith({
        ...existingOccupancy,
        plannedTrips: 3
      });
    });

    it('should create new occupancy record when not exists', async () => {
      // Arrange
      const truckingCompanyId = 'TRUCK001';
      const returnDate = new Date('2026-03-28');
      const trucking = { dailyCapacity: 15 } as any;

      (mockTruckingOccupancyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockTruckingCompanyRepo.findOne as jest.Mock).mockResolvedValue(trucking);
      (mockTruckingOccupancyRepo.save as jest.Mock).mockResolvedValue({
        truckingCompanyId,
        date: returnDate,
        plannedTrips: 1,
        capacity: 15
      } as any);

      // Act
      await calculator.decrementFleetReturnOccupancy(truckingCompanyId, returnDate);

      // Assert
      expect(mockTruckingOccupancyRepo.save).toHaveBeenCalledTimes(1);
      expect(mockTruckingOccupancyRepo.save).toHaveBeenCalledWith({
        truckingCompanyId,
        date: returnDate,
        plannedTrips: 1,
        capacity: 15
      });
    });

    it('should use DEFAULT_TRUCKING_DAILY_CAPACITY when trucking not found', async () => {
      // Arrange
      const truckingCompanyId = 'TRUCK001';
      const returnDate = new Date('2026-03-28');

      (mockTruckingOccupancyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockTruckingCompanyRepo.findOne as jest.Mock).mockResolvedValue(null);
      (mockTruckingOccupancyRepo.save as jest.Mock).mockResolvedValue({
        truckingCompanyId,
        date: returnDate,
        plannedTrips: 1,
        capacity: 20 // 默认值
      } as any);

      // Act
      await calculator.decrementFleetReturnOccupancy(truckingCompanyId, returnDate);

      // Assert
      expect(mockTruckingOccupancyRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          capacity: 20 // 使用默认值
        })
      );
    });
  });
});
