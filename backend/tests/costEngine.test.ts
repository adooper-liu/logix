/**
 * CostEngine 单元测试
 * Cost Engine Unit Tests
 */

/// <reference types="jest" />

import { AppDataSource } from '../src/database';
import { ExpressCarrierService } from '../src/entities/ExpressCarrierService';
import { ExpressStackPolicy } from '../src/entities/ExpressStackPolicy';
import { ExpressSurchargeRule } from '../src/entities/ExpressSurchargeRule';
import { ExpressSurchargeVersion } from '../src/entities/ExpressSurchargeVersion';
import { costEngineService } from '../src/services/costEngine.service';

describe('CostEngine', () => {
  let testCarrierId: number;

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
    await AppDataSource.getRepository(ExpressStackPolicy).clear();
    await AppDataSource.getRepository(ExpressSurchargeRule).clear();
    await AppDataSource.getRepository(ExpressCarrierService).clear();
    await AppDataSource.getRepository(ExpressSurchargeVersion).clear();

    // 准备测试数据
    const version = await AppDataSource.getRepository(ExpressSurchargeVersion).save({
      versionKey: 'TEST_20260423',
      sourceFileName: 'test.xlsx',
      importedBy: 'test'
    });

    const carrierService = await AppDataSource.getRepository(ExpressCarrierService).save({
      countryCode: 'US',
      serviceName: 'FedEx Ground',
      defaultLengthUnit: 'in',
      defaultWeightUnit: 'lb'
    });
    testCarrierId = carrierService.id;

    // 插入测试规则
    await AppDataSource.getRepository(ExpressSurchargeRule).save([
      {
        versionId: version.id,
        carrierServiceId: testCarrierId,
        typeRaw: 'AHS - Dimensions',
        typeNormalized: 'AHS_DIM',
        longestIn: 48,
        amountFixed: 4.87,
        currency: 'USD',
        ingestCompleteness: 'FULL'
      },
      {
        versionId: version.id,
        carrierServiceId: testCarrierId,
        typeRaw: 'Oversize',
        typeNormalized: 'OVERSIZE',
        longestIn: 96,
        girthIn: 130,
        amountFixed: 39,
        currency: 'USD',
        ingestCompleteness: 'FULL'
      },
      {
        versionId: version.id,
        carrierServiceId: testCarrierId,
        typeRaw: '拒收',
        typeNormalized: 'REJECT',
        minBillableLbs: 150,
        amountFixed: 0,
        currency: 'USD',
        ingestCompleteness: 'FULL'
      }
    ]);

    // 插入互斥策略
    await AppDataSource.getRepository(ExpressStackPolicy).save({
      versionId: version.id,
      countryCode: 'US',
      carrierServiceId: testCarrierId,
      policyType: 'IF_THEN_DISABLE',
      policyJson: {
        if_triggered: ['OVERSIZE'],
        disable: ['AHS_DIM', 'AHS_WEIGHT']
      }
    });
  });

  describe('基本费用计算', () => {
    it('US FedEx Ground: 最长边 50in 应触发 AHS_DIM ($4.87)', async () => {
      const input = {
        countryCode: 'US',
        carrierServiceId: testCarrierId,
        versionKey: 'TEST_20260423',
        longestIn: 50,
        secondIn: 30,
        shortestIn: 20,
        grossWeightLbs: 40
      };

      const result = await costEngineService.calculate(input);

      expect(result.status).toBe('OK');
      expect(result.charges).toHaveLength(1);
      expect(result.charges[0].type).toBe('AHS_DIM');
      expect(result.charges[0].amount).toBe(4.87);
      expect(result.totalSurcharge).toBe(4.87);
    });

    it('US FedEx Ground: 未超阈值不应产生附加费', async () => {
      const input = {
        countryCode: 'US',
        carrierServiceId: testCarrierId,
        versionKey: 'TEST_20260423',
        longestIn: 40,
        secondIn: 30,
        shortestIn: 20,
        grossWeightLbs: 40
      };

      const result = await costEngineService.calculate(input);

      expect(result.status).toBe('OK');
      expect(result.charges).toHaveLength(0);
      expect(result.totalSurcharge).toBe(0);
    });
  });

  describe('互斥策略', () => {
    it('US FedEx Ground: Oversize 触发后应禁用 AHS_DIM', async () => {
      const input = {
        countryCode: 'US',
        carrierServiceId: testCarrierId,
        versionKey: 'TEST_20260423',
        longestIn: 100,
        secondIn: 40,
        shortestIn: 30, // 周长 = 2*(40+30) = 140 > 130
        grossWeightLbs: 50
      };

      const result = await costEngineService.calculate(input);

      expect(result.status).toBe('OK');
      expect(result.charges).toHaveLength(1);
      expect(result.charges[0].type).toBe('OVERSIZE');
      expect(result.charges[0].amount).toBe(39);
      expect(result.totalSurcharge).toBe(39);

      // 验证 AHS_DIM 被禁用
      const ahsCharge = result.charges.find((c) => c.type === 'AHS_DIM');
      expect(ahsCharge).toBeUndefined();
    });
  });

  describe('拒收判定', () => {
    it('US FedEx Ground: 计费重超过 150lb 应拒收', async () => {
      const input = {
        countryCode: 'US',
        carrierServiceId: testCarrierId,
        versionKey: 'TEST_20260423',
        longestIn: 40,
        secondIn: 30,
        shortestIn: 20,
        grossWeightLbs: 160 // 超过 150lb
      };

      const result = await costEngineService.calculate(input);

      expect(result.status).toBe('REJECTED');
      expect(result.rejectReason).toBeDefined();
      expect(result.charges.some((c) => c.type === 'REJECT')).toBe(true);
    });
  });

  describe('体积重计算', () => {
    it('应正确计算体积重（divisor=139）', async () => {
      const input = {
        countryCode: 'US',
        carrierServiceId: testCarrierId,
        versionKey: 'TEST_20260423',
        longestIn: 50,
        secondIn: 40,
        shortestIn: 30,
        grossWeightLbs: 40
      };

      const result = await costEngineService.calculate(input);

      // 体积重 = (50 * 40 * 30) / 139 = 431.65 → 432 lb
      expect(result.volumeWeightLbs).toBe(432);
      expect(result.billableWeightLbs).toBe(432); // 取 max(40, 432)
    });
  });

  describe('错误处理', () => {
    it('无效的 carrierServiceId 应抛出错误', async () => {
      const input = {
        countryCode: 'US',
        carrierServiceId: 999, // 不存在
        versionKey: 'TEST_20260423',
        longestIn: 50,
        secondIn: 30,
        shortestIn: 20,
        grossWeightLbs: 40
      };

      await expect(costEngineService.calculate(input)).rejects.toThrow();
    });
  });
});
