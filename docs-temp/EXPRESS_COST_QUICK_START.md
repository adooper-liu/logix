# 全球快递费 - 快速启动（与实现对齐）

API 路径前缀为 `config.apiPrefix`，默认 **`/api/v1`**（见 [backend/src/config/index.ts](../backend/src/config/index.ts)）。服务端口以环境变量 `PORT` 为准，**默认 3002**（见同文件）。

完整路径示例：`{origin}{apiPrefix}/express-cost/...` → 如 `http://localhost:3002/api/v1/express-cost/calculate`

---

## Step 1: 建表

```bash
cd d:\Github\logix\backend
psql -U postgres -d <数据库名> -f sql/schema/04_express_cost_tables.sql
psql -U postgres -d <数据库名> -f sql/schema/05_pricing_phasea_plus.sql
```

（或在 Docker 容器内用等价 `psql` 命令。）

---

## Step 2: 准备 Excel（三 Sheet，名称须完全一致）

- `metadata`：至少一行含 `version_key`、建议含 `effective_from` / `imported_by` / `remarks`
- `surcharge_rules`：与导入服务所读列名一致（含 `国别`、`快递方式`、`类型`、`金额` 等，尺寸列如 `最长边(in)` 等，见 [expressRuleImport.service.ts](../backend/src/services/expressRuleImport.service.ts)）
- `stack_policies`（可选但推荐）：`国别`、`快递方式`、`策略类型`、`policy_json`；`policy_json` 与 CostEngine 一致，如 `if_triggered` / `disable` / `max_group`

可选：将全量 `csv` 转表后放入 `backend/tests/fixtures/全球快递费规则_20260214.xlsx` 做手测。

### Phase A+ 模板（四 Sheet，基础价 + Zone/Lane）

- `metadata`：`version_key`, `effective_from`（必填）
- `pricing_scheme`：`scheme_ref`, `country_code`, `carrier_code`, `service_code`, `product_line`, `currency`, `calc_mode`
- `zone_lane_mapping`：`country_code`, `mapping_type`, `postal_prefix_from`, `postal_prefix_to`, `zone_code`（或 lane 字段）
- `base_rate_rows`：`scheme_ref`, `zone_code/lane_code`, `weight_from`, `weight_to`, `first_weight`, `first_fee`, `additional_step_weight`, `additional_fee_per_step`, `flat_fee`

说明：上传时若检测到 `pricing_scheme` Sheet，会自动走 Phase A+ 导入服务。

---

## Step 3: 已实现的代码（无需再创建骨架）

| 职责                                                           | 文件                                                                                                              |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Excel 导入（**单事务**；行级失败则**全量回滚**，不落残缺版本） | [backend/src/services/expressRuleImport.service.ts](../backend/src/services/expressRuleImport.service.ts)         |
| 试算引擎                                                       | [backend/src/services/costEngine.service.ts](../backend/src/services/costEngine.service.ts)                       |
| 路由                                                           | [backend/src/routes/express-cost.routes.ts](../backend/src/routes/express-cost.routes.ts)                         |
| 主路由聚合                                                     | [backend/src/routes/index.ts](../backend/src/routes/index.ts)（`router.use('/express-cost', expressCostRoutes)`） |

---

## Step 4: 启动与手测

```bash
cd d:\Github\logix\backend
npm run dev
```

### 导入

```bash
curl -X POST "http://localhost:3002/api/v1/express-cost/import-excel" -F "file=@path/to/规则.xlsx"
```

- 当任一行**规则或策略**解析失败时，数据库**回滚**；API 返回 **HTTP 422**，`data.success === 0` 且 `data.errors` 非空。缺少 `metadata` 等则多为 **400**。

### 试算

先查 `carrierServiceId`：

```bash
curl "http://localhost:3002/api/v1/express-cost/carriers?countryCode=US"
```

再试算（`carrierServiceId` 用上一步返回的 `id`）：

```bash
curl -X POST "http://localhost:3002/api/v1/express-cost/calculate" -H "Content-Type: application/json" -d "{\"countryCode\":\"US\",\"carrierServiceId\":1,\"versionKey\":\"你的version_key\",\"longestIn\":50,\"secondIn\":30,\"shortestIn\":20,\"grossWeightLbs\":40}"
```

Phase A+（基础价 + 附加费）示例（新增参数需成组提供）：

```bash
curl -X POST "http://localhost:3002/api/v1/express-cost/calculate" -H "Content-Type: application/json" -d "{\"countryCode\":\"US\",\"carrierServiceId\":1,\"carrierCode\":\"FEDEX\",\"serviceCode\":\"GROUND\",\"productLine\":\"PARCEL_EXPRESS\",\"versionKey\":\"PTEST_001\",\"destinationPostal\":\"90210\",\"longestIn\":50,\"secondIn\":30,\"shortestIn\":20,\"grossWeightLbs\":40}"
```

响应中将包含 `baseFreight`, `totalSurcharge`, `grandTotal`, `zoneCode/laneCode`（命中时）。

---

## 单元测试

```bash
cd d:\Github\logix\backend
npm test
```

- `costEngine.test.ts`：使用动态 `testCarrierId`，不依赖 `id=1`
- `expressRuleImport.test.ts`：内存生成最小 xlsx，无需大 fixtures；并校验**行级失败时库中无版本残留**
- `test/services/*`：含 `baseFreightEngine`、`pricingImport` 等**无 DB mock** 单测

建表后（含 `05_pricing_phasea_plus.sql`）可跑 Phase A+ **集成测试**（使用 `jest.integration.config.js` 与 `.env.test` 数据库）：

```bash
cd d:\Github\logix\backend
npm run test:integration -- --testPathPatterns=pricing
```

---

## 相关文档

- [EXPRESS_COST_IMPLEMENTATION_PROGRESS.md](./EXPRESS_COST_IMPLEMENTATION_PROGRESS.md)
- [EXPRESS_COST_PHASE1_COMPLETION.md](./EXPRESS_COST_PHASE1_COMPLETION.md)
