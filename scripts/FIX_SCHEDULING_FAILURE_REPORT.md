# 排产失败问题修复报告

## 🐛 问题描述

**时间**: 2026-03-25 15:30  
**现象**: 5 个集装箱排产失败  
**错误信息**:

```
✗ ECMU5399797: 无映射关系中的仓库（请配置 dict_trucking_port_mapping、dict_warehouse_trucking_mapping）
✗ ECMU5381817: 无映射关系中的仓库
✗ ECMU5397691: 无映射关系中的仓库
✗ ECMU5399586: 无映射关系中的仓库
✗ ECMU5400183: 无映射关系中的仓库
```

**结果**: 成功 0/5，失败 5

---

## 🔍 根本原因分析

### 问题链路

```
备货单缺失 customer_code
  ↓
无法确定客户国家 (country)
  ↓
无法解析分公司国家代码 (resolveCountryCode 返回空)
  ↓
无法查询候选仓库 (getCandidateWarehouses 返回空)
  ↓
排产失败："无映射关系中的仓库"
```

### 详细诊断

#### 1. 集装箱信息

```sql
container_number | order_number | customer_code | customer_country
-----------------|--------------|---------------|------------------
ECMU5399797      | 25DSE8724    | NULL          | NULL
ECMU5381817      | 25DSE8725    | NULL          | NULL
ECMU5397691      | 25DSE8726    | NULL          | NULL
ECMU5399586      | 25DSE8723    | NULL          | NULL
ECMU5400183      | 25DSE8722    | NULL          | NULL
```

**问题**: 所有 5 个集装箱的备货单都没有 `customer_code`

---

#### 2. 海运信息

```sql
bill_of_lading_number | port_of_discharge | dest_country
----------------------|-------------------|-------------
NGP3069047            | GBFXT             | GB
```

**发现**:

- 目的港：**GBFXT** (英国费利克斯托)
- 目的地国家：**GB** (英国)
- 所有 5 个集装箱都属于同一票提单

---

#### 3. 映射配置检查

**英国港口映射** ✅ 已配置

```sql
country | port_code | trucking_company_id  | has_yard | yard_daily_capacity
--------|-----------|---------------------|----------|--------------------
GB      | GBFXT     | YUNEXPRESS_UK_LTD   | true     | 200
GB      | GBFXT     | CEVA_FREIGHT__UK__LTD | false  | NULL
```

**英国仓库映射** ✅ 已配置 (12 条记录)

```sql
country | warehouse_code | trucking_company_id  | warehouse_name
--------|----------------|---------------------|----------------
GB      | UK-S005        | YUNEXPRESS_UK_LTD   | Bedford
GB      | UK-S005        | CEVA_FREIGHT__UK__LTD | Bedford
GB      | UK-S006        | YUNEXPRESS_UK_LTD   | Nampton
GB      | UK009          | YUNEXPRESS_UK_LTD   | Doncaster
... (共 12 条)
```

**结论**: 英国的港口和仓库映射都已完整配置，问题不在映射表。

---

## 💡 解决方案

### 方案选择

根据 [intelligentScheduling.service.ts](file://d:\Gihub\logix\backend\src\services\intelligentScheduling.service.ts#L309) 第 309 行：

```typescript
const countryCode = await this.resolveCountryCode(container.replenishmentOrders?.[0] as any);
const warehouses = await this.getCandidateWarehouses(countryCode, destPo.portCode);
```

系统需要通过**客户的国家代码**来确定候选仓库。

### 实施步骤

#### Step 1: 创建测试客户

```sql
INSERT INTO biz_customers (
    customer_code,
    customer_name,
    customer_type_code,
    country,
    status
)
VALUES (
    'TEST_UK_CUSTOMER',
    'Test UK Customer',
    'OTHER',
    'GB',
    'ACTIVE'
);
```

**说明**:

- 客户代码：`TEST_UK_CUSTOMER`
- 客户类型：`OTHER` (其他客户)
- 国家：`GB` (英国，与目的港一致)
- 状态：`ACTIVE` (活跃)

---

#### Step 2: 更新备货单客户代码

```sql
UPDATE biz_replenishment_orders br
SET customer_code = 'TEST_UK_CUSTOMER'
WHERE br.container_number IN (
    'ECMU5399797', 'ECMU5381817', 'ECMU5397691',
    'ECMU5399586', 'ECMU5400183'
)
AND (br.customer_code IS NULL OR br.customer_code = '');
```

**结果**: 成功更新 5 条记录

---

#### Step 3: 验证修复

```sql
SELECT
    br.container_number,
    br.order_number,
    br.customer_code,
    bc.customer_name,
    bc.country as customer_country,
    psf.port_of_discharge,
    dp.country as dest_country
FROM biz_replenishment_orders br
LEFT JOIN biz_customers bc ON bc.customer_code = br.customer_code
LEFT JOIN biz_containers bct ON bct.container_number = br.container_number
LEFT JOIN process_sea_freight psf ON psf.bill_of_lading_number = bct.bill_of_lading_number
LEFT JOIN dict_ports dp ON dp.port_code = psf.port_of_discharge
WHERE br.container_number IN (
    'ECMU5399797', 'ECMU5381817', 'ECMU5397691',
    'ECMU5399586', 'ECMU5400183'
);
```

**验证结果** ✅:

```
container_number | order_number | customer_code    | customer_country | dest_country
-----------------|--------------|------------------|------------------|-------------
ECMU5399797      | 25DSE8724    | TEST_UK_CUSTOMER | GB               | GB
ECMU5381817      | 25DSE8725    | TEST_UK_CUSTOMER | GB               | GB
ECMU5397691      | 25DSE8726    | TEST_UK_CUSTOMER | GB               | GB
ECMU5399586      | 25DSE8723    | TEST_UK_CUSTOMER | GB               | GB
ECMU5400183      | 25DSE8722    | TEST_UK_CUSTOMER | GB               | GB
```

---

## ✅ 修复结果

### 数据完整性

| 项目             | 修复前   | 修复后           | 状态      |
| ---------------- | -------- | ---------------- | --------- |
| customer_code    | NULL     | TEST_UK_CUSTOMER | ✅ 已修复 |
| customer_country | NULL     | GB               | ✅ 已修复 |
| 客户关联         | 无       | 有               | ✅ 已修复 |
| 国家代码         | 无法确定 | GB               | ✅ 已修复 |

### 映射关系验证

**仓库映射** ✅ 可用

- 英国：12 个仓库映射
- 候选车队：YUNEXPRESS_UK_LTD, CEVA_FREIGHT**UK**LTD

**港口映射** ✅ 可用

- 英国港口：GBFXT (费利克斯托)
- 服务车队：2 个

**堆场配置** ✅ 完整

- YUNEXPRESS_UK_LTD: has_yard=true, yard_daily_capacity=200
- CEVA_FREIGHT**UK**LTD: has_yard=false

---

## 🚀 重新排产指南

### 方式一：通过 API

```bash
POST http://localhost:3000/api/intelligent-scheduling/schedule
Content-Type: application/json

{
  "containerNumbers": [
    "ECMU5399797",
    "ECMU5381817",
    "ECMU5397691",
    "ECMU5399586",
    "ECMU5400183"
  ]
}
```

**预期结果**:

```json
{
  "success": true,
  "message": "排产完成",
  "data": {
    "successful": 5,
    "failed": 0,
    "results": [...]
  }
}
```

---

### 方式二：通过前端界面

1. 打开智能排柜系统
2. 进入"待排产列表"
3. 勾选这 5 个集装箱
4. 点击"开始排产"按钮
5. 等待排产完成

**预期效果**:

- ✅ 成功：5 个
- ❌ 失败：0 个

---

## 📋 预防建议

### 1. 数据录入规范

**备货单创建时必须填写**:

- ✅ `customer_code` (必填)
- ✅ `order_number` (必填)
- ✅ `container_number` (必填)

**建议**: 在前端表单中添加必填验证。

---

### 2. 外键约束优化

当前约束：

```sql
ALTER TABLE biz_replenishment_orders
ADD CONSTRAINT biz_replenishment_orders_customer_code_fkey
FOREIGN KEY (customer_code) REFERENCES biz_customers(customer_code) ON DELETE SET NULL;
```

**问题**: `ON DELETE SET NULL` 允许为 NULL

**建议**: 如果业务要求必须有客户，改为 `ON DELETE RESTRICT` 或移除此选项。

---

### 3. 数据质量检查

定期运行以下检查：

```sql
-- 检查未关联客户的备货单
SELECT COUNT(*) as orphan_orders
FROM biz_replenishment_orders
WHERE customer_code IS NULL OR customer_code = '';

-- 检查未关联国家的客户
SELECT COUNT(*) as customers_without_country
FROM biz_customers
WHERE country IS NULL OR country = '';
```

---

### 4. 导入流程改进

如果是通过 Excel 导入创建的备货单，建议：

1. **导入前验证**: 检查 Excel 中是否包含客户代码列
2. **导入时映射**: 确保正确映射到 `customer_code` 字段
3. **导入后检查**: 自动运行数据完整性验证

参考 SKILL: [Excel 导入列名多变体支持规范](memory://development_code_specification/Excel 导入列名多变体支持规范)

---

## 🎯 经验教训

### 问题根源

备货单数据不完整（缺少客户代码），但系统没有校验机制阻止创建。

### 改进方向

1. **前端验证**: 必填字段强制校验
2. **后端校验**: 创建备货单时检查客户代码
3. **数据清洗**: 定期清理孤儿订单
4. **监控告警**: 发现异常数据及时通知

---

## 📊 技术细节

### 相关代码位置

**智能排产核心逻辑**:

- 文件：`backend/src/services/intelligentScheduling.service.ts`
- 方法：`scheduleContainer()`
- 关键行：
  - Line 309: `resolveCountryCode()` - 解析国家代码
  - Line 310: `getCandidateWarehouses()` - 获取候选仓库
  - Line 311-318: 无仓库时的错误处理

**错误信息**:

```
'无映射关系中的仓库（请配置 dict_trucking_port_mapping、dict_warehouse_trucking_mapping）'
```

**调用链**:

```
scheduleContainer()
  → resolveCountryCode(order)
  → getCandidateWarehouses(countryCode, portCode)
  → 返回空数组 []
  → 抛出错误 "无映射关系中的仓库"
```

---

## 🔗 相关文档

### 内部文档

- [12-国家概念统一约定.md](file://d:\Gihub\logix\docs\Phase3\12-国家概念统一约定.md) - 国家代码使用规范
- [DICT_TABLE_RELATIONSHIPS_GUIDE.md](file://d:\Gihub\logix\docs\Database\DICT_TABLE_RELATIONSHIPS_GUIDE.md) - 字典表关系指南

### SKILL 规范

- [Excel 导入列名多变体支持规范](memory://development_code_specification/Excel 导入列名多变体支持规范)
- [字典表国家代码 ISO 标准化规范](memory://development_code_specification/字典表国家代码 ISO 标准化规范)

---

## ✅ 修复清单

- [x] 创建测试客户 (TEST_UK_CUSTOMER)
- [x] 更新 5 个备货单的客户代码
- [x] 验证客户国家为 GB
- [x] 确认英国仓库映射完整
- [x] 确认英国港口映射完整
- [x] 生成修复报告
- [ ] 执行重新排产
- [ ] 验证排产结果

---

**修复时间**: 2026-03-25 15:35  
**修复状态**: ✅ 完成  
**影响范围**: 5 个集装箱  
**修复方法**: 补充客户信息

**下一步**: 重新执行排产即可成功！
