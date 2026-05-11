import * as XLSX from 'xlsx';
import { AppDataSource } from '../../src/database';
import { ExpressCarrierService } from '../../src/entities/ExpressCarrierService';
import { ExpressStackPolicy } from '../../src/entities/ExpressStackPolicy';
import { ExpressSurchargeRule } from '../../src/entities/ExpressSurchargeRule';
import { ExpressSurchargeVersion } from '../../src/entities/ExpressSurchargeVersion';
import { expressRuleImportService } from '../../src/services/expressRuleImport.service';

function buildFrontendTemplateWorkbook(): Buffer {
  const metadata = XLSX.utils.aoa_to_sheet([
    ['version_key', 'source_file_name', 'effective_from', 'imported_by', 'remarks'],
    ['TEST_TEMPLATE_001', 'frontend-template.xlsx', '2026-04-23', 'jest', '前端模板']
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
      'AHS - Dimensions',
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
      4.87,
      '×',
      '单边超 48in'
    ],
    [
      'US',
      'FedEx Ground',
      'Oversize',
      96,
      '×',
      '×',
      130,
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      39,
      '×',
      '收超大件后不再收 AHS'
    ],
    [
      'CA',
      'FedEx Ground',
      '拒收',
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
      150,
      '0',
      '×',
      '计费重超过 150lb 拒收'
    ]
  ]);
  const policies = XLSX.utils.aoa_to_sheet([
    ['国别', '快递方式', '策略类型', 'policy_json', 'remarks'],
    [
      'US',
      'FedEx Ground',
      'IF_THEN_DISABLE',
      '{"if_triggered":["OVERSIZE"],"disable":["AHS_DIM"]}',
      'Oversize 触发后禁用 AHS'
    ],
    [
      'US',
      'FedEx Ground',
      'MAX_GROUP',
      '{"max_group":["LARGE_PACKAGE_RESI","RESI_DELIVERY"]}',
      '同组只取最高一笔'
    ]
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, metadata, 'metadata');
  XLSX.utils.book_append_sheet(wb, rules, 'surcharge_rules');
  XLSX.utils.book_append_sheet(wb, policies, 'stack_policies');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('ExpressRuleImportService frontend template compatibility', () => {
  it('导入前端模板时应保留金额、阈值与互斥策略', async () => {
    const carriers: Array<Partial<ExpressCarrierService>> = [];
    const rules: Array<Partial<ExpressSurchargeRule>> = [];
    const policies: Array<Partial<ExpressStackPolicy>> = [];

    const versionRepo = {
      save: jest.fn().mockResolvedValue({ id: 1 } as Partial<ExpressSurchargeVersion>)
    };
    const carrierRepo = {
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        return (
          carriers.find(
            (carrier) =>
              carrier.countryCode === where.countryCode &&
              carrier.serviceName === where.serviceName
          ) || null
        );
      }),
      save: jest.fn().mockImplementation(async (carrier) => {
        const saved = { ...carrier, id: carriers.length + 1 };
        carriers.push(saved);
        return saved;
      })
    };
    const ruleRepo = {
      save: jest.fn().mockImplementation(async (rule) => {
        rules.push(rule);
        return { ...rule, id: rules.length };
      })
    };
    const policyRepo = {
      save: jest.fn().mockImplementation(async (policy) => {
        policies.push(policy);
        return { ...policy, id: policies.length };
      })
    };
    const manager = {
      getRepository: jest.fn().mockImplementation((entity) => {
        if (entity === ExpressSurchargeVersion) return versionRepo;
        if (entity === ExpressCarrierService) return carrierRepo;
        if (entity === ExpressSurchargeRule) return ruleRepo;
        if (entity === ExpressStackPolicy) return policyRepo;
        throw new Error(`Unexpected repository: ${entity?.name}`);
      })
    };
    (AppDataSource as any).transaction = jest.fn();
    const txSpy = jest
      .spyOn(AppDataSource as any, 'transaction')
      .mockImplementation(async (callback: any) => callback(manager));

    const result = await expressRuleImportService.importFromExcel(
      buildFrontendTemplateWorkbook(),
      'frontend-template.xlsx'
    );

    expect(result).toMatchObject({ success: 3, failed: 0, versionId: 1 });
    expect(Number(rules.find((rule) => rule.typeNormalized === 'AHS_DIM')?.amountFixed)).toBe(
      4.87
    );
    expect(Number(rules.find((rule) => rule.typeNormalized === 'OVERSIZE')?.amountFixed)).toBe(39);
    const reject = rules.find((rule) => rule.typeNormalized === 'REJECT');
    expect(Number(reject?.minBillableLbs)).toBe(150);
    expect(Number(reject?.amountFixed)).toBe(0);
    expect(policies).toHaveLength(2);
    expect(policies[0].policyJson).toEqual({
      if_triggered: ['OVERSIZE'],
      disable: ['AHS_DIM']
    });
    expect(policies[1].policyJson).toEqual({
      max_group: ['LARGE_PACKAGE_RESI', 'RESI_DELIVERY']
    });

    txSpy.mockRestore();
  });
});
