<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { containerService } from '@/services/container'
import {
  Box,
  Refresh,
  Warning,
  SuccessFilled,
  CircleCheck,
  InfoFilled,
  ArrowRight
} from '@element-plus/icons-vue'

interface StatisticsVerification {
  totalContainers: number
  totalInTransit: number
  totalArrival: number
  totalPickup: number
  totalLastPickup: number
  totalReturn: number
  atPortTotal: number
  pickedUpTotal: number
  checks: Array<{
    name: string
    status: 'PASS' | 'FAIL'
    expected: number | string
    actual: number
    diff: number
  }>
}

interface DetailedStats {
  statusDistribution: Record<string, number>
  arrivalDistribution: Record<string, number>
  pickupDistribution: Record<string, number>
  lastPickupDistribution: Record<string, number>
  returnDistribution: Record<string, number>
}

const loading = ref(false)
const verificationData = ref<StatisticsVerification | null>(null)
const detailedStats = ref<DetailedStats | null>(null)
const activeTab = ref('overview')
const autoRefreshInterval = ref<number | null>(null)

// 状态标签映射
const statusLabels: Record<string, string> = {
  not_shipped: '未出运',
  shipped: '已出运',
  in_transit: '在途',
  at_port: '已到目的港',
  picked_up: '已提柜',
  unloaded: '已卸柜',
  returned_empty: '已还箱',
  arrived_at_transit: '已到中转港'
}

// 到港分布标签映射
const arrivalLabels: Record<string, string> = {
  overdue: '已逾期未到港',
  today: '今日到港',
  arrivedBeforeToday: '今日之前到港',
  within3Days: '3天内预计到港',
  within7Days: '7天内预计到港',
  over7Days: '7天以上预计到港',
  other: '其他情况'
}

// 提柜分布标签映射
const pickupLabels: Record<string, string> = {
  overdue: '计划提柜逾期',
  todayPlanned: '今日计划提柜',
  todayActual: '今日实际提柜',
  pending: '待安排提柜',
  within3Days: '3天内预计提柜',
  within7Days: '7天内预计提柜'
}

// 最晚提柜分布标签映射
const lastPickupLabels: Record<string, string> = {
  expired: '已超时',
  urgent: '即将超时(1-3天)',
  warning: '预警(4-7天)',
  normal: '时间充裕(7天以上)',
  noLastFreeDate: '缺最后免费日'
}

// 最晚还箱分布标签映射
const returnLabels: Record<string, string> = {
  expired: '已超时',
  urgent: '即将超时(1-3天)',
  warning: '预警(4-7天)',
  normal: '时间充裕(7天以上)',
  noLastReturnDate: '缺最后还箱日'
}

// 获取验证状态图标和颜色
const getCheckStatusIcon = (status: 'PASS' | 'FAIL') => {
  return status === 'PASS' ? SuccessFilled : Warning
}

const getCheckStatusColor = (status: 'PASS' | 'FAIL') => {
  return status === 'PASS' ? '#67C23A' : '#F56C6C'
}

// 获取差异样式
const getDiffClass = (diff: number) => {
  if (diff === 0) return 'text-success'
  if (diff > 0) return 'text-warning'
  return 'text-danger'
}

// 获取差异文本
const getDiffText = (diff: number) => {
  if (diff === 0) return '0'
  return diff > 0 ? `+${diff}` : `${diff}`
}

// 获取状态总数（排除 arrived_at_transit，避免重复计数）
const getStatusTotal = (distribution: Record<string, number>) => {
  const { arrived_at_transit, ...statusOnly } = distribution
  const total = Object.values(statusOnly).reduce((sum, count) => sum + count, 0)
  console.log('[getStatusTotal]', {
    arrived_at_transit,
    statusOnly,
    total,
    allValues: Object.values(distribution)
  })
  return total
}

// 获取普通分布总数（不排除任何字段）
const getDistributionTotal = (distribution: Record<string, number>) => {
  return Object.values(distribution).reduce((sum, count) => sum + count, 0)
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const [statsResponse, verifyResponse] = await Promise.all([
      containerService.getStatisticsDetailed(),
      containerService.getStatisticsVerification()
    ])
    
    if (statsResponse.success) {
      detailedStats.value = statsResponse.data
    }
    
    if (verifyResponse.success) {
      verificationData.value = verifyResponse.data
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 刷新数据
const handleRefresh = () => {
  loadData()
}

// 开始自动刷新
const startAutoRefresh = () => {
  stopAutoRefresh()
  autoRefreshInterval.value = window.setInterval(() => {
    loadData()
  }, 30000) // 30秒刷新一次
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
    autoRefreshInterval.value = null
  }
}

// 计算验证通过率
const verificationPassRate = computed(() => {
  if (!verificationData.value) return 0
  const passCount = verificationData.value.checks.filter(c => c.status === 'PASS').length
  return Math.round((passCount / verificationData.value.checks.length) * 100)
})

onMounted(() => {
  loadData()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="statistics-visualization">
    <!-- 头部 -->
    <div class="page-header">
      <div class="header-title">
        <el-icon class="title-icon"><Box /></el-icon>
        <h2>统计口径可视化</h2>
        <el-tag v-if="verificationData" :type="verificationPassRate === 100 ? 'success' : 'warning'">
          验证通过率: {{ verificationPassRate }}%
        </el-tag>
      </div>
      <el-button 
        type="primary" 
        :icon="Refresh" 
        :loading="loading" 
        @click="handleRefresh"
      >
        刷新数据
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="content-tabs">
      <!-- 概览 Tab -->
      <el-tab-pane label="数据概览" name="overview">
        <el-row :gutter="20" v-loading="loading">
          <!-- 总货柜数 -->
          <el-col :xs="24" :sm="12" :md="6">
            <el-card class="stat-card total">
              <div class="stat-icon">
                <el-icon><component :is="Box" /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ verificationData?.totalContainers || 0 }}</div>
                <div class="stat-label">总货柜数</div>
              </div>
            </el-card>
          </el-col>

          <!-- 在途货柜 -->
          <el-col :xs="24" :sm="12" :md="6">
            <el-card class="stat-card in-transit">
              <div class="stat-icon">
                <el-icon><component :is="ArrowRight" /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ verificationData?.totalInTransit || 0 }}</div>
                <div class="stat-label">在途货柜 (已出运+在途+已到目的港)</div>
              </div>
            </el-card>
          </el-col>

          <!-- 已提柜货柜 -->
          <el-col :xs="24" :sm="12" :md="6">
            <el-card class="stat-card picked-up">
              <div class="stat-icon">
                <el-icon><component :is="SuccessFilled" /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ verificationData?.pickedUpTotal || 0 }}</div>
                <div class="stat-label">已提柜货柜 (已提柜+已卸柜)</div>
              </div>
            </el-card>
          </el-col>

          <!-- 数据验证 -->
          <el-col :xs="24" :sm="12" :md="6">
            <el-card class="stat-card verification">
              <div class="stat-icon">
                <el-icon><component :is="CircleCheck" /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ verificationPassRate }}%</div>
                <div class="stat-label">数据验证通过率</div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 数据验证结果 -->
        <el-card class="verification-card" v-if="verificationData">
          <template #header>
            <div class="card-header">
              <el-icon><component :is="InfoFilled" /></el-icon>
              <span>数据一致性验证</span>
            </div>
          </template>
          <el-table :data="verificationData.checks" stripe>
            <el-table-column prop="name" label="验证项目" width="250" />
            <el-table-column prop="expected" label="预期值" width="150" />
            <el-table-column prop="actual" label="实际值" width="120">
              <template #default="{ row }">
                <span :class="getDiffClass(row.diff)">{{ row.actual }}</span>
              </template>
            </el-table-column>
            <el-table-column label="差异" width="120">
              <template #default="{ row }">
                <el-tag :type="row.diff === 0 ? 'success' : 'danger'">
                  {{ getDiffText(row.diff) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-icon 
                  :style="{ color: getCheckStatusColor(row.status), fontSize: '20px' }"
                >
                  <component :is="getCheckStatusIcon(row.status)" />
                </el-icon>
                <span :style="{ color: getCheckStatusColor(row.status), marginLeft: '8px' }">
                  {{ row.status }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>

      <!-- 状态分布 Tab -->
      <el-tab-pane label="状态分布" name="status">
        <el-card v-loading="loading">
          <template #header>
            <div class="card-header">
              <el-icon><component :is="Box" /></el-icon>
              <span>按状态统计 - 所有货柜按物流状态分布</span>
            </div>
          </template>
          <div class="statistics-container">
            <el-row :gutter="16">
              <el-col 
                v-for="(count, status) in detailedStats?.statusDistribution" 
                :key="status"
                :xs="12" 
                :sm="8" 
                :md="6"
                :lg="3"
              >
                <div class="status-item">
                  <div class="status-count">{{ count }}</div>
                  <div class="status-label">{{ statusLabels[status] || status }}</div>
                </div>
              </el-col>
            </el-row>
            <div class="summary">
              <el-tag type="info" size="large">
                总计: {{ 
                  (detailedStats?.statusDistribution?.not_shipped || 0) +
                  (detailedStats?.statusDistribution?.shipped || 0) +
                  (detailedStats?.statusDistribution?.in_transit || 0) +
                  (detailedStats?.statusDistribution?.at_port || 0) +
                  (detailedStats?.statusDistribution?.picked_up || 0) +
                  (detailedStats?.statusDistribution?.unloaded || 0) +
                  (detailedStats?.statusDistribution?.returned_empty || 0)
                }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 到港分布 Tab -->
      <el-tab-pane label="到港分布" name="arrival">
        <el-card v-loading="loading">
          <template #header>
            <div class="card-header">
              <el-icon><component :is="ArrowRight" /></el-icon>
              <span>按到港统计 - 基于ETA和ATA日期计算</span>
            </div>
          </template>
          <div class="info-box warning">
            <el-icon><component :is="InfoFilled" /></el-icon>
            <span>目标集: 已出运 + 在途 + 已到目的港 ({{ verificationData?.totalInTransit || 0 }})</span>
          </div>
          <div class="statistics-container">
            <el-row :gutter="16">
              <el-col 
                v-for="(count, category) in detailedStats?.arrivalDistribution" 
                :key="category"
                :xs="12" 
                :sm="8" 
                :md="6"
              >
                <div class="category-item" :class="{ 'highlight': category === 'overdue' }">
                  <div class="category-count">{{ count }}</div>
                  <div class="category-label">{{ arrivalLabels[category] || category }}</div>
                </div>
              </el-col>
            </el-row>
            <div class="summary">
              <el-tag type="info" size="large">
                总计: {{ getDistributionTotal(detailedStats?.arrivalDistribution || {}) }}
              </el-tag>
              <el-tag
                v-if="verificationData"
                :type="verificationData.totalArrival <= verificationData.totalInTransit ? 'success' : 'danger'"
                size="large"
              >
                验证: {{ verificationData.totalArrival }} ≤ {{ verificationData.totalInTransit }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 提柜分布 Tab -->
      <el-tab-pane label="提柜分布" name="pickup">
        <el-card v-loading="loading">
          <template #header>
            <div class="card-header">
              <el-icon><component :is="SuccessFilled" /></el-icon>
              <span>按提柜统计 - 已到目的港但尚未提柜货柜的提柜安排情况</span>
            </div>
          </template>
          <div class="info-box info">
            <el-icon><component :is="InfoFilled" /></el-icon>
            <span>目标集: 已到目的港 ({{ verificationData?.atPortTotal || 0 }})</span>
          </div>
          <div class="statistics-container">
            <el-row :gutter="16">
              <el-col 
                v-for="(count, category) in detailedStats?.pickupDistribution" 
                :key="category"
                :xs="12" 
                :sm="8" 
                :md="6"
              >
                <div class="category-item">
                  <div class="category-count">{{ count }}</div>
                  <div class="category-label">{{ pickupLabels[category] || category }}</div>
                </div>
              </el-col>
            </el-row>
            <div class="summary">
              <el-tag type="info" size="large">
                总计: {{ getDistributionTotal(detailedStats?.pickupDistribution || {}) }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 最晚提柜分布 Tab -->
      <el-tab-pane label="最晚提柜" name="lastPickup">
        <el-card v-loading="loading">
          <template #header>
            <div class="card-header">
              <el-icon><component :is="Warning" /></el-icon>
              <span>最晚提柜统计 - 最后免费日倒计时（仅未安排拖卡运输的货柜）</span>
            </div>
          </template>
          <div class="info-box warning">
            <el-icon><component :is="InfoFilled" /></el-icon>
            <span>关键区别: 仅统计无拖卡运输记录的货柜</span>
          </div>
          <div class="info-box info">
            <el-icon><component :is="InfoFilled" /></el-icon>
            <span>与"按提柜统计"的区别: "按提柜"统计所有at_port货柜，"最晚提柜"只统计无拖卡运输记录的货柜</span>
          </div>
          <div class="statistics-container">
            <el-row :gutter="16">
              <el-col 
                v-for="(count, category) in detailedStats?.lastPickupDistribution" 
                :key="category"
                :xs="12" 
                :sm="8" 
                :md="6"
              >
                <div 
                  class="category-item" 
                  :class="{ 
                    'critical': category === 'expired',
                    'warning': category === 'urgent' 
                  }"
                >
                  <div class="category-count">{{ count }}</div>
                  <div class="category-label">{{ lastPickupLabels[category] || category }}</div>
                </div>
              </el-col>
            </el-row>
            <div class="summary">
              <el-tag type="info" size="large">
                未安排拖卡运输货柜: {{ getDistributionTotal(detailedStats?.lastPickupDistribution || {}) }}
              </el-tag>
              <el-tag type="success" size="large">
                已安排拖卡运输货柜: {{ (detailedStats?.pickupDistribution?.todayActual || 0) + getDistributionTotal({
                  overdue: detailedStats?.pickupDistribution?.overdue || 0,
                  todayPlanned: detailedStats?.pickupDistribution?.todayPlanned || 0,
                  pending: detailedStats?.pickupDistribution?.pending || 0,
                  within3Days: detailedStats?.pickupDistribution?.within3Days || 0,
                  within7Days: detailedStats?.pickupDistribution?.within7Days || 0
                }) }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 最晚还箱分布 Tab -->
      <el-tab-pane label="最晚还箱" name="return">
        <el-card v-loading="loading">
          <template #header>
            <div class="card-header">
              <el-icon><component :is="CircleCheck" /></el-icon>
              <span>最晚还箱统计 - 最后还箱日倒计时</span>
            </div>
          </template>
          <div class="info-box info">
            <el-icon><component :is="InfoFilled" /></el-icon>
            <span>目标集: 已提柜 + 已卸柜 ({{ verificationData?.pickedUpTotal || 0 }})</span>
          </div>
          <div class="statistics-container">
            <el-row :gutter="16">
              <el-col 
                v-for="(count, category) in detailedStats?.returnDistribution" 
                :key="category"
                :xs="12" 
                :sm="8" 
                :md="6"
              >
                <div 
                  class="category-item" 
                  :class="{ 
                    'critical': category === 'expired',
                    'warning': category === 'urgent' 
                  }"
                >
                  <div class="category-count">{{ count }}</div>
                  <div class="category-label">{{ returnLabels[category] || category }}</div>
                </div>
              </el-col>
            </el-row>
            <div class="summary">
              <el-tag type="info" size="large">
                总计: {{ getDistributionTotal(detailedStats?.returnDistribution || {}) }}
              </el-tag>
              <el-tag
                v-if="verificationData"
                :type="verificationData.totalReturn === verificationData.pickedUpTotal ? 'success' : 'danger'"
                size="large"
              >
                验证: {{ verificationData.totalReturn }} = {{ verificationData.pickedUpTotal }}
              </el-tag>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.statistics-visualization {
  padding: 24px;
  background-color: $bg-page;
  min-height: calc(100vh - 64px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);

  .header-title {
    display: flex;
    align-items: center;
    gap: 12px;

    .title-icon {
      font-size: 28px;
      color: #fff;
    }

    h2 {
      margin: 0;
      color: #fff;
      font-size: 24px;
      font-weight: 700;
    }
  }
}

.content-tabs {
  :deep(.el-tabs__header) {
    background: #fff;
    border-radius: 12px;
    padding: 0 20px;
    margin-bottom: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  }

  :deep(.el-tabs__nav-wrap::after) {
    display: none;
  }

  :deep(.el-tabs__item) {
    font-size: 15px;
    font-weight: 500;
    padding: 0 20px;
    height: 50px;
    line-height: 50px;
  }

  :deep(.el-tabs__item.is-active) {
    color: #667eea;
    font-weight: 600;
  }
}

.stat-card {
  margin-bottom: 20px;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  :deep(.el-card__body) {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    flex-shrink: 0;
  }

  .stat-content {
    flex: 1;

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 4px;
    }

    .stat-label {
      font-size: 14px;
      color: $text-secondary;
      line-height: 1.4;
    }
  }

  &.total .stat-icon {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
  }

  &.total .stat-value {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  &.in-transit .stat-icon {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: #fff;
  }

  &.in-transit .stat-value {
    color: #f5576c;
  }

  &.picked-up .stat-icon {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: #fff;
  }

  &.picked-up .stat-value {
    color: #00f2fe;
  }

  &.verification .stat-icon {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    color: #fff;
  }

  &.verification .stat-value {
    color: #43e97b;
  }
}

.verification-card {
  margin-top: 20px;
  border-radius: 12px;

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 16px;
    color: $text-primary;
  }
}

.info-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;

  .el-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  &.warning {
    background: #fff7e6;
    border: 1px solid #ffd591;
    color: #d46b08;
  }

  &.info {
    background: #e6f7ff;
    border: 1px solid #91d5ff;
    color: #096dd9;
  }
}

.statistics-container {
  padding: 8px 0;

  .status-item,
  .category-item {
    background: #f8f9fa;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    margin-bottom: 16px;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    &.highlight {
      background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
      border: 2px solid #ff4d4f;
    }

    &.critical {
      background: linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%);
      border: 2px solid #ff4d4f;
    }

    &.warning {
      background: linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%);
      border: 2px solid #faad14;
    }

    .status-count,
    .category-count {
      font-size: 36px;
      font-weight: 700;
      color: #1890ff;
      line-height: 1.2;
      margin-bottom: 8px;
    }

    .status-label,
    .category-label {
      font-size: 14px;
      color: $text-secondary;
      line-height: 1.4;
    }
  }

  .summary {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 16px;
    border-top: 2px solid #e8e8e8;
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: $text-primary;

  .el-icon {
    color: #1890ff;
  }
}

.text-success {
  color: #52c41a;
}

.text-warning {
  color: #faad14;
}

.text-danger {
  color: #ff4d4f;
}

// 响应式设计
@media (max-width: 768px) {
  .statistics-visualization {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;

    .header-title {
      h2 {
        font-size: 20px;
      }
    }
  }

  .stat-card {
    :deep(.el-card__body) {
      padding: 16px;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      font-size: 24px;
    }

    .stat-content {
      .stat-value {
        font-size: 24px;
      }

      .stat-label {
        font-size: 12px;
      }
    }
  }

  .status-item,
  .category-item {
    padding: 16px;

    .status-count,
    .category-count {
      font-size: 28px;
    }
  }
}
</style>
