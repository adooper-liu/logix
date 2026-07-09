import { describe, expect, it } from 'vitest'
import { toDatePickerValue } from '../datePickerValue'

describe('toDatePickerValue', () => {
  it('keeps API date-only strings as date picker values', () => {
    expect(toDatePickerValue('2026-04-12')).toBe('2026-04-12')
  })

  it('normalizes API ISO date strings without calling Date methods on strings', () => {
    expect(toDatePickerValue('2026-04-12T00:00:00.000Z')).toBe('2026-04-12')
  })

  it('formats valid Date instances', () => {
    expect(toDatePickerValue(new Date(2026, 3, 12))).toBe('2026-04-12')
  })

  it('returns undefined for empty or unsupported values', () => {
    expect(toDatePickerValue('')).toBeUndefined()
    expect(toDatePickerValue(null)).toBeUndefined()
    expect(toDatePickerValue(undefined)).toBeUndefined()
    expect(toDatePickerValue({ plannedPickupDate: '2026-04-12' })).toBeUndefined()
  })
})
