# 关键时间线帮助图标移除

## 修改目的

移除关键时间线右上角的问号帮助图标，简化界面，减少视觉干扰。

## 问题现象

### 修改前

- 关键时间线卡片右上角显示问号图标
- 点击跳转到帮助文档 `/docs/help/时间概念说明 - 历时倒计时超期.md`
- 占用视觉空间，分散用户注意力
- 用户已通过实际使用理解时间线概念，不需要帮助提示

### 修改后

- 移除问号帮助图标
- 界面更加简洁
- 用户专注于时间线本身的信息

## 修改方案

### 1. 模板部分

**文件**: `frontend/src/views/shipments/components/KeyDatesTimeline.vue`

**修改位置**: 第 442-456 行

**修改前**:
```vue
<template>
  <el-card class="key-dates-card" shadow="never" v-if="timelineEvents.length > 0">
    <div class="key-dates-help">
      <router-link
        :to="{
          path: '/docs/help/时间概念说明 - 历时倒计时超期.md',
          query: { from: router.currentRoute.value.fullPath },
        }"
        class="help-link"
        title="历时/倒计时/超期说明"
      >
        <el-icon><QuestionFilled /></el-icon>
      </router-link>
    </div>

    <div class="timeline-horizontal">
      <!-- ... -->
    </div>
  </el-card>
</template>
```

**修改后**:
```vue
<template>
  <el-card class="key-dates-card" shadow="never" v-if="timelineEvents.length > 0">
    <div class="timeline-horizontal">
      <!-- ... -->
    </div>
  </el-card>
</template>
```

**关键变化**:
- 移除整个 `key-dates-help` 区域
- 移除 `router-link` 跳转链接
- 移除 `QuestionFilled` 图标

### 2. 样式部分

**修改位置**: 第 522-545 行

**修改前**:
```scss
.key-dates-help {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
}

.help-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  color: $text-secondary;
  text-decoration: none;
  border-radius: $radius-base;
  transition:
    color $transition-base,
    background $transition-base;

  &:hover {
    color: $primary-color;
    background: rgba($primary-color, 0.08);
  }
}

.timeline-horizontal {
  // ...
}
```

**修改后**:
```scss
.timeline-horizontal {
  // ...
}
```

**关键变化**:
- 移除 `.key-dates-help` 样式
- 移除 `.help-link` 样式
- 保留 `.timeline-horizontal` 样式

### 3. Script 部分

**文件**: `frontend/src/views/shipments/components/KeyDatesTimeline.vue`

**修改位置**: 第 1-7 行

**修改前**:
```typescript
<script setup lang="ts">
import DurationDisplay from '@/components/common/DurationDisplay.vue'
import { QuestionFilled } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
```

**修改后**:
```typescript
<script setup lang="ts">
import DurationDisplay from '@/components/common/DurationDisplay.vue'
import { computed } from 'vue'
```

**关键变化**:
- 移除 `QuestionFilled` 图标导入
- 移除 `useRouter` 导入
- 移除 `router` 实例创建

## 视觉效果对比

### 修改前

```
┌─────────────────────────────────────────┐
│                              ❓          │
│  出运    ETA    最晚提柜   当前   最晚还箱  │
│  ●━━━━━━●━━━━━━●━━━━━━━━●━━━━━━●       │
│ 2026/1  2026/3  2026/3    2026/3  2026/4  │
└─────────────────────────────────────────┘
```

### 修改后

```
┌─────────────────────────────────────────┐
│  出运    ETA    最晚提柜   当前   最晚还箱  │
│  ●━━━━━━●━━━━━━●━━━━━━━━●━━━━━━●       │
│ 2026/1  2026/3  2026/3    2026/3  2026/4  │
└─────────────────────────────────────────┘
```

## 用户体验优化

1. **视觉简化**: 移除不必要的图标，界面更清爽
2. **减少干扰**: 用户专注于时间线数据本身
3. **空间节省**: 减少右上角的视觉占用
4. **信息聚焦**: 引导用户关注时间节点和状态

## 修改文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `frontend/src/views/shipments/components/KeyDatesTimeline.vue` | 修改 | 模板、样式、脚本 |

## 测试场景

### 功能测试

1. **时间线显示**:
   - ✅ 时间线正常显示
   - ✅ 所有时间节点正常
   - ✅ 历时/倒计时/超期状态正常

2. **图标移除**:
   - ✅ 右上角问号图标消失
   - ✅ 无残留样式或空白区域

3. **代码检查**:
   - ✅ 无编译错误
   - ✅ 无未使用导入警告

### 视觉测试

1. **布局检查**:
   - ✅ 时间线布局完整
   - ✅ 无缺失元素
   - ✅ 间距正常

2. **响应式**:
   - ✅ 不同屏幕宽度下正常显示

## 业务背景

### 帮助图标原始用途

- **目的**: 提供时间线概念说明（历时/倒计时/超期）
- **跳转**: `/docs/help/时间概念说明 - 历时倒计时超期.md`
- **目标用户**: 初次使用系统的新用户

### 移除原因

1. **用户已熟悉**: 主要用户已理解时间线概念
2. **使用频率低**: 帮助链接点击率极低
3. **界面简化**: 减少视觉干扰，提升专注度
4. **文档整合**: 帮助文档可整合到其他位置

## 后续优化建议

1. **帮助文档整合**:
   - 将时间线说明整合到系统新手引导
   - 在列表页或首页提供统一帮助入口

2. **Tooltip 提示**:
   - 如确需帮助，可在具体节点上添加 tooltip
   - 鼠标悬停显示说明，而非独立图标

3. **上下文帮助**:
   - 在时间线下方添加简短说明文字
   - 使用更自然的方式提供帮助

## 注意事项

1. **浏览器缓存**: 修改后需强制刷新浏览器（Ctrl+Shift+R）
2. **图标导入清理**: 确保移除未使用的 `QuestionFilled` 导入
3. **路由依赖清理**: 确保移除未使用的 `useRouter` 导入

## 修改时间

- **创建时间**: 2026-03-31
- **最后更新**: 2026-03-31
- **修改人**: 刘志高

## 相关文档

- `frontend/public/docs/第 2 层 - 业务逻辑/时间线节点显示业务规则.md`
- `frontend/src/views/shipments/components/KeyDatesTimeline.vue`
