<template>
  <div class="alert-tab">
    <div class="tab-header-row">
      <el-button type="primary" link size="small" @click="loadAlerts">
        刷新
      </el-button>
      <el-button
        type="primary"
        link
        size="small"
        :loading="runCheckLoading"
        @click="runContainerCheck"
      >
        重新检查预警
      </el-button>
    </div>
    <el-table
      v-loading="loading"
      :data="alerts"
      style="width: 100%"
      stripe
    >
      <el-table-column prop="id" label="预警ID" width="100" />
      <el-table-column prop="type" label="预警类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getAlertTypeTagType(row.type)">
            {{ formatAlertTypeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="level" label="预警等级" width="100">
        <template #default="{ row }">
          <el-tag :type="getAlertLevelTagType(row.level)">
            {{ formatAlertLevelLabel(row.level) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="预警信息" min-width="200" show-overflow-tooltip />
      <el-table-column prop="createdAt" label="创建时间" width="168">
        <template #default="{ row }">
          {{ formatDateTime(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="resolved" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.resolved ? 'success' : 'warning'">
            {{ row.resolved ? '已解决' : '未解决' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="!row.resolved"
            type="primary"
            size="small"
            @click="handleAcknowledge(row.id)"
          >
            确认
          </el-button>
          <el-button
            v-if="!row.resolved"
            type="success"
            size="small"
            @click="handleResolve(row.id)"
          >
            解决
          </el-button>
          <span v-else>已处理</span>
        </template>
      </el-table-column>
    </el-table>
    <div v-if="alerts.length === 0 && !loading" class="empty-alerts">
      <el-empty description="暂无预警信息" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import dayjs from 'dayjs'
import { alertApi } from '@/services/alert'
import { ElMessage } from 'element-plus'

interface Props {
  containerNumber: string
}

const props = defineProps<Props>()

const loading = ref(false)
const runCheckLoading = ref(false)
const alerts = ref<any[]>([])

/** 后端 GET 直接返回数组；兼容 { success, data } */
function normalizeAlertList(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const d = (payload as { data?: unknown }).data
    return Array.isArray(d) ? d : []
  }
  return []
}

const loadAlerts = async () => {
  if (!props.containerNumber?.trim()) return

  loading.value = true
  try {
    const response = await alertApi.getContainerAlerts(props.containerNumber)
    if (Array.isArray(response)) {
      alerts.value = response
      return
    }
    const r = response as { success?: boolean; data?: unknown } | null
    if (r && typeof r === 'object' && 'success' in r && r.success === false) {
      ElMessage.error('获取预警信息失败')
      alerts.value = []
      return
    }
    alerts.value = normalizeAlertList(response)
  } catch {
    ElMessage.error('获取预警信息失败')
    alerts.value = []
  } finally {
    loading.value = false
  }
}

const runContainerCheck = async () => {
  if (!props.containerNumber?.trim()) return
  runCheckLoading.value = true
  try {
    const res = await alertApi.runCheckContainer(props.containerNumber) as {
      success?: boolean
      count?: number
      message?: string
    }
    if (res?.success === false) {
      ElMessage.error(res?.message || '检查失败')
      return
    }
    ElMessage.success(`已更新预警（${res?.count ?? 0} 条）`)
    await loadAlerts()
  } catch {
    ElMessage.error('检查预警失败')
  } finally {
    runCheckLoading.value = false
  }
}

const handleAcknowledge = async (alertId: number) => {
  try {
    const response = await alertApi.acknowledgeAlert(alertId, 'system') as { success?: boolean }
    if (response?.success) {
      ElMessage.success('预警已确认')
      await loadAlerts()
    } else {
      ElMessage.error('确认预警失败')
    }
  } catch {
    ElMessage.error('确认预警失败')
  }
}

const handleResolve = async (alertId: number) => {
  try {
    const response = await alertApi.resolveAlert(alertId, 'system') as { success?: boolean }
    if (response?.success) {
      ElMessage.success('预警已解决')
      await loadAlerts()
    } else {
      ElMessage.error('解决预警失败')
    }
  } catch {
    ElMessage.error('解决预警失败')
  }
}

/** ext_container_alerts.type 枚举（小写） */
const getAlertTypeTagType = (type: string): string => {
  const typeMap: Record<string, string> = {
    customs: 'primary',
    trucking: 'warning',
    unloading: 'success',
    emptyReturn: 'info',
    inspection: 'danger',
    demurrage: 'warning',
    detention: 'warning',
    rollover: 'danger',
    shipmentChange: 'warning',
    other: 'info'
  }
  return typeMap[type] || 'info'
}

const formatAlertTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    customs: '清关',
    trucking: '拖卡',
    unloading: '卸柜',
    emptyReturn: '还箱',
    inspection: '查验',
    demurrage: '滞港',
    detention: '滞箱',
    rollover: '甩柜',
    shipmentChange: '船期变更',
    other: '其他'
  }
  return labels[type] || type || '—'
}

/** ext_container_alerts.level：info | warning | critical */
const getAlertLevelTagType = (level: string): string => {
  const levelMap: Record<string, string> = {
    critical: 'danger',
    warning: 'warning',
    info: 'info'
  }
  return levelMap[level?.toLowerCase?.()] || 'info'
}

const formatAlertLevelLabel = (level: string): string => {
  const labels: Record<string, string> = {
    info: '提示',
    warning: '警告',
    critical: '严重'
  }
  return labels[level?.toLowerCase?.()] || level || '—'
}

const formatDateTime = (v: string | Date | undefined): string => {
  if (!v) return '—'
  return dayjs(v).format('YYYY-MM-DD HH:mm')
}

watch(
  () => props.containerNumber,
  (cn, prev) => {
    if (cn && cn !== prev) loadAlerts()
  }
)

onMounted(() => {
  loadAlerts()
})
</script>

<style scoped lang="scss">
.alert-tab {
  .tab-header-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .empty-alerts {
    padding: 40px 0;
    text-align: center;
  }
}
</style>