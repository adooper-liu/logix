<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Refresh, Connection, DataLine, Document, Link } from '@element-plus/icons-vue'
import { feituoService } from '@/services/feituo'

const router = useRouter()
const loading = ref(false)
const stats = ref<{
  totalEvents: number
  dataSourceStats: { dataSource: string; count: string }[]
  estimatedStats: { isEstimated: boolean; count: string }[]
  recentContainers: { containerNumber: string; lastUpdate: string }[]
} | null>(null)
const containers = ref<{
  items: { containerNumber: string; dataSources: string[]; eventCount: string; firstEventAt: string; lastEventAt: string }[]
  total: number
  page: number
  pageSize: number
} | null>(null)
const dataSourceFilter = ref<string>('')
const page = ref(1)
const pageSize = ref(20)

const dataSourceLabel = (ds: string) => {
  if (ds === 'FeituoAPI') return 'API'
  if (ds === 'Feituo') return 'Excel'
  return ds || '未知'
}

const dataSourceTagType = (ds: string) => {
  if (ds === 'FeituoAPI') return 'primary'
  if (ds === 'Feituo') return 'success'
  return 'info'
}

const loadStats = async () => {
  loading.value = true
  try {
    const res = await feituoService.getStats()
    if (res.success && res.data) {
      stats.value = res.data
    }
  } catch {
    ElMessage.error('获取统计失败')
  } finally {
    loading.value = false
  }
}

const loadContainers = async () => {
  loading.value = true
  try {
    const res = await feituoService.getContainersWithExternalData({
      dataSource: dataSourceFilter.value || undefined,
      page: page.value,
      pageSize: pageSize.value
    })
    if (res.success && res.data) {
      containers.value = res.data
    }
  } catch {
    ElMessage.error('获取货柜列表失败')
  } finally {
    loading.value = false
  }
}

const refresh = async () => {
  await Promise.all([loadStats(), loadContainers()])
}

const goToContainer = (cn: string) => {
  router.push({ path: `/shipments/${encodeURIComponent(cn)}`, query: { tab: 'logistics-path' } })
}

const formatDate = (d: string) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return d
  }
}

onMounted(refresh)
</script>

<template>
  <div class="feituo-verify-page">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><DataLine /></el-icon>
            飞驼数据对接验证
          </span>
          <el-button type="primary" :icon="Refresh" :loading="loading" @click="refresh">
            刷新
          </el-button>
        </div>
      </template>

      <el-alert type="info" :closable="false" show-icon class="info-alert">
        <template #title>数据来源说明</template>
        <p>
          <el-tag type="primary" size="small">API</el-tag>：飞驼 API 实时同步，由 FeiTuoAdapter 拉取并写入
          <code>ext_container_status_events</code>，标记为 <code>FeituoAPI</code>。
        </p>
        <p>
          <el-tag type="success" size="small">Excel</el-tag>：飞驼 Excel 导入，标记为 <code>Feituo</code>。
        </p>
      </el-alert>

      <div v-if="stats" class="stats-section">
        <h3>统计概览</h3>
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-value">{{ stats.totalEvents }}</div>
              <div class="stat-label">外部状态事件总数</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-value">{{ stats.dataSourceStats?.length ?? 0 }}</div>
              <div class="stat-label">数据源种类</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover" class="stat-card">
              <div class="stat-value">{{ stats.recentContainers?.length ?? 0 }}</div>
              <div class="stat-label">最近更新货柜（前10）</div>
            </el-card>
          </el-col>
        </el-row>

        <div v-if="stats.dataSourceStats?.length" class="data-source-breakdown">
          <h4>按数据源分布</h4>
          <div class="ds-tags">
            <div
              v-for="ds in stats.dataSourceStats"
              :key="ds.dataSource"
              class="ds-item"
            >
              <el-tag :type="dataSourceTagType(ds.dataSource)" size="large">
                {{ dataSourceLabel(ds.dataSource) }}
              </el-tag>
              <span class="ds-count">{{ ds.count }} 条</span>
            </div>
          </div>
        </div>
      </div>

      <div class="containers-section">
        <h3>已有外部数据的货柜</h3>
        <div class="filter-bar">
          <el-select
            v-model="dataSourceFilter"
            placeholder="全部数据源"
            clearable
            style="width: 140px"
            @change="page = 1; loadContainers()"
          >
            <el-option label="全部" value="" />
            <el-option label="API (FeituoAPI)" value="FeituoAPI" />
            <el-option label="Excel (Feituo)" value="Feituo" />
          </el-select>
          <el-button type="primary" :loading="loading" @click="loadContainers">
            查询
          </el-button>
        </div>

        <el-table
          v-loading="loading"
          :data="containers?.items ?? []"
          stripe
          style="width: 100%"
          @row-click="(row) => goToContainer(row.containerNumber)"
        >
          <el-table-column prop="containerNumber" label="货柜号" min-width="140">
            <template #default="{ row }">
              <el-link type="primary" :underline="false">
                {{ row.containerNumber }}
                <el-icon class="link-icon"><Link /></el-icon>
              </el-link>
            </template>
          </el-table-column>
          <el-table-column label="数据来源" min-width="160">
            <template #default="{ row }">
              <el-tag
                v-for="ds in (row.dataSources || [])"
                :key="ds"
                :type="dataSourceTagType(ds)"
                size="small"
                class="ds-tag"
              >
                {{ dataSourceLabel(ds) }}
              </el-tag>
              <span v-if="!row.dataSources?.length">-</span>
            </template>
          </el-table-column>
          <el-table-column prop="eventCount" label="事件数" width="90" />
          <el-table-column label="首次事件" width="160">
            <template #default="{ row }">{{ formatDate(row.firstEventAt) }}</template>
          </el-table-column>
          <el-table-column label="最近事件" width="160">
            <template #default="{ row }">{{ formatDate(row.lastEventAt) }}</template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-if="containers && containers.total > pageSize"
          v-model:current-page="page"
          :page-size="pageSize"
          :total="containers.total"
          layout="prev, pager, next"
          class="pagination"
          @current-change="loadContainers"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.feituo-verify-page {
  padding: $spacing-md;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .title {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    font-size: 1.1rem;
    font-weight: 600;
  }
}

.info-alert {
  margin-bottom: $spacing-lg;

  p {
    margin: $spacing-xs 0 0;
    font-size: 0.9rem;

    &:first-of-type {
      margin-top: 0;
    }
  }

  code {
    background: var(--el-fill-color-light);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.85em;
  }
}

.stats-section,
.containers-section {
  margin-top: $spacing-lg;

  h3, h4 {
    margin: 0 0 $spacing-md;
    font-size: 1rem;
    font-weight: 600;
  }
}

.stat-card {
  .stat-value {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--el-color-primary);
  }

  .stat-label {
    font-size: 0.85rem;
    color: var(--el-text-color-secondary);
    margin-top: $spacing-xs;
  }
}

.data-source-breakdown {
  margin-top: $spacing-lg;

  .ds-tags {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-md;
  }

  .ds-item {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
  }

  .ds-count {
    font-size: 0.9rem;
    color: var(--el-text-color-secondary);
  }
}

.filter-bar {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.ds-tag {
  margin-right: $spacing-xs;
}

.link-icon {
  margin-left: 2px;
  font-size: 0.85em;
}

.pagination {
  margin-top: $spacing-md;
  justify-content: flex-start;
}

:deep(.el-table__row) {
  cursor: pointer;
}
</style>
