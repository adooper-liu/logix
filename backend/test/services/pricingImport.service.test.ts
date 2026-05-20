import * as XLSX from 'xlsx';
import { AppDataSource } from '../../src/database';
import { PricingImportService } from '../../src/services/pricingImport.service';

function buildWorkbook(options?: { invalidScheme?: boolean; emptyScheme?: boolean; invalidJson?: boolean }): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['version_key', 'effective_from', 'imported_by'],
      ['PTEST_001', '2026-04-23', 'jest']
    ]),
    'metadata'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      options?.emptyScheme
        ? [['scheme_ref', 'country_code', 'carrier_code', 'service_code', 'product_line', 'currency', 'calc_mode']]
        : [
            [
              'scheme_ref',
              'country_code',
              'carrier_code',
              'service_code',
              'product_line',
              'currency',
              'calc_mode',
              'conditions_json'
            ],
            [
              'SCH_US_FEDEX',
              'US',
              'FEDEX',
              'GROUND',
              'PARCEL_EXPRESS',
              'USD',
              options?.invalidScheme ? '' : 'TIER_FLAT',
              options?.invalidJson ? '{tier:]' : ''
            ]
          ]
    ),
    'pricing_scheme'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['country_code', 'mapping_type', 'postal_prefix_from', 'postal_prefix_to', 'zone_code', 'priority'],
      ['US', 'ZONE', '90', '99', 'Z9', 10]
    ]),
    'zone_lane_mapping'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['scheme_ref', 'zone_code', 'weight_from', 'weight_to', 'flat_fee'],
      ['SCH_US_FEDEX', 'Z9', 0, 99, 12.5]
    ]),
    'base_rate_rows'
  );
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('PricingImportService', () => {
  const service = new PricingImportService();

  it('缺少必需 sheet 时应抛错', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['k'], ['v']]), 'metadata');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    await expect(service.importFromExcel(buffer, 'bad.xlsx')).rejects.toThrow(
      'Excel 文件缺少 pricing_scheme Sheet'
    );
  });

  it('最小四 sheet 应导入成功', async () => {
    const saveMock = jest
      .fn()
      .mockResolvedValueOnce({ id: 101 })
      .mockResolvedValueOnce({ id: 201, countryCode: 'US', carrierCode: 'FEDEX', serviceCode: 'GROUND', calcMode: 'TIER_FLAT' })
      .mockResolvedValueOnce({ id: 301 })
      .mockResolvedValueOnce({ id: 401 });
    const manager = {
      getRepository: jest.fn().mockImplementation(() => ({
        save: saveMock,
        create: (x: any) => x
      }))
    } as any;

    const txSpy = jest
      .spyOn(AppDataSource.manager, 'transaction')
      .mockImplementation(async (cb: any) => cb(manager));
    const result = await service.importFromExcel(buildWorkbook(), 'ok.xlsx');
    expect(result.failed).toBe(0);
    expect(result.success).toBe(3);
    expect(result.versionId).toBe(101);
    expect(txSpy).toHaveBeenCalled();
    txSpy.mockRestore();
  });

  it('行级错误时应返回回滚结果', async () => {
    const saveMock = jest
      .fn()
      .mockResolvedValueOnce({ id: 101 })
      .mockResolvedValueOnce({ id: 201, countryCode: 'US', carrierCode: 'FEDEX', serviceCode: 'GROUND', calcMode: '' })
      .mockResolvedValueOnce({ id: 301 })
      .mockResolvedValueOnce({ id: 401 });
    const manager = {
      getRepository: jest.fn().mockImplementation(() => ({
        save: saveMock,
        create: (x: any) => x
      }))
    } as any;

    const txSpy = jest
      .spyOn(AppDataSource.manager, 'transaction')
      .mockImplementation(async (cb: any) => cb(manager));
    const result = await service.importFromExcel(buildWorkbook({ invalidScheme: true }), 'rollback.xlsx');
    expect(result.success).toBe(0);
    expect(result.versionId).toBeUndefined();
    expect(result.failed).toBeGreaterThan(0);
    expect(result.errors[0].sheet).toBe('pricing_scheme');
    txSpy.mockRestore();
  });

  it('pricing_scheme 空表应在写库前拒绝，避免提交空版本', async () => {
    const txSpy = jest.spyOn(AppDataSource.manager, 'transaction');

    await expect(service.importFromExcel(buildWorkbook({ emptyScheme: true }), 'empty.xlsx')).rejects.toThrow(
      'pricing_scheme Sheet 为空'
    );
    expect(txSpy).not.toHaveBeenCalled();
    txSpy.mockRestore();
  });

  it('conditions_json 非法时应作为行级错误回滚，不能静默替换为空对象', async () => {
    const saveMock = jest
      .fn()
      .mockResolvedValueOnce({ id: 101 })
      .mockResolvedValueOnce({ id: 301 });
    const manager = {
      getRepository: jest.fn().mockImplementation(() => ({
        save: saveMock,
        create: (x: any) => x
      }))
    } as any;

    const txSpy = jest
      .spyOn(AppDataSource.manager, 'transaction')
      .mockImplementation(async (cb: any) => cb(manager));
    const result = await service.importFromExcel(buildWorkbook({ invalidJson: true }), 'invalid-json.xlsx');

    expect(result.success).toBe(0);
    expect(result.versionId).toBeUndefined();
    expect(result.failed).toBeGreaterThan(0);
    expect(result.errors.some((error) => error.message.includes('JSON 格式错误'))).toBe(true);
    txSpy.mockRestore();
  });
});

