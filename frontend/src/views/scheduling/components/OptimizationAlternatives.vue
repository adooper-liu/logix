<template>
  <div class="optimization-alternatives">
    <!-- ✅ 调试信息（已禁用） -->
    <!-- <div v-if="true" style="background: yellow; padding: 10px; color: black;">
      Debug: alternatives.length = {{ alternatives.length }}
      <pre>{{ JSON.stringify(alternatives, null, 2) }}</pre>
    </div> -->
    
    <div class="alternatives-header">
      <h3>💡 为您推荐以下最优方案</h3>
      <p class="subtitle">基于成本智能分析，为您精选前 3 个最优方案</p>
    </div>

    <div class="alternatives-cards" v-if="alternatives && alternatives.length > 0">
      <div
        v-for="(alt, index) in alternatives"
        :key="index"
        :class="['alternative-card', `card-${index + 1}`]"
        @click="selectAlternative(index)"
      >
        <!-- 排名徽章 -->
        <div class="rank-badge">
          <span v-if="index === 0" class="rank-icon">🥇</span>
          <span v-else-if="index === 1" class="rank-icon">🥈</span>
          <span v-else-if="index === 2" class="rank-icon">🥉</span>
          <span v-else class="rank-text">#{{ index + 1 }}</span>
        </div>

        <!-- 方案信息 -->
        <div class="card-content">
          <div class="info-row">
            <span class="label">提柜日</span>
            <span class="value date">{{ formatDate(alt.pickupDate) }}</span>
          </div>

          <div class="info-row">
            <span class="label">策略</span>
            <el-tag :type="getStrategyType(alt.strategy)" size="small">
              {{ alt.strategy }}
            </el-tag>
          </div>

          <div class="info-row">
            <span class="label">总成本</span>
            <span class="value cost">${{ formatNumber(alt.totalCost) }}</span>
          </div>

          <div class="info-row savings">
            <span class="label">预计节省</span>
            <span class="value savings-amount">💰 ${{ formatNumber(alt.savings) }}</span>
          </div>

          <div v-if="alt.warehouseCode" class="info-row">
            <span class="label">仓库</span>
            <span class="value">{{ alt.warehouseCode }}</span>
          </div>

          <div v-if="alt.truckingCompanyCode" class="info-row">
            <span class="label">车队</span>
            <span class="value">{{ alt.truckingCompanyCode }}</span>
          </div>
        </div>

        <!-- 选择指示器 -->
        <div v-if="selectedIndex === index" class="selected-indicator">
          <el-icon color="#67C23A"><CircleCheck /></el-icon>
          <span>已选择</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="alternatives-actions">
      <el-button @click="handleRejectAll" :disabled="loading">全部拒绝</el-button>
      <el-button
        type="primary"
        @click="handleAcceptAll"
        :loading="loading"
        :disabled="selectedIndex === -1"
      >
        应用选中方案
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CircleCheck } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

interface Alternative {
  containerNumber: string
  pickupDate: string
  strategy: 'Direct' | 'Drop off' | 'Expedited'
  totalCost: number
  savings: number
  warehouseCode?: string
  truckingCompanyCode?: string
}

const props = defineProps<{
  alternatives: Alternative[]
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [index: number, alternative: Alternative]
  acceptAll: []
  rejectAll: []
}>()

const selectedIndex = ref<number>(-1)

// 格式化日期
const formatDate = (dateStr: string): string => {
  return dayjs(dateStr).format('YYYY-MM-DD')
}

// 格式化数字
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// 获取策略类型
const getStrategyType = (strategy: string): string => {
  switch (strategy) {
    case 'Direct':
      return 'success'
    case 'Drop off':
      return 'warning'
    case 'Expedited':
      return 'danger'
    default:
      return 'info'
  }
}

// 选择方案
const selectAlternative = (index: number) => {
  selectedIndex.value = index
  const alternative = props.alternatives[index]
  emit('select', index, alternative)
}

// 接受所有
const handleAcceptAll = () => {
  if (selectedIndex.value === -1) {
    return
  }
  emit('acceptAll')
}

// 拒绝所有
const handleRejectAll = () => {
  emit('rejectAll')
}
</script>

<style scoped>
.optimization-alternatives {
  padding: 20px;
}

.alternatives-header {
  text-align: center;
  margin-bottom: 30px;

  h3 {
    font-size: 20px;
    color: #303133;
    margin: 0 0 8px 0;
    font-weight: 600;
  }

  .subtitle {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

.alternatives-cards {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 30px;
}

.alternative-card {
  position: relative;
  width: 220px;
  padding: 20px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 3px solid transparent;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  &.card-1 {
    border-color: #FFD700;
    background: linear-gradient(135deg, #FFF9E6 0%, #FFF 100%);

    .rank-badge {
      background: linear-gradient(135deg, #FFD700, #FFA500);
    }
  }

  &.card-2 {
    border-color: #C0C0C0;
    background: linear-gradient(135deg, #F5F5F5 0%, #FFF 100%);

    .rank-badge {
      background: linear-gradient(135deg, #C0C0C0, #A8A8A8);
    }
  }

  &.card-3 {
    border-color: #CD7F32;
    background: linear-gradient(135deg, #FFF5EB 0%, #FFF 100%);

    .rank-badge {
      background: linear-gradient(135deg, #CD7F32, #B87333);
    }
  }
}

.rank-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

  .rank-icon {
    font-size: 28px;
  }

  .rank-text {
    font-size: 18px;
    font-weight: bold;
    color: #fff;
  }
}

.card-content {
  margin-top: 20px;

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .label {
      font-size: 13px;
      color: #909399;
    }

    .value {
      font-size: 14px;
      font-weight: 500;

      &.date {
        color: #303133;
        font-weight: 600;
      }

      &.cost {
        color: #E6A23C;
        font-size: 18px;
        font-weight: bold;
      }

      &.savings-amount {
        color: #67C23A;
        font-size: 16px;
        font-weight: 600;
      }
    }

    &.savings {
      background: #f0f9ff;
      padding: 8px 12px;
      border-radius: 6px;
      margin: 12px 0;
    }
  }
}

.selected-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #67C23A;
  font-size: 12px;
  font-weight: 500;
}

.alternatives-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;

  .el-button {
    min-width: 120px;
  }
}
</style>
