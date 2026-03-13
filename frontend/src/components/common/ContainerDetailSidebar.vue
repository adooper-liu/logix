<template>
  <el-drawer
    v-model="visible"
    title="货柜详情"
    size="400px"
    direction="rtl"
    :before-close="handleClose"
  >
    <div v-if="container" class="detail-content">
      <!-- 基本信息 -->
      <div class="detail-section">
        <h3 class="section-title">基本信息</h3>
        <div class="info-row">
          <span class="label">集装箱号：</span>
          <span class="value">{{ container.containerNumber }}</span>
        </div>
        <div class="info-row">
          <span class="label">柜型：</span>
          <span class="value">{{ container.containerTypeCode || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="label">物流状态：</span>
          <el-tag :type="getStatusType(container.logisticsStatus)">
            {{ getStatusLabel(container.logisticsStatus) }}
          </el-tag>
        </div>
        <div class="info-row">
          <span class="label">目的港：</span>
          <span class="value">{{ container.destinationPort || '-' }}</span>
        </div>
      </div>

      <!-- 订单信息 -->
      <div class="detail-section">
        <h3 class="section-title">订单信息</h3>
        <div class="info-row">
          <span class="label">备货单号：</span>
          <span class="value">{{ container.orderNumber || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="label">提单号：</span>
          <span class="value">{{ container.billOfLadingNumber || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="label">销往国家：</span>
          <span class="value">{{ container.sellToCountry || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="label">客户名称：</span>
          <span class="value">{{ container.customerName || '-' }}</span>
        </div>
      </div>

      <!-- 海运信息 -->
      <div class="detail-section" v-if="container.seaFreight">
        <h3 class="section-title">海运信息</h3>
        <div class="info-row">
          <span class="label">船名：</span>
          <span class="value">{{ container.seaFreight.vesselName || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="label">航次：</span>
          <span class="value">{{ container.seaFreight.voyageNumber || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="label">起运港：</span>
          <span class="value">{{ container.seaFreight.portOfLoading || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="label">预计到港：</span>
          <span class="value">{{ formatDate(container.seaFreight.eta) }}</span>
        </div>
      </div>

      <!-- 关键日期 -->
      <div class="detail-section">
        <h3 class="section-title">关键日期</h3>
        <div class="info-row">
          <span class="label">预计到港日：</span>
          <span class="value">{{ formatDate(container.etaDestPort) }}</span>
        </div>
        <div class="info-row">
          <span class="label">实际到港日：</span>
          <span class="value highlight">
            {{ formatDate(container.ataDestPort) }}
          </span>
        </div>
        <div class="info-row">
          <span class="label">计划提柜日：</span>
          <span class="value">{{ formatDate(container.plannedPickupDate) }}</span>
        </div>
        <div class="info-row">
          <span class="label">最晚提柜日：</span>
          <span class="value warning">
            {{ formatDate(container.lastFreeDate) }}
          </span>
        </div>
        <div class="info-row">
          <span class="label">最晚还箱日：</span>
          <span class="value">{{ formatDate(container.lastReturnDate) }}</span>
        </div>
        <div class="info-row">
          <span class="label">实际还箱日：</span>
          <span class="value">{{ formatDate(container.returnTime) }}</span>
        </div>
      </div>

      <!-- 备注 -->
      <div class="detail-section" v-if="container.remarks">
        <h3 class="section-title">备注</h3>
        <div class="info-text">{{ container.remarks }}</div>
      </div>

      <!-- 操作按钮 -->
      <div class="detail-actions">
        <el-button type="primary" @click="handleViewDetail">
          查看完整详情
        </el-button>
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Container } from '@/types/container'
import dayjs from 'dayjs'

interface Props {
  visible: boolean
  container: Container | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

// 格式化日期
const formatDate = (date?: string | Date): string => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 获取状态类型
const getStatusType = (status?: string): string => {
  const statusMap: Record<string, string> = {
    not_shipped: 'info',
    shipped: 'primary',
    in_transit: 'primary',
    at_port: 'warning',
    picked_up: 'success',
    unloaded: 'success',
    returned_empty: 'info',
  }
  return statusMap[status?.toLowerCase() || ''] || 'info'
}

// 获取状态标签
const getStatusLabel = (status?: string): string => {
  const statusMap: Record<string, string> = {
    not_shipped: '未出运',
    shipped: '已出运',
    in_transit: '在途',
    at_port: '已到港',
    picked_up: '已提柜',
    unloaded: '已卸柜',
    returned_empty: '已还箱',
  }
  return statusMap[status?.toLowerCase() || ''] || status || '未知'
}

// 查看完整详情 - 在新窗口打开
const handleViewDetail = () => {
  if (props.container) {
    const url = router.resolve({
      name: 'ContainerDetail',
      params: { containerNumber: props.container.containerNumber },
    })
    window.open(url.href, '_blank')
    handleClose() // 关闭侧边栏
  }
}

// 关闭侧边栏
const handleClose = () => {
  emit('update:visible', false)
}
</script>

<style scoped>
.detail-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.detail-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.detail-section:last-child {
  border-bottom: none;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 12px 0;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}

.info-row .label {
  color: #909399;
  min-width: 100px;
  flex-shrink: 0;
}

.info-row .value {
  color: #303133;
  flex: 1;
  word-break: break-all;
}

.info-row .value.highlight {
  color: #409eff;
  font-weight: 500;
}

.info-row .value.warning {
  color: #e6a23c;
  font-weight: 500;
}

.info-text {
  color: #606266;
  font-size: 14px;
  line-height: 1.6;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.detail-actions {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

::v-deep(.el-tag) {
  margin-left: auto;
}
</style>
