<template>
  <div class="occupancy-calendar">
    <el-card class="calendar-card">
      <template #header>
        <div class="card-header">
          <span>📅 档期日历</span>
          <div class="header-actions">
            <!-- 资源类型切换 -->
            <el-radio-group v-model="resourceType" size="small" @change="onResourceTypeChange">
              <el-radio-button value="warehouse">🏭 仓库</el-radio-button>
              <el-radio-button value="trucking">🚛 车队</el-radio-button>
            </el-radio-group>

            <el-button size="small" @click="loadOccupancyData">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <!-- 图例说明 -->
      <div class="legend-container">
        <div class="legend-item">
          <span class="legend-color weekend"></span>
          <span>周末</span>
        </div>
        <div class="legend-item">
          <span class="legend-color holiday"></span>
          <span>节假日</span>
        </div>
        <div class="legend-item">
          <span class="legend-color充足"></span>
          <span>产能充足 (>70%)</span>
        </div>
        <div class="legend-item">
          <span class="legend-color紧张"></span>
          <span>产能紧张 (30%-70%)</span>
        </div>
        <div class="legend-item">
          <span class="legend-color已满"></span>
          <span>产能已满 (<30%)</span>
        </div>
      </div>

      <!-- FullCalendar -->
      <FullCalendar
        ref="calendarRef"
        :options="calendarOptions"
        class="occupancy-calendar-component"
      />
    </el-card>

    <!-- 日期详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="档期详情" width="500px">
      <div v-if="selectedDay" class="day-detail">
        <div class="date-header">{{ selectedDay.dateStr }}</div>
        
        <el-descriptions :column="1" border>
          <el-descriptions-item label="日期类型">
            <el-tag :type="getTypeTag(selectedDay.type)" size="small">
              {{ getTypeText(selectedDay.type) }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="总产能">
            {{ selectedDay.capacity }}
          </el-descriptions-item>
          
          <el-descriptions-item label="已用产能">
            {{ selectedDay.occupied }}
          </el-descriptions-item>
          
          <el-descriptions-item label="剩余产能">
            <el-tag :type="getRemainingTagType(selectedDay.remaining, selectedDay.capacity)" size="small">
              {{ selectedDay.remaining }} / {{ selectedDay.capacity }}
            </el-tag>
          </el-descriptions-item>
          
          <el-descriptions-item label="使用率">
            <el-progress
              :percentage="getUsagePercentage(selectedDay)"
              :color="getProgressColor(selectedDay)"
            />
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedDay.isHoliday" class="holiday-info">
          <el-alert
            type="warning"
            :closable="false"
            show-icon
            :title="`节假日：${selectedDay.holidayName || '未知'}`"
          />
        </div>

        <div v-if="selectedDay.isWeekend" class="weekend-info">
          <el-alert
            type="info"
            :closable="false"
            show-icon
            title="周末休息日"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import api from '@/services/api'
import { useAppStore } from '@/store/app'
import { Edit, Refresh } from '@element-plus/icons-vue'
import zhLocale from '@fullcalendar/core/locales/zh-cn'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import FullCalendar from '@fullcalendar/vue3'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref, watch } from 'vue'

// 日历引用
const calendarRef = ref<any>(null)
const appStore = useAppStore()
const resolvedCountry = computed(() => appStore.scopedCountryCode || '')

// 数据状态
const occupancyEvents = ref<any[]>([])
const selectedDay = ref<any>(null)
const detailDialogVisible = ref(false)

// 资源类型切换
const resourceType = ref<'warehouse' | 'trucking'>('warehouse')

// 国家和资源列表
const countries = ref<any[]>([])
const allWarehouses = ref<any[]>([])
const allTruckingCompanies = ref<any[]>([])

// 选中的国家和资源
const selectedCountry = ref<string>('')
const selectedWarehouseCode = ref<string>('')
const selectedTruckingCode = ref<string>('')

// 过滤后的资源列表
const filteredWarehouses = computed(() => {
  if (!selectedCountry.value) return allWarehouses.value
  return allWarehouses.value.filter((wh: any) => wh.country === selectedCountry.value)
})

const filteredTruckingCompanies = computed(() => {
  if (!selectedCountry.value) return allTruckingCompanies.value
  return allTruckingCompanies.value.filter((tc: any) => tc.country === selectedCountry.value)
})

// 加载国家、仓库、车队列表
const loadResources = async () => {
  try {
    const [countriesRes, warehousesRes, truckingRes] = await Promise.all([
      api.get('/countries'),
      api.get('/warehouses'),
      api.get('/trucking-companies'),
    ])

    countries.value = countriesRes.data?.data || []
    allWarehouses.value = warehousesRes.data?.data || []
    allTruckingCompanies.value = truckingRes.data?.data || []

    // 自动选择第一个国家
    if (countries.value.length > 0 && !selectedCountry.value) {
      selectedCountry.value = resolvedCountry.value || countries.value[0].code
    }
  } catch (error: any) {
    console.error('加载资源列表失败:', error)
  }
}

// 资源类型切换处理
const onResourceTypeChange = () => {
  selectedWarehouseCode.value = ''
  selectedTruckingCode.value = ''
  loadOccupancyData()
}

// 加载档期数据
const loadOccupancyData = async () => {
  try {
    const startDate = dayjs().format('YYYY-MM-DD')
    const endDate = dayjs().add(2, 'month').format('YYYY-MM-DD')

    const countryForQuery = resolvedCountry.value || selectedCountry.value || ''
    let params: any = { start: startDate, end: endDate }
    if (countryForQuery) {
      params.country = countryForQuery
    }

    if (resourceType.value === 'warehouse') {
      params.resourceType = 'warehouse'
      if (!selectedWarehouseCode.value) {
        occupancyEvents.value = []
        return
      }
      params.warehouseCode = selectedWarehouseCode.value
    } else {
      params.resourceType = 'trucking'
      if (!selectedTruckingCode.value) {
        occupancyEvents.value = []
        return
      }
      params.truckingCompanyId = selectedTruckingCode.value
    }

    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&')

    const response = await api.get(`/scheduling/resources/occupancy/range?${queryString}`)

    if (response.data.success) {
      occupancyEvents.value = response.data.data.map((item: any) => ({
        id: item.id,
        title: getEventTitle(item),
        start: item.date,
        backgroundColor: getColorByOccupancy(item),
        borderColor: getColorByOccupancy(item),
        extendedProps: {
          ...item,
          remaining: item.remaining || item.capacity,
          capacity: item.capacity,
        },
      }))

      // 自动添加周末和节假目标记
      await addWeekendsAndHolidays(startDate, endDate, countryForQuery)
    }
  } catch (error: any) {
    console.error('加载档期数据失败:', error)
    ElMessage.error('加载档期数据失败：' + error.message)
  }
}

// 添加周末和节假日
const addWeekendsAndHolidays = async (start: string, end: string, countryCode: string) => {
  try {
    // 获取范围内的节假日
    const holidaysRes = await api.get(`/holidays/range?start=${start}&end=${end}&countryCode=${countryCode}`)
    const holidays = holidaysRes.data?.data || []

    // 为每个节假日添加事件
    holidays.forEach((holiday: any) => {
      const existingEvent = occupancyEvents.value.find(e => e.start === holiday.holidayDate)
      if (!existingEvent) {
        occupancyEvents.value.push({
          id: `holiday-${holiday.id}`,
          title: holiday.holidayName,
          start: holiday.holidayDate,
          backgroundColor: '#e6a23c', // 橙色 - 节假日
          borderColor: '#e6a23c',
          extendedProps: {
            type: 'holiday',
            isHoliday: true,
            holidayName: holiday.holidayName,
            capacity: 0,
            occupied: 0,
            remaining: 0,
          },
        })
      }
    })

    // 添加周末标记（不创建事件，仅通过 CSS 样式）
    // FullCalendar 会自动处理周末样式
  } catch (error: any) {
    console.error('加载节假日失败:', error)
  }
}

// 获取事件标题
const getEventTitle = (item: any) => {
  const usage = item.capacity > 0 ? Math.round((item.occupied / item.capacity) * 100) : 0
  return `${item.occupied}/${item.capacity} (${usage}%)`
}

// 根据档期状态获取颜色
const getColorByOccupancy = (item: any) => {
  if (item.type === 'holiday') {
    return '#e6a23c' // 橙色 - 节假日
  }
  
  const usage = item.capacity > 0 ? (item.occupied / item.capacity) * 100 : 0
  
  if (usage >= 100) {
    return '#f56c6c' // 红色 - 已满
  } else if (usage >= 70) {
    return '#e6a23c' // 橙色 - 紧张
  } else {
    return '#67c23a' // 绿色 - 充足
  }
}

// 日历配置
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  locale: zhLocale,
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,dayGridWeek',
  },
  events: occupancyEvents.value,
  dateClick: handleDateClick,
  eventClick: handleEventClick,
  height: 'auto',
  eventDisplay: 'block',
  weekends: true, // 显示周末
  dayCellClassNames: (arg: any) => {
    // 为周末添加特殊样式
    const dayOfWeek = arg.date.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return ['weekend-cell']
    }
    return []
  },
}))

// 处理日期点击
const handleDateClick = (info: any) => {
  const dateStr = info.dateStr
  const dayData = occupancyEvents.value.find(e => e.start === dateStr)

  if (dayData) {
    showDayDetail(dayData.extendedProps)
  } else {
    // 检查是否为周末或节假日
    const date = dayjs(dateStr)
    const dayOfWeek = date.day()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    showDayDetail({
      date: dateStr,
      dateStr,
      type: isWeekend ? 'weekend' : 'weekday',
      isWeekend,
      isHoliday: false,
      capacity: 0,
      occupied: 0,
      remaining: 0,
    })
  }
}

// 处理事件点击
const handleEventClick = (info: any) => {
  showDayDetail(info.event.extendedProps)
}

// 显示详情
const showDayDetail = (dayData: any) => {
  const date = dayjs(dayData.date || dayData.start)
  
  selectedDay.value = {
    ...dayData,
    dateStr: date.format('YYYY-MM-DD'),
    weekday: date.format('dddd'),
    type: dayData.type || (dayData.isHoliday ? 'holiday' : dayData.isWeekend ? 'weekend' : 'weekday'),
  }

  detailDialogVisible.value = true
}

// 获取类型标签
const getTypeTag = (type: string) => {
  const tagMap: Record<string, any> = {
    weekend: 'info',
    holiday: 'warning',
    weekday: 'success',
  }
  return tagMap[type] || 'info'
}

// 获取类型文本
const getTypeText = (type: string) => {
  const textMap: Record<string, string> = {
    weekend: '周末',
    holiday: '节假日',
    weekday: '工作日',
  }
  return textMap[type] || '未知'
}

// 获取剩余产能标签类型
const getRemainingTagType = (remaining: number, capacity: number) => {
  if (capacity === 0) return 'info'
  const ratio = remaining / capacity
  if (ratio > 0.7) return 'success'
  if (ratio > 0.3) return 'warning'
  return 'danger'
}

// 获取使用率百分比
const getUsagePercentage = (dayData: any) => {
  if (dayData.capacity === 0) return 0
  return Math.round((dayData.occupied / dayData.capacity) * 100)
}

// 获取进度条颜色
const getProgressColor = (dayData: any) => {
  if (dayData.capacity === 0) return '#909399'
  const usage = (dayData.occupied / dayData.capacity) * 100
  if (usage >= 100) return '#f56c6c'
  if (usage >= 70) return '#e6a23c'
  return '#67c23a'
}

// 生命周期
onMounted(() => {
  loadResources()
  loadOccupancyData()
})
</script>

<style scoped lang="scss">
.occupancy-calendar {
  padding: 20px;

  .calendar-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-actions {
        display: flex;
        gap: 8px;
      }
    }

    .legend-container {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f5f7fa;
      border-radius: 4px;

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 3px;

          &.weekend {
            background: #f56c6c;
          }

          &.holiday {
            background: #e6a23c;
          }

          &.充足 {
            background: #67c23a;
          }

          &.紧张 {
            background: #e6a23c;
          }

          &.已满 {
            background: #f56c6c;
          }
        }
      }
    }

    .occupancy-calendar-component {
      :deep(.fc-daygrid-day) {
        &.weekend-cell {
          background-color: rgba(245, 108, 108, 0.05);
        }
      }

      :deep(.fc-event) {
        border: none;
        border-radius: 4px;
        font-size: 12px;
        padding: 2px 4px;
      }
    }
  }

  .day-detail {
    .date-header {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
      text-align: center;
    }

    .holiday-info,
    .weekend-info {
      margin-top: 16px;
    }
  }
}
</style>
