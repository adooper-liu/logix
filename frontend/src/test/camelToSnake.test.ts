import { describe, it, expect } from 'vitest'
import { camelToSnake } from '../utils/camelToSnake'

describe('camelToSnake', () => {
  it('should convert simple camelCase to snake_case', () => {
    expect(camelToSnake({ containerNumber: 'ABC123' })).toEqual({
      container_number: 'ABC123',
    })
  })

  it('should convert multiple camelCase keys', () => {
    expect(
      camelToSnake({
        containerNumber: 'ABC123',
        logisticsStatus: 'in_transit',
        etaDestPort: '2024-01-01',
      })
    ).toEqual({
      container_number: 'ABC123',
      logistics_status: 'in_transit',
      eta_dest_port: '2024-01-01',
    })
  })

  it('should handle null and undefined', () => {
    expect(camelToSnake(null)).toBeNull()
    expect(camelToSnake(undefined)).toBeUndefined()
  })

  it('should handle primitives', () => {
    expect(camelToSnake('string')).toBe('string')
    expect(camelToSnake(123)).toBe(123)
    expect(camelToSnake(true)).toBe(true)
  })

  it('should handle arrays', () => {
    const arr = [{ containerNumber: 'ABC123' }, { containerNumber: 'DEF456' }]
    expect(camelToSnake(arr)).toEqual(arr)
  })

  it('should handle nested objects recursively', () => {
    expect(
      camelToSnake({
        containerNumber: 'ABC123',
        portOperation: {
          etaDestPort: '2024-01-01',
          ataDestPort: '2024-01-05',
        },
      })
    ).toEqual({
      container_number: 'ABC123',
      port_operation: {
        eta_dest_port: '2024-01-01',
        ata_dest_port: '2024-01-05',
      },
    })
  })

  it('should handle empty object', () => {
    expect(camelToSnake({})).toEqual({})
  })
})
