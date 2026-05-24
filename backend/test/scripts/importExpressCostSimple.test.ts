const mockClient = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn()
};

jest.mock('pg', () => ({
  Client: jest.fn(() => mockClient)
}));

jest.mock('xlsx', () => ({
  readFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn()
  }
}));

import * as XLSX from 'xlsx';
import { Client } from 'pg';
import { buildDbConfig, importExpressCostData } from '../../scripts/import-express-cost-simple';

describe('import-express-cost-simple', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    (Client as unknown as jest.Mock).mockImplementation(() => mockClient);

    (XLSX.readFile as jest.Mock).mockReturnValue({
      SheetNames: ['rules'],
      Sheets: {
        rules: {}
      }
    });
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue([
      ['国别', '快递方式', '类型'],
      [
        'US',
        'FedEx-Ground',
        'AHS - Dimensions',
        48,
        '×',
        '×',
        '×',
        '×',
        '×',
        '×',
        '×',
        20,
        '×',
        '×',
        '×',
        5,
        '',
        ''
      ]
    ]);

    mockClient.connect.mockResolvedValue(undefined);
    mockClient.end.mockResolvedValue(undefined);
    mockClient.query.mockImplementation(async (sql: string) => {
      if (sql.includes('INSERT INTO dict_express_surcharge_version')) {
        return { rows: [{ id: 42 }] };
      }
      if (sql.includes('INSERT INTO dict_express_carrier_service')) {
        return { rows: [{ id: 7 }] };
      }
      return { rows: [] };
    });
  });

  it('拒绝在没有 DB_PASSWORD 时构造数据库连接配置', () => {
    expect(() => buildDbConfig({} as NodeJS.ProcessEnv)).toThrow('DB_PASSWORD is required');
  });

  it('只按目标版本清理规则和策略，不能删除共享承运商字典', async () => {
    await importExpressCostData('/tmp/express-rules.xlsx', {
      host: 'localhost',
      port: 5432,
      database: 'logix_test',
      user: 'logix_user',
      password: 'secret'
    });

    const sqlStatements = mockClient.query.mock.calls.map(([sql]) =>
      String(sql).replace(/\s+/g, ' ').trim()
    );

    expect(sqlStatements).not.toContain('DELETE FROM dict_express_carrier_service');
    expect(sqlStatements).toContain('DELETE FROM dict_express_stack_policy WHERE version_id = $1');
    expect(sqlStatements).toContain(
      'DELETE FROM dict_express_surcharge_rule WHERE version_id = $1'
    );

    for (const sql of sqlStatements) {
      expect(sql).not.toMatch(/^DELETE FROM dict_express_(surcharge_rule|stack_policy)$/);
    }
  });
});
