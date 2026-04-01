<template>
  <div class="cost-optimization-panel">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>💰 成本优化</span>
          <el-tag type="info" size="small">柜号：{{ containerNumber }}</el-tag>
        </div>
      </template>

      <!-- 方案选择 -->
      <div class="panel-section">
        <h4 class="section-title">📋 选择卸柜方案</h4>
        <UnloadOptionSelector
          v-model="selectedOption"
          :options="availableOptions"
          @change="handleOptionChange"
        />
      </div>

      <!-- 成本明细 -->
      <div v-if="costBreakdown" class="panel-section">
        <h4 class="section-title">💵 成本明细</h4>
        <CostBreakdownDisplay :data="costBreakdown" />
      </div>

      <!-- 成本可视化 -->
      <div v-if="costBreakdown" class="panel-section">
        <h4 class="section-title">📊 成本构成</h4>
        <CostPieChart :data="costBreakdown" />
      </div>

      <!-- 操作按钮 -->
      <div v-if="selectedOption" class="actions">
        <el-button @click="evaluate" :loading="loading">
          <el-icon><Refresh /></el-icon>
          重新评估
        </el-button>
        <el-button type="primary" @click="select">
          <el-icon><Check /></el-icon>
          选择此方案
        </el-button>
      </div>

      <!-- 空状态 -->
      <el-empty
        v-if="!availableOptions || availableOptions.length === 0"
        description="暂无可用方案"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Refresh, Check } from '@element-plus/icons-vue'
import { costOptimizationService } from '@/services/costOptimization'
import type { UnloadOption, CostBreakdown } from '@/types/scheduling'
import UnloadOptionSelector from './UnloadOptionSelector.vue'
import CostBreakdownDisplay from './CostBreakdownDisplay.vue'
import CostPieChart from './CostPieChart.vue'

const props = defineProps<{
  containerNumber: string
  availableOptions: UnloadOption[]
}>()

const emit = defineEmits<{
  optionSelected: [option: UnloadOption]
}>()

const selectedOption = ref<UnloadOption | null>(null)
const costBreakdown = ref<CostBreakdown | null>(null)
const loading = ref(false)

const handleOptionChange = async (option: UnloadOption) => {
  selectedOption.value = option
  // 不自动评估，等待用户点击"重新评估"
}

const evaluate = async () => {
  if (!selectedOption.value) return

  loading.value = true
  try {
    const result = await costOptimizationService.evaluateCost(
      props.containerNumber,
      selectedOption.value
    )
    costBreakdown.value = result.data.costBreakdown
  } catch (error: any) {
    console.error('成本评估失败:', error)
    // TODO: 显示错误提示
  } finally {
    loading.value = false
  }
}

const select = () => {
  if (selectedOption.value && costBreakdown.value) {
    emit('optionSelected', {
      ...selectedOption.value,
      totalCost: costBreakdown.value.totalCost,
    })
  }
}
</script>

<style scoped lang="scss">
.cost-optimization-panel {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-section {
    margin-bottom: 24px;

    .section-title {
      margin-bottom: 16px;
      color: var(--el-text-color-primary);
      font-size: 15px;
      font-weight: 600;
    }
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--el-border-color-light);
  }
}
</style>
