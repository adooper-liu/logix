<template>
  <div class="about-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="brand-highlight">LogiX 看见，方能掌控</span>
        </h1>
        <p class="hero-slogan">让复杂物流变得轻松愉快</p>
        <!-- <p class="hero-subtitle">
          构建六个一闭环、全链路的实时数字孪生体，让每一个物理单元都得到最佳安排
        </p> -->
        <div class="hero-actions">
          <el-button type="primary" size="large" @click="goToDashboard">
            <el-icon><DataBoard /></el-icon>
            立即体验
          </el-button>
          <el-button size="large" @click="scrollTo('architecture')">
            <el-icon><Document /></el-icon>
            了解更多
          </el-button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="floating-box box-1">
          <el-icon><Box /></el-icon>
        </div>
        <div class="floating-box box-2">
          <el-icon><Ship /></el-icon>
        </div>
        <div class="floating-box box-3">
          <el-icon><Odometer /></el-icon>
        </div>
      </div>
    </section>

    <!-- 基石理念：六个每一个 -->
    <section class="cost-section">
      <div class="section-container">
        <h2 class="section-title">💡 基石理念：让每一个单元，都得到最好的安排</h2>
        <div class="cost-intro">
          <div class="cost-quote">
            <p><strong>"物流管理的本质，是对物理世界流动的优化"</strong></p>
            <ul>
              <li>从「数据淹没」到「价值洞察」：可视化将数据转化为可操作的洞察</li>
              <li>「六个每一个」的闭环：货柜、订单、包裹、库位、仓位、员工操作构成完整管理闭环</li>
              <li>从被动响应到主动导航：可视化是实现预测性、主动性管理的基石</li>
            </ul>
            <!-- 闭环精髓 -->
            <p>
              <strong>
                <span class="linkage-icon">🔄</span>
                「六个每一个」的价值闭环的精髓在于联动
              </strong>
            </p>
            <ul>
              <li>一个货柜的延误，会影响其中特定订单的交付，进而导致对应包裹无法按时出库。</li>
              <li>
                系统会自动预警，并可能触发从其他库位调拨库存，通过优化装载的仓位发出，同时为员工生成新的拣货与发货任务。
              </li>
              <li>可视化系统让这个联动过程全局透明，协同响应。</li>
            </ul>
            <!-- 哲学总结 -->

            <p><strong>从管理数据到管理价值</strong></p>
            <ul>
              <li>
                当六个要素全面数字化与可视化，我们便得以从<strong>「管理数据」</strong>升维至<strong>「管理价值」</strong>。
              </li>
              <li>
                通过<strong>色彩编码</strong>、<strong>空间映射</strong>、<strong>动态流动</strong>，让海量数据转化为可直接驱动行动的价值洞察，实现让每一个物理单元都得到最佳安排。
              </li>
            </ul>
          </div>
        </div>

        <div class="best-arrangement-trilogy">
          <h3 class="trilogy-title">最好的安排三步曲</h3>
          <div class="trilogy-steps">
            <div class="trilogy-step">
              <span class="step-num">一</span>
              <span class="step-label">始于「被看见」</span>
              <span class="step-desc">从黑箱到白箱的旅程</span>
            </div>
            <div class="trilogy-step">
              <span class="step-num">二</span>
              <span class="step-label">成于「被理解」</span>
              <span class="step-desc">透彻洞察与前瞻调度</span>
            </div>
            <div class="trilogy-step">
              <span class="step-num">三</span>
              <span class="step-label">终于「被行动」</span>
              <span class="step-desc">从全球到本地的无缝协同</span>
            </div>
          </div>
          <div class="trilogy-link-wrap">
            <span
              class="trilogy-link"
              role="button"
              tabindex="0"
              title="阅读第二章：以货柜为中心"
              @click="goToChapter(2)"
              @keydown.enter="goToChapter(2)"
            >
              <el-icon><ArrowRight /></el-icon>
            </span>
          </div>
        </div>

        <div class="focus-area">
          <div class="six-ones-diagram-wrap">
            <SixOnesDiagram />
          </div>
        </div>
      </div>
    </section>

    <!-- 核心价值主张 -->
    <section class="value-section">
      <div class="section-container">
        <h2 class="section-title">🎯 核心价值主张</h2>
        <div class="value-grid">
          <div class="value-card">
            <div class="value-icon value-icon-primary">
              <el-icon><Monitor /></el-icon>
            </div>
            <h3>六个一闭环</h3>
            <p>货柜、订单、包裹、库位、仓位、员工操作，六维闭环透明，让数据「说话」</p>
          </div>
          <div class="value-card">
            <div class="value-icon value-icon-accent">
              <el-icon><View /></el-icon>
            </div>
            <h3>从黑箱到白箱</h3>
            <p>将海运、头程、仓配、末端的最大不确定性转化为可控变量</p>
          </div>
          <div class="value-card">
            <div class="value-icon value-icon-cyan">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <h3>价值驱动决策</h3>
            <p>降低单位物流成本、提升交付准时率、提高客户满意度</p>
          </div>
          <div class="value-card">
            <div class="value-icon value-icon-success">
              <el-icon><Aim /></el-icon>
            </div>
            <h3>主动导航</h3>
            <p>从「感知-响应」升维至「预测-规划-执行」，实现智能副驾驶</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 智慧物流愿景：序章、第一章～第六章、终章、系列结语 -->
    <section id="vision-chapters" class="vision-chapters-section">
      <div class="section-container">
        <h2 class="section-title">📚 智慧物流愿景</h2>
        <p class="vision-chapters-intro">以「六个每一个」为抓手，让复杂的物流变得轻松愉快。</p>
        <div class="vision-chapters-grid">
          <div
            v-for="ch in visionChapters"
            :key="ch.id"
            class="vision-chapter-card"
            @click="goToChapter(ch.id)"
          >
            <div class="chapter-card-icon">{{ ch.icon }}</div>
            <div class="chapter-card-badge">{{ ch.badge ?? `第 ${ch.id} 章` }}</div>
            <h3 class="chapter-card-title">{{ ch.title }}</h3>
            <p v-if="ch.subtitle" class="chapter-card-subtitle">{{ ch.subtitle }}</p>
            <p class="chapter-card-summary">{{ ch.summary }}</p>
            <div class="chapter-card-action">
              <span>查看详情</span>
              <el-icon><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 系统架构 -->
    <section id="architecture" class="architecture-section">
      <div class="section-container">
        <h2 class="section-title">🏗️ 系统架构</h2>

        <!-- 技术基础 -->
        <div class="arch-block">
          <h3>理论基础</h3>
          <div class="theory-grid">
            <div class="theory-item">
              <el-icon><Connection /></el-icon>
              <h4>供应链协同理论</h4>
              <p>
                通过信息共享实现货主、货代、船公司、港口、海关等多方协同作业，减少信息不对称导致的效率损失
              </p>
            </div>
            <div class="theory-item">
              <el-icon><View /></el-icon>
              <h4>端到端可视性理论</h4>
              <p>全链路货物追踪，从起运港到目的港的每一个关键节点都有状态记录和预警机制</p>
            </div>
            <div class="theory-item">
              <el-icon><Clock /></el-icon>
              <h4>时效性管理理论</h4>
              <p>基于ETD、ETA、ATA等时间节点，实现运输计划与实际执行的动态管理</p>
            </div>
            <div class="theory-item">
              <el-icon><Wallet /></el-icon>
              <h4>费用控制理论</h4>
              <p>通过滞期费、滞箱费等费用模型的精细化计算，控制物流成本</p>
            </div>
          </div>
        </div>

        <!-- 核心技术方案 -->
        <div class="arch-block">
          <h3>核心技术方案</h3>

          <el-tabs v-model="activeTab" class="tech-tabs">
            <el-tab-pane label="高可视化设计" name="visualization">
              <div class="tab-content">
                <div class="tech-feature">
                  <div class="tech-icon">🌍</div>
                  <div class="tech-detail">
                    <h4>3D数字孪生地图</h4>
                    <p>
                      为核心界面，集成全球AIS船舶数据接口，实时显示货轮在全球航线上的位置、航速与ETA
                    </p>
                    <div class="tech-tags">
                      <el-tag type="primary">全球航线热力图</el-tag>
                      <el-tag type="success">港口数字孪生沙盘</el-tag>
                      <el-tag type="warning">拖车轨迹追踪</el-tag>
                    </div>
                  </div>
                </div>
                <div class="tech-feature">
                  <div class="tech-icon">📍</div>
                  <div class="tech-detail">
                    <h4>堆场智能定位</h4>
                    <p>
                      对接港口码头操作系统（TOS）API，自动定位货柜在堆场的具体贝位、列、层，实时更新状态
                    </p>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="核心调度流程" name="scheduling">
              <div class="tab-content">
                <div class="process-flow">
                  <div class="process-step" v-for="(step, index) in processSteps" :key="index">
                    <div class="step-number">{{ index + 1 }}</div>
                    <div class="step-content">
                      <h4>{{ step.title }}</h4>
                      <p>{{ step.description }}</p>
                      <div class="step-status">
                        <el-icon><CircleCheck /></el-icon>
                        <span>{{ step.status }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="风险预警体系" name="risk">
              <div class="tab-content">
                <div class="risk-levels">
                  <div class="risk-level level-high">
                    <div class="level-indicator"></div>
                    <h4>🔴 红色（紧急）</h4>
                    <ul>
                      <li>海关查验扣货</li>
                      <li>码头拥堵导致甩柜</li>
                      <li>台风天气封港</li>
                    </ul>
                  </div>
                  <div class="risk-level level-medium">
                    <div class="level-indicator"></div>
                    <h4>🟠 橙色（高风险）</h4>
                    <ul>
                      <li>免费用箱期即将到期</li>
                      <li>船期延误超过3天</li>
                      <li>关键节点异常</li>
                    </ul>
                  </div>
                  <div class="risk-level level-low">
                    <div class="level-indicator"></div>
                    <h4>🟡 黄色（关注）</h4>
                    <ul>
                      <li>运力紧张预警</li>
                      <li>常规延误提醒</li>
                      <li>操作效率监控</li>
                    </ul>
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="费用最小化模型" name="cost">
              <div class="tab-content">
                <div class="cost-model">
                  <div class="formula-box">
                    <h4>目标函数</h4>
                    <div class="formula">Minimize (总费用) = 运输成本 + 时间成本 + 风险成本</div>
                  </div>
                  <div class="cost-breakdown">
                    <div class="cost-item">
                      <h4>📊 运输成本（显性）</h4>
                      <ul>
                        <li>海运运费</li>
                        <li>拖车费</li>
                        <li>码头操作费（THC）</li>
                      </ul>
                    </div>
                    <div class="cost-item">
                      <h4>⏱️ 时间成本（隐性）</h4>
                      <ul>
                        <li>堆存费：货物在码头滞留产生</li>
                        <li>滞箱费：集装箱超期未还产生</li>
                        <li>资金占用成本：影响周转效率</li>
                      </ul>
                    </div>
                    <div class="cost-item">
                      <h4>⚠️ 风险成本（惩罚）</h4>
                      <ul>
                        <li>海关查验导致的延误成本</li>
                        <li>货物破损导致的理赔成本</li>
                        <li>异常情况的处理成本</li>
                      </ul>
                    </div>
                  </div>
                  <div class="evaluation">
                    <el-alert type="success" :closable="false">
                      <template #title>
                        <strong>评价机制：</strong
                        >系统会对每一次运输方案进行模拟打分，综合费用最优的方案，而非单纯运费最低的方案
                      </template>
                    </el-alert>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 关键技术组件 -->
        <div class="arch-block">
          <h3>关键技术组件</h3>
          <div class="tech-components">
            <div class="component-card">
              <div class="component-icon">🎭</div>
              <h4>数字孪生技术</h4>
              <p>3D可视化港口、堆场、运输工具的实时状态</p>
            </div>
            <div class="component-card">
              <div class="component-icon">🔀</div>
              <h4>多源数据融合</h4>
              <p>整合AIS、GPS、TOS、海关等多维度数据</p>
            </div>
            <div class="component-card">
              <div class="component-icon">🤖</div>
              <h4>AI优化算法</h4>
              <p>多目标优化，智能调度与路径规划</p>
            </div>
            <div class="component-card">
              <div class="component-icon">📢</div>
              <h4>实时监控预警</h4>
              <p>三级预警机制，及时响应异常</p>
            </div>
            <div class="component-card">
              <div class="component-icon">📱</div>
              <h4>移动端协同</h4>
              <p>随时随地掌握物流动态</p>
            </div>
            <div class="component-card">
              <div class="component-icon">🔌</div>
              <h4>第三方接口集成</h4>
              <p>无缝对接船公司、港口、海关系统</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 开发计划与路线图 -->
    <section id="roadmap" class="roadmap-section">
      <div class="section-container">
        <h2 class="section-title">📅 开发计划与路线图</h2>
        <div class="roadmap-content">
          <div class="roadmap-phase">
            <div class="phase-badge">已实现</div>
            <ul>
              <li>货柜全生命周期（备货单 → 海运 → 港口 → 拖卡 → 仓库 → 还箱）</li>
              <li>7 层物流状态机、33 种详细状态映射</li>
              <li>飞驼 API 接入（FeiTuoAdapter、状态码映射）</li>
              <li>滞港费表结构、最晚提柜五类统计、倒计时卡片</li>
              <li>甘特图泳道、桑基图、Excel 导入、字典映射</li>
            </ul>
          </div>
          <div class="roadmap-phase">
            <div class="phase-badge pending">规划中</div>
            <ul>
              <li><strong>五节点调度</strong>：清关、拖卡、卸柜、还箱、查验的计划与可视化</li>
              <li><strong>智能排柜</strong>：规则引擎、资源占用、计划时间生成</li>
              <li><strong>滞港费闭环</strong>：last_free_date 自动计算、滞港费计算服务</li>
              <li><strong>飞驼深化</strong>：异常预警推送、智能 ETA 预测</li>
            </ul>
          </div>
          <div class="roadmap-actions">
            <el-button type="primary" @click="router.push('/help')">
              <el-icon><Document /></el-icon>
              查看完整文档
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- 技术栈 -->
    <section class="tech-stack-section">
      <div class="section-container">
        <h2 class="section-title">💻 技术栈</h2>
        <div class="tech-stack-grid">
          <div class="tech-stack-category">
            <h3>前端技术</h3>
            <div class="tech-tags-container">
              <el-tag class="tech-tag" effect="plain" type="primary">Vue 3.4</el-tag>
              <el-tag class="tech-tag" effect="plain" type="primary">TypeScript 5.3</el-tag>
              <el-tag class="tech-tag" effect="plain" type="primary">Vite 5.0</el-tag>
              <el-tag class="tech-tag" effect="plain" type="primary">Element Plus 2.4</el-tag>
              <el-tag class="tech-tag" effect="plain" type="primary">Pinia 2.1</el-tag>
              <el-tag class="tech-tag" effect="plain" type="primary">ECharts 5.4</el-tag>
            </div>
          </div>
          <div class="tech-stack-category">
            <h3>后端技术</h3>
            <div class="tech-tags-container">
              <el-tag class="tech-tag" effect="plain" type="success">Node.js 18+</el-tag>
              <el-tag class="tech-tag" effect="plain" type="success">Express</el-tag>
              <el-tag class="tech-tag" effect="plain" type="success">TypeScript</el-tag>
            </div>
          </div>
          <div class="tech-stack-category">
            <h3>数据库</h3>
            <div class="tech-tags-container">
              <el-tag class="tech-tag" effect="plain" type="warning">PostgreSQL 15</el-tag>
              <el-tag class="tech-tag" effect="plain" type="warning">TimescaleDB 2.15</el-tag>
              <el-tag class="tech-tag" effect="plain" type="warning">Redis 7</el-tag>
            </div>
          </div>
          <div class="tech-stack-category">
            <h3>监控与运维</h3>
            <div class="tech-tags-container">
              <el-tag class="tech-tag" effect="plain" type="danger">Prometheus</el-tag>
              <el-tag class="tech-tag" effect="plain" type="danger">Grafana</el-tag>
              <el-tag class="tech-tag" effect="plain" type="danger">Docker Compose</el-tag>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="about-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <h3>LogiX 乐捷行</h3>
          <p>看见，方能掌控 · 让复杂物流变得轻松愉快</p>
        </div>
        <div class="footer-links">
          <div class="footer-section">
            <h4>快速链接</h4>
            <a @click="goToDashboard">物流看板</a>
            <a @click="goToShipments">集装箱管理</a>
            <a @click="goToMonitoring">监控中心</a>
          </div>
          <div class="footer-section">
            <h4>文档中心</h4>
            <a @click="router.push('/help')">帮助文档</a>
            <a @click="goToRoadmap">开发计划</a>
            <a href="https://vuejs.org/" target="_blank">Vue 3 文档</a>
            <a href="https://docs.timescale.com/" target="_blank">TimescaleDB 文档</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 LogiX. All rights reserved. 看见，方能掌控 · 让复杂物流变得轻松愉快</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import SixOnesDiagram from '@/components/vision/SixOnesDiagram.vue'
import { visionChapters } from '@/constants/visionChapters'
import {
  Aim,
  ArrowRight,
  Box,
  CircleCheck,
  Clock,
  Connection,
  DataBoard,
  Document,
  Monitor,
  Odometer,
  Ship,
  TrendCharts,
  View,
  Wallet,
} from '@element-plus/icons-vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const activeTab = ref('visualization')

const processSteps = [
  {
    title: '海运 → 到港',
    description: '通过外部API数据接口，预测到港时间',
    status: 'ETA监控中',
  },
  {
    title: '到港 → 提柜',
    description: '系统自动监控"清关放行"状态，一旦放行，货柜变为"绿色可提"',
    status: '状态监控',
  },
  {
    title: '提柜 → 卸柜',
    description: '实时显示拖车位置，结合路况API预测拥堵，动态调整路线',
    status: '在途追踪',
  },
  {
    title: '卸柜 → 还箱',
    description: '监控"空箱"状态，结合免费用箱期，倒计时提醒还箱',
    status: '费用预警',
  },
  {
    title: '还箱 → 结算',
    description: '自动生成费用明细，完成整个运输周期的成本核算',
    status: '自动结算',
  },
]

const goToDashboard = () => {
  router.push('/dashboard').catch(err => {
    if (!err.message.includes('NavigationDuplicated')) {
      console.error('路由跳转失败:', err)
    }
  })
}

const goToShipments = () => {
  router.push('/shipments').catch(err => {
    if (!err.message.includes('NavigationDuplicated')) {
      console.error('路由跳转失败:', err)
    }
  })
}

const goToMonitoring = () => {
  router.push('/monitoring').catch(err => {
    if (!err.message.includes('NavigationDuplicated')) {
      console.error('路由跳转失败:', err)
    }
  })
}

const scrollTo = (id: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

const goToRoadmap = () => {
  router.push('/about').then(() => {
    setTimeout(() => scrollTo('roadmap'), 400)
  })
}

const goToChapter = (chapterId: number) => {
  router.push(`/about/vision/${chapterId}`)
}

onMounted(() => {
  if (window.location.hash === '#roadmap') {
    setTimeout(() => scrollTo('roadmap'), 300)
  }
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as *;

.about-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
  overflow-y: auto;
}

// Hero Section
.hero-section {
  position: relative;
  padding: 56px 32px 48px;
  background: linear-gradient(
    145deg,
    $nav-bg-gradient-start 0%,
    $nav-bg-gradient-mid 35%,
    $nav-bg-gradient-end 70%,
    rgba(64, 158, 255, 0.4) 100%
  );
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      radial-gradient(circle at 20% 80%, rgba(0, 212, 255, 0.08) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(124, 58, 237, 0.08) 0%, transparent 50%),
      url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.5"/></svg>')
        repeat;
    opacity: 1;
  }

  .hero-content {
    position: relative;
    max-width: 880px;
    margin: 0 auto;
    text-align: center;
    color: white;
    z-index: 1;
  }

  .hero-title {
    font-size: 40px;
    font-weight: 800;
    margin-bottom: 12px;
    letter-spacing: 3px;

    .brand-highlight {
      background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: block;
      font-size: 44px;
      font-weight: 700;
      letter-spacing: 3px;
      text-shadow: 0 0 40px rgba(255, 255, 255, 0.1);
    }
  }

  .hero-slogan {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.98);
    letter-spacing: 1px;
  }

  .hero-subtitle {
    font-size: 15px;
    margin-bottom: 24px;
    color: rgba(255, 255, 255, 0.88);
    line-height: 1.7;
    max-width: 640px;
    margin-left: auto;
    margin-right: auto;
  }

  .hero-actions {
    display: flex;
    gap: 14px;
    justify-content: center;
    flex-wrap: wrap;

    .el-button {
      padding: 10px 24px;
      font-size: 15px;
      height: 42px;
      border-radius: 28px;
      font-weight: 600;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
      }
    }
  }

  .hero-visual {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    pointer-events: none;

    .floating-box {
      position: absolute;
      width: 88px;
      height: 88px;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 40px;
      color: white;
      animation: float 7s ease-in-out infinite;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

      .el-icon {
        font-size: 44px;
      }

      &.box-1 {
        top: 12%;
        left: 8%;
        animation-delay: 0s;
      }

      &.box-2 {
        top: 22%;
        right: 12%;
        animation-delay: 2.3s;
      }

      &.box-3 {
        bottom: 18%;
        left: 12%;
        animation-delay: 4.6s;
      }
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0) rotate(0deg);
    }
    50% {
      transform: translateY(-24px) rotate(4deg);
    }
  }
}

// Common Section Styles
.section-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 36px 24px;
}

.section-title {
  font-size: 26px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 24px;
  letter-spacing: 1px;
  background: linear-gradient(135deg, $primary-color 0%, $primary-dark 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

// Value Section
.value-section {
  padding: 40px 0;
  background: $bg-color;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);

  .value-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;

    .value-card {
      background: $bg-color;
      padding: 20px 18px;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
      border: 1px solid $border-extra-light;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        transform: translateY(-6px);
        box-shadow: 0 12px 32px rgba(64, 158, 255, 0.15);
        border-color: rgba($primary-color, 0.3);
      }

      .value-icon {
        width: 60px;
        height: 60px;
        margin: 0 auto 16px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        color: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

        &.value-icon-primary {
          background: linear-gradient(135deg, $primary-color 0%, $primary-dark 100%);
        }

        &.value-icon-accent {
          background: linear-gradient(135deg, $nav-accent-pink 0%, #f5576c 100%);
        }

        &.value-icon-cyan {
          background: linear-gradient(135deg, $nav-accent-cyan 0%, #00f2fe 100%);
        }

        &.value-icon-success {
          background: linear-gradient(135deg, $success-color 0%, #38f9d7 100%);
        }
      }

      h3 {
        font-size: 18px;
        margin-bottom: 10px;
        color: $text-primary;
        font-weight: 600;
      }

      p {
        color: $text-regular;
        line-height: 1.6;
        font-size: 14px;
      }
    }
  }
}

// Cost Section
.cost-section {
  padding: 28px 0;
  background: $bg-page;

  .best-arrangement-trilogy {
    margin-bottom: 20px;
    padding: 16px 20px;
    background: $bg-color;
    border-radius: 12px;
    border-left: 4px solid $primary-color;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

    .trilogy-title {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
      margin: 0 0 12px;
      text-align: center;
    }

    .trilogy-steps {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px 24px;
    }

    .trilogy-step {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: $text-regular;

      .step-num {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        line-height: 24px;
        text-align: center;
        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        color: white;
        border-radius: 50%;
        font-size: 12px;
        font-weight: 600;
      }

      .step-label {
        font-weight: 600;
        color: $text-primary;
      }

      .step-desc {
        color: $text-regular;
        font-size: 13px;
      }
    }

    .trilogy-link-wrap {
      display: block;
      text-align: center;
      margin-top: 12px;
    }

    .trilogy-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba($primary-color, 0.1);
      color: $primary-color;
      cursor: pointer;
      transition: color 0.2s ease, background 0.2s ease;
      animation: trilogy-icon-float 2.5s ease-in-out infinite;

      &:hover {
        color: $primary-dark;
        background: rgba($primary-color, 0.2);
        animation: none;

        .el-icon {
          animation: trilogy-icon-point 0.6s ease-in-out infinite;
        }
      }

      .el-icon {
        font-size: 18px;
        display: inline-block;
      }
    }
  }

  @keyframes trilogy-icon-float {
    0%,
    100% {
      transform: translateX(0);
      box-shadow: 0 0 0 rgba($primary-color, 0);
    }
    50% {
      transform: translateX(4px);
      box-shadow: 0 2px 12px rgba($primary-color, 0.2);
    }
  }

  @keyframes trilogy-icon-point {
    0%,
    100% {
      transform: translateX(0);
    }
    50% {
      transform: translateX(3px);
    }
  }

  .cost-intro {
    margin-bottom: 16px;

    .cost-quote {
      background: $bg-color;
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 0;
      border-left: 4px solid $primary-color;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

      p {
        font-size: 15px;
        color: $text-primary;
        margin-bottom: 10px;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          padding: 6px 0;
          padding-left: 20px;
          position: relative;
          color: $text-regular;
          font-size: 14px;
          line-height: 1.45;

          &::before {
            content: '•';
            position: absolute;
            left: 0;
            color: $primary-color;
            font-weight: bold;
            font-size: 16px;
          }
        }
      }
    }
  }

  .focus-area {
    h3 {
      font-size: 18px;
      margin-bottom: 12px;
      color: $text-primary;
      text-align: center;
      font-weight: 600;
    }

    .six-ones-diagram-wrap {
      display: flex;
      justify-content: center;
    }
  }
}

// Vision Chapters Section
.vision-chapters-section {
  padding: 40px 0;
  background: $bg-color;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);

  .vision-chapters-intro {
    text-align: center;
    font-size: 15px;
    color: $text-regular;
    margin: -4px auto 24px;
    max-width: 600px;
    line-height: 1.6;
  }

  .vision-chapters-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 14px;
  }

  .vision-chapter-card {
    min-width: 0;
    background: $bg-page;
    padding: 20px 18px;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    cursor: pointer;
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    border: 2px solid transparent;
    position: relative;

    &:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 32px rgba(64, 158, 255, 0.15);
      border-color: $primary-color;

      .chapter-card-action {
        color: $primary-color;
      }
    }

    .chapter-card-icon {
      font-size: 40px;
      margin-bottom: 14px;
    }

    .chapter-card-badge {
      display: inline-block;
      padding: 5px 12px;
      background: linear-gradient(135deg, $primary-color 0%, $primary-dark 100%);
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 14px;
    }

    .chapter-card-title {
      font-size: 17px;
      font-weight: 600;
      color: $text-primary;
      margin: 0 0 6px;
    }

    .chapter-card-subtitle {
      font-size: 14px;
      color: $primary-color;
      margin: 0 0 12px;
      font-weight: 500;
    }

    .chapter-card-summary {
      font-size: 14px;
      line-height: 1.55;
      color: $text-regular;
      margin: 0 0 18px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .chapter-card-action {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      color: $text-regular;
      transition: color 0.3s;
    }
  }
}

// Architecture Section
.architecture-section {
  padding: 40px 0;
  background: $bg-page;

  .arch-block {
    background: $bg-color;
    padding: 24px 28px;
    border-radius: 14px;
    margin-bottom: 20px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    border: 1px solid $border-extra-light;

    h3 {
      font-size: 19px;
      margin-bottom: 18px;
      color: $text-primary;
      border-bottom: 3px solid $primary-color;
      padding-bottom: 12px;
      font-weight: 600;
    }
  }

  .theory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;

    .theory-item {
      padding: 18px;
      background: $bg-page;
      border-radius: 12px;
      text-align: center;
      transition: all 0.3s ease;

      &:hover {
        background: $border-extra-light;
        transform: translateY(-4px);
      }

      .el-icon {
        font-size: 28px;
        color: $primary-color;
        margin-bottom: 12px;
      }

      h4 {
        font-size: 16px;
        margin-bottom: 8px;
        color: $text-primary;
      }

      p {
        font-size: 13px;
        color: $text-regular;
        line-height: 1.5;
      }
    }
  }
}

// Tech Tabs
.tech-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 20px;
  }

  .tab-content {
    padding: 12px 0;
  }

  .tech-feature {
    display: flex;
    gap: 20px;
    padding: 18px;
    background: $bg-page;
    border-radius: 12px;
    margin-bottom: 20px;

    .tech-icon {
      font-size: 36px;
      min-width: 48px;
    }

    .tech-detail {
      flex: 1;

      h4 {
        font-size: 16px;
        margin-bottom: 8px;
        color: $text-primary;
      }

      p {
        font-size: 14px;
        color: $text-regular;
        line-height: 1.5;
        margin-bottom: 12px;
      }

      .tech-tags {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
    }
  }
}

// Process Flow
.process-flow {
  .process-step {
    display: flex;
    gap: 16px;
    padding: 18px;
    background: $bg-page;
    border-radius: 10px;
    margin-bottom: 12px;
    transition: all 0.3s ease;

    &:hover {
      background: $border-extra-light;
      transform: translateX(8px);
    }

    .step-number {
      width: 40px;
      height: 40px;
      min-width: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, $primary-color 0%, $primary-dark 100%);
      color: white;
      font-size: 18px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .step-content {
      flex: 1;

      h4 {
        font-size: 16px;
        margin-bottom: 6px;
        color: $text-primary;
      }

      p {
        font-size: 13px;
        color: $text-regular;
        margin-bottom: 8px;
      }

      .step-status {
        display: flex;
        align-items: center;
        gap: 8px;
        color: $success-color;
        font-size: 14px;
        font-weight: 500;
      }
    }
  }
}

// Risk Levels
.risk-levels {
  display: grid;
  gap: 16px;

  .risk-level {
    padding: 18px;
    border-radius: 12px;
    border-left: 4px solid;

    &.level-high {
      background: linear-gradient(135deg, #fef0f0 0%, #fef2f2 100%);
      border-color: $danger-color;

      .level-indicator {
        background: #f56c6c;
      }
    }

    &.level-medium {
      background: linear-gradient(135deg, #fdf6ec 0%, #fef9f2 100%);
      border-color: $warning-color;

      .level-indicator {
        background: #e6a23c;
      }
    }

    &.level-low {
      background: linear-gradient(135deg, #fef9e7 0%, #fffbf0 100%);
      border-color: #e6c23c;

      .level-indicator {
        background: #e6c23c;
      }
    }

    h4 {
      font-size: 16px;
      margin-bottom: 12px;
      color: $text-primary;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        padding: 6px 0;
        padding-left: 24px;
        position: relative;
        color: $text-regular;

        &::before {
          content: '→';
          position: absolute;
          left: 0;
        }
      }
    }
  }
}

// Cost Model
.cost-model {
  .formula-box {
    background: linear-gradient(135deg, $primary-color 0%, $primary-dark 100%);
    padding: 20px 24px;
    border-radius: 12px;
    text-align: center;
    margin-bottom: 30px;

    h4 {
      color: white;
      font-size: 16px;
      margin-bottom: 12px;
    }

    .formula {
      font-size: 16px;
      font-weight: 600;
      color: white;
      font-family: 'Courier New', monospace;
    }
  }

  .cost-breakdown {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-bottom: 20px;

    .cost-item {
      background: $bg-page;
      padding: 18px;
      border-radius: 12px;

      h4 {
        font-size: 15px;
        margin-bottom: 12px;
        color: $text-primary;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          padding: 6px 0;
          padding-left: 20px;
          position: relative;
          color: $text-regular;
          font-size: 14px;

          &::before {
            content: '•';
            position: absolute;
            left: 0;
            color: $primary-color;
          }
        }
      }
    }
  }

  .evaluation {
    .el-alert {
      :deep(.el-alert__content) {
        font-size: 15px;
        line-height: 1.6;
      }
    }
  }
}

// Tech Components
.tech-components {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;

  .component-card {
    min-width: 0;
    background: $bg-page;
    padding: 18px;
    border-radius: 12px;
    text-align: center;
    transition: all 0.3s ease;

    &:hover {
      background: $border-extra-light;
      transform: translateY(-4px);
    }

    .component-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }

    h4 {
      font-size: 15px;
      margin-bottom: 6px;
      color: $text-primary;
    }

    p {
      font-size: 12px;
      color: $text-regular;
      line-height: 1.45;
    }
  }
}

// Roadmap Section
.roadmap-section {
  padding: 40px 0;
  background: $bg-color;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);

  .roadmap-content {
    max-width: 880px;
    margin: 0 auto;
  }

  .roadmap-phase {
    background: $bg-page;
    padding: 20px 24px;
    border-radius: 14px;
    margin-bottom: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    border-left: 5px solid $primary-color;

    .phase-badge {
      display: inline-block;
      padding: 8px 18px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 600;
      background: $primary-color;
      color: white;
      margin-bottom: 18px;

      &.pending {
        background: $warning-color;
      }
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        padding: 10px 0;
        padding-left: 24px;
        position: relative;
        color: $text-regular;
        font-size: 15px;
        line-height: 1.65;

        &::before {
          content: '•';
          position: absolute;
          left: 0;
          color: $primary-color;
          font-weight: bold;
        }
      }
    }
  }

  .roadmap-actions {
    text-align: center;
    margin-top: 20px;
  }
}

// Tech Stack Section
.tech-stack-section {
  padding: 40px 0;
  background: $bg-page;

  .tech-stack-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;

    .tech-stack-category {
      background: $bg-color;
      padding: 20px 20px;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
      border: 1px solid $border-extra-light;

      h3 {
        font-size: 18px;
        margin-bottom: 20px;
        color: $text-primary;
        text-align: center;
        font-weight: 600;
      }

      .tech-tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;

        .tech-tag {
          font-size: 14px;
          padding: 10px 18px;
        }
      }
    }
  }
}

// Footer
.about-footer {
  background: linear-gradient(145deg, $nav-bg-gradient-start 0%, $nav-bg-gradient-mid 100%);
  color: white;
  padding: 40px 0 24px;
  margin-top: 0;

  .footer-content {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px 28px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 32px;

    .footer-brand {
      h3 {
        font-size: 26px;
        margin-bottom: 12px;
        font-weight: 700;
      }

      p {
        opacity: 0.88;
        font-size: 15px;
        line-height: 1.5;
      }
    }

    .footer-section {
      h4 {
        font-size: 16px;
        margin-bottom: 18px;
        color: rgba(255, 255, 255, 0.95);
        font-weight: 600;
      }

      a {
        display: block;
        color: rgba(255, 255, 255, 0.75);
        text-decoration: none;
        padding: 10px 0;
        transition: all 0.3s ease;
        cursor: pointer;
        font-size: 14px;

        &:hover {
          color: white;
          padding-left: 10px;
        }
      }
    }
  }

  .footer-bottom {
    text-align: center;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);

    p {
      opacity: 0.7;
      font-size: 14px;
      margin: 0;
    }
  }
}

// Responsive
@media (max-width: 992px) {
  .section-container {
    padding: 28px 20px;
  }

  .best-arrangement-trilogy .trilogy-steps {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .value-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .vision-chapters-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }

  .tech-components {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 72px 24px 56px;

    .hero-title {
      font-size: 36px;

      .brand-highlight {
        font-size: 38px;
      }
    }

    .hero-slogan {
      font-size: 20px;
    }

    .hero-subtitle {
      font-size: 15px;
    }

    .hero-actions {
      flex-direction: column;
      gap: 12px;

      .el-button {
        width: 100%;
      }
    }

    .hero-visual {
      display: none;
    }
  }

  .section-container {
    padding: 36px 20px;
  }

  .section-title {
    font-size: 26px;
    margin-bottom: 28px;
  }

  .value-grid {
    grid-template-columns: 1fr;
  }

  .theory-grid,
  .cost-breakdown,
  .tech-stack-grid {
    grid-template-columns: 1fr;
  }

  .tech-components {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .vision-chapters-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .architecture-section .arch-block {
    padding: 24px 20px;
  }
}

@media (max-width: 480px) {
  .vision-chapters-grid {
    grid-template-columns: 1fr;
  }
}
</style>
