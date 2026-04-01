# 滞港费标准导入货币自动填充规范

## 问题描述

**现象**: 所有国家的滞港费标准货币都被配置为 USD。

**根本原因**: 导入代码中没有根据国家自动填充货币的逻辑，完全依赖 Excel 输入。

**问题代码** (`import.controller.ts` 第 1638 行):

```typescript
currency: resolvedRow.currency ?? 'USD',
```

如果 Excel 中 `currency` 字段为空或缺失，默认填充 USD，导致所有国家都使用 USD。

## 正确做法

### 方案 1: 导入时根据目的港自动填充货币（推荐）

**修改位置**: `backend/src/controllers/import.controller.ts`

**修改前**:

```typescript
async importDemurrageStandards(req: Request, res: Response): Promise<void> {
  const { records } = req.body;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];

    // ... 其他解析逻辑

    const entity = this.demurrageStandardRepository.create({
      // ... 其他字段
      currency: resolvedRow.currency ?? 'USD',  // ❌ 问题：没有根据国家填充
    });

    await this.demurrageStandardRepository.save(entity);
  }
}
```

**修改后**:

```typescript
async importDemurrageStandards(req: Request, res: Response): Promise<void> {
  const { records } = req.body;

  for (let i = 0; i < records.length; i++) {
    const row = records[i];

    // ✅ 新增：根据目的港自动获取货币
    let currency = resolvedRow.currency;
    if (!currency) {
      const portCode = resolvedRow.destination_port_code;
      if (portCode) {
        const countryCode = portCode.substring(0, 2).toUpperCase();
        const country = await this.countryRepo.findOne({
          where: { code: countryCode }
        });
        currency = country?.currency || 'USD';
      } else {
        currency = 'USD';
      }
    }

    const entity = this.demurrageStandardRepository.create({
      // ... 其他字段
      currency: currency,  // ✅ 使用自动填充的货币
    });

    await this.demurrageStandardRepository.save(entity);
  }
}
```

### 方案 2: Excel 模板强制要求填写货币

在导入模板说明中明确要求：

**Excel 模板列**:
| 列名 | 必填 | 说明 | 示例 |
|------|------|------|------|
| destination_port_code | 是 | 目的港代码 | ITGIT |
| currency | **是** | 货币代码（必须与国家对应） | EUR |
| free_days | 是 | 免费天数 | 7 |
| rate_per_day | 否 | 每日费率 | 100 |

**导入验证逻辑**:

```typescript
// 添加货币验证
if (!resolvedRow.currency) {
  throw new Error(`第 ${rowNum} 行缺少 currency 字段，请根据目的港所在国家填写正确的货币`);
}

// 可选：验证货币是否与目的港国家匹配
const portCode = resolvedRow.destination_port_code;
if (portCode) {
  const countryCode = portCode.substring(0, 2).toUpperCase();
  const country = await this.countryRepo.findOne({ where: { code: countryCode } });
  if (country && country.currency !== resolvedRow.currency) {
    logger.warn(`第 ${rowNum} 行货币配置警告：${country.name_cn} 应使用 ${country.currency}，但提供的是 ${resolvedRow.currency}`);
    // 可选：自动修正或抛出错误
  }
}
```

### 方案 3: 批量更新已导入的数据（事后补救）

对于已经导入的错误数据，执行批量更新：

```sql
-- 根据目的港国家批量修正货币
UPDATE ext_demurrage_standards s
SET currency = c.currency,
    updated_at = CURRENT_TIMESTAMP
FROM dict_countries c
WHERE LEFT(s.destination_port_code, 2) = c.code
  AND s.is_chargeable = 'N'
  AND s.destination_port_code IS NOT NULL
  AND s.currency != c.currency;
```

## 完整修复代码

### 修改 `import.controller.ts`

```typescript
/**
 * 批量导入滞港费标准
 * POST /api/v1/import/demurrage-standards
 */
async importDemurrageStandards(req: Request, res: Response): Promise<void> {
  const { records } = req.body;

  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({
      success: false,
      message: '缺少 records 参数或为空数组'
    });
    return;
  }

  let successCount = 0;
  const errors: { row: number; error: string }[] = [];

  // ✅ 预加载国家字典缓存（提高性能）
  const countryCache = new Map<string, string>();
  const countries = await this.countryRepository.find();
  for (const country of countries) {
    countryCache.set(country.code, country.currency);
  }

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 1;

    try {
      const resolved = await this.resolveDemurrageCodesFromNames(row);
      const resolvedRow = { ...row };

      // ... 其他解析逻辑 ...

      // ✅ 关键修复：根据目的港自动填充货币
      let currency = resolvedRow.currency;
      if (!currency) {
        const portCode = resolvedRow.destination_port_code;
        if (portCode) {
          const countryCode = portCode.substring(0, 2).toUpperCase();

          // 从缓存获取货币
          currency = countryCache.get(countryCode);

          if (!currency) {
            // 缓存未命中，查询数据库
            const country = await this.countryRepository.findOne({
              where: { code: countryCode }
            });
            if (country) {
              currency = country.currency;
              countryCache.set(countryCode, currency);
            }
          }
        }

        // 最终回退到 USD
        currency = currency || 'USD';
      }

      const entity = this.demurrageStandardRepository.create({
        foreignCompanyCode: String(resolvedRow.foreign_company_code ?? ''),
        foreignCompanyName: resolvedRow.foreign_company_name ?? null,
        effectiveDate: resolvedRow.effective_date ? new Date(resolvedRow.effective_date) : null,
        expiryDate: resolvedRow.expiry_date ? new Date(resolvedRow.expiry_date) : null,
        destinationPortCode: String(resolvedRow.destination_port_code ?? ''),
        destinationPortName: resolvedRow.destination_port_name ?? null,
        shippingCompanyCode: String(resolvedRow.shipping_company_code ?? ''),
        shippingCompanyName: resolvedRow.shipping_company_name ?? null,
        terminal: resolvedRow.terminal ?? null,
        originForwarderCode: String(resolvedRow.origin_forwarder_code ?? ''),
        originForwarderName: resolvedRow.origin_forwarder_name ?? null,
        transportModeCode: resolvedRow.transport_mode_code ?? null,
        transportModeName: resolvedRow.transport_mode_name ?? null,
        chargeTypeCode: resolvedRow.charge_type_code ?? null,
        chargeName: resolvedRow.charge_name ?? null,
        isChargeable: (resolvedRow.is_chargeable as string) ?? 'Y',
        sequenceNumber: resolvedRow.sequence_number ?? null,
        portCondition: resolvedRow.port_condition ?? null,
        freeDaysBasis: resolvedRow.free_days_basis ?? '自然日',
        freeDays: resolveDemurrageFreeDays(
          resolvedRow.free_days,
          (resolvedRow.tiers as Record<string, unknown> | null | undefined) ?? null
        ),
        calculationBasis: resolvedRow.calculation_basis ?? '按卸船',
        ratePerDay: resolvedRow.rate_per_day ?? null,
        tiers: (resolvedRow.tiers as Record<string, unknown>) ?? null,
        currency: currency,  // ✅ 使用自动填充的货币
        processStatus: resolvedRow.process_status ?? null
      } as any);

      await this.demurrageStandardRepository.save(entity);
      successCount++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`[Import] 滞港费标准第 ${rowNum} 行导入失败：${msg}`);
      errors.push({ row: rowNum, error: msg });
    }
  }

  res.json({
    success: true,
    message: `导入完成，成功 ${successCount} 条，失败 ${errors.length} 条`,
    data: { successCount, errors }
  });
}
```

## 预防措施

### 1. 添加数据库 CHECK 约束

防止未来导入错误货币：

```sql
-- 添加约束：货币必须与目的港国家匹配
ALTER TABLE ext_demurrage_standards
ADD CONSTRAINT check_currency_by_country
CHECK (
  destination_port_code IS NULL OR
  currency = (SELECT currency FROM dict_countries WHERE code = LEFT(destination_port_code, 2))
);
```

### 2. 导入前验证

在 Controller 中添加验证逻辑：

```typescript
// 验证货币是否与国家匹配
for (let i = 0; i < records.length; i++) {
  const row = records[i];
  const portCode = row.destination_port_code;
  const providedCurrency = row.currency;

  if (portCode && providedCurrency) {
    const countryCode = portCode.substring(0, 2).toUpperCase();
    const country = await countryRepo.findOne({ where: { code: countryCode } });

    if (country && country.currency !== providedCurrency) {
      errors.push({
        row: i + 1,
        error: `货币配置错误：${country.name_cn} 应使用 ${country.currency}，而不是 ${providedCurrency}`,
      });
    }
  }
}

if (errors.length > 0) {
  res.status(400).json({
    success: false,
    message: "数据验证失败",
    errors,
  });
  return;
}
```

### 3. 定期审计脚本

每月运行一次检查：

```bash
# scripts/query/verify-demurrage-currency.sql
SELECT
  LEFT(s.destination_port_code, 2) as country_code,
  s.currency as standard_currency,
  c.currency as expected_currency,
  CASE WHEN s.currency = c.currency THEN 'OK' ELSE 'MISMATCH' END as status,
  COUNT(*) as count
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.is_chargeable = 'N' AND s.destination_port_code IS NOT NULL
GROUP BY country_code, standard_currency, expected_currency
ORDER BY country_code;
```

## 测试用例

### 测试场景 1: 意大利港口 - 自动填充 EUR

**输入**:

```json
{
  "destination_port_code": "ITGIT",
  "charge_name": "Demurrage Charge",
  "free_days": 7
}
```

**预期结果**:

```typescript
entity.currency === "EUR"; // ✅ 自动填充
```

### 测试场景 2: 英国港口 - 自动填充 GBP

**输入**:

```json
{
  "destination_port_code": "GBFXT",
  "charge_name": "Storage Charge"
}
```

**预期结果**:

```typescript
entity.currency === "GBP"; // ✅ 自动填充
```

### 测试场景 3: 手动指定货币优先

**输入**:

```json
{
  "destination_port_code": "ITGIT",
  "currency": "USD" // 特殊约定
}
```

**预期结果**:

```typescript
entity.currency === "USD"; // ✅ 尊重手动指定
```

## 经验教训

1. **导入逻辑不能假设默认值**: 对于有业务含义的字段（如货币），不能简单使用默认值
2. **必须基于权威源验证**: 货币、国家等字典数据必须从数据库查询，不能硬编码
3. **预防优于补救**: 在导入阶段就验证和自动填充，比事后批量更新更有效
4. **性能优化**: 使用缓存避免重复查询数据库

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**作者**: 刘志高  
**状态**: 待执行
