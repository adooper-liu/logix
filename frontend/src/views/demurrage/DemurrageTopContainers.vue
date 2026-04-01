<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { demurrageService } from '@/services/demurrage'
import { SimplifiedStatusText } from '@/utils/logisticsStatusMachine'
import dayjs from 'dayjs'
import { formatCurrency } from '@/utils/currency'

const statusTextMap: Record<string, string> = {
  arrived_at_transit: '已到中转港',
  arrived_at_destination: '已到目的港',
  ...SimplifiedStatusText,
}
const getStatusText = (status?: string) => (status ? statusTextMap[status] || status : '-')

type ContainerItem = {
  containerNumber: string
  totalAmount: number
  currency: string
  chargeDays: number
  lastFreeDate: string | null
  destinationPort?: string
  logisticsStatus?: string
}

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const containers = ref<ContainerItem[]>([])

const startDate = computed(
  () => (route.query.startDate as string) || dayjs().startOf('year').format('YYYY-MM-DD')
)
const endDate = computed(() => (route.query.endDate as string) || dayjs().format('YYYY-MM-DD'))

// 按目的港分组，组内保持 API 返回的费用降序
const groupedByPort = computed(() => {
  const groups: Record<string, ContainerItem[]> = {}
  for (const item of containers.value) {
    const port = item.destinationPort?.trim() || '未指定目的港'
    if (!groups[port]) groups[port] = []
    groups[port].push(item)
  }
  const entries = Object.entries(groups)
  return entries.sort(([a], [b]) => {
    if (a === '未指定目的港') return 1
    if (b === '未指定目的港') return -1
    return a.localeCompare(b)
  })
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await demurrageService.getTopContainers({
      startDate: startDate.value,
      endDate: endDate.value,
      topN: 100,
    })
    if (res.success && res.data?.items) {
      containers.value = res.data.items
    } else {
      containers.value = []
    }
  } catch {
    containers.value = []
  } finally {
    loading.value = false
  }
}

const formatAmount = (amount: number, currency: string) => {
  return formatCurrency(amount, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    showSymbol: false,
    showCode: true,
  })
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

const goBack = () => {
  router.push({
    path: '/shipments',
    query: { startDate: startDate.value, endDate: endDate.value },
  })
}

onMounted(() => loadData())
</script>

<template>
  <div class="demurrage-top-page">
    <div class="page-header">
      <el-button text @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h2>高费用货柜</h2>
      <p class="date-range">{{ startDate }} ～ {{ endDate }}</p>
    </div>

    <el-card v-loading="loading">
      <div v-if="containers.length > 0" class="port-groups">
        <section v-for="[portName, items] in groupedByPort" :key="portName" class="port-group">
          <div class="port-header">
            <span class="port-name">目的港：{{ portName }}</span>
            <span class="port-count">{{ items.length }} 柜</span>
          </div>
          <div class="containers-grid">
            <div
              v-for="(row, index) in items"
              :key="row.containerNumber"
              class="container-card"
              @click="goToDetail(row.containerNumber)"
            >
              <el-tag
                :type="index < 3 ? (['danger', 'warning', 'success'] as const)[index] : 'info'"
                size="small"
                effect="dark"
                round
                class="rank-tag"
              >
                {{ index + 1 }}
              </el-tag>
              <div class="card-cn">{{ row.containerNumber }}</div>
              <div class="card-amount">{{ formatAmount(row.totalAmount, row.currency) }}</div>
              <div class="card-meta">
                <span v-if="row.logisticsStatus">{{ getStatusText(row.logisticsStatus) }}</span>
                <span>{{ row.chargeDays }} 天</span>
                <span>· {{ formatDate(row.lastFreeDate) }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
      <el-empty v-else-if="!loading" description="暂无高费用货柜数据" />
    </el-card>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.demurrage-top-page {
  padding: 0 $spacing-md $spacing-md;

  .page-header {
    margin-bottom: $spacing-md;

    h2 {
      margin: $spacing-sm 0 $spacing-xs;
      font-size: $font-size-xl;
      font-weight: 600;
    }

    .date-range {
      font-size: $font-size-xs;
      color: var(--el-text-color-secondary);
    }
  }

  .port-groups {
    display: flex;
    flex-direction: column;
    gap: $spacing-lg;
  }

  .port-group {
    .port-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: $spacing-sm;
      padding: $spacing-sm $spacing-md;
      background: $bg-page;
      border-radius: $radius-base;
      border-left: 4px solid $primary-color;

      .port-name {
        font-size: $font-size-base;
        font-weight: 600;
        color: $text-primary;
      }

      .port-count {
        font-size: $font-size-xs;
        color: $text-secondary;
      }
    }

    .containers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: $spacing-sm;
    }
  }

  .container-card {
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

    .rank-tag {
      align-self: flex-start;
    }

    .card-cn {
      font-size: $font-size-xs;
      font-weight: 600;
      color: var(--el-color-primary);
    }

    .card-amount {
      font-size: $font-size-sm;
      font-weight: 700;
      color: var(--el-text-color-primary);
    }

    .card-meta {
      font-size: 10px;
      color: var(--el-text-color-secondary);
    }
  }
}

@media (max-width: 768px) {
  .demurrage-top-page .port-group .containers-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
