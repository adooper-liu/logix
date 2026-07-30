import { omitNullish } from './omitNullish';

describe('omitNullish', () => {
  it('removes null and undefined keys but keeps other values', () => {
    expect(
      omitNullish({
        containerNumber: 'ABCD1234567',
        pickupDate: null,
        plannedPickupDate: undefined,
        unloadDate: '2026-04-10',
        note: ''
      })
    ).toEqual({
      containerNumber: 'ABCD1234567',
      unloadDate: '2026-04-10',
      note: ''
    });
  });

  it('returns empty object for nullish input', () => {
    expect(omitNullish(null)).toEqual({});
    expect(omitNullish(undefined)).toEqual({});
  });

  it('does not mutate the original object', () => {
    const input = { a: 1, b: null as null };
    const result = omitNullish(input);
    expect(result).toEqual({ a: 1 });
    expect(input).toEqual({ a: 1, b: null });
  });
});
