/**
 * Confirm-save path correctness: containerNumber, unloadMode alias, Drop-off occupy table
 */

import { SchedulingController } from './scheduling.controller';
import { AppDataSource } from '../database';
import { ExtTruckingReturnSlotOccupancy } from '../entities/ExtTruckingReturnSlotOccupancy';
import { ExtWarehouseDailyOccupancy } from '../entities/ExtWarehouseDailyOccupancy';
import { TruckingCompany } from '../entities/TruckingCompany';
import { Warehouse } from '../entities/Warehouse';
import { Container } from '../entities/Container';

const mockManager = {
  findOne: jest.fn(),
  save: jest.fn(async (entityOrValue: any, maybeValue?: any) => {
    if (maybeValue !== undefined) return maybeValue;
    return entityOrValue;
  }),
  create: jest.fn((_Entity: any, data: any) => ({ ...data }))
};

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  query: jest.fn(),
  manager: mockManager
};

jest.mock('../database', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn()
    })),
    createQueryRunner: jest.fn()
  }
}));

jest.mock('../services/intelligentScheduling.service', () => ({
  intelligentSchedulingService: {
    batchSchedule: jest.fn()
  }
}));

describe('SchedulingController confirm-save correctness', () => {
  let controller: SchedulingController;

  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource.createQueryRunner as jest.Mock).mockReturnValue(mockQueryRunner);
    controller = new SchedulingController();
  });

  describe('resolveUnloadMode', () => {
    it('reads unloadModePlan when unloadMode is absent (dry-run plannedData shape)', () => {
      const mode = (controller as any).resolveUnloadMode({
        plannedData: { unloadModePlan: 'Drop off' }
      });
      expect(mode).toBe('Drop off');
    });

    it('ignores display placeholder "-"', () => {
      const mode = (controller as any).resolveUnloadMode({ unloadMode: '-' });
      expect(mode).toBeUndefined();
    });
  });

  describe('savePlannedDates', () => {
    it('rejects missing containerNumber (dry-run plannedData omits it)', async () => {
      await expect(
        (controller as any).savePlannedDates(
          {
            warehouseId: 'WH1',
            truckingCompanyId: 'T1',
            plannedUnloadDate: '2026-04-10',
            plannedPickupDate: '2026-04-08',
            plannedDeliveryDate: '2026-04-09',
            plannedReturnDate: '2026-04-12'
          },
          mockManager
        )
      ).rejects.toThrow(/containerNumber is required/);
    });

    it('writes unloadModePlan and EmptyReturn for the given container', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await (controller as any).savePlannedDates(
        {
          containerNumber: 'MSKU1234567',
          warehouseId: 'WH1',
          truckingCompanyId: 'T1',
          unloadModePlan: 'Drop off',
          plannedUnloadDate: '2026-04-10',
          plannedPickupDate: '2026-04-08',
          plannedDeliveryDate: '2026-04-09',
          plannedReturnDate: '2026-04-12',
          returnTerminalCode: 'WH1',
          returnTerminalName: 'Yard A'
        },
        mockManager
      );

      expect(mockManager.save).toHaveBeenCalled();
      const savedValues = mockManager.save.mock.calls.map((c: any[]) => c[0]);
      const truckingSave = savedValues.find(
        (v: any) => v && v.truckingCompanyId === 'T1' && v.unloadModePlan === 'Drop off'
      );
      expect(truckingSave?.containerNumber).toBe('MSKU1234567');
      expect(truckingSave?.scheduleStatus).toBe('issued');

      const emptySave = savedValues.find(
        (v: any) => v && v.plannedReturnDate && v.returnTerminalCode === 'WH1'
      );
      expect(emptySave?.containerNumber).toBe('MSKU1234567');

      const whSave = savedValues.find((v: any) => v && v.warehouseId === 'WH1');
      expect(whSave?.unloadModeActual).toBe('Drop off');
      expect(whSave?.containerNumber).toBe('MSKU1234567');
    });
  });

  describe('occupyCapacity', () => {
    it('updates warehouse remaining and uses return-slot table for Drop off', async () => {
      const warehouseOcc = {
        warehouseCode: 'WH1',
        date: '2026-04-10',
        plannedCount: 2,
        capacity: 10,
        remaining: 8
      };
      const returnOcc = {
        truckingCompanyId: 'T1',
        slotDate: '2026-04-12',
        plannedCount: 1,
        capacity: 5,
        remaining: 4
      };

      mockManager.findOne.mockImplementation(async (Entity: any) => {
        if (Entity === ExtWarehouseDailyOccupancy) return warehouseOcc;
        if (Entity === ExtTruckingReturnSlotOccupancy) return returnOcc;
        return null;
      });

      await (controller as any).occupyCapacity(
        {
          warehouseId: 'WH1',
          truckingCompanyId: 'T1',
          plannedUnloadDate: '2026-04-10',
          plannedReturnDate: '2026-04-12',
          unloadModePlan: 'Drop off'
        },
        mockManager
      );

      expect(warehouseOcc.plannedCount).toBe(3);
      expect(warehouseOcc.remaining).toBe(7);
      expect(returnOcc.plannedCount).toBe(2);
      expect(returnOcc.remaining).toBe(3);
    });

    it('does not touch return occupancy for Live load', async () => {
      const warehouseOcc = {
        warehouseCode: 'WH1',
        plannedCount: 0,
        capacity: 10,
        remaining: 10
      };
      mockManager.findOne.mockImplementation(async (Entity: any) => {
        if (Entity === ExtWarehouseDailyOccupancy) return warehouseOcc;
        return null;
      });

      await (controller as any).occupyCapacity(
        {
          warehouseId: 'WH1',
          truckingCompanyId: 'T1',
          plannedUnloadDate: '2026-04-10',
          plannedReturnDate: '2026-04-12',
          unloadModePlan: 'Live load'
        },
        mockManager
      );

      expect(
        mockManager.findOne.mock.calls.some((c) => c[0] === ExtTruckingReturnSlotOccupancy)
      ).toBe(false);
    });
  });

  describe('checkResourceAvailability', () => {
    it('looks up TruckingCompany by companyCode for Drop off', async () => {
      mockManager.findOne.mockImplementation(async (Entity: any, opts: any) => {
        if (Entity === Warehouse) return { warehouseCode: 'WH1' };
        if (Entity === ExtWarehouseDailyOccupancy) {
          return { plannedCount: 1, capacity: 10, remaining: 9 };
        }
        if (Entity === TruckingCompany) {
          expect(opts.where.companyCode).toBe('T1');
          expect(opts.where.truckingCompanyId).toBeUndefined();
          return { companyCode: 'T1', hasYard: true };
        }
        if (Entity === ExtTruckingReturnSlotOccupancy) {
          return { plannedCount: 0, capacity: 5, remaining: 5 };
        }
        return null;
      });

      const ok = await (controller as any).checkResourceAvailability(
        {
          plannedData: {
            warehouseId: 'WH1',
            truckingCompanyId: 'T1',
            plannedUnloadDate: '2026-04-10',
            plannedReturnDate: '2026-04-12',
            unloadModePlan: 'Drop off'
          }
        },
        mockQueryRunner
      );

      expect(ok).toBe(true);
      expect(mockManager.findOne).toHaveBeenCalledWith(
        TruckingCompany,
        expect.objectContaining({ where: { companyCode: 'T1' } })
      );
    });
  });

  describe('savePreviewResults savepoints', () => {
    it('rolls back failed item without committing partial issued state for that item', async () => {
      mockQueryRunner.query.mockResolvedValue(undefined);
      mockManager.findOne.mockImplementation(async (Entity: any) => {
        if (Entity === Container) {
          return { containerNumber: 'MSKU1234567', scheduleStatus: 'initial' };
        }
        if (Entity === Warehouse) return { warehouseCode: 'WH1', dailyUnloadCapacity: 10 };
        if (Entity === ExtWarehouseDailyOccupancy) {
          return { plannedCount: 0, capacity: 10, remaining: 10 };
        }
        return null;
      });
      // Fail history save after planned dates — savepoint should rollback the item
      let saveCount = 0;
      mockManager.save.mockImplementation(async (entity: any) => {
        saveCount++;
        // After container + warehouse + trucking + emptyReturn, fail on next (history)
        if (saveCount > 4) {
          throw new Error('history write failed');
        }
        return entity;
      });

      const result = await (controller as any).savePreviewResults([
        {
          containerNumber: 'MSKU1234567',
          plannedData: {
            warehouseId: 'WH1',
            truckingCompanyId: 'T1',
            plannedPickupDate: '2026-04-08',
            plannedDeliveryDate: '2026-04-09',
            plannedUnloadDate: '2026-04-10',
            plannedReturnDate: '2026-04-12',
            unloadModePlan: 'Live load'
          }
        }
      ]);

      expect(result.successCount).toBe(0);
      expect(mockQueryRunner.query).toHaveBeenCalledWith(expect.stringMatching(/^SAVEPOINT /));
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        expect.stringMatching(/^ROLLBACK TO SAVEPOINT /)
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });
});
