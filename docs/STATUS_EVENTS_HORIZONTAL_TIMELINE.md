# 状态事件横向时间线改造

## 改动概述

将状态事件页签从纵向时间线改为横向滚动时间线，提供更直观的时间流逝视觉体验。

## 改动文件

`frontend/src/views/shipments/ContainerDetail.vue`

## 功能特性

### 1. 横向时间线布局
- 事件卡片从左到右按时间顺序排列
- 支持横向滚动查看所有事件
- 卡片之间有渐变连接线

### 2. 视觉区分

#### 实际发生事件
- 蓝色渐变图标背景 (#409EFF → #66B1FF)
- 绿色渐变连接线
- 实心对勾图标

#### 预计时间事件
- 橙色渐变图标背景 (#E6A23C → #F0A67A)
- 橙色虚线连接线
- 时钟图标
- 状态代码橙色显示

### 3. 事件卡片信息

每个事件卡片显示：
- **状态图标** - 圆形图标，实际/预计使用不同颜色
- **状态代码** - 如 ATA、ETA、PICKED_UP 等
- **发生时间** - 完整的日期时间格式
- **地点名称** - 优先显示中文，其次英文
- **数据来源标签** - Feituo (绿色) / 其他 (灰色)
- **事件描述** - 事件的详细描述
- **坐标信息** - 经纬度（如有）

### 4. 交互效果
- 卡片悬停时上浮 4px
- 卡片悬停时阴影加深
- 平滑的过渡动画

### 5. 图例说明
时间线下方显示图例：
- ✔ 实际发生
- 🕐 预计时间

### 6. 响应式设计
- 桌面端：卡片宽度 200px，间距 40px
- 移动端：卡片宽度 160px，间距 20px
- 支持触摸滚动

## 代码改动

### 模板部分

```vue
<el-tab-pane label="状态事件" name="events">
  <div class="tab-content">
    <div v-if="containerData.statusEvents && containerData.statusEvents.length > 0" class="events-timeline-horizontal">
      <!-- 横向滚动容器 -->
      <div class="timeline-scroll-container">
        <!-- 时间线 -->
        <div class="timeline-track">
          <div
            v-for="(event, index) in sortedEvents"
            :key="index"
            class="timeline-item"
            :class="{ 'is-estimated': event.isEstimated }"
          >
            <!-- 连接线 -->
            <div v-if="index < sortedEvents.length - 1" class="timeline-line"></div>

            <!-- 事件卡片 -->
            <div class="event-card">
              <!-- 状态图标 -->
              <div class="event-icon">
                <el-icon v-if="event.isEstimated" class="estimated-icon">
                  <Clock />
                </el-icon>
                <el-icon v-else>
                  <CircleCheck />
                </el-icon>
              </div>

              <!-- 状态代码 -->
              <div class="event-code">{{ event.statusCode || '-' }}</div>

              <!-- 时间 -->
              <div class="event-time">{{ formatDate(event.occurredAt) }}</div>

              <!-- 地点 -->
              <div class="event-location">
                {{ event.locationNameCn || event.locationNameEn || event.locationCode || '-' }}
              </div>

              <!-- 数据来源标签 -->
              <el-tag
                v-if="event.dataSource"
                size="small"
                :type="event.dataSource === 'Feituo' ? 'success' : 'info'"
                class="event-source-tag"
              >
                {{ event.dataSource }}
              </el-tag>

              <!-- 描述 -->
              <div v-if="event.description" class="event-description">
                {{ event.description }}
              </div>

              <!-- 坐标信息 -->
              <div v-if="event.latitude && event.longitude" class="event-coords">
                {{ event.latitude.toFixed(4) }}°N, {{ event.longitude.toFixed(4) }}°E
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 时间线图例 -->
      <div class="timeline-legend">
        <div class="legend-item">
          <el-icon class="legend-icon"><CircleCheck /></el-icon>
          <span>实际发生</span>
        </div>
        <div class="legend-item">
          <el-icon class="legend-icon estimated"><Clock /></el-icon>
          <span>预计时间</span>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无状态事件记录" />
  </div>
</el-tab-pane>
```

### Script 部分

#### 导入新图标
```typescript
import { ArrowLeft, Refresh, CircleCheck, Clock } from '@element-plus/icons-vue'
```

#### 添加排序计算属性
```typescript
// 状态事件排序（按时间升序，从早到晚）
const sortedEvents = computed(() => {
  if (!containerData.value?.statusEvents) return []
  return [...containerData.value.statusEvents].sort((a, b) => {
    const timeA = new Date(a.occurredAt).getTime()
    const timeB = new Date(b.occurredAt).getTime()
    return timeA - timeB
  })
})
```

### 样式部分

```scss
// 横向状态事件时间线样式
.events-timeline-horizontal {
  padding: 20px 0;

  .timeline-scroll-container {
    overflow-x: auto;
    overflow-y: hidden;
    padding: 20px 0;
  }

  .timeline-track {
    display: flex;
    align-items: flex-start;
    min-width: max-content;
    gap: 0;
  }

  .timeline-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 20px;
    min-width: 220px;

    .timeline-line {
      position: absolute;
      top: 40px;
      left: 50%;
      width: calc(100% + 40px);
      height: 2px;
      background: linear-gradient(90deg, #409EFF, #67C23A);
      z-index: 0;
    }
  }

  .event-card {
    position: relative;
    z-index: 1;
    background: #fff;
    border: 1px solid #EBEEF5;
    border-radius: 8px;
    padding: 16px;
    width: 200px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.15);
    }

    .event-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #409EFF, #66B1FF);
      // ...
    }
  }

  .timeline-item.is-estimated {
    .event-card {
      .event-icon {
        background: linear-gradient(135deg, #E6A23C, #F0A67A);
      }

      .event-code {
        color: #E6A23C;
      }
    }

    .timeline-line {
      background: linear-gradient(90deg, #E6A23C, #F0A67A);
      border-style: dashed;
      border: 2px dashed #E6A23C;
      background: transparent;
    }
  }
}
```

## 视觉效果

### 实际事件卡片
```
    ┌─────────────┐
    │     ✓      │  ← 蓝色渐变图标
    ├─────────────┤
    │    ATA     │
    ├─────────────┤
    │ 2025/07/18 │
    │   10:30    │
    ├─────────────┤
    │    纽瓦克    │
    ├─────────────┤
    │ [Feituo]    │  ← 绿色标签
    ├─────────────┤
    │实际到港时间 │
    └─────────────┘
```

### 预计事件卡片
```
    ┌─────────────┐
    │     🕐      │  ← 橙色渐变图标
    ├─────────────┤
    │    ETA     │  ← 橙色文字
    ├─────────────┤
    │ 2025/07/19 │
    │   08:00    │
    ├─────────────┤
    │    纽瓦克    │
    ├─────────────┤
    │ [Feituo]    │
    ├─────────────┤
    │预计到港时间 │
    └─────────────┘
```

### 时间线连接
```
┌─────────┐ ────────────┐ ────────────┐
│ 事件1   │───────(蓝) │  事件2      │───────┐
└─────────┘           └───────────┘          │
                                              │
┌─────────┐ ─ - - - - - ────────────┐      │
│ 事件3   │───────(橙虚线) │  事件4      │───────┘
└─────────┘                    └───────────┘
    ↑                             ↑
  实际                         预计
```

## 改进点

### 1. 用户体验
- ✅ 更直观的时间流向（从左到右）
- ✅ 一目了然看到所有事件
- ✅ 清晰区分实际与预计事件
- ✅ 流畅的滚动交互

### 2. 信息展示
- ✅ 更详细的事件信息
- ✅ 数据来源标识
- ✅ 坐标信息（如有）
- ✅ 图例说明

### 3. 视觉设计
- ✅ 现代化的卡片设计
- ✅ 渐变色彩增强视觉效果
- ✅ 悬停动画提升交互感
- ✅ 响应式适配不同屏幕

### 4. 数据处理
- ✅ 自动按时间排序
- ✅ 保留所有事件信息
- ✅ 支持空状态处理

## 兼容性

- ✅ 桌面浏览器 (Chrome, Firefox, Edge, Safari)
- ✅ 移动端浏览器
- ✅ 平板设备
- ✅ 触摸设备

## 相关文档

- [状态事件页签修复](./STATUS_EVENTS_TAB_FIX.md)
- [外部数据接入指南](./EXTERNAL_DATA_INTEGRATION_GUIDE.md)
- [外部数据快速开始](./EXTERNAL_DATA_QUICKSTART.md)
