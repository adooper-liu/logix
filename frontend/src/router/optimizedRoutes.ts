/**
 * 优化后的路由配置 - 支持路由级代码分组
 */
import { defineAsyncComponent } from 'vue'
import type { RouteRecordRaw } from 'vue-router'

// 布局组件
import Layout from '@/components/layout/Layout.vue'

// 错误组件（如果不存在，使用简单的 fallback）
const ErrorPage = defineAsyncComponent(() => import('@/views/About.vue'))

// 路由分组配置
const ROUTE_GROUPS = {
  // 登录认证组 - 立即加载
  auth: () => import(/* webpackChunkName: "auth" */ '@/views/Login.vue'),

  // 仪表板组 - 路由级预加载
  dashboard: () => import(/* webpackChunkName: "dashboard" */ '@/views/dashboard/Dashboard.vue'),

  // 货运管理组 - 包含相关页面
  shipments: () => import(/* webpackChunkName: "shipments" */ '@/views/shipments/Shipments.vue'),
  containerDetail: () =>
    import(/* webpackChunkName: "shipments" */ '@/views/shipments/ContainerDetailRefactored.vue'),
  schedulingHistoryQuery: () =>
    import(/* webpackChunkName: "shipments" */ '@/views/scheduling/HistoryQuery.vue'),

  // 数据导入组
  import: () => import(/* webpackChunkName: "import" */ '@/views/import/ExcelImport.vue'),

  // 监控看板组
  monitoring: () =>
    import(/* webpackChunkName: "monitoring" */ '@/views/monitoring/Monitoring.vue'),

  // 系统管理组
  dictMapping: () => import(/* webpackChunkName: "system" */ '@/views/system/DictMapping.vue'),
  settings: () => import(/* webpackChunkName: "system" */ '@/views/settings/Settings.vue'),

  // 帮助文档组
  help: () => import(/* webpackChunkName: "help" */ '@/views/help/HelpDocumentation.vue'),
  about: () => import(/* webpackChunkName: "help" */ '@/views/About.vue'),
}

// 路由配置
export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: ROUTE_GROUPS.auth(),
    meta: {
      title: '登录',
      requiresAuth: false,
      preload: false, // 不预加载
    },
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: ROUTE_GROUPS.dashboard(),
        meta: {
          title: '仪表板',
          icon: 'House',
          requiresAuth: true,
          preload: true, // 预加载
        },
      },
      {
        path: 'shipments',
        name: 'Shipments',
        component: ROUTE_GROUPS.shipments(),
        meta: {
          title: '集装箱管理',
          icon: 'Box',
          requiresAuth: true,
          preload: true, // 预加载
        },
      },
      {
        path: 'shipments/:containerNumber',
        name: 'ContainerDetail',
        component: ROUTE_GROUPS.containerDetail(),
        meta: {
          title: '货柜详情',
          requiresAuth: true,
          preload: false,
        },
      },
      {
        path: 'scheduling-history',
        name: 'SchedulingHistoryQuery',
        component: ROUTE_GROUPS.schedulingHistoryQuery(),
        meta: {
          title: '排产历史查询',
          requiresAuth: true,
          preload: false,
        },
      },
      {
        path: 'import',
        name: 'ExcelImport',
        component: ROUTE_GROUPS.import(),
        meta: {
          title: 'Excel数据导入',
          icon: 'Upload',
          requiresAuth: true,
          preload: false,
        },
      },
      {
        path: 'monitoring',
        name: 'Monitoring',
        component: ROUTE_GROUPS.monitoring(),
        meta: {
          title: '看板',
          icon: 'DataBoard',
          requiresAuth: true,
          preload: false,
        },
      },
      {
        path: 'dict-mapping',
        name: 'DictMapping',
        component: ROUTE_GROUPS.dictMapping(),
        meta: {
          title: '通用字典映射',
          icon: 'Document',
          requiresAuth: true,
          preload: false,
        },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: ROUTE_GROUPS.settings(),
        meta: {
          title: '系统设置',
          icon: 'Setting',
          requiresAuth: true,
          preload: false,
        },
      },
      {
        path: 'help',
        name: 'HelpDocumentation',
        component: ROUTE_GROUPS.help(),
        meta: {
          title: '帮助文档',
          icon: 'Reading',
          requiresAuth: true,
          preload: false,
        },
      },
      {
        path: 'about',
        name: 'About',
        component: ROUTE_GROUPS.about(),
        meta: {
          title: '关于',
          requiresAuth: false,
          preload: false,
        },
      },
    ],
  },
  {
    path: '/error',
    name: 'Error',
    component: ErrorPage,
    meta: {
      title: '错误页面',
      requiresAuth: false,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

/**
 * 预加载路由组件
 * 根据优先级预加载关键页面
 */
export function preloadRoutes() {
  // 预加载标记为preload的页面
  const preloadRoutes = routes
    .filter(route => {
      if (route.children) {
        return route.children.some(child => (child.meta as any)?.preload)
      }
      return (route.meta as any)?.preload
    })
    .flatMap(route => {
      if (route.children) {
        return route.children.filter(child => (child.meta as any)?.preload)
      }
      return route
    })

  // 延迟预加载，避免阻塞初始渲染
  setTimeout(() => {
    preloadRoutes.forEach(route => {
      const component = route.component as () => Promise<any>
      if (typeof component === 'function') {
        component()
      }
    })
    console.log(`[Router] 已预加载 ${preloadRoutes.length} 个路由`)
  }, 2000)
}

/**
 * 智能预加载 - 基于用户行为
 */
export function smartPreload() {
  // 监听鼠标悬停事件，提前加载可能访问的页面
  document.addEventListener('mouseover', e => {
    const target = e.target as HTMLElement
    const link = target.closest('a[href]')
    if (!link) return

    const href = link.getAttribute('href')
    if (!href) return

    // 查找匹配的路由
    const matchedRoute = routes.find(route => {
      if (route.path === href) return true
      if (route.children) {
        return route.children.some(child => child.path === href.replace(/^\//, ''))
      }
      return false
    })

    if (matchedRoute) {
      const component = matchedRoute.component as () => Promise<any>
      if (typeof component === 'function') {
        // 小延迟，避免每次悬停都触发
        setTimeout(() => {
          component().catch(() => {
            // 忽略加载错误
          })
        }, 100)
      }
    }
  })
}
