/**
 * 飞驼同步后重算物流状态：SeaFreight 必须经 Container 关联加载。
 * process_sea_freight 无 container_number；错列查询会抛 EntityPropertyNotFoundError，
 * 被 recalculateLogisticsStatus 的 catch 吞掉，导致 status / gantt_derived 不落库。
 */

import axios, { AxiosInstance, AxiosStatic } from 'axios';
import { AppDataSource } from '../database';
import { SimplifiedStatus } from '../utils/logisticsStatusMachine';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  create: jest.Mock;
  createQueryBuilder: jest.Mock;
};

type RecalcService = {
  containerRepository: RepoMock;
  seaFreightRepository: RepoMock;
  portOperationRepository: RepoMock;
  truckingTransportRepository: RepoMock;
  warehouseOperationRepository: RepoMock;
  emptyReturnRepository: RepoMock;
  recalculateLogisticsStatus: (containerNumber: string) => Promise<void>;
};

const CONTAINER_NUMBER = 'MSCU1234567';

function stubAxiosCreate(): void {
  const client = {
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  } as unknown as AxiosInstance;
  (axios as AxiosStatic).create = jest.fn(() => client);
}

function makeRepo(): RepoMock {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation(async (row: unknown) => row),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockImplementation((row: unknown) => row ?? {}),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(null)
    })
  };
}

const repos = new Map<string, RepoMock>();

function stubDataSource(): void {
  (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: { name?: string }) => {
    const key = entity?.name || 'unknown';
    if (!repos.has(key)) {
      repos.set(key, makeRepo());
    }
    return repos.get(key);
  });
}

function stubSeaFreightLookup(repo: RepoMock): void {
  repo.findOne.mockImplementation(async (opts: { where?: Record<string, unknown> }) => {
    if (opts?.where && Object.prototype.hasOwnProperty.call(opts.where, 'containerNumber')) {
      throw new Error(
        'EntityPropertyNotFoundError: Property "containerNumber" was not found in SeaFreight'
      );
    }
    return { billOfLadingNumber: 'BL001' };
  });
}

function containerWithSeaFreight(seaFreight: { billOfLadingNumber: string } | null) {
  return {
    containerNumber: CONTAINER_NUMBER,
    logisticsStatus: SimplifiedStatus.IN_TRANSIT,
    ganttDerived: null,
    billOfLadingNumber: 'BL001',
    seaFreight
  };
}

function stubRelatedLookups(service: RecalcService): void {
  service.portOperationRepository.createQueryBuilder.mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([
      {
        portType: 'destination',
        portSequence: 2,
        ata: new Date('2026-08-20T00:00:00.000Z')
      }
    ])
  });
  service.truckingTransportRepository.findOne.mockResolvedValue(null);
  service.warehouseOperationRepository.findOne.mockResolvedValue(null);
  service.emptyReturnRepository.findOne.mockResolvedValue(null);
}

stubAxiosCreate();
stubDataSource();

const { ExternalDataService } = require('./externalDataService') as {
  ExternalDataService: new () => RecalcService;
};

describe('ExternalDataService.recalculateLogisticsStatus', () => {
  let service: RecalcService;
  let containerRepo: RepoMock;
  let seaFreightRepo: RepoMock;

  beforeEach(() => {
    stubAxiosCreate();
    stubDataSource();
    service = new ExternalDataService();
    containerRepo = service.containerRepository;
    seaFreightRepo = service.seaFreightRepository;

    containerRepo.findOne.mockResolvedValue(
      containerWithSeaFreight({
        billOfLadingNumber: 'BL001'
      })
    );
    containerRepo.save.mockImplementation(async (row: unknown) => row);
    stubSeaFreightLookup(seaFreightRepo);
    stubRelatedLookups(service);
  });

  it('loads SeaFreight via Container relation and persists AT_PORT after dest ATA', async () => {
    await service.recalculateLogisticsStatus(CONTAINER_NUMBER);

    expect(containerRepo.findOne).toHaveBeenCalledWith({
      where: { containerNumber: CONTAINER_NUMBER },
      relations: ['seaFreight']
    });
    expect(seaFreightRepo.findOne).not.toHaveBeenCalled();
    expect(containerRepo.save).toHaveBeenCalledTimes(1);
    const saved = containerRepo.save.mock.calls[0][0] as {
      logisticsStatus: string;
      ganttDerived: { ruleVersion: string };
    };
    expect(saved.logisticsStatus).toBe(SimplifiedStatus.AT_PORT);
    expect(saved.ganttDerived).toEqual(expect.objectContaining({ ruleVersion: expect.any(String) }));
  });

  it('still updates status when SeaFreight relation is missing (no throw)', async () => {
    containerRepo.findOne.mockResolvedValue(containerWithSeaFreight(null));

    await service.recalculateLogisticsStatus(CONTAINER_NUMBER);

    expect(seaFreightRepo.findOne).not.toHaveBeenCalled();
    expect(containerRepo.save).toHaveBeenCalledTimes(1);
    expect(containerRepo.save.mock.calls[0][0].logisticsStatus).toBe(SimplifiedStatus.AT_PORT);
  });
});
