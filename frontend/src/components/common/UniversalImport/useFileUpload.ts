/**
 * 文件上传 Composable
 */

import { ref } from 'vue'
import axios, { AxiosProgressEvent } from 'axios'
import type { ImportResult } from './types'

export function useFileUpload() {
  const uploading = ref(false)
  const uploadProgress = ref(0)
  const uploadError = ref<string | null>(null)

  /**
   * 将扁平的字段映射转换为按表分组的结构
   * @param transformed 转换后的扁平数据
   * @param fieldMappings 字段映射配置
   */
  function groupByTable(transformed: Record<string, any>, fieldMappings: any[]) {
    const tables: Record<string, Record<string, any>> = {}
    
    // 第一轮：收集所有有值的字段
    for (const key in transformed) {
      const mapping = fieldMappings.find(m => m.field === key)
      if (mapping && mapping.table) {
        if (!tables[mapping.table]) {
          tables[mapping.table] = {}
        }
        tables[mapping.table][key] = transformed[key]
      }
    }
    
    // 第二轮：确保子表在主表有 container_number 时也被创建
    // 这样即使Excel中没有填写子表字段，后端也能创建子表记录（只有container_number）
    const mainTableCN = tables.biz_containers?.container_number || tables.process_sea_freight?.containerNumber
    if (mainTableCN) {
      const subTables = ['process_trucking_transport', 'process_warehouse_operations', 'process_empty_return']
      for (const subTable of subTables) {
        if (!tables[subTable]) {
          tables[subTable] = {}
        }
        // 只设置 container_number，不覆盖已有的字段
        if (!tables[subTable].container_number && !tables[subTable].containerNumber) {
          tables[subTable].container_number = mainTableCN
        }
      }
      
      // 处理 process_port_operations - 支持多港经停（起运港、途径港、目的港）
      if (!tables.process_port_operations) {
        tables.process_port_operations = {}
      }
      if (!tables.process_port_operations.container_number && !tables.process_port_operations.containerNumber) {
        tables.process_port_operations.container_number = mainTableCN
      }
      
      // 自动拆分多港经停记录
      // 注意：字段名已被映射为英文，'起运港' → port_of_loading, '目的港' → port_of_discharge
      const portOps = tables.process_port_operations
      const portRecords: any[] = []
      
      // 起运港 (port_sequence = 1) - 支持原始中文名和英文映射名
      if (transformed['起运港'] || transformed['port_of_loading']) {
        portRecords.push({
          container_number: mainTableCN,
          port_type: 'origin',
          port_code: transformed['port_of_loading'] || transformed['起运港'],
          port_name: transformed['port_of_loading'] || transformed['起运港'],
          port_sequence: 1,
          eta: transformed['起运港ETA'] || transformed['eta_origin'],
          ata: transformed['起运港ATA'] || transformed['ata_origin'],
        })
      }
      
      // 途径港/中转港 (port_sequence = 2)
      if (transformed['途径港'] || transformed['中转港'] || transformed['transit_port']) {
        portRecords.push({
          container_number: mainTableCN,
          port_type: 'transit',
          port_code: transformed['途径港'] || transformed['中转港'] || transformed['transit_port'],
          port_name: transformed['途径港'] || transformed['中转港'] || transformed['transit_port'],
          port_sequence: portRecords.length + 1,
          eta: transformed['途径港ETA'],
          ata: transformed['途径港ATA'],
        })
      }
      
      // 目的港 (port_sequence = 最后) - 支持原始中文名和英文映射名
      if (transformed['目的港'] || transformed['port_of_discharge']) {
        portRecords.push({
          container_number: mainTableCN,
          port_type: 'destination',
          port_code: transformed['port_of_discharge'] || transformed['目的港'],
          port_name: transformed['port_of_discharge'] || transformed['目的港'],
          port_sequence: portRecords.length + 1,
          eta: transformed['预计到港日期(ETA)'] || transformed['eta'] || transformed['eta_dest_port'],
          ata: transformed['实际到港日期(ATA)'] || transformed['ata'] || transformed['ata_dest_port'],
          free_storage_days: transformed['免堆期(天)'] || transformed['free_storage_days'],
          free_detention_days: transformed['场内免箱期(天)'] || transformed['场外免箱期(天)'],
          last_free_date: transformed['最后免费日期'] || transformed['last_free_date'],
        })
      }
      
      // 如果有多个港口记录，转换为数组格式
      if (portRecords.length > 0) {
        tables.process_port_operations = portRecords
      } else if (!tables.process_port_operations.container_number && !tables.process_port_operations.containerNumber) {
        // 没有港口字段时，创建默认目的港记录
        tables.process_port_operations = { container_number: mainTableCN, port_type: 'destination', port_sequence: 1 }
      }
    }
    
    return { tables }
  }

  /**
   * 上传文件到服务器
   */
  async function uploadFile(
    file: File,
    endpoint: string,
    data?: Record<string, any>
  ): Promise<ImportResult> {
    uploading.value = true
    uploadProgress.value = 0
    uploadError.value = null
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // 添加额外数据
      if (data) {
        Object.keys(data).forEach(key => {
          formData.append(key, data[key])
        })
      }
      
      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          if (progressEvent.total) {
            uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          }
        }
      })
      
      return response.data as ImportResult
      
    } catch (error) {
      uploadError.value = error instanceof Error ? error.message : '上传失败'
      throw error
    } finally {
      uploading.value = false
    }
  }

  /**
   * 批量上传数据
   */
  async function uploadBatchData(
    endpoint: string,
    data: any[],
    batchSize: number = 100,
    fieldMappings?: any[]  // 添加字段映射参数
  ): Promise<ImportResult> {
    uploading.value = true
    uploadProgress.value = 0
    uploadError.value = null
    
    const totalRecords = data.length
    let successCount = 0
    let failedCount = 0
    const errors: string[] = []
    
    try {
      // 分批上传
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batch = data.slice(i, i + batchSize)
        
        // 将扁平数据转换为按表分组的结构
        const groupedBatch = fieldMappings
          ? batch.map(row => {
              const grouped = groupByTable(row, fieldMappings)
              console.log('[uploadBatchData] 分组后的数据 tables:', Object.keys(grouped.tables))
              return grouped
            })
          : batch
        
        console.log(`[uploadBatchData] 发送批次 ${Math.floor(i / batchSize) + 1}, 数据量:`, batch.length)
        console.log('[uploadBatchData] 第一条分组数据 JSON:', JSON.stringify(groupedBatch[0], null, 2))
        
        try {
          const response = await axios.post(endpoint, {
            batch: groupedBatch,
            batchIndex: Math.floor(i / batchSize) + 1
          })
          
          console.log('[uploadBatchData] 后端响应 JSON:', JSON.stringify(response.data, null, 2))
          
          // 后端返回格式：{ success: true, message: '...', data: { total, success, failed, errors } }
          const responseData = response.data
          const result = responseData.data || responseData  // 兼容两种格式
          
          console.log('[uploadBatchData] 提取的 result:', result)
          console.log('[uploadBatchData] result.success:', result.success, 'type:', typeof result.success)
          console.log('[uploadBatchData] result.failed:', result.failed, 'type:', typeof result.failed)
          
          successCount += (typeof result.success === 'number' ? result.success : 0)
          failedCount += (typeof result.failed === 'number' ? result.failed : 0)
          if (result.errors) {
            errors.push(...result.errors)
          }
          
        } catch (batchError) {
          failedCount += batch.length
          errors.push(`批次 ${Math.floor(i / batchSize) + 1} 上传失败：${batchError instanceof Error ? batchError.message : '未知错误'}`)
        }
        
        // 更新进度
        uploadProgress.value = Math.min(100, Math.round(((i + batch.length) * 100) / totalRecords))
      }
      
      return {
        total: totalRecords,
        success: successCount,
        failed: failedCount,
        errors
      }
      
    } catch (error) {
      uploadError.value = error instanceof Error ? error.message : '批量上传失败'
      throw error
    } finally {
      uploading.value = false
    }
  }

  /**
   * 重置上传状态
   */
  function resetUpload() {
    uploading.value = false
    uploadProgress.value = 0
    uploadError.value = null
  }

  return {
    uploading,
    uploadProgress,
    uploadError,
    uploadFile,
    uploadBatchData,
    resetUpload
  }
}
