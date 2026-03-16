---
name: gantt-drag-drop
description: Implement and maintain drag-and-drop in LogiX Gantt chart. Use when working on gantt drag, drop target detection, drop indicator, or confirm dialog after drop.
---

# 甘特图拖拽实现要点

> 核心文件：`frontend/src/components/common/gantt/useGanttLogic.ts`、`SimpleGanttChartRefactored.vue`
> 相关：**gantt-hierarchy** - 一、二、三级层级结构

## 1. 落点识别（elementFromPoint）

拖拽时用 `elementFromPoint` 精确定位鼠标下的元素，而非依赖 `event.target`（可能被子元素覆盖）：

```typescript
const updateDragOverState = (event: DragEvent) => {
  const elementUnderCursor = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement
  const dateCell = elementUnderCursor?.closest('.date-cell') ?? (event.target as HTMLElement)?.closest('.date-cell')
  if (dateCell) {
    // 解析列索引...
  }
}
```

## 2. 列索引计算

优先用 `data-date-index`，否则用兄弟节点索引：

```typescript
const dateIndexAttr = dateCell.getAttribute('data-date-index')
let dateIndex = -1
if (dateIndexAttr !== null) {
  dateIndex = parseInt(dateIndexAttr, 10)
  if (isNaN(dateIndex)) dateIndex = -1
} else {
  const parent = dateCell.parentElement
  const siblings = parent ? Array.from(parent.children) : []
  dateIndex = siblings.indexOf(dateCell)
}
if (dateIndex >= 0 && dateIndex < dateRange.value.length) {
  const newDate = dateRange.value[dateIndex]
  // ...
}
```

模板中需为每个 date-cell 设置 `:data-date-index="index"`。

## 3. 全局 dragover / drop

在 `document` 上监听，支持拖到任意区域：

```typescript
onMounted(() => {
  document.addEventListener('dragover', handleDragOver)
  document.addEventListener('drop', handleGlobalDrop)
})
onUnmounted(() => {
  document.removeEventListener('dragover', handleDragOver)
  document.removeEventListener('drop', handleGlobalDrop)
})
```

`handleGlobalDrop` 中先 `updateDragOverState(event)` 再 `handleDrop(dragOverDate.value)`，确保落点正确。

## 4. RAF 节流（防卡顿）

每帧最多更新一次高亮状态：

```typescript
let rafId = 0
let lastEvent: DragEvent | null = null
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  lastEvent = event
  if (rafId === 0) {
    rafId = requestAnimationFrame(() => {
      if (lastEvent) updateDragOverState(lastEvent)
      rafId = 0
    })
  }
}
```

## 5. 单格高亮

用 `dropIndicatorCellRect` 记录当前格子的 `getBoundingClientRect()`，用浮层 `.drop-cell-highlight` 只高亮鼠标所在格，避免整行高亮。

## 6. 确认弹窗时机（避免取消需点二次）

**问题**：在 `handleDrop` 中立即弹 `ElMessageBox.confirm`，首次点击「取消」会被浏览器消费，需点两次。

**原因**：`drop` 先于 `dragend` 触发，拖拽结束时浏览器可能仍持有指针捕获，首次点击用于释放。

**做法**：弹窗放到 `handleDragEnd` 中，并用双重 `requestAnimationFrame` 延后：

```typescript
// handleDrop：只存储待确认数据
const pendingDropConfirm = ref<{ container, newDate, updateField, fieldLabel, confirmMsg } | null>(null)
const handleDrop = (date: Date) => {
  if (!draggingContainer.value || !dragOverDate.value) return
  // ... 计算 updateField, fieldLabel, confirmMsg
  pendingDropConfirm.value = { container, newDate, updateField, fieldLabel, confirmMsg }
}

// handleDragEnd：在 dragend 之后弹窗
const handleDragEnd = () => {
  // ... 清理 rafId、draggingContainer、dragOverDate
  const pending = pendingDropConfirm.value
  pendingDropConfirm.value = null
  if (!pending) return

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ElMessageBox.confirm(pending.confirmMsg, '确认调整日期', { ... })
        .then(async () => { /* API 调用 */ })
        .catch((err) => { if (err !== 'cancel') ElMessage.error(...) })
    })
  })
}
```

## 7. 事件顺序

```
用户松手 → drop（落点） → dragend（拖拽源）
```

弹窗必须在 `dragend` 之后、且至少等两帧再显示。

## 8. 模板绑定

- 可拖拽：`draggable="true"` + `@dragstart` + `@dragend` 在 container-dot 上
- 落点区域：date-cell 需 `@dragover.prevent`、`@drop`，以及 `data-date-index`
- 所有 date-cell 和 container-dot 都需支持 dragover/drop，否则落点可能识别不到

## 9. 检查清单

- [ ] date-cell 有 `data-date-index` 或可通过兄弟索引计算
- [ ] 使用 `elementFromPoint` 而非仅 `event.target`
- [ ] document 级 dragover/drop 监听
- [ ] dragover 用 RAF 节流
- [ ] 确认弹窗在 handleDragEnd 中，且用双重 rAF
- [ ] pendingDropConfirm 在 handleDrop 写入、handleDragEnd 读取并清空
