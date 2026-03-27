<template>
  <el-dialog
    v-model="visible"
    title="排产预览"
    width="95%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 操作按钮区 -->
    <div class="action-bar">
      <el-button
        type="warning"
        icon="MagicStick"
        :loading="optimizing"
        @click="handleSmartOptimization"
      >
        🎯 智能成本优化
      </el-button>
      <el-tag v-if="optimizationResult" type="success" effect="plain">
        💰 已优化 {{ optimizationResult.optimizedCount }} 柜，可节省
        <strong>${{ (optimizationResult.totalSavings ?? 0).toFixed(2) }}</strong>
      </el-tag>
    </div>

    <!-- 概览信息 -->
    <div class="preview-summary">
      <el-descriptions :column="5" border>
        <el-descriptions-item label="总柜数">
          {{ previewResults.length }}
        </el-descriptions-item>
        <el-descriptions-item label="成功">
          <el-tag type="success">{{ successCount }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="失败">
          <el-tag type="danger">{{ failedCount }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="Drop off"> {{ dropOffCount }} 柜 </el-descriptions-item>
        <el-descriptions-item label="预估总费用">
          <el-tag type="warning">{{
            formatCurrency(
              totalEstimatedCost,
              previewResults[0]?.plannedData?.warehouseCountry || 'US'
            )
          }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="平均费用">
          <el-tag v-if="successCount > 0" :type="averageCostType">
            {{
              formatCurrency(averageCost, previewResults[0]?.plannedData?.warehouseCountry || 'US')
            }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="费用区间">
          <span style="font-weight: bold; color: #606266">
            {{ formatCurrency(minCost, previewResults[0]?.plannedData?.warehouseCountry || 'US') }}
            ~
            {{ formatCurrency(maxCost, previewResults[0]?.plannedData?.warehouseCountry || 'US') }}
          </span>
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 详细表格 -->
    <el-table
      :data="previewResults"
      max-height="500"
      stripe
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="containerNumber" label="柜号" width="120" fixed>
        <template #default="{ row }">
          <el-link type="primary" @click="$emit('viewContainer', row.containerNumber)">
            {{ row.containerNumber }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="destinationPort" label="目的港" width="90" />
      <!-- ✅ 已删除 lastFreeDate 列：因免费天数来源不明确（滞港/滞箱可能不同），应以成本计算结果为准 -->
      <el-table-column prop="lastReturnDate" label="最晚还箱日" width="100" />

      <!-- ✅ 删除"剩余免费天"列：遵循 SKILL 原则，避免语义模糊的字段 -->
      <!-- 免费期计算应该统一由 DemurrageService 负责，前端不需要单独显示 -->

      <el-table-column prop="plannedPickupDate" label="提柜日" width="100" />
      <el-table-column prop="plannedDeliveryDate" label="送仓日" width="100" />
      <el-table-column prop="plannedUnloadDate" label="卸柜日" width="100" />
      <el-table-column prop="plannedReturnDate" label="还箱日" width="100" />
      <el-table-column prop="unloadMode" label="方式" width="90">
        <template #default="{ row }">
          <el-tag :type="row.unloadMode === 'Drop off' ? 'success' : 'info'" size="small">
            {{ row.unloadMode }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="warehouseName" label="仓库" min-width="150" show-overflow-tooltip />
      <el-table-column prop="truckingCompany" label="车队" min-width="150" show-overflow-tooltip />

      <!-- 费用明细列展开 -->
      <el-table-column
        prop="estimatedCosts.demurrageCost"
        label="滞港费"
        width="95"
        sortable
        align="right"
      >
        <template #default="{ row }">
          <span
            v-if="row.estimatedCosts?.demurrageCost"
            :class="getAmountClass(row.estimatedCosts.demurrageCost)"
          >
            {{
              formatCurrency(
                row.estimatedCosts.demurrageCost,
                row.plannedData?.warehouseCountry || 'US'
              )
            }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column
        prop="estimatedCosts.detentionCost"
        label="滞箱费"
        width="95"
        sortable
        align="right"
      >
        <template #default="{ row }">
          <span
            v-if="row.estimatedCosts?.detentionCost"
            :class="getAmountClass(row.estimatedCosts.detentionCost)"
          >
            {{
              formatCurrency(
                row.estimatedCosts.detentionCost,
                row.plannedData?.warehouseCountry || 'US'
              )
            }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column
        prop="estimatedCosts.storageCost"
        label="港口存储费"
        width="105"
        sortable
        align="right"
      >
        <template #default="{ row }">
          <span
            v-if="row.estimatedCosts?.storageCost"
            :class="getAmountClass(row.estimatedCosts.storageCost)"
          >
            {{
              formatCurrency(
                row.estimatedCosts.storageCost,
                row.plannedData?.warehouseCountry || 'US'
              )
            }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column
        prop="estimatedCosts.ddCombinedCost"
        label="D&D 合并费"
        width="105"
        sortable
        align="right"
      >
        <template #default="{ row }">
          <span
            v-if="row.estimatedCosts?.ddCombinedCost"
            :class="getAmountClass(row.estimatedCosts.ddCombinedCost)"
          >
            {{
              formatCurrency(
                row.estimatedCosts.ddCombinedCost,
                row.plannedData?.warehouseCountry || 'US'
              )
            }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column
        prop="estimatedCosts.transportationCost"
        label="运输费"
        width="95"
        sortable
        align="right"
      >
        <template #default="{ row }">
          <span
            v-if="row.estimatedCosts?.transportationCost"
            :class="getAmountClass(row.estimatedCosts.transportationCost)"
          >
            {{
              formatCurrency(
                row.estimatedCosts.transportationCost,
                row.plannedData?.warehouseCountry || 'US'
              )
            }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column
        prop="estimatedCosts.yardStorageCost"
        label="外部堆场费"
        width="110"
        sortable
        align="right"
      >
        <template #default="{ row }">
          <span
            v-if="row.estimatedCosts?.yardStorageCost"
            :class="getAmountClass(row.estimatedCosts.yardStorageCost)"
          >
            {{
              formatCurrency(
                row.estimatedCosts.yardStorageCost,
                row.plannedData?.warehouseCountry || 'US'
              )
            }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column
        prop="estimatedCosts.handlingCost"
        label="操作费"
        width="95"
        sortable
        align="right"
      >
        <template #default="{ row }">
          <span
            v-if="row.estimatedCosts?.handlingCost"
            :class="getAmountClass(row.estimatedCosts.handlingCost)"
          >
            {{
              formatCurrency(
                row.estimatedCosts.handlingCost,
                row.plannedData?.warehouseCountry || 'US'
              )
            }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column
        prop="estimatedCosts.totalCost"
        label="总费用"
        width="110"
        sortable
        align="right"
      >
        <template #default="{ row }">
          <span
            v-if="row.estimatedCosts?.totalCost"
            :class="['total-cost', getAmountClass(row.estimatedCosts.totalCost)]"
          >
            {{
              formatCurrency(
                row.estimatedCosts.totalCost,
                row.plannedData?.warehouseCountry || 'US'
              )
            }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <!-- ✅ Task 2.2: 新增优化建议列 -->
      <el-table-column label="💡 优化建议" width="130" align="center">
        <template #default="{ row }">
          <div
            v-if="row.optimizationSuggestions"
            style="display: flex; flex-direction: column; gap: 4px"
          >
            <el-tag
              v-if="row.optimizationSuggestions.shouldOptimize"
              type="success"
              effect="plain"
              size="small"
              style="cursor: pointer"
              @click="handleViewOptimizationSuggestion(row)"
            >
              💰 可省 ${{ row.optimizationSuggestions.savings.toFixed(2) }}
            </el-tag>
            <el-tag v-else type="info" effect="plain" size="small"> ✅ 已最优 </el-tag>
            <div
              v-if="row.optimizationSuggestions.shouldOptimize"
              style="font-size: 11px; color: #67c23a; cursor: pointer"
              @click="handleViewOptimizationSuggestion(row)"
            >
              查看详情 →
            </div>
          </div>
          <span v-else style="color: #999">-</span>
        </template>
      </el-table-column>

      <el-table-column label="费用明细" width="100" align="center">
        <template #default="{ row }">
          <el-popover v-if="row.estimatedCosts" placement="left" :width="220" trigger="hover">
            <div style="font-size: 12px">
              <p v-if="row.estimatedCosts.demurrageCost" style="margin: 4px 0">
                滞港费：{{
                  formatCurrency(
                    row.estimatedCosts.demurrageCost,
                    row.plannedData?.warehouseCountry || 'US'
                  )
                }}
              </p>
              <p v-if="row.estimatedCosts.detentionCost" style="margin: 4px 0">
                滞箱费：{{
                  formatCurrency(
                    row.estimatedCosts.detentionCost,
                    row.plannedData?.warehouseCountry || 'US'
                  )
                }}
              </p>
              <p v-if="row.estimatedCosts.storageCost" style="margin: 4px 0">
                港口存储费：{{
                  formatCurrency(
                    row.estimatedCosts.storageCost,
                    row.plannedData?.warehouseCountry || 'US'
                  )
                }}
              </p>
              <p v-if="row.estimatedCosts.ddCombinedCost" style="margin: 4px 0">
                D&D 合并费：{{
                  formatCurrency(
                    row.estimatedCosts.ddCombinedCost,
                    row.plannedData?.warehouseCountry || 'US'
                  )
                }}
              </p>
              <p v-if="row.estimatedCosts.transportationCost" style="margin: 4px 0">
                运输费：{{
                  formatCurrency(
                    row.estimatedCosts.transportationCost,
                    row.plannedData?.warehouseCountry || 'US'
                  )
                }}
              </p>
              <p v-if="row.estimatedCosts.yardStorageCost" style="margin: 4px 0">
                外部堆场费：{{
                  formatCurrency(
                    row.estimatedCosts.yardStorageCost,
                    row.plannedData?.warehouseCountry || 'US'
                  )
                }}
              </p>
              <p v-if="row.estimatedCosts.handlingCost" style="margin: 4px 0">
                操作费：{{
                  formatCurrency(
                    row.estimatedCosts.handlingCost,
                    row.plannedData?.warehouseCountry || 'US'
                  )
                }}
              </p>
              <el-divider style="margin: 8px 0" />
              <p style="margin: 4px 0; font-weight: bold; color: #e6a23c">
                合计：{{
                  formatCurrency(
                    row.estimatedCosts.totalCost || 0,
                    row.plannedData?.warehouseCountry || 'US'
                  )
                }}
              </p>
            </div>
            <template #reference>
              <el-button type="default" size="small" icon="QuestionFilled">明细</el-button>
            </template>
          </el-popover>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <!-- ✅ Task 2.2: 新增优化建议列 -->
      <el-table-column label="💡 优化建议" width="130" align="center">
        <template #default="{ row }">
          <div
            v-if="row.optimizationSuggestions"
            style="display: flex; flex-direction: column; gap: 4px"
          >
            <el-tag
              v-if="row.optimizationSuggestions.shouldOptimize"
              type="success"
              effect="plain"
              size="small"
              style="cursor: pointer"
              @click="handleViewOptimizationSuggestion(row)"
            >
              💰 可省 ${{ row.optimizationSuggestions.savings.toFixed(2) }}
            </el-tag>
            <el-tag v-else type="info" effect="plain" size="small"> ✅ 已最优 </el-tag>
            <div
              v-if="row.optimizationSuggestions.shouldOptimize"
              style="font-size: 11px; color: #67c23a; cursor: pointer"
              @click="handleViewOptimizationSuggestion(row)"
            >
              查看详情 →
            </div>
          </div>
          <span v-else style="color: #999">-</span>
        </template>
      </el-table-column>

      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-icon v-if="row.success" color="#67C23A"><CircleCheck /></el-icon>
          <el-icon v-else color="#F56C6C"><CircleClose /></el-icon>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="说明" min-width="150" show-overflow-tooltip />
    </el-table>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button
          type="primary"
          @click="handleConfirm"
          :loading="saving"
          :disabled="selectedContainers.length === 0"
        >
          确认保存 ({{ selectedContainers.length }}/{{ previewResults.length }})
        </el-button>
      </div>
    </template>

    <!-- ✅ 成本优化结果卡片弹窗 -->
    <el-dialog
      v-model="showOptimizationDialog"
      title="💰 成本优化分析报告"
      width="900px"
      :close-on-click-modal="false"
    >
      <OptimizationResultCard
        v-if="bulkOptimizationReport"
        :report="bulkOptimizationReport"
        :loading="optimizing"
        :show-actions="true"
        @accept="handleAcceptOptimization"
        @reject="handleRejectOptimization"
      />
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { useCostOptimization } from '@/composables/useCostOptimization'
import { CircleCheck, CircleClose } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, ref, watch } from 'vue'
import OptimizationResultCard from './OptimizationResultCard.vue'

interface PreviewResult {
  containerNumber: string
  success: boolean
  message?: string
  plannedData?: {
    plannedPickupDate?: string
    plannedDeliveryDate?: string
    plannedUnloadDate?: string
    plannedReturnDate?: string
    warehouseId?: string
    warehouseName?: string
    warehouseCode?: string
    warehouseCountry?: string // ✅ 新增：仓库所在国家
    truckingCompanyId?: string
    truckingCompany?: string
    unloadMode?: 'Drop off' | 'Live load'
  }
  estimatedCosts?: {
    demurrageCost?: number
    detentionCost?: number
    storageCost?: number
    transportationCost?: number
    yardStorageCost?: number
    handlingCost?: number
    totalCost?: number
    currency?: string
  }
  destinationPort?: string
  // ✅ Task 2.2: 新增成本优化建议字段
  optimizationSuggestions?: {
    originalCost: number
    optimizedCost: number
    savings: number
    suggestedPickupDate: string
    suggestedStrategy?: string
    shouldOptimize: boolean
  }
}

const props = defineProps<{
  previewResults: PreviewResult[]
}>()

const emit = defineEmits<{
  confirm: [selectedContainers: string[]]
  cancel: []
  viewContainer: [containerNumber: string]
}>()

const visible = ref(true)
const selectedContainers = ref<string[]>([])
const saving = ref(false)

// ✅ 使用统一的成本优化 Hook
const { optimizing, optimizationResult, executeOptimization } = useCostOptimization()
const showOptimizationDialog = ref(false) // ✅ 显示优化结果对话框
const bulkOptimizationReport = ref<any>(null) // ✅ 批量优化报告

const successCount = computed(() => props.previewResults.filter(r => r.success).length)

const failedCount = computed(() => props.previewResults.filter(r => !r.success).length)

const dropOffCount = computed(
  () => props.previewResults.filter(r => r.plannedData?.unloadMode === 'Drop off').length
)

const totalEstimatedCost = computed((): number => {
  const results = props.previewResults.filter(r => r.success && r.estimatedCosts?.totalCost)
  return results.reduce((sum, r) => {
    const cost = r.estimatedCosts?.totalCost ?? 0
    return sum + cost
  }, 0)
})

// 平均费用
const averageCost = computed(() => {
  const successWithCost = props.previewResults.filter(r => r.success && r.estimatedCosts?.totalCost)
  if (successWithCost.length === 0) return 0
  return totalEstimatedCost.value / successWithCost.length
})

// 最小费用
const minCost = computed(() => {
  const costs = props.previewResults
    .filter(r => r.success && r.estimatedCosts?.totalCost)
    .map(r => r.estimatedCosts!.totalCost!)
  return costs.length > 0 ? Math.min(...costs) : 0
})

// 最大费用
const maxCost = computed(() => {
  const costs = props.previewResults
    .filter(r => r.success && r.estimatedCosts?.totalCost)
    .map(r => r.estimatedCosts!.totalCost!)
  return costs.length > 0 ? Math.max(...costs) : 0
})

// 平均费用颜色类型
const averageCostType = computed(() => {
  const avg = averageCost.value
  if (avg === 0) return 'success'
  if (avg <= 100) return ''
  if (avg <= 500) return 'warning'
  return 'danger'
})

// ✅ SKILL 规范：货币格式化函数
const formatCurrency = (amount: number, countryCode?: string): string => {
  const country = countryCode || 'US'

  // 根据国家获取货币符号
  const currencyMap: Record<string, { symbol: string; code: string }> = {
    US: { symbol: '$', code: 'USD' },
    GB: { symbol: '£', code: 'GBP' },
    EU: { symbol: '€', code: 'EUR' },
    DE: { symbol: '€', code: 'EUR' },
    FR: { symbol: '€', code: 'EUR' },
    IT: { symbol: '€', code: 'EUR' },
    ES: { symbol: '€', code: 'EUR' },
    CA: { symbol: 'C$', code: 'CAD' },
    AU: { symbol: 'A$', code: 'AUD' },
    JP: { symbol: '¥', code: 'JPY' },
    CN: { symbol: '¥', code: 'CNY' },
  }

  const currency = currencyMap[country] || { symbol: '$', code: 'USD' }

  // 格式化数字（带千分位）
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return `${currency.symbol}${formattedAmount}`
}

// 费用颜色分级函数（遵循 SKILL 规范）
const getAmountClass = (amount: number): string => {
  if (amount === 0) return 'amount-zero' // 绿色：无费用
  if (amount <= 100) return 'amount-low' // 黄色：低费用
  if (amount <= 500) return 'amount-medium' // 橙色：中等费用
  if (amount <= 1000) return 'amount-high' // 红色：高费用
  return 'amount-critical' // 深红：严重警告（> $1000）
}

// ✅ 删除 getFreeDaysType 函数：不再显示"剩余免费天"列，遵循 SKILL 原则
// 免费期计算应该统一由 DemurrageService 负责，前端不需要单独显示

const handleSelectionChange = (selection: any[]) => {
  selectedContainers.value = selection.map(s => s.containerNumber)
}

const handleConfirm = async () => {
  if (selectedContainers.value.length === 0) {
    return
  }

  saving.value = true
  try {
    emit('confirm', selectedContainers.value)
    // 不立即关闭弹窗，等待父组件通知
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  visible.value = false
}

const handleClose = () => {
  emit('cancel')
}

// ✅ 智能成本优化（重构版）
const handleSmartOptimization = async () => {
  try {
    // ✅ 复用排产预览结果作为数据源
    const result = await executeOptimization(props.previewResults)

    // ✅ 构建完整的批量优化报告对象（遵循 SKILL：单一事实来源）
    const firstResult = props.previewResults[0]
    bulkOptimizationReport.value = {
      originalCost: {
        total: result.originalCost,
        pickupDate: firstResult?.plannedData?.plannedPickupDate || '',
        strategy: firstResult?.plannedData?.unloadMode || 'Direct',
        breakdown: firstResult?.estimatedCosts || {
          demurrageCost: 0,
          detentionCost: 0,
          storageCost: 0,
          yardStorageCost: 0,
          transportationCost: 0,
          handlingCost: 0,
          totalCost: result.originalCost,
        },
      },
      optimizedCost: {
        total: result.optimizedCost,
        pickupDate: result.alternatives[0]?.pickupDate || '',
        strategy: result.alternatives[0]?.strategy || 'Direct',
        breakdown: result.alternatives[0] || {
          demurrageCost: 0,
          detentionCost: 0,
          storageCost: 0,
          yardStorageCost: 0,
          transportationCost: 0,
          handlingCost: 0,
          totalCost: result.optimizedCost,
        },
      },
      savings: {
        amount: result.totalSavings,
        percentage: (result.totalSavings / result.originalCost) * 100,
        explanation: `优化 ${result.optimizedCount} 个货柜的提柜日期和策略，预计节省 $${result.totalSavings.toFixed(2)}`,
      },
      decisionSupport: {
        freeDaysRemaining: 7, // TODO: 从后端返回
        lastFreeDate: '', // TODO: 从后端返回
        warehouseAvailability: '充足',
        weekendAlert: false, // TODO: 根据实际日期计算
      },
      allAlternatives: result.alternatives.slice(0, 5).map((alt: any) => ({
        ...alt,
        breakdown: alt, // 简化处理
      })),
    }

    // ✅ 显示 OptimizationResultCard 对话框
    showOptimizationDialog.value = true

    ElMessage.success(
      `发现 ${result.optimizedCount} 个货柜可优化，预计节省 $${(result.totalSavings ?? 0).toFixed(2)}`
    )
  } catch (error: any) {
    ElMessage.error(error.message || '智能优化失败，请稍后重试')
  }
}

// ✅ 接受优化方案
const handleAcceptOptimization = (alternative: any) => {
  console.log('[handleAcceptOptimization] 接受方案:', alternative)
  showOptimizationDialog.value = false
  ElMessage.success('已应用优化方案')
  // TODO: 实际保存优化结果到数据库
}

// ✅ 拒绝优化方案
const handleRejectOptimization = (alternative: any) => {
  console.log('[handleRejectOptimization] 拒绝方案:', alternative)
  showOptimizationDialog.value = false
  ElMessage.info('已拒绝优化方案')
}

// ✅ Task 2.2: 查看单个货柜的优化建议详情
const handleViewOptimizationSuggestion = async (row: PreviewResult) => {
  try {
    if (!row.optimizationSuggestions) {
      ElMessage.warning('该货柜暂无优化建议')
      return
    }

    console.log('[handleViewOptimizationSuggestion] 查看优化建议:', row.containerNumber)

    // TODO: 构建单个货柜的优化报告并显示对话框
    // 简化处理：暂时只显示一个消息
    ElMessage.success(`可查看 ${row.containerNumber} 的优化详情：预计节省 $${row.optimizationSuggestions.savings.toFixed(2)}`)
  } catch (error: any) {
    console.error('[handleViewOptimizationSuggestion] Error:', error)
    ElMessage.error('查看优化详情失败，请稍后重试')
  }
}

// 监听预览结果变化，默认全选成功的
watch(
  () => props.previewResults,
  newResults => {
    if (newResults && newResults.length > 0) {
      // 默认选中所有成功的
      selectedContainers.value = newResults.filter(r => r.success).map(r => r.containerNumber)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fdf6ec 0%, #fef5e7 100%);
  border-radius: 8px;
  border: 1px solid #faecd8;
}

.action-bar .el-button {
  font-size: 14px;
  padding: 10px 20px;
}

.action-bar .el-tag {
  font-size: 14px;
  padding: 8px 16px;
}

.preview-summary {
  margin-bottom: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

/* 费用颜色分级样式（遵循 SKILL 规范）*/
.amount-zero {
  color: #67c23a; /* 绿色：无费用 */
  font-weight: 500;
}

.amount-low {
  color: #e6a23c; /* 黄色：低费用 */
  font-weight: 500;
}

.amount-medium {
  color: #f56c6c; /* 橙色：中等费用 */
  font-weight: 600;
}

.amount-high {
  color: #c92222; /* 红色：高费用 */
  font-weight: 700;
}

.amount-critical {
  color: #8b0000; /* 深红：严重警告 */
  font-weight: 800;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

.total-cost {
  font-size: 14px;
  font-weight: bold;
}

.total-cost.amount-critical {
  font-size: 15px;
  background: linear-gradient(45deg, #ff0000, #8b0000);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.3);
  }
}
</style>
