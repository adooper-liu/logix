/**
 * AI 模块类型定义
 * AI Module Type Definitions
 */

/**
 * 模型提供商类型
 */
export type ModelProvider = 'siliconflow' | 'openai' | 'claude' | 'ollama';

/**
 * 聊天消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * AI 聊天请求
 */
export interface ChatRequest {
  message: string;
  context?: Record<string, any>;
  options?: {
    execute?: boolean;
    preview?: boolean;
  };
}

/**
 * AI 聊天响应
 */
export interface ChatResponse {
  success: boolean;
  message: string;
  data?: any;
  sql?: string;
}

/**
 * Text-to-SQL 请求
 */
export interface TextToSqlRequest {
  query: string;
  tables?: string[];
  limit?: number;
}

/**
 * Text-to-SQL 响应
 */
export interface TextToSqlResponse {
  success: boolean;
  sql: string;
  data?: any[];
  rowCount: number;
  error?: string;
}

/**
 * AI 模型配置
 */
export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * AI 执行结果
 */
export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
}

/**
 * 数据库表信息
 */
export interface TableInfo {
  tableName: string;
  tableType: 'dict' | 'biz' | 'process' | 'ext';
  columns: ColumnInfo[];
}

/**
 * 列信息
 */
export interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  foreignKey?: {
    table: string;
    column: string;
  };
}
