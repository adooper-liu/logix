<template>
  <div class="scheduling-history-page">
    <a-card title="📋 排产历史记录查询">
      <!-- 搜索区域 -->
      <div class="search-area">
        <a-form layout="inline">
          <a-form-item label="货柜号">
            <a-input
              v-model:value="searchForm.containerNumber"
              placeholder="请输入货柜号"
              style="width: 200px"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="时间范围">
            <a-range-picker v-model:value="searchForm.dateRange" />
          </a-form-item>

          <a-form-item>
            <a-button type="primary" @click="handleSearch" :loading="loading"> 🔍 查询 </a-button>
            <a-button style="margin-left: 8px" @click="handleReset"> 🔄 重置 </a-button>
          </a-form-item>
        </a-form>
      </div>

      <!-- 结果表格 -->
      <a-table
        :loading="loading"
        :data-source="histories"
        :columns="columns"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <!-- 版本号列 -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'version'">
            <a-tag :color="record.schedulingStatus === 'CONFIRMED' ? 'success' : 'default'">
              v{{ record.schedulingVersion }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'strategy'">
            <a-tag color="blue">{{ translateStrategy(record.strategy) }}</a-tag>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-badge
              :status="getStatusBadgeType(record.schedulingStatus)"
              :text="translateStatus(record.schedulingStatus)"
            />
          </template>

          <template v-else-if="column.key === 'cost'">
            <span v-if="record.totalCost" class="cost-highlight">
              ${{ record.totalCost.toFixed(2) }}
            </span>
            <span v-else>-</span>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="viewDetail(record)"> 查看详情 </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 详情抽屉 -->
    <a-drawer v-model:visible="detailVisible" title="排产记录详情" placement="right" :width="600">
      <a-descriptions :column="1" bordered v-if="currentRecord">
        <a-descriptions-item label="货柜号">
          {{ currentRecord.containerNumber }}
        </a-descriptions-item>
        <a-descriptions-item label="版本号">
          v{{ currentRecord.schedulingVersion }}
        </a-descriptions-item>
        <a-descriptions-item label="策略">
          {{ translateStrategy(currentRecord.strategy) }}
        </a-descriptions-item>
        <a-descriptions-item label="状态">
          {{ translateStatus(currentRecord.schedulingStatus) }}
        </a-descriptions-item>

        <!-- 日期信息 -->
        <a-descriptions-item label="提柜日期" v-if="currentRecord.plannedPickupDate">
          {{ formatDate(currentRecord.plannedPickupDate) }}
        </a-descriptions-item>
        <a-descriptions-item label="送仓日期" v-if="currentRecord.plannedDeliveryDate">
          {{ formatDate(currentRecord.plannedDeliveryDate) }}
        </a-descriptions-item>
        <a-descriptions-item label="卸柜日期" v-if="currentRecord.plannedUnloadDate">
          {{ formatDate(currentRecord.plannedUnloadDate) }}
        </a-descriptions-item>
        <a-descriptions-item label="还箱日期" v-if="currentRecord.plannedReturnDate">
          {{ formatDate(currentRecord.plannedReturnDate) }}
        </a-descriptions-item>

        <!-- 资源信息 -->
        <a-descriptions-item
          label="仓库"
          v-if="currentRecord.warehouseName || currentRecord.warehouseCode"
        >
          {{ currentRecord.warehouseName || currentRecord.warehouseCode }}
        </a-descriptions-item>
        <a-descriptions-item
          label="车队"
          v-if="currentRecord.truckingCompanyName || currentRecord.truckingCompanyCode"
        >
          {{ currentRecord.truckingCompanyName || currentRecord.truckingCompanyCode }}
        </a-descriptions-item>

        <!-- 费用信息 -->
        <a-descriptions-item label="总费用" v-if="currentRecord.totalCost">
          <span class="cost-highlight">${{ currentRecord.totalCost.toFixed(2) }}</span>
        </a-descriptions-item>
        <a-descriptions-item label="滞港费" v-if="currentRecord.demurrageCost">
          ${{ currentRecord.demurrageCost.toFixed(2) }}
        </a-descriptions-item>
        <a-descriptions-item label="滞箱费" v-if="currentRecord.detentionCost">
          ${{ currentRecord.detentionCost.toFixed(2) }}
        </a-descriptions-item>
        <a-descriptions-item label="堆存费" v-if="currentRecord.storageCost">
          ${{ currentRecord.storageCost.toFixed(2) }}
        </a-descriptions-item>
        <a-descriptions-item label="运输费" v-if="currentRecord.transportationCost">
          ${{ currentRecord.transportationCost.toFixed(2) }}
        </a-descriptions-item>

        <!-- 审计信息 -->
        <a-descriptions-item label="操作人">
          {{ currentRecord.operatedBy || 'SYSTEM' }}
        </a-descriptions-item>
        <a-descriptions-item label="操作时间">
          {{ formatDateTime(currentRecord.operatedAt) }}
        </a-descriptions-item>
        <a-descriptions-item label="操作类型">
          {{ translateOperationType(currentRecord.operationType) }}
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import api from '@/services/api'
import dayjs, { Dayjs } from 'dayjs'
import { onMounted, reactive, ref } from 'vue'

interface SchedulingHistory {
  id: number
  containerNumber: string
  schedulingVersion: number
  strategy: string
  totalCost?: number
  schedulingStatus: 'CONFIRMED' | 'CANCELLED' | 'SUPERSEDED'
  operatedBy?: string
  operatedAt: string
  [key: string]: any
}

// 搜索表单
const searchForm = reactive({
  containerNumber: '',
  dateRange: [] as Dayjs[],
})

// 表格数据
const loading = ref(false)
const histories = ref<SchedulingHistory[]>([])
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
})

// 详情
const detailVisible = ref(false)
const currentRecord = ref<SchedulingHistory | null>(null)

// 表格列定义
const columns = [
  {
    title: '货柜号',
    dataIndex: 'containerNumber',
    key: 'containerNumber',
    width: 120,
  },
  {
    title: '版本',
    key: 'version',
    width: 80,
    align: 'center',
  },
  {
    title: '策略',
    key: 'strategy',
    width: 100,
  },
  {
    title: '总费用',
    key: 'cost',
    width: 100,
    align: 'right',
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
  },
  {
    title: '操作人',
    dataIndex: 'operatedBy',
    key: 'operatedBy',
    width: 100,
  },
  {
    title: '操作时间',
    dataIndex: 'operatedAt',
    key: 'operatedAt',
    width: 160,
    sorter: true,
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    fixed: 'right',
  },
]

onMounted(() => {
  handleSearch()
})

/**
 * 查询
 */
async function handleSearch() {
  try {
    loading.value = true

    const params: any = {
      page: pagination.current,
      limit: pagination.pageSize,
    }

    if (searchForm.containerNumber) {
      params.containerNumber = searchForm.containerNumber
    }

    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0].format('YYYY-MM-DD')
      params.endDate = searchForm.dateRange[1].format('YYYY-MM-DD')
    }

    const response = await api.get('/scheduling/history/latest', { params })

    histories.value = response.data.data
    pagination.total = response.data.data.length
  } catch (error: any) {
    console.error('查询失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 重置
 */
function handleReset() {
  searchForm.containerNumber = ''
  searchForm.dateRange = []
  pagination.current = 1
  handleSearch()
}

/**
 * 分页变化
 */
function handleTableChange(pag: any) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  handleSearch()
}

/**
 * 查看详情
 */
function viewDetail(record: SchedulingHistory) {
  currentRecord.value = record
  detailVisible.value = true
}

/**
 * 翻译策略
 */
function translateStrategy(strategy?: string): string {
  if (!strategy) return '-'
  const map: Record<string, string> = {
    Direct: '直提',
    'Drop off': '甩挂',
    Expedited: '加急',
  }
  return map[strategy] || strategy
}

/**
 * 翻译状态
 */
function translateStatus(status?: string): string {
  if (!status) return '-'
  const map: Record<string, string> = {
    CONFIRMED: '生效中',
    SUPERSEDED: '已作废',
    CANCELLED: '已取消',
  }
  return map[status] || status
}

/**
 * 获取状态徽章类型
 */
function getStatusBadgeType(status?: string): 'success' | 'error' | 'default' {
  switch (status) {
    case 'CONFIRMED':
      return 'success'
    case 'CANCELLED':
      return 'error'
    default:
      return 'default'
  }
}

/**
 * 翻译操作类型
 */
function translateOperationType(type?: string): string {
  if (!type) return '-'
  const map: Record<string, string> = {
    CREATE: '创建',
    UPDATE: '更新',
    CANCEL: '取消',
  }
  return map[type] || type
}

/**
 * 格式化日期
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  return dayjs(dateStr).format('YYYY-MM-DD')
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-'
  return dayjs(dateStr).format('YYYY-MM-DD HH:mm:ss')
}
</script>

<style scoped lang="scss">
.scheduling-history-page {
  padding: 24px;

  .search-area {
    margin-bottom: 24px;
  }

  .cost-highlight {
    color: #52c41a;
    font-weight: 600;
  }
}
</style>
