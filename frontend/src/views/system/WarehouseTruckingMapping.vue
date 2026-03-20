<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Search, Refresh, Upload, Download } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'

// ==================== 字典下拉选项 ====================
interface DictOption {
  code: string
  name: string
  country?: string
}

const warehouseOptions = ref<DictOption[]>([])
const truckingCompanyOptions = ref<DictOption[]>([])
const countryOptions = ref<DictOption[]>([])

// 加载字典数据
const loadDictOptions = async () => {
  try {
    const [warehouseRes, truckingRes, overseasRes] = await Promise.all([
      axios.get(`${BASE_URL}/dict/warehouses`),
      axios.get(`${BASE_URL}/dict/trucking-companies`),
      axios.get(`${BASE_URL}/dict/overseas-companies`)
    ])
    warehouseOptions.value = warehouseRes.data?.data || []
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
  } catch (error) {
    console.error('加载字典选项失败:', error)
  }
}

// ==================== 类型定义 ====================
interface WarehouseTruckingRecord {
  id?: number
  country: string
  warehouseCode: string
  warehouseName: string
  truckingCompanyId: string
  truckingCompanyName: string
  mappingType: string
  isDefault: boolean
  isActive: boolean
  remarks: string
  createdAt?: string
  updatedAt?: string
}

// ==================== 响应式数据 ====================
const loading = ref(false)
const tableData = ref<WarehouseTruckingRecord[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 搜索表单
const searchForm = reactive({
  country: '',
  warehouseCode: '',
  truckingCompanyName: ''
})

// 弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('新增映射')
const dialogMode = ref<'create' | 'edit'>('create')

// 表单数据
const formData = reactive<WarehouseTruckingRecord>({
  country: '',
  warehouseCode: '',
  warehouseName: '',
  truckingCompanyId: '',
  truckingCompanyName: '',
  mappingType: 'DEFAULT',
  isDefault: false,
  isActive: true,
  remarks: ''
})

// Excel 导入
const importDialogVisible = ref(false)
const importLoading = ref(false)
const importResult = reactive({
  success: 0,
  failed: 0,
  errors: [] as string[]
})
const pendingImportRecords = ref<WarehouseTruckingRecord[]>([])  // 待导入的数据

// ==================== API方法 ====================
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...searchForm
    }
    const response = await axios.get(`${BASE_URL}/warehouse-trucking-mapping`, { params })
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
  searchForm.warehouseCode = ''
  searchForm.truckingCompanyName = ''
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
    warehouseCode: '',
    warehouseName: '',
    truckingCompanyId: '',
    truckingCompanyName: '',
    mappingType: 'DEFAULT',
    isDefault: false,
    isActive: true,
    remarks: ''
  })
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: WarehouseTruckingRecord) => {
  dialogMode.value = 'edit'
  dialogTitle.value = '编辑映射'
  Object.assign(formData, { ...row })
  dialogVisible.value = true
}

// 保存
const handleSave = async () => {
  try {
    if (dialogMode.value === 'create') {
      await axios.post(`${BASE_URL}/warehouse-trucking-mapping`, formData)
      ElMessage.success('创建成功')
    } else {
      await axios.put(`${BASE_URL}/warehouse-trucking-mapping/${formData.id}`, formData)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error?.message || '操作失败')
  }
}

// 删除
const handleDelete = async (row: WarehouseTruckingRecord) => {
  try {
    await ElMessageBox.confirm('确认删除该映射记录?', '提示', {
      type: 'warning'
    })
    await axios.delete(`${BASE_URL}/warehouse-trucking-mapping/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

// Excel 导入
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

    // 转换数据
    const records: WarehouseTruckingRecord[] = (jsonData as any[]).map((row: any, index: number) => {
      // 支持多种列名变体
      const truckingCompanyId = row['车队代码'] || row['车队.ID'] || row['trucking_company_id'] || row['trucking_company_code'] || ''
      const truckingCompanyName = row['车队'] || row['车队名称'] || row['trucking_company_name'] || row['trucking_company'] || ''
      
      const record = {
        country: row['国家'] || row['country'] || '',
        warehouseCode: row['仓库代码'] || row['warehouse_code'] || row['warehouse.code'] || '',
        warehouseName: row['仓库名称'] || row['warehouse_name'] || row['warehouse.name'] || '',
        truckingCompanyId,
        truckingCompanyName,
        mappingType: 'DEFAULT',
        isDefault: false,
        isActive: true,
        remarks: ''
      }
      
      // 调试：打印前 3 条记录
      if (index < 3) {
        console.log(`[Excel 解析] 第${index + 1}条记录:`, record)
      }
      
      return record
    })

    // 验证必填字段
    const validRecords: WarehouseTruckingRecord[] = []
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      if (!record.country || !record.warehouseCode || !record.truckingCompanyName) {
        importResult.errors.push(`第${i + 2}行数据不完整：国家=${record.country}, 仓库代码=${record.warehouseCode}, 车队=${record.truckingCompanyName}`)
        importResult.failed++
      } else {
        validRecords.push(record)
      }
    }

    // 存储待导入的数据，等待用户确认
    pendingImportRecords.value = validRecords
    
    // 显示预览信息，但不自动导入
    if (validRecords.length > 0 && importResult.errors.length === 0) {
      ElMessage.info(`已读取 ${validRecords.length}条有效数据，请点击"确认导入"按钮`)
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '导入失败')
  } finally {
    importLoading.value = false
  }
}

// 确认导入
const confirmImport = async () => {
  if (!pendingImportRecords.value || pendingImportRecords.value.length === 0) {
    ElMessage.warning('没有可导入的数据')
    return
  }

  try {
    importLoading.value = true
    
    // 先处理车队：确保所有车队都存在于 dict_trucking_companies
    const uniqueTruckingCompanies = new Map<string, { name: string; country?: string }>()
    pendingImportRecords.value.forEach((record: WarehouseTruckingRecord) => {
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
      pendingImportRecords.value.forEach((record: WarehouseTruckingRecord) => {
        if (record.truckingCompanyName && companyCodeMap.has(record.truckingCompanyName)) {
          record.truckingCompanyId = companyCodeMap.get(record.truckingCompanyName) || ''
        }
      })
      
      console.log('[导入] 已更新所有映射记录的车队代码')
    }
    
    // 现在导入映射关系
    console.log('[导入] 开始导入仓库 - 车队映射，数量:', pendingImportRecords.value.length)
    console.log('[导入] 第一条数据:', pendingImportRecords.value[0])
    
    const response = await axios.post(`${BASE_URL}/warehouse-trucking-mapping/batch`, pendingImportRecords.value)
    console.log('[导入] 后端响应:', response.data)
    importResult.success = pendingImportRecords.value.length
    ElMessage.success(`导入成功：${pendingImportRecords.value.length}条`)
    loadData()
    importDialogVisible.value = false
    pendingImportRecords.value = []
  } catch (error: any) {
    ElMessage.error(error?.message || '导入失败')
  } finally {
    importLoading.value = false
  }
}

// 导出模板
const handleExportTemplate = () => {
  const templateData = [
    { '国家': 'AOSOM CANADA INC.', '仓库.代码': 'CA-S003', '仓库.仓库名称': 'Oshawa', '车队': 'S AND R TRUCKING' }
  ]
  const ws = XLSX.utils.json_to_sheet(templateData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '仓库-车队映射')
  XLSX.writeFile(wb, '仓库车队映射导入模板.xlsx')
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
          <el-select v-model="searchForm.country" placeholder="请选择" clearable style="width: 180px" filterable>
            <el-option v-for="item in countryOptions" :key="item.code" :label="item.name" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库代码">
          <el-input v-model="searchForm.warehouseCode" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="车队">
          <el-input v-model="searchForm.truckingCompanyName" placeholder="请输入" clearable style="width: 150px" />
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
        <el-table-column prop="country" label="国家" min-width="120" />
        <el-table-column prop="warehouse_code" label="仓库代码" min-width="100" />
        <el-table-column prop="warehouse_name" label="仓库名称" min-width="120" />
        <el-table-column prop="trucking_company_id" label="车队ID" min-width="100" />
        <el-table-column prop="trucking_company_name" label="车队名称" min-width="150" />
        <el-table-column prop="mapping_type" label="映射类型" width="100" />
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
        <el-table-column label="操作" width="150" fixed="right">
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
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form :model="formData" label-width="100px">
        <el-form-item label="国家" required>
          <el-select v-model="formData.country" placeholder="请选择" style="width: 100%" filterable>
            <el-option v-for="item in countryOptions" :key="item.code" :label="item.name" :value="item.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库" required>
          <el-select 
            v-model="formData.warehouseCode" 
            placeholder="请选择仓库" 
            style="width: 100%"
            filterable
            @change="(val: string) => {
              const warehouse = warehouseOptions.find(w => w.code === val)
              if (warehouse) {
                formData.warehouseName = warehouse.name
              }
            }"
          >
            <el-option 
              v-for="item in warehouseOptions" 
              :key="item.code" 
              :label="`${item.name} (${item.code})`" 
              :value="item.code" 
            />
          </el-select>
        </el-form-item>
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
        <el-form-item label="映射类型">
          <el-input v-model="formData.mappingType" />
        </el-form-item>
        <el-form-item label="默认映射">
          <el-switch v-model="formData.isDefault" />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="formData.isActive" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="formData.remarks" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <!-- Excel导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="Excel导入" width="500px">
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

      <div v-if="importResult.errors.length > 0" style="margin-top: 16px">
        <el-alert type="error" :closable="false">
          <template #title>
            <div>导入失败: {{ importResult.failed }}条</div>
          </template>
          <div v-for="(err, idx) in importResult.errors.slice(0, 5)" :key="idx">{{ err }}</div>
        </el-alert>
      </div>

      <div v-if="importResult.success > 0" style="margin-top: 16px">
        <el-alert type="success" :closable="false" :title="`导入成功: ${importResult.success}条`" />
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false" :disabled="importLoading">关闭</el-button>
        <el-button 
          type="primary" 
          @click="confirmImport" 
          :loading="importLoading"
          :disabled="pendingImportRecords.length === 0"
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
