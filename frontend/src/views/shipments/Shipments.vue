<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { containerService } from '@/services/container'
import type { PaginationParams } from '@/types'
import type { PortOperation, TruckingTransport, EmptyReturn } from '@/types/container'
import { Search, Refresh, View, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import CountdownCard from '@/components/CountdownCard.vue'
import { useContainerCountdown } from '@/composables/useContainerCountdown'
import {
  getLogisticsStatusText as getStatusText,
  getLogisticsStatusType,
  SimplifiedStatus
} from '@/utils/logisticsStatusMachine'

const router = useRouter()

// 表格数据
const containers = ref<any[]>([])
// 所有货柜数据（用于统计，不受分页影响）
const allContainers = ref<any[]>([])
const loading = ref(false)
const searchKeyword = ref('')

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

// 使用倒计时composable（传入所有货柜数据进行统计）
const {
  countdownByArrival,
  countdownByPickup,
  countdownByLastPickup,
  countdownByReturn,
  countdownByStatus,
  startTimer,
  stopTimer
} = useContainerCountdown(allContainers)

// 获取集装箱列表
const loadContainers = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      search: searchKeyword.value
    }

    console.log('Loading containers with params:', params)

    // 加载当前页数据（用于表格显示）
    const response = await containerService.getContainers(params)
    console.log('Container response:', response)

    containers.value = response.items
    pagination.value.total = response.pagination.total || 0

    // 加载所有货柜数据（用于统计，不带分页）
    if (allContainers.value.length === 0) {
      try {
        const allParams: any = {
          page: 1,
          pageSize: 999999,  // 获取所有数据
          search: ''  // 统计时不需要搜索过滤
        }
        const allResponse = await containerService.getContainers(allParams)
        allContainers.value = allResponse.items
        // 更新总记录数为数据库实际总数
        pagination.value.total = allResponse.pagination.total || 0
        console.log('Loaded all containers for statistics:', allContainers.value.length)
        console.log('Total containers in database:', pagination.value.total)
      } catch (allError) {
        console.error('Failed to load all containers for statistics:', allError)
        // 如果加载失败，使用当前页数据作为后备
        allContainers.value = response.items
      }
    }
  } catch (error) {
    console.error('Failed to load containers:', error)
    ElMessage.error('获取集装箱列表失败')
  } finally {
    loading.value = false
  }
}

// 根据过滤条件从数据库加载货柜
const loadContainersByFilter = async () => {
  loading.value = true
  try {
    // 获取所有数据（不使用分页）
    const params: any = {
      page: 1,
      pageSize: 999999,
      search: searchKeyword.value
    }

    console.log('Loading containers with filter params:', params)
    const response = await containerService.getContainers(params)
    console.log('Container response:', response)

    // 加载所有货柜数据用于统计
    if (allContainers.value.length === 0) {
      allContainers.value = response.items
    }

    // 根据过滤条件在前端筛选
    containers.value = filterContainersByCondition(response.items, activeFilter.value.type, activeFilter.value.days)
    pagination.value.total = containers.value.length

    console.log(`Filtered ${containers.value.length} containers from ${response.items.length} total`)
  } catch (error) {
    console.error('Failed to load containers by filter:', error)
    ElMessage.error('获取集装箱列表失败')
  } finally {
    loading.value = false
  }
}

// 根据条件筛选货柜（从全部数据中筛选）
const filterContainersByCondition = (allData: any[], filterType: string, filterDays: string): any[] => {
  if (!filterType || !filterDays) {
    return allData
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return allData.filter((c: any) => {
    const portOps = c.portOperations as PortOperation[] | undefined
    const destPortOp = portOps?.find(po => po.portType === 'destination')
    const etaDate = destPortOp?.etaCorrection || c.etaDestPort || destPortOp?.etaDestPort
    const ataDate = destPortOp?.ataDestPort || c.ataDestPort
    const trucking = c.truckingTransports as TruckingTransport[] | undefined
    const firstTrucking = trucking?.[0]
    const emptyReturns = c.emptyReturns as EmptyReturn[] | undefined
    const emptyReturn = emptyReturns?.[0]

    // 按到港过滤
    if (filterType === '按到港') {
      // 先处理已到目的港的货柜
      if (ataDate && c.currentPortType !== 'transit') {
        const arrivalDate = new Date(ataDate)
        arrivalDate.setHours(0, 0, 0, 0)
        if (filterDays === 'today') {
          return arrivalDate.getTime() === today.getTime()
        } else if (filterDays === 'arrived-before-today') {
          return arrivalDate.getTime() < today.getTime()
        }
        return false
      }

      // 已到中转港的货柜
      if (c.currentPortType === 'transit' && c.ataDestPort) {
        if (filterDays === 'transit') return true
        return false
      }

      // 只统计已出运但未到港之后状态的货柜
      if (!isShippedButNotArrived(c.logisticsStatus)) return false

      if (filterDays === 'overdue') {
        if (!etaDate) return false
        const time = getRemainingTime(etaDate)
        return time?.isExpired === true
      } else if (filterDays === '0-3' || filterDays === '4-7' || filterDays === '7+') {
        if (!etaDate) return false
        const time = getRemainingTime(etaDate)
        if (!time) return false
        if (time.isExpired) return false
        if (filterDays === '0-3') return time.days <= 3
        if (filterDays === '4-7') return time.days > 3 && time.days <= 7
        if (filterDays === '7+') return time.days > 7
      } else if (filterDays === 'other') {
        // 其他记录：已出运/在途/AT_PORT，但无ETA或已过期
        if (!etaDate) return true  // 无ETA
        const time = getRemainingTime(etaDate)
        if (time?.isExpired) return false  // 已逾期被归类到overdue
        return false
      }
    }

    // 按提柜过滤
    if (filterType === '按提柜') {
      // 统计范围：已到港且未提柜及之后状态没有任一发生
      const arrivedAtDestination = ataDate && c.currentPortType !== 'transit'
      const notPickedUp = isNotPickedUp(c.logisticsStatus)

      // 如果没有到港或已经提柜，则不参与统计
      if (!arrivedAtDestination || !notPickedUp) {
        return false
      }

      // 无拖卡运输记录
      if (!firstTrucking) {
        // 待安排提柜（已到港但无拖卡运输记录）
        return filterDays === 'pending'
      }

      const plannedPickupDate = firstTrucking.plannedPickupDate
      const pickupDate = firstTrucking.pickupDate

      if (filterDays === 'today-actual') {
        // 今日实际提柜
        if (pickupDate) {
          const pickupDateObj = new Date(pickupDate)
          pickupDateObj.setHours(0, 0, 0, 0)
          return pickupDateObj.getTime() === today.getTime()
        }
        return false
      } else if (filterDays === 'today-planned') {
        // 今日计划提柜（未提柜）
        if (pickupDate) return false  // 已提柜
        if (plannedPickupDate) {
          const plannedDate = new Date(plannedPickupDate)
          plannedDate.setHours(0, 0, 0, 0)
          return plannedDate.getTime() === today.getTime()
        }
        return false
      } else if (filterDays === 'overdue') {
        // 计划提柜逾期（未提柜）
        if (pickupDate) return false  // 已提柜
        if (plannedPickupDate) {
          const time = getRemainingTime(plannedPickupDate)
          return time?.isExpired === true
        }
        return false
      } else if (filterDays === '0-3' || filterDays === '4-7') {
        // 3天/7天内预计提柜（未提柜）
        if (pickupDate) return false  // 已提柜
        if (!plannedPickupDate) return false
        const time = getRemainingTime(plannedPickupDate)
        if (!time) return false
        if (time.isExpired) return false
        if (filterDays === '0-3') return time.days <= 3
        if (filterDays === '4-7') return time.days > 3 && time.days <= 7
      }
    }

    // 最晚提柜过滤
    if (filterType === '最晚提柜') {
      // 统计范围：已到港且未提柜及之后状态没有任一发生
      const arrivedAtDestination = ataDate && c.currentPortType !== 'transit'
      const notPickedUp = isNotPickedUp(c.logisticsStatus)

      // 如果没有到港或已经提柜，则不参与统计
      if (!arrivedAtDestination || !notPickedUp) {
        return false
      }

      // 只统计无拖卡运输记录的货柜
      if (firstTrucking) {
        return false
      }

      // 缺最后免费日
      if (!destPortOp?.lastFreeDate) {
        return filterDays === 'no-last-free-date'
      }

      const time = getRemainingTime(destPortOp.lastFreeDate)
      if (!time) return false
      if (filterDays === '0') return time.isExpired
      if (filterDays === '1-3') return !time.isExpired && time.days <= 3
      if (filterDays === '4-7') return !time.isExpired && time.days > 3 && time.days <= 7
      if (filterDays === '8+') return !time.isExpired && time.days > 7
    }

    // 最晚还箱过滤
    if (filterType === '最晚还箱') {
      // 统计范围：已提柜或有拖卡运输记录，且不等于已还箱状态
      const hasTrucking = !!firstTrucking
      const isPickedUp = c.logisticsStatus === SimplifiedStatus.PICKED_UP ||
                        c.logisticsStatus === SimplifiedStatus.UNLOADED

      // 排除已还箱状态
      if (c.logisticsStatus === SimplifiedStatus.RETURNED_EMPTY) {
        return false
      }

      if (!hasTrucking && !isPickedUp) {
        return false
      }

      // 如果已还箱，则不参与统计
      if (emptyReturn?.returnTime) {
        return false
      }

      // 缺最后还箱日
      if (!emptyReturn?.lastReturnDate) {
        return filterDays === 'no-last-return-date'
      }

      const time = getRemainingTime(emptyReturn.lastReturnDate)
      if (!time) return false
      if (filterDays === '0') return time.isExpired
      if (filterDays === '1-3') return !time.isExpired && time.days <= 3
      if (filterDays === '4-7') return !time.isExpired && time.days > 3 && time.days <= 7
      if (filterDays === '8+') return !time.isExpired && time.days > 7
    }

    // 按状态过滤
    if (filterType === '按状态') {
      return c.logisticsStatus === filterDays
    }

    return false
  })
}

// 搜索处理
const handleSearch = () => {
  pagination.value.page = 1
  loadContainers()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  activeFilter.value = { type: '', days: '' }
  pagination.value.page = 1
  loadContainers()
}

// 重新加载统计数据（获取所有货柜）
const reloadStatistics = async () => {
  allContainers.value = []  // 清空缓存，强制重新加载
  const params: any = {
    page: 1,
    pageSize: 999999,
    search: ''
  }
  try {
    const response = await containerService.getContainers(params)
    allContainers.value = response.items
    console.log('Reloaded all containers for statistics:', allContainers.value.length)
  } catch (error) {
    console.error('Failed to reload statistics:', error)
  }
}

// 处理倒计时卡片点击过滤
const handleCountdownFilter = (type: string, days: string) => {
  activeFilter.value = { type: type as any, days }
  pagination.value.page = 1
  loadContainersByFilter()  // 使用新函数从数据库获取并过滤
}

// 重置过滤器
const resetFilter = () => {
  activeFilter.value = { type: '', days: '' }
  pagination.value.page = 1
  loadContainers()
}

// 查看详情
const viewDetails = (container: any) => {
  router.push(`/shipments/${container.containerNumber}`)
}

// 编辑集装箱
const editContainer = (container: any) => {
  ElMessage.info(`编辑集装箱 ${container.containerNumber}`)
}

// 分页改变
const handlePageChange = (page: number) => {
  pagination.value.page = page
  if (activeFilter.value.type && activeFilter.value.days) {
    // 有过滤条件时，使用前端分页
    // 数据已经在 loadContainersByFilter 中全部加载
  } else {
    // 无过滤条件时，使用后端分页
    loadContainers()
  }
}

// 页面大小改变
const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize
  pagination.value.page = 1
  if (activeFilter.value.type && activeFilter.value.days) {
    // 有过滤条件时，使用前端分页
    // 数据已经在 loadContainersByFilter 中全部加载
  } else {
    // 无过滤条件时，使用后端分页
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
    'transit': '到达中转港',
    'today': '今日到港',
    'arrived-before-today': '今日之前到港',
    'other': '其他记录',
    '0': '已超时',
    '0-3': '3天内',
    '4-7': '7天内',
    '7+': '7天以上',
    '8+': '还箱日倒计时>7天',
    'today-actual': '今日实际提柜',
    'today-planned': '今日计划提柜',
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
  loadContainers()
  startTimer()
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
          :data="countdownByStatus"
          @filter="handleCountdownFilter"
        />
        <CountdownCard
          title="按到港"
          label="待到港货柜"
          subtitle="（统计范围：已出运、在途、已到港）"
          :data="countdownByArrival"
          @filter="handleCountdownFilter"
        />
        <CountdownCard
          title="按提柜"
          label="待提柜货柜"
          :data="countdownByPickup"
          @filter="handleCountdownFilter"
        />
        <CountdownCard
          title="最晚提柜"
          label="即将超时货柜"
          :data="countdownByLastPickup"
          @filter="handleCountdownFilter"
        />
        <CountdownCard
          title="最晚还箱"
          label="待还箱货柜"
          :data="countdownByReturn"
          @filter="handleCountdownFilter"
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
.shipments-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
  
  h2 {
    font-size: 24px;
    color: #303133;
    margin-bottom: 10px;
  }
  
  p {
    color: #909399;
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