<script setup lang="ts">
import { ref, watch } from 'vue'
import { auditService, type DataChangeLog } from '@/services/audit'
import { ElMessage } from 'element-plus'
import { Refresh, Loading } from '@element-plus/icons-vue'

const props = defineProps<{
  containerNumber: string
}>()

const loading = ref(false)
const logs = ref<DataChangeLog[]>([])
const error = ref<string | null>(null)

const SOURCE_LABELS: Record<string, string> = {
  excel_import: 'Excel导入',
  feituo_api: '飞驼API',
  feituo_excel: '飞驼Excel',
  manual: '手工维护',
  status_update: '状态更新'
}

const ACTION_LABELS: Record<string, string> = {
  INSERT: '新增',
  UPDATE: '更新',
  DELETE: '删除'
}

const loadLogs = async () => {
  if (!props.containerNumber?.trim()) return
  loading.value = true
  error.value = null
  try {
    const res = await auditService.getChangesByContainer(props.containerNumber)
    if (res.success && Array.isArray(res.data)) {
      logs.value = res.data
    } else {
      logs.value = []
      error.value = (res as any).message || '获取变更日志失败'
    }
  } catch (e: any) {
    logs.value = []
    const msg = e?.response?.data?.message || e?.message || '获取变更日志失败'
    error.value = msg
    if (e?.response?.status === 404 || e?.response?.status >= 500) {
      ElMessage.error(msg)
    }
  } finally {
    loading.value = false
  }
}

watch(() => props.containerNumber, loadLogs, { immediate: true })

defineExpose({ load: loadLogs })

function formatChangedFields(fields: Record<string, { old?: unknown; new?: unknown }> | null): string {
  if (!fields || typeof fields !== 'object') return '—'
  const parts: string[] = []
  for (const [k, v] of Object.entries(fields)) {
    const oldVal = v?.old != null ? String(v.old) : ''
    const newVal = v?.new != null ? String(v.new) : ''
    if (oldVal || newVal) {
      parts.push(`${k}: ${oldVal || '—'} → ${newVal || '—'}`)
    }
  }
  return parts.length ? parts.join('；') : '—'
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="change-log-tab">
    <div class="tab-header-row">
      <el-button type="primary" link size="small" :loading="loading" @click="loadLogs">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <div v-if="loading" class="tab-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载变更日志中...</span>
    </div>

    <div v-else-if="error" class="tab-error">
      <el-alert type="warning" :title="error" show-icon />
    </div>

    <div v-else-if="!logs.length" class="tab-empty">
      <el-empty description="暂无变更记录" />
    </div>

    <div v-else class="tab-content">
      <el-table :data="logs" stripe size="small" max-height="400">
        <el-table-column prop="createdAt" label="时间" width="170">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="sourceType" label="来源" width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info">
              {{ SOURCE_LABELS[row.sourceType] || row.sourceType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="80">
          <template #default="{ row }">
            {{ ACTION_LABELS[row.action] || row.action }}
          </template>
        </el-table-column>
        <el-table-column prop="entityType" label="实体" width="140" show-overflow-tooltip />
        <el-table-column label="变更内容" min-width="200">
          <template #default="{ row }">
            <span class="changed-fields-text">{{ formatChangedFields(row.changedFields) }}</span>
            <span v-if="row.remark" class="remark-text">（{{ row.remark }}）</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.change-log-tab {
  .tab-header-row {
    margin-bottom: $spacing-sm;
  }

  .tab-loading,
  .tab-error,
  .tab-empty {
    padding: $spacing-xl;
    text-align: center;
    color: var(--el-text-color-secondary);

    .el-icon {
      margin-right: $spacing-xs;
    }
  }

  .tab-content {
    .changed-fields-text {
      font-size: 12px;
      word-break: break-all;
    }

    .remark-text {
      font-size: 11px;
      color: var(--el-text-color-secondary);
    }
  }
}
</style>
