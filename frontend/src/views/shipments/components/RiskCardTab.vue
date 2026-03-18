<template>
  <div class="risk-card-tab">
    <div class="tab-header-row">
      <el-button type="primary" link size="small" @click="loadRisk">
        刷新
      </el-button>
    </div>
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>
    <div v-else-if="riskAssessment" class="risk-content">
      <el-card class="risk-card">
        <template #header>
          <div class="card-header">
            <span>风险评估</span>
            <el-tag :type="getRiskLevelTagType(riskAssessment.riskLevel)" size="large">
              {{ riskAssessment.riskLevel }}
            </el-tag>
          </div>
        </template>
        <div class="risk-details">
          <div class="detail-row">
            <span class="label">风险评分：</span>
            <span class="value">{{ riskAssessment.riskScore }}</span>
          </div>
          <div class="detail-row" v-if="riskAssessment.recommendation">
            <span class="label">建议：</span>
            <p class="recommendation">{{ riskAssessment.recommendation }}</p>
          </div>
          <div class="risk-factors" v-if="riskAssessment.riskFactors && riskAssessment.riskFactors.length > 0">
            <h4>风险因素</h4>
            <el-table :data="riskAssessment.riskFactors" style="width: 100%">
              <el-table-column prop="factor" label="风险因素" width="120" />
              <el-table-column prop="score" label="风险分数" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="getRiskScoreTagType(row.score)">
                    {{ row.score }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="描述" />
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
import { ref, onMounted } from 'vue'
import { riskApi } from '@/services/risk'
import { ElMessage } from 'element-plus'

interface Props {
  containerNumber: string
}

const props = defineProps<Props>()

const loading = ref(false)
const riskAssessment = ref<any>(null)

const loadRisk = async () => {
  if (!props.containerNumber) return
  
  loading.value = true
  try {
    const response = await riskApi.getContainerRisk(props.containerNumber)
    if (response.success) {
      riskAssessment.value = response.data || null
    } else {
      ElMessage.error('获取风险评估信息失败')
    }
  } catch (error) {
    console.error('Failed to load risk assessment:', error)
    ElMessage.error('获取风险评估信息失败')
  } finally {
    loading.value = false
  }
}

const getRiskLevelTagType = (level: string): string => {
  const levelMap: Record<string, string> = {
    'HIGH': 'danger',
    'MEDIUM': 'warning',
    'LOW': 'info',
    'NONE': 'success'
  }
  return levelMap[level] || 'info'
}

const getRiskScoreTagType = (score: number): string => {
  if (score >= 70) return 'danger'
  if (score >= 40) return 'warning'
  if (score > 0) return 'info'
  return 'success'
}

onMounted(() => {
  loadRisk()
})
</script>

<style scoped>
.risk-card-tab {
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
          margin-bottom: 16px;
          
          .label {
            min-width: 100px;
            color: #606266;
          }
          
          .value {
            color: #303133;
            font-weight: 500;
          }
          
          .recommendation {
            margin: 0 0 0 100px;
            padding: 12px;
            background: #f5f7fa;
            border-radius: 4px;
            color: #303133;
            line-height: 1.5;
          }
        }
        
        .risk-factors {
          margin-top: 24px;
          
          h4 {
            margin: 0 0 12px 0;
            color: #303133;
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