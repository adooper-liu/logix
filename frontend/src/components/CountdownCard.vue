<script setup lang="ts">
import { useColors } from '@/composables/useColors'
import { CircleCheck, InfoFilled, Timer, Warning } from '@element-plus/icons-vue'
import { computed } from 'vue'

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
  description?: string // 统计口径说明
  /** 树形展示：true = 三分组并列一行（按到港），'column' = 单列树形（按状态） */
  treeLayout?: boolean | 'column'
}

const props = withDefaults(defineProps<Props>(), {
  label: '待处理货柜',
  subtitle: '',
  description: '',
  treeLayout: false,
})

const emit = defineEmits<{
  filter: [filterType: string, days: string]
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
    .filter(item => item.level === 0) // 只计算顶级项目
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

    <!-- 如果有过滤项：treeLayout 为 column=按状态多组，true=按到港三分组，否则平铺标签；全部按分组展示，无树线 -->
    <div
      v-if="hasFilterItems"
      class="filter-items"
      :class="{ 'tree-layout': treeLayout === true, 'tree-layout-column': treeLayout === 'column' }"
    >
      <template v-for="(item, index) in data.filterItems" :key="index">
        <!-- 按状态：多组并列，每组父级+子项，均用 Badge 展示 -->
        <div v-if="treeLayout === 'column'" class="tree-block">
          <el-badge
            :value="item.count"
            :max="99999"
            :hidden="item.count === 0"
            :color="item.count > 0 ? item.color : '#909399'"
            :offset="[10, -6]"
            class="countdown-badge"
          >
            <span
              class="filter-tag parent-tag badge-trigger"
              :class="{ clickable: item.count > 0 }"
              :style="{
                backgroundColor: item.count > 0 ? item.color + '15' : '#f5f7fa',
                borderColor: item.count > 0 ? item.color : '#dcdfe6',
                color: item.count > 0 ? item.color : '#909399',
              }"
              @click="item.count > 0 && handleFilterClick(item.days)"
              >{{ item.label }}</span
            >
          </el-badge>
          <div v-if="item.children?.length" class="children-container">
            <el-badge
              v-for="(child, childIndex) in item.children"
              :key="`${index}-${childIndex}`"
              :value="child.count"
              :max="99999"
              :hidden="child.count === 0"
              :color="child.count > 0 ? child.color : '#b0b0b0'"
              :offset="[10, -6]"
              class="countdown-badge"
            >
              <span
                class="filter-tag child-tag badge-trigger"
                :class="{ clickable: child.count > 0 }"
                :style="{
                  backgroundColor: child.count > 0 ? child.color + '10' : '#fafafa',
                  borderColor: child.count > 0 ? child.color : '#e0e0e0',
                  color: child.count > 0 ? child.color : '#b0b0b0',
                }"
                @click="child.count > 0 && handleFilterClick(child.days)"
                >{{ child.label }}</span
              >
            </el-badge>
          </div>
        </div>
        <!-- 按到港：三分组并列，每组父级+子项，均用 Badge 展示 -->
        <div v-else-if="treeLayout === true" class="tree-col">
          <el-badge
            :value="item.count"
            :max="99999"
            :hidden="item.count === 0"
            :color="item.count > 0 ? item.color : '#909399'"
            :offset="[10, -6]"
            class="countdown-badge"
          >
            <span
              class="filter-tag parent-tag badge-trigger"
              :class="{ clickable: item.count > 0 }"
              :style="{
                backgroundColor: item.count > 0 ? item.color + '15' : '#f5f7fa',
                borderColor: item.count > 0 ? item.color : '#dcdfe6',
                color: item.count > 0 ? item.color : '#909399',
              }"
              @click="item.count > 0 && handleFilterClick(item.days)"
              >{{ item.label }}</span
            >
          </el-badge>
          <div v-if="item.children?.length" class="children-container">
            <el-badge
              v-for="(child, childIndex) in item.children"
              :key="`${index}-${childIndex}`"
              :value="child.count"
              :max="99999"
              :hidden="child.count === 0"
              :color="child.count > 0 ? child.color : '#b0b0b0'"
              :offset="[10, -6]"
              class="countdown-badge"
            >
              <span
                class="filter-tag child-tag badge-trigger"
                :class="{ clickable: child.count > 0 }"
                :style="{
                  backgroundColor: child.count > 0 ? child.color + '10' : '#fafafa',
                  borderColor: child.count > 0 ? child.color : '#e0e0e0',
                  color: child.count > 0 ? child.color : '#b0b0b0',
                }"
                @click="child.count > 0 && handleFilterClick(child.days)"
                >{{ child.label }}</span
              >
            </el-badge>
          </div>
        </div>
        <!-- 平铺：均用 Badge 展示 -->
        <template v-else>
          <el-badge
            :value="item.count"
            :max="99999"
            :hidden="item.count === 0"
            :color="item.count > 0 ? item.color : '#909399'"
            :offset="[10, -6]"
            class="countdown-badge"
          >
            <span
              class="filter-tag parent-tag badge-trigger"
              :class="{ clickable: item.count > 0 }"
              :style="{
                backgroundColor: item.count > 0 ? item.color + '15' : '#f5f7fa',
                borderColor: item.count > 0 ? item.color : '#dcdfe6',
                color: item.count > 0 ? item.color : '#909399',
              }"
              @click="item.count > 0 && handleFilterClick(item.days)"
              >{{ item.label }}</span
            >
          </el-badge>
          <div v-if="item.children && item.children.length > 0" class="children-container">
            <el-badge
              v-for="(child, childIndex) in item.children"
              :key="`${index}-${childIndex}`"
              :value="child.count"
              :max="99999"
              :hidden="child.count === 0"
              :color="child.count > 0 ? child.color : '#b0b0b0'"
              :offset="[10, -6]"
              class="countdown-badge"
            >
              <span
                class="filter-tag child-tag badge-trigger"
                :class="{ clickable: child.count > 0 }"
                :style="{
                  backgroundColor: child.count > 0 ? child.color + '10' : '#fafafa',
                  borderColor: child.count > 0 ? child.color : '#e0e0e0',
                  color: child.count > 0 ? child.color : '#b0b0b0',
                  marginLeft: '12px',
                }"
                @click="child.count > 0 && handleFilterClick(child.days)"
                >{{ child.label }}</span
              >
            </el-badge>
          </div>
        </template>
      </template>
    </div>

    <!-- 否则显示原有的单卡片样式 -->
    <div v-else class="card-content">
      <div class="card-value">{{ data.count }}</div>
      <div class="card-label">{{ label }}</div>
    </div>

    <div v-if="!hasFilterItems" class="card-footer">
      <el-tag :type="cardStyle.type" size="small">
        {{ statusText }}
      </el-tag>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

/* 最小标签布局：极简紧凑 */
.countdown-card {
  background: #fff;
  border-radius: 4px;
  padding: 5px 8px;
  border-left: 3px solid;
  transition: all 0.2s ease;
  min-height: auto;

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    margin-bottom: 4px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;

      .title-wrapper {
        display: flex;
        flex-direction: column;
        gap: 0;

        .title-row {
          display: flex;
          align-items: center;
          gap: 3px;

          .card-title {
            font-size: 12px;
            font-weight: 600;
            color: #303133;
          }

          .info-icon {
            cursor: help;
            color: #909399;
            font-size: 12px;
            transition: color 0.2s;

            &:hover {
              color: #409eff;
            }
          }
        }

        .card-subtitle {
          font-size: 10px;
          color: #909399;
        }
      }
    }

    .card-summary {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0;

      .summary-label {
        font-size: 9px;
        color: #909399;
      }

      .summary-count {
        font-size: 14px;
        font-weight: 700;
        color: #303133;
      }
    }
  }

  .filter-items {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;

    /* 按分组布局：按到港三分组并列 */
    &.tree-layout {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      flex-wrap: nowrap;
      align-items: start;
    }

    /* 按状态：flex 换行，每项占自身宽度，避免重叠 */
    &.tree-layout-column {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-start;
    }

    .tree-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 0 0 auto;
    }

    /* 按状态：标签宽度随内容变化 */
    &.tree-layout-column .tree-block {
      .filter-tag.parent-tag {
        width: fit-content;
        flex: 0 0 auto;
        padding: 2px 5px;
        font-size: 11px;
        font-weight: 600;
      }

      /* 子标签横向排列、自动换行，相对主分组缩进 */
      .children-container {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        width: fit-content;
        max-width: 100%;
        padding-left: 10px;
      }

      .filter-tag.child-tag {
        width: fit-content;
        flex: 0 0 auto;
        padding: 2px 4px;
        font-size: 10px;
        min-width: 0;

        .tag-label {
          flex: 0 1 auto;
          min-width: 0;
        }
      }
    }

    .tree-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    &.tree-layout .tree-col {
      .filter-tag.parent-tag {
        width: 100%;
        flex: 0 0 auto;
        padding: 2px 5px;
        font-size: 11px;
        font-weight: 600;
      }

      /* 子标签横向排列、自动换行，相对主分组缩进 */
      .children-container {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        width: 100%;
        padding-left: 10px;
      }

      .filter-tag.child-tag {
        width: fit-content;
        flex: 0 0 auto;
        padding: 2px 4px;
        font-size: 10px;
        min-width: 0;

        .tag-label {
          flex: 0 1 auto;
          min-width: 0;
        }
      }
    }

    .children-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    :deep(.countdown-badge) {
      display: inline-block;
      margin-right: 10px;
      margin-bottom: 8px;

      .el-badge__content {
        font-size: 10px;
        line-height: 1.2;
        height: auto;
        min-height: 14px;
        min-width: 14px;
        padding: 0 4px;
        white-space: nowrap;
      }
    }

    .filter-tag.badge-trigger {
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
    }

    .filter-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 10px;
      border: none;
      transition: all 0.2s;
      cursor: default;

      &.parent-tag {
        flex: 0 0 auto;
        justify-content: space-between;
        font-weight: 600;
        font-size: 10px;
      }

      &.child-tag {
        flex: 0 0 auto;
        min-width: 0;
        justify-content: space-between;
        font-weight: 500;
        font-size: 10px;

        &:before {
          content: '';
          display: none;
        }
      }

      &.clickable {
        cursor: pointer;

        &:hover {
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        }

        &:active {
          transform: scale(0.98);
        }
      }

      .tag-label {
        font-weight: 500;
        white-space: nowrap;
      }

      .tag-count {
        font-weight: 700;
        flex-shrink: 0;
      }
    }
  }

  .card-content {
    text-align: center;
    padding: 2px 0;

    .card-value {
      font-size: 20px;
      font-weight: 700;
      color: v-bind('cardStyle.color');
      line-height: 1;
    }

    .card-label {
      margin-top: 2px;
      font-size: 11px;
      color: #909399;
    }
  }

  .card-footer {
    margin-top: 2px;
    text-align: center;
  }
}

// Tooltip 样式
.description-tooltip {
  display: inline-block;
}

.tooltip-content {
  max-width: 380px;
  background: #303133; // 深色背景
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
      color: #fff; // 白色字体
      font-size: 14px;
    }
  }

  .tooltip-text {
    font-size: 13px;
    line-height: 1.6;
    color: #e0e0e0; // 浅灰色字体，提升可读性

    :deep(strong) {
      color: #fff; // 白色加粗
      font-weight: 600;
    }

    :deep(.highlight) {
      color: #e6a23c; // 保持橙色高亮
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
