/**
 * 一键排产落库：Drop off 送仓日、还箱日、清关日、产能占用
 */
import { intelligentSchedulingService } from './intelligentScheduling.service';
import { Container } from '../entities/Container';
import { EmptyReturn } from '../entities/EmptyReturn';
import { PortOperation } from '../entities/PortOperation';
import { TruckingTransport } from '../entities/TruckingTransport';
import { WarehouseOperation } from '../entities/WarehouseOperation';

type PersistResult = {
  success: boolean;
  plannedData: {
    plannedDeliveryDate: string;
    plannedPickupDate: string;
    plannedReturnDate: string;
    plannedCustomsDate: string;
    unloadModePlan: string;
  };
};

type PersistService = {
  saveScheduleToDatabase: (
    container: Container,
    warehouse: unknown,
    truckingCompany: unknown,
    plannedCustomsDate: Date,
    plannedPickupDate: Date,
    plannedUnloadDate: Date,
    unloadMode: 'Drop off' | 'Live load'
  ) => Promise<PersistResult>;
  [key: string]: unknown;
};

const pickup = new Date(Date.UTC(2026, 7, 26));
const unload = new Date(Date.UTC(2026, 7, 28));
const customs = new Date(Date.UTC(2026, 7, 25));
const returnDate = new Date(Date.UTC(2026, 7, 29));

const destPo = {
  id: 'po-dest-1',
  containerNumber: 'C001',
  portType: 'destination',
  portCode: 'USLAX',
  lastFreeDate: new Date(Date.UTC(2026, 8, 5))
} as PortOperation;

const container = {
  containerNumber: 'C001',
  scheduleStatus: 'initial',
  portOperations: [destPo]
} as Container;

const warehouse = { warehouseCode: 'WH001', warehouseName: 'LA Warehouse', country: 'US' };
const truckingCompany = { companyCode: 'TRK001', companyName: 'Fast Truck', hasYard: true };

function captureSave<T extends object>(bucket: T[]) {
  return jest.fn().mockImplementation(async (row: T) => {
    bucket.push({ ...row });
    return row;
  });
}

function svc(): PersistService {
  return intelligentSchedulingService as unknown as PersistService;
}

function stubRepos(truckingSaved: Partial<TruckingTransport>[], emptySaved: Partial<EmptyReturn>[]) {
  const inst = svc();
  inst.truckingTransportRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    save: captureSave(truckingSaved)
  };
  inst.warehouseOperationRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    save: captureSave([] as Partial<WarehouseOperation>[])
  };
  inst.emptyReturnRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    save: captureSave(emptySaved)
  };
  inst.portOperationRepo = {
    findOne: jest.fn().mockResolvedValue(destPo),
    save: jest.fn().mockResolvedValue(destPo)
  };
  inst.containerRepo = { save: jest.fn().mockResolvedValue(container) };
}

function stubScheduleDeps(occupyWarehouse: jest.Mock, occupyTrucking: jest.Mock, occupyReturn: jest.Mock) {
  const inst = svc();
  inst.dateCalculator = {
    calculatePlannedDeliveryDate: (pickupDate: Date, unloadMode: string, unloadDate: Date) =>
      unloadMode === 'Drop off' ? new Date(unloadDate) : new Date(pickupDate),
    calculatePlannedReturnDate: jest.fn().mockResolvedValue({ returnDate })
  };
  inst.occupancyCalculator = {
    decrementWarehouseOccupancy: occupyWarehouse,
    decrementTruckingOccupancy: occupyTrucking
  };
  inst.decrementFleetReturnOccupancy = occupyReturn;
  inst.containerStatusService = { updateStatus: jest.fn().mockResolvedValue(true) };
}

async function persist(mode: 'Drop off' | 'Live load') {
  return svc().saveScheduleToDatabase(
    container,
    warehouse,
    truckingCompany,
    customs,
    pickup,
    unload,
    mode
  );
}

describe('IntelligentSchedulingService.saveScheduleToDatabase', () => {
  let truckingSaved: Partial<TruckingTransport>[];
  let emptySaved: Partial<EmptyReturn>[];
  let occupyWarehouse: jest.Mock;
  let occupyTrucking: jest.Mock;
  let occupyReturn: jest.Mock;

  beforeEach(() => {
    truckingSaved = [];
    emptySaved = [];
    occupyWarehouse = jest.fn().mockResolvedValue(undefined);
    occupyTrucking = jest.fn().mockResolvedValue(undefined);
    occupyReturn = jest.fn().mockResolvedValue(undefined);
    stubRepos(truckingSaved, emptySaved);
    stubScheduleDeps(occupyWarehouse, occupyTrucking, occupyReturn);
  });

  it('Drop off: 送仓日=卸柜日、写入还箱日并扣减产能', async () => {
    const result = await persist('Drop off');

    expect(result.success).toBe(true);
    expect(result.plannedData.plannedDeliveryDate).toBe('2026-08-28');
    expect(result.plannedData.plannedPickupDate).toBe('2026-08-26');
    expect(result.plannedData.plannedReturnDate).toBe('2026-08-29');
    expect(result.plannedData.plannedCustomsDate).toBe('2026-08-25');
    expect(truckingSaved[0].plannedDeliveryDate).toEqual(unload);
    expect(emptySaved[0].plannedReturnDate).toEqual(returnDate);
    expect(occupyWarehouse).toHaveBeenCalledWith('WH001', unload);
    expect(occupyTrucking).toHaveBeenCalledWith(
      expect.objectContaining({ truckingCompanyId: 'TRK001', date: pickup })
    );
    expect(occupyReturn).toHaveBeenCalledWith('TRK001', returnDate, 'WH001', 'USLAX');
  });

  it('Live load: 送仓日=提柜日，不扣还箱档期', async () => {
    const result = await persist('Live load');

    expect(result.plannedData.plannedDeliveryDate).toBe('2026-08-26');
    expect(truckingSaved[0].plannedDeliveryDate).toEqual(pickup);
    expect(occupyReturn).not.toHaveBeenCalled();
    expect(occupyWarehouse).toHaveBeenCalled();
  });
});
