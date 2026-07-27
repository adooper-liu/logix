import {
  resolveDetentionIntervalForCalculation,
  resolvePickupBasisForDetention,
  resolveStorageActualRangeEnd
} from '../utils/demurrageWhatIfDates';

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

const today = d('2026-07-10');

describe('resolveDetentionIntervalForCalculation actual', () => {
  it('without pickup skips unless preferPlannedDates', () => {
    const without = resolveDetentionIntervalForCalculation({
      calculationMode: 'actual',
      preferPlannedDates: false,
      today,
      pickupDateActual: null,
      returnTime: null,
      plannedPickupDate: d('2026-07-15'),
      plannedReturnDate: d('2026-07-20')
    });
    expect(without.skipMissingActualPickup).toBe(true);
    expect(without.start).toBeNull();
    expect(without.end).toEqual(today);
  });

  it('what-if uses planned pickup/return when actuals missing', () => {
    const withWhatIf = resolveDetentionIntervalForCalculation({
      calculationMode: 'actual',
      preferPlannedDates: true,
      today,
      pickupDateActual: null,
      returnTime: null,
      plannedPickupDate: d('2026-07-15'),
      plannedReturnDate: d('2026-07-20')
    });
    expect(withWhatIf.skipMissingActualPickup).toBe(false);
    expect(withWhatIf.start).toEqual(d('2026-07-15'));
    expect(withWhatIf.end).toEqual(d('2026-07-20'));
  });

  it('keeps pickup; what-if uses planned return if no returnTime', () => {
    const result = resolveDetentionIntervalForCalculation({
      calculationMode: 'actual',
      preferPlannedDates: true,
      today,
      pickupDateActual: d('2026-07-08'),
      returnTime: null,
      plannedPickupDate: d('2026-07-15'),
      plannedReturnDate: d('2026-07-22')
    });
    expect(result.start).toEqual(d('2026-07-08'));
    expect(result.end).toEqual(d('2026-07-22'));
  });
});

describe('resolveDetentionIntervalForCalculation forecast', () => {
  it('uses planned pickup and return', () => {
    const result = resolveDetentionIntervalForCalculation({
      calculationMode: 'forecast',
      preferPlannedDates: false,
      today,
      pickupDateActual: null,
      returnTime: null,
      plannedPickupDate: d('2026-07-18'),
      plannedReturnDate: d('2026-07-25')
    });
    expect(result.skipMissingPlannedPickup).toBe(false);
    expect(result.start).toEqual(d('2026-07-18'));
    expect(result.end).toEqual(d('2026-07-25'));
  });
});

describe('resolveStorageActualRangeEnd', () => {
  it('without what-if ends at today when no actual pickup', () => {
    const result = resolveStorageActualRangeEnd({
      pickupDateActual: null,
      plannedPickupDate: d('2026-07-20'),
      today,
      preferPlannedDates: false
    });
    expect(result.end).toEqual(today);
    expect(result.endSource).toBe('当前日期');
  });

  it('with what-if later planned pickup yields later storage end', () => {
    const early = resolveStorageActualRangeEnd({
      pickupDateActual: null,
      plannedPickupDate: d('2026-07-12'),
      today,
      preferPlannedDates: true
    });
    const late = resolveStorageActualRangeEnd({
      pickupDateActual: null,
      plannedPickupDate: d('2026-07-25'),
      today,
      preferPlannedDates: true
    });
    expect(early.end).toEqual(d('2026-07-12'));
    expect(late.end).toEqual(d('2026-07-25'));
    expect(late.end.getTime()).toBeGreaterThan(early.end.getTime());
  });

  it('prefers actual pickup over planned when present', () => {
    const result = resolveStorageActualRangeEnd({
      pickupDateActual: d('2026-07-09'),
      plannedPickupDate: d('2026-07-25'),
      today,
      preferPlannedDates: true
    });
    expect(result.end).toEqual(d('2026-07-09'));
  });
});

describe('resolvePickupBasisForDetention', () => {
  it('actual what-if falls back to planned pickup for LRD', () => {
    expect(
      resolvePickupBasisForDetention({
        calculationMode: 'actual',
        preferPlannedDates: true,
        pickupDateActual: null,
        plannedPickupDate: d('2026-07-14'),
        computedLastFreeDate: d('2026-07-11')
      })
    ).toEqual(d('2026-07-14'));
  });

  it('actual without what-if does not use planned pickup', () => {
    expect(
      resolvePickupBasisForDetention({
        calculationMode: 'actual',
        preferPlannedDates: false,
        pickupDateActual: null,
        plannedPickupDate: d('2026-07-14'),
        computedLastFreeDate: d('2026-07-11')
      })
    ).toBeNull();
  });
});
