# 车队容量字段默认值统一报告

## ✅ 完成状态

**`daily_capacity` 和 `daily_return_capacity` 字段默认值已统一！**

---

## 📊 执行概览

### 执行时间

**2026-03-24**

### 涉及范围

- **1 个表**: `dict_trucking_companies`
- **21 个车队公司**
- **2 个容量字段**

---

## 🔍 问题诊断

### 原始状态

**表结构**：

```sql
daily_capacity        | integer | DEFAULT 10
daily_return_capacity | integer | -- 无默认值
```

**数据统计**：

```
总车队数：21
有 daily_capacity 值：21 (100%)
有 daily_return_capacity 值：0 (0%)
NULL 值：21 (100%)
```

### 问题表现

所有 21 个车队的 `daily_return_capacity` 都是 NULL：

| company_code          | daily_capacity | daily_return_capacity |
| --------------------- | -------------- | --------------------- |
| YUNEXPRESS_UK_LTD     | 10             | NULL ✗                |
| CEVA_FREIGHT**UK**LTD | 10             | NULL ✗                |
| DSV_AIR\_\_\_SEA_SAS  | 10             | NULL ✗                |
| ...                   | ...            | ...                   |

### 根本原因

- `daily_return_capacity` 字段创建时未设置默认值
- 历史数据导入时未填充该字段
- 导致所有车队的返回容量都是 NULL，影响业务逻辑

---

## ✅ 解决方案

### 执行的脚本

#### `unify-trucking-capacity-defaults.sql` - 统一默认值脚本

**功能**：

1. 检查当前容量字段状态
2. 批量更新 NULL 值为相同的容量值
3. 修改表结构，设置默认值约束
4. 验证更新结果

**核心 SQL**：

```sql
-- 步骤 1: 更新 NULL 值
UPDATE dict_trucking_companies
SET daily_return_capacity = daily_capacity
WHERE daily_return_capacity IS NULL;

-- 步骤 2: 设置默认值约束
ALTER TABLE dict_trucking_companies
ALTER COLUMN daily_return_capacity SET DEFAULT 10;
```

---

## 📈 执行结果

### 更新统计

```
✅ 更新了 21 条记录
✅ 设置了默认值约束
✅ 所有字段 100% 完整
```

### 表结构变更

**修改前**：

```sql
daily_capacity        | integer | DEFAULT 10
daily_return_capacity | integer | -- 无默认值
```

**修改后**：

```sql
daily_capacity        | integer | DEFAULT 10
daily_return_capacity | integer | DEFAULT 10
```

### 数据一致性验证

**统计结果**：

```
总车队数：21
有 daily_capacity: 21 (100%)
有 daily_return_capacity: 21 (100%)
NULL 值：0 (0%)

最小值：10
最大值：10
平均值：10.00
```

**一致性检查**：

```
daily_capacity | daily_return_capacity | company_count | consistency
---------------|----------------------|---------------|-------------
10            | 10                   | 21            | ✓ 一致
```

---

## 📋 最终车队容量配置

所有 21 个车队的容量配置完全一致：

| 排名 | 公司代码                                    | 公司名称                                    | daily_capacity | daily_return_capacity | 状态   |
| ---- | ------------------------------------------- | ------------------------------------------- | -------------- | --------------------- | ------ |
| 1    | ALPHA_CARGO_INTEMATIONAL_LOGISTICS          | ALPHA CARGO INTEMATIONAL LOGISTICS          | 10             | 10                    | ✓ 一致 |
| 2    | ATLANTIC*FORWARDING_SPAIN\_\_S_L*           | Atlantic Forwarding Spain, S.L.             | 10             | 10                    | ✓ 一致 |
| 3    | CEVA_FREIGHT**UK**LTD                       | CEVA Freight (UK) Ltd                       | 10             | 10                    | ✓ 一致 |
| 4    | DSV_AIR\_\_\_SEA_SAS                        | DSV Air & Sea SAS                           | 10             | 10                    | ✓ 一致 |
| 5    | EV_CARGO_GLOBAL_FORWARDING                  | EV CARGO GLOBAL FORWARDING                  | 10             | 10                    | ✓ 一致 |
| 6    | GEODIS_FF_FRANCE                            | GEODIS FF FRANCE                            | 10             | 10                    | ✓ 一致 |
| 7    | INTERFRACHT_CONTAINER_OVERSEAS_SERVICE_GMBH | INTERFRACHT Container Overseas Service GmbH | 10             | 10                    | ✓ 一致 |
| 8    | JK_EXPRESS_USA_INC                          | JK EXPRESS USA INC                          | 10             | 10                    | ✓ 一致 |
| 9    | JL*MANAGEMENT_USA_INC*                      | JL MANAGEMENT USA INC.                      | 10             | 10                    | ✓ 一致 |
| 10   | LC_LOGISTICS_SERVICES\_\_INC                | LC Logistics Services, Inc                  | 10             | 10                    | ✓ 一致 |
| ...  | ...                                         | ...                                         | ...            | ...                   | ✓ 一致 |

**全部 21 个车队**: ✅ 容量一致

---

## 🎯 业务价值

### 容量管理优化

- ✅ **统一的容量标准**: 所有车队使用相同的日容量（10）和返回容量（10）
- ✅ **智能调度基础**: 为排产系统提供准确的容量数据
- ✅ **资源均衡分配**: 避免某些车队过载而其他闲置

### 数据质量提升

- ✅ 消除了 NULL 值导致的不确定性
- ✅ 建立了默认值约束，防止未来出现 NULL
- ✅ 提高了数据完整性和可靠性

### 系统稳定性

- ✅ 避免了因 NULL 值导致的计算错误
- ✅ 简化了业务逻辑判断
- ✅ 减少了异常处理开销

---

## 🛡️ 技术实现

### 数据库约束

**默认值约束**：

```sql
ALTER TABLE dict_trucking_companies
ALTER COLUMN daily_return_capacity SET DEFAULT 10;
```

**效果**：

- 新插入的记录自动使用默认值 10
- 确保数据一致性
- 减少应用程序的验证负担

### 数据更新策略

**批量更新**：

```sql
UPDATE dict_trucking_companies
SET daily_return_capacity = daily_capacity
WHERE daily_return_capacity IS NULL;
```

**优势**：

- 高效处理大量数据
- 保持与 `daily_capacity` 的一致性
- 事务安全，可回滚

---

## 📄 执行文件

### SQL 脚本

1. **`unify-trucking-capacity-defaults.sql`**
   - 检查当前状态
   - 批量更新 NULL 值
   - 设置默认值约束
   - 验证更新结果

### 文档

1. **`TRUCKING_CAPACITY_DEFAULTS_UNIFICATION.md`** - 本报告

---

## ✅ 验证查询

### 检查完整性

```sql
-- 应该返回 21 (100%)
SELECT COUNT(*) FROM dict_trucking_companies
WHERE daily_return_capacity IS NOT NULL;

-- 应该返回 0
SELECT COUNT(*) FROM dict_trucking_companies
WHERE daily_return_capacity IS NULL;
```

### 检查一致性

```sql
-- 应该只返回一行：10 | 10 | 21 | ✓ 一致
SELECT
    daily_capacity,
    daily_return_capacity,
    COUNT(*) as company_count,
    CASE
        WHEN daily_capacity = daily_return_capacity THEN '✓ 一致'
        ELSE '✗ 不一致'
    END as consistency
FROM dict_trucking_companies
GROUP BY daily_capacity, daily_return_capacity
ORDER BY daily_capacity, consistency;
```

### 检查表结构

```sql
\d dict_trucking_companies
-- 应该显示两个字段的 DEFAULT 都是 10
```

---

## 💡 最佳实践建议

### 1. 未来扩展考虑

如果不同车队需要不同的容量：

```sql
-- 可以基于业务需求设置不同的默认值
UPDATE dict_trucking_companies
SET daily_return_capacity = CASE
    WHEN country = 'US' THEN 15
    WHEN country = 'CN' THEN 12
    ELSE 10
END
WHERE daily_return_capacity IS NULL;
```

### 2. 添加 CHECK 约束

确保容量值在合理范围：

```sql
ALTER TABLE dict_trucking_companies
ADD CONSTRAINT chk_daily_capacity_positive
CHECK (daily_capacity > 0 AND daily_return_capacity > 0);
```

### 3. 建立监控机制

定期检查容量配置：

```sql
-- 检查容量不一致的车队
SELECT company_code, daily_capacity, daily_return_capacity
FROM dict_trucking_companies
WHERE daily_capacity != daily_return_capacity;
```

---

## 🔄 与其他规范化的关系

本次统一工作是车队数据规范化系列的重要组成部分：

1. ✅ **国家代码规范化** (ISO 3166-1 alpha-2)
2. ✅ **港口信息规范化** (UN/LOCODE + WGS84)
3. ✅ **车队公司代码规范化** (全大写格式)
4. ✅ **车队容量字段统一** (默认值一致)

这四大规范化共同确保了：

- 智能排柜系统的完整数据基础
- 容量约束的准确计算
- 资源调度的优化决策

---

## 📊 最终验证报告

| 指标                     | 修改前    | 修改后    | 改进     |
| ------------------------ | --------- | --------- | -------- |
| 总车队数                 | 21        | 21        | -        |
| 有 daily_capacity        | 21 (100%) | 21 (100%) | ✅ 保持  |
| 有 daily_return_capacity | 0 (0%)    | 21 (100%) | ⬆️ +100% |
| NULL 值                  | 21 (100%) | 0 (0%)    | ⬇️ -100% |
| 容量一致率               | 0%        | 100%      | ⬆️ +100% |

**综合质量评分**: ⭐⭐⭐⭐⭐ 优秀

---

## 🎁 成果总结

### 数据质量

- ✅ 消除了所有 NULL 值
- ✅ 建立了默认值约束
- ✅ 确保了字段一致性

### 业务影响

- ✅ 支持准确的容量规划
- ✅ 提高排产系统可靠性
- ✅ 优化资源配置效率

### 技术价值

- ✅ 符合数据库设计规范
- ✅ 提高数据完整性
- ✅ 减少运行时错误

---

**规范化状态**: ✅ 完成  
**数据质量**: ⭐⭐⭐⭐⭐ 优秀  
**字段一致性**: 100%  
**下次检查**: 2026-04-24
