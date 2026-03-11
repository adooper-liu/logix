<script setup lang="ts">
import { computed } from 'vue'

interface PortOperation {
  id?: string
  portType?: 'origin' | 'transit' | 'destination'
  portName?: string
  portCode?: string
  portSequence?: number
  etaDestPort?: Date | string
  etaCorrection?: Date | string
  ataDestPort?: Date | string
  transitArrivalDate?: Date | string
  destPortUnloadDate?: Date | string
  customsStatus?: string
  isfStatus?: string
  lastFreeDate?: Date | string
  customsBrokerCode?: string
  customsBroker?: string
  gateInTerminal?: string
  terminal?: string
  gateInTime?: Date | string
  gateOutTime?: Date | string
  remarks?: string
}

interface Props {
  portOperations?: PortOperation[]
}

const props = defineProps<Props>()

// 港口类型配置
const portTypeConfig: Record<string, { label: string; icon: string; color: string }> = {
  origin: { label: '起运港', icon: '🚢', color: '#409EFF' },
  transit: { label: '中转港', icon: '🔄', color: '#E6A23C' },
  destination: { label: '目的港', icon: '📍', color: '#67C23A' }
}

// 清关状态映射
const customsStatusMap: Record<string, { text: string; type: 'success' | 'warning' | 'danger' | 'info' }> = {
  released: { text: '已放行', type: 'success' },
  cleared: { text: '已清关', type: 'success' },
  pass: { text: '已放行', type: 'success' },
  processing: { text: '清关中', type: 'warning' },
  pending: { text: '待清关', type: 'info' },
  held: { text: '扣货', type: 'danger' },
  customs_hold: { text: '海关滞留', type: 'danger' },
  terminal_hold: { text: '码头滞留', type: 'warning' },
  carrier_hold: { text: '船公司滞留', type: 'warning' },
  dumped: { text: '甩柜', type: 'danger' }
}

// 按 portSequence 排序后展示
const sortedPorts = computed(() => {
  const list = props.portOperations ?? []
  if (list.length <= 1) return list
  return [...list].sort((a, b) => (a.portSequence ?? 999) - (b.portSequence ?? 999))
})

// 格式化日期
const formatDateOnly = (date: Date | string | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('zh-CN')
}

// 最晚提柜日警示状态
const getLastFreeDateStatus = (date: Date | string | undefined): 'expired' | 'urgent' | 'normal' | 'none' => {
  if (!date) return 'none'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
  if (diffDays < 0) return 'expired'
  if (diffDays <= 3) return 'urgent'
  return 'normal'
}

// 获取清关状态展示
const getCustomsDisplay = (status: string | undefined) => {
  if (!status) return null
  const key = status.toLowerCase().replace(/-/g, '_')
  return customsStatusMap[key] ?? customsStatusMap[status] ?? { text: status, type: 'info' as const }
}
</script>

<template>
  <div class="port-operations-section">
    <div v-if="sortedPorts.length > 0" class="port-flow-container">
      <!-- 港口流程时间轴 -->
      <div class="port-flow-timeline">
        <div
          v-for="(po, index) in sortedPorts"
          :key="po.id ?? index"
          class="port-node-wrapper"
        >
          <div
            class="port-node"
            :class="[po.portType || '', { 'has-ata': !!po.ataDestPort }]"
            :style="{ '--port-color': portTypeConfig[po.portType || '']?.color }"
          >
            <!-- 港口类型图标 -->
            <div class="port-icon" :style="{ '--port-color': portTypeConfig[po.portType || '']?.color }">
              {{ portTypeConfig[po.portType || '']?.icon || '📍' }}
            </div>

            <div class="port-content">
              <!-- 头部：港口类型 + 名称 -->
              <div class="port-header">
                <span class="port-type-badge" :style="{ '--badge-color': portTypeConfig[po.portType || '']?.color }">
                  {{ portTypeConfig[po.portType || '']?.label || po.portType }}
                </span>
                <span class="port-name">{{ po.portName || po.portCode || '-' }}</span>
              </div>

              <!-- 分区：关键日期 -->
              <div class="port-block port-dates">
                <div class="field-item">
                  <span class="field-label">ETA</span>
                  <span class="field-value">
                    {{ formatDateOnly(po.etaCorrection || po.etaDestPort) }}
                    <span v-if="po.etaCorrection" class="field-badge">修正</span>
                  </span>
                </div>
                <div class="field-item">
                  <span class="field-label">ATA</span>
                  <span class="field-value highlight">{{ formatDateOnly(po.ataDestPort) }}</span>
                </div>
                <div class="field-item">
                  <span class="field-label">抵港</span>
                  <span class="field-value">{{ formatDateOnly(po.transitArrivalDate) }}</span>
                </div>
                <div class="field-item">
                  <span class="field-label">卸船</span>
                  <span class="field-value">{{ formatDateOnly(po.destPortUnloadDate) }}</span>
                </div>
                <div class="field-item">
                  <span class="field-label">最晚提柜</span>
                  <span class="field-value" :class="getLastFreeDateStatus(po.lastFreeDate)">
                    {{ formatDateOnly(po.lastFreeDate) }}
                  </span>
                </div>
              </div>

              <!-- 分区：状态 -->
              <div class="port-block port-status">
                <el-tag
                  v-if="getCustomsDisplay(po.customsStatus)"
                  :type="getCustomsDisplay(po.customsStatus)!.type"
                  size="small"
                  effect="plain"
                  round
                >
                  {{ getCustomsDisplay(po.customsStatus)!.text }}
                </el-tag>
                <span v-else class="field-value">{{ po.customsStatus || '-' }}</span>
              </div>

              <!-- 分区：港口与操作信息 -->
              <div class="port-block port-fields">
                <div class="field-item">
                  <span class="field-label">港口编码</span>
                  <span class="field-value">{{ po.portCode || '-' }}</span>
                </div>
                <div class="field-item">
                  <span class="field-label">序号</span>
                  <span class="field-value">{{ po.portSequence ?? '-' }}</span>
                </div>
                <div class="field-item">
                  <span class="field-label">ISF申报</span>
                  <span class="field-value">{{ po.isfStatus || '-' }}</span>
                </div>
                <div class="field-item">
                  <span class="field-label">清关公司</span>
                  <span class="field-value">{{ po.customsBroker || po.customsBrokerCode || '-' }}</span>
                </div>
                <div class="field-item">
                  <span class="field-label">码头</span>
                  <span class="field-value">{{ po.gateInTerminal || po.terminal || '-' }}</span>
                </div>
                <div class="field-item">
                  <span class="field-label">进闸</span>
                  <span class="field-value">{{ formatDateOnly(po.gateInTime) }}</span>
                </div>
                <div class="field-item">
                  <span class="field-label">出闸</span>
                  <span class="field-value">{{ formatDateOnly(po.gateOutTime) }}</span>
                </div>
                <div class="field-item field-item-full">
                  <span class="field-label">备注</span>
                  <span class="field-value">{{ po.remarks || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- 连接线（非最后一个节点） -->
          <div v-if="index < sortedPorts.length - 1" class="flow-connector" />
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无港口操作信息" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.port-operations-section {
  padding: $spacing-sm 0;
}

.port-flow-container {
  overflow-x: auto;
}

.port-flow-timeline {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: $spacing-md;
  align-items: stretch;
  padding: $spacing-md 0;

  .port-node-wrapper:only-child {
    grid-column: 1 / -1;
  }
}

.port-node-wrapper {
  display: flex;
  align-items: stretch;
  min-width: 0;
}

.flow-connector {
  flex-shrink: 0;
  width: 24px;
  height: 2px;
  background: linear-gradient(90deg, $border-light, $primary-light);
  margin: 0 -2px;
  align-self: center;
}

.port-node {
  flex: 1;
  background: $bg-color;
  border: 1px solid $border-light;
  border-radius: $radius-large;
  padding: $spacing-md $spacing-md $spacing-md calc(#{$spacing-md} + 3px);
  box-shadow: $shadow-light;
  transition: $transition-base;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--port-color, $primary-color);
    opacity: 0.6;
  }

  &:hover {
    box-shadow: $shadow-base;
    border-color: $primary-lighter;
  }

  &.has-ata .port-icon {
    box-shadow: 0 0 0 2px $success-light;
  }

  &.destination {
    --port-color: #{$success-color};
  }

  &.transit {
    --port-color: #{$warning-color};
  }

  &.origin {
    --port-color: #{$primary-color};
  }
}

.port-icon {
  width: 44px;
  height: 44px;
  border-radius: $radius-circle;
  background: linear-gradient(135deg, var(--port-color, $primary-color) 0%, color-mix(in srgb, var(--port-color, $primary-color) 80%, white) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: $spacing-sm;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.port-content {
  .port-header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    margin-bottom: $spacing-md;
    padding-bottom: $spacing-sm;
    border-bottom: 1px solid $border-lighter;

    .port-type-badge {
      font-size: $font-size-xs;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 4px;
      background: color-mix(in srgb, var(--badge-color, $primary-color) 18%, transparent);
      color: var(--badge-color, $primary-color);
      flex-shrink: 0;
    }

    .port-name {
      font-size: $font-size-base;
      font-weight: 600;
      color: $text-primary;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .port-block {
    margin-bottom: $spacing-md;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .port-dates {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm $spacing-lg;
  }

  .port-status {
    .el-tag {
      font-size: $font-size-xs;
    }
  }

  .port-fields {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: $spacing-xs $spacing-lg;
    padding-top: $spacing-sm;
    border-top: 1px dashed $border-lighter;

    .field-item-full {
      grid-column: 1 / -1;
    }
  }

  .field-item {
    display: flex;
    align-items: baseline;
    gap: $spacing-sm;
    font-size: $font-size-sm;
    min-width: 0;

    .field-label {
      color: $text-secondary;
      flex-shrink: 0;
      font-size: $font-size-xs;
    }

    .field-value {
      color: $text-regular;
      overflow: hidden;
      text-overflow: ellipsis;

      &.highlight {
        color: $primary-color;
        font-weight: 500;
      }

      &.expired {
        color: $danger-color;
        font-weight: 600;
      }

      &.urgent {
        color: $warning-color;
        font-weight: 500;
      }

      &.normal {
        color: $success-color;
      }
    }

    .field-badge {
      font-size: 10px;
      padding: 0 4px;
      margin-left: 4px;
      background: $warning-light;
      color: $warning-color;
      border-radius: 2px;
    }
  }
}

@media (max-width: 768px) {
  .port-flow-timeline {
    grid-template-columns: 1fr;
  }

  .flow-connector {
    width: 2px;
    height: 24px;
    background: linear-gradient(180deg, $border-light, $primary-light);
    margin: -2px 0;
  }

  .port-node-wrapper {
    flex-direction: column;
  }

  .port-content .port-fields {
    grid-template-columns: 1fr;
  }
}
</style>
