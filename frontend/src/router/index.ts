import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHashHistory } from 'vue-router'

// 布局组件
import Layout from '@/components/layout/Layout.vue'

// 页面组件
const Dashboard = () => import('@/views/dashboard/Dashboard.vue')
const Shipments = () => import('@/views/shipments/Shipments.vue')
const ContainerDetail = () => import('@/views/shipments/ContainerDetailRefactored.vue')
const ExcelImport = () => import('@/views/import/ExcelImport.vue')
const DemurrageStandardsImport = () => import('@/views/import/DemurrageStandardsImport.vue')
const DemurrageStandardEntry = () => import('@/views/import/DemurrageStandardEntry.vue')
const FeituoDataImport = () => import('@/views/import/FeituoDataImport.vue')
const Monitoring = () => import('@/views/monitoring/Monitoring.vue')
const DictMapping = () => import('@/views/system/DictMapping.vue')
const DictManage = () => import('@/views/system/DictManage.vue')
const Settings = () => import('@/views/settings/Settings.vue')
const HelpDocumentation = () => import('@/views/help/HelpDocumentation.vue')
const About = () => import('@/views/About.vue')
const Login = () => import('@/views/Login.vue')
const AIChat = () => import('@/views/ai/Chat.vue')
const KnowledgeBase = () => import('@/views/ai/KnowledgeBase.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: {
      title: '登录',
      requiresAuth: false,
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
        component: Dashboard,
        meta: {
          title: '仪表板',
          icon: 'House',
          requiresAuth: true,
        },
      },
      {
        path: 'shipments',
        name: 'Shipments',
        component: Shipments,
        meta: {
          title: '集装箱管理',
          icon: 'Box',
          requiresAuth: true,
        },
      },
      {
        path: 'shipments/demurrage-top',
        name: 'DemurrageTopContainers',
        component: () => import('@/views/demurrage/DemurrageTopContainers.vue'),
        meta: {
          title: '高费用货柜',
          requiresAuth: true,
        },
      },
      {
        path: 'shipments/:containerNumber',
        name: 'ContainerDetail',
        component: ContainerDetail,
        meta: {
          title: '货柜详情',
          requiresAuth: true,
        },
      },
      {
        path: 'gantt-chart',
        name: 'GanttChart',
        component: () => import('@/components/common/SimpleGanttChartRefactored.vue'),
        meta: {
          title: '货柜甘特图',
          icon: 'Calendar',
          requiresAuth: true,
        },
      },
      {
        path: 'scheduling',
        name: 'SchedulingVisual',
        component: () => import('@/views/scheduling/SchedulingVisual.vue'),
        meta: {
          title: '智能排产',
          icon: 'Cpu',
          requiresAuth: true,
        },
      },
      {
        path: 'import',
        name: 'ExcelImport',
        component: ExcelImport,
        meta: {
          title: 'Excel数据导入',
          icon: 'Upload',
          requiresAuth: true,
        },
      },
      {
        path: 'import/feituo',
        name: 'FeituoDataImport',
        component: FeituoDataImport,
        meta: {
          title: '飞驼数据导入',
          icon: 'Connection',
          requiresAuth: true,
        },
      },
      {
        path: 'import/feituo-verify',
        name: 'FeituoVerify',
        component: () => import('@/views/import/FeituoVerify.vue'),
        meta: {
          title: '飞驼数据验证',
          icon: 'DataLine',
          requiresAuth: true,
        },
      },
      {
        path: 'import/demurrage-standards',
        name: 'DemurrageStandardsImport',
        component: DemurrageStandardsImport,
        meta: {
          title: '滞港费标准导入',
          icon: 'Document',
          requiresAuth: true,
        },
      },
      {
        path: 'import/demurrage-standard/entry',
        name: 'DemurrageStandardEntry',
        component: DemurrageStandardEntry,
        meta: {
          title: '滞港费标准录入',
          requiresAuth: true,
        },
      },
      {
        path: 'monitoring',
        name: 'Monitoring',
        component: Monitoring,
        meta: {
          title: '看板',
          icon: 'DataBoard',
          requiresAuth: true,
        },
      },
      {
        path: 'dict-mapping',
        name: 'DictMapping',
        component: DictMapping,
        meta: {
          title: '通用字典映射',
          icon: 'Document',
          requiresAuth: true,
        },
      },
      {
        path: 'dict-manage',
        name: 'DictManage',
        component: DictManage,
        meta: {
          title: '字典表管理',
          icon: 'Collection',
          requiresAuth: true,
        },
      },
      {
        path: 'warehouse-trucking-mapping',
        name: 'WarehouseTruckingMapping',
        component: () => import('@/views/system/WarehouseTruckingMapping.vue'),
        meta: {
          title: '仓库-车队映射',
          icon: 'OfficeBuilding',
          requiresAuth: true,
        },
      },
      {
        path: 'trucking-port-mapping',
        name: 'TruckingPortMapping',
        component: () => import('@/views/system/TruckingPortMapping.vue'),
        meta: {
          title: '车队-港口映射',
          icon: 'Location',
          requiresAuth: true,
        },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: Settings,
        meta: {
          title: '系统设置',
          icon: 'Setting',
          requiresAuth: true,
        },
      },
      {
        path: 'help',
        name: 'HelpDocumentation',
        component: HelpDocumentation,
        meta: {
          title: '帮助文档',
          icon: 'Reading',
          requiresAuth: true,
        },
      },
      {
        path: 'docs/:pathMatch(.*)*',
        name: 'DocViewer',
        component: () => import('@/views/docs/DocViewer.vue'),
        meta: {
          title: '文档查看器',
          requiresAuth: true,
        },
      },
      {
        path: 'about',
        name: 'About',
        component: About,
        meta: {
          title: '关于',
          requiresAuth: false,
        },
      },
      {
        path: 'about/vision/:chapterId',
        name: 'VisionChapter',
        component: () => import('@/views/vision/VisionChapterDetail.vue'),
        meta: {
          title: '智慧物流愿景',
          requiresAuth: false,
        },
      },
      {
        path: 'ai-chat',
        name: 'AIChat',
        component: AIChat,
        meta: {
          title: 'AI 助手',
          icon: 'MagicStick',
          requiresAuth: true,
        },
      },
      {
        path: 'knowledge-base',
        name: 'KnowledgeBase',
        component: KnowledgeBase,
        meta: {
          title: '知识库管理',
          icon: 'FolderOpened',
          requiresAuth: true,
        },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
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
