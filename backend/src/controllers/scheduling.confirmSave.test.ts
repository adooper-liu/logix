/**
 * Confirm-save path: unloadModePlan, atomic occupy, Drop-off return table, savepoints
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
  create: jest.fn((_Entity: any, data: any) => ({ ...data })),
  query: jest.fn()
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
    mockManager.query.mockResolvedValue([{ id: 1 }]);
    mockQueryRunner.query.mockResolvedValue(undefined);
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

  describe('occupyCapacity (atomic)', () => {
    it('uses conditional UPDATE on warehouse + return-slot tables for Drop off', async () => {
      mockManager.findOne.mockImplementation(async (Entity: any) => {
        if (Entity === Warehouse) {
          return { warehouseCode: 'WH1', dailyUnloadCapacity: 10 };
        }
        if (Entity === TruckingCompany) {
          return { companyCode: 'T1', dailyReturnCapacity: 5, dailyCapacity: 8 };
        }
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

      const sqlCalls = mockManager.query.mock.calls.map((c: any[]) => String(c[0]));
      expect(sqlCalls.some((s) => s.includes('ext_warehouse_daily_occupancy'))).toBe(true);
      expect(sqlCalls.some((s) => s.includes('ext_trucking_return_slot_occupancy'))).toBe(true);
      expect(sqlCalls.some((s) => s.includes('planned_count < capacity'))).toBe(true);
      expect(sqlCalls.some((s) => s.includes('ON CONFLICT'))).toBe(true);
      // Must not touch the delivery-slot table
      expect(sqlCalls.some((s) => s.includes('ext_trucking_slot_occupancy'))).toBe(false);
    });

    it('does not touch return occupancy for Live load', async () => {
      mockManager.findOne.mockImplementation(async (Entity: any) => {
        if (Entity === Warehouse) {
          return { warehouseCode: 'WH1', dailyUnloadCapacity: 10 };
        }
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

      const sqlCalls = mockManager.query.mock.calls.map((c: any[]) => String(c[0]));
      expect(sqlCalls.some((s) => s.includes('ext_trucking_return_slot_occupancy'))).toBe(false);
    });

    it('rejects when conditional UPDATE affects zero rows (full / race loser)', async () => {
      mockManager.findOne.mockResolvedValue({
        warehouseCode: 'WH1',
        dailyUnloadCapacity: 1
      });
      // INSERT ok, UPDATE returns no rows
      mockManager.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([]);

      await expect(
        (controller as any).occupyCapacity(
          {
            warehouseId: 'WH1',
            truckingCompanyId: 'T1',
            plannedUnloadDate: '2026-04-10',
            plannedReturnDate: '2026-04-12',
            unloadModePlan: 'Live load'
          },
          mockManager
        )
      ).rejects.toThrow(/资源不足/);
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
    it('rolls back failed item when atomic occupy loses the capacity race', async () => {
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
      // Warehouse INSERT ok, conditional UPDATE returns 0 rows → capacity race loser
      mockManager.query
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([]);

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
      expect(result.results[0].message).toMatch(/资源不足/);
      expect(mockQueryRunner.query).toHaveBeenCalledWith(expect.stringMatching(/^SAVEPOINT /));
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        expect.stringMatching(/^ROLLBACK TO SAVEPOINT /)
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('merges preview.containerNumber into plannedData before save', async () => {
      mockManager.findOne.mockImplementation(async (Entity: any) => {
        if (Entity === Container) {
          return { containerNumber: 'MSKU9999999', scheduleStatus: 'initial' };
        }
        if (Entity === Warehouse) return { warehouseCode: 'WH1', dailyUnloadCapacity: 10 };
        if (Entity === ExtWarehouseDailyOccupancy) {
          return { plannedCount: 0, capacity: 10, remaining: 10 };
        }
        return null;
      });

      const result = await (controller as any).savePreviewResults([
        {
          containerNumber: 'MSKU9999999',
          plannedData: {
            // intentionally omit containerNumber — dry-run sibling shape
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

      expect(result.successCount).toBe(1);
      const savedWithCn = mockManager.save.mock.calls
        .map((c: any[]) => c[0])
        .filter((v: any) => v && v.containerNumber === 'MSKU9999999');
      expect(savedWithCn.length).toBeGreaterThan(0);
    });
  });
});
