/**
 * useGanttDragAndUpdate Composable 单元测试
 * 
 * 测试目标：
 * 1. 验证拖拽状态管理正确
 * 2. 验证字段映射表完整
 * 3. 验证辅助函数逻辑正确
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { useGanttDragAndUpdate } from './useGanttDragAndUpdate'
import type { Container } from '@/types/container'

describe('useGanttDragAndUpdate', () => {
  // Mock 依赖
  const mockContainers = ref<Container[]>([])
  const mockLoadData = vi.fn().mockResolvedValue(undefined)
  const mockHideTooltip = vi.fn()
  const mockShowContextMenu = ref(false)
  const mockGroupedByPortNodeSupplier = ref({})

  const options = {
    containers: mockContainers,
    loadData: mockLoadData,
    hideTooltip: mockHideTooltip,
    showContextMenu: mockShowContextMenu,
    groupedByPortNodeSupplier: mockGroupedByPortNodeSupplier,
  }

  let composable: ReturnType<typeof useGanttDragAndUpdate>

  beforeEach(() => {
    vi.clearAllMocks()
    mockContainers.value = []
    mockShowContextMenu.value = false
    
    // 创建 composable 实例
    composable = useGanttDragAndUpdate(options)
  })

  describe('初始化状态', () => {
    it('应该正确初始化拖拽状态为 null', () => {
      expect(composable.draggingContainer.value).toBeNull()
      expect(composable.draggingNodeName.value).toBeNull()
      expect(composable.dragOverDate.value).toBeNull()
      expect(composable.pendingDropConfirm.value).toBeNull()
    })

    it('应该正确初始化指示器位置', () => {
      expect(composable.dropIndicatorPosition.value).toEqual({ x: 0, y: 0 })
      expect(composable.dropIndicatorCellRect.value).toBeNull()
    })
  })

  describe('NODE_TO_FIELD_MAP 字段映射', () => {
    it('应该包含所有节点类型的映射', () => {
      expect(composable.NODE_TO_FIELD_MAP).toHaveProperty('清关')
      expect(composable.NODE_TO_FIELD_MAP).toHaveProperty('查验')
      expect(composable.NODE_TO_FIELD_MAP).toHaveProperty('提柜')
      expect(composable.NODE_TO_FIELD_MAP).toHaveProperty('卸柜')
      expect(composable.NODE_TO_FIELD_MAP).toHaveProperty('还箱')
      expect(composable.NODE_TO_FIELD_MAP).toHaveProperty('未分类')
    })

    it('清关节点应该映射到 plannedCustomsDate', () => {
      expect(composable.NODE_TO_FIELD_MAP['清关']).toEqual({
        field: 'plannedCustomsDate',
        label: '计划清关日',
      })
    })

    it('提柜节点应该映射到 plannedPickupDate', () => {
      expect(composable.NODE_TO_FIELD_MAP['提柜']).toEqual({
        field: 'plannedPickupDate',
        label: '计划提柜日',
      })
    })

    it('卸柜节点应该映射到 plannedUnloadDate', () => {
      expect(composable.NODE_TO_FIELD_MAP['卸柜']).toEqual({
        field: 'plannedUnloadDate',
        label: '计划卸柜日',
      })
    })

    it('还箱节点应该映射到 plannedReturnDate', () => {
      expect(composable.NODE_TO_FIELD_MAP['还箱']).toEqual({
        field: 'plannedReturnDate',
        label: '计划还箱日',
      })
    })
  })

  describe('cleanupDragState', () => {
    it('应该清理所有拖拽状态', () => {
      // 先设置一些状态
      composable.draggingContainer.value = {} as Container
      composable.draggingNodeName.value = '提柜'
      composable.dragOverDate.value = new Date()
      composable.pendingDropConfirm.value = {} as any
      mockShowContextMenu.value = true

      // 执行清理
      composable.cleanupDragState()

      // 验证状态已清理
      expect(composable.draggingContainer.value).toBeNull()
      expect(composable.draggingNodeName.value).toBeNull()
      expect(composable.dragOverDate.value).toBeNull()
      expect(composable.pendingDropConfirm.value).toBeNull()
      expect(mockShowContextMenu.value).toBe(false)
      expect(mockHideTooltip).toHaveBeenCalled()
    })
  })

  describe('handleDragStart', () => {
    it('应该设置拖拽容器和节点名称', () => {
      const mockContainer = { containerNumber: 'TEST123' } as Container
      const mockEvent = {
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
        },
      } as unknown as DragEvent

      composable.handleDragStart(mockContainer, mockEvent, '提柜')

      expect(composable.draggingContainer.value).toStrictEqual(mockContainer)
      expect(composable.draggingNodeName.value).toBe('提柜')
      expect(mockHideTooltip).toHaveBeenCalled()
      expect(mockEvent.dataTransfer?.setData).toHaveBeenCalledWith(
        'text/plain',
        'TEST123'
      )
      expect(mockEvent.dataTransfer?.setData).toHaveBeenCalledWith(
        'application/x-logix-node',
        '提柜'
      )
    })

    it('应该在 nodeName 为空时不设置节点数据', () => {
      const mockContainer = { containerNumber: 'TEST123' } as Container
      const mockEvent = {
        dataTransfer: {
          effectAllowed: '',
          setData: vi.fn(),
        },
      } as unknown as DragEvent

      composable.handleDragStart(mockContainer, mockEvent)

      expect(composable.draggingNodeName.value).toBeNull()
      // 只调用一次（text/plain）
      expect(mockEvent.dataTransfer?.setData).toHaveBeenCalledTimes(1)
    })
  })

  describe('边界情况', () => {
    it('handleDrop 在没有拖拽容器时应该直接返回', () => {
      const mockDate = new Date('2026-04-10')
      
      // 不应该抛出错误
      expect(() => {
        composable.handleDrop(mockDate, '提柜')
      }).not.toThrow()
    })

    it('handleDrop 在没有 dragOverDate 时应该直接返回', () => {
      composable.draggingContainer.value = {} as Container
      
      const mockDate = new Date('2026-04-10')
      
      expect(() => {
        composable.handleDrop(mockDate, '提柜')
      }).not.toThrow()
    })

    it('handleDragEnd 在没有 pending 数据时应该直接返回', async () => {
      // 不应该抛出错误
      await expect(composable.handleDragEnd()).resolves.not.toThrow()
    })
  })
})
