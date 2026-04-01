// 导出多语言支持的语言类型
export type Language = 'zh-CN' | 'en-US' | 'ja-JP' | 'de-DE' | 'fr-FR' | 'it-IT' | 'es-ES'

// 导出语言配置对象
export const SUPPORTED_LANGUAGES: Record<Language, { name: string; icon: string }> = {
  'zh-CN': { name: '简体中文', icon: '🇨🇳' },
  'en-US': { name: 'English', icon: '🇺🇸' },
  'ja-JP': { name: '日本語', icon: '🇯🇵' },
  'de-DE': { name: 'Deutsch', icon: '🇩🇪' },
  'fr-FR': { name: 'Français', icon: '🇫🇷' },
  'it-IT': { name: 'Italiano', icon: '🇮🇹' },
  'es-ES': { name: 'Español', icon: '🇪🇸' },
}

// 导出默认语言
export const DEFAULT_LANGUAGE: Language = 'zh-CN'
