/**
 * 字典映射服务
 * Dictionary Mapping Service
 * 用于将中文港口名称等转换为标准代码
 */

import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

export interface PortMapping {
  port_code: string
  port_name_cn: string
  port_name_en: string
}

export interface PortMappingResult {
  success: boolean
  data: PortMapping | null
  message?: string
}

export interface PortMappingBatchResult {
  success: boolean
  data: Record<string, { port_code: string; port_name_en: string }>
}

/**
 * 根据中文港口名称获取标准 port_code
 */
export async function getPortCodeByChineseName(portName: string): Promise<PortMappingResult> {
  try {
    const response = await axios.get(`${API_BASE}/dict-mapping/port/${encodeURIComponent(portName)}`)
    return response.data
  } catch (error: any) {
    console.error('[getPortCodeByChineseName] Error:', error)
    return {
      success: false,
      data: null,
      message: error.response?.data?.error || error.message
    }
  }
}

/**
 * 批量获取港口代码映射
 */
export async function getPortCodeMappings(portNames: string[]): Promise<PortMappingBatchResult> {
  try {
    const response = await axios.post(`${API_BASE}/dict-mapping/port/batch`, { portNames })
    return response.data
  } catch (error: any) {
    console.error('[getPortCodeMappings] Error:', error)
    return {
      success: false,
      data: {}
    }
  }
}

/**
 * 获取所有港口名称映射
 */
export async function getAllPortMappings() {
  try {
    const response = await axios.get(`${API_BASE}/dict-mapping/port/all`)
    return response.data
  } catch (error: any) {
    console.error('[getAllPortMappings] Error:', error)
    return {
      success: false,
      data: []
    }
  }
}

/**
 * 添加新的港口名称映射
 */
export async function addPortMapping(mapping: {
  port_code: string
  port_name_cn: string
  port_name_en?: string
  port_code_old?: string
  is_primary?: boolean
}) {
  try {
    const response = await axios.post(`${API_BASE}/dict-mapping/port`, mapping)
    return response.data
  } catch (error: any) {
    console.error('[addPortMapping] Error:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

/**
 * 删除港口名称映射
 */
export async function deletePortMapping(id: number) {
  try {
    const response = await axios.delete(`${API_BASE}/dict-mapping/port/${id}`)
    return response.data
  } catch (error: any) {
    console.error('[deletePortMapping] Error:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

/**
 * 端口名称映射缓存
 */
const portMappingCache: Record<string, string> = {}

/**
 * 预加载常用港口映射
 */
export async function preloadPortMappings(): Promise<void> {
  const result = await getAllPortMappings()
  if (result.success && result.data) {
    result.data.forEach((item: any) => {
      portMappingCache[item.port_name_cn] = item.port_code
      if (item.port_code_old) {
        portMappingCache[item.port_code_old] = item.port_code
      }
    })
    console.log(`[preloadPortMappings] 已加载 ${Object.keys(portMappingCache).length} 个港口映射`)
  }
}

/**
 * 获取港口代码(带缓存)
 */
export async function getPortCodeCached(portName: string): Promise<string | null> {
  // 先从缓存查找
  if (portMappingCache[portName]) {
    return portMappingCache[portName]
  }

  // 调用API获取
  const result = await getPortCodeByChineseName(portName)
  if (result.success && result.data) {
    portMappingCache[portName] = result.data.port_code
    return result.data.port_code
  }

  return null
}

/**
 * 批量获取港口代码(带缓存)
 */
export async function getPortCodesCached(portNames: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {}

  // 先从缓存查找
  const uncachedNames: string[] = []
  portNames.forEach(name => {
    if (portMappingCache[name]) {
      result[name] = portMappingCache[name]
    } else {
      uncachedNames.push(name)
    }
  })

  // 批量查询未缓存的
  if (uncachedNames.length > 0) {
    const batchResult = await getPortCodeMappings(uncachedNames)
    if (batchResult.success && batchResult.data) {
      Object.entries(batchResult.data).forEach(([name, mapping]) => {
        result[name] = mapping.port_code
        portMappingCache[name] = mapping.port_code
      })
    }
  }

  return result
}
