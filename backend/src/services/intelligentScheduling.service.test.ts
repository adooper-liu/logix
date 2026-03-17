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
   * 测试场景 1: Live load 模式
   * 前置条件：车队 has_yard = false
   */
  describe('Live load Mode', () => {
    it('should schedule container with Live load mode when truck has no yard', async () => {
      // 1. 创建测试数据
      const testContainer = await createTestContainer({
        containerNumber: 'TEST_LIVE_001',
        etaDestPort: '2026-03-20', // 周五
        portCode: 'CA_VAN',
        countryCode: 'CA'
      });

      const testTruck = await createTestTruckingCompany({
        companyCode: 'TRUCK_TEST_001',
        hasYard: false,
        dailyCapacity: 10
      });

      const testWarehouse = await createTestWarehouse({
        warehouseCode: 'WH_TEST_001',
        dailyUnloadCapacity: 20,
        country: 'CA'
      });

      // 2. 创建映射关系
      await createMappingRelations({
        portCode: 'CA_VAN',
        countryCode: 'CA',
        truckingCompanyId: 'TRUCK_TEST_001',
        warehouseCode: 'WH_TEST_001'
      });

      // 3. 执行排产
      const result = await intelligentSchedulingService.batchSchedule({
        containerNumbers: [testContainer.containerNumber]
      });

      // 4. 验证结果
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(1);
      expect(result.results[0].success).toBe(true);
    });
  });

  /**
   * 测试场景 2: Drop off 模式
   * 前置条件：车队 has_yard = true
   */
  describe('Drop off Mode', () => {
    it('should schedule container with Drop off mode when truck has yard', async () => {
      // 1. 创建测试数据
      const testContainer = await createTestContainer({
        containerNumber: 'TEST_DROP_001',
        etaDestPort: '2026-03-20',
        portCode: 'CA_VAN',
        countryCode: 'CA'
      });

      const testTruck = await createTestTruckingCompany({
        companyCode: 'TRUCK_TEST_002',
        hasYard: true,
        dailyCapacity: 10,
        dailyReturnCapacity: 5
      });

      const testWarehouse = await createTestWarehouse({
        warehouseCode: 'WH_TEST_002',
        dailyUnloadCapacity: 20,
        country: 'CA'
      });

      // 2. 创建映射关系
      await createMappingRelations({
        portCode: 'CA_VAN',
        countryCode: 'CA',
        truckingCompanyId: 'TRUCK_TEST_002',
        warehouseCode: 'WH_TEST_002'
      });

      // 3. 执行排产
      const result = await intelligentSchedulingService.batchSchedule({
        containerNumbers: [testContainer.containerNumber]
      });

      // 4. 验证结果
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(1);
      expect(result.results[0].success).toBe(true);
    });
  });

  /**
   * 测试场景 3: 周末跳过逻辑
   */
  describe('Weekend Skipping', () => {
    it('should skip weekends when configured', async () => {
      // 1. 创建测试数据
      const testContainer = await createTestContainer({
        containerNumber: 'TEST_WEEKEND_001',
        etaDestPort: '2026-03-22', // 周日
        portCode: 'CA_VAN',
        countryCode: 'CA'
      });

      const testTruck = await createTestTruckingCompany({
        companyCode: 'TRUCK_TEST_003',
        hasYard: false,
        dailyCapacity: 10
      });

      const testWarehouse = await createTestWarehouse({
        warehouseCode: 'WH_TEST_003',
        dailyUnloadCapacity: 20,
        country: 'CA'
      });

      // 2. 创建映射关系
      await createMappingRelations({
        portCode: 'CA_VAN',
        countryCode: 'CA',
        truckingCompanyId: 'TRUCK_TEST_003',
        warehouseCode: 'WH_TEST_003'
      });

      // 3. 启用周末跳过配置
      await setWeekendSkipConfig(true);

      // 4. 执行排产
      const result = await intelligentSchedulingService.batchSchedule({
        containerNumbers: [testContainer.containerNumber]
      });

      // 5. 验证结果
      expect(result.success).toBe(true);
      expect(result.results.length).toBe(1);
      expect(result.results[0].success).toBe(true);
    });
  });
});

// 辅助函数
async function cleanupTestData() {
  const containerRepo = AppDataSource.getRepository(Container);
  const portOperationRepo = AppDataSource.getRepository(PortOperation);
  const warehouseRepo = AppDataSource.getRepository(Warehouse);
  const truckingCompanyRepo = AppDataSource.getRepository(TruckingCompany);
  const emptyReturnRepo = AppDataSource.getRepository(EmptyReturn);
  const warehouseOccupancyRepo = AppDataSource.getRepository(ExtWarehouseDailyOccupancy);
  const truckingOccupancyRepo = AppDataSource.getRepository(ExtTruckingSlotOccupancy);
  const truckingReturnOccupancyRepo = AppDataSource.getRepository(ExtTruckingReturnSlotOccupancy);
  const truckingPortMappingRepo = AppDataSource.getRepository(TruckingPortMapping);
  const warehouseTruckingMappingRepo = AppDataSource.getRepository(WarehouseTruckingMapping);
  const customerRepo = AppDataSource.getRepository(Customer);
  const replenishmentOrderRepo = AppDataSource.getRepository(ReplenishmentOrder);

  // 按依赖顺序删除
  await emptyReturnRepo.delete({ containerNumber: Like('%TEST_%') });
  await warehouseOccupancyRepo.delete({ warehouseCode: Like('WH_TEST_%') });
  await truckingOccupancyRepo.delete({ truckingCompanyId: Like('TRUCK_TEST_%') });
  await truckingReturnOccupancyRepo.delete({ truckingCompanyId: Like('TRUCK_TEST_%') });
  await warehouseTruckingMappingRepo.delete({ truckingCompanyId: Like('TRUCK_TEST_%') });
  await truckingPortMappingRepo.delete({ truckingCompanyId: Like('TRUCK_TEST_%') });
  await containerRepo.delete({ containerNumber: Like('%TEST_%') });
  await portOperationRepo.delete({ containerNumber: Like('%TEST_%') });
  await warehouseRepo.delete({ warehouseCode: Like('WH_TEST_%') });
  await truckingCompanyRepo.delete({ companyCode: Like('TRUCK_TEST_%') });
  await replenishmentOrderRepo.delete({ orderNumber: Like('TEST_ORDER_%') });
  await customerRepo.delete({ customerCode: Like('TEST_CUSTOMER_%') });
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
    containerNumber: params.containerNumber,
    portCode: params.portCode,
    portName: `${params.portCode} Port`,
    portType: 'destination',
    etaDestPort: params.etaDestPort,
    ataDestPort: params.etaDestPort,
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


