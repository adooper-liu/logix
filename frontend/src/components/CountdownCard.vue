<script setup lang="ts">
import { computed } from 'vue'
import { Timer, Warning, CircleCheck, InfoFilled } from '@element-plus/icons-vue'
import { useColors } from '@/composables/useColors'

// 使用颜色系统
const colors = useColors()

interface FilterItem {
  label: string
  count: number
  color: string
  days: string
  level?: number
  children?: FilterItem[]
}

interface CountdownData {
  count: number
  urgent: number
  expired: number
  filterItems?: FilterItem[]
}

interface Props {
  title: string
  data: CountdownData
  label?: string
  subtitle?: string
  description?: string  // 统计口径说明
}

const props = withDefaults(defineProps<Props>(), {
  label: '待处理货柜',
  subtitle: '',
  description: ''
})

const emit = defineEmits<{
  'filter': [filterType: string, days: string]
}>()

// 获取倒计时卡片样式 - 使用统一的颜色变量
const cardStyle = computed(() => {
  if (props.data.expired > 0) {
    return { type: 'danger' as const, icon: Warning, color: colors.danger }
  }
  if (props.data.urgent > 0) {
    return { type: 'warning' as const, icon: Timer, color: colors.warning }
  }
  return { type: 'success' as const, icon: CircleCheck, color: colors.success }
})

// 获取倒计时卡片状态文本
const statusText = computed(() => {
  if (props.data.expired > 0) return `${props.data.expired}个已超时`
  if (props.data.urgent > 0) return `${props.data.urgent}个即将到期`
  return '正常'
})

// 处理筛选项点击
const handleFilterClick = (days: string) => {
  emit('filter', props.title, days)
}

// 是否有过滤项
const hasFilterItems = computed(() => {
  return props.data.filterItems && props.data.filterItems.length > 0
})

// 计算汇总总数（所有 filterItems 的 count 之和，排除 children 避免重复计数）
const totalCount = computed(() => {
  if (!props.data.filterItems) return 0
  return props.data.filterItems
    .filter(item => item.level === 0)  // 只计算顶级项目
    .reduce((sum, item) => sum + item.count, 0)
})

// 是否有说明信息
const hasDescription = computed(() => {
  return props.description && props.description.length > 0
})
</script>

<template>
  <div class="countdown-card" :style="{ borderLeftColor: cardStyle.color }">
    <div class="card-header">
      <div class="header-left">
        <el-icon :color="cardStyle.color" :size="24">
          <component :is="cardStyle.icon" />
        </el-icon>
        <div class="title-wrapper">
          <div class="title-row">
            <span class="card-title">{{ title }}</span>
            <!-- 统计口径说明 tooltip -->
            <el-tooltip 
              v-if="hasDescription" 
              class="description-tooltip" 
              placement="top-start"
              :popper-style="{ maxWidth: '400px', padding: '12px' }"
            >
              <template #content>
                <div class="tooltip-content">
                  <div class="tooltip-title">
                    <el-icon><InfoFilled /></el-icon>
                    <span>统计口径</span>
                  </div>
                  <div class="tooltip-text" v-html="description"></div>
                </div>
              </template>
              <el-icon class="info-icon" :size="16"><InfoFilled /></el-icon>
            </el-tooltip>
          </div>
          <span v-if="subtitle" class="card-subtitle">{{ subtitle }}</span>
        </div>
      </div>
      <div v-if="hasFilterItems" class="card-summary">
        <span class="summary-label">合计</span>
        <span class="summary-count">{{ totalCount }}</span>
      </div>
    </div>

    <!-- 如果有过滤项，显示标签形式的过滤项（支持树形结构） -->
    <div v-if="hasFilterItems" class="filter-items">
      <template v-for="(item, index) in data.filterItems" :key="index">
        <!-- 父级项目 -->
        <div
          class="filter-tag parent-tag"
          :class="{ 'clickable': item.count > 0 }"
          :style="{
            backgroundColor: item.count > 0 ? item.color + '15' : '#f5f7fa',
            borderColor: item.count > 0 ? item.color : '#dcdfe6',
            color: item.count > 0 ? item.color : '#909399'
          }"
          @click="item.count > 0 && handleFilterClick(item.days)"
        >
          <span class="tag-label">{{ item.label }}</span>
          <span class="tag-count">{{ item.count }}</span>
        </div>
        <!-- 子级项目 -->
        <div
          v-if="item.children && item.children.length > 0"
          class="children-container"
        >
          <div
            v-for="(child, childIndex) in item.children"
            :key="`${index}-${childIndex}`"
            class="filter-tag child-tag"
            :class="{ 'clickable': child.count > 0 }"
            :style="{
              backgroundColor: child.count > 0 ? child.color + '10' : '#fafafa',
              borderColor: child.count > 0 ? child.color : '#e0e0e0',
              color: child.count > 0 ? child.color : '#b0b0b0',
              marginLeft: '12px'
            }"
            @click="child.count > 0 && handleFilterClick(child.days)"
          >
            <span class="tag-label">{{ child.label }}</span>
            <span class="tag-count">{{ child.count }}</span>
          </div>
        </div>
      </template>
    </div>

    <!-- 否则显示原有的单卡片样式 -->
    <div v-else class="card-content">
      <div class="card-value">{{ data.count }}</div>
      <div class="card-label">{{ label }}</div>
    </div>

    <div v-if="!hasFilterItems" class="card-footer">
      <el-tag
        :type="cardStyle.type"
        size="small"
      >
        {{ statusText }}
      </el-tag>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.countdown-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  border-left: 3px solid;
  transition: all 0.3s ease;
  min-height: auto;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;

      .title-wrapper {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .title-row {
          display: flex;
          align-items: center;
          gap: 6px;

          .card-title {
            font-size: 15px;
            font-weight: 600;
            color: #303133;
          }

          .info-icon {
            cursor: help;
            color: #909399;
            transition: color 0.2s;

            &:hover {
              color: #409eff;
            }
          }
        }

        .card-subtitle {
          font-size: 12px;
          color: #909399;
        }
      }
    }

    .card-summary {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;

      .summary-label {
        font-size: 11px;
        color: #909399;
      }

      .summary-count {
        font-size: 18px;
        font-weight: 700;
        color: #303133;
      }
    }
  }

  .filter-items {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .children-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .filter-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      border: 1px solid;
      transition: all 0.2s;
      cursor: default;

      &.parent-tag {
        width: 100%;
        justify-content: space-between;
        font-weight: 600;
        font-size: 13px;
      }

      &.child-tag {
        flex: 0 0 auto;
        min-width: 100px;
        justify-content: space-between;
        font-weight: 500;
        font-size: 12px;

        &:before {
          content: '├';
          margin-right: 4px;
          color: inherit;
          opacity: 0.6;
        }

        &:last-child {
          &:before {
            content: '└';
          }
        }
      }

      &.clickable {
        cursor: pointer;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        &:active {
          transform: translateY(0);
        }
      }

      .tag-label {
        font-weight: 500;
      }

      .tag-count {
        font-weight: 700;
      }
    }
  }

  .card-content {
    text-align: center;
    padding: 8px 0;

    .card-value {
      font-size: 32px;
      font-weight: 700;
      color: v-bind('cardStyle.color');
      line-height: 1;
    }

    .card-label {
      margin-top: 6px;
      font-size: 13px;
      color: #909399;
    }
  }

  .card-footer {
    margin-top: 8px;
    text-align: center;
  }
}

// Tooltip 样式
.description-tooltip {
  display: inline-block;
}

.tooltip-content {
  max-width: 380px;
  background: #303133;  // 深色背景
  padding: 12px;
  border-radius: 6px;
  
  .tooltip-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    
    .el-icon {
      color: #409eff;
      font-size: 16px;
    }
    
    span {
      font-weight: 600;
      color: #fff;  // 白色字体
      font-size: 14px;
    }
  }
  
  .tooltip-text {
    font-size: 13px;
    line-height: 1.6;
    color: #e0e0e0;  // 浅灰色字体，提升可读性
    
    :deep(strong) {
      color: #fff;  // 白色加粗
      font-weight: 600;
    }
    
    :deep(.highlight) {
      color: #e6a23c;  // 保持橙色高亮
      font-weight: 600;
    }
    
    :deep(ul) {
      margin: 6px 0 0 16px;
      padding: 0;
      
      li {
        margin: 4px 0;
      }
    }
  }
}
</style>
