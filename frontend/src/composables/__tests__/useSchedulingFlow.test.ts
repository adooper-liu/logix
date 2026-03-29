/**
 * useSchedulingFlow Composable 测试
 * 
 * @file composables/__tests__/useSchedulingFlow.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSchedulingFlow } from '../useSchedulingFlow'
import { containerService } from '@/services/container'
import type { ScheduleResult } from '@/services/ai'

// Mock dependencies
vi.mock('@/services/container', () => ({
  containerService: {
    batchSchedule: vi.fn(),
    confirmSchedule: vi.fn(),
  },
}))

describe('useSchedulingFlow', () => {
  const mockOnLog = vi.fn()
  const mockOnProgress = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleBatchSchedule', () => {
    it('should handle successful batch scheduling', async () => {
      // Arrange
      vi.mocked(containerService.batchSchedule).mockResolvedValue({
        success: true,
        results: [
          { containerNumber: 'TEST1', success: true, message: '成功' },
          { containerNumber: 'TEST2', success: true, message: '成功' },
        ],
        total: 2,
        successCount: 2,
        failedCount: 0,
        hasMore: false,
      })

      const { handleBatchSchedule } = useSchedulingFlow({
        onLog: mockOnLog,
        onProgress: mockOnProgress,
        onSuccess: mockOnSuccess,
      })

      // Act
      const result = await handleBatchSchedule({
        country: 'US',
        dryRun: false,
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.totalSuccess).toBe(2)
      expect(result.totalFailed).toBe(0)
      expect(mockOnLog).toHaveBeenCalledWith(expect.stringContaining('排产结束'), 'success')
      expect(mockOnSuccess).toHaveBeenCalled()
    })

    it('should handle partial failure', async () => {
      // Arrange
      vi.mocked(containerService.batchSchedule).mockResolvedValue({
        success: true,
        results: [
          { containerNumber: 'TEST1', success: true, message: '成功' },
          { containerNumber: 'TEST2', success: false, message: '仓库已满' },
        ],
        total: 2,
        successCount: 1,
        failedCount: 1,
        hasMore: false,
      })

      const { handleBatchSchedule } = useSchedulingFlow({
        onLog: mockOnLog,
      })

      // Act
      const result = await handleBatchSchedule({
        country: 'US',
        dryRun: false,
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.totalSuccess).toBe(1)
      expect(result.totalFailed).toBe(1)
      expect(mockOnLog).toHaveBeenCalledWith(expect.stringContaining('成功 1/2'), 'warning')
    })

    it('should handle API error', async () => {
      // Arrange
      vi.mocked(containerService.batchSchedule).mockRejectedValue(
        new Error('Network error')
      )

      const { handleBatchSchedule } = useSchedulingFlow({
        onLog: mockOnLog,
        onError: mockOnError,
      })

      // Act
      const result = await handleBatchSchedule({
        country: 'US',
        dryRun: false,
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(mockOnLog).toHaveBeenCalledWith('Network error', 'error')
      expect(mockOnError).toHaveBeenCalled()
    })

    it('should handle business logic error', async () => {
      // Arrange
      vi.mocked(containerService.batchSchedule).mockResolvedValue({
        success: false,
        total: 0,
        successCount: 0,
        failedCount: 0,
        results: [],
      } as any)

      const { handleBatchSchedule } = useSchedulingFlow({
        onLog: mockOnLog,
        onError: mockOnError,
      })

      // Act
      const result = await handleBatchSchedule({
        country: 'US',
        dryRun: false,
      })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('没有待排产的货柜')
    })
  })

  describe('handlePreviewSchedule', () => {
    it('should call batchSchedule with dryRun=true', async () => {
      // Arrange
      vi.mocked(containerService.batchSchedule).mockResolvedValue({
        success: true,
        results: [{ containerNumber: 'TEST1', success: true }],
        total: 1,
        successCount: 1,
        failedCount: 0,
        hasMore: false,
      })

      const { handlePreviewSchedule } = useSchedulingFlow({
        onLog: mockOnLog,
      })

      // Act
      await handlePreviewSchedule({
        country: 'US',
        startDate: '2026-03-27',
        endDate: '2026-04-03',
      })

      // Assert
      expect(containerService.batchSchedule).toHaveBeenCalledWith({
        country: 'US',
        startDate: '2026-03-27',
        endDate: '2026-04-03',
        dryRun: true,
      })
    })

    it('should transform preview results correctly', async () => {
      // Arrange
      const mockScheduleResult: ScheduleResult = {
        success: true,
        total: 1,
        successCount: 1,
        failedCount: 0,
        hasMore: false,
        results: [
          {
            containerNumber: 'TEST1',
            success: true,
            plannedData: {
              warehouseName: 'Test Warehouse',
              plannedPickupDate: '2026-03-28',
              plannedDeliveryDate: '2026-03-29',
              plannedUnloadDate: '2026-03-30',
              truckingCompany: 'Test Trucking',
              unloadModePlan: 'Direct',
            },
            estimatedCosts: {
              totalCost: '500.00',
              transportationCost: '300.00',
              handlingCost: '100.00',
              storageCost: '50.00',
              otherCost: '50.00',
            },
            freeDaysRemaining: 5,
            lastFreeDate: '2026-04-04',
          } as any,
        ],
      }

      vi.mocked(containerService.batchSchedule).mockResolvedValue(mockScheduleResult)

      const { handlePreviewSchedule } = useSchedulingFlow({
        onLog: mockOnLog,
      })

      // Act
      const result = await handlePreviewSchedule({
        country: 'US',
        dryRun: true,
      })

      // Assert
      expect(result.results?.[0]).toMatchObject({
        containerNumber: 'TEST1',
        success: true,
        plannedData: expect.objectContaining({
          warehouseName: 'Test Warehouse',
          plannedPickupDate: '2026-03-28',
        }),
      })
    })
  })

  describe('handleConfirmSave', () => {
    it('should successfully save preview results', async () => {
      // Arrange
      vi.mocked(containerService.confirmSchedule).mockResolvedValue({
        success: true,
        savedCount: 2,
        total: 2,
        results: [
          { containerNumber: 'TEST1', success: true, message: '保存成功' },
          { containerNumber: 'TEST2', success: true, message: '保存成功' },
        ],
      })

      const { handleConfirmSave } = useSchedulingFlow({
        onLog: mockOnLog,
      })

      const previewResults = [
        {
          containerNumber: 'TEST1',
          success: true,
          plannedData: { warehouseName: 'WH1' },
        },
        {
          containerNumber: 'TEST2',
          success: true,
          plannedData: { warehouseName: 'WH2' },
        },
      ]

      // Act
      const result = await handleConfirmSave(['TEST1', 'TEST2'], previewResults)

      // Assert
      expect(result.success).toBe(true)
      expect(result.savedCount).toBe(2)
      expect(mockOnLog).toHaveBeenCalledWith('成功保存 2 个货柜', 'success')
    })

    it('should handle save error', async () => {
      // Arrange
      vi.mocked(containerService.confirmSchedule).mockRejectedValue(
        new Error('Database error')
      )

      const { handleConfirmSave } = useSchedulingFlow({
        onLog: mockOnLog,
        onError: mockOnError,
      })

      // Act
      const result = await handleConfirmSave(['TEST1'], [])

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
      expect(mockOnLog).toHaveBeenCalledWith('Database error', 'error')
      expect(mockOnError).toHaveBeenCalled()
    })
  })

  describe('scheduling state', () => {
    it('should update scheduling state during operation', async () => {
      // Arrange
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      vi.mocked(containerService.batchSchedule).mockImplementation(
        () => promise as any
      )

      const { handleBatchSchedule, scheduling } = useSchedulingFlow({
        onLog: mockOnLog,
      })

      // Assert initial state
      expect(scheduling.value).toBe(false)

      // Act - start scheduling
      const promise2 = handleBatchSchedule({ country: 'US' })

      // Assert - should be true during operation
      expect(scheduling.value).toBe(true)

      // Resolve the promise
      resolvePromise!({
        success: true,
        results: [],
        total: 0,
        successCount: 0,
        failedCount: 0,
        hasMore: false,
      })

      await promise2

      // Assert - should be false after completion
      expect(scheduling.value).toBe(false)
    })
  })
})
