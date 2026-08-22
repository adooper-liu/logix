/**
 * 手工指定仓库排产：dryRun=false 必须写入计划表（与前端「直接保存」一致）
 */
import { AppDataSource } from '../database';
import { Warehouse } from '../entities/Warehouse';
import { IntelligentSchedulingService } from './intelligentScheduling.service';

const warehouse = {
  warehouseCode: 'WH-LAX',
  warehouseName: 'LAX Warehouse',
  country: 'US',
  status: 'ACTIVE'
};
const truckingCompany = {
  companyCode: 'TC1',
  companyName: 'Fleet A',
  hasYard: true
};
const container = {
  containerNumber: 'MSCU1234567',
  replenishmentOrders: [{ customer: { country: 'US' } }],
  portOperations: []
};
const destPo = {
  portCode: 'USLAX',
  portName: 'Los Angeles',
  eta: new Date('2026-09-01T00:00:00Z'),
  ata: null,
  lastFreeDate: new Date('2026-09-10T00:00:00Z')
};
const plannedPickupDate = new Date('2026-09-02T00:00:00Z');
const plannedDeliveryDate = new Date('2026-09-03T00:00:00Z');
const plannedUnloadDate = new Date('2026-09-04T00:00:00Z');
const plannedReturnDate = new Date('2026-09-08T00:00:00Z');

type ScheduleOutcome = {
  success: boolean;
  plannedData?: { warehouseId?: string; plannedPickupDate?: string };
};

type DesignatedScheduler = {
  warehouseSelectorService: { getCandidateWarehouses: jest.Mock };
  dateCalculator: {
    calculatePlannedPickupDate: jest.Mock;
    calculatePlannedDeliveryDate: jest.Mock;
    calculatePlannedReturnDate: jest.Mock;
  };
  findEarliestAvailableDay: jest.Mock;
  truckingSelectorService: { selectTruckingCompany: jest.Mock };
  emptyReturnRepo: { findOne: jest.Mock };
  saveScheduleToDatabase: jest.Mock;
  calculateEstimatedCosts: jest.Mock;
  scheduleWithDesignatedWarehouse: (
    c: typeof container,
    po: typeof destPo,
    warehouseCode: string,
    request: { dryRun?: boolean }
  ) => Promise<ScheduleOutcome>;
};

function asScheduler(service: IntelligentSchedulingService): DesignatedScheduler {
  return service as unknown as DesignatedScheduler;
}

function mockWarehouseRepository(entity: { name?: string }): { findOne: jest.Mock } {
  if (entity === Warehouse || entity?.name === 'Warehouse') {
    return { findOne: jest.fn().mockResolvedValue(warehouse) };
  }
  return { findOne: jest.fn().mockResolvedValue(null) };
}

function stubDesignatedWarehousePath(
  scheduler: DesignatedScheduler,
  saveScheduleToDatabase: jest.Mock
): void {
  scheduler.warehouseSelectorService = {
    getCandidateWarehouses: jest.fn().mockResolvedValue([warehouse])
  };
  scheduler.dateCalculator = {
    calculatePlannedPickupDate: jest.fn().mockResolvedValue(plannedPickupDate),
    calculatePlannedDeliveryDate: jest.fn().mockReturnValue(plannedDeliveryDate),
    calculatePlannedReturnDate: jest.fn().mockResolvedValue({ returnDate: plannedReturnDate })
  };
  scheduler.findEarliestAvailableDay = jest.fn().mockResolvedValue(plannedUnloadDate);
  scheduler.truckingSelectorService = {
    selectTruckingCompany: jest.fn().mockResolvedValue(truckingCompany)
  };
  scheduler.emptyReturnRepo = { findOne: jest.fn().mockResolvedValue(null) };
  scheduler.saveScheduleToDatabase = saveScheduleToDatabase;
  scheduler.calculateEstimatedCosts = jest.fn().mockResolvedValue({
    demurrageCost: 0,
    detentionCost: 0,
    storageCost: 0,
    ddCombinedCost: 0,
    transportationCost: 0,
    yardStorageCost: 0,
    handlingCost: 0,
    totalCost: 0,
    currency: 'USD'
  });
}

describe('IntelligentSchedulingService.scheduleWithDesignatedWarehouse', () => {
  let scheduler: DesignatedScheduler;
  let saveScheduleToDatabase: jest.Mock;

  beforeEach(() => {
    (AppDataSource.getRepository as jest.Mock).mockImplementation(mockWarehouseRepository);
    scheduler = asScheduler(new IntelligentSchedulingService());
    saveScheduleToDatabase = jest.fn().mockResolvedValue({
      containerNumber: container.containerNumber,
      success: true,
      message: '排产成功'
    });
    stubDesignatedWarehousePath(scheduler, saveScheduleToDatabase);
  });

  it('persists plan dates when dryRun is false (UI direct save)', async () => {
    const result = await scheduler.scheduleWithDesignatedWarehouse(container, destPo, 'WH-LAX', {
      dryRun: false
    });

    expect(result.success).toBe(true);
    expect(saveScheduleToDatabase).toHaveBeenCalledTimes(1);
    expect(saveScheduleToDatabase).toHaveBeenCalledWith(
      container,
      warehouse,
      truckingCompany,
      expect.any(Date),
      plannedPickupDate,
      plannedUnloadDate,
      'Drop off'
    );
    expect(result.plannedData?.warehouseId).toBe('WH-LAX');
    expect(result.plannedData?.plannedPickupDate).toBe('2026-09-02');
  });

  it('does not persist when dryRun is true (preview)', async () => {
    const result = await scheduler.scheduleWithDesignatedWarehouse(container, destPo, 'WH-LAX', {
      dryRun: true
    });

    expect(result.success).toBe(true);
    expect(saveScheduleToDatabase).not.toHaveBeenCalled();
    expect(result.plannedData?.warehouseId).toBe('WH-LAX');
  });
});
