<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Connection, Upload, Warning, Loading } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import { containerService } from '@/services/container'
import { feituoService } from '@/services/feituo'
import DateRangePicker from '@/components/common/DateRangePicker.vue'

const activeTab = ref<'api' | 'excel'>('api')

// 日期范围（出运日期口径）
const shipmentDateRange = ref<[Date, Date]>([
  dayjs().startOf('year').toDate(),
  dayjs().endOf('day').toDate()
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
const selectedContainerNumbers = computed(() =>
  selectedRows.value.map((r) => r.containerNumber)
)

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
      endDate: dayjs(end).format('YYYY-MM-DD')
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
  const numbers = useSelected ? selectedContainerNumbers.value : containers.value.map((c) => c.containerNumber)
  if (numbers.length === 0) {
    ElMessage.warning(useSelected ? '请先勾选要同步的货柜' : '请先加载货柜列表')
    return
  }
  if (numbers.length > 50) {
    ElMessage.warning('单次最多同步 50 个货柜，请缩小选择范围')
    return
  }

  await ElMessageBox.confirm(
    `将同步 ${numbers.length} 个货柜的飞驼数据，是否继续？`,
    '确认同步',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    }
  )

  syncing.value = true
  syncResult.value = null
  try {
    const res = await feituoService.syncBatch(numbers)
    if (res.success && res.data) {
      const { success, failed } = res.data
      syncResult.value = {
        success: success.length,
        failed: failed.length,
        errors: failed.map((f) => `${f.containerNumber}: ${f.error}`)
      }
      if (success.length > 0) {
        ElMessage.success(`同步完成：成功 ${success.length} 个${failed.length > 0 ? `，失败 ${failed.length} 个` : ''}`)
      }
      if (failed.length > 0 && failed.some((f) => f.error?.includes('Token 未配置'))) {
        ElMessage.warning('飞驼 Token 未配置，请在 .env 中配置 FEITUO_CLIENT_ID、FEITUO_CLIENT_SECRET 或 FEITUO_ACCESS_TOKEN')
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
        errors: [`飞驼 Token 未配置。前期可继续使用 Excel 导入。`]
      }
    }
  } finally {
    syncing.value = false
  }
}

const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// ========== 飞驼 Excel 导入 ==========
const excelFile = ref<File | null>(null)
const excelLoading = ref(false)
const excelUploading = ref(false)
const excelPreview = ref<Record<string, unknown>[]>([])
const excelColumns = ref<string[]>([])
const excelTableType = ref<1 | 2>(1)
const excelImportResult = ref<{ success: number; failed: number; errors: string[] } | null>(null)
/** 导入请求级错误（如 500、网络错误），用于清晰提示 */
const excelImportError = ref<{ message: string; hint: string } | null>(null)
/** 原始行数组，用于按分组导入（保留列序，避免同名字段错位） */
const excelRawRows = ref<unknown[][]>([])

/** 根据错误信息返回用户可理解的提示 */
function getImportErrorHint(msg: string): string {
  if (!msg) return '请查看后端日志或联系管理员'
  const m = msg.toLowerCase()
  if (m.includes('relation') && m.includes('does not exist')) {
    return '数据库表未创建。请执行：psql -f backend/migrations/add_feituo_import_tables.sql'
  }
  if (m.includes('raw_data_by_group') && (m.includes('does not exist') || m.includes('column'))) {
    return '缺少 raw_data_by_group 列。请执行：psql -f backend/migrations/add_feituo_raw_data_by_group.sql'
  }
  if (m.includes('缺少集装箱号')) {
    return 'Excel 表头需包含「集装箱号」或「container_number」列'
  }
  if (m.includes('network') || m.includes('failed to fetch') || m.includes('timeout')) {
    return '请确认后端服务已启动（localhost:3001）'
  }
  if (m.includes('500') || m.includes('internal server error')) {
    return '后端处理异常，请查看后端终端日志获取具体错误'
  }
  return '请根据上述错误信息检查 Excel 格式或数据库配置'
}

const detectTableType = (cols: string[]): 1 | 2 => {
  const hasMbl = cols.some(c => c.includes('MBL Number') || c === 'MBL Number')
  const hasBill = cols.some(c => c === '提单号')
  const hasPortCode = cols.some(c => c === '港口代码')
  if (hasBill && hasPortCode) return 2
  return hasMbl ? 1 : 2
}

const handleExcelFile = (file?: File | null) => {
  excelFile.value = file ?? null
  excelPreview.value = []
  excelRawRows.value = []
  excelImportResult.value = null
  excelImportError.value = null
}

const handleExcelRemove = () => {
  excelFile.value = null
  excelPreview.value = []
  excelRawRows.value = []
  excelImportResult.value = null
  excelImportError.value = null
}

const parseExcel = async () => {
  if (!excelFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }
  excelLoading.value = true
  excelPreview.value = []
  excelImportError.value = null
  try {
    const buf = await excelFile.value.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: '' })
    if (data.length < 2) {
      ElMessage.warning('Excel 至少需要表头与一行数据')
      return
    }
    const headers = (data[0] as unknown[])?.map(h => String(h || '').trim()).filter(Boolean) as string[]
    excelTableType.value = detectTableType(headers)
    const rows: Record<string, unknown>[] = []
    const rawRows: unknown[][] = []
    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[]
      const obj: Record<string, unknown> = {}
      headers.forEach((h, j) => {
        const v = row[j]
        if (v !== undefined && v !== null && v !== '') obj[h] = v
      })
      if (Object.keys(obj).length > 0) {
        rows.push(obj)
        rawRows.push(row)
      }
    }
    excelColumns.value = headers
    excelPreview.value = rows
    excelRawRows.value = rawRows
    ElMessage.success(`解析完成：${rows.length} 行，已自动识别为表${excelTableType.value}格式，可手动调整`)
  } catch (e) {
    ElMessage.error('解析失败：' + (e instanceof Error ? e.message : String(e)))
  } finally {
    excelLoading.value = false
  }
}

const doExcelImport = async () => {
  if (excelPreview.value.length === 0) {
    ElMessage.warning('请先解析 Excel')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确定导入 ${excelPreview.value.length} 条飞驼数据（表${excelTableType.value}格式）？`,
      '确认导入',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
  } catch {
    return
  }
  excelUploading.value = true
  excelImportResult.value = null
  excelImportError.value = null
  try {
    const res = await feituoService.importFeituoExcel(
      excelTableType.value,
      excelRawRows.value,
      excelFile.value?.name,
      excelColumns.value
    )
    if (res.success && res.data) {
      excelImportResult.value = {
        success: res.data.success,
        failed: res.data.failed,
        errors: res.data.errors.map(e => `第 ${e.row} 行: ${e.error}`)
      }
      if (res.data.failed > 0) {
        ElMessage.warning(`导入完成：成功 ${res.data.success} 条，失败 ${res.data.failed} 条，请查看下方错误明细`)
      } else {
        ElMessage.success(`导入完成：成功 ${res.data.success} 条`)
      }
    } else {
      const msg = res.message || '导入失败'
      excelImportError.value = { message: msg, hint: getImportErrorHint(msg) }
      ElMessage.error(msg)
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string }; status?: number }; message?: string }
    let msg = err.response?.data?.message || err.message || String(e)
    if (msg === 'Request failed with status code 500' || (err.response?.status === 500 && !err.response?.data?.message)) {
      msg = '服务器内部错误 (500)，请查看后端终端日志获取具体原因'
    }
    const hint = getImportErrorHint(msg)
    excelImportError.value = { message: msg, hint }
    ElMessage.error(msg)
  } finally {
    excelUploading.value = false
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
        <el-tab-pane label="API 同步" name="api">
          <el-alert type="info" :closable="false" show-icon class="info-alert">
            <template #title>飞驼数据接入说明</template>
            <p>
              <strong>API 同步</strong>：从飞驼拉取实时状态事件。需配置 FEITUO_CLIENT_ID、FEITUO_CLIENT_SECRET 或 FEITUO_ACCESS_TOKEN。
            </p>
          </el-alert>

          <div class="filter-section">
        <DateRangePicker v-model="shipmentDateRange" label="按出运时间筛选" />
        <el-button
          type="primary"
          :icon="Refresh"
          :loading="loading"
          @click="loadContainers"
        >
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
          <el-table-column prop="ataDestPort" label="目的港到港" width="110">
            <template #default="{ row }">
              {{ row.ataDestPort ? dayjs(row.ataDestPort).format('YYYY-MM-DD') : '-' }}
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-collapse v-if="syncResult" class="sync-result">
        <el-collapse-item name="result">
          <template #title>
            <span class="result-title">
              <el-icon v-if="syncResult.failed > 0"><Warning /></el-icon>
              同步结果：成功 {{ syncResult.success }}，失败 {{ syncResult.failed }}
            </span>
          </template>
          <div v-if="syncResult.errors.length > 0" class="result-errors">
            <div v-for="(err, i) in syncResult.errors.slice(0, 20)" :key="i" class="error-item">{{ err }}</div>
            <div v-if="syncResult.errors.length > 20" class="error-more">还有 {{ syncResult.errors.length - 20 }} 条错误...</div>
          </div>
        </el-collapse-item>
      </el-collapse>
        </el-tab-pane>

        <el-tab-pane label="飞驼 Excel 导入" name="excel">
          <el-alert type="info" :closable="false" show-icon class="info-alert">
            <template #title>飞驼 Excel 格式说明</template>
            <p><strong>表一</strong>：船公司订阅维度（MBL Number + 集装箱号），十五组字段。</p>
            <p><strong>表二</strong>：码头港区维度（提单号 + 港口代码 + 码头代码），十七组字段，含卸船、提箱、免费期等。</p>
            <p class="warning-tip">
              <strong>请务必选择正确格式</strong>：选错会导致字段错位、免费期/卸船/提箱等关键数据丢失或写入错误。
            </p>
          </el-alert>

          <div v-if="excelPreview.length > 0" class="excel-format-select">
            <span class="select-label">Excel 格式：</span>
            <el-radio-group v-model="excelTableType" size="default">
              <el-radio-button :value="1">表一（船公司订阅）</el-radio-button>
              <el-radio-button :value="2">表二（码头港区）</el-radio-button>
            </el-radio-group>
          </div>

          <div class="excel-upload-section">
            <el-upload
              class="excel-upload"
              drag
              :auto-upload="false"
              :on-change="(f: { raw?: File }) => handleExcelFile(f?.raw)"
              :on-remove="handleExcelRemove"
              accept=".xlsx,.xls"
              :limit="1"
            >
              <el-icon class="upload-icon"><Upload /></el-icon>
              <div class="upload-text">将飞驼 Excel 拖到此处，或<em>点击上传</em></div>
            </el-upload>
            <div class="excel-actions">
              <el-button type="primary" :loading="excelLoading" :disabled="!excelFile" @click="parseExcel">
                <el-icon v-if="excelLoading"><Loading /></el-icon>
                {{ excelLoading ? '解析中...' : '解析 Excel' }}
              </el-button>
              <el-button
                type="success"
                :loading="excelUploading"
                :disabled="excelPreview.length === 0"
                @click="doExcelImport"
              >
                <el-icon v-if="excelUploading"><Loading /></el-icon>
                {{ excelUploading ? '导入中...' : '确认导入' }}
              </el-button>
            </div>
          </div>

          <el-alert
            v-if="excelImportError"
            type="error"
            :closable="true"
            show-icon
            class="import-error-alert"
            @close="excelImportError = null"
          >
            <template #title>导入失败</template>
            <div class="error-detail">
              <div class="error-message"><strong>错误信息：</strong>{{ excelImportError.message }}</div>
              <div class="error-hint"><strong>可能原因与处理：</strong>{{ excelImportError.hint }}</div>
            </div>
          </el-alert>

          <div v-if="excelPreview.length > 0" class="excel-preview">
            <div class="preview-info">
              共 {{ excelPreview.length }} 行，当前选择<strong>表{{ excelTableType }}</strong>格式
            </div>
            <el-table :data="excelPreview.slice(0, 10)" border stripe max-height="280">
              <el-table-column
                v-for="col in excelColumns.slice(0, 8)"
                :key="col"
                :prop="col"
                :label="col"
                min-width="120"
                show-overflow-tooltip
              />
              <el-table-column v-if="excelColumns.length > 8" label="..." width="50" />
            </el-table>
          </div>

          <el-collapse v-if="excelImportResult" class="sync-result">
            <el-collapse-item name="excel-result" :default-expanded="excelImportResult.failed > 0">
              <template #title>
                <span class="result-title">
                  <el-icon v-if="excelImportResult.failed > 0"><Warning /></el-icon>
                  导入结果：成功 {{ excelImportResult.success }}，失败 {{ excelImportResult.failed }}
                </span>
              </template>
              <div v-if="excelImportResult.errors.length > 0" class="result-errors">
                <div class="errors-hint">失败行及原因：</div>
                <div v-for="(err, i) in excelImportResult.errors.slice(0, 20)" :key="i" class="error-item">{{ err }}</div>
                <div v-if="excelImportResult.errors.length > 20" class="error-more">还有 {{ excelImportResult.errors.length - 20 }} 条...</div>
                <div v-if="excelImportResult.errors.some(e => e.includes('缺少集装箱号'))" class="error-tip">
                  提示：表一需「MBL Number」「集装箱号」；表二需「提单号」「集装箱号」「港口代码」
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.feituo-import-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.main-card {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 600;
    color: $text-primary;
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }
}

.info-alert {
  margin-bottom: 20px;

  .warning-tip {
    margin-top: 10px;
    color: $warning-color;
    font-size: 13px;
  }

  p {
    margin: 6px 0 0;
    font-size: 13px;
    color: $text-regular;
    line-height: 1.5;

    &:first-of-type {
      margin-top: 0;
    }
  }
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.table-section {
  margin-top: 16px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  .table-info {
    font-size: 14px;
    color: $text-secondary;
  }

  .toolbar-actions {
    display: flex;
    gap: 8px;
  }
}

.import-error-alert {
  margin-bottom: 20px;

  .error-detail {
    font-size: 13px;
    line-height: 1.6;

    .error-message {
      margin-bottom: 8px;
      word-break: break-all;
    }

    .error-hint {
      color: $text-regular;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.04);
      border-radius: 6px;
    }
  }
}

.excel-format-select {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: rgba($primary-color, 0.06);
  border-radius: 8px;

  .select-label {
    font-weight: 500;
    color: $text-primary;
  }
}

.excel-upload-section {
  margin: 20px 0;

  .excel-upload {
    margin-bottom: 16px;
  }

  .upload-icon {
    font-size: 48px;
    color: $text-secondary;
  }

  .upload-text {
    font-size: 14px;
    color: $text-regular;

    em {
      color: $primary-color;
      font-style: normal;
    }
  }

  .excel-actions {
    display: flex;
    gap: 12px;
  }
}

.excel-preview {
  margin-top: 20px;

  .preview-info {
    margin-bottom: 12px;
    font-size: 14px;
    color: $text-secondary;
  }
}

.sync-result {
  margin-top: 20px;

  .result-title {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
  }

  .result-errors {
    padding: 12px;
    background: rgba($danger-color, 0.06);
    border-radius: 8px;
    max-height: 280px;
    overflow-y: auto;

    .errors-hint {
      font-size: 12px;
      color: $text-secondary;
      margin-bottom: 8px;
    }

    .error-tip {
      margin-top: 12px;
      padding: 8px 12px;
      background: rgba($warning-color, 0.15);
      border-radius: 6px;
      font-size: 12px;
      color: $text-regular;
    }

    .error-item {
      font-size: 13px;
      color: $text-regular;
      padding: 4px 0;
      border-bottom: 1px solid $border-lighter;

      &:last-child {
        border-bottom: none;
      }
    }

    .error-more {
      margin-top: 8px;
      font-size: 12px;
      color: $text-secondary;
    }
  }
}
</style>
