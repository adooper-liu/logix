<template>
  <div class="time-prediction-tab">
    <div class="tab-header-row">
      <el-button type="primary" link size="small" @click="loadPrediction">
        刷新
      </el-button>
    </div>
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>
    <div v-else-if="prediction" class="prediction-content">
      <el-card class="prediction-card">
        <template #header>
          <div class="card-header">
            <span>时间预测</span>
            <el-tag :type="getPredictionStatusType(prediction.status)">
              {{ prediction.status }}
            </el-tag>
          </div>
        </template>
        <div class="prediction-details">
          <div class="detail-row">
            <span class="label">预计到港时间：</span>
            <span class="value">{{ formatDate(prediction.eta) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">预计提柜时间：</span>
            <span class="value">{{ formatDate(prediction.estimatedPickupTime) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">预计卸柜时间：</span>
            <span class="value">{{ formatDate(prediction.estimatedUnloadingTime) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">预计还箱时间：</span>
            <span class="value">{{ formatDate(prediction.estimatedReturnTime) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">预计完成时间：</span>
            <span class="value">{{ formatDate(prediction.estimatedCompletionTime) }}</span>
          </div>
          <div class="detail-row" v-if="prediction.confidence">
            <span class="label">预测置信度：</span>
            <span class="value">{{ (prediction.confidence * 100).toFixed(0) }}%</span>
          </div>
          <div class="detail-row" v-if="prediction.suggestions && prediction.suggestions.length > 0">
            <span class="label">建议：</span>
            <ul class="suggestions-list">
              <li v-for="(suggestion, index) in prediction.suggestions" :key="index">
                {{ suggestion }}
              </li>
            </ul>
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
import { ref, onMounted } from 'vue'
import { timeApi } from '@/services/time'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

interface Props {
  containerNumber: string
}

const props = defineProps<Props>()

const loading = ref(false)
const prediction = ref<any>(null)

const loadPrediction = async () => {
  if (!props.containerNumber) return
  
  loading.value = true
  try {
    const response = await timeApi.getPrediction(props.containerNumber)
    if (response.success) {
      prediction.value = response.data || null
    } else {
      ElMessage.error('获取时间预测信息失败')
    }
  } catch (error) {
    console.error('Failed to load time prediction:', error)
    ElMessage.error('获取时间预测信息失败')
  } finally {
    loading.value = false
  }
}

const formatDate = (date: string | Date | undefined): string => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

const getPredictionStatusType = (status: string): string => {
  const statusMap: Record<string, string> = {
    'PREDICTED': 'success',
    'UPDATED': 'info',
    'FAILED': 'danger'
  }
  return statusMap[status] || 'info'
}

onMounted(() => {
  loadPrediction()
})
</script>

<style scoped>
.time-prediction-tab {
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
        .detail-row {
          display: flex;
          margin-bottom: 12px;
          
          .label {
            min-width: 120px;
            color: #606266;
          }
          
          .value {
            color: #303133;
            font-weight: 500;
          }
        }
        
        .suggestions-list {
          margin: 0 0 0 120px;
          padding-left: 20px;
          
          li {
            margin-bottom: 4px;
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