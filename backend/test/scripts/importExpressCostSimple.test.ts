const mockConnect = jest.fn();
const mockEnd = jest.fn();
const mockQuery = jest.fn();

jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    end: mockEnd,
    query: mockQuery
  }))
}));

jest.mock('xlsx', () => ({
  readFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
}));

import * as XLSX from 'xlsx';
import { DEFAULT_VERSION_KEY, importExpressCostData } from '../../scripts/import-express-cost-simple';

describe('import-express-cost-simple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (XLSX.readFile as jest.Mock).mockReturnValue({
      SheetNames: ['rules'],
      Sheets: { rules: {} }
    });
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
      ['country', 'carrier', 'type', 'longest', 'second', 'shortest', 'girth', 'l+s', '3 sides', 'diagonal', 'vol', 'gross', 'rw1', 'rwm', 'min', 'amount', 'min base', 'remark'],
      ['US', 'FedEx Ground', 'AHS-Weight', 96, null, null, null, null, null, null, null, 50, null, null, null, 12.5, null, 'AHS-Weight 与 AHS-Size 不再收']
    ]);
    mockConnect.mockResolvedValue(undefined);
    mockEnd.mockResolvedValue(undefined);
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('dict_express_surcharge_version')) {
        return { rows: [{ id: 42 }] };
      }
      if (sql.includes('dict_express_carrier_service')) {
        return { rows: [{ id: 7 }] };
      }
      return { rows: [] };
    });
  });

  it('重导时只清理目标版本规则和策略，不删除跨版本承运商字典', async () => {
    await importExpressCostData('/tmp/express-cost.xlsx');

    const deleteCalls = mockQuery.mock.calls.filter(([sql]) => String(sql).trim().startsWith('DELETE'));

    expect(deleteCalls).toEqual([
      ['DELETE FROM dict_express_surcharge_rule WHERE version_id = $1', [42]],
      ['DELETE FROM dict_express_stack_policy WHERE version_id = $1', [42]]
    ]);
    expect(
      mockQuery.mock.calls.some(([sql]) => String(sql).includes('DELETE FROM dict_express_carrier_service'))
    ).toBe(false);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('version_key'), [
      DEFAULT_VERSION_KEY,
      'system',
      '从 Excel 导入的全球快递费规则'
    ]);
    expect(mockQuery).toHaveBeenCalledWith('COMMIT');
  });
});
