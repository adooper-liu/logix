/**
 * 通用 Excel 导入工具函数
 */

import type { FieldMapping } from './types'

/**
 * 从 Excel 行按列名（含别名）取第一个非空值
 */
export function getCellValue(row: Record<string, any>, mapping: FieldMapping): any {
  // 主列名
  if (
    row[mapping.excelField] !== undefined &&
    row[mapping.excelField] !== '' &&
    row[mapping.excelField] !== null
  ) {
    return row[mapping.excelField]
  }

  // 别名列表
  if (mapping.aliases) {
    for (const alias of mapping.aliases) {
      if (row[alias] !== undefined && row[alias] !== '' && row[alias] !== null) {
        return row[alias]
      }
    }
  }

  return null
}

/**
 * 解析日期
 */
export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null

  // Excel 序列号（数字）
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
  }

  // 字符串处理
  const str = String(value).trim().replace(/\//g, '-')
  const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  }

  return null
}

/**
 * 解析布尔值
 */
export function parseBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'boolean') return value

  const str = String(value).toLowerCase().trim()
  return str === 'true' || str === '是' || str === 'yes' || str === '1'
}

/**
 * 解析十进制数字
 */
export function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  const num = typeof value === 'number' ? value : parseFloat(String(value))
  return isNaN(num) ? null : num
}

/**
 * 解析整数
 */
export function parseInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  const num = typeof value === 'number' ? value : parseInt(String(value), 10)
  return isNaN(num) ? null : num
}

/**
 * 转换订单状态（示例）
 */
export function transformOrderStatus(value: unknown): string | null {
  if (!value) return null

  const statusMap: Record<string, string> = {
    待审核: 'PENDING',
    已审核: 'APPROVED',
    已取消: 'CANCELLED',
    已完成: 'COMPLETED',
  }

  const str = String(value).trim()
  return statusMap[str] || str
}

/**
 * 转换物流状态（示例）
 */
export function transformLogisticsStatus(value: unknown): string | null {
  if (!value) return null

  const statusMap: Record<string, string> = {
    已装柜: 'LOADED',
    运输中: 'IN_TRANSIT',
    已到港: 'ARRIVED',
    已清关: 'CUSTOMS_CLEARED',
    已送达: 'DELIVERED',
  }

  const str = String(value).trim()
  return statusMap[str] || str
}

/**
 * 验证必填字段
 */
export function validateRequired(value: any, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `缺少必填字段：${fieldName}`
  }
  return null
}

/**
 * 生成错误报告文本
 */
export function generateErrorReport(errors: string[]): string {
  if (errors.length === 0) return ''

  return [
    '=== 导入错误报告 ===',
    `总错误数：${errors.length}`,
    '',
    ...errors.map((err, idx) => `${idx + 1}. ${err}`),
  ].join('\n')
}
