---
name: gantt-hierarchy
description: Implement and maintain the three-level hierarchy (port, node, supplier) in LogiX Gantt chart. Use when working on gantt grouping, collapse/expand, or hierarchy structure.
---

# 甘特图一、二、三级实现要点

> 核心文件：`frontend/src/components/common/SimpleGanttChartRefactored.vue`、`useGanttLogic.ts`
> 相关：**gantt-drag-drop** - 拖拽落点识别与确认弹窗

## 1. 层级结构概览

```
一级：目的港 (port)     → 按 destinationPort 分组
二级：五节点 (node)    → 清关、提柜、卸柜、还箱、查验（+ 未分类）
三级：供应商 (supplier) → 各节点下的实际执行方（清关行、车队、仓库等）
```

## 2. 数据结构

### finalGroupedByPort 类型

```typescript
Record<portCode, Record<nodeName, Record<supplierName, Container[]>>>
// 示例：{ 'USNYC': { '清关': { 'XX清关行': [c1,c2] }, '提柜': { 'YY车队': [c1] }, ... } }
```

### 节点与供应商映射来源

| 节点 | 供应商来源 |
|------|------------|
| 清关 | portOperations.customsBrokerCode / customsBroker（仅当有清关行**或**有计划提柜日时才显示，无时使用"未指定清关公司"） |
| 提柜 | truckingTransports[0].truckingCompanyId / carrierCompany（取第一条，truckingType 为 PRE_SHIPMENT/POST_SHIPMENT 非 'pickup'） |
| 卸柜 | warehouseOperations.warehouseId / actualWarehouse / plannedWarehouse |
| 还箱 | emptyReturns.returnTerminalName → returnTerminalCode → warehouseName（回退到仓库名称） |
| 查验 | 同清关（有 inspectionRequired 时） |
| 未分类 | 无上述映射时兜底 |

**重要**：必须用 `getNodeAndSupplier`（useGanttLogic）按原始数据分组，货柜可出现在多个节点。若用 `getDisplayItems`（仅返回当前 active 节点）分组，会导致只有提柜等单一节点显示圆点。

## 3. 五节点第三级与圆点正确显示（必读）

### 问题现象

仅提柜显示第三级（供应商行）和货柜圆点，清关、卸柜、还箱、查验无圆点或为空。

### 根因

1. **分组**：用 `getDisplayItems` 分组时，每个货柜只出现在当前 active 节点；在「按计划提柜」等筛选下，多数货柜处于提柜阶段，故只有提柜有数据。
2. **日期过滤**：`getContainersByDateAndSupplier` 依赖 `getDisplayItems` 的 `plannedDate`，而 `getDisplayItems` 只含当前节点，无法按各节点分别落格。

### 正确实现

| 环节 | 错误做法 | 正确做法 |
|------|----------|----------|
| 分组 | `getNodeAndSupplierForContainer`（内部用 getDisplayItems） | `getNodeAndSupplier`（useGanttLogic，按原始数据） |
| 日期过滤 | `displayItems.some(item => plannedDate === date)` | `getNodePlannedDate(container, nodeName)` 按节点取计划日期 |

### 实现要点

```typescript
// 1. finalGroupedByPort 使用 getNodeAndSupplier（货柜可出现在多节点）
const nodeSupplierMap = getNodeAndSupplier(container)
nodeSupplierMap.forEach(({ node, supplier }) => {
  groups[portCode][node][supplier].push(container)
})

// 2. getContainersByDateAndSupplier 必须传入 nodeName，按节点取计划日期
const getContainersByDateAndSupplier = (date, containers, nodeName) => {
  return containers.filter(c => {
    const planned = getNodePlannedDate(c, nodeName)
    return planned && dayjs(planned).format('YYYY-MM-DD') === dayjs(date).format('YYYY-MM-DD')
  })
}

// 3. getNodePlannedDate 各节点日期来源
// 清关: plannedCustomsDate || ataDestPort || etaDestPort
// 提柜: deliveryDate || plannedDeliveryDate || pickupDate || plannedPickupDate
// 卸柜: unloadDate || plannedUnloadDate
// 还箱: returnTime || lastReturnDate
// 查验: actualCustomsDate || plannedCustomsDate
```

### 模板调用

```html
getContainersByDateAndSupplier(date, containersBySupplier, node)
```

必须传入 `node`，否则无法按节点正确落格。

## 4. 折叠 key 约定

```typescript
collapsedGroups: Set<string>

// 一级（港口）
`${port}-port`           // 例：'USNYC-port'

// 二级（节点）
`${port}-${node}`        // 例：'USNYC-清关'

// 三级（供应商）
`${port}-${node}-${supplier}`  // 例：'USNYC-清关-XX清关行'
```

## 5. 折叠逻辑（useGanttLogic）

- **一级互斥**：港口级别每次只允许一个展开；展开 A 时自动折叠其他港口
- **二、三级**：节点、供应商正常切换，无互斥

```typescript
const toggleGroupCollapse = (groupKey: string) => {
  if (groupKey.endsWith('-port')) {
    if (collapsedGroups.value.has(groupKey)) {
      // 展开此港口 → 先折叠所有其他港口
      collapsedGroups.value.forEach((_, key) => {
        if (key.endsWith('-port')) collapsedGroups.value.add(key)
      })
      collapsedGroups.value.delete(groupKey)
    } else {
      collapsedGroups.value.add(groupKey)
    }
  } else {
    // 节点/供应商：正常 toggle
    if (collapsedGroups.value.has(groupKey)) collapsedGroups.value.delete(groupKey)
    else collapsedGroups.value.add(groupKey)
  }
}
```

## 6. 模板嵌套结构

```html
<template v-for="(nodesByPort, port) in finalGroupedByPort">
  <!-- 一级：目的港汇总行 -->
  <div class="gantt-data-row port-summary-row">
    <div class="tree-column level-1" @click="toggleGroupCollapse(port + '-port')">...</div>
    <div class="dates-column port-summary-dates">
      <template v-if="isGroupCollapsed(port + '-port')">
        <!-- 折叠：显示该港口下所有货柜圆点 -->
        getContainersByDateAndPort(date, port)
      </template>
      <template v-else>
        <!-- 展开：仅显示未分类货柜圆点 -->
        getUnclassifiedContainersByDateAndPort(date, port)
      </template>
    </div>
  </div>

  <!-- 二级：节点行（仅当港口展开时） -->
  <template v-if="!isGroupCollapsed(port + '-port')">
    <div v-for="(suppliersByNode, node) in filterNormalNodes(nodesByPort)">
      <div class="gantt-data-row node-group-row" @click="toggleGroupCollapse(port + '-' + node)">
        <div class="tree-column level-2">...</div>
        <div class="dates-column node-dates" v-if="!isGroupCollapsed(port + '-' + node)"></div>
      </div>

      <!-- 三级：供应商行（仅当节点展开时） -->
      <template v-if="!isGroupCollapsed(port + '-' + node)">
        <div v-for="(containersBySupplier, supplier) in suppliersByNode">
          <div class="gantt-data-row supplier-row">
            <div class="tree-column level-3" @click="toggleGroupCollapse(port + '-' + node + '-' + supplier)">...</div>
            <div class="dates-column level-3-dates" v-if="!isGroupCollapsed(port + '-' + node + '-' + supplier)">
              <!-- 圆点：getContainersByDateAndSupplier(date, containersBySupplier, node) 必须传 node -->
            </div>
          </div>
        </div>
      </template>
    </div>
  </template>
</template>
```

## 7. 辅助函数

| 函数 | 用途 |
|------|------|
| `filterNormalNodes(nodesByPort)` | 排除「未分类」节点，只保留 清关/提柜/卸柜/还箱/查验 |
| `getTotalContainersInPort(nodesByPort)` | 港口下货柜总数 |
| `getTotalContainersInNode(suppliersByNode)` | 节点下货柜总数 |
| `getContainersByDateAndPort(date, port)` | 某日期、某港口下所有货柜 |
| `getUnclassifiedContainersByDateAndPort(date, port)` | 某日期、某港口下未分类货柜 |
| `getContainersByDateAndSupplier(date, containers, nodeName)` | 某日期、某节点、某供应商货柜列表中落在该日期的货柜 |
| `getNodePlannedDate(container, nodeName)` | 货柜在指定节点的计划日期（清关/提柜/卸柜/还箱/查验） |
| `getSupplierDisplayName(node, codeOrName)` | 三级显示名称 |

### getSupplierDisplayName 显示逻辑

```typescript
case '清关':
case '查验': {
  const fromBackend = containers?.[0]?.supplierNames?.customsBrokerName
  if (fromBackend) return fromBackend
  // "未指定清关公司" 直接返回
  if (codeOrName === '未指定清关公司') return codeOrName
  return customsBrokerMap.value.get(codeOrName) ?? codeOrName
}
case '提柜':
  return truckingCompanyMap.value.get(codeOrName) ?? codeOrName
case '卸柜': {
  const fromBackend = containers?.[0]?.supplierNames?.warehouseName
  if (fromBackend) return fromBackend
  return warehouseMap.value.get(codeOrName) ?? codeOrName
}
case '还箱': {
  // 优先使用还箱码头名称
  const fromBackend = containers?.[0]?.supplierNames?.returnTerminalName
  if (fromBackend) return fromBackend
  // 回退到使用仓库名称
  const warehouseName = containers?.[0]?.supplierNames?.warehouseName
  if (warehouseName) return warehouseName
  return codeOrName
}
```

### 清关节点显示条件（useGanttLogic.getNodeAndSupplier）

```typescript
// 清关节点 - 仅当有清关行或计划提柜日时才显示
const destPortOp = container.portOperations.find(op => op.portType === 'destination')
const customsSupplier = destPortOp?.customsBrokerCode || destPortOp?.customsBroker
const hasPlannedPickup = container.truckingTransports?.[0]?.plannedPickupDate
if (customsSupplier || hasPlannedPickup) {
  const supplier = customsSupplier || '未指定清关公司'
  result.push({ node: '清关', supplier })
}
```

### 还箱节点供应商回退（useGanttLogic.getNodeAndSupplier）

```typescript
// 还箱节点 - 还箱码头（returnTerminalName 优先 → returnTerminalCode → 回退到仓库名称）
if (container.emptyReturns && container.emptyReturns.length > 0) {
  container.emptyReturns.forEach(emptyReturn => {
    let supplier = emptyReturn.returnTerminalName || emptyReturn.returnTerminalCode
    // 回退到使用仓库名称
    if (!supplier && container.warehouseOperations?.[0]) {
      const warehouseOp = container.warehouseOperations[0]
      supplier = warehouseOp.warehouseId || warehouseOp.actualWarehouse || warehouseOp.plannedWarehouse
    }
    if (supplier) {
      result.push({ node: '还箱', supplier })
    }
  })
}
```

## 8. 行高计算

```typescript
const getPortRowHeight = (containerCount: number) => MIN_ROW_HEIGHT + 'px'  // 固定
const getNodeRowHeight = () => NODE_TITLE_ROW_HEIGHT + 'px'  // 二级仅作标题行（如 28px）
const getSupplierRowHeight = (containerCount: number) =>
  Math.max(MIN_ROW_HEIGHT, containerCount * ROW_HEIGHT_PER_CONTAINER) + 'px'
```

## 9. 样式类名

| 层级 | tree-column | 背景 |
|------|-------------|------|
| 一级 | `.tree-column.level-1` | #f5f7fa |
| 二级 | `.tree-column.level-2` | #fafafa |
| 三级 | `.tree-column.level-3` | #fff |

## 10. 默认折叠

`onMounted` 中默认折叠所有港口：

```typescript
nextTick(() => {
  Object.keys(finalGroupedByPort.value).forEach(port => {
    collapsedGroups.value.add(`${port}-port`)
  })
})
```

## 11. 检查清单

- [ ] finalGroupedByPort 使用 getNodeAndSupplier（非 getDisplayItems），货柜可出现在多节点
- [ ] getContainersByDateAndSupplier 传入 nodeName，内部用 getNodePlannedDate 按节点取日期
- [ ] finalGroupedByPort 结构为 port → node → supplier → Container[]
- [ ] 折叠 key 使用 `-port`、`-node`、`-node-supplier` 格式
- [ ] 一级港口互斥展开，二三级正常 toggle
- [ ] 港口折叠时显示全部圆点，展开时港口行只显示未分类
- [ ] filterNormalNodes 排除「未分类」
- [ ] 所有 date-cell 有 data-date-index，支持拖拽落点
- [ ] 清关节点：仅当有清关行**或**有计划提柜日时才显示
- [ ] 清关无数据时使用"未指定清关公司"分组
- [ ] 还箱节点：returnTerminalName > returnTerminalCode > warehouseName 回退
- [ ] getSupplierDisplayName 正确处理各节点供应商名称显示
