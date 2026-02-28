<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  statusEvents: any[]
}>()

const emit = defineEmits<{
  'update:sortOrder': [value: 'asc' | 'desc']
}>()

const sortOrder = ref<'asc' | 'desc'>('desc')

const handleSortChange = (value: 'asc' | 'desc') => {
  sortOrder.value = value
  emit('update:sortOrder', value)
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

// 状态事件分组：左侧预计/计划时间，右侧实际时间
const groupedStatusEvents = computed(() => {
  if (!props.statusEvents || props.statusEvents.length === 0) {
    return []
  }

  const events = props.statusEvents

  // 分组逻辑：将预计/计划时间与实际时间配对
  const groups: any[] = []

  // 已处理的事件ID集合
  const processedIds = new Set<string>()

  // 第一轮：尝试配对预计和实际时间
  events.forEach((event: any) => {
    if (processedIds.has(event.id)) return

    const isPlanned = event.isEstimated || event.statusCode?.startsWith('E') || event.statusCode === 'ETA'

    if (isPlanned) {
      // 查找对应的实际时间（相同状态类型）
      const matchingActual = events.find((e: any) =>
        !processedIds.has(e.id) &&
        !e.isEstimated &&
        e.statusCode?.startsWith('A') &&
        e.statusCode === event.statusCode?.replace('E', 'A')
      )

      if (matchingActual) {
        const label = event.statusType === 'ETA' ? '到港' :
                      event.statusType === 'ATD' ? '出运' :
                      event.statusCode === 'ETA' ? '到港' :
                      event.locationNameCn || event.statusCode

        groups.push({
          label,
          planned: {
            timestamp: event.occurredAt,
            status: event.statusCode,
            description: event.description,
            isEstimated: true,
            dataSource: event.dataSource
          },
          actual: {
            timestamp: matchingActual.occurredAt,
            status: matchingActual.statusCode,
            description: matchingActual.description,
            isEstimated: false,
            dataSource: matchingActual.dataSource
          },
          timestamp: new Date(event.occurredAt).getTime()
        })
        processedIds.add(event.id)
        processedIds.add(matchingActual.id)
      }
    }
  })

  // 第二轮：处理未配对的事件
  events.forEach((event: any) => {
    if (processedIds.has(event.id)) return

    if (event.isEstimated) {
      const label = event.statusType === 'ETA' ? '到港' :
                    event.statusType === 'ATD' ? '出运' :
                    event.locationNameCn || event.statusCode

      groups.push({
        label,
        planned: {
          timestamp: event.occurredAt,
          status: event.statusCode,
          description: event.description,
          isEstimated: true,
          dataSource: event.dataSource
        },
        actual: null,
        timestamp: new Date(event.occurredAt).getTime()
      })
    } else {
      const label = event.statusType === 'ATA' ? '实际到港' :
                    event.statusType === 'PICKUP' ? '提柜' :
                    event.statusType === 'UNLOAD' ? '卸柜' :
                    event.statusType === 'RETURN' ? '还箱' :
                    event.locationNameCn || event.statusCode

      groups.push({
        label,
        planned: null,
        actual: {
          timestamp: event.occurredAt,
          status: event.statusCode,
          description: event.description,
          isEstimated: false,
          dataSource: event.dataSource
        },
        timestamp: new Date(event.occurredAt).getTime()
      })
    }
    processedIds.add(event.id)
  })

  // 按时间戳排序（根据选择升序或降序）
  return groups.sort((a, b) =>
    sortOrder.value === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
  )
})
</script>

<template>
  <div v-if="groupedStatusEvents.length > 0">
    <!-- 时间轴排序控制 -->
    <div class="timeline-sort-control">
      <span class="sort-label">排序方式：</span>
      <el-radio-group v-model="sortOrder" size="small" @change="handleSortChange">
        <el-radio-button value="asc">时间升序</el-radio-button>
        <el-radio-button value="desc">时间降序</el-radio-button>
      </el-radio-group>
    </div>

    <div class="status-timeline-horizontal">
      <!-- 完整的时间轴线 -->
      <div class="timeline-full-line"></div>

      <div
        v-for="(group, index) in groupedStatusEvents"
        :key="index"
        class="timeline-column"
      >
        <!-- 上方：预计/计划时间 -->
        <div class="timeline-section timeline-top">
          <div v-if="group.planned" class="timeline-event-card planned">
            <div class="event-header">
              <span class="event-label">{{ group.label }}</span>
              <el-tag size="small" type="warning">预计</el-tag>
            </div>
            <div class="event-time">{{ formatDate(group.planned.timestamp) }}</div>
            <div class="event-status">{{ group.planned.status }}</div>
            <div class="event-desc">{{ group.planned.description }}</div>
          </div>
          <div v-else class="timeline-placeholder"></div>
        </div>

        <!-- 中间：时间线节点 -->
        <div class="timeline-center">
          <div class="timeline-dot" :class="{ 'with-planned': !!group.planned, 'with-actual': !!group.actual }"></div>
        </div>

        <!-- 下方：实际时间 -->
        <div class="timeline-section timeline-bottom">
          <div v-if="group.actual" class="timeline-event-card actual">
            <div class="event-header">
              <span class="event-label">{{ group.label }}</span>
              <el-tag size="small" type="success">实际</el-tag>
            </div>
            <div class="event-time">{{ formatDate(group.actual.timestamp) }}</div>
            <div class="event-status">{{ group.actual.status }}</div>
            <div class="event-desc">{{ group.actual.description }}</div>
          </div>
          <div v-else class="timeline-placeholder"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

// 时间轴排序控件样式
.timeline-sort-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;

  .sort-label {
    font-size: 14px;
    color: $text-regular;
    font-weight: 500;
  }
}

// 状态事件时间线样式 - 横向布局
.status-timeline-horizontal {
  padding: 20px 0;
  position: relative;
  display: flex;
  align-items: center;

  // 完整的时间轴线
  .timeline-full-line {
    position: absolute;
    left: 90px;
    right: 90px;
    top: calc(50% - 8px);
    height: 2px;
    background: linear-gradient(90deg, #409eff 0%, #67c23a 100%);
    z-index: 1;
  }

  .timeline-column {
    display: inline-block;
    vertical-align: top;
    margin-right: 30px;
    min-width: 180px;
    position: relative;
    z-index: 2;

    &:last-child {
      margin-right: 0;
    }

    .timeline-section {
      min-height: 110px;
      display: flex;
      align-items: center;
      justify-content: center;

      &.timeline-top {
        justify-content: flex-end;
        padding-bottom: 20px;
      }

      &.timeline-bottom {
        padding-top: 20px;
      }
    }

    .timeline-center {
      display: flex;
      align-items: center;
      position: relative;
      justify-content: center;

      .timeline-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #409eff;
        border: 3px solid #fff;
        box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
        z-index: 2;
        flex-shrink: 0;
        transition: all 0.3s ease;

        &.with-planned {
          background: #e6a23c;
          box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2);
        }

        &.with-actual {
          background: #67c23a;
          box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
        }
      }
    }

    .timeline-event-card {
      background: #f5f7fa;
      border-radius: 8px;
      padding: 12px 14px;
      width: 100%;
      transition: all 0.3s ease;
      border-top: 4px solid #409eff;

      &.planned {
        border-top-color: $warning-color;
        background: #fdf6ec;

        &:hover {
          background: #fef0e6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(230, 162, 60, 0.2);
        }
      }

      &.actual {
        border-top-color: $success-color;
        background: #f0f9ff;

        &:hover {
          background: #e6f7ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(103, 194, 58, 0.2);
        }
      }

      .event-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        gap: 8px;

        .event-label {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
        }
      }

      .event-time {
        font-size: 13px;
        color: $primary-color;
        font-weight: 500;
        margin-bottom: 6px;
      }

      .event-status {
        font-size: 12px;
        color: $text-secondary;
        margin-bottom: 4px;
      }

      .event-desc {
        font-size: 12px;
        color: $text-regular;
        line-height: 1.4;
      }
    }

    .timeline-placeholder {
      width: 100%;
      min-height: 120px;
      height: 120px;
    }
  }
}
</style>
