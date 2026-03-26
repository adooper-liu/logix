<template>
  <div class="top-action-bar">
    <!-- ① 左侧：核心过滤条件 -->
    <div class="filter-group">
      <div class="filter-item">
        <span class="filter-label">日期范围：</span>
        <DateRangePicker v-model="dateRange" />
      </div>
      <div class="filter-item">
        <span class="filter-label">目的港：</span>
        <el-select
          v-model="selectedPortCode"
          placeholder="所有港口"
          clearable
          filterable
          class="port-select"
          @change="handlePortChange"
        >
          <el-option
            v-for="port in ports"
            :key="port.port_code"
            :label="`${port.port_code} - ${port.port_name} (${port.count})`"
            :value="port.port_code"
          />
        </el-select>
      </div>
    </div>

    <!-- ② 中间：高级设置 -->
    <div class="advanced-group">
      <el-tooltip content="排产时自动在 ETA 基础上顺延的天数" placement="bottom">
        <div class="advanced-setting">
          <span class="filter-label">ETA 顺延：</span>
          <el-input-number
            v-model="etaBufferDays"
            :min="0"
            :max="7"
            :step="1"
            placeholder="0-7 天"
            controls-position="right"
            size="small"
            style="width: 100px"
          />
          <span class="unit-label">天</span>
        </div>
      </el-tooltip>
      <el-button type="info" size="small" @click="$emit('show-logic')" title="查看智能排产逻辑">
        <el-icon><InfoFilled /></el-icon>
        逻辑
      </el-button>
    </div>

    <!-- ③ 右侧：操作按钮组 -->
    <div class="action-group">
      <el-button
        type="primary"
        :loading="loading"
        @click="$emit('preview')"
        size="default"
        title="预览排产方案，确认后保存"
      >
        <el-icon><Cpu /></el-icon>
        预览排产
      </el-button>
      <el-button
        type="warning"
        plain
        @click="$emit('designate')"
        :disabled="disabled"
        title="手工指定仓库进行排产"
        size="default"
      >
        <el-icon><Setting /></el-icon>
        手工指定
      </el-button>
      <el-button type="default" @click="$emit('back')" size="default">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <el-button type="success" plain @click="$emit('refresh')" size="default" title="刷新统计数据">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import { ArrowLeft, Cpu, InfoFilled, Refresh, Setting } from '@element-plus/icons-vue'

interface Port {
  port_code: string
  port_name: string
  count: number
}

defineProps<{
  dateRange: [Date, Date]
  selectedPortCode: string
  etaBufferDays: number
  ports: Port[]
  loading: boolean
  disabled: boolean
}>()

defineEmits<{
  'show-logic': []
  preview: []
  designate: []
  back: []
  refresh: []
  'port-change': [portCode: string | null]
}>()

const handlePortChange = (portCode: string | null) => {
  defineEmits<{
    'port-change': [portCode: string | null]
  }>()
}
</script>

<style lang="scss" scoped>
.top-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 400px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
  min-width: 60px;
}

.port-select {
  width: 220px;
}

.advanced-group {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-left: 1px solid #e4e7ed;
  border-right: 1px solid #e4e7ed;
}

.advanced-setting {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit-label {
  font-size: 13px;
  color: #909399;
  margin-left: 4px;
}

.action-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

@media (max-width: 1400px) {
  .top-action-bar {
    flex-wrap: wrap;
  }

  .filter-group {
    min-width: 100%;
  }

  .advanced-group {
    width: 100%;
    justify-content: center;
    padding: 12px 0;
    border: none;
    border-top: 1px solid #e4e7ed;
  }

  .action-group {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .top-action-bar {
    padding: 12px 16px;
  }

  .filter-item {
    flex-wrap: wrap;
  }

  .filter-label {
    min-width: 100%;
  }
}
</style>
