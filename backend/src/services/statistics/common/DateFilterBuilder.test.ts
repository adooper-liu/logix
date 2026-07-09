import { DateFilterBuilder } from './DateFilterBuilder';
import { getDateRangeSubqueryRaw } from './DateRangeSubquery';

const createMockQueryBuilder = () => {
  const qb: any = {};
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.leftJoin = jest.fn().mockReturnValue(qb);
  return qb;
};

describe('DateFilterBuilder shipment date scope', () => {
  it('uses actual_ship_date falling back to shipment_date, never expected_ship_date', () => {
    const qb = createMockQueryBuilder();

    DateFilterBuilder.addDateFilters(qb, '2026-06-01', '2026-06-30');

    const sql = qb.andWhere.mock.calls.map((args: unknown[]) => String(args[0])).join('\n');
    expect(sql).toContain('COALESCE(order.actualShipDate, sf.shipmentDate)');
    expect(sql).not.toContain('expectedShipDate');
  });

  it('uses the same factual shipment date scope for list EXISTS filters', () => {
    const qb = createMockQueryBuilder();

    DateFilterBuilder.addListFiltersAsExists(qb, {
      startDate: '2026-06-01',
      endDate: '2026-06-30'
    });

    const sql = qb.andWhere.mock.calls.map((args: unknown[]) => String(args[0])).join('\n');
    expect(sql).toContain('COALESCE(ro.actual_ship_date, sf2.shipment_date)');
    expect(sql).not.toContain('expected_ship_date');
  });

  it('uses the same factual shipment date scope for raw statistic subqueries', () => {
    const { sql } = getDateRangeSubqueryRaw('2026-06-01', '2026-06-30');

    expect(sql).toContain('COALESCE(o.actual_ship_date, sf.shipment_date)');
    expect(sql).not.toContain('expected_ship_date');
  });
});
