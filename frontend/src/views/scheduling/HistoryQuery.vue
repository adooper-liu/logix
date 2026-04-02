<template>
  <div class="scheduling-history-page">
    <el-card shadow="never" header="📋 排产历史记录查询">
      <!-- 搜索区域 -->
      <div class="search-area">
        <el-form :inline="true">
          <el-form-item label="货柜号">
            <el-input
              v-model="searchForm.containerNumber"
              placeholder="请输入货柜号"
              style="width: 200px"
              clearable
            />
          </el-form-item>

          <el-form-item label="时间范围">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSearch" :loading="loading">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 结果表格 -->
      <el-table
        v-loading="loading"
        :data="histories"
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column prop="containerNumber" label="货柜号" width="120" />
        
        <el-table-column label="版本" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.schedulingStatus === 'CONFIRMED' ? 'success' : 'info'">
              v{{ row.schedulingVersion }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="策略" width="100">
          <template #default="{ row }">
            <el-tag type="primary">{{ translateStrategy(row.strategy) }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="总费用" width="100" align="right">
          <template #default="{ row }">
            <span v-if="row.totalCost" class="cost-highlight">
              ${{ row.totalCost.toFixed(2) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.schedulingStatus)">
              {{ translateStatus(row.schedulingStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="operatedBy" label="操作人" width="100" />
        
        <el-table-column 
          prop="operatedAt" 
          label="操作时间" 
          width="160"
          sortable="custom"
        >
          <template #default="{ row }">
            {{ formatDateTime(row.operatedAt) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="viewDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer 
      v-model="detailVisible" 
      title="排产记录详情" 
      direction="rtl" 
      size="600px"
    >
      <el-descriptions :column="1" bordered v-if="currentRecord">
        <el-descriptions-item label="货柜号">
          {{ currentRecord.containerNumber }}
        </el-descriptions-item>
        <el-descriptions-item label="版本号">
          v{{ currentRecord.schedulingVersion }}
        </el-descriptions-item>
        <el-descriptions-item label="策略">
          {{ translateStrategy(currentRecord.strategy) }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          {{ translateStatus(currentRecord.schedulingStatus) }}
        </el-descriptions-item>

        <!-- 日期信息 -->
        <el-descriptions-item label="提柜日期" v-if="currentRecord.plannedPickupDate">
          {{ formatDate(currentRecord.plannedPickupDate) }}
        </el-descriptions-item>
        <el-descriptions-item label="送仓日期" v-if="currentRecord.plannedDeliveryDate">
          {{ formatDate(currentRecord.plannedDeliveryDate) }}
        </el-descriptions-item>
        <el-descriptions-item label="卸柜日期" v-if="currentRecord.plannedUnloadDate">
          {{ formatDate(currentRecord.plannedUnloadDate) }}
        </el-descriptions-item>
        <el-descriptions-item label="还箱日期" v-if="currentRecord.plannedReturnDate">
          {{ formatDate(currentRecord.plannedReturnDate) }}
        </el-descriptions-item>

        <!-- 资源信息 -->
        <el-descriptions-item
          label="仓库"
          v-if="currentRecord.warehouseName || currentRecord.warehouseCode"
        >
          {{ currentRecord.warehouseName || currentRecord.warehouseCode }}
        </el-descriptions-item>
        <el-descriptions-item
          label="车队"
          v-if="currentRecord.truckingCompanyName || currentRecord.truckingCompanyCode"
        >
          {{ currentRecord.truckingCompanyName || currentRecord.truckingCompanyCode }}
        </el-descriptions-item>

        <!-- 费用信息 -->
        <el-descriptions-item label="总费用" v-if="currentRecord.totalCost">
          <span class="cost-highlight">${{ currentRecord.totalCost.toFixed(2) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="滞港费" v-if="currentRecord.demurrageCost">
          ${{ currentRecord.demurrageCost.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="滞箱费" v-if="currentRecord.detentionCost">
          ${{ currentRecord.detentionCost.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="堆存费" v-if="currentRecord.storageCost">
          ${{ currentRecord.storageCost.toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="运输费" v-if="currentRecord.transportationCost">
          ${{ currentRecord.transportationCost.toFixed(2) }}
        </el-descriptions-item>

        <!-- 审计信息 -->
        <el-descriptions-item label="操作人">
          {{ currentRecord.operatedBy || 'SYSTEM' }}
        </el-descriptions-item>
        <el-descriptions-item label="操作时间">
          {{ formatDateTime(currentRecord.operatedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="操作类型">
          {{ translateOperationType(currentRecord.operationType) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import api from '@/services/api'
import { onMounted, reactive, ref } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'

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
  dateRange: [] as string[],
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
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const response = await api.get('/scheduling/history/latest', { params })

    histories.value = response.data.data.records || []
    pagination.total = response.data.data.total || 0
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
 * 分页大小变化
 */
function handleSizeChange(size: number) {
  pagination.pageSize = size
  pagination.current = 1
  handleSearch()
}

/**
 * 页码变化
 */
function handleCurrentChange(page: number) {
  pagination.current = page
  handleSearch()
}

/**
 * 排序变化
 */
function handleSortChange({ prop, order }: any) {
  // 可以在这里添加排序逻辑
  console.log('排序变化:', prop, order)
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
 * 获取状态标签类型
 */
function getStatusTagType(status?: string): 'success' | 'danger' | 'info' {
  switch (status) {
    case 'CONFIRMED':
      return 'success'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'info'
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
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * 格式化日期时间
 */
function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped lang="scss">
.scheduling-history-page {
  padding: 24px;

  .search-area {
    margin-bottom: 24px;
  }

  .cost-highlight {
    color: var(--el-color-success);
    font-weight: 600;
  }

  .pagination-container {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
