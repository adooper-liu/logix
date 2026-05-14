import * as XLSX from 'xlsx';
import { AppDataSource } from '../../src/database';
import { PricingImportService } from '../../src/services/pricingImport.service';

function buildWorkbook(options?: { invalidScheme?: boolean; zeroValues?: boolean }): Buffer {
  const pricingPriority = options?.zeroValues ? 0 : 100;
  const mappingPriority = options?.zeroValues ? 0 : 10;
  const distanceKm = options?.zeroValues ? 0 : 120;
  const flatFee = options?.zeroValues ? 0 : 12.5;
  const minCharge = options?.zeroValues ? 0 : 8;

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
    XLSX.utils.aoa_to_sheet([
      [
        'scheme_ref',
        'country_code',
        'carrier_code',
        'service_code',
        'product_line',
        'currency',
        'priority',
        'calc_mode'
      ],
      [
        'SCH_US_FEDEX',
        'US',
        'FEDEX',
        'GROUND',
        'PARCEL_EXPRESS',
        'USD',
        pricingPriority,
        options?.invalidScheme ? '' : 'TIER_FLAT'
      ]
    ]),
    'pricing_scheme'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [
        'country_code',
        'mapping_type',
        'postal_prefix_from',
        'postal_prefix_to',
        'zone_code',
        'distance_km',
        'priority'
      ],
      ['US', 'ZONE', '90', '99', 'Z9', distanceKm, mappingPriority]
    ]),
    'zone_lane_mapping'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['scheme_ref', 'zone_code', 'weight_from', 'weight_to', 'flat_fee', 'min_charge'],
      ['SCH_US_FEDEX', 'Z9', 0, 99, flatFee, minCharge]
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
      .mockResolvedValueOnce({
        id: 201,
        countryCode: 'US',
        carrierCode: 'FEDEX',
        serviceCode: 'GROUND',
        calcMode: 'TIER_FLAT'
      })
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

  it('导入时应保留合法的 0 数值和 0 优先级', async () => {
    const saveMock = jest
      .fn()
      .mockResolvedValueOnce({ id: 101 })
      .mockResolvedValueOnce({
        id: 201,
        countryCode: 'US',
        carrierCode: 'FEDEX',
        serviceCode: 'GROUND',
        calcMode: 'TIER_FLAT'
      })
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
    const result = await service.importFromExcel(buildWorkbook({ zeroValues: true }), 'zeros.xlsx');

    expect(result.failed).toBe(0);
    expect(saveMock.mock.calls[1][0]).toMatchObject({ priority: 0 });
    expect(saveMock.mock.calls[2][0]).toMatchObject({ distanceKm: 0, priority: 0 });
    expect(saveMock.mock.calls[3][0]).toMatchObject({ weightFrom: 0, flatFee: 0, minCharge: 0 });

    txSpy.mockRestore();
  });

  it('行级错误时应返回回滚结果', async () => {
    const saveMock = jest
      .fn()
      .mockResolvedValueOnce({ id: 101 })
      .mockResolvedValueOnce({
        id: 201,
        countryCode: 'US',
        carrierCode: 'FEDEX',
        serviceCode: 'GROUND',
        calcMode: ''
      })
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
});

