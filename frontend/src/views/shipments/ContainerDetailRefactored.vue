<script setup lang="ts">
import ContainerDetailSkeleton from '@/components/common/ContainerDetailSkeleton.vue'
import DemurrageDetailSection from '@/components/demurrage/DemurrageDetailSection.vue'
import { useContainerDetail } from '@/composables/useContainerDetail'
import { useShipmentsExport } from '@/composables/useShipmentsExport'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import AlertTab from './components/AlertTab.vue'
import ChangeLogTab from './components/ChangeLogTab.vue'
import ContainerHeader from './components/ContainerHeader.vue'
import ContainerInfo from './components/ContainerInfo.vue'
import ContainerSummary from './components/ContainerSummary.vue'
import EmptyReturn from './components/EmptyReturn.vue'
import InspectionRecord from './components/InspectionRecord.vue'
import KeyDatesTimeline from './components/KeyDatesTimeline.vue'
import LogisticsPathTab from './components/LogisticsPathTab.vue'
import PortOperations from './components/PortOperations.vue'
import RiskCardTab from './components/RiskCardTab.vue'
import ScheduleEditDialog from './components/ScheduleEditDialog.vue'
import SeaFreightInfo from './components/SeaFreightInfo.vue'
import TimePredictionTab from './components/TimePredictionTab.vue'
import TruckingTransport from './components/TruckingTransport.vue'
import WarehouseOperations from './components/WarehouseOperations.vue'

const route = useRoute()
const router = useRouter()
const demurrageRef = ref<{ load: () => Promise<void> } | null>(null)
/** 物流地图 Tab：切回时触发 Leaflet invalidateSize */
const logisticsPathMapTabRef = ref<{ invalidateMap?: () => void } | null>(null)
const activeTab = ref('logistics-path')

// 计划编辑对话框
const scheduleEditVisible = ref(false)

// 使用 useContainerDetail composable
const {
  containerNumber,
  containerData,
  loading,
  calculationDates,
  demurrageCalculation,
  containerList,
  loadingContainerList,
  currentContainerIndex,
  logisticsStatusDisplay,
  destinationPortOperation,
  loadContainerDetail,
  navigateToPrevious,
  navigateToNext,
} = useContainerDetail()

// 使用导出功能
const { handleExportContainerDetail } = useShipmentsExport()

// 使用 i18n
const { t } = useI18n()

/** 物流路径 / 物流地图 Tab 共用：提单号（同提单对比等） */
const billOfLadingNumberForPath = computed(() => {
  const sf = Array.isArray(containerData.value?.seaFreight)
    ? containerData.value?.seaFreight?.[0]
    : containerData.value?.seaFreight
  return sf?.mblNumber || sf?.billOfLadingNumber || ''
})

// 导出货柜详情
const exportContainerDetail = () => {
  if (containerData.value) {
    handleExportContainerDetail(containerData.value)
  }
}

onMounted(() => {
  loadContainerDetail()
})

function onDetailTabChange(tabName: string | number) {
  if (tabName !== 'logistics-path-map') return
  nextTick(() => {
    logisticsPathMapTabRef.value?.invalidateMap?.()
  })
}

// 根据路由 query.tab 打开对应页签（如从高费用货柜卡片跳转时打开滞港费页签）
watch(
  () => route.query.tab,
  tab => {
    if (tab === 'demurrage') activeTab.value = 'demurrage'
    else if (tab === 'logistics-path') activeTab.value = 'logistics-path'
    else if (tab === 'logistics-path-map') activeTab.value = 'logistics-path-map'
    else if (tab === 'change-log') activeTab.value = 'change-log'
    else if (tab === 'inspection') activeTab.value = 'inspection'
    else if (tab === 'alert') activeTab.value = 'alert'
    else if (tab === 'time-prediction') activeTab.value = 'time-prediction'
    else if (tab === 'risk') activeTab.value = 'risk'
  },
  { immediate: true }
)
</script>

<template>
  <div class="container-detail-page">
    <!-- 骨架屏 -->
    <ContainerDetailSkeleton v-if="loading" />

    <!-- 实际内容 -->
    <template v-else>
      <!-- 页面头部（物流状态并入标题区，避免悬浮标签干扰阅读） -->
      <ContainerHeader
        :container-number="containerNumber"
        :loading="loading"
        :current-container-index="currentContainerIndex"
        :container-list-length="containerList.length"
        :status-badge="containerData ? logisticsStatusDisplay : undefined"
        @refresh="loadContainerDetail"
        @navigate-to-previous="navigateToPrevious"
        @navigate-to-next="navigateToNext"
        @edit-schedule="scheduleEditVisible = true"
        @export-detail="exportContainerDetail"
      />

      <!-- 计划编辑对话框 -->
      <ScheduleEditDialog
        v-model:visible="scheduleEditVisible"
        :container-number="containerNumber"
        :country="containerData?.order?.sellToCountry"
        :initial-data="{
          plannedCustomsDate: containerData?.portOperations?.find(
            (p: any) => p.portType === 'destination'
          )?.plannedCustomsDate,
          plannedPickupDate: containerData?.truckingTransports?.[0]?.plannedPickupDate,
          plannedDeliveryDate: containerData?.truckingTransports?.[0]?.plannedDeliveryDate,
          plannedUnloadDate: containerData?.warehouseOperations?.[0]?.plannedUnloadDate,
          plannedReturnDate: containerData?.emptyReturns?.[0]?.plannedReturnDate,
          truckingCompanyId: containerData?.truckingTransports?.[0]?.truckingCompanyId,
          customsBrokerCode: containerData?.portOperations?.find(
            (p: any) => p.portType === 'destination'
          )?.customsBrokerCode,
          warehouseId: containerData?.warehouseOperations?.[0]?.warehouseId,
          unloadModePlan: containerData?.truckingTransports?.[0]?.unloadModePlan,
        }"
        @success="loadContainerDetail"
      />

      <!-- 内容区域 -->
      <div v-if="containerData" class="detail-content">
        <section class="overview-section">
          <div class="overview-panel">
            <ContainerSummary
              :container-data="containerData"
              :demurrage-calculation="demurrageCalculation"
              @open-demurrage-tab="activeTab = 'demurrage'"
            />
            <KeyDatesTimeline
              :container-data="containerData"
              :calculation-dates="calculationDates"
            />
          </div>
        </section>

        <section class="tabs-section">
          <el-card class="detail-card" shadow="never">
            <el-tabs v-model="activeTab" class="detail-tabs" @tab-change="onDetailTabChange">
              <el-tab-pane :label="t('container.detail.logisticsPath')" name="logistics-path" lazy>
                <div class="tab-content">
                  <LogisticsPathTab
                    variant="grouped"
                    :container-number="containerNumber"
                    :bill-of-lading-number="billOfLadingNumberForPath"
                  />
                </div>
              </el-tab-pane>
              <el-tab-pane label="预警" name="alert" lazy>
                <div class="tab-content">
                  <AlertTab :container-number="containerNumber" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="时间预测" name="time-prediction" lazy>
                <div class="tab-content">
                  <TimePredictionTab :container-number="containerNumber" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="风险评估" name="risk" lazy>
                <div class="tab-content">
                  <RiskCardTab :container-number="containerNumber" />
                </div>
              </el-tab-pane>
              <el-tab-pane
                :label="t('container.detail.logisticsPathMap')"
                name="logistics-path-map"
                lazy
              >
                <div class="tab-content">
                  <LogisticsPathTab
                    ref="logisticsPathMapTabRef"
                    variant="map"
                    :container-number="containerNumber"
                    :bill-of-lading-number="billOfLadingNumberForPath"
                  />
                </div>
              </el-tab-pane>
              <el-tab-pane label="货柜信息" name="info" lazy>
                <div class="tab-content">
                  <ContainerInfo :container-data="containerData" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="海运信息" name="seafreight" lazy>
                <div class="tab-content">
                  <SeaFreightInfo
                    :sea-freights="containerData.seaFreight"
                    :destination-port-operation="destinationPortOperation"
                  />
                </div>
              </el-tab-pane>
              <el-tab-pane label="港口操作" name="port" lazy>
                <div class="tab-content">
                  <PortOperations :port-operations="containerData.portOperations" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="拖卡运输" name="trucking" lazy>
                <div class="tab-content">
                  <TruckingTransport :trucking-transports="containerData.truckingTransports" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="仓库操作" name="warehouse" lazy>
                <div class="tab-content">
                  <WarehouseOperations :warehouse-operations="containerData.warehouseOperations" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="还空箱" name="emptyreturn" lazy>
                <div class="tab-content">
                  <EmptyReturn :empty-returns="containerData.emptyReturns" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="滞港费" name="demurrage" lazy>
                <div class="tab-content">
                  <div class="tab-header-row">
                    <el-button type="primary" link size="small" @click="demurrageRef?.load?.()">
                      刷新
                    </el-button>
                  </div>
                  <DemurrageDetailSection ref="demurrageRef" :container-number="containerNumber" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="变更日志" name="change-log" lazy>
                <div class="tab-content">
                  <ChangeLogTab :container-number="containerNumber" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="查验记录" name="inspection" lazy>
                <div class="tab-content">
                  <InspectionRecord :container-number="containerNumber" />
                </div>
              </el-tab-pane>
            </el-tabs>
          </el-card>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.container-detail-page {
  padding: $spacing-lg $spacing-md;
  position: relative;
  max-width: 1280px;
  margin: 0 auto;
  min-height: 100vh;
  background: $bg-page;

  @media (max-width: 768px) {
    padding: $spacing-sm;
  }
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
}

.overview-section {
  display: flex;
  flex-direction: column;
}

/* 概览：白底块 + 圆角，不靠多重描边分区；块与块之间用留白区分 */
.overview-panel {
  border-radius: $radius-large;
  background: #fff;
  padding: $spacing-md $spacing-lg;
  overflow: hidden;

  :deep(.el-card) {
    box-shadow: none !important;
    border: none;
    border-radius: 0;
    background: transparent;
  }

  :deep(.summary-card .el-card__body),
  :deep(.key-dates-card .el-card__body) {
    padding-top: $spacing-sm;
  }

  :deep(.summary-card .el-card__body) {
    padding-bottom: $spacing-lg;
  }

  :deep(.key-dates-card .el-card__body) {
    padding-bottom: $spacing-lg;
  }
}

.tabs-section {
  flex: 1;
}

.detail-card {
  border-radius: $radius-large;
  border: none;
  overflow: hidden;
  background: #fff;

  :deep(.el-card__body) {
    padding: $spacing-md $spacing-lg $spacing-lg;
  }

  .detail-tabs {
    :deep(.el-tabs__header) {
      margin: 0 0 $spacing-md 0;
      border-bottom: none;
    }

    :deep(.el-tabs__nav-wrap::after) {
      display: none;
    }

    :deep(.el-tabs__item) {
      font-size: $font-size-sm;
      font-weight: 500;
      color: $text-secondary;
    }

    :deep(.el-tabs__item.is-active) {
      color: $primary-color;
      font-weight: 600;
    }

    :deep(.el-tabs__active-bar) {
      background: $primary-color;
      height: 2px;
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
      padding-bottom: 0;
    }
  }
}
</style>
