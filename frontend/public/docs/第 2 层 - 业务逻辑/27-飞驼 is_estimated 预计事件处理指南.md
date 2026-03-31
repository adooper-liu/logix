# SKILL-飞驼 is_estimated 预计事件处理完整指南

## 📋 概述

**问题现象**: HMMU6232153 和 GAOU6195045 两个集装箱的提柜日期数据不一致，浪费大量时间排查

**根本原因**: 错误的"最终状态即使是预计也要更新"逻辑导致预计事件覆盖了实际时间字段

**修复方案**: 严格遵守"只有实际发生的事件才能更新核心字段"的原则

---

## 🔍 问题现象与排查过程

### 现象描述

在分析 HMMU6232153 和 GAOU6195045 的提柜日期时，发现数据不一致:

| 集装箱 | pickup_date | pickup_date_source | gate_out_time |
|--------|-------------|-------------------|---------------|
| HMMU6232153 | NULL | NULL | NULL |
| GAOU6195045 | 2026-03-28 07:03 | feituo | 2026-03-28 07:03 |

### 错误排查路径 (浪费时间)

❌ **错误方向 1**: 怀疑数据来源不同
- 猜测：HMMU6232153 是 Excel 导入，GAOU6195045 是飞驼 API 同步
- 验证结果：**两个都是同一时间从飞驼 Excel 导入**

❌ **错误方向 2**: 怀疑导入映射配置问题
- 检查 `importMappings/container.ts` 中的字段映射
- 验证结果：**映射配置正确**

❌ **错误方向 3**: 怀疑数据库写入逻辑有问题
- 检查 `import.controller.ts` 的批量导入逻辑
- 验证结果：**导入逻辑正确**

❌ **错误方向 4**: 怀疑状态机计算错误
- 检查 `logisticsStatusMachine.ts` 的状态计算逻辑
- 验证结果：**状态机计算正确**

### 正确的排查路径

✅ **正确方向**: 直接查询数据库原始数据

```bash
# 1. 查询 process_port_operations 表
node -e "const {AppDataSource} = require('./dist/database'); 
         const {PortOperation} = require('./dist/entities/PortOperation'); 
         (async () => { 
           await AppDataSource.initialize(); 
           const repo = AppDataSource.getRepository(PortOperation); 
           const records = await repo.find({
             where: [{containerNumber: 'HMMU6232153'}, {containerNumber: 'GAOU6195045'}]
           }); 
           records.forEach(r => console.log(
             r.containerNumber, '|', r.portType, '|', 
             'gateOutTime:', r.gateOutTime ? r.gateOutTime.toISOString() : 'NULL', '|', 
             'dataSource:', r.dataSource
           )); 
           await AppDataSource.destroy(); 
         })()"

# 2. 查询 ext_feituo_status_events 表
node -e "const {AppDataSource} = require('./dist/database'); 
         const {ExtFeituoStatusEvent} = require('./dist/entities/ExtFeituoStatusEvent'); 
         (async () => { 
           await AppDataSource.initialize(); 
           const repo = AppDataSource.getRepository(ExtFeituoStatusEvent); 
           const event = await repo.findOne({
             where: {containerNumber: 'HMMU6232153', eventCode: 'STCS'}
           }); 
           console.log('STCS event:'); 
           console.log('  eventTime:', event.eventTime.toISOString()); 
           console.log('  isEstimated:', event.isEstimated); 
           console.log('  dataSource:', event.dataSource); 
           console.log('  rawJson:', JSON.stringify(event.rawJson, null, 2)); 
           await AppDataSource.destroy(); 
         })()"
```

### 真相大白

查询结果显示:

**HMMU6232153**:
```json
{
  "eventCode": "STCS",
  "eventTime": "2026-03-30T11:48:00.000Z",  // ← 未来时间
  "isEstimated": true,                       // ← 标记为预计
  "dataSource": "船公司",
  "rawJson": {
    "集装箱物流信息 - 状态_是否预计": "Y",     // ← Excel 中明确标记为 Y
    "集装箱物流信息 - 状态_发生时间": "2026-03-30 11:48:00"
  }
}
```

**GAOU6195045**:
```json
{
  "eventCode": "STCS",
  "eventTime": "2026-03-28T07:03:00.000Z",  // ← 过去时间
  "isEstimated": false,                      // ← 标记为实际
  "dataSource": "船公司",
  "rawJson": {
    "集装箱物流信息 - 状态_是否预计": "N",     // ← Excel 中明确标记为 N
    "集装箱物流信息 - 状态_发生时间": "2026-03-28 07:03:00"
  }
}
```

**结论**: 
- ✅ 两个柜子都是从飞驼 Excel 导入
- ✅ HMMU6232153 的 STCS 事件被标记为"预计"(isEstimated=true)
- ✅ GAOU6195045 的 STCS 事件被标记为"实际"(isEstimated=false)
- ✅ **问题的根源是错误的代码逻辑允许预计事件更新核心字段**

---

## 📊 is_estimated 字段的产生流程

### 1. Excel 数据源

飞驼 Excel 表一中，每个状态组都包含"是否预计"列:

| 列名 | 示例值 | 含义 |
|------|--------|------|
| 集装箱物流信息 - 状态_是否预计 | `Y` 或 `N` | Y=预计，N=实际 |
| 是否预计 | `Y` 或 `N` | 简称列名 |

### 2. 解析逻辑

**文件**: `backend/src/services/feituoImport.service.ts`

**解析代码** (第 1920 行和第 3223-3225 行):

```typescript
// 表一解析
const isEsti = getVal(row, group, '是否预计') || getVal(row, group, '是否已发生');
isEstimated: isEsti === 'Y' || isEsti === 'true'

// 表二解析
isEstimated: parseBool(
  getVal(row, 12, '是否预计') || getVal(row, '集装箱物流信息 - 状态_是否预计')
)
```

**parseBool 函数** (第 490 行):

```typescript
function parseBool(val: unknown): boolean {
  if (!val) return false;
  if (typeof val === 'boolean') return val;
  const s = String(val).toLowerCase().trim();
  return s === 'y' || s === 'yes' || s === 'true' || s === '1';
}
```

### 3. 写入数据库

**表**: `ext_feituo_status_events`

**字段**: `is_estimated` (BOOLEAN)

**写入代码** (第 2149 行):

```typescript
const event = eventRepo.create({
  containerNumber,
  statusCode: status.statusCode,
  occurredAt: status.occurredAt!,
  // ...
  rawData: {
    group: status.group,
    isEstimated: status.isEstimated,  // ← 保存原始值
    // ...
  }
});
```

### 4. 应用逻辑

#### ✅ 正确的应用逻辑 (修复后)

**文件**: `backend/src/services/feituoImport.service.ts` (第 2166-2172 行)

```typescript
// 只处理非预计状态的事件
// 预计事件 (isEstimated=true) 不代表实际发生，不应更新核心字段
if (!status.isEstimated && status.occurredAt) {
  await this.updateCoreFieldsFromStatus(
    containerNumber,
    status.statusCode,
    status.occurredAt
  );
}
```

**文件**: `backend/src/services/externalDataService.ts` (第 1635-1643 行)

```typescript
for (const event of feituoEvents) {
  // 只处理已发生的事件 (hasOccurred=true)
  // 预计事件 (isEstimated=true/hasOccurred=false) 不代表实际发生，不应更新核心字段
  if (event.hasOccurred === false) {
    continue;
  }
  
  if (!shouldUpdateCoreField(event.statusCode, true)) {
    continue;
  }
  // ... 更新核心字段
}
```

#### ❌ 错误的历史逻辑 (已修复)

```typescript
// ❌ 错误逻辑 (已删除)
const FINAL_STATUS_CODES = ['RCVE', 'STCS', 'GTOT', 'GTIN', 'DSCH', 'BO', 'DLPT'];
const isFinalStatus = FINAL_STATUS_CODES.includes(status.statusCode);

// 即使是预计状态，如果是最终状态也要更新
if ((!status.isEstimated || isFinalStatus) && status.occurredAt) {
  await this.updateCoreFieldsFromStatus(...);
}
```

**错误原因**:
- 误以为"最终状态代表运输链结束，即使是预计也应该更新"
- 没有理解"预计"的本质是**预测**,不是**事实**
- 用预测数据污染了实际时间字段

---

## ⚠️ 可能出现的问题

### 问题 1: 预计事件覆盖实际数据

**现象**: 
- 某个柜子已经实际提柜 (`isEstimated: false`, `pickup_date: 2026-03-28`)
- 后来又导入了一个预计提柜事件 (`isEstimated: true`, `eventTime: 2026-03-30`)
- **错误行为**: 预计事件覆盖了实际提柜日期

**后果**:
- 数据准确性被破坏
- 统计报表错误
- 客户信任度下降

**解决方案**:
- ✅ 严格执行 `if (!status.isEstimated)` 检查
- ✅ 禁止预计事件更新核心字段

### 问题 2: 混合事件序列处理不当

**场景**:

```typescript
const statuses = [
  { statusCode: 'ATA', occurredAt: ataTime, isEstimated: false },  // 实际到港
  { statusCode: 'ETA', occurredAt: etaTime, isEstimated: true },   // 预计到港
  { statusCode: 'RCVE', occurredAt: rcveTime, isEstimated: true }  // 预计还箱
];
```

**正确处理**:
- ✅ ATA (实际) → 更新 `process_port_operations.ata`
- ❌ ETA (预计) → 不更新任何字段
- ❌ RCVE (预计) → 不更新 `process_empty_return.return_time`

### 问题 3: 数据源标识混乱

**问题**:
- 飞驼 API 返回的数据可能标记为"船公司"
- Excel 导入的数据也可能来自"船公司"
- 开发者容易混淆数据来源

**解决方案**:
- ✅ 统一使用 `isEstimated` 字段判断
- ✅ 不依赖 `dataSource` 判断是否更新
- ✅ 只认 `isEstimated: false` 的实际事件

---

## 🎯 核心原则

### 原则 1: 数据准确性优先

```
实际发生数据 (isEstimated=false) > 预计数据 (isEstimated=true)
```

**禁止反向操作**: 不允许用预计数据覆盖实际数据

### 原则 2: 单一数据源

提柜时间字段的数据流:

```
process_port_operations.gate_out_time (权威源)
         ↓ 自动同步
process_trucking_transport.pickup_date
```

**禁止**: 预计事件不能写入权威源

### 原则 3: 等待实际事件

如果当前只有预计事件:
- ✅ 保持核心字段为 NULL
- ✅ 等待 `isEstimated: false` 的实际事件
- ❌ 不用预计时间填充

---

## 📝 测试验证

### 单元测试要点

**文件**: `backend/src/services/feituoImport.service.test.ts`

```typescript
describe('processStatusArray - 预计事件处理', () => {
  it('不应该更新 RCVE 事件，如果标记为预计', async () => {
    const statuses = [{
      statusCode: 'RCVE',
      occurredAt: rcveTime,
      isEstimated: true  // ← 预计事件
    }];
    
    await service.processStatusArray(containerNumber, statuses);
    
    // 验证：未创建 EmptyReturn 记录
    expect(emptyReturn).toBeNull();
  });
  
  it('应该更新非预计的 RCVE 事件', async () => {
    const statuses = [{
      statusCode: 'RCVE',
      occurredAt: rcveTime,
      isEstimated: false  // ← 实际事件
    }];
    
    await service.processStatusArray(containerNumber, statuses);
    
    // 验证：已创建 EmptyReturn 记录
    expect(emptyReturn?.returnTime).toEqual(rcveTime);
  });
});
```

### 数据库验证

```sql
-- 验证预计事件未更新核心字段
SELECT 
  e.container_number,
  e.event_code,
  e.event_time,
  e.is_estimated,
  po.gate_out_time,
  tt.pickup_date
FROM ext_feituo_status_events e
LEFT JOIN process_port_operations po 
  ON e.container_number = po.container_number AND po.port_type = 'destination'
LEFT JOIN process_trucking_transport tt 
  ON e.container_number = tt.container_number
WHERE e.event_code IN ('STCS', 'GTOT', 'GATE_OUT')
  AND e.is_estimated = true
ORDER BY e.container_number;
```

**预期结果**: 
- `po.gate_out_time` 和 `tt.pickup_date` 应该为 NULL
- 或者与实际事件的值一致 (不会被预计事件覆盖)

---

## 🚨 经验教训

### 教训 1: 不要假设业务逻辑

**错误假设**: "最终状态即使是预计也应该更新"

**正确理解**: 
- 预计就是预测，不是事实
- 无论什么状态码，只要标记为预计，就不应该更新实际字段

### 教训 2: 直接查询数据库

**浪费时间的路径**:
- 分析导入映射配置 (无关)
- 检查状态机计算逻辑 (无关)
- 研究 Controller 写入逻辑 (无关)

**正确的路径**:
- ✅ 直接查询 `ext_feituo_status_events` 看原始数据
- ✅ 直接查询 `process_port_operations` 看实际存储
- ✅ 对比两者的差异

### 教训 3: 理解数据的业务含义

**关键认知**:
- `isEstimated: true` = 船公司的预测，可能会变
- `isEstimated: false` = 实际发生的事实，不会改变

**错误做法**:
- 用预测数据更新实际字段
- 认为"最终状态"就可以例外

**正确做法**:
- 只相信实际发生的数据
- 等待 `isEstimated: false` 的事件

---

## 📚 相关文档

- [飞驼 Excel 导入分批次解读逻辑](./飞驼 EXCEL 导入分批次解读逻辑.md)
- [提柜时间字段单一数据源规范](./第 1 层 - 开发规范/命名规范.md)
- [状态机逻辑](./01-状态机.md)
- [物流事件更新策略 - 禁止预计数据覆盖实际字段](记忆库：important_decision_experience)

---

## 🔧 快速参考

### 决策树

```
收到飞驼事件
    ↓
检查 isEstimated?
    ↓
是 (true) → ❌ 跳过，不更新任何字段
    ↓
否 (false) → ✅ 更新对应的核心字段
    ↓
检查是否有冲突?
    ↓
有 → 记录警告，但不更新
    ↓
无 → 正常更新
```

### 代码检查清单

在调用 `updateCoreFieldsFromStatus` 前必须检查:

```typescript
// ✅ 必查项
if (!status.isEstimated && status.occurredAt) {
  // 可以安全调用
  await this.updateCoreFieldsFromStatus(...);
}

// ❌ 禁止
if (status.isEstimated) {
  // 绝对不能调用
  await this.updateCoreFieldsFromStatus(...);
}
```

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高  
**状态**: 强制执行
