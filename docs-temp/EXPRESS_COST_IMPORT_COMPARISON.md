# 简化版导入脚本 vs 正式导入服务对比分析

## 对比概述

| 维度     | 简化版脚本 (import-express-cost-simple.ts) | 正式服务 (expressRuleImport.service.ts) |
| -------- | ------------------------------------------ | --------------------------------------- |
| 用途     | 一次性 Excel 批量导入                      | 前端页面交互式导入                      |
| 输入     | 本地 Excel 文件路径                        | 前端上传的文件 Buffer                   |
| 事务管理 | pg Client 手动事务                         | TypeORM EntityManager 事务              |
| 依赖     | pg, xlsx                                   | TypeORM, xlsx, Logger                   |
| 错误处理 | 整批回滚                                   | 行级错误收集，整批回滚                  |

---

## 功能完整性对比

### 1. 数据表覆盖

| 表名                           | 简化版  | 正式版  | 说明                           |
| ------------------------------ | ------- | ------- | ------------------------------ |
| dict_express_surcharge_version | ✅ 创建 | ✅ 创建 | 简化版固定版本名 v1.0-20260214 |
| dict_express_carrier_service   | ✅ 导入 | ✅ 导入 | 功能相同                       |
| dict_express_surcharge_rule    | ✅ 导入 | ✅ 导入 | 简化版缺少部分字段             |
| dict_express_stack_policy      | ✅ 导入 | ✅ 导入 | 简化版使用启发式提取           |

**结论**：简化版覆盖所有 4 张表，但字段映射有差异。

---

### 2. 字段映射差异

#### dict_express_surcharge_rule 表

| 字段                    | 简化版    | 正式版      | 影响                            |
| ----------------------- | --------- | ----------- | ------------------------------- |
| version_id              | ✅        | ✅          | 简化版固定为 v1.0               |
| carrier_service_id      | ✅        | ✅          | 功能相同                        |
| source_line_number      | ✅        | ✅          | 功能相同                        |
| type_raw                | ✅        | ✅          | 功能相同                        |
| type_normalized         | ✅        | ✅          | 简化版简单toUpperCase           |
| longest_in              | ✅        | ✅          | 功能相同                        |
| second_in               | ✅        | ✅          | 功能相同                        |
| shortest_in             | ✅        | ✅          | 功能相同                        |
| girth_in                | ✅        | ✅          | 功能相同                        |
| l_plus_s_in             | ✅        | ✅          | 功能相同                        |
| three_sides_sum_in      | ✅        | ✅          | 功能相同                        |
| diagonal_in             | ✅        | ✅          | 功能相同                        |
| vol_m3_threshold        | ✅        | ✅          | 功能相同                        |
| gross_wt_value          | ✅        | ✅          | 功能相同                        |
| rate_wt_single          | ✅        | ✅          | 功能相同                        |
| rate_wt_multi           | ✅        | ✅          | 功能相同                        |
| min_billable_lbs        | ✅        | ✅          | 功能相同                        |
| **weight_input_unit**   | ❌ 缺失   | ✅ 'lb'     | 低影响（有默认值）              |
| **dim_unit**            | ❌ 缺失   | ✅ 'in'     | 低影响（有默认值）              |
| **condition_literal**   | ❌ 缺失   | ✅ 提取文本 | 中影响（丢失 ">120" 等比较符）  |
| amount_fixed            | ✅        | ✅          | 功能相同                        |
| **amount_min**          | ❌ 缺失   | ✅ 解析区间 | 中影响（不支持 "5.2-8.8" 格式） |
| **amount_max**          | ❌ 缺失   | ✅ 解析区间 | 中影响（不支持金额区间）        |
| **charge_basis**        | ❌ 缺失   | ✅ 解析     | 低影响                          |
| **currency**            | ❌ 缺失   | ✅ 'USD'    | 低影响（有默认值）              |
| **conditions_json**     | ❌ 缺失   | ✅ 复杂条件 | 高影响（不支持 AND/OR）         |
| **ingest_completeness** | ✅ 'FULL' | ✅ 动态计算 | 低影响                          |
| notes                   | ✅        | ✅          | 功能相同                        |

**缺失字段统计**：8 个字段（2 个中影响，1 个高影响，5 个低影响）

---

### 3. 策略提取逻辑对比

#### IF_THEN_DISABLE 策略

| 场景                     | 简化版    | 正式版      | 说明               |
| ------------------------ | --------- | ----------- | ------------------ |
| Oversize 触发禁用 AHS    | ✅ 支持   | ✅ 支持     | 相同               |
| Peak 触发禁用 AHS        | ✅ 支持   | ✅ 支持     | 相同               |
| REJECT 触发禁用 OVERSIZE | ✅ 支持   | ❓ 未知     | 简化版新增         |
| 策略去重                 | ❌ 不处理 | ✅ 自动去重 | 简化版可能重复插入 |

#### MAX_GROUP 策略

| 场景              | 简化版    | 正式版      | 说明               |
| ----------------- | --------- | ----------- | ------------------ |
| AHS 组最高值      | ✅ 支持   | ✅ 支持     | 相同               |
| OVERSIZE 组最高值 | ✅ 支持   | ✅ 支持     | 相同               |
| 策略去重          | ❌ 不处理 | ✅ 自动去重 | 简化版可能重复插入 |

#### policy_json 结构差异

**简化版**：

```json
{
  "if_triggered": "OVERSIZE",
  "disable": "AHS_DIM,AHS_WT"
}
```

**正式版**：

```json
{
  "if_triggered": ["OVERSIZE"],
  "disable": ["AHS_DIM", "AHS_WT"]
}
```

**问题**：简化版使用字符串，正式版使用数组。这会导致 costEngine 无法正确匹配！

---

### 4. Excel 格式要求

#### 简化版

- ✅ 支持单 Sheet
- ✅ 自动识别列位置（基于索引）
- ❌ 不支持 metadata Sheet
- ❌ 不支持 stack_policies Sheet（从备注提取）

#### 正式版

- ✅ 要求 3 个 Sheet（metadata, surcharge_rules, stack_policies）
- ✅ 基于列名映射（更健壮）
- ✅ 支持金额区间格式（"5.2-8.8"）
- ✅ 支持文本比较符（">120", "<175"）

---

### 5. 错误处理

| 特性         | 简化版        | 正式版              |
| ------------ | ------------- | ------------------- |
| 事务回滚     | ✅ 支持       | ✅ 支持             |
| 行级错误收集 | ❌ 不支持     | ✅ 支持             |
| 错误详情返回 | ❌ 仅打印日志 | ✅ 返回 errors 数组 |
| 数据验证     | ❌ 无         | ✅ 必填字段检查     |
| 重复数据检测 | ❌ 无         | ✅ ON CONFLICT      |

---

## 关键问题

### 问题 1：policy_json 格式不匹配

**严重程度**：高

简化版生成的 policy_json：

```json
{
  "if_triggered": "OVERSIZE",
  "disable": "AHS_DIM,AHS_WT"
}
```

costEngine 期望的格式：

```json
{
  "if_triggered": ["OVERSIZE"],
  "disable": ["AHS_DIM", "AHS_WT"]
}
```

**影响**：策略无法生效，费用不会被禁用。

**修复**：

```typescript
// 修改第 259 行
JSON.stringify({
  if_triggered: [ifTriggered], // 改为数组
  disable: disable.split(","), // 改为数组
});

// 修改第 287 行
JSON.stringify({
  max_group: groupTypes.split(","), // 改为数组
});
```

---

### 问题 2：缺少 condition_literal 字段

**严重程度**：中

Excel 中的阈值可能包含比较符：

- ">120"（大于 120）
- "<175"（小于 175）
- "130-165"（区间）

简化版会将其解析为 null，丢失比较逻辑。

**影响**：无法正确匹配带比较符的阈值规则。

---

### 问题 3：不支持金额区间

**严重程度**：中

正式版支持 "5.2-8.8" 格式，解析为：

- amount_min: 5.2
- amount_max: 8.8

简化版会将其解析为 null。

---

### 问题 4：缺少 conditions_json 支持

**严重程度**：高

正式版支持复杂条件（AND/OR 嵌套），存储在 conditions_json 字段。

简化版完全不支持此功能。

**影响**：无法处理多条件组合规则。

---

### 问题 5：策略去重缺失

**严重程度**：中

简化版没有处理 UNIQUE 约束冲突，可能导致：

```
ERROR: duplicate key value violates unique constraint
```

**修复**：添加 ON CONFLICT 子句：

```sql
INSERT INTO dict_express_stack_policy (...)
VALUES (...)
ON CONFLICT (version_id, country_code, carrier_service_id, policy_type)
DO UPDATE SET policy_json = EXCLUDED.policy_json
```

---

## 适用场景评估

### 简化版适用于：

1. ✅ 一次性批量导入（如首次初始化）
2. ✅ 测试环境数据准备
3. ✅ 数据迁移脚本
4. ✅ Excel 格式简单（无复杂条件、无金额区间）

### 简化版不适用于：

1. ❌ 前端页面交互式导入（需要文件上传、进度反馈）
2. ❌ 包含复杂条件的规则（AND/OR、文本比较符）
3. ❌ 金额区间规则（"5.2-8.8"）
4. ❌ 需要精确错误报告的生产环境

---

## 修复建议

如果决定使用简化版，建议进行以下修复：

### 必修复（高优先级）

1. **修正 policy_json 格式**（第 259、287 行）
2. **添加策略去重**（ON CONFLICT 子句）
3. **添加 condition_literal 提取**

### 建议修复（中优先级）

4. 支持金额区间解析
5. 添加行级错误收集
6. 添加数据验证（必填字段检查）

### 可选修复（低优先级）

7. 支持 conditions_json（复杂条件）
8. 支持多 Sheet 导入
9. 添加导入进度显示

---

## 结论

**简化版脚本可以满足基础导入需求，但需要修复 3 个关键问题**：

1. policy_json 格式必须改为数组（否则策略失效）
2. 添加策略去重逻辑（否则可能报错）
3. 提取 condition_literal 字段（否则丢失比较符）

修复后，简化版可以用于：

- 首次数据初始化
- 测试环境数据准备
- 简单规则批量导入

对于包含复杂条件的规则，仍建议使用正式的前端导入服务。

---

**版本**: v1.0  
**创建时间**: 2026-04-23  
**分析对象**: import-express-cost-simple.ts vs expressRuleImport.service.ts
