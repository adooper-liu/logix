# 🎨 LogiX 颜色系统使用指南

> 统一项目颜色规范，提升视觉一致性和开发效率

---

## 📚 目录

- [颜色系统概览](#颜色系统概览)
- [在 SCSS 中使用](#在-scss-中使用)
- [在 JS/TS 中使用](#在-jsts-中使用)
- [迁移指南](#迁移指南)
- [颜色参考表](#颜色参考表)

---

## 🎨 颜色系统概览

### 主题色

| 变量名 | 颜色值 | 用途 |
|--------|--------|------|
| `$primary-color` | `#409EFF` | 主要操作、按钮、链接 |
| `$primary-light` | `#79bbff` | 主要色变体（浅色） |
| `$primary-lighter` | `#a0cfff` | 主要色变体（更浅） |
| `$primary-extra-light` | `#c6e2ff` | 主要色变体（极浅） |
| `$primary-dark` | `#337ecc` | 主要色变体（深色） |

### 功能色

| 变量名 | 颜色值 | 用途 |
|--------|--------|------|
| `$success-color` | `#67C23A` | 成功状态、确认操作 |
| `$warning-color` | `#E6A23C` | 警告状态、注意提醒 |
| `$danger-color` | `#F56C6C` | 危险状态、删除操作 |
| `$info-color` | `#909399` | 信息提示、次要内容 |

### 中性色 - 文字

| 变量名 | 颜色值 | 用途 |
|--------|--------|------|
| `$text-primary` | `#303133` | 主要文字 |
| `$text-regular` | `#606266` | 常规文字 |
| `$text-secondary` | `#909399` | 次要文字 |
| `$text-placeholder` | `#C0C4CC` | 占位文字 |

### 中性色 - 背景

| 变量名 | 颜色值 | 用途 |
|--------|--------|------|
| `$bg-color` | `#ffffff` | 默认背景色 |
| `$bg-page` | `#f5f7fa` | 页面背景色 |
| `$bg-overlay` | `rgba(255, 255, 255, 0.9)` | 遮罩层背景 |

### 中性色 - 边框

| 变量名 | 颜色值 | 用途 |
|--------|--------|------|
| `$border-base` | `#DCDFE6` | 基础边框 |
| `$border-light` | `#E4E7ED` | 浅色边框 |
| `$border-lighter` | `#EBEEF5` | 更浅边框 |
| `$border-extra-light` | `#F2F6FC` | 极浅边框 |

### 业务色 - 物流状态

| 变量名 | 颜色值 | 对应状态 |
|--------|--------|----------|
| `$status-shipped` | `#409EFF` | 已出运 |
| `$status-in-transit` | `#409EFF` | 在途 |
| `$status-at-port` | `#67C23A` | 已到港 |
| `$status-picked-up` | `#E6A23C` | 已提柜 |
| `$status-unloaded` | `#909399` | 已卸柜 |
| `$status-returned-empty` | `#909399` | 已还箱 |
| `$status-not-shipped` | `#909399` | 未出运 |

### 业务色 - 优先级

| 变量名 | 颜色值 | 对应优先级 |
|--------|--------|-----------|
| `$priority-critical` | `#F56C6C` | 紧急 |
| `$priority-high` | `#E6A23C` | 高 |
| `$priority-medium` | `#409EFF` | 中 |
| `$priority-low` | `#67C23A` | 低 |

---

## 💻 在 SCSS 中使用

### 1. 导入变量

```scss
@use '@/assets/styles/variables' as *;

// 或者使用特定变量
@use '@/assets/styles/variables' as vars;
```

### 2. 基础用法

```scss
@use '@/assets/styles/variables' as *;

.my-button {
  color: $primary-color;
  background-color: $bg-color;
  border-color: $border-base;
}
```

### 3. 在组件中使用

```vue
<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.container {
  background-color: $bg-page;
  color: $text-primary;

  .title {
    color: $primary-color;
    font-size: $font-size-lg;
  }

  .status {
    &.success {
      color: $success-color;
    }
    &.warning {
      color: $warning-color;
    }
    &.danger {
      color: $danger-color;
    }
  }
}
</style>
```

### 4. 嵌套使用

```scss
@use '@/assets/styles/variables' as *;

.card {
  background: $bg-color;
  border: 1px solid $border-base;
  padding: $spacing-md;
  box-shadow: $shadow-base;

  &:hover {
    border-color: $primary-color;
    box-shadow: $shadow-dark;
  }
}
```

---

## 🟨 在 JS/TS 中使用

### 1. 导入组合式函数

```typescript
import { useColors } from '@/composables/useColors'

// 在 setup 中使用
const colors = useColors()
```

### 2. 基础用法

```vue
<script setup lang="ts">
import { useColors } from '@/composables/useColors'

const colors = useColors()

const buttonStyle = {
  color: colors.primary,
  backgroundColor: colors.bg.color,
}
</script>

<template>
  <div :style="{ color: colors.primary }">
    主要颜色文本
  </div>
</template>
```

### 3. 动态样式

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useColors } from '@/composables/useColors'

const props = defineProps<{
  status: 'shipped' | 'in-transit' | 'at-port' | 'picked-up'
}>()

const colors = useColors()

const statusColor = computed(() => {
  return colors.getStatusColor(props.status)
})
</script>

<template>
  <div :style="{ color: statusColor }">
    {{ status }}
  </div>
</template>
```

### 4. 使用颜色映射表

```vue
<script setup lang="ts">
import { useColors } from '@/composables/useColors'

const colors = useColors()

// 使用颜色映射表查找颜色
const getColorName = (hexColor: string) => {
  return colors.colorMap[hexColor] || '未知颜色'
}
</script>
```

---

## 🔄 迁移指南

### 1. 使用迁移脚本

```bash
# 进入 frontend 目录
cd frontend

# 运行迁移脚本
node scripts/migrate-colors.js
```

### 2. 手动迁移步骤

**步骤 1**：找到硬编码的颜色
```scss
// ❌ 之前
.button {
  color: #409EFF;
}
```

**步骤 2**：查找对应的 SCSS 变量
```scss
// ✅ 之后
@use '@/assets/styles/variables' as *;

.button {
  color: $primary-color;
}
```

**步骤 3**：在 JS/TS 中替换
```typescript
// ❌ 之前
const statusColors = {
  shipped: '#409EFF',
  atPort: '#67C23A',
}

// ✅ 之后
import { useColors } from '@/composables/useColors'
const colors = useColors()

const statusColors = {
  shipped: colors.status.shipped,
  atPort: colors.status.atPort,
}
```

### 3. 常见迁移场景

#### 场景 1：Vue 组件样式

```vue
<!-- ❌ 之前 -->
<style scoped>
.button {
  color: #409EFF;
  background: #ffffff;
}
</style>

<!-- ✅ 之后 -->
<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.button {
  color: $primary-color;
  background: $bg-color;
}
</style>
```

#### 场景 2：ECharts 配置

```typescript
// ❌ 之前
const series = [{
  itemStyle: { color: '#409EFF' }
}]

// ✅ 之后
import { useColors } from '@/composables/useColors'
const colors = useColors()

const series = [{
  itemStyle: { color: colors.primary }
}]
```

#### 场景 3：动态类名

```vue
<!-- ❌ 之前 -->
<div :class="{ 'text-blue': isPrimary }">
  内容
</div>

<!-- ✅ 之后 -->
<div :style="{ color: isPrimary ? colors.primary : colors.text.regular }">
  内容
</div>
```

---

## 📊 颜色参考表

### 完整颜色变量列表

```scss
// 主题色
$primary-color: #409EFF
$primary-light: #79bbff
$primary-lighter: #a0cfff
$primary-extra-light: #c6e2ff
$primary-dark: #337ecc

// 功能色
$success-color: #67C23A
$warning-color: #E6A23C
$danger-color: #F56C6C
$info-color: #909399

// 功能色变体
$success-light: #95d475
$warning-light: #eebe77
$danger-light: #f89898
$info-light: #b1b3b8

// 中性色 - 文字
$text-primary: #303133
$text-regular: #606266
$text-secondary: #909399
$text-placeholder: #C0C4CC

// 中性色 - 背景
$bg-color: #ffffff
$bg-page: #f5f7fa
$bg-overlay: rgba(255, 255, 255, 0.9)

// 中性色 - 边框
$border-base: #DCDFE6
$border-light: #E4E7ED
$border-lighter: #EBEEF5
$border-extra-light: #F2F6FC

// 业务色 - 物流状态
$status-shipped: #409EFF
$status-in-transit: #409EFF
$status-at-port: #67C23A
$status-picked-up: #E6A23C
$status-unloaded: #909399
$status-returned-empty: #909399
$status-not-shipped: #909399

// 业务色 - 优先级
$priority-critical: #F56C6C
$priority-high: #E6A23C
$priority-medium: #409EFF
$priority-low: #67C23A

// 布局
$sidebar-width: 240px
$header-height: 60px
$footer-height: 60px

// 响应式断点
$breakpoint-xs: 480px
$breakpoint-sm: 768px
$breakpoint-md: 992px
$breakpoint-lg: 1200px
$breakpoint-xl: 1920px

// 间距
$spacing-xs: 4px
$spacing-sm: 8px
$spacing-md: 16px
$spacing-lg: 24px
$spacing-xl: 32px
$spacing-xxl: 48px

// 字体大小
$font-size-xs: 12px
$font-size-sm: 13px
$font-size-base: 14px
$font-size-lg: 16px
$font-size-xl: 18px
$font-size-xxl: 20px

// 阴影
$shadow-light: 0 2px 4px rgba(0, 0, 0, 0.12), 0 0 6px rgba(0, 0, 0, 0.04)
$shadow-base: 0 2px 12px 0 rgba(0, 0, 0, 0.1)
$shadow-dark: 0 2px 20px 0 rgba(0, 0, 0, 0.2)

// 圆角
$radius-small: 2px
$radius-base: 4px
$radius-large: 8px
$radius-circle: 50%

// 过渡动画
$transition-base: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)
$transition-fade: opacity 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)
$transition-transform: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)

// Z-Index
$z-index-normal: 1
$z-index-dropdown: 1000
$z-index-sticky: 1020
$z-index-fixed: 1030
$z-index-modal-backdrop: 1040
$z-index-modal: 1050
$z-index-popover: 1060
$z-index-tooltip: 1070
```

---

## 📝 最佳实践

### 1. 优先使用语义化变量

```scss
// ✅ 推荐
.my-component {
  color: $primary-color;
}

// ❌ 不推荐
.my-component {
  color: #409EFF;  // 硬编码
}
```

### 2. 根据上下文选择合适的颜色

```scss
// ✅ 正确使用状态色
.status-badge {
  &.success { color: $success-color; }
  &.warning { color: $warning-color; }
  &.danger { color: $danger-color; }
}

// ✅ 正确使用业务色
.status-indicator {
  &.shipped { background: $status-shipped; }
  &.at-port { background: $status-at-port; }
}
```

### 3. 保持一致性

```scss
// ✅ 在整个项目中使用相同的变量
.button {
  color: $primary-color;
}

.link {
  color: $primary-color;
}

.card-header {
  color: $text-primary;
}
```

### 4. 新增颜色时更新文档

如果需要新增颜色变量，请：

1. 在 `variables.scss` 中添加
2. 在 `useColors.ts` 中同步添加
3. 更新本文档

---

## 🎯 迁移检查清单

- [ ] 扩展 `variables.scss` 添加新变量
- [ ] 创建 `useColors.ts` 组合式函数
- [ ] 运行迁移脚本替换硬编码颜色
- [ ] 手动检查替换结果
- [ ] 测试所有页面显示正常
- [ ] 更新团队开发规范

---

## 📞 获取帮助

如有问题，请参考：
- [Element Plus 颜色系统](https://element-plus.org/zh-CN/component/color.html)
- 项目开发规范文档
- 前端技术负责人

---

**更新时间**: 2026-02-28
**维护者**: LogiX 前端团队
