<script setup lang="ts">
/**
 * 滞港费详情区块：匹配标准 → 单项计算 → 汇总（可视化）
 */
import type { DemurrageCalculationResponse } from '@/services/demurrage'
import { demurrageService } from '@/services/demurrage'
import { ref, watch } from 'vue'
import DemurrageCalculationPanel from './DemurrageCalculationPanel.vue'

const props = defineProps<{
  containerNumber: string
  calculationData?: DemurrageCalculationResponse['data'] | null // 可选：从父组件接收数据
}>()

const loading = ref(false)
const error = ref<any>(null)
const data = ref<DemurrageCalculationResponse['data'] | null>(null)
const emptyMessage = ref<any>(null)
const isNoArrivalHint = ref(false)
const currentReason = ref<DemurrageCalculationResponse['reason'] | null>(null)
const diagnoseLoading = ref(false)
const diagnoseResult = ref<{
  containerParams: Record<string, any>
  allStandardsSample: Array<Record<string, any>>
  standardsTotal: number
  standardsAfterEffectiveDate: number
  standardsAfterFourFieldMatch: number
  excludedByIsChargeable: number
} | null>(null)

/** 错误提示配置 */
const ERROR_MESSAGES = {
  no_arrival_at_dest: {
    icon: '🚢',
    title: '货柜未实际到港',
    message: '货柜未实际到港，滞港费暂不计算。请等待实际到港后查看。',
    suggestion: '实际到港后将自动计算滞港费',
    type: 'info' as const,
  },
  missing_arrival_dates: {
    icon: '📅',
    title: '缺少到港日期',
    message: '已有实际提柜，但缺少到港/ETA/卸船日起算日，无法计算滞港费',
    suggestion: '请检查并补充目的港ATA、ETA或卸船日等日期信息',
    type: 'warning' as const,
  },
  missing_dates: {
    icon: '📋',
    title: '缺少可计算日期',
    message: '缺少起算日或截止日，无法计算滞港费',
    suggestion: '请确保有目的港到港/卸船/ETA 等起算日，或检查拖卡/还箱日期',
    type: 'warning' as const,
  },
  missing_pickup_date_actual: {
    icon: '📋',
    title: '缺少实际提柜日',
    message: '堆存、滞箱等费用需维护实际提柜日（拖卡运输 pickup_date）',
    suggestion: '最晚提柜日（录入）不能代替实际提柜日，请在拖卡运输中填写实际提柜日期',
    type: 'warning' as const,
  },
  no_matching_standards: {
    icon: '🔍',
    title: '未匹配到滞港费标准',
    message: '未找到匹配的滞港费标准，无法计算费用',
    suggestion: '请检查客户名、港口、船公司、货代是否已维护标准',
    type: 'info' as const,
  },
}

const DIAG_FIELDS = [
  {
    key: 'foreignCompanyCode',
    label: '客户/境外公司',
    containerKey: 'foreignCompanyCode',
    standardCode: 'foreignCompanyCode',
    standardName: 'foreignCompanyName',
  },
  {
    key: 'destinationPortCode',
    label: '目的港',
    containerKey: 'destinationPortCode',
    standardCode: 'destinationPortCode',
    standardName: 'destinationPortName',
  },
  {
    key: 'shippingCompanyCode',
    label: '船公司',
    containerKey: 'shippingCompanyCode',
    standardCode: 'shippingCompanyCode',
    standardName: 'shippingCompanyName',
  },
  {
    key: 'originForwarderCode',
    label: '货代',
    containerKey: 'originForwarderCode',
    standardCode: 'originForwarderCode',
    standardName: 'originForwarderName',
  },
] as const

function normalizeValue(v: unknown): string {
  const s = (v ?? '').toString().trim()
  return s
}

function valueEqual(a: unknown, b: unknown): boolean {
  return normalizeValue(a).toLowerCase() === normalizeValue(b).toLowerCase()
}

function renderStandardValue(std: Record<string, any>, codeKey: string, nameKey: string): string {
  const code = normalizeValue(std?.[codeKey])
  const name = normalizeValue(std?.[nameKey])
  if (code && name && code !== name) return `${code} / ${name}`
  return code || name || '-'
}

function getContainerValue(containerParams: Record<string, any>, key: string): string {
  const resolved = containerParams?.resolvedForMatch?.[key]
  const raw = containerParams?.[key]
  return normalizeValue(resolved) || normalizeValue(raw) || '-'
}

function getDiagnoseRows() {
  if (!diagnoseResult.value)
    return [] as Array<{
      field: string
      containerValue: string
      standardValue: string
      matched: boolean
    }>

  const std = diagnoseResult.value.allStandardsSample?.[0] || {}
  const containerParams = diagnoseResult.value.containerParams || {}
  return DIAG_FIELDS.map(f => {
    const containerValue = getContainerValue(containerParams, f.containerKey)
    const standardValue = renderStandardValue(std, f.standardCode, f.standardName)
    const stdCode = normalizeValue(std?.[f.standardCode])
    const stdName = normalizeValue(std?.[f.standardName])
    const cv = containerValue === '-' ? '' : containerValue
    const matched = !!cv && (valueEqual(cv, stdCode) || valueEqual(cv, stdName))
    return {
      field: f.label,
      containerValue: containerValue || '-',
      standardValue,
      matched,
    }
  })
}

async function load() {
  if (!props.containerNumber?.trim()) {
    data.value = null
    return
  }

  // 如果父组件传递了数据，直接使用，不再重复调用 API
  if (props.calculationData) {
    data.value = props.calculationData
    loading.value = false
    return
  }

  loading.value = true
  error.value = null
  emptyMessage.value = null
  isNoArrivalHint.value = false
  currentReason.value = null
  try {
    const res = await demurrageService.calculateForContainer(props.containerNumber)
    if (res.success && res.data) {
      data.value = res.data
    } else {
      data.value = null
      currentReason.value = res.reason ?? null
      // 根据 reason 显示不同的友好提示
      if (res.reason && ERROR_MESSAGES[res.reason]) {
        const config = ERROR_MESSAGES[res.reason]
        isNoArrivalHint.value = res.reason === 'no_arrival_at_dest'
        const finalMessage =
          (res.message || config.message) === config.title
            ? config.message
            : res.message || config.message
        emptyMessage.value = {
          title: config.title,
          message: finalMessage,
          suggestion: config.suggestion,
          icon: config.icon,
          type: config.type,
        }
      } else if (res.message) {
        error.value = res.message
      } else {
        emptyMessage.value = {
          title: '无法计算滞港费',
          message: res.message || '缺少起算日或截止日，无法计算滞港费',
          suggestion: '请确保货柜有目的港到港/卸船日期',
          icon: '❓',
          type: 'warning',
        }
      }
    }
  } catch (e: any) {
    const errorMsg = e?.response?.data?.message || e?.message || '获取滞港费计算失败'
    // 根据错误信息显示更具体的提示
    let errorTitle = '系统错误'
    let errorSuggestion = '请稍后重试'

    // 网络错误
    if (e?.code === 'ERR_NETWORK' || e?.message?.includes('Network Error')) {
      errorTitle = '网络连接失败'
      errorSuggestion = '请检查网络连接后重试'
    }
    // 服务器错误
    else if (e?.response?.status >= 500) {
      errorTitle = '服务器内部错误'
      errorSuggestion = '服务器暂时不可用，请稍后重试或联系系统管理员'
    }
    // 请求错误
    else if (e?.response?.status === 404) {
      errorTitle = '请求的资源不存在'
      errorSuggestion = '请检查货柜编号是否正确'
    }
    // 未授权
    else if (e?.response?.status === 401) {
      errorTitle = '未授权'
      errorSuggestion = '请重新登录后重试'
    }
    // 超时
    else if (e?.code === 'ECONNABORTED') {
      errorTitle = '请求超时'
      errorSuggestion = '请求响应超时，请稍后重试'
    }

    error.value = {
      title: errorTitle,
      message: errorMsg,
      suggestion: errorSuggestion,
      icon: '⚠️',
    }
    data.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.containerNumber,
  v => {
    if (v) load()
    else {
      data.value = null
      emptyMessage.value = null
      isNoArrivalHint.value = false
      currentReason.value = null
    }
    diagnoseResult.value = null
  },
  { immediate: true }
)

async function runDiagnose() {
  if (!props.containerNumber?.trim()) return
  diagnoseLoading.value = true
  diagnoseResult.value = null
  try {
    const res = await demurrageService.diagnoseMatch(props.containerNumber)
    if (res.success && res.data) {
      diagnoseResult.value = {
        containerParams: res.data.containerParams || {},
        allStandardsSample: Array.isArray(res.data.allStandardsSample)
          ? res.data.allStandardsSample
          : [],
        standardsTotal: Number(res.data.standardsTotal || 0),
        standardsAfterEffectiveDate: Number(res.data.standardsAfterEffectiveDate || 0),
        standardsAfterFourFieldMatch: Number(res.data.standardsAfterFourFieldMatch || 0),
        excludedByIsChargeable: Number(res.data.excludedByIsChargeable || 0),
      }
    } else {
      diagnoseResult.value = null
    }
  } catch {
    diagnoseResult.value = null
  } finally {
    diagnoseLoading.value = false
  }
}

defineExpose({ load })
</script>

<template>
  <div class="demurrage-detail-section" v-loading="loading">
    <!-- 错误状态 -->
    <div v-if="error" class="demurrage-card error-card">
      <div class="card-header">
        <span class="card-icon">{{ error.icon || '⚠️' }}</span>
        <span class="card-title">{{ error.title || '计算失败' }}</span>
      </div>
      <div class="error-msg">{{ error.message || error }}</div>
      <div v-if="error.suggestion" class="error-suggestion">
        <span class="suggestion-icon">💡</span>
        <span class="suggestion-text">{{ error.suggestion }}</span>
      </div>
    </div>

    <!-- 未到港提示（友好信息，非报错） -->
    <div v-else-if="!data && isNoArrivalHint" class="demurrage-card info-hint-card">
      <div class="card-header">
        <span class="card-icon">{{ emptyMessage?.icon || 'ℹ️' }}</span>
        <span class="card-title">{{ emptyMessage?.title || '暂无需计算' }}</span>
      </div>
      <div class="empty-msg">{{ emptyMessage?.message || emptyMessage }}</div>
      <div v-if="emptyMessage?.suggestion" class="suggestion-box">
        <span class="suggestion-icon">💡</span>
        <span class="suggestion-text">{{ emptyMessage.suggestion }}</span>
      </div>
    </div>

    <!-- 空状态（其他原因无法计算） -->
    <div v-else-if="!data" class="demurrage-card empty-card">
      <div class="card-header">
        <span class="card-icon">{{ emptyMessage?.icon || '📋' }}</span>
        <span class="card-title">{{ emptyMessage?.title || '无法计算' }}</span>
      </div>
      <div class="empty-msg">
        {{
          emptyMessage?.message ||
          emptyMessage ||
          '缺少起算日或截止日，无法计算滞港费。请确保货柜有目的港到港/卸船日期。'
        }}
      </div>
      <div v-if="emptyMessage?.suggestion" class="suggestion-box">
        <span class="suggestion-icon">💡</span>
        <span class="suggestion-text">{{ emptyMessage.suggestion }}</span>
      </div>
      <el-button
        v-if="currentReason === 'no_matching_standards'"
        type="primary"
        link
        size="small"
        :loading="diagnoseLoading"
        @click="runDiagnose"
        class="diagnose-btn"
      >
        诊断匹配失败原因
      </el-button>
      <div
        v-if="currentReason === 'no_matching_standards' && diagnoseResult"
        class="diagnose-result"
      >
        <div class="diagnose-stats">
          <el-tag type="info" size="small">标准总数：{{ diagnoseResult.standardsTotal }}</el-tag>
          <el-tag type="warning" size="small"
            >日期有效后：{{ diagnoseResult.standardsAfterEffectiveDate }}</el-tag
          >
          <el-tag type="danger" size="small"
            >四字段命中：{{ diagnoseResult.standardsAfterFourFieldMatch }}</el-tag
          >
        </div>
        <el-table :data="getDiagnoseRows()" size="small" border>
          <el-table-column prop="field" label="字段" width="130" />
          <el-table-column prop="containerValue" label="货柜值" min-width="150" />
          <el-table-column prop="standardValue" label="标准值（样本）" min-width="180" />
          <el-table-column label="是否命中" width="110">
            <template #default="{ row }">
              <el-tag :type="row.matched ? 'success' : 'danger'" size="small">
                {{ row.matched ? '命中' : '未命中' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 正常展示 -->
    <template v-else>
      <!-- 日期与费用（统一组件） -->
      <DemurrageCalculationPanel :data="data" />

      <!-- 未匹配到标准 -->
      <div v-if="!data.items?.length" class="demurrage-card no-match-card">
        <div class="card-header">
          <span class="card-icon">🔍</span>
          <span class="card-title">未匹配到滞港费标准</span>
        </div>
        <div class="empty-msg">
          请检查客户名、港口、船公司、货代是否已维护标准，或通过「滞港费标准导入」添加。
        </div>
        <el-button
          type="primary"
          link
          size="small"
          :loading="diagnoseLoading"
          @click="runDiagnose"
          class="diagnose-btn"
        >
          诊断匹配失败原因
        </el-button>
        <pre v-if="diagnoseResult" class="diagnose-result">{{ diagnoseResult }}</pre>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.demurrage-detail-section {
  min-height: 120px;
}

.demurrage-card {
  background: $bg-color;
  border: 1px solid $border-light;
  border-radius: $radius-large;
  padding: $spacing-md;
  padding-left: calc(#{$spacing-md} + 3px);
  box-shadow: $shadow-light;
  transition: $transition-base;
  position: relative;
  overflow: hidden;
  margin-bottom: $spacing-md;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    opacity: 0.6;
  }

  &:hover {
    box-shadow: $shadow-base;
  }
}

.error-card {
  &::before {
    background: $danger-color;
  }

  .card-icon {
    color: $danger-color;
  }
}

.empty-card,
.no-match-card,
.info-hint-card {
  &::before {
    background: $info-color;
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .card-icon {
    font-size: 20px;
  }

  .card-title {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
  }
}

.error-msg,
.empty-msg {
  font-size: $font-size-sm;
  color: $text-secondary;
  line-height: 1.5;
}

.error-msg {
  color: $danger-color;
}

.diagnose-btn {
  margin-top: $spacing-sm;
}

.diagnose-result {
  margin-top: $spacing-md;
}

.diagnose-stats {
  display: flex;
  gap: $spacing-sm;
  flex-wrap: wrap;
  margin-bottom: $spacing-sm;
}

.suggestion-box {
  margin-top: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: rgba($info-color, 0.05);
  border-left: 3px solid $info-color;
  border-radius: $radius-base;
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .suggestion-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .suggestion-text {
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: 1.5;
  }
}

.error-suggestion {
  margin-top: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: rgba($danger-color, 0.05);
  border-left: 3px solid $danger-color;
  border-radius: $radius-base;
  display: flex;
  align-items: center;
  gap: $spacing-sm;

  .suggestion-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .suggestion-text {
    font-size: $font-size-sm;
    color: $danger-color;
    line-height: 1.5;
  }
}
</style>
