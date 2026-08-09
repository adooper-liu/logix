import {
  aggregateMoneyByCurrency,
  normalizeCurrencyCode,
  pickLargestCurrencyBucket
} from './currencyAggregate';

describe('currencyAggregate', () => {
  describe('normalizeCurrencyCode', () => {
    it('trim + uppercases', () => {
      expect(normalizeCurrencyCode(' usd ')).toBe('USD');
    });

    it('falls back for empty', () => {
      expect(normalizeCurrencyCode(null, 'CNY')).toBe('CNY');
      expect(normalizeCurrencyCode('  ', 'EUR')).toBe('EUR');
    });
  });

  describe('aggregateMoneyByCurrency', () => {
    it('sums same currency', () => {
      const result = aggregateMoneyByCurrency([
        { amount: 400, currency: 'USD' },
        { amount: 210, currency: 'usd' }
      ]);
      expect(result).toEqual({
        totalAmount: 610,
        currency: 'USD',
        mixedCurrency: false,
        amountsByCurrency: { USD: 610 }
      });
    });

    it('fail-closed on mixed currencies — never returns a cross-currency total', () => {
      const result = aggregateMoneyByCurrency([
        { amount: 500, currency: 'USD' },
        { amount: 1000, currency: 'CNY' }
      ]);
      expect(result.mixedCurrency).toBe(true);
      expect(result.currency).toBe('MIXED');
      expect(result.totalAmount).toBe(0);
      expect(result.amountsByCurrency).toEqual({ USD: 500, CNY: 1000 });
    });

    it('ignores zero amounts for currency diversity', () => {
      const result = aggregateMoneyByCurrency([
        { amount: 100, currency: 'USD' },
        { amount: 0, currency: 'CNY' }
      ]);
      expect(result.mixedCurrency).toBe(false);
      expect(result.currency).toBe('USD');
      expect(result.totalAmount).toBe(100);
    });

    it('empty list uses fallback currency', () => {
      const result = aggregateMoneyByCurrency([], { emptyCurrency: 'EUR' });
      expect(result).toEqual({
        totalAmount: 0,
        currency: 'EUR',
        mixedCurrency: false,
        amountsByCurrency: {}
      });
    });
  });

  describe('pickLargestCurrencyBucket', () => {
    it('returns same-currency aggregate as-is', () => {
      expect(
        pickLargestCurrencyBucket({
          totalAmount: 80,
          currency: 'EUR',
          mixedCurrency: false,
          amountsByCurrency: { EUR: 80 }
        })
      ).toEqual({ totalAmount: 80, currency: 'EUR' });
    });

    it('picks largest bucket without summing mixed currencies', () => {
      expect(
        pickLargestCurrencyBucket({
          totalAmount: 0,
          currency: 'MIXED',
          mixedCurrency: true,
          amountsByCurrency: { USD: 500, CNY: 1000 }
        })
      ).toEqual({ totalAmount: 1000, currency: 'CNY' });
    });
  });
});
