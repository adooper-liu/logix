# 模板字段补充说明

## 问题

用户反馈原始模板缺少以下字段：

- 最长边+次长边
- 三边和
- 对角线
- 体积M³
- 计价重（单箱）
- 计价重（多箱）
- 最低计价重LBS
- 最低基础价
- stack_policies Sheet

## 原因分析

### 1. 数据库表结构

数据库表 `dict_express_surcharge_rule` **完整包含**所有字段：

```sql
-- 尺寸阈值
longest_in DECIMAL(8,2),           -- 最长边
second_in DECIMAL(8,2),            -- 次长边
shortest_in DECIMAL(8,2),          -- 最短边
girth_in DECIMAL(8,2),             -- 周长
l_plus_s_in DECIMAL(8,2),          -- 最长边+次长边
three_sides_sum_in DECIMAL(8,2),   -- 三边和
diagonal_in DECIMAL(8,2),          -- 对角线
vol_m3_threshold DECIMAL(10,6),    -- 体积M³

-- 重量阈值
gross_wt_value DECIMAL(10,2),      -- 毛重
rate_wt_single DECIMAL(10,2),      -- 计价重（单箱）
rate_wt_multi DECIMAL(10,2),       -- 计价重（多箱）
min_billable_lbs DECIMAL(10,2),    -- 最低计价重LBS

-- 金额
amount_fixed DECIMAL(10,2),        -- 金额
amount_min DECIMAL(10,2),          -- 金额最小值
amount_max DECIMAL(10,2),          -- 金额最大值
min_base_price DECIMAL(10,2),      -- 最低基础价
```

### 2. 导入服务

后端导入服务 `expressRuleImport.service.ts` **已支持所有字段**的解析：

```typescript
// parseDimensions 方法解析所有尺寸和重量字段
const lPlusS = parseValue(row['最长边+次长边(in)']);
const threeSides = parseValue(row['三边和(in)']);
const diagonal = parseValue(row['对角线(in)']);
const volM3 = parseValue(row['体积M³']);
const rateWtSingle = parseValue(row['计价重（单箱）']);
const rateWtMulti = parseValue(row['计价重（多箱）']);
const minBillable = parseValue(row['最低计价重LBS']);

// importRuleRow 方法保存最低基础价
minBasePrice: row['最低基础价'] ? parseFloat(String(row['最低基础价'])) : null,
```

### 3. 问题根源

前端模板生成函数 `downloadTemplate()` **只包含了部分字段**，导致用户下载的模板不完整。

## 解决方案

### 修改文件

- **文件**: `frontend/src/views/import/ExpressCostImport.vue`
- **函数**: `downloadTemplate()`

### 修改内容

#### 1. surcharge_rules Sheet

**新增字段**（按顺序）：

1. 最长边+次长边(in)
2. 三边和(in)
3. 对角线(in)
4. 体积M³
5. 计价重（单箱）
6. 计价重（多箱）
7. 最低计价重LBS
8. 最低基础价

**完整字段列表**（18 个）：

```
国别, 快递方式, 类型,
最长边(in), 次长边(in), 最短边(in), 周长(in),
最长边+次长边(in), 三边和(in), 对角线(in), 体积M³,
毛重(lb), 计价重（单箱）, 计价重（多箱）, 最低计价重LBS,
金额, 最低基础价, 备注
```

#### 2. stack_policies Sheet（新增）

**字段列表**（7 个）：

```
国别, 快递方式, 策略类型, if_triggered, disable, max_group_types, remarks
```

**示例数据**：

```csv
US, FedEx Ground, IF_THEN_DISABLE, OVERSIZE, AHS_DIM, ×, Oversize 触发后禁用 AHS
US, FedEx Ground, MAX_GROUP, ×, ×, LARGE_PACKAGE_RESI,RESI_DELIVERY, 同组只取最高一笔
```

#### 3. 示例数据更新

添加了 3 行示例数据，覆盖常见场景：

1. **AHS - Dimensions**（US）：展示单边超长附加费
2. **Oversize**（US）：展示超大件附加费
3. **拒收**（CA）：展示计费重超限拒收规则

### 页面说明更新

更新了页面上的 Excel 格式说明，详细列出：

- surcharge_rules 的 4 类字段（基础、尺寸、重量、其他）
- stack_policies 的 2 种策略类型（IF_THEN_DISABLE、MAX_GROUP）

## 验证

### 步骤 1: 下载新模板

1. 访问 `/express-cost/import`
2. 点击"下载模板"按钮
3. 检查下载的 `全球快递费规则_完整模板.xlsx`

### 步骤 2: 验证 Sheet

打开 Excel 文件，确认包含 3 个 Sheet：

- ✅ surcharge_rules（18 列）
- ✅ metadata（5 列）
- ✅ stack_policies（7 列）

### 步骤 3: 验证字段

在 `surcharge_rules` Sheet 中，确认所有字段存在：

- ✅ 最长边+次长边(in)
- ✅ 三边和(in)
- ✅ 对角线(in)
- ✅ 体积M³
- ✅ 计价重（单箱）
- ✅ 计价重（多箱）
- ✅ 最低计价重LBS
- ✅ 最低基础价

### 步骤 4: 测试导入

1. 修改示例数据或添加新规则
2. 上传到导入页面
3. 检查导入结果
4. 验证数据库记录是否包含所有字段值

## 字段映射关系

| Excel 列名        | 数据库字段         | 类型          | 说明               |
| ----------------- | ------------------ | ------------- | ------------------ |
| 最长边+次长边(in) | l_plus_s_in        | DECIMAL(8,2)  | 最长边与次长边之和 |
| 三边和(in)        | three_sides_sum_in | DECIMAL(8,2)  | 三边长度之和       |
| 对角线(in)        | diagonal_in        | DECIMAL(8,2)  | 对角线长度         |
| 体积M³            | vol_m3_threshold   | DECIMAL(10,6) | 体积阈值（立方米） |
| 计价重（单箱）    | rate_wt_single     | DECIMAL(10,2) | 单箱计价重         |
| 计价重（多箱）    | rate_wt_multi      | DECIMAL(10,2) | 多箱总计价重       |
| 最低计价重LBS     | min_billable_lbs   | DECIMAL(10,2) | 最低计价重下限     |
| 最低基础价        | min_base_price     | DECIMAL(10,2) | 最低基础价格       |

## 注意事项

1. **未使用的字段用 × 标记**
   - 示例：AHS 规则只需要 `最长边`，其他尺寸字段填 `×`

2. **文本比较符自动识别**
   - 示例：`>120`、`<175` 会存储到 `condition_literal` 字段

3. **金额区间格式**
   - 示例：`4.87-6.25` 会解析为 `amount_min=4.87`, `amount_max=6.25`

4. **stack_policies 为可选**
   - 如果不需要互斥策略，可以删除此 Sheet
   - 系统只会导入 `surcharge_rules` 和 `metadata`

5. **数据完整性标记**
   - FR/IT 部分行金额为 `×` 时，`ingest_completeness='INCOMPLETE'`
   - 其他完整数据标记为 `FULL`

---

**修复日期**: 2026-04-23  
**修复人**: SOLO Coder  
**影响范围**: 前端模板生成函数
