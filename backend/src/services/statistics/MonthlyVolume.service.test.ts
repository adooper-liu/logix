import { MonthlyVolumeService } from './MonthlyVolume.service';
import { runWithScope } from '../../utils/requestContext';

const createMockQueryBuilder = () => {
  const qb: any = {};
  qb.select = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.leftJoin = jest.fn().mockReturnValue(qb);
  qb.getRawOne = jest.fn().mockResolvedValue({ count: '1' });
  return qb;
};

describe('MonthlyVolumeService', () => {
  it('applies scoped country filtering and factual shipment date to yearly volume', async () => {
    const qb = createMockQueryBuilder();
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb)
    };
    const service = new MonthlyVolumeService(repository as any);

    await runWithScope({ countryCode: 'GB' }, () =>
      (service as any).getYearlyVolume(new Date('2026-01-01'), new Date('2027-01-01'))
    );

    const andWhereSql = qb.andWhere.mock.calls.map((args: unknown[]) => String(args[0])).join('\n');
    expect(andWhereSql).toContain('COALESCE(order.actualShipDate, sf.shipmentDate)');
    expect(andWhereSql).not.toContain('expectedShipDate');
    expect(andWhereSql).toContain('cust.country = :countryCode');
  });

  it('applies scoped country filtering and factual shipment date to monthly volume', async () => {
    const qb = createMockQueryBuilder();
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb)
    };
    const service = new MonthlyVolumeService(repository as any);

    await runWithScope({ countryCode: 'GB' }, () =>
      (service as any).getMonthlyVolume(new Date('2026-06-01'), new Date('2026-07-01'))
    );

    const andWhereSql = qb.andWhere.mock.calls.map((args: unknown[]) => String(args[0])).join('\n');
    expect(andWhereSql).toContain('COALESCE(order.actualShipDate, sf.shipmentDate)');
    expect(andWhereSql).not.toContain('expectedShipDate');
    expect(andWhereSql).toContain('cust.country = :countryCode');
  });
});
