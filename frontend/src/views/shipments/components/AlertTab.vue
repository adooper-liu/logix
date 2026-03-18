<template>
  <div class="alert-tab">
    <div class="tab-header-row">
      <el-button type="primary" link size="small" @click="loadAlerts">
        刷新
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
            {{ row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="level" label="预警等级" width="100">
        <template #default="{ row }">
          <el-tag :type="getAlertLevelTagType(row.level)">
            {{ row.level }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="预警信息" />
      <el-table-column prop="createdAt" label="创建时间" width="180" />
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
import { ref, onMounted } from 'vue'
import { alertApi } from '@/services/alert'
import { ElMessage } from 'element-plus'

interface Props {
  containerNumber: string
}

const props = defineProps<Props>()

const loading = ref(false)
const alerts = ref<any[]>([])

const loadAlerts = async () => {
  if (!props.containerNumber) return
  
  loading.value = true
  try {
    const response = await alertApi.getContainerAlerts(props.containerNumber)
    if (response.success) {
      alerts.value = response.data || []
    } else {
      ElMessage.error('获取预警信息失败')
    }
  } catch (error) {
    console.error('Failed to load alerts:', error)
    ElMessage.error('获取预警信息失败')
  } finally {
    loading.value = false
  }
}

const handleAcknowledge = async (alertId: number) => {
  try {
    const response = await alertApi.acknowledgeAlert(alertId, 'system')
    if (response.success) {
      ElMessage.success('预警已确认')
      await loadAlerts()
    } else {
      ElMessage.error('确认预警失败')
    }
  } catch (error) {
    console.error('Failed to acknowledge alert:', error)
    ElMessage.error('确认预警失败')
  }
}

const handleResolve = async (alertId: number) => {
  try {
    const response = await alertApi.resolveAlert(alertId, 'system')
    if (response.success) {
      ElMessage.success('预警已解决')
      await loadAlerts()
    } else {
      ElMessage.error('解决预警失败')
    }
  } catch (error) {
    console.error('Failed to resolve alert:', error)
    ElMessage.error('解决预警失败')
  }
}

const getAlertTypeTagType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'DELAY': 'warning',
    'RISK': 'danger',
    'INFO': 'info',
    'EXCEPTION': 'danger'
  }
  return typeMap[type] || 'info'
}

const getAlertLevelTagType = (level: string): string => {
  const levelMap: Record<string, string> = {
    'HIGH': 'danger',
    'MEDIUM': 'warning',
    'LOW': 'info'
  }
  return levelMap[level] || 'info'
}

onMounted(() => {
  loadAlerts()
})
</script>

<style scoped>
.alert-tab {
  .empty-alerts {
    padding: 40px 0;
    text-align: center;
  }
}
</style>