---
name: vue-flow-troubleshooting
description: Troubleshoot Vue Flow errors in LogiX. Use when encountering "Cannot read properties of undefined", Handle/Node dimension errors, or Vue Flow rendering issues in FlowEditor.
---

# Vue Flow 问题排查指南

> 核心文件：`frontend/src/views/ai/FlowEditor.vue`  
> 依赖：`@vue-flow/core` ^1.48.2、`@vue-flow/additional-components` ^1.3.3

## 1. 常见错误与修复

### 1.1 `Cannot read properties of undefined (reading 'height')`

**位置**：`vue-flow-core.mjs` 内部，通常在 Node 的 computedPosition 相关 watcher 中。

**原因**：新添加的节点未包含 `dimensions`，Vue Flow 内部访问 `node.dimensions.height` 时 `dimensions` 为 undefined。

**修复**：构建节点时显式提供 `dimensions`：

```typescript
const flowNodes = nodes.map((node, index) => ({
  id: node.id,
  type: 'default',
  position: { x: 250, y: index * 120 },
  data: { label: node.name, node },
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
  dimensions: { width: 180, height: 40 },  // 必须
}))
```

### 1.2 `Cannot read properties of undefined (reading 'target')`

**位置**：Handle 组件的 `onMounted` 钩子，`vue-flow-core.mjs` 约 7012 行。

**原因**：`node.handleBounds` 为 undefined，访问 `node.handleBounds[type.value]`（如 `'source'`、`'target'`）时报错。

**修复**：构建节点时显式提供 `handleBounds`：

```typescript
handleBounds: { source: [], target: [] },
```

### 1.3 `Cannot read properties of undefined (reading 'nodes')`

**位置**：`@node-click` 事件处理函数内，访问 `editingFlow.value.nodes` 时。

**原因**：`editingFlow.value` 或 `event.node` 在部分时机为 undefined（如 API 返回结构不完整、KeepAlive 恢复时）。

**修复**：使用可选链防护：

```typescript
@node-click="(event) => {
  const flowNode = editingFlow.value?.nodes?.find(n => n.id === event.node?.id)
  if (flowNode) selectedNode.value = flowNode
}"
```

### 1.4 `Cannot read properties of undefined (reading 'x')`（拖拽时）

**位置**：`getDragItems` 内，`vue-flow-core.mjs` 约 4172 行。

**原因**：`node.computedPosition` 为 undefined，拖拽时访问 `node.computedPosition.x` 报错。

**修复**：构建节点时显式提供 `computedPosition`（与 position 一致）：

```typescript
const pos = { x: 250, y: index * 120 }
return {
  // ...
  position: pos,
  computedPosition: pos,
}
```

### 1.5 `The options parameter is deprecated... Please use the id parameter instead`

**原因**：`useVueFlow({ id: '...', defaultNodes: [], defaultEdges: [] })` 在非 VueFlow 组件内调用时会触发废弃警告。

**修复**：改为仅传 id 字符串：

```typescript
// 旧（废弃）
useVueFlow({ id: 'flow-editor', defaultNodes: [], defaultEdges: [] })

// 新
useVueFlow('flow-editor')
```

### 1.6 `MISSING_VIEWPORT_DIMENSIONS`

**原因**：Vue Flow 父容器未定义宽高。

**修复**：确保父容器有明确尺寸：

```html
<div class="visual-view" style="width: 100%; height: 400px; min-height: 400px;">
  <VueFlow :nodes="nodes" :edges="edges" />
</div>
```

## 2. 节点结构完整要求

通过 `nodes.value = flowNodes` 或 `addNodes` 直接赋值时，节点必须包含以下字段，否则内部 watcher 会报错：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 必填 |
| `position` | { x, y } | 必填 |
| `type` | string | 默认 'default' |
| `dimensions` | { width, height } | 必填，避免 undefined.height |
| `handleBounds` | { source: [], target: [] } | 必填，避免 undefined['target'] |
| `computedPosition` | { x, y } | 必填，拖拽时 getDragItems 需要，与 position 一致 |

```typescript
// 推荐的最小节点结构
const pos = { x: 250, y: index * 120 }
{
  id: node.id,
  type: 'default',
  position: pos,
  data: { label: node.name, node },
  sourcePosition: Position.Right,
  targetPosition: Position.Left,
  dimensions: { width: 180, height: 40 },
  handleBounds: { source: [], target: [] },
  computedPosition: pos,
}
```

## 3. 排查步骤

1. **定位错误**：错误栈中的 `vue-flow-core.mjs:行号` 指向源码位置
2. **查看对应行**：在 `node_modules/@vue-flow/core/dist/vue-flow-core.mjs` 中查看该行访问了什么属性
3. **补全缺失字段**：若为 `node.xxx.yyy`，则确保 `node.xxx` 存在且结构正确
4. **验证容器**：确保 Vue Flow 父容器有 width/height

## 4. 官方文档参考

- 故障排除：https://vueflow.dev/guide/troubleshooting.html
- 常见错误：`NODE_INVALID`、`MISSING_VIEWPORT_DIMENSIONS`、`EDGE_SOURCE_TARGET_MISSING` 等

## 5. 检查清单

- [ ] 节点包含 `dimensions: { width, height }`
- [ ] 节点包含 `handleBounds: { source: [], target: [] }`
- [ ] 父容器有明确 width/height
- [ ] 边有正确的 `source`、`target` 且对应节点存在
- [ ] 使用 `v-show` 时，首次显示后容器尺寸已计算完成
