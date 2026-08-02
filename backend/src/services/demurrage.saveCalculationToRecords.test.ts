/**
 * Regression: saveCalculationToRecords must delete+insert inside one transaction
 * so a mid-write failure cannot erase prior demurrage charges.
 */

import { ExtDemurrageRecord } from '../entities/ExtDemurrageRecord';
import { DemurrageService, type DemurrageCalculationResult } from './demurrage.service';

type TxManager = {
  delete: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function buildResult(): DemurrageCalculationResult {
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
    skippedItems: []
  } as unknown as DemurrageCalculationResult;
}

function serviceWithTransaction(transactionMock: jest.Mock): DemurrageService {
  const service = Object.create(DemurrageService.prototype) as DemurrageService;
  Object.assign(service, {
    recordRepo: { manager: { transaction: transactionMock } }
  });
  return service;
}

describe('saveCalculationToRecords atomicity', () => {
  it('uses a single manager.transaction for delete+insert', async () => {
    const deleteMock = jest.fn().mockResolvedValue({ affected: 1 });
    const createMock = jest.fn((_entity: unknown, data: unknown) => data);
    const saveMock = jest.fn(async (rec: unknown) => rec);
    const transactionMock = jest.fn(async (fn: (m: TxManager) => Promise<number>) =>
      fn({ delete: deleteMock, create: createMock, save: saveMock })
    );

    const count = await serviceWithTransaction(transactionMock).saveCalculationToRecords(
      buildResult(),
      false,
      'USLAX',
      'arrived'
    );

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith(ExtDemurrageRecord, {
      containerNumber: 'TEST0000001'
    });
    expect(createMock).toHaveBeenCalledWith(
      ExtDemurrageRecord,
      expect.objectContaining({ chargeType: 'DEM', chargeAmount: 100, isFinal: false })
    );
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(count).toBe(1);
  });

  it('propagates insert failures so the delete is rolled back', async () => {
    const deleteMock = jest.fn().mockResolvedValue({ affected: 2 });
    const createMock = jest.fn((_entity: unknown, data: unknown) => data);
    const saveMock = jest.fn().mockRejectedValue(new Error('db down'));
    const transactionMock = jest.fn(async (fn: (m: TxManager) => Promise<number>) => {
      await fn({ delete: deleteMock, create: createMock, save: saveMock });
    });

    await expect(
      serviceWithTransaction(transactionMock).saveCalculationToRecords(buildResult(), true)
    ).rejects.toThrow('db down');
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  it('returns 0 when recordRepo is unavailable', async () => {
    const service = Object.create(DemurrageService.prototype) as DemurrageService;
    Object.assign(service, { recordRepo: undefined });
    await expect(service.saveCalculationToRecords(buildResult(), false)).resolves.toBe(0);
  });
});

describe('batchComputeAndSaveRecords pagination', () => {
  it('applies offset with stable paging window', async () => {
    const calculateForContainer = jest.fn().mockResolvedValue({ result: null });
    const service = Object.create(DemurrageService.prototype) as DemurrageService;
    Object.assign(service, {
      getContainerNumbersInDateRange: jest.fn().mockResolvedValue(['A', 'B', 'C', 'D']),
      getDestinationPortsForContainers: jest.fn().mockResolvedValue(new Map()),
      calculateForContainer,
      containerRepo: { findOne: jest.fn() },
      recordRepo: {}
    });

    const out = await service.batchComputeAndSaveRecords({ limit: 2, offset: 2 });
    expect(calculateForContainer.mock.calls.map((c: string[]) => c[0])).toEqual(['C', 'D']);
    expect(out).toMatchObject({ processedCount: 2, computed: 2 });
  });
});
