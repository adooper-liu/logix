import { PortOperation } from '../../entities/PortOperation';
import {
  applyCoreFieldTimeToPortOperation,
  getCoreFieldName,
  resolvePortOperationTimeKeyFromCoreField
} from '../FeiTuoStatusMapping';

describe('FeiTuoStatusMapping core field persist', () => {
  const occurredAt = new Date('2026-04-15T08:00:00.000Z');

  it('maps arrival status codes to entity ata (not ataDestPort)', () => {
    for (const code of ['BDAR', 'ATA', 'ARRIVE', 'ARRI', 'FETA', 'POCA']) {
      const core = getCoreFieldName(code);
      expect(core).toBe('ata');
      expect(resolvePortOperationTimeKeyFromCoreField(core ?? '')).toBe('ata');
    }
  });

  it('maps ETA status to entity eta (not etaDestPort)', () => {
    expect(getCoreFieldName('ETA')).toBe('eta');
    expect(resolvePortOperationTimeKeyFromCoreField('eta')).toBe('eta');
  });

  it('maps ATD to entity atd (not atdTransit)', () => {
    expect(resolvePortOperationTimeKeyFromCoreField('atd')).toBe('atd');
  });

  it('writes ATA onto po.ata so TypeORM can persist the column', () => {
    const po = { containerNumber: 'TEST001' } as PortOperation;
    const key = applyCoreFieldTimeToPortOperation(po, 'ata', occurredAt);

    expect(key).toBe('ata');
    expect(po.ata).toEqual(occurredAt);
    expect((po as unknown as { ataDestPort?: Date }).ataDestPort).toBeUndefined();
  });

  it('writes ETA onto po.eta so TypeORM can persist the column', () => {
    const po = { containerNumber: 'TEST001' } as PortOperation;
    const key = applyCoreFieldTimeToPortOperation(po, 'eta', occurredAt);

    expect(key).toBe('eta');
    expect(po.eta).toEqual(occurredAt);
    expect((po as unknown as { etaDestPort?: Date }).etaDestPort).toBeUndefined();
  });

  it('writes ATD onto po.atd so TypeORM can persist the column', () => {
    const po = { containerNumber: 'TEST001' } as PortOperation;
    const key = applyCoreFieldTimeToPortOperation(po, 'atd', occurredAt);

    expect(key).toBe('atd');
    expect(po.atd).toEqual(occurredAt);
    expect((po as unknown as { atdTransit?: Date }).atdTransit).toBeUndefined();
  });

  it('does not assign non-port-operation fields onto PortOperation', () => {
    const po = { containerNumber: 'TEST001' } as PortOperation;
    expect(applyCoreFieldTimeToPortOperation(po, 'return_time', occurredAt)).toBeNull();
    expect(applyCoreFieldTimeToPortOperation(po, 'shipment_date', occurredAt)).toBeNull();
    expect(po.ata).toBeUndefined();
  });
});
