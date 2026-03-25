# 智能排产确认流程改进方案

**创建时间**: 2026-03-25  
**优先级**: 高  
**状态**: 待讨论

---

## 🎯 问题分析

### 当前流程（有问题）

```
用户点击"批量排产" 
  ↓
后端自动计算并直接保存 ✅❌
  ↓
返回结果（既成事实）
```

**问题**:
- ❌ 没有预览环节
- ❌ 没有方案选择
- ❌ 没有确认步骤
- ❌ 无法撤销（只能手工调整）

---

## ✨ 理想流程设计

### 方案 A: 完整确认流程（推荐）

```
┌─────────────────────────────────────┐
│ 1. 用户点击"批量排产"                │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 2. 后端预计算（Dry Run）             │
│ - 不写库                            │
│ - 生成排产方案列表                   │
│ - 包含成本评估                       │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 3. 前端展示预览面板                  │
│ - 货柜列表                          │
│ - 计划日期                          │
│ - 卸柜方式（Drop off/Live load）     │
│ - 预估成本                          │
│ - 仓库/车队选择                     │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 4. 用户审查并调整                    │
│ - 可修改卸柜日期                     │
│ - 可切换仓库                         │
│ - 可更换车队                         │
│ - 可调整卸柜方式                     │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 5. 用户点击"确认保存"                 │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ 6. 后端正式保存并扣减产能            │
│ - 更新 process_* 表                  │
│ - 设置 schedule_status = 'issued'   │
│ - 扣减 occupancy                    │
│ - 同步物流状态                      │
└─────────────────────────────────────┘
```

---

### 方案 B: 简化确认流程（快速实现）

```
1. 用户点击"批量排产"
   ↓
2. 后端预计算（Dry Run），返回预览数据
   ↓
3. 前端弹窗展示预览
   ├─ [确认保存] → 正式保存
   └─ [取消] → 不保存
```

---

### 方案 C: 混合模式（灵活配置）

```
配置项：enable_schedule_preview
- true  → 需要确认（预览模式）
- false → 直接保存（快速模式）
```

---

## 🔧 技术实现方案

### 后端改造

#### Step 1: 新增 Dry Run 参数

```typescript
// intelligentScheduling.service.ts
async batchSchedule(
  request: ScheduleRequest & { dryRun?: boolean }
): Promise<BatchScheduleResponse> {
  
  if (request.dryRun) {
    // 预览模式：不写库，只计算
    return await this.scheduleWithoutSaving(request);
  } else {
    // 正式模式：计算并保存
    return await this.scheduleWithSaving(request);
  }
}
```

#### Step 2: 拆分保存逻辑

```typescript
// 原 updateContainerSchedule() 改名为 executeSchedule()
private async executeSchedule(containerNumber: string, plannedData: any): Promise<void> {
  // 实际保存逻辑（事务）
}

// 新增 previewSchedule() 方法
private async previewSchedule(container: Container): Promise<ScheduleResult> {
  // 只计算，不保存
  const plannedData = await this.calculatePlannedDates(container);
  
  return {
    containerNumber: container.containerNumber,
    success: true,
    message: '预览成功',
    plannedData,
    costEstimate: await this.costOptimizerService.evaluateTotalCost(plannedData)
  };
}
```

#### Step 3: 新增确认保存接口

```typescript
// scheduling.controller.ts
/**
 * POST /api/v1/scheduling/confirm
 * 确认并保存排产结果
 */
confirmSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { containerNumbers, previewResults } = req.body;
    
    // 使用预览时的计算结果，正式保存
    const results = [];
    for (const containerNumber of containerNumbers) {
      const plannedData = previewResults.find(
        r => r.containerNumber === containerNumber
      )?.plannedData;
      
      if (!plannedData) continue;
      
      await intelligentSchedulingService.executeSchedule(
        containerNumber,
        plannedData
      );
      
      results.push({ containerNumber, success: true });
    }
    
    res.json({
      success: true,
      savedCount: results.length
    });
  } catch (error) {
    logger.error('[Scheduling] confirmSchedule error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

### 前端改造

#### 新增预览确认组件

```vue
<!-- SchedulingPreviewModal.vue -->
<template>
  <el-dialog
    v-model="visible"
    title="排产预览"
    width="90%"
    :close-on-click-modal="false"
  >
    <!-- 预览数据表格 -->
    <el-table :data="previewResults" max-height="500">
      <el-table-column prop="containerNumber" label="柜号" />
      <el-table-column prop="plannedPickupDate" label="提柜日" />
      <el-table-column prop="plannedUnloadDate" label="卸柜日" />
      <el-table-column prop="unloadMode" label="卸柜方式" />
      <el-table-column prop="warehouseName" label="仓库" />
      <el-table-column prop="truckingCompany" label="车队" />
      <el-table-column prop="costEstimate.totalCost" label="预估成本" />
    </el-table>
    
    <!-- 底部操作按钮 -->
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm" :loading="saving">
        确认保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  confirm: [containerNumbers: string[], previewResults: any[]]
  cancel: []
}>()

const handleConfirm = () => {
  const containerNumbers = previewResults.value.map(r => r.containerNumber)
  emit('confirm', containerNumbers, previewResults.value)
}

const handleCancel = () => {
  emit('cancel')
}
</script>
```

#### 修改批量排产调用

```typescript
// 原来的调用（直接保存）
const result = await containerApi.batchSchedule({
  country: 'GB',
  limit: 50
})

// 新的调用（先预览）
const previewResult = await containerApi.batchSchedule({
  country: 'GB',
  limit: 50,
  dryRun: true  // ← 预览模式
})

// 显示预览弹窗
showPreviewModal(previewResult.results)

// 用户确认后，再调用确认接口
const finalResult = await containerApi.confirmSchedule({
  containerNumbers: selectedContainers,
  previewResults: selectedResults
})
```

---

## 📊 数据结构设计

### 预览结果结构

```typescript
interface SchedulePreviewResult {
  containerNumber: string;
  success: boolean;
  message?: string;
  
  // 计划数据（用户可查看/调整）
  plannedData: {
    plannedCustomsDate: string;
    plannedPickupDate: string;
    plannedDeliveryDate: string;
    plannedUnloadDate: string;
    plannedReturnDate: string;
    truckingCompanyId: string;
    truckingCompanyName: string;
    warehouseId: string;
    warehouseName: string;
    unloadModePlan: 'Drop off' | 'Live load';
    customsBrokerCode: string;
  };
  
  // 成本评估（辅助决策）
  costEstimate: {
    demurrageFee: number;      // 滞港费
    storageFee: number;        // 堆存费
    transportFee: number;      // 运输费
    yardHandlingFee: number;   // 堆场操作费
    totalCost: number;         // 总成本
    isWithinFreePeriod: boolean;
  };
  
  // 资源占用信息
  resourceOccupancy: {
    warehouseRemaining: number;  // 仓库剩余容量
    truckingRemaining: number;   // 车队剩余容量
    returnSlotRemaining: number; // 还箱档期剩余
  };
}
```

---

## 🎨 UI/UX 设计建议

### 1. 预览面板布局

```
┌──────────────────────────────────────────────┐
│ 排产预览 - 5 个货柜                           │
├──────────────────────────────────────────────┤
│ 概览                                         │
│ - 总柜数：5                                   │
│ - 预计总成本：$12,450                        │
│ - Drop off: 3 柜 | Live load: 2 柜            │
├──────────────────────────────────────────────┤
│ 详细列表（表格）                              │
│ ┌──────┬────────┬────────┬────────┬────────┐ │
│ │ 柜号 │ 提柜日 │ 卸柜日 │ 方式   │ 成本   │ │
│ ├──────┼────────┼────────┼────────┼────────┤ │
│ │ A    │ 03-26  │ 03-27  │ Drop   │ $2,340 │ │
│ │ B    │ 03-26  │ 03-26  │ Live   │ $1,890 │ │
│ │ ...  │ ...    │ ...    │ ...    │ ...    │ │
│ └──────┴────────┴────────┴────────┴────────┘ │
├──────────────────────────────────────────────┤
│          [取消]          [确认保存]           │
└──────────────────────────────────────────────┘
```

### 2. 可交互调整

- ✅ 点击日期可修改
- ✅ 下拉选择仓库/车队
- ✅ 切换卸柜方式（有提示）
- ✅ 实时重新计算成本

---

## ⚖️ 优缺点对比

### 方案 A（完整流程）

**优点**:
- ✅ 用户体验最佳
- ✅ 可避免错误排产
- ✅ 支持方案对比
- ✅ 提高决策质量

**缺点**:
- ❌ 开发工作量大（约 3-5 天）
- ❌ 需要前后端配合
- ❌ 增加用户操作步骤

---

### 方案 B（简化流程）

**优点**:
- ✅ 开发工作量小（约 1-2 天）
- ✅ 快速上线
- ✅ 保留确认环节
- ✅ 降低风险

**缺点**:
- ⚠️ 无方案对比
- ⚠️ 无成本评估

---

### 方案 C（混合模式）

**优点**:
- ✅ 灵活性高
- ✅ 可根据场景切换
- ✅ 兼顾效率和安全性

**缺点**:
- ⚠️ 需要配置管理
- ⚠️ 用户可能困惑

---

## 🚀 推荐实施路径

### 阶段 1: 快速修复（本周）

**目标**: 添加基本确认环节

1. 后端添加 `dryRun` 参数支持
2. 前端添加简单预览弹窗
3. 用户确认后才保存

**工作量**: 1-2 天  
**风险**: 低

---

### 阶段 2: 功能完善（下月）

**目标**: 完整的预览确认功能

1. 成本评估集成
2. 可交互调整界面
3. 方案对比功能
4. 批量操作优化

**工作量**: 3-5 天  
**风险**: 中

---

### 阶段 3: 智能优化（长期）

**目标**: AI 辅助决策

1. 多方案自动生成
2. 成本优化建议
3. 风险评估
4. 历史数据学习

**工作量**: 2-3 周  
**风险**: 高

---

## 📝 API 设计

### 现有 API 改造

```typescript
// POST /api/v1/scheduling/batch-schedule
// 新增参数：dryRun (boolean)
{
  "country": "GB",
  "limit": 50,
  "dryRun": true  // ← 新增
}

// 响应不变，但不会写库
{
  "success": true,
  "total": 50,
  "results": [...] // 包含预览数据
}
```

---

### 新增确认 API

```typescript
// POST /api/v1/scheduling/confirm
{
  "containerNumbers": ["CNT001", "CNT002"],
  "previewResults": [
    {
      "containerNumber": "CNT001",
      "plannedData": {...},
      "costEstimate": {...}
    },
    ...
  ]
}

// 响应
{
  "success": true,
  "savedCount": 2,
  "results": [
    {"containerNumber": "CNT001", "success": true},
    {"containerNumber": "CNT002", "success": true}
  ]
}
```

---

## ✅ 验收标准

### 功能验收

- [ ] 预览模式下不写入数据库
- [ ] 预览数据与正式保存一致
- [ ] 用户可取消排产
- [ ] 用户确认后才正式保存
- [ ] 保存失败时有明确错误提示

---

### 性能验收

- [ ] 预览响应时间 < 2 秒（50 柜）
- [ ] 确认保存响应时间 < 5 秒（50 柜）
- [ ] 并发预览不影响性能

---

### 用户体验验收

- [ ] 预览界面清晰易懂
- [ ] 操作按钮位置合理
- [ ] 错误提示友好
- [ ] 支持键盘快捷键

---

## 💭 讨论点

### 1. 是否需要支持部分保存？

**场景**: 预览 50 柜，用户只想保存其中 40 柜

**方案**:
- ✅ 支持勾选部分保存
- ❌ 必须全部保存或取消

---

### 2. 预览数据的有效期？

**方案**:
- 方案 A: 预览数据缓存 30 分钟，超时需重新计算
- 方案 B: 预览数据不缓存，每次都是最新计算
- 方案 C: 预览时锁定产能，确认后释放

---

### 3. 多人同时预览同一批货柜？

**问题**: 产能冲突如何处理？

**方案**:
- 先到先得：第一个确认的用户获得产能
- 乐观锁：保存时检查产能是否变化
- 悲观锁：预览时就锁定产能

---

## 📌 总结

**核心问题**: 当前实现缺少用户确认环节，直接保存排产结果

**推荐方案**: 
- 短期：方案 B（简化确认流程）
- 长期：方案 A（完整确认流程）

**关键价值**:
- ✅ 降低误操作风险
- ✅ 提高用户掌控感
- ✅ 支持决策优化
- ✅ 提升系统可信度

---

**下一步**: 与团队讨论，确定实施方案和优先级
