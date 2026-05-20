import { CostEngineService } from '../../src/services/costEngine.service';

describe('CostEngine critical correctness guards', () => {
  function createService(): any {
    return new CostEngineService() as any;
  }

  it('请求国别与承运商国别不一致时应拒绝计算，避免跨国规则错价', async () => {
    const svc = createService();
    svc.carrierServiceRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, countryCode: 'US', serviceName: 'FedEx Ground' })
    };

    await expect(
      svc.calculate({
        countryCode: 'CA',
        carrierServiceId: 1,
        versionKey: 'TEST_20260423',
        longestIn: 40,
        secondIn: 20,
        shortestIn: 10,
        grossWeightLbs: 30
      })
    ).rejects.toThrow('承运商服务国别不匹配');
  });

  it('已解析 zone 时只能匹配同 zone 基础价行，不能回落到未分区行', async () => {
    const svc = createService();
    svc.baseRateRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 1, zoneCode: null, laneCode: null, weightFrom: 0, weightTo: 99, flatFee: 8 },
        { id: 2, zoneCode: 'Z9', laneCode: null, weightFrom: 0, weightTo: 99, flatFee: 12.5 }
      ])
    };

    const row = await svc.pickBaseRateRow(10, 'Z9', undefined, 5);

    expect(row?.id).toBe(2);
  });

  it('已解析 lane 时只能匹配同 lane 基础价行，不能回落到未分区行', async () => {
    const svc = createService();
    svc.baseRateRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 1, zoneCode: null, laneCode: null, weightFrom: 0, weightTo: 99, flatFee: 8 },
        { id: 2, zoneCode: null, laneCode: 'LA-SEA', weightFrom: 0, weightTo: 99, flatFee: 21 }
      ])
    };

    const row = await svc.pickBaseRateRow(10, undefined, 'LA-SEA', 5);

    expect(row?.id).toBe(2);
  });
});
