<template>
  <div class="optimization-result-card" v-loading="loading">
    <!-- 1. 核心结论区（横向布局） -->
    <div class="conclusion-section">
      <!-- 2.1 左侧：节省/上涨结论 -->
      <div class="conclusion-left">
        <div class="savings-highlight" :class="savingsLevelClass">
          <div class="savings-icon">💰</div>
          <div class="savings-amount" :class="{ 'amount-increase': currentSavings.isIncrease }">
            ${{ formatNumber(Math.abs(currentSavings.amount)) }}
          </div>
          <div class="savings-percent" :class="{ 'percent-increase': currentSavings.isIncrease }">
            <el-icon v-if="currentSavings.isIncrease"><ArrowUp /></el-icon>
            <el-icon v-else><ArrowDown /></el-icon>
            {{ Math.abs(currentSavings.percentage).toFixed(1) }}%
          </div>
          <div class="savings-label">
            {{ currentSavings.isIncrease ? '费用上涨' : '优化节省' }}
          </div>
        </div>
      </div>

      <!-- 2.2 中间：费用对比 -->
      <div class="conclusion-center">
        <div class="cost-comparison-card">
          <!-- ✅ 关键修复：移除费用对比标题，节省空间 -->
          <div class="cost-alternatives-scroll">
            <!-- 原方案 -->
            <div class="cost-item original" :class="{ 'is-best': false }">
              <div class="cost-label">原方案</div>
              <div class="cost-value cost-value-small">${{ formatNumber(originalCost.total) }}</div>
              <div
                class="cost-detail cost-detail-small"
                :title="`${originalCost.pickupDate} ${originalCost.strategy}`"
              >
                {{ originalCost.pickupDate }}
              </div>
            </div>

            <div class="arrow-divider">→</div>

            <!-- 循环显示所有备选方案 -->
            <div
              v-for="(alt, index) in alternatives"
              :key="index"
              class="cost-item alternative"
              :class="{ 'is-best': index === selectedAlternativeIndex }"
              @click="handleSelectAlternative(alt)"
            >
              <div class="cost-label">
                方案 {{ index + 1 }}
                <span v-if="index === 0" class="best-badge">⭐ 最优</span>
              </div>
              <div class="cost-value cost-value-small">${{ formatNumber(alt.totalCost) }}</div>
              <div
                class="cost-detail cost-detail-small"
                :title="`${alt.pickupDate} ${alt.strategy}`"
              >
                {{ alt.pickupDate }}
              </div>
              <div v-if="alt.savings && alt.savings > 0" class="savings-tag savings-tag-small">
                省 ${{ formatNumber(alt.savings) }}
              </div>
              <!-- ✅ 新增：选择此方案按钮 -->
              <div class="select-action" v-if="showActions">
                <el-button
                  type="primary"
                  size="mini"
                  @click.stop="handleSelectAlternative(alt)"
                  :class="{ selected: index === selectedAlternativeIndex }"
                >
                  {{ index === selectedAlternativeIndex ? '✅ 已选择' : '选择此方案' }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2.3 右侧：决策辅助 -->
      <div class="conclusion-right">
        <div class="decision-summary" :class="decisionSummaryClass">
          <div class="summary-icon">⏰</div>
          <div class="summary-content">
            <div class="summary-title">关键信息</div>
            <div class="summary-item" v-if="decisionSupport">
              <div class="summary-label">免费期剩余</div>
              <div class="summary-value">
                <el-tag :type="getUrgencyType(decisionSupport.freeDaysRemaining)" size="small">
                  {{ decisionSupport.freeDaysRemaining }} 天
                </el-tag>
              </div>
            </div>
            <div class="summary-item" v-if="decisionSupport">
              <div class="summary-label">仓库档期</div>
              <div class="summary-value">
                <el-tag type="success" size="small">{{
                  decisionSupport.warehouseAvailability
                }}</el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 明细与趋势区（横向布局） -->
    <div class="detail-section">
      <!-- 3.1 左侧：费用明细 -->
      <div class="detail-left">
        <!-- ✅ 关键修复：移除费用明细标题，节省空间 -->
        <el-table :data="breakdownTableData" border stripe size="small" :height="248">
          <el-table-column prop="label" label="费用项" width="80">
            <template #default="{ row }">
              <span style="font-weight: 500">{{ row.label }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="original" label="原方案" align="center" width="75">
            <template #default="{ row }">
              <span :class="getAmountClass(row.original)"> ${{ formatNumber(row.original) }} </span>
            </template>
          </el-table-column>
          <el-table-column prop="optimized" label="优化后" align="center" width="75">
            <template #default="{ row }">
              <span :class="getAmountClass(row.optimized)">
                ${{ formatNumber(row.optimized) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="diff" label="变化" align="center" width="75">
            <template #default="{ row }">
              <span :class="getDiffClass(row.diff)">
                <el-icon v-if="row.diff < 0"><ArrowDown /></el-icon>
                <el-icon v-else-if="row.diff > 0"><ArrowUp /></el-icon>
                {{ row.diff !== 0 ? (row.diff > 0 ? '+' : '') : '' }}${{
                  formatNumber(Math.abs(row.diff))
                }}
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 3.2 右侧：成本趋势 -->
      <div class="detail-right">
        <!-- ✅ 关键修复：移除成本趋势标题，节省空间 -->
        <!-- ✅ 关键修复：只有当有数据时才显示图表 -->
        <div
          v-if="report.allAlternatives && report.allAlternatives.length > 0"
          class="trend-chart-container"
        >
          <CostTrendChart :alternatives="report.allAlternatives" />
        </div>
      </div>
    </div>

    <!-- 4. 优化建议与操作 -->
    <div class="action-section" v-if="currentSavings.explanation || showActions">
      <div class="suggestion-brief" v-if="currentSavings.explanation">
        <el-alert title="💡 优化建议" type="success" :closable="false" show-icon>
          <template #default>
            <span class="suggestion-text">{{ currentSavings.explanation }}</span>
          </template>
        </el-alert>
      </div>

      <div class="action-buttons" v-if="showActions">
        <el-button @click="handleReject">放弃优化</el-button>
        <el-button type="success" @click="handleAccept">✅ 确认选择最优方案</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import CostTrendChart from './CostTrendChart.vue'

// ============================================================================
// 类型定义（遵循 SKILL：复用现有类型）
// ============================================================================

interface CostBreakdownItem {
  demurrageCost: number
  detentionCost: number
  storageCost: number
  yardStorageCost?: number
  transportationCost: number
  handlingCost?: number
  totalCost: number
}

interface Alternative {
  pickupDate: string // ✅ 提柜日
  deliveryDate?: string // ✅ 送柜日
  unloadDate?: string // ✅ 卸柜日
  returnDate?: string // ✅ 还箱日
  strategy: 'Direct' | 'Drop off' | 'Expedited'
  totalCost: number
  breakdown: CostBreakdownItem
  savings?: number
  isWithinFreePeriod: boolean
}

interface OptimizationReport {
  originalCost: {
    total: number
    pickupDate: string
    strategy: string
    breakdown: CostBreakdownItem
  }
  optimizedCost: {
    total: number
    pickupDate: string
    strategy: string
    breakdown: CostBreakdownItem
  }
  savings: {
    amount: number
    percentage: number
    explanation: string
  }
  decisionSupport: {
    freeDaysRemaining: number
    lastFreeDate: string
    warehouseAvailability: string
    weekendAlert: boolean
  }
  allAlternatives: Alternative[]
}

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  report: OptimizationReport
  containerNumber?: string // ✅ 新增：柜号
  loading?: boolean
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showActions: true,
  containerNumber: '', // ✅ 新增：默认空字符串
})

interface Emits {
  (e: 'accept', alternative: Alternative): void
  (e: 'reject', alternative: Alternative): void
  (e: 'view-details', alternative: Alternative): void
}

const emit = defineEmits<Emits>()

// ============================================================================
// 响应式状态（遵循 SKILL：单一事实来源）
// ============================================================================

// ✅ 关键新增：跟踪用户选择的方案（默认为最优方案）
const selectedAlternativeIndex = ref(0)

// ============================================================================
// 计算属性 - 数据提取（遵循 SKILL：单一事实来源）
// ============================================================================

// 从 report 中提取数据（直接使用后端返回的权威数据）
const originalCost = computed(() => props.report.originalCost)
const optimizedCost = computed(() => props.report.optimizedCost)
const savings = computed(() => props.report.savings)
const decisionSupport = computed(() => props.report.decisionSupport)

// ✅ 关键新增：获取当前选择的方案
const selectedAlternative = computed(() => {
  const allAlts = props.report.allAlternatives || []
  return allAlts[selectedAlternativeIndex.value] || allAlts[0]
})

// ✅ 关键新增：根据选择的方案动态计算优化后的费用
const currentOptimizedCost = computed(() => {
  const alt = selectedAlternative.value
  if (!alt) return optimizedCost.value

  return {
    total: alt.totalCost,
    pickupDate: alt.pickupDate,
    strategy: alt.strategy,
    breakdown: alt.breakdown,
  }
})

// ✅ 关键新增：根据选择的方案动态计算节省金额（可正可负）
const currentSavings = computed(() => {
  const orig = originalCost.value.total
  const opt = currentOptimizedCost.value.total
  const amount = orig - opt // ✅ 正数=节省，负数=上涨
  const percentage = orig > 0 ? (amount / orig) * 100 : 0

  return {
    amount: amount, // ✅ 保留正负号
    percentage: percentage, // ✅ 保留正负号
    isIncrease: amount < 0, // ✅ 新增：是否上涨
    explanation: generateSavingsExplanation(currentOptimizedCost.value, originalCost.value),
  }
})

// ✅ 修复 4: 备选方案列表（Top 3，用于多方案对比展示）
const alternatives = computed(() => {
  const allAlts = props.report.allAlternatives || []
  // 取前 3 个最优方案（已按成本排序）
  return allAlts.slice(0, 3).map(alt => ({
    ...alt,
    pickupDate: alt.pickupDate,
    strategy: alt.strategy,
    totalCost: alt.totalCost,
    savings: alt.savings || 0,
  }))
})

// 构建费用明细对比表数据（✅ 关键修复：根据选择的方案动态更新）
const breakdownTableData = computed(() => {
  const orig = originalCost.value.breakdown
  const opt = currentOptimizedCost.value.breakdown || {}

  return [
    {
      label: '滞港费',
      original: orig.demurrageCost || 0,
      optimized: opt.demurrageCost || 0,
      diff: (opt.demurrageCost || 0) - (orig.demurrageCost || 0),
    },
    {
      label: '滞箱费',
      original: orig.detentionCost || 0,
      optimized: opt.detentionCost || 0,
      diff: (opt.detentionCost || 0) - (orig.detentionCost || 0),
    },
    {
      label: '港口存储费',
      original: orig.storageCost || 0,
      optimized: opt.storageCost || 0,
      diff: (opt.storageCost || 0) - (orig.storageCost || 0),
    },
    {
      label: '运输费',
      original: orig.transportationCost || 0,
      optimized: opt.transportationCost || 0,
      diff: (opt.transportationCost || 0) - (orig.transportationCost || 0),
    },
    {
      label: '外部堆场费',
      original: orig.yardStorageCost || 0,
      optimized: opt.yardStorageCost || 0,
      diff: (opt.yardStorageCost || 0) - (orig.yardStorageCost || 0),
    },
    {
      label: '操作费',
      original: orig.handlingCost || 0,
      optimized: opt.handlingCost || 0,
      diff: (opt.handlingCost || 0) - (orig.handlingCost || 0),
    },
    {
      label: '合计',
      original: orig.totalCost || 0,
      optimized: currentOptimizedCost.value.total || 0,
      diff: (currentOptimizedCost.value.total || 0) - (orig.totalCost || 0),
    },
  ]
})

// 节省金额分级（用于视觉样式）
const savingsLevelClass = computed(() => {
  const amount = Math.abs(savings.value.amount) // ✅ 使用绝对值
  if (amount > 100) return 'high'
  if (amount >= 50) return 'medium'
  return 'low'
})

// ✅ 新增：关键信息卡片样式类（与左侧卡片对称）
const decisionSummaryClass = computed(() => {
  // 根据免费期剩余天数返回不同的样式类
  const freeDays = decisionSupport.value?.freeDaysRemaining || 0
  if (freeDays <= 2) return 'urgent' // 紧急
  if (freeDays <= 5) return 'warning' // 警告
  return '充足' // 充足
})

// 自动从费用变化中提取亮点（未使用，暂时保留）
// const suggestionDetails = computed(() => {
//   const details: string[] = []
//   breakdownTableData.value.forEach((item) => {
//     if (item.diff < -50) {
//       details.push(`${item.label}降低 $${Math.abs(item.diff).toFixed(2)}`)
//     }
//   })
//   return details
// })

// ============================================================================
// 事件处理（遵循 SKILL：数据一致性）
// ============================================================================

// ✅ 关键新增：处理方案选择
const handleSelectAlternative = (alternative: any) => {
  const index = alternatives.value.findIndex(
    alt => alt.pickupDate === alternative.pickupDate && alt.totalCost === alternative.totalCost
  )

  if (index !== -1) {
    selectedAlternativeIndex.value = index
    console.log('[OptimizationResultCard] 选择方案:', {
      index,
      pickupDate: alternative.pickupDate,
      totalCost: alternative.totalCost,
      savings: alternative.savings,
    })
  }
}

// 处理接受优化
const handleAccept = () => {
  // ✅ 关键修复：使用当前选择的方案，而不是固定的最优方案
  const selectedAlt = selectedAlternative.value
  emit('accept', selectedAlt)
}

// 处理拒绝优化
const handleReject = () => {
  const selectedAlt = selectedAlternative.value
  emit('reject', selectedAlt)
}

// ============================================================================
// 工具函数
// ============================================================================

// ✅ 新增：格式化策略显示（Direct 显示为 Live Unload）
const formatStrategy = (strategy: string): string => {
  if (strategy === 'Direct') {
    return 'Live Unload'
  }
  return strategy
}

// ✅ 新增：生成节省说明（显示四个日期）
const generateSavingsExplanation = (optimized: any, original: any) => {
  const origDate = original.pickupDate
  const optPickupDate = optimized.pickupDate
  const optDeliveryDate = optimized.deliveryDate || optPickupDate
  const optUnloadDate = optimized.unloadDate || optPickupDate
  const optReturnDate = optimized.returnDate || optPickupDate
  const strategy = formatStrategy(optimized.strategy) // ✅ 使用格式化后的策略名
  const amount = original.total - optimized.total

  if (amount > 0) {
    return `通过调整日期：提 ${optPickupDate}、送 ${optDeliveryDate}、卸 ${optUnloadDate}、还 ${optReturnDate}，采用 ${strategy} 策略，预计节省 $${amount.toFixed(2)}`
  } else if (amount < 0) {
    return `通过调整日期：提 ${optPickupDate}、送 ${optDeliveryDate}、卸 ${optUnloadDate}、还 ${optReturnDate}，采用 ${strategy} 策略，费用增加 $${Math.abs(amount).toFixed(2)}`
  } else {
    return `调整日期：提 ${optPickupDate}、送 ${optDeliveryDate}、卸 ${optUnloadDate}、还 ${optReturnDate}，采用 ${strategy} 策略，费用不变`
  }
}

// 格式化数字
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// 获取金额样式类
const getAmountClass = (amount: number): string => {
  if (amount === 0) return 'amount-zero'
  if (amount < 100) return 'amount-low'
  if (amount < 500) return 'amount-medium'
  return 'amount-high'
}

// 获取变化样式类
const getDiffClass = (diff: number): string => {
  if (diff < 0) return 'diff-down' // 费用降低（好事）
  if (diff > 0) return 'diff-up' // 费用增加（坏事）
  return 'diff-same'
}

// 获取紧急程度标签类型
const getUrgencyType = (days: number): string => {
  if (days <= 2) return 'danger'
  if (days <= 5) return 'warning'
  return 'success'
}

// 获取节省金额样式类（未使用，暂时保留）
// const getSavingsClass = (amount: number): string => {
//   if (amount === 0) return 'savings-zero'
//   if (amount < 100) return 'savings-low'
//   if (amount < 500) return 'savings-medium'
//   return 'savings-high'
// }
</script>

<style scoped lang="scss">
.optimization-result-card {
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

// 标题区
.title-section {
  margin-bottom: 20px;

  .main-title {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 18px;
    font-weight: 600;
    color: #303133;

    .report-title {
      font-weight: 600;
      color: #303133;
    }
  }
}

// 核心结论区（横向布局）
.conclusion-section {
  display: grid;
  grid-template-columns: 160px 1fr 140px; /* ✅ 关键修复：进一步减小右侧宽度 */
  gap: 12px;
  margin-bottom: 20px;

  .conclusion-left {
    .savings-highlight {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #bae6fd;
      border-radius: 8px; /* ✅ 关键修复：减小圆角 */
      padding: 12px; /* ✅ 关键修复：减小 padding */
      text-align: center;

      &.high {
        border-color: #67c23a;
        background: linear-gradient(135deg, #f0f9ff 0%, #e6ffed 100%);
      }

      &.medium {
        border-color: #e6a23c;
      }

      &.low {
        border-color: #909399;
      }

      .savings-icon {
        font-size: 24px; /* ✅ 关键修复：减小图标 */
        margin-bottom: 6px;
      }

      .savings-amount {
        font-size: 28px; /* ✅ 关键修复：减小金额字体 */
        font-weight: bold;
        color: #67c23a;
        margin-bottom: 4px;
      }

      .savings-percent {
        font-size: 14px; /* ✅ 关键修复：减小百分比字体 */
        color: #67c23a;
        margin-bottom: 6px;
      }

      .savings-label {
        font-size: 12px; /* ✅ 关键修复：减小标签字体 */
        color: #606266;
      }

      /* ✅ 新增：费用上涨样式（红色） */
      .amount-increase {
        color: #f56c6c !important; /* 红色 */
      }

      .percent-increase {
        color: #f56c6c !important; /* 红色 */
      }
    }
  }

  .conclusion-center {
    .cost-comparison-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 12px; /* ✅ 关键修复：减小 padding */

      .cost-alternatives-scroll {
        display: flex;
        gap: 8px; /* ✅ 关键修复：减小 gap */
        overflow-x: auto;
        padding: 6px 0; /* ✅ 关键修复：减小 padding */

        .cost-item {
          flex: 0 0 auto;
          min-width: 120px; /* ✅ 关键修复：减小卡片宽度 */
          background: #fff;
          border: 2px solid #e4e7ed;
          border-radius: 6px; /* ✅ 关键修复：减小圆角 */
          padding: 10px; /* ✅ 关键修复：减小 padding */
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;

          &:hover {
            border-color: #409eff;
            box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
          }

          &.is-best {
            border-color: #67c23a;
            box-shadow: 0 2px 12px rgba(103, 194, 58, 0.3);
          }

          .cost-label {
            font-size: 12px; /* ✅ 关键修复：减小标签字体 */
            color: #909399;
            margin-bottom: 4px; /* ✅ 关键修复：减小间距 */
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;

            .best-badge {
              font-size: 11px; /* ✅ 关键修复：减小徽章字体 */
            }
          }

          .cost-value {
            font-size: 18px; /* ✅ 关键修复：减小金额字体 */
            font-weight: bold;
            color: #303133;
            margin-bottom: 4px;

            &.cost-value-small {
              font-size: 16px; /* ✅ 关键修复：进一步减小字体 */
            }
          }

          .cost-detail {
            font-size: 11px; /* ✅ 关键修复：减小详情字体 */
            color: #606266;
            margin-bottom: 6px; /* ✅ 关键修复：减小间距 */
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;

            &.cost-detail-small {
              font-size: 10px; /* ✅ 关键修复：进一步减小字体 */
            }
          }

          .savings-tag {
            display: inline-block;
            background: #f0f9ff;
            color: #67c23a;
            padding: 2px 6px; /* ✅ 关键修复：减小 padding */
            border-radius: 4px;
            font-size: 11px; /* ✅ 关键修复：减小字体 */
            margin-bottom: 6px; /* ✅ 关键修复：减小间距 */

            &.savings-tag-small {
              font-size: 10px; /* ✅ 关键修复：进一步减小字体 */
              padding: 2px 4px; /* ✅ 关键修复：进一步减小 padding */
            }
          }

          .select-action {
            margin-top: 6px; /* ✅ 关键修复：减小间距 */

            .el-button {
              width: 100%;
              padding: 8px 10px; /* ✅ 关键修复：减小按钮 padding */
              font-size: 11px; /* ✅ 关键修复：减小按钮字体 */
            }

            .selected {
              background: #67c23a;
              border-color: #67c23a;
            }
          }
        }

        .arrow-divider {
          display: flex;
          align-items: center;
          color: #909399;
          font-size: 14px; /* ✅ 关键修复：减小箭头字体 */
        }
      }
    }
  }

  .conclusion-right {
    .decision-summary {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px; /* ✅ 关键修复：减小圆角 */
      padding: 12px; /* ✅ 优化：与左侧卡片一致 */
      display: flex;
      gap: 12px;
      align-items: flex-start;

      /* ✅ 新增：与左侧卡片对称的样式 */
      &.urgent {
        background: #fef0f0;
        border: 1px solid #fde2e2;
      }

      &.warning {
        background: #fdf6ec;
        border: 1px solid #faecd8;
      }

      &.充足 {
        background: #f0f9ff;
        border: 1px solid #d1ecfe;
      }

      .summary-icon {
        font-size: 20px;
        line-height: 1;
      }

      .summary-content {
        flex: 1;
        min-width: 0;

        .summary-title {
          font-size: 14px;
          font-weight: 600;
          color: #303133;
          margin-bottom: 8px;
        }

        .summary-item {
          margin-bottom: 8px;

          &:last-child {
            margin-bottom: 0;
          }

          .summary-label {
            font-size: 12px;
            color: #606266;
            margin-bottom: 4px;
          }

          .summary-value {
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 6px;

            :deep(.el-tag) {
              font-size: 11px;
              padding: 2px 6px;
            }
          }
        }
      }
    }
  }
}

// 明细与趋势区（横向布局）
.detail-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px; /* ✅ 关键修复：减小 gap */
  margin-bottom: 16px;

  .detail-left {
    min-height: 260px; /* ✅ 关键修复：增加最小高度以匹配图表 */
    overflow-x: auto; /* ✅ 关键修复：允许横向滚动 */
    background: #fff; /* ✅ 新增：白色背景 */
    border-radius: 6px; /* ✅ 新增：圆角 */
    padding: 12px; /* ✅ 新增：内距，与图表一致 */
    border: 1px solid #e4e7ed; /* ✅ 新增：边框，与图表一致 */
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); /* ✅ 新增：轻微阴影 */

    // ✅ 关键修复：表格容器
    :deep(.el-table) {
      max-width: 100%; /* 限制最大宽度 */
      background: transparent; /* ✅ 新增：透明背景 */
      border: none; /* ✅ 移除表格边框，由外层容器提供 */

      // ✅ 新增：表格边框美化
      &.is-border {
        border-left: 1px solid #ebeef5;

        td,
        th {
          border-right: 1px solid #ebeef5;
          border-bottom: 1px solid #ebeef5;
        }
      }

      .el-table__header {
        th {
          padding: 12px 0; /* ✅ 优化：增加 padding */
          font-size: 13px; /* ✅ 优化：调整字体 */
          background: #f5f7fa; /* ✅ 新增：表头背景 */
          text-align: center; /* ✅ 新增：表头居中 */
        }
      }

      .el-table__body {
        td {
          padding: 12px 0; /* ✅ 优化：增加 padding */
          font-size: 12px; /* ✅ 优化：调整字体 */
          text-align: center; /* ✅ 新增：内容居中 */
        }
      }
    }
  }

  .detail-right {
    .detail-title {
      display: none; /* ✅ 关键修复：隐藏标题 */
    }

    .trend-chart-container {
      height: 270px; /* ✅ 优化：增加 5px 高度 */
      border: 1px solid #e4e7ed;
      border-radius: 6px; /* ✅ 关键修复：减小圆角 */
      padding: 12px; /* ✅ 优化：增加 padding */
      background: #fff;
      position: relative;
      box-sizing: border-box; /* ✅ 确保 padding 不增加总高度 */
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); /* ✅ 新增：轻微阴影 */

      :deep(.vue-echarts) {
        height: 253px; /* ✅ 优化：增加 5px，与容器高度一致（265px - 24px padding） */
        width: 100%;
      }
    }

    .no-data {
      height: 260px; /* ✅ 关键修复：固定高度与表格一致 */
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e4e7ed;
      border-radius: 6px;
      background: #fafafa;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); /* ✅ 新增：轻微阴影 */
    }
  }
}

// 优化建议与操作
.action-section {
  .suggestion-brief {
    margin-bottom: 16px;

    .suggestion-text {
      font-size: 14px;
      color: #606266;
    }
  }

  .action-buttons {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }
}

// 表格样式
:deep(.el-table) {
  font-size: 12px;

  .el-table__header {
    th {
      background: #f5f7fa;
      color: #606266;
      font-weight: 600;
    }
  }

  .cell {
    padding: 8px 0;
  }
}

// 金额样式
.amount-zero {
  color: #67c23a;
}

.amount-low {
  color: #e6a23c;
}

.amount-medium {
  color: #f56c6c;
}

.amount-high {
  color: #f56c6c;
  font-weight: bold;
}

.diff-down {
  color: #67c23a;
  font-weight: 500;
}

.diff-up {
  color: #f56c6c;
  font-weight: 500;
}

.diff-same {
  color: #909399;
}
</style>
