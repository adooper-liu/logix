<template>
  <div class="six-ones-diagram">
    <div class="diagram-layout">
      <!-- 图形布局：杂志级视觉 -->
      <div class="diagram-main">
        <div class="diagram-svg-wrap">
          <svg class="diagram-svg" viewBox="0 0 640 640" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#1E3A8A" stop-opacity="0.4" />
                <stop offset="50%" stop-color="#F97316" stop-opacity="0.8" />
                <stop offset="100%" stop-color="#1E3A8A" stop-opacity="0.4" />
              </linearGradient>
              <linearGradient id="loopArrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#1e3a8a" stop-opacity="0.6" />
                <stop offset="50%" stop-color="#f97316" stop-opacity="0.5" />
                <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0.6" />
              </linearGradient>
              <radialGradient id="centerNavGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#252b4a" />
                <stop offset="70%" stop-color="#1a1f3a" />
                <stop offset="100%" stop-color="#0a0e27" />
              </radialGradient>
              <radialGradient id="diagramBgGrad" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stop-color="#f8fafc" stop-opacity="0.9" />
                <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
              </radialGradient>
            </defs>

            <rect width="640" height="640" fill="url(#diagramBgGrad)" class="diagram-bg" />

            <!-- 外围信息图标：多样随机路径旋转（无圆环线条） -->
            <g class="loop-arrow-wrap">
              <g
                class="info-icon-orbit"
                :transform="`translate(${infoIconPosition.x}, ${infoIconPosition.y})`"
              >
                <circle r="14" class="info-icon-bg" />
                <text
                  class="info-icon-text"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  x="0"
                  y="0"
                >
                  i
                </text>
              </g>
            </g>

            <!-- 流线型连接：贝塞尔曲线 -->
            <g class="flow-lines">
              <path
                v-for="(node, i) in nodes"
                :key="'line-' + i"
                :d="node.path"
                class="flow-line"
                :class="{ 'flow-line-active': activeIndex === i }"
                :style="{ animationDelay: `${i * 0.15}s` }"
              />
            </g>

            <!-- 外围六节点：弱化描边与填充 -->
            <g
              v-for="(node, i) in nodes"
              :key="'node-' + i"
              class="node-group"
              :class="{ 'node-active': activeIndex === i }"
              @mouseenter="activeIndex = i"
              @click="activeIndex = i"
            >
              <circle :cx="node.x" :cy="node.y" r="58" class="node-circle" />
              <text
                :x="node.x"
                :y="node.y - 24"
                class="node-icon"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                {{ node.icon }}
              </text>
              <text
                :x="node.x"
                :y="node.y + 6"
                class="node-label"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                {{ node.label }}
              </text>
              <text
                :x="node.x"
                :y="node.y + 28"
                class="node-value"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                {{ node.value }}
              </text>
            </g>

            <!-- 中心核心：绝对视觉焦点 -->
            <g class="center-group">
              <circle :cx="center.x" :cy="center.y" r="78" class="center-bg" />
              <text
                :x="center.x"
                :y="center.y - 18"
                class="center-title"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                LogiX
              </text>
              <text
                :x="center.x"
                :y="center.y + 28"
                class="center-sub"
                text-anchor="middle"
                dominant-baseline="middle"
              >
                看见·方能掌控
              </text>
            </g>
          </svg>
        </div>
      </div>

      <!-- 详情面板：放在图形布局下方 -->
      <div class="detail-panel">
        <Transition name="detail-fade" mode="out-in">
          <div :key="activeIndex" class="detail-content">
            <div class="detail-header">
              <span class="detail-icon">{{ nodes[activeIndex].icon }}</span>
              <div>
                <h4 class="detail-title">{{ nodes[activeIndex].label }}</h4>
                <span class="detail-value">{{ nodes[activeIndex].value }}</span>
              </div>
            </div>
            <p class="detail-desc">{{ nodes[activeIndex].desc }}</p>
          </div>
        </Transition>
        <div class="detail-dots">
          <span
            v-for="(_, i) in nodes"
            :key="i"
            class="dot"
            :class="{ active: activeIndex === i }"
            @click="activeIndex = i"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const center = { x: 320, y: 320 }
const radius = 235
const activeIndex = ref(0)

// 信息图标轨道：椭圆参数定期随机变化，速度固定且较慢
const orbitRadiusX = ref(300)
const orbitRadiusY = ref(280)
const orbitAngle = ref(0)
const orbitSpeed = 0.35 // 固定速度，不宜过快

const infoIconPosition = computed(() => {
  const rad = (orbitAngle.value * Math.PI) / 180
  return {
    x: center.x + orbitRadiusX.value * Math.cos(rad),
    y: center.y + orbitRadiusY.value * Math.sin(rad),
  }
})

function randomizeOrbit() {
  orbitRadiusX.value = 265 + Math.random() * 70
  orbitRadiusY.value = 265 + Math.random() * 70
}

// 蜂巢布局：上三下三，非对称
const hexAngles = [30, 90, 150, 210, 270, 330].map(deg => (deg * Math.PI) / 180)

const nodes = computed(() => {
  const items = [
    {
      icon: '🚢',
      label: '每一个货柜',
      value: '价值输入',
      desc: '代表了大批量、高价值的物流单元，承载着从中国运往欧美各仓的商品成本与时效承诺。可视化其从订舱到还箱的全过程，对其旅程的「最好安排」，是为了保障干线运输的稳定性与成本最优，这是整个供应链稳定与成本可控的起点。',
    },
    {
      icon: '📋',
      label: '每一个订单',
      value: '价值承诺',
      desc: '代表了客户的具体需求与交付期望。可视化其从下单到签收的履行状态，对订单履约过程的「最好安排」，是为了兑现服务承诺、管理客户预期，构建客户信任的基石。',
    },
    {
      icon: '📦',
      label: '每一个包裹',
      value: '价值载体',
      desc: '是订单的物理分解，是最小的交付单元。可视化其分拣、路径与交付瞬间，对包裹路径的「最好安排」，是为了实现极致的末端效率与体验，这是触达客户的「最后一厘米」。',
    },
    {
      icon: '🏭',
      label: '每一个库位',
      value: '价值缓存',
      desc: '是空间与时间资源的载体，其利用率直接影响仓储成本与作业效率。可视化其占用状态、库龄、存储品类，对库位的「最好安排」，是为了最大化仓储空间利用率、优化拣货路径、快速周转，这是成本与效率的「静态战场」。',
    },
    {
      icon: '🚛',
      label: '每一个仓位',
      value: '价值流动',
      desc: '作为运输工具（货车、集装箱、货机仓位）移动的空间资源，其装载率决定了运输成本效益。可视化其装载率、适配的货物，对仓位的「最好安排」，是为了实现运输工具利用率最大化，这是动态的「装载优化」艺术。',
    },
    {
      icon: '👷',
      label: '每一次员工操作',
      value: '价值执行',
      desc: '是所有流程落地的最终执行节点。对员工操作的「最好安排」（提供清晰指引、优化路径），是提升人效、保障安全与质量的最后一环。可视化其动作、效率与合规性，是为了赋能个体、保障安全、持续优化标准作业程序，这是系统落地的「人性化接口」。',
    },
  ]
  return items.map((item, i) => {
    const angle = hexAngles[i]
    const x = center.x + radius * Math.cos(angle)
    const y = center.y + radius * Math.sin(angle)
    // 贝塞尔曲线控制点：中点 + 垂直偏移，形成流线弧
    const mx = (center.x + x) / 2
    const my = (center.y + y) / 2
    const dx = x - center.x
    const dy = y - center.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const perpX = (-dy / len) * 45
    const perpY = (dx / len) * 45
    const cpx = mx + perpX
    const cpy = my + perpY
    const path = `M ${center.x} ${center.y} Q ${cpx} ${cpy} ${x} ${y}`
    return {
      ...item,
      x,
      y,
      path,
    }
  })
})

let timer: ReturnType<typeof setInterval> | null = null
let orbitTimer: ReturnType<typeof setInterval> | null = null
let rafId: number | null = null

onMounted(() => {
  timer = setInterval(() => {
    activeIndex.value = (activeIndex.value + 1) % 6
  }, 4000)

  // 每 8–14 秒随机变化轨道形状与速度
  function scheduleNextRandomize() {
    orbitTimer = setTimeout(
      () => {
        randomizeOrbit()
        scheduleNextRandomize()
      },
      8000 + Math.random() * 6000
    )
  }
  scheduleNextRandomize()

  // 持续更新轨道角度
  function tick() {
    orbitAngle.value = (orbitAngle.value + orbitSpeed) % 360
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (orbitTimer) clearTimeout(orbitTimer)
  if (rafId !== null) cancelAnimationFrame(rafId)
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/variables' as *;

/* 杂志级配色：深海蓝 + 金属灰 + 高亮橙 */
$magazine-deep: #0a2463;
$magazine-blue: #1e3a8a;
$magazine-grey: #6b7280;
$magazine-light: #f3f4f6;
$magazine-accent: #f97316;

.six-ones-diagram {
  padding: 40px 36px;
  background: linear-gradient(180deg, #fafbfc 0%, #ffffff 20%, #ffffff 100%);
  border-radius: 24px;
  box-shadow:
    0 20px 60px rgba(10, 36, 99, 0.06),
    0 4px 20px rgba(10, 36, 99, 0.04),
    0 0 0 1px rgba(30, 58, 138, 0.05);
}

.diagram-layout {
  max-width: 1200px;
  margin: 0 auto;
}

.diagram-main {
  margin-bottom: 40px;
}

.diagram-svg-wrap {
  padding: 48px 32px;
  transform: rotate(-1.5deg);
}

.diagram-svg {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  display: block;
  border-radius: 20px;
  overflow: hidden;
}

.diagram-bg {
  pointer-events: none;
}

.info-icon-orbit {
  cursor: default;
  transition: transform 0.12s ease-out;
}

.info-icon-bg {
  fill: rgba(30, 58, 138, 0.12);
  stroke: rgba(30, 58, 138, 0.35);
  stroke-width: 1.5;
  transition: all 0.3s ease;
}

.loop-arrow-wrap:hover .info-icon-bg {
  fill: rgba(249, 115, 22, 0.15);
  stroke: rgba(249, 115, 22, 0.5);
}

.info-icon-text {
  font-size: 16px;
  font-weight: 700;
  fill: #1e3a8a;
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  pointer-events: none;
  transition: fill 0.3s ease;
}

.loop-arrow-wrap:hover .info-icon-text {
  fill: #f97316;
}

.flow-line {
  stroke: url(#flowGrad);
  stroke-width: 1.5;
  stroke-dasharray: 8 10;
  stroke-linecap: round;
  fill: none;
  opacity: 0.4;
  transition: all 0.45s ease;

  &.flow-line-active {
    opacity: 1;
    stroke-width: 2.5;
    stroke-dasharray: 10 8;
    stroke: $magazine-accent;
    animation: flowDash 1.8s linear infinite;
  }
}

@keyframes flowDash {
  to {
    stroke-dashoffset: -36;
  }
}

.node-group {
  cursor: pointer;

  .node-circle {
    fill: rgba(255, 255, 255, 0.98);
    filter: drop-shadow(0 6px 16px rgba(10, 36, 99, 0.1))
      drop-shadow(0 2px 6px rgba(10, 36, 99, 0.06));
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover .node-circle {
    fill: rgba(255, 255, 255, 1);
    filter: drop-shadow(0 8px 24px rgba(10, 36, 99, 0.14))
      drop-shadow(0 4px 12px rgba(10, 36, 99, 0.08));
  }

  &.node-active .node-circle {
    fill: rgba($magazine-accent, 0.08);
    filter: drop-shadow(0 8px 24px rgba(249, 115, 22, 0.25))
      drop-shadow(0 4px 14px rgba(249, 115, 22, 0.15));
  }

  .node-icon {
    font-size: 36px;
    pointer-events: none;
  }

  .node-label {
    font-size: 14px;
    font-weight: 600;
    fill: $magazine-deep;
    letter-spacing: 0.5px;
    pointer-events: none;
    font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  }

  .node-value {
    font-size: 11px;
    fill: $magazine-accent;
    font-weight: 600;
    letter-spacing: 0.6px;
    pointer-events: none;
    font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  }
}

.center-bg {
  fill: url(#centerNavGrad);
  filter: drop-shadow(0 12px 32px rgba(10, 14, 39, 0.5))
    drop-shadow(0 0 24px rgba(0, 212, 255, 0.12));
}

.center-title {
  font-size: 24px;
  font-weight: 800;
  fill: #ffffff;
  letter-spacing: 3px;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
}

.center-sub {
  font-size: 14px;
  fill: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  letter-spacing: 1px;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.detail-panel {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 24px 28px;
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(10, 36, 99, 0.06),
    0 4px 16px rgba(10, 36, 99, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  border: 1px solid rgba($magazine-blue, 0.06);
  border-left: 5px solid $magazine-accent;
  margin-bottom: 24px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba($magazine-blue, 0.12);
}

.detail-icon {
  font-size: 40px;
  line-height: 1;
  flex-shrink: 0;
}

.detail-title {
  font-size: 20px;
  font-weight: 600;
  color: $text-primary;
  margin: 0 0 8px;
  letter-spacing: 0.5px;
}

.detail-value {
  display: inline-block;
  font-size: 13px;
  color: $magazine-accent;
  font-weight: 600;
  padding: 4px 12px;
  background: rgba($magazine-accent, 0.12);
  border-radius: 20px;
  letter-spacing: 0.3px;
}

.detail-desc {
  font-size: 14px;
  line-height: 1.7;
  color: $text-regular;
  margin: 0;
  text-align: justify;
  letter-spacing: 0.2px;
}

.detail-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba($magazine-blue, 0.15);
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: rgba($magazine-accent, 0.5);
    transform: scale(1.15);
  }

  &.active {
    width: 28px;
    border-radius: 6px;
    background: linear-gradient(135deg, $magazine-accent 0%, #fb923c 100%);
    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.35);
  }
}

.detail-fade-enter-active,
.detail-fade-leave-active {
  transition: opacity 0.4s ease;

  .detail-desc {
    transition: opacity 0.4s ease;
  }
}

.detail-fade-enter-from,
.detail-fade-leave-to {
  opacity: 0;
}

.linkage-block {
  padding: 20px 28px;
  background: linear-gradient(
    135deg,
    rgba($magazine-blue, 0.03) 0%,
    rgba($magazine-blue, 0.07) 100%
  );
  border-radius: 18px;
  border-left: 5px solid $magazine-blue;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(10, 36, 99, 0.03);
}

.linkage-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-primary;
  margin: 0 0 10px;
  letter-spacing: 0.5px;

  .linkage-icon {
    margin-right: 8px;
    font-size: 18px;
  }
}

.linkage-desc {
  font-size: 14px;
  line-height: 1.65;
  color: $text-regular;
  margin: 0;
  text-align: justify;
  letter-spacing: 0.2px;
}

.philosophy-block {
  padding: 24px 28px;
  background: linear-gradient(180deg, #fafbfc 0%, #f8fafc 100%);
  border-radius: 16px;
  box-shadow:
    0 6px 28px rgba(10, 36, 99, 0.04),
    0 2px 12px rgba(10, 36, 99, 0.02);
  border: 1px solid rgba($magazine-blue, 0.06);

  .philosophy-label {
    font-size: 13px;
    font-weight: 600;
    color: $magazine-blue;
    margin: 0 0 12px;
    letter-spacing: 1px;
  }

  p {
    font-size: 15px;
    line-height: 1.75;
    color: $text-regular;
    margin: 0;
    text-align: justify;
    letter-spacing: 0.3px;
  }

  .highlight {
    color: $magazine-accent;
    font-weight: 600;
    padding: 0 2px;
  }
}
</style>
