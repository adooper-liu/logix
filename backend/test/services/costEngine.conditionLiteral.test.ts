import { ExpressSurchargeRule } from '../../src/entities/ExpressSurchargeRule';
import { costEngineService } from '../../src/services/costEngine.service';
import { ExpressRuleImportService } from '../../src/services/expressRuleImport.service';

const baseRule = (): ExpressSurchargeRule =>
  ({
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
  }) as ExpressSurchargeRule;

const baseInput = {
  countryCode: 'US',
  carrierServiceId: 1,
  longestIn: 121,
  secondIn: 40,
  shortestIn: 20,
  grossWeightLbs: 65
};

describe('CostEngine condition_literal', () => {
  it('按字段名解析文本比较符并触发规则', () => {
    const rule = {
      ...baseRule(),
      conditionLiteral: 'longest_in >120; gross_wt_value <=70'
    };

    const triggered = (costEngineService as any).checkRuleTriggered(rule, baseInput, 65);

    expect(triggered).toBe(true);
  });

  it('字段化文本比较符不满足时不触发规则', () => {
    const rule = {
      ...baseRule(),
      conditionLiteral: 'longest_in >120; gross_wt_value <=60'
    };

    const triggered = (costEngineService as any).checkRuleTriggered(rule, baseInput, 65);

    expect(triggered).toBe(false);
  });
});

describe('ExpressRuleImportService condition_literal', () => {
  it('导入文本比较符时保留字段名', () => {
    const service = new ExpressRuleImportService();
    const dimensions = (service as any).parseDimensions({
      '最长边(in)': '>120',
      '次长边(in)': '',
      '最短边(in)': '',
      '周长(in)': '',
      '最长边+次长边(in)': '',
      '三边和(in)': '',
      '对角线(in)': '',
      '体积M³': '',
      '毛重(lb)': '<=70',
      '计价重（单箱）': '',
      '计价重（多箱）': '',
      最低计价重LBS: ''
    });

    expect(dimensions.conditionLiteral).toBe('longest_in >120; gross_wt_value <=70');
  });
});
