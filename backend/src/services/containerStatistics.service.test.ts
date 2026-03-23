import { ContainerStatisticsService } from './containerStatistics.service';

const createMockRepository = () => ({
  createQueryBuilder: jest.fn(),
  find: jest.fn(),
  query: jest.fn(),
});

describe('ContainerStatisticsService - filter consistency routing', () => {
  let service: ContainerStatisticsService;

  beforeEach(() => {
    const containerRepo = createMockRepository() as any;
    const truckingRepo = createMockRepository() as any;
    const emptyReturnRepo = createMockRepository() as any;
    service = new ContainerStatisticsService(containerRepo, truckingRepo, emptyReturnRepo);
  });

  it('应将 picked_up / unloaded / returned_empty 委托到流程事实查询', async () => {
    const processFactSpy = jest
      .spyOn((service as any).statusDistribution, 'getContainersByProcessFactStatus')
      .mockResolvedValue([]);

    await service.getContainersByCondition('picked_up');
    await service.getContainersByCondition('unloaded');
    await service.getContainersByCondition('returned_empty');

    expect(processFactSpy).toHaveBeenNthCalledWith(1, 'picked_up', undefined, undefined);
    expect(processFactSpy).toHaveBeenNthCalledWith(2, 'unloaded', undefined, undefined);
    expect(processFactSpy).toHaveBeenNthCalledWith(3, 'returned_empty', undefined, undefined);
    expect(processFactSpy).toHaveBeenCalledTimes(3);
  });

  it('按提柜计划条件应路由到 PlannedPickupStatisticsService', async () => {
    const plannedSpy = jest
      .spyOn((service as any).plannedPickupStatistics, 'getContainersByCondition')
      .mockResolvedValue([]);

    await service.getContainersByCondition('overduePlanned');
    await service.getContainersByCondition('todayPlanned');
    await service.getContainersByCondition('plannedWithin3Days');
    await service.getContainersByCondition('plannedWithin7Days');
    await service.getContainersByCondition('pendingArrangement');

    expect(plannedSpy).toHaveBeenCalledTimes(5);
    expect(plannedSpy).toHaveBeenNthCalledWith(1, 'overduePlanned', undefined, undefined);
    expect(plannedSpy).toHaveBeenNthCalledWith(2, 'todayPlanned', undefined, undefined);
    expect(plannedSpy).toHaveBeenNthCalledWith(3, 'plannedWithin3Days', undefined, undefined);
    expect(plannedSpy).toHaveBeenNthCalledWith(4, 'plannedWithin7Days', undefined, undefined);
    expect(plannedSpy).toHaveBeenNthCalledWith(5, 'pendingArrangement', undefined, undefined);
  });

  it('按最晚提柜条件应路由到 LastPickupStatisticsService', async () => {
    const lastPickupSpy = jest
      .spyOn((service as any).lastPickupStatistics, 'getContainersByCondition')
      .mockResolvedValue([]);

    await service.getContainersByCondition('expired');
    await service.getContainersByCondition('urgent');
    await service.getContainersByCondition('warning');
    await service.getContainersByCondition('normal');
    await service.getContainersByCondition('noLastFreeDate');

    expect(lastPickupSpy).toHaveBeenCalledTimes(5);
    expect(lastPickupSpy).toHaveBeenNthCalledWith(1, 'expired', undefined, undefined);
    expect(lastPickupSpy).toHaveBeenNthCalledWith(2, 'urgent', undefined, undefined);
    expect(lastPickupSpy).toHaveBeenNthCalledWith(3, 'warning', undefined, undefined);
    expect(lastPickupSpy).toHaveBeenNthCalledWith(4, 'normal', undefined, undefined);
    expect(lastPickupSpy).toHaveBeenNthCalledWith(5, 'noLastFreeDate', undefined, undefined);
  });
});

