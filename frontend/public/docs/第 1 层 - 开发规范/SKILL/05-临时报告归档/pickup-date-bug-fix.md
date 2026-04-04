# 提柜日期数据链断裂 BUG 修复

## 📋 问题描述

**现象**：货柜 HMMU6232153 有 STCS 状态事件，但前端显示异常：
- ❌ 关键时间线 - 无提柜节点
- ❌ 货柜表格 - 提柜实际日期 (act) 为空
- ❌ 物流状态无法计算到 PICKED_UP

**数据库状态**（修复前）：
```sql
-- process_port_operations (目的港记录)
gate_out_time:     NULL      ← ❌ 应该 = STCS occurred_at
available_time:    NULL      ← ❌ 应该从 STCS 同步

-- process_trucking_transport
pickup_date:       NULL      ← ❌ 应该 = gate_out_time
```

**根本原因**：`updateCoreFieldsFromStatus()` 方法在 `process_port_operations` 记录不存在时直接跳过，不创建新记录。

---

## 🔍 根因分析

### Bug 代码位置

**文件**: `backend/src/services/feituoImport.service.ts`  
**方法**: `updateCoreFieldsFromStatus()`  
**行号**: 2220-2224

### Bug 逻辑流程

```typescript
// ❌ 错误逻辑
const po = await poRepo
  .createQueryBuilder('p')
  .where('p.container_number = :cn', { cn: containerNumber })
  .andWhere('p.port_type = :pt', { pt: portType })
  .getOne();

if (po) {           // ← BUG: 如果 po 为空，直接跳过
  // ... 更新核心字段
}
```

### 触发场景

1. **Excel 导入 STCS 事件** → `status_code='STCS'`, `occurred_at='2026-03-30 19:48'`
2. **调用 `updateCoreFieldsFromStatus()`** → `fieldName='gate_out_time'`, `portType='destination'`
3. **查询 `process_port_operations`** → 可能只有 `origin` 记录，没有 `destination` 记录
4. **`if (po)` 检查失败** → 跳过更新，不创建记录
5. **结果**：`gate_out_time` 永远为 NULL

### 数据链断裂路径

```
STCS 事件 (ext_container_status_events)
  ↓ 应该触发
process_port_operations.gate_out_time  ← ❌ 未更新（记录不存在）
  ↓ 应该同步
process_trucking_transport.pickup_date  ← ❌ 未同步
  ↓ 导致
关键时间线 - 无提柜节点
货柜表格 - 提柜实际日期为空
物流状态 - 无法计算到 PICKED_UP
```

---

## ✅ 修复方案

### 修复原则

1. **记录不存在则创建**：如果 `process_port_operations` 没有对应记录，创建它
2. **强制同步 pickup_date**：更新 `gate_out_time` 时强制同步到 `pickup_date`
3. **日志追踪**：记录所有创建和同步操作，便于排查

### 修复后代码

**文件**: `backend/src/services/feituoImport.service.ts`  
**行号**: 2216-2287

```typescript
} else {
  const portType = ['transit_arrival_date', 'atd'].includes(fieldName)
    ? 'transit'
    : 'destination';
  
  // 🔧 使用 let 而不是 const，允许重新赋值
  let po = await poRepo
    .createQueryBuilder('p')
    .where('p.container_number = :cn', { cn: containerNumber })
    .andWhere('p.port_type = :pt', { pt: portType })
    .getOne();
  
  // 🔧 BUG FIX: 如果记录不存在，创建它（而不是跳过）
  // 场景：STCS/GTOT 等目的港事件发生时，可能 process_port_operations 只有 origin 记录
  if (!po) {
    po = poRepo.create({
      containerNumber,
      portType,
      portSequence: portType === 'origin' ? 1 : 2  // 默认序列：起运港=1, 目的港=2
    });
    logger.info(
      `[FeituoImport] 创建 ${portType} process_port_operations 记录：${containerNumber}`
    );
  }
  
  const map: Record<string, keyof PortOperation> = {
    ata: 'ataDestPort',
    eta: 'etaDestPort',
    gate_in_time: 'gateInTime',
    gate_out_time: 'gateOutTime',
    dest_port_unload_date: 'destPortUnloadDate',
    available_time: 'availableTime',
    transit_arrival_date: 'transitArrivalDate',
    atd: 'atdTransit'
  };
  const col = map[fieldName];
  if (col) {
    (po as any)[col] = occurredAt;
    await poRepo.save(po);
    logger.info(
      `[FeituoImport] 更新核心字段：${containerNumber} ${fieldName}=${occurredAt.toISOString()}`
    );

    // 🔧 目的港 GATE_OUT/GTOT/STCS → 强制同步 pickup_date
    // 遵循单一数据源规范：pickup_date = gate_out_time
    if (fieldName === 'gate_out_time' && col === 'gateOutTime') {
      let tt = await ttRepo.findOne({ where: { containerNumber } });
      
      if (!tt) {
        tt = ttRepo.create({ containerNumber });
      }
      
      // 保留来源检查但记录警告
      const oldPickupDate = tt.pickupDate;
      const canOverwrite = canFeituoOverwritePickupDate(tt?.pickupDateSource);
      
      if (!canOverwrite) {
        logger.warn(
          `[FeituoImport] 提柜日期来源为 ${tt.pickupDateSource}，飞驼事件 ${statusCode} 无法覆盖。` +
          `建议：以 gate_out_time 为准手动修正 pickup_date`
        );
      } else {
        tt.pickupDate = occurredAt;
        tt.pickupDateSource = PICKUP_DATE_SOURCE.FEITUO;
        await ttRepo.save(tt);
        logger.info(
          `[FeituoImport] 同步提柜日期：${containerNumber} ` +
          `gate_out_time=${occurredAt.toISOString()}, ` +
          `pickup_date=${oldPickupDate ? oldPickupDate.toISOString() : 'null'} -> ${tt.pickupDate.toISOString()}`
        );
      }
    }
  }
}
```

### 关键改进点

#### 1. 记录不存在则创建

```typescript
if (!po) {
  po = poRepo.create({
    containerNumber,
    portType,
    portSequence: portType === 'origin' ? 1 : 2
  });
  logger.info(`[FeituoImport] 创建 ${portType} process_port_operations 记录：${containerNumber}`);
}
```

**效果**：确保 `process_port_operations` 记录始终存在，可以更新

#### 2. 内联同步逻辑（移除工具函数依赖）

```typescript
// 🔧 直接实现同步逻辑，不再依赖 tryApplyFeituoPickupFromGateOutEvent()
let tt = await ttRepo.findOne({ where: { containerNumber } });
if (!tt) {
  tt = ttRepo.create({ containerNumber });
}

const canOverwrite = canFeituoOverwritePickupDate(tt?.pickupDateSource);
if (!canOverwrite) {
  logger.warn(`提柜日期来源为 ${tt.pickupDateSource}，无法覆盖`);
} else {
  tt.pickupDate = occurredAt;
  tt.pickupDateSource = PICKUP_DATE_SOURCE.FEITUO;
  await ttRepo.save(tt);
}
```

**效果**：简化逻辑，避免工具函数的复杂检查导致同步失败

#### 3. 增强日志记录

```typescript
logger.info(`[FeituoImport] 创建 ${portType} process_port_operations 记录：${containerNumber}`);
logger.info(`[FeituoImport] 更新核心字段：${containerNumber} ${fieldName}=${occurredAt.toISOString()}`);
logger.info(`[FeituoImport] 同步提柜日期：${containerNumber} gate_out_time=..., pickup_date=... -> ...`);
logger.warn(`[FeituoImport] 提柜日期来源为 ${tt.pickupDateSource}，无法覆盖`);
```

**效果**：完整的审计追踪，便于排查问题

---

## 📊 影响范围

### 受影响的场景

1. ✅ **Excel 导入 STCS/GTOT/GATE_OUT 事件** → 自动创建目的港记录并更新时间
2. ✅ **Excel 导入其他目的港事件** → 自动创建记录（如 DSCH → dest_port_unload_date）
3. ✅ **首次导入的事件** → 如果 `process_port_operations` 不存在，自动创建

### 不受影响的场景

1. ❌ **手动修改界面数据** → 不受影响（走不同代码路径）
2. ❌ **API 批量更新** → 不受影响（有自己的逻辑）

---

## 🧪 验证步骤

### Step 1: 编译 TypeScript

```bash
cd d:\Gihub\logix\backend
npm run build
```

### Step 2: 重启后端服务

```bash
# 停止现有服务
# 启动新服务
npm run start:dev
```

### Step 3: 重新导入测试数据

1. 删除 HMMU6232153 的现有数据（可选）
2. 重新导入包含 STCS 事件的 Excel
3. 观察后端日志

### Step 4: 检查数据库

```sql
SELECT 
  po.container_number,
  po.port_type,
  po.gate_out_time,
  po.available_time,
  tt.pickup_date,
  tt.pickup_date_source,
  CASE 
    WHEN po.gate_out_time IS NOT NULL AND tt.pickup_date IS NOT NULL THEN '✅ OK'
    ELSE '❌ FAIL'
  END AS status
FROM process_port_operations po
LEFT JOIN process_trucking_transport tt ON po.container_number = tt.container_number
WHERE po.container_number = 'HMMU6232153'
  AND po.port_type = 'destination';
```

**预期结果**：
```
gate_out_time:     2026-03-30 19:48:00  ✅
available_time:    2026-03-30 19:48:00  ✅ (如果 STCS 也更新这个字段)
pickup_date:       2026-03-30 19:48:00  ✅
pickup_date_source: feituo              ✅
status:            ✅ OK                ✅
```

### Step 5: 检查前端显示

1. ✅ **关键时间线** - 提柜节点显示（STCS + FETA）
2. ✅ **货柜表格** - 提柜实际日期 (act) = 2026-03-30
3. ✅ **物流状态** - PICKED_UP 或 RETURNED_EMPTY

---

## 📝 相关修改

### 文件清单

1. ✅ `backend/src/services/feituoImport.service.ts`
   - 修改 `updateCoreFieldsFromStatus()` 方法
   - 添加记录不存在时的创建逻辑
   - 内联同步 `pickup_date` 逻辑

2. ✅ `backend/src/services/feituoImport.service.ts` (imports)
   - 添加 `canFeituoOverwritePickupDate` 导入
   - 移除 `tryApplyFeituoPickupFromGateOutEvent` 导入（不再需要）

### 依赖变更

- ✅ 新增依赖：`canFeituoOverwritePickupDate` (from `../constants/pickupDateSource`)
- ✅ 移除依赖：`tryApplyFeituoPickupFromGateOutEvent` (from `../utils/truckingPickupFromFeituo`)

---

## 🎯 长期优化建议

### 1. 数据一致性校验任务

定期扫描 `ext_container_status_events` 和 `process_port_operations`，自动修复不一致：

```sql
-- 查找有 STCS 事件但 gate_out_time 为空的记录
SELECT 
  c.container_number,
  e.occurred_at AS stcs_time,
  po.gate_out_time
FROM biz_containers c
JOIN ext_container_status_events e 
  ON c.container_number = e.container_number AND e.status_code = 'STCS'
LEFT JOIN process_port_operations po 
  ON c.container_number = po.container_number AND po.port_type = 'destination'
WHERE po.gate_out_time IS NULL;
```

### 2. 统一入口

将 `updateCoreFieldsFromStatus()` 提升为公共服务，供所有导入方式使用：
- ✅ Excel 导入
- ✅ API 同步
- ✅ 手动修改

### 3. 单元测试

为核心逻辑添加单元测试：

```typescript
describe('updateCoreFieldsFromStatus', () => {
  it('应该创建缺失的 process_port_operations 记录', async () => {
    // 准备：删除目的港记录
    await poRepo.delete({ containerNumber: 'TEST123', portType: 'destination' });
    
    // 执行：导入 STCS 事件
    await service.updateCoreFieldsFromStatus('TEST123', 'STCS', new Date());
    
    // 验证：记录被创建且 gate_out_time 已更新
    const po = await poRepo.findOne({ where: { containerNumber: 'TEST123', portType: 'destination' } });
    expect(po).toBeDefined();
    expect(po.gateOutTime).toBeDefined();
  });
});
```

---

## 📚 参考文档

- [STCS 问题诊断报告](./temp/stcs-issue-diagnosis.md)
- [提柜日期一致性修复方案](./temp/pickup-date-consistency-fix.md)
- [提柜时间字段单一数据源规范](../DEVELOPMENT_STANDARDS.md)

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**作者**: AI Assistant  
**状态**: ✅ 已实施
