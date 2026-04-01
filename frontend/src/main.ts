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

// 性能优化工具
import { registerLazyDirective } from './utils/lazyLoader'
import { performanceMonitorPlugin } from './utils/performanceMonitor'
import dateTimePlugin from './plugins/dateTime'
import { initSentry } from './plugins/sentry'

// 环境变量
const enablePerformanceMonitor = import.meta.env.VITE_ENABLE_PERFORMANCE_MONITOR === 'true'

const app = createApp(App)

// 初始化 Sentry 错误监控
initSentry(app)

// 注册性能监控插件
if (enablePerformanceMonitor) {
  app.use(performanceMonitorPlugin)
}

// 注册懒加载指令
registerLazyDirective(app)

// 按需注册Element Plus图标（只注册项目中实际使用的）
const iconWhitelist = [
  // 导航相关
  'House',
  'Box',
  'Upload',
  'DataBoard',
  'Document',
  'Setting',
  'Reading',
  'MagicStick',
  'FolderOpened',
  'Play',
  'Cpu',
  'Connection',
  'DataLine',
  'DocumentCopy',
  'Collection',
  'OfficeBuilding',
  'Monitor',
  'Notebook',
  'Share',
  'Switch',
  'SwitchButton',
  'Grid',
  'Money',
  'Wallet',
  'Warning',
  // 操作相关
  'Edit',
  'Delete',
  'View',
  'Search',
  'Refresh',
  'Download',
  'Plus',
  'Minus',
  'ArrowDown',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  // 状态相关
  'SuccessFilled',
  'WarningFilled',
  'CircleCheck',
  'CircleClose',
  'CircleCloseFilled',
  // 其他常用图标
  'Close',
  'More',
  'Sort',
  'Filter',
  'Loading',
  'Calendar',
  'Clock',
  'Location',
  'User',
  'Lock',
  'Unlock',
  'Warning',
  'InfoFilled',
  'QuestionFilled',
  // 物流相关
  'Truck',
]

iconWhitelist.forEach(key => {
  const icon = ElementPlusIconsVue[key as keyof typeof ElementPlusIconsVue]
  if (icon) {
    app.component(key, icon)
  }
})

app.use(createPinia())
app.use(router)
app.use(i18n)
app.use(dateTimePlugin)
app.use(ElementPlus, {
  locale: zhCn,
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
  'es-ES': es,
}

watch(
  () => i18n.global.locale.value,
  newLocale => {
    const lang = newLocale as Language
    if (elementPlusLocales[lang]) {
      app.config.globalProperties.$ELEMENT = { locale: elementPlusLocales[lang] }
    }
  },
  { immediate: true }
)

// 性能日志
if (enablePerformanceMonitor) {
  console.log('[Performance] 性能监控已启用')
  console.log('[Performance] 使用 $performance.report() 查看性能报告')
}

console.log('Vue App 正在挂载...')
app.mount('#app')
console.log('Vue App 已挂载')
