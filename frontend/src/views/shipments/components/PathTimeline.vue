<template>
  <div class="path-grouped">
    <div v-if="!(nodes || []).length" class="path-timeline-empty">
      {{ t('container.logisticsPath.noNodes') }}
    </div>
    <div v-else class="stage-grid">
      <div v-for="group in groupedNodes" :key="group.stage" class="stage-col">
        <div class="stage-header">
          <span class="stage-name">{{ group.label }}</span>
          <span class="stage-count"
            >{{ group.nodes.length }} {{ t('container.logisticsPath.nodesCount') }}</span
          >
        </div>
        <div class="stage-nodes">
          <PathMilestoneCard
            v-for="item in group.nodes"
            :key="item.node.id"
            :node="item.node"
            @click="$emit('nodeClick', item.node)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StatusNode, StatusPath } from '@/services/logisticsPath'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import PathMilestoneCard from './PathMilestoneCard.vue'

const { t } = useI18n()

const props = defineProps<{
  path: StatusPath | null
}>()

defineEmits<{
  nodeClick: [node: StatusNode]
}>()

/** 阶段分组映射 */
const STAGE_MAP: Record<string, { stage: string; label: string; order: number }> = {
  NOT_SHIPPED: { stage: 'origin', label: '起运', order: 1 },
  EMPTY_PICKED_UP: { stage: 'origin', label: '起运', order: 1 },
  CONTAINER_STUFFED: { stage: 'origin', label: '起运', order: 1 },
  GATE_IN: { stage: 'origin', label: '起运', order: 1 },
  LOADED: { stage: 'origin', label: '起运', order: 1 },
  DEPARTED: { stage: 'origin', label: '起运', order: 1 },

  FEEDER_LOADED: { stage: 'feeder', label: '驳船', order: 4 },
  FEEDER_DEPARTED: { stage: 'feeder', label: '驳船', order: 4 },
  FEEDER_ARRIVED: { stage: 'feeder', label: '驳船', order: 4 },
  FEEDER_DISCHARGED: { stage: 'feeder', label: '驳船', order: 4 },

  SAILING: { stage: 'sea', label: '海运', order: 5 },

  TRANSIT_ARRIVED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_BERTHED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_DISCHARGED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_LOADED: { stage: 'transit', label: '中转', order: 3 },
  TRANSIT_DEPARTED: { stage: 'transit', label: '中转', order: 3 },

  ARRIVED: { stage: 'arrival', label: '到港', order: 6 },
  BERTHED: { stage: 'arrival', label: '到港', order: 6 },
  DELIVERY_ARRIVED: { stage: 'arrival', label: '到港', order: 6 },
  DISCHARGED: { stage: 'arrival', label: '到港', order: 6 },
  AVAILABLE: { stage: 'arrival', label: '到港', order: 6 },

  RAIL_LOADED: { stage: 'rail', label: '铁路', order: 9 },
  RAIL_DEPARTED: { stage: 'rail', label: '铁路', order: 9 },
  RAIL_ARRIVED: { stage: 'rail', label: '铁路', order: 9 },
  RAIL_DISCHARGED: { stage: 'rail', label: '铁路', order: 9 },

  GATE_OUT: { stage: 'pickup', label: '提柜', order: 10 },
  IN_TRANSIT_TO_DEST: { stage: 'pickup', label: '提柜', order: 10 },
  STRIPPED: { stage: 'pickup', label: '提柜', order: 10 },

  RETURNED_EMPTY: { stage: 'return', label: '还箱', order: 11 },
  COMPLETED: { stage: 'return', label: '还箱', order: 11 },
}

const nodes = computed(() => props.path?.nodes || [])

const groupedNodes = computed(() => {
  if (!nodes.value.length) return []

  const transportMode = props.path?.transportMode
  const shouldShowStage = (stage: string) => {
    if (!transportMode) return true
    if (transportMode === 'STANDARD') {
      return !['rail', 'feeder'].includes(stage)
    }
    if (transportMode === 'SEA_RAIL') {
      return stage !== 'feeder'
    }
    if (transportMode === 'FEEDER') {
      return stage !== 'rail'
    }
    return true
  }

  const shouldShowNode = (node: StatusNode) => {
    if (node.status === 'NOT_SHIPPED' && (node.rawData as { noData?: boolean })?.noData) {
      return false
    }
    return true
  }

  const groups: Record<
    string,
    {
      stage: string
      label: string
      order: number
      nodes: { node: StatusNode; globalIndex: number }[]
    }
  > = {}

  nodes.value.forEach((node, globalIndex) => {
    if (!shouldShowNode(node)) return

    const info = STAGE_MAP[node.status] || { stage: 'other', label: '其他', order: 99 }
    const key = info.stage

    if (!shouldShowStage(key)) return

    if (!groups[key]) {
      groups[key] = { stage: key, label: info.label, order: info.order, nodes: [] }
    }
    groups[key].nodes.push({ node, globalIndex })
  })

  return Object.values(groups).sort((a, b) => a.order - b.order)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.path-grouped {
  margin-top: $spacing-md;
}

.path-timeline-empty {
  padding: $spacing-xl;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
  margin-top: $spacing-md;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: $spacing-lg;
}

.stage-col {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: $radius-large;
  overflow: hidden;
  box-shadow: $shadow-light;
  transition: $transition-base;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--el-bg-color);

  &:hover {
    box-shadow: $shadow-base;
    border-color: var(--el-border-color-light);
  }
}

.stage-header {
  padding: $spacing-md $spacing-lg;
  background: linear-gradient(
    135deg,
    rgba($primary-color, 0.08) 0%,
    rgba($primary-color, 0.04) 100%
  );
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.stage-name {
  color: var(--el-text-color-primary);
  font-size: $font-size-base;
  letter-spacing: 0.02em;
}

.stage-count {
  font-size: $font-size-xs;
  color: var(--el-color-primary);
  background: rgba($primary-color, 0.1);
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 500;
}

.stage-nodes {
  padding: $spacing-sm;
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-height: 0;
  background: var(--el-bg-color);
}
</style>
