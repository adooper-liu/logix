import {
  buildDemurrageStandardIdentity,
  demurrageStandardIdentitiesEqual,
  normalizeDemurrageIdentityNumber,
  normalizeDemurrageIdentityText,
  toDemurrageEffectiveDateKey
} from './demurrageStandardIdentity';

describe('normalizeDemurrageIdentityText', () => {
  it('trims text and keeps empty string (matches legacy import writes)', () => {
    expect(normalizeDemurrageIdentityText('  USLAX  ')).toBe('USLAX');
    expect(normalizeDemurrageIdentityText('')).toBe('');
    expect(normalizeDemurrageIdentityText('   ')).toBe('');
    expect(normalizeDemurrageIdentityText(null)).toBeNull();
    expect(normalizeDemurrageIdentityText(undefined)).toBeNull();
  });
});

describe('normalizeDemurrageIdentityNumber', () => {
  it('parses finite numbers and maps empty to null', () => {
    expect(normalizeDemurrageIdentityNumber(1)).toBe(1);
    expect(normalizeDemurrageIdentityNumber('2')).toBe(2);
    expect(normalizeDemurrageIdentityNumber('')).toBeNull();
    expect(normalizeDemurrageIdentityNumber(null)).toBeNull();
    expect(normalizeDemurrageIdentityNumber('x')).toBeNull();
  });
});

describe('toDemurrageEffectiveDateKey', () => {
  it('normalizes string and Date inputs to YYYY-MM-DD', () => {
    expect(toDemurrageEffectiveDateKey('2026-04-01')).toBe('2026-04-01');
    expect(toDemurrageEffectiveDateKey('2026-04-01T12:00:00.000Z')).toBe('2026-04-01');
    expect(toDemurrageEffectiveDateKey(new Date(Date.UTC(2026, 3, 1)))).toBe('2026-04-01');
    expect(toDemurrageEffectiveDateKey(null)).toBeNull();
    expect(toDemurrageEffectiveDateKey('')).toBeNull();
  });
});

describe('identical reimport identity', () => {
  it('treats identical reimport rows as the same business key', () => {
    const first = buildDemurrageStandardIdentity({
      foreignCompanyCode: 'ACME',
      destinationPortCode: 'USLAX',
      shippingCompanyCode: 'MAEU',
      originForwarderCode: 'FF01',
      chargeTypeCode: 'DEM',
      chargeName: 'Demurrage',
      sequenceNumber: 1,
      terminal: null,
      transportModeCode: null,
      effectiveDate: '2026-01-01'
    });
    const second = buildDemurrageStandardIdentity({
      foreignCompanyCode: ' ACME ',
      destinationPortCode: 'USLAX',
      shippingCompanyCode: 'MAEU',
      originForwarderCode: 'FF01',
      chargeTypeCode: 'DEM',
      chargeName: 'Demurrage',
      sequenceNumber: '1',
      terminal: null,
      transportModeCode: null,
      effectiveDate: new Date(Date.UTC(2026, 0, 1))
    });

    expect(demurrageStandardIdentitiesEqual(first, second)).toBe(true);
  });
});

describe('charge type separation', () => {
  it('distinguishes different charge types so demurrage+detention stay separate', () => {
    const dem = buildDemurrageStandardIdentity({
      foreignCompanyCode: 'ACME',
      destinationPortCode: 'USLAX',
      shippingCompanyCode: 'MAEU',
      originForwarderCode: 'FF01',
      chargeTypeCode: 'DEM',
      chargeName: 'Demurrage',
      sequenceNumber: 1,
      effectiveDate: '2026-01-01'
    });
    const det = buildDemurrageStandardIdentity({
      foreignCompanyCode: 'ACME',
      destinationPortCode: 'USLAX',
      shippingCompanyCode: 'MAEU',
      originForwarderCode: 'FF01',
      chargeTypeCode: 'DET',
      chargeName: 'Detention',
      sequenceNumber: 2,
      effectiveDate: '2026-01-01'
    });

    expect(demurrageStandardIdentitiesEqual(dem, det)).toBe(false);
  });
});
