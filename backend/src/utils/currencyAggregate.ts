/**
 * 货币金额聚合：禁止跨币种相加后贴单一币种标签。
 * 混币时 fail-closed：totalAmount=0、currency=MIXED，明细见 amountsByCurrency。
 */

export interface MoneyAmount {
  amount: number;
  currency: string | null | undefined;
}

export interface CurrencyAggregate {
  /** 单一币种合计；混币或无正金额时为 0 */
  totalAmount: number;
  /** 单一币种代码；混币为 MIXED */
  currency: string;
  mixedCurrency: boolean;
  amountsByCurrency: Record<string, number>;
}

export function normalizeCurrencyCode(
  currency: string | null | undefined,
  fallback = 'USD'
): string {
  const trimmed = (currency ?? '').trim().toUpperCase();
  return trimmed || fallback;
}

/**
 * 按币种聚合金额。金额为 0 的项不参与币种判定。
 */
export function aggregateMoneyByCurrency(
  entries: MoneyAmount[],
  options?: { emptyCurrency?: string }
): CurrencyAggregate {
  const emptyCurrency = normalizeCurrencyCode(options?.emptyCurrency, 'USD');
  const amountsByCurrency: Record<string, number> = {};

  for (const entry of entries) {
    const amount = Number(entry.amount);
    if (!Number.isFinite(amount) || amount === 0) continue;
    const currency = normalizeCurrencyCode(entry.currency, emptyCurrency);
    amountsByCurrency[currency] = (amountsByCurrency[currency] ?? 0) + amount;
  }

  const currencies = Object.keys(amountsByCurrency);
  if (currencies.length === 0) {
    return {
      totalAmount: 0,
      currency: emptyCurrency,
      mixedCurrency: false,
      amountsByCurrency: {}
    };
  }

  if (currencies.length === 1) {
    const currency = currencies[0];
    return {
      totalAmount: amountsByCurrency[currency],
      currency,
      mixedCurrency: false,
      amountsByCurrency
    };
  }

  return {
    totalAmount: 0,
    currency: 'MIXED',
    mixedCurrency: true,
    amountsByCurrency
  };
}

/**
 * TopN / 排序场景：混币时取单一币种最大桶，绝不把不同币种相加。
 */
export function pickLargestCurrencyBucket(aggregate: CurrencyAggregate): {
  totalAmount: number;
  currency: string;
} {
  if (!aggregate.mixedCurrency) {
    return { totalAmount: aggregate.totalAmount, currency: aggregate.currency };
  }

  let best = { totalAmount: 0, currency: 'USD' };
  for (const [currency, amount] of Object.entries(aggregate.amountsByCurrency)) {
    if (amount > best.totalAmount) {
      best = { totalAmount: amount, currency };
    }
  }
  return best;
}
