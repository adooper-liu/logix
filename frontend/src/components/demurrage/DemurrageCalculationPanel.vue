<script setup lang="ts">
/**
 * 滞港费日期计算与费用计算统一组件（可视化卡片）
 */
import type { DemurrageCalculationResponse } from '@/services/demurrage'
import { computed } from 'vue'

const props = defineProps<{
  data: DemurrageCalculationResponse['data'] | null
}>()

function getStd(idx: number) {
  return props.data?.matchedStandards?.[idx] ?? null
}

/** 标准是否配置了日单价或阶梯（用于「金额为 0」时的提示） */
function hasStdRate(idx: number): boolean {
  const std = getStd(idx)
  if (!std) return false
  const tiers = std.tiers
  const hasTier = Array.isArray(tiers) && tiers.length > 0
  const hasRate = std.ratePerDay != null && Number(std.ratePerDay) > 0
  return hasTier || hasRate
}

function rateConfigLabel(idx: number): string {
  const std = getStd(idx)
  if (!std) return '—'
  if (std.tiers?.length) return '阶梯费率'
  if (std.ratePerDay != null && Number(std.ratePerDay) > 0) {
    return `${Number(std.ratePerDay)} / 天`
  }
  return '未配置'
}

const summaryLine = computed(() => {
  const d = props.data
  if (!d) return ''
  const m = d.matchedStandards?.length ?? 0
  const i = d.items?.length ?? 0
  const k = d.skippedItems?.length ?? 0
  return `共匹配 ${m} 条标准：已计费 ${i} 项，暂不计算 ${k} 项；合计为已计费项金额之和。`
})

function chargeableLabel(v: string | null | undefined): string {
  if (!v) return '—'
  return v === 'N' ? '收费' : '不收费'
}

function formatDate(d: string | Date | null): string {
  if (!d) return '-'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const SOURCE_LABELS_SHORT: Record<string, string> = {
  ata: '目的港ATA',
  eta: '目的港ETA',
  revised_eta: '修正ETA',
  // 兼容旧键名
  ata_dest_port: '目的港ATA',
  eta_dest_port: '目的港ETA',
  revised_eta_dest_port: '修正ETA',
  dest_port_unload_date: '卸船日',
  discharged_time: '卸船时间',
  'process_port_operations.last_free_date': '最晚提柜日',
  'process_trucking_transport.last_pickup_date': '最晚提柜日',
  'process_trucking_transport.pickup_date': '实际提柜日',
  'process_empty_return.return_time': '实际还箱日',
  'process_empty_return.last_return_date': '最晚还箱日',
  '计算（起算日+免费天数）': '计算最晚提柜日',
  当前日期: '当天',
  'max(当前日期, process_trucking_transport.planned_pickup_date)': 'max(当天,计划提柜日)',
}

function sourceLabelShort(source: string | null | undefined): string {
  if (!source) return '-'
  return SOURCE_LABELS_SHORT[source] ?? source
}

/** 计算模式标签配置 */
const MODE_LABELS = {
  actual: {
    text: '实际模式',
    type: 'success' as const,
    desc: '状态机：已到达目的港或之后环节，按实际数据计算',
  },
  forecast: {
    text: '计划/预测模式',
    type: 'info' as const,
    desc: '状态机：未到目的港，按 ETA/计划提柜等预计',
  },
}

/** 获取计算模式标签配置 */
function getModeLabel(mode: string | undefined) {
  return (
    MODE_LABELS[mode as keyof typeof MODE_LABELS] || {
      text: '未知模式',
      type: 'info' as const,
      desc: '',
    }
  )
}

/** 计算逻辑表格行数据类型 */
interface CalculationLogicRow {
  mode: 'actual' | 'forecast'
  feeType: '滞港费' | '滞箱费' | '堆存费' | 'D&D 合并'
  startDate: string
  endDate: string
  note?: string
}

/** 获取计算逻辑表格数据 - 根据当前费用项类型返回对应的逻辑说明 */
function getCalculationLogicTable(
  chargeTypeCode: string | null | undefined,
  chargeName: string | null | undefined,
  calculationBasis: string | null | undefined
): CalculationLogicRow[] {
  const code = (chargeTypeCode ?? '').toUpperCase()
  const name = (chargeName ?? '').toLowerCase()
  const isDetention =
    code.includes('DETENTION') || name.includes('detention') || name.includes('滞箱')
  const isStorage = code.includes('STORAGE') || name.includes('storage') || name.includes('堆存')
  const isCombined =
    code.includes('D&D') ||
    code.includes('DEMURRAGE_AND_DETENTION') ||
    (name.includes('demurrage') && name.includes('detention'))
  const isDemurrage = !isDetention && !isStorage && !isCombined

  const rows: CalculationLogicRow[] = []

  // 滞港费逻辑
  if (isDemurrage) {
    const useDischarge = (calculationBasis || '').includes('卸船')
    rows.push({
      mode: 'actual',
      feeType: '滞港费',
      startDate: useDischarge ? '卸船日' : 'ATA / 卸船日',
      endDate: '实际提柜日 → 无则当天',
      note: '有提柜后费用封顶',
    })
    rows.push({
      mode: 'forecast',
      feeType: '滞港费',
      startDate: useDischarge ? '卸船日 → 修正 ETA → ETA' : 'ATA → 修正 ETA → ETA',
      endDate: 'max(当天，计划提柜日); 无则当天',
      note: '每日滚动预计',
    })
  }

  // 滞箱费逻辑
  if (isDetention && !isCombined) {
    rows.push({
      mode: 'actual',
      feeType: '滞箱费',
      startDate: '实际提柜日',
      endDate: '实际还箱日 → 无则当天',
      note: '必须有提柜日',
    })
    rows.push({
      mode: 'forecast',
      feeType: '滞箱费',
      startDate: '计划提柜日',
      endDate: 'max(当天，计划还箱日); 无则当天',
      note: '必须有计划提柜日',
    })
  }

  // 堆存费逻辑
  if (isStorage) {
    const useDischarge = (calculationBasis || '').includes('卸船')
    rows.push({
      mode: 'actual',
      feeType: '堆存费',
      startDate: useDischarge ? '卸船日' : 'ATA / 卸船日',
      endDate: '实际提柜日 → 无则当天',
      note: '已有 ATA/卸船日',
    })
    rows.push({
      mode: 'forecast',
      feeType: '堆存费',
      startDate: useDischarge ? '卸船日' : '修正 ETA → ETA',
      endDate: 'max(当天，计划提柜日); 无则当天',
      note: '无 ATA/卸船日时需计划提柜日',
    })
  }

  // D&D 合并逻辑
  if (isCombined) {
    const useDischarge = (calculationBasis || '').includes('卸船')
    rows.push({
      mode: 'actual',
      feeType: 'D&D 合并',
      startDate: useDischarge ? '卸船日' : 'ATA → 卸船日',
      endDate: '实际还箱日 → 无则当天',
      note: '不强制依赖提柜日',
    })
    rows.push({
      mode: 'forecast',
      feeType: 'D&D 合并',
      startDate: '修正 ETA → ETA',
      endDate: 'max(当天，计划还箱日); 无则当天',
      note: '需 ETA/修正 ETA',
    })
  }

  return rows
}

/** 状态机状态标签类型映射 */
const LOGISTICS_STATUS_TYPES: Record<string, 'success' | 'warning' | 'info' | 'danger'> = {
  delivered: 'success', // 已交付
  in_transit: 'warning', // 在途
  arrived_at_dest: 'warning', // 已到港
  gate_out: 'warning', // 已提柜
  empty_returned: 'success', // 已还箱
}

/** 获取状态机状态的标签类型 */
function getLogisticsStatusType(
  status: string | undefined
): 'success' | 'warning' | 'info' | 'danger' {
  if (!status) return 'info'
  return LOGISTICS_STATUS_TYPES[status] || 'info'
}

const firstStd = computed(() => props.data?.matchedStandards?.[0] ?? null)
</script>

<template>
  <template v-if="data">
    <div class="demurrage-panel">
      <!-- 1. 费用合计（含滞港/堆存等已计费项；含合并项时可能含滞箱段，以费用名称为准） -->
      <div class="demurrage-card total-card">
        <div class="card-header">
          <span class="card-icon">📊</span>
          <span class="card-title">滞港及相关费用合计</span>
          <el-tag
            v-if="data.calculationMode"
            :type="getModeLabel(data.calculationMode).type"
            size="small"
            effect="plain"
          >
            {{ getModeLabel(data.calculationMode).text }}
            <el-tooltip v-if="data.calculationMode === 'forecast'" placement="bottom" trigger="hover">
              <template #content>
                <div class="mode-explanation">
                  <p><strong>实际模式：</strong>基于实际业务节点数据计算（ATA、实际提柜日等）</p>
                  <p><strong>计划模式：</strong>基于预测数据计算（ETA、计划提柜日等），每日滚动更新</p>
                  <p class="hint">详细计算逻辑请查看下方费用明细中的「计算逻辑」表格</p>
                </div>
              </template>
              <span class="tooltip-icon">❓</span>
            </el-tooltip>
          </el-tag>
          <div v-if="firstStd" class="match-dims">
            <el-tag
              v-if="firstStd.foreignCompanyCode || firstStd.foreignCompanyName"
              size="small"
              type="info"
              effect="plain"
            >
              客户 {{ firstStd.foreignCompanyName || firstStd.foreignCompanyCode }}
            </el-tag>
            <el-tag v-if="firstStd.destinationPortCode" size="small" type="info" effect="plain">
              目的港 {{ firstStd.destinationPortName || firstStd.destinationPortCode }}
            </el-tag>
            <el-tag v-if="firstStd.shippingCompanyCode" size="small" type="info" effect="plain">
              船公司 {{ firstStd.shippingCompanyName || firstStd.shippingCompanyCode }}
            </el-tag>
            <el-tag v-if="firstStd.originForwarderCode" size="small" type="info" effect="plain">
              货代 {{ firstStd.originForwarderName || firstStd.originForwarderCode }}
            </el-tag>
          </div>
          <el-tooltip
            v-if="data.matchedStandards?.length || data.items?.length || data.skippedItems?.length"
            placement="top"
            trigger="hover"
          >
            <template #content>
              <div>{{ summaryLine }}</div>
            </template>
            <span class="total-amount with-tooltip">
              {{ data.totalAmount.toFixed(2) }} {{ data.currency || 'USD' }}
              <span class="amount-tooltip-icon">ℹ️</span>
            </span>
          </el-tooltip>
          <span v-else class="total-amount"
            >{{ data.totalAmount.toFixed(2) }} {{ data.currency || 'USD' }}</span
          >
        </div>
        <div v-if="data.logisticsStatusSnapshot" class="logistics-status">
          <span class="status-label">状态机：</span>
          <el-tag
            :type="getLogisticsStatusType(data.logisticsStatusSnapshot.status)"
            size="small"
            effect="plain"
          >
            {{ data.logisticsStatusSnapshot.reason }}（{{ data.logisticsStatusSnapshot.status }}）
          </el-tag>
        </div>
        <div v-if="data.dateOrderWarnings?.length" class="mode-hint date-order-warn">
          <span class="hint-icon">⚠️</span>
          <span class="hint-text">
            <template v-for="(w, wi) in data.dateOrderWarnings" :key="wi">{{ w }}<br /></template>
          </span>
        </div>
      </div>

      <!-- 2. 已计费明细 -->
      <div v-if="data?.items?.length" class="fee-table-section">
        <h4 class="section-title">已计费明细</h4>
        <el-table :data="data.items" stripe border size="small" class="fee-table">
          <el-table-column type="expand">
            <template #default="{ row, $index }">
              <div class="expand-content">
                <div class="expand-block logic-block">
                  <span class="expand-label">计算逻辑</span>
                  <div class="logic-tooltip-wrapper">
                    <el-tooltip
                      placement="top"
                      :hide-after="0"
                      trigger="hover"
                      popper-class="calculation-logic-tooltip"
                    >
                      <template #content>
                        <div class="calculation-logic-table">
                          <el-table
                            :data="
                              getCalculationLogicTable(
                                row.chargeTypeCode,
                                row.chargeName,
                                row.calculationBasis
                              )
                            "
                            size="small"
                            :show-header="true"
                            max-height="400"
                          >
                            <el-table-column prop="mode" label="模式" width="70">
                              <template #default="{ row: logicRow }">
                                <el-tag
                                  :type="logicRow.mode === 'actual' ? 'success' : 'warning'"
                                  size="small"
                                >
                                  {{ logicRow.mode === 'actual' ? '实际' : '预测' }}
                                </el-tag>
                              </template>
                            </el-table-column>
                            <el-table-column prop="feeType" label="费用类型" width="80" />
                            <el-table-column prop="startDate" label="起算日" min-width="140" />
                            <el-table-column prop="endDate" label="截止日" min-width="140" />
                            <el-table-column prop="note" label="说明" min-width="120" />
                          </el-table>
                        </div>
                      </template>
                      <div class="logic-tooltip-trigger">
                        <el-icon class="help-icon"><QuestionFilled /></el-icon>
                        <!-- <span class="trigger-text">查看不同模式下的计算逻辑表格</span> -->
                      </div>
                    </el-tooltip>
                  </div>
                </div>
                <div v-if="getStd($index)?.tiers?.length" class="expand-block">
                  <span class="expand-label">阶梯费率</span>
                  <span v-for="(t, i) in getStd($index)?.tiers" :key="i" class="tier-chip">
                    {{ t.toDay != null ? `第${t.fromDay}-${t.toDay}天` : `第${t.fromDay}+天` }}
                    {{ t.ratePerDay }}/天
                  </span>
                </div>
                <div v-if="row.tierBreakdown?.length" class="expand-block">
                  <span class="expand-label">阶梯明细</span>
                  <div class="tier-breakdown">
                    <div v-for="(tier, ti) in row.tierBreakdown" :key="ti" class="tier-row">
                      第 {{ tier.fromDay }}-{{ tier.toDay }} 天：{{ tier.days }} 天 ×
                      {{ tier.ratePerDay }} = {{ tier.subtotal.toFixed(2) }}
                      {{ row.currency || 'USD' }}
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="chargeName" label="费用名称" min-width="120" />
          <el-table-column label="计算模式" width="90" align="center">
            <template #default="{ row }">
              <el-tag
                v-if="row.calculationMode"
                :type="getModeLabel(row.calculationMode).type"
                size="small"
                effect="plain"
              >
                {{ getModeLabel(row.calculationMode).text }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="标记" width="70" align="center">
            <template #default="{ $index }">
              {{ chargeableLabel(getStd($index)?.isChargeable) }}
            </template>
          </el-table-column>
          <el-table-column label="计算方式" width="90">
            <template #default="{ row, $index }">
              {{ getStd($index)?.calculationBasis || row.calculationBasis || '—' }}
            </template>
          </el-table-column>
          <el-table-column label="免费天数" width="100">
            <template #default="{ row, $index }">
              {{ row.freeDays }} 天（{{
                getStd($index)?.freeDaysBasis || row.freeDaysBasis || '—'
              }}）
            </template>
          </el-table-column>
          <el-table-column label="免费期截止" width="100">
            <template #default="{ row }">
              {{ formatDate(row.lastFreeDate) }}
            </template>
          </el-table-column>
          <el-table-column label="计费天数" width="80" align="center">
            <template #default="{ row }"> {{ row.chargeDays }} 天 </template>
          </el-table-column>
          <el-table-column label="费率配置" width="100" align="center">
            <template #default="{ $index }">
              <span :class="{ 'rate-missing': !hasStdRate($index) }">{{
                rateConfigLabel($index)
              }}</span>
            </template>
          </el-table-column>
          <el-table-column label="金额" width="120" align="right">
            <template #default="{ row, $index }">
              <div class="amount-cell">
                <el-tag
                  size="small"
                  :type="
                    row.amount > 0
                      ? 'warning'
                      : row.chargeDays > 0 && !hasStdRate($index)
                        ? 'warning'
                        : 'success'
                  "
                  effect="plain"
                >
                  {{ row.amount.toFixed(2) }} {{ row.currency || 'USD' }}
                </el-tag>
                <span
                  v-if="row.chargeDays > 0 && row.amount <= 0 && !hasStdRate($index)"
                  class="amount-hint"
                >
                  标准未配置日单价/阶梯
                </span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="计算范围" min-width="200">
            <template #default="{ row }">
              <span class="range-text">
                ① {{ formatDate(row.startDate) }}（{{
                  sourceLabelShort(row.startDateSource)
                }}）<br />
                ② {{ formatDate(row.endDate) }}（{{ sourceLabelShort(row.endDateSource) }}）
              </span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 3. 已匹配暂不计算（如无实际提柜，合并项/滞箱项会出现在此） -->
      <div v-if="data?.skippedItems?.length" class="fee-table-section skipped-section">
        <h4 class="section-title">
          已匹配暂不计算
          <el-tooltip placement="top" trigger="hover">
            <template #content>
              <div>
                以下标准已满足四字段匹配，但当前业务规则下未计入上方合计（例如缺实际提柜日）。
              </div>
            </template>
            <span class="tooltip-icon">ℹ️</span>
          </el-tooltip>
        </h4>
        <el-table :data="data.skippedItems" stripe border size="small" class="fee-table">
          <el-table-column prop="chargeName" label="费用名称" min-width="160" />
          <el-table-column label="状态" width="120" align="center">
            <template #default>
              <el-tag type="info" size="small" effect="plain">暂不计算</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="原因" min-width="260" />
        </el-table>
      </div>
    </div>
  </template>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.demurrage-panel {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.demurrage-card {
  background: $bg-color;
  border: 1px solid $border-lighter;
  border-radius: $radius-large;
  padding: $spacing-lg;
  padding-left: calc(#{$spacing-lg} + 4px);
  box-shadow: $shadow-light;
  transition: $transition-base;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--accent-color, $primary-color);
    opacity: 0.7;
    border-radius: $radius-large 0 0 $radius-large;
  }

  &:hover {
    box-shadow: $shadow-base;
    border-color: $border-light;
  }
}

.total-card {
  --accent-color: #{$warning-color};

  .card-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: $spacing-sm $spacing-md;
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .total-amount {
    margin-left: auto;
    font-size: $font-size-xl;
    font-weight: 700;
    color: $warning-color;
    white-space: nowrap;

    &.with-tooltip {
      display: inline-flex;
      align-items: center;
      gap: $spacing-xs;
      cursor: pointer;

      .amount-tooltip-icon {
        font-size: $font-size-sm;
        opacity: 0.6;
        transition: opacity $transition-base;

        &:hover {
          opacity: 1;
        }
      }
    }
  }
}

.card-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $spacing-sm $spacing-md;
  margin-bottom: $spacing-md;
  padding-bottom: $spacing-md;
  border-bottom: 1px solid $border-lighter;

  .card-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .card-title {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
  }
}

.match-dims {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.tooltip-icon {
  margin-left: $spacing-xs;
  cursor: pointer;
  font-size: $font-size-sm;
  opacity: 0.7;
  transition: opacity $transition-base;

  &:hover {
    opacity: 1;
  }
}

.summary-meta {
  margin: $spacing-sm 0 0;
  padding: 0 $spacing-lg;
  font-size: $font-size-xs;
  color: $text-secondary;
  line-height: 1.5;
}

.section-title {
  margin: 0 0 $spacing-xs;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $text-primary;
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;

  .tooltip-icon {
    cursor: pointer;
    font-size: $font-size-sm;
    opacity: 0.7;
    transition: opacity $transition-base;

    &:hover {
      opacity: 1;
    }
  }
}

.skipped-section {
  padding-top: $spacing-xs;
}

.logistics-status {
  margin-top: $spacing-sm;
  display: flex;
  align-items: center;
  gap: $spacing-xs;

  .status-label {
    font-size: $font-size-sm;
    color: $text-secondary;
    font-weight: 500;
  }
}

.rate-missing {
  color: $warning-color;
  font-weight: 500;
}

.amount-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.amount-hint {
  font-size: $font-size-xs;
  color: $text-secondary;
  max-width: 140px;
  text-align: right;
  line-height: 1.3;
}

.fee-table-section {
  .fee-table {
    border-radius: $radius-large;
    overflow: hidden;
  }
}

:deep(.el-table) {
  .el-table__header th {
    background: $bg-page;
    color: $text-secondary;
    font-weight: 600;
    font-size: $font-size-sm;
  }

  .el-table__body td {
    font-size: $font-size-sm;
  }

  .el-table__expand-icon {
    color: $primary-color;
  }
}

.expand-content {
  padding: $spacing-md $spacing-lg;
  background: $bg-page;
  font-size: $font-size-sm;
  border-radius: $radius-base;
}

.expand-block {
  margin-bottom: $spacing-sm;

  &:last-child {
    margin-bottom: 0;
  }
}

.expand-label {
  color: $text-secondary;
  margin-right: $spacing-xs;
  font-weight: 500;
}

.range-text {
  font-size: $font-size-xs;
  color: $text-regular;
  line-height: 1.6;
}

.tier-chip {
  display: inline-block;
  padding: $spacing-xs $spacing-sm;
  margin: 2px $spacing-xs 2px 0;
  background: $bg-color;
  border: 1px solid $border-lighter;
  border-radius: $radius-base;
  font-size: $font-size-xs;
}

.tier-breakdown {
  font-size: $font-size-xs;
  color: $text-regular;
  line-height: 1.6;
  margin-top: $spacing-xs;

  .tier-row {
    margin-bottom: 2px;
  }
}

.logic-block {
  .logic-list {
    margin: 0;
    padding-left: 1.2em;
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.6;
  }
}

.logic-tooltip-wrapper {
  display: inline-block;
}

.logic-tooltip-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: $bg-color;
  border: 1px solid $border-light;
  border-radius: $radius-base;
  cursor: pointer;
  transition: all $transition-base;

  &:hover {
    background: $bg-page;
    border-color: $primary-color;

    .help-icon {
      color: $primary-color;
    }
  }

  .help-icon {
    font-size: 16px;
    color: $text-secondary;
    transition: color $transition-base;
  }

  .trigger-text {
    font-size: $font-size-sm;
    color: $text-regular;
  }
}

.calculation-logic-table {
  max-width: 700px;
  max-height: 400px;
  overflow-y: auto;

  :deep(.el-table) {
    font-size: 12px;
    background: #ffffff !important;
    color: #303133 !important;

    .el-table__header th {
      background: #f5f7fa !important;
      color: #303133 !important;
      font-weight: 600;
      padding: 8px 4px;
      border-bottom: 1px solid #e4e7ed !important;
    }

    .el-table__body tr {
      background: #ffffff !important;
      color: #303133 !important;

      td {
        border-bottom: 1px solid #ebeef5 !important;
        padding: 8px 4px;
        color: #303133 !important;
      }

      &:hover td {
        background: #f5f7fa !important;
      }
    }

    .el-tag {
      font-weight: 500;
    }
  }
}

// Tooltip 白色背景样式
:deep(.calculation-logic-tooltip) {
  &.el-tooltip__popper {
    background: #ffffff !important;
    color: #303133 !important;
    border: 1px solid #e4e7ed !important;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1) !important;
  }

  .el-tooltip__arrow {
    background: #ffffff !important;
    border-top: 1px solid #e4e7ed !important;
    border-left: 1px solid #e4e7ed !important;
  }

  .el-tooltip__trigger {
    color: #303133 !important;
  }
}

// 模式解释说明样式
:deep(.mode-explanation) {
  max-width: 400px;
  font-size: 13px;
  line-height: 1.6;
  
  p {
    margin: 8px 0;
    color: #303133;
    
    strong {
      color: #303133;
      font-weight: 600;
    }
  }
  
  .hint {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #ebeef5;
    font-size: 12px;
    color: #909399;
  }
}

.mode-hint {
  margin-top: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: rgba($info-color, 0.05);
  border-left: 3px solid $info-color;
  border-radius: $radius-base;
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .hint-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .hint-text {
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.5;
  }
}

.mode-detail {
  margin-left: $spacing-sm;
  font-size: $font-size-xs;
  color: $text-secondary;
}

@media (max-width: 768px) {
  .total-card .card-header {
    flex-direction: column;
    align-items: flex-start;

    .total-amount {
      margin-left: 0;
    }
  }
}
</style>
