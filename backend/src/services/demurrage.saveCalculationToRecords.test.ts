/**
 * Regression: saveCalculationToRecords must delete+insert inside one transaction
 * so a mid-write failure cannot erase prior demurrage charges.
 */

import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { DemurrageService } from './demurrage.service';
import type { DemurrageCalculationResult } from './demurrage.service';

function buildResult(overrides?: Partial<DemurrageCalculationResult>): DemurrageCalculationResult {
  return {
    containerNumber: 'TEST0000001',
    totalAmount: 100,
    currency: 'USD',
    items: [
      {
        standardId: 1,
        chargeName: 'Demurrage',
        chargeTypeCode: 'DEM',
        freeDays: 5,
        calculationMode: 'actual',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-10'),
        startDateSource: null,
        endDateSource: null,
        startDateMode: 'actual',
        endDateMode: 'actual',
        lastFreeDate: new Date('2026-01-05'),
        lastFreeDateMode: 'actual',
        chargeDays: 5,
        amount: 100,
        currency: 'USD',
        tierBreakdown: []
      }
    ],
    skippedItems: [],
    ...overrides
  } as DemurrageCalculationResult;
}

describe('DemurrageService.saveCalculationToRecords atomicity', () => {
  it('runs delete and inserts inside a single manager.transaction', async () => {
    const deleteMock = jest.fn().mockResolvedValue({ affected: 1 });
    const createMock = jest.fn((_entity, data) => data);
    const saveMock = jest.fn(async (rec) => rec);
    const transactionMock = jest.fn(async (fn) =>
      fn({
        delete: deleteMock,
        create: createMock,
        save: saveMock
      })
    );

    const service = Object.create(DemurrageService.prototype) as DemurrageService;
    (service as any).recordRepo = {
      manager: { transaction: transactionMock }
    };

    const count = await service.saveCalculationToRecords(buildResult(), false, 'USLAX', 'arrived');

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith(ExtDemurrageRecord, {
      containerNumber: 'TEST0000001'
    });
    expect(createMock).toHaveBeenCalledWith(
      ExtDemurrageRecord,
      expect.objectContaining({
        containerNumber: 'TEST0000001',
        chargeType: 'DEM',
        chargeAmount: 100,
        destinationPort: 'USLAX',
        logisticsStatus: 'arrived',
        isFinal: false
      })
    );
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(count).toBe(1);
  });

  it('does not leave a delete applied when a later insert throws', async () => {
    const deleteMock = jest.fn().mockResolvedValue({ affected: 2 });
    const createMock = jest.fn((_entity, data) => data);
    const saveMock = jest.fn().mockRejectedValue(new Error('db down'));

    // Simulate TypeORM rolling back when the transactional callback rejects.
    const transactionMock = jest.fn(async (fn) => {
      await fn({
        delete: deleteMock,
        create: createMock,
        save: saveMock
      });
    });

    const service = Object.create(DemurrageService.prototype) as DemurrageService;
    (service as any).recordRepo = {
      manager: { transaction: transactionMock }
    };

    await expect(
      service.saveCalculationToRecords(buildResult(), true)
    ).rejects.toThrow('db down');

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('returns 0 when recordRepo is unavailable', async () => {
    const service = Object.create(DemurrageService.prototype) as DemurrageService;
    (service as any).recordRepo = undefined;
    await expect(service.saveCalculationToRecords(buildResult(), false)).resolves.toBe(0);
  });
});

describe('DemurrageService.batchComputeAndSaveRecords pagination', () => {
  it('applies offset with stable paging window', async () => {
    const service = Object.create(DemurrageService.prototype) as DemurrageService;
    (service as any).getContainerNumbersInDateRange = jest
      .fn()
      .mockResolvedValue(['A', 'B', 'C', 'D']);
    (service as any).getDestinationPortsForContainers = jest
      .fn()
      .mockResolvedValue(new Map());
    (service as any).calculateForContainer = jest.fn().mockResolvedValue({ result: null });
    (service as any).containerRepo = { findOne: jest.fn() };
    (service as any).recordRepo = {};

    const out = await service.batchComputeAndSaveRecords({ limit: 2, offset: 2 });

    expect((service as any).calculateForContainer.mock.calls.map((c: string[]) => c[0])).toEqual([
      'C',
      'D'
    ]);
    expect(out.processedCount).toBe(2);
    expect(out.computed).toBe(2);
  });
});
