<script setup lang="ts">
import { computed } from 'vue'
import { Timer, Warning, CircleCheck } from '@element-plus/icons-vue'

interface CountdownData {
  count: number
  urgent: number
  expired: number
}

interface Props {
  title: string
  data: CountdownData
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: '待处理货柜'
})

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
</script>

<template>
  <div
    class="countdown-card"
    :style="{ borderLeftColor: cardStyle.color }"
  >
    <div class="card-header">
      <el-icon :color="cardStyle.color" :size="24">
        <component :is="cardStyle.icon" />
      </el-icon>
      <span class="card-title">{{ title }}</span>
    </div>
    <div class="card-content">
      <div class="card-value">{{ data.count }}</div>
      <div class="card-label">{{ label }}</div>
    </div>
    <div class="card-footer">
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
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;

    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
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
    padding: 15px;

    .card-value {
      font-size: 28px !important;
    }

    .card-title {
      font-size: 14px !important;
    }
  }
}
</style>
