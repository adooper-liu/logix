# 滞港费标准 Excel 导入指南

> 基于现有滞港费标准 Excel 示例，分析字段与 `ext_demurrage_standards` 表的对应关系，并提供导入方案。

---

## 一、Excel 示例与数据库表对应

### 1.1 字段映射表

| Excel 列名 | 数据库表 | 数据库字段 | 示例值 | 说明 |
|------------|----------|------------|--------|------|
| 单据编号 | - | - | ZGF2602263097 | 外部单据号，可选存入 remarks 或扩展字段 |
| 单据状态 | ext_demurrage_standards | process_status | 已审核 | 处理状态 |
| *海外公司.编码 | ext_demurrage_standards | foreign_company_code | 83 | 四字段匹配：进口国/境外分公司 |
| 海外公司.名称 | ext_demurrage_standards | foreign_company_name | AOSOM LLC | |
| 生效日期 | ext_demurrage_standards | effective_date | 2026-03-04 | 有效期起 |
| 结束日期 | ext_demurrage_standards | expiry_date | （空） | 有效期止，空表示长期有效 |
| *目的港.编码 | ext_demurrage_standards | destination_port_code | USSAV | 四字段匹配 |
| 目的港.名称 | ext_demurrage_standards | destination_port_name | 萨凡纳 | |
| *船公司.编码 | ext_demurrage_standards | shipping_company_code | Sup-004597 | 四字段匹配 |
| 船公司.供应商全称（中） | ext_demurrage_standards | shipping_company_name | COSCO | |
| 码头 | ext_demurrage_standards | terminal | （空） | |
| *起运港货代公司.编码 | ext_demurrage_standards | origin_forwarder_code | Sup-019017 | 四字段匹配 |
| 起运港货代公司.供应商全称（中） | ext_demurrage_standards | origin_forwarder_name | 宁波天图翼联物流科技有限公司 | |
| *运输方式.运输方式编码 | ext_demurrage_standards | transport_mode_code | TRUCK | |
| 运输方式.运输方式名称 | ext_demurrage_standards | transport_mode_name | 卡车 | |
| 1, 2, 3, …, 60, 60+ | ext_demurrage_standards | tiers | 见下文 | **阶梯费率**，需转换为 JSONB |
| *免费天数基准 | ext_demurrage_standards | free_days_basis | 工作+自然日 | Natural/Working/Natural+Working 等 |
| 处理状态 | ext_demurrage_standards | process_status | 否 | 或与单据状态合并 |
| *费用类型.费用小类编码 | ext_demurrage_standards | charge_type_code | US-DEMURRAGE-0036 | |
| 费用类型.费用小类名称 | ext_demurrage_standards | charge_name | Demurrage Charge | |
| *标记 | ext_demurrage_standards | is_chargeable | Y | Y=收费，N=不收费 |
| 序列号 | ext_demurrage_standards | sequence_number | 2957 | 需去除千分位逗号 |
| *目的港条件 | ext_demurrage_standards | port_condition | 良 | |
| *计算方式 | ext_demurrage_standards | calculation_basis | 按卸船 | 按到港 / 按卸船 |
| 创建人/修改人/审核人/日期 | - | - | - | 审计字段，可选扩展 |

### 1.2 免费天数 free_days 的推导

Excel 中**无显式「免费天数」列**，需从阶梯费率（1–60、60+）推导：

- **规则**：从第 1 天起，连续费率为 0 的天数 = 免费天数。
- **本例**：1–4 天为 0.00，第 5 天起为 300.00 → **free_days = 4**。
- **实现**：`findFirstPositiveIndex(fees)` 返回第一个 fee > 0 的索引（1-based 为天数），免费天数 = 该索引 - 1。

### 1.3 阶梯费率 tiers 的转换

Excel 列 1–60、60+ 为按天费率，需转为 `tiers` JSONB。两种常见格式：

**格式 A：按天数组（与 ContainerPlanning 一致）**

```json
{
  "1": 0, "2": 0, "3": 0, "4": 0,
  "5": 300, "6": 300, …, "30": 300,
  "31": 0, …, "60": 0, "60+": 0
}
```

**格式 B：阶梯区间（推荐，便于计算）**

```json
[
  { "minDays": 1, "maxDays": 4, "rate": 0 },
  { "minDays": 5, "maxDays": 30, "rate": 300 },
  { "minDays": 31, "maxDays": 60, "rate": 0 },
  { "minDays": 61, "maxDays": null, "rate": 0 }
]
```

- 计算逻辑按 01-DEMURRAGE_LOGIC 与 06-智能排柜算法方案中的 `calculateFee`、`parseFeeSchedule` 实现。
- `rate_per_day`：可存主阶梯的日费率（如 300），或留空由 tiers 计算。

---

## 二、导入方案

### 2.1 方案一：扩展现有 Excel 导入（推荐）

在 `ExcelImport.vue` 的 `FIELD_MAPPINGS` 中增加 `ext_demurrage_standards` 的映射，并在 `ImportController` 中增加对该表的写入逻辑。

**新增映射示例**：

```typescript
// ===== 滞港费标准表 (ext_demurrage_standards) =====
{ excelField: '海外公司.编码', table: 'ext_demurrage_standards', field: 'foreign_company_code', required: true },
{ excelField: '海外公司.名称', table: 'ext_demurrage_standards', field: 'foreign_company_name', required: false },
{ excelField: '生效日期', table: 'ext_demurrage_standards', field: 'effective_date', required: true, transform: parseDate },
{ excelField: '结束日期', table: 'ext_demurrage_standards', field: 'expiry_date', required: false, transform: parseDate },
{ excelField: '目的港.编码', table: 'ext_demurrage_standards', field: 'destination_port_code', required: true },
{ excelField: '目的港.名称', table: 'ext_demurrage_standards', field: 'destination_port_name', required: false },
{ excelField: '船公司.编码', table: 'ext_demurrage_standards', field: 'shipping_company_code', required: true },
{ excelField: '船公司.供应商全称（中）', table: 'ext_demurrage_standards', field: 'shipping_company_name', required: false },
{ excelField: '码头', table: 'ext_demurrage_standards', field: 'terminal', required: false },
{ excelField: '起运港货代公司.编码', table: 'ext_demurrage_standards', field: 'origin_forwarder_code', required: true },
{ excelField: '起运港货代公司.供应商全称（中）', table: 'ext_demurrage_standards', field: 'origin_forwarder_name', required: false },
{ excelField: '运输方式.运输方式编码', table: 'ext_demurrage_standards', field: 'transport_mode_code', required: false },
{ excelField: '运输方式.运输方式名称', table: 'ext_demurrage_standards', field: 'transport_mode_name', required: false },
{ excelField: '免费天数基准', table: 'ext_demurrage_standards', field: 'free_days_basis', required: true },
{ excelField: '费用类型.费用小类编码', table: 'ext_demurrage_standards', field: 'charge_type_code', required: false },
{ excelField: '费用类型.费用小类名称', table: 'ext_demurrage_standards', field: 'charge_name', required: false },
{ excelField: '标记', table: 'ext_demurrage_standards', field: 'is_chargeable', required: false },
{ excelField: '序列号', table: 'ext_demurrage_standards', field: 'sequence_number', required: false, transform: parseSequenceNumber },
{ excelField: '目的港条件', table: 'ext_demurrage_standards', field: 'port_condition', required: false },
{ excelField: '计算方式', table: 'ext_demurrage_standards', field: 'calculation_basis', required: true },
// 阶梯 1-60, 60+ 需单独处理，见下文
```

**阶梯列处理**：Excel 列名为 "1"、"2"、…、"60"、"60+"，需在解析时收集这些列，调用 `parseFeeSchedule` 得到 `List<Double>`，再转换为 `tiers` JSONB 并推导 `free_days`。

### 2.2 方案二：独立滞港费标准导入页

新建「滞港费标准导入」页面，专门处理该 Excel 结构：

- 上传后解析表头，自动识别「海外公司.编码」「目的港.编码」等列；
- 对 1–60、60+ 列做阶梯转换；
- 调用 `POST /api/v1/import/demurrage-standards` 批量写入 `ext_demurrage_standards`。

### 2.3 方案三：先 CSV/SQL 转换再导入

1. 用脚本（Python/Node）读取 Excel，按上表映射生成 `INSERT` SQL；
2. 在 DBeaver/pgAdmin 或 `psql` 中执行。

---

## 三、实现要点（方案一扩展）

### 3.1 表选择与路由

现有 Excel 导入按「每条行对应一组关联表」组织（备货单+货柜+海运+港口+拖卡+仓库+还箱）。滞港费标准为**独立主数据**，建议：

- **选项 A**：在导入页增加「导入类型」选择（货柜数据 / 滞港费标准），选「滞港费标准」时走 `ext_demurrage_standards` 映射；
- **选项 B**：单独菜单「滞港费标准导入」，仅处理该表。

### 3.2 阶梯列解析

```typescript
function parseFeeScheduleFromRow(row: Record<string, unknown>): { fees: number[]; freeDays: number } {
  const fees: number[] = [];
  for (let i = 1; i <= 60; i++) {
    const val = row[String(i)] ?? row[`${i}.0`];
    fees.push(typeof val === 'number' ? val : parseFloat(String(val || 0)) || 0);
  }
  const sixtyPlus = row['60+'] ?? row['60+'];
  fees.push(typeof sixtyPlus === 'number' ? sixtyPlus : parseFloat(String(sixtyPlus || 0)) || 0);
  const freeDays = fees.findIndex(f => f > 0);
  return { fees, freeDays: freeDays < 0 ? 0 : freeDays };
}

function feesToTiers(fees: number[]): Record<string, number> {
  const tiers: Record<string, number> = {};
  for (let i = 0; i < Math.min(61, fees.length); i++) {
    tiers[i === 60 ? '60+' : String(i + 1)] = fees[i] ?? 0;
  }
  return tiers;
}
```

### 3.3 计算方式与免费天数基准

| Excel 值 | calculation_basis | free_days_basis |
|----------|-------------------|------------------|
| 按卸船 | 按卸船 | - |
| 按到港 | 按到港 | - |
| 工作+自然日 | - | Natural+Working 或 工作+自然日 |
| 自然日 | - | Natural |
| 工作日 | - | Working |

需与 `dict_*` 或配置中的枚举一致；若无则直接存 Excel 原值。

### 3.4 序列号与 is_chargeable

- **序列号**：Excel "2,957" 需去逗号 → 2957。
- **标记/ is_chargeable**：Y = 收费（is_chargeable='Y'），N = 不收费（'N'）。与 01-DEMURRAGE 文档一致：Y 表示收费并参与计算。

---

## 四、Excel 模板建议

为便于导入，建议统一列名（与映射表一致）：

| 列名 | 必填 | 说明 |
|------|------|------|
| 海外公司.编码 | * | foreign_company_code |
| 海外公司.名称 | | foreign_company_name |
| 生效日期 | * | effective_date |
| 结束日期 | | expiry_date |
| 目的港.编码 | * | destination_port_code |
| 目的港.名称 | | destination_port_name |
| 船公司.编码 | * | shipping_company_code |
| 船公司.供应商全称（中） | | shipping_company_name |
| 起运港货代公司.编码 | * | origin_forwarder_code |
| 起运港货代公司.供应商全称（中） | | origin_forwarder_name |
| 免费天数基准 | * | free_days_basis |
| 计算方式 | * | calculation_basis |
| 标记 | | Y/N，is_chargeable |
| 1, 2, …, 60, 60+ | * | 阶梯费率，数字 |

---

## 五、小结

| 项目 | 说明 |
|------|------|
| **表** | ext_demurrage_standards |
| **四字段匹配** | foreign_company_code、destination_port_code、shipping_company_code、origin_forwarder_code |
| **阶梯** | 1–60、60+ 列 → tiers JSONB；free_days 由连续 0 费率天数推导 |
| **导入方式** | 扩展 ExcelImport 映射 + ImportController 写入；或独立导入页；或脚本转 SQL |
| **注意** | 列名含点号（如 海外公司.编码），解析时需匹配；序列号去千分位；is_chargeable 与文档约定一致 |

---

**关联**：[01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md](./01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md)、[03-DEMURRAGE_DATABASE_STATUS.md](./03-DEMURRAGE_DATABASE_STATUS.md)、[06-智能排柜算法方案.md](../11-project/06-智能排柜算法方案.md)
