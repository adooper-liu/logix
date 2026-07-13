import { beforeEach, describe, expect, it } from 'vitest'
import { useShipmentsTable } from '../useShipmentsTable'

describe('useShipmentsTable', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('does not slice backend-paginated rows again when a countdown filter is active', () => {
    const table = useShipmentsTable()

    table.activeFilter.value = { type: '按到港', days: 'today' }
    table.pagination.value = { page: 2, pageSize: 10, total: 25 }
    table.containers.value = [
      { containerNumber: 'C011', alertCount: 0 },
      { containerNumber: 'C012', alertCount: 0 },
    ] as any

    expect(table.filteredContainers.value.map(row => row.containerNumber)).toEqual(['C011', 'C012'])
  })

  it('still applies alert filtering to the current backend page', () => {
    const table = useShipmentsTable()

    table.alertFilter.value = true
    table.containers.value = [
      { containerNumber: 'C001', alertCount: 1 },
      { containerNumber: 'C002', alertCount: 0 },
    ] as any

    expect(table.filteredContainers.value.map(row => row.containerNumber)).toEqual(['C001'])
  })
})
