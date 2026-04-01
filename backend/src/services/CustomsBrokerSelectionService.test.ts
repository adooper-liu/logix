/**
 * CustomsBrokerSelectionService 单元测试
 * Customs Broker Selection Service Unit Tests
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { CustomsBroker } from '../entities/CustomsBroker';
import { CustomsBrokerSelectionService } from './CustomsBrokerSelectionService';

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

describe('CustomsBrokerSelectionService', () => {
  let service: CustomsBrokerSelectionService;
  let mockCustomsBrokerRepo: Partial<Repository<CustomsBroker>>;

  beforeEach(() => {
    mockCustomsBrokerRepo = {
      find: jest.fn()
    } as any;

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockCustomsBrokerRepo);
    service = new CustomsBrokerSelectionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('selectCustomsBroker', () => {
    it('应该返回匹配的清关公司编码', async () => {
      // Arrange
      const countryCode = 'US';
      const portCode = 'USLAX';
      const mockBrokers = [
        { brokerCode: 'CB-US-001', country: 'US' },
        { brokerCode: 'CB-US-002', country: 'US' }
      ];

      (mockCustomsBrokerRepo.find as jest.Mock).mockResolvedValue(mockBrokers);

      // Act
      const result = await service.selectCustomsBroker(countryCode, portCode);

      // Assert
      expect(result).toBe('CB-US-001');
      expect(mockCustomsBrokerRepo.find).toHaveBeenCalledWith({
        where: { country: 'US' },
        order: { brokerCode: 'ASC' },
        take: 1
      });
    });

    it('如果没有国家代码，应该返回 UNSPECIFIED', async () => {
      // Arrange
      const countryCode = undefined;

      // Act
      const result = await service.selectCustomsBroker(countryCode);

      // Assert
      expect(result).toBe('UNSPECIFIED');
      expect(mockCustomsBrokerRepo.find).not.toHaveBeenCalled();
    });

    it('如果没有匹配的清关公司，应该返回 UNSPECIFIED', async () => {
      // Arrange
      const countryCode = 'XX';
      (mockCustomsBrokerRepo.find as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.selectCustomsBroker(countryCode);

      // Assert
      expect(result).toBe('UNSPECIFIED');
    });

    it('如果发生错误，应该返回 UNSPECIFIED', async () => {
      // Arrange
      const countryCode = 'US';
      (mockCustomsBrokerRepo.find as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.selectCustomsBroker(countryCode);

      // Assert
      expect(result).toBe('UNSPECIFIED');
    });
  });

  describe('batchSelectCustomsBrokers', () => {
    it('应该批量选择清关公司', async () => {
      // Arrange
      const countryCodes = ['US', 'CA', 'GB'];

      (mockCustomsBrokerRepo.find as jest.Mock)
        .mockResolvedValueOnce([{ brokerCode: 'CB-US-001' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ brokerCode: 'CB-GB-001' }]);

      // Act
      const results = await service.batchSelectCustomsBrokers(countryCodes);

      // Assert
      expect(results).toEqual({
        US: 'CB-US-001',
        CA: 'UNSPECIFIED',
        GB: 'CB-GB-001'
      });
    });

    it('如果国家列表为空，应该返回空对象', async () => {
      // Arrange
      const countryCodes: string[] = [];

      // Act
      const results = await service.batchSelectCustomsBrokers(countryCodes);

      // Assert
      expect(results).toEqual({});
    });
  });
});
