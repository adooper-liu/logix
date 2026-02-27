<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { containerService } from '@/services/container'
import { ElMessage } from 'element-plus'
import ContainerHeader from './components/ContainerHeader.vue'
import ContainerSummary from './components/ContainerSummary.vue'
import KeyDatesTimeline from './components/KeyDatesTimeline.vue'
import StatusEventsTimeline from './components/StatusEventsTimeline.vue'
import SeaFreightInfo from './components/SeaFreightInfo.vue'
import PortOperations from './components/PortOperations.vue'
import TruckingTransport from './components/TruckingTransport.vue'
import WarehouseOperations from './components/WarehouseOperations.vue'
import EmptyReturn from './components/EmptyReturn.vue'

const route = useRoute()
const containerNumber = computed(() => route.params.containerNumber as string)

// 数据加载
const loading = ref(false)
const containerData = ref<any>(null)
const activeTab = ref('order')

// 加载货柜详情
const loadContainerDetail = async () => {
  loading.value = true
  try {
    const response = await containerService.getContainerById(containerNumber.value)
    if (response.success) {
      containerData.value = response.data
    } else {
      ElMessage.error('获取货柜详情失败')
    }
  } catch (error) {
    console.error('Failed to load container details:', error)
    ElMessage.error('获取货柜详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadContainerDetail()
})

// 计算属性：目的港操作信息
const destinationPortOperation = computed(() => {
  if (!containerData.value?.portOperations) return null
  return containerData.value.portOperations.find(
    (po: any) => po.portType === 'destination'
  )
})
</script>

<template>
  <div class="container-detail-page" v-loading="loading">
    <!-- 物流状态水印标记 -->
    <div v-if="containerData" class="logistics-status-watermark">
      <div class="watermark-badge" :class="containerData.logisticsStatus || 'info'">
        <div class="watermark-text">{{ containerData.logisticsStatus }}</div>
      </div>
    </div>

    <!-- 页面头部 -->
    <ContainerHeader
      :container-number="containerNumber"
      :loading="loading"
      @refresh="loadContainerDetail"
    />

    <!-- 内容区域 -->
    <div v-if="containerData">
      <!-- 货柜基本信息卡片 -->
      <ContainerSummary :container-data="containerData" />

      <!-- 关键日期时间条 -->
      <KeyDatesTimeline :container-data="containerData" />

      <!-- 多页签详情 -->
      <el-card class="detail-card">
        <el-tabs v-model="activeTab">
          <!-- 货柜信息页签 -->
          <el-tab-pane label="货柜信息" name="info">
            <div class="tab-content">
              <h3>货柜信息</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="集装箱号">{{ containerData.containerNumber }}</el-descriptions-item>
                <el-descriptions-item label="备货单号">
                  {{ containerData.orderNumber || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="柜型">{{ containerData.containerTypeCode }}</el-descriptions-item>
                <el-descriptions-item label="封条号">{{ containerData.sealNumber || '-' }}</el-descriptions-item>
                <el-descriptions-item label="危险品等级">{{ containerData.dangerClass || '-' }}</el-descriptions-item>
                <el-descriptions-item label="箱皮重">{{ containerData.tareWeight || '-' }} KG</el-descriptions-item>
                <el-descriptions-item label="箱总重">{{ containerData.totalWeight || '-' }} KG</el-descriptions-item>
                <el-descriptions-item label="超限长度">{{ containerData.overLength || '-' }} m</el-descriptions-item>
                <el-descriptions-item label="超高">{{ containerData.overHeight || '-' }} m</el-descriptions-item>
                <el-descriptions-item label="货物描述" :span="2">{{ containerData.cargoDescription || '-' }}</el-descriptions-item>
                <el-descriptions-item label="备注" :span="2">{{ containerData.remarks || '-' }}</el-descriptions-item>
              </el-descriptions>

              <h3>货物汇总信息（多个备货单合计）</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="毛重合计">{{ containerData.grossWeight || '-' }} KG</el-descriptions-item>
                <el-descriptions-item label="体积合计">{{ containerData.cbm || '-' }} CBM</el-descriptions-item>
                <el-descriptions-item label="箱数合计">{{ containerData.packages || '-' }}</el-descriptions-item>
                <el-descriptions-item label="出运总价">${{ containerData.shipmentTotalValue || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>

          <!-- 状态事件页签 -->
          <el-tab-pane label="状态事件" name="events">
            <div class="tab-content">
              <StatusEventsTimeline
                v-if="containerData.statusEvents"
                :status-events="containerData.statusEvents"
              />
              <el-empty v-else description="暂无状态事件记录" />
            </div>
          </el-tab-pane>

          <!-- 其他页签保持原样，可以继续拆分 -->
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
        </el-tabs>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.container-detail-page {
  padding: 20px;
  position: relative;
}

// 物流状态水印标记
.logistics-status-watermark {
  position: fixed;
  top: 45px;
  right: 120px;
  z-index: 9999;
  padding: 10px;
  pointer-events: none;

  .watermark-badge {
    position: relative;
    width: 150px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    opacity: 0.4;
    transform: rotate(-45deg);
    transition: all 0.3s ease;

    &.success {
      background: linear-gradient(135deg, #67C23A 0%, #85CE61 100%);
    }

    &.warning {
      background: linear-gradient(135deg, #E6A23C 0%, #F0AD4E 100%);
    }

    &.danger {
      background: linear-gradient(135deg, #F56C6C 0%, #FF6B6B 100%);
    }

    &.info {
      background: linear-gradient(135deg, #909399 0%, #A0A4A9 100%);
    }

    .watermark-text {
      color: white;
      font-size: 16px;
      font-weight: 700;
      text-align: center;
      line-height: 1.3;
      padding: 10px;
      letter-spacing: 1px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    &:hover {
      opacity: 0.6;
      transform: rotate(0deg) scale(1.1);
    }
  }
}

// 调整页面头部，避免被水印遮挡
.page-header {
  position: relative;
  z-index: 100;
}

.detail-card {
  .tab-content {
    h3 {
      font-size: 16px;
      color: #303133;
      margin: 0 0 16px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #EBEEF5;
    }
  }
}

.info-item {
  margin-bottom: 30px;
  padding: 15px;
  background: #F5F7FA;
  border-radius: 4px;

  &:last-child {
    margin-bottom: 0;
  }
}
</style>
