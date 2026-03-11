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
const error = ref<string | null>(null)
const data = ref<DemurrageCalculationResponse['data'] | null>(null)
const emptyMessage = ref<string | null>(null)
const isNoArrivalHint = ref(false)
const diagnoseLoading = ref(false)
const diagnoseResult = ref<string>('')

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
      if (res.reason === 'no_arrival_at_dest') {
        isNoArrivalHint.value = true
        emptyMessage.value = res.message ?? '还未到达目的港，滞港费暂不用计算'
      } else if (res.reason === 'missing_arrival_dates') {
        isNoArrivalHint.value = false
        emptyMessage.value = res.message ?? '已有实际提柜，但缺少到港/ETA/卸船日起算日，无法计算滞港费'
      } else if (res.message) {
        error.value = res.message
      } else {
        emptyMessage.value = res.message ?? '缺少起算日或截止日，无法计算滞港费。请确保货柜有目的港到港/卸船日期。'
      }
    }
  } catch (e: any) {
    error.value = e?.response?.data?.message || e?.message || '获取滞港费计算失败'
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
        <span class="card-icon">⚠️</span>
        <span class="card-title">计算失败</span>
      </div>
      <div class="error-msg">{{ error }}</div>
    </div>

    <!-- 未到港提示（友好信息，非报错） -->
    <div v-else-if="!data && isNoArrivalHint" class="demurrage-card info-hint-card">
      <div class="card-header">
        <span class="card-icon">ℹ️</span>
        <span class="card-title">暂无需计算</span>
      </div>
      <div class="empty-msg">{{ emptyMessage }}</div>
    </div>

    <!-- 空状态（其他原因无法计算） -->
    <div v-else-if="!data" class="demurrage-card empty-card">
      <div class="card-header">
        <span class="card-icon">📋</span>
        <span class="card-title">无法计算</span>
      </div>
      <div class="empty-msg">{{ emptyMessage || '缺少起算日或截止日，无法计算滞港费。请确保货柜有目的港到港/卸船日期。' }}</div>
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

</style>
