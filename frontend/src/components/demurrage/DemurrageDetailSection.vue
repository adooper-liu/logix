<script setup lang="ts">
/**
 * 滞港费详情区块：匹配标准 → 单项计算 → 汇总（可视化）
 */
import { ref, watch } from 'vue'
import { demurrageService } from '@/services/demurrage'
import type { DemurrageCalculationResponse } from '@/services/demurrage'
import DemurrageCalculationPanel from './DemurrageCalculationPanel.vue'

const props = defineProps<{
  containerNumber: string
}>()

const loading = ref(false)
const error = ref<any>(null)
const data = ref<DemurrageCalculationResponse['data'] | null>(null)
const emptyMessage = ref<any>(null)
const isNoArrivalHint = ref(false)
const diagnoseLoading = ref(false)
const diagnoseResult = ref<string>('')

/** 错误提示配置 */
const ERROR_MESSAGES = {
  no_arrival_at_dest: {
    icon: '🚢',
    title: '货柜未实际到港',
    message: '货柜未实际到港，滞港费暂不计算。请等待实际到港后查看。',
    suggestion: '实际到港后将自动计算滞港费',
    type: 'info' as const
  },
  missing_arrival_dates: {
    icon: '📅',
    title: '缺少到港日期',
    message: '已有实际提柜，但缺少到港/ETA/卸船日起算日，无法计算滞港费',
    suggestion: '请检查并补充目的港ATA、ETA或卸船日等日期信息',
    type: 'warning' as const
  },
  missing_dates: {
    icon: '📋',
    title: '计划提柜日未维护',
    message: '预测模式下，未实际到港且未维护计划提柜日，无法计算滞港费',
    suggestion: '请先维护计划提柜日或等待实际到港后再计算',
    type: 'warning' as const
  },
  no_matching_standards: {
    icon: '🔍',
    title: '未匹配到滞港费标准',
    message: '未找到匹配的滞港费标准，无法计算费用',
    suggestion: '请检查客户名、港口、船公司、货代是否已维护标准',
    type: 'info' as const
  }
}

async function load() {
  if (!props.containerNumber?.trim()) {
    data.value = null
    return
  }
  loading.value = true
  error.value = null
  emptyMessage.value = null
  isNoArrivalHint.value = false
  try {
    const res = await demurrageService.calculateForContainer(props.containerNumber)
    if (res.success && res.data) {
      data.value = res.data
    } else {
      data.value = null
      // 根据reason显示不同的友好提示
      if (res.reason && ERROR_MESSAGES[res.reason]) {
        const config = ERROR_MESSAGES[res.reason]
        isNoArrivalHint.value = res.reason === 'no_arrival_at_dest'
        emptyMessage.value = res.message || config.message
        // 额外保存配置信息供模板使用
        emptyMessage.value = {
          title: config.title,
          message: res.message || config.message,
          suggestion: config.suggestion,
          icon: config.icon,
          type: config.type
        }
      } else if (res.message) {
        error.value = res.message
      } else {
        emptyMessage.value = {
          title: '无法计算滞港费',
          message: res.message || '缺少起算日或截止日，无法计算滞港费',
          suggestion: '请确保货柜有目的港到港/卸船日期',
          icon: '❓',
          type: 'warning'
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
      icon: '⚠️'
    }
    data.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.containerNumber,
  (v) => {
    if (v) load()
    else {
      data.value = null
      emptyMessage.value = null
      isNoArrivalHint.value = false
    }
    diagnoseResult.value = ''
  },
  { immediate: true }
)

async function runDiagnose() {
  if (!props.containerNumber?.trim()) return
  diagnoseLoading.value = true
  diagnoseResult.value = ''
  try {
    const res = await demurrageService.diagnoseMatch(props.containerNumber)
    if (res.success && res.data) {
      diagnoseResult.value = JSON.stringify(res.data, null, 2)
    } else {
      diagnoseResult.value = '诊断失败'
    }
  } catch (e: any) {
    diagnoseResult.value = e?.response?.data?.message || e?.message || '诊断请求失败'
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
      <div class="empty-msg">{{ emptyMessage?.message || emptyMessage || '缺少起算日或截止日，无法计算滞港费。请确保货柜有目的港到港/卸船日期。' }}</div>
      <div v-if="emptyMessage?.suggestion" class="suggestion-box">
        <span class="suggestion-icon">💡</span>
        <span class="suggestion-text">{{ emptyMessage.suggestion }}</span>
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
        <el-button type="primary" link size="small" :loading="diagnoseLoading" @click="runDiagnose" class="diagnose-btn">
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
  padding: $spacing-md;
  background: $bg-page;
  border-radius: $radius-base;
  font-size: $font-size-xs;
  max-height: 400px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
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
