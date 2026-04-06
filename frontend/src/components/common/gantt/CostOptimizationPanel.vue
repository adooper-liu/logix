<template>
  <el-dialog
    v-model="visible"
    title="💰 成本优化建议"
    width="800px"
    :close-on-click-modal="false"
    @close="$emit('close')"
  >
    <div class="panel-content">
      <!-- 当前方案 vs 最优方案对比 -->
      <div class="comparison-section">
        <h3 class="section-title">📊 当前方案 vs 最优方案</h3>
        <div class="comparison-grid">
          <div class="comparison-card current">
            <div class="card-header">
              <el-tag type="info">当前方案</el-tag>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span class="label">提柜日:</span>
                <span class="value">{{ formatDate(currentPickupDate) }}</span>
              </div>
              <div class="info-row">
                <span class="label">策略:</span>
                <span class="value">{{ currentStrategy }}</span>
              </div>
              <div class="info-row cost-row">
                <span class="label">成本:</span>
                <span class="value cost-value">{{ currencySymbol }}{{ formatCost(originalCost) }}</span>
              </div>
            </div>
          </div>

          <div class="comparison-arrow">
            <el-icon :size="32" color="#67c23a"><Right /></el-icon>
          </div>

          <div class="comparison-card optimal">
            <div class="card-header">
              <el-tag type="success">最优方案</el-tag>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span class="label">提柜日:</span>
                <span class="value highlight">{{ formatDate(suggestedPickupDate) }}</span>
              </div>
              <div class="info-row">
                <span class="label">策略:</span>
                <span class="value highlight">{{ suggestedStrategy }}</span>
              </div>
              <div class="info-row cost-row">
                <span class="label">成本:</span>
                <span class="value cost-value success">{{ currencySymbol }}{{ formatCost(optimizedCost) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 节省金额 -->
        <div class="savings-banner" v-if="savings > 0">
          <el-icon :size="24" color="#67c23a"><Money /></el-icon>
          <div class="savings-info">
            <div class="savings-amount">
              💵 可节省: {{ currencySymbol }}{{ formatCost(savings) }} ({{ savingsPercent.toFixed(2) }}%)
            </div>
            <div class="savings-hint">建议采纳最优方案以降低物流成本</div>
          </div>
        </div>

        <!-- 无优化空间提示 -->
        <div class="no-savings-banner" v-else>
          <el-icon :size="24" color="#909399"><InfoFilled /></el-icon>
          <div class="no-savings-info">
            <div class="no-savings-text">当前方案已是最优，暂无优化空间</div>
            <div class="no-savings-hint">您可以选择应用当前方案或关闭面板</div>
          </div>
        </div>
      </div>

      <!-- 备选方案列表 -->
      <div class="alternatives-section" v-if="alternatives.length > 0">
        <h3 class="section-title">📋 备选方案 (Top {{ Math.min(3, alternatives.length) }})</h3>
        <div class="alternatives-list">
          <div
            v-for="(alt, index) in alternatives.slice(0, 3)"
            :key="index"
            class="alternative-item"
            :class="{ 'is-recommended': index === 0 }"
            @click="showBreakdown(alt)"
          >
            <div class="alt-rank">{{ index + 1 }}</div>
            <div class="alt-info">
              <div class="alt-date">{{ formatDate(alt.pickupDate) }}</div>
              <div class="alt-strategy">
                <el-tag size="small" :type="getStrategyTagType(alt.strategy)">
                  {{ alt.strategy }}
                </el-tag>
              </div>
            </div>
            <div class="alt-cost">
              <span class="cost-amount">{{ currencySymbol }}{{ formatCost(alt.totalCost) }}</span>
              <span class="cost-savings" v-if="alt.savings > 0">
                (-{{ currencySymbol }}{{ formatCost(alt.savings) }})
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 费用明细弹窗 -->
      <el-dialog
        v-model="breakdownVisible"
        title="📋 费用明细"
        width="900px"
        :close-on-click-modal="false"
      >
        <div v-if="selectedAlternative" class="breakdown-content">
          <div class="breakdown-header">
            <strong>{{ formatDate(selectedAlternative.pickupDate) }}</strong>
            <el-tag :type="getStrategyTagType(selectedAlternative.strategy)">
              {{ selectedAlternative.strategy }}
            </el-tag>
          </div>
          <el-divider />
          <div class="breakdown-items">
            <div class="breakdown-row">
              <span>滞港费:</span>
              <span>{{ currencySymbol }}{{ formatCost(selectedAlternative.breakdown.demurrageCost) }}</span>
            </div>
            <div class="breakdown-row">
              <span>滞箱费:</span>
              <span>{{ currencySymbol }}{{ formatCost(selectedAlternative.breakdown.detentionCost) }}</span>
            </div>
            <div class="breakdown-row">
              <span>港口存储费:</span>
              <span>{{ currencySymbol }}{{ formatCost(selectedAlternative.breakdown.storageCost) }}</span>
            </div>
            <div class="breakdown-row" v-if="selectedAlternative.breakdown.yardStorageCost > 0">
              <span>外部堆场费:</span>
              <span>{{ currencySymbol }}{{ formatCost(selectedAlternative.breakdown.yardStorageCost) }}</span>
            </div>
            <div class="breakdown-row">
              <span>运输费:</span>
              <span>{{ currencySymbol }}{{ formatCost(selectedAlternative.breakdown.transportationCost) }}</span>
            </div>
            <div class="breakdown-row" v-if="selectedAlternative.breakdown.handlingCost > 0">
              <span>操作费:</span>
              <span>{{ currencySymbol }}{{ formatCost(selectedAlternative.breakdown.handlingCost) }}</span>
            </div>
          </div>

          <!-- ✅ 新增：滞港费标准详情（表格形式） -->
          <div v-if="selectedAlternative.demurrageStandards && selectedAlternative.demurrageStandards.length > 0" class="demurrage-standards-section">
            <el-divider />
            <h4 class="standards-title">📋 滞港费标准详情</h4>
            
            <el-table :data="selectedAlternative.demurrageStandards" border stripe size="small">
              <el-table-column prop="chargeName" label="费用项目" min-width="140" fixed>
                <template #default="{ row }">
                  <strong>{{ row.chargeName }}</strong>
                </template>
              </el-table-column>
              
              <el-table-column prop="currency" label="货币" width="70" align="center">
                <template #default="{ row }">
                  <el-tag size="small" type="info">{{ row.currency }}</el-tag>
                </template>
              </el-table-column>
              
              <el-table-column prop="freeDays" label="免费天数" width="80" align="center">
                <template #default="{ row }">
                  <strong>{{ row.freeDays }} 天</strong>
                </template>
              </el-table-column>
              
              <el-table-column prop="freeDaysBasis" label="免费天数基础" width="110" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ row.freeDaysBasis || '-' }}
                </template>
              </el-table-column>
              
              <el-table-column prop="calculationBasis" label="计算基础" width="100" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ row.calculationBasis || '-' }}
                </template>
              </el-table-column>
              
              <el-table-column label="阶梯费率" min-width="280">
                <template #default="{ row }">
                  <div v-if="row.tiers && row.tiers.length > 0" class="tiers-table">
                    <el-table :data="row.tiers" size="small" :show-header="false" border>
                      <el-table-column min-width="120">
                        <template #default="{ row: tier }">
                          <span class="tier-range-text">
                            第 {{ tier.fromDay }} 天 - {{ tier.toDay ? `第 ${tier.toDay} 天` : '之后' }}
                          </span>
                        </template>
                      </el-table-column>
                      <el-table-column width="100" align="right">
                        <template #default="{ row: tier }">
                          <span class="tier-rate-text">{{ currencySymbol }}{{ formatCost(tier.ratePerDay) }}/天</span>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                  <span v-else class="no-tier">{{ row.ratePerDay ? `${currencySymbol}${formatCost(row.ratePerDay)}/天` : '-' }}</span>
                </template>
              </el-table-column>
              
              <el-table-column label="匹配条件" min-width="200">
                <template #default="{ row }">
                  <div class="conditions-tags" v-if="row.destinationPortCode || row.shippingCompanyCode || row.foreignCompanyCode || row.originForwarderCode">
                    <el-tag v-if="row.destinationPortCode" size="small" type="success">
                      目的港: {{ row.destinationPortCode }}
                    </el-tag>
                    <el-tag v-if="row.shippingCompanyCode" size="small" type="warning">
                      船公司: {{ row.shippingCompanyCode }}
                    </el-tag>
                    <el-tag v-if="row.foreignCompanyCode" size="small" type="danger">
                      海外公司: {{ row.foreignCompanyCode }}
                    </el-tag>
                    <el-tag v-if="row.originForwarderCode" size="small" type="info">
                      起运港货代: {{ row.originForwarderCode }}
                    </el-tag>
                  </div>
                  <span v-else class="no-conditions">-</span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <el-divider />
          <div class="breakdown-total">
            <strong>总计:</strong>
            <strong class="total-amount">${{ formatCost(selectedAlternative.totalCost) }}</strong>
          </div>
        </div>
      </el-dialog>
    </div>

    <!-- 底部操作按钮 -->
    <template #footer>
      <div class="panel-footer">
        <el-button type="primary" @click="$emit('apply')">
          <el-icon><Check /></el-icon>
          应用最优方案
        </el-button>
        <el-button @click="$emit('close')">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Check, InfoFilled, Money, Right } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ref, computed } from 'vue'
import { getCurrencySymbol } from '@/utils/currency'

interface DemurrageStandard {
  id: number
  chargeName: string
  chargeTypeCode: string
  foreignCompanyCode?: string
  foreignCompanyName?: string
  destinationPortCode?: string
  destinationPortName?: string
  shippingCompanyCode?: string
  shippingCompanyName?: string
  originForwarderCode?: string
  originForwarderName?: string
  freeDays: number
  freeDaysBasis?: string
  calculationBasis?: string
  ratePerDay?: number
  tiers?: Array<{
    fromDay: number
    toDay: number | null
    ratePerDay: number
  }>
  currency: string
}

interface Alternative {
  pickupDate: string
  strategy: 'Direct' | 'Drop off' | 'Expedited'
  totalCost: number
  savings: number
  breakdown: {
    demurrageCost: number
    detentionCost: number
    storageCost: number
    yardStorageCost: number
    transportationCost: number
    handlingCost: number
  }
  // ✅ 新增：滞港费标准数据
  demurrageStandards?: DemurrageStandard[]
}

const props = defineProps<{
  containerNumber: string
  currentPickupDate: string
  currentStrategy: string
  originalCost: number
  optimizedCost: number
  savings: number
  savingsPercent: number
  suggestedPickupDate: string
  suggestedStrategy: string
  alternatives: Alternative[]
}>()

// Dialog 显示状态（父组件通过 v-if 控制组件渲染，所以这里始终为 true）
const visible = ref(true)

// 调试日志
console.log('[CostOptimizationPanel] 组件已挂载，props:', props)

defineEmits<{
  apply: []
  close: []
}>()

// 费用明细弹窗状态
const breakdownVisible = ref(false)
const selectedAlternative = ref<Alternative | null>(null)

// 显示费用明细
function showBreakdown(alt: Alternative) {
  selectedAlternative.value = alt
  breakdownVisible.value = true
}

// 获取货币代码（从滞港费标准中提取，如果没有则默认 USD）
const currencyCode = computed(() => {
  const firstStandard = props.alternatives[0]?.demurrageStandards?.[0]
  return firstStandard?.currency || 'USD'
})

// 获取货币符号
const currencySymbol = computed(() => getCurrencySymbol(currencyCode.value))

// 格式化日期
function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('YYYY-MM-DD')
}

// 格式化金额（带货币符号）
function formatCost(cost: number): string {
  return cost.toFixed(2)
}

// 获取策略标签类型
function getStrategyTagType(strategy: string): 'primary' | 'success' | 'warning' {
  switch (strategy) {
    case 'Direct':
      return 'primary'
    case 'Drop off':
      return 'warning'
    case 'Expedited':
      return 'success'
    default:
      return 'primary'
  }
}
</script>

<style scoped lang="scss">
.panel-content {
  max-height: 600px;
  overflow-y: auto;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

// 对比区域
.comparison-section {
  margin-bottom: 24px;
}

.comparison-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.comparison-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
  border: 2px solid transparent;
  transition: all 0.3s;

  &.optimal {
    background: #f0f9ff;
    border-color: #67c23a;
  }

  .card-header {
    margin-bottom: 12px;
  }

  .card-body {
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;

      .label {
        color: #909399;
      }

      .value {
        color: #303133;
        font-weight: 500;

        &.highlight {
          color: #67c23a;
          font-weight: 600;
        }

        &.cost-value {
          font-size: 16px;

          &.success {
            color: #67c23a;
          }
        }
      }
    }
  }
}

.comparison-arrow {
  display: flex;
  justify-content: center;
}

.savings-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 8px;
  border-left: 4px solid #67c23a;

  .savings-info {
    flex: 1;

    .savings-amount {
      font-size: 16px;
      font-weight: 600;
      color: #67c23a;
      margin-bottom: 4px;
    }

    .savings-hint {
      font-size: 12px;
      color: #909399;
    }
  }
}

.no-savings-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-radius: 8px;
  border-left: 4px solid #909399;

  .no-savings-info {
    flex: 1;

    .no-savings-text {
      font-size: 14px;
      font-weight: 500;
      color: #606266;
      margin-bottom: 4px;
    }

    .no-savings-hint {
      font-size: 12px;
      color: #909399;
    }
  }
}

// 备选方案列表
.alternatives-section {
  margin-top: 24px;
}

.alternatives-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alternative-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #409eff;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
  }

  &.is-recommended {
    border-color: #67c23a;
    background: #f0f9ff;
  }

  .alt-rank {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
    border-radius: 50%;
    font-size: 13px;
    font-weight: 600;
    color: #909399;
  }

  .alt-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .alt-date {
      font-size: 14px;
      font-weight: 500;
      color: #303133;
    }
  }

  .alt-cost {
    text-align: right;

    .cost-amount {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      display: block;
    }

    .cost-savings {
      font-size: 12px;
      color: #67c23a;
      margin-top: 2px;
      display: block;
    }
  }
}

// 费用明细弹窗
.breakdown-content {
  .breakdown-header {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
  }

  .breakdown-items {
    .breakdown-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      color: #606266;

      span:last-child {
        font-weight: 500;
      }
    }
  }

  .breakdown-total {
    display: flex;
    justify-content: space-between;
    font-size: 16px;
    padding-top: 8px;

    .total-amount {
      color: #409eff;
      font-size: 18px;
    }
  }

  // 滞港费标准表格样式
  .demurrage-standards-section {
    .standards-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin: 0 0 12px 0;
    }

    .tiers-table {
      margin: 4px 0;

      :deep(.el-table) {
        font-size: 12px;
      }

      .tier-range-text {
        color: #606266;
        font-size: 12px;
      }

      .tier-rate-text {
        color: #409eff;
        font-weight: 500;
        font-size: 12px;
      }
    }

    .no-tier,
    .no-conditions {
      color: #909399;
      font-size: 12px;
    }

    .conditions-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
  }
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e4e7ed;
  background: #fafafa;
  border-radius: 0 0 8px 8px;
}
</style>
