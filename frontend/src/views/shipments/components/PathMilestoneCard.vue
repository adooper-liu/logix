<template>
  <div
    class="stage-node"
    :class="{
      'stage-node-no-data': isNoDataNode,
      'stage-node-alert': node.isAlert,
      'stage-node-rail': isRailNode,
      'stage-node-feeder': isFeederNode,
    }"
  >
    <span class="stage-node-icon">{{ statusIcon }}</span>
    <div class="stage-node-body">
      <div class="stage-node-desc-row">
        <span class="stage-node-desc">
          {{ (node.rawData as any)?.eventCode || '' }}
          {{ node.description }}
        </span>
        <span v-if="node.isAlert" class="alert-badge">异常</span>
        <el-tag v-if="isEstimatedNode" size="small" type="warning" class="estimated-tag">
          预计
        </el-tag>
      </div>
      <div class="stage-node-meta">
        <span class="stage-node-time">{{
          isNoDataNode ? '—' : formatDateTime(node.timestamp)
        }}</span>
        <span v-if="node.location" class="stage-node-loc"
          >{{ node.location.name }} ({{ node.location.code }})</span
        >
      </div>
      <el-tag v-if="dataSource" :type="dataSourceTagType" size="small" class="stage-ds-tag">
        {{ dataSourceLabel }}
      </el-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StatusNode } from '@/services/logisticsPath'
import { computed } from 'vue'

const props = defineProps<{
  node: StatusNode
}>()

const STATUS_ICONS: Record<string, string> = {
  NOT_SHIPPED: '📦',
  EMPTY_PICKED_UP: '🚚',
  CONTAINER_STUFFED: '📦',
  GATE_IN: '🚪',
  LOADED: '⛴️',
  DEPARTED: '🛳️',
  SAILING: '🌊',
  TRANSIT_ARRIVED: '📍',
  TRANSIT_BERTHED: '⚓',
  TRANSIT_DISCHARGED: '📤',
  TRANSIT_LOADED: '📥',
  TRANSIT_DEPARTED: '🚀',
  ARRIVED: '🏁',
  BERTHED: '⚓',
  DISCHARGED: '📤',
  AVAILABLE: '✅',
  IN_TRANSIT_TO_DEST: '🚛',
  GATE_OUT: '🚛',
  DELIVERY_ARRIVED: '🏠',
  STRIPPED: '📋',
  RETURNED_EMPTY: '↩️',
  COMPLETED: '✨',
  CUSTOMS_HOLD: '⚠️',
  CARRIER_HOLD: '🔒',
  TERMINAL_HOLD: '🚧',
  CHARGES_HOLD: '💰',
  DUMPED: '🗑️',
  DELAYED: '⏰',
  DETENTION: '📅',
  OVERDUE: '🚨',
  CONGESTION: '🚦',
  HOLD: '⛔',
  UNKNOWN: '❓',
}

const isNoDataNode = computed(() => {
  return !!(props.node.rawData as { noData?: boolean })?.noData
})

const isEstimatedNode = computed(() => {
  return !!(props.node.rawData as { isEstimated?: boolean })?.isEstimated
})

const isRailNode = computed(() => {
  return ['RAIL_LOADED', 'RAIL_DEPARTED', 'RAIL_ARRIVED', 'RAIL_DISCHARGED'].includes(
    props.node.status
  )
})

const isFeederNode = computed(() => {
  return ['FEEDER_LOADED', 'FEEDER_DEPARTED', 'FEEDER_ARRIVED', 'FEEDER_DISCHARGED'].includes(
    props.node.status
  )
})

const statusIcon = computed(() => {
  return STATUS_ICONS[props.node.status] || '📍'
})

const dataSource = computed(() => {
  if (!props.node?.rawData) return null
  const ds = (props.node.rawData as { dataSource?: string })?.dataSource
  return ds && String(ds).trim() ? String(ds).trim() : null
})

const dataSourceLabel = computed(() => {
  if (!dataSource.value) return ''
  const LABELS: Record<string, string> = {
    FeituoAPI: '飞驼API',
    Feituo: 'Excel导入',
    ProcessTable: '业务系统',
  }
  return LABELS[dataSource.value] ?? dataSource.value
})

const dataSourceTagType = computed(() => {
  if (dataSource.value === 'FeituoAPI') return 'primary'
  if (dataSource.value === 'Feituo') return 'success'
  return 'info'
})

const formatDateTime = (date: string | Date): string => {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.stage-node {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-base;
  cursor: pointer;
  font-size: $font-size-sm;
  transition: $transition-base;
  border-left: 3px solid transparent;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &:active {
    background: var(--el-fill-color);
  }

  &.stage-node-alert {
    border-left-color: var(--el-color-danger);
    background: rgba($danger-color, 0.04);
  }

  &.stage-node-rail {
    border-left-color: var(--el-color-info);
    background: rgba($info-color, 0.08);

    .stage-node-icon::before {
      content: '🚂';
    }
  }

  &.stage-node-feeder {
    border-left-color: var(--el-color-success);
    background: rgba($success-color, 0.08);

    .stage-node-icon::before {
      content: '⛴️';
    }
  }
}

.stage-node-icon {
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1.2;
}

.stage-node-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stage-node-desc-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.stage-node-desc {
  color: var(--el-text-color-primary);
  font-weight: 500;
  word-break: break-word;
  line-height: 1.4;
}

.stage-node-meta {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  font-size: $font-size-xs;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.stage-node-time {
  color: var(--el-text-color-placeholder);
}

.stage-node-loc {
  color: var(--el-text-color-secondary);
}

.estimated-tag {
  margin-left: 4px;
}

.stage-ds-tag {
  margin-top: 2px;
  align-self: flex-start;
}

.alert-badge {
  background: var(--el-color-danger);
  color: white;
  padding: 2px 6px;
  border-radius: $radius-base;
  font-size: 11px;
  font-weight: 600;
}

.stage-node-no-data .stage-node-desc {
  color: var(--el-text-color-placeholder);
  font-style: italic;
}
</style>
