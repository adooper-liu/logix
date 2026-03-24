/**
 * 应用全局状态
 * 用于全局国家过滤（按国家筛选货柜数据）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'logix_scoped_country_code'

export const useAppStore = defineStore('app', () => {
  const normalizeCountryCode = (code: string | null): string | null => {
    if (typeof code !== 'string') return null
    const normalized = code.trim().toUpperCase()
    return normalized ? normalized : null
  }

  const scopedCountryCode = ref<string | null>(
    (() => {
      try {
        return normalizeCountryCode(localStorage.getItem(STORAGE_KEY))
      } catch {
        return null
      }
    })()
  )

  function setScopedCountryCode(code: string | null) {
    const normalized = normalizeCountryCode(code)
    scopedCountryCode.value = normalized
    try {
      if (normalized) {
        localStorage.setItem(STORAGE_KEY, normalized)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // ignore
    }
  }

  return {
    scopedCountryCode,
    setScopedCountryCode
  }
})
