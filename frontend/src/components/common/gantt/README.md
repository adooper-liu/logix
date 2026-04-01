# 简单甘特图组件重构说明

## 📁 组件结构

### 核心组件树

```
SimpleGanttChartRefactored.vue (主组件)
├── GanttHeader.vue (顶部信息栏)
├── GanttStatisticsPanel.vue (统计面板 - 新增)
├── GanttSearchBar.vue (搜索栏 - 新增)
├── DateRangeSelector.vue (日期范围选择器)
├── GanttTimelineHeader.vue (时间轴头部)
├── GanttPortGroup.vue (港口分组行)
│   └── (多个日期单元格和货柜圆点)
├── GanttLegend.vue (图例)
├── ContainerDetailSidebar.vue (详情侧边栏)
├── ContainerContextMenu.vue (右键菜单)
├── ContainerDateEditDialog.vue (日期编辑对话框)
└── Tooltip (内联实现)
```

### Composable

- **useGanttLogic.ts** - 甘特图核心逻辑抽离

## 🎯 重构优势

### 1. **单一职责原则**

每个子组件只负责一个功能模块，易于理解和维护。

### 2. **可复用性**

- `GanttHeader` 可用于其他图表页面
- `DateRangeSelector` 可用于其他需要日期范围选择的场景
- `GanttStatisticsPanel` 可用于数据展示页面

### 3. **可测试性**

每个组件可以独立进行单元测试。

### 4. **性能优化**

- 小组件更容易实现 `memoization`
- 减少不必要的重新渲染

### 5. **代码可读性**

清晰的组件命名和职责划分，新成员快速上手。

## 📦 新增增强功能

### 1. 统计面板 (GanttStatisticsPanel.vue)

- **总货柜数**: 实时显示当前筛选的货柜总数
- **已到港**: 高亮显示已到港货柜数量
- **即将超期**: 智能识别 3 天内需提柜的货柜
- **已还箱**: 显示已完成还箱的货柜数量

### 2. 搜索栏 (GanttSearchBar.vue)

- **多维度搜索**: 支持柜号、提单号、目的港、船名航次
- **快速筛选**:
  - 即将超期 (3 天)
  - 已超期
  - 已到港

## 🔧 使用方法

### 替换现有甘特图

1. **备份原文件**

```bash
cp SimpleGanttChart.vue SimpleGanttChart.vue.backup
```

2. **替换组件**
   将 `SimpleGanttChart.vue` 重命名为 `SimpleGanttChartOld.vue`,然后将 `SimpleGanttChartRefactored.vue` 重命名为 `SimpleGanttChart.vue`

3. **更新路由引用** (如果需要)

```typescript
// router/index.ts
import SimpleGanttChart from '@/components/common/SimpleGanttChart.vue'
```

### 单独使用子组件

```vue
<template>
  <!-- 统计面板 -->
  <GanttStatisticsPanel :containers="myContainers" />

  <!-- 搜索栏 -->
  <GanttSearchBar @search="handleSearch" @filterChange="handleFilterChange" />

  <!-- 日期范围选择器 -->
  <DateRangeSelector v-model="rangeType" :display-range="displayRange" @change="onRangeChange" />
</template>

<script setup lang="ts">
import { GanttStatisticsPanel, GanttSearchBar, DateRangeSelector } from '@/components/common/gantt'
</script>
```

## 📊 数据流

### Props Down, Events Up

```
父组件 (SimpleGanttChartRefactored)
  │
  ├─ props ↓
  │  - containers
  │  - dates
  │  - statusColors
  │  ...
  │
 子组件 (GanttPortGroup, etc.)
  │
  ├─ events ↑
  │  - @clickDot
  │  - @showTooltip
  │  - @dragStart
  │  ...
  │
 父组件处理事件
```

### Composable 状态管理

```typescript
const {
  // 数据
  containers,
  filteredContainers,
  groupedByPort,

  // 方法
  loadData,
  handleDotClick,
  exportData,
} = useGanttLogic()
```

## 🎨 样式管理

### Scoped CSS

每个组件使用 `scoped` CSS，避免样式冲突。

### 共享样式变量

```scss
// assets/styles/variables.scss
$primary-color: #409eff;
$success-color: #67c23a;
$warning-color: #e6a23c;
$danger-color: #f56c6c;
```

## 🧪 测试建议

### 单元测试

```typescript
// GanttStatisticsPanel.spec.ts
import { mount } from '@vue/test-utils'
import GanttStatisticsPanel from './GanttStatisticsPanel.vue'

describe('GanttStatisticsPanel', () => {
  it('显示正确的货柜总数', () => {
    const mockContainers = [
      /* ... */
    ]
    const wrapper = mount(GanttStatisticsPanel, {
      props: { containers: mockContainers },
    })

    expect(wrapper.text()).toContain('总货柜数')
  })
})
```

### 集成测试

测试整个甘特图的交互流程:

1. 加载数据
2. 筛选状态
3. 点击货柜圆点
4. 拖拽调整日期
5. 导出数据

## 🚀 性能优化建议

### 1. 虚拟滚动

当日期范围超过 60 天时，考虑实现虚拟滚动。

### 2. 缓存计算属性

```typescript
const groupedByPort = computed(() => {
  // 昂贵的计算逻辑
})
```

### 3. 防抖搜索

```typescript
const debouncedSearch = debounce((keyword: string) => {
  // 执行搜索
}, 300)
```

### 4. 懒加载组件

```typescript
const ContainerDetailSidebar = defineAsyncComponent(() => import('./ContainerDetailSidebar.vue'))
```

## 📝 后续增强计划

### P0 - 核心功能

- [ ] 实现搜索功能
- [ ] 实现快速筛选
- [ ] 完善错误处理

### P1 - 用户体验

- [ ] 快捷键支持
- [ ] 批量操作
- [ ] 自动刷新

### P2 - 高级功能

- [ ] 热力图模式
- [ ] 趋势图表
- [ ] 预警通知

## 🐛 已知问题

1. **Tooltip 位置**: 在滚动时可能位置偏移，需要动态计算
2. **拖拽体验**: 大数据量下拖拽性能有待优化
3. **移动端适配**: 暂不支持移动端，后续优化

## 📚 相关文档

- [甘特图显示逻辑](../../../public/docs/06-statistics/03-甘特图显示逻辑.md)
- [甘特图日期取值逻辑](../../../public/docs/06-statistics/05-甘特图日期取值逻辑.md)
- [物流状态机文档](../../../public/docs/05-state-machine/01-物流状态机完整文档.md)

## 👥 贡献指南

欢迎提交 Issue 和 Pull Request!

---

**最后更新时间**: 2026-03-12
**版本**: v2.0.0-refactored
