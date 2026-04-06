# 甘特图拖拽策略矩阵

## 业务背景

在物流路径系统中，货柜的卸柜方式分为两种模式：

- **Live load（直装）**：提柜、送仓、卸柜必须在同一天完成
- **Drop off（落地）**：提柜后可以暂存，送仓和卸柜可以晚于提柜日

这两种模式对甘特图拖拽操作有不同的约束要求。

## 核心原则

### Live load 模式（硬约束）

- 提柜日 = 送仓日 = 卸柜日
- 这是业务硬性要求，不允许违反
- 拖拽任一日期时，其他两个日期必须强制同步

### Drop off 模式（软约束）

- 提柜日 <= 送仓日 = 卸柜日
- 送仓日和卸柜日可以晚于提柜日
- 向前拖拽时需要谨慎处理，避免违反约束

### 送仓日的特殊地位

- 送仓日在甘特图中实际没有渲染，只是作为提与卸的一个中间状态指导日期
- 实际是依赖于卸柜日决定的
- LIVE模式下：提 = 送 = 卸
- DROP模式下：提 <= 送 = 卸

## 拖拽快速更新流程

```
获取拖动节点信息 -> 识别前节点 -> 识别后节点 -> 获取目标日期
    |
    v
前向检查: 目标日期 < 前节点日期?
    |-> YES -> 报错: "前节点日期约束" (需手动调整前节点或选择更大日期)
    |-> NO  -> 继续后向判断
        |
        v
后向同步判断:
    |-> 来源日期 < 目标日期(往后移) -> 后续节点自动同步后移
    |-> 来源日期 > 目标日期(往前移) -> 询问用户是否同步前移
    |-> 来源日期 = 目标日期 -> 不同步
```

## 拖拽策略矩阵

### 矩阵一：按卸柜模式 x 拖拽节点类型

| 卸柜模式 | 拖拽节点 | 约束关系  | 前节点检查   | 后节点同步策略                       | 说明                 |
| -------- | -------- | --------- | ------------ | ------------------------------------ | -------------------- |
| **LIVE** | 提柜日   | 提=送=卸  | 目标>=前节点 | **强制同步**: 送仓日、卸柜日同步移动 | 三节点绑定，不可分离 |
| **LIVE** | 送仓日   | 提=送=卸  | 目标>=前节点 | **强制同步**: 提柜日、卸柜日同步移动 | 三节点绑定，不可分离 |
| **LIVE** | 卸柜日   | 提=送=卸  | 目标>=前节点 | **强制同步**: 提柜日、送仓日同步移动 | 三节点绑定，不可分离 |
| **DROP** | 提柜日   | 提<=送=卸 | 目标>=前节点 | **询问同步**: 送仓日、卸柜日可选同步 | 提柜可独立于送/卸    |
| **DROP** | 送仓日   | 提<=送=卸 | 目标>=前节点 | **强制同步**: 卸柜日同步；询问提柜日 | 送=卸绑定，提可独立  |
| **DROP** | 卸柜日   | 提<=送=卸 | 目标>=前节点 | **强制同步**: 送仓日同步；询问提柜日 | 送=卸绑定，提可独立  |

### 矩阵二：前后向检查决策树

| 检查阶段            | 条件                   | 动作                | 用户提示                                                                                            |
| ------------------- | ---------------------- | ------------------- | --------------------------------------------------------------------------------------------------- |
| **前向检查**        | 目标日期 < 前节点日期  | FAIL 阻止拖拽       | "前节点[XXX]日期为YYYY-MM-DD，目标日期不能早于该日期。<br>请手动调整前节点或选择>=YYYY-MM-DD的日期" |
| **前向检查**        | 目标日期 >= 前节点日期 | OK 通过后向判断     | -                                                                                                   |
| **后向判断-往后移** | 来源日期 < 目标日期    | AUTO 自动同步后节点 | "检测到往后移动，后续节点将同步后移至[新日期]"                                                      |
| **后向判断-往前移** | 来源日期 > 目标日期    | ASK 询问用户        | "检测到往前移动，后续节点是否同步前移？<br>[是/否]"                                                 |
| **后向判断-无变化** | 来源日期 = 目标日期    | SKIP 不同步         | -                                                                                                   |

### 矩阵三：节点类型与同步范围

| 拖拽节点                  | LIVE模式同步范围                   | DROP模式同步范围                               | 特殊规则                               |
| ------------------------- | ---------------------------------- | ---------------------------------------------- | -------------------------------------- |
| 提柜日                    | 送仓日 + 卸柜日 + **还箱日(重算)** | 无自动同步(询问) + **还箱日(条件重算)**        | DROP模式下提柜可独立                   |
| 送仓日                    | 提柜日 + 卸柜日 + **还箱日(重算)** | 卸柜日(强制) + 提柜日(询问) + **还箱日(重算)** | 送=卸在DROP下绑定                      |
| 卸柜日                    | 提柜日 + 送仓日 + **还箱日(重算)** | 送仓日(强制) + 提柜日(询问) + **还箱日(重算)** | 卸柜决定送仓日和还箱日                 |
| **还箱日**                | **仅自身**                         | **仅自身**                                     | **最终节点，不同步其他，但需>=卸柜日** |
| 其他节点<br>(海运/港口等) | 仅自身                             | 仅自身                                         | 不涉及提送卸链                         |

### 矩阵四：提柜日拖拽详细策略

| 卸柜模式      | 拖拽方向 | 送仓日处理              | 卸柜日处理              | 还箱日处理       | 用户交互 |
| ------------- | -------- | ----------------------- | ----------------------- | ---------------- | -------- |
| **Live load** | 向后     | **强制同步** = 新提柜日 | **强制同步** = 新提柜日 | 基于新卸柜日重算 | 无询问   |
| **Live load** | 向前     | **强制同步** = 新提柜日 | **强制同步** = 新提柜日 | 基于新卸柜日重算 | 无询问   |
| **Drop off**  | 向后     | 自动同步(如需要)        | 自动同步(如需要)        | 基于新卸柜日重算 | 无询问   |
| **Drop off**  | 向前     | **询问用户**是否同步    | **询问用户**是否同步    | 仅同步时重算     | 弹窗确认 |

### 矩阵五：卸柜日拖拽详细策略

| 卸柜模式      | 拖拽方向 | 提柜日处理              | 送仓日处理              | 还箱日处理       | 用户交互 |
| ------------- | -------- | ----------------------- | ----------------------- | ---------------- | -------- |
| **Live load** | 任意     | **强制同步** = 新卸柜日 | **强制同步** = 新卸柜日 | 基于新卸柜日重算 | 无询问   |
| **Drop off**  | 向后     | 不处理                  | **强制同步** = 新卸柜日 | 基于新卸柜日重算 | 无询问   |
| **Drop off**  | 向前     | 如早于提柜日则询问      | **强制同步** = 新卸柜日 | 基于新卸柜日重算 | 条件询问 |

## 实现细节

### 1. 前向检查函数

```typescript
/**
 * 前向检查：目标日期必须 >= 前节点日期
 */
const performForwardCheck = (
  container: Container,
  currentField: string,
  targetDate: string
): { passed: boolean; errorMessage?: string; sourceDate?: string } => {
  // 定义字段的前置约束关系
  const constraints = [
    { field: 'plannedPickupDate', prevField: 'plannedCustomsDate', label: '计划清关日' },
    { field: 'plannedDeliveryDate', prevField: 'plannedPickupDate', label: '计划提柜日' },
    { field: 'plannedUnloadDate', prevField: 'plannedDeliveryDate', label: '计划送柜日' },
    { field: 'plannedReturnDate', prevField: 'plannedUnloadDate', label: '计划卸柜日' },
  ]

  // 查找当前字段的前置约束
  const constraint = constraints.find(c => c.field === currentField)
  if (!constraint) return { passed: true }

  const prevDate = getFieldValue(container, constraint.prevField)
  if (prevDate && dayjs(targetDate).isBefore(dayjs(prevDate), 'day')) {
    return {
      passed: false,
      errorMessage: `前节点[${constraint.label}]日期为${prevDate}，目标日期不能早于该日期。请手动调整前节点或选择>=${prevDate}的日期`,
    }
  }

  return { passed: true }
}
```

### 2. 后向同步决策函数

```typescript
/**
 * 后向同步决策：根据拖拽方向和卸柜模式决定后续节点是否同步
 */
const performBackwardSyncDecision = (
  container: Container,
  currentField: string,
  targetDate: string,
  isDropOffMode: boolean,
  sourceDate?: string
): { autoSyncFields: string[]; needsUserConfirm: boolean } => {
  if (!sourceDate) return { autoSyncFields: [], needsUserConfirm: false }

  const isForwardDrag = dayjs(targetDate).isBefore(dayjs(sourceDate), 'day')
  const isBackwardDrag = dayjs(targetDate).isAfter(dayjs(sourceDate), 'day')

  // LIVE 模式：强制同步
  if (!isDropOffMode) {
    if (currentField === 'plannedPickupDate' || currentField === 'plannedUnloadDate') {
      return {
        autoSyncFields: ['plannedPickupDate', 'plannedDeliveryDate', 'plannedUnloadDate'].filter(
          f => f !== currentField
        ),
        needsUserConfirm: false,
      }
    }
  }

  // DROP OFF 模式：分层同步
  if (isDropOffMode) {
    // 提柜日拖动
    if (currentField === 'plannedPickupDate') {
      if (isBackwardDrag) {
        // 往后移：检查是否需要自动同步送/卸
        const deliveryDate = getFieldValue(container, 'plannedDeliveryDate')
        if (!deliveryDate || dayjs(targetDate).isAfter(dayjs(deliveryDate), 'day')) {
          return {
            autoSyncFields: ['plannedDeliveryDate', 'plannedUnloadDate'],
            needsUserConfirm: false,
          }
        }
      } else if (isForwardDrag) {
        // 往前移：询问用户
        return { autoSyncFields: [], needsUserConfirm: true }
      }
    }

    // 卸柜日拖动
    if (currentField === 'plannedUnloadDate') {
      const autoSyncFields = ['plannedDeliveryDate']
      const pickupStr = getFieldValue(container, 'plannedPickupDate')

      if (isForwardDrag && pickupStr && dayjs(targetDate).isBefore(dayjs(pickupStr), 'day')) {
        return { autoSyncFields, needsUserConfirm: true }
      }

      return { autoSyncFields, needsUserConfirm: false }
    }
  }

  return { autoSyncFields: [], needsUserConfirm: false }
}
```

### 3. handleDrop 中的调用顺序

```typescript
const handleDrop = (date: Date, nodeName?: string) => {
  // Step 1: 获取基本信息
  const container = draggingContainer.value
  const newDate = dayjs(dragOverDate.value).format('YYYY-MM-DD')
  const { field } = NODE_TO_FIELD_MAP[targetNode]
  const unloadMode = trucking?.unloadModePlan || warehouse?.unloadModePlan
  const isDropOffMode = unloadMode === 'Drop off'

  // Step 2: 前向检查
  const forwardCheckResult = performForwardCheck(container, field, newDate)
  if (!forwardCheckResult.passed) {
    ElMessage.error(forwardCheckResult.errorMessage)
    cleanupDragState()
    return
  }

  // Step 3: 后向同步决策
  const syncDecision = performBackwardSyncDecision(
    container,
    field,
    newDate,
    isDropOffMode,
    forwardCheckResult.sourceDate
  )

  // Step 4: 应用同步决策
  const updateData: Record<string, string> = { [field]: newDate }
  syncDecision.autoSyncFields.forEach(syncField => {
    updateData[syncField] = newDate
  })

  // Step 5: 设置待确认数据
  pendingDropConfirm.value = {
    container,
    newDate,
    updateField: field,
    extraUpdateData: Object.keys(updateData).length > 1 ? updateData : null,
    unloadForwardNeedsPickupConfirm: syncDecision.needsUserConfirm,
    // ...
  }
}
```

## 测试场景

### 场景 1: Live load 模式拖拽提柜日（向后）

**前置条件**:

- 货柜 A，卸柜模式 = Live load
- 当前日期: 提柜日=2024-01-15，送柜日=2024-01-15，卸柜日=2024-01-15

**操作**: 拖拽提柜日到 2024-01-20

**预期结果**:

- 前向检查: PASS（无前节点或目标日期 >= 前节点）
- 后向同步: 自动同步送柜日、卸柜日到 2024-01-20
- 提柜日 = 2024-01-20
- 送柜日 = 2024-01-20（自动同步）
- 卸柜日 = 2024-01-20（自动同步）
- 无弹窗询问

### 场景 2: Live load 模式拖拽提柜日（向前，前节点约束）

**前置条件**:

- 货柜 B，卸柜模式 = Live load
- 当前日期: 清关日=2024-01-18，提柜日=2024-01-20

**操作**: 拖拽提柜日到 2024-01-15

**预期结果**:

- 前向检查: FAIL（目标日期 01-15 < 前节点清关日 01-18）
- 错误提示: "前节点[计划清关日]日期为2024-01-18，目标日期不能早于该日期。请手动调整前节点或选择>=2024-01-18的日期"
- 拖拽被阻止，无任何日期变更

### 场景 3: Drop off 模式向前拖拽提柜日

**前置条件**:

- 货柜 C，卸柜模式 = Drop off
- 当前日期: 提柜日=2024-01-20，送柜日=2024-01-22，卸柜日=2024-01-22

**操作**: 拖拽提柜日到 2024-01-18

**预期结果**:

- 前向检查: PASS
- 后向判断: 来源日期(01-20) > 目标日期(01-18)，往前移，需要询问
- 弹出确认对话框: "检测到往前移动，后续节点是否同步前移？"
- 用户选择"同步调整": 三个日期都变为 2024-01-18
- 用户选择"仅调整提柜日": 只有提柜日变为 2024-01-18

### 场景 4: Drop off 模式向后拖拽提柜日（送柜日冲突）

**前置条件**:

- 货柜 D，卸柜模式 = Drop off
- 当前日期: 提柜日=2024-01-15，送柜日=2024-01-18，卸柜日=2024-01-18

**操作**: 拖拽提柜日到 2024-01-20

**预期结果**:

- 前向检查: PASS
- 后向判断: 来源日期(01-15) < 目标日期(01-20)，往后移，且新提柜日 > 原送柜日
- 自动同步送柜日和卸柜日
- 提柜日 = 2024-01-20
- 送柜日 = 2024-01-20（自动同步）
- 卸柜日 = 2024-01-20（自动同步）
- 无弹窗询问

### 场景 5: Drop off 模式向后拖拽提柜日（无冲突）

**前置条件**:

- 货柜 E，卸柜模式 = Drop off
- 当前日期: 提柜日=2024-01-15，送柜日=2024-01-25，卸柜日=2024-01-25

**操作**: 拖拽提柜日到 2024-01-20

**预期结果**:

- 前向检查: PASS
- 后向判断: 来源日期(01-15) < 目标日期(01-20)，往后移，但新提柜日 <= 原送柜日
- 不同步送柜日和卸柜日
- 提柜日 = 2024-01-20
- 送柜日 = 2024-01-25（保持不变）
- 卸柜日 = 2024-01-25（保持不变）
- 无弹窗询问

### 场景 6: Drop off 模式拖拽卸柜日（向前且早于提柜日）

**前置条件**:

- 货柜 F，卸柜模式 = Drop off
- 当前日期: 提柜日=2024-01-20，送柜日=2024-01-25，卸柜日=2024-01-25

**操作**: 拖拽卸柜日到 2024-01-18

**预期结果**:

- 前向检查: PASS（目标日期 01-18 >= 前节点送柜日 01-25? 需要根据实际数据调整）
- 后向判断: 送柜日强制同步到 01-18，但新卸柜日(01-18) < 提柜日(01-20)
- 弹出确认对话框: "检测到往前移动，后续节点是否同步前移？"
- 用户选择"同步调整": 提柜日也变为 2024-01-18
- 用户选择"仅调整当前节点": 仅送柜日和卸柜日变为 2024-01-18

## 调试日志

实现时应输出以下关键日志：

```typescript
// 前向检查
console.log('[performForwardCheck] 检查前向约束:', {
  field: currentField,
  targetDate,
  prevField: constraint.prevField,
  prevDate,
  passed: result.passed,
})

// 后向同步决策
console.log('[performBackwardSyncDecision] 后向同步决策:', {
  field: currentField,
  sourceDate,
  targetDate,
  isForwardDrag,
  isBackwardDrag,
  isDropOffMode,
  autoSyncFields: decision.autoSyncFields,
  needsUserConfirm: decision.needsUserConfirm,
})

// handleDrop
console.log('[handleDrop] Set pending:', {
  container: container.containerNumber,
  node: targetNode,
  field,
  newDate,
  unloadMode,
  isDropOffMode,
  extraFields: Object.keys(updateData).filter(k => k !== field),
  forwardCheckPassed: forwardCheckResult.passed,
  needsUserConfirm: syncDecision.needsUserConfirm,
})

// handleDragEnd
console.log('[handleDragEnd] 用户选择同步调整')
console.log('[handleDragEnd] 用户选择仅调整当前节点')
```

## 注意事项

1. **还箱日重算**: 当卸柜日变更后，还箱日应该基于新的卸柜日重新计算
   - Live load: 还箱日 = 卸柜日
   - Drop off: 还箱日 = max(卸柜日, 现有还箱日) 或 卸柜日 + 1天
   - **关键**: 当提柜日或卸柜日被同步更新时，必须触发还箱日重算

2. **还箱日拖拽**:
   - 还箱日允许拖拽，但作为最终节点，不会同步其他日期
   - 前向检查确保: 还箱日 >= 卸柜日
   - 后向同步: 无（还箱日是链条的终点）

3. **后端校验**: 后端应保留原有的顺序约束校验
   - 计划清关日 <= 计划提柜日
   - 计划提柜日 <= 计划送仓日
   - 计划送仓日 <= 计划卸柜日
   - 计划卸柜日 <= 计划还箱日

4. **状态更新**: 日期变更后应触发货柜状态的重新计算

5. **缓存清理**: 更新成功后应清理相关缓存

6. **送仓日的特殊性**: 送仓日在甘特图中未渲染，仅为中间状态，实际由卸柜日决定

7. **前向检查优先**: 任何拖拽必须先通过前向检查，避免产生非法数据

8. **后向智能同步**:
   - 往后移：自动同步（业务上合理）
   - 往前移：询问用户（可能影响已安排资源）
   - 平移：不同步（日期未变）

9. **还箱日重算触发时机**:
   - 直接拖拽卸柜日时：自动重算
   - 拖拽提柜日导致卸柜日同步时：**必须手动触发重算**
   - 拖拽送柜日导致卸柜日同步时：**必须手动触发重算**

## 相关文件

- 前端逻辑: `frontend/src/components/common/gantt/useGanttLogic.ts`
- 后端接口: `backend/src/controllers/container.controller.ts` - `updateSchedule`
- 类型定义: `frontend/src/types/container.ts` - `TruckingTransport`, `WarehouseOperation`

## 版本历史

- v2.0 (2026-04-06): 重构拖拽策略，增加前向检查和后向智能同步决策
  - 新增 performForwardCheck 函数：目标日期必须 >= 前节点日期
  - 新增 performBackwardSyncDecision 函数：根据拖拽方向和卸柜模式决定后续节点是否同步
  - LIVE模式：提=送=卸强制同步
  - DROP模式：送=卸绑定，提柜可独立（往前移时询问）
  - 优化用户提示文案，统一为"检测到往前移动，后续节点是否同步前移？"
- v1.0 (2024-01-XX): 初始版本，实现提柜日拖拽的策略矩阵
