# 甘特图货柜流转流程实现文档

## 📋 实现概述

本文档描述了甘特图中货柜流转流程的实现细节，包括主任务和虚线任务的状态流转逻辑。

## 🎯 核心概念

### 货柜生命周期流程

#### 正常流程
```
清关 → 提柜 → 卸柜 → 还箱
```

#### 查验流程
```
清关 → 查验 → 提柜 → 卸柜 → 还箱
```

**说明**：
- 当 `container.inspectionRequired = true` 时，货柜进入查验流程
- 查验完成后才能进行提柜
- 查验需要退运/销毁等处理时，不做流程跟踪，在查验记录中跟踪与管理

### 任务类型

1. **主任务（实线圆点）**：当前正在执行的节点
2. **虚线任务（虚线圆点）**：计划中但尚未执行的节点
3. **已销毁任务**：已完成的节点，不再显示在甘特图中

## 📊 数据结构

### NodeStatus 接口

```typescript
interface NodeStatus {
  status: 'pending' | 'active' | 'completed' | 'skipped'
  plannedDate?: Date
  actualDate?: Date
  supplier: string
}
```

### ContainerNodeStatus 接口

```typescript
interface ContainerNodeStatus {
  containerNumber: string
  portCode: string
  nodes: {
    清关: NodeStatus
    查验: NodeStatus
    提柜: NodeStatus
    卸柜: NodeStatus
    还箱: NodeStatus
  }
}
```

### GanttDisplayItem 接口

```typescript
interface GanttDisplayItem {
  type: 'main' | 'dashed'
  port: string
  node: string
  supplier: string
  containerNumber: string
  container: any
  plannedDate?: Date
  actualDate?: Date
  isCurrent: boolean
}
```

## 🔧 核心函数

### 1. calculateNodeStatus(container)

**功能**：计算货柜各节点的状态

**状态判断逻辑**：

1. **清关节点**
   - 有 `actualCustomsDate` → `completed`
   - 无 `actualCustomsDate` 但有 `plannedCustomsDate` → `active`（如果清关是当前节点）
   - 否则 → `pending`

2. **查验节点**（仅当 `inspectionRequired = true` 时）
   - 清关完成且查验未完成 → `active`
   - 有 `actualCustomsDate` 且需要查验 → `completed`
   - 否则 → `pending` 或 `skipped`

3. **提柜节点**
   - 不需要查验：清关完成且无 `pickupDate` → `active`
   - 需要查验：清关完成且查验完成且无 `pickupDate` → `active`
   - 有 `pickupDate` → `completed`
   - 否则 → `pending`

4. **卸柜节点**
   - 提柜完成且无 `unloadDate` → `active`
   - 有 `unloadDate` → `completed`
   - 否则 → `pending`

5. **还箱节点**
   - 卸柜完成且无 `returnTime` → `active`
   - 有 `returnTime` → `completed`
   - 否则 → `pending`

### 2. getDisplayItems(container)

**功能**：根据货柜节点状态生成甘特图显示项

**显示规则**：
- 只显示当前活跃节点和计划节点
- 已完成的节点不显示（销毁）
- 第一个 `active` 节点之后的 `pending` 节点显示为虚线任务
- 根据 `inspectionRequired` 字段自动选择节点顺序：
  - 需要查验：`['清关', '查验', '提柜', '卸柜', '还箱']`
  - 不需要查验：`['清关', '提柜', '卸柜', '还箱']`

### 3. isMainTask(container)

**功能**：判断货柜在当前节点是否为主任务（实线圆点）

**判断逻辑**：
```typescript
// 检查货柜是否有 type === 'main' 的显示项，且日期与当前日期匹配
```

### 4. isDashedTask(container)

**功能**：判断货柜在当前节点是否为虚线任务（计划中）

**判断逻辑**：
```typescript
// 检查货柜是否有 type === 'dashed' 的显示项，且日期与当前日期匹配
```

### 5. getContainersByDateAndSupplier(date, containers)

**功能**：根据日期过滤货柜（基于显示项）

**修改点**：
- 原逻辑：使用 `getContainerDate(container)` 获取货柜日期
- 新逻辑：使用 `getDisplayItems(container)` 获取货柜的所有显示项，匹配日期

## 🎨 视觉样式

### 主任务样式（实线圆点）

```css
.container-dot.main-task {
  border: 2px solid;
  /* 背景色由状态颜色决定 */
}
```

### 虚线任务样式（虚线圆点）

```css
.container-dot.dashed-task {
  background: transparent !important;
  border: 2px dashed #c0c4cc;
}

.container-dot.dashed-task:hover {
  border-color: #909399;
  transform: scale(1.5);
}
```

## 📈 流转示例

### 正常流程（不需要查验）

#### 阶段1：货柜刚到港

```
目的港：洛杉矶
  ├─ 清关：● (主任务)  |  2024-03-15
  ├─ 提柜：◌ (虚线)    |  2024-03-16
  ├─ 卸柜：◌ (虚线)    |  2024-03-17
  └─ 还箱：◌ (虚线)    |  2024-03-18
```

**显示状态**：
- 清关：`active` → 主任务（实线圆点）
- 提柜/卸柜/还箱：`pending` → 虚线任务

#### 阶段2：清关完成

```
目的港：洛杉矶
  ├─ 清关：❌ 已销毁
  ├─ 提柜：● (主任务)  |  2024-03-16
  ├─ 卸柜：◌ (虚线)    |  2024-03-17
  └─ 还箱：◌ (虚线)    |  2024-03-18
```

**显示状态**：
- 清关：`completed` → 不显示（销毁）
- 提柜：`active` → 主任务（实线圆点）
- 卸柜/还箱：`pending` → 虚线任务

#### 阶段3：提柜完成

```
目的港：洛杉矶
  ├─ 提柜：❌ 已销毁
  ├─ 卸柜：● (主任务)  |  2024-03-17
  └─ 还箱：◌ (虚线)    |  2024-03-18
```

**显示状态**：
- 清关/提柜：`completed` → 不显示（销毁）
- 卸柜：`active` → 主任务（实线圆点）
- 还箱：`pending` → 虚线任务

#### 阶段4：卸柜完成

```
目的港：洛杉矶
  ├─ 卸柜：❌ 已销毁
  └─ 还箱：● (主任务)  |  2024-03-18
```

**显示状态**：
- 清关/提柜/卸柜：`completed` → 不显示（销毁）
- 还箱：`active` → 主任务（实线圆点）

#### 阶段5：还箱完成

```
目的港：洛杉矶
  └─ 所有节点已销毁，不在甘特图显示
```

**显示状态**：
- 所有节点：`completed` → 不显示（销毁）

---

### 查验流程（需要查验，`inspectionRequired = true`）

#### 阶段1：货柜刚到港

```
目的港：洛杉矶（查验流程）
  ├─ 清关：● (主任务)  |  2024-03-15
  ├─ 查验：◌ (虚线)    |  2024-03-16
  ├─ 提柜：◌ (虚线)    |  2024-03-17
  ├─ 卸柜：◌ (虚线)    |  2024-03-18
  └─ 还箱：◌ (虚线)    |  2024-03-19
```

**显示状态**：
- 清关：`active` → 主任务（实线圆点）
- 查验/提柜/卸柜/还箱：`pending` → 虚线任务

#### 阶段2：清关完成，等待查验

```
目的港：洛杉矶（查验流程）
  ├─ 清关：❌ 已销毁
  ├─ 查验：● (主任务)  |  2024-03-16
  ├─ 提柜：◌ (虚线)    |  2024-03-17
  ├─ 卸柜：◌ (虚线)    |  2024-03-18
  └─ 还箱：◌ (虚线)    |  2024-03-19
```

**显示状态**：
- 清关：`completed` → 不显示（销毁）
- 查验：`active` → 主任务（实线圆点）
- 提柜/卸柜/还箱：`pending` → 虚线任务

#### 阶段3：查验完成，准备提柜

```
目的港：洛杉矶（查验流程）
  ├─ 清关：❌ 已销毁
  ├─ 查验：❌ 已销毁
  ├─ 提柜：● (主任务)  |  2024-03-17
  ├─ 卸柜：◌ (虚线)    |  2024-03-18
  └─ 还箱：◌ (虚线)    |  2024-03-19
```

**显示状态**：
- 清关/查验：`completed` → 不显示（销毁）
- 提柜：`active` → 主任务（实线圆点）
- 卸柜/还箱：`pending` → 虚线任务

#### 阶段4：提柜完成

```
目的港：洛杉矶（查验流程）
  ├─ 提柜：❌ 已销毁
  ├─ 卸柜：● (主任务)  |  2024-03-18
  └─ 还箱：◌ (虚线)    |  2024-03-19
```

**显示状态**：
- 清关/查验/提柜：`completed` → 不显示（销毁）
- 卸柜：`active` → 主任务（实线圆点）
- 还箱：`pending` → 虚线任务

#### 阶段5：卸柜完成

```
目的港：洛杉矶（查验流程）
  ├─ 卸柜：❌ 已销毁
  └─ 还箱：● (主任务)  |  2024-03-19
```

**显示状态**：
- 清关/查验/提柜/卸柜：`completed` → 不显示（销毁）
- 还箱：`active` → 主任务（实线圆点）

#### 阶段6：还箱完成

```
目的港：洛杉矶（查验流程）
  └─ 所有节点已销毁，不在甘特图显示
```

**显示状态**：
- 所有节点：`completed` → 不显示（销毁）

---

### 查验异常处理（退运/销毁）

当查验发现问题时：
1. **退运/销毁流程**：在查验记录中跟踪与管理
2. **甘特图流程**：停止跟踪，货柜不在甘特图显示
3. **处理方式**：通过查验管理模块进行特殊处理

## 🔍 数据源映射

### 清关节点

| 数据源 | 字段 | 用途 |
|--------|------|------|
| `PortOperation` | `customsBroker` | 清关行（供应商）|
| `PortOperation` | `plannedCustomsDate` | 计划日期 |
| `PortOperation` | `actualCustomsDate` | 实际日期 |

### 查验节点

| 数据源 | 字段 | 用途 |
|--------|------|------|
| `Container` | `inspectionRequired` | 是否需要查验（开关）|
| `PortOperation` | `customsBroker` | 清关行（供应商，与清关共用）|
| `PortOperation` | `plannedCustomsDate` | 计划日期（与清关共用）|
| `PortOperation` | `actualCustomsDate` | 实际日期（与清关共用）|

### 提柜节点

| 数据源 | 字段 | 用途 |
|--------|------|------|
| `TruckingTransport` | `carrierCompany` | 车队（供应商）|
| `TruckingTransport` | `truckingType === 'pickup'` | 标识提柜 |
| `TruckingTransport` | `plannedPickupDate` | 计划日期 |
| `TruckingTransport` | `pickupDate` | 实际日期 |

### 卸柜节点

| 数据源 | 字段 | 用途 |
|--------|------|------|
| `WarehouseOperation` | `actualWarehouse` / `plannedWarehouse` | 仓库（供应商）|
| `WarehouseOperation` | `operationType === 'INBOUND'` | 标识卸柜 |
| `WarehouseOperation` | `plannedUnloadDate` | 计划日期 |
| `WarehouseOperation` | `unloadDate` | 实际日期 |

### 还箱节点

| 数据源 | 字段 | 用途 |
|--------|------|------|
| `EmptyReturn` | `returnTerminalName` | 还箱终端（供应商）|
| `EmptyReturn` | `plannedReturnDate` | 计划日期 |
| `EmptyReturn` | `returnTime` | 实际日期 |

## 📝 修改文件清单

1. **e:\logix\frontend\src\components\common\SimpleGanttChartRefactored.vue**
   - 添加 `NodeStatus` 接口
   - 添加 `ContainerNodeStatus` 接口（包含查验节点）
   - 添加 `GanttDisplayItem` 接口
   - 实现 `calculateNodeStatus()` 函数（支持查验流程）
   - 实现 `getDisplayItems()` 函数（根据 `inspectionRequired` 选择节点顺序）
   - 实现 `isMainTask()` 函数
   - 实现 `isDashedTask()` 函数
   - 修改 `getContainersByDateAndSupplier()` 函数
   - 修改货柜圆点渲染逻辑
   - 添加主任务和虚线任务样式

## ✅ 测试要点

1. **状态流转测试**
   - [ ] 货柜刚到港时只显示清关为实线，其他为虚线
   - [ ] 清关完成后，清关消失，提柜变为实线
   - [ ] 提柜完成后，提柜消失，卸柜变为实线
   - [ ] 卸柜完成后，卸柜消失，还箱变为实线
   - [ ] 还箱完成后，所有节点消失

2. **样式测试**
   - [ ] 主任务显示为实线圆点，颜色与状态对应
   - [ ] 虚线任务显示为虚线圆点，颜色为灰色
   - [ ] 悬停效果正常

3. **数据完整性测试**
   - [ ] 货柜正确显示在对应日期的格子中
   - [ ] 供应商正确映射到对应的节点
   - [ ] 目的港正确关联到所有节点

## 🐛 已知问题

暂无

## 📌 注意事项

1. **日期处理**：所有日期都转换为 `Date` 对象并设置为当天 00:00:00 进行比较
2. **空值处理**：如果某个节点没有供应商数据，使用默认值"未指定"
3. **状态判断优先级**：实际日期 > 计划日期
4. **查验流程**：`inspectionRequired` 字段控制是否进入查验流程
5. **查验异常**：退运/销毁等特殊情况在查验记录中跟踪，不在甘特图显示
6. **性能优化**：大量货柜时需要考虑虚拟滚动或分页加载

## 🔄 后续优化

1. ~~支持查验节点的独立显示~~ ✅ 已完成
2. 支持节点间的连线显示
3. 支持拖拽调整计划日期
4. 支持批量操作
5. 支持查验记录管理模块（退运/销毁跟踪）

---

## 📊 流程对比表

| 流程类型 | 节点顺序 | 条件 |
|---------|---------|------|
| **正常流程** | 清关 → 提柜 → 卸柜 → 还箱 | `inspectionRequired = false` |
| **查验流程** | 清关 → 查验 → 提柜 → 卸柜 → 还箱 | `inspectionRequired = true` |
| **查验异常** | 停止跟踪，进入查验记录 | 查验发现问题，需要退运/销毁 |
