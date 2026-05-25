import { costEngineService } from '../../src/services/costEngine.service';

const baseRule = {
  conditionsJson: null,
  conditionLiteral: null,
  longestIn: null,
  secondIn: null,
  shortestIn: null,
  girthIn: null,
  lPlusSIn: null,
  threeSidesSumIn: null,
  grossWtValue: null,
  minBillableLbs: null
};

describe('CostEngine condition_literal handling', () => {
  it('评估带字段名的文本比较符规则', () => {
    const svc = costEngineService as any;
    const rule = {
      ...baseRule,
      conditionLiteral: 'longest_in >120; gross_wt_value <=60'
    };
    const input = {
      longestIn: 121,
      secondIn: 10,
      shortestIn: 10,
      grossWeightLbs: 60
    };

    expect(svc.checkRuleTriggered(rule, input, 61)).toBe(true);
    expect(svc.checkRuleTriggered(rule, { ...input, longestIn: 120 }, 60)).toBe(false);
  });

  it('兼容历史无字段名文本比较符', () => {
    const svc = costEngineService as any;
    const rule = {
      ...baseRule,
      conditionLiteral: '>120'
    };

    expect(
      svc.checkRuleTriggered(
        rule,
        { longestIn: 121, secondIn: 10, shortestIn: 10, grossWeightLbs: 10 },
        10
      )
    ).toBe(true);
  });

  it('拒绝国家与承运商不一致的试算请求', async () => {
    const svc = costEngineService as any;
    const carrierSpy = jest.spyOn(svc.carrierServiceRepo, 'findOne').mockResolvedValue({
      id: 7,
      countryCode: 'US'
    });

    await expect(
      svc.calculate({
        countryCode: 'CA',
        carrierServiceId: 7,
        longestIn: 10,
        secondIn: 10,
        shortestIn: 10,
        grossWeightLbs: 10
      })
    ).rejects.toThrow('承运商服务国家不匹配');

    carrierSpy.mockRestore();
  });
});
