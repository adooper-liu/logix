<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  containerData: any
}>()

// 获取目的港操作记录
const getDestinationPortOperation = () => {
  if (!props.containerData?.portOperations) return null
  return props.containerData.portOperations.find(
    (po: any) => po.portType === 'destination'
  )
}

// 格式化日期
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取日期的警示灯颜色
const getDateAlertColor = (date: Date): 'red' | 'orange' | 'green' => {
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return 'red'
  } else if (diffDays <= 3) {
    return 'orange'
  } else {
    return 'green'
  }
}

// 获取警示灯图标
const getAlertIcon = (color: 'red' | 'orange' | 'green'): string => {
  const icons = {
    red: '🔴',
    orange: '🟠',
    green: '🟢'
  }
  return icons[color]
}

// 获取日期状态文本
const getDateStatusText = (date: Date): string => {
  const now = new Date()
  if (now > date) {
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return '今天到期'
    if (diffDays === 1) return '已过期1天'
    return `已过期${diffDays}天`
  } else {
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return '今天到期'
    if (diffDays === 1) return '剩余1天'
    return `剩余${diffDays}天`
  }
}

// 计算时间条相关数据
const timelineData = computed(() => {
  if (!props.containerData) return []

  const seaFreight = Array.isArray(props.containerData.seaFreight)
    ? props.containerData.seaFreight[0]
    : props.containerData.seaFreight
  const portOp = getDestinationPortOperation()
  const trucking = props.containerData.truckingTransports?.[0]
  const emptyReturn = Array.isArray(props.containerData.emptyReturns)
    ? props.containerData.emptyReturns[0]
    : props.containerData.emptyReturn

  // 收集所有有值的日期
  const events: any[] = []

  // ETA (预计到港日期)
  const eta = seaFreight?.eta || portOp?.etaDestPort
  if (eta) {
    events.push({
      label: 'ETA',
      fullLabel: '预计到港',
      date: new Date(eta),
      type: 'primary',
      icon: '📅'
    })
  }

  // 修正ETA
  if (portOp?.etaCorrection) {
    events.push({
      label: '修正ETA',
      fullLabel: '修正预计到港',
      date: new Date(portOp.etaCorrection),
      type: 'warning',
      icon: '🔄'
    })
  }

  // 最晚提柜日
  if (trucking?.lastPickupDate) {
    events.push({
      label: '最晚提柜',
      fullLabel: '最晚提柜日',
      date: new Date(trucking.lastPickupDate),
      type: 'danger',
      icon: '⏰'
    })
  }

  // 最晚还箱日
  if (emptyReturn?.lastReturnDate) {
    events.push({
      label: '最晚还箱',
      fullLabel: '最晚还箱日',
      date: new Date(emptyReturn.lastReturnDate),
      type: 'success',
      icon: '📦'
    })
  }

  // 按日期排序
  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
})
</script>

<template>
  <el-card class="timeline-card" v-if="timelineData.length > 0">
    <template #header>
      <div class="card-header">
        <span class="title">
          📅 关键日期
        </span>
        <span class="subtitle">货柜重要时间节点</span>
      </div>
    </template>

    <div class="timeline-container">
      <div class="timeline-line"></div>
      <div class="timeline-events">
        <div
          v-for="(event, index) in timelineData"
          :key="index"
          class="timeline-event"
          :class="{
            'expired': new Date() > event.date,
            'today': Math.abs(new Date().getTime() - event.date.getTime()) < 24 * 60 * 60 * 1000
          }"
        >
          <div class="event-marker">
            <span class="event-icon">{{ event.icon }}</span>
          </div>
          <div class="event-content">
            <div class="event-header">
              <span class="event-label">{{ event.label }}</span>
              <span class="alert-light" :class="getDateAlertColor(event.date)">
                {{ getAlertIcon(getDateAlertColor(event.date)) }}
              </span>
            </div>
            <div class="event-date">{{ formatDate(event.date) }}</div>
            <div class="event-status">{{ getDateStatusText(event.date) }}</div>
            <div class="event-full-label">{{ event.fullLabel }}</div>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.timeline-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    align-items: center;
    gap: 15px;

    .title {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
    }

    .subtitle {
      font-size: 14px;
      color: $text-secondary;
    }
  }

  .timeline-container {
    position: relative;
    padding: 30px 20px;
    overflow-x: auto;

    .timeline-line {
      position: absolute;
      left: 50px;
      right: 50px;
      top: 54px;
      height: 3px;
      background: linear-gradient(90deg, #409eff 0%, #67c23a 50%, #f56c6c 100%);
      border-radius: 3px;
    }

    .timeline-events {
      display: flex;
      flex-direction: row;
      gap: 0;
      justify-content: space-between;
      align-items: flex-start;
      min-width: 100%;
    }

    .timeline-event {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      flex: 1;
      text-align: center;

      &.expired {
        .event-marker {
          background: #fef0f0;
          border-color: $danger-color;

          .event-icon {
            filter: grayscale(0.3);
          }
        }

        .event-content {
          opacity: 0.8;
        }
      }

      &.today {
        .event-marker {
          animation: pulse 2s infinite;
        }
      }

      .event-marker {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
        border: 4px solid #fff;
        box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        z-index: 2;
        margin: 0 0 10px 0;
        transition: all 0.3s ease;

        .event-icon {
          font-size: 22px;
          line-height: 1;
        }
      }

      .event-content {
        flex: none;
        padding: 10px 14px;
        background: #f5f7fa;
        border-radius: 8px;
        border-top: 3px solid #409eff;
        transition: all 0.3s ease;
        min-width: 140px;
        max-width: 180px;

        .event-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
          margin-bottom: 6px;

          .event-label {
            font-size: 14px;
            font-weight: 600;
            color: $text-primary;
          }

          .alert-light {
            font-size: 20px;
            line-height: 1;
            display: inline-block;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));

            &.red {
              animation: blink-red 1.5s ease-in-out infinite;
            }

            &.orange {
              animation: blink-orange 2s ease-in-out infinite;
            }

            &.green {
              animation: none;
            }
          }
        }

        .event-date {
          font-size: 13px;
          color: $primary-color;
          font-weight: 500;
          margin-bottom: 3px;
        }

        .event-status {
          font-size: 11px;
          color: $text-regular;
          margin-bottom: 3px;
          font-weight: 500;
        }

        .event-full-label {
          font-size: 11px;
          color: $text-secondary;
        }
      }

      &:hover {
        .event-marker {
          transform: scale(1.15);
          box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
        }

        .event-content {
          background: #ecf5ff;
          transform: translateY(-5px);
        }
      }
    }
  }
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(64, 158, 255, 0.6);
  }
}

@keyframes blink-red {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

@keyframes blink-orange {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(0.95);
  }
}
</style>
