<template>
  <el-card class="result-card">
    <template #header>
      <div class="result-header">
        <span>排产结果</span>
        <el-button type="primary" link @click="exportResults" :disabled="!result">
          导出CSV
        </el-button>
      </div>
    </template>

    <!-- 结果统计 -->
    <div class="result-stats" v-if="result">
      <el-tag type="success">成功: {{ successCount }}</el-tag>
      <el-tag type="danger">失败: {{ failedCount }}</el-tag>
      <el-tag type="info">总计: {{ result.results?.length || 0 }}</el-tag>
    </div>

    <!-- 结果Tab -->
    <el-tabs v-model="activeTab" v-if="result">
      <el-tab-pane label="全部" name="all">
        <el-table :data="result.results" max-height="300" size="small">
          <el-table-column prop="containerNumber" label="柜号" width="120" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                {{ row.success ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="plannedData" label="计划日期">
            <template #default="{ row }">
              <div v-if="row.plannedData" class="planned-dates">
                <span v-if="row.plannedData.plannedPickupDate"
                  >提柜: {{ row.plannedData.plannedPickupDate }}</span
                >
                <span v-if="row.plannedData.plannedDeliveryDate"
                  >送仓: {{ row.plannedData.plannedDeliveryDate }}</span
                >
                <span v-if="row.plannedData.plannedUnloadDate"
                  >卸柜: {{ row.plannedData.plannedUnloadDate }}</span
                >
                <span v-if="row.plannedData.plannedReturnDate"
                  >还箱: {{ row.plannedData.plannedReturnDate }}</span
                >
              </div>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="message" label="消息" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="成功" name="success" v-if="successCount > 0">
        <el-table :data="successResults" max-height="300" size="small">
          <el-table-column prop="containerNumber" label="柜号" width="120" />
          <el-table-column prop="plannedData" label="计划日期">
            <template #default="{ row }">
              <div v-if="row.plannedData" class="planned-dates">
                <span v-if="row.plannedData.plannedPickupDate"
                  >提柜: {{ row.plannedData.plannedPickupDate }}</span
                >
                <span v-if="row.plannedData.plannedDeliveryDate"
                  >送仓: {{ row.plannedData.plannedDeliveryDate }}</span
                >
                <span v-if="row.plannedData.plannedUnloadDate"
                  >卸柜: {{ row.plannedData.plannedUnloadDate }}</span
                >
                <span v-if="row.plannedData.plannedReturnDate"
                  >还箱: {{ row.plannedData.plannedReturnDate }}</span
                >
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="失败" name="failed" v-if="failedCount > 0">
        <el-table :data="failedResults" max-height="300" size="small">
          <el-table-column prop="containerNumber" label="柜号" width="120" />
          <el-table-column prop="message" label="失败原因" />
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 无结果提示 -->
    <el-empty v-if="!result" description="暂无排产结果" />
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'

// Props
const props = defineProps<{
  result: {
    successCount?: number
    failedCount?: number
    results?: Array<{
      containerNumber: string
      success: boolean
      message?: string
      plannedData?: Record<string, string>
    }>
  } | null
}>()

// 状态
const activeTab = ref('all')

// 计算属性
const successCount = computed(() => props.result?.successCount || 0)
const failedCount = computed(() => props.result?.failedCount || 0)

const successResults = computed(() => {
  return props.result?.results?.filter((r: any) => r.success) || []
})

const failedResults = computed(() => {
  return props.result?.results?.filter((r: any) => !r.success) || []
})

// 导出CSV
const exportResults = () => {
  if (!props.result?.results) return

  const headers = [
    '柜号',
    '状态',
    '目的港',
    '仓库',
    'ETA',
    'ATA',
    '计划提柜日',
    '计划送仓日',
    '计划还箱日',
    '消息',
  ]
  const rows = props.result.results.map((r: any) => [
    r.containerNumber,
    r.success ? '成功' : '失败',
    r.plannedData?.destinationPort || '-',
    r.plannedData?.warehouseId || '-',
    r.plannedData?.etaDestPort || '-',
    r.plannedData?.ataDestPort || '-',
    r.plannedData?.plannedPickupDate || '-',
    r.plannedData?.plannedDeliveryDate || '-',
    r.plannedData?.plannedReturnDate || '-',
    r.message || '-',
  ])

  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `排产结果_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)

  ElMessage.success('导出成功')
}
</script>

<style scoped>
.result-card {
  margin-bottom: 12px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result-stats {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.planned-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 11px;
}

.planned-dates span {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 3px;
}
</style>
