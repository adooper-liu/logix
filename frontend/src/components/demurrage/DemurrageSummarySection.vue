<script setup lang="ts">
import { useColors } from '@/composables/useColors'
import { demurrageService } from '@/services/demurrage'
import { SimplifiedStatusText } from '@/utils/logisticsStatusMachine'
import { ArrowUp, DArrowRight } from '@element-plus/icons-vue'
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const colors = useColors()
const router = useRouter()

interface Props {
  startDate?: string
  endDate?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ collapse: [] }>()

const loading = ref(false)
const errorMsg = ref<string | null>(null)
const summary = ref<{
  totalAmount: number
  currency: string
  containerCount: number
  containerCountWithCharge: number
  avgPerContainer: number
  partialResults?: boolean
  totalContainersInRange?: number
  byPort?: Array<{ port: string; totalAmount: number; containerCount: number }>
} | null>(null)
const topContainers = ref<
  Array<{
    containerNumber: string
    totalAmount: number
    currency: string
    chargeDays: number
    lastFreeDate: string | null
    destinationPort?: string
    logisticsStatus?: string
  }>
>([])

const statusTextMap: Record<string, string> = {
  arrived_at_transit: '已到中转港',
  arrived_at_destination: '已到目的港',
  ...SimplifiedStatusText
}
const getStatusText = (status?: string) => (status ? (statusTextMap[status] || status) : '-')

const loadData = async () => {
  loading.value = true
  errorMsg.value = null
  try {
    const [summaryRes, topRes] = await Promise.all([
      demurrageService.getSummary({
        startDate: props.startDate,
        endDate: props.endDate,
        limit: 500,
      }),
      demurrageService.getTopContainers({
        startDate: props.startDate,
        endDate: props.endDate,
        topN: 10,
      }),
    ])
    if (summaryRes.success && summaryRes.data) {
      summary.value = summaryRes.data
    } else {
      summary.value = null
      errorMsg.value = (summaryRes as { message?: string })?.message || '获取汇总失败'
    }
    if (topRes.success && topRes.data?.items) {
      topContainers.value = topRes.data.items
    } else {
      topContainers.value = []
    }
  } catch (e: unknown) {
    summary.value = null
    topContainers.value = []
    const err = e as {
      message?: string
      response?: { data?: { message?: string; error?: string } }
    }
    const backendError = err.response?.data?.error || err.response?.data?.message
    errorMsg.value = backendError || err.message || '请求失败，请检查网络或稍后重试'
  } finally {
    loading.value = false
  }
}

const goToMoreContainers = () => {
  router.push({
    path: '/shipments/demurrage-top',
    query: {
      startDate: props.startDate,
      endDate: props.endDate,
    },
  })
}

const formatAmount = (amount: number, currency: string) => {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDate = (d: string | null) => {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const goToDetail = (containerNumber: string) => {
  router.push({
    path: `/shipments/${encodeURIComponent(containerNumber)}`,
    query: { tab: 'demurrage' },
  })
}

watch(
  () => [props.startDate, props.endDate],
  () => loadData(),
  { immediate: true }
)

defineExpose({ reload: loadData })
</script>

<template>
  <el-card class="demurrage-summary-section" v-loading="loading">
    <template #header>
      <div class="section-header">
        <span class="section-title">滞港费</span>
        <span class="section-desc">按出运日期范围内货柜计算，与页面顶部日期一致</span>
        <el-button
          type="primary"
          link
          class="collapse-btn"
          @click="emit('collapse')"
        >
          <el-icon><ArrowUp /></el-icon>
          收起
        </el-button>
      </div>
    </template>

    <div v-if="!summary && !loading" class="empty-summary">
      <el-empty :image-size="60">
        <template #description>
          <div v-if="errorMsg" class="error-desc">
            <el-alert type="error" :title="errorMsg" show-icon :closable="false" />
          </div>
          <template v-else>
            <span>暂无滞港费数据</span>
            <p class="hint">请确保日期范围内有货柜且已配置滞港费标准</p>
          </template>
        </template>
      </el-empty>
    </div>

    <div v-if="summary?.byPort && summary.byPort.length > 0" class="by-port-section">
      <div class="by-port-header">
        <span class="by-port-title">按港口</span>
      </div>
      <div class="by-port-grid">
        <div
          v-for="row in summary.byPort"
          :key="row.port"
          class="by-port-card"
        >
          <div class="by-port-name">{{ row.port }}</div>
          <div class="by-port-amount">{{ formatAmount(row.totalAmount, summary.currency) }}</div>
          <div class="by-port-meta">{{ row.containerCount }} 柜</div>
        </div>
      </div>
    </div>

    <div v-if="summary?.partialResults" class="partial-hint">
      <el-alert type="info" :closable="false" show-icon>
        日期范围内共 {{ summary.totalContainersInRange }} 柜，本次仅计算前 500
        柜，结果可能为部分统计
      </el-alert>
    </div>

    <div v-if="topContainers.length > 0" class="top-containers">
      <div class="top-header">
        <span class="top-title">高费用货柜 Top 10</span>
        <el-button type="primary" link @click.stop="goToMoreContainers">
          <el-icon><DArrowRight /></el-icon>
          更多
        </el-button>
      </div>
      <div class="top-cards-grid">
        <div
          v-for="(row, index) in topContainers"
          :key="row.containerNumber"
          class="top-card"
          @click="goToDetail(row.containerNumber)"
        >
          <div class="top-card-rank">
            <el-tag
              :type="index < 3 ? (['danger', 'warning', 'success'] as const)[index] : 'info'"
              size="small"
              effect="dark"
              round
            >
              {{ index + 1 }}
            </el-tag>
          </div>
          <div class="top-card-main">
            <div class="top-card-cn">{{ row.containerNumber }}</div>
            <div class="top-card-amount">{{ formatAmount(row.totalAmount, row.currency) }}</div>
          </div>
          <div class="top-card-meta">
            <span v-if="row.logisticsStatus" class="meta-item meta-status">{{ getStatusText(row.logisticsStatus) }}</span>
            <span v-if="row.destinationPort" class="meta-item">{{ row.destinationPort }}</span>
            <span class="meta-item">计费 {{ row.chargeDays }} 天</span>
            <span class="meta-item">{{ formatDate(row.lastFreeDate) }}</span>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.demurrage-summary-section {
  margin-bottom: 8px;

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .section-title {
      font-weight: 600;
      font-size: 14px;
      color: var(--el-text-color-primary);
    }

    .section-desc {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    .collapse-btn {
      margin-left: auto;
    }
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;

    .summary-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--el-fill-color-light);
      border-radius: 6px;
      border-left: 3px solid var(--el-border-color);

      .card-icon {
        flex-shrink: 0;
      }

      .card-content {
        min-width: 0;

        .card-value {
          font-size: 16px;
          font-weight: 600;
          color: var(--el-text-color-primary);
        }

        .card-label {
          font-size: 12px;
          color: var(--el-text-color-secondary);
          margin-top: 2px;
        }
      }
    }
  }

  .empty-summary {
    padding: 24px 0;

    .error-desc {
      max-width: 400px;
      margin: 0 auto;
    }

    .hint {
      margin-top: 8px;
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .by-port-section {
    margin-bottom: 12px;

    .by-port-header {
      margin-bottom: $spacing-sm;
    }

    .by-port-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }

    .by-port-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: $spacing-sm;
    }

    .by-port-card {
      padding: $spacing-sm $spacing-md;
      background: var(--el-fill-color-lighter);
      border-radius: $radius-base;
      border: 1px solid var(--el-border-color-lighter);

      .by-port-name {
        font-size: $font-size-sm;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .by-port-amount {
        font-size: $font-size-sm;
        font-weight: 600;
        color: var(--el-color-primary);
        margin-top: 2px;
      }

      .by-port-meta {
        font-size: $font-size-xs;
        color: var(--el-text-color-secondary);
        margin-top: 2px;
      }
    }

    :deep(.el-collapse-item__header) {
      font-size: 13px;
    }

    :deep(.el-collapse-item__wrap) {
      border-bottom: none;
    }
  }

  .partial-hint {
    margin-bottom: 12px;
  }

  .top-containers {
    .top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      gap: 8px;

      .top-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }
    }

    .top-cards-grid {
      display: grid;
      grid-template-columns: repeat(10, minmax(0, 1fr));
      gap: $spacing-sm;
      overflow-x: auto;
      padding-bottom: $spacing-xs;

      &::-webkit-scrollbar {
        height: 6px;
      }

      &::-webkit-scrollbar-thumb {
        background: $border-base;
        border-radius: 3px;
      }
    }

    .top-card {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: $spacing-xs;
      padding: $spacing-sm $spacing-md;
      background: var(--el-fill-color-light);
      border-radius: $radius-base;
      border: 1px solid var(--el-border-color-lighter);
      cursor: pointer;
      transition: $transition-base;

      &:hover {
        border-color: var(--el-color-primary-light-5);
        background: var(--el-color-primary-light-9);
      }

      .top-card-rank {
        flex-shrink: 0;
      }

      .top-card-main {
        min-width: 0;

        .top-card-cn {
          font-size: $font-size-xs;
          font-weight: 600;
          color: var(--el-color-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .top-card-amount {
          font-size: $font-size-xs;
          font-weight: 700;
          color: var(--el-text-color-primary);
          margin-top: 1px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .top-card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 2px 6px;
        font-size: 10px;
        color: var(--el-text-color-secondary);

        .meta-item {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
      }
    }
  }
}

@media (max-width: 1200px) {
  .demurrage-summary-section .summary-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .demurrage-summary-section .summary-grid {
    grid-template-columns: 1fr;
  }

  .demurrage-summary-section .top-containers .top-cards-grid {
    grid-template-columns: repeat(10, minmax(100px, 1fr));
  }
}
</style>
