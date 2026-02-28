import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import enUS from './en-US'
import jaJP from './ja-JP'
import deDE from './de-DE'
import frFR from './fr-FR'
import itIT from './it-IT'
import esES from './es-ES'
import type { Language, DEFAULT_LANGUAGE } from './types'

export const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP,
  'de-DE': deDE,
  'fr-FR': frFR,
  'it-IT': itIT,
  'es-ES': esES
}

// 从 localStorage 读取语言设置，如果没有则使用默认语言
const getSavedLanguage = (): Language => {
  try {
    const saved = localStorage.getItem('logix-language')
    const validLanguages = ['zh-CN', 'en-US', 'ja-JP', 'de-DE', 'fr-FR', 'it-IT', 'es-ES']
    if (saved && validLanguages.includes(saved)) {
      return saved as Language
    }
  } catch (error) {
    console.warn('Failed to read language from localStorage:', error)
  }
  return 'zh-CN' as typeof DEFAULT_LANGUAGE
}

const i18n = createI18n({
  legacy: false, // 使用 Composition API 模式
  locale: getSavedLanguage(),
  fallbackLocale: 'zh-CN',
  messages
})

export default i18n

// 导出设置语言的函数
export const setLanguage = (lang: Language) => {
  i18n.global.locale.value = lang
  try {
    localStorage.setItem('logix-language', lang)
  } catch (error) {
    console.warn('Failed to save language to localStorage:', error)
  }
}

// 导出获取当前语言的函数
export const getCurrentLanguage = (): Language => {
  return i18n.global.locale.value as Language
}
