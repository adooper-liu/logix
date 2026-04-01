# Phase 3: 前端体验优化 - 实施计划

**创建时间**: 2026-04-01  
**作者**: 刘志高  
**状态**: 进行中

---

## 📋 Phase 3 目标

在 Phase 1 & 2 的基础上，进一步优化前端用户体验，提供直观的拖拽操作、实时成本计算和智能优化建议功能。

---

## ✅ P0 功能（必须实现）

### Task 1: 排产预览展示成本明细 ✅

**状态**: 已完成  
**组件**: `CostBreakdownDisplay.vue` (已存在)

**功能特性**:
- ✅ 滞港费、滞箱费、港口存储费、运输费明细展示
- ✅ 外部堆场费、操作费展示
- ✅ 总成本计算
- ✅ 颜色标识（绿色/橙色/红色表示费用高低）

**下一步**: 无需修改，已在 `SchedulingPreviewModal.vue` 中集成

---

### Task 2: 拖拽调整排产日期 🚧

**状态**: 开发中  
**组件**: `DragDropScheduler.vue` (新建 - 600 行)

**功能特性**:
- ✅ 时间轴视图（按日/按周切换）
- ✅ 货柜列表展示
- ✅ 拖拽节点调整日期
- ✅ 周末/节假日高亮显示
- ✅ 实时成本计算面板
- ✅ 保存/撤销修改
- ⏳ 应用优化建议

**技术实现**:
```vue
<!-- 拖拽处理 -->
<div
  class="schedule-node"
  draggable
  @dragstart="onNodeDragStart"
  @dragend="onNodeDragEnd"
>
  🚛 提柜日
</div>

<!-- 放置处理 -->
<div
  class="date-cell"
  @dragover="onDragOver"
  @drop="onDrop($event, container)"
>
  2026-04-05
</div>
```

**后端 API 需求**:
- `POST /scheduling/cost/recalculate` - 重新计算成本
- `POST /scheduling/save` - 保存修改

**依赖关系**:
- 需要后端支持实时成本计算
- 需要后端保存修改后的排产计划

---

### Task 3: 优化建议卡片 UI ✅

**状态**: 已完成  
**组件**: `OptimizationSuggestions.vue` (新建 - 392 行)

**功能特性**:
- ✅ 智能优化建议列表
- ✅ 优先级标签（高/中/低）
- ✅ 成本对比展示
- ✅ 预计节省金额
- ✅ 单个应用/全部应用/忽略
- ✅ 详情对话框

**数据结构**:
```typescript
interface OptimizationSuggestion {
  containerNumber: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  adjustmentType: string
  impactScope: string
  originalCost: number
  optimizedCost: number
  savings: number
  // ... 原始和优化后的日期
}
```

**视觉效果**:
- 高优先级：红色左边框 + 淡红背景
- 中优先级：橙色左边框 + 淡橙背景
- 低优先级：灰色左边框 + 淡灰背景

**下一步**: 与后端优化算法集成

---

### Task 4: 实时成本计算 🚧

**状态**: 部分完成  
**组件**: `DragDropScheduler.vue` 中的成本面板

**功能特性**:
- ✅ 当前总成本 vs 原始成本
- ✅ 节省金额计算
- ✅ 优化比例进度条
- ✅ 成本明细（滞港费、滞箱费、运输费）
- ✅ 成本变化颜色标识
- ⏳ 优化建议提示

**计算公式**:
```typescript
// 节省金额
savings = originalCost - totalCost

// 优化比例
optimizationPercentage = (savings / originalCost) * 100

// 进度条颜色
if (savings > 0) color = '#67c23a' // 绿色
else if (savings < 0) color = '#f56c6c' // 红色
else color = '#909399' // 灰色
```

**API 集成**:
```typescript
const recalculateCost = async () => {
  const response = await api.post('/scheduling/cost/recalculate', {
    containers: containers.value,
  })
  
  totalCost.value = response.data.data.totalCost
  costBreakdown.value = response.data.data.breakdown
  optimizationSuggestion.value = response.data.data.optimization?.suggestion
  potentialSavings.value = response.data.data.optimization?.potentialSavings
}
```

---

## 📊 P1 功能（重要）

### Task 5: 成本趋势图表

**状态**: 待开发  
**组件**: `CostTrendChart.vue` (已存在，需增强)

**功能特性**:
- 📈 成本随时间变化趋势
- 📊 各项费用占比饼图
- 🔍 钻取查看每日明细
- 📅 对比原始方案 vs 优化方案

**技术实现**:
- 使用 ECharts 或 Chart.js
- 折线图展示总成本趋势
- 柱状图展示各项费用

---

### Task 6: 甘特图视图

**状态**: 待开发  
**组件**: `GanttView.vue` (新建)

**功能特性**:
- 多仓库/车队并行展示
- 时间轴缩放（日/周/月）
- 资源冲突检测
- 关键路径高亮

**依赖关系**:
- 需要后端提供多资源档期数据
- 需要定义资源冲突检测规则

---

### Task 7: 预测性提示

**状态**: 待开发  
**组件**: `PredictiveAlerts.vue` (新建)

**功能特性**:
- ⚠️ "未来 3 天无可用档期"
- 💡 "建议提前安排以避免高峰期"
- 📊 "本周产能利用率已达 85%"
- 🎯 "推荐 alternative 仓库/车队"

**技术实现**:
- 基于历史数据分析
- 机器学习预测（可选）
- 规则引擎判断

---

## 📝 P2 功能（可选）

### Task 8: 批量设置产能

**状态**: 待开发  
**组件**: `BulkCapacitySetting.vue` (新建)

**功能特性**:
- 选中多个日期
- 批量设置容量值
- 批量设置原因
- 预览影响范围

---

### Task 9: 导出日历

**状态**: 待开发  
**组件**: `CalendarExporter.vue` (新建)

**功能特性**:
- 导出为 PDF
- 导出为 PNG
- 导出为 Excel
- 自定义导出范围

---

### Task 10: 移动端适配

**状态**: 待开发  
**组件**: 响应式布局优化

**功能特性**:
- 手机端时间轴视图
- 触摸友好的拖拽
- 简化版成本面板
- 横屏/竖屏自适应

---

## 🔧 技术架构

### 组件层级

```
SchedulingVisual.vue (主页面)
├── SchedulingFilterBar.vue (筛选器)
├── SchedulingStatsBar.vue (统计栏)
├── DragDropScheduler.vue (拖拽调度器) ★新增
│   ├── TimelineView (时间轴)
│   └── RealtimeCostPanel (实时成本)
├── OptimizationSuggestions.vue (优化建议) ★新增
├── CostBreakdownDisplay.vue (成本明细)
├── CostTrendChart.vue (成本趋势) [P1]
└── GanttView.vue (甘特图) [P1]
```

---

### 数据流

```
用户操作（拖拽/点击）
  ↓
更新本地状态（containers.value）
  ↓
调用后端 API（recalculateCost）
  ↓
获取新成本和优化建议
  ↓
更新 UI（成本面板/建议卡片）
  ↓
用户确认保存
  ↓
调用后端 API（save）
  ↓
持久化到数据库
```

---

## 📅 实施时间表

### Week 1 (2026-04-01 ~ 2026-04-07)
- ✅ Task 1: 成本明细展示（已存在）
- ✅ Task 2: 拖拽调整日期（开发中）
- ✅ Task 3: 优化建议卡片（已完成）
- ⏳ Task 4: 实时成本计算（进行中）

### Week 2 (2026-04-08 ~ 2026-04-14)
- [ ] Task 5: 成本趋势图表
- [ ] Task 6: 甘特图视图
- [ ] 后端 API 集成测试

### Week 3 (2026-04-15 ~ 2026-04-21)
- [ ] Task 7: 预测性提示
- [ ] Task 8: 批量设置产能
- [ ] 性能优化

### Week 4 (2026-04-22 ~ 2026-04-28)
- [ ] Task 9: 导出日历
- [ ] Task 10: 移动端适配
- [ ] 完整测试和文档

---

## 🎯 成功标准

### 用户体验指标
- [ ] 拖拽操作流畅度 > 60fps
- [ ] 成本计算响应时间 < 500ms
- [ ] 优化建议准确率 > 90%
- [ ] 用户满意度评分 > 4.5/5

### 技术指标
- [ ] 组件单元测试覆盖率 > 80%
- [ ] E2E 测试覆盖核心流程
- [ ] 无严重 Bug（P0/P1 级别）
- [ ] 文档完整性 100%

---

## 📄 交付物清单

### 新增组件（4 个）
1. ✅ `DragDropScheduler.vue` (600 行) - 拖拽调度器
2. ✅ `OptimizationSuggestions.vue` (392 行) - 优化建议卡片
3. ⏳ `GanttView.vue` (待开发) - 甘特图
4. ⏳ `PredictiveAlerts.vue` (待开发) - 预测提示

### 增强组件（2 个）
1. ⏳ `CostTrendChart.vue` (待增强) - 成本趋势
2. ⏳ `CalendarCapacityView.vue` (待增强) - 档期日历

### 后端 API（4 个）
1. ⏳ `POST /scheduling/cost/recalculate` - 重新计算成本
2. ⏳ `POST /scheduling/save` - 保存修改
3. ⏳ `GET /scheduling/optimizations` - 获取优化建议
4. ⏳ `POST /scheduling/optimization/apply` - 应用优化

### 文档（3 份）
1. ✅ `PHASE3_IMPLEMENTATION_PLAN.md` (本文档)
2. ⏳ `DRAG_DROP_SCHEDULER_GUIDE.md` - 拖拽调度器使用指南
3. ⏳ `REALTIME_COST_CALCULATION.md` - 实时成本计算原理

---

## ⚠️ 风险和挑战

### 技术风险
1. **拖拽性能**: 大量货柜时可能卡顿
   - **缓解方案**: 虚拟滚动、懒加载

2. **实时计算准确性**: 成本计算复杂度高
   - **缓解方案**: 缓存中间结果、增量计算

3. **后端 API 延迟**: 频繁调用可能导致性能问题
   - **缓解方案**: 防抖、节流、本地缓存

### 业务风险
1. **优化建议不被信任**: 用户可能质疑算法
   - **缓解方案**: 提供详细解释、允许手动调整

2. **学习曲线陡峭**: 新用户不熟悉拖拽操作
   - **缓解方案**: 新手引导、操作提示

---

## 📊 度量指标

### 性能指标
- 首次渲染时间 < 2s
- 拖拽响应时间 < 100ms
- 成本计算时间 < 500ms
- 保存操作时间 < 1s

### 质量指标
- Bug 数量 < 5 个
- 代码审查通过率 100%
- 测试覆盖率 > 80%
- 文档完整性 100%

### 用户指标
- 功能使用率 > 70%
- 用户满意度 > 4.5/5
- 平均任务完成时间缩短 30%

---

**下一步行动**: 
1. 完成后端 API 开发（cost/recalculate, save）
2. 集成测试拖拽功能
3. 完善优化建议算法
4. 编写组件文档

**状态更新**: 每周更新一次进度
