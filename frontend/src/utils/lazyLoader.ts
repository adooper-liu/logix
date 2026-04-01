/**
 * 组件懒加载工具
 */

import { defineAsyncComponent } from 'vue'
import type { AsyncComponentLoader } from 'vue'

/**
 * 带加载状态的懒加载组件选项
 */
export interface LazyComponentOptions {
  loadingComponent?: any
  errorComponent?: any
  delay?: number
  timeout?: number
  suspensible?: boolean
}

/**
 * 默认加载组件
 */
const DefaultLoadingComponent = {
  template: `
    <div class="lazy-loading">
      <el-skeleton :rows="5" animated />
    </div>
  `,
}

/**
 * 默认错误组件
 */
const DefaultErrorComponent = {
  template: `
    <div class="lazy-error">
      <el-result icon="error" title="加载失败" sub-title="组件加载失败，请刷新页面重试">
        <template #extra>
          <el-button type="primary" @click="location.reload()">刷新页面</el-button>
        </template>
      </el-result>
    </div>
  `,
}

/**
 * 创建懒加载组件
 * @param loader 组件加载器
 * @param options 配置选项
 * @returns 懒加载组件
 */
export function createLazyComponent(
  loader: AsyncComponentLoader,
  options: LazyComponentOptions = {}
) {
  const defaultOptions: LazyComponentOptions = {
    loadingComponent: DefaultLoadingComponent,
    errorComponent: DefaultErrorComponent,
    delay: 200,
    timeout: 10000,
    suspensible: true,
  }

  return defineAsyncComponent({
    loader,
    ...defaultOptions,
    ...options,
  })
}

/**
 * 预加载组件
 * @param loader 组件加载器
 */
export function preloadComponent(loader: AsyncComponentLoader): Promise<void> {
  return loader()
}

/**
 * 图片懒加载指令
 */
export const lazyLoadDirective = {
  mounted(el: HTMLImageElement, binding: any) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            img.src = binding.value
            img.classList.add('lazy-loaded')
            observer.unobserve(img)
          }
        })
      },
      {
        rootMargin: '50px 0px',
      }
    )

    // 存储observer以便后续清理
    ;(el as any)._lazyObserver = observer
    observer.observe(el)

    // 初始显示占位符
    el.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNmNWY1ZjUiLz48L3N2Zz4='
  },

  unmounted(el: HTMLImageElement) {
    const observer = (el as any)._lazyObserver
    if (observer) {
      observer.disconnect()
    }
  },
}

/**
 * 批量预加载组件
 * @param loaders 组件加载器数组
 */
export async function preloadComponents(loaders: AsyncComponentLoader[]): Promise<void> {
  await Promise.all(loaders.map(loader => preloadComponent(loader)))
}

/**
 * 资源预加载
 * @param urls 资源URL数组
 * @param type 资源类型
 */
export function preloadResources(
  urls: string[],
  type: 'image' | 'script' | 'style' = 'image'
): Promise<void[]> {
  const promises = urls.map(url => {
    return new Promise<void>((resolve, reject) => {
      if (type === 'image') {
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = reject
        img.src = url
      } else if (type === 'script') {
        const script = document.createElement('script')
        script.onload = () => resolve()
        script.onerror = reject
        script.src = url
        document.head.appendChild(script)
      } else if (type === 'style') {
        const link = document.createElement('link')
        link.onload = () => resolve()
        link.onerror = reject
        link.rel = 'stylesheet'
        link.href = url
        document.head.appendChild(link)
      }
    })
  })

  return Promise.all(promises)
}

/**
 * 关键资源优先加载
 * @param criticalUrls 关键资源URL
 * @param lazyUrls 懒加载资源URL
 */
export function loadCriticalResources(criticalUrls: string[], lazyUrls: string[] = []): void {
  // 立即加载关键资源
  criticalUrls.forEach(url => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'script'
    link.href = url
    document.head.appendChild(link)
  })

  // 预加载懒加载资源
  if ('requestIdleCallback' in window) {
    ;(window as any).requestIdleCallback(() => {
      lazyUrls.forEach(url => {
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = url
        document.head.appendChild(link)
      })
    })
  }
}

/**
 * 路由级代码分割配置
 * 导出常用的懒加载组件
 */
export const LazyComponents = {
  // 仪表板相关
  Dashboard: () => import('@/views/dashboard/Dashboard.vue'),

  // 货运相关
  Shipments: () => import('@/views/shipments/Shipments.vue'),
  ContainerDetail: () => import('@/views/shipments/ContainerDetailRefactored.vue'),

  // 导入相关
  ExcelImport: () => import('@/views/import/ExcelImport.vue'),

  // 监控相关
  Monitoring: () => import('@/views/monitoring/Monitoring.vue'),

  // 系统相关
  DictMapping: () => import('@/views/system/DictMapping.vue'),
  Settings: () => import('@/views/settings/Settings.vue'),

  // 帮助相关
  HelpDocumentation: () => import('@/views/help/HelpDocumentation.vue'),
  About: () => import('@/views/About.vue'),

  // 认证相关
  Login: () => import('@/views/Login.vue'),
}

/**
 * 注册懒加载指令
 */
export function registerLazyDirective(app: any) {
  app.directive('lazy', lazyLoadDirective)
}
