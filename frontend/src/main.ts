import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import de from 'element-plus/es/locale/lang/de'
import fr from 'element-plus/es/locale/lang/fr'
import es from 'element-plus/es/locale/lang/es'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import i18n from './locales'

// 全局样式
import './assets/styles/global.scss'

const app = createApp(App)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(ElementPlus, {
  locale: zhCn
})

// 监听语言变化，动态切换 Element Plus 语言
import { watch } from 'vue'
import type { Language } from './locales/types'

const elementPlusLocales: Record<Language, any> = {
  'zh-CN': zhCn,
  'en-US': en,
  'ja-JP': en, // 日文使用英文作为备选
  'de-DE': de,
  'fr-FR': fr,
  'it-IT': en, // 意大利语使用英文作为备选
  'es-ES': es
}

watch(
  () => i18n.global.locale.value,
  (newLocale) => {
    const lang = newLocale as Language
    if (elementPlusLocales[lang]) {
      app.config.globalProperties.$ELEMENT = { locale: elementPlusLocales[lang] }
    }
  },
  { immediate: true }
)

console.log('Vue App 正在挂载...')
app.mount('#app')
console.log('Vue App 已挂载')