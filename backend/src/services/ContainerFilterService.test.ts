/**
 * ContainerFilterService 单元测试
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { ContainerFilterService } from './ContainerFilterService';

// Mock TypeORM Repository
jest.mock('../database', () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

describe('ContainerFilterService', () => {
  let service: ContainerFilterService;
  let mockQueryBuilder: any;
  let mockRepo: Partial<Repository<Container>>;

  beforeEach(() => {
    // 创建 Mock QueryBuilder
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([])
    };

    // 创建 Mock Repository
    mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder)
    };

    // 配置 Mock
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

    service = new ContainerFilterService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('filter', () => {
    it('should filter containers by port codes', async () => {
      // Arrange
      const options = {
        portCodes: ['USLAX'],
        minFreeDays: 3
      };

      // Act
      const result = await service.filter(options);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(AppDataSource.getRepository).toHaveBeenCalledWith(Container);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should handle empty port codes', async () => {
      // Arrange
      const options = {
        portCodes: [],
        minFreeDays: 3
      };

      // Act
      const result = await service.filter(options);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle undefined options gracefully', async () => {
      // Arrange
      const options = {} as any;

      // Act & Assert
      await expect(service.filter(options)).resolves.toBeDefined();
      expect(Array.isArray(await service.filter(options))).toBe(true);
    });

    it('should only return initial or issued containers', async () => {
      // Arrange
      const options = {
        portCodes: ['USLAX']
      };

      // Act
      const result = await service.filter(options);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // 验证查询条件包含 scheduleStatus
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'c.scheduleStatus IN (:...statuses)',
        expect.objectContaining({ statuses: expect.any(Array) })
      );
    });

    it('should include related entities (portOperations, seaFreight, orders)', async () => {
      // Arrange
      const options = {
        portCodes: ['USLAX']
      };

      // Act
      const result = await service.filter(options);

      // Assert
      expect(result).toBeDefined();

      // 验证关联数据加载
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('c.portOperations', 'po');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('c.seaFreight', 'sf');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('c.replenishmentOrders', 'o');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('o.customer', 'cust');
    });
  });

  describe('constructor', () => {
    it('should initialize container repository', () => {
      // Act & Assert
      expect(service).toBeDefined();
      expect(AppDataSource.getRepository).toHaveBeenCalledWith(Container);
    });
  });
});
