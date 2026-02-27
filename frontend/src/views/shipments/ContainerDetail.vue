<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { containerService } from '@/services/container'
import { ArrowLeft, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const containerNumber = computed(() => route.params.containerNumber as string)

// 数据加载
const loading = ref(false)
const containerData = ref<any>(null)
const activeTab = ref('order')
const timelineSortOrder = ref<'asc' | 'desc'>('desc') // 时间轴排序方式：升序/降序

// 状态映射
const statusMap: Record<string, { text: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  'not_shipped': { text: '未出运', type: 'info' },
  'shipped': { text: '已装船', type: 'success' },
  'in_transit': { text: '在途', type: 'success' },
  'at_port': { text: '已到港', type: 'success' },
  'picked_up': { text: '已提柜', type: 'warning' },
  'unloaded': { text: '已卸柜', type: 'warning' },
  'returned_empty': { text: '已还箱', type: 'success' },
  'cancelled': { text: '已取消', type: 'danger' },
  'hold': { text: '扣留', type: 'danger' },
  'completed': { text: '已完成', type: 'success' },
  // 兼容未转换的中文状态（历史数据）
  '未出运': { text: '未出运', type: 'info' },
  '已装船': { text: '已装船', type: 'success' },
  '在途': { text: '在途', type: 'success' },
  '已到港': { text: '已到港', type: 'success' },
  '已到中转港': { text: '已到中转港', type: 'success' },
  '已提柜': { text: '已提柜', type: 'warning' },
  '已卸柜': { text: '已卸柜', type: 'warning' },
  '已还箱': { text: '已还箱', type: 'success' },
  '已取消': { text: '已取消', type: 'danger' }
}

const customsStatusMap: Record<string, { text: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  'NOT_STARTED': { text: '未开始', type: 'info' },
  'IN_PROGRESS': { text: '进行中', type: 'warning' },
  'COMPLETED': { text: '已完成', type: 'success' },
  'FAILED': { text: '失败', type: 'danger' }
}

const portTypeMap: Record<string, string> = {
  'origin': '起运港',
  'transit': '中转港',
  'destination': '目的港'
}

// 加载货柜详情
const loadContainerDetail = async () => {
  loading.value = true
  try {
    const response = await containerService.getContainerById(containerNumber.value)
    if (response.success) {
      containerData.value = response.data
    } else {
      ElMessage.error('获取货柜详情失败')
    }
  } catch (error) {
    console.error('Failed to load container details:', error)
    ElMessage.error('获取货柜详情失败')
  } finally {
    loading.value = false
  }
}

// 返回列表
const goBack = () => {
  router.push('/shipments')
}

// 刷新数据
const refreshData = () => {
  loadContainerDetail()
}

// 格式化日期
const formatDate = (date: string | Date | null | undefined): string => {
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

// 格式化日期（仅日期）
const formatDateOnly = (date: string | Date | null | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 计算时间条相关数据
const timelineData = computed(() => {
  if (!containerData.value) return []

  const seaFreight = Array.isArray(containerData.value.seaFreight)
    ? containerData.value.seaFreight[0]
    : containerData.value.seaFreight
  const portOp = getDestinationPortOperation()
  const trucking = containerData.value.truckingTransports?.[0]
  const emptyReturn = Array.isArray(containerData.value.emptyReturns)
    ? containerData.value.emptyReturns[0]
    : containerData.value.emptyReturn

  // 收集所有有值的日期
  const events: any[] = []

  // ETA (预计到港日期)
  const eta = seaFreight?.eta || portOp?.etaDestPort
  if (eta) {
    events.push({
      label: 'ETA',
      fullLabel: '预计到港',
      date: new Date(eta),
      type: 'primary',
      icon: '📅'
    })
  }

  // 修正ETA
  if (portOp?.etaCorrection) {
    events.push({
      label: '修正ETA',
      fullLabel: '修正预计到港',
      date: new Date(portOp.etaCorrection),
      type: 'warning',
      icon: '🔄'
    })
  }

  // 最晚提柜日
  if (trucking?.lastPickupDate) {
    events.push({
      label: '最晚提柜',
      fullLabel: '最晚提柜日',
      date: new Date(trucking.lastPickupDate),
      type: 'danger',
      icon: '⏰'
    })
  }

  // 最晚还箱日
  if (emptyReturn?.lastReturnDate) {
    events.push({
      label: '最晚还箱',
      fullLabel: '最晚还箱日',
      date: new Date(emptyReturn.lastReturnDate),
      type: 'success',
      icon: '📦'
    })
  }

  // 按日期排序
  const sortedEvents = events.sort((a, b) => a.date.getTime() - b.date.getTime())

  // 调试日志
  console.log('[Timeline Data] seaFreight:', seaFreight)
  console.log('[Timeline Data] portOp:', portOp)
  console.log('[Timeline Data] trucking:', trucking)
  console.log('[Timeline Data] emptyReturn:', emptyReturn)
  console.log('[Timeline Data] events count:', sortedEvents.length)

  return sortedEvents
})

// 状态事件分组：左侧预计/计划时间，右侧实际时间
const groupedStatusEvents = computed(() => {
  if (!containerData.value?.statusEvents || containerData.value.statusEvents.length === 0) {
    return []
  }

  const events = containerData.value.statusEvents

  // 分组逻辑：将预计/计划时间与实际时间配对
  const groups: any[] = []

  // 已处理的事件ID集合
  const processedIds = new Set<string>()

  // 第一轮：尝试配对预计和实际时间
  events.forEach((event: any) => {
    if (processedIds.has(event.id)) return

    const isPlanned = event.isEstimated || event.statusCode?.startsWith('E') || event.statusCode === 'ETA'

    if (isPlanned) {
      // 查找对应的实际时间（相同状态类型）
      const matchingActual = events.find((e: any) =>
        !processedIds.has(e.id) &&
        !e.isEstimated &&
        e.statusCode?.startsWith('A') &&
        e.statusCode === event.statusCode?.replace('E', 'A')
      )

      if (matchingActual) {
        const label = event.statusType === 'ETA' ? '到港' :
                      event.statusType === 'ATD' ? '出运' :
                      event.statusCode === 'ETA' ? '到港' :
                      event.locationNameCn || event.statusCode

        groups.push({
          label,
          planned: {
            timestamp: event.occurredAt,
            status: event.statusCode,
            description: event.description,
            isEstimated: true,
            dataSource: event.dataSource
          },
          actual: {
            timestamp: matchingActual.occurredAt,
            status: matchingActual.statusCode,
            description: matchingActual.description,
            isEstimated: false,
            dataSource: matchingActual.dataSource
          },
          timestamp: new Date(event.occurredAt).getTime()
        })
        processedIds.add(event.id)
        processedIds.add(matchingActual.id)
      }
    }
  })

  // 第二轮：处理未配对的事件
  events.forEach((event: any) => {
    if (processedIds.has(event.id)) return

    if (event.isEstimated) {
      const label = event.statusType === 'ETA' ? '到港' :
                    event.statusType === 'ATD' ? '出运' :
                    event.locationNameCn || event.statusCode

      groups.push({
        label,
        planned: {
          timestamp: event.occurredAt,
          status: event.statusCode,
          description: event.description,
          isEstimated: true,
          dataSource: event.dataSource
        },
        actual: null,
        timestamp: new Date(event.occurredAt).getTime()
      })
    } else {
      const label = event.statusType === 'ATA' ? '实际到港' :
                    event.statusType === 'PICKUP' ? '提柜' :
                    event.statusType === 'UNLOAD' ? '卸柜' :
                    event.statusType === 'RETURN' ? '还箱' :
                    event.locationNameCn || event.statusCode

      groups.push({
        label,
        planned: null,
        actual: {
          timestamp: event.occurredAt,
          status: event.statusCode,
          description: event.description,
          isEstimated: false,
          dataSource: event.dataSource
        },
        timestamp: new Date(event.occurredAt).getTime()
      })
    }
    processedIds.add(event.id)
  })

  // 按时间戳排序（根据选择升序或降序）
  return groups.sort((a, b) =>
    timelineSortOrder.value === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
  )
})

// 判断日期是否已过期
const isDateExpired = (date: Date): boolean => {
  return new Date() > date
}

// 获取日期的警示灯颜色
const getDateAlertColor = (date: Date): 'red' | 'orange' | 'green' => {
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return 'red'      // <=0天：红色（已过期或今天到期）
  } else if (diffDays <= 3) {
    return 'orange'   // <=3天：橙色（即将到期）
  } else {
    return 'green'    // 其他：绿色（正常）
  }
}

// 获取警示灯图标
const getAlertIcon = (color: 'red' | 'orange' | 'green'): string => {
  const icons = {
    red: '🔴',
    orange: '🟠',
    green: '🟢'
  }
  return icons[color]
}

// 获取日期状态文本
const getDateStatusText = (date: Date): string => {
  if (isDateExpired(date)) {
    const diffDays = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return '今天到期'
    if (diffDays === 1) return '已过期1天'
    return `已过期${diffDays}天`
  } else {
    const diffDays = Math.floor((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return '今天到期'
    if (diffDays === 1) return '剩余1天'
    return `剩余${diffDays}天`
  }
}

// 获取目的港操作信息
const getDestinationPortOperation = () => {
  if (!containerData.value?.portOperations) return null
  return containerData.value.portOperations.find((po: any) => po.portType === 'destination')
}

// 根据港口类型动态显示物流状态
const getLogisticsStatusText = (status: string): string => {
  const baseText = statusMap[status]?.text || status

  // 如果是 at_port 状态，根据最新的港口操作显示具体是中转港还是目的港
  if (status === 'at_port' && containerData.value?.portOperations) {
    // 查找最新的港口操作记录
    const sortedPorts = [...containerData.value.portOperations].sort(
      (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    const latestPort = sortedPorts.find((po: any) => po.portType === 'transit' || po.portType === 'destination')

    if (latestPort?.portType === 'transit') {
      return '已到中转港'
    } else if (latestPort?.portType === 'destination') {
      return '已到目的港'
    }
  }

  return baseText
}

onMounted(() => {
  loadContainerDetail()
})
</script>

<template>
  <div class="container-detail-page" v-loading="loading">
    <!-- 物流状态水印标记 -->
    <div v-if="containerData" class="logistics-status-watermark">
      <div class="watermark-badge" :class="statusMap[containerData.logisticsStatus]?.type || 'info'">
        <div class="watermark-text">{{ getLogisticsStatusText(containerData.logisticsStatus) || containerData.logisticsStatus }}</div>
      </div>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack" circle size="large" />
        <div>
          <h2>货柜详情</h2>
          <p v-if="containerData">集装箱号: {{ containerData.containerNumber }}</p>
        </div>
      </div>
      <div class="header-right">
        <el-button :icon="Refresh" @click="refreshData">刷新</el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div v-if="containerData">
      <!-- 货柜基本信息卡片 -->
      <el-card class="summary-card">
        <div class="info-grid">
          <div class="info-item">
            <span class="label">集装箱号</span>
            <span class="value">{{ containerData.containerNumber }}</span>
          </div>
          <div class="info-item">
            <span class="label">备货单号</span>
            <span class="value link">{{ containerData.orderNumber }}</span>
          </div>
          <div class="info-item">
            <span class="label">柜型</span>
            <el-tag size="small">{{ containerData.containerTypeCode }}</el-tag>
          </div>
          <div class="info-item">
            <span class="label">物流状态</span>
            <el-tag :type="statusMap[containerData.logisticsStatus]?.type || 'info'" size="small">
              {{ getLogisticsStatusText(containerData.logisticsStatus) || containerData.logisticsStatus }}
            </el-tag>
          </div>
          <div class="info-item">
            <span class="label">封条号</span>
            <span class="value">{{ containerData.sealNumber || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">货物描述</span>
            <span class="value">{{ containerData.cargoDescription || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">备货单数</span>
            <span class="value">{{ containerData.summary?.orderCount || 1 }} 个</span>
          </div>
          <!-- <div class="info-item">
            <span class="label">毛重合计</span>
            <span class="value">{{ containerData.summary?.totalGrossWeight || containerData.order?.totalGrossWeight || '-' }} KG</span>
          </div>
          <div class="info-item">
            <span class="label">体积合计</span>
            <span class="value">{{ containerData.summary?.totalCbm || containerData.order?.totalCbm || '-' }} CBM</span>
          </div>
          <div class="info-item">
            <span class="label">箱数合计</span>
            <span class="value">{{ containerData.summary?.totalBoxes || containerData.order?.totalBoxes || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">出运总价</span>
            <span class="value">${{ containerData.summary?.shipmentTotalValue || containerData.order?.shipmentTotalValue || '-' }}</span>
          </div> -->
        </div>
      </el-card>

      <!-- 关键日期时间条 -->
      <el-card class="timeline-card" v-if="timelineData.length > 0">
        <template #header>
          <div class="card-header">
            <span class="title">
              📅 关键日期
            </span>
            <span class="subtitle">货柜重要时间节点</span>
          </div>
        </template>

        <div class="timeline-container">
          <div class="timeline-line"></div>
          <div class="timeline-events">
            <div
              v-for="(event, index) in timelineData"
              :key="index"
              class="timeline-event"
              :class="{
                'expired': isDateExpired(event.date),
                'today': Math.abs(new Date().getTime() - event.date.getTime()) < 24 * 60 * 60 * 1000
              }"
            >
              <div class="event-marker">
                <span class="event-icon">{{ event.icon }}</span>
              </div>
              <div class="event-content">
                <div class="event-header">
                  <span class="event-label">{{ event.label }}</span>
                  <span class="alert-light" :class="getDateAlertColor(event.date)">
                    {{ getAlertIcon(getDateAlertColor(event.date)) }}
                  </span>
                </div>
                <div class="event-date">{{ formatDate(event.date) }}</div>
                <div class="event-status">{{ getDateStatusText(event.date) }}</div>
                <div class="event-full-label">{{ event.fullLabel }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 多页签详情 -->
      <el-card class="detail-card">
        <el-tabs v-model="activeTab">
          <!-- 货柜信息页签 -->
          <el-tab-pane label="货柜信息" name="info">
            <div class="tab-content">
              <h3>货柜信息</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="集装箱号">{{ containerData.containerNumber }}</el-descriptions-item>
                <el-descriptions-item label="备货单号">
                  <template v-if="containerData.allOrders && containerData.allOrders.length > 1">
                    {{ containerData.allOrders.map((o: any) => o.orderNumber).join(', ') }}
                  </template>
                  <template v-else>
                    {{ containerData.orderNumber || '-' }}
                  </template>
                </el-descriptions-item>
                <el-descriptions-item label="备货单数量">{{ containerData.summary?.orderCount || 1 }} 个</el-descriptions-item>
                <el-descriptions-item label="柜型">{{ containerData.containerTypeCode }}</el-descriptions-item>
                <el-descriptions-item label="箱尺寸">{{ containerData.containerSize || '-' }}</el-descriptions-item>
                <el-descriptions-item label="封条号">{{ containerData.sealNumber || '-' }}</el-descriptions-item>
                <el-descriptions-item label="持箱人">{{ containerData.containerHolder || '-' }}</el-descriptions-item>
                <el-descriptions-item label="运营方">{{ containerData.operator || '-' }}</el-descriptions-item>
                <el-descriptions-item label="危险品等级">{{ containerData.dangerClass || '-' }}</el-descriptions-item>
                <el-descriptions-item label="箱皮重">{{ containerData.tareWeight || '-' }} KG</el-descriptions-item>
                <el-descriptions-item label="箱总重">{{ containerData.totalWeight || '-' }} KG</el-descriptions-item>
                <el-descriptions-item label="超限长度">{{ containerData.overLength || '-' }} m</el-descriptions-item>
                <el-descriptions-item label="超高">{{ containerData.overHeight || '-' }} m</el-descriptions-item>
                <el-descriptions-item label="货物描述" :span="2">{{ containerData.cargoDescription || '-' }}</el-descriptions-item>
                <el-descriptions-item label="备注" :span="2">{{ containerData.remarks || '-' }}</el-descriptions-item>
              </el-descriptions>

              <h3>货物汇总信息（多个备货单合计）</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="毛重合计">{{ containerData.summary?.totalGrossWeight || containerData.grossWeight || '-' }} KG</el-descriptions-item>
                <el-descriptions-item label="体积合计">{{ containerData.summary?.totalCbm || containerData.cbm || '-' }} CBM</el-descriptions-item>
                <el-descriptions-item label="箱数合计">{{ containerData.summary?.totalBoxes || containerData.packages || '-' }}</el-descriptions-item>
                <el-descriptions-item label="出运总价">${{ containerData.summary?.shipmentTotalValue || '-' }}</el-descriptions-item>
                <el-descriptions-item label="FOB金额">${{ containerData.summary?.fobAmount || '-' }}</el-descriptions-item>
                <el-descriptions-item label="CIF金额">${{ containerData.summary?.cifAmount || '-' }}</el-descriptions-item>
                <el-descriptions-item label="议付金额">${{ containerData.summary?.negotiationAmount || '-' }}</el-descriptions-item>
              </el-descriptions>

              <h3>状态信息</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="物流状态">
                  <el-tag :type="statusMap[containerData.logisticsStatus]?.type || 'info'">
                    {{ getLogisticsStatusText(containerData.logisticsStatus) || containerData.logisticsStatus }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="是否甩柜">
                  <el-tag :type="containerData.isRolled ? 'warning' : 'info'" size="small">
                    {{ containerData.isRolled ? '是' : '否' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="是否查验">
                  <el-tag :type="containerData.inspectionRequired ? 'warning' : 'info'" size="small">
                    {{ containerData.inspectionRequired ? '是' : '否' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="是否开箱">
                  <el-tag :type="containerData.isUnboxing ? 'warning' : 'info'" size="small">
                    {{ containerData.isUnboxing ? '是' : '否' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="当前状态(中文)">{{ containerData.currentStatusDescCn || '-' }}</el-descriptions-item>
                <el-descriptions-item label="当前状态(英文)">{{ containerData.currentStatusDescEn || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>
          </el-tab-pane>

          <!-- 备货单信息页签 (多个备货单) -->
          <el-tab-pane label="备货单信息" name="order">
            <div class="tab-content">
              <!-- 备货单汇总信息 -->
              <h3>备货单汇总</h3>
              <el-descriptions :column="2" border>
                <el-descriptions-item label="备货单数量">{{ containerData.summary?.orderCount || 0 }} 个</el-descriptions-item>
                <el-descriptions-item label="毛重合计">{{ containerData.summary?.totalGrossWeight || 0 }} KG</el-descriptions-item>
                <el-descriptions-item label="体积合计">{{ containerData.summary?.totalCbm || 0 }} CBM</el-descriptions-item>
                <el-descriptions-item label="箱数合计">{{ containerData.summary?.totalBoxes || 0 }}</el-descriptions-item>
                <el-descriptions-item label="出运总价">${{ containerData.summary?.shipmentTotalValue || 0 }}</el-descriptions-item>
                <el-descriptions-item label="FOB金额">${{ containerData.summary?.fobAmount || 0 }}</el-descriptions-item>
                <el-descriptions-item label="CIF金额">${{ containerData.summary?.cifAmount || 0 }}</el-descriptions-item>
              </el-descriptions>

              <!-- 多个备货单列表 -->
              <h3>备货单明细</h3>
              <el-table :data="containerData.allOrders || [containerData.order]" border stripe>
                <el-table-column prop="orderNumber" label="备货单号" width="140" />
                <el-table-column prop="mainOrderNumber" label="主备货单号" width="140">
                  <template #default="{ row }">
                    {{ row.mainOrderNumber || '-' }}
                  </template>
                </el-table-column>
                <el-table-column prop="sellToCountry" label="销往国家" width="120" />
                <el-table-column prop="customerName" label="客户名称" width="150" show-overflow-tooltip />
                <el-table-column prop="orderStatus" label="订单状态" width="100">
                  <template #default="{ row }">
                    <el-tag size="small">{{ row.orderStatus || '-' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="procurementTradeMode" label="采购贸易模式" width="120" />
                <el-table-column prop="priceTerms" label="价格条款" width="80" />
                <el-table-column prop="wayfairSpo" label="Wayfair SPO" width="120" />
                <el-table-column prop="totalBoxes" label="箱数" width="80" align="right" />
                <el-table-column prop="totalCbm" label="体积(CBM)" width="100" align="right" />
                <el-table-column prop="totalGrossWeight" label="毛重(KG)" width="100" align="right" />
                <el-table-column prop="shipmentTotalValue" label="出运总价" width="100" align="right">
                  <template #default="{ row }">
                    ${{ row.shipmentTotalValue || 0 }}
                  </template>
                </el-table-column>
                <el-table-column prop="orderDate" label="订单日期" width="110">
                  <template #default="{ row }">
                    {{ formatDateOnly(row.orderDate) }}
                  </template>
                </el-table-column>
                <el-table-column prop="expectedShipDate" label="预计出运日期" width="110">
                  <template #default="{ row }">
                    {{ formatDateOnly(row.expectedShipDate) }}
                  </template>
                </el-table-column>
                <el-table-column prop="actualShipDate" label="实际出运日期" width="110">
                  <template #default="{ row }">
                    {{ formatDateOnly(row.actualShipDate) }}
                  </template>
                </el-table-column>
                <el-table-column prop="fobAmount" label="FOB金额" width="100" align="right">
                  <template #default="{ row }">
                    ${{ row.fobAmount || 0 }}
                  </template>
                </el-table-column>
                <el-table-column prop="cifAmount" label="CIF金额" width="100" align="right">
                  <template #default="{ row }">
                    ${{ row.cifAmount || 0 }}
                  </template>
                </el-table-column>
                <el-table-column prop="negotiationAmount" label="议付金额" width="100" align="right">
                  <template #default="{ row }">
                    ${{ row.negotiationAmount || 0 }}
                  </template>
                </el-table-column>
              </el-table>
              <el-empty v-if="!containerData.allOrders || containerData.allOrders.length === 0" description="暂无备货单信息" />
            </div>
          </el-tab-pane>

          <!-- 状态事件页签 (时间线 - 横向展示，上方预计时间，中间时间轴，下方实际时间) -->
          <el-tab-pane label="状态事件" name="events">
            <div class="tab-content">
              <div v-if="groupedStatusEvents.length > 0">
                <!-- 时间轴排序控制 -->
                <div class="timeline-sort-control">
                  <span class="sort-label">排序方式：</span>
                  <el-radio-group v-model="timelineSortOrder" size="small">
                    <el-radio-button value="asc">时间升序</el-radio-button>
                    <el-radio-button value="desc">时间降序</el-radio-button>
                  </el-radio-group>
                </div>

                <div class="status-timeline-horizontal">
                  <!-- 完整的时间轴线 -->
                  <div class="timeline-full-line"></div>

                <div
                  v-for="(group, index) in groupedStatusEvents"
                  :key="index"
                  class="timeline-column"
                >
                  <!-- 上方：预计/计划时间 -->
                  <div class="timeline-section timeline-top">
                    <div v-if="group.planned" class="timeline-event-card planned">
                      <div class="event-header">
                        <span class="event-label">{{ group.label }}</span>
                        <el-tag size="small" type="warning">预计</el-tag>
                      </div>
                      <div class="event-time">{{ formatDate(group.planned.timestamp) }}</div>
                      <div class="event-status">{{ group.planned.status }}</div>
                      <div class="event-desc">{{ group.planned.description }}</div>
                    </div>
                    <div v-else class="timeline-placeholder"></div>
                  </div>

                  <!-- 中间：时间线节点 -->
                  <div class="timeline-center">
                    <div class="timeline-dot" :class="{ 'with-planned': !!group.planned, 'with-actual': !!group.actual }"></div>
                  </div>

                  <!-- 下方：实际时间 -->
                  <div class="timeline-section timeline-bottom">
                    <div v-if="group.actual" class="timeline-event-card actual">
                      <div class="event-header">
                        <span class="event-label">{{ group.label }}</span>
                        <el-tag size="small" type="success">实际</el-tag>
                      </div>
                      <div class="event-time">{{ formatDate(group.actual.timestamp) }}</div>
                      <div class="event-status">{{ group.actual.status }}</div>
                      <div class="event-desc">{{ group.actual.description }}</div>
                    </div>
                    <div v-else class="timeline-placeholder"></div>
                  </div>
                </div>
                </div>
              </div>
              <el-empty v-else description="暂无状态事件记录" />
            </div>
          </el-tab-pane>

          <!-- 海运信息页签 -->
          <el-tab-pane label="海运信息" name="seafreight">
            <div class="tab-content">
              <div v-if="containerData.seaFreight && containerData.seaFreight.length > 0">
                <div v-for="(sf, index) in containerData.seaFreight" :key="index" class="seafreight-item">
                  <h3>海运信息 #{{ Number(index) + 1 }}</h3>
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="提单号">{{ sf.billOfLadingNumber || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="航次号">{{ sf.voyageNumber || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="船名">{{ sf.vesselName || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="船公司">{{ sf.shippingCompany || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="起运港">{{ sf.portOfLoading || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="目的港">{{ sf.portOfDischarge || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="中转港">{{ sf.portOfTransit || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="装船日期">{{ formatDateOnly(sf.shippingDate) }}</el-descriptions-item>
                    <el-descriptions-item label="预计到港日期">
                      {{ formatDateOnly(sf.eta || getDestinationPortOperation()?.etaDestPort) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="实际到港日期">
                      {{ formatDateOnly(sf.ata || getDestinationPortOperation()?.ataDestPort) }}
                    </el-descriptions-item>
                    <el-descriptions-item label="货代公司">{{ sf.freightForwarder || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="订舱号">{{ sf.bookingNumber || '-' }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
              <el-empty v-else description="暂无海运信息" />
            </div>
          </el-tab-pane>

          <!-- 港口操作页签 -->
          <el-tab-pane label="港口操作" name="port">
            <div class="tab-content">
              <div v-if="containerData.portOperations && containerData.portOperations.length > 0">
                <div v-for="(po, index) in containerData.portOperations" :key="index" class="port-item">
                  <h3>{{ portTypeMap[po.portType] || po.portType }}操作 #{{ Number(index) + 1 }}</h3>
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="港口类型">
                      <el-tag>{{ portTypeMap[po.portType] || po.portType }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="港口名称">{{ po.portName || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="港口编码">{{ po.portCode || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="港口序号">{{ po.portSequence || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="预计到港日期">{{ formatDateOnly(po.etaDestPort) }}</el-descriptions-item>
                    <el-descriptions-item label="实际到港日期">{{ formatDateOnly(po.ataDestPort) }}</el-descriptions-item>
                    <el-descriptions-item label="清关状态">
                      <el-tag v-if="po.customsStatus" :type="customsStatusMap[po.customsStatus]?.type || 'info'">
                        {{ customsStatusMap[po.customsStatus]?.text || po.customsStatus }}
                      </el-tag>
                      <span v-else>-</span>
                    </el-descriptions-item>
                    <el-descriptions-item label="ISF申报状态">{{ po.isfStatus || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="最后免费日期">{{ formatDateOnly(po.lastFreeDate) }}</el-descriptions-item>
                    <el-descriptions-item label="清关公司">{{ po.customsBroker || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="码头">{{ po.terminal || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="卸船日期">{{ formatDateOnly(po.unloadingDate) }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
              <el-empty v-else description="暂无港口操作信息" />
            </div>
          </el-tab-pane>

          <!-- 拖卡运输页签 -->
          <el-tab-pane label="拖卡运输" name="trucking">
            <div class="tab-content">
              <div v-if="containerData.truckingTransports && containerData.truckingTransports.length > 0">
                <div v-for="(tt, index) in containerData.truckingTransports" :key="index" class="trucking-item">
                  <h3>拖卡运输 #{{ Number(index) + 1 }}</h3>
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="拖卡单号">{{ tt.id || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="拖卡类型">
                      <el-tag>{{ tt.truckingType || '-' }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="拖卡公司">{{ tt.carrierCompany || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="司机姓名">{{ tt.driverName || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="司机电话">{{ tt.driverPhone || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="车牌号">{{ tt.truckPlate || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="计划提柜日期">{{ formatDateOnly(tt.plannedPickupDate) }}</el-descriptions-item>
                    <el-descriptions-item label="最晚提柜日期">{{ formatDateOnly(tt.lastPickupDate) }}</el-descriptions-item>
                    <el-descriptions-item label="实际提柜日期">{{ formatDate(tt.pickupDate) }}</el-descriptions-item>
                    <el-descriptions-item label="提柜地点">{{ tt.pickupLocation || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="计划送达日期">{{ formatDateOnly(tt.plannedDeliveryDate) }}</el-descriptions-item>
                    <el-descriptions-item label="实际送达日期">{{ formatDate(tt.deliveryDate) }}</el-descriptions-item>
                    <el-descriptions-item label="送达地点">{{ tt.deliveryLocation || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="卸柜方式">{{ tt.unloadModePlan || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="距离">{{ tt.distanceKm || '-' }} KM</el-descriptions-item>
                    <el-descriptions-item label="费用">${{ tt.cost || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="备注">{{ tt.remarks || '-' }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
              <el-empty v-else description="暂无拖卡运输信息" />
            </div>
          </el-tab-pane>

          <!-- 仓库操作页签 -->
          <el-tab-pane label="仓库操作" name="warehouse">
            <div class="tab-content">
              <div v-if="containerData.warehouseOperations && containerData.warehouseOperations.length > 0">
                <div v-for="(wo, index) in containerData.warehouseOperations" :key="index" class="warehouse-item">
                  <h3>仓库操作 #{{ Number(index) + 1 }}</h3>
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="操作单号">{{ wo.id || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="操作类型">
                      <el-tag>{{ wo.operationType || '-' }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="仓库ID">{{ wo.warehouseId || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="计划仓库">{{ wo.plannedWarehouse || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="计划卸货日期">{{ formatDateOnly(wo.plannedUnloadDate) }}</el-descriptions-item>
                    <el-descriptions-item label="实际卸货日期">{{ formatDate(wo.unloadDate) }}</el-descriptions-item>
                    <el-descriptions-item label="仓库到达日期">{{ formatDateOnly(wo.warehouseArrivalDate) }}</el-descriptions-item>
                    <el-descriptions-item label="闸口">{{ wo.unloadGate || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="卸货公司">{{ wo.unloadCompany || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="卸货方式">{{ wo.unloadModeActual || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="提货通知日期">{{ formatDateOnly(wo.notificationPickupDate) }}</el-descriptions-item>
                    <el-descriptions-item label="提货时间">{{ formatDate(wo.pickupTime) }}</el-descriptions-item>
                    <el-descriptions-item label="WMS状态">
                      <el-tag :type="wo.wmsStatus === 'COMPLETED' ? 'success' : 'warning'">
                        {{ wo.wmsStatus || '-' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="EBS状态">
                      <el-tag :type="wo.ebsStatus === 'COMPLETED' ? 'success' : 'warning'">
                        {{ wo.ebsStatus || '-' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="WMS确认日期">{{ formatDateOnly(wo.wmsConfirmDate) }}</el-descriptions-item>
                    <el-descriptions-item label="是否开箱">
                      <el-tag :type="wo.isUnboxing ? 'warning' : 'info'">
                        {{ wo.isUnboxing ? '是' : '否' }}
                      </el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="开箱时间">{{ formatDate(wo.unboxingTime) }}</el-descriptions-item>
                    <el-descriptions-item label="货物接收人">{{ wo.cargoReceivedBy || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="货物交付给">{{ wo.cargoDeliveredTo || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="备注">{{ wo.remarks || wo.warehouseRemarks || '-' }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
              <el-empty v-else description="暂无仓库操作信息" />
            </div>
          </el-tab-pane>

          <!-- 还空箱页签 -->
          <el-tab-pane label="还空箱" name="emptyreturn">
            <div class="tab-content">
              <div v-if="containerData.emptyReturns && containerData.emptyReturns.length > 0">
                <div v-for="(er, index) in containerData.emptyReturns" :key="index" class="emptyreturn-item">
                  <h3>还空箱记录 #{{ Number(index) + 1 }}</h3>
                  <el-descriptions :column="2" border>
                    <el-descriptions-item label="还箱单号">{{ er.id || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="还箱地点">{{ er.returnTerminalName || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="还箱终端编码">{{ er.returnTerminalCode || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="计划还箱日期">{{ formatDateOnly(er.plannedReturnDate) }}</el-descriptions-item>
                    <el-descriptions-item label="实际还箱日期">{{ formatDate(er.returnTime) }}</el-descriptions-item>
                    <el-descriptions-item label="最晚还箱日">{{ formatDateOnly(er.lastReturnDate) }}</el-descriptions-item>
                    <el-descriptions-item label="箱况">{{ er.containerCondition || '-' }}</el-descriptions-item>
                    <el-descriptions-item label="备注">{{ er.remarks || er.returnRemarks || '-' }}</el-descriptions-item>
                  </el-descriptions>
                </div>
              </div>
              <el-empty v-else description="暂无还空箱信息" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.container-detail-page {
  padding: 20px;
  position: relative;
}

// 物流状态水印标记
.logistics-status-watermark {
  position: fixed;
  top: 45px;
  right: 120px;
  z-index: 9999;
  padding: 10px;
  pointer-events: none;

  .watermark-badge {
    position: relative;
    width: 150px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    opacity: 0.4;
    transform: rotate(-15deg);
    transition: all 0.3s ease;

    &.success {
      background: linear-gradient(135deg, #67C23A 0%, #85CE61 100%);
    }

    &.warning {
      background: linear-gradient(135deg, #E6A23C 0%, #F0AD4E 100%);
    }

    &.danger {
      background: linear-gradient(135deg, #F56C6C 0%, #FF6B6B 100%);
    }

    &.info {
      background: linear-gradient(135deg, #909399 0%, #A0A4A9 100%);
    }

    .watermark-text {
      color: white;
      font-size: 16px;
      font-weight: 700;
      text-align: center;
      line-height: 1.3;
      padding: 10px;
      letter-spacing: 1px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    &:hover {
      opacity: 0.6;
      transform: rotate(0deg) scale(1.1);
    }
  }
}

// 调整页面头部，避免被水印遮挡
.page-header {
  position: relative;
  z-index: 100;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;

    h2 {
      font-size: 24px;
      color: #303133;
      margin: 0;
    }

    p {
      color: #909399;
      font-size: 14px;
      margin: 5px 0 0 0;
    }
  }
}

.summary-card {
  margin-bottom: 20px;

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 5px;

      .label {
        font-size: 12px;
        color: #909399;
      }

      .value {
        font-size: 16px;
        font-weight: 500;
        color: #303133;

        &.link {
          color: #409EFF;
          cursor: pointer;
        }
      }
    }
  }
}

.detail-card {
  .tab-content {
    h3 {
      font-size: 16px;
      color: #303133;
      margin: 20px 0 15px 0;
      padding-bottom: 10px;
      border-bottom: 1px solid #EBEEF5;
    }
  }
}

.seafreight-item,
.port-item,
.trucking-item,
.warehouse-item,
.emptyreturn-item {
  margin-bottom: 30px;
  padding: 15px;
  background: #F5F7FA;
  border-radius: 4px;

  &:last-child {
    margin-bottom: 0;
  }
}

.event-desc {
  color: #909399;
  font-size: 13px;
  margin: 5px 0 0 0;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .summary-card {
    .info-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
}

/* 时间条样式 */
.timeline-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    align-items: center;
    gap: 15px;

    .title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    .subtitle {
      font-size: 14px;
      color: #909399;
    }
  }

  .timeline-container {
    position: relative;
    padding: 30px 20px;
    overflow-x: auto;

    .timeline-line {
      position: absolute;
      left: 50px;
      right: 50px;
      top: 54px;
      height: 3px;
      background: linear-gradient(90deg, #409eff 0%, #67c23a 50%, #f56c6c 100%);
      border-radius: 3px;
    }

    .timeline-events {
      display: flex;
      flex-direction: row;
      gap: 0;
      justify-content: space-between;
      align-items: flex-start;
      min-width: 100%;
    }

    .timeline-event {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      flex: 1;
      text-align: center;

      &.expired {
        .event-marker {
          background: #fef0f0;
          border-color: #f56c6c;

          .event-icon {
            filter: grayscale(0.3);
          }
        }

        .event-content {
          opacity: 0.8;
        }
      }

      &.today {
        .event-marker {
          animation: pulse 2s infinite;
        }
      }

      .event-marker {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
        border: 4px solid #fff;
        box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        z-index: 2;
        margin: 0 0 10px 0;
        transition: all 0.3s ease;

        .event-icon {
          font-size: 22px;
          line-height: 1;
        }
      }

      .event-content {
        flex: none;
        padding: 10px 14px;
        background: #f5f7fa;
        border-radius: 8px;
        border-top: 3px solid #409eff;
        transition: all 0.3s ease;
        min-width: 140px;
        max-width: 180px;

        .event-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
          margin-bottom: 6px;

          .event-label {
            font-size: 14px;
            font-weight: 600;
            color: #303133;
          }

          .event-status {
            font-size: 11px;
            font-weight: 500;
          }

          .alert-light {
            font-size: 20px;
            line-height: 1;
            display: inline-block;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));

            &.red {
              animation: blink-red 1.5s ease-in-out infinite;
            }

            &.orange {
              animation: blink-orange 2s ease-in-out infinite;
            }

            &.green {
              animation: none;
            }
          }
        }

        .event-date {
          font-size: 13px;
          color: #409eff;
          font-weight: 500;
          margin-bottom: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .event-status {
          font-size: 11px;
          color: #606266;
          margin-bottom: 3px;
          font-weight: 500;
        }

        .event-full-label {
          font-size: 11px;
          color: #909399;
        }
      }

      &:hover {
        .event-marker {
          transform: scale(1.15);
          box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
        }

        .event-content {
          background: #ecf5ff;
          transform: translateY(-5px);
        }
      }
    }
  }
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 2px 12px rgba(64, 158, 255, 0.3);
  }
  50% {
    box-shadow: 0 4px 20px rgba(64, 158, 255, 0.6);
  }
}

@keyframes blink-red {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

@keyframes blink-orange {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(0.95);
  }
}

/* 状态事件时间线样式 */
.status-timeline {
  padding: 20px 0;

  .timeline-row {
    display: flex;
    align-items: stretch;
    margin-bottom: 30px;

    &:last-child {
      .timeline-line {
        display: none;
      }
    }

    .timeline-side {
      flex: 1;
      display: flex;
      align-items: center;
      min-height: 80px;

      &.timeline-left {
        justify-content: flex-end;
        padding-right: 20px;
      }

      &.timeline-right {
        justify-content: flex-start;
        padding-left: 20px;
      }
    }

    .timeline-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;

      .timeline-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #409eff;
        border: 3px solid #fff;
        box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
        z-index: 2;
        flex-shrink: 0;
        transition: all 0.3s ease;

        &.with-planned {
          background: #e6a23c;
          box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2);
        }

        &.with-actual {
          background: #67c23a;
          box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
        }
      }

      .timeline-line {
        width: 2px;
        flex: 1;
        min-height: 60px;
        background: linear-gradient(180deg, #409eff 0%, #67c23a 100%);
        margin-top: 8px;
      }
    }

    .timeline-event-card {
      background: #f5f7fa;
      border-radius: 8px;
      padding: 12px 16px;
      min-width: 200px;
      max-width: 300px;
      transition: all 0.3s ease;
      border-left: 4px solid #409eff;

      &.planned {
        border-left-color: #e6a23c;
        background: #fdf6ec;

        &:hover {
          background: #fef0e6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(230, 162, 60, 0.2);
        }
      }

      &.actual {
        border-left-color: #67c23a;
        background: #f0f9ff;

        &:hover {
          background: #e6f7ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(103, 194, 58, 0.2);
        }
      }

      .event-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        gap: 8px;

        .event-label {
          font-size: 14px;
          font-weight: 600;
          color: #303133;
        }
      }

      .event-time {
        font-size: 13px;
        color: #409eff;
        font-weight: 500;
        margin-bottom: 6px;
      }

      .event-status {
        font-size: 12px;
        color: #909399;
        margin-bottom: 4px;
      }

      .event-desc {
        font-size: 12px;
        color: #606266;
        line-height: 1.4;
      }
    }

    .timeline-placeholder {
      width: 100%;
      height: 1px;
      background: transparent;
    }
  }
}

/* 时间轴排序控件样式 */
.timeline-sort-control {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;

  .sort-label {
    font-size: 14px;
    color: #606266;
    font-weight: 500;
  }
}

/* 状态事件时间线样式 - 横向布局 */
.status-timeline-horizontal {
  padding: 20px 0;
  position: relative;
  display: flex;
  align-items: center;

  // 完整的时间轴线
  .timeline-full-line {
    position: absolute;
    left: 90px;
    right: 90px;
    top: calc(50% - 8px);
    height: 2px;
    background: linear-gradient(90deg, #409eff 0%, #67c23a 100%);
    z-index: 1;
  }

  .timeline-column {
    display: inline-block;
    vertical-align: top;
    margin-right: 30px;
    min-width: 180px;
    position: relative;
    z-index: 2;

    &:last-child {
      margin-right: 0;
    }

    .timeline-section {
      min-height: 110px;
      display: flex;
      align-items: center;
      justify-content: center;

      &.timeline-top {
        justify-content: flex-end;
        padding-bottom: 20px;
      }

      &.timeline-bottom {
        padding-top: 20px;
      }
    }

    .timeline-center {
      display: flex;
      align-items: center;
      position: relative;
      justify-content: center;

      .timeline-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #409eff;
        border: 3px solid #fff;
        box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
        z-index: 2;
        flex-shrink: 0;
        transition: all 0.3s ease;

        &.with-planned {
          background: #e6a23c;
          box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2);
        }

        &.with-actual {
          background: #67c23a;
          box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
        }
      }
    }

    .timeline-event-card {
      background: #f5f7fa;
      border-radius: 8px;
      padding: 12px 14px;
      width: 100%;
      transition: all 0.3s ease;
      border-top: 4px solid #409eff;

      &.planned {
        border-top-color: #e6a23c;
        background: #fdf6ec;

        &:hover {
          background: #fef0e6;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(230, 162, 60, 0.2);
        }
      }

      &.actual {
        border-top-color: #67c23a;
        background: #f0f9ff;

        &:hover {
          background: #e6f7ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(103, 194, 58, 0.2);
        }
      }

      .event-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        gap: 8px;

        .event-label {
          font-size: 14px;
          font-weight: 600;
          color: #303133;
        }
      }

      .event-time {
        font-size: 13px;
        color: #409eff;
        font-weight: 500;
        margin-bottom: 6px;
      }

      .event-status {
        font-size: 12px;
        color: #909399;
        margin-bottom: 4px;
      }

      .event-desc {
        font-size: 12px;
        color: #606266;
        line-height: 1.4;
      }
    }

    .timeline-placeholder {
      width: 100%;
      min-height: 120px;
      height: 120px;
    }
  }
}



</style>
