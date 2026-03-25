<template>
  <div class="universal-import-container">
    <el-card :header="props.title" shadow="hover">
      <!-- 文件上传区域 -->
      <el-upload
        ref="uploadRef"
        drag
        :auto-upload="false"
        :on-change="handleFileChange"
        :accept="acceptedFileTypes"
        :limit="1"
        :disabled="loading || uploading"
      >
        <el-icon class="el-icon--upload"><upload /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div class="el-upload__tip">
            支持 {{ acceptedFileTypes }} 格式，最大 {{ maxFileSize }}MB
          </div>
        </template>
      </el-upload>

      <!-- 加载状态 -->
      <div v-if="loading || uploading" class="loading-section">
        <el-progress
          :percentage="uploadProgress"
          :status="uploading ? undefined : 'success'"
          :stroke-width="20"
        />
        <p>{{ uploading ? '正在上传...' : '正在解析...' }}</p>
      </div>

      <!-- 数据预览 -->
      <div v-if="showPreview && previewData.length > 0" class="preview-section">
        <div class="preview-header">
          <h3>数据预览（前 {{ Math.min(10, previewData.length) }} 条）</h3>
          <div class="preview-stats">
            <el-tag :type="validCount > 0 ? 'success' : 'danger'">
              有效数据：{{ validCount }}
            </el-tag>
            <el-tag :type="invalidCount > 0 ? 'danger' : 'success'">
              无效数据：{{ invalidCount }}
            </el-tag>
            <el-tag type="info">总计：{{ previewData.length }}</el-tag>
          </div>
        </div>

        <el-table
          :data="previewData.slice(0, 10)"
          border
          max-height="400"
          :row-class-name="getRowClassName"
        >
          <el-table-column v-for="col in visibleColumns" :key="col" min-width="120">
            <template #header>
              {{ col }}
            </template>
            <template #default="{ row }">
              {{ (row as any).transformed[col] }}
            </template>
          </el-table-column>
          <el-table-column prop="errors" label="验证" width="100" fixed="right">
            <template #default="{ row }">
              <el-tag v-if="!row.errors" type="success" size="small">✓</el-tag>
              <el-tooltip v-else placement="top">
                <template #content>
                  <div v-for="(err, idx) in row.errors" :key="idx">{{ err }}</div>
                </template>
                <el-tag type="danger" size="small">✗</el-tag>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="previewData.length > 10" class="preview-more">
          还有 {{ previewData.length - 10 }} 条数据未显示...
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button
          type="primary"
          :loading="uploading"
          @click="handleUpload"
          :disabled="!selectedFile || previewData.length === 0"
        >
          {{ uploading ? '上传中...' : '开始导入' }}
        </el-button>

        <el-button @click="handleDownloadTemplate"> <download /> 下载模板 </el-button>

        <el-button @click="handleReset" :disabled="loading || uploading"> 重置 </el-button>
      </div>

      <!-- 导入结果 -->
      <div v-if="importResult.total > 0" class="result-section">
        <el-divider>导入结果</el-divider>

        <el-descriptions :column="3" border>
          <el-descriptions-item label="总记录数">{{ importResult.total }}</el-descriptions-item>
          <el-descriptions-item label="成功">
            <el-tag type="success">{{ importResult.success }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="失败">
            <el-tag type="danger">{{ importResult.failed }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="importResult.errors && importResult.errors.length > 0" class="error-list">
          <h4>错误详情：</h4>
          <ul>
            <li v-for="(err, idx) in importResult.errors" :key="idx">{{ err }}</li>
          </ul>
          <el-button size="small" @click="copyErrors">复制错误列表</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { Download, Upload } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, ref, watch } from 'vue'
import type { FieldMapping, ImportResult, PreviewRow } from './types'
import { useExcelParser } from './useExcelParser'
import { useFileUpload } from './useFileUpload'

// ==================== Props ====================

interface Props {
  title: string
  fieldMappings: FieldMapping[]
  apiEndpoint: string
  /** 滞港费标准等：Excel 中「第 N 天」列合并为 transformed.tiers */
  tierColumnAliases?: Record<string, string[]>
  showPreview?: boolean
  enableBatchImport?: boolean
  batchSize?: number
  acceptedFileTypes?: string
  maxFileSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  showPreview: true,
  enableBatchImport: false,
  batchSize: 100,
  acceptedFileTypes: '.xlsx,.xls',
  maxFileSize: 10,
})

// ==================== Emits ====================

const emit = defineEmits<{
  (e: 'success', result: ImportResult): void
  (e: 'error', error: string): void
}>()

// ==================== Composables ====================

const { previewData, previewColumns, parsingError, parseExcelFile, clearPreview } = useExcelParser()

const { uploading, uploadProgress, uploadError, uploadFile, uploadBatchData, resetUpload } =
  useFileUpload()

// ==================== State ====================

const loading = ref(false)
const selectedFile = ref<File | null>(null)
const importResult = ref<ImportResult>({
  total: 0,
  success: 0,
  failed: 0,
  errors: [],
})

// ==================== Computed ====================

const validCount = computed(() => previewData.value.filter(row => !row.errors).length)

const invalidCount = computed(
  () => previewData.value.filter(row => row.errors && row.errors.length > 0).length
)

const visibleColumns = computed(() => previewColumns.value.slice(0, 10))

// ==================== Methods ====================

/**
 * 处理文件选择
 */
async function handleFileChange(file: any) {
  // Element Plus Upload 的 on-change 回调传递的是 UploadFile 对象，不是原生 File
  // 需要获取 raw 属性才是真正的 File 对象
  const rawFile = file.raw as File

  if (!rawFile) {
    ElMessage.error('无法读取文件')
    return
  }

  // 验证文件大小
  const fileSizeMB = rawFile.size / 1024 / 1024
  if (fileSizeMB > props.maxFileSize!) {
    ElMessage.error(`文件大小超过 ${props.maxFileSize}MB 限制`)
    return
  }

  loading.value = true
  selectedFile.value = rawFile

  try {
    await parseExcelFile(rawFile, props.fieldMappings, props.tierColumnAliases)

    if (parsingError.value) {
      throw new Error(parsingError.value)
    }

    ElMessage.success(`成功解析 ${previewData.value.length} 条数据`)
  } catch (error) {
    ElMessage.error('文件解析失败')
    emit('error', error instanceof Error ? error.message : '文件解析失败')
  } finally {
    loading.value = false
  }
}

/**
 * 处理上传
 */
async function handleUpload() {
  if (!selectedFile.value || previewData.value.length === 0) {
    ElMessage.warning('请先选择文件')
    return
  }

  // 检查是否有无效数据
  if (invalidCount.value > 0) {
    try {
      await ElMessageBox.confirm(`发现 ${invalidCount.value} 条无效数据，是否继续上传？`, '警告', {
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch {
      return
    }
  }

  try {
    let result: ImportResult

    if (props.enableBatchImport) {
      // 批量上传模式
      const data = previewData.value.map((row: any) => row.transformed)
      result = await uploadBatchData(props.apiEndpoint, data, props.batchSize, props.fieldMappings)
    } else {
      // 单文件上传模式
      result = await uploadFile(selectedFile.value, props.apiEndpoint)
    }

    importResult.value = result
    ElMessage.success(`导入完成！成功：${result.success}, 失败：${result.failed}`)
    emit('success', result)
  } catch (error) {
    ElMessage.error('上传失败')
    emit('error', error instanceof Error ? error.message : '上传失败')
  }
}

/**
 * 下载模板
 */
function handleDownloadTemplate() {
  // TODO: 实现模板下载逻辑
  ElMessage.info('模板下载功能待实现')
}

/**
 * 重置
 */
function handleReset() {
  selectedFile.value = null
  importResult.value = { total: 0, success: 0, failed: 0, errors: [] }
  clearPreview()
  resetUpload()
}

/**
 * 复制错误列表
 */
function copyErrors() {
  if (!importResult.value.errors || importResult.value.errors.length === 0) return

  const errorText = importResult.value.errors.join('\n')
  navigator.clipboard.writeText(errorText).then(() => {
    ElMessage.success('错误列表已复制到剪贴板')
  })
}

/**
 * 获取行类名（用于标记无效行）
 */
function getRowClassName({ row }: { row: PreviewRow }) {
  return row.errors ? 'error-row' : ''
}

// ==================== Watch ====================

watch(parsingError, err => {
  if (err) {
    ElMessage.error(err)
  }
})

watch(uploadError, err => {
  if (err) {
    ElMessage.error(err)
  }
})
</script>

<style scoped lang="scss">
.universal-import-container {
  padding: 20px;

  .loading-section {
    margin: 20px 0;
    text-align: center;

    p {
      margin-top: 10px;
      color: var(--el-text-color-secondary);
    }
  }

  .preview-section {
    margin: 20px 0;

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      h3 {
        margin: 0;
        font-size: 16px;
      }

      .preview-stats {
        display: flex;
        gap: 10px;
      }
    }

    .preview-more {
      margin-top: 10px;
      text-align: center;
      color: var(--el-text-color-secondary);
      font-size: 14px;
    }
  }

  .action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  .result-section {
    margin-top: 20px;

    .error-list {
      margin-top: 15px;
      padding: 15px;
      background: var(--el-fill-color-light);
      border-radius: 4px;

      h4 {
        margin: 0 0 10px 0;
        color: var(--el-color-danger);
      }

      ul {
        margin: 10px 0;
        padding-left: 20px;
        max-height: 200px;
        overflow-y: auto;
      }

      li {
        margin: 5px 0;
        color: var(--el-text-color-regular);
      }
    }
  }
}
</style>

<style lang="scss">
// 全局样式（表格错误行高亮）
.el-table .error-row {
  background-color: rgba(245, 108, 108, 0.1);
}
</style>
