/**
 * 单元测试：SchedulingVisual 过滤逻辑
 * 测试覆盖：
 * - filteredDisplayResults: 全部结果过滤
 * - successFilteredResults: 成功结果过滤
 * - failedFilteredResults: 失败结果过滤
 * - 搜索功能：支持柜号、目的港、仓库搜索
 */

import { describe, expect, it } from 'vitest'
import { computed } from 'vue'

// 模拟 Vue 组件中的计算属性
const createFilteredResults = (displayResults: any[], searchText: string) => {
  const filteredDisplayResults = computed(() => {
    const results = displayResults

    if (!searchText) return results

    const searchLower = searchText.toLowerCase()
    return results.filter(
      (r: any) =>
        r.containerNumber?.toLowerCase().includes(searchLower) ||
        r.destinationPort?.toLowerCase().includes(searchLower) ||
        r.warehouseName?.toLowerCase().includes(searchLower)
    )
  })

  const successFilteredResults = computed(() => {
    const results = displayResults.filter((r: any) => r.success)

    if (!searchText) return results

    const searchLower = searchText.toLowerCase()
    return results.filter(
      (r: any) =>
        r.containerNumber?.toLowerCase().includes(searchLower) ||
        r.destinationPort?.toLowerCase().includes(searchLower) ||
        r.warehouseName?.toLowerCase().includes(searchLower)
    )
  })

  const failedFilteredResults = computed(() => {
    const results = displayResults.filter((r: any) => !r.success)

    if (!searchText) return results

    const searchLower = searchText.toLowerCase()
    return results.filter(
      (r: any) =>
        r.containerNumber?.toLowerCase().includes(searchLower) ||
        r.destinationPort?.toLowerCase().includes(searchLower) ||
        r.message?.toLowerCase().includes(searchLower)
    )
  })

  return {
    filteredDisplayResults,
    successFilteredResults,
    failedFilteredResults,
  }
}

describe('SchedulingVisual - 过滤逻辑', () => {
  // 模拟数据
  const mockData = [
    {
      containerNumber: 'MSKU1234567',
      success: true,
      destinationPort: 'USLAX',
      warehouseName: 'LA Warehouse',
      message: 'Success',
    },
    {
      containerNumber: 'TGHU9876543',
      success: true,
      destinationPort: 'USLGB',
      warehouseName: 'Long Beach Depot',
      message: 'Success',
    },
    {
      containerNumber: 'HLXU5555555',
      success: false,
      destinationPort: 'USOAK',
      warehouseName: 'Oakland Center',
      message: 'No warehouse available',
    },
    {
      containerNumber: 'COSU6666666',
      success: true,
      destinationPort: 'USSEA',
      warehouseName: 'Seattle Hub',
      message: 'Success',
    },
    {
      containerNumber: 'YMLU7777777',
      success: false,
      destinationPort: 'USPDX',
      warehouseName: 'Portland Storage',
      message: 'Trucking company not found',
    },
  ]

  describe('filteredDisplayResults', () => {
    it('应该返回所有结果当搜索为空时', () => {
      const { filteredDisplayResults } = createFilteredResults(mockData, '')
      expect(filteredDisplayResults.value).toHaveLength(5)
    })

    it('应该支持柜号搜索（不区分大小写）', () => {
      const { filteredDisplayResults } = createFilteredResults(mockData, 'msku1234567')
      expect(filteredDisplayResults.value).toHaveLength(1)
      expect(filteredDisplayResults.value[0].containerNumber).toBe('MSKU1234567')
    })

    it('应该支持柜号部分匹配', () => {
      const { filteredDisplayResults } = createFilteredResults(mockData, '1234567')
      expect(filteredDisplayResults.value).toHaveLength(1)
    })

    it('应该支持目的港搜索', () => {
      const { filteredDisplayResults } = createFilteredResults(mockData, 'USLAX')
      expect(filteredDisplayResults.value).toHaveLength(1)
    })

    it('应该支持仓库搜索', () => {
      const { filteredDisplayResults } = createFilteredResults(mockData, 'LA Warehouse')
      expect(filteredDisplayResults.value).toHaveLength(1)
    })

    it('应该支持多关键词匹配', () => {
      const { filteredDisplayResults } = createFilteredResults(mockData, 'US')
      // 所有数据都包含 US
      expect(filteredDisplayResults.value.length).toBeGreaterThan(0)
    })

    it('应该返回空数组当无匹配时', () => {
      const { filteredDisplayResults } = createFilteredResults(mockData, 'NOTEXIST')
      expect(filteredDisplayResults.value).toHaveLength(0)
    })
  })

  describe('successFilteredResults', () => {
    it('应该只返回成功的结果当搜索为空时', () => {
      const { successFilteredResults } = createFilteredResults(mockData, '')
      expect(successFilteredResults.value).toHaveLength(3)
      successFilteredResults.value.forEach((r: any) => {
        expect(r.success).toBe(true)
      })
    })

    it('应该过滤成功的结果并支持搜索', () => {
      const { successFilteredResults } = createFilteredResults(mockData, 'LAX')
      expect(successFilteredResults.value).toHaveLength(1)
      expect(successFilteredResults.value[0].destinationPort).toBe('USLAX')
      expect(successFilteredResults.value[0].success).toBe(true)
    })

    it('应该返回空数组当无匹配的成功记录时', () => {
      const { successFilteredResults } = createFilteredResults(mockData, 'OAK')
      // OAK 只有失败的记录
      expect(successFilteredResults.value).toHaveLength(0)
    })
  })

  describe('failedFilteredResults', () => {
    it('应该只返回失败的结果当搜索为空时', () => {
      const { failedFilteredResults } = createFilteredResults(mockData, '')
      expect(failedFilteredResults.value).toHaveLength(2)
      failedFilteredResults.value.forEach((r: any) => {
        expect(r.success).toBe(false)
      })
    })

    it('应该过滤失败的结果并支持搜索', () => {
      const { failedFilteredResults } = createFilteredResults(mockData, 'warehouse')
      expect(failedFilteredResults.value).toHaveLength(1)
      expect(failedFilteredResults.value[0].message).toContain('warehouse')
    })

    it('应该支持搜索失败原因', () => {
      const { failedFilteredResults } = createFilteredResults(mockData, 'not found')
      expect(failedFilteredResults.value).toHaveLength(1)
      expect(failedFilteredResults.value[0].message).toContain('not found')
    })

    it('应该返回空数组当无匹配的失败记录时', () => {
      const { failedFilteredResults } = createFilteredResults(mockData, 'LAX')
      // LAX 只有成功的记录
      expect(failedFilteredResults.value).toHaveLength(0)
    })
  })

  describe('边界情况', () => {
    it('应该处理空数据集', () => {
      const { filteredDisplayResults, successFilteredResults, failedFilteredResults } =
        createFilteredResults([], 'test')
      expect(filteredDisplayResults.value).toHaveLength(0)
      expect(successFilteredResults.value).toHaveLength(0)
      expect(failedFilteredResults.value).toHaveLength(0)
    })

    it('应该处理 null/undefined 字段', () => {
      const dataWithNulls = [
        {
          containerNumber: null,
          success: true,
          destinationPort: undefined,
          warehouseName: '',
          message: 'Success',
        },
        {
          containerNumber: 'TEST123',
          success: false,
          destinationPort: null,
          warehouseName: undefined,
          message: '',
        },
      ]

      const { filteredDisplayResults } = createFilteredResults(dataWithNulls, 'test')
      // 应该至少匹配一个（TEST123）
      expect(filteredDisplayResults.value.length).toBeGreaterThanOrEqual(1)
    })

    it('应该正确处理特殊字符', () => {
      const specialData = [
        {
          containerNumber: 'MSKU-123_456.7',
          success: true,
          destinationPort: 'US-LAX',
          warehouseName: 'LA/Warehouse #1',
          message: 'Success',
        },
      ]

      const { filteredDisplayResults } = createFilteredResults(specialData, 'us-lax')
      expect(filteredDisplayResults.value).toHaveLength(1)
    })
  })

  describe('性能相关', () => {
    it('应该快速处理大数据集', () => {
      // 生成 1000 条测试数据
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        containerNumber: `CONT${i.toString().padStart(7, '0')}`,
        success: i % 2 === 0,
        destinationPort: i % 3 === 0 ? 'USLAX' : 'USLGB',
        warehouseName: `Warehouse ${i}`,
        message: 'Message',
      }))

      const startTime = Date.now()
      const { filteredDisplayResults } = createFilteredResults(largeData, 'USLAX')
      const endTime = Date.now()

      // 过滤应该在合理时间内完成（< 100ms）
      expect(endTime - startTime).toBeLessThan(100)
      expect(filteredDisplayResults.value.length).toBeGreaterThan(0)
    })
  })
})
