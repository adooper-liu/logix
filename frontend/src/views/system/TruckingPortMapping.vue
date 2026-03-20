<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, Upload, Download } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'

// ==================== 字典下拉选项 ====================
interface DictOption {
  code: string
  name: string
  country?: string
}

const portOptions = ref<DictOption[]>([])
const truckingCompanyOptions = ref<DictOption[]>([])
const countryOptions = ref<DictOption[]>([])

// 加载字典数据
const loadDictOptions = async () => {
  try {
    const [portRes, truckingRes, overseasRes] = await Promise.all([
      axios.get(`${BASE_URL}/dict/ports`),
      axios.get(`${BASE_URL}/dict/trucking-companies`),
      axios.get(`${BASE_URL}/dict/overseas-companies`)
    ])
    portOptions.value = portRes.data?.data || []
    truckingCompanyOptions.value = truckingRes.data?.data || []
    // 国家使用海外公司列表
    const overseasData = overseasRes.data?.data || []
    // 按国家去重
    const countryMap = new Map<string, string>()
    overseasData.forEach((item: DictOption) => {
      if (item.country && !countryMap.has(item.country)) {
        countryMap.set(item.country, item.country)
      }
    })
    countryOptions.value = Array.from(countryMap.entries()).map(([code, name]) => ({ code, name }))
    console.log('港口选项:', portOptions.value.length)
    console.log('车队选项:', truckingCompanyOptions.value.length)
    console.log('国家选项:', countryOptions.value.length)
  } catch (error) {
    console.error('加载字典选项失败:', error)
  }
}

// ==================== 类型定义 ====================
interface TruckingPortRecord {
  id?: number
  country: string
  truckingCompanyId: string
  truckingCompanyName: string
  portCode: string
  portName: string
  yardCapacity: number
  standardRate: number
  unit: string
  yardOperationFee: number
  mappingType: string
  isDefault: boolean
  isActive: boolean
  remarks: string
  createdAt?: string
  updatedAt?: string
}

// ==================== 响应式数据 ====================
const loading = ref(false)
const tableData = ref<TruckingPortRecord[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 搜索表单
const searchForm = reactive({
  country: '',
  truckingCompanyName: '',
  portName: ''
})

// 弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('新增映射')
const dialogMode = ref<'create' | 'edit'>('create')

// 表单数据
const formData = reactive<TruckingPortRecord>({
  country: '',
  truckingCompanyId: '',
  truckingCompanyName: '',
  portCode: '',
  portName: '',
  yardCapacity: 0,
  standardRate: 0,
  unit: '',
  yardOperationFee: 0,
  mappingType: 'DEFAULT',
  isDefault: false,
  isActive: true,
  remarks: ''
})

// Excel 导入
const importDialogVisible = ref(false)
const importLoading = ref(false)
const parsedRecords = ref<TruckingPortRecord[]>([])
const importResult = reactive({
  success: 0,
  failed: 0,
  errors: [] as string[]
})

// ==================== API方法 ====================
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...searchForm
    }
    const response = await axios.get(`${BASE_URL}/trucking-port-mapping`, { params })
    tableData.value = response.data?.data || []
    pagination.total = response.data?.total || 0
  } catch (error: any) {
    ElMessage.error(error?.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  searchForm.country = ''
  searchForm.truckingCompanyName = ''
  searchForm.portName = ''
  pagination.page = 1
  loadData()
}

// 新增
const handleCreate = () => {
  dialogMode.value = 'create'
  dialogTitle.value = '新增映射'
  Object.assign(formData, {
    id: undefined,
    country: '',
    truckingCompanyId: '',
    truckingCompanyName: '',
    portCode: '',
    portName: '',
    yardCapacity: 0,
    standardRate: 0,
    unit: '',
    yardOperationFee: 0,
    mappingType: 'DEFAULT',
    isDefault: false,
    isActive: true,
    remarks: ''
  })
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: TruckingPortRecord) => {
  dialogMode.value = 'edit'
  dialogTitle.value = '编辑映射'
  Object.assign(formData, { ...row })
  dialogVisible.value = true
}

// 保存
const handleSave = async () => {
  try {
    if (dialogMode.value === 'create') {
      await axios.post(`${BASE_URL}/trucking-port-mapping`, formData)
      ElMessage.success('创建成功')
    } else {
      await axios.put(`${BASE_URL}/trucking-port-mapping/${formData.id}`, formData)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error?.message || '操作失败')
  }
}

// 删除
const handleDelete = async (row: TruckingPortRecord) => {
  try {
    await ElMessageBox.confirm('确认删除该映射记录?', '提示', {
      type: 'warning'
    })
    await axios.delete(`${BASE_URL}/trucking-port-mapping/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

// Excel导入
const handleImportClick = () => {
  importResult.success = 0
  importResult.failed = 0
  importResult.errors = []
  importDialogVisible.value = true
}

const handleFileChange = async (file: any) => {
  // Element Plus Upload 组件传递的是 file 对象，不是 Event
  if (!file || !file.raw) return
  
  const rawFile = file.raw as File
  if (!rawFile) return

  importLoading.value = true
  importResult.errors = []

  try {
    const data = await rawFile.arrayBuffer()
    const workbook = XLSX.read(data)
    const sheetName = workbook.SheetNames[0]
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])

    if (!jsonData || jsonData.length === 0) {
      ElMessage.warning('Excel 文件为空')
      return
    }

    // 打印第一行数据的键，用于调试
    console.log('Excel 列名:', Object.keys(jsonData[0] as object))
    console.log('第一行数据:', jsonData[0])

    // 转换数据 - 支持多种列名变体
    const records: TruckingPortRecord[] = (jsonData as any[]).map((row: any) => {
      // 支持多种列名变体
      const truckingCompanyId = row['车队代码'] || row['车队.ID'] || row['trucking_company_id'] || row['trucking_company_code'] || ''
      const truckingCompanyName = row['车队名称'] || row['车队'] || row['trucking_company_name'] || row['trucking_company'] || ''
      const portCode = row['港口代码'] || row['港口.ID'] || row['port_code'] || ''
      const portName = row['港口名称'] || row['港口'] || row['port_name'] || ''
      const country = row['国家'] || row['country'] || ''
      
      return {
        country: country?.trim() || '',
        truckingCompanyId: truckingCompanyId?.trim() || '',
        truckingCompanyName: truckingCompanyName?.trim() || '',
        portCode: portCode?.trim() || '',
        portName: portName?.trim() || '',
        yardCapacity: parseFloat(row['堆场容量'] || row['yard_capacity'] || '0') || 0,
        standardRate: parseFloat(row['收费标准'] || row['standard_rate'] || '0') || 0,
        unit: row['单位'] || row['unit'] || '',
        yardOperationFee: parseFloat(row['堆场操作费'] || row['yard_operation_fee'] || '0') || 0,
        mappingType: row['映射类型'] || row['mapping_type'] || 'DEFAULT',
        isDefault: row['默认'] === 'Y' || row['is_default'] === true || false,
        isActive: row['启用'] !== 'N' && row['is_active'] !== false,
        remarks: row['备注'] || row['remarks'] || ''
      }
    })

    // 验证必填字段
    const validRecords: TruckingPortRecord[] = []
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      
      // 检查必填字段
      if (!record.country) {
        importResult.errors.push(`第${i + 2}行：缺少国家`)
        importResult.failed++
        continue
      }
      if (!record.truckingCompanyName) {
        importResult.errors.push(`第${i + 2}行：缺少车队名称`)
        importResult.failed++
        continue
      }
      if (!record.portName) {
        importResult.errors.push(`第${i + 2}行：缺少港口名称`)
        importResult.failed++
        continue
      }
      
      validRecords.push(record)
    }

    // 存储待导入的数据，等待用户确认
    parsedRecords.value = validRecords
    
    // 显示预览信息
    if (validRecords.length > 0 && importResult.errors.length === 0) {
      ElMessage.success(`已读取 ${validRecords.length}条有效数据，请点击"确认导入"按钮`)
    } else if (importResult.errors.length > 0) {
      ElMessage.warning(`读取完成：${validRecords.length}条有效，${importResult.failed}条失败`)
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '导入失败')
  } finally {
    importLoading.value = false
  }
}

// 确认导入
const confirmImport = async () => {
  if (!parsedRecords.value || parsedRecords.value.length === 0) {
    ElMessage.warning('没有可导入的数据')
    return
  }

  try {
    importLoading.value = true
    
    // 先处理车队：确保所有车队都存在于 dict_trucking_companies
    const uniqueTruckingCompanies = new Map<string, { name: string; country?: string }>()
    parsedRecords.value.forEach((record: TruckingPortRecord) => {
      if (record.truckingCompanyName && !uniqueTruckingCompanies.has(record.truckingCompanyName)) {
        uniqueTruckingCompanies.set(record.truckingCompanyName, {
          name: record.truckingCompanyName,
          country: record.country
        })
      }
    })
    
    // 批量创建/更新车队 - 使用 dict-manage/TRUCKING_COMPANY 接口
    if (uniqueTruckingCompanies.size > 0) {
      const truckingCompaniesData = Array.from(uniqueTruckingCompanies.entries()).map(([name, data]) => ({
        companyCode: name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50), // 生成公司代码
        companyName: name,
        companyNameEn: name, // 暂时使用相同名称
        country: data.country,
        status: 'ACTIVE',
        isActive: true
      }))
      
      // 逐个创建或更新车队
      console.log('[导入] 开始处理车队，数量:', truckingCompaniesData.length)
      let createdCount = 0
      let updatedCount = 0
      
      for (const company of truckingCompaniesData) {
        try {
          // 先尝试创建
          await axios.post(`${BASE_URL}/dict-manage/TRUCKING_COMPANY`, company)
          console.log('[导入] ✓ 车队创建成功:', company.companyName, '代码:', company.companyCode)
          createdCount++
        } catch (error: any) {
          if (error?.response?.status === 400) {
            // 已存在，尝试更新
            try {
              await axios.put(`${BASE_URL}/dict-manage/TRUCKING_COMPANY/${encodeURIComponent(company.companyCode)}`, {
                companyName: company.companyName,
                companyNameEn: company.companyNameEn,
                country: company.country,
                status: company.status,
                isActive: company.isActive
              })
              console.log('[导入] ~ 车队已存在并更新:', company.companyName, '代码:', company.companyCode)
              updatedCount++
            } catch (updateError: any) {
              console.warn('[导入] 更新车队失败:', company.companyName, updateError?.message)
            }
          } else {
            console.warn('[导入] 创建车队失败:', company.companyName, error?.message)
            if (error?.response?.data?.message) {
              console.warn('[导入] 错误详情:', error.response.data.message)
            }
          }
        }
      }
      
      console.log('[导入] 车队处理完成：新建', createdCount, '个，更新', updatedCount, '个')
      
      // ⭐ 关键：用车队代码更新所有映射记录的 truckingCompanyId
      const companyCodeMap = new Map<string, string>()
      for (const [name, data] of uniqueTruckingCompanies.entries()) {
        const code = name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
        companyCodeMap.set(name, code)
      }
      
      // 更新所有映射记录
      parsedRecords.value.forEach((record: TruckingPortRecord) => {
        if (record.truckingCompanyName && companyCodeMap.has(record.truckingCompanyName)) {
          record.truckingCompanyId = companyCodeMap.get(record.truckingCompanyName) || ''
        }
      })
      
      console.log('[导入] 已更新所有映射记录的车队代码')
    }
    
    // 现在导入映射关系
    console.log('[导入] 开始导入映射关系，数量:', parsedRecords.value.length)
    console.log('[导入] 第一条映射数据:', parsedRecords.value[0])
    
    const response = await axios.post(`${BASE_URL}/trucking-port-mapping/batch`, parsedRecords.value)
    console.log('[导入] 映射关系导入响应:', response.data)
    
    importResult.success = parsedRecords.value.length
    ElMessage.success(`导入成功：${parsedRecords.value.length}条`)
    loadData()
    importDialogVisible.value = false
    parsedRecords.value = []
  } catch (error: any) {
    ElMessage.error(error?.message || '导入失败')
  } finally {
    importLoading.value = false
  }
}

// 导出模板
const handleExportTemplate = () => {
  const templateData = [
    { 
      '国家': 'US', 
      '车队代码': 'LFT001',
      '车队名称': 'LFT TRANSPORTATION INC', 
      '港口代码': 'USSTA',
      '港口名称': '斯塔滕岛', 
      '堆场容量': 0, 
      '收费标准': 50, 
      '单位': 'USD', 
      '堆场操作费': 0,
      '映射类型': 'DEFAULT',
      '默认': 'Y',
      '启用': 'Y',
      '备注': ''
    },
    { 
      '国家': 'CA', 
      '车队代码': 'SAR001',
      '车队名称': 'S AND R TRUCKING', 
      '港口代码': 'CAVAN',
      '港口名称': '多伦多', 
      '堆场容量': 300, 
      '收费标准': 60, 
      '单位': 'CAD', 
      '堆场操作费': 0,
      '映射类型': 'DEFAULT',
      '默认': 'Y',
      '启用': 'Y',
      '备注': ''
    }
  ]
  const ws = XLSX.utils.json_to_sheet(templateData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '车队 - 港口映射')
  XLSX.writeFile(wb, '车队港口映射导入模板.xlsx')
}

// 生命周期
onMounted(() => {
  loadDictOptions()
  loadData()
})
</script>

<template>
  <div class="mapping-container">
    <!-- 搜索区域 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="国家">
          <el-select v-model="searchForm.country" placeholder="请选择" clearable style="width: 150px">
            <el-option v-for="item in countryOptions" :key="item.code" :label="item.name" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="车队">
          <el-input v-model="searchForm.truckingCompanyName" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="港口">
          <el-input v-model="searchForm.portName" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作栏 -->
    <div class="toolbar">
      <el-button type="primary" :icon="Plus" @click="handleCreate">新增</el-button>
      <el-button type="success" :icon="Upload" @click="handleImportClick">Excel导入</el-button>
      <el-button :icon="Download" @click="handleExportTemplate">下载模板</el-button>
    </div>

    <!-- 数据表格 -->
    <el-card shadow="never">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="country" label="国家" width="80" />
        <el-table-column prop="trucking_company_id" label="车队ID" width="100" />
        <el-table-column prop="trucking_company_name" label="车队名称" min-width="180" />
        <el-table-column prop="port_code" label="港口代码" width="100" />
        <el-table-column prop="port_name" label="港口" min-width="120" />
        <el-table-column prop="yard_capacity" label="堆场容量" width="90" align="right" />
        <el-table-column prop="standard_rate" label="收费标准" width="90" align="right" />
        <el-table-column prop="unit" label="单位" width="60" />
        <el-table-column prop="yard_operation_fee" label="堆场操作费" width="100" align="right" />
        <el-table-column prop="is_default" label="默认" width="60">
          <template #default="{ row }">
            <el-tag :type="row.is_default ? 'success' : 'info'" size="small">{{ row.is_default ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" width="60">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">{{ row.is_active ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @change="loadData"
        style="margin-top: 16px; justify-content: flex-end"
      />
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px">
      <el-form :model="formData" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="国家" required>
              <el-select v-model="formData.country" placeholder="请选择" style="width: 100%" filterable>
                <el-option v-for="item in countryOptions" :key="item.code" :label="item.name" :value="item.code" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="车队" required>
              <el-select 
                v-model="formData.truckingCompanyId" 
                placeholder="请选择车队" 
                style="width: 100%"
                filterable
                @change="(val: string) => {
                  const trucking = truckingCompanyOptions.find(t => t.code === val)
                  if (trucking) {
                    formData.truckingCompanyName = trucking.name
                  }
                }"
              >
                <el-option 
                  v-for="item in truckingCompanyOptions" 
                  :key="item.code" 
                  :label="`${item.name} (${item.code})`" 
                  :value="item.code" 
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="港口" required>
              <el-select 
                v-model="formData.portCode" 
                placeholder="请选择港口" 
                style="width: 100%"
                filterable
                @change="(val: string) => {
                  const port = portOptions.find(p => p.code === val)
                  if (port) {
                    formData.portName = port.name
                  }
                }"
              >
                <el-option 
                  v-for="item in portOptions" 
                  :key="item.code" 
                  :label="`${item.name} (${item.code})`" 
                  :value="item.code" 
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="堆场容量">
              <el-input-number v-model="formData.yardCapacity" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="收费标准">
              <el-input-number v-model="formData.standardRate" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="单位">
              <el-input v-model="formData.unit" placeholder="如: USD/柜" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="堆场操作费">
              <el-input-number v-model="formData.yardOperationFee" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="默认映射">
              <el-switch v-model="formData.isDefault" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="启用状态">
              <el-switch v-model="formData.isActive" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="formData.remarks" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <!-- Excel 导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="Excel 导入" width="700px">
      <el-alert 
        type="info" 
        :closable="false" 
        style="margin-bottom: 16px"
      >
        <template #title>
          <div>支持的列名格式：</div>
          <ul style="margin: 8px 0 0 20px; padding: 0;">
            <li>必填字段：国家、车队名称、港口名称</li>
            <li>可选字段：车队代码、港口代码、堆场容量、收费标准、单位、堆场操作费、映射类型、默认、启用、备注</li>
            <li>默认值：映射类型=DEFAULT，默认=Y，启用=Y</li>
            <li>注意：缺少必填字段的行将被跳过</li>
          </ul>
        </template>
      </el-alert>
      <el-upload
        class="upload-demo"
        :auto-upload="false"
        :on-change="handleFileChange"
        :limit="1"
        accept=".xlsx,.xls"
      >
        <el-button type="primary">选择Excel文件</el-button>
        <template #tip>
          <div class="el-upload__tip">支持 .xlsx, .xls 格式</div>
        </template>
      </el-upload>

      <div v-if="importResult.errors.length > 0" style="margin-top: 16px; max-height: 300px; overflow-y: auto;">
        <el-alert type="error" :closable="false">
          <template #title>
            <div>验证失败：{{ importResult.failed }}条</div>
          </template>
          <div v-for="(err, idx) in importResult.errors" :key="idx" style="margin-bottom: 4px;">{{ err }}</div>
        </el-alert>
      </div>

      <div v-if="importResult.success > 0" style="margin-top: 16px">
        <el-alert type="success" :closable="false" :title="`导入成功: ${importResult.success}条`" />
      </div>

      <div v-if="parsedRecords.length > 0 && importResult.errors.length === 0" style="margin-top: 16px">
        <el-alert 
          type="success" 
          :closable="false" 
          :title="`已读取 ${parsedRecords.length}条有效数据`"
          show-icon
        />
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false">关闭</el-button>
        <el-button 
          type="primary" 
          @click="confirmImport" 
          :disabled="!parsedRecords.length || importResult.errors.length > 0"
          :loading="importLoading"
        >
          确认导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.mapping-container {
  padding: 16px;
}

.search-card {
  margin-bottom: 16px;
}

.toolbar {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}

.el-upload__tip {
  margin-top: 8px;
  color: #999;
}
</style>
