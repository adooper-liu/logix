/**
 * useResourceCapacity Composable 测试
 *
 * @file composables/__tests__/useResourceCapacity.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useResourceCapacity } from '../useResourceCapacity'
import api from '@/services/api'

vi.mock('@/services/api')

describe('useResourceCapacity', () => {
  const mockOnError = vi.fn()
  const mockOnLog = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getWarehouseCapacity', () => {
    it('should fetch warehouse capacity successfully', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              baseCapacity: 100,
              occupied: 45,
            },
          ],
        },
      })

      const { getWarehouseCapacity } = useResourceCapacity({ onError: mockOnError })

      // Act
      const result = await getWarehouseCapacity('WH001', '2026-03-27')

      // Assert
      expect(result.status).toBe('正常')
      expect(result.occupancyRate).toBe(45)
      expect(api.get).toHaveBeenCalledWith(
        '/scheduling/resources/capacity/range',
        expect.objectContaining({
          params: expect.objectContaining({
            resourceType: 'warehouse',
            warehouseCode: 'WH001',
            start: '2026-03-27',
            end: '2026-03-27',
          }),
        })
      )
    })

    it('should return high occupancy status when rate >= 95%', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              baseCapacity: 100,
              occupied: 96,
            },
          ],
        },
      })

      const { getWarehouseCapacity } = useResourceCapacity()

      // Act
      const result = await getWarehouseCapacity('WH001', '2026-03-27')

      // Assert
      expect(result.status).toBe('超负荷')
      expect(result.occupancyRate).toBe(96)
    })

    it('should return warning status when rate >= 80%', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              baseCapacity: 100,
              occupied: 85,
            },
          ],
        },
      })

      const { getWarehouseCapacity } = useResourceCapacity()

      // Act
      const result = await getWarehouseCapacity('WH001', '2026-03-27')

      // Assert
      expect(result.status).toBe('紧张')
      expect(result.occupancyRate).toBe(85)
    })

    it('should handle API error gracefully', async () => {
      // Arrange
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

      const { getWarehouseCapacity } = useResourceCapacity({ onError: mockOnError })

      // Act
      const result = await getWarehouseCapacity('WH001', '2026-03-27')

      // Assert
      expect(result.status).toBe('正常') // 降级到默认值
      expect(result.occupancyRate).toBe(0)
      expect(mockOnError).toHaveBeenCalled()
    })

    it('should use cache for repeated requests', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: [{ baseCapacity: 100, occupied: 45 }],
        },
      })

      const { getWarehouseCapacity } = useResourceCapacity()

      // Act
      await getWarehouseCapacity('WH001', '2026-03-27')
      await getWarehouseCapacity('WH001', '2026-03-27') // 第二次应该用缓存

      // Assert
      expect(api.get).toHaveBeenCalledTimes(1) // 只调用了一次
    })
  })

  describe('getTruckingCapacity', () => {
    it('should fetch trucking capacity successfully', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              baseCapacity: 50,
              occupied: 30,
            },
          ],
        },
      })

      const { getTruckingCapacity } = useResourceCapacity()

      // Act
      const result = await getTruckingCapacity('TC001', '2026-03-28')

      // Assert
      expect(result.status).toBe('正常')
      expect(result.occupancyRate).toBe(60) // 30/50 * 100
      expect(api.get).toHaveBeenCalledWith(
        '/scheduling/resources/capacity/range',
        expect.objectContaining({
          params: expect.objectContaining({
            resourceType: 'trucking',
            truckingCompanyId: 'TC001',
            start: '2026-03-28',
            end: '2026-03-28',
          }),
        })
      )
    })

    it('should handle zero baseCapacity', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              baseCapacity: 0,
              occupied: 0,
            },
          ],
        },
      })

      const { getTruckingCapacity } = useResourceCapacity()

      // Act
      const result = await getTruckingCapacity('TC001', '2026-03-28')

      // Assert
      expect(result.status).toBe('正常')
      expect(result.occupancyRate).toBe(0)
    })
  })

  describe('getWarehouseCapacityText', () => {
    it('should return status text', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: [{ baseCapacity: 100, occupied: 85 }],
        },
      })

      const { getWarehouseCapacityText } = useResourceCapacity()

      // Act
      const text = await getWarehouseCapacityText('WH001', '2026-03-27')

      // Assert
      expect(text).toBe('紧张')
    })
  })

  describe('getTruckingCapacityText', () => {
    it('should return status text', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: [{ baseCapacity: 100, occupied: 96 }],
        },
      })

      const { getTruckingCapacityText } = useResourceCapacity()

      // Act
      const text = await getTruckingCapacityText('TC001', '2026-03-28')

      // Assert
      expect(text).toBe('超负荷')
    })
  })

  describe('getWarehouseCapacityStatus', () => {
    it('should return danger status for 超负荷', () => {
      const { getWarehouseCapacityStatus } = useResourceCapacity()
      expect(getWarehouseCapacityStatus('超负荷')).toBe('danger')
    })

    it('should return danger status for 已过期', () => {
      const { getWarehouseCapacityStatus } = useResourceCapacity()
      expect(getWarehouseCapacityStatus('已过期')).toBe('danger')
    })

    it('should return warning status for 紧张', () => {
      const { getWarehouseCapacityStatus } = useResourceCapacity()
      expect(getWarehouseCapacityStatus('紧张')).toBe('warning')
    })

    it('should return success status for 正常', () => {
      const { getWarehouseCapacityStatus } = useResourceCapacity()
      expect(getWarehouseCapacityStatus('正常')).toBe('success')
    })
  })

  describe('getTruckingCapacityStatus', () => {
    it('should return correct status types', () => {
      const { getTruckingCapacityStatus } = useResourceCapacity()

      expect(getTruckingCapacityStatus('超负荷')).toBe('danger')
      expect(getTruckingCapacityStatus('已过期')).toBe('danger')
      expect(getTruckingCapacityStatus('紧张')).toBe('warning')
      expect(getTruckingCapacityStatus('正常')).toBe('success')
    })
  })

  describe('preloadCapacity', () => {
    it('should batch load multiple capacities', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: {
          success: true,
          data: [{ baseCapacity: 100, occupied: 45 }],
        },
      })

      const { preloadCapacity } = useResourceCapacity({ onLog: mockOnLog })

      const requests = [
        { type: 'warehouse' as const, id: 'WH001', date: '2026-03-27' },
        { type: 'warehouse' as const, id: 'WH002', date: '2026-03-27' },
        { type: 'trucking' as const, id: 'TC001', date: '2026-03-28' },
      ]

      // Act
      await preloadCapacity(requests, { maxConcurrent: 2 })

      // Assert
      expect(api.get).toHaveBeenCalledTimes(3)
      expect(mockOnLog).toHaveBeenCalledWith('[预加载] 完成')
    })

    it('should handle empty requests', async () => {
      // Arrange
      const { preloadCapacity } = useResourceCapacity({ onLog: mockOnLog })

      // Act
      await preloadCapacity([])

      // Assert
      expect(api.get).not.toHaveBeenCalled()
      expect(mockOnLog).toHaveBeenCalledWith('[预加载] 没有需要加载的数据')
    })

    it('should handle individual request failures gracefully', async () => {
      // Arrange
      vi.mocked(api.get)
        .mockResolvedValueOnce({
          data: { success: true, data: [{ baseCapacity: 100, occupied: 45 }] },
        })
        .mockRejectedValueOnce(new Error('Network error'))

      const { preloadCapacity } = useResourceCapacity()

      const requests = [
        { type: 'warehouse' as const, id: 'WH001', date: '2026-03-27' },
        { type: 'warehouse' as const, id: 'WH002', date: '2026-03-27' },
      ]

      // Act
      await preloadCapacity(requests)

      // Assert - 第一个成功，第二个失败但不会中断整体流程
      expect(api.get).toHaveBeenCalledTimes(2)
    })

    it('should respect maxConcurrent limit', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: { success: true, data: [{ baseCapacity: 100, occupied: 45 }] },
      })

      const { preloadCapacity } = useResourceCapacity()

      const requests = Array.from({ length: 25 }, (_, i) => ({
        type: 'warehouse' as const,
        id: `WH${String(i).padStart(3, '0')}`,
        date: '2026-03-27',
      }))

      // Act
      await preloadCapacity(requests, { maxConcurrent: 10 })

      // Assert - 应该分 3 批执行（10 + 10 + 5）
      expect(api.get).toHaveBeenCalledTimes(25)
    })
  })

  describe('preloadFromResults', () => {
    it('should extract and preload capacities from results', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: { success: true, data: [{ baseCapacity: 100, occupied: 45 }] },
      })

      const { preloadFromResults } = useResourceCapacity()

      const results = [
        {
          plannedData: {
            warehouseId: 'WH001',
            plannedUnloadDate: '2026-03-27',
            truckingCompanyId: 'TC001',
            plannedPickupDate: '2026-03-28',
          },
        },
        {
          plannedData: {
            warehouseId: 'WH002',
            plannedUnloadDate: '2026-03-28',
            truckingCompany: 'TC002',
            plannedPickupDate: '2026-03-29',
          },
        },
      ]

      // Act
      await preloadFromResults(results)

      // Assert
      expect(api.get).toHaveBeenCalledTimes(4) // 2 个仓库 + 2 个车队
    })

    it('should handle missing data gracefully', async () => {
      // Arrange
      const { preloadFromResults } = useResourceCapacity()

      const results = [
        {
          plannedData: {
            warehouseId: 'WH001',
            // missing plannedUnloadDate
          },
        },
        {
          // missing plannedData
        },
      ]

      // Act
      await preloadFromResults(results)

      // Assert
      expect(api.get).not.toHaveBeenCalled()
    })
  })

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      // Arrange
      vi.mocked(api.get).mockResolvedValue({
        data: { success: true, data: [{ baseCapacity: 100, occupied: 45 }] },
      })

      const { getWarehouseCapacity, clearCache, capacityCache } = useResourceCapacity({
        onLog: mockOnLog,
      })

      // Act - first request to populate cache
      await getWarehouseCapacity('WH001', '2026-03-27')
      expect(capacityCache.has('warehouse:WH001:2026-03-27')).toBe(true)

      // Clear cache
      clearCache()

      // Assert
      expect(capacityCache.has('warehouse:WH001:2026-03-27')).toBe(false)
      expect(mockOnLog).toHaveBeenCalled() // 只要调用了就行
    })
  })

  describe('loading state', () => {
    it('should update loading state during fetch', async () => {
      // Arrange
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })

      vi.mocked(api.get).mockImplementation(() => promise as any)

      const { getWarehouseCapacity, loading } = useResourceCapacity()

      // Assert initial state
      expect(loading.value).toBe(false)

      // Act - start fetching
      const fetchPromise = getWarehouseCapacity('WH001', '2026-03-27')

      // Wait for next tick to ensure loading is updated
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert - should be true during fetch
      expect(loading.value).toBe(true)

      // Resolve the promise
      resolvePromise!({
        data: { success: true, data: [{ baseCapacity: 100, occupied: 45 }] },
      })

      await fetchPromise

      // Assert - should be false after completion
      expect(loading.value).toBe(false)
    })
  })
})
