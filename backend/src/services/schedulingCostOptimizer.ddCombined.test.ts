/**
 * CostOptimizer 必须把 D&D 合并费计入 totalCost，否则会选错“最优”卸柜方案。
 */

import { SchedulingCostOptimizerService, UnloadOption } from './schedulingCostOptimizer.service';

jest.mock('../database', () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

jest.mock('../utils/logger', () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

describe('SchedulingCostOptimizerService - ddCombinedCost', () => {
  it('evaluateTotalCost 将 ddCombinedCost 计入 totalCost', async () => {
    const service = new SchedulingCostOptimizerService();
    const calculateTotalCost = jest.fn().mockResolvedValue({
      demurrageCost: 0,
      detentionCost: 0,
      storageCost: 0,
      ddCombinedCost: 450,
      transportationCost: 100,
      totalCost: 550,
      matchedStandards: []
    });
    (service as any).demurrageService = { calculateTotalCost };

    const option: UnloadOption = {
      containerNumber: 'MSCU1234567',
      strategy: 'Direct',
      plannedPickupDate: new Date('2026-03-20T00:00:00.000Z'),
      plannedUnloadDate: new Date('2026-03-20T00:00:00.000Z'),
      isWithinFreePeriod: false,
      warehouse: {
        warehouseCode: 'WH1',
        warehouseName: 'W',
        country: 'US'
      } as any,
      truckingCompany: {
        companyCode: 'TC1',
        companyName: 'T'
      } as any
    };

    const breakdown = await service.evaluateTotalCost(option);

    expect(calculateTotalCost).toHaveBeenCalled();
    expect(breakdown.ddCombinedCost).toBe(450);
    expect(breakdown.transportationCost).toBe(100);
    // Direct：无堆场/加急附加，合计应为 450 + 100
    expect(breakdown.totalCost).toBe(550);
  });

  it('selectBestOption 不会因漏计 D&D 合并费而选错方案', async () => {
    const service = new SchedulingCostOptimizerService();
    const calculateTotalCost = jest
      .fn()
      // 方案 A：仅运输费 80，但有 D&D 合并 500 → 真实 580
      .mockResolvedValueOnce({
        demurrageCost: 0,
        detentionCost: 0,
        storageCost: 0,
        ddCombinedCost: 500,
        transportationCost: 80,
        totalCost: 580,
        matchedStandards: []
      })
      // 方案 B：运输费 200，无 D&D → 真实 200（应胜出）
      .mockResolvedValueOnce({
        demurrageCost: 0,
        detentionCost: 0,
        storageCost: 0,
        ddCombinedCost: 0,
        transportationCost: 200,
        totalCost: 200,
        matchedStandards: []
      });
    (service as any).demurrageService = { calculateTotalCost };

    const base = {
      containerNumber: 'MSCU1234567',
      isWithinFreePeriod: false,
      warehouse: { warehouseCode: 'WH1', country: 'US' } as any,
      truckingCompany: { companyCode: 'TC1' } as any
    };

    const expensiveWithDd: UnloadOption = {
      ...base,
      strategy: 'Direct',
      plannedPickupDate: new Date('2026-03-25T00:00:00.000Z'),
      plannedUnloadDate: new Date('2026-03-25T00:00:00.000Z')
    };
    const cheaperWithoutDd: UnloadOption = {
      ...base,
      strategy: 'Direct',
      plannedPickupDate: new Date('2026-03-18T00:00:00.000Z'),
      plannedUnloadDate: new Date('2026-03-18T00:00:00.000Z')
    };

    const best = await service.selectBestOption([expensiveWithDd, cheaperWithoutDd]);
    expect(best.option.plannedPickupDate.toISOString()).toBe('2026-03-18T00:00:00.000Z');
    expect(best.costBreakdown.totalCost).toBe(200);
  });
});
