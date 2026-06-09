import { costEngineService } from '../../src/services/costEngine.service';

describe('CostEngineService', () => {
  it('拒绝使用不属于请求国家的承运商服务，避免跨国家错价', async () => {
    const svc = costEngineService as any;
    svc.carrierServiceRepo.findOne.mockResolvedValue({
      id: 1001,
      countryCode: 'US',
      serviceName: 'FedEx Ground'
    });

    await expect(
      costEngineService.calculate({
        countryCode: 'CA',
        carrierServiceId: 1001,
        longestIn: 10,
        secondIn: 8,
        shortestIn: 6,
        grossWeightLbs: 5
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining('承运商服务与请求国家不匹配')
    });

    expect(svc.ruleRepo.find).not.toHaveBeenCalled();
    expect(svc.policyRepo.find).not.toHaveBeenCalled();
  });
});
