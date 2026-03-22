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
  actual: { text: '实际模式', type: 'success' as const, desc: '状态机：已到达目的港或之后环节，按实际数据计算' },
  forecast: { text: '计划/预测模式', type: 'info' as const, desc: '状态机：未到目的港，按 ETA/计划提柜等预计' }
}

/** 获取计算模式标签配置 */
function getModeLabel(mode: string | undefined) {
  return MODE_LABELS[mode as keyof typeof MODE_LABELS] || { text: '未知模式', type: 'info' as const, desc: '' }
}

/** 获取单项费用的计算逻辑说明（用于展开内容，表达精简） */
function getLogicNoteForItem(idx: number): string[] {
  const item = props.data?.items?.[idx]
  const std = getStd(idx)
  if (!item) return []

  const code = (item.chargeTypeCode ?? '').toUpperCase()
  const name = (item.chargeName ?? '').toLowerCase()
  const isDetention =
    code.includes('DETENTION') || name.includes('detention') || name.includes('滞箱')
  const isStorage = code.includes('STORAGE') || name.includes('storage') || name.includes('堆存')
  const freeBasis = std?.freeDaysBasis || '自然日'

  if (isStorage) {
    return [
      '起算：实际提柜日（必填）',
      '截止：实际还箱日 → 无则当天',
      `免费期与阶梯按标准（${freeBasis}）`,
    ]
  }

  if (isDetention && !name.includes('demurrage')) {
    // 根据计算模式显示不同的起算日描述
    const mode = props.data?.calculationDates?.lastReturnDateMode || 'actual'
    const startDesc = mode === 'actual'
      ? '起算：实际提柜日'
      : '起算：计划提柜日（预测）'
    return [
      startDesc,
      '截止：实际还箱日 → 无则当天',
      `最晚还箱日 = 起算日 + 免费天数（${freeBasis}）`,
    ]
  }
  const calcBasis = std?.calculationBasis || '按到港'
  const startDesc = calcBasis.includes('卸船') ? '卸船日' : 'ATA → ETA → 卸船日'
  if (props.data?.calculationMode === 'forecast') {
    return [
      `起算：${startDesc}（预测：修正ETA / ETA）`,
      '截止：max(当天, 计划提柜日)；无计划提柜日则用当天（每日滚动预计）',
      `最晚提柜日 = 起算日 + 免费天数（${freeBasis}）`,
    ]
  }
  return [
    `起算：${startDesc}（实际：ATA / 卸船）`,
    '截止：实际提柜日 → 无则当天（有提柜后费用封顶，不再按日历累加）',
    `最晚提柜日 = 起算日 + 免费天数（${freeBasis}）`,
  ]
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
          <el-tag v-if="data.calculationMode" :type="getModeLabel(data.calculationMode).type" size="small" effect="plain">
            {{ getModeLabel(data.calculationMode).text }}
          </el-tag>
          <div v-if="firstStd" class="match-dims">
            <el-tag v-if="firstStd.foreignCompanyCode || firstStd.foreignCompanyName" size="small" type="info" effect="plain">
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
          <span class="total-amount">{{ data.totalAmount.toFixed(2) }} {{ data.currency }}</span>
        </div>
        <p class="summary-meta">{{ summaryLine }}</p>
        <p v-if="data.logisticsStatusSnapshot" class="logistics-snapshot">
          状态机：{{ data.logisticsStatusSnapshot.reason }}（{{ data.logisticsStatusSnapshot.status }}）
        </p>
        <div v-if="data.calculationMode === 'forecast'" class="mode-hint">
          <span class="hint-icon">ℹ️</span>
          <span class="hint-text">预测模式：未到港时滞港费截止日为 max(当天, 计划提柜日)，每日更新；到港后以实际数据为准。</span>
        </div>
        <div v-if="data.dateOrderWarnings?.length" class="mode-hint date-order-warn">
          <span class="hint-icon">⚠️</span>
          <span class="hint-text">
            <template v-for="(w, wi) in data.dateOrderWarnings" :key="wi">{{ w }}<br></template>
          </span>
        </div>
      </div>

      <!-- 2. 已计费明细 -->
      <div v-if="data?.items?.length" class="fee-table-section">
        <h4 class="section-title">已计费明细</h4>
        <el-table
          :data="data.items"
          stripe
          border
          size="small"
          class="fee-table"
        >
        <el-table-column type="expand">
          <template #default="{ row, $index }">
            <div class="expand-content">
              <div class="expand-block logic-block">
                <span class="expand-label">计算逻辑</span>
                <ul class="logic-list">
                  <li v-for="(line, i) in getLogicNoteForItem($index)" :key="i">{{ line }}</li>
                </ul>
              </div>
              <div v-if="row.calculationMode" class="expand-block">
                <span class="expand-label">计算模式</span>
                <el-tag :type="getModeLabel(row.calculationMode).type" size="small" effect="plain">
                  {{ getModeLabel(row.calculationMode).text }}
                </el-tag>
                <span class="mode-detail">({{
                  row.startDateMode === 'actual' ? '起算日:实际' : '起算日:预测'
                }} {{
                  row.endDateMode === 'actual' ? '截止日:实际' : '截止日:预测'
                }} {{
                  row.lastFreeDateMode === 'actual' ? '最晚免费日:实际' : '最晚免费日:预测'
                }})</span>
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
                    {{ tier.ratePerDay }} = {{ tier.subtotal.toFixed(2) }} {{ row.currency }}
                  </div>
                </div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="chargeName" label="费用名称" min-width="120" />
        <el-table-column label="计算模式" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.calculationMode" :type="getModeLabel(row.calculationMode).type" size="small" effect="plain">
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
            {{ row.freeDays }} 天（{{ getStd($index)?.freeDaysBasis || row.freeDaysBasis || '—' }}）
          </template>
        </el-table-column>
        <el-table-column label="免费期截止" width="100">
          <template #default="{ row }">
            {{ formatDate(row.lastFreeDate) }}
          </template>
        </el-table-column>
        <el-table-column label="计费天数" width="80" align="center">
          <template #default="{ row }">
            {{ row.chargeDays }} 天
          </template>
        </el-table-column>
        <el-table-column label="费率配置" width="100" align="center">
          <template #default="{ $index }">
            <span :class="{ 'rate-missing': !hasStdRate($index) }">{{ rateConfigLabel($index) }}</span>
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
                {{ row.amount.toFixed(2) }} {{ row.currency }}
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
              ① {{ formatDate(row.startDate) }}（{{ sourceLabelShort(row.startDateSource) }}）<br />
              ② {{ formatDate(row.endDate) }}（{{ sourceLabelShort(row.endDateSource) }}）
            </span>
          </template>
        </el-table-column>
        </el-table>
      </div>

      <!-- 3. 已匹配暂不计算（如无实际提柜，合并项/滞箱项会出现在此） -->
      <div v-if="data?.skippedItems?.length" class="fee-table-section skipped-section">
        <h4 class="section-title">已匹配暂不计算</h4>
        <p class="section-desc">以下标准已满足四字段匹配，但当前业务规则下未计入上方合计（例如缺实际提柜日）。</p>
        <el-table
          :data="data.skippedItems"
          stripe
          border
          size="small"
          class="fee-table"
        >
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
}

.section-desc {
  margin: 0 0 $spacing-sm;
  font-size: $font-size-xs;
  color: $text-secondary;
  line-height: 1.5;
}

.skipped-section {
  padding-top: $spacing-xs;
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
