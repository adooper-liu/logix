<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { containerService } from '@/services/container'
import type { Container, PaginationParams } from '@/types'
import { Search, Refresh, View, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 表格数据
const containers = ref<Container[]>([])
const loading = ref(false)
const searchKeyword = ref('')

// 分页参数
const pagination = ref<PaginationParams>({
  page: 1,
  pageSize: 10,
  total: 0
})

// 状态映射 - 符合数据库标准
const statusMap: Record<string, { text: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  'not_shipped': { text: '未出运', type: 'info' },
  'shipped': { text: '已装船', type: 'success' },
  'in_transit': { text: '在途', type: 'success' },
  'at_port': { text: '已到港', type: 'success' },
  'picked_up': { text: '已提柜', type: 'warning' },
  'unloaded': { text: '已卸柜', type: 'warning' },
  'returned_empty': { text: '已还箱', type: 'success' },
  'hold': { text: '扣留', type: 'danger' },
  'completed': { text: '已完成', type: 'success' }
}

// 清关状态映射
const customsStatusMap: Record<string, { text: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  'NOT_STARTED': { text: '未开始', type: 'info' },
  'IN_PROGRESS': { text: '进行中', type: 'warning' },
  'COMPLETED': { text: '已完成', type: 'success' },
  'FAILED': { text: '失败', type: 'danger' }
}

// 获取集装箱列表
const loadContainers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      search: searchKeyword.value
    }

    console.log('Loading containers with params:', params)

    const response = await containerService.getContainers(params)
    console.log('Container response:', response)

    containers.value = response.items
    pagination.value.total = response.pagination.total || 0
  } catch (error) {
    console.error('Failed to load containers:', error)
    ElMessage.error('获取集装箱列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  pagination.value.page = 1
  loadContainers()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  pagination.value.page = 1
  loadContainers()
}

// 查看详情
const viewDetails = (container: Container) => {
  router.push(`/shipments/${container.containerNumber}`)
}

// 编辑集装箱
const editContainer = (container: Container) => {
  ElMessage.info(`编辑集装箱 ${container.containerNumber}`)
}

// 分页改变
const handlePageChange = (page: number) => {
  pagination.value.page = page
  loadContainers()
}

// 页面大小改变
const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize
  pagination.value.page = 1
  loadContainers()
}

// 格式化日期
const formatDate = (date: string | Date): string => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  loadContainers()
})
</script>

<template>
  <div class="shipments-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>集装箱管理</h2>
      <p>管理所有的集装箱信息和状态跟踪</p>
    </div>

    <!-- 搜索和操作栏 -->
    <el-card class="search-card">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索集装箱号、备货单号、提单号..."
          :prefix-icon="Search"
          style="width: 300px; margin-right: 15px;"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
        <el-button @click="resetSearch">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>
        <div class="spacer"></div>
        <el-button type="success" @click="loadContainers">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </el-card>

    <!-- 集装箱表格 -->
    <el-card class="table-card">
      <el-table
        :data="containers"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="containerNumber" label="集装箱号" width="140" fixed />
        <el-table-column prop="orderNumber" label="备货单号" width="140" />
        <el-table-column prop="billOfLadingNumber" label="提单号" width="140" />
        <el-table-column prop="containerTypeCode" label="柜型" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ row.containerTypeCode || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="logisticsStatus" label="物流状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.logisticsStatus]?.type || 'info'" size="small">
              {{ statusMap[row.logisticsStatus]?.text || row.logisticsStatus || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="inspectionRequired" label="查验" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.inspectionRequired ? 'warning' : 'info'" size="small">
              {{ row.inspectionRequired ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isUnboxing" label="开箱" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isUnboxing ? 'warning' : 'info'" size="small">
              {{ row.isUnboxing ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="destinationPort" label="目的港" width="100" />
        <el-table-column prop="location" label="当前位置" width="100" />
        <el-table-column prop="etaDestPort" label="预计到港" width="110">
          <template #default="{ row }">
            {{ row.etaDestPort ? formatDate(row.etaDestPort) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="ataDestPort" label="实际到港" width="110">
          <template #default="{ row }">
            {{ row.ataDestPort ? formatDate(row.ataDestPort) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="customsStatus" label="清关状态" width="100">
          <template #default="{ row }">
            <el-tag :type="customsStatusMap[row.customsStatus]?.type || 'info'" size="small" v-if="row.customsStatus">
              {{ customsStatusMap[row.customsStatus]?.text || row.customsStatus }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="cargoDescription" label="货物描述" min-width="150" show-overflow-tooltip />
        <el-table-column prop="lastUpdated" label="最后更新" width="160">
          <template #default="{ row }">
            {{ row.lastUpdated ? formatDate(row.lastUpdated) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              @click="viewDetails(row)"
            >
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button
              size="small"
              @click="editContainer(row)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total || 0"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.shipments-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
  
  h2 {
    font-size: 24px;
    color: #303133;
    margin-bottom: 10px;
  }
  
  p {
    color: #909399;
    font-size: 14px;
  }
}

.search-card {
  margin-bottom: 20px;
  
  .search-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    
    .spacer {
      flex: 1;
    }
  }
}

.table-card {
  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .search-bar {
    flex-direction: column;
    align-items: stretch !important;
    
    .el-input {
      width: 100% !important;
      margin-right: 0 !important;
    }
    
    .spacer {
      display: none;
    }
  }
}
</style>