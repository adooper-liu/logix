# 撤销"预计事件特殊处理"的修复

## 问题背景

### 原始错误决策 (昨天)

在昨天的开发中，我们错误地添加了"最终状态即使是预计也要更新核心字段"的逻辑，导致预计事件会覆盖实际时间字段。

**错误代码**:

```typescript
// ❌ 错误逻辑
const FINAL_STATUS_CODES = ['RCVE', 'STCS', 'GTOT', 'GTIN', 'DSCH', 'BO', 'DLPT'];
const isFinalStatus = FINAL_STATUS_CODES.includes(status.statusCode);

// 即使是预计状态，如果是最终状态也要更新
if ((!status.isEstimated || isFinalStatus) && status.occurredAt) {
  await this.updateCoreFieldsFromStatus(...);
}
```

### 问题发现 (今天)

通过分析 HMMU6232153 和 GAOU6195045 两个集装箱的数据，发现了根本原因:

| 集装箱      | STCS 事件 | isEstimated | eventTime               | dataSource |
| ----------- | --------- | ----------- | ----------------------- | ---------- |
| HMMU6232153 | STCS      | `true`      | 2026-03-30 11:48 (未来) | 船公司     |
| GAOU6195045 | STCS      | `false`     | 2026-03-28 07:03 (过去) | 船公司     |

**关键发现**:

- `isEstimated: true` 表示这是**预计时间**,不是实际发生
- `isEstimated: false` 表示这是**实际发生**的事实
- 船公司给的预计提柜时间，标记为"预计"是**合理的**

## 修复方案

### 1. 修复 `feituoImport.service.ts`

**文件**: `backend/src/services/feituoImport.service.ts:2166-2178`

**修改前**:

```typescript
// 非预计状态：更新核心时间字段
// 特殊处理：最终状态事件（如 RCVE 还箱）即使标记为预计，也应该更新
// 原因：这些事件代表运输链结束，标记为预计可能是数据质量问题，不应阻止更新
const FINAL_STATUS_CODES = ['RCVE', 'STCS', 'GTOT', 'GTIN', 'DSCH', 'BO', 'DLPT'];
const isFinalStatus = FINAL_STATUS_CODES.includes(status.statusCode);

if ((!status.isEstimated || isFinalStatus) && status.occurredAt) {
  await this.updateCoreFieldsFromStatus(...);
}
```

**修改后**:

```typescript
// 只处理非预计状态的事件
// 预计事件 (isEstimated=true) 不代表实际发生，不应更新核心字段
if (!status.isEstimated && status.occurredAt) {
  await this.updateCoreFieldsFromStatus(...);
}
```

### 2. 修复 `externalDataService.ts`

**文件**: `backend/src/services/externalDataService.ts:1626-1643`

**修改前**:

```typescript
// 最终状态事件：即使标记为预计，也应该更新核心字段
// 原因：这些事件代表运输链结束，标记为预计可能是数据质量问题，不应阻止更新
const FINAL_STATUS_CODES = ['RCVE', 'STCS', 'GTOT', 'GTIN', 'DSCH', 'BO', 'DLPT'];

for (const event of feituoEvents) {
  // 检查是否应该更新核心字段
  // 特殊处理：最终状态事件即使 hasOccurred=false 也应该更新
  const isFinalStatus = FINAL_STATUS_CODES.includes(event.statusCode);
  const shouldUpdate = isFinalStatus || event.hasOccurred !== false;

  if (!shouldUpdateCoreField(event.statusCode, shouldUpdate)) {
    continue;
  }
  // ...
}
```

**修改后**:

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
  // ...
}
```

### 3. 更新测试文件

**文件**: `backend/src/services/feituoImport.service.test.ts`

**修改内容**:

- 将测试描述从"应该更新 RCVE 事件，即使标记为预计"改为"不应该更新 RCVE 事件，如果标记为预计"
- 验证逻辑从 `expect(emptyReturn).toBeDefined()` 改为 `expect(emptyReturn).toBeNull()`
- 删除"最终状态码列表验证"测试组，改为"预计事件保护规则验证"

## 修复后的行为

### ✅ 正确的数据更新策略

| 事件类型 | isEstimated | hasOccurred | 是否更新核心字段 |
| -------- | ----------- | ----------- | ---------------- |
| 实际发生 | `false`     | `true`      | ✅ **更新**      |
| 预计到港 | `true`      | `false`     | ❌ **不更新**    |
| 预计还箱 | `true`      | `false`     | ❌ **不更新**    |
| 预计提柜 | `true`      | `false`     | ❌ **不更新**    |

### 📊 数据准确性保护

**核心原则**:

- ✅ 只有实际发生的事件才能更新核心时间字段
- ✅ 预计事件不能污染实际时间字段
- ✅ 等待 `isEstimated: false` 的实际事件到来后再更新

### 🎯 业务场景示例

#### 场景 1: HMMU6232153 (预计提柜)

```
Excel 数据:
- STCS 事件时间：2026-03-30 11:48
- 是否预计：Y
- 数据来源：船公司

处理结果:
❌ 不更新 process_port_operations.gate_out_time
❌ 不更新 process_trucking_transport.pickup_date
✅ 保持为 NULL，等待实际提柜事件
```

#### 场景 2: GAOU6195045 (实际提柜)

```
Excel 数据:
- STCS 事件时间：2026-03-28 07:03
- 是否预计：N
- 数据来源：船公司

处理结果:
✅ 更新 process_port_operations.gate_out_time = 2026-03-28 07:03
✅ 同步更新 process_trucking_transport.pickup_date = 2026-03-28 07:03
✅ pickup_date_source = "feituo"
```

## 参考依据

### 飞驼数据规范

根据飞驼 API 文档和 Excel 导入数据格式:

- `是否预计` 字段值为 `Y` 时，表示这是预测时间
- `是否预计` 字段值为 `N` 时，表示这是实际发生时间

### 数据源优先级

```
实际发生数据 (isEstimated=false) > 预计数据 (isEstimated=true)
```

**禁止反向操作**: 不允许用预计数据覆盖实际数据

## 相关记忆

已创建记忆：**物流事件更新策略 - 禁止预计数据覆盖实际字段**

类别：`important_decision_experience`

关键词：`isEstimated`, `数据更新策略`, `核心字段保护`

## 验证方法

### 数据库查询

```sql
-- 检查 HMMU6232153 的 STCS 事件
SELECT
  container_number,
  event_code,
  event_time,
  is_estimated,
  data_source
FROM ext_feituo_status_events
WHERE container_number = 'HMMU6232153'
  AND event_code = 'STCS';

-- 验证 gate_out_time 未更新
SELECT
  container_number,
  port_type,
  gate_out_time,
  data_source
FROM process_port_operations
WHERE container_number = 'HMMU6232153'
  AND port_type = 'destination';
```

### 运行测试

```bash
cd backend
npm test -- feituoImport.service.test.ts
```

## 总结

这次修复纠正了昨天的错误决策，确保了数据更新策略的正确性:

1. ✅ **预计事件不更新**: `isEstimated: true` 的事件不更新核心字段
2. ✅ **等待实际事件**: 等到 `isEstimated: false` 的事件到来后再更新
3. ✅ **数据准确性优先**: 不用预计时间污染实际时间字段
4. ✅ **符合业务逻辑**: 船公司的预计时间只是参考，不是事实

---

**修复日期**: 2026-03-31  
**修复人**: 刘志高  
**影响范围**: 飞驼 Excel 导入、飞驼 API 同步  
**测试状态**: 待验证
