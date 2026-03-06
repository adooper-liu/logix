<script setup lang="ts">
import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { containerService } from '@/services/container'
import type { PaginationParams } from '@/types'
import type { PortOperation, TruckingTransport, EmptyReturn } from '@/types/container'
import { Search, Refresh, View, Edit, Calendar } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import CountdownCard from '@/components/CountdownCard.vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import { useContainerCountdown } from '@/composables/useContainerCountdown'
import {
  getLogisticsStatusText as getStatusText,
  getLogisticsStatusType,
  SimplifiedStatus
} from '@/utils/logisticsStatusMachine'
import dayjs from 'dayjs'

const router = useRouter()

// 表格数据 - 使用 shallowRef 减少深度响应式开销
const containers = shallowRef<any[]>([])
// 统计数据（从后端API获取，不依赖全量数据）
const statisticsData = ref<{
  statusDistribution: Record<string, number>
  arrivalDistribution: Record<string, number>
  pickupDistribution: Record<string, number>
  lastPickupDistribution: Record<string, number>
  returnDistribution: Record<string, number>
} | null>(null)
const loading = ref(false)
const searchKeyword = ref('')

// 时间筛选（Dashboard风格的日期范围选择器）
const shipmentDateRange = ref<[Date, Date]>([
  dayjs().subtract(90, 'day').startOf('day').toDate(),
  dayjs().endOf('day').toDate()
])



// 分页参数
const pagination = ref<PaginationParams>({
  page: 1,
  pageSize: 10,
  total: 0
})

// 过滤条件
const activeFilter = ref<{
  type: '' | '按到港' | '按提柜' | '最晚提柜' | '最晚还箱'
  days: string
}>({ type: '', days: '' })

// 清关状态映射
const customsStatusMap: Record<string, { text: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  'NOT_STARTED': { text: '未开始', type: 'info' },
  'IN_PROGRESS': { text: '进行中', type: 'warning' },
  'COMPLETED': { text: '已完成', type: 'success' },
  'FAILED': { text: '失败', type: 'danger' }
}

// 使用倒计时composable（传入统计数据，不再依赖allContainers）
const {
  countdownByArrival,
  countdownByPickup,
  countdownByLastPickup,
  countdownByReturn,
  countdownByStatus,
  startTimer,
  stopTimer
} = useContainerCountdown(statisticsData)

// 获取集装箱列表
const loadContainers = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      search: searchKeyword.value
    }

    // 使用Dashboard风格的日期筛选
    if (shipmentDateRange.value) {
      params.startDate = dayjs(shipmentDateRange.value[0]).format('YYYY-MM-DD')
      params.endDate = dayjs(shipmentDateRange.value[1]).format('YYYY-MM-DD')
    }

    console.log('Loading containers with params:', params)

    // 只加载当前页数据（用于表格显示）
    const response = await containerService.getContainers(params)
    console.log('Container response:', response)

    containers.value = response.items
    pagination.value.total = response.pagination.total || 0
  } catch (error) {
    console.error('Failed to load containers:', error)
    ElMessage.error('获取集装箱列表失败')
  } finally {
    loading.value = false
  }
}

// 获取统计数据（后端聚合）
const loadStatistics = async () => {
  try {
    console.log('Loading detailed statistics from backend...')
    // 统计不使用日期筛选，显示所有货柜的数据
    const response = await containerService.getStatisticsDetailed(undefined, undefined)
    if (response.success && response.data) {
      statisticsData.value = response.data
      console.log('Statistics loaded:', response.data)
    }
  } catch (error) {
    console.error('Failed to load statistics:', error)
    ElMessage.error('获取统计数据失败')
  }
}

// 根据过滤条件从数据库加载货柜（使用后端过滤）
// 注意：filterCondition直接来自CountdownCard，已经是后端值，无需映射
const loadContainersByFilter = async () => {
  loading.value = true
  try {
    // 点击标签时不使用日期筛选，显示所有符合条件的货柜
    const startDate = undefined
    const endDate = undefined

    // filterCondition直接来自CountdownCard的days值，已经是后端filterCondition
    // 无需任何映射，直接透传给后端
    const filterCondition = activeFilter.value.days

    console.log('🎯 [Shipments] 倒计时卡片点击', {
      type: activeFilter.value.type,
      days: activeFilter.value.days,
      filterCondition,  // 直接透传，无映射
      path: 'frontend → loadContainersByFilter → backend API (无中间层映射)'
    })

    // 使用后端API根据统计条件获取货柜列表
    const response = await containerService.getContainersByFilterCondition(
      filterCondition,
      startDate,
      endDate
    )

    console.log('📦 [Shipments] loadContainersByFilter 后端响应', {
      success: response.success,
      count: response.count,
      itemsLength: response.items?.length || 0
    })

    if (response.success && response.items) {
      containers.value = response.items
      pagination.value.total = response.count

      console.log(`✅ [Shipments] 成功加载 ${containers.value.length} 条货柜数据`)
    } else {
      containers.value = []
      pagination.value.total = 0
      console.warn('⚠️ [Shipments] 后端返回空数据')
    }
  } catch (error) {
    console.error('❌ [Shipments] loadContainersByFilter 失败:', error)
    ElMessage.error('获取集装箱列表失败')
  } finally {
    loading.value = false
  }
}



// 搜索处理
const handleSearch = () => {
  console.log('🔍 [Shipments] 搜索按钮点击', {
    searchKeyword: searchKeyword.value,
    shipmentDateRange: shipmentDateRange.value,
    currentPage: pagination.value.page
  })
  pagination.value.page = 1
  loadContainers()
}

// 重置搜索
const resetSearch = () => {
  console.log('🔄 [Shipments] 重置搜索按钮点击', {
    beforeKeyword: searchKeyword.value,
    beforeFilter: activeFilter.value
  })
  searchKeyword.value = ''
  activeFilter.value = { type: '', days: '' }
  pagination.value.page = 1
  loadContainers()
  console.log('✅ [Shipments] 重置完成', {
    afterKeyword: searchKeyword.value,
    afterFilter: activeFilter.value
  })
}

// 处理Dashboard风格的日期范围筛选
const handleShipmentDateChange = async (value: [Date, Date] | null) => {
  console.log('📅 [Shipments] 日期范围改变', {
    value,
    formattedValue: value ? [dayjs(value[0]).format('YYYY-MM-DD'), dayjs(value[1]).format('YYYY-MM-DD')] : null
  })
  if (value) {
    shipmentDateRange.value = value
    pagination.value.page = 1
    await Promise.all([
      loadStatistics(),
      loadContainers()
    ])
    console.log('✅ [Shipments] 日期筛选完成')
  }
}

// 重新加载统计数据（从后端获取）
const reloadStatistics = async () => {
  console.log('🔄 [Shipments] 刷新统计数据按钮点击')
  await loadStatistics()
}

// 处理倒计时卡片点击过滤
// 注意：days已经是后端filterCondition，直接使用，无需映射
const handleCountdownFilter = (type: string, days: string) => {
  console.log('🎯 [Shipments] 倒计时卡片点击', {
    type,
    days,  // 已经是后端filterCondition
    filterLabel: `${type} - ${days}`,
    path: 'CountdownCard → handleCountdownFilter → loadContainersByFilter → backend API (无映射层)'
  })
  activeFilter.value = { type: type as any, days }
  pagination.value.page = 1
  loadContainersByFilter()
}

// 重置过滤器
const resetFilter = () => {
  console.log('🔄 [Shipments] 重置过滤器按钮点击', {
    beforeFilter: activeFilter.value
  })
  activeFilter.value = { type: '', days: '' }
  pagination.value.page = 1
  loadContainers()
  console.log('✅ [Shipments] 过滤器已重置')
}

// 查看详情
const viewDetails = (container: any) => {
  console.log('👁️ [Shipments] 查看详情按钮点击', {
    containerNumber: container.containerNumber,
    orderNumber: container.orderNumber,
    targetPath: `/shipments/${container.containerNumber}`
  })
  router.push(`/shipments/${container.containerNumber}`)
}

// 编辑集装箱
const editContainer = (container: any) => {
  console.log('✏️ [Shipments] 编辑按钮点击', {
    containerNumber: container.containerNumber,
    orderNumber: container.orderNumber
  })
  ElMessage.info(`编辑集装箱 ${container.containerNumber}`)
}

// 分页改变
const handlePageChange = (page: number) => {
  console.log('📄 [Shipments] 分页改变', {
    fromPage: pagination.value.page,
    toPage: page,
    hasFilter: !!(activeFilter.value.type && activeFilter.value.days),
    filter: activeFilter.value
  })
  pagination.value.page = page
  if (activeFilter.value.type && activeFilter.value.days) {
    // 有过滤条件时，使用前端分页
    // 数据已经在 loadContainersByFilter 中全部加载
    console.log('📄 [Shipments] 使用前端分页（已加载全部数据）')
  } else {
    // 无过滤条件时，使用后端分页
    console.log('📄 [Shipments] 使用后端分页')
    loadContainers()
  }
}

// 页面大小改变
const handlePageSizeChange = (pageSize: number) => {
  console.log('📏 [Shipments] 页面大小改变', {
    fromPageSize: pagination.value.pageSize,
    toPageSize: pageSize,
    hasFilter: !!(activeFilter.value.type && activeFilter.value.days),
    filter: activeFilter.value
  })
  pagination.value.pageSize = pageSize
  pagination.value.page = 1
  if (activeFilter.value.type && activeFilter.value.days) {
    // 有过滤条件时，使用前端分页
    // 数据已经在 loadContainersByFilter 中全部加载
    console.log('📏 [Shipments] 使用前端分页（已加载全部数据）')
  } else {
    // 无过滤条件时，使用后端分页
    console.log('📏 [Shipments] 使用后端分页')
    loadContainers()
  }
}

// 格式化日期
const formatDate = (date: string | Date): string => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatShipmentDate = (date: string | Date): string => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 根据港口类型动态显示物流状态
const getLogisticsStatusText = (container: any): string => {
  const status = container.logisticsStatus
  const currentPortType = container.currentPortType || container.latestPortOperation?.portType

  // 使用统一状态机获取状态文本
  return getStatusText(status, currentPortType)
}

// 获取状态类型（用于 Tag 组件）
const getStatusType = (status: string): string => {
  return getLogisticsStatusType(status)
}

// 获取过滤条件标签
const getFilterLabel = (days: string): string => {
  const labels: Record<string, string> = {
    'all': '全部',
    'overdue': '已逾期未到港',
    'transit': '已到中转港',
    'today': '今日到港',
    'arrivedBeforeTodayNotPickedUp': '今日之前到港未提柜',
    'arrivedBeforeTodayPickedUp': '今日之前到港已提柜',
    'arrivedBeforeTodayNoATA': '今日之前到港，但无ATA',
    'other': '其他记录',
    '0': '已超时',
    '0-3': '3天内',
    '4-7': '7天内',
    '7+': '7天以上',
    '8+': '还箱日倒计时>7天',
    'overduePickup': '逾期未提柜',
    'todayPlanned': '今日计划提柜',
    'pending': '待安排提柜',
    'no-last-free-date': '缺最后免费日',
    'no-last-return-date': '缺最后还箱日',
    '1-3': '1-3天'
  }
  return labels[days] || days
}

// 计算倒计时时间
const getRemainingTime = (targetDate: string | Date | null | undefined) => {
  if (!targetDate) return null
  const target = new Date(targetDate)
  const now = new Date()
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, isExpired: false }
}

// 获取修正ETA（从港口操作记录中获取）
const getEtaCorrection = (container: any): string | Date | null => {
  const portOps = container.portOperations as PortOperation[] | undefined
  if (!portOps) return null

  const destPortOp = portOps.find(po => po.portType === 'destination')
  return destPortOp?.etaCorrection || null
}

// 状态判断函数：是否已出运但未到港之后的状态
const isShippedButNotArrived = (status: string) => {
  const statusIndex = [
    SimplifiedStatus.NOT_SHIPPED,
    SimplifiedStatus.SHIPPED,
    SimplifiedStatus.IN_TRANSIT,
    SimplifiedStatus.AT_PORT,
    SimplifiedStatus.PICKED_UP,
    SimplifiedStatus.UNLOADED,
    SimplifiedStatus.RETURNED_EMPTY
  ].indexOf(status as SimplifiedStatus)

  // 已出运（SHIPPED、IN_TRANSIT、AT_PORT）
  const isShipped = statusIndex >= 1 && statusIndex <= 3
  return isShipped
}

// 状态判断函数：是否未提柜及之后状态没有任一发生
const isNotPickedUp = (status: string) => {
  const statusIndex = [
    SimplifiedStatus.NOT_SHIPPED,
    SimplifiedStatus.SHIPPED,
    SimplifiedStatus.IN_TRANSIT,
    SimplifiedStatus.AT_PORT,
    SimplifiedStatus.PICKED_UP,
    SimplifiedStatus.UNLOADED,
    SimplifiedStatus.RETURNED_EMPTY
  ].indexOf(status as SimplifiedStatus)

  // 未提柜及之后状态（NOT_SHIPPED、SHIPPED、IN_TRANSIT、AT_PORT）
  return statusIndex >= 0 && statusIndex <= 3
}

// 前端分页计算属性（用于过滤后的数据）
const paginatedContainers = computed(() => {
  // 没有过滤条件时，使用后端分页数据
  if (!activeFilter.value.type || !activeFilter.value.days) {
    return containers.value
  }

  // 有过滤条件时，在前端进行分页
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return containers.value.slice(start, end)
})

// 根据过滤条件筛选货柜
const filteredContainers = computed(() => {
  return paginatedContainers.value
})

onMounted(() => {
  // 检查是否从Dashboard跳转过来，带有时间参数
  const route = router.currentRoute.value
  if (route.query.startDate && route.query.endDate && route.query.timeDimension) {
    // 从Dashboard传来的时间范围，应用到Dashboard风格的日期选择器
    shipmentDateRange.value = [
      new Date(route.query.startDate as string),
      new Date(route.query.endDate as string)
    ]
  }

  // 并行加载统计数据和表格数据
  Promise.all([
    loadStatistics(),
    loadContainers()
  ]).then(() => {
    startTimer()
  })
})

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <div class="shipments-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>集装箱管理</h2>
      <p>管理所有的集装箱信息和状态跟踪</p>
    </div>

    <!-- 搜索和操作栏 -->
    <el-card class="search-card">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索集装箱号、备货单号、提单号..."
          :prefix-icon="Search"
          style="width: 300px; margin-right: 15px;"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
        <el-button @click="resetSearch">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>

        <!-- 共用的日期范围选择器 -->
        <DateRangePicker v-model="shipmentDateRange" @update:modelValue="handleShipmentDateChange" />

        <!-- 甘特图按钮 -->
        <el-button type="success" @click="router.push('/shipments/gantt-chart')">
          <el-icon><Calendar /></el-icon>
          甘特图
        </el-button>

        <!-- 显示当前过滤器 -->
        <el-tag v-if="activeFilter.type" type="warning" closable @close="resetFilter">
          {{ activeFilter.type }}: {{ getFilterLabel(activeFilter.days) }}
        </el-tag>

        <div class="spacer"></div>
        <el-button @click="loadContainers">
          <el-icon><Refresh /></el-icon>
          刷新列表
        </el-button>
        <el-button type="success" @click="reloadStatistics">
          <el-icon><Refresh /></el-icon>
          刷新统计
        </el-button>
      </div>
    </el-card>

    <!-- 倒计时可视化卡片 -->
    <el-card class="countdown-cards">
      <div class="countdown-grid">
        <CountdownCard
          title="按状态"
          label="物流状态分布"
          subtitle="（全部货柜）"
          :data="countdownByStatus"
          @filter="handleCountdownFilter"
          description="<strong>统计范围：</strong>全部货柜<br/><strong>分类依据：</strong>物流状态机（logistics_status）<br/><strong>业务用途：</strong>监控货柜在全流程中的实时分布状态"
        />
        <CountdownCard
          title="按到港"
          label="到港时间分布"
          subtitle="（全部货柜）"
          :data="countdownByArrival"
          @filter="handleCountdownFilter"
          description="<strong>统计范围：</strong>shipped + in_transit + at_port + picked_up + unloaded + returned_empty<br/><strong>分组结构：</strong><br/>① 已到目的港（今日到港 + 之前未提柜 + 之前已提柜）<br/>② 已到中转港（有中转港记录，目的港未到）<br/>③ 预计到港（已逾期 + 3天内 + 7天内 + 7天以上 + 其他）<br/><strong>分类依据：</strong>目的港 ETA（预计）和 ATA（实际）日期，中转港记录<br/><strong>业务用途：</strong>监控海运段的到港进度，区分中转港和目的港状态，预警逾期风险"
        />
        <CountdownCard
          title="按计划提柜"
          label="计划提柜分布"
          subtitle="（已到目的港 + 未提柜状态）"
          :data="countdownByPickup"
          @filter="handleCountdownFilter"
          description="<strong>统计范围：</strong>已到目的港（有ATA且≠transit）+ 未提柜状态<br/><strong>分类依据：</strong>planned_pickup_date（计划提柜日期）<br/><strong>包含：</strong>逾期未提柜、今日计划提柜、待安排提柜、3天内预计提柜、7天内预计提柜<br/><strong>业务用途：</strong>监控已到港货柜的计划提柜执行进度"
        />
        <CountdownCard
          title="按最晚提柜"
          label="免租期倒计时"
          subtitle="（已到目的港 + 未提柜状态）"
          :data="countdownByLastPickup"
          @filter="handleCountdownFilter"
          description="<strong>统计范围：</strong>已到目的港（有ATA且≠transit）+ 未提柜状态<br/><strong>分类依据：</strong>last_free_date（最后免费提柜日）<br/><strong>关键区别：</strong>与'按计划提柜'不同，这里聚焦<span class='highlight'>免租期倒计时风险</span><br/><strong>业务用途：</strong>预警可能产生滞港费的货柜"
        />
        <CountdownCard
          title="按最晚还箱"
          label="还箱期限倒计时"
          subtitle="（已提柜或有拖卡记录 + 未还箱状态）"
          :data="countdownByReturn"
          @filter="handleCountdownFilter"
          description="<strong>统计范围：</strong>已提柜或有拖卡运输记录 + 未还箱状态<br/><strong>分类依据：</strong>last_return_date（最后还箱日）<br/><strong>业务用途：</strong>监控空箱返还期限，避免产生滞箱费"
        />
      </div>
    </el-card>

    <!-- 集装箱表格 -->
    <el-card class="table-card">
      <el-table
        :data="filteredContainers"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="containerNumber" label="集装箱号" width="140" fixed />
        <el-table-column prop="actualShipDate" label="出运日期" width="120">
          <template #default="{ row }">
            {{ formatShipmentDate(row.actualShipDate || row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="orderNumber" label="备货单号" width="140" />
        <el-table-column prop="billOfLadingNumber" label="提单号" width="140" />
        <el-table-column prop="containerTypeCode" label="柜型" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ row.containerTypeCode || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="logisticsStatus" label="物流状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.logisticsStatus)" size="small">
              {{ getLogisticsStatusText(row) || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="inspectionRequired" label="查验" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.inspectionRequired ? 'warning' : 'info'" size="small">
              {{ row.inspectionRequired ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isUnboxing" label="开箱" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isUnboxing ? 'warning' : 'info'" size="small">
              {{ row.isUnboxing ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="destinationPort" label="目的港" width="100" />
        <el-table-column prop="location" label="当前位置" width="100" />
        <el-table-column prop="etaDestPort" label="预计到港" width="110">
          <template #default="{ row }">
            {{ row.etaDestPort ? formatDate(row.etaDestPort) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="修正ETA" width="110">
          <template #default="{ row }">
            <template v-if="getEtaCorrection(row)">
              <el-tag type="success" size="small">
                {{ formatDate(getEtaCorrection(row) as string | Date) }}
              </el-tag>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="ataDestPort" label="实际到港" width="110">
          <template #default="{ row }">
            {{ row.ataDestPort ? formatDate(row.ataDestPort) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="customsStatus" label="清关状态" width="100">
          <template #default="{ row }">
            <el-tag :type="customsStatusMap[row.customsStatus]?.type || 'info'" size="small" v-if="row.customsStatus">
              {{ customsStatusMap[row.customsStatus]?.text || row.customsStatus }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="cargoDescription" label="货物描述" min-width="150" show-overflow-tooltip />
        <el-table-column prop="lastUpdated" label="最后更新" width="160">
          <template #default="{ row }">
            {{ row.lastUpdated ? formatDate(row.lastUpdated) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              @click="viewDetails(row)"
            >
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button
              size="small"
              @click="editContainer(row)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total || 0"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.shipments-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;

  h2 {
    font-size: 24px;
    color: $text-primary;
    margin-bottom: 10px;
  }

  p {
    color: $text-secondary;
    font-size: 14px;
  }
}

.search-card {
  margin-bottom: 20px;

  .search-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;

    .spacer {
      flex: 1;
    }
  }
}

.table-card {
  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .search-bar {
    flex-direction: column;
    align-items: stretch !important;

    .el-input {
      width: 100% !important;
      margin-right: 0 !important;
    }

    .spacer {
      display: none;
    }
  }

  .countdown-grid {
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }
}


.countdown-cards {
  margin-bottom: 20px;

  .countdown-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }
}
</style>