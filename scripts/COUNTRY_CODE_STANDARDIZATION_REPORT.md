# 字典表国家代码规范化报告

## 📊 执行时间

**2026-03-24**

## 🎯 目标

统一所有字典表中的国家代码，使用 **ISO 3166-1 alpha-2** 标准代码。

## 🔍 问题诊断

### 原始问题代码

| 表名                              | 不规范代码                                                                                                    | 数量 | 问题类型        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---- | --------------- |
| `dict_trucking_port_mapping`      | UK, BEL                                                                                                       | 23   | 非标准缩写      |
| `dict_warehouse_trucking_mapping` | MH STAR UK LTD, AOSOM CANADA INC., AOSOM ITALY SRL, AOSOM LLC, MH FRANCE, MH HANDEL GMBH, SPANISH AOSOM, S.L. | 53   | 公司全名        |
| `dict_trucking_companies`         | MH STAR UK LTD, AOSOM CANADA INC., AOSOM ITALY SRL, AOSOM LLC, MH FRANCE, MH HANDEL GMBH, SPANISH AOSOM, S.L. | 21   | 公司全名        |
| `dict_ports`                      | 中国，AE, AR, BR, CL, EG, IN, MA, PE, QA, SA, ZA                                                              | 25   | 中文名/代码缺失 |

### 问题根源

1. **历史数据录入不规范**：导入时使用了公司全名而非国家代码
2. **缺少数据验证**：没有外键约束或检查约束确保国家代码规范性
3. **标准不统一**：不同人员使用不同的国家表示方式

## ✅ 解决方案

### 执行的脚本

#### 1. `standardize-country-codes.sql` - 主规范化脚本

**转换映射关系：**

| 旧代码              | 新代码 | 说明                      | 影响表                                         |
| ------------------- | ------ | ------------------------- | ---------------------------------------------- |
| UK                  | GB     | 英国非标准缩写 → ISO 标准 | trucking_port_mapping                          |
| MH STAR UK LTD      | GB     | 公司全名 → 国家代码       | warehouse_trucking_mapping, trucking_companies |
| AOSOM CANADA INC.   | CA     | 公司全名 → 国家代码       | warehouse_trucking_mapping, trucking_companies |
| AOSOM ITALY SRL     | IT     | 公司全名 → 国家代码       | warehouse_trucking_mapping, trucking_companies |
| AOSOM LLC           | US     | 公司全名 → 国家代码       | warehouse_trucking_mapping, trucking_companies |
| MH FRANCE           | FR     | 公司简称 → 国家代码       | warehouse_trucking_mapping, trucking_companies |
| MH HANDEL GMBH      | DE     | 公司全名 → 国家代码       | warehouse_trucking_mapping, trucking_companies |
| SPANISH AOSOM, S.L. | ES     | 公司全名 → 国家代码       | warehouse_trucking_mapping, trucking_companies |
| 中国                | CN     | 中文 → ISO 代码           | ports                                          |

**更新记录数：**

- ✅ `dict_trucking_port_mapping`: 23 条
- ✅ `dict_warehouse_trucking_mapping`: 53 条
- ✅ `dict_trucking_companies`: 21 条
- ✅ `dict_ports`: 25 条

#### 2. `standardize-country-codes-fix.sql` - 补充修复脚本

**额外修复：**

| 修复项                          | 说明                                       | 数量      |
| ------------------------------- | ------------------------------------------ | --------- |
| BEL → BE                        | 比利时非标准缩写 → ISO 标准                | 5 条      |
| 添加缺失国家到 `dict_countries` | AE, AR, BR, CL, EG, IN, MA, PE, QA, SA, ZA | 11 个国家 |

**新增国家列表：**

```sql
AE - 阿联酋 (United Arab Emirates)
AR - 阿根廷 (Argentina)
BR - 巴西 (Brazil)
CL - 智利 (Chile)
EG - 埃及 (Egypt)
IN - 印度 (India)
MA - 摩洛哥 (Morocco)
PE - 秘鲁 (Peru)
QA - 卡塔尔 (Qatar)
SA - 沙特阿拉伯 (Saudi Arabia)
ZA - 南非 (South Africa)
```

## 📈 规范化结果

### 最终统计

#### `dict_trucking_port_mapping` (10 个国家)

```
BE: 5, CA: 2, DE: 1, ES: 1, FR: 5, GB: 2, IT: 2, NL: 1, RO: 1, US: 8
```

#### `dict_warehouse_trucking_mapping` (7 个国家)

```
CA: 6, DE: 5, ES: 4, FR: 15, GB: 12, IT: 2, US: 9
```

#### `dict_trucking_companies` (7 个国家)

```
CA: 2, DE: 1, ES: 1, FR: 5, GB: 2, IT: 2, US: 8
```

#### `dict_ports` (32 个国家)

```
AE: 2, AR: 1, AT: 1, AU: 4, BE: 1, BR: 1, CA: 3, CH: 1, CL: 1, CN: 17,
DE: 2, EG: 1, ES: 1, FR: 1, GB: 2, ID: 1, IN: 2, IT: 1, JP: 4, KR: 1,
MA: 1, MY: 1, NL: 1, NZ: 1, PE: 1, QA: 1, SA: 1, SG: 1, TH: 1, US: 13,
VN: 1, ZA: 1
```

### 验证结果

✅ **所有表的 country 字段 100% 规范化**

```sql
-- 验证查询：返回 0 行表示完全规范
SELECT DISTINCT country
FROM <table_name>
WHERE country NOT IN (SELECT code FROM dict_countries);
```

所有表的不规范代码检查结果均为 **0 行**！

## 📝 执行步骤回顾

### 方式 1：分步执行（已执行）

```bash
# 第 1 步：主规范化脚本
type standardize-country-codes.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db

# 第 2 步：补充修复脚本
type standardize-country-codes-fix.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db
```

### 方式 2：合并执行（未来使用）

```bash
# 合并两个脚本一次性执行
type standardize-country-codes.sql, standardize-country-codes-fix.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db
```

## 🛡️ 预防措施建议

### 1. 添加数据库约束

```sql
-- 为各个表添加外键约束
ALTER TABLE dict_trucking_port_mapping
ADD CONSTRAINT fk_country
FOREIGN KEY (country) REFERENCES dict_countries(code);

ALTER TABLE dict_warehouse_trucking_mapping
ADD CONSTRAINT fk_country
FOREIGN KEY (country) REFERENCES dict_countries(code);

ALTER TABLE dict_trucking_companies
ADD CONSTRAINT fk_country
FOREIGN KEY (country) REFERENCES dict_countries(code);

ALTER TABLE dict_ports
ADD CONSTRAINT fk_country
FOREIGN KEY (country) REFERENCES dict_countries(code);
```

### 2. 数据导入验证

在 Excel 导入功能中添加国家代码验证：

- ✅ 必须存在于 `dict_countries` 表
- ✅ 必须是 ISO 3166-1 alpha-2 标准代码
- ❌ 拒绝公司全名、非标准缩写、中文名

### 3. 前端输入规范

在管理界面中：

- 使用下拉选择而非文本输入
- 下拉选项来自 `dict_countries` 表
- 显示国家名称，存储国家代码

### 4. 定期检查脚本

创建定期检查脚本 `check-country-code-consistency.sql`：

```sql
-- 检查所有表的 country 字段是否规范
SELECT 'dict_trucking_port_mapping' as table_name, country, COUNT(*) as count
FROM dict_trucking_port_mapping
WHERE country NOT IN (SELECT code FROM dict_countries)
GROUP BY country

UNION ALL

SELECT 'dict_warehouse_trucking_mapping', country, COUNT(*)
FROM dict_warehouse_trucking_mapping
WHERE country NOT IN (SELECT code FROM dict_countries)
GROUP BY country

UNION ALL

SELECT 'dict_trucking_companies', country, COUNT(*)
FROM dict_trucking_companies
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
GROUP BY country

UNION ALL

SELECT 'dict_ports', country, COUNT(*)
FROM dict_ports
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
GROUP BY country;
```

## 📄 相关文件

- `scripts/standardize-country-codes.sql` - 主规范化脚本
- `scripts/standardize-country-codes-fix.sql` - 补充修复脚本
- `scripts/fix-uk-port-mapping.sql` - 英国港口映射修复（前期工作）
- `scripts/fix-uk-trucking-mapping-report.md` - 英国问题修复报告

## ✅ 收益

### 数据一致性

- ✅ 所有表使用统一的国家代码标准
- ✅ 消除了公司全名、非标准缩写等混乱情况
- ✅ 为国际化和多语言支持奠定基础

### 业务价值

- ✅ 支持按国家统计和分析
- ✅ 便于实现国别过滤和搜索
- ✅ 提高数据质量和系统可靠性

### 技术价值

- ✅ 符合数据库规范化原则
- ✅ 便于维护和扩展
- ✅ 减少数据不一致导致的 bug

## 🎯 下一步建议

1. **添加外键约束**：防止新的不规范数据产生
2. **更新前端界面**：使用下拉选择而非文本输入
3. **完善导入验证**：在 Excel 导入时验证国家代码
4. **建立检查机制**：定期运行一致性检查脚本
5. **更新文档**：在帮助文档中说明国家代码规范

---

**规范化状态**: ✅ 完成  
**数据质量**: ⭐⭐⭐⭐⭐ 优秀  
**建议优先级**: 添加外键约束（高）
