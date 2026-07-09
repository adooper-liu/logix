import { ExpressSurchargeRule } from '../../src/entities/ExpressSurchargeRule';
import { ExpressRuleImportService } from '../../src/services/expressRuleImport.service';
import { ScenarioInput, costEngineService } from '../../src/services/costEngine.service';

const baseInput: ScenarioInput = {
  countryCode: 'DE',
  carrierServiceId: 1,
  longestIn: 121,
  secondIn: 61,
  shortestIn: 10,
  grossWeightLbs: 22
};

function makeRule(overrides: Partial<ExpressSurchargeRule>): ExpressSurchargeRule {
  return {
    id: 1,
    versionId: 1,
    carrierServiceId: 1,
    sourceLineNumber: null,
    typeRaw: '超标费',
    typeNormalized: 'OVERSIZE',
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
    weightInputUnit: 'lb',
    dimUnit: 'in',
    conditionLiteral: null,
    amountFixed: null,
    amountMin: null,
    amountMax: null,
    minBasePrice: null,
    currency: 'USD',
    chargeBasis: null,
    conditionsJson: null,
    ingestCompleteness: 'FULL',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  } as ExpressSurchargeRule;
}

describe('CostEngine condition_literal rules', () => {
  const engine = costEngineService as any;

  it('评估历史未标注字段名的 Hermes 文本比较符规则', () => {
    const rule = makeRule({
      conditionLiteral: '>120; >60'
    });

    expect(engine.checkRuleTriggered(rule, baseInput, 22)).toBe(true);
    expect(
      engine.checkRuleTriggered(
        rule,
        {
          ...baseInput,
          longestIn: 119
        },
        22
      )
    ).toBe(false);
  });

  it('按备注字段顺序评估 Seller Flex 三条件文本比较符规则', () => {
    const rule = makeRule({
      typeRaw: '拒收',
      typeNormalized: 'REJECT',
      conditionLiteral: '<175; <360; <23',
      notes: '最长边，周长，毛重之间逻辑是“且”'
    });
    const acceptedByLiteral = {
      ...baseInput,
      longestIn: 174,
      secondIn: 80,
      shortestIn: 90,
      grossWeightLbs: 22
    };

    expect(engine.checkRuleTriggered(rule, acceptedByLiteral, 22)).toBe(true);
    expect(
      engine.checkRuleTriggered(
        rule,
        {
          ...acceptedByLiteral,
          grossWeightLbs: 24
        },
        24
      )
    ).toBe(false);
  });

  it('评估带字段名的文本比较符规则', () => {
    const rule = makeRule({
      conditionLiteral: 'longest_in >120; second_in >60'
    });

    expect(engine.checkRuleTriggered(rule, baseInput, 22)).toBe(true);
    expect(
      engine.checkRuleTriggered(
        rule,
        {
          ...baseInput,
          secondIn: 60
        },
        22
      )
    ).toBe(false);
  });
});

describe('ExpressRuleImportService condition literal import', () => {
  it('为带比较符的 Seller Flex 行生成可执行 conditions_json', () => {
    const importer = new ExpressRuleImportService() as any;

    const conditionsJson = importer.buildConditionsJson(
      {
        '最长边(in)': '<175',
        '周长(in)': '<360',
        '毛重(lb)': '<23',
        备注: '最长边，周长，毛重之间逻辑是“且”'
      },
      'REJECT'
    );

    expect(conditionsJson).toEqual({
      operator: 'AND',
      conditions: [
        { field: 'longest_in', operator: '<', value: 175 },
        { field: 'girth_in', operator: '<', value: 360 },
        { field: 'gross_wt_value', operator: '<', value: 23 }
      ]
    });
  });
});
