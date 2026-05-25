import { ExpressRuleImportService } from '../../src/services/expressRuleImport.service';

describe('ExpressRuleImportService condition_literal mapping', () => {
  it('导入文本比较符时保留字段名', () => {
    const service = new ExpressRuleImportService() as any;
    const dimensions = service.parseDimensions({
      '最长边(in)': '>120',
      '次长边(in)': '×',
      '最短边(in)': '×',
      '周长(in)': '<360',
      '最长边+次长边(in)': '×',
      '三边和(in)': '×',
      '对角线(in)': '×',
      '体积M³': '×',
      '毛重(lb)': '<23',
      '计价重（单箱）': '×',
      '计价重（多箱）': '×',
      最低计价重LBS: '×'
    });

    expect(dimensions.conditionLiteral).toBe('longest_in >120; girth_in <360; gross_wt_value <23');
  });

  it('兼容模板中的 stack_policies 分列写法', () => {
    const service = new ExpressRuleImportService() as any;

    expect(
      service.buildPolicyJson('IF_THEN_DISABLE', {
        if_triggered: 'OVERSIZE',
        disable: 'AHS_DIM,AHS_WEIGHT'
      })
    ).toEqual({
      if_triggered: ['OVERSIZE'],
      disable: ['AHS_DIM', 'AHS_WEIGHT']
    });
    expect(
      service.buildPolicyJson('MAX_GROUP', {
        max_group_types: 'LARGE_PACKAGE_RESI,RESI_DELIVERY'
      })
    ).toEqual({
      max_group: ['LARGE_PACKAGE_RESI', 'RESI_DELIVERY']
    });
  });
});
