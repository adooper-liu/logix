<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, CircleCheck, Clock, Timer, CaretRight, Refresh } from '@element-plus/icons-vue'
import {
  getMigrations,
  executeMigration,
  executeAllPending,
  getMigrationContent,
  type MigrationScript,
  type MigrationStats,
} from '@/services/migration'

// 状态
const loading = ref(false)
const migrations = ref<MigrationScript[]>([])
const stats = ref<MigrationStats>({ total: 0, executed: 0, pending: 0 })
const selectedMigrations = ref<string[]>([])
const executingFile = ref('')
const showContentDialog = ref(false)
const currentContent = ref('')
const currentFilename = ref('')

// 计算属性
const pendingMigrations = computed(() => migrations.value.filter(m => m.status === 'pending'))
const successMigrations = computed(() => migrations.value.filter(m => m.status === 'success'))

// 加载数据
const loadMigrations = async () => {
  loading.value = true
  try {
    const res = await getMigrations()
    if (res.success) {
      migrations.value = res.data.migrations
      stats.value = res.data.stats
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载迁移列表失败')
  } finally {
    loading.value = false
  }
}

// 执行单个迁移
const handleExecute = async (filename: string) => {
  try {
    await ElMessageBox.confirm(`确定要执行迁移脚本「${filename}」吗？`, '执行确认', {
      confirmButtonText: '执行',
      cancelButtonText: '取消',
      type: 'warning',
    })

    executingFile.value = filename
    const res = await executeMigration(filename)

    if (res.success) {
      ElMessage.success(res.message)
      await loadMigrations()
    } else {
      ElMessage.error(res.message)
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '执行失败')
    }
  } finally {
    executingFile.value = ''
  }
}

// 执行所有待执行迁移
const handleExecuteAll = async () => {
  if (pendingMigrations.value.length === 0) {
    ElMessage.info('没有待执行的迁移')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要执行所有 ${pendingMigrations.value.length} 个待执行的迁移吗？`,
      '批量执行确认',
      {
        confirmButtonText: '执行全部',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    loading.value = true
    const res = await executeAllPending()

    if (res.success) {
      ElMessage.success(res.message)
    } else {
      ElMessage.error(res.message)
    }
    await loadMigrations()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '批量执行失败')
    }
  } finally {
    loading.value = false
  }
}

// 查看脚本内容
const handleViewContent = async (filename: string) => {
  try {
    const res = await getMigrationContent(filename)
    if (res.success) {
      currentFilename.value = filename
      currentContent.value = res.data.content
      showContentDialog.value = true
    }
  } catch (error: any) {
    ElMessage.error(error.message || '获取脚本内容失败')
  }
}

// 选择变化
const handleSelectionChange = (selection: MigrationScript[]) => {
  selectedMigrations.value = selection.map(m => m.filename)
}

// 格式化日期
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 获取状态类型
const getStatusType = (status: string) => {
  switch (status) {
    case 'success':
      return 'success'
    case 'failed':
      return 'danger'
    case 'running':
      return 'warning'
    default:
      return 'info'
  }
}

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'success':
      return '已执行'
    case 'failed':
      return '失败'
    case 'running':
      return '执行中'
    default:
      return '待执行'
  }
}

onMounted(() => {
  loadMigrations()
})
</script>

<template>
  <div class="migration-manage">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon total"><Document /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">总迁移数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon success"><CircleCheck /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.executed }}</div>
              <div class="stat-label">已执行</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon pending"><Clock /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pending }}</div>
              <div class="stat-label">待执行</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <el-icon class="stat-icon last"><Timer /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ formatDate(stats.lastExecuted).split(' ')[0] }}</div>
              <div class="stat-label">最后执行</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 操作栏 -->
    <el-card class="action-card">
      <template #header>
        <div class="card-header">
          <span>迁移脚本列表</span>
          <div class="actions">
            <el-button
              type="primary"
              :loading="loading"
              :disabled="pendingMigrations.length === 0"
              @click="handleExecuteAll"
            >
              <el-icon><CaretRight /></el-icon>
              执行全部待执行 ({{ pendingMigrations.length }})
            </el-button>
            <el-button @click="loadMigrations" :loading="loading">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 迁移表格 -->
      <el-table
        v-loading="loading"
        :data="migrations"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />

        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="filename" label="文件名" min-width="200">
          <template #default="{ row }">
            <el-link type="primary" @click="handleViewContent(row.filename)">
              {{ row.filename }}
            </el-link>
          </template>
        </el-table-column>

        <el-table-column prop="description" label="描述" min-width="250" />

        <el-table-column label="执行时间" width="170">
          <template #default="{ row }">
            {{ formatDate(row.executedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              size="small"
              :loading="executingFile === row.filename"
              @click="handleExecute(row.filename)"
            >
              执行
            </el-button>
            <el-button size="small" @click="handleViewContent(row.filename)"> 查看 </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 脚本内容弹窗 -->
    <el-dialog
      v-model="showContentDialog"
      :title="`脚本内容 - ${currentFilename}`"
      width="80%"
      destroy-on-close
    >
      <el-input
        v-model="currentContent"
        type="textarea"
        :rows="20"
        readonly
        class="content-textarea"
      />
      <template #footer>
        <el-button @click="showContentDialog = false">关闭</el-button>
        <el-button
          type="primary"
          :disabled="migrations.find(m => m.filename === currentFilename)?.status === 'success'"
          @click="handleExecute(currentFilename)"
        >
          执行此脚本
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.migration-manage {
  padding: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 36px;
  padding: 12px;
  border-radius: 12px;

  &.total {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  &.success {
    background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
    color: white;
  }

  &.pending {
    background: linear-gradient(135deg, #e6a23c 0%, #f78989 100%);
    color: white;
  }

  &.last {
    background: linear-gradient(135deg, #909399 0%, #c0c4cc 100%);
    color: white;
  }
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.action-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .actions {
    display: flex;
    gap: 8px;
  }
}

.content-textarea {
  :deep(.el-textarea__inner) {
    font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.5;
  }
}
</style>
