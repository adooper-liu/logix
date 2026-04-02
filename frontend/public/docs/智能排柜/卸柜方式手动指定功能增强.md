# 卸柜方式手动指定功能增强

## 📋 概述

从 2026-04-01 起，智能排柜系统支持用户手动指定卸柜方式（`unloadMode`），优先级高于系统自动决策。

## 🎯 功能说明

### 核心规则

**优先级**: 用户指定 > 系统自动决策

```typescript
let unloadMode: 'Drop off' | 'Live load';
if (request.unloadMode) {
  // 用户指定了卸柜方式，直接使用
  unloadMode = request.unloadMode;
  logger.info(`[Scheduling] Container ${container.containerNumber}: Using user-specified unloadMode: ${unloadMode}`);
} else {
  // 系统自动决策：根据车队是否有堆场决定
  unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load';
  logger.info(`[Scheduling] Container ${container.containerNumber}: Auto-determined unloadMode: ${unloadMode} (hasYard=${truckingCompany.hasYard})`);
}
```

### 界面位置

**前端**: `frontend/src/views/scheduling/SchedulingVisual.vue` 顶部操作栏

```
┌─────────────────────────────────────────────────────┐
│ 日期范围：[2026-01-01 至 2026-04-01] │ 目的港：[所有港口] │
│                                                     │
│ ETA 顺延：[0] 天 │ 卸柜方式：[自动决策 ▼] │ 逻辑 │
│                                                     │
│ [预览排产] [手工指定] [返回] [刷新]                 │
└─────────────────────────────────────────────────────┘
```

### 选项说明

| 选项 | 值 | 说明 |
|------|-----|------|
| **自动决策**（默认） | `''` 或 `undefined` | 系统根据车队是否有堆场自动决定 |
| **Drop off (甩挂)** | `'Drop off'` | 强制使用甩挂模式（需要有堆场的车队） |
| **Live load (直提)** | `'Live load'` | 强制使用直提模式 |

## 🔧 技术实现

### 前端修改

#### 1. SchedulingVisual.vue

**文件路径**: `frontend/src/views/scheduling/SchedulingVisual.vue`

**新增变量** (第 1166 行):
```typescript
const unloadMode = ref<'Drop off' | 'Live load' | ''>('') // ✅ 新增：卸柜方式选择
```

**界面元素** (第 32-50 行):
```vue
<!-- 卸柜方式选择 -->
<el-tooltip content="手动指定卸柜方式，优先于系统自动决策" placement="bottom">
  <div class="advanced-setting">
    <span class="filter-label">卸柜方式：</span>
    <el-select
      v-model="unloadMode"
      placeholder="自动决策"
      clearable
      size="small"
      style="width: 140px"
    >
      <el-option label="Drop off (甩挂)" value="Drop off" />
      <el-option label="Live load (直提)" value="Live load" />
    </el-select>
  </div>
</el-tooltip>
```

**传递参数** (第 1718 行):
```typescript
const result = await executeSchedulingFlow({
  country: resolvedCountry.value || undefined,
  portCode: selectedPortCode.value || undefined,
  startDate: dateRange.value?.[0] ? dayjs(dateRange.value[0]).format('YYYY-MM-DD') : undefined,
  endDate: dateRange.value?.[1] ? dayjs(dateRange.value[1]).format('YYYY-MM-DD') : undefined,
  dryRun: true,
  etaBufferDays: etaBufferDays.value,
  unloadMode: unloadMode.value || undefined, // ✅ 新增：卸柜方式参数
})
```

#### 2. useSchedulingFlow.ts

**文件路径**: `frontend/src/composables/useSchedulingFlow.ts`

**新增接口字段** (第 42 行):
```typescript
export interface ScheduleParams {
  // ... 其他字段
  /** 卸柜方式 */
  unloadMode?: 'Drop off' | 'Live load'
}
```

**传递参数** (第 71 行):
```typescript
const result = await containerService.batchSchedule({
  country: params.country,
  portCode: params.portCode,
  startDate: params.startDate,
  endDate: params.endDate,
  dryRun: params.dryRun ?? false,
  etaBufferDays: params.etaBufferDays,
  unloadMode: params.unloadMode, // ✅ 新增：卸柜方式参数
})
```

#### 3. container.ts

**文件路径**: `frontend/src/services/container.ts`

**新增接口字段** (第 201 行):
```typescript
async batchSchedule(params: {
  // ... 其他字段
  unloadMode?: 'Drop off' | 'Live load' // ✅ 新增：卸柜方式参数
}): Promise<{ ... }>
```

### 后端修改

#### 1. scheduling.controller.ts

**文件路径**: `backend/src/controllers/scheduling.controller.ts`

**接收参数** (第 45-95 行):
```typescript
batchSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      country,
      startDate,
      endDate,
      forceSchedule,
      containerNumbers,
      limit,
      skip,
      dryRun,
      etaBufferDays,
      portCode,
      unloadMode, // ✅ 新增：卸柜方式参数
      designatedWarehouseMode,
      designatedWarehouseCode
    } = req.body;

    // ... 日志记录

    const result = await intelligentSchedulingService.batchSchedule({
      country: typeof country === 'string' ? country : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      forceSchedule: !!forceSchedule,
      containerNumbers: Array.isArray(containerNumbers) ? containerNumbers : undefined,
      limit: typeof limit === 'number' ? limit : undefined,
      skip: typeof skip === 'number' ? skip : undefined,
      dryRun: !!dryRun,
      etaBufferDays: typeof etaBufferDays === 'number' ? etaBufferDays : undefined,
      portCode: typeof portCode === 'string' ? portCode : undefined,
      unloadMode: unloadMode as 'Drop off' | 'Live load' | undefined, // ✅ 新增：卸柜方式参数
      designatedWarehouseMode: !!designatedWarehouseMode,
      designatedWarehouseCode: typeof designatedWarehouseCode === 'string' ? designatedWarehouseCode : undefined
    });
```

#### 2. intelligentScheduling.service.ts

**文件路径**: `backend/src/services/intelligentScheduling.service.ts`

**新增接口字段** (第 92 行):
```typescript
export interface ScheduleRequest {
  // ... 其他字段
  
  // ✅ 新增：卸柜方式（可选，优先于系统自动决策）
  unloadMode?: 'Drop off' | 'Live load'; // 用户指定的卸柜方式
}
```

**核心逻辑修改** (第 781-794 行、第 2152-2165 行):

位置 1 - `scheduleSingleContainer` 方法:
```typescript
// 7. 确定卸柜方式（优先级：用户指定 > 系统自动决策）
// ✅ 新增：支持用户手动指定卸柜方式
let unloadMode: 'Drop off' | 'Live load';
if (request.unloadMode) {
  // 用户指定了卸柜方式，直接使用
  unloadMode = request.unloadMode;
  logger.info(`[Scheduling] Container ${container.containerNumber}: Using user-specified unloadMode: ${unloadMode}`);
} else {
  // 系统自动决策：根据车队是否有堆场决定
  // has_yard = true → 支持 Drop off（提<送=卸）
  // has_yard = false → 必须 Live load（提=送=卸）
  unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load';
  logger.info(`[Scheduling] Container ${container.containerNumber}: Auto-determined unloadMode: ${unloadMode} (hasYard=${truckingCompany.hasYard})`);
}
```

位置 2 - `scheduleWithDesignatedWarehouse` 方法:
```typescript
// 6. 确定卸柜方式（优先级：用户指定 > 系统自动决策）
// ✅ 新增：支持用户手动指定卸柜方式
let unloadMode: 'Drop off' | 'Live load';
if (_request.unloadMode) {
  // 用户指定了卸柜方式，直接使用
  unloadMode = _request.unloadMode;
  logger.info(`[Scheduling] Container ${container.containerNumber}: Using user-specified unloadMode: ${unloadMode}`);
} else {
  // 系统自动决策：根据车队是否有堆场决定
  unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load';
  logger.info(`[Scheduling] Container ${container.containerNumber}: Auto-determined unloadMode: ${unloadMode} (hasYard=${truckingCompany.hasYard})`);
}
```

## 📊 数据流图

```
用户操作界面
    │
    ├─> 选择卸柜方式
    │   ├─ 自动决策 (默认)
    │   ├─ Drop off (甩挂)
    │   └─ Live load (直提)
    │
    v
前端传递参数
unloadMode: 'Drop off' | 'Live load' | undefined
    │
    v
后端接收参数
scheduling.controller.ts -> intelligentScheduling.service.ts
    │
    v
决策逻辑
    ├─ 有用户指定？
    │   ├─ 是 → 使用用户指定值
    │   └─ 否 → 系统自动决策
    │
    v
系统自动决策（仅用户未指定时）
unloadMode = truckingCompany.hasYard ? 'Drop off' : 'Live load'
    │
    v
后续计算
- 日期计算（送仓日、卸柜日、还箱日）
- 费用计算（运输费、堆场费等）
- 资源检查（档期、产能等）
```

## 🎨 使用场景

### 场景 1: 特殊业务需求

**背景**: 客户指定必须使用 Live load 模式，即使车队有堆场

**操作**:
1. 在排产界面选择 `卸柜方式: Live load (直提)`
2. 点击 `预览排产`
3. 系统强制使用 Live load 模式

**日志**:
```
[Scheduling] Container CA-S001-001: Using user-specified unloadMode: Live load
```

---

### 场景 2: 成本优化考虑

**背景**: 人工评估后发现使用 Drop off 模式可以降低总成本（避免超期罚款）

**操作**:
1. 在排产界面选择 `卸柜方式: Drop off (甩挂)`
2. 点击 `预览排产`
3. 系统强制使用 Drop off 模式（需要有堆场的车队）

**日志**:
```
[Scheduling] Container CA-S001-001: Using user-specified unloadMode: Drop off
```

---

### 场景 3: 系统自动决策（默认）

**背景**: 无特殊要求，信任系统智能决策

**操作**:
1. 保持 `卸柜方式: 自动决策`（默认值）
2. 点击 `预览排产`
3. 系统根据车队属性自动决定

**日志**:
```
[Scheduling] Container CA-S001-001: Auto-determined unloadMode: Live load (hasYard=false)
```

## ⚠️ 注意事项

### 1. 资源匹配风险

- **风险**: 如果选择 `Drop off` 但所有可用车队都无堆场，可能导致排产失败
- **对策**: 系统会在日志中显示警告，建议切回 `自动决策`

### 2. 费用影响

- **Drop off 模式**: 可能产生堆场堆存费（如提柜日 < 送仓日）
- **Live load 模式**: 无堆场费，但可能产生超期罚款（如已超期）
- **建议**: 在预览模式下查看费用明细后再决定是否手动指定

### 3. 日志记录

- **用户指定**: 系统会记录 `Using user-specified unloadMode`
- **自动决策**: 系统会记录 `Auto-determined unloadMode` 并说明原因（`hasYard=true/false`）
- **审计**: 所有操作都会记录在案，便于后续追溯

## ✅ 测试验证

### 测试用例 1: 用户指定 Drop off

**步骤**:
1. 选择 `卸柜方式: Drop off (甩挂)`
2. 点击 `预览排产`
3. 检查排产结果

**期望结果**:
- ✅ 所有货柜使用 `Drop off` 模式
- ✅ 日志显示 `Using user-specified unloadMode: Drop off`
- ✅ 费用明细包含堆场费（如适用）

---

### 测试用例 2: 用户指定 Live load

**步骤**:
1. 选择 `卸柜方式: Live load (直提)`
2. 点击 `预览排产`
3. 检查排产结果

**期望结果**:
- ✅ 所有货柜使用 `Live load` 模式
- ✅ 日志显示 `Using user-specified unloadMode: Live load`
- ✅ 提=送=卸（同日完成）

---

### 测试用例 3: 自动决策（默认）

**步骤**:
1. 保持 `卸柜方式: 自动决策`
2. 点击 `预览排产`
3. 检查排产结果

**期望结果**:
- ✅ 有堆场车队 → `Drop off`
- ✅ 无堆场车队 → `Live load`
- ✅ 日志显示 `Auto-determined unloadMode` 及原因

## 📖 相关文档

- [卸柜方式确定逻辑详解](./卸柜方式确定逻辑.md)
- [智能排柜系统知识体系整合](./11-project/10-智能排柜与五节点调度最终开发方案.md)
- [排产预览货柜详情字段规范](./11-project/XX-排产预览字段规范.md)

## 🚀 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-04-01 | 新增手动指定卸柜方式功能 |
|      |      | - 前端添加卸柜方式选择框 |
|      |      | - 后端支持接收 `unloadMode` 参数 |
|      |      | - 修改决策逻辑：用户指定 > 系统自动 |
|      |      | - 添加详细日志记录 |

---

**状态**: ✅ 已完成  
**测试**: ⏳ 待验证  
**文档**: ✅ 已更新
