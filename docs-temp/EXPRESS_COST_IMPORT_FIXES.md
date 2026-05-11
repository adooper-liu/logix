# 简化版导入脚本修复说明

## 修复概述

修复了 [import-express-cost-simple.ts](file://d:/Github/logix/backend/scripts/import-express-cost-simple.ts) 的 3 个关键问题，使其可以正确导入快递费规则数据。

---

## 修复详情

### 修复 1：policy_json 格式错误（高优先级）

**问题**：简化版生成的 policy_json 使用字符串，但 costEngine 期望的是数组。

**影响**：策略无法生效，费用不会被正确禁用。

**修复位置**：第 248-269 行、第 276-291 行

**修复内容**：

#### IF_THEN_DISABLE 策略

```typescript
// 修复前（错误）
JSON.stringify({ if_triggered: ifTriggered, disable });
// 生成: {"if_triggered":"OVERSIZE","disable":"AHS_DIM,AHS_WT"}

// 修复后（正确）
JSON.stringify({
  if_triggered: [ifTriggered], // 改为数组
  disable: disable.split(","), // 改为数组
});
// 生成: {"if_triggered":["OVERSIZE"],"disable":["AHS_DIM","AHS_WT"]}
```

#### MAX_GROUP 策略

```typescript
// 修复前（错误）
JSON.stringify({ max_group_types: groupTypes });
// 生成: {"max_group_types":"AHS_DIM,AHS_WT"}

// 修复后（正确）
JSON.stringify({
  max_group: groupTypes.split(","), // 改为数组，字段名改为 max_group
});
// 生成: {"max_group":["AHS_DIM","AHS_WT"]}
```

**验证方法**：

```sql
SELECT policy_type, policy_json
FROM dict_express_stack_policy
WHERE policy_type = 'IF_THEN_DISABLE'
LIMIT 1;

-- 期望结果:
-- policy_json: {"if_triggered":["OVERSIZE"],"disable":["AHS_DIM","AHS_WT"]}
```

---

### 修复 2：策略去重缺失（高优先级）

**问题**：没有处理 UNIQUE 约束冲突，可能导致重复插入报错。

**影响**：导入失败，抛出 duplicate key 错误。

**修复位置**：第 252-255 行、第 277-280 行

**修复内容**：

```sql
-- 修复前（无去重）
INSERT INTO dict_express_stack_policy (...)
VALUES (...)

-- 修复后（添加 ON CONFLICT）
INSERT INTO dict_express_stack_policy (...)
VALUES (...)
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET
  policy_json = EXCLUDED.policy_json,
  updated_at = NOW()
```

**说明**：

- 当遇到重复的 (version_id, country_code, carrier_service_id, policy_type) 组合时
- 自动更新 policy_json 和 updated_at 字段
- 避免 UNIQUE 约束冲突错误

---

### 修复 3：缺少 condition_literal 字段（中优先级）

**问题**：Excel 中的阈值可能包含比较符（如 ">120", "<175"），简化版会将其解析为 null。

**影响**：无法正确匹配带比较符的阈值规则。

**修复位置**：第 35-59 行、第 181-205 行、第 230-247 行

**修复内容**：

#### 1. 新增 parseValueWithLiteral 函数

```typescript
// 解析数值（支持文本比较符，如 ">120", "<175"）
function parseValueWithLiteral(value: any): { numeric: number | null; literal: string | null } {
  if (value === null || value === undefined || value === "" || value === "×") {
    return { numeric: null, literal: null };
  }

  const str = String(value).trim();

  // 检测文本比较符（匹配 ">120", "<175", ">=130" 等）
  const match = str.match(/^([><=!]+)\s*(\d+\.?\d*)$/);
  if (match) {
    return { numeric: null, literal: str };
  }

  // 纯数字
  const num = parseFloat(str);
  if (!isNaN(num)) {
    return { numeric: num, literal: null };
  }

  return { numeric: null, literal: str };
}
```

#### 2. 在插入时收集文本比较符

```typescript
// 解析尺寸和重量（支持文本比较符）
const longest = parseValueWithLiteral(row[3]);
const second = parseValueWithLiteral(row[4]);
// ... 其他字段

// 收集所有文本比较符
const literals = [longest.literal, second.literal, girth.literal, lPlusS.literal, threeSides.literal, grossWt.literal].filter(Boolean).join("; ") || null;
```

#### 3. 在 SQL 中插入 condition_literal 字段

```sql
INSERT INTO dict_express_surcharge_rule (
  ...,
  condition_literal,
  ...
)
VALUES (
  ...,
  $22,  -- literals 变量
  ...
)
```

**示例**：

- Excel 值: ">120"
- 解析结果: `{ numeric: null, literal: ">120" }`
- 数据库存储: `condition_literal = ">120"`

---

## 额外改进

### 改进 1：支持金额区间解析

**功能**：支持 Excel 中的 "5.2-8.8" 格式，解析为 amount_min 和 amount_max。

**修复位置**：第 206-219 行

**代码**：

```typescript
// 解析金额（支持区间格式 "5.2-8.8"）
let amountFixed: number | null = null;
let amountMin: number | null = null;
let amountMax: number | null = null;
const amountStr = String(row[15] || "").trim();

if (amountStr && amountStr !== "×") {
  const rangeMatch = amountStr.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
  if (rangeMatch) {
    // 区间格式: "5.2-8.8"
    amountMin = parseFloat(rangeMatch[1]);
    amountMax = parseFloat(rangeMatch[2]);
  } else {
    // 固定金额: "7.85"
    const num = parseFloat(amountStr);
    if (!isNaN(num)) {
      amountFixed = num;
    }
  }
}
```

**示例**：

- "5.2-8.8" → amount_min=5.2, amount_max=8.8, amount_fixed=null
- "7.85" → amount_fixed=7.85, amount_min=null, amount_max=null

---

### 改进 2：补充缺失字段

**修复位置**：第 227-244 行

**补充字段**：

- `weight_input_unit`: 固定为 'lb'
- `dim_unit`: 固定为 'in'
- `amount_min`: 金额区间最小值
- `amount_max`: 金额区间最大值
- `condition_literal`: 文本比较符

---

## 字段映射对照表

| Excel 列名            | 数据库字段         | 修复前  | 修复后            |
| --------------------- | ------------------ | ------- | ----------------- |
| 最长边                | longest_in         | ✅      | ✅ 支持文本比较符 |
| 次长边                | second_in          | ✅      | ✅ 支持文本比较符 |
| 最短边                | shortest_in        | ✅      | ✅                |
| 周长                  | girth_in           | ✅      | ✅ 支持文本比较符 |
| 最长边+次长边         | l_plus_s_in        | ✅      | ✅ 支持文本比较符 |
| 三边和                | three_sides_sum_in | ✅      | ✅ 支持文本比较符 |
| 对角线                | diagonal_in        | ✅      | ✅ 支持文本比较符 |
| 体积M³                | vol_m3_threshold   | ✅      | ✅                |
| 毛重                  | gross_wt_value     | ✅      | ✅ 支持文本比较符 |
| 计价重（单箱）        | rate_wt_single     | ✅      | ✅                |
| 计价重（多箱）        | rate_wt_multi      | ✅      | ✅                |
| 最低计价重LBS         | min_billable_lbs   | ✅      | ✅                |
| **weight_input_unit** | weight_input_unit  | ❌ 缺失 | ✅ 'lb'           |
| **dim_unit**          | dim_unit           | ❌ 缺失 | ✅ 'in'           |
| 金额                  | amount_fixed       | ✅      | ✅ 支持区间格式   |
| **金额**              | amount_min         | ❌ 缺失 | ✅ 解析区间       |
| **金额**              | amount_max         | ❌ 缺失 | ✅ 解析区间       |
| 最低基础价            | min_base_price     | ✅      | ✅                |
| **文本比较符**        | condition_literal  | ❌ 缺失 | ✅ 提取并存储     |
| 备注                  | notes              | ✅      | ✅                |

**修复统计**：

- 新增支持字段：5 个
- 增强字段：8 个（支持文本比较符或区间格式）
- 修复 policy_json 格式：2 处
- 添加去重逻辑：2 处

---

## 使用方法

```bash
cd d:\Github\logix\backend
npx ts-node scripts/import-express-cost-simple.ts "D:/aosom/Downloads/全球快递费拒收超标标准20260214.xlsx"
```

---

## 验证步骤

### 1. 检查数据导入

```sql
-- 检查版本
SELECT * FROM dict_express_surcharge_version ORDER BY id DESC LIMIT 1;

-- 检查承运商服务数量
SELECT COUNT(*) FROM dict_express_carrier_service;

-- 检查规则数量
SELECT COUNT(*) FROM dict_express_surcharge_rule;

-- 检查策略数量
SELECT COUNT(*) FROM dict_express_stack_policy;
```

### 2. 验证 policy_json 格式

```sql
-- 检查 IF_THEN_DISABLE 策略
SELECT
  policy_type,
  policy_json,
  (policy_json->'if_triggered') as if_triggered,
  (policy_json->'disable') as disable
FROM dict_express_stack_policy
WHERE policy_type = 'IF_THEN_DISABLE';

-- 检查 MAX_GROUP 策略
SELECT
  policy_type,
  policy_json,
  (policy_json->'max_group') as max_group
FROM dict_express_stack_policy
WHERE policy_type = 'MAX_GROUP';
```

### 3. 验证 condition_literal

```sql
-- 检查包含文本比较符的规则
SELECT
  type_raw,
  condition_literal,
  longest_in,
  gross_wt_value
FROM dict_express_surcharge_rule
WHERE condition_literal IS NOT NULL
LIMIT 10;
```

### 4. 验证金额区间

```sql
-- 检查包含金额区间的规则
SELECT
  type_raw,
  amount_fixed,
  amount_min,
  amount_max
FROM dict_express_surcharge_rule
WHERE amount_min IS NOT NULL OR amount_max IS NOT NULL
LIMIT 10;
```

---

## 测试场景

### 场景 1：文本比较符规则

**Excel 数据**：
| 国别 | 快递方式 | 类型 | 最长边 | 金额 | 备注 |
|------|---------|------|--------|------|------|
| US | FedEx Ground | Oversize | >96 | 75.67 | 超大件费 |

**预期结果**：

- longest_in: null
- condition_literal: ">96"
- amount_fixed: 75.67

### 场景 2：金额区间规则

**Excel 数据**：
| 国别 | 快递方式 | 类型 | 金额 | 备注 |
|------|---------|------|------|------|
| US | FedEx Ground | AHS | 5.2-8.8 | 按重量分级 |

**预期结果**：

- amount_fixed: null
- amount_min: 5.2
- amount_max: 8.8

### 场景 3：策略去重

**Excel 数据**：
| 国别 | 快递方式 | 类型 | 备注 |
|------|---------|------|------|
| US | FedEx Ground | Oversize | 不再收 AHS |
| US | FedEx Ground | Peak | 不再收 AHS |

**预期结果**：

- 生成 1 条 IF_THEN_DISABLE 策略（ON CONFLICT 自动去重）
- policy_json 被最后一条更新

---

## 限制说明

虽然修复了 3 个关键问题，但简化版脚本仍有以下限制：

1. **不支持 conditions_json**：复杂条件（AND/OR 嵌套）无法处理
2. **单 Sheet 导入**：不支持 metadata 和 stack_policies 独立 Sheet
3. **无行级错误收集**：遇到错误会整体回滚，无法返回详细错误列表
4. **固定版本名**：版本名硬编码为 'v1.0-20260214'

**适用场景**：首次数据初始化、测试环境数据准备、简单规则批量导入

**不适用场景**：包含复杂条件的规则、需要精确错误报告的生产环境、频繁更新

---

**修复版本**: v1.1  
**修复时间**: 2026-04-23  
**修复人员**: AI Assistant  
**影响范围**: import-express-cost-simple.ts 脚本
