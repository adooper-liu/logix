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
      <!-- 左侧导航菜单 -->
      <div class="config-sidebar">
        <el-menu
          :default-active="activeMenu"
          class="config-menu"
          @select="handleMenuSelect"
        >
          <el-menu-item index="overview">
            <el-icon><House /></el-icon>
            <span>排产概览</span>
          </el-menu-item>
          <el-menu-item index="warehouse">
            <el-icon><Box /></el-icon>
            <span>仓库管理</span>
          </el-menu-item>
          <el-menu-item index="trucking">
            <el-icon><Van /></el-icon>
            <span>车队管理</span>
          </el-menu-item>
          <el-menu-item index="yard">
            <el-icon><OfficeBuilding /></el-icon>
            <span>堆场管理</span>
          </el-menu-item>
          <el-menu-item index="mapping">
            <el-icon><Connection /></el-icon>
            <span>映射关系</span>
          </el-menu-item>
          <el-menu-item index="capacity">
            <el-icon><Calendar /></el-icon>
            <span>产能日历</span>
          </el-menu-item>
          <el-divider />
          <el-menu-item index="schedule">
            <el-icon><Cpu /></el-icon>
            <span>开始排产</span>
          </el-menu-item>
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

        <!-- 开始排产 -->
        <div v-if="activeMenu === 'schedule'" class="config-section">
          <h3>智能排产</h3>
          <div class="schedule-entry">
            <el-card>
              <template #header>
                <span>开始智能排产</span>
              </template>
              <p>点击下方按钮跳转到排产页面开始智能排产</p>
              <el-button type="primary" @click="goToScheduling">
                <el-icon><Cpu /></el-icon>
                进入排产页面
              </el-button>
            </el-card>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { House, Box, Van, OfficeBuilding, Connection, Calendar, Cpu } from '@element-plus/icons-vue'
import { useAppStore } from '@/store/app'
import CalendarCapacityView from './components/CalendarCapacityView.vue'

// 导入子组件
import OverviewPanel from './components/OverviewPanel.vue'
import WarehouseManagement from './components/WarehouseManagement.vue'
import TruckingManagement from './components/TruckingManagement.vue'
import YardManagement from './components/YardManagement.vue'
import MappingManagement from './components/MappingManagement.vue'

const router = useRouter()
const appStore = useAppStore()

// 状态
const activeMenu = ref('overview')
const calendarRef = ref<InstanceType<typeof CalendarCapacityView>>()

// 计算属性
const currentCountry = computed(() => appStore.scopedCountryCode || '')

const breadcrumbs = computed(() => [
  { name: '首页', path: '/' },
  { name: '排产配置', path: '/scheduling-config' }
])

// 方法
const handleMenuSelect = (index: string) => {
  activeMenu.value = index
}

const handleNavigate = (target: string) => {
  activeMenu.value = target
}

const goToScheduling = () => {
  router.push('/scheduling')
}

onMounted(() => {
  // 初始化
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
  width: 200px;
  flex-shrink: 0;
}

.config-menu {
  border-right: none;
  background: #fff;
  border-radius: 4px;
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
