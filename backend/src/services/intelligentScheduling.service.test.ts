/**
 * 智能排柜服务单元测试
 * Intelligent Scheduling Service Unit Tests
 */

import { intelligentSchedulingService } from './intelligentScheduling.service';
import { AppDataSource } from '../database';

// Mock AppDataSource
jest.mock('../database', () => ({
  AppDataSource: {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn().mockImplementation((_entity) => ({
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockReturnValue({}),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            containerNumber: 'TEST_LIVE_001',
            scheduleStatus: 'initial',
            portOperations: [
              {
                portType: 'destination',
                portCode: 'CA_VAN',
                portName: 'CA_VAN Port',
                etaDestPort: '2026-03-20',
                ataDestPort: '2026-03-20',
                lastFreeDate: '2026-03-20'
              }
            ],
            replenishmentOrders: [
              {
                customer: {
                  country: 'CA'
                }
              }
            ]
          }
        ])
      })
    })),
    manager: {
      transaction: jest.fn().mockImplementation(async (callback) => callback({}))
    }
  }
}));

describe('IntelligentSchedulingService', () => {
  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    try {
      // 由于使用了 mock，这里不需要实际清理数据
      await Promise.resolve();
    } catch {
      // ignore
    }
  });

  describe('Batch Schedule', () => {
    it('should return success for batch schedule', async () => {
      const result = await intelligentSchedulingService.batchSchedule({
        containerNumbers: ['TEST_LIVE_001']
      });

      expect(result.success).toBe(true);
    });
  });
});
