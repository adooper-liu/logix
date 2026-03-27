<template>
  <div class="scheduling-config-page">
    <div class="page-header">
      <h2>排产配置</h2>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>排产配置</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="config-content">
      <!-- 左侧导航菜单 - 只显示图标 -->
      <div class="config-sidebar">
        <el-menu :default-active="activeMenu" class="config-menu" @select="handleMenuSelect">
          <el-tooltip content="排产概览" placement="right">
            <el-menu-item index="overview">
              <el-icon><House /></el-icon>
            </el-menu-item>
          </el-tooltip>
          <el-tooltip content="仓库管理" placement="right">
            <el-menu-item index="warehouse">
              <el-icon><Box /></el-icon>
            </el-menu-item>
          </el-tooltip>
          <el-tooltip content="车队管理" placement="right">
            <el-menu-item index="trucking">
              <el-icon><Van /></el-icon>
            </el-menu-item>
          </el-tooltip>
          <el-tooltip content="堆场管理" placement="right">
            <el-menu-item index="yard">
              <el-icon><OfficeBuilding /></el-icon>
            </el-menu-item>
          </el-tooltip>
          <el-tooltip content="映射关系" placement="right">
            <el-menu-item index="mapping">
              <el-icon><Connection /></el-icon>
            </el-menu-item>
          </el-tooltip>
          <el-tooltip content="产能日历" placement="right">
            <el-menu-item index="capacity">
              <el-icon><Calendar /></el-icon>
            </el-menu-item>
          </el-tooltip>
          <el-tooltip content="开始排产" placement="right">
            <el-menu-item index="visual">
              <el-icon><Cpu /></el-icon>
            </el-menu-item>
          </el-tooltip>
        </el-menu>
      </div>

      <!-- 右侧内容区 -->
      <div class="config-main">
        <!-- 排产概览 -->
        <div v-if="activeMenu === 'overview'" class="config-section">
          <h3>排产概览</h3>
          <OverviewPanel :country="currentCountry" @navigate="handleNavigate" />
        </div>

        <!-- 仓库管理 -->
        <div v-if="activeMenu === 'warehouse'" class="config-section">
          <h3>仓库管理</h3>
          <WarehouseManagement :country="currentCountry" />
        </div>

        <!-- 车队管理 -->
        <div v-if="activeMenu === 'trucking'" class="config-section">
          <h3>车队管理</h3>
          <TruckingManagement :country="currentCountry" />
        </div>

        <!-- 堆场管理 -->
        <div v-if="activeMenu === 'yard'" class="config-section">
          <h3>堆场管理</h3>
          <YardManagement :country="currentCountry" />
        </div>

        <!-- 映射关系 -->
        <div v-if="activeMenu === 'mapping'" class="config-section">
          <h3>映射关系管理</h3>
          <MappingManagement :country="currentCountry" />
        </div>

        <!-- 产能日历 -->
        <div v-if="activeMenu === 'capacity'" class="config-section">
          <h3>产能日历配置</h3>
          <CalendarCapacityView ref="calendarRef" />
        </div>

        <!-- 排产执行 -->
        <div v-if="activeMenu === 'visual'" class="config-section">
          <h3>排产执行</h3>
          <SchedulingVisual
            :country="route.query.country as string"
            :initial-date-range="dateRangeFromQuery"
            :containers="route.query.containers as string"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/store/app'
import { Box, Calendar, Connection, Cpu, House, OfficeBuilding, Van } from '@element-plus/icons-vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CalendarCapacityView from './components/CalendarCapacityView.vue'
import SchedulingVisual from './SchedulingVisual.vue'

// 导入子组件
import MappingManagement from './components/MappingManagement.vue'
import OverviewPanel from './components/OverviewPanel.vue'
import TruckingManagement from './components/TruckingManagement.vue'
import WarehouseManagement from './components/WarehouseManagement.vue'
import YardManagement from './components/YardManagement.vue'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

// 状态
const activeMenu = ref('overview')
const calendarRef = ref<InstanceType<typeof CalendarCapacityView>>()

// 计算属性
const currentCountry = computed(() => appStore.scopedCountryCode || '')

// 从 URL 参数解析日期范围
const dateRangeFromQuery = computed<[Date, Date] | undefined>(() => {
  const startDate = route.query.startDate as string
  const endDate = route.query.endDate as string

  if (startDate && endDate) {
    return [new Date(startDate), new Date(endDate)]
  }
  return undefined
})

const breadcrumbs = computed(() => [
  { name: '首页', path: '/' },
  { name: '排产配置', path: '/scheduling-config' },
])

// 方法
const handleMenuSelect = (index: string) => {
  activeMenu.value = index
}

const handleNavigate = (target: string) => {
  activeMenu.value = target
}

// 监听路由参数变化，根据 tab 参数设置默认激活的菜单
watch(
  () => route.query.tab,
  tab => {
    if (tab && typeof tab === 'string') {
      activeMenu.value = tab
    }
  },
  { immediate: true }
)

onMounted(() => {
  // 初始化：检查是否有 tab 参数
  const tab = route.query.tab as string
  if (
    tab &&
    ['visual', 'capacity', 'overview', 'warehouse', 'trucking', 'yard', 'mapping'].includes(tab)
  ) {
    activeMenu.value = tab
  }
})
</script>

<style scoped>
.scheduling-config-page {
  padding: 12px;
  height: 100%;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-radius: 4px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.config-content {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.config-sidebar {
  width: 64px; /* ✅ 缩小菜单宽度，只显示图标 */
  flex-shrink: 0;
}

.config-menu {
  border-right: none;
  background: #fff;
  border-radius: 4px;
}

.config-menu .el-menu-item {
  justify-content: center; /* ✅ 图标居中 */
  padding-left: 50% !important; /* ✅ 让图标居中 */
}

.config-menu .el-icon {
  font-size: 20px; /* ✅ 图标稍大一些 */
}

.config-main {
  flex: 1;
  min-width: 0;
}

.config-section {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
}

.config-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.schedule-entry {
  max-width: 400px;
}
</style>
