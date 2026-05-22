import { costEngineService } from '../../src/services/costEngine.service';

describe('CostEngine country validation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('拒绝使用不属于请求国家的承运商服务试算', async () => {
    const svc = costEngineService as any;
    const carrierFindOneSpy = jest.spyOn(svc.carrierServiceRepo, 'findOne').mockResolvedValue({
      id: 1,
      countryCode: 'CA',
      serviceName: 'Canada Carrier'
    });
    const getVersionSpy = jest.spyOn(svc, 'getVersionId');

    await expect(
      costEngineService.calculate({
        countryCode: 'US',
        carrierServiceId: 1,
        versionKey: 'TEST_VERSION',
        longestIn: 50,
        secondIn: 30,
        shortestIn: 20,
        grossWeightLbs: 40
      })
    ).rejects.toThrow('承运商服务国家不匹配');

    expect(carrierFindOneSpy).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(getVersionSpy).not.toHaveBeenCalled();
  });
});
