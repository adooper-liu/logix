import {
  getPortTypeForStatusCode,
  resolveTargetPortOperationForFeituoEvent
} from '../FeiTuoStatusMapping';
import { PortOperation } from '../../entities/PortOperation';

function po(partial: Partial<PortOperation>): PortOperation {
  return partial as PortOperation;
}

describe('resolveTargetPortOperationForFeituoEvent', () => {
  const origin = po({
    id: 'po-origin',
    containerNumber: 'MSKU1',
    portType: 'origin',
    portCode: 'CNSHA',
    portName: 'Shanghai',
    portSequence: 1
  });
  const transit = po({
    id: 'po-transit',
    containerNumber: 'MSKU1',
    portType: 'transit',
    portCode: 'KRPUS',
    portName: 'Busan',
    portSequence: 2
  });
  const destination = po({
    id: 'po-dest',
    containerNumber: 'MSKU1',
    portType: 'destination',
    portCode: 'USLAX',
    portName: 'Los Angeles',
    portSequence: 3
  });

  it('maps FDBA to transit (core field transit_arrival_date must not lack port type)', () => {
    expect(getPortTypeForStatusCode('FDBA')).toBe('transit');
  });

  it('matches destination ATA by location onto destination port', () => {
    const target = resolveTargetPortOperationForFeituoEvent(
      [origin, destination],
      'BDAR',
      { locationCode: 'USLAX', locationName: 'Los Angeles' }
    );
    expect(target?.id).toBe('po-dest');
  });

  it('falls back to same portType when location mismatches, never to [0]', () => {
    // destination event with unknown location — still prefer destination row
    const target = resolveTargetPortOperationForFeituoEvent(
      [origin, destination],
      'BDAR',
      { locationCode: 'UNKNOWN', locationName: 'Somewhere Else' }
    );
    expect(target?.id).toBe('po-dest');
    expect(target?.id).not.toBe('po-origin');
  });

  it('returns null for destination event when only origin exists (no silent [0] write)', () => {
    const target = resolveTargetPortOperationForFeituoEvent([origin], 'BDAR', {
      locationCode: 'USLAX',
      locationName: 'Los Angeles'
    });
    expect(target).toBeNull();
  });

  it('returns null for transit event when no transit port exists', () => {
    const target = resolveTargetPortOperationForFeituoEvent(
      [origin, destination],
      'TSBA',
      { locationCode: 'KRPUS', locationName: 'Busan' }
    );
    expect(target).toBeNull();
  });

  it('routes FDBA onto transit port when present', () => {
    const target = resolveTargetPortOperationForFeituoEvent(
      [origin, transit, destination],
      'FDBA',
      { locationCode: 'KRPUS', locationName: 'Busan' }
    );
    expect(target?.id).toBe('po-transit');
  });

  it('returns null for unknown status codes without inventing a port', () => {
    const target = resolveTargetPortOperationForFeituoEvent(
      [origin, destination],
      'NOT_A_REAL_CODE',
      { locationCode: 'CNSHA' }
    );
    expect(target).toBeNull();
  });

  it('prefers highest port_sequence among same-type matches', () => {
    const destOlder = po({
      id: 'po-dest-old',
      containerNumber: 'MSKU1',
      portType: 'destination',
      portCode: 'USLAX',
      portName: 'Los Angeles',
      portSequence: 2
    });
    const destNewer = po({
      id: 'po-dest-new',
      containerNumber: 'MSKU1',
      portType: 'destination',
      portCode: 'USLAX',
      portName: 'Los Angeles',
      portSequence: 5
    });
    const target = resolveTargetPortOperationForFeituoEvent(
      [origin, destOlder, destNewer],
      'GTOT',
      { locationCode: 'USLAX' }
    );
    expect(target?.id).toBe('po-dest-new');
  });
});
