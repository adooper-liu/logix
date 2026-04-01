/**
 * 迁移管理 API 服务
 */

import { api } from './api'

export interface MigrationScript {
  filename: string
  path: string
  description: string
  executedAt?: string
  status: 'pending' | 'success' | 'failed' | 'running'
  error?: string
}

export interface MigrationStats {
  total: number
  executed: number
  pending: number
  lastExecuted?: string
}

export interface MigrationExecutionResult {
  success: boolean
  filename: string
  message: string
  duration: number
  error?: string
}

export interface MigrationExecutionResponse {
  success: boolean
  data: MigrationExecutionResult
  message: string
}

export interface MigrationBatchResponse {
  success: boolean
  data: {
    results: MigrationExecutionResult[]
    summary: {
      total: number
      success: number
      failed: number
    }
  }
  message: string
}

export interface MigrationsResponse {
  success: boolean
  data: {
    migrations: MigrationScript[]
    stats: MigrationStats
  }
}

/**
 * 获取所有迁移脚本
 */
export async function getMigrations(): Promise<MigrationsResponse> {
  return api.get('/v1/migrations')
}

/**
 * 获取迁移统计信息
 */
export async function getMigrationStats(): Promise<{ success: boolean; data: MigrationStats }> {
  return api.get('/v1/migrations/stats')
}

/**
 * 获取单个迁移脚本内容
 */
export async function getMigrationContent(
  filename: string
): Promise<{ success: boolean; data: { filename: string; content: string } }> {
  return api.get(`/v1/migrations/${encodeURIComponent(filename)}`)
}

/**
 * 执行单个迁移脚本
 */
export async function executeMigration(filename: string): Promise<MigrationExecutionResponse> {
  return api.post('/v1/migrations/execute', { filename })
}

/**
 * 批量执行迁移脚本
 */
export async function executeMigrations(filenames: string[]): Promise<MigrationBatchResponse> {
  return api.post('/v1/migrations/execute-batch', { filenames })
}

/**
 * 执行所有待执行的迁移
 */
export async function executeAllPending(): Promise<MigrationBatchResponse> {
  return api.post('/v1/migrations/execute-all', {})
}
