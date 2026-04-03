import { api } from './api'

// 注意：api.ts 已设置 baseURL: '/api/v1'，此处只需写相对路径 /ai/...

// AI消息类型
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

// Text-to-SQL请求
export interface TextToSqlRequest {
  query: string
  tables?: string[]
  limit?: number
  execute?: boolean
}

// 表结构信息
export interface TableInfo {
  tableName: string
  tableComment?: string
  columns: ColumnInfo[]
}

export interface ColumnInfo {
  name: string
  type: string
  comment?: string
  isPrimaryKey?: boolean
  isNullable?: boolean
}

// SQL验证结果
export interface SqlValidationResult {
  isValid: boolean
  error?: string
  warnings?: string[]
  tables?: string[]
  complexity?: {
    estimatedRows: number
    hasJoin: boolean
    hasSubquery: boolean
    complexityLevel: 'simple' | 'medium' | 'complex'
  }
}

// AI健康状态
export interface AIHealthStatus {
  status: 'ready' | 'missing_api_key' | 'error'
  provider: string
  model: string
  hasApiKey: boolean
}

// SQL执行结果
export interface SqlResult {
  sql: string
  data: any[]
  rowCount: number
  truncated?: boolean
}

// 排产结果
export interface ScheduleResult {
  success: boolean
  total: number
  successCount: number
  failedCount: number
  results: Array<{
    containerNumber: string
    success: boolean
    message?: string
  }>
  hasMore?: boolean
}

// AI服务
export const aiService = {
  // AI 对话（支持自动 SQL 执行和智能排产）
  async chat(
    message: string,
    context?: Record<string, any>,
    options?: { execute?: boolean; preview?: boolean; autoQuery?: boolean; mcpEnabled?: boolean }
  ) {
    return api.post<{
      success: boolean
      message?: string
      executionTime?: number
      sqlResult?: SqlResult
      scheduleResult?: ScheduleResult
      error?: string
    }>('/ai/chat', { message, context, options }, { timeout: 120000 })
  },

  // Text-to-SQL：生成 SQL（超时 60s）
  async textToSqlPreview(query: string, tables?: string[]) {
    return api.post<{
      success: boolean
      sql?: string
      explanation?: string
      error?: string
    }>('/ai/text-to-sql', { query, tables, execute: false }, { timeout: 60000 })
  },

  // Text-to-SQL：执行原始 SQL（预览后确认执行，超时 60s）
  async executeRawSql(sql: string, limit?: number) {
    return api.post<{
      success: boolean
      sql?: string
      results?: any[]
      rowCount?: number
      error?: string
    }>('/ai/execute-sql', { sql, limit }, { timeout: 60000 })
  },

  // Text-to-SQL：自然语言生成并执行（保留兼容）
  async textToSqlExecute(query: string, tables?: string[], limit?: number) {
    return api.post<{
      success: boolean
      sql?: string
      results?: any[]
      rowCount?: number
      explanation?: string
      error?: string
    }>('/ai/text-to-sql', { query, tables, limit, execute: true })
  },

  // 获取表列表
  async getTables() {
    return api.get<{
      success: boolean
      data?: string[]
    }>('/ai/tables')
  },

  // 获取表字段信息
  async getTableColumns(tableName: string) {
    return api.get<{
      success: boolean
      data?: ColumnInfo[]
    }>(`/ai/tables/${tableName}/columns`)
  },

  // 获取数据库结构
  async getSchema(keyword?: string) {
    return api.get<{
      success: boolean
      data?: {
        tables: TableInfo[]
        relationships: any[]
      }
    }>('/ai/schema', { params: { keyword } })
  },

  // 验证 SQL
  async validateSql(sql: string) {
    return api.post<{
      success: boolean
      isValid?: boolean
      error?: string
      warnings?: string[]
      tables?: string[]
      complexity?: any
    }>('/ai/validate-sql', { sql })
  },

  // 健康检查
  async healthCheck() {
    return api.get<{
      success: boolean
      data?: AIHealthStatus
    }>('/ai/health')
  },

  // 业务统计 API
  async getStatsOverview() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/overview')
  },

  async getStatsByStatus() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/status')
  },

  async getStatsByArrival(start?: string, end?: string) {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/arrival', {
      params: { start, end },
    })
  },

  async getStatsByETA() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/eta')
  },

  async getStatsByLastFreeDate() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/last-free-date')
  },

  async getStatsDemurrage() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/demurrage')
  },

  async getStatsByShippingCompany() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/shipping-company')
  },

  async getStatsByDestinationPort() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/destination-port')
  },

  async searchContainers(keyword: string, limit?: number) {
    return api.get<{ success: boolean; data?: any[] }>('/ai/containers/search', {
      params: { keyword, limit },
    })
  },

  // 新增统计维度
  async getStatsByCountry() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/country')
  },

  async getStatsByFreightForwarder() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/freight-forwarder')
  },

  async getStatsByContainerType() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/container-type')
  },

  async getStatsByCustomsStatus() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/customs-status')
  },

  async getStatsByTransitPort() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/transit-port')
  },

  async getStatsByWarehouse() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/warehouse')
  },

  async getStatsDemurrageByCountry() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/demurrage-by-country')
  },

  async getStatsDemurrageByShippingCompany() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/demurrage-by-shipping-company')
  },

  async getStatsDemurrageByPort() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/demurrage-by-port')
  },

  async getStatsPendingScheduling() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/pending-scheduling')
  },

  async getStatsEmptyReturn() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/empty-return')
  },

  async getStatsByReplenishmentOrder() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/replenishment-order')
  },

  async getStatsTrucking() {
    return api.get<{ success: boolean; data?: any }>('/ai/stats/trucking')
  },

  async getPendingCustomsContainers(limit?: number) {
    return api.get<{ success: boolean; data?: any[] }>('/ai/containers/pending-customs', {
      params: { limit },
    })
  },

  async getDemurrageAlerts(limit?: number) {
    return api.get<{ success: boolean; data?: any[] }>('/ai/alerts/demurrage', {
      params: { limit },
    })
  },
}

export default aiService
