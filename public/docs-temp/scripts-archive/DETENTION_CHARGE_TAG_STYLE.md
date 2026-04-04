# 滞港费详细展示样式优化

## 修改目的

将货柜详情页的滞港费详细列表从**块状列表**改为**小标签**样式，并与汇总费用一起**靠右显示**，提升视觉紧凑度和美观性。

## 问题现象

### 修改前

- 每个费用项（如 Detention Charge）单独占一行
- 使用白色背景块 + 圆角卡片样式
- 整体区域有额外的 padding 和 background
- 视觉上较为臃肿，占用空间大
- 靠左显示，与左侧信息对齐

### 修改后

- 费用项以 el-tag 标签形式展示
- 多个标签横向排列，自动换行
- 背景色与汇总费用保持一致（警告色淡背景）
- 视觉紧凑，节省空间
- **靠右显示**，与左侧的基础信息形成平衡

## 修改方案

### 1. 模板部分

**文件**: `frontend/src/views/shipments/components/ContainerSummary.vue`

**修改位置**: 第 122-137 行

**修改前**:

```vue
<!-- 滞港费详细 -->
<div
  v-if="demurrageSummary && demurrageSummary.chargeTypes.length > 0"
  class="demurrage-details"
>
  <div
    v-for="chargeType in demurrageSummary.chargeTypes"
    :key="chargeType.chargeType"
    class="demurrage-type-item"
  >
    <span class="charge-type-name">{{ chargeType.chargeName || chargeType.chargeType }}</span>
    <span class="charge-type-amount">
      {{ demurrageSummary.currency }} {{ chargeType.totalAmount.toFixed(2) }}
    </span>
  </div>
</div>
```

**修改后**:

```vue
<!-- 滞港费详细（小标签样式） -->
<div v-if="demurrageSummary && demurrageSummary.chargeTypes.length > 0" class="demurrage-tags">
  <el-tag
    v-for="chargeType in demurrageSummary.chargeTypes"
    :key="chargeType.chargeType"
    class="demurrage-tag-item"
    size="small"
  >
    <span class="charge-type-name">{{ chargeType.chargeName || chargeType.chargeType }}</span>
    <span class="charge-type-amount">
      {{ demurrageSummary.currency }} {{ chargeType.totalAmount.toFixed(2) }}
    </span>
  </el-tag>
</div>
```

**关键变化**:

- 外层容器 class 从 `demurrage-inline` 改为 `demurrage-container`
- 汇总费用改为嵌套在容器内的子元素
- 详细费用标签也嵌套在容器内
- 注释更新为“汇总与详细（同一行）”
- **添加 `margin-left: auto` 实现靠右对齐**

### 2. 样式部分

**修改前**:

```scss
.demurrage-details {
  display: grid;
  gap: 4px;
  margin-top: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: rgba($warning-color, 0.06);
  border-radius: $radius-base;
  border: none;
}

.demurrage-type-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: #fff;
  border-radius: $radius-small;
  font-size: $font-size-xs;

  .charge-type-name {
    color: $text-secondary;
  }

  .charge-type-amount {
    font-weight: 600;
    color: $text-primary;
  }
}
```

**修改后**:

```scss
.demurrage-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: $spacing-sm;
}

.demurrage-tag-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba($warning-color, 0.08);
  border: none;
  border-radius: $radius-base;
  font-size: $font-size-xs;
  transition: background $transition-base;

  &:hover {
    background: rgba($warning-color, 0.12);
  }

  .charge-type-name {
    color: $text-secondary;
    font-weight: 500;
  }

  .charge-type-amount {
    color: $text-primary;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
}
```

**关键变化**:

- 外层容器从 `grid` 布局改为 `flex` 布局，支持自动换行
- 移除外层容器的 padding 和 background
- 费用项使用 inline-flex，增加 gap 属性
- 背景色从白色改为警告色淡背景（与汇总费用一致）
- 添加 hover 效果（加深背景色）
- 字体加权和数字显示优化

## 视觉效果对比

### 修改前（块状列表）

```
┌─────────────────────────────────────┐
│ USD 0.00                            │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ Detention Charge    USD 0.00    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Demurrage Charge    USD 50.00   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 修改后（标签样式）

```
┌─────────────────────────────────────┐
│ USD 0.00                            │
│                                     │
│ [Detention Charge  USD 0.00]        │
│ [Demurrage Charge  USD 50.00]       │
└─────────────────────────────────────┘
```

## 用户体验优化

1. **空间节省**: 多个费用项横向排列，减少纵向占用空间
2. **视觉一致性**: 标签样式与汇总费用的视觉风格统一
3. **交互反馈**: 添加 hover 效果，鼠标悬停时背景加深
4. **信息密度**: 在保证可读性的前提下提升信息密度
5. **响应式友好**: flex-wrap 自动换行，适配不同屏幕宽度

## 技术细节

### el-tag 组件优势

- 内置统一的样式和间距
- 支持 size 属性（small/medium/large）
- 内置圆角和背景色处理
- 更好的无障碍支持

### flex 布局优势

- 自动换行（flex-wrap: wrap）
- 自适应容器宽度
- 灵活的间距控制（gap 属性）
- 更好的浏览器兼容性

## 修改文件清单

| 文件路径                                                       | 修改类型 | 说明       |
| -------------------------------------------------------------- | -------- | ---------- |
| `frontend/src/views/shipments/components/ContainerSummary.vue` | 修改     | 模板和样式 |

## 测试场景

### 功能测试

1. **无费用场景**:
   - ✅ demurrageSummary 为 null/undefined → 不显示标签区域
   - ✅ chargeTypes 为空数组 → 不显示标签区域

2. **单个费用项**:
   - ✅ 显示单个标签
   - ✅ 样式正确

3. **多个费用项**:
   - ✅ 多个标签横向排列
   - ✅ 超出宽度自动换行
   - ✅ 间距均匀

4. **hover 交互**:
   - ✅ 鼠标悬停时背景加深
   - ✅ 过渡动画流畅

### 视觉测试

1. **标签样式**:
   - ✅ 背景色为警告色淡背景
   - ✅ 字体大小、粗细正确
   - ✅ 数字显示对齐

2. **响应式**:
   - ✅ 窄屏自动换行
   - ✅ 宽屏横向排列

## 业务背景

### 费用项来源

滞港费计算接口返回的 `chargeTypes` 数组可能包含多个费用项：

- **Detention Charge**: 滞箱费
- **Demurrage Charge**: 滞港费
- **Storage Charge**: 堆存费
- **Demurrage & Detention**: 合并费用项

### 展示逻辑

1. **汇总显示**: 在 `demurrage-inline` 区域显示总费用
2. **详细显示**: 在 `demurrage-tags` 区域显示各费用项明细
3. **点击跳转**: 点击汇总费用可跳转到滞港费 TAB 查看详情

## 注意事项

1. **样式变量依赖**: 使用 SCSS 变量（`$warning-color`, `$spacing-sm` 等），确保主题一致性
2. **el-tag 组件**: 需确保 Element Plus 组件已正确注册
3. **响应式**: flex-wrap 确保在窄屏下自动换行，避免溢出
4. **性能**: 标签数量通常较少（1-5 个），无需虚拟滚动

## 后续优化建议

1. **颜色区分**: 可根据费用类型使用不同颜色的标签
2. **排序逻辑**: 可按费用金额降序排列，重要费用在前
3. **零值处理**: 费用为 0 的项可考虑不显示或特殊标记
4. **货币符号**: 多货币场景可考虑显示货币符号

## 修改时间

- **创建时间**: 2026-03-31
- **最后更新**: 2026-03-31
- **修改人**: 刘志高

## 相关文档

- `frontend/public/docs/第 2 层 - 业务逻辑/08-滞港费逻辑来源.md`
- `frontend/src/views/shipments/components/ContainerSummary.vue`
