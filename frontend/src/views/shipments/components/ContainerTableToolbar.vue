<template>
  <div class="table-toolbar">
    <el-radio-group :model-value="tableSize" size="small" @update:model-value="$emit('update:tableSize', $event)">
      <el-radio-button value="small">紧凑</el-radio-button>
      <el-radio-button value="default">默认</el-radio-button>
      <el-radio-button value="large">宽松</el-radio-button>
    </el-radio-group>
    <span class="toolbar-label">{{ t('container.logisticsStatus') }}：</span>
    <el-select
      :model-value="quickStatusFilter"
      multiple
      collapse-tags
      collapse-tags-tooltip
      :placeholder="t('common.all')"
      clearable
      size="small"
      style="width: 220px; margin-right: 12px"
      @update:model-value="$emit('update:quickStatusFilter', $event)"
    >
      <el-option
        :label="t('container.status.notShipped')"
        :value="SimplifiedStatus.NOT_SHIPPED"
      />
      <el-option :label="t('container.status.shipped')" :value="SimplifiedStatus.SHIPPED" />
      <el-option :label="t('container.status.inTransit')" :value="SimplifiedStatus.IN_TRANSIT" />
      <el-option :label="t('container.status.arrivedAtTransit')" :value="'arrived_at_transit'" />
      <el-option :label="t('container.status.atPort')" :value="'arrived_at_destination'" />
      <el-option :label="t('container.status.pickedUp')" :value="SimplifiedStatus.PICKED_UP" />
      <el-option :label="t('container.status.unloaded')" :value="SimplifiedStatus.UNLOADED" />
      <el-option
        :label="t('container.status.returnedEmpty')"
        :value="SimplifiedStatus.RETURNED_EMPTY"
      />
    </el-select>
    <el-checkbox
      :model-value="alertFilter"
      size="small"
      style="margin-right: 12px"
      @update:model-value="$emit('update:alertFilter', $event)"
    >
      <el-icon><Warning /></el-icon>
      预警数量 > 0
    </el-checkbox>
    <el-button type="default" plain @click="$emit('openColumnSetting')">
      <el-icon><Setting /></el-icon>
      列设置
    </el-button>
    <el-button
      type="success"
      plain
      :disabled="selectedRowsCount === 0"
      @click="$emit('batchExport')"
    >
      <el-icon><Download /></el-icon>
      批量{{ t('common.export') }}
    </el-button>
    <el-button type="success" @click="$emit('goGanttChart')">
      <el-icon><Calendar /></el-icon>
      甘特图
    </el-button>
    <el-button
      type="primary"
      plain
      :loading="batchScheduleLoading"
      @click="$emit('batchSchedule')"
    >
      <el-icon><Edit /></el-icon>
      一键排产
    </el-button>
    <el-button
      type="info"
      plain
      :loading="demurrageWriteBackLoading"
      @click="$emit('demurrageWriteBack')"
    >
      <el-icon><Calendar /></el-icon>
      免费日更新
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Warning, Setting, Download, Calendar, Edit } from '@element-plus/icons-vue'
import { SimplifiedStatus } from '@/utils/logisticsStatusMachine'

const { t } = useI18n()

defineProps<{
  tableSize: 'small' | 'default' | 'large'
  quickStatusFilter: string[]
  alertFilter: boolean
  selectedRowsCount: number
  batchScheduleLoading: boolean
  demurrageWriteBackLoading: boolean
}>()

defineEmits<{
  'update:tableSize': [value: 'small' | 'default' | 'large']
  'update:quickStatusFilter': [value: string[]]
  'update:alertFilter': [value: boolean]
  openColumnSetting: []
  batchExport: []
  goGanttChart: []
  batchSchedule: []
  demurrageWriteBack: []
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.table-toolbar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  flex-wrap: wrap;
}

.toolbar-label {
  font-size: $font-size-sm;
  color: var(--el-text-color-regular);
  margin-left: $spacing-sm;
}
</style>
