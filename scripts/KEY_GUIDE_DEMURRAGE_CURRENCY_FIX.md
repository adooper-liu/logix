# 滞港费标准货币配置修复方案

## 问题发现

**时间**: 2026-03-31  
**发现人**: 刘志高

### 问题描述

货柜详情页显示滞港费时，货币符号固定为 USD，没有根据销往国家自动切换。

**案例**：
- 客户：AOSOM ITALY SRL（意大利客户）
- 目的港：热那亚（ITGIT）
- 销往国家：意大利（IT）
- **当前显示**: USD ❌
- **预期显示**: EUR ✅

### 根本原因

`ext_demurrage_standards` 表中所有国家的滞港费标准货币全部被配置为 USD，这是**系统性的数据配置错误**。

**数据库查询结果**：

```sql
SELECT LEFT(s.destination_port_code, 2) as country_code, s.currency, COUNT(*) 
FROM ext_demurrage_standards s 
WHERE s.is_chargeable = 'N' AND s.destination_port_code IS NOT NULL 
GROUP BY LEFT(s.destination_port_code, 2), s.currency 
ORDER BY country_code, count DESC;
```

| country_code | currency | count | 正确货币 |
|--------------|----------|-------|----------|
| BE           | USD      | 168   | EUR      |
| CA           | USD      | 1050  | CAD      |
| DE           | USD      | 100   | EUR      |
| ES           | USD      | 193   | EUR      |
| FR           | USD      | 163   | EUR      |
| GB           | USD      | 294   | GBP      |
| IT           | USD      | 226   | EUR      |
| NL           | USD      | 54    | EUR      |
| PT           | USD      | 2     | EUR      |
| RO           | USD      | 22    | RON      |
| US           | USD      | 1136  | USD ✅   |

**受影响的标准总数**: 3,408 条（除美国外）

### 技术原因

后端代码逻辑（`demurrage.service.ts` 第 1925-1927 行）：

```typescript
// 货币优先级：滞港费标准配置的货币 > 销往国家货币 > USD 兜底
const standardCurrency = std.currency ?? null;
const curr = standardCurrency || defaultCurrency || 'USD';
currency = curr;
```

虽然 `getContainerCurrency()` 方法能正确从 `dict_countries` 表查询到国家的货币（如意大利是 EUR），但由于滞港费标准中已配置了 `currency = 'USD'`，根据优先级规则，最终使用的是标准中的 USD。

## 修复方案

### 方案一：批量更新数据库（推荐）

**优点**：一次性修复所有历史数据  
**缺点**：需要谨慎验证，避免误更新

#### 步骤 1: 创建映射表

```sql
-- 创建临时映射表用于验证
CREATE TEMP TABLE country_currency_map AS
SELECT code, currency FROM dict_countries WHERE is_active = true;
```

#### 步骤 2: 预览需要更新的记录

```sql
-- 查看需要更新的国家及其正确货币
SELECT 
  LEFT(s.destination_port_code, 2) as country_code,
  c.currency as correct_currency,
  s.currency as current_currency,
  COUNT(*) as affected_rows
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.is_chargeable = 'N' 
  AND s.destination_port_code IS NOT NULL
  AND s.currency != c.currency
GROUP BY country_code, correct_currency, current_currency
ORDER BY country_code;
```

#### 步骤 3: 执行更新（按国家逐个验证）

```sql
-- 意大利示例
UPDATE ext_demurrage_standards s
SET currency = c.currency,
    updated_at = CURRENT_TIMESTAMP
FROM dict_countries c
WHERE LEFT(s.destination_port_code, 2) = c.code
  AND s.is_chargeable = 'N'
  AND s.destination_port_code LIKE 'IT%'
  AND s.currency = 'USD'
  AND c.currency = 'EUR';

-- 验证更新结果
SELECT destination_port_code, currency, COUNT(*) 
FROM ext_demurrage_standards 
WHERE destination_port_code LIKE 'IT%' 
GROUP BY destination_port_code, currency;
```

#### 步骤 4: 批量更新所有国家（谨慎执行）

```sql
-- 完整更新脚本（请先备份数据！）
BEGIN;

-- 备份原数据
CREATE TABLE ext_demurrage_standards_currency_backup AS
SELECT id, destination_port_code, currency, updated_at
FROM ext_demurrage_standards
WHERE is_chargeable = 'N' AND destination_port_code IS NOT NULL;

-- 执行批量更新
UPDATE ext_demurrage_standards s
SET currency = c.currency,
    updated_at = CURRENT_TIMESTAMP
FROM dict_countries c
WHERE LEFT(s.destination_port_code, 2) = c.code
  AND s.is_chargeable = 'N'
  AND s.destination_port_code IS NOT NULL
  AND s.currency != c.currency;

-- 验证更新行数
SELECT LEFT(destination_port_code, 2) as country_code, currency, COUNT(*)
FROM ext_demurrage_standards
WHERE is_chargeable = 'N' AND destination_port_code IS NOT NULL
GROUP BY country_code, currency
ORDER BY country_code;

-- 确认无误后提交
COMMIT;

-- 如果有问题，执行回滚
-- ROLLBACK;
```

### 方案二：修改代码逻辑（备选）

如果不敢批量更新历史数据，可以修改代码逻辑，降低滞港费标准中 `currency` 字段的优先级：

```typescript
// 修改 demurrage.service.ts 第 1925-1927 行
// 旧逻辑：标准货币 > 国家货币 > USD
const standardCurrency = std.currency ?? null;
const curr = standardCurrency || defaultCurrency || 'USD';

// 新逻辑：国家货币 > 标准货币 > USD
const standardCurrency = std.currency ?? null;
const curr = defaultCurrency || standardCurrency || 'USD';
```

**优点**：不需要修改数据库  
**缺点**：
1. 违反了"标准配置优先"的设计原则
2. 如果某些标准确实需要特殊货币配置（如美元结算的特殊航线），将无法支持
3. 历史数据的 `currency` 字段失去意义

## 推荐方案

**采用方案一：批量更新数据库**

理由：
1. 这是数据配置错误，应该修正数据本身
2. 一次性解决所有问题，不留技术债
3. 符合设计原则（标准配置优先级最高）
4. 对未来新增标准也有指导意义

## 执行计划

### Phase 1: 验证与备份（预计 30 分钟）

1. [ ] 验证 `dict_countries` 表中各国货币配置正确
2. [ ] 统计受影响的标准数量
3. [ ] 备份 `ext_demurrage_standards` 表的 `currency` 字段
4. [ ] 在测试环境验证更新脚本

### Phase 2: 分批次更新（预计 1 小时）

按国家分批次更新，每批验证：

1. [ ] 欧元区国家（IT, DE, FR, ES, NL, BE, PT）-> EUR
2. [ ] 英国 -> GBP
3. [ ] 加拿大 -> CAD
4. [ ] 罗马尼亚 -> RON
5. [ ] 其他国家（逐一验证）

### Phase 3: 验证与测试（预计 30 分钟）

1. [ ] 验证更新后的统计信息
2. [ ] 抽查几个货柜的滞港费计算
3. [ ] 前端页面验证货币显示
4. [ ] 回归测试其他功能

### Phase 4: 清理与文档（预计 15 分钟）

1. [ ] 删除临时备份表（确认无误后）
2. [ ] 更新数据字典文档
3. [ ] 记录修复过程到运维日志

## 风险评估

### 高风险

- **误更新其他国家的数据**: 通过精确的 WHERE 条件避免
- **更新后货币仍然错误**: 提前验证 `dict_countries` 表

### 中风险

- **更新过程中服务不可用**: 选择低峰期执行，使用事务
- **更新行数不符合预期**: 提前统计并验证

### 低风险

- **性能影响**: UPDATE 操作较快，预计 1-2 分钟内完成
- **回滚困难**: 已有备份表，可随时恢复

## 回滚方案

```sql
-- 如果需要回滚，从备份表恢复
UPDATE ext_demurrage_standards s
SET currency = b.currency,
    updated_at = b.updated_at
FROM ext_demurrage_standards_currency_backup b
WHERE s.id = b.id;
```

## 后续预防措施

### 1. 数据导入规范

在导入滞港费标准时，必须根据国家自动设置货币：

```typescript
// Excel 导入时自动填充货币
const country = await countryRepo.findOne({ where: { code: portCode.substring(0, 2) } });
standard.currency = country?.currency || 'USD';
```

### 2. 数据库约束

添加 CHECK 约束防止错误配置：

```sql
ALTER TABLE ext_demurrage_standards
ADD CONSTRAINT check_currency_by_country
CHECK (
  destination_port_code IS NULL OR
  currency = (SELECT currency FROM dict_countries WHERE code = LEFT(destination_port_code, 2))
);
```

### 3. 定期审计

每月运行一次检查脚本：

```sql
SELECT s.id, s.destination_port_code, s.currency, c.currency as expected_currency
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.currency != c.currency
  AND s.is_chargeable = 'N';
```

## 执行记录

### 执行时间

- 计划执行时间：2026-04-XX HH:MM
- **实际执行时间**: 2026-03-31 (立即执行)
- **执行人**: 刘志高 (AI 智能体辅助)

### 更新结果

| 国家 | 更新行数 | 状态 |
|------|---------|------|
| 意大利 (IT) | 226 | ✅ EUR |
| 德国 (DE) | 100 | ✅ EUR |
| 法国 (FR) | 163 | ✅ EUR |
| 西班牙 (ES) | 193 | ✅ EUR |
| 荷兰 (NL) | 54 | ✅ EUR |
| 比利时 (BE) | 168 | ✅ EUR |
| 葡萄牙 (PT) | 2 | ✅ EUR (先修正 dict_countries) |
| 英国 (GB) | 294 | ✅ GBP |
| 加拿大 (CA) | 1,050 | ✅ CAD |
| 罗马尼亚 (RO) | 22 | ✅ RON |
| **总计** | **2,272** | ✅ |

### 验证结果

- [x] 意大利货柜 HMMU6232153 显示 EUR ✅
- [x] 所有欧元区国家显示 EUR ✅
- [x] 英国显示 GBP ✅
- [x] 加拿大显示 CAD ✅
- [x] 罗马尼亚显示 RON ✅
- [x] 美国保持 USD ✅
- [x] 备份表已创建：`ext_demurrage_standards_currency_backup_20260331` ✅

## 相关文档

- 后端代码：`backend/src/services/demurrage.service.ts` 第 1925-1927 行
- 国家字典：`dict_countries` 表结构
- 滞港费标准：`ext_demurrage_standards` 表结构
- 货币工具：`frontend/src/utils/currency.ts`

## 附录：各国正确货币参考

```sql
-- 欧元区国家
IT, DE, FR, ES, NL, BE, PT, FI, IE, AT, GR, LU, MT, CY, SK, SI, EE, LV, LT -> EUR

-- 欧洲非欧元区
GB -> GBP
CH -> CHF
NO -> NOK
SE -> SEK
DK -> DKK
PL -> PLN
CZ -> CZK
HU -> HUF
RO -> RON
BG -> BGN

-- 北美
US -> USD
CA -> CAD
MX -> MXN

-- 亚洲
CN -> CNY
JP -> JPY
KR -> KRW
IN -> INR
SG -> SGD
HK -> HKD
TW -> TWD
TH -> THB
MY -> MYR
VN -> VND
ID -> IDR
PH -> PHP

-- 大洋洲
AU -> AUD
NZ -> NZD

-- 南美
BR -> BRL
AR -> ARS
CL -> CLP
CO -> COP
PE -> PEN

-- 中东
AE -> AED
SA -> SAR
IL -> ILS
TR -> TRY

-- 非洲
ZA -> ZAR
EG -> EGP
NG -> NGN
```

---

**文档版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高  
**状态**: 待执行
