<template>
  <el-card class="result-card">
    <template #header>
      <div class="card-header-optimized">
        <div class="header-left">
          <el-icon class="header-icon"><DataLine /></el-icon>
          <span class="header-title">排产结果</span>
          <el-tag v-if="total > 0" :type="getResultTagType()" size="small">
            {{ total }} 个货柜
          </el-tag>
        </div>
        <div class="header-right">
          <el-button type="primary" size="small" @click="$emit('export')" :disabled="disabled">
            <el-icon><Download /></el-icon> 导出
          </el-button>
          <el-button type="success" size="small" plain @click="$emit('view-gantt')" :disabled="disabled">
            <el-icon><View /></el-icon> 甘特图
          </el-button>
        </div>
      </div>
    </template>

    <template v-if="hasData">
      <!-- 统计徽章 -->
      <div class="result-stats-enhanced">
        <div class="stat-badge total">
          <div class="stat-badge-icon">
            <el-icon><Box /></el-icon>
          </div>
          <div class="stat-badge-content">
            <div class="stat-value">{{ total }}</div>
            <div class="stat-label">总计</div>
          </div>
        </div>
        
        <div class="stat-badge success">
          <div class="stat-badge-icon">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-badge-content">
            <div class="stat-value">{{ successCount }}</div>
            <div class="stat-label">成功</div>
          </div>
        </div>
        
        <div class="stat-badge failed">
          <div class="stat-badge-icon">
            <el-icon><CircleClose /></el-icon>
          </div>
          <div class="stat-badge-content">
            <div class="stat-value">{{ failedCount }}</div>
            <div class="stat-label">失败</div>
          </div>
        </div>
        
        <div class="stat-badge rate">
          <div class="stat-badge-content">
            <div class="stat-value">
              {{ total > 0 ? ((successCount / total) * 100).toFixed(1) : 0 }}%
            </div>
            <div class="stat-label">成功率</div>
          </div>
        </div>
      </div>

      <!-- TAB 表格 -->
      <div class="tabs-filter-section">
        <el-tabs v-model="activeTab" type="border-card">
          <el-tab-pane :label="`全部 ${total}`" name="all">
            <div class="tab-toolbar">
              <span class="tab-desc"><el-icon><Document /></el-icon> 所有排产结果</span>
              <el-input
                v-if="activeTab === 'all'"
                v-model="searchText"
                placeholder="搜索柜号..."
                prefix-icon="Search"
                size="small"
                clearable
                style="width: 200px"
              />
            </div>
            <slot name="all-table" :data="results"></slot>
          </el-tab-pane>

          <el-tab-pane :label="`成功 ${successCount}`" name="success">
            <div class="tab-toolbar">
              <span class="tab-desc success"><el-icon><CircleCheck /></el-icon> ✓ 排产成功的货柜</span>
              <el-input
                v-if="activeTab === 'success'"
                v-model="searchText"
                placeholder="搜索成功柜号..."
                prefix-icon="Search"
                size="small"
                clearable
                style="width: 200px"
              />
            </div>
            <slot name="success-table" :data="successResults"></slot>
          </el-tab-pane>

          <el-tab-pane :label="`失败 ${failedCount}`" name="failed">
            <div class="tab-toolbar">
              <span class="tab-desc danger"><el-icon><CircleClose /></el-icon> ✗ 排产失败的货柜</span>
              <el-input
                v-if="activeTab === 'failed'"
                v-model="searchText"
                placeholder="搜索失败原因..."
                prefix-icon="Search"
                size="small"
                clearable
                style="width: 200px"
              />
            </div>
            <slot name="failed-table" :data="failedResults"></slot>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>

    <template v-else>
      <el-empty :description="'暂无排产结果，请点击“预览排产”执行排产流程'" />
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Box,
  CircleCheck,
  CircleClose,
  DataLine,
  Document,
  Download,
  View,
} from '@element-plus/icons-vue'

interface ScheduleResult {
  containerNumber: string
  success: boolean
  message?: string
  [key: string]: any
}

const props = defineProps<{
  results: ScheduleResult[]
  disabled: boolean
}>()

const activeTab = ref('all')
const searchText = ref('')

const hasData = computed(() => props.results && props.results.length > 0)
const total = computed(() => props.results?.length || 0)
const successCount = computed(() => props.results?.filter(r => r.success).length || 0)
const failedCount = computed(() => props.results?.filter(r => !r.success).length || 0)

const successResults = computed(() => props.results?.filter(r => r.success) || [])
const failedResults = computed(() => props.results?.filter(r => !r.success) || [])

const getResultTagType = (): 'success' | 'warning' | 'danger' | 'info' => {
  if (total.value === 0) return 'info'
  const successRate = successCount.value / total.value
  if (successRate >= 0.9) return 'success'
  if (successRate >= 0.7) return 'warning'
  return 'danger'
}

defineEmits<{
  'export': []
  'view-gantt': []
}>()
</script>

<style lang="scss" scoped>
.result-card {
  margin-top: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.card-header-optimized {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 20px;
  color: #409eff;
  margin-right: 8px;
}

.header-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.header-right {
  display: flex;
  gap: 8px;
}

.result-stats-enhanced {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 8px;
  margin-bottom: 16px;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
}

.stat-badge-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-badge.total .stat-badge-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-badge.success .stat-badge-icon {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
}

.stat-badge.failed .stat-badge-icon {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
}

.stat-badge-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.tabs-filter-section {
  margin-top: 16px;
}

.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tab-desc {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;

  &.success {
    color: #67c23a;
  }

  &.danger {
    color: #f56c6c;
  }
}
</style>
