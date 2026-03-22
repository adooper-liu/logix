<template>
  <div class="risk-card-tab">
    <div class="tab-header-row">
      <el-button type="primary" link size="small" @click="loadRisk">
        刷新
      </el-button>
    </div>
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>
    <div v-else-if="riskAssessment" class="risk-content">
      <el-card class="risk-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>风险评估</span>
            <el-tag :type="getRiskLevelTagType(riskAssessment.riskLevel)" size="large">
              {{ formatRiskLevelLabel(riskAssessment.riskLevel) }}
            </el-tag>
          </div>
        </template>
        <div class="risk-details">
          <div class="detail-row">
            <span class="label">风险评分</span>
            <span class="value">{{ formatRiskScore(riskAssessment.riskScore) }}</span>
          </div>
          <div v-if="riskAssessment.recommendation" class="detail-row recommendation-row">
            <span class="label">建议</span>
            <p class="recommendation">{{ riskAssessment.recommendation }}</p>
          </div>
          <div
            v-if="riskFactorsRows.length > 0"
            class="risk-factors"
          >
            <h4>风险因素</h4>
            <el-table :data="riskFactorsRows" style="width: 100%" stripe>
              <el-table-column prop="factor" label="风险因素" width="120" />
              <el-table-column prop="score" label="风险分数" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="getRiskScoreTagType(row.score)">
                    {{ row.score }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
            </el-table>
          </div>
        </div>
      </el-card>
    </div>
    <div v-else class="empty-risk">
      <el-empty description="暂无风险评估信息" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { riskApi } from '@/services/risk'

interface Props {
  containerNumber: string
}

const props = defineProps<Props>()

/** 与 ext_container_risk_assessments / RiskService 返回一致 */
interface RiskAssessmentPayload {
  id?: number
  containerNumber: string
  riskScore: number | string
  riskLevel: string
  riskFactors?: Array<{ factor: string; score: number; description: string }>
  recommendation?: string
}

const loading = ref(false)
const riskAssessment = ref<RiskAssessmentPayload | null>(null)

const riskFactorsRows = computed(() => {
  const f = riskAssessment.value?.riskFactors
  return Array.isArray(f) ? f : []
})

function isRiskPayload(v: unknown): v is RiskAssessmentPayload {
  return (
    v !== null &&
    typeof v === 'object' &&
    'containerNumber' in v &&
    'riskLevel' in v &&
    typeof (v as RiskAssessmentPayload).containerNumber === 'string'
  )
}

const loadRisk = async () => {
  if (!props.containerNumber?.trim()) return

  loading.value = true
  try {
    const raw = await riskApi.getContainerRisk(props.containerNumber)
    if (raw && typeof raw === 'object' && 'success' in raw && (raw as { success?: boolean }).success === false) {
      riskAssessment.value = null
      return
    }
    if (isRiskPayload(raw)) {
      riskAssessment.value = raw
      return
    }
    const wrapped = raw as { data?: unknown }
    if (wrapped?.data && isRiskPayload(wrapped.data)) {
      riskAssessment.value = wrapped.data
      return
    }
    riskAssessment.value = null
  } catch {
    riskAssessment.value = null
  } finally {
    loading.value = false
  }
}

const formatRiskScore = (score: number | string | undefined): string => {
  if (score === undefined || score === null) return '—'
  const n = typeof score === 'string' ? parseFloat(score) : score
  return Number.isFinite(n) ? String(n) : '—'
}

/** RiskLevel 枚举：low | medium | high | critical */
const formatRiskLevelLabel = (level: string | undefined): string => {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重'
  }
  if (!level) return '—'
  const k = String(level).toLowerCase()
  return map[k] || level
}

const getRiskLevelTagType = (level: string | undefined): string => {
  if (!level) return 'info'
  const k = String(level).toLowerCase()
  if (k === 'critical') return 'danger'
  if (k === 'high') return 'danger'
  if (k === 'medium') return 'warning'
  if (k === 'low') return 'success'
  return 'info'
}

const getRiskScoreTagType = (score: number): string => {
  if (score >= 70) return 'danger'
  if (score >= 40) return 'warning'
  if (score > 0) return 'info'
  return 'success'
}

watch(
  () => props.containerNumber,
  (cn, prev) => {
    if (cn && cn !== prev) loadRisk()
  }
)

onMounted(() => {
  loadRisk()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.risk-card-tab {
  .tab-header-row {
    margin-bottom: 8px;
  }

  .loading-container {
    padding: 20px 0;
  }

  .risk-content {
    .risk-card {
      margin-bottom: 20px;

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .risk-details {
        .detail-row {
          display: flex;
          margin-bottom: 12px;
          align-items: flex-start;

          .label {
            min-width: 88px;
            flex-shrink: 0;
            color: $text-secondary;
            font-size: $font-size-sm;
          }

          .value {
            color: $text-primary;
            font-weight: 500;
            font-size: $font-size-sm;
          }

          &.recommendation-row {
            flex-direction: column;
            gap: 8px;

            .label {
              min-width: 0;
            }
          }

          .recommendation {
            margin: 0;
            padding: 10px 12px;
            background: $bg-page;
            border-radius: $radius-base;
            color: $text-primary;
            line-height: 1.5;
            font-size: $font-size-sm;
            width: 100%;
            box-sizing: border-box;
          }
        }

        .risk-factors {
          margin-top: 16px;

          h4 {
            margin: 0 0 10px 0;
            font-size: $font-size-sm;
            font-weight: 600;
            color: $text-primary;
          }
        }
      }
    }
  }

  .empty-risk {
    padding: 40px 0;
    text-align: center;
  }
}
</style>
