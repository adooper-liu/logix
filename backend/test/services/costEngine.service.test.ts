import { costEngineService } from '../../src/services/costEngine.service';

describe('CostEngineService', () => {
  it('请求国家与承运商国家不一致时应拒绝试算', async () => {
    const svc = costEngineService as any;
    const carrierFindOneSpy = jest.spyOn(svc.carrierServiceRepo, 'findOne').mockResolvedValue({
      id: 1,
      countryCode: 'US'
    });

    await expect(
      costEngineService.calculate({
        countryCode: 'CA',
        carrierServiceId: 1,
        versionKey: 'TEST_20260423',
        longestIn: 50,
        secondIn: 30,
        shortestIn: 20,
        grossWeightLbs: 40
      })
    ).rejects.toThrow('承运商服务不属于请求国家');

    carrierFindOneSpy.mockRestore();
  });
});
