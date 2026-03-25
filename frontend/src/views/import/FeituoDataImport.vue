<script setup lang="ts">
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import { containerService } from '@/services/container'
import { feituoService } from '@/services/feituo'
import { Connection, Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, ref } from 'vue'

const activeTab = ref<'api' | 'excel'>('api')

// ==================== API 同步部分（保留原有逻辑）====================

// 日期范围（出运日期口径）
const shipmentDateRange = ref<[Date, Date]>([
  dayjs().startOf('year').toDate(),
  dayjs().endOf('day').toDate(),
])

const loading = ref(false)
const syncing = ref(false)
const containers = ref<any[]>([])
const selectedRows = ref<any[]>([])

// 同步结果
const syncResult = ref<{
  success: number
  failed: number
  errors: string[]
} | null>(null)

const hasSelection = computed(() => selectedRows.value.length > 0)
const selectedContainerNumbers = computed(() => selectedRows.value.map(r => r.containerNumber))

// 加载货柜列表
const loadContainers = async () => {
  loading.value = true
  syncResult.value = null
  try {
    const [start, end] = shipmentDateRange.value
    const res = await containerService.getContainers({
      page: 1,
      pageSize: 500,
      startDate: dayjs(start).format('YYYY-MM-DD'),
      endDate: dayjs(end).format('YYYY-MM-DD'),
    })
    containers.value = res.items ?? []
    if (containers.value.length === 0) {
      ElMessage.info('所选日期范围内暂无货柜')
    }
  } catch {
    ElMessage.error('获取货柜列表失败')
  } finally {
    loading.value = false
  }
}

// 同步选中 / 全部
const doSync = async (useSelected: boolean) => {
  const numbers = useSelected
    ? selectedContainerNumbers.value
    : containers.value.map(c => c.containerNumber)
  if (numbers.length === 0) {
    ElMessage.warning(useSelected ? '请先勾选要同步的货柜' : '请先加载货柜列表')
    return
  }
  if (numbers.length > 50) {
    ElMessage.warning('单次最多同步 50 个货柜，请缩小选择范围')
    return
  }

  await ElMessageBox.confirm(`将同步 ${numbers.length} 个货柜的飞驼数据，是否继续？`, '确认同步', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info',
  })

  syncing.value = true
  syncResult.value = null
  try {
    const res = await feituoService.syncBatch(numbers)
    if (res.success && res.data) {
      const { success, failed } = res.data
      syncResult.value = {
        success: success.length,
        failed: failed.length,
        errors: failed.map(f => `${f.containerNumber}: ${f.error}`),
      }
      if (success.length > 0) {
        ElMessage.success(
          `同步完成：成功 ${success.length} 个${failed.length > 0 ? `，失败 ${failed.length} 个` : ''}`
        )
      }
      if (failed.length > 0 && failed.some(f => f.error?.includes('Token 未配置'))) {
        ElMessage.warning(
          '飞驼 Token 未配置，请在 .env 中配置 FEITUO_CLIENT_ID、FEITUO_CLIENT_SECRET 或 FEITUO_ACCESS_TOKEN'
        )
      }
      if (success.length > 0) {
        loadContainers()
      }
    } else {
      ElMessage.error(res.message || '同步失败')
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error(msg)
    if (String(msg).includes('Token 未配置')) {
      syncResult.value = {
        success: 0,
        failed: numbers.length,
        errors: [`飞驼 Token 未配置。前期可继续使用 Excel 导入。`],
      }
    }
  } finally {
    syncing.value = false
  }
}

const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// ==================== Excel 导入部分 ====================
import * as XLSX from 'xlsx'

const fileInputRef = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const importResult = ref<{
  success: number
  failed: number
  errors: { row: number; error: string }[]
} | null>(null)

/**
 * 触发文件选择
 */
function handleImportExcel() {
  fileInputRef.value?.click()
}

/**
 * 文件选择后处理
 */
async function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  importing.value = true
  importResult.value = null

  try {
    // 读取 Excel 文件
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)

    // 获取第一个sheet
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // 转换为 JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]

    if (jsonData.length < 2) {
      ElMessage.error('Excel 文件内容为空或格式不正确')
      return
    }

    // 第一行是表头
    const headers = jsonData[0] as string[]
    const rows = jsonData.slice(1) as unknown[][]

    console.log('[FeituoDataImport] 解析 Excel:', { headers: headers.length, rows: rows.length })

    // 调用后端导入
    const result = await feituoService.importFeituoExcel(
      1, // 表一类型
      rows,
      file.name,
      headers
    )

    if (result.success) {
      importResult.value = result.data || { success: 0, failed: 0, errors: [] }
      ElMessage.success(
        `导入完成：成功 ${importResult.value.success} 条，失败 ${importResult.value.failed} 条`
      )
      loadContainers()
    } else {
      ElMessage.error(result.message || '导入失败')
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[FeituoDataImport] 导入失败:', msg)
    ElMessage.error('导入失败: ' + msg)
  } finally {
    importing.value = false
    // 清空文件输入
    target.value = ''
  }
}
</script>

<template>
  <div class="feituo-import-page">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><Connection /></el-icon>
            飞驼数据导入
          </span>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="feituo-tabs">
        <!-- ==================== API 同步 Tab（保留原有逻辑）==================== -->
        <el-tab-pane label="API 同步" name="api">
          <el-alert type="info" :closable="false" show-icon class="info-alert">
            <template #title>飞驼数据接入说明</template>
            <p>
              <strong>API 同步</strong>：从飞驼拉取实时状态事件。需配置
              FEITUO_CLIENT_ID、FEITUO_CLIENT_SECRET 或 FEITUO_ACCESS_TOKEN。
            </p>
          </el-alert>

          <div class="filter-section">
            <DateRangePicker v-model="shipmentDateRange" label="按出运时间筛选" />
            <el-button type="primary" :icon="Refresh" :loading="loading" @click="loadContainers">
              {{ loading ? '加载中...' : '加载货柜' }}
            </el-button>
          </div>

          <div class="table-section">
            <div class="table-toolbar">
              <span class="table-info">
                共 {{ containers.length }} 个货柜
                <template v-if="hasSelection">，已选 {{ selectedRows.length }} 个</template>
              </span>
              <div class="toolbar-actions">
                <el-button
                  type="success"
                  :icon="Connection"
                  :loading="syncing"
                  :disabled="!hasSelection || syncing"
                  @click="doSync(true)"
                >
                  {{ syncing ? '同步中...' : '同步选中' }}
                </el-button>
                <el-button
                  type="success"
                  :icon="Connection"
                  :loading="syncing"
                  :disabled="containers.length === 0 || syncing"
                  @click="doSync(false)"
                >
                  {{ syncing ? '同步中...' : '同步全部' }}
                </el-button>
              </div>
            </div>

            <el-table
              v-loading="loading"
              :data="containers"
              stripe
              border
              max-height="420"
              @selection-change="handleSelectionChange"
            >
              <el-table-column type="selection" width="48" />
              <el-table-column prop="containerNumber" label="集装箱号" min-width="130" />
              <el-table-column prop="billOfLadingNumber" label="提单号" min-width="120" />
              <el-table-column prop="containerTypeCode" label="柜型" width="80" />
              <el-table-column prop="logisticsStatus" label="物流状态" width="100">
                <template #default="{ row }">
                  <el-tag size="small" type="info">{{ row.logisticsStatus || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="actualShipDate" label="出运日期" width="110">
                <template #default="{ row }">
                  {{ row.actualShipDate ? dayjs(row.actualShipDate).format('YYYY-MM-DD') : '-' }}
                </template>
              </el-table-column>
            </el-table>

            <!-- 同步结果 -->
            <div v-if="syncResult" class="sync-result">
              <el-alert
                :title="`同步完成：成功 ${syncResult.success} 个，失败 ${syncResult.failed} 个`"
                :type="syncResult.failed > 0 ? 'warning' : 'success'"
                :closable="false"
                show-icon
              />
              <div v-if="syncResult.errors.length > 0" class="error-list">
                <el-collapse>
                  <el-collapse-item title="错误详情" name="errors">
                    <ul>
                      <li
                        v-for="(error, index) in syncResult.errors"
                        :key="index"
                        class="error-item"
                      >
                        {{ error }}
                      </li>
                    </ul>
                  </el-collapse-item>
                </el-collapse>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- ==================== Excel 导入 Tab ==================== -->
        <el-tab-pane label="Excel 导入" name="excel">
          <el-card class="import-card">
            <template #header>
              <div class="card-header">
                <span>飞驼 Excel 导入</span>
                <el-button type="primary" @click="handleImportExcel" :loading="importing">
                  选择文件导入
                </el-button>
                <input
                  ref="fileInputRef"
                  type="file"
                  accept=".xlsx,.xls"
                  style="display: none"
                  @change="onFileSelected"
                />
              </div>
            </template>

            <div v-if="importResult" class="result-summary">
              <el-alert
                :type="importResult.failed > 0 ? 'warning' : 'success'"
                :title="`导入完成：成功 ${importResult.success} 条，失败 ${importResult.failed} 条`"
                :closable="false"
                show-icon
              />
              <div v-if="importResult.errors?.length" class="error-list">
                <el-divider>错误详情</el-divider>
                <el-scrollbar max-height="300px">
                  <div
                    v-for="(err, idx) in importResult.errors.slice(0, 20)"
                    :key="idx"
                    class="error-item"
                  >
                    行 {{ err.row }}: {{ err.error }}
                  </div>
                  <div v-if="importResult.errors.length > 20" class="more-errors">
                    ... 还有 {{ importResult.errors.length - 20 }} 条错误
                  </div>
                </el-scrollbar>
              </div>
            </div>

            <div class="import-tips">
              <el-alert type="info" :closable="false">
                <template #title>
                  <div>导入说明</div>
                </template>
                <ul>
                  <li>支持 .xlsx 和 .xls 格式的飞驼导出数据</li>
                  <li>表一：物流详情表，包含完整物流路径信息</li>
                  <li>表二：费用信息表，包含滞港费等费用数据</li>
                  <li>系统将自动识别表类型并分批导入</li>
                </ul>
              </el-alert>
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.feituo-import-page {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 100px);
}

.main-card {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .title {
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.feituo-tabs {
  margin-top: 20px;
}

.info-alert {
  margin-bottom: 20px;
}

.filter-section {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
}

.table-section {
  .table-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .table-info {
      font-size: 14px;
      color: $text-regular;
    }

    .toolbar-actions {
      display: flex;
      gap: 12px;
    }
  }
}

.sync-result {
  margin-top: 20px;

  .error-list {
    margin-top: 12px;

    .error-item {
      padding: 8px 12px;
      background: #fef0f0;
      color: $danger-color;
      border-radius: 4px;
      margin-bottom: 8px;
      list-style: none;
    }
  }
}
</style>
