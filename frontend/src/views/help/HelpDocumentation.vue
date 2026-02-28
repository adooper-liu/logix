<template>
  <div class="help-doc-container">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="logo">📋</div>
        <h1>帮助文档</h1>
        <p class="subtitle">LogiX 系统使用指南</p>
      </div>

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
            <div class="quick-action-card" @click="loadDoc('TIMESCALEDB', '/docs/TIMESCALEDB_GUIDE.md')">
              <div class="quick-action-icon">📊</div>
              <div class="quick-action-title">数据库指南</div>
            </div>
            <div class="quick-action-card" @click="loadDoc('DEV_ENV', '/docs/DEV_ENVIRONMENT_GUIDE.md')">
              <div class="quick-action-icon">🔧</div>
              <div class="quick-action-title">环境配置</div>
            </div>
            <div class="quick-action-card" @click="loadDoc('QUICK_START', '/docs/QUICK_START.md')">
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
            <p><strong>启动开发环境:</strong> 双击 <code>start-logix-dev.bat</code></p>
            <p><strong>停止开发环境:</strong> 双击 <code>stop-logix-dev.bat</code></p>
            <p><strong>启动数据库:</strong> 双击 <code>tsdb-start.bat</code></p>
            <p><strong>停止数据库:</strong> 双击 <code>tsdb-stop.bat</code></p>
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
            <div style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 8px;">
              <p style="margin-bottom: 0;">💡 <strong>开发必读顺序</strong>: 开发规范 → 核心映射参考 → 开始编码</p>
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
    key: 'INDEX',
    title: '项目总纲',
    icon: '📚',
    path: '/docs/INDEX.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'QUICK_START',
    title: '快速开始',
    icon: '🚀',
    path: '/docs/QUICK_START.md',
    badge: '⭐'
  },
  {
    key: 'DEV_ENV',
    title: '开发环境指南',
    icon: '⚡',
    path: '/docs/DEV_ENVIRONMENT_GUIDE.md',
    badge: '⭐'
  }
]

const devDocs = [
  {
    key: 'FRONTEND',
    title: '前端文档',
    icon: '🎨',
    path: '/docs/frontend.md'
  },
  {
    key: 'BACKEND',
    title: '后端文档',
    icon: '⚙️',
    path: '/docs/backend.md'
  }
]

const projectDocs = [
  {
    key: 'PROJECT_STATUS',
    title: '项目现状与开发计划（整合container-system）',
    icon: '📊',
    path: '/docs-temp/PROJECT_STATUS_AND_DEVELOPMENT_PLAN.md',
    badge: '⭐⭐⭐'
  }
]

const logisticsFlowDocs = [
  {
    key: 'LOGISTICS_FLOW',
    title: '物流全流程完整指南',
    icon: '📦',
    path: '/docs/LOGISTICS_FLOW_COMPLETE.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'LOGISTICS_STATUS_MACHINE',
    title: '物流状态机',
    icon: '🔄',
    path: '/docs/LOGISTICS_STATUS_STATE_MACHINE.md',
    badge: '⭐'
  },
  {
    key: 'UNIFIED_STATUS',
    title: '统一状态机实现',
    icon: '🔀',
    path: '/docs/UNIFIED_STATUS_MACHINE_IMPLEMENTATION.md'
  }
]

const coreDocs = [
  {
    key: 'DEV_STANDARDS',
    title: '开发规范',
    icon: '📝',
    path: '/docs/DEVELOPMENT_STANDARDS.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'CORE_MAPPINGS',
    title: '核心映射参考',
    icon: '🔗',
    path: '/docs/CORE_MAPPINGS_REFERENCE.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'BACKEND_QUICK_REF',
    title: '后端快速参考',
    icon: '⚡',
    path: '/docs/BACKEND_QUICK_REFERENCE.md'
  }
]

const docsArchitectureDocs = [
  {
    key: 'ARCHITECTURE',
    title: '系统架构说明',
    icon: '🏗️',
    path: '/docs/ARCHITECTURE_EXPLAINED.md',
    badge: '⭐'
  },
  {
    key: 'UNIVERSAL_DICT',
    title: '通用字典映射',
    icon: '📚',
    path: '/docs/UNIVERSAL_DICT_MAPPING_GUIDE.md'
  }
]

const docsFeatureDocs = [
  {
    key: 'EXTERNAL_DATA',
    title: '外部数据集成',
    icon: '🔌',
    path: '/docs/EXTERNAL_DATA_INTEGRATION_GUIDE.md',
    badge: '⭐'
  },
  {
    key: 'EXTERNAL_DATA_QUICK',
    title: '外部数据快速开始',
    icon: '⚡',
    path: '/docs/EXTERNAL_DATA_QUICKSTART.md'
  },
  {
    key: 'EXTERNAL_DATA_SUMMARY',
    title: '外部数据集成总结',
    icon: '📋',
    path: '/docs/EXTERNAL_DATA_INTEGRATION_SUMMARY.md'
  },
  {
    key: 'MULTIPLE_ORDERS',
    title: '多订单货柜',
    icon: '📦',
    path: '/docs/MULTIPLE_ORDERS_PER_CONTAINER.md'
  },
  {
    key: 'TIME_FIX',
    title: '时间修复实现',
    icon: '⏰',
    path: '/docs/IMPLEMENT_TIME_FIX_GUIDE.md'
  },
  {
    key: 'TIMESTAMP_MIGRATION',
    title: '时间戳迁移',
    icon: '🔄',
    path: '/docs/TIMESTAMP_MIGRATION_COMPLETE.md'
  }
]

const docsProblemDocs = [
  {
    key: 'EXCEL_IMPORT',
    title: 'Excel 导入',
    icon: '📊',
    path: '/docs/EXCEL_IMPORT_GUIDE.md'
  },
  {
    key: 'EXCEL_STATUS',
    title: 'Excel 状态映射',
    icon: '📈',
    path: '/docs/EXCEL_STATUS_MAPPING.md'
  },
  {
    key: 'EXCEL_STATUS_ISSUE',
    title: 'Excel 状态映射问题',
    icon: '⚠️',
    path: '/docs/EXCEL_STATUS_MAPPING_ISSUE.md'
  },
  {
    key: 'DATE_FIX_SUMMARY',
    title: '日期修复总结',
    icon: '📅',
    path: '/docs/DATE_FIX_SUMMARY.md'
  },
  {
    key: 'DATE_PARSING_FIX',
    title: '日期解析修复',
    icon: '🔧',
    path: '/docs/DATE_PARSING_FIX.md'
  },
  {
    key: 'IMPORT_MAPPING_FIX',
    title: '导入映射修复',
    icon: '🛠️',
    path: '/docs/IMPORT_MAPPING_FIX_SUMMARY.md'
  },
  {
    key: 'FREIGHT_FIX',
    title: '运费币种金额修复',
    icon: '💰',
    path: '/docs/FREIGHT_CURRENCY_AMOUNT_IMPORT_FIX.md'
  }
]

const docsDevDocs = [
  {
    key: 'COUNTDOWN_LOGIC',
    title: '倒计时卡片逻辑',
    icon: '⏱️',
    path: '/docs/COUNTDOWN_CARD_LOGIC.md',
    badge: '⭐'
  },
  {
    key: 'DEVELOPMENT_SUMMARY',
    title: '开发总结',
    icon: '📝',
    path: '/docs/DEVELOPMENT_SUMMARY.md'
  },
  {
    key: 'CLEAR_PORTS',
    title: '清除港口重复',
    icon: '🧹',
    path: '/docs/CLEAR_PORTS_TAB_DUPLICATION.md'
  },
  {
    key: 'CONTAINER_FIX',
    title: '集装箱号修复',
    icon: '🔢',
    path: '/docs/CONTAINER_NUMBER_FIX.md'
  },
  {
    key: 'ARRIVAL_COUNTDOWN',
    title: '到港倒计时验证',
    icon: '✅',
    path: '/docs/ARRIVAL_COUNTDOWN_VERIFICATION.md'
  },
  {
    key: 'DATA_VERIFICATION',
    title: '数据验证报告',
    icon: '📋',
    path: '/docs/DATA_VERIFICATION_REPORT_MRKU4896861.md'
  },
  {
    key: 'TRANSFER_DATE_TYPE',
    title: '转运日期类型变更',
    icon: '📅',
    path: '/docs/DOCUMENT_TRANSFER_DATE_TYPE_CHANGE.md'
  }
]

const dbDocs = [
  {
    key: 'TIMESCALEDB',
    title: 'TimescaleDB 完整指南',
    icon: '📊',
    path: '/docs/TIMESCALEDB_GUIDE.md',
    badge: '⭐'
  },
  {
    key: 'TIMESCALEDB_QUICK',
    title: 'TimescaleDB 快速参考',
    icon: '⚡',
    path: '/docs/TIMESCALEDB_QUICK_REFERENCE.md',
    badge: '⭐'
  }
]

const codeStandardDocs = [
  {
    key: 'CODE_STANDARDS',
    title: '代码规范与最佳实践',
    icon: '📋',
    path: '/docs/CODE_STANDARDS.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'NAMING_CONVENTIONS',
    title: '命名规范',
    icon: '🏷️',
    path: '/docs/NAMING_CONVENTIONS.md',
    badge: '⭐⭐⭐'
  },
  {
    key: 'NAMING_QUICK_REF',
    title: '命名规范快速参考',
    icon: '⚡',
    path: '/docs/NAMING_QUICK_REFERENCE.md',
    badge: '⭐'
  },
  {
    key: 'LINT_GUIDE',
    title: 'Lint 使用指南',
    icon: '🔧',
    path: '/docs/LINT_GUIDE.md',
    badge: '⭐'
  },
  {
    key: 'LINT_SETUP',
    title: 'Lint 配置总结',
    icon: '⚙️',
    path: '/docs/LINT_SETUP_SUMMARY.md'
  }
]

const toolDocs = [
  // 管理工具类文档，暂时为空
  // 如有需要，可以添加数据库管理工具、部署工具等相关文档
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

// 获取返回按钮文本
const backButtonText = computed(() => {
  if (docHistory.value.length > 0) {
    const prevDoc = docHistory.value[docHistory.value.length - 1]
    const docTitle = quickStartDocs.find(doc => doc.key === prevDoc.key)?.title || prevDoc.key
    return `← 返回 ${docTitle}`
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

  // 高亮匹配的文档
  const navItems = document.querySelectorAll('.nav-item')
  navItems.forEach((item: any) => {
    const text = item.querySelector('.nav-item-text')?.textContent?.toLowerCase() || ''
    if (text.includes(query)) {
      item.style.background = '#fff3cd'
    } else {
      item.style.background = ''
    }
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
  html = html.replace(/^---$/gm, '<hr style="margin: 20px 0; border: none; border-top: 2px solid #e9ecef;">')

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
.help-doc-container {
  display: flex;
  min-height: calc(100vh - 64px);
  background: white;
}

.sidebar {
  width: 350px;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  .sidebar-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px 25px;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 10;

    .logo {
      font-size: 3rem;
      margin-bottom: 10px;
    }

    h1 {
      font-size: 1.5rem;
      margin-bottom: 5px;
    }

    .subtitle {
      opacity: 0.9;
      font-size: 0.9rem;
    }
  }

  .nav-section {
    padding: 20px 15px;
    border-bottom: 1px solid #e9ecef;

    .nav-section-title {
      font-weight: 600;
      color: #495057;
      margin-bottom: 12px;
      padding-left: 10px;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nav-item {
      padding: 12px 15px;
      margin-bottom: 5px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 10px;

      &:hover {
        background: #e9ecef;
      }

      &.active {
        background: #667eea;
        color: white;
      }

      .nav-item-icon {
        font-size: 1.2rem;
        flex-shrink: 0;
      }

      .nav-item-text {
        flex: 1;
        font-size: 0.9rem;
      }

      .nav-item-badge {
        background: #ffc107;
        color: #212529;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 0.7rem;
        font-weight: 600;
        flex-shrink: 0;
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
    background: white;
    padding: 20px 30px;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    justify-content: flex-end;

    .search-box {
      display: flex;
      align-items: center;
      background: #f8f9fa;
      border-radius: 25px;
      padding: 10px 20px;
      width: 100%;
      max-width: 400px;

      input {
        border: none;
        background: transparent;
        outline: none;
        flex: 1;
        font-size: 0.95rem;
        margin-left: 10px;
      }

      .search-icon {
        color: #6c757d;
      }
    }
  }

  .content-body {
    flex: 1;
    overflow-y: auto;
    padding: 30px;

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
        font-size: 3rem;
        margin-bottom: 20px;
      }

      h2 {
        color: #2c3e50;
        margin-bottom: 10px;
      }

      p {
        color: #6c757d;
        margin-bottom: 20px;
      }
    }

    .welcome-section {
      max-width: 800px;
      margin: 0 auto;

      .welcome-header {
        text-align: center;
        margin-bottom: 40px;

        h1 {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 15px;
        }

        p {
          color: #6c757d;
          font-size: 1.1rem;
        }
      }

      .quick-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 40px;

        .quick-action-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 25px;
          border-radius: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;

          &:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
          }

          .quick-action-icon {
            font-size: 2.5rem;
            margin-bottom: 10px;
          }

          .quick-action-title {
            font-weight: 600;
            font-size: 1.1rem;
          }
        }
      }

      .feature-section {
        background: #f8f9fa;
        padding: 30px;
        border-radius: 15px;
        margin-bottom: 20px;

        h2 {
          color: #2c3e50;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        h3 {
          color: #495057;
          margin: 20px 0 10px 0;
        }

        .service-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;

          .service-item {
            background: white;
            padding: 20px;
            border-radius: 12px;
            border: 2px solid #e9ecef;
            transition: all 0.3s ease;

            &:hover {
              border-color: #667eea;
              box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
            }

            .service-name {
              font-weight: 600;
              color: #2c3e50;
              margin-bottom: 5px;
            }

            .service-url {
              color: #667eea;
              font-size: 0.85rem;
              word-break: break-all;
            }
          }
        }

        .tech-stack {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;

          .tech-badge {
            background: #e3f2fd;
            color: #1976d2;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
          }
        }

        .faq-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;

          .faq-item {
            background: white;
            padding: 15px;
            border-radius: 10px;
            border: 2px solid #e9ecef;
            transition: all 0.3s ease;

            &:hover {
              border-color: #667eea;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
            }

            .faq-title {
              font-weight: 600;
              color: #2c3e50;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 6px;

              &::before {
                content: '❓';
                font-size: 14px;
              }
            }

            .faq-solution {
              color: #667eea;
              font-size: 0.9rem;
              padding-left: 20px;
              position: relative;

              &::before {
                content: '💡';
                position: absolute;
                left: 0;
                top: 0;
              }
            }
          }
        }

        p {
          color: #495057;
          margin-bottom: 10px;

          code {
            background: #e9ecef;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
          }
        }
      }
    }

    .back-button {
      margin-bottom: 20px;
    }

    .markdown-content {
      max-width: 900px;
      margin: 0 auto;
      line-height: 1.8;

      :deep(h1) {
        color: #2c3e50;
        font-size: 2rem;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e9ecef;
      }

      :deep(h2) {
        color: #2c3e50;
        font-size: 1.5rem;
        margin: 30px 0 15px 0;
        padding-left: 15px;
        border-left: 4px solid #667eea;
      }

      :deep(h3) {
        color: #495057;
        font-size: 1.2rem;
        margin: 25px 0 10px 0;
      }

      :deep(p) {
        color: #495057;
        margin-bottom: 15px;
      }

      :deep(code) {
        background: #f8f9fa;
        padding: 2px 8px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 0.9rem;
        color: #2c3e50;
      }

      :deep(pre) {
        background: #2c3e50;
        color: #f8f9fa;
        padding: 20px;
        border-radius: 10px;
        overflow-x: auto;
        margin-bottom: 20px;
      }

      :deep(pre code) {
        background: transparent;
        padding: 0;
        color: #f8f9fa;
        font-family: 'Courier New', monospace;
      }

      :deep(blockquote) {
        background: #fff3cd;
        border-left: 4px solid #ffc107;
        padding: 15px 20px;
        margin: 20px 0;
        border-radius: 0 10px 10px 0;
      }

      :deep(table) {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        background: white;

        th {
          background: #667eea;
          color: white;
          padding: 12px;
          text-align: left;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #e9ecef;
        }

        tr:hover {
          background: #f8f9fa;
        }
      }

      :deep(a) {
        color: #667eea;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      :deep(ul),
      :deep(ol) {
        color: #495057;
        margin: 15px 0;
        padding-left: 30px;
      }

      :deep(li) {
        color: #495057;
        margin: 8px 0;
        line-height: 1.6;
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
        color: #f8f9fa;
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
    border-bottom: 1px solid #e9ecef;
    max-height: 300px;
  }

  .content-body {
    padding: 20px;
  }
}
</style>
