/**
 * 应用全局状态
 * 用于全局国家过滤（按国家筛选货柜数据）
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'logix_scoped_country_code'

export const useAppStore = defineStore('app', () => {
  const scopedCountryCode = ref<string | null>(
    (() => {
      try {
        return localStorage.getItem(STORAGE_KEY)
      } catch {
        return null
      }
    })()
  )

  function setScopedCountryCode(code: string | null) {
    scopedCountryCode.value = code
    try {
      if (code) {
        localStorage.setItem(STORAGE_KEY, code)
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
