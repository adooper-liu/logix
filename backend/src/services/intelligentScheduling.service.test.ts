/**
 * 智能排柜服务单元测试
 * Intelligent Scheduling Service Unit Tests
 */

import { intelligentSchedulingService } from './intelligentScheduling.service';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { PortOperation } from '../entities/PortOperation';
import { Warehouse } from '../entities/Warehouse';
import { TruckingCompany } from '../entities/TruckingCompany';
import { EmptyReturn } from '../entities/EmptyReturn';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { ExtTruckingSlotOccupancy } from '../entities/ExtTruckingSlotOccupancy';
import { ExtTruckingReturnSlotOccupancy } from '../entities/ExtTruckingReturnSlotOccupancy';
import { TruckingPortMapping } from '../entities/TruckingPortMapping';
import { WarehouseTruckingMapping } from '../entities/WarehouseTruckingMapping';
import { Customer } from '../entities/Customer';
import { ReplenishmentOrder } from '../entities/ReplenishmentOrder';
import { Like } from 'typeorm';
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';

// Mock AppDataSource
jest.mock('../database', () => ({
  AppDataSource: {
    initialize: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn().mockResolvedValue(undefined),
    getRepository: jest.fn().mockImplementation((entity) => ({
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
        getMany: jest.fn().mockResolvedValue([{
          containerNumber: 'TEST_LIVE_001',
          scheduleStatus: 'initial',
          portOperations: [{
            portType: 'destination',
            portCode: 'CA_VAN',
            portName: 'CA_VAN Port',
            etaDestPort: '2026-03-20',
            ataDestPort: '2026-03-20',
            lastFreeDate: '2026-03-20'
          }],
          replenishmentOrders: [{
            customer: {
              country: 'CA'
            }
          }]
        }])
      })
    })),
    manager: {
      transaction: jest.fn().mockImplementation(async (callback) => callback({}))
    }
  }
}));

describe('IntelligentSchedulingService', () => {
  beforeAll(async () => {
    // 初始化数据库连接
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    // 关闭数据库连接
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    // 清理测试数据
    await cleanupTestData();
  });

  /**
   * 测试场景 1: 批量排产功能
   */
  describe('Batch Schedule', () => {
    it('should return success for batch schedule', async () => {
      // 执行排产
      const result = await intelligentSchedulingService.batchSchedule({
        containerNumbers: ['TEST_LIVE_001']
      });

      // 验证结果
      expect(result.success).toBe(true);
    });
  });
});

// 辅助函数
async function cleanupTestData() {
  try {
    // 由于使用了 mock，这里不需要实际清理数据
    console.log('Cleaning up test data...');
  } catch (error) {
    console.log('Cleanup test data error:', error);
  }
}

async function createTestContainer(params: {
  containerNumber: string;
  etaDestPort: string;
  portCode: string;
  countryCode: string;
}) {
  const customerRepo = AppDataSource.getRepository(Customer);
  const replenishmentOrderRepo = AppDataSource.getRepository(ReplenishmentOrder);
  const containerRepo = AppDataSource.getRepository(Container);
  const portOperationRepo = AppDataSource.getRepository(PortOperation);

  // 创建客户
  const customer = customerRepo.create({
    customerCode: `TEST_CUSTOMER_${params.countryCode}`,
    customerName: `Test Customer ${params.countryCode}`,
    country: params.countryCode
  });
  await customerRepo.save(customer);

  // 创建备货单
  const order = replenishmentOrderRepo.create({
    orderNumber: `TEST_ORDER_${params.containerNumber}`,
    customerCode: customer.customerCode,
    customer: customer,
    sellToCountry: params.countryCode
  });
  await replenishmentOrderRepo.save(order);

  // 创建货柜
  const container = containerRepo.create({
    containerNumber: params.containerNumber,
    scheduleStatus: 'initial',
    replenishmentOrders: [order]
  });
  await containerRepo.save(container);

  // 创建港口操作
  const portOperation = portOperationRepo.create({
    id: `PORT_OP_${params.containerNumber}`,
    containerNumber: params.containerNumber,
    portCode: params.portCode,
    portName: `${params.portCode} Port`,
    portType: 'destination',
    eta: params.etaDestPort,
    ata: params.etaDestPort,
    lastFreeDate: params.etaDestPort
  });
  await portOperationRepo.save(portOperation);

  return container;
}

async function createTestTruckingCompany(params: {
  companyCode: string;
  hasYard: boolean;
  dailyCapacity: number;
  dailyReturnCapacity?: number;
}) {
  const repo = AppDataSource.getRepository(TruckingCompany);
  const trucking = repo.create({
    companyCode: params.companyCode,
    companyName: `Test Trucking ${params.companyCode}`,
    hasYard: params.hasYard,
    dailyCapacity: params.dailyCapacity,
    dailyReturnCapacity: params.dailyReturnCapacity || params.dailyCapacity
  });
  await repo.save(trucking);
  return trucking;
}

async function createTestWarehouse(params: {
  warehouseCode: string;
  dailyUnloadCapacity: number;
  country: string;
}) {
  const repo = AppDataSource.getRepository(Warehouse);
  const warehouse = repo.create({
    warehouseCode: params.warehouseCode,
    warehouseName: `Test Warehouse ${params.warehouseCode}`,
    dailyUnloadCapacity: params.dailyUnloadCapacity,
    country: params.country,
    status: 'ACTIVE',
    propertyType: '自营仓'
  });
  await repo.save(warehouse);
  return warehouse;
}

async function createMappingRelations(params: {
  portCode: string;
  countryCode: string;
  truckingCompanyId: string;
  warehouseCode: string;
}) {
  const truckingPortMappingRepo = AppDataSource.getRepository(TruckingPortMapping);
  const warehouseTruckingMappingRepo = AppDataSource.getRepository(WarehouseTruckingMapping);

  // 创建港口-车队映射
  const portMapping = truckingPortMappingRepo.create({
    portCode: params.portCode,
    country: params.countryCode,
    truckingCompanyId: params.truckingCompanyId,
    isActive: true
  });
  await truckingPortMappingRepo.save(portMapping);

  // 创建仓库-车队映射
  const warehouseMapping = warehouseTruckingMappingRepo.create({
    warehouseCode: params.warehouseCode,
    truckingCompanyId: params.truckingCompanyId,
    country: params.countryCode,
    isActive: true,
    isDefault: true
  });
  await warehouseTruckingMappingRepo.save(warehouseMapping);
}

async function getContainerWithRelations(containerNumber: string) {
  const containerRepo = AppDataSource.getRepository(Container);
  return containerRepo.findOne({
    where: { containerNumber },
    relations: ['truckingTransport', 'warehouseOperation', 'emptyReturn']
  });
}

async function getTruckingReturnOccupancy(truckingCompanyId: string, date: string) {
  const repo = AppDataSource.getRepository(ExtTruckingReturnSlotOccupancy);
  return repo.findOne({
    where: {
      truckingCompanyId,
      slotDate: new Date(date)
    }
  });
}

async function setWeekendSkipConfig(enabled: boolean) {
  const configRepo = AppDataSource.getRepository(DictSchedulingConfig);
  let config = await configRepo.findOne({
    where: { configKey: 'skip_weekends' }
  });
  if (config) {
    config.configValue = enabled ? 'true' : 'false';
  } else {
    config = configRepo.create({
      configKey: 'skip_weekends',
      configValue: enabled ? 'true' : 'false',
      description: '是否跳过周末'
    });
  }
  await configRepo.save(config);
}


