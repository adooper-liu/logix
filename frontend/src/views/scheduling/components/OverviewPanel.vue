<template>
  <div class="overview-panel">
    <el-row :gutter="12">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card" @click="emit('navigate', 'warehouse')">
          <div class="stat-content">
            <el-icon class="stat-icon warehouse"><Box /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ overview.warehouses?.length || 0 }}</div>
              <div class="stat-label">仓库数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card" @click="emit('navigate', 'trucking')">
          <div class="stat-content">
            <el-icon class="stat-icon trucking"><Van /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ overview.truckings?.length || 0 }}</div>
              <div class="stat-label">车队数量</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card" @click="emit('navigate', 'mapping')">
          <div class="stat-content">
            <el-icon class="stat-icon mapping"><Connection /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ mappingCount }}</div>
              <div class="stat-label">映射关系</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card" @click="handleScheduleClick">
          <div class="stat-content">
            <el-icon class="stat-icon pending"><Clock /></el-icon>
            <div class="stat-info">
              <div class="stat-value">{{ overview.pendingCount || 0 }}</div>
              <div class="stat-label">待排产</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 仓库列表 -->
    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>仓库列表</span>
          <el-button type="primary" size="small" @click="emit('navigate', 'warehouse')"
            >管理</el-button
          >
        </div>
      </template>
      <el-table :data="overview.warehouses?.slice(0, 5)" size="small">
        <el-table-column prop="code" label="编码" width="100" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="country" label="国家" width="80" />
        <el-table-column prop="dailyCapacity" label="日产能" width="80" />
        <el-table-column prop="transportFee" label="拖卡费" width="80">
          <template #default="{ row }">
            {{ row.transportFee ? `$${row.transportFee}` : '-' }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 车队列表 -->
    <el-card class="list-card">
      <template #header>
        <div class="card-header">
          <span>车队列表</span>
          <el-button type="primary" size="small" @click="emit('navigate', 'trucking')"
            >管理</el-button
          >
        </div>
      </template>
      <el-table :data="overview.truckings?.slice(0, 5)" size="small">
        <el-table-column prop="code" label="编码" width="100" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="country" label="国家" width="80" />
        <el-table-column prop="dailyCapacity" label="日产能" width="80" />
        <el-table-column label="堆场" width="60">
          <template #default="{ row }">
            <el-tag v-if="row.hasYard" type="success" size="small">有</el-tag>
            <el-tag v-else type="info" size="small">无</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/store/app'
import { Box, Clock, Connection, Van } from '@element-plus/icons-vue'
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  country?: string
}>()

const emit = defineEmits<{
  (e: 'navigate', target: string): void
  (e: 'go-to-schedule'): void
}>()

const appStore = useAppStore()
const resolvedCountry = computed(() => props.country || appStore.scopedCountryCode || '')

const overview = ref<any>({
  warehouses: [],
  truckings: [],
  pendingCount: 0,
})

const mappingCount = ref(0)

const loadOverview = async () => {
  try {
    const query = resolvedCountry.value
      ? `?country=${encodeURIComponent(resolvedCountry.value)}`
      : ''
    const response = await fetch(`/api/v1/scheduling/overview${query}`)
    const data = await response.json()
    if (data.success) {
      overview.value = data.data
    }
  } catch (error) {
    console.error('加载概览失败:', error)
  }
}

const loadMappingCount = async () => {
  try {
    const query = resolvedCountry.value
      ? `?country=${encodeURIComponent(resolvedCountry.value)}`
      : ''
    const response = await fetch(`/api/v1/warehouse-trucking-mapping${query}`)
    const data = await response.json()
    if (data.success) {
      mappingCount.value = Number(data.total ?? data.data?.length ?? 0)
    }
  } catch (error) {
    console.error('加载映射数量失败:', error)
  }
}

const reloadOverviewData = () => {
  loadOverview()
  loadMappingCount()
}

const handleScheduleClick = () => {
  // 点击"待排产"时，跳转到独立的排产可视化页面
  emit('go-to-schedule')
}

onMounted(() => {
  reloadOverviewData()
})

watch(
  () => resolvedCountry.value,
  () => {
    reloadOverviewData()
  }
)
</script>

<style scoped>
.overview-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 32px;
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-icon.warehouse {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.stat-icon.trucking {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
.stat-icon.mapping {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}
.stat-icon.pending {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.list-card {
  margin-top: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
