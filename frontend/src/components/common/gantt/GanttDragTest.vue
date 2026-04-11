<template>
  <div class="gantt-drag-test">
    <h2>甘特图拖拽 Composable 测试</h2>
    
    <!-- 状态显示 -->
    <div class="status-panel">
      <h3>当前状态</h3>
      <p>拖拽容器: {{ draggingContainer?.containerNumber || '无' }}</p>
      <p>拖拽节点: {{ draggingNodeName || '无' }}</p>
      <p>悬停日期: {{ dragOverDate ? formatDate(dragOverDate) : '无' }}</p>
      <p>待确认: {{ pendingDropConfirm ? '是' : '否' }}</p>
    </div>

    <!-- 字段映射表 -->
    <div class="field-mapping">
      <h3>NODE_TO_FIELD_MAP</h3>
      <table>
        <thead>
          <tr>
            <th>节点名称</th>
            <th>数据库字段</th>
            <th>显示标签</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(mapping, nodeName) in NODE_TO_FIELD_MAP" :key="nodeName">
            <td>{{ nodeName }}</td>
            <td>{{ mapping.field }}</td>
            <td>{{ mapping.label }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 测试区域 -->
    <div class="test-area">
      <h3>拖拽测试</h3>
      
      <!-- 模拟货柜列表 -->
      <div class="container-list">
        <div
          v-for="container in testContainers"
          :key="container.containerNumber"
          class="container-item"
          draggable="true"
          @dragstart="handleDragStart(container, $event, '提柜')"
          @dragend="handleDragEnd"
        >
          {{ container.containerNumber }}
        </div>
      </div>

      <!-- 模拟日期格子 -->
      <div class="date-cells">
        <div
          v-for="date in testDates"
          :key="date.toISOString()"
          class="date-cell"
          @dragover.prevent
          @drop.stop="handleDrop(date, '提柜')"
        >
          {{ formatDate(date) }}
        </div>
      </div>

      <!-- 放置指示器 -->
      <div
        v-if="dragOverDate"
        class="drop-indicator"
        :style="{
          left: dropIndicatorPosition.x + 'px',
          top: dropIndicatorPosition.y + 'px',
        }"
      >
        ↓ 放置位置
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="actions">
      <button @click="cleanupDragState">清理状态</button>
      <button @click="addTestContainer">添加测试货柜</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Container } from '@/types/container'
import { useGanttDragAndUpdate } from './useGanttDragAndUpdate'
import dayjs from 'dayjs'

// 测试数据
const testContainers = ref<Container[]>([
  {
    id: '1',
    containerNumber: 'TEST001',
    orderNumber: 'ORD001',
    containerTypeCode: '40HQ',
    destinationPort: 'USLAX',
  } as Container,
  {
    id: '2',
    containerNumber: 'TEST002',
    orderNumber: 'ORD002',
    containerTypeCode: '40HQ',
    destinationPort: 'USLAX',
  } as Container,
])

const testDates = ref([
  new Date('2026-04-10'),
  new Date('2026-04-11'),
  new Date('2026-04-12'),
  new Date('2026-04-13'),
  new Date('2026-04-14'),
])

// 初始化 composable
const {
  draggingContainer,
  draggingNodeName,
  dragOverDate,
  dropIndicatorPosition,
  pendingDropConfirm,
  NODE_TO_FIELD_MAP,
  handleDragStart,
  handleDragEnd,
  handleDrop,
  cleanupDragState,
} = useGanttDragAndUpdate({
  containers: testContainers,
  loadData: async () => {
    console.log('[测试] 重新加载数据')
  },
  hideTooltip: () => {
    console.log('[测试] 隐藏 Tooltip')
  },
  showContextMenu: ref(false),
  groupedByPortNodeSupplier: ref({}),
})

// 辅助函数
const formatDate = (date: Date) => {
  return dayjs(date).format('MM-DD')
}

const addTestContainer = () => {
  const newNum = `TEST${String(testContainers.value.length + 1).padStart(3, '0')}`
  testContainers.value.push({
    id: String(testContainers.value.length + 1),
    containerNumber: newNum,
    orderNumber: `ORD${String(testContainers.value.length + 1).padStart(3, '0')}`,
    containerTypeCode: '40HQ',
    destinationPort: 'USLAX',
  } as Container)
}
</script>

<style scoped>
.gantt-drag-test {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.status-panel {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.field-mapping {
  margin-bottom: 20px;
}

.field-mapping table {
  width: 100%;
  border-collapse: collapse;
}

.field-mapping th,
.field-mapping td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.field-mapping th {
  background: #f0f0f0;
}

.test-area {
  margin-bottom: 20px;
}

.container-list {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.container-item {
  padding: 10px 15px;
  background: #409eff;
  color: white;
  border-radius: 4px;
  cursor: move;
  user-select: none;
}

.container-item:hover {
  background: #66b1ff;
}

.date-cells {
  display: flex;
  gap: 5px;
}

.date-cell {
  width: 80px;
  height: 60px;
  border: 2px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.date-cell:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.drop-indicator {
  position: absolute;
  padding: 5px 10px;
  background: #67c23a;
  color: white;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
}

.actions {
  display: flex;
  gap: 10px;
}

.actions button {
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.actions button:hover {
  background: #66b1ff;
}
</style>
