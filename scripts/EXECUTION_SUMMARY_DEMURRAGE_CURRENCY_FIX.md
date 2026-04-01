# 滞港费货币配置修复 - 执行摘要

## 执行时间

**2026-03-31** (立即执行)

## 问题描述

货柜详情页显示滞港费时，货币符号固定为 USD，没有根据销往国家自动切换。

**案例**:

- 客户：AOSOM ITALY SRL（意大利客户）
- 目的港：热那亚（ITGIT）
- **当前显示**: USD ❌
- **预期显示**: EUR ✅

## 根本原因

`ext_demurrage_standards` 表中所有国家的滞港费标准货币全部被配置为 USD，这是系统性的数据配置错误。

## 修复统计

| 国家          | 修复前 | 修复后 | 更新数量        |
| ------------- | ------ | ------ | --------------- |
| BE (比利时)   | USD    | EUR    | 168             |
| CA (加拿大)   | USD    | CAD    | 1,050           |
| DE (德国)     | USD    | EUR    | 100             |
| ES (西班牙)   | USD    | EUR    | 193             |
| FR (法国)     | USD    | EUR    | 163             |
| GB (英国)     | USD    | GBP    | 294             |
| IT (意大利)   | USD    | EUR    | 226             |
| NL (荷兰)     | USD    | EUR    | 54              |
| PT (葡萄牙)   | USD    | EUR    | 2               |
| RO (罗马尼亚) | USD    | RON    | 22              |
| US (美国)     | USD    | USD ✅ | 1,136（未更新） |
| **总计**      | -      | -      | **2,272**       |

## 执行步骤

### 1. 验证与备份

```sql
-- 验证 dict_countries 表
SELECT code, name_cn, name_en, currency
FROM dict_countries
WHERE code IN ('IT','DE','FR','ES','NL','BE','PT','GB','CA','RO','US');

-- 创建备份表
CREATE TABLE ext_demurrage_standards_currency_backup_20260331 AS
SELECT id, destination_port_code, currency, updated_at
FROM ext_demurrage_standards
WHERE is_chargeable = 'N' AND destination_port_code IS NOT NULL;
```

**结果**: 备份 3,408 条记录 ✅

### 2. 批量更新

```sql
BEGIN;

-- 欧元区国家
UPDATE ext_demurrage_standards s
SET currency = c.currency, updated_at = CURRENT_TIMESTAMP
FROM dict_countries c
WHERE LEFT(s.destination_port_code, 2) = c.code
  AND s.is_chargeable = 'N'
  AND s.destination_port_code IS NOT NULL
  AND s.currency != c.currency
  AND c.currency IN ('EUR')
  AND LEFT(s.destination_port_code, 2) IN ('IT','DE','FR','ES','NL','BE');

-- 英国
UPDATE ... WHERE c.currency = 'GBP' AND LEFT(s.destination_port_code, 2) = 'GB';

-- 加拿大
UPDATE ... WHERE c.currency = 'CAD' AND LEFT(s.destination_port_code, 2) = 'CA';

-- 罗马尼亚
UPDATE ... WHERE c.currency = 'RON' AND LEFT(s.destination_port_code, 2) = 'RO';

-- 葡萄牙（先修正国家表）
UPDATE dict_countries SET currency = 'EUR' WHERE code = 'PT';
UPDATE ... WHERE c.currency = 'EUR' AND LEFT(s.destination_port_code, 2) = 'PT';

COMMIT;
```

**结果**: 成功更新 2,272 条记录 ✅

### 3. 验证结果

```sql
SELECT
  LEFT(s.destination_port_code, 2) as country,
  s.currency as standard_currency,
  c.currency as expected_currency,
  CASE WHEN s.currency = c.currency THEN 'OK' ELSE 'MISMATCH' END as status,
  COUNT(*)
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.is_chargeable = 'N' AND s.destination_port_code IS NOT NULL
GROUP BY country, standard_currency, expected_currency
ORDER BY country;
```

**结果**: 所有国家状态均为 **OK** ✅

## 后续操作

### 1. 前端验证

重启后端服务（如需要），然后访问货柜详情页验证：

- 意大利货柜：应显示 EUR
- 德国货柜：应显示 EUR
- 英国货柜：应显示 GBP
- 加拿大货柜：应显示 CAD

### 2. 预防措施

在导入滞港费标准时，必须根据国家自动设置货币：

```typescript
// Excel 导入时自动填充货币
const country = await countryRepo.findOne({ where: { code: portCode.substring(0, 2) } });
standard.currency = country?.currency || "USD";
```

### 3. 定期审计

每月运行一次检查脚本：

```bash
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db \
  -f /scripts/query/verify-demurrage-currency.sql
```

## 回滚方案

如需回滚，从备份表恢复：

```sql
UPDATE ext_demurrage_standards s
SET currency = b.currency, updated_at = b.updated_at
FROM ext_demurrage_standards_currency_backup_20260331 b
WHERE s.id = b.id;
```

## 相关文档

- 详细修复方案：`../KEY_GUIDE_DEMURRAGE_CURRENCY_FIX.md`
- 验证 SQL: `./query/verify-demurrage-currency.sql`
- 后端代码：`backend/src/services/demurrage.service.ts`

---

**执行状态**: ✅ 完成  
**执行人**: 刘志高 (AI 智能体辅助)  
**文档版本**: v1.0
