<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Document, Download, Loading } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import axios from 'axios'

// ==================== 类型定义 ====================

interface DemurrageStandardRow {
  foreign_company_code: string
  foreign_company_name?: string
  effective_date: string | null
  expiry_date: string | null
  destination_port_code: string
  destination_port_name?: string
  shipping_company_code: string
  shipping_company_name?: string
  terminal?: string
  origin_forwarder_code: string
  origin_forwarder_name?: string
  transport_mode_code?: string
  transport_mode_name?: string
  free_days_basis: string
  calculation_basis: string
  charge_type_code?: string
  charge_name?: string
  is_chargeable?: string
  sequence_number?: number
  port_condition?: string
  process_status?: string
  free_days: number
  tiers: Record<string, number>
  rate_per_day?: number
  currency?: string
}

// Excel 列名到字段的映射（支持多种写法）
// 四项匹配字段：优先取名称列，后端按名称解析为字典 code
const COLUMN_ALIASES: Record<string, string[]> = {
  foreign_company_code: ['海外公司.编码', '海外公司编码'],
  foreign_company_name: ['海外公司.名称', '海外公司名称'], // ① 进口国/海外公司
  effective_date: ['生效日期'],
  expiry_date: ['结束日期'],
  destination_port_code: ['目的港.编码', '目的港编码'],
  destination_port_name: ['目的港.名称', '目的港名称'], // ② 目的港
  shipping_company_code: ['船公司.编码', '船公司编码'],
  shipping_company_name: ['船公司.供应商全称（中）', '船公司名称'], // ③ 船公司
  terminal: ['码头'],
  origin_forwarder_code: ['起运港货代公司.编码', '起运港货代公司编码'],
  origin_forwarder_name: ['起运港货代公司.供应商全称（中）', '起运港货代公司名称'], // ④ 起运港货代
  transport_mode_code: ['*运输方式.运输方式编码', '运输方式.运输方式编码', '运输方式编码'],
  transport_mode_name: ['运输方式.运输方式名称', '运输方式名称'],
  free_days_basis: ['*免费天数基准', '免费天数基准'],
  charge_type_code: ['*费用类型.费用小类编码', '费用类型.费用小类编码'],
  charge_name: ['费用类型.费用小类名称', '费用类型费用小类名称'],
  is_chargeable: ['*标记', '标记'],
  sequence_number: ['序列号'],
  port_condition: ['*目的港条件', '目的港条件'],
  calculation_basis: ['*计算方式', '计算方式'],
  process_status: ['单据状态', '处理状态']
}

// ==================== 响应式数据 ====================

const loading = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const selectedFile = ref<File | null>(null)
const previewData = ref<DemurrageStandardRow[]>([])
const previewColumns = ref<string[]>([])

const importResult = reactive({
  total: 0,
  success: 0,
  failed: 0,
  errors: [] as string[]
})

// ==================== 工具函数 ====================

function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
  }
  const str = String(value).trim().replace(/\//g, '-')
  const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  return null
}

function parseSequenceNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const str = String(value).replace(/,/g, '').trim()
  const n = parseInt(str, 10)
  return isNaN(n) ? null : n
}

function getExcelValue(row: Record<string, unknown>, fieldKey: string): unknown {
  const aliases = COLUMN_ALIASES[fieldKey]
  if (!aliases) return undefined
  for (const alias of aliases) {
    const val = row[alias]
    if (val !== undefined && val !== null && val !== '') return val
  }
  return undefined
}

/**
 * 从 Excel 行解析阶梯费率（列 1-60, 60+）并推导 free_days
 */
function parseTiersFromRow(row: Record<string, unknown>): { tiers: Record<string, number>; freeDays: number; ratePerDay?: number } {
  const tiers: Record<string, number> = {}
  const fees: number[] = []

  for (let i = 1; i <= 60; i++) {
    const key = String(i)
    const val = row[key] ?? row[`${i}.0`]
    const rate = typeof val === 'number' ? val : parseFloat(String(val || 0)) || 0
    tiers[key] = rate
    fees.push(rate)
  }

  const sixtyPlus = row['60+'] ?? row['60+']
  const rate60Plus = typeof sixtyPlus === 'number' ? sixtyPlus : parseFloat(String(sixtyPlus || 0)) || 0
  tiers['60+'] = rate60Plus
  fees.push(rate60Plus)

  const firstPositiveIdx = fees.findIndex(f => f > 0)
  const freeDays = firstPositiveIdx < 0 ? 0 : firstPositiveIdx

  const ratePerDay = firstPositiveIdx >= 0 && firstPositiveIdx < fees.length ? fees[firstPositiveIdx] : undefined

  return { tiers, freeDays, ratePerDay }
}

/**
 * 将 Excel 行转换为 DemurrageStandardRow
 */
function rowToDemurrageStandard(row: Record<string, unknown>, headers: string[]): DemurrageStandardRow | null {
  const { tiers, freeDays, ratePerDay } = parseTiersFromRow(row)

  // 四项匹配：优先取名称列（海外公司.名称、目的港.名称、船公司.供应商全称（中）、起运港货代公司.供应商全称（中）），后端按名称解析为字典 code
  const foreignCompanyCode = getExcelValue(row, 'foreign_company_name') || getExcelValue(row, 'foreign_company_code')
  const destinationPortCode = getExcelValue(row, 'destination_port_name') || getExcelValue(row, 'destination_port_code')
  const shippingCompanyCode = getExcelValue(row, 'shipping_company_name') || getExcelValue(row, 'shipping_company_code')
  const originForwarderCode = getExcelValue(row, 'origin_forwarder_name') || getExcelValue(row, 'origin_forwarder_code')
  const freeDaysBasis = getExcelValue(row, 'free_days_basis')
  const calculationBasis = getExcelValue(row, 'calculation_basis')

  if (!foreignCompanyCode || !destinationPortCode || !shippingCompanyCode || !originForwarderCode) {
    return null
  }

  return {
    foreign_company_code: String(foreignCompanyCode).trim(),
    foreign_company_name: getExcelValue(row, 'foreign_company_name') as string | undefined,
    effective_date: parseDate(getExcelValue(row, 'effective_date')),
    expiry_date: parseDate(getExcelValue(row, 'expiry_date')),
    destination_port_code: String(destinationPortCode).trim(),
    destination_port_name: getExcelValue(row, 'destination_port_name') as string | undefined,
    shipping_company_code: String(shippingCompanyCode).trim(),
    shipping_company_name: getExcelValue(row, 'shipping_company_name') as string | undefined,
    terminal: getExcelValue(row, 'terminal') as string | undefined,
    origin_forwarder_code: String(originForwarderCode).trim(),
    origin_forwarder_name: getExcelValue(row, 'origin_forwarder_name') as string | undefined,
    transport_mode_code: getExcelValue(row, 'transport_mode_code') as string | undefined,
    transport_mode_name: getExcelValue(row, 'transport_mode_name') as string | undefined,
    free_days_basis: freeDaysBasis ? String(freeDaysBasis).trim() : '自然日',
    calculation_basis: calculationBasis ? String(calculationBasis).trim() : '按卸船',
    charge_type_code: getExcelValue(row, 'charge_type_code') as string | undefined,
    charge_name: getExcelValue(row, 'charge_name') as string | undefined,
    is_chargeable: (getExcelValue(row, 'is_chargeable') as string) || 'Y',
    sequence_number: parseSequenceNumber(getExcelValue(row, 'sequence_number')) ?? undefined,
    port_condition: getExcelValue(row, 'port_condition') as string | undefined,
    process_status: getExcelValue(row, 'process_status') as string | undefined,
    free_days: freeDays,
    tiers,
    rate_per_day: ratePerDay,
    currency: 'USD'
  }
}

// ==================== 文件处理 ====================

const handleFileChange = (uploadFile: { raw?: File }) => {
  selectedFile.value = uploadFile?.raw ?? null
  previewData.value = []
  importResult.total = 0
  importResult.success = 0
  importResult.failed = 0
  importResult.errors = []
}

const parseExcel = async () => {
  if (!selectedFile.value) {
    ElMessage.error('请先选择文件')
    return
  }

  loading.value = true
  try {
    const data = await selectedFile.value.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]

    const headers = (jsonData[0] as string[]).map(h => String(h ?? '').trim())
    previewColumns.value = headers

    const dataRows = jsonData.slice(1) as unknown[][]
    const rows: DemurrageStandardRow[] = []

    for (let i = 0; i < dataRows.length; i++) {
      const rowArr = dataRows[i]
      const row: Record<string, unknown> = {}
      headers.forEach((h, idx) => {
        if (h) row[h] = rowArr[idx]
      })

      const converted = rowToDemurrageStandard(row, headers)
      if (converted) {
        rows.push(converted)
      } else if (Object.keys(row).some(k => row[k] !== undefined && row[k] !== '')) {
        ElMessage.warning(`第 ${i + 2} 行缺少必填字段（海外公司、目的港、船公司、货代需至少填编码或名称），已跳过`)
      }
    }

    previewData.value = rows
    ElMessage.success(`成功解析 ${rows.length} 条滞港费标准数据`)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    ElMessage.error(`解析Excel失败: ${msg}`)
  } finally {
    loading.value = false
  }
}

const uploadAndImport = async () => {
  if (previewData.value.length === 0) {
    ElMessage.error('没有可导入的数据')
    return
  }

  await ElMessageBox.confirm(
    `确定要导入 ${previewData.value.length} 条滞港费标准到数据库吗？`,
    '确认导入',
    {
      confirmButtonText: '确定导入',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )

  uploading.value = true
  importResult.total = previewData.value.length
  importResult.success = 0
  importResult.failed = 0
  importResult.errors = []

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
    timeout: 60000
  })

  const BATCH_SIZE = 50
  for (let i = 0; i < previewData.value.length; i += BATCH_SIZE) {
    const batch = previewData.value.slice(i, i + BATCH_SIZE)
    try {
      const { data } = await api.post<{ success: number; failed: number; errors?: { row: number; error: string }[] }>(
        '/import/demurrage-standards',
        { records: batch }
      )
      importResult.success += (data as { success?: number }).success ?? 0
      importResult.failed += data.failed ?? 0
      if (data.errors?.length) {
        data.errors.forEach(e => importResult.errors.push(`第 ${e.row} 行: ${e.error}`))
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      importResult.failed += batch.length
      importResult.errors.push(`批次 ${i + 1}-${i + batch.length}: ${msg}`)
    }
    uploadProgress.value = Math.round(((i + batch.length) / previewData.value.length) * 100)
  }

  uploading.value = false
  uploadProgress.value = 100

  if (importResult.success > 0) {
    ElMessage.success(`导入完成！成功 ${importResult.success} 条，失败 ${importResult.failed} 条`)
  } else {
    ElMessage.error('导入失败，请查看错误详情')
  }
}

const downloadTemplate = () => {
  const headers = [
    '海外公司.编码',
    '海外公司.名称',
    '生效日期',
    '结束日期',
    '目的港.编码',
    '目的港.名称',
    '船公司.编码',
    '船公司.供应商全称（中）',
    '码头',
    '起运港货代公司.编码',
    '起运港货代公司.供应商全称（中）',
    '运输方式.运输方式编码',
    '运输方式.运输方式名称',
    ...Array.from({ length: 60 }, (_, i) => String(i + 1)),
    '60+',
    '免费天数基准',
    '费用类型.费用小类编码',
    '费用类型.费用小类名称',
    '标记',
    '序列号',
    '目的港条件',
    '计算方式'
  ]

  const sampleRow = [
    '83',
    'AOSOM LLC',
    '2026-03-04',
    '',
    'USSAV',
    '萨凡纳',
    'Sup-004597',
    'COSCO',
    '',
    'Sup-019017',
    '宁波天图翼联物流科技有限公司',
    'TRUCK',
    '卡车',
    ...Array(4).fill(0),
    ...Array(26).fill(300),
    ...Array(31).fill(0),
    '工作+自然日',
    'US-DEMURRAGE-0036',
    'Demurrage Charge',
    'Y',
    '2957',
    '良',
    '按卸船'
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '滞港费标准')
  XLSX.writeFile(wb, '滞港费标准导入模板.xlsx')
  ElMessage.success('模板已下载')
}
</script>

<template>
  <div class="demurrage-import-container">
    <el-card class="upload-card">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><Document /></el-icon>
            滞港费标准导入
          </span>
          <div class="header-actions">
            <el-button type="primary" @click="$router.push('/import/demurrage-standard/entry')">
              手工录入
            </el-button>
            <el-button type="primary" :icon="Download" @click="downloadTemplate">
              下载模板
            </el-button>
          </div>
        </div>
      </template>

      <div class="upload-section">
        <el-upload
          class="upload-dragger"
          drag
          :auto-upload="false"
          :on-change="handleFileChange"
          :show-file-list="true"
          accept=".xlsx,.xls"
          :limit="1"
        >
          <el-icon class="el-icon--upload"><Upload /></el-icon>
          <div class="el-upload__text">
            将滞港费标准 Excel 拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持 .xlsx 和 .xls 格式，需包含海外公司、目的港、船公司、货代编码及 1-60、60+ 阶梯费率列
            </div>
          </template>
        </el-upload>

        <div class="action-buttons">
          <el-button
            type="primary"
            :loading="loading"
            :disabled="!selectedFile"
            @click="parseExcel"
          >
            <el-icon v-if="loading"><Loading /></el-icon>
            {{ loading ? '解析中...' : '解析Excel' }}
          </el-button>

          <el-button
            type="success"
            :loading="uploading"
            :disabled="previewData.length === 0"
            @click="uploadAndImport"
          >
            <el-icon v-if="uploading"><Loading /></el-icon>
            {{ uploading ? '导入中...' : '导入数据库' }}
          </el-button>
        </div>
      </div>

      <div v-if="uploading" class="progress-section">
        <el-progress
          :percentage="uploadProgress"
          :status="importResult.failed > 0 ? 'exception' : 'success'"
        />
        <div class="progress-info">
          已处理 {{ importResult.success + importResult.failed }} / {{ importResult.total }} 条
          <span class="success-count">成功: {{ importResult.success }}</span>
          <span class="failed-count">失败: {{ importResult.failed }}</span>
        </div>
      </div>
    </el-card>

    <el-card v-if="previewData.length > 0" class="preview-card">
      <template #header>
        <div class="card-header">
          <span class="title">数据预览 ({{ previewData.length }} 条)</span>
        </div>
      </template>

      <el-table :data="previewData.slice(0, 10)" border stripe max-height="400" style="width: 100%">
        <el-table-column prop="foreign_company_code" label="海外公司编码" min-width="100" />
        <el-table-column prop="destination_port_code" label="目的港编码" min-width="100" />
        <el-table-column prop="shipping_company_code" label="船公司编码" min-width="120" />
        <el-table-column prop="origin_forwarder_code" label="货代编码" min-width="120" />
        <el-table-column prop="free_days" label="免费天数" width="90" />
        <el-table-column prop="rate_per_day" label="日费率" width="90" />
        <el-table-column prop="free_days_basis" label="免费天数基准" width="120" />
        <el-table-column prop="calculation_basis" label="计算方式" width="100" />
      </el-table>

      <div v-if="previewData.length > 10" class="more-data-tip">
        仅显示前 10 条，实际将导入全部 {{ previewData.length }} 条
      </div>
    </el-card>

    <el-card v-if="importResult.total > 0" class="result-card">
      <template #header>
        <div class="card-header">
          <span class="title">导入结果</span>
        </div>
      </template>

      <el-alert
        :title="`导入完成！成功 ${importResult.success} 条，失败 ${importResult.failed} 条`"
        :type="importResult.failed > 0 ? 'warning' : 'success'"
        :closable="false"
        show-icon
      />

      <div v-if="importResult.errors.length > 0" class="error-list">
        <el-collapse>
          <el-collapse-item title="错误详情" name="errors">
            <el-scrollbar max-height="300">
              <ul>
                <li v-for="(error, index) in importResult.errors" :key="index" class="error-item">
                  {{ error }}
                </li>
              </ul>
            </el-scrollbar>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.demurrage-import-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 100px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-actions {
    display: flex;
    gap: 12px;
  }

  .title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
  }
}

.upload-section {
  .upload-dragger {
    margin-bottom: 16px;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
  }
}

.progress-section {
  margin-top: 16px;

  .progress-info {
    margin-top: 8px;
    font-size: 14px;
    color: #606266;

    .success-count {
      margin-left: 16px;
      color: #67c23a;
    }

    .failed-count {
      margin-left: 8px;
      color: #f56c6c;
    }
  }
}

.preview-card,
.result-card {
  margin-top: 20px;
}

.more-data-tip {
  margin-top: 12px;
  font-size: 13px;
  color: #909399;
}

.error-list {
  margin-top: 12px;

  .error-item {
    margin: 4px 0;
    color: #f56c6c;
  }
}
</style>
