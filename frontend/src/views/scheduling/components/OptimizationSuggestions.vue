<template>
  <div class="optimization-suggestions">
    <el-card shadow="hover" class="suggestion-card">
      <template #header>
        <div class="card-header">
          <span>💡 智能优化建议</span>
          <el-tag v-if="totalPotentialSavings > 0" type="success" size="small">
            预计节省 ${{ totalPotentialSavings.toFixed(2) }}
          </el-tag>
        </div>
      </template>

      <!-- 无建议时的提示 -->
      <el-empty v-if="suggestions.length === 0" description="当前排产已是最优，暂无优化建议" />

      <!-- 建议列表 -->
      <div v-else class="suggestion-list">
        <div
          v-for="(suggestion, index) in suggestions"
          :key="index"
          class="suggestion-item"
          :class="'priority-' + suggestion.priority"
        >
          <div class="suggestion-header">
            <span class="suggestion-title">{{ suggestion.title }}</span>
            <el-tag :type="getPriorityType(suggestion.priority)" size="small">
              {{ getPriorityText(suggestion.priority) }}
            </el-tag>
          </div>

          <div class="suggestion-content">
            <div class="suggestion-detail">
              <el-icon><Location /></el-icon>
              <span>{{ suggestion.description }}</span>
            </div>

            <div class="suggestion-metrics">
              <div class="metric-item">
                <span class="metric-label">原成本:</span>
                <span class="metric-value original">${{ suggestion.originalCost.toFixed(2) }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">优化后:</span>
                <span class="metric-value optimized">${{ suggestion.optimizedCost.toFixed(2) }}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">节省:</span>
                <span class="metric-value saving">-${{ suggestion.savings.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <div class="suggestion-actions">
            <el-button type="primary" size="small" @click="applySuggestion(suggestion)">
              ✨ 应用此建议
            </el-button>
            <el-button size="small" @click="viewDetails(suggestion)"> 📊 查看详情 </el-button>
            <el-button size="small" @click="dismissSuggestion(index)"> ✕ 忽略 </el-button>
          </div>
        </div>
      </div>

      <!-- 批量操作 -->
      <div v-if="suggestions.length > 0" class="bulk-actions">
        <el-button type="success" @click="applyAllSuggestions" :loading="applying">
          ✨✨ 全部应用（节省 ${{ totalPotentialSavings.toFixed(2) }}）
        </el-button>
        <el-button @click="dismissAll">✕ 全部忽略</el-button>
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="优化建议详情" width="800px">
      <div v-if="selectedSuggestion" class="suggestion-detail-view">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="柜号">
            {{ selectedSuggestion.containerNumber }}
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityType(selectedSuggestion.priority)" size="small">
              {{ getPriorityText(selectedSuggestion.priority) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="调整类型">
            {{ selectedSuggestion.adjustmentType }}
          </el-descriptions-item>
          <el-descriptions-item label="影响范围">
            {{ selectedSuggestion.impactScope }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider content-position="left">成本对比</el-divider>
        <div class="cost-comparison">
          <div class="cost-column">
            <div class="cost-title">原始方案</div>
            <div class="cost-detail">提柜日：{{ selectedSuggestion.originalPickupDate }}</div>
            <div class="cost-detail">送仓日：{{ selectedSuggestion.originalDeliveryDate }}</div>
            <div class="cost-detail">卸柜日：{{ selectedSuggestion.originalUnloadDate }}</div>
            <div class="cost-detail">还箱日：{{ selectedSuggestion.originalReturnDate }}</div>
            <div class="cost-total">总成本：${{ selectedSuggestion.originalCost.toFixed(2) }}</div>
          </div>

          <div class="cost-arrow">→</div>

          <div class="cost-column">
            <div class="cost-title">优化方案</div>
            <div class="cost-detail">提柜日：{{ selectedSuggestion.optimizedPickupDate }}</div>
            <div class="cost-detail">送仓日：{{ selectedSuggestion.optimizedDeliveryDate }}</div>
            <div class="cost-detail">卸柜日：{{ selectedSuggestion.optimizedUnloadDate }}</div>
            <div class="cost-detail">还箱日：{{ selectedSuggestion.optimizedReturnDate }}</div>
            <div class="cost-total optimized">总成本：${{ selectedSuggestion.optimizedCost.toFixed(2) }}</div>
          </div>
        </div>

        <el-alert
          type="success"
          :closable="false"
          show-icon
          class="savings-highlight"
        >
          <strong>预计节省：${{ selectedSuggestion.savings.toFixed(2) }}</strong>
          （优化比例：{{ ((selectedSuggestion.savings / selectedSuggestion.originalCost) * 100).toFixed(1) }}%）
        </el-alert>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { Location } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'

interface OptimizationSuggestion {
  containerNumber: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  adjustmentType: string
  impactScope: string
  originalCost: number
  optimizedCost: number
  savings: number
  originalPickupDate: string
  originalDeliveryDate: string
  originalUnloadDate: string
  originalReturnDate: string
  optimizedPickupDate: string
  optimizedDeliveryDate: string
  optimizedUnloadDate: string
  optimizedReturnDate: string
}

// Props
const props = defineProps<{
  suggestions?: OptimizationSuggestion[]
}>()

const emit = defineEmits<{
  (e: 'apply', suggestion: OptimizationSuggestion): void
  (e: 'applyAll', suggestions: OptimizationSuggestion[]): void
  (e: 'dismiss', index: number): void
  (e: 'dismissAll'): void
}>()

// 数据状态
const detailVisible = ref(false)
const selectedSuggestion = ref<OptimizationSuggestion | null>(null)
const applying = ref(false)

// 计算属性
const suggestions = ref(props.suggestions || [])

const totalPotentialSavings = computed(() => {
  return suggestions.value.reduce((sum, s) => sum + s.savings, 0)
})

// 方法
const getPriorityType = (priority: string) => {
  const typeMap: Record<string, any> = {
    high: 'danger',
    medium: 'warning',
    low: 'info',
  }
  return typeMap[priority] || 'info'
}

const getPriorityText = (priority: string) => {
  const textMap: Record<string, string> = {
    high: '高优先级',
    medium: '中优先级',
    low: '低优先级',
  }
  return textMap[priority] || '未知'
}

const applySuggestion = (suggestion: OptimizationSuggestion) => {
  emit('apply', suggestion)
  ElMessage.success(`已应用优化建议：${suggestion.containerNumber}`)
}

const viewDetails = (suggestion: OptimizationSuggestion) => {
  selectedSuggestion.value = suggestion
  detailVisible.value = true
}

const dismissSuggestion = (index: number) => {
  emit('dismiss', index)
  suggestions.value.splice(index, 1)
  ElMessage.info('已忽略该建议')
}

const applyAllSuggestions = () => {
  applying.value = true
  emit('applyAll', suggestions.value)
  setTimeout(() => {
    applying.value = false
    suggestions.value = []
    ElMessage.success(`已应用所有优化建议，共节省 $${totalPotentialSavings.value.toFixed(2)}`)
  }, 1000)
}

const dismissAll = () => {
  emit('dismissAll')
  suggestions.value = []
  ElMessage.info('已忽略所有建议')
}
</script>

<style scoped lang="scss">
.optimization-suggestions {
  .suggestion-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .suggestion-list {
      .suggestion-item {
        padding: 16px;
        margin-bottom: 16px;
        border: 1px solid #e4e7ed;
        border-radius: 8px;
        background: #fafafa;

        &.priority-high {
          border-left: 4px solid #f56c6c;
          background: rgba(245, 108, 108, 0.05);
        }

        &.priority-medium {
          border-left: 4px solid #e6a23c;
          background: rgba(230, 162, 60, 0.05);
        }

        &.priority-low {
          border-left: 4px solid #909399;
          background: rgba(144, 147, 153, 0.05);
        }

        .suggestion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;

          .suggestion-title {
            font-weight: bold;
            font-size: 15px;
          }
        }

        .suggestion-content {
          margin-bottom: 16px;

          .suggestion-detail {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            color: #606266;

            .el-icon {
              color: #409eff;
            }
          }

          .suggestion-metrics {
            display: flex;
            gap: 16px;

            .metric-item {
              display: flex;
              flex-direction: column;

              .metric-label {
                font-size: 12px;
                color: #909399;
                margin-bottom: 4px;
              }

              .metric-value {
                font-weight: bold;
                font-size: 14px;

                &.original {
                  color: #909399;
                }

                &.optimized {
                  color: #409eff;
                }

                &.saving {
                  color: #67c23a;
                }
              }
            }
          }
        }

        .suggestion-actions {
          display: flex;
          gap: 8px;
        }
      }
    }

    .bulk-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e4e7ed;
    }
  }

  .suggestion-detail-view {
    .cost-comparison {
      display: flex;
      gap: 20px;
      margin: 20px 0;

      .cost-column {
        flex: 1;
        padding: 16px;
        background: #f5f7fa;
        border-radius: 8px;

        .cost-title {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 12px;
        }

        .cost-detail {
          padding: 4px 0;
          font-size: 14px;
        }

        .cost-total {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #dcdfe6;
          font-weight: bold;
          font-size: 16px;

          &.optimized {
            color: #67c23a;
          }
        }
      }

      .cost-arrow {
        display: flex;
        align-items: center;
        font-size: 24px;
        font-weight: bold;
        color: #909399;
      }
    }

    .savings-highlight {
      margin-top: 20px;
      text-align: center;
      font-size: 16px;
    }
  }
}
</style>
