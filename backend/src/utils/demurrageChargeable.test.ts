import { resolveDemurrageIsChargeable } from './demurrageChargeable';

describe('resolveDemurrageIsChargeable', () => {
  it('defaults missing or blank values to N (chargeable)', () => {
    expect(resolveDemurrageIsChargeable(undefined)).toBe('N');
    expect(resolveDemurrageIsChargeable(null)).toBe('N');
    expect(resolveDemurrageIsChargeable('')).toBe('N');
    expect(resolveDemurrageIsChargeable('   ')).toBe('N');
  });

  it('preserves explicit Y/N markers (case-insensitive)', () => {
    expect(resolveDemurrageIsChargeable('Y')).toBe('Y');
    expect(resolveDemurrageIsChargeable('y')).toBe('Y');
    expect(resolveDemurrageIsChargeable('N')).toBe('N');
    expect(resolveDemurrageIsChargeable(' n ')).toBe('N');
  });

  it('treats unrecognized markers as chargeable (N)', () => {
    expect(resolveDemurrageIsChargeable('X')).toBe('N');
    expect(resolveDemurrageIsChargeable(0)).toBe('N');
  });
});
