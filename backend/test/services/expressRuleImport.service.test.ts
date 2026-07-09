import * as XLSX from 'xlsx';
import { ExpressRuleImportService } from '../../src/services/expressRuleImport.service';

function buildWorkbookWithEmptyRules(): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['version_key', 'effective_from', 'imported_by'],
      ['STEST_001', '2026-04-23', 'jest']
    ]),
    'metadata'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['国别', '快递方式', '类型', '金额']]),
    'surcharge_rules'
  );
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('ExpressRuleImportService', () => {
  it('surcharge_rules 空表应拒绝导入，避免提交空版本', async () => {
    const service = new ExpressRuleImportService();

    await expect(service.importFromExcel(buildWorkbookWithEmptyRules(), 'empty-rules.xlsx')).rejects.toThrow(
      'surcharge_rules Sheet 为空'
    );
  });
});
