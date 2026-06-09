import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as XLSX from 'xlsx';

const mockClient = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn()
};

jest.mock('pg', () => ({
  Client: jest.fn(() => mockClient)
}));

import { importExpressCostData } from '../../scripts/import-express-cost-simple';

describe('import-express-cost-simple script', () => {
  let tempFile: string;

  beforeEach(() => {
    tempFile = path.join(os.tmpdir(), `express-cost-${Date.now()}-${Math.random()}.xlsx`);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockClient.connect.mockResolvedValue(undefined);
    mockClient.end.mockResolvedValue(undefined);
    mockClient.query.mockImplementation(async (sql: string, params?: unknown[]) => {
      const text = String(sql);
      if (text.includes('INSERT INTO dict_express_surcharge_version')) {
        return { rows: [{ id: 77 }] };
      }
      if (text.includes('INSERT INTO dict_express_carrier_service')) {
        return { rows: [{ id: 901 }] };
      }
      return { rows: [], params };
    });
  });

  afterEach(() => {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    jest.restoreAllMocks();
  });

  it('仅清理目标版本规则和策略，不删除其他版本或共享承运商服务', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [
          '国别',
          '快递方式',
          '类型',
          '最长边(in)',
          '次长边(in)',
          '最短边(in)',
          '周长(in)',
          '最长边+次长边(in)',
          '三边和(in)',
          '对角线(in)',
          '体积M³',
          '毛重(lb)',
          '计价重（单箱）',
          '计价重（多箱）',
          '最低计价重LBS',
          '金额',
          '最低基础价',
          '备注'
        ],
        [
          'US',
          'FedEx Ground',
          'AHS Dimension',
          48,
          '×',
          '×',
          '×',
          '×',
          '×',
          '×',
          '×',
          '×',
          '×',
          '×',
          '×',
          5,
          '×',
          'AHS费用以最高的一笔为准'
        ]
      ]),
      'rules'
    );
    XLSX.writeFile(workbook, tempFile);

    await importExpressCostData(tempFile);

    const queries = mockClient.query.mock.calls.map(([sql, params]) => ({
      sql: String(sql).replace(/\s+/g, ' ').trim(),
      params
    }));

    expect(queries).toEqual(
      expect.arrayContaining([
        {
          sql: 'DELETE FROM dict_express_stack_policy WHERE version_id = $1',
          params: [77]
        },
        {
          sql: 'DELETE FROM dict_express_surcharge_rule WHERE version_id = $1',
          params: [77]
        }
      ])
    );
    expect(queries.some((q) => q.sql === 'DELETE FROM dict_express_surcharge_rule')).toBe(false);
    expect(queries.some((q) => q.sql === 'DELETE FROM dict_express_stack_policy')).toBe(false);
    expect(queries.some((q) => q.sql.startsWith('DELETE FROM dict_express_carrier_service'))).toBe(
      false
    );
  });
});
