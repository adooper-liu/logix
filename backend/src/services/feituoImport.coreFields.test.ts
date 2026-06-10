const mockDefaultRepository = {
  findOne: jest.fn(),
  create: jest.fn((value) => ({ ...value })),
  save: jest.fn(async (value) => value),
  query: jest.fn()
};

let mockRepositories: Record<string, any> = {};

jest.mock('../database', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity: { name?: string }) => {
      return mockRepositories[entity?.name || ''] || mockDefaultRepository;
    })
  }
}));

jest.mock('./externalDataService', () => ({
  externalDataService: {
    getStatusEvents: jest.fn(),
    saveStatusRawData: jest.fn()
  },
  DataSource: {}
}));

import { FeituoImportService } from './feituoImport.service';

const createPortOperationRepository = (portOperation: any) => {
  const qb: any = {};
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.getOne = jest.fn().mockResolvedValue(portOperation);

  return {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
    create: jest.fn((value) => ({ ...value })),
    save: jest.fn(async (value) => value)
  };
};

describe('FeituoImportService core status field updates', () => {
  beforeEach(() => {
    mockRepositories = {};
    jest.clearAllMocks();
  });

  it.each([
    ['ARRI', 'destination', 'ata'],
    ['ETA', 'destination', 'eta'],
    ['TSDP', 'transit', 'atd']
  ])('writes %s events to the real PortOperation.%s field', async (statusCode, portType, field) => {
    const occurredAt = new Date('2026-06-10T12:34:56.000Z');
    const portOperation: any = {
      containerNumber: 'TEST-CN-001',
      portType,
      portSequence: portType === 'transit' ? 1 : 2
    };
    const portOperationRepository = createPortOperationRepository(portOperation);
    mockRepositories.PortOperation = portOperationRepository;

    const service = new FeituoImportService();

    await (service as any).updateCoreFieldsFromStatus('TEST-CN-001', statusCode, occurredAt);

    expect(portOperation[field]).toBe(occurredAt);
    expect(portOperation.ataDestPort).toBeUndefined();
    expect(portOperation.etaDestPort).toBeUndefined();
    expect(portOperation.atdTransit).toBeUndefined();
    expect(portOperationRepository.save).toHaveBeenCalledWith(portOperation);
  });
});
