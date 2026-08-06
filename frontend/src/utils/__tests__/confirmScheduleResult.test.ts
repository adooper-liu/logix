import { describe, expect, it } from 'vitest'
import {
  retainFailedPreviewResults,
  summarizeConfirmScheduleResult,
} from '@/utils/confirmScheduleResult'

describe('summarizeConfirmScheduleResult', () => {
  it('treats full success as clearable', () => {
    const outcome = summarizeConfirmScheduleResult(
      {
        success: true,
        savedCount: 2,
        total: 2,
        results: [
          { containerNumber: 'A', success: true, message: '保存成功' },
          { containerNumber: 'B', success: true, message: '保存成功' },
        ],
      },
      ['A', 'B']
    )

    expect(outcome.kind).toBe('all_succeeded')
    expect(outcome.clearPreview).toBe(true)
    expect(outcome.failedCount).toBe(0)
    expect(outcome.toastType).toBe('success')
  })

  it('surfaces partial capacity failures instead of fake full success', () => {
    const outcome = summarizeConfirmScheduleResult(
      {
        success: true, // backend sets success when savedCount > 0
        savedCount: 1,
        total: 2,
        results: [
          { containerNumber: 'A', success: true, message: '保存成功' },
          { containerNumber: 'B', success: false, message: '仓库或车队资源不足' },
        ],
      },
      ['A', 'B']
    )

    expect(outcome.kind).toBe('partial')
    expect(outcome.savedCount).toBe(1)
    expect(outcome.failedCount).toBe(1)
    expect(outcome.clearPreview).toBe(false)
    expect(outcome.toastType).toBe('warning')
    expect(outcome.toastMessage).toContain('失败 1')
    expect(outcome.toastMessage).toContain('B')
    expect(outcome.toastMessage).toContain('仓库或车队资源不足')
    expect(outcome.failedItems).toEqual([
      { containerNumber: 'B', success: false, message: '仓库或车队资源不足' },
    ])
  })

  it('treats missing per-item results for requested containers as failures', () => {
    const outcome = summarizeConfirmScheduleResult(
      {
        success: true,
        savedCount: 1,
        total: 2,
        results: [{ containerNumber: 'A', success: true, message: '保存成功' }],
      },
      ['A', 'B']
    )

    expect(outcome.kind).toBe('partial')
    expect(outcome.failedItems.map(i => i.containerNumber)).toEqual(['B'])
    expect(outcome.clearPreview).toBe(false)
  })

  it('handles all-failed responses', () => {
    const outcome = summarizeConfirmScheduleResult(
      {
        success: false,
        savedCount: 0,
        total: 1,
        results: [{ containerNumber: 'A', success: false, message: '货柜不存在' }],
      },
      ['A']
    )

    expect(outcome.kind).toBe('all_failed')
    expect(outcome.clearPreview).toBe(false)
    expect(outcome.toastType).toBe('error')
    expect(outcome.toastMessage).toContain('货柜不存在')
  })
})

describe('retainFailedPreviewResults', () => {
  it('drops saved containers and annotates remaining failures', () => {
    const outcome = summarizeConfirmScheduleResult(
      {
        success: true,
        savedCount: 1,
        total: 2,
        results: [
          { containerNumber: 'A', success: true, message: '保存成功' },
          { containerNumber: 'B', success: false, message: '仓库或车队资源不足' },
        ],
      },
      ['A', 'B']
    )

    const retained = retainFailedPreviewResults(
      [
        { containerNumber: 'A', success: true, plannedData: { warehouseId: 1 } },
        { containerNumber: 'B', success: true, plannedData: { warehouseId: 2 } },
      ],
      outcome
    )

    expect(retained).toHaveLength(1)
    expect(retained[0]).toMatchObject({
      containerNumber: 'B',
      success: false,
      message: '仓库或车队资源不足',
      plannedData: { warehouseId: 2 },
    })
  })
})
