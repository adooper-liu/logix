<script setup lang="ts">
import ContainerGanttChart from '@/components/common/ContainerGanttChart.vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import { containerService } from '@/services/container'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const loading = ref(false)
const containers = ref<any[]>([])
/** 与 Shipments 统计卡片同源：getStatisticsDetailed，用于驱动甘特图泳道行数量 */
const statisticsFromApi = ref<{
  arrivalDistribution: Record<string, number>
  pickupDistribution: Record<string, number>
  lastPickupDistribution: Record<string, number>
  returnDistribution: Record<string, number>
} | null>(null)

// 甘特图默认时间窗口：本年（1 月 1 日～12 月 31 日）
function getDefaultDateRange(): [Date, Date] {
  return [
    dayjs().startOf('year').toDate(),
    dayjs().endOf('year').toDate()
  ]
}

// 从 route.query 解析日期与筛选（与 Shipments 统计卡片逻辑一致）
function getInitialDateRange(): [Date, Date] {
  const q = route.query
  if (q.startDate && q.endDate) {
    const start = new Date(String(q.startDate))
    const end = new Date(String(q.endDate))
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return [dayjs(start).startOf('day').toDate(), dayjs(end).endOf('day').toDate()]
    }
  }
  return getDefaultDateRange()
}

// 加载数据的日期范围（出运日期，与 GET /containers 的 startDate/endDate 一致）
const loadDataDateRange = ref<[Date, Date]>(getInitialDateRange())

// 顶部时间窗口（默认与 loadDataDateRange 一致，进入页面默认为本年）
const displayRange = ref<[Date, Date]>(getInitialDateRange())

// 从货柜中提取指定泳道的日期范围
// dimension: 'arrival' | 'pickup' | 'lastPickup' | 'return'
const calculateDisplayRange = (
  containersData: any[],
  dimension: string = 'arrival'
): [Date, Date] | null => {
  if (!containersData || containersData.length === 0) return null

  const allDates: Date[] = []
  let validCount = 0

  // 辅助函数：检查是否已提柜
  const isNotPickedUp = (status: string) => {
    const pickedUpStatuses = ['picked_up', 'unloaded', 'returned_empty']
    return !pickedUpStatuses.includes(status?.toLowerCase())
  }

  containersData.forEach(container => {
    let date: Date | null = null
    let shouldInclude = false // 是否应该包含在显示范围中

    // 获取相关数据
    const ataDate = container.ataDestPort
    const etaDate = container.etaDestPort
    const logisticsStatus = container.logisticsStatus?.toLowerCase()
    const currentPortType = container.currentPortType

    // 获取目的港操作记录
    let destPortOp: any = null
    if (container.portOperations && container.portOperations.length > 0) {
      destPortOp = container.portOperations.find((op: any) => op.portType === 'destination')
    }

    // 获取拖卡运输记录
    let firstTrucking: any = null
    if (container.truckingTransports && container.truckingTransports.length > 0) {
      firstTrucking = container.truckingTransports[0]
    }

    // 获取还空箱记录
    let emptyReturn: any = null
    if (container.emptyReturns && container.emptyReturns.length > 0) {
      emptyReturn = container.emptyReturns[0]
    }

    // 根据维度提取对应日期
    if (dimension === 'arrival') {
      // 按到港：使用与 useGanttFilters 相同的逻辑
      const isShippedButNotArrived = ['shipped', 'in_transit', 'at_port'].includes(logisticsStatus)

      // ATA + currentPortType !== 'transit'（用于"今日到港"、"今日之前到港"）
      if (ataDate && currentPortType !== 'transit') {
        date = ataDate
        shouldInclude = true
      }
      // ETA + isShippedButNotArrived + currentPortType !== 'transit'（用于"已逾期到港"、"3日内预计到港"等）
      else if (etaDate && currentPortType !== 'transit' && isShippedButNotArrived) {
        date = etaDate
        shouldInclude = true
      }
    } else if (dimension === 'pickup') {
      // 按提柜计划：统计所有有提柜计划日期的货柜
      // 仅统计已到目的港且未提柜的货柜（与 useGanttFilters 保持一致）
      const arrivedAtDestination = ataDate && currentPortType !== 'transit'
      if (arrivedAtDestination && firstTrucking?.plannedPickupDate) {
        date = firstTrucking.plannedPickupDate
        // 参考 Shipments 页面的逻辑：只统计未提柜的货柜
        if (isNotPickedUp(logisticsStatus)) {
          shouldInclude = true
        }
      }
    } else if (dimension === 'lastPickup') {
      // 按最晚提柜：已到目的港且未提柜
      const arrivedAtDestination = ataDate && currentPortType !== 'transit'
      const notPickedUp = isNotPickedUp(logisticsStatus)

      if (arrivedAtDestination && notPickedUp) {
        // 只统计无拖卡运输记录的货柜
        if (!firstTrucking && destPortOp?.lastFreeDate) {
          date = destPortOp.lastFreeDate
          shouldInclude = true
        }
      }
    } else if (dimension === 'return') {
      // 按最晚还箱：已提柜或有拖卡运输记录，且不等于已还箱状态
      const hasTrucking = !!firstTrucking
      const isPickedUp = logisticsStatus === 'picked_up' || logisticsStatus === 'unloaded'

      // 排除已还箱状态
      if (logisticsStatus !== 'returned_empty') {
        if (hasTrucking || isPickedUp) {
          // 如果已还箱，则不参与统计
          if (!emptyReturn?.returnTime) {
            if (emptyReturn?.lastReturnDate) {
              date = emptyReturn.lastReturnDate
              shouldInclude = true
            }
          }
        }
      }
    }

    // 只添加符合条件的日期
    if (date && shouldInclude) {
      allDates.push(new Date(date))
      validCount++
    }
  })

  if (allDates.length === 0) return null

  // 排序日期
  allDates.sort((a, b) => a.getTime() - b.getTime())

  // 返回最早和最晚日期
  const minDate = dayjs(allDates[0]).startOf('day').toDate()
  const maxDate = dayjs(allDates[allDates.length - 1])
    .endOf('day')
    .toDate()

  return [minDate, maxDate]
}

// 与 Shipments 统计卡片一致：出运日期 [startDate,endDate]；若有 filterCondition 则用 by-filter 接口
const loadData = async () => {
  loading.value = true
  try {
    const startDate = dayjs(loadDataDateRange.value[0]).format('YYYY-MM-DD')
    const endDate = dayjs(loadDataDateRange.value[1]).format('YYYY-MM-DD')
    const filterCondition = route.query.filterCondition as string | undefined
    const containersQuery = (route.query.containers as string) || ''

    let list: any[] = []
    const [containersRes, statisticsRes] = await Promise.all([
      filterCondition
        ? containerService.getContainersByFilterCondition(filterCondition, startDate, endDate)
        : containerService.getContainers({
            page: 1,
            pageSize: 5000,
            search: '',
            startDate,
            endDate
          }),
      containerService.getStatisticsDetailed(startDate, endDate)
    ])
    list = (containersRes as any)?.items ?? []
    if (statisticsRes?.success && statisticsRes.data) {
      statisticsFromApi.value = {
        arrivalDistribution: statisticsRes.data.arrivalDistribution ?? {},
        pickupDistribution: statisticsRes.data.pickupDistribution ?? {},
        lastPickupDistribution: statisticsRes.data.lastPickupDistribution ?? {},
        returnDistribution: statisticsRes.data.returnDistribution ?? {}
      }
    } else {
      statisticsFromApi.value = null
    }

    if (containersQuery.trim()) {
      const allowed = new Set(containersQuery.split(',').map((s) => s.trim()).filter(Boolean))
      list = list.filter((c: any) => allowed.has(c.containerNumber ?? c.container_number ?? ''))
    }

    containers.value = list
    ElMessage.success(`加载了 ${containers.value.length} 个货柜数据`)

    const range = calculateDisplayRange(containers.value, 'arrival')
    if (range) {
      displayRange.value = range
    }
  } catch (error) {
    console.error('Failed to load containers:', error)
    ElMessage.error('加载货柜数据失败')
  } finally {
    loading.value = false
  }
}

// 处理日期变化
const handleDateChange = async (value: [Date, Date] | null) => {
  if (value) {
    displayRange.value = value
  }
}

// 按当前显示范围重新加载数据（将 displayRange 同步为 loadDataDateRange 并请求）
const reloadWithDisplayRange = () => {
  loadDataDateRange.value = [displayRange.value[0], displayRange.value[1]]
  loadData()
}

// 处理泳道变化，更新显示范围
const handleLaneChange = (dimension: string) => {
  const range = calculateDisplayRange(containers.value, dimension)
  if (range) {
    displayRange.value = range
    const laneName =
      dimension === 'arrival'
        ? '按到港'
        : dimension === 'pickup'
          ? '按提柜计划'
          : dimension === 'lastPickup'
            ? '按最晚提柜'
            : '按最晚还箱'
    const laneSubtitle =
      dimension === 'arrival'
        ? '到港时间分布'
        : dimension === 'pickup'
          ? '计划提柜分布'
          : dimension === 'lastPickup'
            ? '免租期倒计时'
            : '还箱期限倒计时'
    ElMessage.info(`已切换到${laneName}（${laneSubtitle}）维度，日期范围已更新`)
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="gantt-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <div class="header-title-row">
          <span class="header-icon">📊</span>
          <div>
            <h2>货柜时间分布甘特图</h2>
            <p class="subtitle">按到港 / 提柜计划 / 最晚提柜 / 最晚还箱 多维度可视化</p>
          </div>
        </div>
        <div class="header-meta">
          <router-link to="/shipments" class="back-link">← 返回发运看板</router-link>
        </div>
      </div>
      <div class="header-actions">
        <DateRangePicker v-model="displayRange" @update:modelValue="handleDateChange" />
        <el-button @click="reloadWithDisplayRange" :loading="loading">按当前范围加载</el-button>
        <el-button type="primary" @click="loadData" :loading="loading">刷新数据</el-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12 3V7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M8 3V7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M16 3V7"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">货柜总数</span>
          <span class="stat-value">{{ containers.length }}</span>
        </div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-icon display-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M8 7V3M16 7V3M3 10H21M21 10V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V10H21Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">显示范围</span>
          <span class="stat-value" v-if="displayRange">
            {{ dayjs(displayRange[0]).format('YYYY-MM-DD') }} 至
            {{ dayjs(displayRange[1]).format('YYYY-MM-DD') }}
          </span>
          <span class="stat-value" v-else>-</span>
        </div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-icon load-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 16V4C4 2.89543 4.89543 2 6 2H18C19.1046 2 20 2.89543 20 4V16"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12 2V8"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M2 16H22V20C22 21.1046 21.1046 22 20 22H4C2.89543 22 2 21.1046 2 20V16Z"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">加载范围</span>
          <span class="stat-value"
            >{{ dayjs(loadDataDateRange[0]).format('YYYY-MM-DD') }} 至
            {{ dayjs(loadDataDateRange[1]).format('YYYY-MM-DD') }}</span
          >
        </div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-icon days-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
            <path
              d="M12 6V12L16 14"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">显示天数</span>
          <span class="stat-value" v-if="displayRange">
            {{ dayjs(displayRange[1]).diff(dayjs(displayRange[0]), 'day') + 1 }} 天
          </span>
          <span class="stat-value" v-else>-</span>
        </div>
      </div>
    </div>

    <!-- 甘特图 -->
    <div class="gantt-section">
      <el-card class="gantt-card" v-loading="loading">
        <ContainerGanttChart
          v-if="displayRange"
          :key="`${displayRange[0].getTime()}-${displayRange[1].getTime()}`"
          :containers="containers"
          :statistics="statisticsFromApi"
          :startDate="displayRange[0]"
          :endDate="displayRange[1]"
          @laneChange="handleLaneChange"
        />
        <div v-else class="no-data">
          <el-empty description="暂无货柜数据，请选择日期范围后点击「刷新数据」或「按当前范围加载」" />
        </div>
      </el-card>
    </div>

    <!-- 使用说明与图例（可折叠） -->
    <el-collapse class="info-collapse">
      <el-collapse-item name="help">
        <template #title>
          <span class="info-collapse-title">
            <span class="info-collapse-icon">📖</span>
            使用说明与图例
          </span>
        </template>
        <div class="info-content">
          <div class="info-item">
            <h4>泳道说明</h4>
            <ul>
              <li><strong>按到港（到港时间分布）：</strong>显示货柜实际到港日期和预计到港日期</li>
              <li><strong>按提柜计划（提柜计划分布）：</strong>显示货柜提柜计划日期</li>
              <li><strong>按最晚提柜（免租期倒计时）：</strong>显示货柜最后免费提柜日期</li>
              <li><strong>按最晚还箱（还箱期限倒计时）：</strong>显示货柜最后还箱日期</li>
            </ul>
          </div>
          <div class="info-item">
            <h4>颜色与预警</h4>
            <ul>
              <li><span class="color-dot" style="background-color: #67c23a"></span> 绿色：按到港</li>
              <li><span class="color-dot" style="background-color: #e6a23c"></span> 橙色：按提柜计划</li>
              <li><span class="color-dot" style="background-color: #f56c6c"></span> 红色：按最晚提柜</li>
              <li><span class="color-dot" style="background-color: #909399"></span> 灰色：按最晚还箱</li>
              <li><span class="warning-dot overdue"></span> 已逾期 · <span class="warning-dot urgent"></span> 即将到期（3 天内）</li>
            </ul>
          </div>
          <div class="info-item">
            <h4>操作提示</h4>
            <ul>
              <li>悬停圆点可查看柜号、日期、状态、目的港</li>
              <li>顶部选择日期范围后点「刷新数据」按出运日期加载；点「按当前范围加载」以当前显示区间重新拉数</li>
              <li>周末列浅红背景，今日列浅蓝高亮</li>
            </ul>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.gantt-page {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dimension-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  .dimension-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border-radius: 12px;
    background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }

    &.arrival-section {
      .dimension-header .dimension-icon {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
    }

    &.pickup-section {
      .dimension-header .dimension-icon {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
    }

    &.last-pickup-section {
      .dimension-header .dimension-icon {
        background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      }
    }

    &.return-section {
      .dimension-header .dimension-icon {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }
    }

    .dimension-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 12px;
      border-bottom: 2px solid rgba(0, 0, 0, 0.06);

      .dimension-icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        color: white;
        flex-shrink: 0;

        svg {
          width: 20px;
          height: 20px;
        }
      }

      .dimension-title {
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
        flex: 1;
      }

      .dimension-total {
        font-size: 20px;
        font-weight: 700;
        color: $text-primary;
      }
    }

    .dimension-items {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .dimension-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.6);
        transition: all 0.2s ease;

        &:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateX(4px);
        }

        &.warning {
          background: linear-gradient(135deg, #fee 0%, #ffd 100%);
          border-left: 3px solid #f56c6c;

          .item-value {
            color: #f56c6c;
            font-weight: 700;
          }
        }

        .item-label {
          font-size: 12px;
          color: $text-secondary;
          font-weight: 500;
        }

        .item-value {
          font-size: 14px;
          font-weight: 600;
          color: $text-primary;
        }
      }
    }
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  padding: 20px 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

  .header-left {
    .header-title-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;

      .header-icon {
        font-size: 32px;
        line-height: 1;
      }

      h2 {
        margin: 0 0 6px 0;
        font-size: 22px;
        color: $text-primary;
        font-weight: 700;
      }

      .subtitle {
        margin: 0;
        font-size: 13px;
        color: $text-secondary;
      }
    }

    .header-meta {
      margin-top: 12px;

      .back-link {
        font-size: 13px;
        color: $primary-color;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  }

  .header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }
}

.stats-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #f5f6f8;
  border: 1px solid #e8e9eb;
  border-radius: 10px;

  .stat-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px;
    background: white;
    border-radius: 8px;
    border: 1px solid #ebecee;
    transition: background 0.2s ease;

    &:hover {
      background: #fafbfc;
    }

    .stat-icon {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #eef0f2;
      border-radius: 6px;
      color: $text-secondary;
      flex-shrink: 0;

      svg {
        width: 16px;
        height: 16px;
      }

      &.display-icon {
        background: #e8f4fc;
        color: $primary-color;
      }

      &.load-icon {
        background: #fef5e8;
        color: #e6a23c;
      }

      &.days-icon {
        background: #f0e8f5;
        color: #909399;
      }
    }

    .stat-content {
      display: flex;
      flex-direction: column;
      gap: 0;

      .stat-label {
        font-size: 11px;
        color: $text-secondary;
        font-weight: 500;
      }

      .stat-value {
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
      }
    }
  }

  .stat-divider {
    width: 1px;
    height: 24px;
    background: #e0e2e5;
    flex-shrink: 0;
  }
}

.gantt-section {
  .gantt-card {
    padding: 0;
    background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
    border: none;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    overflow: hidden;

    &:hover {
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }

    :deep(.el-card__body) {
      padding: 0;
    }
  }

  .no-data {
    padding: 80px 20px;
    text-align: center;
    background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);

    .el-empty {
      :deep(.el-empty__image) {
        svg {
          filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
        }
      }

      :deep(.el-empty__description) {
        font-size: 15px;
        color: $text-secondary;
      }
    }
  }
}

.info-collapse {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  :deep(.el-collapse-item__header) {
    padding: 12px 16px;
    font-size: 15px;
    background: #f8f9fa;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
  }

  :deep(.el-collapse-item__content) {
    padding: 16px 20px;
    background: white;
  }
}

.info-collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;

  .info-collapse-icon {
    font-size: 18px;
  }
}

.info-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;

  .info-item {
    h4 {
      margin: 0 0 10px 0;
      font-size: 14px;
      font-weight: 600;
      color: $text-primary;
    }

    ul {
      margin: 0;
      padding-left: 20px;
      list-style: none;

      li {
        font-size: 13px;
        color: $text-secondary;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 8px;

        &:last-child {
          margin-bottom: 0;
        }

        strong {
          color: $text-primary;
        }

        .color-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .warning-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;

          &.overdue {
            background-color: #f56c6c;
            animation: pulse 2s infinite;
          }

          &.urgent {
            background-color: #e6a23c;
            animation: pulse 2s infinite;
          }
        }
      }
    }
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@media (max-width: 768px) {
  .dimension-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 16px;

    .dimension-section {
      padding: 12px;

      .dimension-header {
        padding-bottom: 10px;
        gap: 8px;

        .dimension-icon {
          width: 36px;
          height: 36px;

          svg {
            width: 18px;
            height: 18px;
          }
        }

        .dimension-title {
          font-size: 13px;
        }

        .dimension-total {
          font-size: 18px;
        }
      }

      .dimension-items {
        gap: 6px;

        .dimension-item {
          padding: 6px 10px;

          .item-label {
            font-size: 11px;
          }

          .item-value {
            font-size: 13px;
          }
        }
      }
    }
  }

  .page-header {
    flex-direction: column;

    .header-actions {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
    }
  }

  .stats-bar {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;

    .stat-item {
      padding: 6px 10px;
      gap: 8px;

      .stat-icon {
        width: 24px;
        height: 24px;

        svg {
          width: 14px;
          height: 14px;
        }
      }

      .stat-content {
        .stat-label {
          font-size: 10px;
        }

        .stat-value {
          font-size: 13px;
        }
      }
    }

    .stat-divider {
      height: 20px;
    }
  }

  .info-content {
    grid-template-columns: 1fr;
  }
}
</style>
