# ECharts 图表溢出问题修复报告

## 问题描述

**错误信息**：

```
SchedulingVisual.vue:1783 [ECharts] Can't get DOM width or height.
Please check dom.clientWidth and dom.clientHeight. They should not be 0.
```

**现象**：

- 成本趋势图表溢出容器
- 图表高度与容器高度不匹配
- 图表显示不完整

---

## 问题根源

### 高度冲突

**CostTrendChart.vue**（子组件）：

```vue
<v-chart
  :style="{ height: '400px', width: '100%' }"  /* ❌ 固定高度 400px */
/>

<style>
.cost-trend-chart {
  padding: 20px;  /* ❌ 有 padding，影响实际可用空间 */
}
</style>
```

**OptimizationResultCard.vue**（父容器）：

```scss
.trend-chart-container {
  height: 240px; /* ❌ 固定高度 240px */
  padding: 8px;
}
```

**问题**：

1. 子组件设置 `height: 400px`
2. 父容器设置 `height: 240px`
3. 高度冲突导致图表溢出

---

## 修复方案

### 核心思路

**让图表高度自适应父容器**，而不是设置固定高度。

---

## 具体修改

### 修改 1: CostTrendChart.vue - 移除固定高度

**文件位置**: `frontend/src/views/scheduling/components/CostTrendChart.vue`

**修改内容**:

```vue
<!-- ✅ 修复前 -->
<v-chart
  :style="{ height: '400px', width: '100%' }"
/>

<style>
.cost-trend-chart {
  padding: 20px;
}
</style>

<!-- ✅ 修复后 -->
<v-chart
  :style="{ height: '100%', width: '100%' }"  /* ✅ 使用 100% 高度 */
/>

<style>
.cost-trend-chart {
  width: 100%;
  height: 100%;  /* ✅ 自适应父容器 */
  padding: 0;    /* ✅ 移除 padding，让图表占满容器 */
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
```

**说明**：

- 图表高度改为 `100%`，由父容器决定实际高度
- 移除 `padding: 20px`，让图表充分利用容器空间
- 使用 CSS 注释 `/* */` 而不是 `//`（SCSS 不支持）

---

### 修改 2: OptimizationResultCard.vue - 增加容器高度

**文件位置**: `frontend/src/views/scheduling/components/OptimizationResultCard.vue`

**修改内容**:

```scss
// ✅ 修复前
.detail-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  .detail-left {
    /* 没有最小高度限制 */
  }

  .trend-chart-container {
    height: 240px; /* ❌ 固定高度 */
    padding: 8px;
  }
}

// ✅ 修复后
.detail-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  .detail-left {
    min-height: 240px; /* ✅ 确保最小高度 */
  }

  .trend-chart-container {
    height: 100%; /* ✅ 使用 100% 高度，填满父容器 */
    min-height: 240px; /* ✅ 确保最小高度 */
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 8px;
    background: #fff;
    position: relative;
    box-sizing: border-box; /* ✅ 确保 padding 不增加总高度 */

    :deep(.vue-echarts) {
      height: 100%;
      width: 100%;
    }
  }
}
```

**说明**：

- 容器高度改为 `100%`，相对于父元素 `.detail-section`
- 添加 `min-height: 240px` 确保最小可用高度
- 添加 `box-sizing: border-box` 确保 padding 不增加总高度
- 使用 CSS 注释 `/* */` 而不是 `//`

---

## 修复原理

### 高度继承链

```
OptimizationResultCard (根容器)
  └─ .detail-section (grid 布局)
      ├─ .detail-left (表格)
      │   └─ min-height: 240px
      │
      └─ .detail-right (图表容器)
          └─ height: 100%, min-height: 240px
              └─ .trend-chart-container
                  └─ height: 100%
                      └─ CostTrendChart (图表组件)
                          └─ height: 100%
                              └─ v-chart (ECharts)
                                  └─ autoresize (自动适应)
```

### 关键点

1. **使用百分比高度**：所有容器都使用 `height: 100%`
2. **设置最小高度**：使用 `min-height: 240px` 确保可用空间
3. **移除固定高度**：不再设置 `height: 400px` 这样的固定值
4. **box-sizing**：使用 `border-box` 确保 padding 不增加总高度
5. **autoresize**：ECharts 的 `autoresize` 特性会自动适应容器

---

## 修复效果

### 修复前

```
┌─────────────────────────────────┐
│  成本趋势分析                    │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │  图表 (400px)             │  │
│  │  ┌─────────────────────┐  │  │
│  │  │  容器 (240px)       │  │  │
│  │  │  ❌ 图表溢出         │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 修复后

```
┌─────────────────────────────────┐
│  成本趋势分析                    │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │  容器 (min-height: 240px) │  │
│  │  ┌─────────────────────┐  │  │
│  │  │  图表 (100%)        │  │  │
│  │  │  ✅ 完美适应         │  │  │
│  │  └─────────────────────┘  │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

## 技术细节

### SCSS 注释规范

**错误写法**：

```scss
.height {
  height: 100%; // ❌ SCSS 不支持 // 注释
}
```

**正确写法**：

```scss
.height {
  height: 100%; /* ✅ 使用 CSS 注释 */
}
```

### 百分比高度要求

使用百分比高度时，**所有父元素都必须有明确的高度**：

```scss
// ✅ 正确：所有父元素都有高度
.parent {
  height: 500px;

  .child {
    height: 100%; // 相对于 parent 的 500px

    .grandchild {
      height: 100%; // 相对于 child 的 500px
    }
  }
}

// ❌ 错误：父元素没有高度
.parent {
  /* 没有高度 */

  .child {
    height: 100%; // 无效！不知道相对于谁
  }
}
```

### box-sizing 的作用

```scss
// ❌ 不使用 box-sizing
.container {
  height: 240px;
  padding: 8px;
  /* 实际高度 = 240 + 8*2 = 256px */
}

// ✅ 使用 box-sizing
.container {
  height: 240px;
  padding: 8px;
  box-sizing: border-box;
  /* 实际高度 = 240px（包含 padding） */
}
```

---

## 验证方法

### 1. 检查 DOM 结构

打开浏览器开发者工具，检查元素：

```html
<div class="detail-right" style="height: 100%;">
  <div class="trend-chart-container" style="height: 100%; min-height: 240px;">
    <div class="cost-trend-chart" style="height: 100%;">
      <v-chart style="height: 100%; width: 100%;">
        <!-- ECharts 渲染区域 -->
      </v-chart>
    </div>
  </div>
</div>
```

### 2. 检查计算样式

在开发者工具中查看：

- `.detail-right` 的高度应该是一个具体值（如 240px）
- `.trend-chart-container` 的高度应该是 `100%`（等于父元素）
- `.cost-trend-chart` 的高度应该是 `100%`（等于父元素）
- `v-chart` 的高度应该是 `100%`（等于父元素）

### 3. 检查图表渲染

- ✅ 图表完整显示，没有溢出
- ✅ 图表没有变形
- ✅ 图表坐标轴标签清晰可见
- ✅ 图表响应容器大小变化

---

## 相关文件

### 修改的文件

1. **CostTrendChart.vue**
   - 第 14 行：`:style="{ height: '100%', width: '100%' }"`
   - 第 220-227 行：样式修改

2. **OptimizationResultCard.vue**
   - 第 653 行：`.detail-left { min-height: 240px; }`
   - 第 715-728 行：`.trend-chart-container` 样式修改

### 相关文件（未修改）

- `SchedulingVisual.vue` - 父组件
- `SchedulingConfig.vue` - 配置组件

---

## 总结

### 问题本质

**高度冲突**：子组件设置固定高度 `400px`，父容器设置固定高度 `240px`，导致图表溢出。

### 解决方案

**自适应高度**：

1. 子组件使用 `height: 100%`
2. 父容器使用 `height: 100%` + `min-height: 240px`
3. 移除所有固定高度设置

### 关键修改

| 文件                       | 修改内容                 | 作用                 |
| -------------------------- | ------------------------ | -------------------- |
| CostTrendChart.vue         | `height: '100%'`         | 图表自适应父容器     |
| CostTrendChart.vue         | `padding: 0`             | 充分利用容器空间     |
| OptimizationResultCard.vue | `height: 100%`           | 容器自适应父元素     |
| OptimizationResultCard.vue | `min-height: 240px`      | 确保最小可用高度     |
| OptimizationResultCard.vue | `box-sizing: border-box` | padding 不增加总高度 |

---

**修复完成时间**: 2026-03-27  
**修复版本**: v1.5.0  
**状态**: ✅ 已完成
