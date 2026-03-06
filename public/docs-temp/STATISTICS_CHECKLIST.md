# 统计问题检查清单

> 检查日期: 2026-03-04
> 目的: 分步检查并修正统计问题

## 检查步骤

### 第1步: 后端统计方法检查

#### 1.1 按到港维度
- [ ] 检查 `getArrivedToday` 方法
- [ ] 检查 `getArrivedBeforeTodayNotPickedUp` 方法
- [ ] 检查 `getArrivedBeforeTodayPickedUp` 方法
- [ ] 检查 `getOverdueNotArrived` 方法
- [ ] 检查 `getWithin3Days` 方法
- [ ] 检查 `getWithin7Days` 方法
- [ ] 检查 `getOver7Days` 方法
- [ ] 检查 `getOtherRecords` 方法

#### 1.2 按计划提柜维度
- [ ] 检查 `getOverduePlanned` 方法
- [ ] 检查 `getTodayPlanned` 方法
- [ ] 检查 `getPendingArrangement` 方法
- [ ] 检查 `getPlannedWithin3Days` 方法
- [ ] 检查 `getPlannedWithin7Days` 方法

#### 1.3 按最晚提柜维度
- [ ] 检查 `getLastPickupExpired` 方法
- [ ] 检查 `getLastPickupUrgent` 方法
- [ ] 检查 `getLastPickupWarning` 方法
- [ ] 检查 `getLastPickupNormal` 方法
- [ ] 检查 `getNoLastPickupDate` 方法

#### 1.4 按最晚还箱维度
- [ ] 检查 `getLastReturnExpired` 方法
- [ ] 检查 `getLastReturnUrgent` 方法
- [ ] 检查 `getLastReturnWarning` 方法
- [ ] 检查 `getLastReturnNormal` 方法
- [ ] 检查 `getNoLastReturnDate` 方法

### 第2步: 前端筛选逻辑检查

#### 2.1 按到港维度筛选
- [ ] 检查 `useGanttFilters.ts` 中的筛选逻辑
- [ ] 检查 `Shipments.vue` 中的筛选逻辑

#### 2.2 按计划提柜维度筛选
- [ ] 检查 `useGanttFilters.ts` 中的筛选逻辑
- [ ] 检查 `Shipments.vue` 中的筛选逻辑

#### 2.3 按最晚提柜维度筛选
- [ ] 检查 `useGanttFilters.ts` 中的筛选逻辑
- [ ] 检查 `Shipments.vue` 中的筛选逻辑

#### 2.4 按最晚还箱维度筛选
- [ ] 检查 `useGanttFilters.ts` 中的筛选逻辑
- [ ] 检查 `Shipments.vue` 中的筛选逻辑

### 第3步: 数据一致性检查

- [ ] 后端统计总数 = 前端显示总数
- [ ] 各维度子集总和 = 总数
- [ ] 无重复计数
- [ ] 无遗漏计数

### 第4步: 边界条件检查

- [ ] 空数据情况
- [ ] 日期边界（今天、今天+3天、今天+7天）
- [ ] 状态边界（transit vs destination）
- [ ] NULL值处理

## 检查记录

### 问题记录
| 序号 | 问题描述 | 位置 | 严重程度 | 状态 |
|-----|---------|------|---------|------|
| 1 | ~~后端到港统计缺少 `currentPortType !== 'transit'` 筛选~~ | `containerStatistics.service.ts:306-416` | - | 已排除（SQL子查询已保证） |
| 2 | `Shipments.vue` 中存在 `todayActual` 筛选逻辑 | `Shipments.vue:251-258` | 中 | ✅ 已修复 |
|     |         |      |         |      |

### 修复记录
| 序号 | 问题描述 | 修复方案 | 修复日期 | 状态 |
|-----|---------|---------|---------|------|
|     |         |         |         |      |
