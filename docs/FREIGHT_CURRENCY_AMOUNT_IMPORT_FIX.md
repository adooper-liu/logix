# 海运费字段导入失败问题排查报告

## 问题描述

Excel导入时，海运费币种(`freightCurrency`)和标准海运费金额(`standardFreightAmount`)两个字段没有正确保存到数据库，导致前端显示为空。

## 问题分析

### 1. 数据流检查

| 环节 | 状态 | 说明 |
|------|------|------|
| 前端Excel解析 | ✅ 正确 | 字段映射配置正确 |
| 前端数据转换 | ✅ 正确 | parseDecimal转换函数正常 |
| 前端API调用 | ✅ 正确 | splitRowToTables正常拆分数据 |
| 后端接收数据 | ❌ 有问题 | 创建实体时字段名错误 |
| 数据库字段 | ✅ 存在 | freightCurrency和standardFreightAmount已创建 |

### 2. 前端映射配置

```javascript
// ExcelImport.vue 第97-98行
{ excelField: '海运费币种', table: 'sea_freight', field: 'freightCurrency', required: false },
{ excelField: '标准海运费金额', table: 'sea_freight', field: 'standardFreightAmount', required: false, transform: parseDecimal },
```

配置正确，字段名与实体定义一致。

### 3. 后端导入代码问题

**问题代码位置1**：`import.controller.ts` 第146行（单个导入）
```typescript
const seaFreight = queryRunner.manager.create(SeaFreight, {
  ...seaFreightData,
  container_number: seaFreightData.containerNumber  // ❌ 错误：使用了下划线命名
});
```

**问题代码位置2**：`import.controller.ts` 第418行（批量导入）
```typescript
const seaFreight = queryRunner.manager.create(SeaFreight, {
  ...seaFreightData,
  container_number: seaFreightData.containerNumber  // ❌ 错误：使用了下划线命名
});
```

### 4. 根本原因

1. **字段名不匹配**：导入代码使用了`container_number`（蛇形命名），但SeaFreight实体定义使用`containerNumber`（驼峰命名）

2. **数据丢失机制**：
   - 使用展开运算符`...seaFreightData`时，包含正确的字段
   - 但后续显式指定`container_number`会覆盖正确的`containerNumber`值
   - TypeORM创建实体时，如果同时存在`containerNumber`和`container_number`，可能导致主键设置失败
   - 主键设置失败后，整个对象无法正确保存，导致所有字段（包括freightCurrency和standardFreightAmount）丢失

## 解决方案

### 修复前代码

```typescript
const seaFreight = queryRunner.manager.create(SeaFreight, {
  ...seaFreightData,
  container_number: seaFreightData.containerNumber  // ❌ 删除此行
});
```

### 修复后代码

```typescript
const seaFreight = queryRunner.manager.create(SeaFreight, seaFreightData);
```

**修改点**：
1. 移除多余的`container_number`字段赋值
2. 直接使用`seaFreightData`对象，保持驼峰命名规范

## 修复步骤

1. ✅ 修改`backend/src/controllers/import.controller.ts`第146行
2. ✅ 修改`backend/src/controllers/import.controller.ts`第418行
3. ⏳ 重启后端服务使更改生效
4. ⏳ 重新导入Excel数据进行验证

## 验证方法

### 1. 数据库验证
```sql
SELECT "containerNumber", "freightCurrency", "standardFreightAmount"
FROM process_sea_freight
WHERE "containerNumber" = 'MRKU4896861';
```

### 2. 后端日志验证
导入时检查日志输出：
```
[Import] 处理海运信息: {
  containerNumber: 'MRKU4896861',
  freightCurrency: 'USD',
  standardFreightAmount: 2749
}
```

### 3. 前端显示验证
访问货柜详情页面，检查海运信息页签是否正确显示：
- 海运费币种：USD
- 标准海运费金额：$2,749.00

## 影响范围

| 受影响表 | 受影响字段 | 影响数据 |
|---------|-----------|---------|
| process_sea_freight | freightCurrency | 所有已导入的海运费币种数据 |
| process_sea_freight | standardFreightAmount | 所有已导入的标准海运费金额 |

**建议**：修复后重新导入所有Excel数据以确保数据完整性。

## 总结

| 项目 | 内容 |
|------|------|
| 问题类型 | 字段命名不一致导致主键设置失败 |
| 影响级别 | 中（数据丢失） |
| 修复难度 | 低 |
| 是否需重启后端 | 是 |
| 是否需重新导入数据 | 是 |

---

**修复日期**：2026-02-25
**修复人员**：AI Assistant
