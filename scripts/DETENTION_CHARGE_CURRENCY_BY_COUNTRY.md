# 滞港费货币符号按国别显示

## 修改目的

将货柜详情页的滞港费货币符号从固定显示 `USD` 改为根据货柜的**销往国家**（`sell_to_country`）自动显示对应的本地货币，提升用户体验和财务准确性。

## 问题现象

### 修改前

- 所有货柜的滞港费均显示 `USD`（美元）
- 无法区分不同国家的本地货币
- 欧洲国家（如德国、法国）应显示 `EUR`
- 英国应显示 `GBP`
- 美国应显示 `USD`

### 修改后

- 根据货柜的 `sell_to_country` 自动获取对应货币
- 欧洲国家显示 `EUR`（欧元）
- 英国显示 `GBP`（英镑）
- 美国显示 `USD`（美元）
- 中国显示 `CNY`（人民币）

## 数据来源

### 国别货币映射

货币代码来自 `dict_countries` 字典表的 `currency` 字段：

| 国家代码 | 国家名称 | 货币代码 | 货币名称   |
| -------- | -------- | -------- | ---------- |
| US       | 美国     | USD      | 美元       |
| GB       | 英国     | GBP      | 英镑       |
| DE       | 德国     | EUR      | 欧元       |
| FR       | 法国     | EUR      | 欧元       |
| IT       | 意大利   | EUR      | 欧元       |
| ES       | 西班牙   | EUR      | 欧元       |
| CN       | 中国     | CNY      | 人民币     |
| JP       | 日本     | JPY      | 日元       |
| CA       | 加拿大   | CAD      | 加拿大元   |
| AU       | 澳大利亚 | AUD      | 澳大利亚元 |

### 数据链

```
货柜 (biz_containers)
  → 备货单 (biz_replenishment_orders.sell_to_country)
    → 国别字典 (dict_countries.code)
      → 货币代码 (dict_countries.currency)
```

## 修改方案

### 1. 后端服务层

**文件**: `backend/src/services/demurrage.service.ts`

#### 1.1 添加 Country 实体导入

```typescript
import { Country } from "../entities/Country";
```

#### 1.2 注入 Country Repository

在 `DemurrageService` 构造函数中添加：

```typescript
constructor(
  private standardRepo: Repository<ExtDemurrageStandard>,
  private containerRepo: Repository<Container>,
  private portOpRepo: Repository<PortOperation>,
  private seaFreightRepo: Repository<SeaFreight>,
  private truckingRepo: Repository<TruckingTransport>,
  private emptyReturnRepo: Repository<EmptyReturn>,
  private orderRepo: Repository<ReplenishmentOrder>,
  private countryRepo: Repository<Country>, // 新增
  private recordRepo?: Repository<ExtDemurrageRecord>
) {}
```

#### 1.3 添加获取货币方法

```typescript
/**
 * 获取货柜销往国家对应的货币代码
 */
private async getContainerCurrency(containerNumber: string): Promise<string | null> {
  try {
    const container = await this.containerRepo.findOne({
      where: { containerNumber },
      relations: ['replenishmentOrders']
    });
    if (!container) return null;

    const orders = container.replenishmentOrders || [];
    if (orders.length === 0) return null;

    const sellToCountry = orders[0].sellToCountry;
    if (!sellToCountry) return null;

    const country = await this.countryRepo.findOne({
      where: { code: sellToCountry }
    });
    return country?.currency || null;
  } catch (error) {
    logger.warn('[getContainerCurrency] Failed:', error);
    return null;
  }
}
```

#### 1.4 修改计算逻辑

在 `calculateForContainer` 方法中（第 1657-1660 行）：

**修改前**:

```typescript
const items: DemurrageItemResult[] = [];
const skippedItems: DemurrageSkippedItem[] = [];
let totalAmount = 0;
let currency = "USD";
```

**修改后**:

```typescript
const items: DemurrageItemResult[] = [];
const skippedItems: DemurrageSkippedItem[] = [];
let totalAmount = 0;
// 获取销往国家对应的货币（默认值）
const defaultCurrency = (await this.getContainerCurrency(containerNumber)) || "USD";
let currency = defaultCurrency;
```

#### 1.5 货币覆盖逻辑

保留标准配置的货币覆盖能力（第 1921-1922 行）：

```typescript
const curr = std.currency ?? "USD";
currency = curr; // 标准配置的货币优先
```

**优先级**:

1. 滞港费标准配置的货币（`std.currency`）> 国别货币（`defaultCurrency`）> `USD`

## 前端展示

### ContainerSummary.vue

前端无需修改，直接使用后端返回的 `currency` 字段：

```vue
<span class="demurrage-total">
  {{ demurrageSummary.currency }} {{ demurrageSummary.totalAmount.toFixed(2) }}
</span>
```

### DemurrageCalculationPanel.vue

同样直接使用返回的 `currency`：

```vue
<span class="total-amount">{{ data.totalAmount.toFixed(2) }} {{ data.currency }}</span>
```

## 修改文件清单

| 文件路径                                    | 修改类型 | 说明                 |
| ------------------------------------------- | -------- | -------------------- |
| `backend/src/services/demurrage.service.ts` | 修改     | 添加国别货币获取逻辑 |
| `backend/src/entities/Country.ts`           | 引用     | 已有 currency 字段   |

## 测试场景

### 功能测试

1. **美国货柜**:
   - ✅ `sell_to_country = 'US'`
   - ✅ 显示 `USD 0.00`

2. **英国货柜**:
   - ✅ `sell_to_country = 'GB'`
   - ✅ 显示 `GBP 0.00`

3. **德国货柜**:
   - ✅ `sell_to_country = 'DE'`
   - ✅ 显示 `EUR 0.00`

4. **中国货柜**:
   - ✅ `sell_to_country = 'CN'`
   - ✅ 显示 `CNY 0.00`

5. **无销往国家**:
   - ✅ `sell_to_country = null`
   - ✅ 回退显示 `USD 0.00`

### 数据验证

1. **数据库检查**:

   ```sql
   -- 检查 dict_countries 货币配置
   SELECT code, name_cn, name_en, currency
   FROM dict_countries
   WHERE currency IS NOT NULL
   ORDER BY code;
   ```

2. **货柜数据检查**:
   ```sql
   -- 检查货柜销往国家分布
   SELECT o.sell_to_country, c.currency, COUNT(*) as container_count
   FROM biz_containers c
   LEFT JOIN biz_replenishment_orders o ON c.order_number = o.order_number
   LEFT JOIN dict_countries c ON o.sell_to_country = c.code
   WHERE o.sell_to_country IS NOT NULL
   GROUP BY o.sell_to_country, c.currency;
   ```

## 业务背景

### 多国家业务场景

LogiX 系统服务全球多个国家，不同国家的财务结算货币不同：

- **北美**: USD（美元）、CAD（加拿大元）
- **欧洲**: EUR（欧元）、GBP（英镑）
- **亚洲**: CNY（人民币）、JPY（日元）

### 财务合规要求

- 不同国家的财务报表需使用本地货币
- 滞港费计算需符合当地财务规范
- 货币符号错误可能导致财务混乱

### 用户体验优化

- 本地货币显示更符合用户习惯
- 减少货币换算的困扰
- 提升系统专业化程度

## 注意事项

### 数据完整性

1. **国别字典维护**:
   - 确保 `dict_countries` 包含所有业务国家
   - 确保 `currency` 字段已正确配置
   - 新增国家时同步配置货币

2. **备货单数据**:
   - 确保 `sell_to_country` 已正确填写
   - 历史数据可能需要补充

### 回退机制

- 无国别数据时回退到 `USD`
- 国别无货币配置时回退到 `USD`
- 保证系统始终有货币可显示

### 性能考虑

- 新增一次数据库查询（`getContainerCurrency`）
- 查询已添加 try-catch 错误处理
- 失败时回退到默认货币，不影响主流程

## 后续优化建议

### 1. 货币符号格式化

使用国际化货币格式化：

```typescript
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
}
```

### 2. 多货币支持

- 支持用户自定义货币偏好
- 支持货币换算（汇率转换）
- 支持多货币对比展示

### 3. 汇率管理

- 添加汇率字典表
- 支持汇率自动更新
- 支持历史汇率查询

## 修改时间

- **创建时间**: 2026-03-31
- **最后更新**: 2026-03-31
- **修改人**: 刘志高

## 相关文档

- `backend/src/entities/Country.ts`
- `backend/src/services/demurrage.service.ts`
- `frontend/public/docs/11-project/12-国别概念统一约定.md`
