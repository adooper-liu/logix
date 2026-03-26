<template>
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
</template>

<script setup lang="ts">
import { Clock, DocumentAdd, Edit, House } from '@element-plus/icons-vue'

defineProps<{
  pendingCount: number
  initialCount: number
  issuedCount: number
  warehouseCount: number
}>()
</script>

<style lang="scss" scoped>
.stat-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
}

.stat-icon {
  width: 40px;
  height: 40px;
  font-size: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  &.pending {
    background: linear-gradient(135deg, #909399 0%, #a6a9b0 100%);
  }

  &.initial {
    background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  }

  &.issued {
    background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  }

  &.warehouse {
    background: linear-gradient(135deg, #e6a23c 0%, #ebb563 100%);
  }
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-left: auto;
}
</style>
