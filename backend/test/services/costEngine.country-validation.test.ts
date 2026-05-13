import { costEngineService } from '../../src/services/costEngine.service';

describe('CostEngine country/carrier validation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('拒绝使用不属于请求国家的承运商服务计算费用', async () => {
    const service = costEngineService as any;
    jest.spyOn(service.carrierServiceRepo, 'findOne').mockResolvedValue({
      id: 1,
      countryCode: 'US',
      serviceName: 'FedEx Ground'
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
    ).rejects.toMatchObject({
      message: expect.stringContaining('不属于请求国家'),
      statusCode: 400
    });
  });
});
