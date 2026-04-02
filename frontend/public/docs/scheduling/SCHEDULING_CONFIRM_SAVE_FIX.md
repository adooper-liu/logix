# 排产预览确认保存失败修复报告

## 问题描述

用户在 `SchedulingVisual.vue` 中点击"确认保存"按钮时失败，无法保存选中的货柜排产结果。

## 问题分析

### 1. 调用流程

```
用户点击确认保存
  ↓
handleConfirmSave() (前端)
  ↓
filter selectedResults from previewResults
  ↓
POST /api/v1/scheduling/confirm (containerService.confirmSchedule)
  ↓
SchedulingController.confirmSchedule() (后端)
  ↓
savePreviewResults() (如果有 previewResults)
  ↓
validatePreviewResult() ← 验证失败
```

### 2. 根本原因

后端 `validatePreviewResult()` 方法要求 `plannedData` 必须包含以下字段：

```typescript
// backend/src/controllers/scheduling.controller.ts:2369-2392
private validatePreviewResult(preview: any): boolean {
  if (!preview.containerNumber || !preview.plannedData) {
    return false
  }

  const { plannedData } = preview;

  // 计划日期必须完整
  if (
    !plannedData.plannedPickupDate ||
    !plannedData.plannedUnloadDate ||
    !plannedData.plannedReturnDate
  ) {
    return false
  }

  // 仓库和车队信息必须完整
  if (!plannedData.warehouseId || !plannedData.truckingCompanyId) {
    return false  // ← 验证失败点
  }

  return true
}
```

但前端在转换预览数据时：
- 保留了 `r.plannedData` 原对象（spread 运算符）
- 但未确保 `warehouseId` 和 `truckingCompanyId` 存在
- 后端返回的可能是 `warehouseCode` 或 `truckingCompanyCode`，而非 ID

### 3. 错误表现

- 前端没有明显的错误提示
- 后端返回验证失败错误："预览数据格式不正确"
- Transaction 回滚，保存失败

---

## 修复方案

### 修复 1：数据转换时确保 ID 字段存在

**文件**: `frontend/src/views/scheduling/SchedulingVisual.vue`  
**位置**: 第 1799-1834 行（数据转换逻辑）

```typescript
const transformed = {
  ...r,
  plannedPickupDate: r.plannedData?.plannedPickupDate || '-',
  plannedDeliveryDate: r.plannedData?.plannedDeliveryDate || '-',
  plannedUnloadDate: r.plannedData?.plannedUnloadDate || '-',
  plannedReturnDate: r.plannedData?.plannedReturnDate || '-',
  warehouseName: r.warehouseName || r.plannedData?.warehouseName || '-',
  truckingCompany: r.plannedData?.truckingCompany || r.truckingCompany || '未分配车队',
  unloadMode: r.plannedData?.unloadMode || r.unloadMode || '未指定',
  estimatedCosts: r.plannedData?.estimatedCosts ||
    r.estimatedCosts || {
      transportationCost: 0,
      handlingCost: 0,
      storageCost: 0,
      demurrageCost: 0,
      detentionCost: 0,
      totalCost: 0,
      currency: 'USD',
    },
  lastFreeDate: r.lastFreeDate || '-',
  lastReturnDate: r.lastReturnDate || '-',
  pickupFreeDays: r.pickupFreeDays,
  returnFreeDays: r.returnFreeDays,
  freeDaysRemaining: r.freeDaysRemaining ?? undefined,
  message: r.message || (r.success ? '排产成功' : '排产失败'),
}

// ✅ 关键修复：确保 plannedData 中包含后端需要的 ID 字段
if (r.plannedData) {
  transformed.plannedData = {
    ...r.plannedData,
    // 确保这些字段存在（用于后端验证）
    warehouseId: r.plannedData.warehouseId || r.plannedData.warehouseCode,
    truckingCompanyId: r.plannedData.truckingCompanyId || r.plannedData.truckingCompanyCode,
  }
}
```

**修复逻辑**:
- 如果 `warehouseId` 不存在，尝试使用 `warehouseCode`
- 如果 `truckingCompanyId` 不存在，尝试使用 `truckingCompanyCode`
- 保持其他字段不变

### 修复 2：添加前端验证逻辑

**文件**: `frontend/src/views/scheduling/SchedulingVisual.vue`  
**位置**: `handleConfirmSave()` 方法内（第 1877-1910 行）

```typescript
// ✅ 新增：验证 plannedData 完整性
for (const result of selectedResults) {
  if (!result.plannedData) {
    console.error('[handleConfirmSave] 缺少 plannedData:', result.containerNumber)
    ElMessage.error(`货柜 ${result.containerNumber} 缺少计划数据`)
    return
  }
  const { plannedData } = result
  if (
    !plannedData.warehouseId ||
    !plannedData.truckingCompanyId ||
    !plannedData.plannedPickupDate ||
    !plannedData.plannedUnloadDate ||
    !plannedData.plannedReturnDate
  ) {
    console.error('[handleConfirmSave] plannedData 字段缺失:', {
      containerNumber: result.containerNumber,
      warehouseId: plannedData.warehouseId,
      truckingCompanyId: plannedData.truckingCompanyId,
      plannedPickupDate: plannedData.plannedPickupDate,
      plannedUnloadDate: plannedData.plannedUnloadDate,
      plannedReturnDate: plannedData.plannedReturnDate
    })
    ElMessage.error(`货柜 ${result.containerNumber} 的计划数据不完整`)
    return
  }
}
```

**修复逻辑**:
- 在调用 API 前进行前端验证
- 提前发现数据问题，避免无效请求
- 提供详细的错误日志，便于调试

---

## 验证步骤

### 1. 本地测试

1. 启动前端和后端服务
2. 进入排产可视化页面
3. 选择待排产的货柜
4. 点击"生成排产方案"
5. 勾选部分或全部预览结果
6. 点击"确认保存"

**预期结果**:
- 显示"成功保存 X 个货柜"
- 数据库表更新：
  - `biz_containers.schedule_status = 'issued'`
  - `process_trucking_transport` 插入/更新记录
  - `process_warehouse_operations` 插入/更新记录
  - `process_empty_return` 插入/更新记录

### 2. 日志检查

**前端控制台**应输出：
```
[handleConfirmSave] 保存的预览数据：[...]
[handleConfirmSave] 验证通过，开始提交
```

**后端日志**应输出：
```
[Scheduling] Confirm schedule request: { containerNumbers: [...], hasPreviewResults: true }
[Scheduling] savePlannedDates for CNTR001: { ... }
[Scheduling] Saving trucking for CNTR001: { ... }
[Scheduling] Confirmed X/Y containers
```

### 3. 数据库验证

```sql
-- 检查货柜状态
SELECT container_number, schedule_status 
FROM biz_containers 
WHERE container_number IN ('CNTR001', 'CNTR002');

-- 检查车队运输记录
SELECT container_number, trucking_company_id, 
       planned_pickup_date, planned_delivery_date, planned_return_date
FROM process_trucking_transport
WHERE container_number IN ('CNTR001', 'CNTR002');

-- 检查仓库操作记录
SELECT container_number, warehouse_id, planned_unload_date, unload_mode_actual
FROM process_warehouse_operations
WHERE container_number IN ('CNTR001', 'CNTR002');
```

---

## 影响评估

### 正面影响

✅ 修复确认保存失败问题  
✅ 提高数据验证的透明度  
✅ 改善用户体验（明确的错误提示）  
✅ 减少后端无效请求  

### 潜在风险

⚠️ 如果后端返回的数据既没有 `warehouseId` 也没有 `warehouseCode`，仍会验证失败  
⚠️ 需要确保后端 `schedulePreview` 或 `batchSchedule` 返回的 `plannedData` 中包含正确的字段名  

---

## 后续优化建议

### 1. 统一字段命名

**问题**: 后端返回的可能是 `warehouseCode` 或 `warehouseId`，不一致

**建议**: 
- 后端 API 统一返回 `warehouseId` 和 `truckingCompanyId`
- 或者在前端做一次统一的字段映射转换

### 2. 增强错误处理

**当前**: 简单的 `ElMessage.error()`

**建议**:
- 提供更详细的错误信息（哪个货柜、缺少什么字段）
- 允许用户选择"跳过错误项继续保存"
- 批量保存时支持部分成功

### 3. 添加单元测试

**测试用例**:
```typescript
describe('handleConfirmSave', () => {
  it('应该验证 plannedData 完整性', async () => {
    // 构造缺少 warehouseId 的数据
    // 期望验证失败并提示错误
  })

  it('应该接受完整的 plannedData', async () => {
    // 构造完整数据
    // 期望调用 API 成功
  })
})
```

---

## 相关文档

- 后端验证逻辑：`backend/src/controllers/scheduling.controller.ts:2369-2392`
- 数据保存逻辑：`backend/src/controllers/scheduling.controller.ts:2275-2364`
- 前端数据转换：`frontend/src/views/scheduling/SchedulingVisual.vue:1799-1834`
- 前端验证逻辑：`frontend/src/views/scheduling/SchedulingVisual.vue:1877-1910`

---

**修复时间**: 2026-04-02  
**修复者**: 刘志高  
**状态**: 已完成  
**版本**: v1.0
