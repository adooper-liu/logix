/**
 * Excel 导入服务测试
 * Express Rule Import Service Tests
 *
 * 说明：不依赖大体积 fixtures；在内存中构造最小可导入 xlsx，验证单事务全量回滚与错误文案。
 */
import * as XLSX from 'xlsx';
import { AppDataSource } from '../src/database';
import { ExpressCarrierService } from '../src/entities/ExpressCarrierService';
import { ExpressStackPolicy } from '../src/entities/ExpressStackPolicy';
import { ExpressSurchargeRule } from '../src/entities/ExpressSurchargeRule';
import { ExpressSurchargeVersion } from '../src/entities/ExpressSurchargeVersion';
import { expressRuleImportService } from '../src/services/expressRuleImport.service';

function buildMinimalValidWorkbook(): Buffer {
  const metadata = XLSX.utils.aoa_to_sheet([
    ['version_key', 'source_file_name', 'effective_from', 'imported_by', 'remarks'],
    ['TEST_MIN_001', 'inline.xlsx', '2026-01-01', 'jest', '内存构造']
  ]);
  const rules = XLSX.utils.aoa_to_sheet([
    [
      '国别',
      '快递方式',
      '类型',
      '最长边(in)',
      '次长边(in)',
      '最短边(in)',
      '周长(in)',
      '毛重(lb)',
      '金额',
      '最低基础价',
      '备注'
    ],
    ['US', 'FedEx Test', 'AHS - Dimensions', 48, '×', '×', '×', '×', 4.87, '', '']
  ]);
  const policies = XLSX.utils.aoa_to_sheet([
    ['国别', '快递方式', '策略类型', 'policy_json'],
    [
      'US',
      'FedEx Test',
      'IF_THEN_DISABLE',
      '{"if_triggered":["OVERSIZE"],"disable":["AHS_DIM","AHS_WEIGHT"]}'
    ]
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, metadata, 'metadata');
  XLSX.utils.book_append_sheet(wb, rules, 'surcharge_rules');
  XLSX.utils.book_append_sheet(wb, policies, 'stack_policies');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('ExpressRuleImportService', () => {
  beforeAll(async () => {
    await AppDataSource.initialize();
  });

  afterAll(async () => {
    await AppDataSource.destroy();
  });

  beforeEach(async () => {
    await AppDataSource.getRepository(ExpressSurchargeRule).delete({});
    await AppDataSource.getRepository(ExpressStackPolicy).delete({});
    await AppDataSource.getRepository(ExpressCarrierService).delete({});
    await AppDataSource.getRepository(ExpressSurchargeVersion).delete({});
  });

  it('应在单事务中成功导入最小 Excel（含元数据+规则+策略）', async () => {
    const buffer = buildMinimalValidWorkbook();
    const result = await expressRuleImportService.importFromExcel(buffer, 'inline.xlsx');
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.versionId).toBeDefined();
    const rules = await AppDataSource.getRepository(ExpressSurchargeRule).find();
    expect(rules.length).toBe(1);
    expect(rules[0].typeNormalized).toBe('AHS_DIM');
  });

  it('缺少 metadata Sheet 应抛出与实现一致的明确错误', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a']]), 'surcharge_only');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    await expect(expressRuleImportService.importFromExcel(buffer, 'bad.xlsx')).rejects.toThrow(
      'Excel 文件缺少 metadata Sheet'
    );
  });

  it('surcharge_rules 存在行级错误时应全量回滚且不保留版本/规则行', async () => {
    const metadata = XLSX.utils.aoa_to_sheet([
      ['version_key', 'source_file_name', 'effective_from', 'imported_by', 'remarks'],
      ['TEST_BAD_ROW', 'bad.xlsx', '2026-01-01', 'jest', '']
    ]);
    // 第 1 行有效，第 2 行缺国别 → 应触发失败与整单回滚
    const rules = XLSX.utils.aoa_to_sheet([
      [
        '国别',
        '快递方式',
        '类型',
        '最长边(in)',
        '次长边(in)',
        '最短边(in)',
        '周长(in)',
        '毛重(lb)',
        '金额',
        '最低基础价',
        '备注'
      ],
      ['US', 'X', 'AHS - Dimensions', 48, '×', '×', '×', '×', 1, '', ''],
      ['', 'X', 'AHS - Dimensions', 48, '×', '×', '×', '×', 1, '', '必失败']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, metadata, 'metadata');
    XLSX.utils.book_append_sheet(wb, rules, 'surcharge_rules');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const result = await expressRuleImportService.importFromExcel(buffer, 'bad.xlsx');
    expect(result.success).toBe(0);
    expect(result.versionId).toBeUndefined();
    expect(result.errors.length).toBeGreaterThan(0);
    const vCount = await AppDataSource.getRepository(ExpressSurchargeVersion).count();
    const rCount = await AppDataSource.getRepository(ExpressSurchargeRule).count();
    expect(vCount).toBe(0);
    expect(rCount).toBe(0);
  });
});
