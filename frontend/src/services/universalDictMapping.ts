/**
 * 通用字典映射服务
 * Universal Dictionary Mapping Service
 * 支持所有字典类型的名称到代码映射
 */

import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/dict-mapping'

// 字典类型枚举
export enum DictType {
  PORT = 'PORT',
  COUNTRY = 'COUNTRY',
  SHIPPING_COMPANY = 'SHIPPING_COMPANY',
  CONTAINER_TYPE = 'CONTAINER_TYPE',
  FREIGHT_FORWARDER = 'FREIGHT_FORWARDER',
  CUSTOMS_BROKER = 'CUSTOMS_BROKER',
  TRUCKING_COMPANY = 'TRUCKING_COMPANY',
  WAREHOUSE = 'WAREHOUSE',
  CUSTOMER = 'CUSTOMER',
  // 可以继续扩展其他类型
}

export interface MappingData {
  id?: number
  dict_type: string
  target_table: string
  target_field: string
  standard_code: string
  standard_name?: string
  name_cn: string
  name_en?: string
  old_code?: string
  aliases?: string[] | string
  is_primary?: boolean
  is_active?: boolean
  sort_order?: number
  remarks?: string
}

export interface MappingResult {
  success: boolean
  data?: MappingData | null
  message?: string
}

export interface BatchMappingResult {
  success: boolean
  data?: Record<string, string>
  dict_type?: string
}

export interface AllMappingsResult {
  success: boolean
  data?: MappingData[]
  dict_type?: string
  total?: number
}

// ==================== 映射缓存 ====================

const mappingCache: Record<string, Record<string, string>> = {
  [DictType.PORT]: {},
  [DictType.COUNTRY]: {},
  [DictType.SHIPPING_COMPANY]: {},
  [DictType.CONTAINER_TYPE]: {},
  // 继续添加其他类型
}

// ==================== 核心API方法 ====================

/**
 * 获取标准代码(通用)
 */
export async function getStandardCode(
  dictType: string,
  name: string
): Promise<MappingResult> {
  try {
    const response = await axios.get(`${API_BASE}/universal/code`, {
      params: { dictType, name }
    })
    return response.data
  } catch (error: any) {
    console.error('[getStandardCode] Error:', error)
    return {
      success: false,
      data: null,
      message: error.response?.data?.error || error.message
    }
  }
}

/**
 * 批量获取标准代码
 */
export async function getStandardCodesBatch(
  dictType: string,
  names: string[]
): Promise<BatchMappingResult> {
  try {
    const response = await axios.post(`${API_BASE}/universal/batch`, {
      dictType,
      names
    })
    return response.data
  } catch (error: any) {
    console.error('[getStandardCodesBatch] Error:', error)
    return {
      success: false,
      data: {}
    }
  }
}

/**
 * 获取指定类型的所有映射
 */
export async function getMappingsByType(
  dictType: string
): Promise<AllMappingsResult> {
  try {
    const response = await axios.get(`${API_BASE}/universal/type/${dictType}`)
    return response.data
  } catch (error: any) {
    console.error('[getMappingsByType] Error:', error)
    return {
      success: false,
      data: [],
      total: 0
    }
  }
}

/**
 * 获取所有字典类型
 */
export async function getAllDictTypes() {
  try {
    const response = await axios.get(`${API_BASE}/universal/types`)
    return response.data
  } catch (error: any) {
    console.error('[getAllDictTypes] Error:', error)
    return {
      success: false,
      data: []
    }
  }
}

/**
 * 模糊搜索映射
 */
export async function searchMappings(
  dictType: string,
  keyword: string
) {
  try {
    const response = await axios.get(`${API_BASE}/universal/search/${dictType}`, {
      params: { keyword }
    })
    return response.data
  } catch (error: any) {
    console.error('[searchMappings] Error:', error)
    return {
      success: false,
      data: []
    }
  }
}

/**
 * 添加新的映射
 */
export async function addMapping(mapping: Partial<MappingData>) {
  try {
    const response = await axios.post(`${API_BASE}/universal`, mapping)
    return response.data
  } catch (error: any) {
    console.error('[addMapping] Error:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

/**
 * 批量添加映射
 */
export async function addMappingsBatch(mappings: Partial<MappingData>[]) {
  try {
    const response = await axios.post(`${API_BASE}/universal/batch-add`, { mappings })
    return response.data
  } catch (error: any) {
    console.error('[addMappingsBatch] Error:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

/**
 * 更新映射
 */
export async function updateMapping(
  id: number,
  updates: Partial<MappingData>
) {
  try {
    const response = await axios.put(`${API_BASE}/universal/${id}`, updates)
    return response.data
  } catch (error: any) {
    console.error('[updateMapping] Error:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

/**
 * 删除映射
 */
export async function deleteMapping(id: number) {
  try {
    const response = await axios.delete(`${API_BASE}/universal/${id}`)
    return response.data
  } catch (error: any) {
    console.error('[deleteMapping] Error:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

/**
 * 获取映射统计信息
 */
export async function getMappingStats() {
  try {
    const response = await axios.get(`${API_BASE}/universal/stats/summary`)
    return response.data
  } catch (error: any) {
    console.error('[getMappingStats] Error:', error)
    return {
      success: false,
      data: {}
    }
  }
}

// ==================== 缓存优化方法 ====================

/**
 * 预加载指定类型的所有映射到缓存
 */
export async function preloadMappings(dictType: string): Promise<void> {
  const result = await getMappingsByType(dictType)
  if (result.success && result.data) {
    const cache = mappingCache[dictType] || {}
    result.data.forEach((item: any) => {
      cache[item.name_cn] = item.standard_code
      if (item.name_en) cache[item.name_en] = item.standard_code
      if (item.old_code) cache[item.old_code] = item.standard_code
      cache[item.standard_code] = item.standard_code
    })
    console.log(`[preloadMappings] ${dictType} 已加载 ${Object.keys(cache).length} 个映射`)
  }
}

/**
 * 预加载所有常用字典类型
 */
export async function preloadAllCommonMappings(): Promise<void> {
  const commonTypes = [
    DictType.PORT,
    DictType.COUNTRY,
    DictType.SHIPPING_COMPANY,
    DictType.CONTAINER_TYPE
  ]

  await Promise.all(
    commonTypes.map(type => preloadMappings(type))
  )

  console.log('[preloadAllCommonMappings] 所有常用字典映射加载完成')
}

/**
 * 获取标准代码(带缓存)
 */
export async function getStandardCodeCached(
  dictType: string,
  name: string
): Promise<string | null> {
  // 先从缓存查找
  const cache = mappingCache[dictType]
  if (cache[name]) {
    return cache[name]
  }

  // 调用API获取
  const result = await getStandardCode(dictType, name)
  if (result.success && result.data) {
    cache[name] = result.data.standard_code
    return result.data.standard_code
  }

  return null
}

/**
 * 批量获取标准代码(带缓存)
 */
export async function getStandardCodesCached(
  dictType: string,
  names: string[]
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {}
  const cache = mappingCache[dictType]

  // 先从缓存查找
  const uncachedNames: string[] = []
  names.forEach(name => {
    if (cache[name]) {
      result[name] = cache[name]
    } else {
      uncachedNames.push(name)
    }
  })

  // 批量查询未缓存的
  if (uncachedNames.length > 0) {
    const batchResult = await getStandardCodesBatch(dictType, uncachedNames)
    if (batchResult.success && batchResult.data) {
      Object.entries(batchResult.data).forEach(([name, code]) => {
        result[name] = code
        cache[name] = code
      })
    }
  }

  return result
}

// ==================== 便捷方法 ====================

/**
 * 快速获取港口代码
 */
export async function getPortCode(name: string): Promise<string | null> {
  return getStandardCodeCached(DictType.PORT, name)
}

/**
 * 快速获取国家代码
 */
export async function getCountryCode(name: string): Promise<string | null> {
  return getStandardCodeCached(DictType.COUNTRY, name)
}

/**
 * 快速获取船公司代码
 */
export async function getShippingCompanyCode(name: string): Promise<string | null> {
  return getStandardCodeCached(DictType.SHIPPING_COMPANY, name)
}

/**
 * 快速获取柜型代码
 */
export async function getContainerTypeCode(name: string): Promise<string | null> {
  return getStandardCodeCached(DictType.CONTAINER_TYPE, name)
}

// 导出缓存管理
export const mappingCacheManager = {
  getCache: (dictType: string) => mappingCache[dictType] || {},
  clearCache: (dictType?: string) => {
    if (dictType) {
      mappingCache[dictType] = {}
    } else {
      Object.keys(mappingCache).forEach(key => {
        mappingCache[key] = {}
      })
    }
  },
  getCacheSize: (dictType?: string) => {
    if (dictType) {
      return Object.keys(mappingCache[dictType] || {}).length
    }
    return Object.values(mappingCache).reduce((sum, cache) => sum + Object.keys(cache).length, 0)
  }
}

// 导出服务实例（用于组件导入）
export const universalDictMappingService = {
  getStandardCode,
  getStandardCodesBatch,
  getMappingsByType,
  getAllDictTypes,
  searchMappings,
  addMapping,
  addMappingsBatch,
  updateMapping,
  deleteMapping,
  getStats: getMappingStats,
  getStandardCodeCached,
  getStandardCodesCached,
  clearCache: () => mappingCacheManager.clearCache(),
  // 便捷方法
  getPortCode,
  getCountryCode,
  getShippingCompanyCode,
  getContainerTypeCode
}
