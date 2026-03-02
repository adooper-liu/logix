<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, onBeforeMount } from 'vue'
import {
  Monitor,
  Warning,
  SuccessFilled,
  CircleCheck,
  CircleClose,
  QuestionFilled,
  Refresh,
  InfoFilled,
  Clock
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import {
  getMonitoringData,
  refreshMonitoringData,
  type Alert
} from '@/api/monitoring'

// 数据加载状态
const loading = ref(false)
const lastUpdateTime = ref('')

// 📈 性能指标 - 看看系统累不累
const performanceMetrics = ref({
  cpuUsage: 0,
  memoryUsage: 0,
  responseTime: 0,
  throughput: 0
})

// 🚀 性能优化数据 - 看看优化了多少
const optimizationData = ref({
  apiCacheHits: 0,
  apiCacheTotal: 1, // 初始化为1避免除以0
  searchRequestsSaved: 0,
  slowComponents: 0,
  avgLoadTime: 0
})

// 🔔 告警信息 - 系统出问题了会告诉你
const alerts = ref<Alert[]>([])

// 🏥 服务健康度
const serviceHealth = ref({
  apiService: 100,
  database: 100,
  redis: 100,
  feituoAdapter: 100,
  logisticsAdapter: 100
})

// 📈 性能趋势数据
const performanceTrend = ref({
  timestamps: [] as string[],
  cpuUsage: [] as number[],
  memoryUsage: [] as number[]
})

// 📊 计算属性：计算一些有用的数据
const cacheHitRate = computed(() => {
  if (optimizationData.value.apiCacheTotal === 0) {
    return 0
  }
  return Math.round((optimizationData.value.apiCacheHits / optimizationData.value.apiCacheTotal) * 100)
})

const optimizationScore = computed(() => {
  // 根据各项指标计算优化得分（0-100）
  const cacheScore = cacheHitRate.value
  const searchScore = Math.min(100, (optimizationData.value.searchRequestsSaved / 100) * 100)
  const loadScore = Math.max(0, 100 - (optimizationData.value.avgLoadTime - 1) * 20)
  return Math.round((cacheScore * 0.4 + searchScore * 0.3 + loadScore * 0.3))
})

// 图表实例
let healthChart: echarts.ECharts | null = null
let performanceChart: echarts.ECharts | null = null
let cacheChart: echarts.ECharts | null = null

// 组件是否已卸载
let isMounted = false
let resizeHandler: (() => void) | null = null
let updateTimeout: NodeJS.Timeout | null = null

// 更新图表
const updateCharts = () => {
  if (!isMounted) {
    console.warn('[Monitoring] 组件已卸载，跳过图表更新')
    return
  }

  console.log('[Monitoring] 更新图表', {
    serviceHealth: serviceHealth.value,
    performanceTrend: performanceTrend.value,
    optimizationData: optimizationData.value
  })

  // 服务健康度图表
  if (healthChart && !healthChart.isDisposed()) {
    const healthOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const param = params[0]
          const value = param.value
          let status = '🟢 正常'
          if (value < 80) status = '🔴 需要关注'
          else if (value < 95) status = '🟡 注意'
          return `${param.name}<br/>健康度: ${value}%<br/>状态: ${status}`
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['API服务', '数据库', 'Redis缓存', '飞驼适配器', '物流适配器'],
        axisLabel: { interval: 0, rotate: 0 }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      series: [{
        data: [
          serviceHealth.value.apiService,
          serviceHealth.value.database,
          serviceHealth.value.redis,
          serviceHealth.value.feituoAdapter,
          serviceHealth.value.logisticsAdapter
        ],
        type: 'bar',
        barWidth: 40,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: (params: any) => {
            const value = params.value
            if (value >= 95) return '#67C23A'  // 绿色
            if (value >= 80) return '#E6A23C'  // 黄色
            return '#F56C6C'                  // 红色
          }
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%'
        }
      }]
    }
    healthChart.setOption(healthOption)
    console.log('[Monitoring] 服务健康度图表已更新')
  }

  // 性能趋势图表
  if (performanceChart && !performanceChart.isDisposed()) {
    const performanceOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let result = `${params[0].axisValue}<br/>`
          params.forEach((p: any) => {
            result += `${p.seriesName}: ${p.value}%<br/>`
          })
          return result
        }
      },
      legend: {
        data: ['CPU使用率', '内存使用率'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: performanceTrend.value.timestamps
      },
      yAxis: {
        type: 'value',
        axisLabel: { formatter: '{value}%' }
      },
      series: [
        {
          name: 'CPU使用率',
          type: 'line',
          data: performanceTrend.value.cpuUsage,
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#409EFF' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
              { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
            ])
          }
        },
        {
          name: '内存使用率',
          type: 'line',
          data: performanceTrend.value.memoryUsage,
          smooth: true,
          lineStyle: { width: 3 },
          itemStyle: { color: '#E6A23C' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(230, 162, 60, 0.3)' },
              { offset: 1, color: 'rgba(230, 162, 60, 0.05)' }
            ])
          }
        }
      ]
    }
    performanceChart.setOption(performanceOption)
    console.log('[Monitoring] 性能趋势图表已更新', {
      timestamps: performanceTrend.value.timestamps,
      cpuUsage: performanceTrend.value.cpuUsage,
      memoryUsage: performanceTrend.value.memoryUsage
    })
  }

  // 缓存效果图表
  if (cacheChart && !cacheChart.isDisposed()) {
    const cacheOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [{
        name: '请求来源',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: optimizationData.value.apiCacheHits, name: '🚀 缓存命中（超快）', itemStyle: { color: '#67C23A' } },
          { value: optimizationData.value.apiCacheTotal - optimizationData.value.apiCacheHits, name: '🌐 需要请求（较慢）', itemStyle: { color: '#E6A23C' } }
        ]
      }]
    }
    cacheChart.setOption(cacheOption)
    console.log('[Monitoring] 缓存效果图表已更新')
  }
}

// 刷新数据 - 从后端API获取真实数据
const refreshData = async () => {
  loading.value = true
  try {
    const data = await refreshMonitoringData()

    // 更新性能指标
    performanceMetrics.value = data.performanceMetrics

    // 更新优化数据
    optimizationData.value = data.optimizationData

    // 更新告警信息
    alerts.value = data.alerts

    // 更新服务健康度
    serviceHealth.value = data.serviceHealth

    // 更新性能趋势
    performanceTrend.value = data.performanceTrend

    // 更新时间
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')

    updateCharts()
  } catch (error) {
    console.error('刷新监控数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载初始数据
const loadData = async () => {
  loading.value = true
  try {
    const data = await getMonitoringData()

    // 更新性能指标
    performanceMetrics.value = data.performanceMetrics

    // 更新优化数据
    optimizationData.value = data.optimizationData

    // 更新告警信息
    alerts.value = data.alerts

    // 更新服务健康度
    serviceHealth.value = data.serviceHealth

    // 更新性能趋势
    performanceTrend.value = data.performanceTrend

    // 更新时间
    lastUpdateTime.value = new Date().toLocaleTimeString('zh-CN')

    // 数据加载完成后更新图表
    updateCharts()
  } catch (error) {
    console.error('加载监控数据失败:', error)
  } finally {
    loading.value = false
  }
}

onBeforeMount(() => {
  // 组件挂载前不加载数据，避免重复请求
  // 数据加载在 onMounted 中完成
})

onMounted(() => {
  isMounted = true

  // 初始化图表
  const healthChartDom = document.getElementById('health-chart')
  const performanceChartDom = document.getElementById('performance-chart')
  const cacheChartDom = document.getElementById('cache-chart')

  if (healthChartDom) {
    healthChart = echarts.init(healthChartDom)
  }

  if (performanceChartDom) {
    performanceChart = echarts.init(performanceChartDom)
  }

  if (cacheChartDom) {
    cacheChart = echarts.init(cacheChartDom)
  }

  // 先加载数据，再更新图表
  loadData().then(() => {
    // 数据加载完成后更新图表
    if (isMounted) {
      updateTimeout = setTimeout(() => {
        if (isMounted) {
          updateCharts()
        }
        updateTimeout = null
      }, 100)
    }
  })

  // 窗口大小改变时重新渲染图表 - 保存引用以便清理
  resizeHandler = () => {
    healthChart?.resize()
    performanceChart?.resize()
    cacheChart?.resize()
  }
  window.addEventListener('resize', resizeHandler)
})

onUnmounted(() => {
  isMounted = false

  // 清理定时器
  if (updateTimeout) {
    clearTimeout(updateTimeout)
    updateTimeout = null
  }

  // 销毁图表实例
  if (healthChart && !healthChart.isDisposed()) {
    healthChart.dispose()
    healthChart = null
  }
  if (performanceChart && !performanceChart.isDisposed()) {
    performanceChart.dispose()
    performanceChart = null
  }
  if (cacheChart && !cacheChart.isDisposed()) {
    cacheChart.dispose()
    cacheChart = null
  }

  // 移除事件监听 - 使用保存的引用
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }

  console.log('[Monitoring] 组件已卸载，资源已清理')
})
</script>

<template>
  <div class="monitoring-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div>
          <h2>🔍 系统监控看板</h2>
          <p>👀 一眼看清系统状态，有问题马上知道</p>
          <p v-if="lastUpdateTime" class="update-time">最后更新: {{ lastUpdateTime }}</p>
        </div>
        <el-button type="primary" :icon="Refresh" @click="refreshData" :loading="loading">
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- 🎯 优化评分卡片 -->
    <el-card class="score-card" shadow="hover">
      <div class="score-content">
        <div class="score-circle">
          <div class="score-value">{{ optimizationScore }}</div>
          <div class="score-label">优化得分</div>
        </div>
        <div class="score-details">
          <div class="score-item">
            <span class="score-label">📊 缓存命中率</span>
            <el-progress :percentage="cacheHitRate" :color="cacheHitRate > 50 ? '#67C23A' : '#E6A23C'" />
            <span class="score-hint">{{ cacheHitRate }}% - 50%以上才算好</span>
          </div>
          <div class="score-item">
            <span class="score-label">🔍 节省搜索请求</span>
            <div class="score-number">{{ optimizationData.searchRequestsSaved }} 次</div>
            <span class="score-hint">搜索防抖省了这么多请求</span>
          </div>
          <div class="score-item">
            <span class="score-label">⚡ 平均加载时间</span>
            <div class="score-number" :class="optimizationData.avgLoadTime < 2 ? 'good' : 'warning'">
              {{ optimizationData.avgLoadTime }} 秒
            </div>
            <span class="score-hint">2秒以内才算快</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 📊 系统状态一目了然 -->
    <div class="section-header">
      <h3>📊 当前系统状态</h3>
      <el-tooltip content="看看各个服务是否正常运行" placement="top">
        <el-icon class="help-icon"><QuestionFilled /></el-icon>
      </el-tooltip>
    </div>

    <div class="overview-grid">
      <!-- CPU使用率 -->
      <el-card class="metric-card" :class="performanceMetrics.cpuUsage > 80 ? 'warning' : ''">
        <div class="metric-content">
          <div class="metric-icon" :class="performanceMetrics.cpuUsage > 80 ? 'warning' : 'success'">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ performanceMetrics.cpuUsage }}%</div>
            <div class="metric-label">CPU使用率</div>
            <div class="metric-hint">
              {{ performanceMetrics.cpuUsage > 80 ? '⚠️ 太累了，要注意' : '✅ 还好，能应付' }}
            </div>
            <div class="metric-explanation">电脑有多忙，超过80%就要关注</div>
          </div>
        </div>
      </el-card>

      <!-- 内存使用率 -->
      <el-card class="metric-card" :class="performanceMetrics.memoryUsage > 85 ? 'warning' : ''">
        <div class="metric-content">
          <div class="metric-icon" :class="performanceMetrics.memoryUsage > 85 ? 'warning' : 'success'">
            <el-icon><SuccessFilled /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ performanceMetrics.memoryUsage }}%</div>
            <div class="metric-label">内存使用率</div>
            <div class="metric-hint">
              {{ performanceMetrics.memoryUsage > 85 ? '⚠️ 快满了，小心' : '✅ 还够用' }}
            </div>
            <div class="metric-explanation">用了多少内存，超过85%要清理</div>
          </div>
        </div>
      </el-card>

      <!-- 响应时间 -->
      <el-card class="metric-card" :class="performanceMetrics.responseTime > 500 ? 'warning' : ''">
        <div class="metric-content">
          <div class="metric-icon" :class="performanceMetrics.responseTime > 500 ? 'warning' : 'success'">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ performanceMetrics.responseTime }}ms</div>
            <div class="metric-label">平均响应时间</div>
            <div class="metric-hint">
              {{ performanceMetrics.responseTime > 500 ? '⚠️ 太慢了' : '✅ 还算快' }}
            </div>
            <div class="metric-explanation">点一下等多久反应，小于300ms算快</div>
          </div>
        </div>
      </el-card>

      <!-- 每秒请求数 -->
      <el-card class="metric-card">
        <div class="metric-content">
          <div class="metric-icon info">
            <el-icon><SuccessFilled /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ performanceMetrics.throughput }}</div>
            <div class="metric-label">每秒请求数</div>
            <div class="metric-hint">✅ 正常范围</div>
            <div class="metric-explanation">一秒能处理多少个请求</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 📈 图表区域 -->
    <div class="charts-grid">
      <!-- 服务健康度 -->
      <el-card class="chart-card">
        <template #header>
          <div class="card-header">
            <div>
              <span>🏥 服务健康度</span>
              <el-tooltip content="各个服务是否正常工作，越高越好" placement="top">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
          </div>
        </template>
        <div id="health-chart" style="height: 300px;"></div>
        <div class="chart-legend">
          <div class="legend-item"><span class="dot green"></span>95%以上 = 🟢 正常</div>
          <div class="legend-item"><span class="dot yellow"></span>80-95% = 🟡 注意</div>
          <div class="legend-item"><span class="dot red"></span>低于80% = 🔴 有问题</div>
        </div>
      </el-card>

      <!-- 性能趋势 -->
      <el-card class="chart-card">
        <template #header>
          <div class="card-header">
            <div>
              <span>📈 性能趋势</span>
              <el-tooltip content="看看CPU和内存使用率的变化" placement="top">
                <el-icon class="help-icon"><QuestionFilled /></el-icon>
              </el-tooltip>
            </div>
          </div>
        </template>
        <div id="performance-chart" style="height: 300px;"></div>
        <div class="chart-legend">
          <div class="legend-item"><span class="line blue"></span>CPU使用率</div>
          <div class="legend-item"><span class="line yellow"></span>内存使用率</div>
        </div>
      </el-card>
    </div>

    <!-- 🚀 优化效果 -->
    <div class="section-header">
      <h3>🚀 性能优化效果</h3>
      <el-tooltip content="看看我们优化了什么，效果怎么样" placement="top">
        <el-icon class="help-icon"><QuestionFilled /></el-icon>
      </el-tooltip>
    </div>

    <div class="optimization-grid">
      <!-- 缓存效果 -->
      <el-card class="optimization-card">
        <template #header>
          <div class="card-header">
            <span>💾 缓存效果</span>
            <el-tag :type="cacheHitRate > 50 ? 'success' : 'warning'">
              命中率 {{ cacheHitRate }}%
            </el-tag>
          </div>
        </template>
        <div class="cache-info">
          <div class="cache-stat">
            <span class="stat-label">🚀 缓存命中（超快）</span>
            <span class="stat-value green">{{ optimizationData.apiCacheHits }} 次</span>
          </div>
          <div class="cache-stat">
            <span class="stat-label">🌐 需要请求（较慢）</span>
            <span class="stat-value yellow">
              {{ optimizationData.apiCacheTotal - optimizationData.apiCacheHits }} 次
            </span>
          </div>
          <div class="cache-explanation">
            💡 缓存就是把数据暂时存在浏览器里，下次直接取，不用再去问服务器，超快！
          </div>
        </div>
        <div id="cache-chart" style="height: 200px;"></div>
      </el-card>

      <!-- 搜索优化 -->
      <el-card class="optimization-card">
        <template #header>
          <div class="card-header">
            <span>🔍 搜索优化</span>
            <el-tag type="success">节省 {{ optimizationData.searchRequestsSaved }} 次</el-tag>
          </div>
        </template>
        <div class="search-info">
          <div class="search-stat">
            <span class="stat-label">💡 搜索防抖</span>
            <span class="stat-value green">已开启</span>
          </div>
          <div class="search-stat">
            <span class="stat-label">⏱️ 防抖延迟</span>
            <span class="stat-value">500毫秒</span>
          </div>
          <div class="search-explanation">
            💡 搜索防抖就是你打字的时候，系统不会马上查，而是等你停500毫秒再查，避免你打每一个字都查一次。
          </div>
        </div>
      </el-card>
    </div>

    <!-- 🔔 告警信息 -->
    <div class="section-header">
      <h3>🔔 系统告警</h3>
      <el-badge :value="alerts.filter(a => a.level === 'error').length" type="danger">
        <el-button type="primary" size="small" :icon="Refresh" @click="refreshData">
          刷新
        </el-button>
      </el-badge>
    </div>

    <el-card class="alerts-card">
      <div v-if="alerts.length === 0" class="no-alerts">
        <el-icon class="success-icon"><CircleCheck /></el-icon>
        <p>✅ 目前没有告警，系统运行良好！</p>
      </div>
      <div v-else class="alerts-list">
        <div
          v-for="alert in alerts"
          :key="alert.id"
          class="alert-item"
          :class="`alert-${alert.level}`"
        >
          <div class="alert-icon">
            <el-icon v-if="alert.level === 'error'"><CircleClose /></el-icon>
            <el-icon v-else-if="alert.level === 'warning'"><Warning /></el-icon>
            <el-icon v-else><InfoFilled /></el-icon>
          </div>
          <div class="alert-content">
            <div class="alert-header">
              <span class="alert-message">{{ alert.message }}</span>
              <el-tag :type="alert.level === 'error' ? 'danger' : alert.level === 'warning' ? 'warning' : 'info'" size="small">
                {{ alert.level === 'error' ? '🔴 严重' : alert.level === 'warning' ? '🟡 警告' : '🔵 提示' }}
              </el-tag>
            </div>
            <div class="alert-details">
              <span class="alert-time"><Clock /> {{ alert.time }}</span>
              <span class="alert-advice" v-if="alert.advice">💡 建议：{{ alert.advice }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 📖 使用说明 -->
    <el-card class="help-card">
      <template #header>
        <div class="card-header">
          <span>📖 菜鸟看懂这个页面</span>
        </div>
      </template>
      <div class="help-content">
        <div class="help-section">
          <h4>🎯 什么时候要看这个页面？</h4>
          <ul>
            <li>✅ 系统感觉卡的时候</li>
            <li>✅ 页面加载很慢的时候</li>
            <li>✅ 定期检查（比如每天早上）</li>
          </ul>
        </div>
        <div class="help-section">
          <h4>🚨 出现红色或黄色要怎么办？</h4>
          <ul>
            <li>🔴 红色 = 严重问题，马上通知技术人员</li>
            <li>🟡 黄色 = 需要注意，观察一段时间</li>
            <li>🟢 绿色 = 一切正常，放心使用</li>
          </ul>
        </div>
        <div class="help-section">
          <h4>💡 优化是什么意思？</h4>
          <ul>
            <li>💾 缓存 = 把数据存在浏览器里，下次直接取，超快</li>
            <li>🔍 防抖 = 等你打完字再查，不浪费</li>
            <li>⚡ 懒加载 = 用到的时候再加载，不提前加载</li>
            <li>📊 代码分割 = 把大的文件拆成小的，加载更快</li>
          </ul>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.monitoring-page {
  padding: 20px;
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 {
      font-size: 28px;
      margin: 0 0 8px 0;
      font-weight: 600;
    }

    p {
      font-size: 16px;
      margin: 0 0 4px 0;
      opacity: 0.9;
    }

    .update-time {
      font-size: 14px;
      opacity: 0.7;
    }

    .el-button {
      background: white;
      color: #667eea;
      border: none;
      padding: 12px 24px;
      font-weight: 600;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
    }
  }
}

.score-card {
  margin-bottom: 24px;
  border: 2px solid #e8e8e8;
  transition: all 0.3s;

  &:hover {
    border-color: $primary-color;
    transform: translateY(-2px);
  }

  .score-content {
    display: flex;
    gap: 40px;
    align-items: center;
  }

  .score-circle {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);

    .score-value {
      font-size: 56px;
      font-weight: 700;
      line-height: 1;
    }

    .score-label {
      font-size: 16px;
      margin-top: 8px;
      opacity: 0.9;
    }
  }

  .score-details {
    flex: 1;

    .score-item {
      margin-bottom: 20px;

      &:last-child {
        margin-bottom: 0;
      }

      .score-label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        font-size: 15px;
      }

      .score-number {
        display: inline-block;
        font-size: 24px;
        font-weight: 600;
        margin-bottom: 4px;

        &.good {
          color: $success-color;
        }

        &.warning {
          color: $warning-color;
        }
      }

      .score-hint {
        font-size: 13px;
        color: $text-secondary;
      }
    }
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 4px solid $primary-color;

  h3 {
    margin: 0;
    font-size: 20px;
    color: $text-primary;
  }

  .help-icon {
    color: $primary-color;
    cursor: help;
  }
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.metric-card {
  transition: all 0.3s;

  &.warning {
    border: 2px solid $warning-color;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      box-shadow: 0 0 0 0 rgba(230, 162, 60, 0.4);
    }
    50% {
      box-shadow: 0 0 0 10px rgba(230, 162, 60, 0);
    }
  }

  .metric-content {
    display: flex;
    align-items: flex-start;

    .metric-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      font-size: 24px;
      color: white;
      flex-shrink: 0;

      &.primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      &.success { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
      &.warning { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
      &.info { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    }

    .metric-info {
      flex: 1;

      .metric-value {
        font-size: 32px;
        font-weight: 700;
        color: $text-primary;
        margin-bottom: 4px;
      }

      .metric-label {
        font-size: 16px;
        font-weight: 600;
        color: $text-primary;
        margin-bottom: 8px;
      }

      .metric-hint {
        font-size: 14px;
        margin-bottom: 4px;
        font-weight: 500;
      }

      .metric-explanation {
        font-size: 12px;
        color: $text-secondary;
        line-height: 1.4;
      }
    }
  }
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.chart-card {
  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 16px;
    color: $text-primary;

    .help-icon {
      color: $primary-color;
      cursor: help;
    }
  }

  .chart-legend {
    margin-top: 16px;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 6px;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: $text-primary;

      .dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;

        &.green { background: #67C23A; }
        &.yellow { background: #E6A23C; }
        &.red { background: #F56C6C; }
      }

      .line {
        width: 24px;
        height: 3px;
        border-radius: 2px;

        &.blue { background: #409EFF; }
        &.yellow { background: #E6A23C; }
      }
    }
  }
}

.optimization-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.optimization-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
    font-size: 16px;
  }

  .cache-info, .search-info {
    margin-bottom: 20px;
  }

  .cache-stat, .search-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .stat-label {
      font-size: 14px;
      color: $text-primary;
      font-weight: 500;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 600;

      &.green { color: $success-color; }
      &.yellow { color: $warning-color; }
    }
  }

  .cache-explanation, .search-explanation {
    margin-top: 16px;
    padding: 12px;
    background: #f0f9ff;
    border-left: 4px solid #409EFF;
    border-radius: 4px;
    font-size: 14px;
    color: $text-primary;
    line-height: 1.6;
  }
}

.alerts-card {
  margin-bottom: 24px;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .no-alerts {
    text-align: center;
    padding: 60px 20px;
    color: $success-color;

    .success-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }

    p {
      font-size: 18px;
      margin: 0;
      font-weight: 600;
    }
  }

  .alerts-list {
    .alert-item {
      display: flex;
      align-items: flex-start;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
      border-left: 4px solid;

      &.alert-error {
        background: #fef0f0;
        border-left-color: #F56C6C;
      }

      &.alert-warning {
        background: #fdf6ec;
        border-left-color: #E6A23C;
      }

      &.alert-info {
        background: #f4f4f5;
        border-left-color: #909399;
      }

      .alert-icon {
        font-size: 24px;
        margin-right: 16px;
        flex-shrink: 0;

        .el-icon {
          &.error { color: #F56C6C; }
          &.warning { color: #E6A23C; }
          &.success { color: #67C23A; }
          &.info { color: #909399; }
        }
      }

      .alert-content {
        flex: 1;

        .alert-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;

          .alert-message {
            font-weight: 600;
            font-size: 15px;
            color: $text-primary;
          }
        }

        .alert-details {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          font-size: 13px;

          .alert-time, .alert-advice {
            display: flex;
            align-items: center;
            gap: 4px;
            color: $text-secondary;
          }

          .el-icon {
            font-size: 14px;
          }
        }
      }
    }
  }
}

.help-card {
  .card-header {
    font-weight: 600;
    font-size: 16px;
  }

  .help-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;

    .help-section {
      h4 {
        color: $primary-color;
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          padding: 8px 0;
          color: $text-primary;
          line-height: 1.6;
          font-size: 14px;

          &:before {
            content: '';
            display: inline-block;
            width: 8px;
            height: 8px;
            background: $primary-color;
            border-radius: 50%;
            margin-right: 10px;
          }
        }
      }
    }
  }
}

@media (max-width: 1200px) {
  .charts-grid,
  .optimization-grid {
    grid-template-columns: 1fr;
  }

  .score-content {
    flex-direction: column;
    text-align: center;
    gap: 24px;
  }
}

@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .page-header .header-content {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .help-content {
    grid-template-columns: 1fr;
  }
}
</style>