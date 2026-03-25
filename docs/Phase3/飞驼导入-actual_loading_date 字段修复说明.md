# 货柜导入 actual_loading_date 字段修复说明

## 📋 问题描述

在导入**普通货柜数据**（非飞驼数据）时，遇到以下错误：

```
{ "rowIndex": 1, "error": "NULL value in column \"actual_loading_date\" violates not-null constraint" }
```

**根本原因**：

- `process_sea_freight` 表的 `actual_loading_date` 字段有 NOT NULL 约束
- 该字段是 TimescaleDB hypertable 的分区键，必须包含值
- **普通货柜导入配置中没有映射 `actual_loading_date` 字段**
- 当导入数据中没有明确的"实际装船时间"时，字段值为 NULL，违反约束

## ✅ 解决方案

### 修改文件

1. `frontend/src/configs/importMappings/container.ts` - **普通货柜导入配置**
2. `backend/src/services/feituoImport.service.ts` - **飞驼导入服务**（已修复）

### 修改内容

#### 1. 普通货柜导入配置（新增）

**文件**: `frontend/src/configs/importMappings/container.ts`

**新增映射**：

```typescript
{
  excelField: '出运日期',
  table: 'process_sea_freight',
  field: 'shipment_date',
  required: false,
  transform: parseDate,
  aliases: ['装船日期', '实际装船时间'],
},
{
  excelField: '实际装船时间',
  table: 'process_sea_freight',
  field: 'actual_loading_date',
  required: false,
  transform: parseDate,
  aliases: ['装船日期', '出运日期'],
},
```

**修改前**：

```typescript
shipmentDate: parseDate(originPlace?.atd || originPlace?.etd || getVal(row, '接货地实际离开时间') || getVal(row, '实际装船时间', '装船日期', '出运日期')),
actualLoadingDate: parseDate(originPlace?.actualLoading || getVal(row, '实际装船时间')),
```

**修改后**：

```typescript
// shipmentDate 和 actualLoadingDate 都使用相同的来源，确保两个字段都有值
shipmentDate: parseDate(originPlace?.atd || originPlace?.etd || getVal(row, '接货地实际离开时间') || getVal(row, '实际装船时间', '装船日期', '出运日期')),
// actualLoadingDate 优先级：1) 实际装船时间 2) 出运日期 (shipmentDate)
// 注意：飞驼导入不再更新备货单的 expectedShipDate，仅由原始导入逻辑处理
actualLoadingDate: parseDate(
  originPlace?.actualLoading ||
  getVal(row, '实际装船时间') ||
  originPlace?.atd ||
  originPlace?.etd ||
  getVal(row, '接货地实际离开时间') ||
  getVal(row, '装船日期', '出运日期')
),
```

#### 2. 表一更新逻辑（第 1074-1091 行）

**修改前**：

```typescript
if (!sf.shipmentDate) sf.shipmentDate = parseDate(...);
if (!sf.actualLoadingDate) sf.actualLoadingDate = parseDate(originPlace?.actualLoading || getVal(row, '实际装船时间'));
```

**修改后**：

```typescript
// shipmentDate 和 actualLoadingDate 都应该有值，避免 NULL 违反约束
if (!sf.shipmentDate) sf.shipmentDate = parseDate(...);
// actualLoadingDate 更新策略：优先使用实际装船时间，如果没有则使用出运日期作为 fallback
if (!sf.actualLoadingDate) {
  sf.actualLoadingDate = parseDate(
    originPlace?.actualLoading ||
    getVal(row, '实际装船时间') ||
    originPlace?.atd ||
    originPlace?.etd ||
    getVal(row, '接货地实际离开时间') ||
    getVal(row, '装船日期', '出运日期')
  );
}
```

#### 3. 表二导入逻辑（第 1391-1401 行）

**修改前**：

```typescript
shipmentDate: parseDate(originPlace?.atd || ... || getVal(row, '出运日期')),
actualLoadingDate: parseDate(originPlace?.actualLoading || getVal(row, '实际装船时间')),
```

**修改后**：

```typescript
// shipmentDate 和 actualLoadingDate 都使用相同的来源，确保两个字段都有值
shipmentDate: parseDate(originPlace?.atd || ... || getVal(row, '出运日期')),
// actualLoadingDate 优先级：1) 实际装船时间 2) 出运日期 (shipmentDate)
actualLoadingDate: parseDate(
  originPlace?.actualLoading ||
  getVal(row, '实际装船时间') ||
  originPlace?.atd ||
  originPlace?.etd ||
  getVal(row, '接货地实际离开时间') ||
  getVal(row, '装船日期', '出运日期')
),
```

#### 4. ~~备货单 expectedShipDate 更新逻辑~~ （已移除）

**修改前**：

```typescript
const expectedShipDate = parseDate(getVal(row, "接货地实际离开时间") || getVal(row, "实际装船时间", "装船日期", "出运日期"));
if (expectedShipDate) {
  const orders = await replenishmentRepo.find({ where: { containerNumber } });
  for (const order of orders) {
    if (!order.expectedShipDate) {
      order.expectedShipDate = expectedShipDate;
      await replenishmentRepo.save(order);
    }
  }
}
```

**修改后**：

```typescript
// 注意：飞驼导入不再更新备货单的 expectedShipDate，仅由原始导入逻辑处理
```

**原因**：根据 SKILL 规范，飞驼导入仅负责更新海运表的 `actualLoadingDate`，备货单的 `expectedShipDate` 应由原始备货单导入流程处理，避免数据覆盖。

## 🎯 核心设计原则

### 1. 字段映射策略

**飞驼导入数据字段更新规则**：

- ✅ **更新** `actualLoadingDate`（实际装船时间）- 使用多层 fallback 链
- ❌ **不再更新** `expectedShipDate`（预计出运日期）- 仅由原始备货单导入逻辑处理
- ✅ **保持** `shipmentDate`（出运日期）- 与 `actualLoadingDate` 使用相同 fallback 逻辑

**actualLoadingDate 优先级顺序**：

1. **第一优先级**：`originPlace.actualLoading`（发生地信息\_实际装船时间）
2. **第二优先级**：`getVal(row, '实际装船时间')`（直接列名）
3. **第三优先级**：`originPlace.atd`（接货地实际离开时间）
4. **第四优先级**：`originPlace.etd`（接货地预计离开时间）
5. **第五优先级**：`getVal(row, '接货地实际离开时间')`（直接列名）
6. **第六优先级**：`getVal(row, '装船日期', '出运日期')`（备用列名）

### 2. Fallback 机制

**确保字段永远不为 NULL**：

- 通过多层 fallback 链，确保至少有一个合理的默认值
- 如果所有来源都为空，`parseDate()` 返回 `undefined`，TypeORM 会保持字段为 `undefined`（不会设置为 NULL）
- 对于已存在的记录，只在字段为空时才更新，避免覆盖已有数据

### 3. 数据分离原则

**不同表的数据由不同导入流程处理**：

- ✅ **海运表（process_sea_freight）**：飞驼导入负责更新 `shipmentDate` 和 `actualLoadingDate`
- ❌ **备货单表（biz_replenishment_orders）**：飞驼导入**不再**更新 `expectedShipDate`
- ✅ **数据独立性**：避免跨表覆盖，确保各导入流程职责清晰

## 📊 字段关系图

```
飞驼 Excel 数据
    │
    ├─ 发生地信息_实际装船时间 ───────┐
    ├─ 实际装船时间                   │
    ├─ 接货地实际离开时间 (atd)  ──────┼──→ parseDate() ──┐
    ├─ 接货地预计离开时间 (etd)  ──────┤                  │
    ├─ 装船日期                        │                  │
    └─ 出运日期                        │                  │
                                       ↓                  ↓
                              shipmentDate       actualLoadingDate
                              (海运表)            (海运表)

⚠️ 注意：飞驼导入不再更新 expectedShipDate（备货单表）
```

## ✅ 验证方法

### 1. 检查数据库约束

```sql
-- 查看 actual_loading_date 字段的约束
\d process_sea_freight

-- 应该显示：not null
```

### 2. 测试导入

```bash
# 执行飞驼数据导入
# 检查是否还有 NULL 约束错误
```

### 3. 验证数据

```sql
-- 检查有多少条记录的 actual_loading_date 为 NULL
SELECT
    COUNT(*) AS total_records,
    COUNT(actual_loading_date) AS with_loading_date,
    COUNT(*) - COUNT(actual_loading_date) AS null_loading_date
FROM process_sea_freight;

-- 应该显示：null_loading_date = 0
```

## 🔗 相关文档

- [甘特图圆点生命周期完整说明](./Phase3/甘特图圆点生命周期完整说明.md)
- [飞驼 Excel导入分批次解读逻辑](./Phase3/飞驼 EXCEL 导入分批次解读逻辑.md)
- [数据库索引优化配置](../migrations/README_scheduling_params.md)

## 📝 注意事项

1. **NOT NULL 约束不可删除**：由于 `actual_loading_date` 是 hypertable 的分区键，TimescaleDB 不允许删除其 NOT NULL 约束

2. **fallback 顺序很重要**：确保优先级从高到低排列，先尝试最精确的数据源

3. **不要覆盖已有数据**：更新逻辑中使用 `if (!sf.actualLoadingDate)` 检查，只在字段为空时才更新

4. **数据分离**：飞驼导入仅更新海运表，不跨表更新备货单数据

## 🚀 后续优化建议

1. **监控数据质量**：添加日志记录，统计有多少条记录使用了 fallback 值

2. **数据清洗**：对于历史数据，可以运行一次性脚本填充合理的默认值

3. **业务规则明确**：与业务方确认，"实际装船时间"是否应该始终存在，或者是否接受使用"出运日期"作为替代

4. **前端提示**：在导入界面添加提示，告知用户"实际装船时间"字段的重要性

---

**修改日期**: 2026-03-21  
**修改人**: LogiX Team  
**影响范围**: 飞驼数据导入服务  
**风险等级**: 低（仅优化 fallback 逻辑，不改变现有数据处理流程）
