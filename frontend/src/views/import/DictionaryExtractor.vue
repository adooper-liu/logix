<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, Document, Download, Search, Check } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'

// ==================== 类型定义 ====================

interface ExtractionResult {
  shippingCompanies: Set<string>
  ports: Set<string>
  statusCodes: Set<string>
  transportModes: Set<string>
  rowCount: number
}

interface ValidationResult {
  statusCodes: {
    mapped: string[]
    unmapped: string[]
    total: number
  }
  shippingCompanies: {
    mapped: string[]
    unmapped: string[]
    total: number
  }
  ports: {
    mapped: string[]
    unmapped: string[]
    total: number
  }
}

// ==================== 响应式数据 ====================

const loading = ref(false)
const selectedFile = ref<File | null>(null)
const extractionResult = reactive<ExtractionResult>({
  shippingCompanies: new Set(),
  ports: new Set(),
  statusCodes: new Set(),
  transportModes: new Set(),
  rowCount: 0
})

const validationResult = ref<ValidationResult | null>(null)

// 已知的映射字典（用于验证）
const KNOWN_STATUS_CODES = [
  'RCVE', 'STSP', 'GITM', 'LOBD', 'DLPT', 'BDAR', 'POCA', 'DSCH', 'STCS',
  'FDDP', 'FDLB', 'FDBA', 'TCHR', 'RAIL', 'AVLB', 'GTOB', 'GTIB', 'RCS',
  'ST', 'A', 'N', 'Y', 'FCLS', 'LCLS'
]

const KNOWN_SHIPPING_COMPANIES = [
  'CMA', 'YML', 'WHL', 'MSK', 'MSC', 'HPL', 'HMM', 'ONE', 'EMC', 'COSCO',
  'OOCL', 'ZIM', 'PIL', 'APL'
]

const KNOWN_PORTS = [
  'CNSHA', 'CNNGB', 'CNSHK', 'CNTAO', 'CNXMN', 'CNDLC', 'CNYTN',
  'FRLEH', 'FRPAR', 'FRLIO', 'FRMRS', 'DEBRV', 'DEHAM', 'NLRTM',
  'USSAV', 'USLGB', 'USLAX', 'USSEA', 'USNYC', 'USCHS',
  'GBFXT', 'GBSOU', 'GBLGP', 'GBLIV', 'GBLON'
]

const _KNOWN_TRANSPORT_MODES = [
  '大船', '驳船', '卡车', '铁路', '海运', '陆运', '空运', '多式联运'
]

// ==================== 计算属性 ====================

const hasResults = computed(() => extractionResult.rowCount > 0)

const summaryText = computed(() => {
  if (!hasResults.value) return '等待上传文件...'
  return `解析完成：${extractionResult.rowCount} 行数据，
          提取到 ${extractionResult.shippingCompanies.size} 个船公司，
          ${extractionResult.ports.size} 个港口，
          ${extractionResult.statusCodes.size} 个状态码，
          ${extractionResult.transportModes.size} 种运输模式`
})

// ==================== 工具函数 ====================

const normalizeShippingCompany = (value: string): string => {
  if (!value) return ''
  const normalized = value.toUpperCase().trim()
  // 提取公司代码（如 "CMA CGM" -> "CMA"）
  const match = normalized.match(/^(CMA|YML|WHL|MSK|MSC|HPL|HMM|ONE|EMC|COSCO|OOCL|ZIM|PIL|APL)/)
  return match ? match[1] : normalized
}

const normalizePort = (value: string): string => {
  if (!value) return ''
  const normalized = value.toUpperCase().trim()
  // 如果是标准代码格式，直接返回
  if (/^[A-Z]{2}[A-Z]{3,6}$/.test(normalized)) return normalized
  // 否则返回原始值用于后续映射
  return value.trim()
}

const normalizeStatusCode = (value: string): string => {
  if (!value) return ''
  return value.toUpperCase().trim()
}

const normalizeTransportMode = (value: string): string => {
  if (!value) return ''
  const normalized = value.trim()
  // 映射常见变体
  const modeMap: Record<string, string> = {
    '海运': '大船',
    '大船运输': '大船',
    '驳船运输': '驳船',
    '卡车运输': '卡车',
    '公路运输': '卡车',
    '铁路运输': '铁路',
    '火车运输': '铁路',
    'MULTIMODAL': '多式联运',
    'INTERMODAL': '多式联运'
  }
  return modeMap[normalized] || normalized
}

// ==================== 文件处理 ====================

const handleFileChange = (uploadFile: any) => {
  selectedFile.value = uploadFile.raw
  // 重置结果
  resetResults()
}

const resetResults = () => {
  extractionResult.shippingCompanies.clear()
  extractionResult.ports.clear()
  extractionResult.statusCodes.clear()
  extractionResult.transportModes.clear()
  extractionResult.rowCount = 0
  validationResult.value = null
}

const extractData = async () => {
  if (!selectedFile.value) {
    ElMessage.error('请先选择Excel文件')
    return
  }

  loading.value = true

  try {
    const data = await selectedFile.value.arrayBuffer()
    
    // 保存原始console.error，用于临时屏蔽SheetJS内部错误
    const originalConsoleError = console.error
    const sheetjsErrors: string[] = []
    
    // 临时重写console.error，捕获SheetJS的Bad uncompressed size错误
    console.error = (...args: any[]) => {
      const errorMsg = args.join(' ')
      if (errorMsg.includes('Bad uncompressed size') || errorMsg.includes('XLSX.read')) {
        sheetjsErrors.push(errorMsg)
        // 不输出到控制台
        return
      }
      originalConsoleError.apply(console, args)
    }

    // 配置SheetJS解析参数，增加错误处理
    let workbook
    try {
      workbook = XLSX.read(data, { 
        type: 'array',
        cellDates: true,
        cellStyles: false,
        cellNF: false,
        sheetStubs: false,
        raw: false,
        WTF: false, // 设置为false以静默处理错误
        dense: false // 防止密集模式导致的解析问题
      })
    } catch (parseError: unknown) {
      // 恢复原始console.error
      console.error = originalConsoleError
      console.error('Excel解析错误:', parseError)
      const message = parseError instanceof Error ? parseError.message : '未知错误'
      ElMessage.error(`Excel文件解析失败: ${message}`)
      loading.value = false
      return
    } finally {
      // 恢复原始console.error
      console.error = originalConsoleError
    }

    // 如果有SheetJS内部错误，记录但不阻止执行
    if (sheetjsErrors.length > 0) {
      console.warn(`检测到 ${sheetjsErrors.length} 个Excel格式警告，尝试继续解析...`)
      console.warn('警告详情:', sheetjsErrors.slice(0, 3)) // 只显示前3个
      
      // 通知用户文件可能存在格式问题，但我们正在尝试解析
      ElMessage.warning({
        message: `检测到Excel文件格式警告（${sheetjsErrors.length}个），正在尝试继续解析...`,
        duration: 5000,
        showClose: true
      })
    }

    // 验证workbook是否有效
    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      ElMessage.error('Excel文件无效或没有工作表')
      loading.value = false
      return
    }

    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    if (!worksheet) {
      ElMessage.error(`无法读取工作表: ${firstSheetName}`)
      loading.value = false
      return
    }

    // 转换为JSON（第一行作为表头）
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]

    if (jsonData.length < 2) {
      ElMessage.error('Excel文件数据不足，至少需要包含表头和一行数据')
      loading.value = false
      return
    }

    // 第一行是表头
    const headers = jsonData[0] as string[]
    
    // 清理表头（去除空格，处理null/undefined）
    const cleanHeaders = headers.map((h, index) => {
      if (!h) return `COLUMN_${index}`
      return String(h).trim()
    })

    // 找到关键列的索引 - 优化匹配逻辑
    const shippingCompanyCol = cleanHeaders.findIndex(h => {
      const headerLower = h.toLowerCase()
      return ['船公司', '船公司名称', '船公司.供应商全称（中）', 'shipping company', 'carrier', 'carrier code'].some(keyword => 
        headerLower.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(headerLower)
      )
    })
    
    const portCol = cleanHeaders.findIndex(h => {
      const headerLower = h.toLowerCase()
      return ['目的港', '目的港名称', '目的港.名称', 'port of discharge', 'destination port', 'pod', 'port'].some(keyword =>
        headerLower.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(headerLower)
      )
    })
    
    const statusCol = cleanHeaders.findIndex(h => {
      const headerLower = h.toLowerCase()
      return ['状态码', 'status code', 'status', '事件代码', 'event code', 'eventcode', '事件', 'event', '代码', 'code'].some(keyword =>
        headerLower.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(headerLower)
      )
    })
    
    const transportModeCol = cleanHeaders.findIndex(h => {
      const headerLower = h.toLowerCase()
      return ['运输方式', 'transport mode', '运输模式', 'mode of transport', 'transportmode', 'mode'].some(keyword =>
        headerLower.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(headerLower)
      )
    })

    console.log('表头样本:', cleanHeaders.slice(0, 10))
    console.log('找到的列索引:', {
      shippingCompanyCol: shippingCompanyCol >= 0 ? `${shippingCompanyCol} (${cleanHeaders[shippingCompanyCol]})` : -1,
      portCol: portCol >= 0 ? `${portCol} (${cleanHeaders[portCol]})` : -1,
      statusCol: statusCol >= 0 ? `${statusCol} (${cleanHeaders[statusCol]})` : -1,
      transportModeCol: transportModeCol >= 0 ? `${transportModeCol} (${cleanHeaders[transportModeCol]})` : -1
    })

    // 检查哪些列没有找到
    const missingColumns = []
    if (shippingCompanyCol === -1) missingColumns.push('船公司')
    if (portCol === -1) missingColumns.push('港口')
    if (statusCol === -1) missingColumns.push('状态码')
    if (transportModeCol === -1) missingColumns.push('运输方式')

    if (shippingCompanyCol === -1 && portCol === -1 && statusCol === -1 && transportModeCol === -1) {
      ElMessage.warning('未识别到任何关键列（船公司、港口、状态码、运输方式），请检查Excel表头')
      console.warn('可用表头:', cleanHeaders.slice(0, 20)) // 只显示前20个
    } else {
      const foundColumns = []
      if (shippingCompanyCol >= 0) foundColumns.push(`船公司: ${cleanHeaders[shippingCompanyCol]}`)
      if (portCol >= 0) foundColumns.push(`港口: ${cleanHeaders[portCol]}`)
      if (statusCol >= 0) foundColumns.push(`状态码: ${cleanHeaders[statusCol]}`)
      if (transportModeCol >= 0) foundColumns.push(`运输模式: ${cleanHeaders[transportModeCol]}`)
      
      ElMessage.success(`成功识别到 ${foundColumns.length} 个关键列: ${foundColumns.join(', ')}`)
      
      // 如果有缺失的列，显示提示
      if (missingColumns.length > 0) {
        ElMessage.info({
          message: `未识别到以下列: ${missingColumns.join('、')}，仍可继续提取其他数据`,
          duration: 4000,
          showClose: true
        })
        console.info(`如需提取${missingColumns.join('、')}，请检查表头是否包含: ${missingColumns.join(', ')}相关的关键词`)
      }
    }

    // 数据行
    const dataRows = jsonData.slice(1)
    extractionResult.rowCount = dataRows.length

    // 提取数据
    dataRows.forEach((row) => {
      // 提取船公司
      if (shippingCompanyCol !== -1 && row[shippingCompanyCol]) {
        const company = normalizeShippingCompany(String(row[shippingCompanyCol]))
        if (company) extractionResult.shippingCompanies.add(company)
      }

      // 提取港口
      if (portCol !== -1 && row[portCol]) {
        const port = normalizePort(String(row[portCol]))
        if (port) extractionResult.ports.add(port)
      }

      // 提取状态码
      if (statusCol !== -1 && row[statusCol]) {
        const status = normalizeStatusCode(String(row[statusCol]))
        if (status) extractionResult.statusCodes.add(status)
      }

      // 提取运输模式
      if (transportModeCol !== -1 && row[transportModeCol]) {
        const mode = normalizeTransportMode(String(row[transportModeCol]))
        if (mode) extractionResult.transportModes.add(mode)
      }
    })

    // 构建提取结果详情
    const extractedItems = []
    if (extractionResult.shippingCompanies.size > 0) extractedItems.push(`${extractionResult.shippingCompanies.size} 个船公司`)
    if (extractionResult.ports.size > 0) extractedItems.push(`${extractionResult.ports.size} 个港口`)
    if (extractionResult.statusCodes.size > 0) extractedItems.push(`${extractionResult.statusCodes.size} 个状态码`)
    if (extractionResult.transportModes.size > 0) extractedItems.push(`${extractionResult.transportModes.size} 种运输模式`)
    
    const successMsg = extractedItems.length > 0 
      ? `成功提取 ${extractionResult.rowCount} 行数据: ${extractedItems.join('、')}`
      : `成功解析 ${extractionResult.rowCount} 行数据，但未提取到有效内容`
      
    ElMessage.success(successMsg)
    console.log('提取结果详情:', {
      ...extractionResult,
      shippingCompanies: Array.from(extractionResult.shippingCompanies),
      ports: Array.from(extractionResult.ports),
      statusCodes: Array.from(extractionResult.statusCodes),
      transportModes: Array.from(extractionResult.transportModes)
    })

  } catch (error: any) {
    console.error('解析Excel失败:', error)
    ElMessage.error(`解析Excel失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// ==================== 验证功能 ====================

const validateMappings = () => {
  if (!hasResults.value) {
    ElMessage.warning('请先提取数据')
    return
  }

  const statusCodes = Array.from(extractionResult.statusCodes)
  const shippingCompanies = Array.from(extractionResult.shippingCompanies)
  const ports = Array.from(extractionResult.ports)

  validationResult.value = {
    statusCodes: {
      mapped: statusCodes.filter(code => KNOWN_STATUS_CODES.includes(code)),
      unmapped: statusCodes.filter(code => !KNOWN_STATUS_CODES.includes(code)),
      total: statusCodes.length
    },
    shippingCompanies: {
      mapped: shippingCompanies.filter(company => KNOWN_SHIPPING_COMPANIES.includes(company)),
      unmapped: shippingCompanies.filter(company => !KNOWN_SHIPPING_COMPANIES.includes(company)),
      total: shippingCompanies.length
    },
    ports: {
      mapped: ports.filter(port => KNOWN_PORTS.includes(port)),
      unmapped: ports.filter(port => !KNOWN_PORTS.includes(port)),
      total: ports.length
    }
  }

  ElMessage.success('验证完成')
}

// ==================== 导出功能 ====================

const exportAsCSV = () => {
  if (!hasResults.value) {
    ElMessage.warning('没有数据可导出')
    return
  }

  const csvContent = generateCSVContent()
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `字典数据提取_${new Date().toISOString().split('T')[0]}.csv`
  link.click()

  ElMessage.success('CSV导出成功')
}

const generateCSVContent = (): string => {
  let content = '数据类型,值,数量\n'
  
  // 船公司
  Array.from(extractionResult.shippingCompanies).forEach(company => {
    content += `船公司,${company},${extractionResult.shippingCompanies.size}\n`
  })
  
  // 港口
  Array.from(extractionResult.ports).forEach(port => {
    content += `港口,${port},${extractionResult.ports.size}\n`
  })
  
  // 状态码
  Array.from(extractionResult.statusCodes).forEach(code => {
    content += `状态码,${code},${extractionResult.statusCodes.size}\n`
  })
  
  // 运输模式
  Array.from(extractionResult.transportModes).forEach(mode => {
    content += `运输模式,${mode},${extractionResult.transportModes.size}\n`
  })
  
  return content
}

const exportAsSQL = () => {
  if (!hasResults.value) {
    ElMessage.warning('没有数据可导出')
    return
  }

  const sqlContent = generateSQLContent()
  const blob = new Blob([sqlContent], { type: 'text/sql;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `字典数据初始化_${new Date().toISOString().split('T')[0]}.sql`
  link.click()

  ElMessage.success('SQL导出成功')
}

const generateSQLContent = (): string => {
  let sql = '-- 字典数据初始化脚本\n'
  sql += `-- 生成时间: ${new Date().toISOString()}\n`
  sql += `-- 数据来源: ${selectedFile.value?.name}\n\n`

  // 船公司
  sql += '-- 船公司字典\n'
  sql += 'INSERT INTO dict_shipping_companies (company_code, company_name, status) VALUES\n'
  const companyValues = Array.from(extractionResult.shippingCompanies).map(company => 
    `('${company}', '${company}', 'active')`
  ).join(',\n')
  sql += companyValues + ';\n\n'

  // 港口
  sql += '-- 港口字典\n'
  sql += 'INSERT INTO dict_ports (port_code, port_name, port_type, status) VALUES\n'
  const portValues = Array.from(extractionResult.ports).map(port => 
    `('${port}', '${port}', 'seaport', 'active')`
  ).join(',\n')
  sql += portValues + ';\n\n'

  // 状态码
  sql += '-- 状态码字典\n'
  sql += 'INSERT INTO dict_status_codes (status_code, status_name, category, description) VALUES\n'
  const statusValues = Array.from(extractionResult.statusCodes).map((code) => 
    `('${code}', '${code}', 'logistics', 'Auto imported status code')`
  ).join(',\n')
  sql += statusValues + ';\n\n'

  // 运输模式
  sql += '-- 运输模式字典\n'
  sql += 'INSERT INTO dict_transport_modes (mode_code, mode_name, category) VALUES\n'
  const modeValues = Array.from(extractionResult.transportModes).map(mode => 
    `('${mode}', '${mode}', 'transport')`
  ).join(',\n')
  sql += modeValues + ';\n\n'

  return sql
}

const exportValidationReport = () => {
  if (!validationResult.value) {
    ElMessage.warning('请先进行验证')
    return
  }

  const reportContent = generateValidationReport()
  const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `映射验证报告_${new Date().toISOString().split('T')[0]}.md`
  link.click()

  ElMessage.success('验证报告导出成功')
}

const generateValidationReport = (): string => {
  const result = validationResult.value!
  let report = '# 字典数据映射验证报告\n\n'
  report += `**生成时间**: ${new Date().toISOString()}\n\n`
  report += `**数据来源**: ${selectedFile.value?.name}\n\n`

  // 状态码验证
  report += '## 状态码映射验证\n\n'
  report += `**总数**: ${result.statusCodes.total}\n\n`
  report += `**已映射** (${result.statusCodes.mapped.length}):\n`
  result.statusCodes.mapped.forEach(code => {
    report += `- ✓ ${code}\n`
  })
  report += '\n'
  
  if (result.statusCodes.unmapped.length > 0) {
    report += `**未映射** (${result.statusCodes.unmapped.length}):\n`
    result.statusCodes.unmapped.forEach(code => {
      report += `- ✗ ${code}\n`
    })
    report += '\n**建议**: 请更新状态码映射配置\n'
  }
  report += '\n'

  // 船公司验证
  report += '## 船公司映射验证\n\n'
  report += `**总数**: ${result.shippingCompanies.total}\n\n`
  report += `**已映射** (${result.shippingCompanies.mapped.length}):\n`
  result.shippingCompanies.mapped.forEach(company => {
    report += `- ✓ ${company}\n`
  })
  report += '\n'
  
  if (result.shippingCompanies.unmapped.length > 0) {
    report += `**未映射** (${result.shippingCompanies.unmapped.length}):\n`
    result.shippingCompanies.unmapped.forEach(company => {
      report += `- ✗ ${company}\n`
    })
    report += '\n**建议**: 请更新船公司映射配置\n'
  }
  report += '\n'

  // 港口验证
  report += '## 港口映射验证\n\n'
  report += `**总数**: ${result.ports.total}\n\n`
  report += `**已映射** (${result.ports.mapped.length}):\n`
  result.ports.mapped.forEach(port => {
    report += `- ✓ ${port}\n`
  })
  report += '\n'
  
  if (result.ports.unmapped.length > 0) {
    report += `**未映射** (${result.ports.unmapped.length}):\n`
    result.ports.unmapped.forEach(port => {
      report += `- ✗ ${port}\n`
    })
    report += '\n**建议**: 请更新港口映射配置\n'
  }

  return report
}
</script>

<template>
  <div class="dictionary-extractor-container">
    <el-card class="header-card">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><Document /></el-icon>
            Excel字典数据提取工具
          </span>
          <el-tag type="success" size="large">
            多式联运数据验证
          </el-tag>
        </div>
      </template>

      <div class="description">
        <p>从飞驼Excel数据中提取以下字典信息：</p>
        <el-space wrap>
          <el-tag>船公司（12+）</el-tag>
          <el-tag type="success">港口（20+）</el-tag>
          <el-tag type="warning">状态码全集</el-tag>
          <el-tag type="danger">运输模式（大船/驳船/卡车/铁路）</el-tag>
        </el-space>
      </div>
    </el-card>

    <!-- 文件上传区域 -->
    <el-card class="upload-card">
      <template #header>
        <div class="card-header">
          <span class="section-title">1. 上传Excel文件</span>
        </div>
      </template>

      <el-upload
        class="upload-area"
        drag
        :auto-upload="false"
        :on-change="handleFileChange"
        :show-file-list="true"
        accept=".xlsx,.xls"
        :limit="1"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">
          将飞驼Excel文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 .xlsx 和 .xls 格式，用于提取字典数据和验证映射
          </div>
        </template>
      </el-upload>

      <div class="action-buttons">
        <el-button
          type="primary"
          :loading="loading"
          :disabled="!selectedFile"
          @click="extractData"
        >
          <el-icon><Search /></el-icon>
          提取字典数据
        </el-button>
      </div>
    </el-card>

    <!-- 提取结果汇总 -->
    <el-card v-if="hasResults" class="summary-card">
      <template #header>
        <div class="card-header">
          <span class="section-title">2. 提取结果</span>
          <el-tag type="info">
            {{ extractionResult.rowCount }} 行数据
          </el-tag>
        </div>
      </template>

      <el-alert
        :title="summaryText"
        type="success"
        :closable="false"
        show-icon
      />

      <div class="stats-grid">
        <el-card class="stat-card">
          <template #header>
            <span class="stat-title">船公司</span>
          </template>
          <div class="stat-value">{{ extractionResult.shippingCompanies.size }}</div>
          <div class="stat-list">
            <el-tag
              v-for="company in Array.from(extractionResult.shippingCompanies)"
              :key="company"
              size="small"
              class="stat-tag"
            >
              {{ company }}
            </el-tag>
          </div>
        </el-card>

        <el-card class="stat-card">
          <template #header>
            <span class="stat-title">港口</span>
          </template>
          <div class="stat-value">{{ extractionResult.ports.size }}</div>
          <div class="stat-list">
            <el-scrollbar max-height="200">
              <el-tag
                v-for="port in Array.from(extractionResult.ports)"
                :key="port"
                type="success"
                size="small"
                class="stat-tag"
              >
                {{ port }}
              </el-tag>
            </el-scrollbar>
          </div>
        </el-card>

        <el-card class="stat-card">
          <template #header>
            <span class="stat-title">状态码</span>
          </template>
          <div class="stat-value">{{ extractionResult.statusCodes.size }}</div>
          <div class="stat-list">
            <el-scrollbar max-height="200">
              <el-tag
                v-for="code in Array.from(extractionResult.statusCodes)"
                :key="code"
                type="warning"
                size="small"
                class="stat-tag"
              >
                {{ code }}
              </el-tag>
            </el-scrollbar>
          </div>
        </el-card>

        <el-card class="stat-card">
          <template #header>
            <span class="stat-title">运输模式</span>
          </template>
          <div class="stat-value">{{ extractionResult.transportModes.size }}</div>
          <div class="stat-list">
            <el-tag
              v-for="mode in Array.from(extractionResult.transportModes)"
              :key="mode"
              type="danger"
              size="small"
              class="stat-tag"
            >
              {{ mode }}
            </el-tag>
          </div>
        </el-card>
      </div>
    </el-card>

    <!-- 验证功能 -->
    <el-card v-if="hasResults" class="validation-card">
      <template #header>
        <div class="card-header">
          <span class="section-title">3. 验证映射完整性</span>
        </div>
      </template>

      <el-button
        type="warning"
        :icon="Check"
        @click="validateMappings"
      >
        验证状态码映射
      </el-button>

      <div v-if="validationResult" class="validation-results">
        <!-- 状态码验证 -->
        <el-card class="validation-item">
          <template #header>
            <div class="validation-header">
              <span>状态码映射</span>
              <el-tag 
                :type="validationResult.statusCodes.unmapped.length === 0 ? 'success' : 'danger'"
              >
                {{ validationResult.statusCodes.mapped.length }}/{{ validationResult.statusCodes.total }} 已映射
              </el-tag>
            </div>
          </template>
          <div class="validation-content">
            <div v-if="validationResult.statusCodes.mapped.length > 0" class="mapped-section">
              <div class="section-label">✓ 已映射（{{ validationResult.statusCodes.mapped.length }}）：</div>
              <el-space wrap>
                <el-tag
                  v-for="code in validationResult.statusCodes.mapped"
                  :key="code"
                  type="success"
                  size="small"
                >
                  {{ code }}
                </el-tag>
              </el-space>
            </div>
            <div v-if="validationResult.statusCodes.unmapped.length > 0" class="unmapped-section">
              <div class="section-label">✗ 未映射（{{ validationResult.statusCodes.unmapped.length }}）：</div>
              <el-space wrap>
                <el-tag
                  v-for="code in validationResult.statusCodes.unmapped"
                  :key="code"
                  type="danger"
                  size="small"
                >
                  {{ code }}
                </el-tag>
              </el-space>
              <el-alert
                title="发现未映射的状态码，请更新映射配置"
                type="error"
                :closable="false"
                show-icon
                class="validation-warning"
              />
            </div>
          </div>
        </el-card>

        <!-- 船公司验证 -->
        <el-card class="validation-item">
          <template #header>
            <div class="validation-header">
              <span>船公司映射</span>
              <el-tag 
                :type="validationResult.shippingCompanies.unmapped.length === 0 ? 'success' : 'warning'"
              >
                {{ validationResult.shippingCompanies.mapped.length }}/{{ validationResult.shippingCompanies.total }} 已映射
              </el-tag>
            </div>
          </template>
          <div class="validation-content">
            <div v-if="validationResult.shippingCompanies.mapped.length > 0" class="mapped-section">
              <div class="section-label">✓ 已映射：</div>
              <el-space wrap>
                <el-tag
                  v-for="company in validationResult.shippingCompanies.mapped"
                  :key="company"
                  type="success"
                  size="small"
                >
                  {{ company }}
                </el-tag>
              </el-space>
            </div>
            <div v-if="validationResult.shippingCompanies.unmapped.length > 0" class="unmapped-section">
              <div class="section-label">✗ 未映射：</div>
              <el-space wrap>
                <el-tag
                  v-for="company in validationResult.shippingCompanies.unmapped"
                  :key="company"
                  type="warning"
                  size="small"
                >
                  {{ company }}
                </el-tag>
              </el-space>
            </div>
          </div>
        </el-card>

        <!-- 港口验证 -->
        <el-card class="validation-item">
          <template #header>
            <div class="validation-header">
              <span>港口映射</span>
              <el-tag 
                :type="validationResult.ports.unmapped.length === 0 ? 'success' : 'info'"
              >
                {{ validationResult.ports.mapped.length }}/{{ validationResult.ports.total }} 已映射
              </el-tag>
            </div>
          </template>
          <div class="validation-content">
            <div v-if="validationResult.ports.mapped.length > 0" class="mapped-section">
              <div class="section-label">✓ 已映射：</div>
              <el-space wrap>
                <el-tag
                  v-for="port in validationResult.ports.mapped"
                  :key="port"
                  type="success"
                  size="small"
                >
                  {{ port }}
                </el-tag>
              </el-space>
            </div>
            <div v-if="validationResult.ports.unmapped.length > 0" class="unmapped-section">
              <div class="section-label">✗ 未映射：</div>
              <el-space wrap>
                <el-tag
                  v-for="port in validationResult.ports.unmapped"
                  :key="port"
                  type="info"
                  size="small"
                >
                  {{ port }}
                </el-tag>
              </el-space>
            </div>
          </div>
        </el-card>
      </div>
    </el-card>

    <!-- 导出功能 -->
    <el-card v-if="hasResults" class="export-card">
      <template #header>
        <div class="card-header">
          <span class="section-title">4. 导出数据</span>
        </div>
      </template>

      <el-space wrap>
        <el-button
          type="success"
          :icon="Download"
          @click="exportAsCSV"
        >
          导出为CSV
        </el-button>

        <el-button
          type="primary"
          :icon="Download"
          @click="exportAsSQL"
        >
          导出为SQL
        </el-button>

        <el-button
          v-if="validationResult"
          type="warning"
          :icon="Document"
          @click="exportValidationReport"
        >
          导出验证报告
        </el-button>
      </el-space>

      <el-alert
        title="SQL脚本可用于初始化字典表，CSV文件可用于数据分析和备份"
        type="info"
        :closable="false"
        show-icon
        class="export-hint"
      />
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.dictionary-extractor-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.header-card,
.upload-card,
.summary-card,
.validation-card,
.export-card {
  margin-bottom: 20px;
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

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.description {
  p {
    margin: 0 0 12px 0;
    color: #606266;
  }
}

.upload-area {
  :deep(.el-upload-dragger) {
    padding: 40px;
  }
}

.action-buttons {
  margin-top: 20px;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.stat-card {
  .stat-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  .stat-value {
    font-size: 32px;
    font-weight: 700;
    color: #409eff;
    text-align: center;
    margin: 16px 0;
  }

  .stat-list {
    .stat-tag {
      margin: 4px;
    }
  }
}

.validation-results {
  margin-top: 20px;
}

.validation-item {
  margin-bottom: 16px;

  .validation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }

  .validation-content {
    padding: 16px;
  }

  .mapped-section,
  .unmapped-section {
    margin-bottom: 16px;

    .section-label {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #303133;
    }
  }

  .validation-warning {
    margin-top: 12px;
  }
}

.export-hint {
  margin-top: 16px;
}

:deep(.el-scrollbar) {
  .el-scrollbar__wrap {
    overflow-x: hidden;
  }
}
</style>
