import {
  evaluateYardUsageFromDates,
  resolveDropoffYardUsage
} from './dropoffYardUsage';

describe('evaluateYardUsageFromDates', () => {
  it('无提柜日时返回 null', () => {
    expect(evaluateYardUsageFromDates(null, '2026-04-12')).toBeNull();
    expect(evaluateYardUsageFromDates(undefined, '2026-04-12')).toBeNull();
  });

  it('有提柜无送仓时保守返回 true', () => {
    expect(evaluateYardUsageFromDates('2026-04-10', null)).toBe(true);
  });

  it('提送同日返回 false（直送）', () => {
    expect(evaluateYardUsageFromDates('2026-04-10', '2026-04-10')).toBe(false);
    expect(
      evaluateYardUsageFromDates(
        new Date('2026-04-10T00:00:00.000Z'),
        new Date('2026-04-10T15:00:00.000Z')
      )
    ).toBe(false);
  });

  it('提送不同日返回 true（使用堆场）', () => {
    expect(evaluateYardUsageFromDates('2026-04-10', '2026-04-12')).toBe(true);
  });
});

describe('resolveDropoffYardUsage', () => {
  it('what-if：计划提<卸时判定使用堆场（即使无实际提柜）', () => {
    expect(
      resolveDropoffYardUsage({
        preferPlannedDates: true,
        plannedPickupDate: '2026-04-10',
        plannedDeliveryDate: '2026-04-12',
        actualPickupDate: null,
        actualDeliveryDate: null
      })
    ).toBe(true);
  });

  it('what-if：计划提=卸时判定直送', () => {
    expect(
      resolveDropoffYardUsage({
        preferPlannedDates: true,
        plannedPickupDate: '2026-04-10',
        plannedDeliveryDate: '2026-04-10',
        actualPickupDate: null
      })
    ).toBe(false);
  });

  it('非 what-if：无实际提柜保持历史行为 false', () => {
    expect(
      resolveDropoffYardUsage({
        preferPlannedDates: false,
        plannedPickupDate: '2026-04-10',
        plannedDeliveryDate: '2026-04-12',
        actualPickupDate: null
      })
    ).toBe(false);
  });

  it('非 what-if：实际提送不同日判定使用堆场', () => {
    expect(
      resolveDropoffYardUsage({
        actualPickupDate: '2026-04-08',
        actualDeliveryDate: '2026-04-11'
      })
    ).toBe(true);
  });

  it('what-if：计划日不足时回退实际日', () => {
    expect(
      resolveDropoffYardUsage({
        preferPlannedDates: true,
        plannedPickupDate: null,
        plannedDeliveryDate: null,
        actualPickupDate: '2026-04-08',
        actualDeliveryDate: '2026-04-09'
      })
    ).toBe(true);
  });
});
