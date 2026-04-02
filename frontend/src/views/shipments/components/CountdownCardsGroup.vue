<template>
  <el-card class="countdown-cards">
    <template #header>
      <div class="countdown-header">
        <span class="countdown-header-title">统计卡片组</span>
        <el-button size="small" text @click="handleCollapseToggle">
          <el-icon style="margin-right: 4px">
            <ArrowRight v-if="collapsed" />
            <ArrowDown v-else />
          </el-icon>
          {{ collapsed ? '展开' : '折叠' }}
        </el-button>
      </div>
    </template>
    <div v-show="!collapsed" class="countdown-grid">
      <!-- 按状态 -->
      <CountdownCard
        title="按状态"
        label="物流状态分布"
        subtitle="（所选出运日期范围内）"
        :data="countdownByStatus"
        tree-layout="column"
        @filter="handleStatusFilter"
        :description="statusDescription"
      />

      <!-- 按到港 -->
      <CountdownCard
        title="按到港"
        label="到港时间分布"
        subtitle="（所选出运日期范围内）"
        :data="countdownByArrival"
        :tree-layout="true"
        @filter="handleArrivalFilter"
        :description="arrivalDescription"
      />

      <!-- 按提柜计划 -->
      <CountdownCard
        title="按提柜计划"
        label="计划提柜分布"
        :data="countdownByPickup"
        @filter="handlePickupFilter"
        :description="pickupDescription"
      />

      <!-- 按最晚提柜 -->
      <CountdownCard
        title="按最晚提柜"
        label="最晚提柜倒计时"
        :data="countdownByLastPickup"
        @filter="handleLastPickupFilter"
        :description="lastPickupDescription"
      />

      <!-- 按最晚还箱 -->
      <CountdownCard
        title="按最晚还箱"
        label="最晚还箱倒计时"
        :data="countdownByReturn"
        @filter="handleReturnFilter"
        :description="returnDescription"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import CountdownCard from '@/components/CountdownCard.vue'
import { useContainerCountdown } from '@/composables/useContainerCountdown'
import { ArrowDown, ArrowRight } from '@element-plus/icons-vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'

// ==================== Props 定义 ====================
interface Props {
  statisticsData?: any
}

const props = withDefaults(defineProps<Props>(), {
  statisticsData: null,
})

// ==================== Emits 定义 ====================
interface Emits {
  (e: 'filter', type: string, days: string): void
  (e: 'update:collapsed', value: boolean): void
}

const emit = defineEmits<Emits>()

// ==================== 内部状态 ====================
const collapsed = ref(false)

// ==================== 使用倒计时 composable ====================
const statisticsDataRef = computed(() => props.statisticsData)
const {
  countdownByArrival,
  countdownByPickup,
  countdownByLastPickup,
  countdownByReturn,
  countdownByStatus,
  startTimer,
  stopTimer,
} = useContainerCountdown(statisticsDataRef)

// ==================== 描述文本 ====================
const statusDescription =
  '<strong>统计范围：</strong>全部货柜（出运日在页面所选日期范围内）<br/><strong>分类依据：</strong>物流状态机（logistics_status），在途细分：未到港 / 已到中转港；已到港仅计已到目的港<br/><strong>业务用途：</strong>监控货柜在全流程中的实时分布；点击标签可筛选对应列表，统计与列表同源'

const arrivalDescription =
  '<strong>统计范围：</strong>已出运至已还箱的全部货柜（shipped / in_transit / at_port / picked_up / unloaded / returned_empty）<br/><strong>分组结构：</strong><br/>① 已到目的港：目的港有 ATA，子项按今日到港 / 之前未提柜 / 之前已提柜<br/>② 已到中转港：有中转港到港记录且目的港无 ATA，子项按目的港 ETA 细分<br/>③ ETA：目的港无 ATA，按目的港 ETA 与今天比较（已逾期、3 天内、7 天内、7 天后、其他），主数=子项之和<br/>④ 到港数据缺失：目的港无 ATA 无 ETA 但状态显示已到港/已提柜等，需补全数据<br/><strong>业务用途：</strong>监控海运段到港进度，区分中转港与目的港，预警逾期；统计与点击列表同源'

const pickupDescription =
  '<strong>统计范围：</strong>已到目的港且未还箱、未 WMS、未提柜（与按最晚提柜目标集一致）<br/><strong>分类依据：</strong>计划提柜日（拖车/提柜计划）<br/><strong>业务用途：</strong>监控按计划提柜进度与逾期；统计与点击列表同源'

const lastPickupDescription =
  '<strong>统计范围：</strong>已到目的港且未还箱、未 WMS、未提柜（与按提柜计划目标集一致）<br/><strong>分类依据：</strong>最晚提柜日（last_free_date，免费期）与今天比较<br/><strong>业务用途：</strong>预警超免费期风险；统计与点击列表同源'

const returnDescription =
  '<strong>统计范围：</strong>已有实际提柜或拖车记录且未还箱<br/><strong>分类依据：</strong>最后还箱日与今天比较<br/><strong>业务用途：</strong>监控还箱时效与逾期；统计与点击列表同源'

// ==================== 事件处理 ====================
const handleCollapseToggle = () => {
  collapsed.value = !collapsed.value
  emit('update:collapsed', collapsed.value)
}

// 各类别筛选事件包装器
const handleStatusFilter = (type: string, days: string) => {
  emit('filter', type, days)
}

const handleArrivalFilter = (type: string, days: string) => {
  emit('filter', type, days)
}

const handlePickupFilter = (type: string, days: string) => {
  emit('filter', type, days)
}

const handleLastPickupFilter = (type: string, days: string) => {
  emit('filter', type, days)
}

const handleReturnFilter = (type: string, days: string) => {
  emit('filter', type, days)
}

// ==================== 生命周期 ====================
onMounted(() => {
  startTimer()
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.countdown-cards {
  margin-bottom: 8px;

  :deep(.el-card__header) {
    padding: 8px 10px;
  }

  :deep(.el-card__body) {
    padding: 8px 10px;
  }

  .countdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .countdown-header-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  /* 五组卡片：按到港占 35%，其余四列等分 65%；中屏/小屏等分 */
  .countdown-grid {
    display: grid;
    grid-template-columns: 1fr 35% 1fr 1fr 1fr;
    gap: 8px;
    align-items: start;
  }

  .countdown-grid > * {
    min-width: 0;
  }
}

@media (max-width: 1279px) {
  .countdown-cards .countdown-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 959px) {
  .countdown-cards .countdown-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .countdown-grid {
    grid-template-columns: 1fr !important;
    gap: 8px !important;
  }
}
</style>
