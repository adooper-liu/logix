# 全球快递费规则导入指南

## 概述

本文档说明如何从 Excel 文件导入全球快递费规则数据到数据库。

---

## 数据源

**Excel 文件**: 全球快递费拒收超标标准20260214.xlsx

**数据统计**:

- 总记录数: 139 条
- 涉及国家: US, CA, DE, UK, FR, IT, ES, IE (8个国家)
- 承运商服务: 56 个
- 附加费规则: 139 条
- 堆叠策略: 23 条

---

## 导入方式

### 方式一：使用生成的 SQL 文件（推荐）

**优点**:

- 可直接审查 SQL 内容
- 支持事务回滚
- 适合生产环境

**步骤**:

1. **检查生成的 SQL 文件**

   ```
   文件路径: d:\Github\logix\docs-temp\express_cost_import.sql
   ```

2. **执行 SQL 导入**

   ```bash
   # 方式 1: 使用 psql 命令行
   psql -U postgres -d logix -f d:\Github\logix\docs-temp\express_cost_import.sql

   # 方式 2: 使用 Docker 容器
   docker exec -i logix-postgres psql -U postgres -d logix < d:\Github\logix\docs-temp\express_cost_import.sql
   ```

3. **验证导入结果**
   ```sql
   -- 检查数据量
   SELECT
     'version' as table_name, COUNT(*) as count
   FROM dict_express_surcharge_version
   WHERE version_key = 'v1.0-20260214'
   UNION ALL
   SELECT 'carrier_service', COUNT(*)
   FROM dict_express_carrier_service
   WHERE country_code IN ('US', 'CA', 'DE', 'UK', 'FR', 'IT', 'ES', 'IE')
   UNION ALL
   SELECT 'surcharge_rule', COUNT(*)
   FROM dict_express_surcharge_rule
   WHERE version_id = (SELECT id FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214')
   UNION ALL
   SELECT 'stack_policy', COUNT(*)
   FROM dict_express_stack_policy
   WHERE version_id = (SELECT id FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214');
   ```

**预期结果**:

```
 table_name      | count
-----------------+-------
 version         |     1
 carrier_service |    56
 surcharge_rule  |   139
 stack_policy    |    23
```

---

### 方式二：使用导入脚本

**优点**:

- 自动化处理
- 实时进度反馈
- 错误处理完善

**步骤**:

1. **运行导入脚本**

   ```bash
   cd d:\Github\logix\backend
   npx ts-node scripts/import-express-cost-simple.ts "D:/aosom/Downloads/全球快递费拒收超标标准20260214.xlsx"
   ```

2. **查看导入日志**

   ```
   === 全球快递费数据导入工具（简化版）===

   Excel 文件: D:/aosom/Downloads/全球快递费拒收超标标准20260214.xlsx
   数据库配置: localhost:5432/logix

   ✓ Excel 文件读取成功
   找到 139 条数据记录

   ✓ 数据库连接成功

   ✓ 事务已开启

   正在清空现有数据...
   ✓ 数据清空完成

   正在创建版本记录...
   ✓ 版本 ID: 1

   正在导入承运商服务...
   ✓ 成功导入 56 个承运商服务

   正在导入附加费规则...
   ✓ 成功导入 139 条规则

   正在导入堆叠策略...
   ✓ 成功导入 23 条策略

   ✓ 事务已提交

   === 导入完成 ===

   统计信息:
     - 版本 ID: 1
     - 承运商服务: 56
     - 附加费规则: 139
     - 堆叠策略: 23
   ```

---

### 方式三：重新生成 SQL（当 Excel 更新时）

如果 Excel 文件有更新，可以重新生成 SQL：

```bash
cd d:\Github\logix\backend
npx ts-node scripts/generate-express-cost-sql.ts \
  "D:/aosom/Downloads/全球快递费拒收超标标准20260214.xlsx" \
  "d:\Github\logix\docs-temp\express_cost_import.sql"
```

---

## 数据映射说明

### Excel 列 → 数据库字段

| Excel 列名     | 列序号 | 数据库字段                             | 说明                     |
| -------------- | ------ | -------------------------------------- | ------------------------ |
| 国别           | 0      | country_code                           | 国家代码                 |
| 快递方式       | 1      | service_name                           | 承运商+服务名称          |
| 类型           | 2      | type_raw / type_normalized             | 费用类型                 |
| 最长边         | 3      | longest_in                             | 最长边阈值（英寸）       |
| 次长边         | 4      | second_in                              | 次长边阈值               |
| 最短边         | 5      | shortest_in                            | 最短边阈值               |
| 周长           | 6      | girth_in                               | 周长阈值                 |
| 最长边+次长边  | 7      | l_plus_s_in                            | 长+次长阈值              |
| 三边和         | 8      | three_sides_sum_in                     | 三边和阈值               |
| 对角线         | 9      | diagonal_in                            | 对角线阈值               |
| 体积M³         | 10     | vol_m3_threshold                       | 体积阈值                 |
| 毛重           | 11     | gross_wt_value                         | 毛重阈值                 |
| 计价重（单箱） | 12     | rate_wt_single                         | 单箱计价重               |
| 计价重（多箱） | 13     | rate_wt_multi                          | 多箱计价重               |
| 最低计价重LBS  | 14     | min_billable_lbs                       | 最低计价重               |
| 金额           | 15     | amount_fixed / amount_min / amount_max | 费用金额                 |
| 最低基础价     | 16     | min_base_price                         | 最低基础价格             |
| 备注           | 17     | notes                                  | 备注信息（用于提取策略） |

---

## 类型规范化映射

| Excel 类型              | 标准化类型          | 说明             |
| ----------------------- | ------------------- | ---------------- |
| 拒收                    | REJECT              | 超标拒收         |
| AHS - Dimensions        | AHS_DIM             | 超大尺寸附加费   |
| AHS - Weight            | AHS_WEIGHT          | 超重附加费       |
| AHS - Packaging         | PACKAGING           | 打包费           |
| Oversize Charge         | OVERSIZE            | 超大件费         |
| Unauthorized OS         | UNAUTH_OS           | 未经授权超大件   |
| Large Package Surcharge | LARGE_PACKAGE_RESI  | 大包裹住宅附加费 |
| Additional Handling     | ADDITIONAL_HANDLING | 额外处理费       |
| Over Maximum Limits     | OVER_MAX            | 超限费           |
| Extra Care-Over length  | EXTRA_CARE          | 特别处理费       |
| Oversize-1 / 超标费1    | OVERSIZE_1          | 超标费等级1      |
| Oversize-2 / 超标费2    | OVERSIZE_2          | 超标费等级2      |

---

## 策略提取规则

### 自动提取的策略（23条）

从备注中自动识别并生成的策略：

1. **IF_THEN_DISABLE 策略**（条件禁用）
   - 超标费/超大件费 → 禁用AHS费用
   - 超大件费 → 禁用超标费
   - AHS-Weight → 禁用AHS-Size
   - large超标费 → 禁用AHS费用
   - 超大件费 → 禁用large超标费
   - 超标费2 → 禁用超标费1

2. **MAX_GROUP 策略**（取最高一笔）
   - AHS费用组（AHS_DIM, AHS_WEIGHT）
   - 超标费内部比较（OVERSIZE_WEIGHT, OVERSIZE_LENGTH）

### 策略示例

**FedEx Ground (US)**

```json
{
  "policy_type": "IF_THEN_DISABLE",
  "policy_json": {
    "if_triggered": ["OVERSIZE"],
    "disable": ["AHS_DIM", "AHS_WEIGHT"]
  }
}
```

**UPS Standard (CA)**

```json
{
  "policy_type": "IF_THEN_DISABLE",
  "policy_json": {
    "if_triggered": ["AHS_WEIGHT"],
    "disable": ["AHS_DIM"]
  }
}
```

---

## 验证步骤

### 1. 基础数据验证

```sql
-- 检查版本记录
SELECT * FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214';

-- 检查承运商服务数量（按国家分组）
SELECT country_code, COUNT(*) as service_count
FROM dict_express_carrier_service
WHERE country_code IN ('US', 'CA', 'DE', 'UK', 'FR', 'IT', 'ES', 'IE')
GROUP BY country_code
ORDER BY country_code;

-- 检查规则数量（按国家分组）
SELECT cs.country_code, COUNT(*) as rule_count
FROM dict_express_surcharge_rule r
JOIN dict_express_carrier_service cs ON r.carrier_service_id = cs.id
WHERE r.version_id = (SELECT id FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214')
GROUP BY cs.country_code
ORDER BY cs.country_code;
```

### 2. 策略验证

```sql
-- 检查策略数量（按类型分组）
SELECT policy_type, COUNT(*) as count
FROM dict_express_stack_policy
WHERE version_id = (SELECT id FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214')
GROUP BY policy_type;

-- 查看具体策略
SELECT
  sp.country_code,
  cs.service_name,
  sp.policy_type,
  sp.policy_json
FROM dict_express_stack_policy sp
JOIN dict_express_carrier_service cs ON sp.carrier_service_id = cs.id
WHERE sp.version_id = (SELECT id FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214')
ORDER BY sp.country_code, cs.service_name, sp.policy_type;
```

### 3. 数据完整性验证

```sql
-- 检查是否有孤立的规则（没有对应的承运商服务）
SELECT COUNT(*) as orphan_rules
FROM dict_express_surcharge_rule r
LEFT JOIN dict_express_carrier_service cs ON r.carrier_service_id = cs.id
WHERE cs.id IS NULL;

-- 检查是否有孤立的策略（没有对应的承运商服务）
SELECT COUNT(*) as orphan_policies
FROM dict_express_stack_policy sp
LEFT JOIN dict_express_carrier_service cs ON sp.carrier_service_id = cs.id
WHERE cs.id IS NULL;

-- 检查 condition_literal 字段（文本比较符）
SELECT COUNT(*) as rules_with_literals
FROM dict_express_surcharge_rule
WHERE condition_literal IS NOT NULL;

-- 检查金额区间
SELECT COUNT(*) as rules_with_range
FROM dict_express_surcharge_rule
WHERE amount_min IS NOT NULL OR amount_max IS NOT NULL;
```

### 4. 前端验证

1. 访问快递费管理页面：`/express-cost/import`
2. 检查数据是否正确显示
3. 使用试算功能：`/express-cost/calculator`
4. 验证策略是否正确生效

---

## 回滚操作

如需回滚导入的数据：

```sql
-- 删除策略
DELETE FROM dict_express_stack_policy
WHERE version_id = (SELECT id FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214');

-- 删除规则
DELETE FROM dict_express_surcharge_rule
WHERE version_id = (SELECT id FROM dict_express_surcharge_version WHERE version_key = 'v1.0-20260214');

-- 删除承运商服务（仅删除本次导入的国别）
DELETE FROM dict_express_carrier_service
WHERE country_code IN ('US', 'CA', 'DE', 'UK', 'FR', 'IT', 'ES', 'IE');

-- 删除版本
DELETE FROM dict_express_surcharge_version
WHERE version_key = 'v1.0-20260214';
```

---

## 常见问题

### Q1: 如何处理 "×" 和空值？

**A**: 脚本会自动将 "×"、"x" 和空值转换为 NULL。

### Q2: 文本比较符（如 ">120"）如何处理？

**A**: 脚本会提取 numeric 和 literal 两部分：

- numeric: NULL（因为不是纯数字）
- literal: ">120"（存储在 condition_literal 字段）

### Q3: 金额区间（如 "5.2-8.8"）如何处理？

**A**: 脚本会解析为：

- amount_fixed: NULL
- amount_min: 5.2
- amount_max: 8.8

### Q4: 策略提取失败怎么办？

**A**: 检查备注中的关键词是否匹配：

- IF_THEN_DISABLE: "不再收"、"后禁用"
- MAX_GROUP: "以最高的一笔为准"、"只取最高"、"取较大值"

如果备注格式变化，需要更新 `extractDisablePolicies()` 和 `extractMaxGroupPolicies()` 函数。

### Q5: 如何更新数据？

**A**:

1. 更新 Excel 文件
2. 重新生成 SQL: `npx ts-node scripts/generate-express-cost-sql.ts [Excel路径]`
3. 执行 SQL 导入（脚本会自动处理 ON CONFLICT）

---

## 文件清单

| 文件路径                                        | 说明            |
| ----------------------------------------------- | --------------- |
| `backend/scripts/generate-express-cost-sql.ts`  | SQL 生成脚本    |
| `backend/scripts/import-express-cost-simple.ts` | 直接导入脚本    |
| `docs-temp/express_cost_import.sql`             | 生成的 SQL 文件 |
| `docs-temp/EXPRESS_COST_IMPORT_GUIDE.md`        | 本指南          |

---

## 技术细节

### 事务管理

所有导入操作都在事务中执行：

```sql
BEGIN;
-- 插入版本
-- 插入承运商服务
-- 插入规则
-- 插入策略
-- 验证查询
COMMIT;
```

如果任何步骤失败，整个事务会回滚，确保数据一致性。

### ON CONFLICT 处理

所有 INSERT 语句都使用 `ON CONFLICT ... DO UPDATE` 或 `ON CONFLICT DO NOTHING`，支持重复执行。

### 子查询关联

规则表和策略表使用子查询关联 version_id 和 carrier_service_id，确保数据完整性：

```sql
SELECT v.id, cs.id, ...
FROM dict_express_surcharge_version v, dict_express_carrier_service cs
WHERE v.version_key = 'v1.0-20260214'
  AND cs.country_code = 'US'
  AND cs.service_name = 'FedEx Ground'
```

---

**文档版本**: v1.0  
**创建时间**: 2026-04-23  
**作者**: 刘志高  
**状态**: 已完成
