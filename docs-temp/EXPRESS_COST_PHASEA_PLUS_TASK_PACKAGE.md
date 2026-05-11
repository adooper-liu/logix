# 全球快递费 Phase A+ 可执行任务包

最后更新: 2026-04-23  
状态: READY_FOR_EXECUTION  
适用范围: 快递/小包/国际线（本期上线）+ 中大件/卡派（字段与流程预留）

---

## 0. 目标与边界

### 0.1 本期交付目标（必须达成）

- 在现有「附加费/拒收」能力上，补齐「基础运费 + ZONE/LANE」闭环。
- 同时支持至少两种基础价模型:
  - `FIRST_ADDITIONAL`（首重+续重）
  - `TIER_FLAT`（纯阶梯固定价）
- 导入保持单事务语义: 任一 sheet 任一行失败，全量回滚。
- 计算结果返回可解释明细: `baseFreight`, `surchargeTotal`, `grandTotal`, `zone/lane`, `trace`。

### 0.2 本期不做（明确排除）

- 不上线复杂公式引擎（`FORMULA`）。
- 不做前端完整报价页面（仅保留 API 可消费合同）。
- 不引入历史数据回填脚本（只支持新版本导入生效）。

---

## 1. 交付物清单（Deliverables）

### 1.1 数据库与实体

- `backend/sql/schema/05_pricing_phasea_plus.sql`（新增）
- `backend/src/entities/PricingVersion.ts`
- `backend/src/entities/PricingScheme.ts`
- `backend/src/entities/ZoneLaneMapping.ts`
- `backend/src/entities/BaseRateRow.ts`
- `backend/src/database/index.ts`（注册新实体）

### 1.2 服务与路由

- `backend/src/services/pricingImport.service.ts`（新增）
- `backend/src/services/baseFreightEngine.service.ts`（新增）
- `backend/src/services/costEngine.service.ts`（扩展融合）
- `backend/src/routes/express-cost.routes.ts`（扩展接口）

### 1.3 测试与文档

- `backend/tests/baseFreightEngine.test.ts`（新增）
- `backend/tests/pricingImport.test.ts`（新增）
- `backend/tests/costEngine.test.ts`（扩展）
- `docs-temp/EXPRESS_COST_QUICK_START.md`（补导入模板与调用示例）
- `docs-temp/EXPRESS_COST_IMPLEMENTATION_PROGRESS.md`（更新里程碑）

---

## 2. SQL 任务包（可直接执行）

## T1 新建版本主表

**文件**: `backend/sql/schema/05_pricing_phasea_plus.sql`  
**表**: `dict_pricing_version`

字段要求:
- `id` bigserial PK
- `version_key` varchar(32) unique not null
- `effective_from` timestamptz not null
- `effective_to` timestamptz null
- `status` varchar(16) not null default `'ACTIVE'`
- `source_file_name`, `imported_by`, `remarks`
- `created_at`, `updated_at`

索引要求:
- `uk_pricing_version_key(version_key)`
- `idx_pricing_version_status_effective(status, effective_from desc)`

验收标准:
- 可按 `version_key` 幂等查询。
- 可筛选当前生效版本（`ACTIVE + 时间窗`）。

## T2 新建计费方案表

**表**: `dict_pricing_scheme`

字段要求:
- `version_id` FK -> `dict_pricing_version.id`
- `country_code`, `carrier_code`, `service_code`, `product_line`
- `currency`, `priority`
- `calc_mode`（首批允许值: `FIRST_ADDITIONAL`, `TIER_FLAT`）
- `conditions_json` jsonb default `'{}'::jsonb
- `is_active` boolean default true
- 标准审计字段

索引要求:
- `(version_id, country_code, carrier_code, service_code, product_line, priority)`
- `GIN (conditions_json)`

验收标准:
- 同一版本内可配置多条方案并按优先级命中。

## T3 新建 Zone/Lane 映射表

**表**: `dict_zone_lane_mapping`

字段要求:
- `version_id` FK
- `country_code`
- `mapping_type`（`ZONE`/`LANE`）
- `origin_code`, `destination_code`（lane 场景）
- `postal_prefix_from`, `postal_prefix_to`（zone 场景）
- `zone_code`, `lane_code`, `distance_km`
- `conditions_json`, `priority`
- 审计字段

索引要求:
- `(version_id, country_code, mapping_type, priority)`
- `(country_code, postal_prefix_from, postal_prefix_to)`
- `(origin_code, destination_code)`

验收标准:
- 可按邮编前缀映射 zone。
- 可按起讫点映射 lane（为卡派预留）。

## T4 新建基础价明细表

**表**: `dict_base_rate_row`

字段要求:
- `scheme_id` FK -> `dict_pricing_scheme.id`
- `zone_code`, `lane_code`
- `weight_from`, `weight_to`
- `first_weight`, `first_fee`
- `additional_step_weight`, `additional_fee_per_step`
- `flat_fee`, `unit_price_per_kg`
- `min_charge`, `max_charge`
- `billable_weight_rounding`
- `params_json` jsonb default `'{}'::jsonb
- 审计字段

索引要求:
- `(scheme_id, zone_code, lane_code, weight_from, weight_to)`
- `GIN(params_json)`

验收标准:
- `FIRST_ADDITIONAL`、`TIER_FLAT` 两类模式可从本表取数完成计费。

---

## 3. Excel 导入模板任务包

## T5 模板定义与校验器

新增/扩展 sheet:
- `metadata`
- `pricing_scheme`
- `zone_lane_mapping`
- `base_rate_rows`
- `surcharge_rules`（沿用）
- `stack_policies`（沿用）

关键列定义（最小集）:

- `metadata`
  - `version_key`, `effective_from`, `effective_to`, `imported_by`, `remarks`
- `pricing_scheme`
  - `country_code`, `carrier_code`, `service_code`, `product_line`, `currency`, `calc_mode`, `priority`, `conditions_json`
- `zone_lane_mapping`
  - `country_code`, `mapping_type`, `origin_code`, `destination_code`, `postal_prefix_from`, `postal_prefix_to`, `zone_code`, `lane_code`, `distance_km`, `priority`, `conditions_json`
- `base_rate_rows`
  - `scheme_ref`, `zone_code`, `lane_code`, `weight_from`, `weight_to`, `first_weight`, `first_fee`, `additional_step_weight`, `additional_fee_per_step`, `flat_fee`, `unit_price_per_kg`, `min_charge`, `max_charge`, `billable_weight_rounding`, `params_json`

验收标准:
- 缺任意必需 sheet -> HTTP 400。
- 行级业务错误 -> HTTP 422 且全量回滚。
- 成功导入 -> HTTP 200，返回 `versionId`。

## T6 导入服务实现

**文件**: `backend/src/services/pricingImport.service.ts`

实现要求:
- 使用 `AppDataSource.transaction` 单事务导入。
- 顺序: `version -> scheme -> zone/lane -> base_rate_rows -> surcharge -> stack_policy`。
- `scheme_ref` 需先构建内存映射再落 FK。
- 错误返回结构统一:
  - `sheet`
  - `row`
  - `field`
  - `code`
  - `message`

验收标准:
- 任一 sheet 失败，数据库无残留版本/方案/价格行。

---

## 4. 计算引擎任务包

## T7 定义统一请求/响应契约

新增类型（建议放 `backend/src/types/pricing.ts`）:
- `QuoteRequest`
- `QuoteResult`
- `ProductLine`
- `CalcMode`

必须字段:
- 请求: `countryCode`, `carrierCode`, `serviceCode`, `productLine`, `grossWeightKg`, 尺寸与地址/路由输入
- 响应: `status`, `currency`, `baseFreight`, `surchargeTotal`, `grandTotal`, `zoneCode/laneCode`, `trace`

验收标准:
- 响应中可定位命中版本、方案、基础价行、附加费规则。

## T8 实现基础价计算器（策略模式）

**文件**: `backend/src/services/baseFreightEngine.service.ts`

实现要求:
- `calculateByMode(mode, context)` 分发
- 至少实现:
  - `FIRST_ADDITIONAL`
  - `TIER_FLAT`
- 统一处理:
  - 计费重计算与舍入
  - `min_charge`/`max_charge` 截断

验收标准:
- 同一输入在不同模式下输出正确且可复现。

## T9 融合现有附加费引擎

**文件**: `backend/src/services/costEngine.service.ts`

执行流程:
1. 解析生效版本
2. 解析 scheme
3. 解析 zone/lane
4. 计算基础价
5. 叠加 surcharge（含互斥策略）
6. 拒收 gate
7. 汇总结果并输出 trace

验收标准:
- `status=REJECTED` 时保留拒收原因与 trace。
- `status=OK` 时返回 `grandTotal = baseFreight + surchargeTotal`。

---

## 5. API 任务包

## T10 扩展路由合同

**文件**: `backend/src/routes/express-cost.routes.ts`

接口要求:
- `POST /api/v1/express-cost/import-excel`
  - 200: 成功导入
  - 422: 行级业务失败并已回滚
  - 400: 模板/参数错误
  - 500: 非预期错误
- `POST /api/v1/express-cost/calculate`
  - 返回 `baseFreight/surchargeTotal/grandTotal/zoneCode/laneCode/trace`

验收标准:
- Swagger 或文档示例与真实返回一致。

---

## 6. 测试任务包

## T11 单元测试（必做）

`backend/tests/baseFreightEngine.test.ts`
- `FIRST_ADDITIONAL` 基础用例
- `TIER_FLAT` 基础用例
- 舍入规则用例
- `min_charge` / `max_charge` 用例

`backend/tests/pricingImport.test.ts`
- 完整最小 6-sheet 导入成功
- 缺 sheet 报 400
- 坏行触发 422 且全回滚

`backend/tests/costEngine.test.ts`
- zone 命中 + 基础价 + 附加费汇总
- lane 命中（预留路径，可先最小 stub）
- reject 覆盖

## T12 联调验证（必做）

执行命令（backend 目录）:
- `npm test -- --runInBand --testPathPattern="baseFreightEngine|pricingImport|costEngine"`

手工验证:
- 导入成功样例（200）
- 行错误样例（422）
- 缺 metadata 样例（400）
- 试算样例返回 `grandTotal` 与 `trace`

---

## 7. 任务排期与并行建议

建议 4 天执行（单后端主力 + 评审）:

- Day 1: T1~T4（SQL+实体）
- Day 2: T5~T6（导入）
- Day 3: T7~T9（引擎）
- Day 4: T10~T12（接口+测试+文档）

并行建议:
- A 线（DB+实体）与 B 线（测试模板）可并行。
- 引擎开发与 API 合同草拟可并行，但合并前统一类型契约。

---

## 8. 风险与防回滚清单

- 风险 R1: 旧版 Excel 模板与新模板不兼容  
  处置: 保留旧导入入口 1 个迭代周期，或提供模板版本号识别。

- 风险 R2: zone/lane 命中歧义  
  处置: 增加 `priority` 且 trace 返回命中链路。

- 风险 R3: 中大件/卡派需求后续扩展导致改表  
  处置: 新增特性优先走 `conditions_json/params_json`，避免 DDL 频繁变更。

---

## 9. Definition of Done（DoD）

- SQL 脚本可在空库一次执行通过。
- 新实体已注册，服务启动无 TypeORM 元数据错误。
- 导入事务语义通过测试（坏行全回滚）。
- 试算接口可返回基础价与附加费合计及 trace。
- 至少 10 个新增/更新单测通过（可根据实际调整）。
- `docs-temp/EXPRESS_COST_QUICK_START.md` 已更新新模板与示例。

---

## 10. 可直接创建的工单标题（建议）

- `[PhaseA+] 新增 pricing_version/scheme/zone_lane/base_rate 四表与实体`
- `[PhaseA+] 实现 pricingImport 单事务导入（6-sheet）`
- `[PhaseA+] 实现 baseFreightEngine（首重续重+阶梯价）`
- `[PhaseA+] 扩展 costEngine 汇总 base+surcharge+reject`
- `[PhaseA+] 扩展 /express-cost API 返回合同与错误码`
- `[PhaseA+] 补齐导入/引擎/汇总测试与文档`

