<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Document, Download, Loading } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import axios from 'axios'

// ==================== 类型定义 ====================

interface FieldMapping {
  excelField: string
  table: string
  field: string
  required: boolean
  transform?: (value: any) => any
}

// ==================== 响应式数据 ====================

const loading = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const selectedFile = ref<File | null>(null)

// 预览数据
const previewData = ref<any[]>([])
const previewColumns = ref<string[]>([])

// 导入结果
const importResult = reactive({
  total: 0,
  success: 0,
  failed: 0,
  errors: [] as string[]
})

// ==================== 字段映射配置 ====================

/**
 * Excel字段到数据库字段的完整映射
 */
const FIELD_MAPPINGS: FieldMapping[] = [
  // ===== 备货单表 (biz_replenishment_orders) =====
  { excelField: '备货单号', table: 'replenishment_orders', field: 'orderNumber', required: true },
  { excelField: '主备货单号', table: 'replenishment_orders', field: 'mainOrderNumber', required: false },
  { excelField: '销往国家', table: 'replenishment_orders', field: 'sellToCountry', required: false },
  { excelField: '客户名称', table: 'replenishment_orders', field: 'customerName', required: false },
  { excelField: '备货单状态', table: 'replenishment_orders', field: 'orderStatus', required: false },
  { excelField: '采购贸易模式', table: 'replenishment_orders', field: 'procurementTradeMode', required: false },
  { excelField: '价格条款', table: 'replenishment_orders', field: 'priceTerms', required: false },
  { excelField: '箱数合计', table: 'replenishment_orders', field: 'totalBoxes', required: false, transform: parseDecimal },
  { excelField: '体积合计(m3)', table: 'replenishment_orders', field: 'totalCbm', required: false, transform: parseDecimal },
  { excelField: '毛重合计(KG)', table: 'replenishment_orders', field: 'totalGrossWeight', required: false, transform: parseDecimal },
  { excelField: '出运总价', table: 'replenishment_orders', field: 'shipmentTotalValue', required: false, transform: parseDecimal },
  { excelField: '议付金额FOB', table: 'replenishment_orders', field: 'fobAmount', required: false, transform: parseDecimal },
  { excelField: '议付金额CIF', table: 'replenishment_orders', field: 'cifAmount', required: false, transform: parseDecimal },
  { excelField: '议付金额', table: 'replenishment_orders', field: 'negotiationAmount', required: false, transform: parseDecimal },

  // ===== 货柜表 (biz_containers) =====
  { excelField: '集装箱号', table: 'containers', field: 'containerNumber', required: true },
  { excelField: '柜型', table: 'containers', field: 'containerTypeCode', required: false },
  { excelField: '货物描述', table: 'containers', field: 'cargoDescription', required: false },
  { excelField: '封条号', table: 'containers', field: 'sealNumber', required: false },
  { excelField: '是否查验', table: 'containers', field: 'inspectionRequired', required: false, transform: (v: any) => v === '是' || v === true || v === 1 },
  { excelField: '是否开箱', table: 'containers', field: 'isUnboxing', required: false, transform: (v: any) => v === '是' || v === true || v === 1 },
  { excelField: '物流状态', table: 'containers', field: 'logisticsStatus', required: false, transform: transformLogisticsStatus },
  { excelField: '毛重', table: 'containers', field: 'grossWeight', required: false, transform: parseDecimal },
  { excelField: '净重', table: 'containers', field: 'netWeight', required: false, transform: parseDecimal },
  { excelField: '体积(m3)', table: 'containers', field: 'cbm', required: false, transform: parseDecimal },
  { excelField: '箱数', table: 'containers', field: 'packages', required: false, transform: parseDecimal },

  // ===== 海运表 (process_sea_freight) =====
  { excelField: '提单号', table: 'sea_freight', field: 'billOfLadingNumber', required: false },
  { excelField: '航次号', table: 'sea_freight', field: 'voyageNumber', required: false },
  { excelField: '船名', table: 'sea_freight', field: 'vesselName', required: false },
  { excelField: '船公司', table: 'sea_freight', field: 'shippingCompany', required: false },
  { excelField: '起运港', table: 'sea_freight', field: 'portOfLoading', required: false },
  { excelField: '目的港', table: 'sea_freight', field: 'portOfDischarge', required: false },
  { excelField: '中转港', table: 'sea_freight', field: 'portOfTransit', required: false },
  { excelField: '起运港货代公司', table: 'sea_freight', field: 'freightForwarder', required: false },
  { excelField: '运输方式', table: 'sea_freight', field: 'transportMode', required: false },
  { excelField: '装船日期', table: 'sea_freight', field: 'shippingDate', required: false, transform: parseDate },
  { excelField: '预计到港日期', table: 'sea_freight', field: 'eta', required: false, transform: parseDate },
  { excelField: '实际到港日期', table: 'sea_freight', field: 'ata', required: false, transform: parseDate },

  // ===== 港口操作表 (process_port_operations) =====
  { excelField: '目的港码头', table: 'port_operations', field: 'portName', required: false },
  { excelField: '预计到港日期(港口)', table: 'port_operations', field: 'etaDestPort', required: false, transform: parseDate },
  { excelField: '实际到港日期', table: 'port_operations', field: 'ataDestPort', required: false, transform: parseDate },
  { excelField: '目的港卸船日期', table: 'port_operations', field: 'destPortUnloadDate', required: false, transform: parseDate },
  { excelField: '最后免费日期', table: 'port_operations', field: 'lastFreeDate', required: false, transform: parseDate },
  { excelField: '清关状态', table: 'port_operations', field: 'customsStatus', required: false, transform: transformCustomsStatus },
  { excelField: '计划清关日期', table: 'port_operations', field: 'plannedCustomsDate', required: false, transform: parseDate },
  { excelField: '实际清关日期', table: 'port_operations', field: 'actualCustomsDate', required: false, transform: parseDate },
  { excelField: 'ISF申报状态', table: 'port_operations', field: 'isfStatus', required: false, transform: transformISFStatus },
  { excelField: 'ISF申报日期', table: 'port_operations', field: 'isfDeclarationDate', required: false, transform: parseDate },

  // ===== 拖卡运输表 (process_trucking) =====
  { excelField: '是否预提', table: 'trucking_transports', field: 'isPrePickup', required: false, transform: (v: any) => v === '是' || v === true || v === 1 },
  { excelField: '目的港卡车', table: 'trucking_transports', field: 'carrierCompany', required: false },
  { excelField: '提柜通知', table: 'trucking_transports', field: 'pickupNotification', required: false },
  { excelField: '货柜承运商', table: 'trucking_transports', field: 'carrierCompany', required: false },
  { excelField: '司机姓名', table: 'trucking_transports', field: 'driverName', required: false },
  { excelField: '司机电话', table: 'trucking_transports', field: 'driverPhone', required: false },
  { excelField: '车牌号', table: 'trucking_transports', field: 'truckPlate', required: false },
  { excelField: '计划提柜日期', table: 'trucking_transports', field: 'plannedPickupDate', required: false, transform: parseDate },
  { excelField: '提柜日期', table: 'trucking_transports', field: 'pickupDate', required: false, transform: parseDate },
  { excelField: '计划送仓日期', table: 'trucking_transports', field: 'plannedDeliveryDate', required: false, transform: parseDate },
  { excelField: '送仓日期', table: 'trucking_transports', field: 'deliveryDate', required: false, transform: parseDate },
  { excelField: '提柜地点', table: 'trucking_transports', field: 'pickupLocation', required: false },
  { excelField: '送达地点', table: 'trucking_transports', field: 'deliveryLocation', required: false },

  // ===== 仓库操作表 (process_warehouse_operations) =====
  { excelField: '仓库(计划)', table: 'warehouse_operations', field: 'plannedWarehouse', required: false },
  { excelField: '仓库(实际)', table: 'warehouse_operations', field: 'actualWarehouse', required: false },
  { excelField: '计划卸柜日期', table: 'warehouse_operations', field: 'plannedUnloadDate', required: false, transform: parseDate },
  { excelField: '卸空日期', table: 'warehouse_operations', field: 'unloadDate', required: false, transform: parseDate },
  { excelField: '入库日期', table: 'warehouse_operations', field: 'warehouseArrivalDate', required: false, transform: parseDate },
  { excelField: '卸柜方式（实际）', table: 'warehouse_operations', field: 'unloadModeActual', required: false },
  { excelField: 'WMS入库状态', table: 'warehouse_operations', field: 'wmsStatus', required: false },
  { excelField: 'EBS入库状态', table: 'warehouse_operations', field: 'ebsStatus', required: false },

  // ===== 还空箱表 (process_empty_returns) =====
  { excelField: '计划还箱日期', table: 'empty_returns', field: 'plannedReturnDate', required: false, transform: parseDate },
  { excelField: '还箱日期', table: 'empty_returns', field: 'returnTime', required: false, transform: parseDate },
  { excelField: '还箱地点', table: 'empty_returns', field: 'returnTerminalName', required: false },
]

// ==================== 字典映射 ====================

/**
 * 物流状态映射
 */
function transformLogisticsStatus(value: string): string {
  const map: Record<string, string> = {
    '未出运': 'not_shipped',
    '已装船': 'shipped',
    '在途': 'in_transit',
    '已到港': 'at_port',
    '已提柜': 'picked_up',
    '已卸柜': 'unloaded',
    '已还箱': 'returned_empty',
  }
  return map[value] || value
}

/**
 * 清关状态映射
 */
function transformCustomsStatus(value: string): string {
  const map: Record<string, string> = {
    '未开始': 'NOT_STARTED',
    '进行中': 'IN_PROGRESS',
    '已完成': 'COMPLETED',
    '失败': 'FAILED',
  }
  return map[value] || value
}

/**
 * ISF申报状态映射
 */
function transformISFStatus(value: string): string {
  const map: Record<string, string> = {
    '未申报': 'NOT_STARTED',
    '已提交': 'SUBMITTED',
    '已批准': 'APPROVED',
    '已拒绝': 'REJECTED',
  }
  return map[value] || value
}

// ==================== 工具函数 ====================

/**
 * 解析日期字符串
 */
function parseDate(value: any): string | null {
  if (!value) return null

  // Excel日期数字
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return date.toISOString()
  }

  // 字符串日期
  const dateStr = String(value).trim()
  const dashDate = dateStr.replace(/\//g, '-')
  
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dashDate)) {
    const date = new Date(dashDate)
    return isNaN(date.getTime()) ? null : date.toISOString()
  }

  // YYYYMMDD
  if (/^\d{8}$/.test(dateStr)) {
    const year = dateStr.substring(0, 4)
    const month = dateStr.substring(4, 6)
    const day = dateStr.substring(6, 8)
    const date = new Date(`${year}-${month}-${day}`)
    return isNaN(date.getTime()) ? null : date.toISOString()
  }

  return null
}

/**
 * 解析数字/小数
 */
function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  const strValue = String(value).replace(/,/g, '').replace(/[¥$€£]/g, '')
  const num = parseFloat(strValue)
  return isNaN(num) ? null : num
}

// ==================== 文件处理 ====================

/**
 * 处理文件选择
 */
const handleFileChange = (uploadFile: any) => {
  selectedFile.value = uploadFile.raw
  previewData.value = []
  importResult.total = 0
  importResult.success = 0
  importResult.failed = 0
  importResult.errors = []
}

/**
 * 解析Excel文件
 */
const parseExcel = async () => {
  if (!selectedFile.value) {
    ElMessage.error('请先选择文件')
    return
  }

  loading.value = true

  try {
    const data = await selectedFile.value.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })

    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // 转换为JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    // 第一行是表头
    const headers = jsonData[0] as string[]
    previewColumns.value = headers

    // 数据行
    const dataRows = jsonData.slice(1)

    // 转换为对象数组
    previewData.value = dataRows.map(row => {
      const obj: Record<string, any> = {}
      headers.forEach((header, index) => {
        obj[header] = row[index]
      })
      return obj
    })

    ElMessage.success(`成功解析 ${previewData.value.length} 条数据`)

  } catch (error: any) {
    console.error('解析Excel失败:', error)
    ElMessage.error(`解析Excel失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

/**
 * 将Excel行数据拆分到各数据库表
 */
const splitRowToTables = (row: any): Record<string, any> => {
  const tables: Record<string, any> = {
    replenishment_orders: {},
    containers: {},
    sea_freight: {},
    port_operations: {},
    trucking_transports: {},
    warehouse_operations: {},
    empty_returns: {},
  }

  FIELD_MAPPINGS.forEach(mapping => {
    const excelValue = row[mapping.excelField]

    // 跳过空值
    if (excelValue === null || excelValue === undefined || excelValue === '') {
      return
    }

    // 应用转换函数
    const value = mapping.transform ? mapping.transform(excelValue) : excelValue

    // 添加到对应表
    if (tables[mapping.table]) {
      tables[mapping.table][mapping.field] = value
    }
  })

  // 添加关联关系
  const orderNumber = row['备货单号']
  const containerNumber = row['集装箱号']

  if (orderNumber) {
    tables.containers.orderNumber = orderNumber
  }

  if (containerNumber) {
    tables.sea_freight.containerNumber = containerNumber
    tables.port_operations.containerNumber = containerNumber
    tables.trucking_transports.containerNumber = containerNumber
    tables.warehouse_operations.containerNumber = containerNumber
    tables.empty_returns.containerNumber = containerNumber
  }

  return tables
}

/**
 * 上传并导入数据
 */
const uploadAndImport = async () => {
  if (previewData.value.length === 0) {
    ElMessage.warning('请先解析Excel文件')
    return
  }

  await ElMessageBox.confirm(
    `确定要导入 ${previewData.value.length} 条数据到数据库吗？`,
    '确认导入',
    {
      confirmButtonText: '确定导入',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )

  uploading.value = true
  importResult.total = previewData.value.length
  importResult.success = 0
  importResult.failed = 0
  importResult.errors = []

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
    timeout: 120000
  })

  try {
    // 批量处理数据，每次批量导入50条
    const batchSize = 50
    for (let i = 0; i < previewData.value.length; i += batchSize) {
      const batch = previewData.value.slice(i, i + batchSize)

      // 将批次数据转换为批量导入格式
      const batchData = batch.map(row => {
        const tables = splitRowToTables(row)
        return { tables }
      })

      console.log(`[ExcelImport] 准备导入批次 ${i}-${i + batch.length}，共 ${batchData.length} 条数据`)
      console.log(`[ExcelImport] 第一条数据示例:`, JSON.stringify(batchData[0], null, 2))

      try {
        // 调用后端批量导入API
        const response = await api.post('/import/excel/batch', {
          batch: batchData
        })

        if (response.data.success) {
          const result = response.data.data
          importResult.success += result.success || 0
          importResult.failed += result.failed || 0

          // 收集错误信息
          if (result.errors && result.errors.length > 0) {
            result.errors.forEach((error: any) => {
              const rowNumber = i + error.rowIndex
              importResult.errors.push(`第 ${rowNumber} 行: ${error.error || '导入失败'}`)
            })
          }
        }
      } catch (error: any) {
        // 批次导入失败，记录所有行失败
        const errorMsg = error.response?.data?.message || error.response?.data?.error || error.message || '未知错误'
        for (let j = 0; j < batch.length; j++) {
          importResult.failed++
          importResult.errors.push(`第 ${i + j + 1} 行: ${errorMsg}`)
        }
      }

      // 更新进度
      uploadProgress.value = Math.min(100, Math.round(((i + batch.length) / previewData.value.length) * 100))
    }

    if (importResult.success > 0) {
      ElMessage.success(`导入完成！成功 ${importResult.success} 条，失败 ${importResult.failed} 条`)
    } else {
      ElMessage.error('导入失败，请查看错误详情')
    }

  } catch (error: any) {
    console.error('导入失败:', error)
    ElMessage.error(`导入失败: ${error.message}`)
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

/**
 * 下载导入模板
 */
const downloadTemplate = () => {
  const templateData: Record<string, any>[] = [{
    '备货单号': 'ORD202600001',
    '主备货单号': '',
    '销往国家': '美国',
    '客户名称': '示例客户',
    '备货单状态': 'DRAFT',
    '采购贸易模式': '常规',
    '价格条款': 'FOB',
    '箱数合计': 100,
    '体积合计(m3)': 25.5,
    '毛重合计(KG)': 1500,
    '出运总价': 50000,
    '议付金额FOB': 45000,
    '议付金额': '',
    '集装箱号': 'CONT202600001',
    '柜型': '40HQ',
    '货物描述': '示例货物',
    '封条号': 'SEAL001',
    '是否查验': '否',
    '是否开箱': '否',
    '物流状态': '未出运',
    '毛重': 1500,
    '净重': 1400,
    '体积(m3)': 25.5,
    '箱数': 100,
    '提单号': 'BL202600001',
    '航次号': 'V001',
    '船名': '示例船',
    '船公司': '马士基',
    '起运港': '上海港',
    '目的港': '洛杉矶港',
    '中转港': '',
    '起运港货代公司': '',
    '运输方式': '海运',
    '装船日期': '2026-02-20',
    '预计到港日期': '2026-03-15',
    '实际到港日期': '',
    '目的港码头': '',
    '预计到港日期(港口)': '2026-03-15',
    '目的港卸船日期': '',
    '最后免费日期': '2026-03-20',
    '清关状态': '进行中',
    '计划清关日期': '2026-03-16',
    '实际清关日期': '',
    'ISF申报状态': '已提交',
    'ISF申报日期': '2026-02-15',
    '是否预提': '否',
    '目的港卡车': '',
    '提柜通知': '',
    '货柜承运商': '',
    '司机姓名': '',
    '司机电话': '',
    '车牌号': '',
    '计划提柜日期': '',
    '提柜日期': '',
    '计划送仓日期': '',
    '送仓日期': '',
    '提柜地点': '',
    '送达地点': '',
    '仓库(计划)': '',
    '仓库(实际)': '',
    '计划卸柜日期': '',
    '卸空日期': '',
    '入库日期': '',
    '卸柜方式（实际）': '',
    'WMS入库状态': '',
    'EBS入库状态': '',
    '计划还箱日期': '',
    '还箱日期': '',
    '还箱地点': '',
  }]

  const worksheet = XLSX.utils.json_to_sheet(templateData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '导入模板')
  XLSX.writeFile(workbook, '物流数据导入模板.xlsx')
  ElMessage.success('模板下载成功')
}
</script>

<template>
  <div class="excel-import-container">
    <el-card class="upload-card">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><Document /></el-icon>
            Excel数据导入
          </span>
          <el-button type="primary" :icon="Download" @click="downloadTemplate">
            下载模板
          </el-button>
        </div>
      </template>

      <!-- 文件上传区域 -->
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
            将文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持 .xlsx 和 .xls 格式，单次最多导入 1000 条数据
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

      <!-- 导入进度 -->
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

    <!-- 数据预览表格 -->
    <el-card v-if="previewData.length > 0" class="preview-card">
      <template #header>
        <div class="card-header">
          <span class="title">数据预览 ({{ previewData.length }} 条)</span>
        </div>
      </template>

      <el-table
        :data="previewData.slice(0, 10)"
        border
        stripe
        max-height="500"
        style="width: 100%"
      >
        <el-table-column
          v-for="column in previewColumns"
          :key="column"
          :prop="column"
          :label="column"
          min-width="120"
          show-overflow-tooltip
        />
      </el-table>

      <div v-if="previewData.length > 10" class="more-data-tip">
        仅显示前 10 条数据，实际将导入全部 {{ previewData.length }} 条
      </div>
    </el-card>

    <!-- 导入结果 -->
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
.excel-import-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 100px);
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

.upload-card,
.preview-card,
.result-card {
  margin-bottom: 20px;
}

.upload-section {
  padding: 20px;
}

.upload-dragger {
  margin-bottom: 20px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.progress-section {
  margin-top: 20px;
  padding: 20px;
  background: #f9fafc;
  border-radius: 8px;
}

.progress-info {
  margin-top: 12px;
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #606266;
}

.success-count {
  color: #67c23a;
  font-weight: 600;
}

.failed-count {
  color: #f56c6c;
  font-weight: 600;
}

.more-data-tip {
  text-align: center;
  padding: 12px;
  color: #909399;
  font-size: 14px;
}

.error-list {
  margin-top: 20px;
}

.error-item {
  padding: 8px 12px;
  background: #fef0f0;
  color: #f56c6c;
  border-radius: 4px;
  margin-bottom: 8px;
}

:deep(.el-upload-dragger) {
  padding: 40px;
}
</style>
