import { validateExpressCostRows } from '../../scripts/import-express-cost-simple';

describe('import-express-cost-simple row validation', () => {
  it('rejects non-empty rows missing required identifiers before database writes', () => {
    const result = validateExpressCostRows([
      ['国别', '快递方式', '类型', '最长边'],
      ['US', 'FedEx', 'AHS Weight', 50],
      ['CA', 'UPS', '', 60],
      ['', '', '', '']
    ]);

    expect(result.dataRows).toHaveLength(2);
    expect(result.errors).toEqual([
      {
        row: 3,
        message: '缺少必填字段: 类型'
      }
    ]);
  });

  it('accepts rows with all required identifiers', () => {
    const result = validateExpressCostRows([
      ['国别', '快递方式', '类型', '金额'],
      ['US', 'FedEx-Ground', 'Reject', 0],
      ['CA', 'Canpar', 'Over Weight', 12.5]
    ]);

    expect(result.dataRows).toHaveLength(2);
    expect(result.errors).toEqual([]);
  });
});
