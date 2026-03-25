/**
 * 关联实体填充 Composable
 *
 * 用于处理 Excel 导入时的关联字段自动填充场景
 * 例如：根据客户名称自动填充销往国家
 */

import { ref } from 'vue'

export interface EntityMapping {
  /** 源字段名 */
  sourceField: string
  /** 目标字段名 */
  targetField: string
  /** 查询 API 端点 */
  apiEndpoint?: string
  /** 缓存键 */
  cacheKey?: string
}

export function useEntityFiller() {
  const filling = ref(false)
  const fillResults = ref<Record<string, string>>({})
  const fillErrors = ref<Record<string, string>>({})

  /**
   * 根据客户信息自动填充国家
   *
   * @param customerName 客户名称
   * @returns Promise<string | null> 返回国家名称，失败返回 null
   */
  async function autoFillCountryFromCustomer(customerName: string): Promise<string | null> {
    if (!customerName) return null

    try {
      // TODO: 调用后端 API 根据客户名称查询国家
      // const response = await axios.get(`/api/customers/lookup?name=${encodeURIComponent(customerName)}`)
      // return response.data.country

      // 临时方案：从客户名称中提取国家关键词
      const countryKeywords: Record<string, string> = {
        美国: '美国',
        US: '美国',
        USA: '美国',
        英国: '英国',
        UK: '英国',
        德国: '德国',
        DE: '德国',
        法国: '法国',
        FR: '法国',
        日本: '日本',
        JP: '日本',
        澳大利亚: '澳大利亚',
        AU: '澳大利亚',
        加拿大: '加拿大',
        CA: '加拿大',
      }

      for (const [keyword, country] of Object.entries(countryKeywords)) {
        if (customerName.includes(keyword)) {
          console.log(`[EntityFiller] 根据客户名称自动填充国家：${customerName} -> ${country}`)
          return country
        }
      }

      console.warn(`[EntityFiller] 未找到客户 "${customerName}" 对应的国家`)
      return null
    } catch (error) {
      console.error('[EntityFiller] 自动填充国家失败:', error)
      return null
    }
  }

  /**
   * 批量自动填充关联字段
   *
   * @param rows 数据行数组
   * @param mappings 映射配置
   */
  async function batchAutoFill(
    rows: Record<string, any>[],
    mappings: EntityMapping[]
  ): Promise<void> {
    filling.value = true
    fillResults.value = {}
    fillErrors.value = {}

    try {
      for (const mapping of mappings) {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i]

          // 如果目标字段已有值，跳过
          if (row[mapping.targetField]) {
            continue
          }

          // 获取源字段值
          const sourceValue = row[mapping.sourceField]
          if (!sourceValue) {
            continue
          }

          try {
            // 根据映射类型执行不同的填充逻辑
            if (
              mapping.sourceField === 'customer_name' &&
              mapping.targetField === 'sell_to_country'
            ) {
              const filledValue = await autoFillCountryFromCustomer(sourceValue)

              if (filledValue) {
                row[mapping.targetField] = filledValue
                fillResults.value[`${i}-${mapping.targetField}`] = `已自动填充：${filledValue}`
              } else {
                fillErrors.value[`${i}-${mapping.targetField}`] =
                  `无法根据 "${sourceValue}" 自动填充`
              }
            }

            // 可以在这里添加更多的自动填充规则
            // else if (mapping.sourceField === 'xxx' && mapping.targetField === 'yyy') {
            //   ...
            // }
          } catch (error) {
            console.error(`[EntityFiller] 填充第 ${i + 1} 行的 ${mapping.targetField} 失败:`, error)
            fillErrors.value[`${i}-${mapping.targetField}`] = String(error)
          }
        }
      }

      console.log('[EntityFiller] 批量自动填充完成:', {
        total: rows.length,
        success: Object.keys(fillResults.value).length,
        errors: Object.keys(fillErrors.value).length,
      })
    } finally {
      filling.value = false
    }
  }

  /**
   * 清除填充结果
   */
  function clearFillResults() {
    fillResults.value = {}
    fillErrors.value = {}
  }

  return {
    filling,
    fillResults,
    fillErrors,
    autoFillCountryFromCustomer,
    batchAutoFill,
    clearFillResults,
  }
}
