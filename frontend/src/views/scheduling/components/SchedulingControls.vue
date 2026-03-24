<template>
  <div class="scheduling-controls">
    <!-- 紧凑顶部栏 -->
    <div class="top-bar">
      <span class="filter-label">日期：</span>
      <DateRangePicker v-model="dateRange" />
      <el-button type="primary" link @click="emit('refresh')">刷新</el-button>
      <el-button type="info" size="small" @click="emit('show-logic')">
        <el-icon><InfoFilled /></el-icon>
        逻辑
      </el-button>
      <el-button type="primary" :loading="loading" @click="emit('schedule')">
        <el-icon><Cpu /></el-icon>
        开始排产
      </el-button>
      <el-button type="default" @click="emit('go-back')">
        <el-icon><ArrowLeft /></el-icon>
        返回货柜管理
      </el-button>
    </div>

    <!-- 紧凑统计栏 -->
    <div class="stat-bar">
      <div class="stat-item">
        <el-icon class="stat-icon pending"><Clock /></el-icon>
        <span class="stat-value">{{ pendingCount }}</span>
        <span class="stat-label">待排产</span>
      </div>
      <div class="stat-item">
        <el-icon class="stat-icon initial"><DocumentAdd /></el-icon>
        <span class="stat-value">{{ initialCount }}</span>
        <span class="stat-label">initial</span>
      </div>
      <div class="stat-item">
        <el-icon class="stat-icon issued"><Edit /></el-icon>
        <span class="stat-value">{{ issuedCount }}</span>
        <span class="stat-label">issued</span>
      </div>
      <div class="stat-item">
        <el-icon class="stat-icon warehouse"><House /></el-icon>
        <span class="stat-value">{{ warehouseCount }}</span>
        <span class="stat-label">仓库</span>
      </div>
    </div>

    <!-- 紧凑流程图 -->
    <div class="flow-bar">
      <div class="flow-step" :class="{ active: currentStep >= 1 }">
        <span class="step-num">1</span>
        <span class="step-text">查询</span>
      </div>
      <span class="flow-arrow">→</span>
      <div class="flow-step" :class="{ active: currentStep >= 2 }">
        <span class="step-num">2</span>
        <span class="step-text">排序</span>
      </div>
      <span class="flow-arrow">→</span>
      <div class="flow-step" :class="{ active: currentStep >= 3 }">
        <span class="step-num">3</span>
        <span class="step-text">计划日</span>
      </div>
      <span class="flow-arrow">→</span>
      <div class="flow-step" :class="{ active: currentStep >= 4 }">
        <span class="step-num">4</span>
        <span class="step-text">资源</span>
      </div>
      <span class="flow-arrow">→</span>
      <div class="flow-step" :class="{ active: currentStep >= 5 }">
        <span class="step-num">5</span>
        <span class="step-text">写回</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { InfoFilled, Cpu, ArrowLeft, Clock, DocumentAdd, Edit, House } from '@element-plus/icons-vue'
import DateRangePicker from '@/components/DateRangePicker.vue'

// Props
const props = defineProps<{
  loading?: boolean
  currentStep?: number
  overview: {
    pendingCount?: number
    initialCount?: number
    issuedCount?: number
    warehouses?: any[]
  }
}>()

// Emits
const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'schedule'): void
  (e: 'show-logic'): void
  (e: 'go-back'): void
  (e: 'update:dateRange', value: [Date, Date]): void
}>()

// 日期范围
const dateRange = computed({
  get: () => [new Date(), new Date()] as [Date, Date],
  set: (value: [Date, Date]) => emit('update:dateRange', value)
})

// 计算属性
const pendingCount = computed(() => props.overview?.pendingCount || 0)
const initialCount = computed(() => props.overview?.initialCount || 0)
const issuedCount = computed(() => props.overview?.issuedCount || 0)
const warehouseCount = computed(() => props.overview?.warehouses?.length || 0)
</script>

<style scoped>
.scheduling-controls {
  margin-bottom: 12px;
}

/* 紧凑顶部栏 */
.top-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
}

.filter-label {
  margin-right: 4px;
  color: #606266;
  font-size: 13px;
}

/* 紧凑统计栏 */
.stat-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.stat-item .stat-icon {
  font-size: 18px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-item .stat-icon.pending { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-item .stat-icon.initial { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-item .stat-icon.issued { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.stat-item .stat-icon.warehouse { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

.stat-item .stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.stat-item .stat-label {
  font-size: 12px;
  color: #909399;
}

/* 紧凑流程条 */
.flow-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px;
  background: #fff;
  border-radius: 4px;
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  background: #f5f7fa;
  color: #909399;
}

.flow-step.active {
  background: #409eff;
  color: #fff;
}

.step-num {
  font-weight: 600;
}

.step-text {
  font-size: 12px;
}

.flow-arrow {
  color: #c0c4cc;
}
</style>
