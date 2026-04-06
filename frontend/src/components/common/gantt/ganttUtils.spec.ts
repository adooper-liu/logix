/**
 * 甘特图工具函数单元测试
 * Gantt Utils Unit Tests
 */

import { describe, expect, it, vi } from 'vitest'
import {
  getContainersByDateAndPort,
  getContainersByDateAndSupplier,
  getUnclassifiedContainersByDateAndPort,
} from './ganttUtils'

// Mock 辅助函数
const mockIsReturnedEmpty = vi.fn((container: any) => container.isReturned === true)
const mockGetNodePlannedDate = vi.fn((container: any, nodeName: string) => {
  return container.plannedDates?.[nodeName] || null
})

describe('ganttUtils', () => {
  const testDate = new Date('2024-04-15')

  // 测试数据
  const mockContainers = [
    {
      containerNumber: 'CONT001',
      destinationPort: 'USLAX',
      isReturned: false,
      plannedDates: {
        清关: new Date('2024-04-15'),
        提柜: new Date('2024-04-16'),
        卸柜: new Date('2024-04-17'),
        还箱: new Date('2024-04-18'),
      },
    },
    {
      containerNumber: 'CONT002',
      destinationPort: 'USLAX',
      isReturned: false,
      plannedDates: {
        清关: new Date('2024-04-15'),
        提柜: new Date('2024-04-16'),
      },
    },
    {
      containerNumber: 'CONT003',
      destinationPort: 'USLAX',
      isReturned: true, // 已还箱
      plannedDates: {
        清关: new Date('2024-04-15'),
      },
    },
    {
      containerNumber: 'CONT004',
      destinationPort: 'CNNGB',
      isReturned: false,
      plannedDates: {
        清关: new Date('2024-04-15'),
      },
    },
    {
      containerNumber: 'CONT005',
      destinationPort: 'USLAX',
      isReturned: false,
      plannedDates: {
        清关: new Date('2024-04-16'), // 不同日期
      },
    },
  ]

  describe('getContainersByDateAndSupplier', () => {
    it('应该返回指定日期和节点的货柜列表', () => {
      const result = getContainersByDateAndSupplier(
        testDate,
        mockContainers,
        '清关',
        mockIsReturnedEmpty,
        mockGetNodePlannedDate
      )

      expect(result).toHaveLength(3) // CONT001, CONT002, CONT004
      expect(result.map(c => c.containerNumber)).toContain('CONT001')
      expect(result.map(c => c.containerNumber)).toContain('CONT002')
      expect(result.map(c => c.containerNumber)).toContain('CONT004')
    })

    it('应该排除已还箱的货柜', () => {
      const result = getContainersByDateAndSupplier(
        testDate,
        mockContainers,
        '清关',
        mockIsReturnedEmpty,
        mockGetNodePlannedDate
      )

      expect(result.map(c => c.containerNumber)).not.toContain('CONT003')
    })

    it('应该排除日期不匹配的货柜', () => {
      const result = getContainersByDateAndSupplier(
        testDate,
        mockContainers,
        '清关',
        mockIsReturnedEmpty,
        mockGetNodePlannedDate
      )

      expect(result.map(c => c.containerNumber)).not.toContain('CONT005')
    })

    it('空数组应该返回空结果', () => {
      const result = getContainersByDateAndSupplier(
        testDate,
        [],
        '清关',
        mockIsReturnedEmpty,
        mockGetNodePlannedDate
      )

      expect(result).toHaveLength(0)
    })

    it('没有计划日期的货柜应该被排除', () => {
      const containersWithoutDate = [
        {
          containerNumber: 'CONT_NO_DATE',
          isReturned: false,
          plannedDates: {},
        },
      ]

      const result = getContainersByDateAndSupplier(
        testDate,
        containersWithoutDate,
        '清关',
        mockIsReturnedEmpty,
        mockGetNodePlannedDate
      )

      expect(result).toHaveLength(0)
    })
  })

  describe('getContainersByDateAndPort', () => {
    it('应该返回指定港口和日期的货柜列表', () => {
      const result = getContainersByDateAndPort(
        testDate,
        'USLAX',
        mockContainers,
        mockIsReturnedEmpty,
        mockGetNodePlannedDate
      )

      expect(result).toHaveLength(2) // CONT001, CONT002
      expect(result.every(c => c.destinationPort === 'USLAX')).toBe(true)
    })

    it('应该排除其他港口的货柜', () => {
      const result = getContainersByDateAndPort(
        testDate,
        'USLAX',
        mockContainers,
        mockIsReturnedEmpty,
        mockGetNodePlannedDate
      )

      expect(result.map(c => c.containerNumber)).not.toContain('CONT004') // CNNGB
    })

    it('应该排除已还箱的货柜', () => {
      const result = getContainersByDateAndPort(
        testDate,
        'USLAX',
        mockContainers,
        mockIsReturnedEmpty,
        mockGetNodePlannedDate
      )

      expect(result.map(c => c.containerNumber)).not.toContain('CONT003')
    })
  })

  describe('getUnclassifiedContainersByDateAndPort', () => {
    const mockGroupedData = {
      USLAX: {
        清关: {
          供应商A: [mockContainers[0]], // CONT001 已分配
        },
      },
    }

    it('应该返回未分类的货柜', () => {
      const result = getUnclassifiedContainersByDateAndPort(
        testDate,
        'USLAX',
        mockContainers,
        mockIsReturnedEmpty,
        mockGetNodePlannedDate,
        mockGroupedData
      )

      // CONT002 未分配，应该返回
      expect(result.map(c => c.containerNumber)).toContain('CONT002')
      // CONT001 已分配，不应该返回
      expect(result.map(c => c.containerNumber)).not.toContain('CONT001')
    })

    it('应该排除已还箱的货柜', () => {
      const result = getUnclassifiedContainersByDateAndPort(
        testDate,
        'USLAX',
        mockContainers,
        mockIsReturnedEmpty,
        mockGetNodePlannedDate,
        mockGroupedData
      )

      expect(result.map(c => c.containerNumber)).not.toContain('CONT003')
    })

    it('应该排除其他港口的货柜', () => {
      const result = getUnclassifiedContainersByDateAndPort(
        testDate,
        'USLAX',
        mockContainers,
        mockIsReturnedEmpty,
        mockGetNodePlannedDate,
        mockGroupedData
      )

      expect(result.map(c => c.containerNumber)).not.toContain('CONT004')
    })

    it('空的分组数据应该返回所有符合条件的货柜', () => {
      const result = getUnclassifiedContainersByDateAndPort(
        testDate,
        'USLAX',
        mockContainers,
        mockIsReturnedEmpty,
        mockGetNodePlannedDate,
        {}
      )

      // 所有 USLAX 且未还箱且日期匹配的都应该返回
      expect(result.map(c => c.containerNumber)).toContain('CONT001')
      expect(result.map(c => c.containerNumber)).toContain('CONT002')
    })
  })

  describe('边界条件测试', () => {
    it('应该正确处理 null/undefined 输入', () => {
      expect(() => {
        getContainersByDateAndSupplier(
          testDate,
          null as any,
          '清关',
          mockIsReturnedEmpty,
          mockGetNodePlannedDate
        )
      }).toThrow()
    })

    it('应该正确处理空字符串节点名称', () => {
      const result = getContainersByDateAndSupplier(
        testDate,
        mockContainers,
        '',
        mockIsReturnedEmpty,
        mockGetNodePlannedDate
      )

      // 空节点名称应该找不到任何货柜
      expect(result).toHaveLength(0)
    })

    it('应该正确处理跨天的日期边界', () => {
      const endOfDay = new Date('2024-04-15T23:59:59')
      const startOfDay = new Date('2024-04-15T00:00:00')

      const result1 = getContainersByDateAndSupplier(
        endOfDay,
        mockContainers,
        '清关',
        mockIsReturnedEmpty,
        mockGetNodePlannedDate
      )

      const result2 = getContainersByDateAndSupplier(
        startOfDay,
        mockContainers,
        '清关',
        mockIsReturnedEmpty,
        mockGetNodePlannedDate
      )

      // 同一天的不同时间应该返回相同结果
      expect(result1).toHaveLength(result2.length)
    })
  })
})
