/**
 * useGanttDragAndUpdate Composable 使用示例
 * 
 * 此文件展示如何在 Vue 组件中使用新的拖拽 composable
 * 用于验证新 composable 的 API 设计和功能完整性
 */

import { ref } from 'vue'
import type { Container } from '@/types/container'
import { useGanttDragAndUpdate } from './useGanttDragAndUpdate'

/**
 * 示例 1: 基础用法
 * 展示如何初始化和使用拖拽 composable
 */
export function useDragExample() {
  // 1. 准备依赖数据
  const containers = ref<Container[]>([])
  const loadData = async () => {
    console.log('重新加载数据...')
  }
  const hideTooltip = () => {
    console.log('隐藏 Tooltip')
  }
  const showContextMenu = ref(false)
  const groupedByPortNodeSupplier = ref({})

  // 2. 初始化 composable
  const {
    draggingContainer,
    draggingNodeName,
    dragOverDate,
    dropIndicatorPosition,
    dropIndicatorCellRect,
    pendingDropConfirm,
    NODE_TO_FIELD_MAP,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    cleanupDragState,
    executeUpdateWithData,
  } = useGanttDragAndUpdate({
    containers,
    loadData,
    hideTooltip,
    showContextMenu,
    groupedByPortNodeSupplier,
  })

  // 3. 在模板中使用
  return {
    // 状态
    draggingContainer,
    draggingNodeName,
    dragOverDate,
    dropIndicatorPosition,
    dropIndicatorCellRect,
    pendingDropConfirm,
    NODE_TO_FIELD_MAP,

    // 方法
    handleDragStart,
    handleDragEnd,
    handleDrop,
    cleanupDragState,
    executeUpdateWithData,
  }
}

/**
 * 示例 2: 完整集成（带快速更新）
 * 展示如何与现有的快速更新功能集成
 */
export function useDragWithQuickUpdate() {
  const containers = ref<Container[]>([])
  
  const loadData = async () => {
    // 实际的数据加载逻辑
    console.log('加载货柜数据...')
  }

  const executeQuickUpdate = async (
    container: Container,
    updateData: Record<string, string>
  ) => {
    console.log('快速更新:', container.containerNumber, updateData)
    // 实际的 API 调用
  }

  const {
    draggingContainer,
    handleDragStart,
    handleDragEnd,
    handleDrop,
  } = useGanttDragAndUpdate({
    containers,
    loadData,
    executeQuickUpdate, // 传入快速更新函数
    hideTooltip: () => {},
    showContextMenu: ref(false),
    groupedByPortNodeSupplier: ref({}),
  })

  return {
    draggingContainer,
    handleDragStart,
    handleDragEnd,
    handleDrop,
  }
}

/**
 * 示例 3: 在模板中的使用方式
 * 
 * ```vue
 * <template>
 *   <!-- 拖拽目标区域 -->
 *   <div
 *     v-for="date in dateRange"
 *     :key="date"
 *     @dragover.prevent="handleDragOver($event)"
 *     @drop.stop="handleDrop(date, '提柜')"
 *   >
 *     <!-- 货柜节点 -->
 *     <div
 *       v-for="container in containers"
 *       :key="container.containerNumber"
 *       draggable="true"
 *       @dragstart="handleDragStart(container, $event, '提柜')"
 *       @dragend="handleDragEnd"
 *       :class="{ dragging: draggingContainer?.containerNumber === container.containerNumber }"
 *     >
 *       {{ container.containerNumber }}
 *     </div>
 *   </div>
 *   
 *   <!-- 放置指示器 -->
 *   <div
 *     v-if="dragOverDate"
 *     :style="{
 *       left: dropIndicatorPosition.x + 'px',
 *       top: dropIndicatorPosition.y + 'px',
 *     }"
 *     class="drop-indicator"
 *   />
 * </template>
 * 
 * <script setup lang="ts">
 * import { useDragExample } from './useGanttDragAndUpdate.example'
 * 
 * const {
 *   draggingContainer,
 *   dragOverDate,
 *   dropIndicatorPosition,
 *   handleDragStart,
 *   handleDragEnd,
 *   handleDrop,
 * } = useDragExample()
 * 
 * const handleDragOver = (event: DragEvent) => {
 *   // 处理拖拽悬停
 * }
 * </script>
 * ```
 */

/**
 * 示例 4: 字段映射表的使用
 * 展示如何使用 NODE_TO_FIELD_MAP 进行节点到字段的转换
 */
export function useFieldMapping() {
  const { NODE_TO_FIELD_MAP } = useGanttDragAndUpdate({
    containers: ref([]),
    loadData: async () => {},
  })

  // 获取节点对应的数据库字段
  const getFieldForNode = (nodeName: string): string | undefined => {
    return NODE_TO_FIELD_MAP[nodeName]?.field
  }

  // 获取节点的显示标签
  const getLabelForNode = (nodeName: string): string | undefined => {
    return NODE_TO_FIELD_MAP[nodeName]?.label
  }

  return {
    NODE_TO_FIELD_MAP,
    getFieldForNode,
    getLabelForNode,
  }
}

// 导出所有示例供参考
export default {
  useDragExample,
  useDragWithQuickUpdate,
  useFieldMapping,
}
