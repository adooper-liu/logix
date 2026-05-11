# 策略提取逻辑更新说明

## 更新时间

2026-04-23

## 更新内容

增强了 [import-express-cost-simple.ts](file://d:/Github/logix/backend/scripts/import-express-cost-simple.ts) 的策略提取逻辑，使其能够识别备注中的所有策略规则。

---

## 主要改进

### 1. 新增专用策略提取函数

#### extractDisablePolicies(remark: string): DisablePolicy[]

**功能**：从备注中提取 IF_THEN_DISABLE 策略（条件禁用）

**支持的规则**：

- 规则 1：超标费或超大件费后不再收AHS费用
- 规则 2：收超大件费后不再收超标费
- 规则 3：如果收了AHS-Weight，就不再收AHS-Size
- 规则 4：收large超标费后不再收AHS费用
- 规则 5：收超大件费后不再收large超标费
- 规则 6：收取超标费2后不再收超标费1

#### extractMaxGroupPolicies(remark: string): MaxGroupPolicy[]

**功能**：从备注中提取 MAX_GROUP 策略（取最高一笔）

**支持的规则**：

- 规则 7：AHS费用以最高的一笔为准
- 规则 8：over weight和over length同时满足时取较大值

---

## 详细规则映射

### IF_THEN_DISABLE 策略

| 规则编号 | 备注关键词                           | if_triggered           | disable                   | 适用场景         |
| -------- | ------------------------------------ | ---------------------- | ------------------------- | ---------------- |
| 1        | "超标费" + "不再收AHS"               | ["OVERSIZE"]           | ["AHS_DIM", "AHS_WEIGHT"] | FedEx/UPS通用    |
| 2        | "超大件费后不再收超标费"             | ["OVERSIZE"]           | ["REJECT"]                | FedEx超大件优先  |
| 3        | "AHS-Weight" + "AHS-Size" + "不再收" | ["AHS_WEIGHT"]         | ["AHS_DIM"]               | UPS尺寸/重量互斥 |
| 4        | "large超标" + "不再收AHS"            | ["LARGE_PACKAGE_RESI"] | ["AHS_DIM", "AHS_WEIGHT"] | UPS大包裹优先    |
| 5        | "超大件费后不再收large超标费"        | ["OVERSIZE"]           | ["LARGE_PACKAGE_RESI"]    | 超大件优先级最高 |
| 6        | "超标费2" + "不再收超标费1"          | ["OVERSIZE_2"]         | ["OVERSIZE_1"]            | 多级超标费互斥   |

### MAX_GROUP 策略

| 规则编号 | 备注关键词                                 | max_group                              | 适用场景        |
| -------- | ------------------------------------------ | -------------------------------------- | --------------- |
| 7        | "AHS" + "以最高的一笔为准"                 | ["AHS_DIM", "AHS_WEIGHT"]              | AHS费用只取最高 |
| 8        | "over weight" + "over length" + "取较大值" | ["OVERSIZE_WEIGHT", "OVERSIZE_LENGTH"] | 超标费内部比较  |

---

## 代码结构

### 类型定义

```typescript
interface DisablePolicy {
  if_triggered: string[];
  disable: string[];
}

interface MaxGroupPolicy {
  max_group: string[];
}
```

### 函数签名

```typescript
function extractDisablePolicies(remark: string): DisablePolicy[];
function extractMaxGroupPolicies(remark: string): MaxGroupPolicy[];
```

### 主逻辑调用

```typescript
// 检测 IF_THEN_DISABLE 策略（条件禁用）
const disablePolicies = extractDisablePolicies(remark);
for (const policy of disablePolicies) {
  await client.query(`INSERT INTO dict_express_stack_policy...`, [
    versionId,
    countryCode,
    carrierServiceId,
    "IF_THEN_DISABLE",
    JSON.stringify({
      if_triggered: policy.if_triggered,
      disable: policy.disable,
    }),
  ]);
  policyCount++;
}

// 检测 MAX_GROUP 策略（取最高一笔）
const maxGroupPolicies = extractMaxGroupPolicies(remark);
for (const policy of maxGroupPolicies) {
  await client.query(`INSERT INTO dict_express_stack_policy...`, [
    versionId,
    countryCode,
    carrierServiceId,
    "MAX_GROUP",
    JSON.stringify({
      max_group: policy.max_group,
    }),
  ]);
  policyCount++;
}
```

---

## 规则检测逻辑详解

### 规则 1：超标费或超大件费后不再收AHS费用

```typescript
if ((remark.includes("超标费") || remark.includes("超大件费")) && remark.includes("不再收AHS")) {
  policies.push({
    if_triggered: ["OVERSIZE"],
    disable: ["AHS_DIM", "AHS_WEIGHT"],
  });
}
```

**匹配示例**：

- "收超标费或超大件费后不再收AHS费用"
- "超标费后不再收AHS费用"
- "超大件费后不再收AHS费用"

---

### 规则 2：收超大件费后不再收超标费

```typescript
if (remark.includes("超大件费后不再收超标费")) {
  policies.push({
    if_triggered: ["OVERSIZE"],
    disable: ["REJECT"],
  });
}
```

**匹配示例**：

- "收超大件费后不再收超标费"

---

### 规则 3：AHS-Weight 优先于 AHS-Size

```typescript
if (remark.includes("AHS-Weight") && remark.includes("AHS-Size") && remark.includes("不再收")) {
  policies.push({
    if_triggered: ["AHS_WEIGHT"],
    disable: ["AHS_DIM"],
  });
}
```

**匹配示例**：

- "如果收了AHS-Weight，就不再收AHS-Size"

---

### 规则 4：large超标费优先于AHS

```typescript
if (remark.includes("large超标") && remark.includes("不再收AHS")) {
  policies.push({
    if_triggered: ["LARGE_PACKAGE_RESI"],
    disable: ["AHS_DIM", "AHS_WEIGHT"],
  });
}
```

**匹配示例**：

- "收large超标费后不再收AHS费用"

---

### 规则 5：超大件费优先于large超标费

```typescript
if (remark.includes("超大件费后不再收large超标费")) {
  policies.push({
    if_triggered: ["OVERSIZE"],
    disable: ["LARGE_PACKAGE_RESI"],
  });
}
```

**匹配示例**：

- "收超大件费后不再收large超标费"

---

### 规则 6：超标费2优先于超标费1

```typescript
if (remark.includes("超标费2") && remark.includes("不再收超标费1")) {
  policies.push({
    if_triggered: ["OVERSIZE_2"],
    disable: ["OVERSIZE_1"],
  });
}
```

**匹配示例**：

- "收取超标费2后不再收超标费1"

---

### 规则 7：AHS费用取最高一笔

```typescript
if (remark.includes("AHS") && (remark.includes("以最高的一笔为准") || remark.includes("只取最高"))) {
  policies.push({
    max_group: ["AHS_DIM", "AHS_WEIGHT"],
  });
}
```

**匹配示例**：

- "收超标费或超大件费后不再收AHS费用；以最高的一笔为准"
- "AHS费用只取最高"

---

### 规则 8：超标费内部比较取较大值

```typescript
if (remark.includes("over weight") && remark.includes("over length") && remark.includes("取较大值")) {
  policies.push({
    max_group: ["OVERSIZE_WEIGHT", "OVERSIZE_LENGTH"],
  });
}
```

**匹配示例**：

- "over weight和over length同时满足时取较大值"

---

## 测试场景

### 场景 1：FedEx Ground (US)

**备注内容**：

```
收超标费或超大件费后不再收AHS费用；以最高的一笔为准；
收超大件费后不再收超标费;
```

**预期生成的策略**：

```json
[
  {
    "policy_type": "IF_THEN_DISABLE",
    "policy_json": {
      "if_triggered": ["OVERSIZE"],
      "disable": ["AHS_DIM", "AHS_WEIGHT"]
    }
  },
  {
    "policy_type": "MAX_GROUP",
    "policy_json": {
      "max_group": ["AHS_DIM", "AHS_WEIGHT"]
    }
  },
  {
    "policy_type": "IF_THEN_DISABLE",
    "policy_json": {
      "if_triggered": ["OVERSIZE"],
      "disable": ["REJECT"]
    }
  }
]
```

**预期数量**：3 条策略

---

### 场景 2：UPS Ground (US)

**备注内容**：

```
如果收了AHS-Weight，就不再收AHS-Size;
收large超标费或超大件费后不再收AHS费用；
收超大件费后不再收large超标费;
```

**预期生成的策略**：

```json
[
  {
    "policy_type": "IF_THEN_DISABLE",
    "policy_json": {
      "if_triggered": ["AHS_WEIGHT"],
      "disable": ["AHS_DIM"]
    }
  },
  {
    "policy_type": "IF_THEN_DISABLE",
    "policy_json": {
      "if_triggered": ["LARGE_PACKAGE_RESI"],
      "disable": ["AHS_DIM", "AHS_WEIGHT"]
    }
  },
  {
    "policy_type": "IF_THEN_DISABLE",
    "policy_json": {
      "if_triggered": ["OVERSIZE"],
      "disable": ["LARGE_PACKAGE_RESI"]
    }
  }
]
```

**预期数量**：3 条策略

---

### 场景 3：DPD (EU)

**备注内容**：

```
超标1：over weight和over length同时满足时取较大值;
收取超标费2后不再收超标费1;
超标费3独立收取，（即收取3后仍可收2或1）;
```

**预期生成的策略**：

```json
[
  {
    "policy_type": "MAX_GROUP",
    "policy_json": {
      "max_group": ["OVERSIZE_WEIGHT", "OVERSIZE_LENGTH"]
    }
  },
  {
    "policy_type": "IF_THEN_DISABLE",
    "policy_json": {
      "if_triggered": ["OVERSIZE_2"],
      "disable": ["OVERSIZE_1"]
    }
  }
]
```

**预期数量**：2 条策略

---

## 验证SQL

### 检查策略总数

```sql
SELECT policy_type, COUNT(*) as count
FROM dict_express_stack_policy
GROUP BY policy_type;
```

### 检查特定策略的 policy_json 格式

```sql
SELECT
  country_code,
  (SELECT service_name FROM dict_express_carrier_service WHERE id = sp.carrier_service_id) as carrier,
  policy_type,
  policy_json
FROM dict_express_stack_policy sp
ORDER BY country_code, carrier, policy_type;
```

### 验证 IF_THEN_DISABLE 策略

```sql
SELECT
  country_code,
  (SELECT service_name FROM dict_express_carrier_service WHERE id = sp.carrier_service_id) as carrier,
  policy_json->'if_triggered' as if_triggered,
  policy_json->'disable' as disable
FROM dict_express_stack_policy sp
WHERE policy_type = 'IF_THEN_DISABLE';
```

### 验证 MAX_GROUP 策略

```sql
SELECT
  country_code,
  (SELECT service_name FROM dict_express_carrier_service WHERE id = sp.carrier_service_id) as carrier,
  policy_json->'max_group' as max_group
FROM dict_express_stack_policy sp
WHERE policy_type = 'MAX_GROUP';
```

---

## 限制说明

### 不支持的规则

以下备注内容需要手动处理或扩展逻辑：

1. **金额计算规则**
   - 备注："金额=最低基础价格+peak"
   - 处理：在 `min_base_price` 字段设置，无需策略

2. **独立收取规则**
   - 备注："超标费3独立收取，（即收取3后仍可收2或1）"
   - 处理：无需策略，正常叠加

3. **复杂条件规则**
   - 备注："最长边，周长，毛重之间逻辑是且"
   - 处理：使用 `conditions_json` 字段，不在 stack_policies 中

4. **特殊业务规则**
   - 备注："FBA无拒收上限"、"FBW无拒收上限"
   - 处理：需要在规则表中单独设置，或在前端显示提示

5. **单位转换规则**
   - 备注："毛重单位：盎司"
   - 处理：在 `weight_input_unit` 字段设置

---

## 扩展建议

### 如需支持更多规则

可以按以下模式添加新的规则检测：

```typescript
// 在 extractDisablePolicies 中添加
if (remark.includes("新规则关键词1") && remark.includes("新规则关键词2")) {
  policies.push({
    if_triggered: ["TRIGGER_TYPE"],
    disable: ["DISABLE_TYPE1", "DISABLE_TYPE2"],
  });
}

// 在 extractMaxGroupPolicies 中添加
if (remark.includes("新规则关键词")) {
  policies.push({
    max_group: ["TYPE1", "TYPE2", "TYPE3"],
  });
}
```

### 费用类型对照表

| 费用名称             | 标准化类型           | 说明              |
| -------------------- | -------------------- | ----------------- |
| AHS-Size / AHS-Dim   | AHS_DIM              | 超大尺寸附加费    |
| AHS-Weight           | AHS_WEIGHT           | 超重附加费        |
| Oversize / 超大件    | OVERSIZE             | 超大件费          |
| Reject / 拒收 / 超标 | REJECT               | 超标拒收费        |
| Large Package        | LARGE_PACKAGE_RESI   | 大包裹住宅附加费  |
| Peak                 | PEAK                 | 旺季附加费        |
| Packaging            | PACKAGING            | 打包费            |
| Unauth OS            | UNAUTH_OS            | 未经授权超大件    |
| Seller Flex          | SELLER_FLEX_OVERSIZE | Seller Flex超大件 |

---

**更新版本**: v2.0  
**更新时间**: 2026-04-23  
**更新状态**: 已完成  
**脚本状态**: 可以测试
