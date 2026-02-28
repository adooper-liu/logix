import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 布局组件
import Layout from '@/components/layout/Layout.vue'

// 页面组件
const Dashboard = () => import('@/views/dashboard/Dashboard.vue')
const Shipments = () => import('@/views/shipments/Shipments.vue')
const ContainerDetail = () => import('@/views/shipments/ContainerDetailRefactored.vue')
const ExcelImport = () => import('@/views/import/ExcelImport.vue')
const Monitoring = () => import('@/views/monitoring/Monitoring.vue')
const DictMapping = () => import('@/views/system/DictMapping.vue')
const Settings = () => import('@/views/settings/Settings.vue')
const HelpDocumentation = () => import('@/views/help/HelpDocumentation.vue')
const About = () => import('@/views/About.vue')
const Login = () => import('@/views/Login.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '登录',
      requiresAuth: false
    }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: {
          title: '仪表板',
          icon: 'House',
          requiresAuth: true
        }
      },
      {
        path: 'shipments',
        name: 'Shipments',
        component: Shipments,
        meta: {
          title: '集装箱管理',
          icon: 'Box',
          requiresAuth: true
        }
      },
      {
        path: 'shipments/:containerNumber',
        name: 'ContainerDetail',
        component: ContainerDetail,
        meta: {
          title: '货柜详情',
          requiresAuth: true
        }
      },
      {
        path: 'import',
        name: 'ExcelImport',
        component: ExcelImport,
        meta: {
          title: 'Excel数据导入',
          icon: 'Upload',
          requiresAuth: true
        }
      },
      {
        path: 'monitoring',
        name: 'Monitoring',
        component: Monitoring,
        meta: {
          title: '看板',
          icon: 'DataBoard',
          requiresAuth: true
        }
      },
      {
        path: 'dict-mapping',
        name: 'DictMapping',
        component: DictMapping,
        meta: {
          title: '通用字典映射',
          icon: 'Document',
          requiresAuth: true
        }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: Settings,
        meta: {
          title: '系统设置',
          icon: 'Setting',
          requiresAuth: true
        }
      },
      {
        path: 'help',
        name: 'HelpDocumentation',
        component: HelpDocumentation,
        meta: {
          title: '帮助文档',
          icon: 'Reading',
          requiresAuth: true
        }
      },
      {
        path: 'about',
        name: 'About',
        component: About,
        meta: {
          title: '关于',
          requiresAuth: false
        }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  console.log('路由守卫:', { to: to.path, from: from?.path })
  
  const isAuthenticated = !!localStorage.getItem('token')
  console.log('认证状态:', isAuthenticated)
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('需要认证，跳转到登录页')
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    console.log('已登录，跳转到首页')
    next('/')
  } else {
    console.log('正常访问')
    next()
  }
})

export default router