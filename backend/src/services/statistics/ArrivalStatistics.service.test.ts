import { ArrivalStatisticsService } from './ArrivalStatistics.service';
import { ContainerQueryBuilder } from './common/ContainerQueryBuilder';

type MockQb = {
  andWhere: jest.Mock;
  where: jest.Mock;
  leftJoin: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  setParameters: jest.Mock;
  setFindOptions: jest.Mock;
  select: jest.Mock;
  getMany: jest.Mock;
  getRawOne: jest.Mock;
};

const createMockQueryBuilder = (): MockQb => {
  const qb: Partial<MockQb> = {};
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.leftJoin = jest.fn().mockReturnValue(qb);
  qb.leftJoinAndSelect = jest.fn().mockReturnValue(qb);
  qb.setParameters = jest.fn().mockReturnValue(qb);
  qb.setFindOptions = jest.fn().mockReturnValue(qb);
  qb.select = jest.fn().mockReturnValue(qb);
  qb.getMany = jest.fn().mockResolvedValue([]);
  qb.getRawOne = jest.fn().mockResolvedValue({ count: '0' });
  return qb as MockQb;
};

describe('ArrivalStatisticsService - pickup segmentation consistency', () => {
  let service: ArrivalStatisticsService;
  let repository: any;

  beforeEach(() => {
    repository = {
      createQueryBuilder: jest.fn(),
      query: jest.fn().mockResolvedValue([{ count: '0' }])
    };
    service = new ArrivalStatisticsService(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('统计口径: 今日之前到港未提柜必须使用 NOT EXISTS(pickup_date)', async () => {
    const qb = createMockQueryBuilder();
    jest.spyOn(ContainerQueryBuilder, 'createBaseQuery').mockReturnValue(qb as any);
    jest.spyOn(ContainerQueryBuilder, 'joinLatestDestinationWithAta').mockReturnValue(qb as any);
    jest.spyOn(ContainerQueryBuilder, 'filterTargetStatus').mockReturnValue(qb as any);
    jest.spyOn(ContainerQueryBuilder, 'addDateFilters').mockReturnValue(qb as any);
    jest.spyOn(ContainerQueryBuilder, 'addCountryFilters').mockReturnValue(qb as any);

    await service.getArrivedBeforeTodayNotPickedUp(new Date());

    const allAndWhereSql = qb.andWhere.mock.calls.map((args) => String(args[0] || '')).join('\n');

    expect(allAndWhereSql).toContain('NOT EXISTS');
    expect(allAndWhereSql).toContain('process_trucking_transport');
    expect(allAndWhereSql).toContain('tt.pickup_date IS NOT NULL');
  });

  it('列表口径: arrivedBeforeTodayNotPickedUp 必须使用 NOT EXISTS(pickup_date)', async () => {
    const qb = createMockQueryBuilder();
    jest.spyOn(ContainerQueryBuilder, 'createBaseQuery').mockReturnValue(qb as any);
    jest.spyOn(ContainerQueryBuilder, 'joinLatestDestinationWithAta').mockReturnValue(qb as any);
    jest.spyOn(ContainerQueryBuilder, 'filterTargetStatus').mockReturnValue(qb as any);
    jest.spyOn(ContainerQueryBuilder, 'addDateFilters').mockReturnValue(qb as any);
    jest.spyOn(ContainerQueryBuilder, 'addCountryFilters').mockReturnValue(qb as any);

    await service.getContainersByCondition('arrivedBeforeTodayNotPickedUp');

    const allAndWhereSql = qb.andWhere.mock.calls.map((args) => String(args[0] || '')).join('\n');

    expect(allAndWhereSql).toContain('NOT EXISTS');
    expect(allAndWhereSql).toContain('process_trucking_transport');
    expect(allAndWhereSql).toContain('tt.pickup_date IS NOT NULL');
  });

  it('统计与列表口径: 今日之前到港已提柜都必须使用 EXISTS(pickup_date)', async () => {
    const qbForStats = createMockQueryBuilder();
    jest.spyOn(ContainerQueryBuilder, 'createBaseQuery').mockReturnValueOnce(qbForStats as any);
    jest
      .spyOn(ContainerQueryBuilder, 'joinLatestDestinationWithAta')
      .mockReturnValue(qbForStats as any);
    jest.spyOn(ContainerQueryBuilder, 'filterTargetStatus').mockReturnValue(qbForStats as any);
    jest.spyOn(ContainerQueryBuilder, 'addDateFilters').mockReturnValue(qbForStats as any);
    jest.spyOn(ContainerQueryBuilder, 'addCountryFilters').mockReturnValue(qbForStats as any);

    await service.getArrivedBeforeTodayPickedUp(new Date());

    const statsSql = qbForStats.andWhere.mock.calls.map((args) => String(args[0] || '')).join('\n');
    expect(statsSql).toContain('EXISTS');
    expect(statsSql).toContain('tt.pickup_date IS NOT NULL');

    const qbForList = createMockQueryBuilder();
    jest.spyOn(ContainerQueryBuilder, 'createBaseQuery').mockReturnValueOnce(qbForList as any);
    jest
      .spyOn(ContainerQueryBuilder, 'joinLatestDestinationWithAta')
      .mockReturnValue(qbForList as any);
    jest.spyOn(ContainerQueryBuilder, 'filterTargetStatus').mockReturnValue(qbForList as any);
    jest.spyOn(ContainerQueryBuilder, 'addDateFilters').mockReturnValue(qbForList as any);
    jest.spyOn(ContainerQueryBuilder, 'addCountryFilters').mockReturnValue(qbForList as any);

    await service.getContainersByCondition('arrivedBeforeTodayPickedUp');

    const listSql = qbForList.andWhere.mock.calls.map((args) => String(args[0] || '')).join('\n');
    expect(listSql).toContain('EXISTS');
    expect(listSql).toContain('tt.pickup_date IS NOT NULL');
  });
});
