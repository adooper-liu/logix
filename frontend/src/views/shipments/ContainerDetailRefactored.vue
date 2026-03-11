<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { containerService } from '@/services/container'
import { demurrageService, type CalculationDates } from '@/services/demurrage'
import { ElMessage } from 'element-plus'
import ContainerHeader from './components/ContainerHeader.vue'
import ContainerSummary from './components/ContainerSummary.vue'
import KeyDatesTimeline from './components/KeyDatesTimeline.vue'
import SeaFreightInfo from './components/SeaFreightInfo.vue'
import ContainerInfo from './components/ContainerInfo.vue'
import PortOperations from './components/PortOperations.vue'
import TruckingTransport from './components/TruckingTransport.vue'
import WarehouseOperations from './components/WarehouseOperations.vue'
import EmptyReturn from './components/EmptyReturn.vue'
import DemurrageDetailSection from '@/components/demurrage/DemurrageDetailSection.vue'
import LogisticsPathTab from './components/LogisticsPathTab.vue'
import ChangeLogTab from './components/ChangeLogTab.vue'

const route = useRoute()
const demurrageRef = ref<{ load: () => Promise<void> } | null>(null)
const calculationDates = ref<CalculationDates | null>(null)
// 路由 param 已解码；若需兼容编码柜号则 decodeURIComponent
const containerNumber = computed(() => {
  const p = route.params.containerNumber as string
  return p ? decodeURIComponent(p) : ''
})

// 数据加载
const loading = ref(false)
const containerData = ref<any>(null)
const activeTab = ref('logistics-path')

// 加载货柜详情
const loadContainerDetail = async () => {
  if (!containerNumber.value?.trim()) {
    ElMessage.error('缺少集装箱号，请从列表进入')
    return
  }
  loading.value = true
  try {
    const response = await containerService.getContainerById(containerNumber.value)
    if (response.success) {
      containerData.value = response.data
    } else {
      ElMessage.error((response as any).message || '获取货柜详情失败')
    }
  } catch (error: any) {
    console.error('Failed to load container details:', error)
    const msg =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      (error?.response?.status === 404 ? '货柜不存在' : '获取货柜详情失败')
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

const loadDemurrageDates = async () => {
  if (!containerNumber.value?.trim()) return
  try {
    const res = await demurrageService.calculateForContainer(containerNumber.value)
    if (res.success && res.data?.calculationDates) {
      calculationDates.value = res.data.calculationDates
    } else {
      calculationDates.value = null
    }
  } catch {
    calculationDates.value = null
  }
}

onMounted(() => {
  loadContainerDetail()
})

watch(containerData, (data) => {
  if (data) loadDemurrageDates()
}, { immediate: true })

// 根据路由 query.tab 打开对应页签（如从高费用货柜卡片跳转时打开滞港费页签）
watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'demurrage') activeTab.value = 'demurrage'
    else if (tab === 'logistics-path') activeTab.value = 'logistics-path'
    else if (tab === 'change-log') activeTab.value = 'change-log'
  },
  { immediate: true }
)

// 计算属性：目的港操作信息
const destinationPortOperation = computed(() => {
  if (!containerData.value?.portOperations) return null
  return containerData.value.portOperations.find(
    (po: any) => po.portType === 'destination'
  )
})

// 物流状态标签：中文文案 + 类型
const LOGISTICS_STATUS_MAP: Record<string, { text: string; type: 'success' | 'warning' | 'danger' | 'info' }> = {
  not_shipped: { text: '未出运', type: 'info' },
  shipped: { text: '已装船', type: 'success' },
  in_transit: { text: '在途', type: 'success' },
  at_port: { text: '已到目的港', type: 'success' },
  arrived_at_transit_port: { text: '已到中转港', type: 'success' },
  picked_up: { text: '已提柜', type: 'warning' },
  unloaded: { text: '已卸柜', type: 'warning' },
  returned_empty: { text: '已还箱', type: 'success' },
  cancelled: { text: '已取消', type: 'danger' },
  hold: { text: '扣留', type: 'danger' },
  completed: { text: '已完成', type: 'success' },
}
const logisticsStatusDisplay = computed(() => {
  const s = containerData.value?.logisticsStatus
  return LOGISTICS_STATUS_MAP[s] || { text: s || '—', type: 'info' as const }
})
</script>

<template>
  <div class="container-detail-page" v-loading="loading">
    <!-- 物流状态标签（右上角） -->
    <div v-if="containerData" class="logistics-status-badge" :class="logisticsStatusDisplay.type">
      <span class="badge-dot"></span>
      <span class="badge-text">{{ logisticsStatusDisplay.text }}</span>
    </div>

    <!-- 页面头部 -->
    <ContainerHeader
      :container-number="containerNumber"
      :loading="loading"
      @refresh="loadContainerDetail"
    />

    <!-- 内容区域 -->
    <div v-if="containerData" class="detail-content">
      <!-- 概览区：基本信息 + 关键日期 -->
      <section class="overview-section">
        <ContainerSummary :container-data="containerData" />
        <KeyDatesTimeline
          :container-data="containerData"
          :calculation-dates="calculationDates"
        />
      </section>

      <!-- 详情 Tab 区 -->
      <section class="tabs-section">
        <el-card class="detail-card" shadow="hover">
          <el-tabs v-model="activeTab" class="detail-tabs">
            <el-tab-pane label="物流路径" name="logistics-path">
              <div class="tab-content">
                <LogisticsPathTab
                  :container-number="containerNumber"
                  :bill-of-lading-number="(() => {
                    const sf = Array.isArray(containerData?.seaFreight) ? containerData?.seaFreight?.[0] : containerData?.seaFreight
                    return sf?.mblNumber || sf?.billOfLadingNumber || ''
                  })()"
                />
              </div>
            </el-tab-pane>
            <el-tab-pane label="货柜信息" name="info">
              <div class="tab-content">
                <ContainerInfo :container-data="containerData" />
              </div>
            </el-tab-pane>
            <el-tab-pane label="海运信息" name="seafreight">
              <div class="tab-content">
                <SeaFreightInfo
                  :sea-freights="containerData.seaFreight"
                  :destination-port-operation="destinationPortOperation"
                />
              </div>
            </el-tab-pane>
            <el-tab-pane label="港口操作" name="port">
              <div class="tab-content">
                <PortOperations :port-operations="containerData.portOperations" />
              </div>
            </el-tab-pane>
            <el-tab-pane label="拖卡运输" name="trucking">
              <div class="tab-content">
                <TruckingTransport :trucking-transports="containerData.truckingTransports" />
              </div>
            </el-tab-pane>
            <el-tab-pane label="仓库操作" name="warehouse">
              <div class="tab-content">
                <WarehouseOperations :warehouse-operations="containerData.warehouseOperations" />
              </div>
            </el-tab-pane>
            <el-tab-pane label="还空箱" name="emptyreturn">
              <div class="tab-content">
                <EmptyReturn :empty-returns="containerData.emptyReturns" />
              </div>
            </el-tab-pane>
            <el-tab-pane label="滞港费" name="demurrage">
              <div class="tab-content">
                <div class="tab-header-row">
                  <el-button type="primary" link size="small" @click="demurrageRef?.load?.()">
                    刷新
                  </el-button>
                </div>
                <DemurrageDetailSection ref="demurrageRef" :container-number="containerNumber" />
              </div>
            </el-tab-pane>
            <el-tab-pane label="变更日志" name="change-log">
              <div class="tab-content">
                <ChangeLogTab :container-number="containerNumber" />
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.container-detail-page {
  padding: $spacing-lg;
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: $spacing-md;
  }
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.overview-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.tabs-section {
  flex: 1;
}

/* 物流状态标签：右上角可视化，避开导航条 */
.logistics-status-badge {
  position: fixed;
  top: 72px;
  right: 80px;
  z-index: 999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: $font-size-sm;
  font-weight: 600;
  letter-spacing: 0.03em;
  box-shadow: $shadow-base;
  pointer-events: none;
  transition: $transition-base;

  .badge-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    animation: badge-pulse 2s ease-in-out infinite;
  }

  .badge-text {
    white-space: nowrap;
  }

  &.success {
    background: linear-gradient(135deg, rgba($success-color, 0.95) 0%, $success-color 100%);
    color: #fff;
    .badge-dot { background: #fff; }
  }

  &.warning {
    background: linear-gradient(135deg, rgba($warning-color, 0.95) 0%, $warning-color 100%);
    color: #fff;
    .badge-dot { background: #fff; }
  }

  &.danger {
    background: linear-gradient(135deg, rgba($danger-color, 0.95) 0%, $danger-color 100%);
    color: #fff;
    .badge-dot { background: #fff; }
  }

  &.info {
    background: linear-gradient(135deg, rgba($info-color, 0.95) 0%, $info-color 100%);
    color: #fff;
    .badge-dot { background: #fff; }
  }
}

@keyframes badge-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.detail-card {
  border-radius: $radius-large;
  border: 1px solid $border-lighter;
  overflow: hidden;

  :deep(.el-card__body) {
    padding: $spacing-lg;
  }

  .detail-tabs {
    :deep(.el-tabs__header) {
      margin-bottom: $spacing-lg;
      border-bottom: 1px solid $border-lighter;
    }

    :deep(.el-tabs__nav-wrap::after) {
      display: none;
    }

    :deep(.el-tabs__item) {
      font-size: $font-size-sm;
      font-weight: 500;
    }

    :deep(.el-tabs__item.is-active) {
      color: $primary-color;
      font-weight: 600;
    }

    :deep(.el-tabs__active-bar) {
      background: $primary-color;
      height: 3px;
    }

    :deep(.el-tabs__indicator) {
      background: $primary-color;
    }

    :deep(.el-tabs__content) {
      overflow: visible;
    }

  }

  .tab-content {
    .tab-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-md;
    }

    .tab-title {
      font-size: $font-size-lg;
      font-weight: 600;
      color: $text-primary;
      margin: 0;
      padding-bottom: $spacing-sm;
      border-bottom: 1px solid $border-lighter;
    }
  }

}
</style>
