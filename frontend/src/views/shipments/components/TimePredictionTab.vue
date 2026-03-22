<template>
  <div class="time-prediction-tab">
    <div class="tab-header-row">
      <el-button type="primary" link size="small" @click="loadPrediction">
        刷新
      </el-button>
    </div>
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>
    <div v-else-if="prediction" class="prediction-content">
      <el-card class="prediction-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>时间预测</span>
            <el-tag :type="getPredictionStatusType(prediction.currentStatus)">
              {{ prediction.currentStatus || '—' }}
            </el-tag>
          </div>
        </template>
        <div class="prediction-details">
          <div class="section-title">港口与在途</div>
          <div class="detail-row">
            <span class="label">目的港 ETA</span>
            <span class="value">{{ formatDate(prediction.eta) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">目的港 ATA</span>
            <span class="value">{{ formatDate(prediction.ata) }}</span>
          </div>

          <div class="section-title">预计节点</div>
          <div class="detail-row">
            <span class="label">预计提柜</span>
            <span class="value">{{ formatDate(prediction.estimatedTimes?.pickup) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">预计卸柜</span>
            <span class="value">{{ formatDate(prediction.estimatedTimes?.unloading) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">预计还箱</span>
            <span class="value">{{ formatDate(prediction.estimatedTimes?.return) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">预计流程完成</span>
            <span class="value">{{ formatDate(prediction.estimatedTimes?.completion) }}</span>
          </div>

          <div class="section-title">实际节点（已有则显示）</div>
          <div class="detail-row">
            <span class="label">实际提柜</span>
            <span class="value">{{ formatDate(prediction.actualTimes?.pickup) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">实际卸柜</span>
            <span class="value">{{ formatDate(prediction.actualTimes?.unloading) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">实际还箱</span>
            <span class="value">{{ formatDate(prediction.actualTimes?.return) }}</span>
          </div>
        </div>
      </el-card>
    </div>
    <div v-else class="empty-prediction">
      <el-empty description="暂无时间预测信息" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { timeApi } from '@/services/time'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

interface Props {
  containerNumber: string
}

const props = defineProps<Props>()

/** 与后端 timeService.getContainerTimePrediction 返回一致 */
interface TimePredictionPayload {
  containerNumber: string
  currentStatus?: string
  eta?: string | Date | null
  ata?: string | Date | null
  estimatedTimes?: {
    pickup?: string | Date | null
    unloading?: string | Date | null
    return?: string | Date | null
    completion?: string | Date | null
  }
  actualTimes?: {
    pickup?: string | Date | null
    unloading?: string | Date | null
    return?: string | Date | null
  }
}

const loading = ref(false)
const prediction = ref<TimePredictionPayload | null>(null)

function isTimePayload(v: unknown): v is TimePredictionPayload {
  return (
    v !== null &&
    typeof v === 'object' &&
    'containerNumber' in v &&
    typeof (v as TimePredictionPayload).containerNumber === 'string'
  )
}

const loadPrediction = async () => {
  if (!props.containerNumber?.trim()) return

  loading.value = true
  try {
    const raw = await timeApi.getPrediction(props.containerNumber)
    if (raw && typeof raw === 'object' && 'success' in raw && (raw as { success?: boolean }).success === false) {
      ElMessage.error('获取时间预测信息失败')
      prediction.value = null
      return
    }
    if (isTimePayload(raw)) {
      prediction.value = raw
      return
    }
    const wrapped = raw as { data?: unknown; success?: boolean }
    if (wrapped?.data && isTimePayload(wrapped.data)) {
      prediction.value = wrapped.data
      return
    }
    prediction.value = null
  } catch {
    prediction.value = null
  } finally {
    loading.value = false
  }
}

const formatDate = (date: string | Date | null | undefined): string => {
  if (date === null || date === undefined) return '—'
  const d = dayjs(date)
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm') : '—'
}

/** 当前状态为中文短语时的标签类型 */
const getPredictionStatusType = (status: string | undefined): string => {
  if (!status) return 'info'
  if (status.includes('已还箱') || status.includes('已卸柜') || status.includes('已提柜')) return 'success'
  if (status.includes('到港')) return 'success'
  if (status.includes('在途')) return 'warning'
  if (status.includes('未知')) return 'info'
  return 'primary'
}

watch(
  () => props.containerNumber,
  (cn, prev) => {
    if (cn && cn !== prev) loadPrediction()
  }
)

onMounted(() => {
  loadPrediction()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.time-prediction-tab {
  .tab-header-row {
    margin-bottom: 8px;
  }

  .loading-container {
    padding: 20px 0;
  }

  .prediction-content {
    .prediction-card {
      margin-bottom: 20px;

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .prediction-details {
        .section-title {
          font-size: $font-size-xs;
          font-weight: 600;
          color: $text-secondary;
          margin: 12px 0 8px;

          &:first-child {
            margin-top: 0;
          }
        }

        .detail-row {
          display: flex;
          margin-bottom: 10px;
          align-items: flex-start;

          .label {
            min-width: 112px;
            flex-shrink: 0;
            color: $text-secondary;
            font-size: $font-size-sm;
          }

          .value {
            color: $text-primary;
            font-weight: 500;
            font-size: $font-size-sm;
            font-variant-numeric: tabular-nums;
          }
        }
      }
    }
  }

  .empty-prediction {
    padding: 40px 0;
    text-align: center;
  }
}
</style>
