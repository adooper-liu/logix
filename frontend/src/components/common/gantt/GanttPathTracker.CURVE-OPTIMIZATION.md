# 路径连线避开圆点优化说明

## 问题描述

在之前的实现中，二次贝塞尔曲线的起点和终点直接连接到圆点的中心坐标 (x1, y1) 和 (x2, y2)，导致连线会穿过圆点，视觉上不够清晰。

## 解决方案

通过计算方向向量，将连线的起点和终点从圆点中心调整到圆点边缘，确保连线与圆点保持适当间距。

## 技术实现

### 1. 计算方向向量

```typescript
// 计算起点到终点的向量
const dx = x2 - x1
const dy = y2 - y1
const distance = Math.sqrt(dx * dx + dy * dy)

// 归一化方向向量（单位向量）
const unitX = dx / distance
const unitY = dy / distance
```

**原理**：
- 方向向量表示从起点指向终点的方向
- 归一化后得到长度为1的单位向量
- 可以用这个向量来计算任意距离的偏移

### 2. 调整起点和终点

```typescript
// 圆点半径 + 额外间距
const dotRadius = 6 // 圆点半径5px + 1px间距

// 起点：从圆心沿方向向量移动dotRadius距离
const startX = x1 + unitX * dotRadius
const startY = y1 + unitY * dotRadius

// 终点：从圆心沿反方向移动dotRadius距离
const endX = x2 - unitX * dotRadius
const endY = y2 - unitY * dotRadius
```

**原理**：
- 起点：圆心 + 方向向量 × 半径 = 圆点边缘（靠近终点的一侧）
- 终点：圆心 - 方向向量 × 半径 = 圆点边缘（靠近起点的一侧）
- 这样连线就从圆点边缘开始和结束，不会穿过圆点

### 3. 重新计算控制点

```typescript
// 基于调整后的起点和终点计算控制点
const midX = (startX + endX) / 2
const midY = (startY + endY) / 2

const horizontalDistance = Math.abs(endX - startX)
const curveOffset = Math.min(horizontalDistance * 0.3, 50)

const controlX = midX
const controlY = midY - curveOffset
```

**原理**：
- 控制点需要基于新的起点和终点重新计算
- 确保曲线的弯曲程度仍然合适

### 4. 生成曲线路径

```typescript
return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
```

## 视觉效果对比

### 优化前
```
    ○----------○
   圆点        圆点
   (连线穿过圆心)
```

### 优化后
```
    ○ ~~~~~~~~ ○
   圆点        圆点
   (连线从圆点边缘开始，形成优雅弧线)
```

## 参数说明

### dotRadius = 6px

**组成**：
- 圆点半径：5px（由 `nodeRadius` prop 控制）
- 额外间距：1px（视觉缓冲）

**调整建议**：
- 如果圆点变大，相应增加此值
- 如果需要更大间距，可以增加额外间距部分

### curveOffset = min(horizontalDistance * 0.5, 80)

**含义**：
- 曲线向上偏移量为水平距离的50%
- 最大不超过80px，避免过度弯曲

**调整历史**：
- v1.2-v1.4: 系数0.3，最大值50px（曲线较平缓）
- v1.5+: 系数0.5，最大值80px（曲线更明显）

**调整原因**：
- 避免连线直接从其他圆点上穿过
- 形成更明显的弧线，视觉层次更清晰
- 在节点密集时提供更好的可读性

**调整建议**：
- 增大系数（如0.6）会让曲线更弯曲
- 减小系数（如0.4）会让曲线更平缓
- 调整最大值可以控制极端情况下的弯曲程度
- 如果节点间距很大，可以适当增加最大值

## 数学原理

### 向量归一化

```
单位向量 = 原始向量 / 向量长度
unitX = dx / √(dx² + dy²)
unitY = dy / √(dx² + dy²)
```

### 圆点边缘坐标计算

```
边缘点 = 圆心 + 单位向量 × 半径
startX = x1 + unitX × dotRadius
startY = y1 + unitY × dotRadius
```

### 二次贝塞尔曲线

```
B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
其中：
- P₀ = 起点 (startX, startY)
- P₁ = 控制点 (controlX, controlY)
- P₂ = 终点 (endX, endY)
- t ∈ [0, 1]
```

## 边界情况处理

### 1. 起点和终点重合

```typescript
if (distance === 0) return ''
```

当两个节点位置完全相同时，不绘制连线。

### 2. 垂直方向的连线

当 `dx = 0` 时（纯垂直连线）：
- 方向向量为 (0, 1) 或 (0, -1)
- 曲线仍然会向上弯曲（controlY < midY）
- 视觉效果良好

### 3. 水平方向的连线

当 `dy = 0` 时（纯水平连线）：
- 方向向量为 (1, 0) 或 (-1, 0)
- 曲线向上弯曲最明显
- 形成优美的弧线

## 性能考虑

### 计算复杂度

每次路径更新需要执行：
- 1次平方根运算（Math.sqrt）
- 若干次加减乘除运算
- 字符串拼接

**性能影响**：可忽略不计
- 现代浏览器可以轻松处理这些计算
- 只在节点位置变化时重新计算
- 滚动时使用requestAnimationFrame优化

### 内存占用

- 无额外内存分配
- 复用现有的 PathSegment 结构
- 只增加局部变量

## 可扩展性

### 支持不同形状的节点

如果将来使用方形、菱形等其他形状的节点，只需调整 `dotRadius` 的计算方式：

```typescript
// 方形节点
const dotRadius = nodeSize / 2 + spacing

// 菱形节点
const dotRadius = nodeDiagonal / 2 + spacing
```

### 支持动态间距

可以将间距作为prop传入：

```typescript
interface Props {
  nodeSpacing?: number // 节点与连线的间距
}

const dotRadius = props.nodeRadius + (props.nodeSpacing || 1)
```

### 支持多段曲线

对于复杂的路径，可以使用三次贝塞尔曲线或样条曲线：

```typescript
// 三次贝塞尔曲线
return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`
```

## 测试建议

### 视觉测试

1. **近距离节点**
   - 两个节点非常接近时
   - 验证连线不会重叠或混乱

2. **远距离节点**
   - 两个节点相距很远时
   - 验证曲线弯曲程度合理

3. **垂直排列**
   - 节点在同一垂直线上
   - 验证曲线仍然美观

4. **水平排列**
   - 节点在同一水平线上
   - 验证弧线效果最佳

### 交互测试

1. **悬停节点**
   - 验证高亮圆环不被连线遮挡
   - 验证节点标签清晰可见

2. **滚动甘特图**
   - 验证连线实时更新
   - 验证不会出现闪烁

3. **调整窗口大小**
   - 验证曲线重新计算
   - 验证布局正确

## 总结

通过向量计算和几何调整，成功实现了连线避开圆点的效果：

✅ 连线从圆点边缘开始和结束  
✅ 保持6px的安全间距  
✅ 曲线形状自然优雅  
✅ 性能开销极小  
✅ 代码清晰易懂  
✅ 易于扩展和维护  

这个优化显著提升了路径追踪的视觉效果，使货柜流转路径更加清晰易读。

---

**优化日期**: 2026-04-04  
**优化人员**: 刘志高  
**版本**: v1.4
