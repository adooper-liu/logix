import {
  applyFeituoSourcedPickupDate,
  canFeituoOverwritePickupDate,
  PICKUP_DATE_SOURCE
} from './pickupDateSource';

describe('canFeituoOverwritePickupDate', () => {
  it('allows overwrite when source is empty', () => {
    expect(canFeituoOverwritePickupDate(undefined)).toBe(true);
    expect(canFeituoOverwritePickupDate(null)).toBe(true);
    expect(canFeituoOverwritePickupDate('')).toBe(true);
    expect(canFeituoOverwritePickupDate('   ')).toBe(true);
  });

  it('allows overwrite when source is feituo', () => {
    expect(canFeituoOverwritePickupDate(PICKUP_DATE_SOURCE.FEITUO)).toBe(true);
    expect(canFeituoOverwritePickupDate('FEITUO')).toBe(true);
  });

  it('blocks overwrite for business and manual sources', () => {
    expect(canFeituoOverwritePickupDate(PICKUP_DATE_SOURCE.BUSINESS)).toBe(false);
    expect(canFeituoOverwritePickupDate(PICKUP_DATE_SOURCE.MANUAL)).toBe(false);
  });
});

describe('applyFeituoSourcedPickupDate', () => {
  const excelPickup = new Date('2026-08-01T00:00:00.000Z');
  const gateOut = new Date('2026-08-05T14:30:00.000Z');

  it('writes Excel pickup as feituo so GATE_OUT in the same import can still correct it', () => {
    const tt: { pickupDate?: Date | null; pickupDateSource?: string | null } = {};

    expect(applyFeituoSourcedPickupDate(tt, excelPickup)).toBe(true);
    expect(tt.pickupDate).toEqual(excelPickup);
    expect(tt.pickupDateSource).toBe(PICKUP_DATE_SOURCE.FEITUO);

    expect(canFeituoOverwritePickupDate(tt.pickupDateSource)).toBe(true);
    expect(applyFeituoSourcedPickupDate(tt, gateOut)).toBe(true);
    expect(tt.pickupDate).toEqual(gateOut);
    expect(tt.pickupDateSource).toBe(PICKUP_DATE_SOURCE.FEITUO);
  });

  it('does not overwrite a business-locked pickup date', () => {
    const tt = {
      pickupDate: new Date('2026-07-20T00:00:00.000Z'),
      pickupDateSource: PICKUP_DATE_SOURCE.BUSINESS
    };

    expect(applyFeituoSourcedPickupDate(tt, excelPickup)).toBe(false);
    expect(tt.pickupDate).toEqual(new Date('2026-07-20T00:00:00.000Z'));
    expect(tt.pickupDateSource).toBe(PICKUP_DATE_SOURCE.BUSINESS);
  });

  it('does not overwrite a manually set pickup date', () => {
    const manual = new Date('2026-07-22T00:00:00.000Z');
    const tt = {
      pickupDate: manual,
      pickupDateSource: PICKUP_DATE_SOURCE.MANUAL
    };

    expect(applyFeituoSourcedPickupDate(tt, excelPickup)).toBe(false);
    expect(tt.pickupDate).toEqual(manual);
    expect(tt.pickupDateSource).toBe(PICKUP_DATE_SOURCE.MANUAL);
  });
});
