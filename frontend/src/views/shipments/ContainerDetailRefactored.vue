<script setup lang="ts">
import DemurrageDetailSection from '@/components/demurrage/DemurrageDetailSection.vue'
import { ElMessage } from 'element-plus'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useContainerDetail } from '@/composables/useContainerDetail'
import { useShipmentsExport } from '@/composables/useShipmentsExport'
import ContainerDetailSkeleton from '@/components/common/ContainerDetailSkeleton.vue'
import ChangeLogTab from './components/ChangeLogTab.vue'
import ContainerHeader from './components/ContainerHeader.vue'
import ContainerInfo from './components/ContainerInfo.vue'
import ContainerSummary from './components/ContainerSummary.vue'
import EmptyReturn from './components/EmptyReturn.vue'
import FiveNodeTimeline from './components/FiveNodeTimeline.vue'
import InspectionRecord from './components/InspectionRecord.vue'
import KeyDatesTimeline from './components/KeyDatesTimeline.vue'
import LogisticsPathTab from './components/LogisticsPathTab.vue'
import PortOperations from './components/PortOperations.vue'
import ScheduleEditDialog from './components/ScheduleEditDialog.vue'
import SeaFreightInfo from './components/SeaFreightInfo.vue'
import TruckingTransport from './components/TruckingTransport.vue'
import WarehouseOperations from './components/WarehouseOperations.vue'
import AlertTab from './components/AlertTab.vue'
import TimePredictionTab from './components/TimePredictionTab.vue'
import RiskCardTab from './components/RiskCardTab.vue'

const route = useRoute()
const router = useRouter()
const demurrageRef = ref<{ load: () => Promise<void> } | null>(null)
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
  fiveNodeData,
  containerList,
  loadingContainerList,
  currentContainerIndex,
  logisticsStatusDisplay,
  destinationPortOperation,
  loadContainerDetail,
  navigateToPrevious,
  navigateToNext
} = useContainerDetail()

// 使用导出功能
const { handleExportContainerDetail } = useShipmentsExport()

// 使用 i18n
const { t } = useI18n()

// 导出货柜详情
const exportContainerDetail = () => {
  if (containerData.value) {
    handleExportContainerDetail(containerData.value)
  }
}

onMounted(() => {
  loadContainerDetail()
})

// 根据路由 query.tab 打开对应页签（如从高费用货柜卡片跳转时打开滞港费页签）
watch(
  () => route.query.tab,
  tab => {
    if (tab === 'demurrage') activeTab.value = 'demurrage'
    else if (tab === 'logistics-path') activeTab.value = 'logistics-path'
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
      <!-- 物流状态标签（右上角） -->
      <div v-if="containerData" class="logistics-status-badge" :class="logisticsStatusDisplay.type">
        <span class="badge-dot"></span>
        <span class="badge-text">{{ logisticsStatusDisplay.text }}</span>
      </div>

      <!-- 页面头部 -->
      <ContainerHeader
        :container-number="containerNumber"
        :loading="loading"
        :current-container-index="currentContainerIndex"
        :container-list-length="containerList.length"
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
          plannedCustomsDate: containerData?.portOperations?.find((p: any) => p.portType === 'destination')?.plannedCustomsDate,
          plannedPickupDate: containerData?.truckingTransports?.[0]?.plannedPickupDate,
          plannedDeliveryDate: containerData?.truckingTransports?.[0]?.plannedDeliveryDate,
          plannedUnloadDate: containerData?.warehouseOperations?.[0]?.plannedUnloadDate,
          plannedReturnDate: containerData?.emptyReturns?.[0]?.plannedReturnDate,
          truckingCompanyId: containerData?.truckingTransports?.[0]?.truckingCompanyId,
          customsBrokerCode: containerData?.portOperations?.find((p: any) => p.portType === 'destination')?.customsBrokerCode,
          warehouseId: containerData?.warehouseOperations?.[0]?.warehouseId,
          unloadModePlan: containerData?.truckingTransports?.[0]?.unloadModePlan
        }"
        @success="loadContainerDetail"
      />

      <!-- 内容区域 -->
      <div v-if="containerData" class="detail-content">
        <!-- 概览区：基本信息 + 关键日期 + 五节点时间线 -->
        <section class="overview-section">
          <ContainerSummary
            :container-data="containerData"
            :demurrage-calculation="demurrageCalculation"
            @open-demurrage-tab="activeTab = 'demurrage'"
          />
          <KeyDatesTimeline :container-data="containerData" :calculation-dates="calculationDates" />
          <FiveNodeTimeline
            :container-data="containerData"
            :demurrage-calculation="demurrageCalculation"
            :five-node-data="fiveNodeData"
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
                    :bill-of-lading-number="
                      (() => {
                        const sf = Array.isArray(containerData?.seaFreight)
                          ? containerData?.seaFreight?.[0]
                          : containerData?.seaFreight
                        return sf?.mblNumber || sf?.billOfLadingNumber || ''
                      })()
                    "
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
              <el-tab-pane label="查验记录" name="inspection">
                <div class="tab-content">
                  <InspectionRecord :container-number="containerNumber" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="预警" name="alert">
                <div class="tab-content">
                  <AlertTab :container-number="containerNumber" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="时间预测" name="time-prediction">
                <div class="tab-content">
                  <TimePredictionTab :container-number="containerNumber" />
                </div>
              </el-tab-pane>
              <el-tab-pane label="风险评估" name="risk">
                <div class="tab-content">
                  <RiskCardTab :container-number="containerNumber" />
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
  padding: $spacing-md;
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: $spacing-sm;
  }
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: $spacing-md;
}

.navigation-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.overview-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
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
    .badge-dot {
      background: #fff;
    }
  }

  &.warning {
    background: linear-gradient(135deg, rgba($warning-color, 0.95) 0%, $warning-color 100%);
    color: #fff;
    .badge-dot {
      background: #fff;
    }
  }

  &.danger {
    background: linear-gradient(135deg, rgba($danger-color, 0.95) 0%, $danger-color 100%);
    color: #fff;
    .badge-dot {
      background: #fff;
    }
  }

  &.info {
    background: linear-gradient(135deg, rgba($info-color, 0.95) 0%, $info-color 100%);
    color: #fff;
    .badge-dot {
      background: #fff;
    }
  }
}

@keyframes badge-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
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
