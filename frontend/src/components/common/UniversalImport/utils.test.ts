import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseDate } from './utils'

describe('parseDate', () => {
  it('returns null for empty values', () => {
    expect(parseDate(null)).toBeNull()
    expect(parseDate(undefined)).toBeNull()
    expect(parseDate('')).toBeNull()
  })

  it('keeps YYYY-MM-DD and slash-separated date strings', () => {
    expect(parseDate('2026-08-18')).toBe('2026-08-18')
    expect(parseDate('2026/8/18')).toBe('2026-08-18')
    expect(parseDate('2026-08-18T00:00:00.000Z')).toBe('2026-08-18')
  })

  it('converts Excel serial numbers using UTC midnight', () => {
    // 45922 = 2026-08-18 (days since 1899-12-30)
    expect(parseDate(45922)).toBe('2026-08-18')
  })

  it('converts Date objects from SheetJS cellDates instead of dropping them', () => {
    const utcMidnight = new Date(Date.UTC(2026, 7, 18))
    expect(parseDate(utcMidnight)).toBe('2026-08-18')
    expect(parseDate(new Date('invalid'))).toBeNull()
  })

  it('does not treat Date.toString() locale text as a missing date', () => {
    const date = new Date(Date.UTC(2026, 7, 18))
    expect(String(date)).not.toMatch(/^\d{4}-\d{1,2}-\d{1,2}/)
    expect(parseDate(date)).toBe('2026-08-18')
  })

  it('round-trips Excel date cells written with cellDates: true', () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['预计到港日期', '箱号'],
      [new Date(Date.UTC(2026, 7, 18)), 'ABCD1234567'],
    ])
    ws['A2'].t = 'd'
    ws['A2'].v = new Date(Date.UTC(2026, 7, 18))
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const read = XLSX.read(buf, { type: 'buffer', cellDates: true })
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(read.Sheets[read.SheetNames[0]], {
      defval: '',
    })

    const cell = rows[0]['预计到港日期']
    expect(cell instanceof Date || typeof cell === 'number').toBe(true)
    expect(parseDate(cell)).toBe('2026-08-18')
  })
})
