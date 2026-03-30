/**
 * TruckingSelectorService 单元测试
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { TruckingCompany } from '../entities/TruckingCompany';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { TruckingSelectorService } from './TruckingSelectorService';

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

describe('TruckingSelectorService', () => {
  let service: TruckingSelectorService;

  // Mock Repositories
  let mockWarehouseTruckingMappingRepo: Partial<Repository<WarehouseTruckingMapping>>;
  let mockTruckingPortMappingRepo: Partial<Repository<TruckingPortMapping>>;
  let mockTruckingCompanyRepo: Partial<Repository<TruckingCompany>>;
  let mockTruckingOccupancyRepo: Partial<Repository<ExtTruckingSlotOccupancy>>;

  beforeEach(() => {
    // 初始化 Mock Repositories
    mockWarehouseTruckingMappingRepo = {
      find: jest.fn(),
      findOne: jest.fn()
    } as any;

    mockTruckingPortMappingRepo = {
      find: jest.fn(),
      query: jest.fn()
    } as any;

    mockTruckingCompanyRepo = {
      findOne: jest.fn()
    } as any;

    mockTruckingOccupancyRepo = {
      findOne: jest.fn()
    } as any;

    // 配置 Mock（按顺序注入）
    (AppDataSource.getRepository as jest.Mock)
      .mockReturnValueOnce(mockWarehouseTruckingMappingRepo)
      .mockReturnValueOnce(mockTruckingPortMappingRepo)
      .mockReturnValueOnce(mockTruckingCompanyRepo)
      .mockReturnValueOnce(mockTruckingOccupancyRepo);

    service = new TruckingSelectorService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectTruckingCompany', () => {
    it('should return null when no candidates found', async () => {
      // Arrange
      (mockWarehouseTruckingMappingRepo.find as jest.Mock).mockResolvedValue([]);

      const options = {
        warehouseCode: 'WH001',
        plannedDate: new Date()
      };

      // Act
      const result = await service.selectTruckingCompany(options);

      // Assert
      expect(result).toBeNull();
    });

    it('should select the highest scored trucking company', async () => {
      // Arrange
      const mappings = [
        { truckingCompanyId: 'TRUCK001' },
        { truckingCompanyId: 'TRUCK002' }
      ] as any[];

      (mockWarehouseTruckingMappingRepo.find as jest.Mock).mockResolvedValue(mappings);
      (mockTruckingOccupancyRepo.findOne as jest.Mock).mockResolvedValue(null); // 都有能力

      // Mock 成本计算
      (mockWarehouseTruckingMappingRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ transportFee: 100 } as any) // TRUCK001
        .mockResolvedValueOnce({ transportFee: 150 } as any); // TRUCK002

      // Mock 关系评分
      (mockTruckingCompanyRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ partnershipLevel: 'STRATEGIC' } as any) // TRUCK001: 100 分
        .mockResolvedValueOnce({ partnershipLevel: 'NORMAL' } as any); // TRUCK002: 60 分

      // Mock 返回车队实体
      (mockTruckingCompanyRepo.findOne as jest.Mock).mockResolvedValue({
        companyCode: 'TRUCK001'
      } as any);

      // Act
      const result = await service.selectTruckingCompany({
        warehouseCode: 'WH001',
        plannedDate: new Date()
      });

      // Assert
      expect(result).toBeDefined();
      expect(result?.companyCode).toBe('TRUCK001'); // 应该选择得分更高的
    });

    it('should filter by port code when provided', async () => {
      // Arrange
      const warehouseMappings = [{ trucking_company_id: 'TRUCK001' }];
      const portMappings = [{ trucking_company_id: 'TRUCK002' }]; // 不同的车队

      (mockWarehouseTruckingMappingRepo.find as jest.Mock).mockResolvedValue(warehouseMappings);
      (mockTruckingPortMappingRepo.query as jest.Mock).mockResolvedValue(portMappings);

      // Act
      const result = await service.selectTruckingCompany({
        warehouseCode: 'WH001',
        portCode: 'USLAX',
        countryCode: 'US',
        plannedDate: new Date()
      });

      // Assert
      expect(result).toBeNull(); // TRUCK001 不在港口映射中，被过滤
    });
  });

  describe('filterCandidateTruckingCompanies', () => {
    it('should return empty array when no warehouse mappings', async () => {
      // Arrange
      (mockWarehouseTruckingMappingRepo.find as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await (service as any).filterCandidateTruckingCompanies({
        warehouseCode: 'WH001',
        plannedDate: new Date()
      });

      // Assert
      expect(result).toEqual([]);
    });

    it('should filter by port code when provided', async () => {
      // Arrange - 使用驼峰命名因为 TypeORM find() 返回驼峰
      const warehouseMappings = [
        { truckingCompanyId: 'TRUCK001' },
        { truckingCompanyId: 'TRUCK002' }
      ] as any[];

      const portMappings = [{ trucking_company_id: 'TRUCK001' }];

      (mockWarehouseTruckingMappingRepo.find as jest.Mock).mockResolvedValue(warehouseMappings);
      (mockTruckingPortMappingRepo.query as jest.Mock).mockResolvedValue(portMappings);
      (mockTruckingOccupancyRepo.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await (service as any).filterCandidateTruckingCompanies({
        warehouseCode: 'WH001',
        portCode: 'USLAX',
        countryCode: 'US',
        plannedDate: new Date()
      });

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].truckingCompanyId).toBe('TRUCK001'); // 只有 TRUCK001 在港口映射中
    });

    it('should filter out teams without capacity', async () => {
      // Arrange
      const mappings = [
        { truckingCompanyId: 'TRUCK001' },
        { truckingCompanyId: 'TRUCK002' }
      ] as any[];

      // TRUCK001 有能力，TRUCK002 已满
      (mockTruckingOccupancyRepo.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // TRUCK001: 无记录 → 有能力
        .mockResolvedValueOnce({ plannedTrips: 10, capacity: 10 } as any); // TRUCK002: 已满

      (mockWarehouseTruckingMappingRepo.find as jest.Mock).mockResolvedValue(mappings);

      // Act
      const result = await (service as any).filterCandidateTruckingCompanies({
        warehouseCode: 'WH001',
        plannedDate: new Date()
      });

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].truckingCompanyId).toBe('TRUCK001');
      expect(result[0].hasCapacity).toBe(true);
    });
  });

  describe('scoreTruckingCompanies', () => {
    it('should score candidates based on cost, capacity and relationship', async () => {
      // Arrange
      const candidates = [
        { truckingCompanyId: 'TRUCK001', hasCapacity: true },
        { truckingCompanyId: 'TRUCK002', hasCapacity: false }
      ];

      // Mock 成本
      (mockWarehouseTruckingMappingRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ transportFee: 100 } as any)
        .mockResolvedValueOnce({ transportFee: 150 } as any);

      // Mock 关系
      (mockTruckingCompanyRepo.findOne as jest.Mock)
        .mockResolvedValueOnce({ partnershipLevel: 'STRATEGIC' } as any)
        .mockResolvedValueOnce({ partnershipLevel: 'NORMAL' } as any);

      // Act
      const result = await (service as any).scoreTruckingCompanies(candidates, 'WH001');

      // Assert
      expect(result.length).toBe(2);

      // TRUCK001: 成本低、有能力、关系好 → 分数高
      const truck001 = result.find((r: any) => r.truckingCompanyId === 'TRUCK001');
      expect(truck001.costScore).toBe(100); // 最低成本
      expect(truck001.capacityScore).toBe(100); // 有能力
      expect(truck001.relationshipScore).toBe(100); // STRATEGIC

      // TRUCK002: 成本高、无能力、关系一般 → 分数低
      const truck002 = result.find((r: any) => r.truckingCompanyId === 'TRUCK002');
      expect(truck002.costScore).toBe(0); // 最高成本
      expect(truck002.capacityScore).toBe(0); // 无能力
      expect(truck002.relationshipScore).toBe(60); // NORMAL
    });
  });

  describe('calculateRelationshipScore', () => {
    it('should return 100 for STRATEGIC partnership', async () => {
      // Arrange
      (mockTruckingCompanyRepo.findOne as jest.Mock).mockResolvedValue({
        partnershipLevel: 'STRATEGIC'
      } as any);

      // Act
      const score = await (service as any).calculateRelationshipScore('TRUCK001');

      // Assert
      expect(score).toBe(100);
    });

    it('should return 80 for CORE partnership', async () => {
      // Arrange
      (mockTruckingCompanyRepo.findOne as jest.Mock).mockResolvedValue({
        partnershipLevel: 'CORE'
      } as any);

      // Act
      const score = await (service as any).calculateRelationshipScore('TRUCK001');

      // Assert
      expect(score).toBe(80);
    });

    it('should return 60 for NORMAL partnership', async () => {
      // Arrange
      (mockTruckingCompanyRepo.findOne as jest.Mock).mockResolvedValue({
        partnershipLevel: 'NORMAL'
      } as any);

      // Act
      const score = await (service as any).calculateRelationshipScore('TRUCK001');

      // Assert
      expect(score).toBe(60);
    });

    it('should return 40 for TEMPORARY partnership', async () => {
      // Arrange
      (mockTruckingCompanyRepo.findOne as jest.Mock).mockResolvedValue({
        partnershipLevel: 'TEMPORARY'
      } as any);

      // Act
      const score = await (service as any).calculateRelationshipScore('TRUCK001');

      // Assert
      expect(score).toBe(40);
    });

    it('should return 50 for unknown partnership level', async () => {
      // Arrange
      (mockTruckingCompanyRepo.findOne as jest.Mock).mockResolvedValue({
        partnershipLevel: 'UNKNOWN'
      } as any);

      // Act
      const score = await (service as any).calculateRelationshipScore('TRUCK001');

      // Assert
      expect(score).toBe(50);
    });
  });
});
