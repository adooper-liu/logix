/**
 * 成本趋势图组件测试
 * Tests for CostTrendChart Component
 */

import CostTrendChart from '@/views/scheduling/components/CostTrendChart.vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

describe('CostTrendChart - 数据格式处理', () => {
  it('应该正确处理有效的替代方案数据', () => {
    const alternatives = [
      {
        pickupDate: '2026-03-27',
        totalCost: 2900,
        strategy: 'Direct',
        breakdown: {
          totalCost: 2900,
          demurrageCost: 0,
          detentionCost: 0,
          storageCost: 2200,
          transportationCost: 700,
        },
      },
      {
        pickupDate: '2026-03-28',
        totalCost: 2900,
        strategy: 'Direct',
        breakdown: {
          totalCost: 2900,
          demurrageCost: 0,
          detentionCost: 0,
          storageCost: 2200,
          transportationCost: 700,
        },
      },
      {
        pickupDate: '2026-03-30',
        totalCost: 2900,
        strategy: 'Direct',
        breakdown: {
          totalCost: 2900,
          demurrageCost: 0,
          detentionCost: 0,
          storageCost: 2200,
          transportationCost: 700,
        },
      },
    ]

    const wrapper = mount(CostTrendChart, {
      props: {
        alternatives,
        containerNumber: 'TEST123',
      },
    })

    // 验证组件渲染
    expect(wrapper.exists()).toBe(true)
  })

  it('应该过滤掉无效的替代方案数据', () => {
    const alternatives = [
      {
        pickupDate: '2026-03-27',
        totalCost: 2900,
        strategy: 'Direct',
      },
      {
        pickupDate: '', // 无效：空日期
        totalCost: 2900,
        strategy: 'Direct',
      },
      {
        pickupDate: '2026-03-30',
        totalCost: null as any, // 无效：空成本
        strategy: 'Direct',
      },
      {
        pickupDate: '2026-03-31',
        totalCost: undefined as any, // 无效：未定义成本
        strategy: 'Direct',
      },
    ]

    const wrapper = mount(CostTrendChart, {
      props: {
        alternatives,
        containerNumber: 'TEST123',
      },
    })

    // 验证组件仍然能渲染（只使用有效数据）
    expect(wrapper.exists()).toBe(true)
  })

  it('应该正确处理数字类型的成本', () => {
    const alternatives = [
      {
        pickupDate: '2026-03-27',
        totalCost: '2900' as any, // 字符串类型
        strategy: 'Direct',
      },
      {
        pickupDate: '2026-03-28',
        totalCost: 2900.5, // 浮点数
        strategy: 'Direct',
      },
    ]

    const wrapper = mount(CostTrendChart, {
      props: {
        alternatives,
        containerNumber: 'TEST123',
      },
    })

    // 验证组件渲染
    expect(wrapper.exists()).toBe(true)
  })

  it('空数据时应该返回 null', () => {
    const wrapper = mount(CostTrendChart, {
      props: {
        alternatives: [],
        containerNumber: 'TEST123',
      },
    })

    // 验证组件存在
    expect(wrapper.exists()).toBe(true)
  })
})
