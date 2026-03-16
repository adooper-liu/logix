---
name: intelligent-scheduling-mapping
description: >-
  Implements and maintains LogiX intelligent scheduling warehouse and trucking
  selection logic. Use when working on intelligent scheduling, warehouse/trucking
  mapping, or when the user mentions CA-S003/FBW_CA, dict_warehouse_trucking_mapping,
  or scheduling engine.
---

# 智能排柜映射与仓库/车队选择

> 核心文件：`backend/src/services/intelligentScheduling.service.ts`
> 相关：**logix-development**、**database-query**

## 1. 核心原则：严格匹配映射关系

**仓库和车队必须来自映射表**，禁止回退到「该国全部仓库」或「仅港口映射的车队」。

| 环节 | 错误做法 | 正确做法 |
|------|----------|----------|
| 仓库选择 | 无映射时回退到 dict_warehouses 该国全部 | 无映射时返回 []，提示配置映射 |
| 车队选择 | warehouse_trucking 无数据时回退到 trucking_port | 仅从 warehouse_trucking_mapping 选，且须同时服务该港口 |

## 2. 映射关系链

```
目的港 (portCode)
    ↓ dict_trucking_port_mapping (港口→车队)
车队 (truckingCompanyId)
    ↓ dict_warehouse_trucking_mapping (车队↔仓库)
仓库 (warehouseCode)
```

### 必需表

| 表名 | 用途 |
|------|------|
| `dict_trucking_port_mapping` | 港口 → 车队（port_code, trucking_company_id, country） |
| `dict_warehouse_trucking_mapping` | 仓库 ↔ 车队（warehouse_code, trucking_company_id, country） |

推导链：目的港 → 可服务该港口的车队 → 这些车队可服务的仓库 → 选仓库 → 选该仓库在映射中的车队。

## 3. 仓库选择逻辑（getCandidateWarehouses）

### 前置条件

- 必须有 `portCode` 和 `countryCode`，否则返回 `[]`
- 无港口映射或车队→仓库映射时返回 `[]`

### 优先级排序（同产能时）

1. **is_default**：`dict_warehouse_trucking_mapping.is_default = true` 的仓库优先
2. **property_type**：自营仓 > 平台仓 > 第三方仓（避免误选 FBW 等平台仓）
3. **warehouse_code**：同类型按字典序

### 常见问题

- **CA-S003 vs CA-P003**：CA-S003（Oshawa，自营仓）优先于 CA-P003（FBW_CA，平台仓）
- **前端显示 FBW_CA**：多为 process_warehouse_operations 中 warehouse_id 存了 CA-P003 或 actual_warehouse 存了名称；正确名称应从 dict_warehouses 按 warehouse_code 查 warehouse_name

## 4. 车队选择逻辑（selectTruckingCompany）

- **仅从** `dict_warehouse_trucking_mapping` 选择
- 若指定港口，仅选**同时**满足「仓库↔车队」和「港口→车队」的车队
- 移除仅按 trucking_port_mapping 的回退，确保 (仓库, 车队) 在 warehouse_trucking_mapping 中存在

## 5. 仓库名称展示

映射表只存 `warehouse_code`，不存名称。名称应从 `dict_warehouses` 查：

```sql
SELECT warehouse_name FROM dict_warehouses WHERE warehouse_code = 'CA-S003';
-- 结果: Oshawa
```

后端 `container.service.ts` 的 `getWarehouseName()` 已用 `warehousesMap.get(codeOrName)` 解析；前端优先用 `supplierNames.warehouseName`。

## 6. 错误提示

| 场景 | 提示 |
|------|------|
| 无可用仓库 | 无映射关系中的仓库（请配置 dict_trucking_port_mapping、dict_warehouse_trucking_mapping） |
| 无可用车队 | 无映射关系中的车队（请配置 dict_warehouse_trucking_mapping 中该仓库对应的车队） |

## 7. 清关公司选择逻辑（selectCustomsBroker）

### 匹配规则

1. 根据货柜所属国家（`countryCode`）查询 `dict_customs_brokers` 表
2. 匹配条件：`country = countryCode` AND `status = 'ACTIVE'`
3. 无匹配时返回 `"UNSPECIFIED"`（未指定清关公司）

### 必需字段

`dict_customs_brokers` 表必须有 `country` 字段：

```sql
-- 添加字段（如果不存在）
ALTER TABLE dict_customs_brokers ADD COLUMN IF NOT EXISTS country VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_customs_brokers_country ON dict_customs_brokers(country);
```

### 数据初始化

```sql
-- 更新现有清关公司国家
UPDATE dict_customs_brokers SET country = 'US' WHERE broker_code IN ('CB_US_WEST', 'CB_US_EAST');
UPDATE dict_customs_brokers SET country = 'NL' WHERE broker_code = 'CB_EU_NL';
UPDATE dict_customs_brokers SET country = 'DE' WHERE broker_code = 'CB_EU_DE';
UPDATE dict_customs_brokers SET country = 'CA' WHERE broker_code = 'CB_CA_BC';

-- 添加"未指定"清关公司
INSERT INTO dict_customs_brokers (broker_code, broker_name, broker_name_en, contact_phone, contact_email, status, country, remarks, created_at, updated_at)
SELECT 'UNSPECIFIED', '未指定清关公司', 'Unspecified Customs Broker', NULL, NULL, 'ACTIVE', NULL, '智能排柜时无匹配清关公司时使用', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM dict_customs_brokers WHERE broker_code = 'UNSPECIFIED');
```

### 写入位置

匹配到的清关公司写入 `port_operations` 表的 `port_type = 'destination'` 记录：

```typescript
const portOperation = await this.portOperationRepo.findOne({
  where: { containerNumber, portType: 'destination' }
});
if (portOperation) {
  await queryRunner.manager.update(PortOperation,
    { id: portOperation.id },
    { customsBrokerCode: plannedData.customsBrokerCode }
  );
}
```

## 8. 还箱码头选择逻辑（selectReturnTerminal）

### 匹配规则

智能排柜时使用仓库作为还箱地点：
- `returnTerminalCode` = `warehouse.warehouseCode`
- `returnTerminalName` = `warehouse.warehouseName` 或 `warehouseCode`

### 写入位置

还箱码头信息写入 `process_empty_returns` 表：

```typescript
// 更新或创建还箱记录
if (emptyReturn) {
  await queryRunner.manager.update(EmptyReturn,
    { containerNumber },
    {
      plannedReturnDate: plannedData.plannedReturnDate,
      returnTerminalCode: plannedData.returnTerminalCode,
      returnTerminalName: plannedData.returnTerminalName
    }
  );
} else {
  emptyReturn = this.emptyReturnRepo.create({
    containerNumber,
    plannedReturnDate: plannedData.plannedReturnDate,
    returnTerminalCode: plannedData.returnTerminalCode,
    returnTerminalName: plannedData.returnTerminalName
  });
  await queryRunner.manager.save(EmptyReturn, emptyReturn);
}
```

## 9. 甘特图还箱节点显示逻辑

### 三级供应商优先级（前端 useGanttLogic.ts）

```typescript
// 还箱节点 - 还箱码头（returnTerminalName 优先 → returnTerminalCode → 回退到仓库名称）
if (container.emptyReturns && container.emptyReturns.length > 0) {
  container.emptyReturns.forEach(emptyReturn => {
    let supplier = emptyReturn.returnTerminalName || emptyReturn.returnTerminalCode
    // 回退到使用仓库名称
    if (!supplier && container.warehouseOperations?.[0]) {
      const warehouseOp = container.warehouseOperations[0]
      supplier = warehouseOp.warehouseId || warehouseOp.actualWarehouse || warehouseOp.plannedWarehouse
    }
    if (supplier) {
      result.push({ node: '还箱', supplier })
    }
  })
}
```

### 显示名称优先级（SimpleGanttChartRefactored.vue）

```typescript
case '还箱': {
  // 优先使用还箱码头名称
  const fromBackend = containers?.[0]?.supplierNames?.returnTerminalName
  if (fromBackend) return fromBackend
  // 回退到使用仓库名称
  const warehouseName = containers?.[0]?.supplierNames?.warehouseName
  if (warehouseName) return warehouseName
  return codeOrName
}
```

### 优先级总结

1. `returnTerminalName`（还箱码头名称）
2. `returnTerminalCode`（还箱码头编码）
3. 仓库名称（`warehouseName` / `warehouseId`）

## 10. 检查清单

- [ ] getCandidateWarehouses 无 portCode/countryCode 时返回 []
- [ ] 仓库仅来自 port→trucking→warehouse 映射链
- [ ] selectTruckingCompany 仅从 warehouse_trucking_mapping 选，无港口回退
- [ ] 车队须同时满足 warehouse_trucking 与 trucking_port（当有 portCode 时）
- [ ] 仓库排序：is_default > 自营仓 > 平台仓 > 第三方仓 > warehouse_code
- [ ] 使用 TypeORM `In()` 而非 `$in` 做数组查询
- [ ] 清关公司根据 country 匹配，无匹配时使用 UNSPECIFIED
- [ ] 清关公司写入 port_type='destination' 的记录
- [ ] 还箱码头使用仓库信息（returnTerminalCode/returnTerminalName）
- [ ] 还箱码头写入 process_empty_returns 表
- [ ] 甘特图还箱节点显示：returnTerminalName > warehouseName > codeOrName
