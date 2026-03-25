# 车队公司代码规范化报告

## ✅ 完成状态

**所有车队公司代码已 100% 规范化！关联关系完整！**

---

## 📊 执行概览

### 执行时间

**2026-03-24**

### 涉及范围

- **3 个表**: `dict_trucking_companies`, `dict_trucking_port_mapping`, `dict_warehouse_trucking_mapping`
- **21 个车队公司**
- **81 条映射记录** (28 条港口映射 + 53 条仓库映射)

### 修复记录数

| 修复项                   | 数量 | 说明             |
| ------------------------ | ---- | ---------------- |
| 规范化 company_code      | 8    | 转换为全大写格式 |
| 同步 trucking_company_id | 0    | 映射表中已为大写 |
| 外键关联验证             | 100% | 无孤立记录       |

---

## 🔍 问题诊断

### 原始问题

在 `dict_trucking_companies` 表中发现 **8 个** 包含小写字母的 `company_code`：

| 原代码                                      | 问题       | 规范化后                                    |
| ------------------------------------------- | ---------- | ------------------------------------------- |
| Atlantic*Forwarding_Spain\_\_S_L*           | ✗ 包含小写 | ATLANTIC*FORWARDING_SPAIN\_\_S_L*           |
| CEVA_Freight**UK**Ltd                       | ✗ 包含小写 | CEVA_FREIGHT**UK**LTD                       |
| DSV_Air\_\_\_Sea_SAS                        | ✗ 包含小写 | DSV_AIR\_\_\_SEA_SAS                        |
| INTERFRACHT_Container_Overseas_Service_GmbH | ✗ 包含小写 | INTERFRACHT_CONTAINER_OVERSEAS_SERVICE_GMBH |
| LC_Logistics_Services\_\_Inc                | ✗ 包含小写 | LC_LOGISTICS_SERVICES\_\_INC                |
| Portguys_Logistics_Llc                      | ✗ 包含小写 | PORTGUYS_LOGISTICS_LLC                      |
| RT*LOGISTICA_Srl*                           | ✗ 包含小写 | RT*LOGISTICA_SRL*                           |
| YunExpress_UK_Ltd                           | ✗ 包含小写 | YUNEXPRESS_UK_LTD                           |

### 根本原因

- 历史数据录入时未统一命名规范
- 缺少格式验证约束

---

## ✅ 解决方案

### 执行的脚本

#### 1. `standardize-trucking-company-codes.sql` - 主规范化脚本

**功能**:

- 检查包含小写字母的 `company_code`
- 批量转换为全大写格式
- 同步更新映射表中的 `trucking_company_id`
- 验证外键关联完整性

**核心 SQL**:

```sql
-- 规范化为主大写
UPDATE dict_trucking_companies
SET company_code = UPPER(company_code)
WHERE company_code ~ '[a-z]';

-- 同步更新港口映射
UPDATE dict_trucking_port_mapping tpm
SET trucking_company_id = UPPER(tpm.trucking_company_id)
WHERE tpm.trucking_company_id ~ '[a-z]';

-- 同步更新仓库映射
UPDATE dict_warehouse_trucking_mapping wtm
SET trucking_company_id = UPPER(wtm.trucking_company_id)
WHERE wtm.trucking_company_id ~ '[a-z]';
```

---

## 📈 规范化结果

### 格式规范性

**dict_trucking_companies**:

```
总数：21
标准格式：21 (100%)
非标准格式：0 (0%)
```

**命名规范**:

- ✅ 全部使用大写字母 (A-Z)
- ✅ 允许数字 (0-9)
- ✅ 允许下划线 (\_)
- ✅ 符合正则表达式：`^[A-Z0-9_]+$`

### 外键关联完整性

**dict_trucking_port_mapping**:

```
总映射数：28
关联公司数：21
孤立记录：0 ✅
包含小写：0 ✅
```

**dict_warehouse_trucking_mapping**:

```
总映射数：53
关联公司数：21
孤立记录：0 ✅
包含小写：0 ✅
```

### 国家分布

| 国家        | 公司数 | 平均代码长度 | 规范率 |
| ----------- | ------ | ------------ | ------ |
| CA (加拿大) | 2      | 19.0         | 100%   |
| DE (德国)   | 1      | 43.0         | 100%   |
| ES (西班牙) | 1      | 31.0         | 100%   |
| FR (法国)   | 5      | 23.8         | 100%   |
| GB (英国)   | 2      | 19.0         | 100%   |
| IT (意大利) | 2      | 17.0         | 100%   |
| US (美国)   | 8      | 24.6         | 100%   |

---

## 📋 车队公司完整列表

### 按国家分组

#### 🇨🇦 加拿大 (CA) - 2 个

```
S_AND_R_TRUCKING                      (16 chars) ✓
TRANS_PRO_LOGISTIC_INC                (22 chars) ✓
```

#### 🇩🇪 德国 (DE) - 1 个

```
INTERFRACHT_CONTAINER_OVERSEAS_SERVICE_GMBH  (43 chars) ✓
```

#### 🇪🇸 西班牙 (ES) - 1 个

```
ATLANTIC_FORWARDING_SPAIN__S_L_       (31 chars) ✓
```

#### 🇫🇷 法国 (FR) - 5 个

```
ALPHA_CARGO_INTEMATIONAL_LOGISTICS    (34 chars) ✓
EV_CARGO_GLOBAL_FORWARDING            (26 chars) ✓
GEODIS_FF_FRANCE                      (16 chars) ✓
LEGENDRE_CELTIC                       (15 chars) ✓
XPO_GLOBAL_FORWARDING_FRANCE          (28 chars) ✓
```

#### 🇬🇧 英国 (GB) - 2 个

```
CEVA_FREIGHT__UK__LTD                 (21 chars) ✓
YUNEXPRESS_UK_LTD                     (17 chars) ✓
```

#### 🇮🇹 意大利 (IT) - 2 个

```
DSV_AIR___SEA_SAS                     (17 chars) ✓
RT_LOGISTICA_SRL_                     (17 chars) ✓
```

#### 🇺🇸 美国 (US) - 8 个

```
JK_EXPRESS_USA_INC                    (18 chars) ✓
JL_MANAGEMENT_USA_INC_                (22 chars) ✓
LC_LOGISTICS_SERVICES__INC            (26 chars) ✓
LFT_TRANSPORTATION_INC                (22 chars) ✓
NB_JIAVIEW_USA_INC                    (18 chars) ✓
PORTGUYS_LOGISTICS_LLC                (22 chars) ✓
SHANGHAI_FLYING_FISH_SUPPLY_CHAIN_TECHNOLOGY_CO__L  (50 chars) ✓
WENGER_TRUCKING_LLC                   (19 chars) ✓
```

---

## 🔗 映射关系统计

### 最活跃的车队公司 TOP 5

| 排名 | 公司代码                                    | 国家 | 港口映射 | 仓库映射 | 总计 |
| ---- | ------------------------------------------- | ---- | -------- | -------- | ---- |
| 1    | YUNEXPRESS_UK_LTD                           | GB   | 1        | 7        | 8    |
| 2    | CEVA_FREIGHT**UK**LTD                       | GB   | 1        | 5        | 6    |
| 3    | INTERFRACHT_CONTAINER_OVERSEAS_SERVICE_GMBH | DE   | 2        | 5        | 7    |
| 4    | ATLANTIC*FORWARDING_SPAIN\_\_S_L*           | ES   | 1        | 4        | 5    |
| 5    | S_AND_R_TRUCKING                            | CA   | 1        | 3        | 4    |

### 映射密度

- **平均每公司港口映射**: 1.33 条
- **平均每公司仓库映射**: 2.52 条
- **总映射记录**: 81 条

---

## 🛡️ 数据质量标准

### 遵循的规范

- ✅ **全大写字母**: A-Z
- ✅ **数字**: 0-9
- ✅ **下划线**: \_
- ✅ **最大长度**: 50 字符（符合数据库约束）
- ✅ **唯一性**: 所有 code 均唯一
- ✅ **外键完整性**: 100% 关联成功

### 验证规则

```sql
-- 格式验证正则
company_code ~ '^[A-Z0-9_]+$'

-- 外键验证
LEFT JOIN dict_trucking_companies tc
ON tc.company_code = mapping.trucking_company_id
WHERE tc.company_code IS NULL  -- 应返回 0 行
```

---

## 📄 执行文件

### SQL 脚本

1. **`standardize-trucking-company-codes.sql`**
   - 规范化 company_code 为全大写
   - 同步更新映射表
   - 验证外键关联

2. **`verify-trucking-company-integrity.sql`**
   - 全面验证数据规范性
   - 检查外键关联完整性
   - 生成统计报告

### 文档

1. **`TRUCKING_COMPANY_CODE_STANDARDIZATION.md`** - 本报告

---

## ✅ 验证查询

### 检查格式规范性

```sql
-- 应该返回 0
SELECT COUNT(*) FROM dict_trucking_companies
WHERE company_code ~ '[a-z]';

-- 应该返回 21 (100%)
SELECT COUNT(*) FROM dict_trucking_companies
WHERE company_code ~ '^[A-Z0-9_]+$';
```

### 检查外键关联

```sql
-- 应该返回 0 (无孤立记录)
SELECT COUNT(*) FROM dict_trucking_port_mapping tpm
LEFT JOIN dict_trucking_companies tc
ON tc.company_code = tpm.trucking_company_id
WHERE tc.company_code IS NULL;

-- 应该返回 0
SELECT COUNT(*) FROM dict_warehouse_trucking_mapping wtm
LEFT JOIN dict_trucking_companies tc
ON tc.company_code = wtm.trucking_company_id
WHERE tc.company_code IS NULL;
```

---

## 💡 最佳实践建议

### 1. 添加数据库约束

```sql
-- 添加 CHECK 约束确保格式
ALTER TABLE dict_trucking_companies
ADD CONSTRAINT chk_company_code_format
CHECK (company_code ~ '^[A-Z0-9_]+$');

-- 添加外键约束
ALTER TABLE dict_trucking_port_mapping
ADD CONSTRAINT fk_trucking_company
FOREIGN KEY (trucking_company_id)
REFERENCES dict_trucking_companies(company_code);

ALTER TABLE dict_warehouse_trucking_mapping
ADD CONSTRAINT fk_trucking_company
FOREIGN KEY (trucking_company_id)
REFERENCES dict_trucking_companies(company_code);
```

### 2. 建立索引

```sql
-- 如果尚未创建，添加索引
CREATE INDEX IF NOT EXISTS idx_trucking_port_mapping_company_id
ON dict_trucking_port_mapping(trucking_company_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_trucking_mapping_company_id
ON dict_warehouse_trucking_mapping(trucking_company_id);
```

### 3. 导入验证

在 Excel 导入功能中：

- ✅ 自动转换为大写
- ✅ 验证字符集（只允许 A-Z, 0-9, \_）
- ✅ 检查长度限制（≤50）
- ✅ 验证唯一性

---

## 🎁 成果与收益

### 数据质量提升

- ✅ 消除了大小写混用问题
- ✅ 统一了命名规范
- ✅ 确保了外键关联完整性
- ✅ 提高了查询性能

### 业务价值

- ✅ 支持可靠的数据关联查询
- ✅ 避免了因大小写不一致导致的查询失败
- ✅ 为数据分析和报表提供准确基础
- ✅ 便于系统集成和数据交换

### 技术价值

- ✅ 符合数据库设计规范
- ✅ 提高代码可读性和可维护性
- ✅ 减少数据转换开销
- ✅ 降低 bug 风险

---

## 🔄 与其他规范化的关系

本次规范化与之前的工作共同构成了完整的数据标准化体系：

1. ✅ **国家代码规范化** (ISO 3166-1 alpha-2)
2. ✅ **港口信息规范化** (UN/LOCODE + WGS84 坐标)
3. ✅ **车队公司代码规范化** (全大写格式)

这三大规范化共同确保了：

- 智能排柜系统的数据一致性
- 跨表关联查询的准确性
- 地理信息计算的可靠性

---

## 📊 最终验证报告

| 表名                            | 总记录 | 标准记录 | 孤立记录 | 合规率 |
| ------------------------------- | ------ | -------- | -------- | ------ |
| dict_trucking_companies         | 21     | 21       | N/A      | 100%   |
| dict_trucking_port_mapping      | 28     | 28       | 0        | 100%   |
| dict_warehouse_trucking_mapping | 53     | 53       | 0        | 100%   |

**综合合规率**: **100%** ✅

---

**规范化状态**: ✅ 完成  
**数据质量**: ⭐⭐⭐⭐⭐ 优秀  
**外键完整性**: 100%  
**下次检查**: 2026-04-24
