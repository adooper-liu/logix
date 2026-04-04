# 提柜节点数据一致性修复方案

## 问题核心

### ① 关键时间线与货柜表格的依赖关系不统一

**现状**：
- ❌ **关键时间线**：依赖 `process_port_operations.gate_out_time`
- ❌ **货柜表格 - 提柜实际日期 (act)**：依赖 `process_trucking_transport.pickup_date`

**问题**：
同一个提柜行为，应该在两个地方显示相同的日期，但现在使用了**两个不同的数据源**，导致：
1. 数据不一致：一个有值，一个为空
2. 维护困难：需要同时更新两个表才能保持一致
3. 逻辑混乱：不清楚应该以哪个为准

### ② process_port_operations 与 process_trucking_transport 都为空

**HMMU6232153 的实际情况**：
```json
{
  "process_port_operations": {
    "gate_out_time": null  // ❌ 空
  },
  "process_trucking_transport": {
    "pickup_date": null    // ❌ 空
  }
}
```

虽然有 STCS 状态事件（2026-03-30 11:48），但两个核心字段都没有更新。

---

## 正确的状态码优先级分析

### 飞驼事件 → 核心字段映射优先级

根据 `FeiTuoStatusMapping.ts`，与提柜相关的状态码有以下优先级：

#### 优先级顺序（按业务时间顺序）

```
1. PCAB/AVLE/AVAIL (可提货 Available)
   ↓ available_time
   意义：货柜已到港并可提货
   
2. STCS (提柜 Gate Out for Delivery) ← 关键
   ↓ gate_out_time
   意义：货柜已出闸提柜
   
3. GTOT (提柜 Gate Out)
   ↓ gate_out_time  
   意义：同 STCS，另一种表述
   
4. GATE_OUT (闸口外出)
   ↓ gate_out_time
   意义：通用闸口外出事件
   
5. FETA (交货地抵达 Delivery Arrived)
   ↓ ata (目的港到达)
   意义：已到达交货地（可能是仓库/堆场，不一定是提柜）
   
6. STRP (拆箱 Stripping)
   ↓ stripping_date
   意义：已完成拆箱（提柜后的操作）
```

### 业务时间线（正确顺序）

```
BDAR (抵港) 
  ↓ ata = '2026-03-17 15:41'
  
POCA (可提货)
  ↓ available_time = '2026-03-21 15:13'
  
DSCH (卸船)
  ↓ dest_port_unload_date = '2026-03-22 07:48'
  
STCS (已提柜) ← 这里应该触发更新
  ↓ gate_out_time = '2026-03-30 11:48'  ✅ 应写入
  ↓ pickup_date = '2026-03-30 11:48'    ✅ 应同步写入
  
FETA (交货地抵达)
  ↓ ata = '2026-03-17 15:41'  (注意：这个时间早于 STCS，可能是到港时间)
  
RCVE (还箱)
  ↓ return_time = '2026-04-01 12:47'
```

**问题**：STCS 发生了，但没有触发 `gate_out_time` 和 `pickup_date` 的更新。

---

## 现有代码逻辑分析

### 代码路径 1：飞驼 API 同步

```typescript
// externalDataService.ts (L1217-L1228)
if (coreFieldName === 'gate_out_time') {
  const applied = tryApplyFeituoPickupFromGateOutEvent({
    trucking: truckingMut,
    containerNumber,
    eventTime,
    statusCode: event.statusCode,  // STCS/GTOT/GATE_OUT
    createTrucking: () =>
      this.truckingTransportRepository.create({ containerNumber })
  });
  truckingMut = applied.trucking;
  if (applied.updated) truckingPickupUpdated = true;
}
```

**逻辑**：
1. 当更新 `gate_out_time` 时
2. 调用 `tryApplyFeituoPickupFromGateOutEvent()` 尝试更新 `pickup_date`
3. 检查来源是否允许覆盖（业务/手工录入的不覆盖）
4. 如果更新时间更晚，则更新

### 代码路径 2：飞驼 Excel 导入

```typescript
// feituoImport.service.ts (L2241-L2253)
if (fieldName === 'gate_out_time' && col === 'gateOutTime') {
  const tt = await ttRepo.findOne({ where: { containerNumber } });
  const applied = tryApplyFeituoPickupFromGateOutEvent({
    trucking: tt,
    containerNumber,
    eventTime: occurredAt,
    statusCode,
    createTrucking: () => ttRepo.create({ containerNumber })
  });
  if (applied.updated && applied.trucking) {
    await ttRepo.save(applied.trucking);
  }
}
```

**逻辑**：与 API 同步相同，都是调用同一个工具函数。

### 工具函数：tryApplyFeituoPickupFromGateOutEvent

```typescript
// truckingPickupFromFeituo.ts
const GATE_OUT_CODES_FOR_TRUCKING_PICKUP = new Set(['GATE_OUT', 'GTOT', 'STCS']);

export function tryApplyFeituoPickupFromGateOutEvent(options) {
  const sc = String(options.statusCode ?? '').trim().toUpperCase();
  
  // 检查 1：必须是目的港事件
  if (getPortTypeForStatusCode(sc) !== 'destination') {
    return { trucking: options.trucking, updated: false };
  }
  
  // 检查 2：必须是 STCS/GTOT/GATE_OUT 之一
  if (!isFeituoGateOutForTruckingPickup(sc)) {
    return { trucking: options.trucking, updated: false };
  }
  
  // 检查 3：来源是否允许覆盖
  let tt = options.trucking;
  if (!canFeituoOverwritePickupDate(tt?.pickupDateSource)) {
    return { trucking: tt, updated: false };
  }
  
  // 检查 4：新时间必须更晚
  if (!tt) {
    tt = options.createTrucking();
  }
  const cur = tt.pickupDate;
  if (cur && options.eventTime.getTime() <= new Date(cur).getTime()) {
    return { trucking: tt, updated: false };
  }
  
  // ✅ 更新
  tt.pickupDate = options.eventTime;
  tt.pickupDateSource = PICKUP_DATE_SOURCE.FEITUO;
  return { trucking: tt, updated: true };
}
```

**逻辑验证**：
1. ✅ 检查港口类型：STCS → destination（通过）
2. ✅ 检查状态码：STCS 在集合中（通过）
3. ⚠️ 检查来源：如果当前是 business/manual，则不覆盖
4. ⚠️ 检查时间：如果有旧值且新时间不更晚，则不更新

---

## 为什么 STCS 没有触发更新？

### 可能的原因

#### 原因 1：`updateCoreFieldsFromStatus()` 未被调用

**检查点**：
- Excel 导入时是否正确调用了该方法？
- 调用的时机是否正确？

**代码位置**：`feituoImport.service.ts:2186`

```typescript
private async updateCoreFieldsFromStatus(
  containerNumber: string,
  statusCode: string,
  occurredAt: Date
): Promise<void> {
  const fieldName = getCoreFieldName(statusCode);  // STCS → 'gate_out_time'
  if (!fieldName) return;
  
  // ... 更新 logic
}
```

**调用链**：
```
processStatusArray() (L2122)
  ↓
  updateCoreFieldsFromStatus() (L2174)
    ↓
    仅当 (!status.isEstimated || isFinalStatus) 时调用
```

**关键发现**：
```typescript
// L2170-L2173
const FINAL_STATUS_CODES = ['RCVE', 'STCS', 'GTOT', 'GTIN', 'DSCH', 'BO', 'DLPT'];
const isFinalStatus = FINAL_STATUS_CODES.includes(status.statusCode);

if ((!status.isEstimated || isFinalStatus) && status.occurredAt) {
  await this.updateCoreFieldsFromStatus(
    containerNumber,
    status.statusCode,
    status.occurredAt
  );
}
```

✅ **STCS 在 FINAL_STATUS_CODES 中**，即使是预计状态也会更新。

#### 原因 2：process_port_operations 记录不存在

**问题**：
```typescript
// L2220-L2224
const po = await poRepo
  .createQueryBuilder('p')
  .where('p.container_number = :cn', { cn: containerNumber })
  .andWhere('p.port_type = :pt', { pt: portType })  // 'destination'
  .getOne();

if (po) {  // ← 如果 po 为空，则不会执行后续更新
  // ... 更新逻辑
}
```

**HMMU6232153 的情况**：
- 数据库中可能有 `process_port_operations` 记录（因为有 FETA/BDAR 等事件）
- 但可能 `port_type='origin'` 而不是 `'destination'`

**验证 SQL**：
```sql
SELECT * FROM process_port_operations 
WHERE container_number = 'HMMU6232153'
ORDER BY port_sequence DESC;
```

#### 原因 3：来源检查阻止了更新

**场景**：
1. 之前已有业务录入的 `pickup_date`（来源=business）
2. STCS 事件后来才到
3. `canFeituoOverwritePickupDate('business')` 返回 false
4. 更新被阻止

**检查函数**：
```typescript
// pickupDateSource.ts
export function canFeituoOverwritePickupDate(source: string | null | undefined): boolean {
  if (source == null || String(source).trim() === '') return true;
  return String(source).trim().toLowerCase() === PICKUP_DATE_SOURCE.FEITUO;
}
```

**逻辑**：
- ✅ 来源为空或 'feituo' → 可以覆盖
- ❌ 来源为 'business' 或 'manual' → 不可覆盖

#### 原因 4：时间检查阻止了更新

**场景**：
1. 已有 `pickup_date = '2026-03-30 12:00'`
2. STCS 事件时间 = `'2026-03-30 11:48'`
3. 新时间 ≤ 旧时间 → 不更新

**代码**：
```typescript
// L44-L46
if (cur && options.eventTime.getTime() <= new Date(cur).getTime()) {
  return { trucking: tt, updated: false };
}
```

---

## 正确的数据一致性设计

### 原则：单一真相源（Single Source of Truth）

**设计方案**：

#### 方案 A：以 gate_out_time 为唯一真相源

```typescript
// 提柜日期的唯一来源：process_port_operations.gate_out_time
process_trucking_transport.pickup_date = process_port_operations.gate_out_time

// 优点：
// 1. 数据一致：两个表的值永远相同
// 2. 维护简单：只需更新一个地方
// 3. 逻辑清晰：gate_out_time 是因，pickup_date 是果

// 缺点：
// 1. 需要额外的同步逻辑
// 2. pickup_date 失去了独立性
```

#### 方案 B：独立维护，接受差异

```typescript
// gate_out_time: 码头闸口外出时间（精确到分钟）
// pickup_date: 车队实际提柜日期（精确到日）

// 允许两者有细微差异：
// - gate_out_time: 2026-03-30 11:48:00 (闸口记录)
// - pickup_date: 2026-03-30 00:00:00 (车队记录，可能来自 Excel)

// 优点：
// 1. 保持独立性
// 2. 适应不同业务场景

// 缺点：
// 1. 数据可能不一致
// 2. 前端展示困惑
```

#### 推荐方案：A（统一数据源）

**理由**：
1. 提柜行为的本质是"出闸"，gate_out_time 是更准确的真相源
2. 前端的关键时间线和货柜表格应该显示相同的值
3. 减少数据维护复杂度

---

## 修复方案

### 修复 1：确保 process_port_operations 记录存在

**问题**：如果没有目的港记录，`updateCoreFieldsFromStatus()` 无法更新。

**修复代码**：
```typescript
// feituoImport.service.ts:2220-2256
const po = await poRepo
  .createQueryBuilder('p')
  .where('p.container_number = :cn', { cn: containerNumber })
  .andWhere('p.port_type = :pt', { pt: portType })
  .getOne();

if (!po) {
  // 🔧 新增：如果记录不存在，创建它
  po = poRepo.create({
    containerNumber,
    portType: 'destination',
    portSequence: 1  // 假设是第一个目的港操作
  });
}

// 继续更新...
const col = map[fieldName];
if (col) {
  (po as any)[col] = occurredAt;
  await poRepo.save(po);  // INSERT or UPDATE
}
```

### 修复 2：强制同步 pickup_date 到 gate_out_time

**问题**：当前的 `tryApplyFeituoPickupFromGateOutEvent()` 有太多限制条件。

**修复代码**：
```typescript
// feituoImport.service.ts:2241-2253
if (fieldName === 'gate_out_time' && col === 'gateOutTime') {
  // 🔧 强制同步：只要更新了 gate_out_time，就同步更新 pickup_date
  let tt = await ttRepo.findOne({ where: { containerNumber } });
  
  if (!tt) {
    tt = ttRepo.create({ containerNumber });
  }
  
  // 无条件同步（或者保留来源检查，但日志警告）
  const oldPickupDate = tt.pickupDate;
  tt.pickupDate = occurredAt;  // 直接使用 gate_out_time 的值
  tt.pickupDateSource = PICKUP_DATE_SOURCE.FEITUO;
  
  await ttRepo.save(tt);
  
  logger.info(
    `[FeituoImport] 同步提柜日期：${containerNumber} ` +
    `gate_out_time=${occurredAt.toISOString()}, ` +
    `pickup_date=${oldPickupDate ? oldPickupDate.toISOString() : 'null'} -> ${tt.pickupDate.toISOString()}`
  );
}
```

### 修复 3：添加数据一致性校验

**新增功能**：定期检查两个字段的一致性。

```typescript
// 新增服务方法
async verifyPickupDateConsistency(containerNumber: string): Promise<{
  consistent: boolean;
  gateOutTime: Date | null;
  pickupDate: Date | null;
  fixed: boolean;
}> {
  const po = await poRepo.findOne({
    where: { containerNumber, portType: 'destination' }
  });
  const tt = await ttRepo.findOne({ where: { containerNumber } });
  
  const gateOutTime = po?.gateOutTime || null;
  const pickupDate = tt?.pickupDate || null;
  
  // 检查是否一致（同一天即可，不要求时分秒相同）
  const consistent = !gateOutTime || !pickupDate || 
    (gateOutTime.toDateString() === pickupDate.toDateString());
  
  if (!consistent && gateOutTime && pickupDate) {
    logger.warn(
      `[DataConsistency] ${containerNumber} 提柜日期不一致: ` +
      `gate_out_time=${gateOutTime}, pickup_date=${pickupDate}`
    );
    
    // 🔧 自动修复：以 gate_out_time 为准
    tt.pickupDate = gateOutTime;
    tt.pickupDateSource = PICKUP_DATE_SOURCE.FEITUO;
    await ttRepo.save(tt);
    
    return { consistent: false, gateOutTime, pickupDate, fixed: true };
  }
  
  return { consistent: true, gateOutTime, pickupDate, fixed: false };
}
```

### 修复 4：优化状态码优先级逻辑

**问题**：多个状态码都可能更新提柜相关字段，需要明确优先级。

**修复代码**：
```typescript
// 新增常量：提柜相关状态码的优先级
const TRUCKING_PICKUP_PRIORITY: Record<string, number> = {
  'STCS': 1,      // 最高优先级：明确的提柜事件
  'GTOT': 1,      // 最高优先级：明确的提柜事件
  'GATE_OUT': 1,  // 最高优先级：明确的提柜事件
  'FETA': 2,      // 次优先级：到达交货地（可能是提柜后）
  'STRP': 3       // 最低优先级：拆箱（提柜后的操作）
};

// 修改 updateCoreFieldsFromStatus()
private async updateCoreFieldsFromStatus(
  containerNumber: string,
  statusCode: string,
  occurredAt: Date
): Promise<void> {
  const fieldName = getCoreFieldName(statusCode);
  if (!fieldName) return;
  
  // 🔧 如果是提柜相关字段，检查优先级
  if (fieldName === 'gate_out_time') {
    const po = await poRepo.findOne({
      where: { containerNumber, portType: 'destination' }
    });
    
    if (po?.gateOutTime) {
      // 已有值，检查是否需要覆盖
      const existingPriority = this.getExistingPickupPriority(po);
      const newPriority = TRUCKING_PICKUP_PRIORITY[statusCode] || 99;
      
      if (newPriority >= existingPriority) {
        logger.info(
          `[FeituoImport] 跳过提柜日期更新：${containerNumber} ` +
          `已有高优先级事件 (${existingPriority}) > ${statusCode} (${newPriority})`
        );
        return;
      }
    }
  }
  
  // ... 继续正常更新逻辑
}

private getExistingPickupPriority(po: PortOperation): number {
  // 根据最后更新的事件推断优先级
  if (po.gateOutTime) {
    // 需要额外字段记录最后更新的事件类型，或者从 ext_container_status_events 查询
    return 1;  // 假设有 STCS/GTOT/GATE_OUT
  }
  return 99;  // 未知优先级
}
```

---

## 实施步骤

### Step 1：验证数据现状

```sql
-- 检查 HMMU6232153 的完整数据链
SELECT 
  c.container_number,
  po.id AS po_id,
  po.port_type,
  po.gate_out_time,
  tt.pickup_date,
  tt.pickup_date_source,
  (SELECT COUNT(*) FROM ext_container_status_events 
   WHERE container_number = c.container_number AND status_code = 'STCS') AS stcs_count
FROM biz_containers c
LEFT JOIN process_port_operations po ON c.container_number = po.container_number 
  AND po.port_type = 'destination'
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
WHERE c.container_number = 'HMMU6232153';
```

### Step 2：修复缺失的 process_port_operations 记录

```sql
-- 如果没有目的港记录，创建它
INSERT INTO process_port_operations (
  container_number, 
  port_type, 
  port_sequence,
  created_at
) VALUES (
  'HMMU6232153',
  'destination',
  1,
  NOW()
)
ON CONFLICT DO NOTHING;
```

### Step 3：手动同步提柜日期

```sql
-- 从 STCS 事件同步到两个表
WITH stcs_event AS (
  SELECT occurred_at
  FROM ext_container_status_events
  WHERE container_number = 'HMMU6232153'
    AND status_code = 'STCS'
  ORDER BY occurred_at DESC
  LIMIT 1
)
UPDATE process_port_operations po
SET gate_out_time = s.occurred_at
FROM stcs_event s
WHERE po.container_number = 'HMMU6232153'
  AND po.port_type = 'destination'
  AND po.gate_out_time IS NULL;

-- 同步 pickup_date
WITH stcs_event AS (
  SELECT occurred_at
  FROM ext_container_status_events
  WHERE container_number = 'HMMU6232153'
    AND status_code = 'STCS'
  ORDER BY occurred_at DESC
  LIMIT 1
)
INSERT INTO process_trucking_transport (
  container_number,
  pickup_date,
  pickup_date_source,
  created_at
)
SELECT 
  'HMMU6232153',
  s.occurred_at,
  'feituo',
  NOW()
FROM stcs_event s
ON CONFLICT (container_number) 
DO UPDATE SET 
  pickup_date = EXCLUDED.pickup_date,
  pickup_date_source = 'feituo'
WHERE process_trucking_transport.pickup_date IS NULL;
```

### Step 4：重算物流状态

```sql
-- 触发状态重算（调用存储过程或服务）
-- 或者通过 API 调用
-- POST /api/v1/containers/HMMU6232153/update-status
```

### Step 5：验证修复结果

```sql
-- 验证两个字段都已更新
SELECT 
  container_number,
  gate_out_time,
  pickup_date,
  pickup_date_source,
  CASE 
    WHEN gate_out_time IS NOT NULL AND pickup_date IS NOT NULL THEN 'OK'
    ELSE 'FAIL'
  END AS consistency_check
FROM process_port_operations po
JOIN process_trucking_transport tt USING (container_number)
WHERE container_number = 'HMMU6232153'
  AND po.port_type = 'destination';
```

---

## 长期优化建议

### 建议 1：统一数据模型

**问题**：为什么需要两个表存储同一个概念？

**分析**：
- `process_port_operations.gate_out_time`：港口操作视角（闸口外出）
- `process_trucking_transport.pickup_date`：车队运输视角（提柜行为）

**建议**：
1. 在数据库层面添加 CHECK 约束或触发器，保证两者一致性
2. 或者合并为一个字段，移除冗余

### 建议 2：添加数据质量监控

```typescript
// 定期任务：检查所有货柜的数据一致性
async dailyDataConsistencyCheck() {
  const containers = await this.findAllContainers();
  
  const inconsistent = [];
  for (const cn of containers) {
    const result = await this.verifyPickupDateConsistency(cn);
    if (!result.consistent) {
      inconsistent.push({ containerNumber: cn, ...result });
    }
  }
  
  if (inconsistent.length > 0) {
    logger.error(
      `[DailyCheck] 发现 ${inconsistent.length} 个货柜提柜日期不一致`,
      inconsistent
    );
    
    // 发送告警邮件
    await this.sendAlertEmail(inconsistent);
  }
}
```

### 建议 3：完善文档

在 `frontend/public/docs/` 下添加：
- `11-project/14-提柜日期数据一致性设计.md`
- `11-project/15-飞驼状态码优先级规则.md`

---

## 总结

### 核心问题

1. ❌ **数据源不统一**：关键时间线和货柜表格使用不同的字段
2. ❌ **同步逻辑有缺陷**：`tryApplyFeituoPickupFromGateOutEvent()` 的限制条件过多
3. ❌ **记录可能不存在**：`process_port_operations` 目的港记录可能缺失

### 根本原因

**STCS 事件虽然映射到 `gate_out_time`，但：**
1. 可能因为 `process_port_operations` 记录不存在而无法更新
2. 可能因为来源检查（business/manual）而阻止同步
3. 可能因为时间比较而跳过更新

### 解决方案

1. ✅ **确保记录存在**：如果 `process_port_operations` 不存在则创建
2. ✅ **强制同步逻辑**：更新 `gate_out_time` 时强制同步 `pickup_date`
3. ✅ **添加一致性校验**：定期检查并自动修复不一致
4. ✅ **优化优先级规则**：明确不同状态码的优先级

### 预期结果

修复后：
- ✅ `process_port_operations.gate_out_time` = '2026-03-30 11:48:00'
- ✅ `process_trucking_transport.pickup_date` = '2026-03-30 11:48:00'
- ✅ 关键时间线显示提柜节点
- ✅ 货柜表格提柜实际日期有值
- ✅ 物流状态计算为 `PICKED_UP` → `RETURNED_EMPTY`

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高
