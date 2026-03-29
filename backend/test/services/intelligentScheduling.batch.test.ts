/**
 * 批量性能优化测试
 * @see backend/src/services/intelligentScheduling.service.ts - batchOptimizeContainers()
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppDataSource } from '../../src/config/database';
import { Container } from '../../src/entities/Container';
import { TruckingCompany } from '../../src/entities/TruckingCompany';
import { TruckingTransport } from '../../src/entities/TruckingTransport';
import { Warehouse } from '../../src/entities/Warehouse';
import { WarehouseOperation } from '../../src/entities/WarehouseOperation';
import { IntelligentSchedulingService } from '../../src/services/intelligentScheduling.service';

describe('IntelligentSchedulingService - Batch Optimization', () => {
  let service: IntelligentSchedulingService;
  let testContainers: string[] = [];

  beforeAll(async () => {
    await AppDataSource.initialize();
    service = new IntelligentSchedulingService();

    // 准备测试数据
    await prepareTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await AppDataSource.destroy();
  });

  describe('batchOptimizeContainers()', () => {
    it('应该成功批量优化多个货柜', async () => {
      const containerNumbers = testContainers.slice(0, 3);

      const results = await service.batchOptimizeContainers(containerNumbers);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);

      // 验证返回结构
      const firstResult = results[0];
      expect(firstResult).toHaveProperty('containerNumber');
      expect(firstResult).toHaveProperty('originalCost');
      expect(firstResult).toHaveProperty('optimizedCost');
      expect(firstResult).toHaveProperty('savings');
      expect(firstResult).toHaveProperty('shouldOptimize');
    });

    it('应该处理不存在的货柜号', async () => {
      const containerNumbers = ['NON_EXISTENT_123'];

      const results = await service.batchOptimizeContainers(containerNumbers);

      expect(results).toEqual([]);
    });

    it('应该正确处理混合场景 (存在 + 不存在)', async () => {
      const containerNumbers = [...testContainers.slice(0, 2), 'NON_EXISTENT_456'];

      const results = await service.batchOptimizeContainers(containerNumbers);

      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every((r) => r.containerNumber !== 'NON_EXISTENT_456')).toBeTruthy();
    });

    it('空数组应该返回空结果', async () => {
      const results = await service.batchOptimizeContainers([]);
      expect(results).toEqual([]);
    });

    it('大批量应该分批处理', async () => {
      // 使用较大的数据集测试分批逻辑
      const largeBatch = testContainers.slice(0, 100);

      const startTime = Date.now();
      const results = await service.batchOptimizeContainers(largeBatch);
      const totalTime = Date.now() - startTime;

      console.log(`批量优化 ${largeBatch.length} 个货柜耗时：${totalTime}ms`);

      // 验证性能 (假设目标：100 柜 < 15s)
      expect(totalTime).toBeLessThan(15000);
      expect(results.length).toBeLessThanOrEqual(largeBatch.length);
    });
  });

  describe('chunkArray()', () => {
    it('应该正确分割数组', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const size = 3;

      // @ts-ignore - 访问私有方法进行测试
      const chunks = service.chunkArray(array, size);

      expect(chunks.length).toBe(4); // [3, 3, 3, 1]
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
      expect(chunks[3]).toEqual([10]);
    });

    it('数组长度小于批次大小', () => {
      const array = [1, 2, 3];
      const size = 10;

      // @ts-ignore
      const chunks = service.chunkArray(array, size);

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toEqual([1, 2, 3]);
    });

    it('空数组应该返回空数组', () => {
      const array: number[] = [];
      const size = 5;

      // @ts-ignore
      const chunks = service.chunkArray(array, size);

      expect(chunks).toEqual([]);
    });
  });

  // ==================== 辅助方法 ====================

  async function prepareTestData() {
    console.log('准备批量优化测试数据...');

    const warehouseRepo = AppDataSource.getRepository(Warehouse);
    const truckingRepo = AppDataSource.getRepository(TruckingCompany);
    const containerRepo = AppDataSource.getRepository(Container);
    const warehouseOpRepo = AppDataSource.getRepository(WarehouseOperation);
    const truckingTransRepo = AppDataSource.getRepository(TruckingTransport);

    // 1. 创建测试仓库
    const testWarehouse = warehouseRepo.create({
      warehouseCode: 'TEST_WH_BATCH',
      warehouseName: 'Test Warehouse for Batch Optimization',
      country: 'US',
      status: 'ACTIVE',
      dailyUnloadCapacity: 20
    });
    await warehouseRepo.save(testWarehouse);

    // 2. 创建测试车队
    const testTrucking = truckingRepo.create({
      companyCode: 'TEST_TC_BATCH',
      companyName: 'Test Trucking Company',
      country: 'US',
      dailyCapacity: 30,
      hasYard: true
    });
    await truckingRepo.save(testTrucking);

    // 3. 创建测试货柜 (50 个用于批量测试)
    const containers: Container[] = [];
    for (let i = 1; i <= 50; i++) {
      const containerNumber = `TEST_BATCH_${String(i).padStart(3, '0')}`;

      const container = containerRepo.create({
        containerNumber,
        containerTypeCode: '40HQ',
        cargoDescription: `Test Cargo ${i}`,
        grossWeight: 10000,
        sealNumber: `SEAL_${i}`,
        logisticsStatus: 'in_transit',
        scheduleStatus: 'issued'
      });

      containers.push(container);
      testContainers.push(containerNumber);
    }
    await containerRepo.save(containers);

    // 4. 创建仓库操作记录
    const warehouseOps = testContainers.map((cn) =>
      warehouseOpRepo.create({
        containerNumber: cn,
        warehouseId: testWarehouse.warehouseCode,
        plannedUnloadDate: new Date()
      })
    );
    await warehouseOpRepo.save(warehouseOps);

    // 5. 创建拖车运输记录
    const truckingTrans = testContainers.map((cn) =>
      truckingTransRepo.create({
        containerNumber: cn,
        truckingCompanyId: testTrucking.companyCode,
        plannedPickupDate: new Date(),
        plannedDeliveryDate: new Date(),
        unloadModePlan: 'Drop off',
        scheduleStatus: 'issued'
      })
    );
    await truckingTransRepo.save(truckingTrans);

    console.log(`✓ 已创建 ${testContainers.length} 个测试货柜`);
  }

  async function cleanupTestData() {
    console.log('清理测试数据...');

    const containerRepo = AppDataSource.getRepository(Container);
    const warehouseOpRepo = AppDataSource.getRepository(WarehouseOperation);
    const truckingTransRepo = AppDataSource.getRepository(TruckingTransport);
    const warehouseRepo = AppDataSource.getRepository(Warehouse);
    const truckingRepo = AppDataSource.getRepository(TruckingCompany);

    // 删除关联记录
    await warehouseOpRepo.delete({ warehouseId: 'TEST_WH_BATCH' });
    await truckingTransRepo.delete({ truckingCompanyId: 'TEST_TC_BATCH' });
    await containerRepo.delete({ containerNumber: In(testContainers) });

    // 删除基础数据
    await warehouseRepo.delete({ warehouseCode: 'TEST_WH_BATCH' });
    await truckingRepo.delete({ companyCode: 'TEST_TC_BATCH' });

    console.log('✓ 测试数据已清理');
  }
});
