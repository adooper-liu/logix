import { AppDataSource } from '../../../src/database';
import { BaseRateRow } from '../../../src/entities/BaseRateRow';
import { ExpressCarrierService } from '../../../src/entities/ExpressCarrierService';
import { ExpressStackPolicy } from '../../../src/entities/ExpressStackPolicy';
import { ExpressSurchargeRule } from '../../../src/entities/ExpressSurchargeRule';
import { ExpressSurchargeVersion } from '../../../src/entities/ExpressSurchargeVersion';
import { PricingScheme } from '../../../src/entities/PricingScheme';
import { PricingVersion } from '../../../src/entities/PricingVersion';
import { ZoneLaneMapping } from '../../../src/entities/ZoneLaneMapping';
import { costEngineService } from '../../../src/services/costEngine.service';

async function cleanupTestData(): Promise<void> {
  await AppDataSource.createQueryBuilder().delete().from(ExpressStackPolicy).execute();
  await AppDataSource.createQueryBuilder().delete().from(ExpressSurchargeRule).execute();
  await AppDataSource.createQueryBuilder().delete().from(ExpressCarrierService).execute();
  await AppDataSource.createQueryBuilder().delete().from(ExpressSurchargeVersion).execute();
  await AppDataSource.createQueryBuilder().delete().from(BaseRateRow).execute();
  await AppDataSource.createQueryBuilder().delete().from(ZoneLaneMapping).execute();
  await AppDataSource.createQueryBuilder().delete().from(PricingScheme).execute();
  await AppDataSource.createQueryBuilder().delete().from(PricingVersion).execute();
}

describe('CostEngine PhaseA+ Integration', () => {
  let carrierServiceId: number;
  let versionKey: string;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
  });

  beforeEach(async () => {
    await cleanupTestData();

    versionKey = `PHASEA_INT_${Date.now()}`;

    await AppDataSource.getRepository(ExpressSurchargeVersion).save({
      versionKey,
      sourceFileName: 'integration.xlsx',
      importedBy: 'jest'
    });

    const carrierService = await AppDataSource.getRepository(ExpressCarrierService).save({
      countryCode: 'US',
      serviceName: `FedEx Ground ${Date.now()}`,
      defaultLengthUnit: 'in',
      defaultWeightUnit: 'lb'
    });
    carrierServiceId = carrierService.id;

    const pricingVersion = await AppDataSource.getRepository(PricingVersion).save({
      versionKey,
      effectiveFrom: new Date(),
      status: 'ACTIVE',
      sourceFileName: 'pricing.xlsx',
      importedBy: 'jest'
    });

    const scheme = await AppDataSource.getRepository(PricingScheme).save({
      versionId: pricingVersion.id,
      countryCode: 'US',
      carrierCode: 'FEDEX',
      serviceCode: 'GROUND',
      productLine: 'PARCEL_EXPRESS',
      currency: 'USD',
      priority: 10,
      calcMode: 'TIER_FLAT',
      conditionsJson: {},
      isActive: true
    });

    await AppDataSource.getRepository(ZoneLaneMapping).save({
      versionId: pricingVersion.id,
      countryCode: 'US',
      mappingType: 'ZONE',
      postalPrefixFrom: '90',
      postalPrefixTo: '99',
      zoneCode: 'Z9',
      priority: 10,
      conditionsJson: {}
    });

    await AppDataSource.getRepository(BaseRateRow).save({
      schemeId: scheme.id,
      zoneCode: 'Z9',
      weightFrom: 0,
      weightTo: 100,
      flatFee: 12.5,
      paramsJson: {}
    });
  });

  it('应返回 baseFreight 与 grandTotal（无附加费时等于基础价）', async () => {
    const result = await costEngineService.calculate({
      countryCode: 'US',
      carrierServiceId,
      versionKey,
      longestIn: 10,
      secondIn: 10,
      shortestIn: 10,
      grossWeightLbs: 5,
      carrierCode: 'FEDEX',
      serviceCode: 'GROUND',
      productLine: 'PARCEL_EXPRESS',
      destinationPostal: '90210'
    });

    expect(result.status).toBe('OK');
    expect(result.totalSurcharge).toBe(0);
    expect(result.baseFreight).toBe(12.5);
    expect(result.grandTotal).toBe(12.5);
    expect(result.zoneCode).toBe('Z9');
  });
});

