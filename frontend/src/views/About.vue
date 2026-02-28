<template>
  <div class="about-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="brand-highlight">LogiX</span>
          <span class="brand-cn">乐捷行</span>
        </h1>
        <p class="hero-slogan">让复杂物流变得简单愉快</p>
        <p class="hero-subtitle">通过智能化手段将非增值的物流环节成本降至理论极限</p>
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

    <!-- 核心价值主张 -->
    <section class="value-section">
      <div class="section-container">
        <h2 class="section-title">🎯 核心价值主张</h2>
        <div class="value-grid">
          <div class="value-card">
            <div class="value-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <h3>智能化</h3>
            <p>基于AI的智能调度，自动优化资源配置，减少人为决策偏差</p>
          </div>
          <div class="value-card">
            <div class="value-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
              <el-icon><Monitor /></el-icon>
            </div>
            <h3>可视化</h3>
            <p>全流程数字孪生，实时监控，让物流状态一目了然</p>
          </div>
          <div class="value-card">
            <div class="value-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
              <el-icon><Lock /></el-icon>
            </div>
            <h3>高安全性</h3>
            <p>企业级数据加密，完整审计日志，确保数据安全与合规</p>
          </div>
          <div class="value-card">
            <div class="value-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
              <el-icon><Coin /></el-icon>
            </div>
            <h3>成本最小化</h3>
            <p>多目标优化算法，综合考量运输、时间、风险成本，实现总费用最低</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 成本控制理念 -->
    <section class="cost-section">
      <div class="section-container">
        <h2 class="section-title">💡 成本控制理念</h2>
        <div class="cost-intro">
          <div class="cost-quote">
            <p><strong>"物流本身是必要的非增值活动"</strong></p>
            <ul>
              <li>不创造新价值：物流环节不改变产品的形态、功能或性能</li>
              <li>必然产生成本：运输、仓储、清关、装卸都消耗人力、物力、财力</li>
              <li>可能产生浪费：效率低下、停滞、错误都是纯粹的浪费</li>
            </ul>
          </div>
          <p class="cost-philosophy">
            目标是以最低的成本、最高的效率、最可靠的保障，实现物品在供应链中的空间与时间转移。
            不满足于被动记录成本，而是主动介入流程，通过<span class="highlight">可视化暴露浪费</span>、
            <span class="highlight">智能化压缩成本</span>、<span class="highlight">预警化管控风险</span>，
            最终将每一个"不增值的物流环节"的成本与浪费降到理论极限。
          </p>
        </div>

        <div class="focus-area">
          <h3>聚焦"货柜到港后调度"：成本与浪费的攻坚战</h3>
          <div class="focus-grid">
            <div class="focus-card">
              <div class="focus-icon">🚢</div>
              <h4>清关环节</h4>
              <p><strong>浪费主要在时间</strong></p>
              <p>通过数据接口预警查验风险，提前准备，缩短通关时间，减少码头堆存费</p>
            </div>
            <div class="focus-card">
              <div class="focus-icon">📦</div>
              <h4>提柜与还箱</h4>
              <p><strong>浪费主要在滞港费</strong></p>
              <p>实时监控免费用箱期，智能推荐还箱地点与时间，避免高额滞箱费</p>
            </div>
            <div class="focus-card">
              <div class="focus-icon">🚛</div>
              <h4>拖卡运输</h4>
              <p><strong>浪费在无效行驶和等待</strong></p>
              <p>优化路线，减少等待，避免仓库因等待浪费卸柜能力</p>
            </div>
            <div class="focus-card">
              <div class="focus-icon">🔗</div>
              <h4>整体调度</h4>
              <p><strong>浪费在各环节脱节</strong></p>
              <p>数字孪生和统一看板，实现"船-港-车-货"状态同步</p>
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
              <p>通过信息共享实现货主、货代、船公司、港口、海关等多方协同作业，减少信息不对称导致的效率损失</p>
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
                    <p>为核心界面，集成全球AIS船舶数据接口，实时显示货轮在全球航线上的位置、航速与ETA</p>
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
                    <p>对接港口码头操作系统（TOS）API，自动定位货柜在堆场的具体贝位、列、层，实时更新状态</p>
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
                    <div class="formula">
                      Minimize (总费用) = 运输成本 + 时间成本 + 风险成本
                    </div>
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
                        <strong>评价机制：</strong>系统会对每一次运输方案进行模拟打分，综合费用最优的方案，而非单纯运费最低的方案
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
          <p>让复杂物流变得简单愉快</p>
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
            <a href="/index.html" target="_blank">项目文档</a>
            <a href="https://vuejs.org/" target="_blank">Vue 3 文档</a>
            <a href="https://docs.timescale.com/" target="_blank">TimescaleDB 文档</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 LogiX. All rights reserved. 让复杂物流变得简单愉快</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  DataBoard,
  Document,
  Box,
  Ship,
  Odometer,
  TrendCharts,
  Monitor,
  Lock,
  Coin,
  Connection,
  View,
  Clock,
  Wallet,
  CircleCheck
} from '@element-plus/icons-vue'

const router = useRouter()
const activeTab = ref('visualization')

const processSteps = [
  {
    title: '海运 → 到港',
    description: '通过外部API数据接口，预测到港时间',
    status: 'ETA监控中'
  },
  {
    title: '到港 → 提柜',
    description: '系统自动监控"清关放行"状态，一旦放行，货柜变为"绿色可提"',
    status: '状态监控'
  },
  {
    title: '提柜 → 卸柜',
    description: '实时显示拖车位置，结合路况API预测拥堵，动态调整路线',
    status: '在途追踪'
  },
  {
    title: '卸柜 → 还箱',
    description: '监控"空箱"状态，结合免费用箱期，倒计时提醒还箱',
    status: '费用预警'
  },
  {
    title: '还箱 → 结算',
    description: '自动生成费用明细，完成整个运输周期的成本核算',
    status: '自动结算'
  }
]

const goToDashboard = () => {
  router.push('/dashboard').catch((err) => {
    if (!err.message.includes('NavigationDuplicated')) {
      console.error('路由跳转失败:', err)
    }
  })
}

const goToShipments = () => {
  router.push('/shipments').catch((err) => {
    if (!err.message.includes('NavigationDuplicated')) {
      console.error('路由跳转失败:', err)
    }
  })
}

const goToMonitoring = () => {
  router.push('/monitoring').catch((err) => {
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
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as *;

.about-page {
  min-height: 100vh;
  background: #f8f9fa;
  overflow-y: auto;
}

// Hero Section
.hero-section {
  position: relative;
  padding: 120px 40px 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/></svg>') repeat;
    opacity: 0.3;
  }

  .hero-content {
    position: relative;
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
    color: white;
    z-index: 1;
  }

  .hero-title {
    font-size: 56px;
    font-weight: 800;
    margin-bottom: 16px;
    letter-spacing: 2px;

    .brand-highlight {
      background: linear-gradient(135deg, #ffffff 0%, #f0f0ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: block;
      font-size: 72px;
      margin-bottom: 8px;
    }

    .brand-cn {
      font-size: 48px;
      font-weight: 600;
    }
  }

  .hero-slogan {
    font-size: 28px;
    font-weight: 600;
    margin-bottom: 12px;
    color: rgba(255, 255, 255, 0.95);
  }

  .hero-subtitle {
    font-size: 18px;
    margin-bottom: 40px;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.6;
  }

  .hero-actions {
    display: flex;
    gap: 16px;
    justify-content: center;

    .el-button {
      padding: 14px 32px;
      font-size: 16px;
      height: 50px;
      border-radius: 25px;
      font-weight: 600;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
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
      width: 80px;
      height: 80px;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      color: white;
      animation: float 6s ease-in-out infinite;

      .el-icon {
        font-size: 40px;
      }

      &.box-1 {
        top: 15%;
        left: 10%;
        animation-delay: 0s;
      }

      &.box-2 {
        top: 25%;
        right: 15%;
        animation-delay: 2s;
      }

      &.box-3 {
        bottom: 20%;
        left: 15%;
        animation-delay: 4s;
      }
    }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(5deg); }
  }
}

// Common Section Styles
.section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 20px;
}

.section-title {
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

// Value Section
.value-section {
  padding: 80px 0;

  .value-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;

    .value-card {
      background: white;
      padding: 40px 30px;
      border-radius: 20px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-8px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      }

      .value-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 20px;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        color: white;
      }

      h3 {
        font-size: 22px;
        margin-bottom: 12px;
        color: #333;
      }

      p {
        color: #666;
        line-height: 1.6;
        font-size: 15px;
      }
    }
  }
}

// Cost Section
.cost-section {
  padding: 80px 0;
  background: white;

  .cost-intro {
    margin-bottom: 50px;

    .cost-quote {
      background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
      padding: 30px;
      border-radius: 16px;
      margin-bottom: 24px;
      border-left: 4px solid #667eea;

      p {
        font-size: 18px;
        color: #333;
        margin-bottom: 16px;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          padding: 8px 0;
          padding-left: 24px;
          position: relative;
          color: #555;

          &::before {
            content: '•';
            position: absolute;
            left: 0;
            color: #667eea;
            font-weight: bold;
            font-size: 20px;
          }
        }
      }
    }

    .cost-philosophy {
      font-size: 16px;
      line-height: 1.8;
      color: #444;
      text-align: justify;

      .highlight {
        color: #667eea;
        font-weight: 600;
      }
    }
  }

  .focus-area {
    h3 {
      font-size: 26px;
      margin-bottom: 30px;
      color: #333;
      text-align: center;
    }

    .focus-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 24px;

      .focus-card {
        background: #f8f9fa;
        padding: 30px;
        border-radius: 16px;
        text-align: center;
        transition: all 0.3s ease;

        &:hover {
          background: #f0f2f5;
          transform: translateY(-4px);
        }

        .focus-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        h4 {
          font-size: 18px;
          margin-bottom: 8px;
          color: #333;
        }

        p {
          font-size: 14px;
          color: #666;
          line-height: 1.6;

          strong {
            color: $danger-color;
          }
        }
      }
    }
  }
}

// Architecture Section
.architecture-section {
  padding: 80px 0;

  .arch-block {
    background: white;
    padding: 40px;
    border-radius: 20px;
    margin-bottom: 40px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

    h3 {
      font-size: 24px;
      margin-bottom: 30px;
      color: #333;
      border-bottom: 2px solid #667eea;
      padding-bottom: 12px;
    }
  }

  .theory-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 24px;

    .theory-item {
      padding: 24px;
      background: #f8f9fa;
      border-radius: 12px;
      text-align: center;
      transition: all 0.3s ease;

      &:hover {
        background: #f0f2f5;
        transform: translateY(-4px);
      }

      .el-icon {
        font-size: 36px;
        color: #667eea;
        margin-bottom: 16px;
      }

      h4 {
        font-size: 18px;
        margin-bottom: 12px;
        color: #333;
      }

      p {
        font-size: 14px;
        color: #666;
        line-height: 1.6;
      }
    }
  }
}

// Tech Tabs
.tech-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 30px;
  }

  .tab-content {
    padding: 20px 0;
  }

  .tech-feature {
    display: flex;
    gap: 24px;
    padding: 24px;
    background: #f8f9fa;
    border-radius: 12px;
    margin-bottom: 20px;

    .tech-icon {
      font-size: 48px;
      min-width: 60px;
    }

    .tech-detail {
      flex: 1;

      h4 {
        font-size: 18px;
        margin-bottom: 12px;
        color: #333;
      }

      p {
        font-size: 15px;
        color: #666;
        line-height: 1.6;
        margin-bottom: 16px;
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
    gap: 20px;
    padding: 24px;
    background: #f8f9fa;
    border-radius: 12px;
    margin-bottom: 16px;
    transition: all 0.3s ease;

    &:hover {
      background: #f0f2f5;
      transform: translateX(8px);
    }

    .step-number {
      width: 48px;
      height: 48px;
      min-width: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 20px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .step-content {
      flex: 1;

      h4 {
        font-size: 18px;
        margin-bottom: 8px;
        color: #333;
      }

      p {
        font-size: 14px;
        color: #666;
        margin-bottom: 12px;
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
  gap: 24px;

  .risk-level {
    padding: 24px;
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
      font-size: 18px;
      margin-bottom: 16px;
      color: #333;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        padding: 6px 0;
        padding-left: 24px;
        position: relative;
        color: #555;

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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 30px;
    border-radius: 16px;
    text-align: center;
    margin-bottom: 30px;

    h4 {
      color: white;
      font-size: 18px;
      margin-bottom: 16px;
    }

    .formula {
      font-size: 20px;
      font-weight: 600;
      color: white;
      font-family: 'Courier New', monospace;
    }
  }

  .cost-breakdown {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 24px;

    .cost-item {
      background: #f8f9fa;
      padding: 24px;
      border-radius: 12px;

      h4 {
        font-size: 16px;
        margin-bottom: 16px;
        color: #333;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          padding: 6px 0;
          padding-left: 20px;
          position: relative;
          color: #555;
          font-size: 14px;

          &::before {
            content: '•';
            position: absolute;
            left: 0;
            color: #667eea;
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;

  .component-card {
    background: #f8f9fa;
    padding: 24px;
    border-radius: 12px;
    text-align: center;
    transition: all 0.3s ease;

    &:hover {
      background: #f0f2f5;
      transform: translateY(-4px);
    }

    .component-icon {
      font-size: 40px;
      margin-bottom: 16px;
    }

    h4 {
      font-size: 16px;
      margin-bottom: 8px;
      color: #333;
    }

    p {
      font-size: 13px;
      color: #666;
      line-height: 1.5;
    }
  }
}

// Tech Stack Section
.tech-stack-section {
  padding: 80px 0;
  background: white;

  .tech-stack-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;

    .tech-stack-category {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 16px;

      h3 {
        font-size: 20px;
        margin-bottom: 20px;
        color: #333;
        text-align: center;
      }

      .tech-tags-container {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;

        .tech-tag {
          font-size: 14px;
          padding: 8px 16px;
        }
      }
    }
  }
}

// Footer
.about-footer {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  padding: 60px 0 30px;

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px 40px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 40px;

    .footer-brand {
      h3 {
        font-size: 24px;
        margin-bottom: 8px;
      }

      p {
        opacity: 0.8;
        font-size: 14px;
      }
    }

    .footer-section {
      h4 {
        font-size: 16px;
        margin-bottom: 20px;
        color: rgba(255, 255, 255, 0.9);
      }

      a {
        display: block;
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        padding: 8px 0;
        transition: all 0.3s ease;
        cursor: pointer;

        &:hover {
          color: white;
          padding-left: 8px;
        }
      }
    }
  }

  .footer-bottom {
    text-align: center;
    padding-top: 30px;
    border-top: 1px solid rgba(255, 255,255, 0.1);

    p {
      opacity: 0.6;
      font-size: 13px;
      margin: 0;
    }
  }
}

// Responsive
@media (max-width: 768px) {
  .hero-section {
    padding: 80px 20px 60px;

    .hero-title {
      font-size: 40px;

      .brand-highlight {
        font-size: 52px;
      }

      .brand-cn {
        font-size: 36px;
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

      .el-button {
        width: 100%;
      }
    }

    .hero-visual {
      display: none;
    }
  }

  .section-title {
    font-size: 28px;
  }

  .value-grid,
  .focus-grid,
  .theory-grid,
  .cost-breakdown,
  .tech-stack-grid {
    grid-template-columns: 1fr;
  }
}
</style>
