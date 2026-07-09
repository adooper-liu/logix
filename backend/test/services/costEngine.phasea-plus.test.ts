import { costEngineService } from '../../src/services/costEngine.service';

describe('CostEngine PhaseA+ base freight helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('拒绝使用其他国家的承运商服务进行试算', async () => {
    const svc = costEngineService as any;
    const carrierFindOneSpy = jest.spyOn(svc.carrierServiceRepo, 'findOne').mockResolvedValue({
      id: 99,
      countryCode: 'US',
      serviceName: 'FedEx Ground'
    });
    const getVersionSpy = jest.spyOn(svc, 'getVersionId');

    await expect(
      costEngineService.calculate({
        countryCode: 'CA',
        carrierServiceId: 99,
        versionKey: 'TEST_20260423',
        longestIn: 50,
        secondIn: 30,
        shortestIn: 20,
        grossWeightLbs: 40
      })
    ).rejects.toThrow('承运商服务国家不匹配');

    expect(carrierFindOneSpy).toHaveBeenCalledWith({ where: { id: 99 } });
    expect(getVersionSpy).not.toHaveBeenCalled();
  });

  it('缺少 carrier/service/product 时不计算基础价', async () => {
    const result = await (costEngineService as any).calculateBaseFreight(
      { countryCode: 'US' },
      10
    );
    expect(result).toBeUndefined();
  });

  it('命中 scheme + zone + baseRow 时返回基础价', async () => {
    const svc = costEngineService as any;
    const getVersionSpy = jest
      .spyOn(svc, 'getPricingVersion')
      .mockResolvedValue({ id: 11, versionKey: 'PTEST_001' });
    const resolveSpy = jest.spyOn(svc, 'resolveZoneOrLane').mockResolvedValue({ zoneCode: 'Z9' });
    const rowSpy = jest.spyOn(svc, 'pickBaseRateRow').mockResolvedValue({
      weightFrom: 0,
      weightTo: 100,
      firstWeight: null,
      firstFee: null,
      additionalStepWeight: null,
      additionalFeePerStep: null,
      flatFee: 18.5,
      minCharge: null,
      maxCharge: null
    });
    const schemeFindOne = jest.spyOn(svc.pricingSchemeRepo, 'findOne').mockResolvedValue({
      id: 22,
      calcMode: 'TIER_FLAT'
    } as any);

    const result = await svc.calculateBaseFreight(
      {
        countryCode: 'US',
        carrierCode: 'FEDEX',
        serviceCode: 'GROUND',
        productLine: 'PARCEL_EXPRESS',
        destinationPostal: '90210'
      },
      22
    );

    expect(result).toEqual({ baseFreight: 18.5, zoneCode: 'Z9', laneCode: undefined });
    expect(schemeFindOne).toHaveBeenCalled();
  });
});

