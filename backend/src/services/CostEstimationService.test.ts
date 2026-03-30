/**
 * CostEstimationService 单元测试
 */

import { CostEstimationService } from './CostEstimationService';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('CostEstimationService', () => {
  let service: CostEstimationService;

  beforeEach(() => {
    service = new CostEstimationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTotalCost', () => {
    it('should calculate total cost with all components', async () => {
      // Arrange
      const options = {
        containerNumber: 'CNTR001',
        truckingCompanyId: 'TRUCK001',
        warehouseCode: 'WH001',
        ddCosts: {
          demurrageCost: 50,
          detentionCost: 30
        }
      };

      // Act
      const result = await service.calculateTotalCost(options);

      // Assert
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.demurrageCost).toBe(50);
      expect(result.detentionCost).toBe(30);
      expect(result.transportFee).toBeGreaterThanOrEqual(0);
    });

    it('should use zero for D&D costs when not provided', async () => {
      // Arrange
      const options = {
        containerNumber: 'CNTR001',
        truckingCompanyId: 'TRUCK001',
        warehouseCode: 'WH001'
      };

      // Act
      const result = await service.calculateTotalCost(options);

      // Assert
      expect(result.demurrageCost).toBe(0);
      expect(result.detentionCost).toBe(0);
    });

    it('should return zero transport fee when no trucking company', async () => {
      // Arrange
      const options = {
        containerNumber: 'CNTR001',
        warehouseCode: 'WH001',
        ddCosts: {
          demurrageCost: 100,
          detentionCost: 50
        }
      };

      // Act
      const result = await service.calculateTotalCost(options);

      // Assert
      expect(result.transportFee).toBe(0);
      expect(result.demurrageCost).toBe(100);
      expect(result.detentionCost).toBe(50);
    });

    it('should return zero transport fee when no warehouse', async () => {
      // Arrange
      const options = {
        containerNumber: 'CNTR001',
        truckingCompanyId: 'TRUCK001',
        ddCosts: {
          demurrageCost: 100,
          detentionCost: 50
        }
      };

      // Act
      const result = await service.calculateTotalCost(options);

      // Assert
      expect(result.transportFee).toBe(0);
    });

    it('should include yard fees when applicable', async () => {
      // Arrange
      const options = {
        containerNumber: 'CNTR001',
        truckingCompanyId: 'TRUCK001',
        warehouseCode: 'WH001',
        portCode: 'USLAX',
        ddCosts: {
          demurrageCost: 0,
          detentionCost: 0
        }
      };

      // Act
      const result = await service.calculateTotalCost(options);

      // Assert
      expect(result.yardOperationFee).toBe(0); // TODO: 后续实现
      expect(result.yardStorageCost).toBe(0); // TODO: 后续实现
    });

    it('should calculate total cost correctly', async () => {
      // Arrange
      const options = {
        containerNumber: 'CNTR001',
        truckingCompanyId: 'TRUCK001',
        warehouseCode: 'WH001',
        ddCosts: {
          demurrageCost: 100,
          detentionCost: 50
        }
      };

      // Act
      const result = await service.calculateTotalCost(options);

      // Assert
      expect(result.totalCost).toBe(
        result.demurrageCost +
          result.detentionCost +
          result.transportFee +
          (result.yardOperationFee || 0) +
          (result.yardStorageCost || 0)
      );
    });
  });
});
