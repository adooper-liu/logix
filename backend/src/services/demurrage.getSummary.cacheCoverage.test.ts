/**
 * Regression: getSummary must not treat partial ext_demurrage_records as a full-range total.
 *
 * Scheduler batchComputeAndSaveRecords uses DEMURRAGE_BATCH_SIZE (default 200) and may leave
 * charged containers uncached. Returning fromCache with containerCount=full range understates fees.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, max-lines-per-function */

import { DemurrageService } from './demurrage.service';

function mockQueryBuilder(rows: unknown[]) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
    getRawOne: jest.fn().mockResolvedValue({ cnt: rows.length })
  };
  return qb;
}

describe('DemurrageService.getSummary cache coverage', () => {
  it('merges partial cache with realtime for missing charged containers', async () => {
    const service = Object.create(DemurrageService.prototype) as DemurrageService;

    const cachedRows = [
      { containerNumber: 'CACHED001', total: '1000', currency: 'USD' },
      { containerNumber: 'CACHED002', total: '500', currency: 'USD' }
    ];

    (service as any).recordRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder(cachedRows))
    };
    (service as any).getContainerNumbersInDateRange = jest
      .fn()
      .mockResolvedValue(['CACHED001', 'CACHED002', 'MISSING001']);
    (service as any).getSummaryByPortFromRecords = jest.fn().mockResolvedValue([]);
    (service as any).calculateForContainer = jest.fn().mockImplementation(async (cn: string) => {
      if (cn === 'MISSING001') {
        return { result: { containerNumber: cn, totalAmount: 2500, currency: 'USD' } };
      }
      return { result: { containerNumber: cn, totalAmount: 0, currency: 'USD' } };
    });

    const out = await service.getSummary('2026-01-01', '2026-06-30', 500);

    expect(out.fromCache).toBeUndefined();
    expect(out.totalAmount).toBe(4000); // 1000+500+2500, not just cached 1500
    expect(out.containerCountWithCharge).toBe(3);
    expect(out.containerCount).toBe(3);
    expect(out.partialResults).toBeUndefined();
    expect((service as any).calculateForContainer).toHaveBeenCalledWith('MISSING001');
    expect((service as any).calculateForContainer).not.toHaveBeenCalledWith('CACHED001');
  });

  it('returns fromCache only when every requested container has records', async () => {
    const service = Object.create(DemurrageService.prototype) as DemurrageService;

    const cachedRows = [
      { containerNumber: 'A', total: '100', currency: 'USD' },
      { containerNumber: 'B', total: '200', currency: 'USD' }
    ];

    (service as any).recordRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder(cachedRows)),
      manager: { query: jest.fn().mockResolvedValue([]) }
    };
    (service as any).getContainerNumbersInDateRange = jest.fn().mockResolvedValue(['A', 'B']);
    (service as any).getSummaryByPortFromRecords = jest.fn().mockResolvedValue([]);
    (service as any).calculateForContainer = jest.fn();

    const out = await service.getSummary('2026-01-01', '2026-06-30', 500);

    expect(out.fromCache).toBe(true);
    expect(out.totalAmount).toBe(300);
    expect(out.containerCount).toBe(2);
    expect((service as any).calculateForContainer).not.toHaveBeenCalled();
  });

  it('marks partialResults when missing containers exceed realtime limit', async () => {
    const service = Object.create(DemurrageService.prototype) as DemurrageService;

    const cachedRows = [{ containerNumber: 'CACHED001', total: '100', currency: 'USD' }];
    const all = ['CACHED001', 'M1', 'M2', 'M3'];

    (service as any).recordRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder(cachedRows))
    };
    (service as any).getContainerNumbersInDateRange = jest.fn().mockResolvedValue(all);
    (service as any).calculateForContainer = jest.fn().mockResolvedValue({
      result: { containerNumber: 'Mx', totalAmount: 10, currency: 'USD' }
    });

    const out = await service.getSummary('2026-01-01', '2026-06-30', 2);

    expect(out.partialResults).toBe(true);
    expect(out.totalContainersInRange).toBe(4);
    expect(out.containerCount).toBe(3); // 1 cached + 2 realtime
    expect(out.totalAmount).toBe(120); // 100 + 10 + 10
    expect((service as any).calculateForContainer).toHaveBeenCalledTimes(2);
  });
});

describe('DemurrageService.getTopContainers cache coverage', () => {
  it('falls back to realtime when record coverage is incomplete', async () => {
    const service = Object.create(DemurrageService.prototype) as DemurrageService;

    const coverageQb = mockQueryBuilder([]);
    coverageQb.getRawOne = jest.fn().mockResolvedValue({ cnt: 1 }); // only 1 of 2 covered
    coverageQb.getRawMany = jest.fn().mockResolvedValue([
      {
        containerNumber: 'LOW001',
        totalAmount: '100',
        chargeDays: 2,
        currency: 'USD',
        chargeEndDate: null
      }
    ]);

    (service as any).recordRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(coverageQb)
    };
    (service as any).getContainerNumbersInDateRange = jest
      .fn()
      .mockResolvedValue(['LOW001', 'HIGH001']);
    (service as any).getDestinationPortsForContainers = jest.fn().mockResolvedValue(new Map());
    (service as any).getLogisticsStatusForContainers = jest.fn().mockResolvedValue(new Map());
    (service as any).calculateForContainer = jest.fn().mockImplementation(async (cn: string) => {
      if (cn === 'HIGH001') {
        return {
          result: {
            containerNumber: cn,
            totalAmount: 9000,
            currency: 'USD',
            items: [{ chargeDays: 10 }]
          }
        };
      }
      return {
        result: {
          containerNumber: cn,
          totalAmount: 100,
          currency: 'USD',
          items: [{ chargeDays: 2 }]
        }
      };
    });

    const out = await service.getTopContainers('2026-01-01', '2026-06-30', 10);

    expect(out.fromCache).toBeUndefined();
    expect(out.items[0].containerNumber).toBe('HIGH001');
    expect(out.items[0].totalAmount).toBe(9000);
  });
});
