import { costEngineService } from '../../src/services/costEngine.service';

function makeRule(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    id: 1,
    versionId: 10,
    carrierServiceId: 20,
    typeRaw: '超标费',
    typeNormalized: 'OVERSIZE',
    sourceLineNumber: 2,
    longestIn: null,
    secondIn: null,
    shortestIn: null,
    girthIn: null,
    lPlusSIn: null,
    threeSidesSumIn: null,
    diagonalIn: null,
    volM3Threshold: null,
    grossWtValue: null,
    rateWtSingle: null,
    rateWtMulti: null,
    minBillableLbs: null,
    conditionLiteral: null,
    conditionsJson: null,
    amountFixed: 6.4,
    amountMin: null,
    amountMax: null,
    minBasePrice: null,
    notes: null,
    ...overrides
  };
}

describe('CostEngine condition_literal rules', () => {
  it('试算时应触发字段化的文本比较符规则', async () => {
    const svc = costEngineService as any;
    jest.spyOn(svc.carrierServiceRepo, 'findOne').mockResolvedValue({
      id: 20,
      countryCode: 'DE',
      serviceName: 'Hermes Standardpaket'
    });
    jest.spyOn(svc, 'getVersionId').mockResolvedValue(10);
    jest.spyOn(svc.ruleRepo, 'find').mockResolvedValue([
      makeRule({
        conditionLiteral: 'longest_in >120; second_in >60',
        amountFixed: 6.4
      })
    ]);
    jest.spyOn(svc.policyRepo, 'find').mockResolvedValue([]);
    jest.spyOn(svc, 'calculateBaseFreight').mockResolvedValue(undefined);

    const result = await svc.calculate({
      countryCode: 'DE',
      carrierServiceId: 20,
      longestIn: 121,
      secondIn: 61,
      shortestIn: 20,
      grossWeightLbs: 10
    });

    expect(result.totalSurcharge).toBe(6.4);
    expect(result.charges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'OVERSIZE',
          amount: 6.4,
          triggered: true
        })
      ])
    );
  });

  it('字段化文本比较符未全部满足时不应触发', () => {
    const triggered = (costEngineService as any).checkRuleTriggered(
      makeRule({ conditionLiteral: 'longest_in >120; second_in >60' }),
      {
        longestIn: 121,
        secondIn: 60,
        shortestIn: 20,
        grossWeightLbs: 10
      },
      10
    );

    expect(triggered).toBe(false);
  });

  it('兼容历史无字段名的 Seller Flex 三条件文本比较符', () => {
    const rule = makeRule({
      typeRaw: '拒收',
      typeNormalized: 'REJECT',
      conditionLiteral: '<175; <360; <23',
      notes: '最长边，周长，毛重之间逻辑是“且”'
    });

    const svc = costEngineService as any;
    expect(
      svc.checkRuleTriggered(
        rule,
        {
          longestIn: 170,
          secondIn: 100,
          shortestIn: 50,
          grossWeightLbs: 22
        },
        22
      )
    ).toBe(true);

    expect(
      svc.checkRuleTriggered(
        rule,
        {
          longestIn: 170,
          secondIn: 100,
          shortestIn: 50,
          grossWeightLbs: 24
        },
        24
      )
    ).toBe(false);
  });
});
