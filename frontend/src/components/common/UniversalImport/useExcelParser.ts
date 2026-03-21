/**
 * Excel 文件解析 Composable
 */

import { ref } from 'vue'
import * as XLSX from 'xlsx'
import type { PreviewRow, FieldMapping } from './types'

export function useExcelParser() {
  const previewData = ref<PreviewRow[]>([])
  const previewColumns = ref<string[]>([])
  const parsingError = ref<string | null>(null)

  /**
   * 解析 Excel 文件
   */
  async function parseExcelFile(file: File, fieldMappings: FieldMapping[]): Promise<void> {
    parsingError.value = null
    
    try {
      const data = await readFileAsArrayBuffer(file)
      const workbook = XLSX.read(data, { type: 'array', cellDates: true })
      
      // 读取第一个工作表
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // 转换为 JSON，保留原始列名
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' })
      
      console.log('[ExcelParser] 原始 Excel 列名:', Object.keys(jsonData[0]))
      console.log('[ExcelParser] 第一行数据:', jsonData[0])
      console.log('[ExcelParser] 数据行数:', jsonData.length)
      
      // 详细调试：打印每个列名的字符编码
      console.log('[ExcelParser] 🔍 所有列名详细字符编码:')
      Object.keys(jsonData[0]).forEach((key, index) => {
        const charInfo = Array.from(key).map((c, i) => {
          const code = c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')
          return `${i}:'${c}':U+${code}`
        }).join(' ')
        console.log(`  [${index}] "${key}" (长度:${key.length}) -> ${charInfo}`)
      })
      
      const containerKey = Object.keys(jsonData[0]).find(k => k.includes('箱号') || k.includes('集装箱'))
      if (containerKey) {
        console.log('[ExcelParser] 🎯 集装箱号列名详细信息:', {
          key: containerKey,
          length: containerKey.length,
          charCodes: Array.from(containerKey).map((c, i) => `${i}:${c}:${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`),
          bytes: new TextEncoder().encode(containerKey)
        })
      }
      
      if (jsonData.length === 0) {
        throw new Error('Excel 文件中没有数据')
      }
      
      // 获取列名（使用转换后的字段名）
      const firstTransformed = jsonData[0] ? transformRow(jsonData[0], fieldMappings) : {}
      previewColumns.value = Object.keys(firstTransformed)
      console.log('[ExcelParser] 设置 previewColumns (基于 transformed):', previewColumns.value)
      console.log('[ExcelParser] 设置 previewData, 行数:', jsonData.length)
      
      // 转换数据
      previewData.value = jsonData.map((row, index) => {
        const transformed = transformRow(row, fieldMappings)
        // 传递原始行给验证函数，用于检查列是否存在
        const errors = validateRow(transformed, fieldMappings, row)
        
        return {
          raw: row,
          transformed,
          errors: errors.length > 0 ? errors : undefined
        }
      })
      
      console.log('[ExcelParser] 完成，previewData 长度:', previewData.value.length)
      console.log('[ExcelParser] 完成，previewColumns 长度:', previewColumns.value.length)
      console.log('[ExcelParser] previewData 第一条:', JSON.stringify(previewData.value[0], null, 2))
      console.log('[ExcelParser] previewData 第一条 transformed:', previewData.value[0]?.transformed)
      
    } catch (error) {
      console.error('[ExcelParser] 解析错误:', error)
      parsingError.value = error instanceof Error ? error.message : '解析失败'
      throw error
    }
  }

  /**
   * 读取文件为 ArrayBuffer
   */
  function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as ArrayBuffer)
      reader.onerror = reject
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * 转换行数据
   */
  function isEmptyCell(v: unknown): boolean {
    return v === null || v === undefined || v === ''
  }

  /**
   * 多表映射共用同一 field（如 container_number）时，按顺序多次写入；
   * 若某条映射的 excel 列名与当前文件不一致会读到 null，不得覆盖此前已解析出的非空值。
   */
  function transformRow(row: Record<string, any>, fieldMappings: FieldMapping[]): Record<string, any> {
    const result: Record<string, any> = {}
    
    for (const mapping of fieldMappings) {
      const value = getCellValue(row, mapping)
      
      // 支持 transform 函数接收完整的 row 作为第二个参数
      const next = mapping.transform ? mapping.transform(value, row) : value
      const key = mapping.field
      const prev = result[key]
      if (!isEmptyCell(next)) {
        result[key] = next
      } else if (isEmptyCell(prev)) {
        result[key] = next
      }
    }
    
    // 自动为所有子表复制 container_number 字段
    // 这样 process_trucking_transport、process_empty_return 等表才能有外键关联
    // 注意：只有当 result.container_number 已有值时，才复制给子表（避免覆盖）
    const containerNumber = result.container_number
    if (containerNumber) {
      const subTables = ['process_trucking_transport', 'process_warehouse_operations', 'process_empty_return', 'process_port_operations']
      
      for (const mapping of fieldMappings) {
        if (subTables.includes(mapping.table) && mapping.field === 'container_number') {
          // 只有当子表的 container_number 为空时，才从主表复制
          if (result[mapping.field] === null || result[mapping.field] === undefined || result[mapping.field] === '') {
            result[mapping.field] = containerNumber
          }
        }
      }
    }
    
    return result
  }

  /**
   * 获取单元格值（支持别名）
   */
  function getCellValue(row: Record<string, any>, mapping: FieldMapping): any {
    console.log(`[getCellValue] 查找字段:`, {
      excelField: mapping.excelField,
      aliases: mapping.aliases,
      originalRow: row,
      originalRowKeys: Object.keys(row).map(k => ({
        key: k,
        charCodes: Array.from(k).map(c => c.charCodeAt(0).toString(16)),
        length: k.length
      }))
    })
    
    // 主列名
    if (row[mapping.excelField] !== undefined && row[mapping.excelField] !== '') {
      console.log(`[getCellValue] ✅ 找到主列名 "${mapping.excelField}":`, row[mapping.excelField])
      return row[mapping.excelField]
    }
    
    // 别名列表
    if (mapping.aliases) {
      for (const alias of mapping.aliases) {
        console.log(`[getCellValue] 尝试别名 "${alias}", 存在性：${row[alias] !== undefined}`)
        if (row[alias] !== undefined && row[alias] !== '') {
          console.log(`[getCellValue] ✅ 找到别名 "${alias}":`, row[alias])
          return row[alias]
        }
      }
      console.log(`[getCellValue] ❌ 未找到任何匹配的列名，尝试的别名:`, mapping.aliases)
    } else {
      console.log(`[getCellValue] ❌ 未找到主列名且无别名`)
    }
    
    return null
  }

  /**
   * 检查原始行中是否存在某列（包括主列名和别名）
   */
  function hasOriginalColumn(row: Record<string, any>, mapping: FieldMapping): boolean {
    // 检查主列名是否存在
    if (Object.prototype.hasOwnProperty.call(row, mapping.excelField)) {
      return true
    }
    // 检查别名是否存在
    if (mapping.aliases) {
      for (const alias of mapping.aliases) {
        if (Object.prototype.hasOwnProperty.call(row, alias)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * 验证行数据
   * 规则：只有当Excel中实际存在该列但值为空时，才报错
   * 如果Excel中根本没有该列，则跳过检查（字段在当前模板中不存在）
   * @param transformedRow 转换后的行数据
   * @param fieldMappings 字段映射配置
   * @param originalRow 原始Excel行数据（用于检查列是否存在）
   */
  function validateRow(transformedRow: Record<string, any>, fieldMappings: FieldMapping[], originalRow?: Record<string, any>): string[] {
    const errors: string[] = []
      
    console.log('[Validation] 开始验证行数据:', transformedRow)
    console.log('[Validation] 必填字段映射:', fieldMappings.filter(m => m.required))
      
    for (const mapping of fieldMappings) {
      if (mapping.required) {
        const value = transformedRow[mapping.field]
        const isEmpty = (value === null || value === undefined || value === '')
          
        // 检查原始 Excel 行中是否存在该列（包括主列名和所有别名）
        const columnExists = originalRow ? hasOriginalColumn(originalRow, mapping) : true
          
        console.log(`[Validation] 检查字段 "${mapping.excelField}" (${mapping.field}):`, {
          field: mapping.field,
          excelField: mapping.excelField,
          value: value,
          isEmpty: isEmpty,
          columnExists: columnExists,
          valid: !isEmpty && columnExists
        })
          
        // 如果必填字段为空且 Excel 中存在该列（或它的别名），则报错
        if (isEmpty && columnExists) {
          errors.push(`缺少必填字段：${mapping.excelField}`)
        }
      }
    }
    
    console.log('[Validation] 验证结果:', errors.length > 0 ? '❌ 失败' : '✅ 成功', errors)
    
    return errors
  }

  /**
   * 清除预览数据
   */
  function clearPreview() {
    previewData.value = []
    previewColumns.value = []
    parsingError.value = null
  }

  return {
    previewData,
    previewColumns,
    parsingError,
    parseExcelFile,
    clearPreview
  }
}
