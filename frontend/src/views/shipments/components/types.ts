/**
 * ContainerTable 组件类型定义
 * Type definitions for ContainerTable component
 * 
 * @packageDocumentation
 */

import type { Container } from '@/types/container'

/**
 * 表格列配置键
 * 对应 Shipments.vue 中的所有可显示列
 */
export type ColumnKey =
  | 'containerNumber'      // 货柜号/备货单号
  | 'billOfLadingNumber'   // 提单号/MBL
  | 'skuSummary'           // SKU 数量/体积/重量
  | 'alerts'               // 预警
  | 'totalCost'            // 总费用
  | 'inspectionRequired'   // 查验/开箱
  | 'destinationPort'      // 目的港
  | 'location'             // 当前位置
  | 'etaDestPort'          // 到港日期 (ETA/修正 ETA/ATA)
  | 'customsStatus'        // 清关状态
  | 'lastFreeDate'         // 提柜日期 (LFD/计划/实际)
  | 'plannedReturnDate'    // 还箱日期 (LRD/计划/实际)
  | 'scheduleStatus'       // 排产状态
  | 'lastUpdated'          // 更新日期
  | 'actions'              // 操作

/**
 * 列显示配置
 */
export interface ColumnVisibleConfig {
  [key: string]: boolean
}

/**
 * 列顺序配置
 */
export interface ColumnOrderConfig {
  order: ColumnKey[]
}

/**
 * 分页参数
 */
export interface PaginationParams {
  /** 当前页码 */
  page: number
  /** 每页条数 */
  pageSize: number
  /** 总记录数 */
  total: number
}

/**
 * 排序参数
 */
export interface SortParams {
  /** 排序字段 */
  prop: string
  /** 排序方向 */
  order: 'ascending' | 'descending' | null
}

/**
 * ContainerTable 组件 Props
 */
export interface ContainerTableProps {
  /** 表格数据 - 对应数据库 biz_containers 表 */
  data: readonly Container[]
  
  /** 加载状态 */
  loading: boolean
  
  /** 当前页码 */
  currentPage: number
  
  /** 每页条数 */
  pageSize: number
  
  /** 总记录数 */
  total: number
  
  /** 默认排序 */
  defaultSort?: SortParams
  
  /** 列显示配置 */
  columnVisible?: ColumnVisibleConfig
  
  /** 列顺序配置 */
  columnOrder?: ColumnKey[]
  
  /** 表格尺寸 */
  tableSize?: 'default' | 'medium' | 'small' | 'large'
  
  /** 是否启用虚拟滚动（大数据量优化） */
  virtualScroll?: boolean
}

/**
 * ContainerTable 组件 Emits
 */
export interface ContainerTableEmits {
  /** 页码变化 */
  (e: 'update:page', page: number): void
  
  /** 每页条数变化 */
  (e: 'update:pageSize', size: number): void
  
  /** 排序变化 */
  (e: 'sort-change', sort: SortParams): void
  
  /** 选择行变化 */
  (e: 'selection-change', selection: Container[]): void
}

/**
 * 货柜记录扩展类型
 * 在 Container 基础上添加 UI 所需字段
 */
export interface ContainerRecord extends Container {
  /** 是否展开详情 */
  isExpanded?: boolean
  
  /** 预警信息 */
  alerts?: Array<{
    id: string | number
    type: string
    message: string
    resolved: boolean
  }>
  
  /** 预警数量 */
  alertCount?: number
  
  /** 已解决预警数量 */
  resolvedAlertCount?: number
  
  /** 是否有未解决预警 */
  hasUnresolvedAlerts?: boolean
  
  /** 是否有已解决预警 */
  hasResolvedAlerts?: boolean
}

/**
 * 列定义配置
 */
export interface ColumnDefinition {
  /** 列键 */
  key: ColumnKey
  
  /** 列标题 i18n key */
  labelKey: string
  
  /** 列宽度 */
  width?: number | string
  
  /** 是否固定列 */
  fixed?: 'left' | 'right' | false
  
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right'
  
  /** 是否支持排序 */
  sortable?: boolean
  
  /** 是否默认隐藏 */
  hiddenByDefault?: boolean
}

/**
 * 列标签映射（i18n）
 */
export const COLUMN_LABELS: Record<ColumnKey, string> = {
  containerNumber: 'container.containerNumber',
  billOfLadingNumber: 'container.billOfLadingNumber',
  skuSummary: 'container.skuSummary',
  alerts: 'container.alerts',
  totalCost: 'container.totalCost',
  inspectionRequired: 'container.inspectionRequired',
  destinationPort: 'container.destinationPort',
  location: 'container.location',
  etaDestPort: 'container.etaDestPort',
  customsStatus: 'container.customsStatus',
  lastFreeDate: 'container.lastFreeDate',
  plannedReturnDate: 'container.plannedReturnDate',
  scheduleStatus: 'container.scheduleStatus',
  lastUpdated: 'container.lastUpdated',
  actions: 'common.actions'
} as const

/**
 * 默认列顺序
 */
export const DEFAULT_COLUMN_ORDER: ColumnKey[] = [
  'containerNumber',
  'billOfLadingNumber',
  'skuSummary',
  'alerts',
  'totalCost',
  'inspectionRequired',
  'destinationPort',
  'location',
  'etaDestPort',
  'customsStatus',
  'lastFreeDate',
  'plannedReturnDate',
  'scheduleStatus',
  'lastUpdated',
  'actions'
] as const

/**
 * 默认列显示配置
 */
export const DEFAULT_COLUMN_VISIBLE: ColumnVisibleConfig = {
  containerNumber: true,
  billOfLadingNumber: true,
  skuSummary: true,
  alerts: true,
  totalCost: true,
  inspectionRequired: true,
  destinationPort: true,
  location: true,
  etaDestPort: true,
  customsStatus: true,
  lastFreeDate: true,
  plannedReturnDate: true,
  scheduleStatus: true,
  lastUpdated: true,
  actions: true
} as const
