<script setup lang="ts">
import { computed } from 'vue'
import { Timer, Warning, CircleCheck } from '@element-plus/icons-vue'

interface FilterItem {
  label: string
  count: number
  color: string
  days: string
}

interface CountdownData {
  count: number
  urgent: number
  expired: number
  filterItems?: FilterItem[]
}

interface Props {
  title: string
  data: CountdownData
  label?: string
  subtitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '待处理货柜',
  subtitle: ''
})

const emit = defineEmits<{
  'filter': [filterType: string, days: string]
}>()

// 获取倒计时卡片样式
const cardStyle = computed(() => {
  if (props.data.expired > 0) {
    return { type: 'danger' as const, icon: Warning, color: '#f56c6c' }
  }
  if (props.data.urgent > 0) {
    return { type: 'warning' as const, icon: Timer, color: '#e6a23c' }
  }
  return { type: 'success' as const, icon: CircleCheck, color: '#67c23a' }
})

// 获取倒计时卡片状态文本
const statusText = computed(() => {
  if (props.data.expired > 0) return `${props.data.expired}个已超时`
  if (props.data.urgent > 0) return `${props.data.urgent}个即将到期`
  return '正常'
})

// 处理筛选项点击
const handleFilterClick = (days: string) => {
  emit('filter', props.title, days)
}

// 是否有过滤项
const hasFilterItems = computed(() => {
  return props.data.filterItems && props.data.filterItems.length > 0
})

// 计算汇总总数（所有filterItems的count之和）
const totalCount = computed(() => {
  if (!props.data.filterItems) return 0
  return props.data.filterItems.reduce((sum, item) => sum + item.count, 0)
})
</script>

<template>
  <div class="countdown-card" :style="{ borderLeftColor: cardStyle.color }">
    <div class="card-header">
      <div class="header-left">
        <el-icon :color="cardStyle.color" :size="24">
          <component :is="cardStyle.icon" />
        </el-icon>
        <div class="title-wrapper">
          <span class="card-title">{{ title }}</span>
          <span v-if="subtitle" class="card-subtitle">{{ subtitle }}</span>
        </div>
      </div>
      <div v-if="hasFilterItems" class="card-summary">
        <span class="summary-label">合计</span>
        <span class="summary-count">{{ totalCount }}</span>
      </div>
    </div>

    <!-- 如果有过滤项，显示标签形式的过滤项 -->
    <div v-if="hasFilterItems" class="filter-items">
      <div
        v-for="(item, index) in data.filterItems"
        :key="index"
        class="filter-tag"
        :class="{ 'clickable': item.count > 0 }"
        :style="{ 
          backgroundColor: item.count > 0 ? item.color + '15' : '#f5f7fa',
          borderColor: item.count > 0 ? item.color : '#dcdfe6',
          color: item.count > 0 ? item.color : '#909399'
        }"
        @click="item.count > 0 && handleFilterClick(item.days)"
      >
        <span class="tag-label">{{ item.label }}</span>
        <span class="tag-count">{{ item.count }}</span>
      </div>
    </div>

    <!-- 否则显示原有的单卡片样式 -->
    <div v-else class="card-content">
      <div class="card-value">{{ data.count }}</div>
      <div class="card-label">{{ label }}</div>
    </div>

    <div v-if="!hasFilterItems" class="card-footer">
      <el-tag
        :type="cardStyle.type"
        size="small"
      >
        {{ statusText }}
      </el-tag>
    </div>
  </div>
</template>

<style scoped lang="scss">
.countdown-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  border-left: 3px solid;
  transition: all 0.3s ease;
  min-height: auto;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-wrapper {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
    }

    .card-subtitle {
      font-size: 10px;
      color: #909399;
      font-weight: 400;
    }

    .card-summary {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      background: #f0f9ff;
      border-radius: 10px;

      .summary-label {
        font-size: 11px;
        color: #909399;
      }

      .summary-count {
        font-size: 14px;
        font-weight: 700;
        color: #409eff;
      }
    }
  }

  .filter-items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-content: flex-start;

    .filter-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid;
      font-size: 12px;
      transition: all 0.2s ease;
      cursor: default;

      &.clickable {
        cursor: pointer;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      }

      .tag-label {
        font-weight: 500;
      }

      .tag-count {
        font-weight: 700;
        font-size: 13px;
        min-width: 16px;
        text-align: center;
      }
    }
  }

  .card-content {
    margin-bottom: 15px;

    .card-value {
      font-size: 36px;
      font-weight: 700;
      color: #303133;
      line-height: 1;
    }

    .card-label {
      font-size: 13px;
      color: #909399;
      margin-top: 5px;
    }
  }

  .card-footer {
    display: flex;
    align-items: center;
  }
}

@media (max-width: 768px) {
  .countdown-card {
    padding: 10px;

    .filter-items {
      .filter-tag {
        font-size: 11px !important;
        padding: 3px 6px !important;
      }
    }

    .card-value {
      font-size: 28px !important;
    }

    .card-title {
      font-size: 13px !important;
    }
  }
}
</style>
