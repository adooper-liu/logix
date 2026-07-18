import type { Container } from '@/types/container'
import { describe, expect, it } from 'vitest'
import { mergeReturnDateIntoUpdateData } from './useGanttLogic'

describe('mergeReturnDateIntoUpdateData', () => {
  it('keeps the unload-to-return interval when a Drop off unload moves earlier', () => {
    const container = {
      warehouseOperations: [{ plannedUnloadDate: '2026-04-10' }],
      emptyReturns: [{ plannedReturnDate: '2026-04-12' }],
    } as unknown as Container
    const updateData = { plannedUnloadDate: '2026-04-05' }

    mergeReturnDateIntoUpdateData(container, updateData, 'Drop off')

    expect(updateData).toEqual({
      plannedUnloadDate: '2026-04-05',
      plannedReturnDate: '2026-04-07',
    })
  })
})
