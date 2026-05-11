import * as XLSX from 'xlsx';
import { AppDataSource } from '../../../src/database';
import { BaseRateRow } from '../../../src/entities/BaseRateRow';
import { PricingScheme } from '../../../src/entities/PricingScheme';
import { PricingVersion } from '../../../src/entities/PricingVersion';
import { ZoneLaneMapping } from '../../../src/entities/ZoneLaneMapping';
import { pricingImportService } from '../../../src/services/pricingImport.service';

async function cleanupPricingTables(): Promise<void> {
  await AppDataSource.createQueryBuilder().delete().from(BaseRateRow).execute();
  await AppDataSource.createQueryBuilder().delete().from(ZoneLaneMapping).execute();
  await AppDataSource.createQueryBuilder().delete().from(PricingScheme).execute();
  await AppDataSource.createQueryBuilder().delete().from(PricingVersion).execute();
}

function buildPricingWorkbook(versionKey: string, options?: { badSchemeRef?: boolean }): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['version_key', 'effective_from', 'imported_by'],
      [versionKey, '2026-04-23', 'jest']
    ]),
    'metadata'
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['scheme_ref', 'country_code', 'carrier_code', 'service_code', 'product_line', 'currency', 'calc_mode'],
      ['SCH_US_FEDEX', 'US', 'FEDEX', 'GROUND', 'PARCEL_EXPRESS', 'USD', 'TIER_FLAT']
    ]),
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
      [options?.badSchemeRef ? 'MISSING_REF' : 'SCH_US_FEDEX', 'Z9', 0, 100, 12.5]
    ]),
    'base_rate_rows'
  );
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('PricingImportService Integration', () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  beforeEach(async () => {
    await cleanupPricingTables();
  });

  it('应成功导入最小四 Sheet 并落库', async () => {
    const versionKey = `P_INT_OK_${Date.now()}`;
    const result = await pricingImportService.importFromExcel(
      buildPricingWorkbook(versionKey),
      'pricing-ok.xlsx'
    );

    expect(result.failed).toBe(0);
    expect(result.versionId).toBeDefined();
    expect(await AppDataSource.getRepository(PricingVersion).count()).toBe(1);
    expect(await AppDataSource.getRepository(PricingScheme).count()).toBe(1);
    expect(await AppDataSource.getRepository(ZoneLaneMapping).count()).toBe(1);
    expect(await AppDataSource.getRepository(BaseRateRow).count()).toBe(1);
  });

  it('行级错误应全量回滚，不保留版本与价格行', async () => {
    const versionKey = `P_INT_ROLLBACK_${Date.now()}`;
    const result = await pricingImportService.importFromExcel(
      buildPricingWorkbook(versionKey, { badSchemeRef: true }),
      'pricing-rollback.xlsx'
    );

    expect(result.success).toBe(0);
    expect(result.failed).toBeGreaterThan(0);
    expect(result.versionId).toBeUndefined();
    expect(result.errors.some((e) => e.sheet === 'base_rate_rows')).toBe(true);
    expect(await AppDataSource.getRepository(PricingVersion).count()).toBe(0);
    expect(await AppDataSource.getRepository(PricingScheme).count()).toBe(0);
    expect(await AppDataSource.getRepository(ZoneLaneMapping).count()).toBe(0);
    expect(await AppDataSource.getRepository(BaseRateRow).count()).toBe(0);
  });
});

