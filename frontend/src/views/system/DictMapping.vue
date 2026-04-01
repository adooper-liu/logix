<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete, Refresh, DocumentCopy } from '@element-plus/icons-vue'
import { universalDictMappingService } from '@/services/universalDictMapping'

// 字典类型定义
const dictTypes = [
  { label: '港口', value: 'PORT', icon: '🚢' },
  { label: '国家', value: 'COUNTRY', icon: '🌍' },
  { label: '船公司', value: 'SHIPPING_COMPANY', icon: '🚢' },
  { label: '柜型', value: 'CONTAINER_TYPE', icon: '📦' },
  { label: '货代公司', value: 'FREIGHT_FORWARDER', icon: '🚚' },
  { label: '清关公司', value: 'CUSTOMS_BROKER', icon: '📋' },
  { label: '拖车公司', value: 'TRUCKING_COMPANY', icon: '🚛' },
  { label: '仓库', value: 'WAREHOUSE', icon: '🏭' },
  { label: '客户', value: 'CUSTOMER', icon: '👤' },
]

// 当前选中的字典类型
const currentDictType = ref('PORT')

// 搜索表单
const searchForm = reactive({
  keyword: '',
})

// 数据表格
const tableData = ref<any[]>([])
const loading = ref(false)

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

// 弹窗控制
const dialogVisible = ref(false)
const dialogTitle = ref('新增映射')
const dialogMode = ref('create') // create | edit
const formData = reactive({
  dict_type: 'PORT',
  target_table: '',
  target_field: '',
  standard_code: '',
  name_cn: '',
  name_en: '',
  aliases: '',
  is_active: true,
})

// 测试查询弹窗
const testDialogVisible = ref(false)
const testName = ref('')
const testResult = ref('')

// 加载数据（后端返回 { success, data: rows[], total }）
const loadData = async () => {
  loading.value = true
  try {
    const response: any = await universalDictMappingService.getMappingsByType(currentDictType.value)
    const rows = response?.data?.data ?? response?.data
    tableData.value = Array.isArray(rows) ? rows : []
    pagination.total = response?.data?.total ?? response?.total ?? tableData.value.length
  } catch (error: any) {
    ElMessage.error(error?.message || '加载映射数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = async () => {
  if (!searchForm.keyword) {
    await loadData()
    return
  }

  loading.value = true
  try {
    const response: any = await universalDictMappingService.searchMappings(
      currentDictType.value,
      searchForm.keyword
    )
    const rows = response?.data?.data ?? response?.data
    tableData.value = Array.isArray(rows) ? rows : []
    pagination.total = response?.data?.total ?? response?.total ?? tableData.value.length
  } catch (error: any) {
    ElMessage.error(error?.message || '搜索失败')
  } finally {
    loading.value = false
  }
}

// 重置搜索
const handleReset = () => {
  searchForm.keyword = ''
  loadData()
}

// 新增映射
const handleAdd = () => {
  dialogMode.value = 'create'
  dialogTitle.value = '新增映射'
  Object.assign(formData, {
    dict_type: currentDictType.value,
    target_table: getTargetTable(currentDictType.value),
    target_field: getTargetField(currentDictType.value),
    standard_code: '',
    name_cn: '',
    name_en: '',
    aliases: '',
    is_active: true,
  })
  dialogVisible.value = true
}

// 编辑映射
const handleEdit = (row: any) => {
  dialogMode.value = 'edit'
  dialogTitle.value = '编辑映射'
  const aliasesStr = Array.isArray(row.aliases)
    ? row.aliases.join(', ')
    : row.aliases
      ? String(row.aliases).trim()
      : ''
  Object.assign(formData, {
    dict_type: row.dict_type,
    target_table: row.target_table,
    target_field: row.target_field,
    standard_code: row.standard_code,
    name_cn: row.name_cn,
    name_en: row.name_en,
    aliases: aliasesStr,
    is_active: row.is_active,
  })
  dialogVisible.value = true
}

// 删除映射
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除映射 "${row.name_cn}" (${row.standard_code}) 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const result = await universalDictMappingService.deleteMapping(row.id)
    if (result?.success === false) {
      ElMessage.error(result?.error || '删除失败')
      return
    }
    ElMessage.success('删除成功')
    await loadData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

// 保存映射
const handleSave = async () => {
  if (!formData.standard_code || !formData.name_cn) {
    ElMessage.warning('请填写标准代码和中文名称')
    return
  }

  // 处理别名
  const aliasesArray = formData.aliases
    .split(',')
    .map((s: string) => s.trim())
    .filter((s: string) => s)

  try {
    let result: any
    if (dialogMode.value === 'create') {
      result = await universalDictMappingService.addMapping({
        dict_type: formData.dict_type,
        target_table: formData.target_table,
        target_field: formData.target_field,
        standard_code: formData.standard_code,
        name_cn: formData.name_cn,
        name_en: formData.name_en,
        aliases: aliasesArray,
        is_active: formData.is_active,
      })
    } else {
      result = await universalDictMappingService.updateMapping(rowId.value!, {
        standard_code: formData.standard_code,
        name_cn: formData.name_cn,
        name_en: formData.name_en,
        aliases: aliasesArray,
        is_active: formData.is_active,
      })
    }
    if (result?.success === false) {
      ElMessage.error(result?.error || '保存失败')
      return
    }
    ElMessage.success(dialogMode.value === 'create' ? '添加成功' : '更新成功')
    dialogVisible.value = false
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.message || '保存失败')
  }
}

// 获取目标表名
const getTargetTable = (dictType: string) => {
  const tableMap: Record<string, string> = {
    PORT: 'dict_ports',
    COUNTRY: 'dict_countries',
    SHIPPING_COMPANY: 'dict_shipping_companies',
    CONTAINER_TYPE: 'dict_container_types',
    FREIGHT_FORWARDER: 'dict_freight_forwarders',
    CUSTOMS_BROKER: 'dict_customs_brokers',
    TRUCKING_COMPANY: 'dict_trucking_companies',
    WAREHOUSE: 'dict_warehouses',
    CUSTOMER: 'biz_customers',
  }
  return tableMap[dictType] || ''
}

// 获取目标字段名
const getTargetField = (dictType: string) => {
  const fieldMap: Record<string, string> = {
    PORT: 'port_code',
    COUNTRY: 'country_code',
    SHIPPING_COMPANY: 'company_code',
    CONTAINER_TYPE: 'container_type_code',
    FREIGHT_FORWARDER: 'company_code',
    CUSTOMS_BROKER: 'company_code',
    TRUCKING_COMPANY: 'company_code',
    WAREHOUSE: 'warehouse_code',
    CUSTOMER: 'customer_code',
  }
  return fieldMap[dictType] || ''
}

// 复制映射
const handleCopy = (row: any) => {
  const aliasesStr = Array.isArray(row.aliases) ? row.aliases.join(', ') : row.aliases || ''
  const text = `${row.name_cn} (${row.name_en}) = ${row.standard_code}${aliasesStr ? `\n别名: ${aliasesStr}` : ''}`
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  })
}

// 测试查询
const handleTest = () => {
  testDialogVisible.value = true
  testName.value = ''
  testResult.value = ''
}

// 执行测试查询
const executeTest = async () => {
  if (!testName.value) {
    ElMessage.warning('请输入测试名称')
    return
  }

  try {
    testResult.value = '查询中...'
    const code = await universalDictMappingService.getStandardCodeCached(
      currentDictType.value,
      testName.value
    )
    if (code) {
      testResult.value = `✅ 查询成功: "${testName.value}" -> "${code}"`
    } else {
      testResult.value = `❌ 未找到映射: "${testName.value}"`
    }
  } catch (error: any) {
    testResult.value = `❌ 查询失败: ${error.message}`
  }
}

// 清除前端缓存
const handleClearCache = () => {
  universalDictMappingService.clearCache()
  ElMessage.success('缓存已清除')
}

// 切换字典类型
const handleDictTypeChange = async (type: string) => {
  currentDictType.value = type
  searchForm.keyword = ''
  await loadData()
}

// 当前编辑的行ID
const rowId = computed(() => {
  const currentRow = tableData.value.find(
    row => row.standard_code === formData.standard_code && row.dict_type === formData.dict_type
  )
  return currentRow?.id
})

// 统计信息
const stats = ref({
  total: 0,
  active: 0,
  inactive: 0,
  byType: {} as Record<string, number>,
})

// 加载统计信息（后端返回 { success, data: { summary, by_type } }）
const loadStats = async () => {
  try {
    const response: any = await universalDictMappingService.getStats()
    const d = response?.data
    const summary = d?.summary || {}
    const byTypeList = d?.by_type || []
    const total = Number(summary.total_mappings) || 0
    const active = Number(summary.active_mappings) || 0
    const byType: Record<string, number> = {}
    byTypeList.forEach((row: any) => {
      if (row?.dict_type != null) byType[row.dict_type] = Number(row.total_count) || 0
    })
    stats.value = {
      total,
      active,
      inactive: total - active,
      byType,
    }
  } catch (error: any) {
    console.error('加载统计信息失败:', error)
  }
}

// 刷新
const handleRefresh = async () => {
  await Promise.all([loadData(), loadStats()])
}

onMounted(() => {
  loadData()
  loadStats()
})
</script>

<template>
  <div class="dict-mapping-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon">📚</span>
        通用字典映射管理
      </h1>
      <div class="header-actions">
        <el-button @click="handleTest" :icon="Search" plain>测试查询</el-button>
        <el-button @click="handleClearCache" :icon="Refresh" plain>清除缓存</el-button>
        <el-button @click="handleRefresh" :icon="Refresh">刷新</el-button>
      </div>
    </div>

    <!-- 映射示例与操作说明 -->
    <el-collapse class="help-collapse">
      <el-collapse-item name="help">
        <template #title>
          <span class="help-title">
            <span class="help-icon">📖</span>
            映射示例与操作说明
          </span>
        </template>
        <div class="help-content">
          <section class="help-section">
            <h4>一、映射示例</h4>
            <p>
              映射用于把「中文名称、别名、旧代码」对应到系统内的<strong>标准代码</strong>，便于
              Excel 导入、查询时自动识别。
            </p>
            <div class="example-table-wrap">
              <table class="help-example-table">
                <thead>
                  <tr>
                    <th>字典类型</th>
                    <th>中文名称 / 别名</th>
                    <th>标准代码（需与字典表一致）</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>港口 PORT</td>
                    <td>青岛、青島、Qingdao</td>
                    <td>CNQIN</td>
                    <td>导入时写「青岛」会转为 CNQIN 写入目的港等字段</td>
                  </tr>
                  <tr>
                    <td>国家 COUNTRY</td>
                    <td>中国、China、CN</td>
                    <td>CN</td>
                    <td>与 dict_countries 等表的标准代码一致</td>
                  </tr>
                  <tr>
                    <td>船公司 SHIPPING_COMPANY</td>
                    <td>马士基、MAERSK</td>
                    <td>MAEU</td>
                    <td>标准代码来自 dict_shipping_companies</td>
                  </tr>
                  <tr>
                    <td>柜型 CONTAINER_TYPE</td>
                    <td>40尺高柜、40HC</td>
                    <td>40HC</td>
                    <td>与 dict_container_types 一致</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section class="help-section">
            <h4>二、操作说明</h4>
            <ol class="help-steps">
              <li><strong>选择字典类型</strong>：上方标签切换港口、国家、船公司等。</li>
              <li>
                <strong>新增映射</strong
                >：点击「新增映射」，填写<strong>标准代码</strong>、<strong>中文名称</strong>（必填）；英文名称、别名可选，别名多个用英文逗号分隔。
              </li>
              <li>
                <strong>标准代码</strong>：必须与对应字典表（如
                dict_ports.port_code）中已有代码一致，否则导入/查询无法关联。
              </li>
              <li><strong>编辑 / 删除</strong>：表格右侧操作列可编辑或删除该条映射。</li>
              <li>
                <strong>测试查询</strong
                >：点击顶部「测试查询」，输入名称可检查是否能解析到标准代码。
              </li>
            </ol>
          </section>
          <section class="help-section">
            <h4>三、多场景示例</h4>
            <div class="help-scenarios">
              <div class="scenario-item">
                <span class="scenario-label">场景 1：Excel 导入目的港</span>
                <p>
                  Excel 中「目的港」列填写「青岛」「上海港」「宁波」。系统通过映射转为
                  CNQIN、CNSHA、CNNBO 写入数据库，与 dict_ports 一致，便于统计与关联。
                </p>
              </div>
              <div class="scenario-item">
                <span class="scenario-label">场景 2：同一港口多种写法</span>
                <p>
                  中文「青岛」、繁体「青島」、英文「Qingdao」、旧代码「QIN」均可作为别名写在同一映射下，统一指向标准代码
                  CNQIN，导入时任一种写法都能识别。
                </p>
              </div>
              <div class="scenario-item">
                <span class="scenario-label">场景 3：船公司 / 柜型筛选</span>
                <p>
                  列表筛选「船公司 = 马士基」时，系统用映射将「马士基」「MAERSK」解析为 MAEU
                  再查库；柜型「40尺高柜」「40HC」映射到 40HC，与 dict_container_types 一致。
                </p>
              </div>
              <div class="scenario-item">
                <span class="scenario-label">场景 4：国家与客户类型</span>
                <p>
                  国家「中国」「China」「CN」映射到
                  CN；客户类型、货代、清关、拖车、仓库等若字典表有标准代码，在此配置名称→代码后，导入与查询即可按名称自动转换。
                </p>
              </div>
              <div class="scenario-item">
                <span class="scenario-label">场景 5：新增港口后的配置</span>
                <p>
                  新港口先在「港口字典」维护标准代码（如 XMNN
                  厦门），再在本页「港口」类型下新增映射：标准代码
                  XMNN，中文名称「厦门」，别名可填「Xiamen」「廈門」，导入表格即可用「厦门」。
                </p>
              </div>
            </div>
          </section>
        </div>
      </el-collapse-item>
    </el-collapse>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon total">📊</div>
        <div class="stat-content">
          <div class="stat-label">总映射数</div>
          <div class="stat-value">{{ stats.total }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon active">✅</div>
        <div class="stat-content">
          <div class="stat-label">启用</div>
          <div class="stat-value">{{ stats.active }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon inactive">⏸️</div>
        <div class="stat-content">
          <div class="stat-label">停用</div>
          <div class="stat-value">{{ stats.inactive }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon types">📋</div>
        <div class="stat-content">
          <div class="stat-label">字典类型</div>
          <div class="stat-value">{{ Object.keys(stats.byType).length }}</div>
        </div>
      </div>
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
          <span class="type-icon">{{ type.icon }}</span>
          {{ type.label }}
          <span v-if="stats.byType[type.value]" class="type-count">
            ({{ stats.byType[type.value] }})
          </span>
        </el-tag>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchForm.keyword"
        placeholder="搜索中文名称、英文名称或标准代码"
        :prefix-icon="Search"
        clearable
        style="width: 400px"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
      <el-button type="primary" @click="handleAdd" :icon="Plus">新增映射</el-button>
    </div>

    <!-- 数据表格 -->
    <div class="table-container">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        border
        style="width: 100%"
        empty-text="当前该类型暂无映射，请点击上方「新增映射」添加"
      >
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="standard_code" label="标准代码" width="150" align="center">
          <template #default="{ row }">
            <el-tag type="primary" size="small">{{ row.standard_code }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name_cn" label="中文名称" width="150" />
        <el-table-column prop="name_en" label="英文名称" width="150" />
        <el-table-column prop="aliases" label="别名" min-width="200">
          <template #default="{ row }">
            <el-tag
              v-for="(alias, index) in Array.isArray(row.aliases)
                ? row.aliases
                : row.aliases
                  ? String(row.aliases)
                      .split(/\s*,\s*/)
                      .filter(Boolean)
                  : []"
              :key="index"
              size="small"
              style="margin: 2px"
            >
              {{ alias }}
            </el-tag>
            <span
              v-if="
                !row.aliases ||
                (Array.isArray(row.aliases)
                  ? row.aliases.length === 0
                  : !String(row.aliases).trim())
              "
              class="empty-text"
              >-</span
            >
          </template>
        </el-table-column>
        <el-table-column prop="is_active" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.is_active ? 'success' : 'info'">
              {{ row.is_active ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" align="center" />
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="handleEdit(row)" :icon="Edit">编辑</el-button>
            <el-button size="small" @click="handleCopy(row)" :icon="DocumentCopy">复制</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)" :icon="Delete"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="formData" label-width="120px" label-position="right">
        <el-form-item label="字典类型">
          <el-select v-model="formData.dict_type" placeholder="请选择字典类型" disabled>
            <el-option
              v-for="type in dictTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="目标表" required>
          <el-input v-model="formData.target_table" placeholder="自动生成" disabled />
        </el-form-item>
        <el-form-item label="目标字段" required>
          <el-input v-model="formData.target_field" placeholder="自动生成" disabled />
        </el-form-item>
        <el-form-item label="标准代码" required>
          <el-input v-model="formData.standard_code" placeholder="请输入标准代码" />
        </el-form-item>
        <el-form-item label="中文名称" required>
          <el-input v-model="formData.name_cn" placeholder="请输入中文名称" />
        </el-form-item>
        <el-form-item label="英文名称">
          <el-input v-model="formData.name_en" placeholder="请输入英文名称" />
        </el-form-item>
        <el-form-item label="别名">
          <el-input
            v-model="formData.aliases"
            type="textarea"
            :rows="3"
            placeholder="请输入别名，多个用逗号分隔"
          />
          <div class="form-tip">例如：青岛港, Qingdao Port, PUS</div>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="formData.is_active" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">确定</el-button>
      </template>
    </el-dialog>

    <!-- 测试查询对话框 -->
    <el-dialog v-model="testDialogVisible" title="测试字典映射查询" width="500px">
      <div class="test-dialog-content">
        <el-select v-model="currentDictType" placeholder="选择字典类型" style="width: 100%">
          <el-option
            v-for="type in dictTypes"
            :key="type.value"
            :label="`${type.icon} ${type.label}`"
            :value="type.value"
          />
        </el-select>
        <el-input
          v-model="testName"
          placeholder="请输入要测试的名称（如：青岛）"
          style="margin-top: 16px"
          @keyup.enter="executeTest"
        />
        <div v-if="testResult" class="test-result" :class="{ success: testResult.includes('✅') }">
          {{ testResult }}
        </div>
      </div>
      <template #footer>
        <el-button @click="testDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="executeTest">测试</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.dict-mapping-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  .page-title {
    font-size: 28px;
    font-weight: 700;
    color: #2c3e50;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;

    .title-icon {
      font-size: 32px;
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.help-collapse {
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  :deep(.el-collapse-item__header) {
    padding: 12px 16px;
    font-size: 15px;
    background: #f8f9fa;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }

  :deep(.el-collapse-item__content) {
    padding: 0;
  }
}

.help-title {
  display: flex;
  align-items: center;
  gap: 8px;

  .help-icon {
    font-size: 18px;
  }
}

.help-content {
  padding: 20px 24px;
  background: #fff;
  color: #333;
}

.help-section {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }

  h4 {
    margin: 0 0 12px 0;
    font-size: 15px;
    color: #2c3e50;
  }

  p {
    margin: 0 0 12px 0;
    font-size: 14px;
    line-height: 1.6;
    color: #555;
  }
}

.help-example-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th,
  td {
    border: 1px solid #e8e8e8;
    padding: 10px 12px;
    text-align: left;
  }

  th {
    background: #f5f7fa;
    color: #2c3e50;
    font-weight: 600;
  }

  td {
    color: #555;
  }
}

.example-table-wrap {
  overflow-x: auto;
  margin-top: 8px;
}

.help-steps {
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  line-height: 1.8;
  color: #555;

  li {
    margin-bottom: 6px;
  }
}

.help-scenarios {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.scenario-item {
  padding: 12px 14px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;

  .scenario-label {
    display: block;
    font-weight: 600;
    font-size: 14px;
    color: #2c3e50;
    margin-bottom: 6px;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: #555;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  .stat-icon {
    width: 50px;
    height: 50px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;

    &.total {
      background: linear-gradient(135deg, #667eea, #764ba2);
    }

    &.active {
      background: linear-gradient(135deg, #11998e, #38ef7d);
    }

    &.inactive {
      background: linear-gradient(135deg, #eb3349, #f45c43);
    }

    &.types {
      background: linear-gradient(135deg, #f093fb, #f5576c);
    }
  }

  .stat-content {
    flex: 1;

    .stat-label {
      font-size: 14px;
      color: #6c757d;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
    }
  }
}

.dict-type-selector {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 12px;

  .type-label {
    font-size: 15px;
    font-weight: 600;
    color: #2c3e50;
    white-space: nowrap;
  }

  .type-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .type-tag {
    cursor: pointer;
    user-select: none;
    padding: 8px 16px;
    font-size: 14px;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
    }

    .type-icon {
      margin-right: 4px;
    }

    .type-count {
      opacity: 0.7;
      font-size: 12px;
      margin-left: 4px;
    }
  }
}

.search-bar {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .empty-text {
    color: #999;
    font-style: italic;
  }
}

.form-tip {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
}

.test-dialog-content {
  .test-result {
    margin-top: 16px;
    padding: 12px;
    border-radius: 8px;
    background: #f5f5f5;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;

    &.success {
      background: #f0f9ff;
      color: #0891b2;
      border: 1px solid #bae6fd;
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dict-mapping-container {
    padding: 16px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .search-bar {
    flex-direction: column;

    .el-input {
      width: 100%;
    }
  }

  .dict-type-selector {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
