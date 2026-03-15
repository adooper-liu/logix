<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete, Search, Refresh, Upload, Download } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'

// 字典类型
interface DictType {
  value: string
  label: string
  tableName: string
  primaryKey: string
}

// 字段配置
interface FieldConfig {
  field: string
  label: string
  isPrimaryKey: boolean
  isBoolean: boolean
}

// 数据记录
interface DictRecord {
  [key: string]: any
}

// 当前选中的字典类型
const currentDictType = ref('PORT')
const dictTypes = ref<DictType[]>([])

// 字段配置
const fields = ref<FieldConfig[]>([])

// 搜索表单
const searchForm = reactive({
  keyword: ''
})

// 数据表格
const tableData = ref<DictRecord[]>([])
const loading = ref(false)

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 弹窗控制
const dialogVisible = ref(false)
const dialogTitle = ref('新增')
const dialogMode = ref<'create' | 'edit'>('create')

// 表单数据
const formData = reactive<DictRecord>({})

// 导入弹窗
const importDialogVisible = ref(false)
const importLoading = ref(false)
const selectedFile = ref<File | null>(null)
const importResult = reactive({
  success: 0,
  failed: 0,
  errors: [] as string[]
})

// 加载字典类型
const loadDictTypes = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/dict-manage/types`)
    dictTypes.value = response.data?.data || []
  } catch (error: any) {
    ElMessage.error(error?.message || '加载字典类型失败')
  }
}

// 加载字段配置
const loadFields = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/dict-manage/${currentDictType.value}/fields`)
    fields.value = response.data?.data || []
  } catch (error: any) {
    console.error('加载字段配置失败:', error)
  }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword
    }
    const response = await axios.get(`${BASE_URL}/dict-manage/${currentDictType.value}`, { params })
    tableData.value = response.data?.data || []
    pagination.total = response.data?.total || 0
  } catch (error: any) {
    ElMessage.error(error?.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadData()
}

// 重置
const handleReset = () => {
  searchForm.keyword = ''
  pagination.page = 1
  loadData()
}

// 新增
const handleCreate = () => {
  dialogMode.value = 'create'
  dialogTitle.value = `新增${currentDictType.value}`
  // 初始化空表单
  fields.value.forEach(field => {
    if (field.isBoolean) {
      formData[field.field] = false
    } else {
      formData[field.field] = ''
    }
  })
  dialogVisible.value = true
}

// 编辑
const handleEdit = (row: DictRecord) => {
  dialogMode.value = 'edit'
  dialogTitle.value = '编辑'
  // 复制行数据到表单
  Object.keys(row).forEach(key => {
    formData[key] = row[key]
  })
  dialogVisible.value = true
}

// 保存
const handleSave = async () => {
  try {
    // 获取主键字段
    const pkField = fields.value.find(f => f.isPrimaryKey)?.field
    if (!pkField) {
      ElMessage.error('无法获取主键字段')
      return
    }

    // 验证必填字段
    const pkValue = formData[pkField]
    if (dialogMode.value === 'create' && !pkValue) {
      ElMessage.warning(`请填写${fields.value.find(f => f.isPrimaryKey)?.label}`)
      return
    }

    if (dialogMode.value === 'create') {
      await axios.post(`${BASE_URL}/dict-manage/${currentDictType.value}`, formData)
      ElMessage.success('创建成功')
    } else {
      await axios.put(`${BASE_URL}/dict-manage/${currentDictType.value}/${pkValue}`, formData)
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || '操作失败')
  }
}

// 删除
const handleDelete = async (row: DictRecord) => {
  try {
    const pkField = fields.value.find(f => f.isPrimaryKey)?.field
    if (!pkField) return

    const pkValue = row[pkField]
    const label = fields.value.find(f => f.isPrimaryKey)?.label || '记录'

    await ElMessageBox.confirm(`确定要删除该${label}吗？`, '确认删除', {
      type: 'warning'
    })

    await axios.delete(`${BASE_URL}/dict-manage/${currentDictType.value}/${pkValue}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.message || error?.message || '删除失败')
    }
  }
}

// 切换字典类型
const handleDictTypeChange = async (type: string) => {
  currentDictType.value = type
  searchForm.keyword = ''
  pagination.page = 1
  await loadFields()
  await loadData()
}

// 刷新
const handleRefresh = () => {
  loadData()
}

/** Excel 布尔值转为 boolean */
function transformBoolean(value: any): boolean {
  if (value === null || value === undefined || value === '') return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const s = value.toString().toLowerCase().trim()
    if (['是', 'yes', 'true', '1', 'y'].includes(s)) return true
    if (['否', 'no', 'false', '0', 'n'].includes(s)) return false
    return false
  }
  return false
}

// Excel导入
const handleImportClick = () => {
  importResult.success = 0
  importResult.failed = 0
  importResult.errors = []
  importDialogVisible.value = true
}

const handleFileChange = async (uploadFile: any) => {
  if (!uploadFile?.raw) return
  selectedFile.value = uploadFile.raw
  importResult.success = 0
  importResult.failed = 0
  importResult.errors = []
  ElMessage.success(`已选择文件: ${uploadFile.name}，点击"确认导入"按钮开始导入`)
}

// 确认导入
const handleConfirmImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择Excel文件')
    return
  }

  importLoading.value = true
  importResult.errors = []

  try {
    const data = await selectedFile.value.arrayBuffer()
    const workbook = XLSX.read(data)
    const sheetName = workbook.SheetNames[0]
    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])

    if (!jsonData || jsonData.length === 0) {
      ElMessage.warning('Excel文件为空')
      return
    }

    // 验证并导入
    const validRecords: DictRecord[] = []
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any
      const record: DictRecord = {}

      // 转换字段名 - 使用 snake_case 与后端对齐
      fields.value.forEach(field => {
        const snakecase = field.field.replace(/([A-Z])/g, '_$1').toLowerCase()
        const cnLabel = field.label
        const camelCase = field.field
        const upperCase = field.field.toUpperCase()

        let rawValue: any
        if (row[cnLabel] !== undefined) {
          rawValue = row[cnLabel]
        } else if (row[camelCase] !== undefined) {
          rawValue = row[camelCase]
        } else if (row[snakecase] !== undefined) {
          rawValue = row[snakecase]
        } else if (row[upperCase] !== undefined) {
          rawValue = row[upperCase]
        }

        if (rawValue !== undefined && rawValue !== '') {
          // 布尔字段：Excel 常见 "是"/"否"、"1"/"0" 等需转换
          if (field.isBoolean) {
            record[snakecase] = transformBoolean(rawValue)
          } else {
            record[snakecase] = rawValue
          }
        }
      })

      // 自增主键(id)：过滤 "示例值" 或空，不参与校验
      const pkField = fields.value.find(f => f.isPrimaryKey)?.field.replace(/([A-Z])/g, '_$1').toLowerCase()
      const pkValue = record[pkField!]
      if (pkField === 'id' && (pkValue === '示例值' || pkValue === '' || pkValue == null)) {
        delete record.id
      }

      // 检查必填主键（非自增类型必须有主键值）
      if (!pkField) {
        importResult.errors.push(`第${i + 2}行：无法识别主键`)
        importResult.failed++
      } else if (pkField !== 'id' && !record[pkField]) {
        importResult.errors.push(`第${i + 2}行：缺少主键字段`)
        importResult.failed++
      } else if (pkField === 'id' && Object.keys(record).length === 0) {
        importResult.errors.push(`第${i + 2}行：无有效数据`)
        importResult.failed++
      } else {
        validRecords.push(record)
      }
    }

    // 批量导入 - record已经是snake_case格式
    if (validRecords.length > 0) {
      for (const record of validRecords) {
        try {
          await axios.post(`${BASE_URL}/dict-manage/${currentDictType.value}`, record)
          importResult.success++
        } catch (error: any) {
          importResult.failed++
          importResult.errors.push(`导入失败: ${JSON.stringify(record)} - ${error?.response?.data?.message || error?.message}`)
        }
      }
      ElMessage.success(`导入完成: 成功${importResult.success}条, 失败${importResult.failed}条`)
      if (importResult.success > 0) {
        loadData()
      }
    }
  } catch (error: any) {
    ElMessage.error(error?.message || '导入失败')
  } finally {
    importLoading.value = false
  }
}

// 导出模板
const handleExportTemplate = () => {
  const templateData: Record<string, string> = {}
  fields.value.forEach(field => {
    if (!field.isPrimaryKey) {
      templateData[field.label] = ''
    } else if (field.field === 'id') {
      templateData[field.label] = '' // 自增主键留空
    } else {
      templateData[field.label] = '示例值'
    }
  })

  const ws = XLSX.utils.json_to_sheet([templateData])
  const wb = XLSX.utils.book_new()
  const typeLabel = dictTypes.value.find(t => t.value === currentDictType.value)?.label || '数据'
  XLSX.utils.book_append_sheet(wb, ws, typeLabel)
  XLSX.writeFile(wb, `${typeLabel}导入模板.xlsx`)
}

// 获取字段显示标签
const getFieldLabel = (field: string) => {
  return fields.value.find(f => f.field === field)?.label || field
}

// 判断是否为只读字段
const isReadonly = (field: string) => {
  return dialogMode.value === 'edit' && fields.value.find(f => f.field === field)?.isPrimaryKey
}

// 当前字典类型的标签
const currentTypeLabel = computed(() => {
  return dictTypes.value.find(t => t.value === currentDictType.value)?.label || ''
})

// 初始化
onMounted(async () => {
  await loadDictTypes()
  if (dictTypes.value.length > 0) {
    await loadFields()
    await loadData()
  }
})

// 监听字典类型变化
watch(currentDictType, () => {
  // 表单重置
  Object.keys(formData).forEach(key => delete formData[key])
})
</script>

<template>
  <div class="dict-manage-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📚</span>
        字典表管理
      </h1>
    </div>

    <!-- 字典类型选择 -->
    <div class="dict-type-selector">
      <div class="type-label">字典类型：</div>
      <div class="type-tags">
        <el-tag
          v-for="type in dictTypes"
          :key="type.value"
          :type="currentDictType === type.value ? 'primary' : 'info'"
          :effect="currentDictType === type.value ? 'dark' : 'plain'"
          class="type-tag"
          @click="handleDictTypeChange(type.value)"
          clickable
        >
          {{ type.label }}
        </el-tag>
      </div>
    </div>

    <!-- 搜索栏 -->
    <el-card class="search-card" shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索关键词"
            clearable
            style="width: 300px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
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
        <el-table-column
          v-for="field in fields.filter(f => f.field !== 'id' || tableData.some(t => t.id))"
          :key="field.field"
          :prop="field.field"
          :label="field.label"
          :min-width="120"
        >
          <template #default="{ row }">
            <template v-if="field.isBoolean">
              <el-tag :type="row[field.field] ? 'success' : 'info'" size="small">
                {{ row[field.field] ? '是' : '否' }}
              </el-tag>
            </template>
            <template v-else>
              {{ row[field.field] ?? '-' }}
            </template>
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
    <el-dialog v-model="dialogVisible" :title="dialogTitle + currentTypeLabel" width="700px">
      <el-form :model="formData" label-width="120px">
        <el-row :gutter="20">
          <el-col
            v-for="field in fields.filter(f => f.field !== 'id')"
            :key="field.field"
            :span="field.isBoolean ? 24 : 12"
          >
            <el-form-item
              :label="field.label"
              :required="field.isPrimaryKey && dialogMode === 'create'"
            >
              <!-- 布尔类型 -->
              <el-switch
                v-if="field.isBoolean"
                v-model="formData[field.field]"
              />
              <!-- 普通输入框 -->
              <el-input
                v-else
                v-model="formData[field.field]"
                :readonly="isReadonly(field.field)"
                :placeholder="`请输入${field.label}`"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <!-- Excel导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="Excel导入" width="600px">
      <el-upload
        class="upload-demo"
        :auto-upload="false"
        :on-change="handleFileChange"
        :limit="1"
        accept=".xlsx,.xls"
      >
        <el-button type="primary">选择Excel文件</el-button>
        <template #tip>
          <div class="el-upload__tip">支持 .xlsx, .xls 格式，请先下载模板</div>
        </template>
      </el-upload>

      <div v-if="selectedFile" style="margin-top: 12px">
        <el-tag type="info">已选择: {{ selectedFile.name }}</el-tag>
      </div>

      <div v-if="importResult.errors.length > 0" style="margin-top: 16px">
        <el-alert type="error" :closable="false">
          <template #title>
            <div>导入失败: {{ importResult.failed }}条</div>
          </template>
          <div v-for="(err, idx) in importResult.errors.slice(0, 10)" :key="idx" style="font-size: 12px">{{ err }}</div>
        </el-alert>
      </div>

      <div v-if="importResult.success > 0" style="margin-top: 16px">
        <el-alert type="success" :closable="false" :title="`导入成功: ${importResult.success}条`" />
      </div>

      <template #footer>
        <el-button @click="importDialogVisible = false">关闭</el-button>
        <el-button type="primary" :loading="importLoading" @click="handleConfirmImport">
          确认导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.dict-manage-container {
  padding: 16px;
}

.page-header {
  margin-bottom: 20px;

  .page-title {
    font-size: 24px;
    font-weight: 600;
    color: #303133;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;

    .title-icon {
      font-size: 28px;
    }
  }
}

.dict-type-selector {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;

  .type-label {
    font-size: 14px;
    font-weight: 500;
    color: #606266;
    white-space: nowrap;
  }

  .type-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .type-tag {
    cursor: pointer;
    user-select: none;
    padding: 6px 14px;
    font-size: 13px;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.05);
    }
  }
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
  color: #909399;
  font-size: 12px;
}
</style>
