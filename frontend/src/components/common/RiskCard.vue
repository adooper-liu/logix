<template>
  <div class="risk-card">
    <div class="risk-card-header">
      <h3 class="risk-card-title">风险评估</h3>
      <div class="risk-card-actions">
        <el-button size="small" @click="refreshRisk">
          <el-icon><Refresh /></el-icon>
          刷新评估
        </el-button>
      </div>
    </div>
    <div class="risk-card-content">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        加载中...
      </div>
      <div v-else-if="!riskAssessment" class="empty">
        <el-icon><InfoFilled /></el-icon>
        <p>暂无风险评估数据</p>
      </div>
      <div v-else class="risk-details">
        <div class="risk-overview">
          <div class="risk-score">
            <div class="score-circle" :class="getRiskLevelClass(riskAssessment.riskLevel)">
              {{ riskAssessment.riskScore }}
            </div>
            <div class="score-label">风险评分</div>
          </div>
          <div class="risk-level">
            <el-tag :type="getRiskLevelType(riskAssessment.riskLevel)" size="large">
              {{ getRiskLevelText(riskAssessment.riskLevel) }}
            </el-tag>
          </div>
        </div>
        
        <div v-if="riskAssessment.recommendation" class="risk-recommendation">
          <h4>建议</h4>
          <p>{{ riskAssessment.recommendation }}</p>
        </div>
        
        <div v-if="riskAssessment.riskFactors && riskAssessment.riskFactors.length > 0" class="risk-factors">
          <h4>风险因素</h4>
          <el-table :data="riskAssessment.riskFactors" size="small">
            <el-table-column prop="factor" label="因素" width="120" />
            <el-table-column prop="score" label="得分" width="80">
              <template #default="scope">
                <div class="factor-score" :class="getFactorScoreClass(scope.row.score)">
                  {{ scope.row.score }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" />
          </el-table>
        </div>
        
        <div class="risk-meta">
          <span class="update-time">
            更新时间: {{ formatDate(riskAssessment.updatedAt) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { riskApi } from '@/services/risk';
import { Refresh, Loading, InfoFilled } from '@element-plus/icons-vue';
import { formatDate } from '@/utils/dateTimeUtils';

const props = defineProps<{
  containerNumber: string;
}>();

const riskAssessment = ref<any>(null);
const loading = ref(false);

const getRiskLevelText = (level: string) => {
  const levelMap: Record<string, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
    critical: '紧急'
  };
  return levelMap[level] || level;
};

const getRiskLevelType = (level: string) => {
  const typeMap: Record<string, string> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger'
  };
  return typeMap[level] || 'info';
};

const getRiskLevelClass = (level: string) => {
  return `level-${level}`;
};

const getFactorScoreClass = (score: number) => {
  if (score >= 70) return 'score-high';
  if (score >= 40) return 'score-medium';
  return 'score-low';
};

const refreshRisk = async () => {
  if (!props.containerNumber) return;

  loading.value = true;
  try {
    const response = await riskApi.getContainerRisk(props.containerNumber);
    riskAssessment.value = response.data;
  } catch (error) {
    console.error('获取风险评估失败:', error);
  } finally {
    loading.value = false;
  }
};

// 监听containerNumber变化，自动刷新评估
watch(() => props.containerNumber, (newContainerNumber) => {
  if (newContainerNumber) {
    refreshRisk();
  }
}, { immediate: true });
</script>

<style scoped lang="scss">
@import '@/assets/styles/variables';

.risk-card {
  background: $bg-color;
  border-radius: $radius-base;
  box-shadow: $shadow-light;
  overflow: hidden;

  .risk-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-md;
    border-bottom: 1px solid $border-light;

    .risk-card-title {
      margin: 0;
      font-size: $font-size-lg;
      font-weight: 600;
      color: $text-primary;
    }
  }

  .risk-card-content {
    padding: $spacing-md;

    .loading, .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: $spacing-xl 0;
      color: $text-secondary;

      el-icon {
        font-size: 32px;
        margin-bottom: $spacing-md;
      }
    }

    .risk-details {
      .risk-overview {
        display: flex;
        align-items: center;
        gap: $spacing-lg;
        margin-bottom: $spacing-lg;

        .risk-score {
          display: flex;
          flex-direction: column;
          align-items: center;

          .score-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 700;
            color: white;

            &.level-low {
              background: $success-color;
            }
            &.level-medium {
              background: $warning-color;
            }
            &.level-high {
              background: $danger-color;
            }
            &.level-critical {
              background: $danger-color;
              box-shadow: 0 0 20px rgba(245, 108, 108, 0.5);
            }
          }

          .score-label {
            margin-top: $spacing-sm;
            font-size: $font-size-sm;
            color: $text-secondary;
          }
        }

        .risk-level {
          el-tag {
            font-size: $font-size-base;
            padding: 8px 16px;
          }
        }
      }

      .risk-recommendation {
        margin-bottom: $spacing-lg;
        padding: $spacing-md;
        background: $bg-overlay;
        border-radius: $radius-base;
        border: 1px solid $border-light;

        h4 {
          margin: 0 0 $spacing-sm 0;
          font-size: $font-size-base;
          font-weight: 600;
          color: $text-primary;
        }

        p {
          margin: 0;
          color: $text-regular;
          line-height: 1.5;
        }
      }

      .risk-factors {
        margin-bottom: $spacing-lg;

        h4 {
          margin: 0 0 $spacing-md 0;
          font-size: $font-size-base;
          font-weight: 600;
          color: $text-primary;
        }

        .factor-score {
          text-align: center;
          font-weight: 600;

          &.score-high {
            color: $danger-color;
          }
          &.score-medium {
            color: $warning-color;
          }
          &.score-low {
            color: $success-color;
          }
        }
      }

      .risk-meta {
        font-size: $font-size-sm;
        color: $text-secondary;
        text-align: right;
      }
    }
  }
}
</style>
