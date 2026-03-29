<template>
  <div class="cost-optimization-panel">
    <el-card shadow="hover" class="optimization-card">
      <template #header>
        <div class="card-header">
          <span class="title">💰 成本优化建议</span>
          <el-tag v-if="totalSavings > 0" type="success" size="small">
            预计节省：${{ totalSavings.toFixed(2) }}
          </el-tag>
        </div>
      </template>

      <!-- 批量优化操作区 -->
      <div class="optimization-actions">
        <el-button
          type="primary"
          :loading="isOptimizing"
          @click="handleBatchOptimize"
          :disabled="selectedContainers.length === 0"
        >
          🚀 批量优化 ({{ selectedContainers.length }} 柜)
        </el-button>

        <el-button
          type="success"
          :loading="isApplying"
          @click="handleApplyAll"
          :disabled="optimizationResults.length === 0"
        >
          ✅ 一键应用所有优化
        </el-button>

        <el-button @click="handleRefresh">🔄 刷新</el-button>
      </div>

      <!-- 优化结果表格 -->
      <el-table
        v-if="optimizationResults.length > 0"
        :data="optimizationResults"
        border
        stripe
        max-height="400"
        class="optimization-table"
      >
        <el-table-column prop="containerNumber" label="柜号" width="150" />
        
        <el-table-column label="原始成本" width="100">
          <template #default="{ row }">
            <span class="cost-original">${{ row.originalCost.toFixed(2) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="优化后成本" width="100">
          <template #default="{ row }">
            <span class="cost-optimized">${{ row.optimizedCost.toFixed(2) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="节省金额" width="100">
          <template #default="{ row }">
            <span :class="['savings', row.savings > 0 ? 'positive' : '']">
              {{ row.savings > 0 ? '+$' + row.savings.toFixed(2) : '$0.00' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="建议提柜日" width="120">
          <template #default="{ row }">
            {{ row.suggestedPickupDate || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="是否优化" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.shouldOptimize" type="success" size="small">
              建议优化
            </el-tag>
            <el-tag v-else type="info" size="small">
              保持原计划
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" width="150">
          <template #default="{ row }">
            <el-button
              v-if="row.shouldOptimize"
              type="primary"
              size="small"
              @click="handleApplySingle(row)"
            >
              应用
            </el-button>
            <el-button
              v-else
              type="info"
              size="small"
              disabled
            >
              无需调整
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <el-empty v-else>
        <template #description>
          请选择货柜并点击<b>批量优化</b>按钮
        </template>
        <template #image>
          <el-icon :size="100">
            <TrendCharts />
          </el-icon>
        </template>
      </el-empty>

      <!-- 性能指标 -->
      <div v-if="performanceMetrics" class="performance-metrics">
        <el-divider>性能指标</el-divider>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="总柜数">
            {{ performanceMetrics.totalContainers }}
          </el-descriptions-item>
          <el-descriptions-item label="处理耗时">
            {{ performanceMetrics.totalTimeMs }}ms
          </el-descriptions-item>
          <el-descriptions-item label="平均耗时/柜">
            {{ performanceMetrics.avgTimePerContainer }}ms
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { TrendCharts } from '@element-plus/icons-vue';
import { intelligentSchedulingApi } from '@/api/intelligentScheduling';

interface OptimizationResult {
  containerNumber: string;
  originalCost: number;
  optimizedCost: number;
  savings: number;
  suggestedPickupDate?: string;
  shouldOptimize: boolean;
}

interface PerformanceMetrics {
  totalContainers: number;
  totalTimeMs: number;
  avgTimePerContainer: number;
}

const props = defineProps<{
  selectedContainers: string[]; // 选中的柜号列表
}>();

const emit = defineEmits<{
  (e: 'applied', containerNumber: string): void;
}>();

// 状态
const isOptimizing = ref(false);
const isApplying = ref(false);
const optimizationResults = ref<OptimizationResult[]>([]);
const performanceMetrics = ref<PerformanceMetrics | null>(null);

// 计算属性
const totalSavings = computed(() => {
  return optimizationResults.value.reduce((sum, r) => sum + r.savings, 0);
});

// 方法
const handleBatchOptimize = async () => {
  if (props.selectedContainers.length === 0) {
    ElMessage.warning('请先选择要优化的货柜');
    return;
  }

  try {
    isOptimizing.value = true;
    
    const response = await intelligentSchedulingApi.batchOptimizeContainers(
      props.selectedContainers,
      { forceRefresh: true }
    );

    // ✅ 修复：response 结构是 { success: true, data: { results: [], performance: {} } }
    optimizationResults.value = response.data?.results || [];
    
    // 记录性能指标
    if (response.data?.performance) {
      performanceMetrics.value = {
        totalContainers: response.data.performance.totalContainers,
        totalTimeMs: response.data.performance.totalTimeMs,
        avgTimePerContainer: response.data.performance.avgTimePerContainer
      };
    }

    const successCount = optimizationResults.value.filter(r => r.shouldOptimize).length;
    ElMessage.success(`优化完成！共 ${optimizationResults.value.length} 柜，其中 ${successCount} 柜建议优化`);
  } catch (error: any) {
    ElMessage.error(`优化失败：${error.message}`);
  } finally {
    isOptimizing.value = false;
  }
};

const handleApplyAll = async () => {
  const optimizableCount = optimizationResults.value.filter(r => r.shouldOptimize).length;
  
  if (optimizableCount === 0) {
    ElMessage.info('没有需要应用的优化');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要应用所有 ${optimizableCount} 个优化建议吗？这将更新相关货柜的排产计划。`,
      '确认应用优化',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    isApplying.value = true;
    
    const promises = optimizationResults.value
      .filter(r => r.shouldOptimize)
      .map(r => applySingleOptimization(r));

    await Promise.all(promises);
    
    ElMessage.success(`成功应用 ${optimizableCount} 个优化`);
    optimizationResults.value = [];
    emit('applied', 'all');
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`应用优化失败：${error.message}`);
    }
  } finally {
    isApplying.value = false;
  }
};

const handleApplySingle = async (result: OptimizationResult) => {
  if (!result.shouldOptimize) return;

  try {
    await ElMessageBox.confirm(
      `确定要应用货柜 ${result.containerNumber} 的优化建议吗？`,
      '确认应用优化',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );

    await applySingleOptimization(result);
    ElMessage.success(`已应用优化，预计节省 $${result.savings.toFixed(2)}`);
    
    // 从结果列表中移除
    optimizationResults.value = optimizationResults.value.filter(
      r => r.containerNumber !== result.containerNumber
    );
    
    emit('applied', result.containerNumber);
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(`应用优化失败：${error.message}`);
    }
  }
};

const applySingleOptimization = async (result: OptimizationResult) => {
  // TODO: 调用后端 API 应用优化
  // 这里需要根据实际业务逻辑实现
  console.log('应用优化:', result);
};

const handleRefresh = () => {
  optimizationResults.value = [];
  performanceMetrics.value = null;
  ElMessage.info('请重新选择货柜并点击优化');
};

// 监听选中货柜变化
watch(() => props.selectedContainers, () => {
  if (props.selectedContainers.length === 0) {
    handleRefresh();
  }
}, { immediate: true });
</script>

<style scoped lang="scss">
.cost-optimization-panel {
  padding: 16px;
}

.optimization-card {
  :deep(.el-card__header) {
    padding: 12px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      font-size: 16px;
      font-weight: 600;
    }
  }
}

.optimization-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.optimization-table {
  .cost-original {
    color: #909399;
    text-decoration: line-through;
  }

  .cost-optimized {
    color: #67c23a;
    font-weight: 600;
  }

  .savings {
    color: #909399;

    &.positive {
      color: #67c23a;
      font-weight: 600;
    }
  }
}

.performance-metrics {
  margin-top: 16px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 4px;

  :deep(.el-descriptions__label) {
    font-weight: 500;
  }
}
</style>
