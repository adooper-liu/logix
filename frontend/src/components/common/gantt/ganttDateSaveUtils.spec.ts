import { describe, expect, it } from 'vitest'
import { resolveGanttDateSaveAction } from './ganttDateSaveUtils'

describe('resolveGanttDateSaveAction', () => {
  it('routes planned pickup to updateSchedule with date-only value', () => {
    expect(
      resolveGanttDateSaveAction({
        field: 'plannedPickupDate',
        value: '2026-08-10 15:30:00',
        containerNumber: 'ABCD1234567',
      })
    ).toEqual({
      kind: 'updateSchedule',
      containerNumber: 'ABCD1234567',
      plannedPickupDate: '2026-08-10',
    })
  })

  it('routes LFD to setManualLastFreeDate', () => {
    expect(
      resolveGanttDateSaveAction({
        field: 'lastFreeDate',
        value: '2026-08-12',
        containerNumber: 'ABCD1234567',
        reason: 'ops adjust',
      })
    ).toEqual({
      kind: 'setManualLastFreeDate',
      containerNumber: 'ABCD1234567',
      lastFreeDate: '2026-08-12',
      remark: 'ops adjust',
    })
  })

  it('rejects ETA/ATA so callers cannot fake success via updateContainer', () => {
    const eta = resolveGanttDateSaveAction({
      field: 'etaDestPort',
      value: '2026-08-01',
      containerNumber: 'ABCD1234567',
    })
    expect(eta.kind).toBe('unsupported')
  })
})
