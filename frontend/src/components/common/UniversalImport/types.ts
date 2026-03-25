/**
 * 通用 Excel 导入组件类型定义
 */

/**
 * 字段映射配置
 */
export interface FieldMapping {
  /** Excel 列名（支持别名） */
  excelField: string
  /** 数据库表名 */
  table: string
  /** 数据库字段名 */
  field: string
  /** 是否必填 */
  required: boolean
  /** 值转换函数（接收原始值和完整行数据） */
  transform?: (value: any, row?: Record<string, any>) => any
  /** 列名别名，用于兼容不同 Excel 模板的列名写法 */
  aliases?: string[]
}

/**
 * 导入结果统计
 */
export interface ImportResult {
  /** 总记录数 */
  total: number
  /** 成功记录数 */
  success: number
  /** 失败记录数 */
  failed: number
  /** 错误信息列表 */
  errors: string[]
}

/**
 * 文件上传状态
 */
export type UploadStatus =
  | 'idle'
  | 'selecting'
  | 'parsing'
  | 'previewing'
  | 'uploading'
  | 'completed'
  | 'error'

/**
 * 预览数据行
 */
export interface PreviewRow {
  /** 原始行数据 */
  raw: Record<string, any>
  /** 转换后的数据 */
  transformed: Record<string, any>
  /** 验证错误 */
  errors?: string[]
}

/**
 * 通用导入组件 Props
 */
export interface UniversalImportProps {
  /** 组件标题 */
  title: string
  /** 字段映射配置 */
  fieldMappings: FieldMapping[]
  /** 后端 API 端点 */
  apiEndpoint: string
  /** 是否显示预览 */
  showPreview?: boolean
  /** 是否启用批量导入 */
  enableBatchImport?: boolean
  /** 每批导入数量 */
  batchSize?: number
  /** 支持的 Excel 文件扩展名 */
  acceptedFileTypes?: string[]
  /** 最大文件大小（MB） */
  maxFileSize?: number
}

/**
 * Composable 返回值
 */
export interface UseExcelImportReturn {
  // 状态
  loading: Ref<boolean>
  uploading: Ref<boolean>
  uploadProgress: Ref<number>
  selectedFile: Ref<File | null>
  previewData: Ref<PreviewRow[]>
  previewColumns: Ref<string[]>
  importResult: Ref<ImportResult>

  // 方法
  handleFileSelect: (file: File) => Promise<void>
  handleFileUpload: () => Promise<void>
  handleDownloadTemplate: () => void
  resetImport: () => void
}
