<template>
  <div class="help-doc-container">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="nav-section">
        <div class="nav-section-title">🏠 首页</div>
        <div
          class="nav-item"
          :class="{ active: activeSection === 'home' }"
          @click="navigateTo('home')"
        >
          <span class="nav-item-icon">📋</span>
          <span class="nav-item-text">欢迎页</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">🚀 快速开始</div>
        <div
          v-for="doc in quickStartDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
          <span v-if="doc.badge" class="nav-item-badge">{{ doc.badge }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">📦 物流全流程 ⭐</div>
        <div
          v-for="doc in logisticsFlowDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
          <span v-if="doc.badge" class="nav-item-badge">{{ doc.badge }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">📊 项目状态 ⭐</div>
        <div
          v-for="doc in projectDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
          <span v-if="doc.badge" class="nav-item-badge">{{ doc.badge }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">📦 前后端开发</div>
        <div
          v-for="doc in devDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">🔧 核心文档 ⭐</div>
        <div
          v-for="doc in coreDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
          <span v-if="doc.badge" class="nav-item-badge">{{ doc.badge }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">🗄️ 数据库管理</div>
        <div
          v-for="doc in dbDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
          <span v-if="doc.badge" class="nav-item-badge">{{ doc.badge }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">📚 架构与参考</div>
        <div
          v-for="doc in docsArchitectureDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
          <span v-if="doc.badge" class="nav-item-badge">{{ doc.badge }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">🚀 功能实现</div>
        <div
          v-for="doc in docsFeatureDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
          <span v-if="doc.badge" class="nav-item-badge">{{ doc.badge }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">🐛 问题分析</div>
        <div
          v-for="doc in docsProblemDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">📝 开发维护</div>
        <div
          v-for="doc in docsDevDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
          <span v-if="doc.badge" class="nav-item-badge">{{ doc.badge }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">✨ 代码规范</div>
        <div
          v-for="doc in codeStandardDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
          <span v-if="doc.badge" class="nav-item-badge">{{ doc.badge }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">🛠️ 管理工具</div>
        <div
          v-for="doc in toolDocs"
          :key="doc.key"
          class="nav-item"
          :class="{ active: activeDoc === doc.key }"
          @click="loadDoc(doc.key, doc.path)"
        >
          <span class="nav-item-icon">{{ doc.icon }}</span>
          <span class="nav-item-text">{{ doc.title }}</span>
        </div>
      </div>

      <div class="nav-section">
        <div class="nav-section-title">🌐 外部资源</div>
        <div
          class="nav-item"
          @click="openExternalLink('project-dashboard.html')"
        >
          <span class="nav-item-icon">🔧</span>
          <span class="nav-item-text">项目导航面板</span>
        </div>
        <div
          class="nav-item"
          @click="openExternalLink('https://vuejs.org/')"
        >
          <span class="nav-item-icon">📘</span>
          <span class="nav-item-text">Vue 3 官方文档</span>
        </div>
        <div
          class="nav-item"
          @click="openExternalLink('https://element-plus.org/')"
        >
          <span class="nav-item-icon">🎨</span>
          <span class="nav-item-text">Element Plus 文档</span>
        </div>
        <div
          class="nav-item"
          @click="openExternalLink('https://docs.timescale.com/')"
        >
          <span class="nav-item-icon">🗄️</span>
          <span class="nav-item-text">TimescaleDB 文档</span>
        </div>
        <div
          class="nav-item"
          @click="openExternalLink('https://vitejs.dev/')"
        >
          <span class="nav-item-icon">⚡</span>
          <span class="nav-item-text">Vite 文档</span>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content-area">
      <div class="content-header">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文档内容..."
            @input="handleSearch"
          >
        </div>
      </div>
      <div class="content-body">
        <div v-if="loading" class="loading-state">
          <div class="loading-icon">📖</div>
          <p>正在加载文档...</p>
        </div>
        <div v-else-if="error" class="error-state">
          <div class="error-icon">❌</div>
          <h2>文档加载失败</h2>
          <p><strong>错误信息:</strong> {{ error }}</p>
          <el-button type="primary" @click="navigateTo('home')">
            返回首页
          </el-button>
        </div>
        <div v-else-if="activeSection === 'home'" class="welcome-section">
          <div class="welcome-header">
            <h1>🚢 欢迎使用 LogiX 帮助文档</h1>
            <p>一站式物流系统开发学习平台 - 从入门到精通</p>
          </div>

          <div class="quick-actions">
            <div class="quick-action-card" @click="navigateTo('home')">
              <div class="quick-action-icon">🚀</div>
              <div class="quick-action-title">系统概览</div>
            </div>
            <div class="quick-action-card" @click="loadDoc('TIMESCALEDB', '/docs/08-deployment/01-TimescaleDB指南.md')">
              <div class="quick-action-icon">📊</div>
              <div class="quick-action-title">数据库指南</div>
            </div>
            <div class="quick-action-card" @click="loadDoc('DEV_ENV', '/docs/10-guides/03-开发环境指南.md')">
              <div class="quick-action-icon">🔧</div>
              <div class="quick-action-title">环境配置</div>
            </div>
            <div class="quick-action-card" @click="loadDoc('QUICK_START', '/docs/10-guides/05-快速开始.md')">
              <div class="quick-action-icon">⚡</div>
              <div class="quick-action-title">快速开始</div>
            </div>
          </div>

          <div class="feature-section">
            <h2>📦 服务访问地址</h2>
            <div class="service-grid">
              <div class="service-item">
                <div class="service-name">🎨 前端应用</div>
                <div class="service-url">http://localhost:5173</div>
              </div>
              <div class="service-item">
                <div class="service-name">⚙️ 后端 API</div>
                <div class="service-url">http://localhost:3001</div>
              </div>
              <div class="service-item">
                <div class="service-name">🗄️ TimescaleDB</div>
                <div class="service-url">localhost:5432</div>
              </div>
              <div class="service-item">
                <div class="service-name">📦 Redis</div>
                <div class="service-url">localhost:6379</div>
              </div>
              <div class="service-item">
                <div class="service-name">🔧 Adminer</div>
                <div class="service-url">http://localhost:8080</div>
              </div>
              <div class="service-item">
                <div class="service-name">📊 pgAdmin</div>
                <div class="service-url">http://localhost:5050</div>
              </div>
              <div class="service-item">
                <div class="service-name">📈 Grafana</div>
                <div class="service-url">http://localhost:3000</div>
              </div>
              <div class="service-item">
                <div class="service-name">🎯 Prometheus</div>
                <div class="service-url">http://localhost:9090</div>
              </div>
            </div>
          </div>

          <div class="feature-section">
            <h2>💻 技术栈</h2>
            <h3>前端</h3>
            <div class="tech-stack">
              <span class="tech-badge">Vue 3.4.0</span>
              <span class="tech-badge">TypeScript 5.3.0</span>
              <span class="tech-badge">Vite 5.0.10</span>
              <span class="tech-badge">Element Plus 2.4.4</span>
              <span class="tech-badge">Pinia 2.1.7</span>
              <span class="tech-badge">Vue Router 4.2.5</span>
              <span class="tech-badge">ECharts 5.4.3</span>
            </div>

            <h3>后端</h3>
            <div class="tech-stack">
              <span class="tech-badge">Node.js 18+</span>
              <span class="tech-badge">Express</span>
              <span class="tech-badge">TypeScript</span>
            </div>

            <h3>数据库</h3>
            <div class="tech-stack">
              <span class="tech-badge">PostgreSQL 15</span>
              <span class="tech-badge">TimescaleDB 2.15.1</span>
              <span class="tech-badge">Redis 7</span>
            </div>
          </div>

          <div class="feature-section">
            <h2>⚡ 快速启动</h2>
            <p><strong>启动开发环境:</strong> 运行 <code>.\start-logix-dev.ps1</code>（Windows）</p>
            <p><strong>停止开发环境:</strong> 运行 <code>.\stop-logix-dev.ps1</code></p>
            <p>一键启动：TimescaleDB、Redis、Prometheus、Grafana、Adminer、pgAdmin、后端、前端</p>
          </div>

          <div class="feature-section">
            <h2>🔑 默认账号</h2>
            <p><strong>pgAdmin:</strong> admin@logix.com / LogiX@2024</p>
            <p><strong>Adminer:</strong> 无需登录，直接连接数据库</p>
            <p><strong>数据库账号:</strong> 查看 <code>.env</code> 文件中的配置</p>
          </div>

          <div class="feature-section">
            <h2>📚 核心文档必读</h2>
            <p><strong>开发规范</strong> - 数据库表结构是唯一不变基准</p>
            <p><strong>核心映射参考</strong> - 完整表名映射和字段映射</p>
            <p><strong>倒计时卡片逻辑</strong> - 前端倒计时功能实现说明</p>
            <div class="dev-order-tip">
              <p>💡 <strong>开发必读顺序</strong>: 开发规范 → 核心映射参考 → 开始编码</p>
            </div>
          </div>

          <div class="feature-section">
            <h2>🆘 常见问题快速解决</h2>
            <div class="faq-grid">
              <div class="faq-item">
                <div class="faq-title">Docker 未启动</div>
                <div class="faq-solution">启动 Docker Desktop</div>
              </div>
              <div class="faq-item">
                <div class="faq-title">端口被占用</div>
                <div class="faq-solution">修改 .env 中的端口配置</div>
              </div>
              <div class="faq-item">
                <div class="faq-title">前端显示 404</div>
                <div class="faq-solution">检查 npm run dev 是否运行</div>
              </div>
              <div class="faq-item">
                <div class="faq-title">数据库连接失败</div>
                <div class="faq-solution">检查 TimescaleDB 容器状态</div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <el-button
            class="back-button"
            type="default"
            @click="goBack"
          >
            {{ backButtonText }}
          </el-button>
          <div v-if="!markdownContent" style="padding: 20px; color: #999;">加载中...</div>
          <MarkdownRenderer v-else :content="markdownContent" @navigate-to-doc="handleDocNavigation" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

// 状态管理
const activeSection = ref('home')
const activeDoc = ref('')
const markdownContent = ref('')
const loading = ref(false)
const error = ref('')
const searchQuery = ref('')

// 历史栈 - 记录访问历史
const docHistory = ref<{ key: string; path: string }[]>([])

// 文档定义 - 使用 public 目录下的路径
const quickStartDocs = [
  {
    key: 'DOC_INDEX',
    title: '文档索引',
    icon: '📚',
    path: '/docs/11-project/02-文档索引.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'QUICK_START',
    title: '快速开始',
    icon: '🚀',
    path: '/docs/10-guides/05-快速开始.md',
    badge: '⭐'
  },
  {
    key: 'DEV_ENV',
    title: '开发环境指南',
    icon: '⚡',
    path: '/docs/10-guides/03-开发环境指南.md',
    badge: '⭐'
  }
]

const devDocs = [
  {
    key: 'FRONTEND',
    title: '前端文档',
    icon: '🎨',
    path: '/docs/10-guides/04-前端文档.md'
  },
  {
    key: 'BACKEND',
    title: '后端文档',
    icon: '⚙️',
    path: '/docs/10-guides/02-后端文档.md'
  }
]

const projectDocs = [
  {
    key: 'PROJECT_STATUS',
    title: '项目行动指南',
    icon: '📊',
    path: '/docs/11-project/00-项目行动指南.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'FIVE_NODES',
    title: '五节点调度方案',
    icon: '📅',
    path: '/docs/11-project/04-五节点调度与可视化方案.md'
  },
  {
    key: 'GANTT_MECHANISM',
    title: '甘特图调度机制',
    icon: '📈',
    path: '/docs/11-project/07-甘特图调度与货柜资源关联机制.md'
  },
  {
    key: 'FEITUO_INTEGRATION',
    title: '飞驼接入整合',
    icon: '🔌',
    path: '/docs/11-project/09-飞驼节点状态码解读与接入整合方案.md'
  }
]

const logisticsFlowDocs = [
  {
    key: 'LOGISTICS_FLOW',
    title: '物流流程完整说明',
    icon: '📦',
    path: '/docs/02-architecture/02-物流流程完整说明.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'LOGISTICS_STATUS_MACHINE',
    title: '物流状态机',
    icon: '🔄',
    path: '/docs/05-state-machine/02-物流状态机.md',
    badge: '⭐'
  },
  {
    key: 'UNIFIED_STATUS',
    title: '统一状态机实现',
    icon: '🔀',
    path: '/docs/02-architecture/05-统一状态机实现.md'
  },
  {
    key: 'STATE_MACHINE_FEITUO',
    title: '业务状态机与飞驼',
    icon: '🔌',
    path: '/docs/05-state-machine/03-业务状态机与飞驼.md'
  }
]

const coreDocs = [
  {
    key: 'DEV_STANDARDS',
    title: '开发规范',
    icon: '📝',
    path: '/docs/01-standards/02-开发标准.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'CORE_MAPPINGS',
    title: '核心映射参考',
    icon: '🔗',
    path: '/docs/09-misc/02-核心映射参考.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'CODE_STANDARDS',
    title: '代码规范',
    icon: '📋',
    path: '/docs/01-standards/01-代码规范.md',
    badge: '⭐'
  },
  {
    key: 'BACKEND_QUICK_REF',
    title: '后端快速参考',
    icon: '⚡',
    path: '/docs/10-guides/01-后端快速参考.md'
  }
]

const docsArchitectureDocs = [
  {
    key: 'ARCHITECTURE',
    title: '系统架构说明',
    icon: '🏗️',
    path: '/docs/02-architecture/01-架构说明.md',
    badge: '⭐'
  },
  {
    key: 'UNIVERSAL_DICT',
    title: '通用字典映射',
    icon: '📚',
    path: '/docs/09-misc/05-通用字典映射指南.md'
  }
]

const docsFeatureDocs = [
  {
    key: 'EXTERNAL_DATA',
    title: '外部数据集成',
    icon: '🔌',
    path: '/docs/04-api/01-外部数据集成指南.md',
    badge: '⭐'
  },
  {
    key: 'EXTERNAL_DATA_QUICK',
    title: '外部数据快速开始',
    icon: '⚡',
    path: '/docs/04-api/02-外部数据快速开始.md'
  },
  {
    key: 'MULTIPLE_ORDERS',
    title: '多订单货柜',
    icon: '📦',
    path: '/docs/02-architecture/03-多订单货柜设计.md'
  }
]

const docsProblemDocs = [
  {
    key: 'EXCEL_IMPORT',
    title: 'Excel 导入',
    icon: '📊',
    path: '/docs/09-misc/01-Excel导入指南.md'
  },
  {
    key: 'EXCEL_STATUS',
    title: 'Excel 状态映射',
    icon: '📈',
    path: '/docs/03-database/02-Excel状态映射.md'
  },
  {
    key: 'IMPORT_MAPPING_FIX',
    title: '导入映射修复',
    icon: '🛠️',
    path: '/docs/09-misc/10-导入映射修复总结.md'
  }
]

const docsDevDocs = [
  {
    key: 'COUNTDOWN_LOGIC',
    title: '倒计时卡片逻辑',
    icon: '⏱️',
    path: '/docs/06-statistics/02-倒计时卡片逻辑.md',
    badge: '⭐'
  },
  {
    key: 'STATISTICS_DESC',
    title: '统计说明',
    icon: '📊',
    path: '/docs/06-statistics/01-统计说明.md'
  },
  {
    key: 'GANTT_LOGIC',
    title: '甘特图显示逻辑',
    icon: '📈',
    path: '/docs/06-statistics/03-甘特图显示逻辑.md'
  }
]

const dbDocs = [
  {
    key: 'TIMESCALEDB',
    title: 'TimescaleDB 完整指南',
    icon: '📊',
    path: '/docs/08-deployment/01-TimescaleDB指南.md',
    badge: '⭐'
  },
  {
    key: 'TIMESCALEDB_QUICK',
    title: 'TimescaleDB 快速参考',
    icon: '⚡',
    path: '/docs/08-deployment/02-TimescaleDB快速参考.md',
    badge: '⭐'
  },
  {
    key: 'DB_RELATIONS',
    title: '数据库主表关系',
    icon: '🔗',
    path: '/docs/03-database/01-数据库主表关系.md'
  }
]

const codeStandardDocs = [
  {
    key: 'NAMING_CONVENTIONS',
    title: '命名规范',
    icon: '🏷️',
    path: '/docs/01-standards/03-命名规范.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'NAMING_QUICK_REF',
    title: '命名快速参考',
    icon: '⚡',
    path: '/docs/01-standards/04-命名快速参考.md',
    badge: '⭐'
  },
  {
    key: 'COLOR_GUIDE',
    title: '颜色系统指南',
    icon: '🎨',
    path: '/docs/01-standards/06-颜色系统指南.md'
  },
  {
    key: 'LINT_GUIDE',
    title: 'Lint 使用指南',
    icon: '🔧',
    path: '/docs/01-standards/05-Lint使用指南.md',
    badge: '⭐'
  }
]

const toolDocs = [
  {
    key: 'MONITORING',
    title: '监控用户指南',
    icon: '📈',
    path: '/docs/08-deployment/03-监控用户指南.md'
  }
]

// 导航到首页
const navigateTo = (section: string) => {
  activeSection.value = section
  activeDoc.value = ''
  markdownContent.value = ''
  error.value = ''
}

// 处理文档链接导航
const handleDocNavigation = (url: string) => {
  console.log('处理文档导航:', url)

  // 如果当前有文档，将其加入历史栈
  if (activeDoc.value && markdownContent.value) {
    // 找到当前文档的路径
    const currentPath = quickStartDocs.find(doc => doc.key === activeDoc.value)?.path
    if (currentPath) {
      docHistory.value.push({ key: activeDoc.value, path: currentPath })
      console.log('添加到历史栈:', { key: activeDoc.value, path: currentPath })
    }
  }

  // 从 URL 中提取文件名作为 key
  const fileName = url.split('/').pop()?.replace('.md', '') || 'UNKNOWN'
  const docKey = fileName.toUpperCase()

  // 转换相对路径为绝对路径
  let fullPath = url
  if (url.startsWith('./')) {
    // 相对路径，转换为 /docs/ 路径
    fullPath = `/docs/${url.substring(2)}`
  } else if (!url.startsWith('/')) {
    // 不以 / 开头的路径，添加 /docs/ 前缀
    fullPath = `/docs/${url}`
  } else if (!url.startsWith('/docs/')) {
    // 以 / 开头但不是 /docs/，添加 /docs 前缀
    fullPath = `/docs${url}`
  }

  console.log('文档导航转换:', { originalUrl: url, fullPath, docKey })

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })

  // 加载新文档
  loadDoc(docKey, fullPath)
}

// 返回上一页
const goBack = () => {
  if (docHistory.value.length > 0) {
    const prevDoc = docHistory.value.pop()
    if (prevDoc) {
      console.log('返回上一页:', prevDoc)
      loadDoc(prevDoc.key, prevDoc.path)
    }
  } else {
    // 如果没有历史记录，返回首页
    navigateTo('home')
  }
}

// 所有文档列表（用于返回按钮标题）
const allDocLists = [
  quickStartDocs,
  devDocs,
  projectDocs,
  logisticsFlowDocs,
  coreDocs,
  docsArchitectureDocs,
  docsFeatureDocs,
  docsProblemDocs,
  docsDevDocs,
  dbDocs,
  codeStandardDocs,
  toolDocs
]

// 获取返回按钮文本
const backButtonText = computed(() => {
  if (docHistory.value.length > 0) {
    const prevDoc = docHistory.value[docHistory.value.length - 1]
    const doc = allDocLists.flat().find(d => d.key === prevDoc.key)
    return `← 返回 ${doc?.title || prevDoc.key}`
  }
  return '← 返回首页'
})

// 加载文档
const loadDoc = async (key: string, path: string) => {
  loading.value = true
  error.value = ''
  activeSection.value = 'doc'
  activeDoc.value = key

  console.log('开始加载文档:', { key, path })

  try {
    // 路径已经是完整的 URL（如 /docs/QUICK_START.md）
    console.log('请求路径:', path)

    const response = await fetch(path, {
      method: 'GET',
      headers: {
        'Accept': 'text/markdown; charset=utf-8, text/plain; charset=utf-8, */*'
      }
    })

    console.log('响应状态:', response.status, response.statusText)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const markdownText = await response.text()
    console.log('文档内容长度:', markdownText?.length)
    console.log('文档内容前100字符:', markdownText?.substring(0, 100))

    if (!markdownText || !markdownText.trim()) {
      throw new Error('文档内容为空')
    }

    // 检查是否返回的是 HTML 而不是 Markdown
    if (markdownText.includes('<!DOCTYPE html>') || markdownText.includes('<html')) {
      console.error('错误: 返回的是 HTML 而不是 Markdown')
      throw new Error('文件路径错误，返回了 HTML 而不是 Markdown 文件')
    }

    // 直接使用原始 Markdown 文本，由 MarkdownRenderer 组件处理
    markdownContent.value = markdownText
    console.log('Markdown 加载完成')
  } catch (err: any) {
    console.error('文档加载失败:', err)
    error.value = err.message || '未知错误'
    ElMessage.error(`文档加载失败: ${err.message}`)
  } finally {
    loading.value = false
  }
}

// 打开外部链接
const openExternalLink = (url: string) => {
  // 处理相对路径的 HTML 文件
  if (url.endsWith('.html')) {
    window.open(url, '_blank')
  } else {
    // 外部 URL 直接打开
    window.open(url, '_blank')
  }
}

// 搜索功能
const handleSearch = () => {
  const query = searchQuery.value.toLowerCase().trim()
  if (query.length < 2) return

  // 高亮匹配的文档（使用 CSS 变量兼容）
  const navItems = document.querySelectorAll('.nav-item')
  navItems.forEach((item: Element) => {
    const el = item as HTMLElement
    const text = el.querySelector('.nav-item-text')?.textContent?.toLowerCase() || ''
    el.style.background = text.includes(query) ? 'rgba(230, 162, 60, 0.2)' : ''
  })
}

// Markdown 解析器
const parseMarkdown = (markdown: string): string => {
  let html = markdown

  // 保存代码块
  const codeBlocks: string[] = []
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
    codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${escapeHtml(code)}</code></pre>`)
    return `__CODEBLOCK_${codeBlocks.length - 1}__`
  })

  // 保存链接和图片（在转义 HTML 之前，处理带有粗体/斜体标记的链接）
  const links: { html: string; placeholder: string }[] = []
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const htmlContent = `<img src="${url}" alt="${alt}" style="max-width: 100%; border-radius: 8px; margin: 15px 0;">`
    const placeholder = `__LINK_IMG_${links.length}__`
    links.push({ html: htmlContent, placeholder })
    return placeholder
  })

  // 判断是否是内部锚点链接
  const isInternalAnchor = (url: string): boolean => {
    return url.startsWith('#') && !url.startsWith('#/')
  }

  // 处理格式化的链接（先处理粗体包裹的链接）
  html = html.replace(/\*\*\[([^\]]+)\]\(([^)]+)\)\*\*/g, (_match, text, url) => {
    const isAnchor = isInternalAnchor(url)
    const htmlContent = isAnchor
      ? `<strong><a href="${url}" onclick="event.preventDefault(); const target = document.querySelector('${url}'); if (target) target.scrollIntoView({ behavior: 'smooth' });">${text}</a></strong>`
      : `<strong><a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a></strong>`
    const placeholder = `__LINK_A_${links.length}__`
    links.push({ html: htmlContent, placeholder })
    return placeholder
  })
  // 处理斜体包裹的链接
  html = html.replace(/\*\[([^\]]+)\]\(([^)]+)\)\*/g, (_match, text, url) => {
    const isAnchor = isInternalAnchor(url)
    const htmlContent = isAnchor
      ? `<em><a href="${url}" onclick="event.preventDefault(); const target = document.querySelector('${url}'); if (target) target.scrollIntoView({ behavior: 'smooth' });">${text}</a></em>`
      : `<em><a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a></em>`
    const placeholder = `__LINK_A_${links.length}__`
    links.push({ html: htmlContent, placeholder })
    return placeholder
  })
  // 处理下划线包裹的链接
  html = html.replace(/_\[([^\]]+)\]\(([^)]+)\)_/g, (_match, text, url) => {
    const isAnchor = isInternalAnchor(url)
    const htmlContent = isAnchor
      ? `<em><a href="${url}" onclick="event.preventDefault(); const target = document.querySelector('${url}'); if (target) target.scrollIntoView({ behavior: 'smooth' });">${text}</a></em>`
      : `<em><a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a></em>`
    const placeholder = `__LINK_A_${links.length}__`
    links.push({ html: htmlContent, placeholder })
    return placeholder
  })
  // 处理普通链接（必须在粗体/斜体处理之后）
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    const isAnchor = isInternalAnchor(url)
    const htmlContent = isAnchor
      ? `<a href="${url}" onclick="event.preventDefault(); const target = document.querySelector('${url}'); if (target) target.scrollIntoView({ behavior: 'smooth' });">${text}</a>`
      : `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`
    const placeholder = `__LINK_A_${links.length}__`
    links.push({ html: htmlContent, placeholder })
    return placeholder
  })

  // 转义 HTML
  html = escapeHtml(html)

  // 还原代码块
  html = html.replace(/__CODEBLOCK_(\d+)__/g, (_match, index) => codeBlocks[index])

  // 还原链接和图片
  links.forEach((link) => {
    html = html.replace(link.placeholder, link.html)
  })

  // 处理标题
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

  // 处理引用
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>')

  // 处理行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // 处理粗体（使用更精确的正则，避免匹配到链接）
  html = html.replace(/\*\*([^*_]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^*_]+)__/g, '<strong>$1</strong>')

  // 处理斜体（确保不在链接或URL中匹配）
  // 只匹配单词两侧的单星号或单下划线，避免匹配到文件名中的下划线
  html = html.replace(/\b\*([^*_]+)\*\b/g, '<em>$1</em>')
  html = html.replace(/\b_([^*_]+)_\b/g, '<em>$1</em>')

  // 处理表格
  const tablePattern = /\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g
  let tableMatch
  while ((tableMatch = tablePattern.exec(html)) !== null) {
    const fullTable = tableMatch[0]
    const lines = fullTable.trim().split('\n')
    const header = parseTableRow(lines[0])
    const rows = lines.slice(2).map(line => parseTableRow(line))

    const tableHtml = `
      <div style="overflow-x: auto; margin: 20px 0;">
        <table>
          <thead>${header}</thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>
    `
    html = html.replace(fullTable, tableHtml)
  }

  // 处理无序列表
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[^<]*<\/li>\n?)+/g, '<ul>$&</ul>')

  // 处理有序列表
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>[^<]*<\/li>\n?)+/g, '<ol>$&</ol>')

  // 处理水平线
  html = html.replace(/^---$/gm, '<hr style="margin: 20px 0; border: none; border-top: 2px solid #E4E7ED;">')

  // 处理段落
  html = html.replace(/\n\n/g, '</p><p>')
  html = '<p>' + html + '</p>'

  // 清理空段落
  html = html.replace(/<p>\s*<\/p>/g, '')

  return html
}

// HTML 转义
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 解析表格行
const parseTableRow = (line: string): string => {
  const cells = line.split('|').slice(1, -1)
  const tag = line.includes('---') ? 'th' : 'td'
  return `<tr>${cells.map(cell => `<${tag}>${cell.trim()}</${tag}>`).join('')}</tr>`
}

onMounted(() => {
  console.log('帮助文档组件已加载')
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.help-doc-container {
  display: flex;
  min-height: calc(100vh - 64px);
  background: $bg-color;
}

.sidebar {
  width: 280px;
  background: $bg-page;
  border-right: 1px solid $border-light;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  .sidebar-header {
    background: linear-gradient(135deg, $nav-bg-gradient-mid 0%, $nav-bg-gradient-end 100%);
    color: $nav-text-primary;
    padding: 14px 15px;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 10;

    .logo {
      font-size: 1.8rem;
      margin-bottom: 4px;
      line-height: 1;
    }

    h1 {
      font-size: 1.1rem;
      margin-bottom: 2px;
      line-height: 1.2;
    }

    .subtitle {
      opacity: 0.9;
      font-size: 0.75rem;
      line-height: 1.2;
    }
  }

  .nav-section {
    padding: 10px 10px;
    border-bottom: 1px solid $border-light;

    &:last-child {
      border-bottom: none;
    }

    .nav-section-title {
      font-weight: 600;
      color: $text-regular;
      margin-bottom: 6px;
      padding-left: 6px;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 4px;
      line-height: 1.2;
    }

    .nav-item {
      padding: 6px 10px;
      margin-bottom: 2px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;

      &:hover {
        background: $border-extra-light;
      }

      &.active {
        background: $primary-color;
        color: white;
      }

      .nav-item-icon {
        font-size: 0.9rem;
        flex-shrink: 0;
        line-height: 1;
      }

      .nav-item-text {
        flex: 1;
        font-size: 0.8rem;
        line-height: 1.3;
      }

      .nav-item-badge {
        background: $warning-color;
        color: $text-primary;
        padding: 1px 5px;
        border-radius: 6px;
        font-size: 0.6rem;
        font-weight: 600;
        flex-shrink: 0;
        line-height: 1;
      }
    }
  }
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .content-header {
    background: $bg-color;
    padding: 12px 20px;
    border-bottom: 1px solid $border-light;
    display: flex;
    justify-content: flex-end;

    .search-box {
      display: flex;
      align-items: center;
      background: $bg-page;
      border-radius: 20px;
      padding: 6px 15px;
      width: 100%;
      max-width: 350px;

      input {
        border: none;
        background: transparent;
        outline: none;
        flex: 1;
        font-size: 0.9rem;
        margin-left: 8px;
      }

      .search-icon {
        color: $text-secondary;
        font-size: 0.9rem;
      }
    }
  }

  .content-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;

    .loading-state,
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      text-align: center;

      .loading-icon,
      .error-icon {
        font-size: 2.5rem;
        margin-bottom: 15px;
      }

      h2 {
        color: $text-primary;
        margin-bottom: 8px;
        font-size: 1.4rem;
      }

      p {
        color: $text-regular;
        margin-bottom: 15px;
      }
    }

    .welcome-section {
      max-width: 750px;
      margin: 0 auto;

      .welcome-header {
        text-align: center;
        margin-bottom: 30px;

        h1 {
          font-size: 2rem;
          color: $text-primary;
          margin-bottom: 10px;
        }

        p {
          color: $text-regular;
          font-size: 1rem;
        }
      }

      .quick-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 15px;
        margin-bottom: 30px;

        .quick-action-card {
          background: linear-gradient(135deg, $primary-color 0%, $primary-dark 100%);
          color: white;
          padding: 18px 15px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;

          &:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(64, 158, 255, 0.3);
          }

          .quick-action-icon {
            font-size: 2rem;
            margin-bottom: 8px;
          }

          .quick-action-title {
            font-weight: 600;
            font-size: 0.95rem;
          }
        }
      }

      .feature-section {
        background: $bg-page;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 15px;

        h2 {
          color: $text-primary;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.3rem;
        }

        h3 {
          color: $text-regular;
          margin: 15px 0 8px 0;
          font-size: 1.05rem;
        }

        .service-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;

          .service-item {
            background: white;
            padding: 14px;
            border-radius: 10px;
            border: 2px solid $border-light;
            transition: all 0.3s ease;

            &:hover {
              border-color: $primary-color;
              box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
            }

            .service-name {
              font-weight: 600;
              color: $text-primary;
              margin-bottom: 4px;
              font-size: 0.9rem;
            }

            .service-url {
              color: $primary-color;
              font-size: 0.8rem;
              word-break: break-all;
            }
          }
        }

        .tech-stack {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;

          .tech-badge {
            background: $primary-extra-light;
            color: $primary-dark;
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 0.8rem;
            font-weight: 500;
          }
        }

        .faq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;

          .faq-item {
            background: white;
            padding: 12px;
            border-radius: 8px;
            border: 2px solid $border-light;
            transition: all 0.3s ease;

            &:hover {
              border-color: $primary-color;
              box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
            }

            .faq-title {
              font-weight: 600;
              color: $text-primary;
              margin-bottom: 6px;
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 0.85rem;

              &::before {
                content: '❓';
                font-size: 12px;
              }
            }

            .faq-solution {
              color: $primary-color;
              font-size: 0.85rem;
              padding-left: 18px;
              position: relative;

              &::before {
                content: '💡';
                position: absolute;
                left: 0;
                top: 0;
                font-size: 12px;
              }
            }
          }
        }

        p {
          color: $text-regular;
          margin-bottom: 8px;
          font-size: 0.9rem;

          code {
            background: $border-extra-light;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
          }
        }
      }
    }

    .back-button {
      margin-bottom: 15px;
    }

    .markdown-content {
      max-width: 850px;
      margin: 0 auto;
      line-height: 1.7;

      .dev-order-tip {
        margin-top: 12px;
        padding: 8px 12px;
        background: $primary-extra-light;
        border-radius: 6px;

        p {
          margin-bottom: 0;
          font-size: 0.9rem;
        }
      }

      :deep(h1) {
        color: $text-primary;
        font-size: 1.8rem;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid $border-light;
      }

      :deep(h2) {
        color: $text-primary;
        font-size: 1.35rem;
        margin: 24px 0 12px 0;
        padding-left: 12px;
        border-left: 4px solid $primary-color;
      }

      :deep(h3) {
        color: $text-regular;
        font-size: 1.1rem;
        margin: 20px 0 8px 0;
      }

      :deep(p) {
        color: $text-regular;
        margin-bottom: 12px;
        font-size: 0.95rem;
      }

      :deep(code) {
        background: $bg-page;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 0.85rem;
        color: $text-primary;
      }

      :deep(pre) {
        background: $nav-bg-gradient-end;
        color: $nav-text-primary;
        padding: 16px;
        border-radius: 8px;
        overflow-x: auto;
        margin-bottom: 16px;
      }

      :deep(pre code) {
        background: transparent;
        padding: 0;
        color: $nav-text-primary;
        font-family: 'Courier New', monospace;
        font-size: 0.85rem;
      }

      :deep(blockquote) {
        background: rgba(230, 162, 60, 0.1);
        border-left: 4px solid $warning-color;
        padding: 12px 16px;
        margin: 16px 0;
        border-radius: 0 8px 8px 0;
        font-size: 0.95rem;
      }

      :deep(table) {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        background: white;

        th {
          background: $primary-color;
          color: white;
          padding: 10px 12px;
          text-align: left;
          font-size: 0.9rem;
        }

        td {
          padding: 10px 12px;
          border-bottom: 1px solid $border-light;
          font-size: 0.9rem;
        }

        tr:hover {
          background: $bg-page;
        }
      }

      :deep(a) {
        color: $primary-color;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      :deep(ul),
      :deep(ol) {
        color: $text-regular;
        margin: 12px 0;
        padding-left: 24px;
        font-size: 0.95rem;
      }

      :deep(li) {
        color: $text-regular;
        margin: 6px 0;
        line-height: 1.5;
      }

      :deep(ul) {
        list-style-type: disc;
      }

      :deep(ol) {
        list-style-type: decimal;
      }

      :deep(pre ul),
      :deep(pre ol),
      :deep(pre li) {
        color: $nav-text-primary;
      }
    }
  }
}

// 滚动条样式
.sidebar::-webkit-scrollbar,
.content-body::-webkit-scrollbar {
  width: 8px;
}

.sidebar::-webkit-scrollbar-track,
.content-body::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.sidebar::-webkit-scrollbar-thumb,
.content-body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.sidebar::-webkit-scrollbar-thumb:hover,
.content-body::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

// 响应式设计
@media (max-width: 1024px) {
  .help-doc-container {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid $border-light;
    max-height: 300px;
  }

  .content-body {
    padding: 20px;
  }
}
</style>
