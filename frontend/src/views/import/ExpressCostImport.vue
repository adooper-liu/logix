/** * 全球快递费规则导入页面 * Global Express Cost Rule Import Page */

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, InfoFilled } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'

const uploading = ref(false)
const importResult = ref<any>(null)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002/api/v1'

/**
 * 处理文件上传
 */
const handleUpload = async (file: File) => {
  uploading.value = true
  importResult.value = null

  try {
    // 验证文件格式
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      ElMessage.error('请上传 .xlsx 或 .xls 文件')
      return
    }

    // 读取并预览（可选）
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)

    console.log('[ExpressCostImport] Excel Sheets:', workbook.SheetNames)

    // 验证必需的 Sheet
    const requiredSheets = ['surcharge_rules', 'metadata']
    const missingSheets = requiredSheets.filter(sheet => !workbook.SheetNames.includes(sheet))

    if (missingSheets.length > 0) {
      ElMessage.error(`Excel 文件缺少必需的 Sheet: ${missingSheets.join(', ')}`)
      return
    }

    // 上传到后端
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/express-cost/import-excel`, {
      method: 'POST',
      body: formData,
    })

    const result = await response.json()

    if (result.success) {
      importResult.value = result.data
      ElMessage.success(`导入完成：成功 ${result.data.success} 条，失败 ${result.data.failed} 条`)
    } else {
      ElMessage.error(result.message || '导入失败')
      if (result.data?.errors?.length > 0) {
        console.error('导入错误详情:', result.data.errors)
      }
    }
  } catch (error: any) {
    ElMessage.error('导入失败: ' + error.message)
    console.error('[ExpressCostImport] 导入失败:', error)
  } finally {
    uploading.value = false
  }
}

/**
 * 下载模板
 */
const downloadTemplate = () => {
  // 创建一个简单的示例 Excel
  const wb = XLSX.utils.book_new()

  // Sheet 1: surcharge_rules
  const rulesData = [
    [
      '国别',
      '快递方式',
      '类型',
      '最长边(in)',
      '次长边(in)',
      '最短边(in)',
      '周长(in)',
      '最长边+次长边(in)',
      '三边和(in)',
      '对角线(in)',
      '体积M³',
      '毛重(lb)',
      '计价重（单箱）',
      '计价重（多箱）',
      '最低计价重LBS',
      '金额',
      '最低基础价',
      '备注',
    ],
    [
      'US',
      'FedEx Ground',
      'AHS - Dimensions',
      48,
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      4.87,
      '×',
      '单边超 48in',
    ],
    [
      'US',
      'FedEx Ground',
      'Oversize',
      96,
      '×',
      '×',
      130,
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      39,
      '×',
      '收超大件后不再收 AHS',
    ],
    [
      'CA',
      'FedEx Ground',
      '拒收',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      '×',
      150,
      '×',
      '×',
      '计费重超过 150lb 拒收',
    ],
  ]
  const rulesSheet = XLSX.utils.aoa_to_sheet(rulesData)
  XLSX.utils.book_append_sheet(wb, rulesSheet, 'surcharge_rules')

  // Sheet 2: metadata
  const metadata = [
    ['version_key', 'source_file_name', 'effective_from', 'imported_by', 'remarks'],
    ['20260423', '示例文件.xlsx', '2026-04-23', 'admin', '测试模板'],
  ]
  const metadataSheet = XLSX.utils.aoa_to_sheet(metadata)
  XLSX.utils.book_append_sheet(wb, metadataSheet, 'metadata')

  // Sheet 3: stack_policies（可选）
  const policiesData = [
    ['国别', '快递方式', '策略类型', 'if_triggered', 'disable', 'max_group_types', 'remarks'],
    [
      'US',
      'FedEx Ground',
      'IF_THEN_DISABLE',
      'OVERSIZE',
      'AHS_DIM',
      '×',
      'Oversize 触发后禁用 AHS',
    ],
    [
      'US',
      'FedEx Ground',
      'MAX_GROUP',
      '×',
      '×',
      'LARGE_PACKAGE_RESI,RESI_DELIVERY',
      '同组只取最高一笔',
    ],
  ]
  const policiesSheet = XLSX.utils.aoa_to_sheet(policiesData)
  XLSX.utils.book_append_sheet(wb, policiesSheet, 'stack_policies')

  // 下载
  XLSX.writeFile(wb, '全球快递费规则_完整模板.xlsx')
  ElMessage.success('完整模板已下载（包含所有字段和 stack_policies Sheet）')
}
</script>

<template>
  <div class="express-cost-import-page">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span class="title">
            <el-icon><UploadFilled /></el-icon>
            全球快递费规则导入
          </span>
          <el-button type="primary" @click="downloadTemplate">
            <el-icon><InfoFilled /></el-icon>
            下载模板
          </el-button>
        </div>
      </template>

      <el-alert type="info" :closable="false" show-icon class="info-alert">
        <template #title>Excel 格式说明</template>
        <p>
          <strong>必需的 Sheet：</strong>
        </p>
        <ul>
          <li>
            <strong>surcharge_rules</strong>：规则主表
            <ul>
              <li>基础字段：国别、快递方式、类型、金额、备注</li>
              <li>尺寸阈值：最长边、次长边、最短边、周长、最长边+次长边、三边和、对角线、体积M³</li>
              <li>重量阈值：毛重、计价重（单箱）、计价重（多箱）、最低计价重LBS</li>
              <li>其他：最低基础价</li>
            </ul>
          </li>
          <li><strong>metadata</strong>：元数据（版本标识、生效日期、导入人等）</li>
          <li>
            <strong>stack_policies</strong>（可选）：互斥策略
            <ul>
              <li>IF_THEN_DISABLE：如 Oversize 触发后禁用 AHS</li>
              <li>MAX_GROUP：同组只取最高一笔费用</li>
            </ul>
          </li>
        </ul>
        <p>
          <strong>注意事项：</strong>
        </p>
        <ul>
          <li>金额支持区间格式：<code>4.87-6.25</code></li>
          <li>未使用的维度用 <code>×</code> 标记</li>
          <li>文本比较符如 <code>&gt;120</code> 会自动识别</li>
          <li>FR/IT 部分行金额为 <code>×</code> 时，会标记为 INCOMPLETE</li>
        </ul>
      </el-alert>

      <div class="upload-section">
        <el-upload
          drag
          :auto-upload="false"
          :on-change="file => handleUpload(file.raw)"
          :show-file-list="false"
          accept=".xlsx,.xls"
          :disabled="uploading"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">拖拽文件到此处或 <em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">仅支持 .xlsx/.xls 文件，文件大小不超过 10MB</div>
          </template>
        </el-upload>
      </div>

      <!-- 导入结果展示 -->
      <div v-if="importResult" class="import-result">
        <el-alert
          :title="`导入完成`"
          :type="importResult.failed > 0 ? 'warning' : 'success'"
          :closable="false"
        >
          <p><strong>成功：</strong>{{ importResult.success }} 条</p>
          <p><strong>失败：</strong>{{ importResult.failed }} 条</p>
          <p v-if="importResult.versionId">
            <strong>版本 ID：</strong>{{ importResult.versionId }}
          </p>

          <div v-if="importResult.errors?.length > 0">
            <h4>错误详情：</h4>
            <el-table :data="importResult.errors" border max-height="300">
              <el-table-column prop="row" label="行号" width="80" />
              <el-table-column prop="message" label="错误信息" />
            </el-table>
          </div>
        </el-alert>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.express-cost-import-page {
  padding: 20px;

  .main-card {
    max-width: 1200px;
    margin: 0 auto;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
        font-weight: 600;
      }
    }
  }

  .info-alert {
    margin-bottom: 20px;

    ul {
      margin: 8px 0;
      padding-left: 20px;

      li {
        margin: 4px 0;
      }
    }

    code {
      background: rgba(0, 0, 0, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
  }

  .upload-section {
    margin-bottom: 20px;
  }

  .import-result {
    margin-top: 20px;
  }
}
</style>
