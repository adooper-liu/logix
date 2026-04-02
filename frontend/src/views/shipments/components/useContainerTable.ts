/**
 * ContainerTable 组合式函数
 * Composable function for ContainerTable logic
 * 
 * 职责：
 * 1. 列显示/隐藏管理
 * 2. 列顺序调整（拖拽）
 * 3. 本地存储持久化
 */

import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import type {
  ColumnKey,
  ColumnVisibleConfig,
  ContainerTableProps
} from './types'
import {
  DEFAULT_COLUMN_ORDER,
  DEFAULT_COLUMN_VISIBLE
} from './types'

const STORAGE_KEY_VISIBLE = 'shipments_table_column_visible'
const STORAGE_KEY_ORDER = 'shipments_table_column_order'

export interface UseContainerTableReturn {
  /** 可见列配置 */
  columnVisible: Ref<ColumnVisibleConfig>
  
  /** 列顺序 */
  columnOrder: Ref<ColumnKey[]>
  
  /** 列设置抽屉开关状态 */
  columnSettingOpen: Ref<boolean>
  
  /** 拖拽相关 */
  draggedColumn: Ref<ColumnKey | null>
  
  /** 切换列显示/隐藏 */
  toggleColumnVisible: (key: ColumnKey) => void
  
  /** 重置列显示配置 */
  resetColumnVisible: () => void
  
  /** 保存列显示配置 */
  saveColumnVisible: () => void
  
  /** 处理拖拽开始 */
  handleDragStart: (event: DragEvent, key: ColumnKey) => void
  
  /** 处理拖拽经过 */
  handleDragOver: (event: DragEvent) => void
  
  /** 处理放置 */
  handleDrop: (event: DragEvent, targetKey: ColumnKey) => void
  
  /** 处理拖拽结束 */
  handleDragEnd: () => void
}

/**
 * ContainerTable 组合式函数
 * 
 * @param props - 组件 Props
 * @returns 表格逻辑相关状态和方法
 */
export function useContainerTable(
  props: ContainerTableProps
): UseContainerTableReturn {
  // 列显示配置
  const columnVisible = ref<ColumnVisibleConfig>({
    ...DEFAULT_COLUMN_VISIBLE,
    ...(props.columnVisible || {})
  })

  // 列顺序
  const columnOrder = ref<ColumnKey[]>([
    ...(props.columnOrder || DEFAULT_COLUMN_ORDER)
  ])

  // 列设置抽屉
  const columnSettingOpen = ref(false)

  // 拖拽中的列
  const draggedColumn = ref<ColumnKey | null>(null)

  /**
   * 从 localStorage 加载配置
   */
  function loadFromStorage() {
    try {
      // 加载可见性配置
      const visibleStr = localStorage.getItem(STORAGE_KEY_VISIBLE)
      if (visibleStr) {
        const saved = JSON.parse(visibleStr)
        columnVisible.value = {
          ...DEFAULT_COLUMN_VISIBLE,
          ...saved
        }
      }

      // 加载顺序配置
      const orderStr = localStorage.getItem(STORAGE_KEY_ORDER)
      if (orderStr) {
        const saved = JSON.parse(orderStr) as ColumnKey[]
        // 验证顺序是否完整
        const allKeys = new Set(saved)
        const hasAll = DEFAULT_COLUMN_ORDER.every(key => allKeys.has(key))
        if (hasAll) {
          columnOrder.value = saved
        }
      }
    } catch (error) {
      console.error('Failed to load column config from localStorage:', error)
    }
  }

  /**
   * 保存到 localStorage
   */
  function saveToStorage() {
    try {
      localStorage.setItem(
        STORAGE_KEY_VISIBLE,
        JSON.stringify(columnVisible.value)
      )
      localStorage.setItem(
        STORAGE_KEY_ORDER,
        JSON.stringify(columnOrder.value)
      )
    } catch (error) {
      console.error('Failed to save column config to localStorage:', error)
    }
  }

  /**
   * 切换列显示/隐藏
   */
  function toggleColumnVisible(key: ColumnKey) {
    columnVisible.value[key] = !columnVisible.value[key]
  }

  /**
   * 重置列显示配置
   */
  function resetColumnVisible() {
    columnVisible.value = { ...DEFAULT_COLUMN_VISIBLE }
  }

  /**
   * 保存列显示配置
   */
  function saveColumnVisible() {
    saveToStorage()
    columnSettingOpen.value = false
  }

  /**
   * 处理拖拽开始
   */
  function handleDragStart(event: DragEvent, key: ColumnKey) {
    draggedColumn.value = key
    event.dataTransfer?.setData('text/plain', key)
    event.dataTransfer!.effectAllowed = 'move'
  }

  /**
   * 处理拖拽经过
   */
  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
  }

  /**
   * 处理放置
   */
  function handleDrop(event: DragEvent, targetKey: ColumnKey) {
    event.preventDefault()
    
    const sourceKey = draggedColumn.value
    if (!sourceKey || sourceKey === targetKey) {
      return
    }

    const currentIndex = columnOrder.value.indexOf(sourceKey)
    const targetIndex = columnOrder.value.indexOf(targetKey)

    if (currentIndex === -1 || targetIndex === -1) {
      return
    }

    // 移动列顺序
    const newOrder = [...columnOrder.value]
    newOrder.splice(currentIndex, 1)
    newOrder.splice(targetIndex, 0, sourceKey)
    
    columnOrder.value = newOrder
    draggedColumn.value = null
  }

  /**
   * 处理拖拽结束
   */
  function handleDragEnd() {
    draggedColumn.value = null
  }

  // 监听 Props 变化，同步更新
  watch(
    () => props.columnVisible,
    (newVal) => {
      if (newVal) {
        columnVisible.value = {
          ...DEFAULT_COLUMN_VISIBLE,
          ...newVal
        }
      }
    },
    { deep: true }
  )

  watch(
    () => props.columnOrder,
    (newVal) => {
      if (newVal && newVal.length > 0) {
        columnOrder.value = [...newVal]
      }
    },
    { deep: true }
  )

  // 初始化时加载配置
  loadFromStorage()

  return {
    columnVisible,
    columnOrder,
    columnSettingOpen,
    draggedColumn,
    toggleColumnVisible,
    resetColumnVisible,
    saveColumnVisible,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd
  }
}
