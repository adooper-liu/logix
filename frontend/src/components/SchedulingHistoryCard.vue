<template>
  <div class="scheduling-history-card">
    <!-- 触发按钮 -->
    <a-button type="link" @click="toggleHistory" :loading="loading">
      <span v-if="historyCount > 0">📋 {{ historyCount }}条历史</span>
      <span v-else>📝 查看历史</span>
    </a-button>

    <!-- 历史记录面板 -->
    <a-drawer
      v-model:visible="visible"
      title="排产历史记录"
      placement="right"
      :width="600"
      :destroy-on-close="true"
    >
      <!-- 加载状态 -->
      <a-spin :spinning="loading" tip="加载中...">
        <!-- 空状态 -->
        <a-empty v-if="!loading && histories.length === 0" description="该货柜暂无排产历史" />

        <!-- 历史记录列表 -->
        <div v-else class="history-timeline">
          <a-timeline>
            <a-timeline-item
              v-for="(record, index) in histories"
              :key="record.id"
              :color="record.schedulingStatus === 'CONFIRMED' ? 'green' : 'gray'"
            >
              <!-- 时间线卡片 -->
              <div class="timeline-item-content">
                <!-- 头部：版本号和状态 -->
                <div class="timeline-header">
                  <div class="version-badge">
                    <a-tag :color="record.schedulingStatus === 'CONFIRMED' ? 'success' : 'default'">
                      v{{ record.schedulingVersion }}
                      <span v-if="record.schedulingStatus === 'CONFIRMED'">✅ 当前生效</span>
                      <span v-else-if="record.schedulingStatus === 'SUPERSEDED'">⚠️ 已作废</span>
                    </a-tag>
                  </div>
                  <div class="operation-time">
                    {{ formatDateTime(record.operatedAt) }}
                  </div>
                </div>

                <!-- 策略信息 -->
                <div class="info-row">
                  <span class="label">排产策略：</span>
                  <a-tag color="blue">{{ translateStrategy(record.strategy) }}</a-tag>
                  <span class="sub-label" v-if="record.schedulingMode">
                    ({{ record.schedulingMode === 'AUTO' ? '自动' : '手动' }})
                  </span>
                </div>

                <!-- 计划日期 -->
                <div class="info-section" v-if="hasDates(record)">
                  <div class="section-title">📅 计划日期</div>
                  <a-descriptions :column="1" size="small">
                    <a-descriptions-item label="提柜日期" v-if="record.plannedPickupDate">
                      {{ formatDate(record.plannedPickupDate) }}
                    </a-descriptions-item>
                    <a-descriptions-item label="送仓日期" v-if="record.plannedDeliveryDate">
                      {{ formatDate(record.plannedDeliveryDate) }}
                    </a-descriptions-item>
                    <a-descriptions-item label="卸柜日期" v-if="record.plannedUnloadDate">
                      {{ formatDate(record.plannedUnloadDate) }}
                    </a-descriptions-item>
                    <a-descriptions-item label="还箱日期" v-if="record.plannedReturnDate">
                      {{ formatDate(record.plannedReturnDate) }}
                    </a-descriptions-item>
                  </a-descriptions>
                </div>

                <!-- 资源信息 -->
                <div class="info-section" v-if="hasResources(record)">
                  <div class="section-title">🏭 资源安排</div>
                  <a-descriptions :column="1" size="small">
                    <a-descriptions-item
                      label="仓库"
                      v-if="record.warehouseName || record.warehouseCode"
                    >
                      {{ record.warehouseName || record.warehouseCode }}
                    </a-descriptions-item>
                    <a-descriptions-item
                      label="车队"
                      v-if="record.truckingCompanyName || record.truckingCompanyCode"
                    >
                      {{ record.truckingCompanyName || record.truckingCompanyCode }}
                    </a-descriptions-item>
                  </a-descriptions>
                </div>

                <!-- 费用明细 -->
                <div class="info-section" v-if="hasCost(record)">
                  <div class="section-title">💰 费用明细</div>
                  <div class="cost-summary">
                    <div class="total-cost">
                      <span>总费用：</span>
                      <span class="total-amount">${{ record.totalCost?.toFixed(2) }}</span>
                    </div>

                    <!-- 费用细分（展开） -->
                    <a-collapse :bordered="false" ghost>
                      <a-collapse-panel key="1" header="查看详情">
                        <a-descriptions :column="1" size="small">
                          <a-descriptions-item label="滞港费" v-if="record.demurrageCost">
                            ${{ record.demurrageCost.toFixed(2) }}
                          </a-descriptions-item>
                          <a-descriptions-item label="滞箱费" v-if="record.detentionCost">
                            ${{ record.detentionCost.toFixed(2) }}
                          </a-descriptions-item>
                          <a-descriptions-item label="堆存费" v-if="record.storageCost">
                            ${{ record.storageCost.toFixed(2) }}
                          </a-descriptions-item>
                          <a-descriptions-item label="运输费" v-if="record.transportationCost">
                            ${{ record.transportationCost.toFixed(2) }}
                          </a-descriptions-item>
                          <a-descriptions-item label="操作费" v-if="record.handlingCost">
                            ${{ record.handlingCost.toFixed(2) }}
                          </a-descriptions-item>
                        </a-descriptions>
                      </a-collapse-panel>
                    </a-collapse>
                  </div>
                </div>

                <!-- 免费期信息 -->
                <div class="info-section" v-if="hasFreeDays(record)">
                  <div class="section-title">⏰ 免费期信息</div>
                  <a-descriptions :column="1" size="small">
                    <a-descriptions-item label="最后免费日" v-if="record.lastFreeDate">
                      {{ formatDate(record.lastFreeDate) }}
                      <span class="sub-label" v-if="record.remainingFreeDays">
                        (剩余 {{ record.remainingFreeDays }} 天)
                      </span>
                    </a-descriptions-item>
                    <a-descriptions-item label="最晚还箱日" v-if="record.lastReturnDate">
                      {{ formatDate(record.lastReturnDate) }}
                    </a-descriptions-item>
                  </a-descriptions>
                </div>

                <!-- 备选方案 -->
                <div class="info-section" v-if="hasAlternatives(record)">
                  <div class="section-title">
                    💡 备选方案
                    <span class="sub-label"
                      >({{ record.alternativeSolutions?.length || 0 }}个)</span
                    >
                  </div>
                  <a-collapse :bordered="false" ghost>
                    <a-collapse-panel
                      v-for="(alt, altIndex) in record.alternativeSolutions"
                      :key="altIndex"
                      :header="`方案 ${altIndex + 1}`"
                    >
                      <a-descriptions :column="1" size="small">
                        <a-descriptions-item label="策略">
                          {{ translateStrategy(alt.strategy) }}
                        </a-descriptions-item>
                        <a-descriptions-item label="总费用" v-if="alt.totalCost">
                          ${{ alt.totalCost.toFixed(2) }}
                        </a-descriptions-item>
                      </a-descriptions>
                    </a-collapse-panel>
                  </a-collapse>
                </div>

                <!-- 审计信息 -->
                <div class="audit-info">
                  <a-divider style="margin: 12px 0" />
                  <div class="audit-row">
                    <span>👤 操作人：{{ record.operatedBy || 'SYSTEM' }}</span>
                    <span v-if="record.operationType">
                      | 操作类型：{{ translateOperationType(record.operationType) }}
                    </span>
                  </div>
                </div>
              </div>
            </a-timeline-item>
          </a-timeline>
        </div>
      </a-spin>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import api from '@/services/api'
import { computed, ref, watch } from 'vue'

interface SchedulingHistory {
  id: number
  containerNumber: string
  schedulingVersion: number
  schedulingMode: 'MANUAL' | 'AUTO'
  strategy: string
  plannedPickupDate?: string
  plannedDeliveryDate?: string
  plannedUnloadDate?: string
  plannedReturnDate?: string
  warehouseCode?: string
  warehouseName?: string
  truckingCompanyCode?: string
  truckingCompanyName?: string
  totalCost?: number
  demurrageCost?: number
  detentionCost?: number
  storageCost?: number
  yardStorageCost?: number
  transportationCost?: number
  handlingCost?: number
  lastFreeDate?: string
  lastReturnDate?: string
  remainingFreeDays?: number
  alternativeSolutions?: any[]
  operatedBy?: string
  operatedAt: string
  operationType?: string
  schedulingStatus: 'CONFIRMED' | 'CANCELLED' | 'SUPERSEDED'
}

const props = defineProps<{
  containerNumber: string
}>()

// 响应式数据
const visible = ref(false)
const loading = ref(false)
const histories = ref<SchedulingHistory[]>([])

// 计算属性
const historyCount = computed(() => histories.value.length)

// 监听容器号变化，重新加载
watch(
  () => props.containerNumber,
  () => {
    if (visible.value) {
      loadHistory()
    }
  }
)

/**
 * 切换面板显示/隐藏
 */
async function toggleHistory() {
  if (visible.value) {
    visible.value = false
  } else {
    visible.value = true
    await loadHistory()
  }
}

/**
 * 加载历史记录
 */
async function loadHistory() {
  try {
    loading.value = true

    const response = await api.get(`/scheduling/history/${props.containerNumber}`, {
      params: {
        page: 1,
        limit: 50, // 加载更多记录
      },
    })

    histories.value = response.data.data.records || []
  } catch (error: any) {
    console.error('加载历史记录失败:', error)
    histories.value = []
  } finally {
    loading.value = false
  }
}

/**
 * 格式化日期
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 翻译策略
 */
function translateStrategy(strategy?: string): string {
  if (!strategy) return '-'
  const map: Record<string, string> = {
    Direct: '直提',
    'Drop off': '甩挂',
    Expedited: '加急',
  }
  return map[strategy] || strategy
}

/**
 * 翻译操作类型
 */
function translateOperationType(type?: string): string {
  if (!type) return '-'
  const map: Record<string, string> = {
    CREATE: '创建',
    UPDATE: '更新',
    CANCEL: '取消',
  }
  return map[type] || type
}

/**
 * 检查是否有日期信息
 */
function hasDates(record: SchedulingHistory): boolean {
  return !!(
    record.plannedPickupDate ||
    record.plannedDeliveryDate ||
    record.plannedUnloadDate ||
    record.plannedReturnDate
  )
}

/**
 * 检查是否有资源信息
 */
function hasResources(record: SchedulingHistory): boolean {
  return !!(
    record.warehouseName ||
    record.warehouseCode ||
    record.truckingCompanyName ||
    record.truckingCompanyCode
  )
}

/**
 * 检查是否有费用信息
 */
function hasCost(record: SchedulingHistory): boolean {
  return !!(record.totalCost || record.demurrageCost || record.detentionCost || record.storageCost)
}

/**
 * 检查是否有免费期信息
 */
function hasFreeDays(record: SchedulingHistory): boolean {
  return !!(record.lastFreeDate || record.lastReturnDate || record.remainingFreeDays)
}

/**
 * 检查是否有备选方案
 */
function hasAlternatives(record: SchedulingHistory): boolean {
  return !!(record.alternativeSolutions && record.alternativeSolutions.length > 0)
}
</script>

<style scoped lang="scss">
.scheduling-history-card {
  display: inline-block;
}

.history-timeline {
  .timeline-item-content {
    background: #fafafa;
    border-radius: 4px;
    padding: 16px;
    margin-top: 8px;
  }

  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .version-badge {
      font-size: 14px;
    }

    .operation-time {
      color: #999;
      font-size: 12px;
    }
  }

  .info-row {
    margin-bottom: 8px;
    font-size: 14px;

    .label {
      color: #666;
    }

    .sub-label {
      color: #999;
      font-size: 12px;
      margin-left: 8px;
    }
  }

  .info-section {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e8e8e8;

    .section-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
      font-size: 14px;

      .sub-label {
        color: #999;
        font-size: 12px;
        font-weight: normal;
      }
    }
  }

  .cost-summary {
    .total-cost {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      border-radius: 4px;
      margin-bottom: 8px;

      .total-amount {
        font-size: 18px;
        font-weight: 600;
        color: #52c41a;
      }
    }
  }

  .audit-info {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px dashed #d9d9d9;

    .audit-row {
      display: flex;
      justify-content: space-between;
      color: #999;
      font-size: 12px;
    }
  }
}
</style>
