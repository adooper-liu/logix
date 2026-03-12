<template>
  <div class="simple-gantt-chart">
    <!-- 顶部信息栏 -->
    <div class="gantt-header">
      <div class="header-left">
        <h2>货柜时间分布甘特图</h2>
        <div class="filter-info">
          当前筛选：{{ filterLabel }}（{{ filteredContainers.length }}个货柜）
        </div>
      </div>
      <div class="header-right">
        <el-button :icon="Filter" @click="showFilterDrawer = true" size="small">
          状态筛选
          <el-badge
            v-if="selectedStatuses.length > 0"
            :value="selectedStatuses.length"
            class="filter-badge"
          />
        </el-button>
        <el-button :icon="Download" @click="exportData" size="small">导出数据</el-button>
        <el-button @click="goBack" size="small">返回</el-button>
        <el-button @click="loadData" type="primary" size="small" :loading="loading">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 日期范围切换 -->
    <div class="date-range-selector">
      <span>日期范围：</span>
      <el-radio-group v-model="rangeType" @change="onRangeChange" size="small">
        <el-radio-button :value="7">7天</el-radio-button>
        <el-radio-button :value="15">15天</el-radio-button>
        <el-radio-button :value="30">30天</el-radio-button>
      </el-radio-group>
      <span class="date-display">
        {{ formatDate(displayRange[0]) }} ~ {{ formatDate(displayRange[1]) }}
      </span>
    </div>

    <!-- 甘特图主体 -->
    <div class="gantt-body" v-loading="loading">
      <div class="gantt-body-scroll">
        <!-- 时间轴头部 -->
        <div class="timeline-header">
          <div class="port-group-header">目的港</div>
          <div
            v-for="date in dateRange"
            :key="date.getTime()"
            class="date-cell"
            :class="{
              'is-weekend': isWeekend(date),
              'is-today': isToday(date),
            }"
          >
            <div class="date-day">{{ formatDateShort(date) }}</div>
            <div class="date-weekday">{{ getWeekday(date) }}</div>
          </div>
        </div>

        <!-- 按目的港分组的货柜分布 -->
        <div v-for="(containersByPort, port) in groupedByPort" :key="port" class="port-group">
          <div class="port-name">{{ getPortDisplayName(containersByPort) }}</div>
          <div
            v-for="date in dateRange"
            :key="date.getTime()"
            class="date-cell"
            :class="{
              'is-weekend': isWeekend(date),
              'is-today': isToday(date),
            }"
          >
            <div class="dots-container">
              <div
                v-for="container in getContainersByDateAndPort(date, port)"
                :key="container.containerNumber"
                class="container-dot clickable"
                :style="{ backgroundColor: getStatusColor(container.logisticsStatus) }"
                @mouseenter="showTooltip(container, $event)"
                @mouseleave="hideTooltip"
                @click="goToDetail(container)"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="gantt-legend">
      <div class="legend-title">图例：</div>
      <div class="legend-items">
        <div v-for="(color, status) in statusColors" :key="status" class="legend-item">
          <div class="legend-dot" :style="{ backgroundColor: color }"></div>
          <span>{{ status }}</span>
        </div>
      </div>
    </div>

    <!-- Tooltip -->
    <div
      v-if="tooltipVisible"
      class="gantt-tooltip"
      :style="{
        left: tooltipPosition.x + 'px',
        top: tooltipPosition.y + 'px',
      }"
    >
      <div class="tooltip-title">{{ tooltipContainer?.containerNumber }}</div>
      <div class="tooltip-content">
        <div class="tooltip-row">
          <span class="label">物流状态：</span>
          <span class="value">{{ tooltipContainer?.logisticsStatus }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">目的港：</span>
          <span class="value">{{ tooltipContainer?.destinationPort }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">预计到港：</span>
          <span class="value">{{ formatDate(tooltipContainer?.etaDestPort) }}</span>
        </div>
        <div class="tooltip-row" v-if="tooltipContainer?.ataDestPort">
          <span class="label">实际到港：</span>
          <span class="value">{{ formatDate(tooltipContainer?.ataDestPort) }}</span>
        </div>
        <div class="tooltip-row" v-if="tooltipContainer?.plannedPickupDate">
          <span class="label">计划提柜：</span>
          <span class="value">{{ formatDate(tooltipContainer?.plannedPickupDate) }}</span>
        </div>
        <div class="tooltip-row" v-if="tooltipContainer?.lastFreeDate">
          <span class="label">最晚提柜：</span>
          <span class="value">{{ formatDate(tooltipContainer?.lastFreeDate) }}</span>
        </div>
      </div>
    </div>

    <!-- 状态筛选抽屉 -->
    <el-drawer v-model="showFilterDrawer" title="状态筛选" size="300px">
      <el-checkbox-group v-model="selectedStatuses">
        <div
          v-for="option in logisticsStatusOptions"
          :key="option.value"
          class="status-filter-item"
        >
          <el-checkbox :label="option.value" :value="option.value">
            <span class="status-label">
              <span class="status-dot" :style="{ backgroundColor: option.color }"></span>
              {{ option.label }}
            </span>
          </el-checkbox>
        </div>
      </el-checkbox-group>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="resetStatusFilter">重置</el-button>
          <el-button type="primary" @click="applyStatusFilter"
            >应用（{{ selectedStatuses.length }}）</el-button
          >
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { containerService } from '@/services/container'
import type { Container } from '@/types/container'
import { Download, Filter } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 数据
const containers = ref<Container[]>([])
const loading = ref(false)

// 过滤条件
const filterCondition = ref('')
const filterLabel = ref('')

// 状态筛选
const showFilterDrawer = ref(false)
const selectedStatuses = ref<string[]>([])
const logisticsStatusOptions = [
  { label: '未出运', value: 'not_shipped', color: '#909399' },
  { label: '已出运', value: 'shipped', color: '#409EFF' },
  { label: '在途', value: 'in_transit', color: '#67C23A' },
  { label: '已到港', value: 'at_port', color: '#E6A23C' },
  { label: '已提柜', value: 'picked_up', color: '#F56C6C' },
  { label: '已卸柜', value: 'unloaded', color: '#909399' },
  { label: '已还箱', value: 'returned_empty', color: '#C0C4CC' },
]

// 过滤后的货柜
const filteredContainers = computed(() => {
  if (selectedStatuses.value.length === 0) {
    return containers.value
  }
  return containers.value.filter(c =>
    selectedStatuses.value.includes(c.logisticsStatus?.toLowerCase() || '')
  )
})

// 日期范围
const rangeType = ref(7)
const displayRange = ref<[Date, Date]>([new Date(), new Date()])
const dateRange = ref<Date[]>([])

// Tooltip
const tooltipVisible = ref(false)
const tooltipPosition = ref({ x: 0, y: 0 })
const tooltipContainer = ref<ContainerItem | null>(null)

// 布局配置
const maxDotsPerCell = 6
const dotSpacing = 16

// 按目的港分组（使用过滤后的货柜）
const groupedByPort = computed(() => {
  const groups: Record<string, Container[]> = {}

  filteredContainers.value.forEach(container => {
    // 使用港口代码作为分组键，确保同一港口的货柜在一组
    const portCode = container.destinationPort || '未指定'

    if (!groups[portCode]) {
      groups[portCode] = []
    }
    groups[portCode].push(container)
  })

  return groups
})

// 状态颜色映射
const statusColors: Record<string, string> = {
  not_shipped: '#909399',
  shipped: '#409eff',
  in_transit: '#409eff',
  at_port: '#e6a23c',
  picked_up: '#67c23a',
  unloaded: '#67c23a',
  returned_empty: '#67c23a',
}

// 计算日期范围
const calculateDateRange = (days: number): [Date, Date] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - Math.floor(days / 2))

  const endDate = new Date(today)
  endDate.setDate(endDate.getDate() + Math.floor(days / 2))

  return [startDate, endDate]
}

// 生成日期列表
const generateDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = []
  const current = new Date(start)

  while (current <= end) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const condition = route.query.filterCondition as string
    const startDate = route.query.startDate as string
    const endDate = route.query.endDate as string
    const label = route.query.filterLabel as string

    filterCondition.value = condition
    filterLabel.value = label

    let response: any
    if (condition) {
      // 有过滤条件，使用按条件查询
      response = await containerService.getContainersByFilterCondition(
        condition,
        startDate,
        endDate
      )
    } else {
      // 无过滤条件，使用普通查询
      response = await containerService.getContainers({
        page: 1,
        pageSize: 500,
        search: '',
        startDate,
        endDate,
      })
    }

    containers.value = response.items ?? []
    console.log(`[SimpleGantt] Loaded ${containers.value.length} containers for filter: ${condition}, date range: ${startDate} ~ ${endDate}`)

    // 调试：打印第一个货柜的完整数据
    if (containers.value.length > 0) {
      console.log('[SimpleGantt] First container data:', JSON.stringify(containers.value[0], null, 2))
    }

    // 计算显示范围：优先使用 URL 传来的日期范围，否则使用默认的 7/15/30 天
    if (startDate && endDate) {
      displayRange.value = [new Date(startDate), new Date(endDate)]
      console.log(`[SimpleGantt] Using URL date range: ${displayRange.value[0]} ~ ${displayRange.value[1]}`)
      // 自动调整 rangeType 以匹配实际天数
      const daysDiff = dayjs(endDate).diff(dayjs(startDate), 'day') + 1
      if (daysDiff > 30) {
        rangeType.value = 30
      } else if (daysDiff > 15) {
        rangeType.value = 15
      } else {
        rangeType.value = 7
      }
    } else {
      displayRange.value = calculateDateRange(rangeType.value)
      console.log(`[SimpleGantt] Using calculated date range: ${displayRange.value[0]} ~ ${displayRange.value[1]}`)
    }
    dateRange.value = generateDateRange(displayRange.value[0], displayRange.value[1])
    console.log(`[SimpleGantt] Display range: ${displayRange.value[0]} ~ ${displayRange.value[1]}, total days: ${dateRange.value.length}`)
  } catch (error) {
    console.error('加载甘特图数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 获取货柜落格日期（按到港规则）
const getContainerDate = (container: Container): Date | null => {
  // 优先级规则：ataDestPort -> etaCorrection -> etaDestPort -> seaFreight.eta

  // 1. 优先使用实际到港日期 ATA
  if (container.ataDestPort) {
    return new Date(container.ataDestPort)
  }

  // 2. 其次使用修正 ETA
  if (container.etaCorrection) {
    return new Date(container.etaCorrection)
  }

  // 3. 使用预计到港 ETA
  if (container.etaDestPort) {
    return new Date(container.etaDestPort)
  }

  // 4. 如果根级别都没有，尝试从 portOperations 数组中查找目的港操作记录
  if (container.portOperations && container.portOperations.length > 0) {
    const destPortOp = container.portOperations.find((op: any) => op.portType === 'destination')
    if (destPortOp?.ataDestPort) {
      return new Date(destPortOp.ataDestPort)
    }
    if (destPortOp?.etaCorrection) {
      return new Date(destPortOp.etaCorrection)
    }
    if (destPortOp?.etaDestPort) {
      return new Date(destPortOp.etaDestPort)
    }
  }

  // 5. 最后使用 seaFreight 中的 ETA（适用于没有 portOperations 记录的货柜）
  if (container.seaFreight?.eta) {
    return new Date(container.seaFreight.eta)
  }

  return null
}

// 获取指定日期和目的港的货柜
const getContainersByDateAndPort = (date: Date, port: string): Container[] => {
  const dateStr = dayjs(date).format('YYYY-MM-DD')

  const portContainers = groupedByPort.value[port] || []

  const filtered = portContainers.filter(container => {
    const containerDate = getContainerDate(container)
    if (!containerDate) {
      console.log(`[SimpleGantt] Container ${container.containerNumber} has no date (port=${port})`)
      return false
    }
    const containerDateStr = dayjs(containerDate).format('YYYY-MM-DD')
    const isMatch = containerDateStr === dateStr
    if (isMatch) {
      console.log(`[SimpleGantt] Container ${container.containerNumber} matches date ${dateStr} (port=${port})`)
    }
    return isMatch
  })

  return filtered
}

// 获取状态颜色
const getStatusColor = (status?: string): string => {
  return statusColors[status?.toLowerCase() || 'not_shipped'] || '#909399'
}

// 格式化日期
const formatDate = (date?: string | Date): string => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}

// 格式化短日期
const formatDateShort = (date: Date): string => {
  return dayjs(date).format('MM-DD')
}

// 获取星期
const getWeekday = (date: Date): string => {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `周${weekdays[date.getDay()]}`
}

// 判断是否周末
const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6
}

// 判断是否今天
const isToday = (date: Date): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  return today.getTime() === compareDate.getTime()
}

// 获取港口显示名称
const getPortDisplayName = (containers: Container[]): string => {
  if (containers.length === 0) return '未指定'
  // 使用第一个货柜的港口名称（从latestPortOperation获取）
  const firstContainer = containers[0]
  const portName = firstContainer.latestPortOperation?.portName
  const portCode = firstContainer.destinationPort
  return portName || portCode || '未指定'
}

// 日期范围切换
const onRangeChange = () => {
  displayRange.value = calculateDateRange(rangeType.value)
  dateRange.value = generateDateRange(displayRange.value[0], displayRange.value[1])
}

// 应用状态筛选
const applyStatusFilter = () => {
  showFilterDrawer.value = false
  ElMessage.success(`已筛选 ${selectedStatuses.value.length} 个状态`)
}

// 重置状态筛选
const resetStatusFilter = () => {
  selectedStatuses.value = []
  showFilterDrawer.value = false
  ElMessage.info('已重置状态筛选')
}

// 跳转到货柜详情
const goToDetail = (container: Container) => {
  router.push({
    name: 'ContainerDetail',
    params: { containerNumber: container.containerNumber },
  })
}

// 导出数据
const exportData = () => {
  const data = filteredContainers.value.map(c => ({
    集装箱号: c.containerNumber,
    备货单号: c.orderNumber,
    提单号: c.billOfLadingNumber,
    目的港: c.destinationPort,
    物流状态: c.logisticsStatus,
    预计到港: formatDate(c.etaDestPort),
    实际到港: formatDate(c.ataDestPort),
    计划提柜: formatDate(c.plannedPickupDate),
    最晚提柜: formatDate(c.lastFreeDate),
  }))

  const headers = [
    '集装箱号',
    '备货单号',
    '提单号',
    '目的港',
    '物流状态',
    '预计到港',
    '实际到港',
    '计划提柜',
    '最晚提柜',
  ]
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(',')),
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `甘特图数据_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
  link.click()

  ElMessage.success('数据导出成功')
}

// 显示 Tooltip
const showTooltip = (container: ContainerItem, event: MouseEvent) => {
  tooltipContainer.value = container
  tooltipPosition.value = {
    x: event.clientX + 10,
    y: event.clientY + 10,
  }
  tooltipVisible.value = true
}

// 隐藏 Tooltip
const hideTooltip = () => {
  tooltipVisible.value = false
}

// 返回
const goBack = () => {
  router.push('/shipments')
}

// 初始化
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.simple-gantt-chart {
  padding: 20px;
  background: #fff;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gantt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.header-left h2 {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #303133;
}

.filter-info {
  font-size: 14px;
  color: #606266;
}

.date-range-selector {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  flex-shrink: 0;
}

.date-display {
  font-size: 14px;
  color: #606266;
}

.gantt-body {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.gantt-body-scroll {
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.timeline-header {
  display: flex;
  min-width: 100%;
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.port-group-header {
  flex: 0 0 120px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #303133;
  border-right: 1px solid #e4e7ed;
  background: #f5f7fa;
  flex-shrink: 0;
}

.port-group {
  display: flex;
  min-width: 100%;
  border-bottom: 2px solid #e4e7ed;
}

.port-name {
  flex: 0 0 120px;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #303133;
  border-right: 1px solid #e4e7ed;
  background: #fafafa;
  padding: 10px;
  font-size: 13px;
  text-align: center;
  word-break: break-word;
}

.date-cell {
  flex: 0 0 150px;
  border-right: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  position: relative;
  min-width: 150px;
}

.timeline-header .date-cell {
  height: 60px;
  flex-shrink: 0;
}

.port-group .date-cell {
  min-height: 150px;
}

.date-cell.is-weekend {
  background-color: #fef0f0;
}

.date-cell.is-today {
  background-color: #ecf5ff;
}

.date-day {
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.date-weekday {
  color: #909399;
}

.dots-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  padding-top: 5px;
  gap: 8px;
}

.container-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.container-dot:hover {
  transform: scale(1.8);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
}

.gantt-legend {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  flex-shrink: 0;
  margin-top: 20px;
}

.legend-title {
  font-size: 14px;
  color: #606266;
  font-weight: bold;
}

.legend-items {
  display: flex;
  gap: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #606266;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.gantt-tooltip {
  position: fixed;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
}

.tooltip-title {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.tooltip-content {
  font-size: 12px;
}

.tooltip-row {
  display: flex;
  margin-bottom: 6px;
}

.tooltip-row .label {
  color: #909399;
  min-width: 70px;
}

.tooltip-row .value {
  color: #303133;
  font-weight: 500;
}

/* 状态筛选抽屉 */
.status-filter-item {
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.status-filter-item:last-child {
  border-bottom: none;
}

.status-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid #e4e7ed;
}

/* 圆点可点击 */
.container-dot.clickable {
  cursor: pointer;
  transition: transform 0.2s;
}

.container-dot.clickable:hover {
  transform: scale(1.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 筛选徽标 */
:deep(.filter-badge) {
  margin-left: 5px;
}
</style>
