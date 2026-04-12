<template>
  <div class="enhanced-timeline">
    <div class="timeline-header">
      <h3 class="timeline-title">物流时间线</h3>
      <div class="timeline-actions">
        <el-button size="small" @click="refreshPrediction">
          <el-icon><Refresh /></el-icon>
          刷新预测
        </el-button>
      </div>
    </div>
    <div class="timeline-content">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        加载中...
      </div>
      <div v-else-if="!prediction" class="empty">
        <el-icon><InfoFilled /></el-icon>
        <p>暂无时间预测数据</p>
      </div>
      <div v-else class="timeline">
        <div class="timeline-status">
          <el-tag :type="getStatusType(prediction.currentStatus)">
            {{ prediction.currentStatus }}
          </el-tag>
        </div>
        <el-timeline>
          <el-timeline-item
            v-for="(item, index) in timelineItems"
            :key="index"
            :timestamp="getItemTimestamp(item)"
            :type="getItemType(item)"
            :icon="getItemIcon(item)"
          >
            <div class="timeline-item-content">
              <h4>{{ item.title }}</h4>
              <div class="timeline-item-details">
                <div v-if="item.actualTime" class="time-info actual">
                  <span class="label">实际时间:</span>
                  <span class="value">{{ formatDate(item.actualTime) }}</span>
                </div>
                <div v-if="item.estimatedTime" class="time-info estimated">
                  <span class="label">预计时间:</span>
                  <span class="value">{{ formatDate(item.estimatedTime) }}</span>
                </div>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { timeApi } from '@/services/time'
import { Refresh, Loading, InfoFilled, Timer, Van, Box } from '@element-plus/icons-vue'
import { formatDateToLocal } from '@/utils/dateTimeUtils'

function formatDate(d: Date | string) {
  return formatDateToLocal(d, 'datetime')
}

const props = defineProps<{
  containerNumber: string
}>()

const prediction = ref<any>(null)
const loading = ref(false)

const timelineItems = computed(() => {
  if (!prediction.value) return []

  return [
    {
      title: '提柜',
      actualTime: prediction.value.actualTimes?.pickup,
      estimatedTime: prediction.value.estimatedTimes?.pickup,
      type: 'primary',
    },
    {
      title: '卸柜',
      actualTime: prediction.value.actualTimes?.unloading,
      estimatedTime: prediction.value.estimatedTimes?.unloading,
      type: 'warning',
    },
    {
      title: '还箱',
      actualTime: prediction.value.actualTimes?.return,
      estimatedTime: prediction.value.estimatedTimes?.return,
      type: 'success',
    },
    {
      title: '完成',
      actualTime: prediction.value.actualTimes?.return, // 完成时间与还箱时间相同
      estimatedTime: prediction.value.estimatedTimes?.completion,
      type: 'info',
    },
  ]
})

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    已还箱: 'success',
    已卸柜: 'info',
    已提柜: 'warning',
    已到港: 'primary',
    在途: 'primary',
    未知: 'info',
  }
  return statusMap[status] || 'info'
}

const getItemType = (item: any) => {
  if (item.actualTime) return item.type
  return 'info'
}

const getItemIcon = (item: any) => {
  const iconMap: Record<string, any> = {
    提柜: Van,
    卸柜: Box,
    还箱: Box,
    完成: Timer,
  }
  return iconMap[item.title] || Timer
}

const getItemTimestamp = (item: any) => {
  if (item.actualTime) {
    return formatDate(item.actualTime)
  } else if (item.estimatedTime) {
    return `预计: ${formatDate(item.estimatedTime)}`
  }
  return ''
}

const refreshPrediction = async () => {
  if (!props.containerNumber) return

  loading.value = true
  try {
    const response = await timeApi.getPrediction(props.containerNumber)
    prediction.value = response.data
  } catch (error) {
    console.error('获取时间预测失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听containerNumber变化，自动刷新预测
watch(
  () => props.containerNumber,
  newContainerNumber => {
    if (newContainerNumber) {
      refreshPrediction()
    }
  },
  { immediate: true }
)
</script>

<style scoped lang="scss">
@import '@/assets/styles/variables';

.enhanced-timeline {
  background: $bg-color;
  border-radius: $radius-base;
  box-shadow: $shadow-light;
  overflow: hidden;

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-md;
    border-bottom: 1px solid $border-light;

    .timeline-title {
      margin: 0;
      font-size: $font-size-lg;
      font-weight: 600;
      color: $text-primary;
    }
  }

  .timeline-content {
    padding: $spacing-md;

    .loading,
    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: $spacing-xl 0;
      color: $text-secondary;

      el-icon {
        font-size: 32px;
        margin-bottom: $spacing-md;
      }
    }

    .timeline {
      .timeline-status {
        margin-bottom: $spacing-md;

        el-tag {
          font-size: $font-size-base;
          padding: 6px 12px;
        }
      }

      .timeline-item-content {
        h4 {
          margin: 0 0 $spacing-sm 0;
          font-size: $font-size-base;
          font-weight: 600;
          color: $text-primary;
        }

        .timeline-item-details {
          display: flex;
          flex-direction: column;
          gap: $spacing-xs;

          .time-info {
            display: flex;
            align-items: center;
            font-size: $font-size-sm;

            .label {
              width: 70px;
              color: $text-secondary;
            }

            .value {
              color: $text-primary;
              font-weight: 500;
            }

            &.estimated {
              .value {
                color: $info-color;
              }
            }
          }
        }
      }
    }
  }
}
</style>
