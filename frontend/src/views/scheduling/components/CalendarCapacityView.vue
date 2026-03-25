<template>
  <div class="calendar-capacity-view">
    <el-card class="capacity-calendar-card">
      <template #header>
        <div class="card-header">
          <span>📅 每日能力日历</span>
          <div class="header-actions">
            <!-- 资源类型切换 -->
            <el-radio-group v-model="resourceType" size="small" @change="onResourceTypeChange">
              <el-radio-button value="warehouse">🏭 仓库</el-radio-button>
              <el-radio-button value="trucking">🚛 车队</el-radio-button>
            </el-radio-group>

            <el-button size="small" @click="loadCapacityData">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button size="small" type="primary" @click="showManualSetting = true">
              <el-icon><Edit /></el-icon>
              手动设置
            </el-button>
          </div>
        </div>
      </template>

      <!-- 资源选择器（仅仓库模式显示） -->
      <el-row :gutter="16" class="resource-selector" v-if="resourceType === 'warehouse'">
        <el-col :span="8">
          <el-select
            v-model="selectedCountry"
            placeholder="选择国家"
            filterable
            @change="onCountryChange('warehouse')"
            style="width: 100%"
          >
            <el-option
              v-for="country in countries"
              :key="country.code"
              :label="`${country.name} (${country.code})`"
              :value="country.code"
            />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-select
            v-model="selectedWarehouseCode"
            placeholder="选择仓库"
            filterable
            @change="loadCapacityData"
            style="width: 100%"
            :disabled="!selectedCountry"
          >
            <el-option
              v-for="wh in filteredWarehouses"
              :key="wh.warehouseCode"
              :label="`${wh.warehouseName} (${wh.warehouseCode})`"
              :value="wh.warehouseCode"
            />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-alert
            type="info"
            show-icon
            :closable="false"
            :title="selectedWarehouseName ? `查看：${selectedWarehouseName}` : '请选择仓库'"
          />
        </el-col>
      </el-row>

      <!-- 资源选择器（仅车队模式显示） -->
      <el-row :gutter="16" class="resource-selector" v-else>
        <el-col :span="8">
          <el-select
            v-model="selectedCountry"
            placeholder="选择国家"
            filterable
            @change="onCountryChange('trucking')"
            style="width: 100%"
          >
            <el-option
              v-for="country in countries"
              :key="country.code"
              :label="`${country.name} (${country.code})`"
              :value="country.code"
            />
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-select
            v-model="selectedTruckingCode"
            placeholder="选择车队"
            filterable
            @change="loadCapacityData"
            style="width: 100%"
            :disabled="!selectedCountry"
          >
            <el-option
              v-for="tc in filteredTruckingCompanies"
              :key="tc.truckingCompanyId"
              :label="`${tc.truckingCompanyName} (${tc.truckingCompanyId})`"
              :value="tc.truckingCompanyId"
            />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-alert
            type="info"
            show-icon
            :closable="false"
            :title="selectedTruckingName ? `查看：${selectedTruckingName}` : '请选择车队'"
          />
        </el-col>
      </el-row>

      <!-- 日历容器 -->
      <FullCalendar ref="calendarRef" :options="calendarOptions" />

      <!-- 图例 -->
      <div class="legend">
        <div class="legend-item">
          <span class="legend-color weekday"></span>
          <span class="legend-text">
            工作日：{{
              resourceType === 'warehouse' ? defaultWarehouseCapacity : defaultTruckingCapacity
            }}
          </span>
        </div>
        <div class="legend-item">
          <span class="legend-color weekend"></span>
          <span class="legend-text">周末：0</span>
        </div>
        <div class="legend-item">
          <span class="legend-color holiday"></span>
          <span class="legend-text">节假日</span>
        </div>
        <div class="legend-item">
          <span class="legend-color manual"></span>
          <span class="legend-text">手动设置</span>
        </div>
      </div>

      <!-- 统计信息 -->
      <el-row :gutter="16" class="statistics">
        <el-col :span="6">
          <el-statistic title="总天数" :value="totalDays" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="工作日" :value="weekdayCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="周末" :value="weekendCount" />
        </el-col>
        <el-col :span="6">
          <el-statistic
            :title="resourceType === 'warehouse' ? '平均卸柜能力' : '平均提柜能力'"
            :value="averageCapacity"
          />
        </el-col>
      </el-row>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="每日能力详情" width="600px">
      <el-descriptions :column="2" border v-if="selectedDay">
        <el-descriptions-item label="日期">
          {{ selectedDay.date }}
        </el-descriptions-item>
        <el-descriptions-item label="星期">
          {{ selectedDay.weekday }}
        </el-descriptions-item>
        <el-descriptions-item label="类型">
          <el-tag :type="getDayTypeTag(selectedDay.type)">{{ selectedDay.typeText }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="基础能力">
          {{ selectedDay.baseCapacity }}
        </el-descriptions-item>
        <el-descriptions-item label="倍率">
          {{ selectedDay.multiplier }}
        </el-descriptions-item>
        <el-descriptions-item label="最终能力">
          <strong>{{ selectedDay.finalCapacity }}</strong>
        </el-descriptions-item>
        <el-descriptions-item label="已占用">
          {{ selectedDay.occupied }}
        </el-descriptions-item>
        <el-descriptions-item label="剩余">
          <el-tag :type="selectedDay.remaining > 0 ? 'success' : 'danger'">
            {{ selectedDay.remaining }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="手动设置" :span="2" v-if="selectedDay.isManual">
          <el-alert
            type="info"
            show-icon
            :title="`手动设置值：${selectedDay.manualValue}，原因：${selectedDay.manualReason}`"
          />
        </el-descriptions-item>
      </el-descriptions>

      <!-- 手动设置表单 -->
      <el-divider content-position="left">手动设置</el-divider>
      <el-form :model="manualForm" label-width="100px">
        <el-form-item label="设置能力">
          <el-input-number v-model="manualForm.capacity" :min="0" :max="100" :step="1" />
        </el-form-item>
        <el-form-item label="原因">
          <el-input
            v-model="manualForm.reason"
            type="textarea"
            :rows="2"
            placeholder="如：春节假期、设备维护等"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveManualCapacity">保存设置</el-button>
          <el-button v-if="selectedDay?.isManual" type="warning" @click="resetToCalendarRule">
            恢复日历规则
          </el-button>
          <el-button @click="detailDialogVisible = false">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 手动设置对话框（批量） -->
    <ManualCapacitySetting
      v-model:visible="showManualSetting"
      :resource-type="resourceType"
      :warehouse-code="resourceType === 'warehouse' ? selectedWarehouseCode : undefined"
      :trucking-company-id="resourceType === 'trucking' ? selectedTruckingCode : undefined"
      @applied="loadCapacityData"
    />
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, ref, watch } from 'vue'
import ManualCapacitySetting from './ManualCapacitySetting.vue'

// 日历引用
const calendarRef = ref<any>(null)
const appStore = useAppStore()
const resolvedCountry = computed(() => appStore.scopedCountryCode || '')

// 数据状态
const capacityEvents = ref<any[]>([])
const selectedDay = ref<any>(null)
const detailDialogVisible = ref(false)
const showManualSetting = ref(false)
const manualForm = ref({
  capacity: 0,
  reason: '',
})

// 资源类型切换
const resourceType = ref<'warehouse' | 'trucking'>('warehouse')

// 国家和资源列表
const countries = ref<any[]>([])
const allWarehouses = ref<any[]>([]) // 所有仓库
const allTruckingCompanies = ref<any[]>([]) // 所有车队

// 选中的国家和资源
const selectedCountry = ref<string>('')
const selectedWarehouseCode = ref<string>('')
const selectedTruckingCode = ref<string>('')

// 计算属性：根据国家过滤后的资源列表
const filteredWarehouses = computed(() => {
  if (!selectedCountry.value) return allWarehouses.value
  return allWarehouses.value.filter((wh: any) => wh.country === selectedCountry.value)
})

const filteredTruckingCompanies = computed(() => {
  if (!selectedCountry.value) return allTruckingCompanies.value
  return allTruckingCompanies.value.filter((tc: any) => tc.country === selectedCountry.value)
})

// 计算选中的资源名称
const selectedWarehouseName = computed(() => {
  const wh = allWarehouses.value.find((w: any) => w.warehouseCode === selectedWarehouseCode.value)
  return wh ? `${wh.country}-${wh.warehouseName}` : ''
})

const selectedTruckingName = computed(() => {
  const tc = allTruckingCompanies.value.find(
    (t: any) => t.truckingCompanyId === selectedTruckingCode.value
  )
  return tc ? `${tc.country}-${tc.truckingCompanyName}` : ''
})

// 统计信息
const totalDays = computed(() => capacityEvents.value.length)
const weekdayCount = computed(
  () => capacityEvents.value.filter((d: any) => d.type === 'weekday').length
)
const weekendCount = computed(
  () => capacityEvents.value.filter((d: any) => d.type === 'weekend').length
)
const averageCapacity = computed(() => {
  if (capacityEvents.value.length === 0) return 0
  const sum = capacityEvents.value.reduce((acc: number, d: any) => acc + d.finalCapacity, 0)
  return Math.round(sum / capacityEvents.value.length)
})

// 默认能力（从配置读取）
const defaultWarehouseCapacity = ref(10) // 仓库卸柜能力
const defaultTruckingCapacity = ref(8) // 车队提柜能力

// 处理国家变化
const onCountryChange = (type: 'warehouse' | 'trucking') => {
  if (type === 'warehouse') {
    selectedWarehouseCode.value = ''
  } else {
    selectedTruckingCode.value = ''
  }
  loadCapacityData()
}

// 处理资源类型切换
const onResourceTypeChange = () => {
  // 切换资源类型时保留国家筛选值；未选国家即查看全部
  if (resourceType.value === 'warehouse') {
    selectedTruckingCode.value = ''
  } else {
    selectedWarehouseCode.value = ''
  }
  loadCapacityData()
}

// 加载资源列表
const loadResources = async () => {
  try {
    // 加载国家列表（从仓库和车队中提取）
    const countrySet = new Set<string>()

    // 使用 /resources/mapped 接口获取有映射关系的仓库和车队列表
    const params: any = {}
    if (resolvedCountry.value) {
      params.country = resolvedCountry.value
    }

    const response: any = await api.get('/scheduling/resources/mapped', { params })

    if (response.success) {
      const { warehouses, truckings } = response.data

      // 加载仓库列表（已映射的）
      allWarehouses.value = warehouses || []
      allWarehouses.value.forEach((wh: any) => {
        if (wh.country && !countrySet.has(wh.country)) {
          countrySet.add(wh.country)
        }
      })

      // 加载车队列表（已映射的）
      allTruckingCompanies.value = truckings || []
      allTruckingCompanies.value.forEach((tc: any) => {
        if (tc.country && !countrySet.has(tc.country)) {
          countrySet.add(tc.country)
        }
      })
    }

    // 构建国家列表（带名称）
    const countryNames: Record<string, string> = {
      US: '美国',
      CA: '加拿大',
      GB: '英国',
      DE: '德国',
      FR: '法国',
      JP: '日本',
      CN: '中国',
    }

    countries.value = Array.from(countrySet).map(code => ({
      code,
      name: countryNames[code] || code,
    }))

    // 有全局国家作用域时自动应用；无作用域则保持用户可选/可不选（不选=查看全部）
    if (resolvedCountry.value) {
      if (countries.value.some(c => c.code === resolvedCountry.value)) {
        selectedCountry.value = resolvedCountry.value
      } else {
        countries.value.push({
          code: resolvedCountry.value,
          name: countryNames[resolvedCountry.value] || resolvedCountry.value,
        })
        selectedCountry.value = resolvedCountry.value
      }
    }
  } catch (error: any) {
    console.error('加载资源列表失败:', error)
    // 不显示错误，使用空列表即可
  }
}

// 加载日历（使用 Vue 组件方式，无需手动初始化）
const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, interactionPlugin],
  locale: zhLocale,
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,dayGridWeek',
  },
  events: capacityEvents.value,
  dateClick: handleDateClick,
  eventClick: handleEventClick,
  height: 'auto',
  eventDisplay: 'block',
  eventContent: renderEventContent,
}))

// 渲染事件内容
const renderEventContent = (arg: any) => {
  const { event } = arg
  const { remaining, capacity } = event.extendedProps

  return {
    html: `
      <div style="text-align: center; font-size: 12px;">
        <div style="font-weight: bold;">${remaining}/${capacity}</div>
        <div style="font-size: 10px;">${event.title}</div>
      </div>
    `,
  }
}

// 加载能力数据
const loadCapacityData = async () => {
  try {
    const startDate = dayjs().format('YYYY-MM-DD')
    const endDate = dayjs().add(2, 'month').format('YYYY-MM-DD')

    // 根据资源类型和选中的资源构建查询参数
    const countryForQuery = resolvedCountry.value || selectedCountry.value || ''
    let params: any = { start: startDate, end: endDate }
    if (countryForQuery) {
      params.country = countryForQuery
    }

    if (resourceType.value === 'warehouse') {
      params.resourceType = 'warehouse'
      if (!selectedWarehouseCode.value) {
        // 没有选择具体仓库，不加载数据
        capacityEvents.value = []
        return
      }
      params.warehouseCode = selectedWarehouseCode.value
    } else {
      params.resourceType = 'trucking'
      if (!selectedTruckingCode.value) {
        // 没有选择具体车队，不加载数据
        capacityEvents.value = []
        return
      }
      params.truckingCompanyId = selectedTruckingCode.value
    }

    // 构建查询字符串
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&')

    const response = await api.get(`/scheduling/resources/capacity/range?${queryString}`)

    if (response.data.success) {
      capacityEvents.value = response.data.data.map((item: any) => ({
        id: item.id,
        title: getEventTitle(item),
        start: item.date,
        backgroundColor: getColorByCapacity(item),
        borderColor: getColorByCapacity(item),
        extendedProps: {
          ...item,
          remaining: item.remaining || item.capacity,
          capacity: item.capacity,
        },
      }))
    }
  } catch (error: any) {
    console.error('加载能力数据失败:', error)
    ElMessage.error('加载能力数据失败：' + error.message)
  }
}

// 获取事件标题
const getEventTitle = (item: any) => {
  const date = dayjs(item.date)
  const weekday = date.format('ddd')

  if (item.type === 'weekend') {
    return '休息日'
  } else if (item.type === 'holiday') {
    return item.holidayName || '节假日'
  } else if (item.isManual) {
    return '手动设置'
  } else {
    return weekday
  }
}

// 根据能力获取颜色
const getColorByCapacity = (item: any) => {
  if (item.type === 'weekend') {
    return '#f56c6c' // 红色 - 周末
  } else if (item.type === 'holiday') {
    return '#e6a23c' // 橙色 - 节假日
  } else if (item.isManual) {
    return '#409eff' // 蓝色 - 手动设置
  } else if (item.remaining === 0) {
    return '#909399' // 灰色 - 已满
  } else if (item.remaining < item.capacity * 0.3) {
    return '#e6a23c' // 橙色 - 紧张
  } else {
    return '#67c23a' // 绿色 - 充足
  }
}

// 处理日期点击
const handleDateClick = (info: any) => {
  const dateStr = info.dateStr
  const dayData = capacityEvents.value.find(e => e.start === dateStr)

  if (dayData) {
    showDayDetail(dayData.extendedProps)
  } else {
    // 如果没有数据，创建一个默认的
    const defaultDay = createDefaultDay(dateStr)
    showDayDetail(defaultDay)
  }
}

// 处理事件点击
const handleEventClick = (info: any) => {
  showDayDetail(info.event.extendedProps)
}

// 显示详情
const showDayDetail = (dayData: any) => {
  const date = dayjs(dayData.date)

  selectedDay.value = {
    ...dayData,
    date: dayData.date,
    weekday: date.format('dddd'),
    typeText: getTypeText(dayData.type),
    multiplier: dayData.multiplier || 1.0,
    isManual: dayData.isManual || false,
    manualValue: dayData.manualValue,
    manualReason: dayData.manualReason,
  }

  // 填充表单
  manualForm.value.capacity = dayData.finalCapacity || dayData.capacity || 0
  manualForm.value.reason = dayData.manualReason || ''

  detailDialogVisible.value = true
}

// 创建默认日期数据
const createDefaultDay = (dateStr: string) => {
  const date = dayjs(dateStr)
  const dayOfWeek = date.day()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  return {
    date: dateStr,
    type: isWeekend ? 'weekend' : 'weekday',
    baseCapacity: isWeekend
      ? 0
      : resourceType.value === 'warehouse'
        ? defaultWarehouseCapacity.value
        : defaultTruckingCapacity.value,
    finalCapacity: isWeekend
      ? 0
      : resourceType.value === 'warehouse'
        ? defaultWarehouseCapacity.value
        : defaultTruckingCapacity.value,
    occupied: 0,
    remaining: isWeekend
      ? 0
      : resourceType.value === 'warehouse'
        ? defaultWarehouseCapacity.value
        : defaultTruckingCapacity.value,
    multiplier: 1.0,
    isManual: false,
  }
}

// 获取类型文本
const getTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    weekday: '工作日',
    weekend: '周末',
    holiday: '节假日',
    manual: '手动设置',
  }
  return typeMap[type] || type
}

// 获取类型标签
const getDayTypeTag = (type: string) => {
  const tagMap: Record<string, string> = {
    weekday: 'success',
    weekend: 'danger',
    holiday: 'warning',
    manual: 'primary',
  }
  return tagMap[type] || 'info'
}

// 保存手动设置
const saveManualCapacity = async () => {
  if (!selectedDay.value) return

  try {
    // 根据资源类型添加对应的资源ID
    const params: any = {
      date: selectedDay.value.date,
      capacity: manualForm.value.capacity,
      reason: manualForm.value.reason,
    }

    if (resourceType.value === 'warehouse') {
      params.warehouseCode = selectedWarehouseCode.value
    } else {
      params.truckingCompanyId = selectedTruckingCode.value
    }

    await api.post('/scheduling/resources/capacity/manual', params)

    ElMessage.success('保存成功')
    detailDialogVisible.value = false
    loadCapacityData()
  } catch (error: any) {
    console.error('保存手动设置失败:', error)
    ElMessage.error('保存失败：' + error.message)
  }
}

// 恢复日历规则
const resetToCalendarRule = async () => {
  if (!selectedDay.value) return

  try {
    await ElMessageBox.confirm('确定要恢复日历规则吗？这将清除手动设置。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await api.delete(`/scheduling/resources/capacity/manual/${selectedDay.value.date}`)

    ElMessage.success('已恢复日历规则')
    detailDialogVisible.value = false
    loadCapacityData()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('恢复日历规则失败:', error)
      ElMessage.error('恢复失败：' + error.message)
    }
  }
}

// 生命周期
onMounted(() => {
  if (resolvedCountry.value) {
    selectedCountry.value = resolvedCountry.value
  }
  loadResources()
  loadCapacityData()
})

watch(
  () => resolvedCountry.value,
  () => {
    selectedCountry.value = resolvedCountry.value || ''
    selectedWarehouseCode.value = ''
    selectedTruckingCode.value = ''
    loadResources()
    loadCapacityData()
  }
)

// 导出方法供外部调用
defineExpose({
  refresh: loadCapacityData,
})
</script>

<style scoped lang="scss">
.calendar-capacity-view {
  .capacity-calendar-card {
    margin-bottom: 20px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  }

  // 资源选择器区域
  .resource-selector {
    margin-bottom: 16px;
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
  }

  .calendar-container {
    min-height: 500px;
    margin-bottom: 16px;
  }

  .legend {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    padding: 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;

      .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 2px;

        &.weekday {
          background: #67c23a;
        }

        &.weekend {
          background: #f56c6c;
        }

        &.holiday {
          background: #e6a23c;
        }

        &.manual {
          background: #409eff;
        }
      }

      .legend-text {
        font-size: 13px;
        color: var(--el-text-color-regular);
      }
    }
  }

  .statistics {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--el-border-color-light);
  }
}

// FullCalendar 样式覆盖
:deep(.fc) {
  font-family: inherit;

  .fc-toolbar {
    margin-bottom: 16px;
  }

  .fc-daygrid-day-frame {
    min-height: 80px;
  }

  .fc-event {
    border: none;
    border-radius: 4px;
    padding: 2px 4px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
  }

  .fc-day-today {
    background: var(--el-fill-color-light) !important;
  }

  .fc-col-header-cell {
    padding: 8px 0;
    font-weight: 600;
  }
}
</style>
