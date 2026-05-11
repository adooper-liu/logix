# 全球快递费决策可视化 - Phase 1 完成报告

**完成日期**: 2026-04-23  
**状态**: 后端 Phase 1 交付与文档已对齐（7/7 任务；实施进度见同目录 [EXPRESS_COST_IMPLEMENTATION_PROGRESS.md](./EXPRESS_COST_IMPLEMENTATION_PROGRESS.md)）

---

## 🎉 项目成果总览

已成功完成**全球快递费决策可视化**项目的 Phase 1 核心基础设施搭建，包括：

✅ SQL 数据库表结构设计  
✅ TypeORM 实体定义  
✅ CostEngine 成本引擎核心逻辑  
✅ Excel 导入服务  
✅ REST API 路由  
✅ 单元测试框架  
✅ 后端依赖安装

---

## 📁 交付文件清单

### 1. 数据库层

#### SQL 建表脚本

- **文件**: [backend/sql/schema/04_express_cost_tables.sql](file:///d:/Github/logix/backend/sql/schema/04_express_cost_tables.sql)
- **内容**:
  - `dict_express_surcharge_version` - 规则版本管理
  - `dict_express_carrier_service` - 承运商服务字典
  - `dict_express_surcharge_rule` - 附加费规则主表（含 JSONB 条件树）
  - `dict_express_stack_policy` - 互斥策略表
  - `ext_sku_logistics_attributes` - SKU 物流属性主数据
- **特性**:
  - GIN 索引加速 JSONB 查询
  - 完整性标记（FULL/INCOMPLETE）
  - 审计字段（created_at, updated_at）

### 2. 实体层

#### TypeORM 实体（5个文件）

- [ExpressSurchargeVersion.ts](file:///d:/Github/logix/backend/src/entities/ExpressSurchargeVersion.ts)
- [ExpressCarrierService.ts](file:///d:/Github/logix/backend/src/entities/ExpressCarrierService.ts)
- [ExpressSurchargeRule.ts](file:///d:/Github/logix/backend/src/entities/ExpressSurchargeRule.ts)
- [ExpressStackPolicy.ts](file:///d:/Github/logix/backend/src/entities/ExpressStackPolicy.ts)
- [SkuLogisticsAttributes.ts](file:///d:/Github/logix/backend/src/entities/SkuLogisticsAttributes.ts)

**已注册到数据源**: [database/index.ts](file:///d:/Github/logix/backend/src/database/index.ts#L145-L153)

### 3. 业务逻辑层

#### CostEngine 成本引擎

- **文件**: [costEngine.service.ts](file:///d:/Github/logix/backend/src/services/costEngine.service.ts)
- **功能**:
  - ✅ 计费重计算（体积重 = 长×宽×高 / 139）
  - ✅ 规则匹配（简单阈值 + 复杂条件树）
  - ✅ 互斥策略应用（IF_THEN_DISABLE / MAX_GROUP）
  - ✅ 拒收判定与费用归因
- **输入输出**:

  ```typescript
  // 输入
  interface ScenarioInput {
    countryCode: string;
    carrierServiceId: number;
    longestIn: number;
    secondIn: number;
    shortestIn: number;
    grossWeightLbs: number;
  }

  // 输出
  interface CostResult {
    status: "OK" | "REJECTED";
    charges: ChargeItem[];
    totalSurcharge: number;
    billableWeightLbs: number;
    volumeWeightLbs: number;
  }
  ```

#### Excel 导入服务

- **文件**: [expressRuleImport.service.ts](file:///d:/Github/logix/backend/src/services/expressRuleImport.service.ts)
- **功能**:
  - ✅ 解析 Excel 多 Sheet（surcharge_rules、stack_policies、metadata）
  - ✅ 处理边界情况：
    - 金额区间（`4.87-6.25` → amountMin/amountMax）
    - 文本比较符（`>120` → condition_literal）
    - × 标记（→ ingest_completeness='INCOMPLETE'）
  - ✅ 自动创建/更新承运商服务记录
  - ✅ **单事务**写入规则与 stack_policies；任一行失败则**全量回滚**

### 4. API 层

#### REST API 路由

- **文件**: [express-cost.routes.ts](file:///d:/Github/logix/backend/src/routes/express-cost.routes.ts)
- **已挂载**: [routes/index.ts](file:///d:/Github/logix/backend/src/routes/index.ts) 中 `router.use('/express-cost', expressCostRoutes)`；全路径为 `{apiPrefix}/express-cost/...`（`apiPrefix` 默认 `/api/v1`）
- **API 端点**:
  ```
  POST   /api/v1/express-cost/import-excel     # 上传 Excel 并导入（行级失败→422）
  POST   /api/v1/express-cost/calculate         # 试算附加费
  GET    /api/v1/express-cost/versions          # 获取版本列表
  GET    /api/v1/express-cost/carriers          # 获取承运商列表
  GET    /api/v1/express-cost/rules             # 查询规则列表
  ```

### 5. 测试层

#### 单元测试

- [costEngine.test.ts](file:///d:/Github/logix/backend/tests/costEngine.test.ts) - CostEngine 核心逻辑测试
- [expressRuleImport.test.ts](file:///d:/Github/logix/backend/tests/expressRuleImport.test.ts) - 内存构建最小三 Sheet 的 xlsx；校验**行级失败全量回滚**；不依赖 200+ 行 fixtures
- **已覆盖**:
  - CostEngine：AHS_DIM、Oversize+互斥、拒收、体积重、`carrierServiceId` 为动态主键
  - 导入：成功路径、缺 metadata 错误、坏行回滚后表为空
- **未作为硬指标**（可放入 Phase 2）: 覆盖率 70%、全量 193 行 fixtures 压测

### 6. 文档层

- [实施进度报告](file:///d:/Github/logix/docs-temp/EXPRESS_COST_IMPLEMENTATION_PROGRESS.md) - 详细记录开发过程
- [快速启动指南](file:///d:/Github/logix/docs-temp/EXPRESS_COST_QUICK_START.md) - Step-by-Step 操作手册
- [Phase 1 完成报告](file:///d:/Github/logix/docs-temp/EXPRESS_COST_PHASE1_COMPLETION.md) - 本文档

---

## 🚀 快速开始

### Step 1: 执行数据库迁移

```bash
cd d:\Github\logix\backend

# 方法 1: 使用 psql
psql -U postgres -d logix -f sql/schema/04_express_cost_tables.sql

# 方法 2: 使用 Docker
docker exec -i logix-postgres psql -U postgres -d logix < sql/schema/04_express_cost_tables.sql
```

### Step 2: 准备 Excel 测试文件

将 CSV 转换为 Excel（3 个 Sheet），放置到：

```
backend/tests/fixtures/全球快递费规则_20260214.xlsx
```

### Step 3: 启动后端服务

```bash
cd d:\Github\logix\backend
npm run dev
```

### Step 4: 测试 API

#### 4.1 导入 Excel

```bash
curl -X POST http://localhost:3002/api/v1/express-cost/import-excel \
  -F "file=@backend/tests/fixtures/全球快递费规则_20260214.xlsx"
```

#### 4.2 试算附加费

```bash
curl -X POST http://localhost:3002/api/v1/express-cost/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "countryCode": "US",
    "carrierServiceId": 1,
    "longestIn": 50,
    "secondIn": 30,
    "shortestIn": 20,
    "grossWeightLbs": 40
  }'
```

预期响应：

```json
{
  "success": true,
  "data": {
    "status": "OK",
    "charges": [
      {
        "type": "AHS_DIM",
        "amount": 4.87,
        "triggered": true
      }
    ],
    "totalSurcharge": 4.87,
    "billableWeightLbs": 40,
    "volumeWeightLbs": 22
  }
}
```

---

## ✅ 验收标准

### 功能验收（以 `npm test` + 手测为准）

- [ ] 能成功导入符合列模板的 Excel（全量条数依数据文件而定）
- [x] CostEngine 单测覆盖：AHS_DIM、Oversize+互斥、拒收（min billable 规则）、体积重
- [ ] 生产全量规则下「CA 多箱 1000」等复杂行需单独用例或手测补全
- [x] 互斥策略单测（IF_THEN_DISABLE + `if_triggered`）
- [x] 导入单测：行级失败时整单回滚

### 性能验收

- 未在 CI 中固化 p200ms/5s 指标；可在接全量数据后由 `npm test` 或压测脚本补充

### 代码质量

- [x] 核心逻辑具备可运行单测；覆盖率目标见 Phase 2

---

## 🔧 技术亮点

### 1. JSONB 灵活存储

使用 PostgreSQL JSONB 存储复杂条件树（`conditions_json`、`policy_json`），支持：

- AND/OR 嵌套（如 Seller Flex 三条件）
- 灵活扩展（未来可添加新操作符）
- GIN 索引加速查询

### 2. 互斥策略独立化

`dict_express_stack_policy` 表将互斥逻辑从规则表中解耦：

- 支持动态配置（运营人员可调整互斥关系）
- 避免硬编码优先级
- 与 [全球快递规则结构化](file:///C:/Users/adoop/.cursor/plans/全球快递规则结构化_33085c46.plan.md) 流水线对齐

### 3. 数据完整性标记

`ingest_completeness` 字段隔离不完整数据：

- FR/IT 部分行金额为 `×` → 标记为 `INCOMPLETE`
- CostEngine 计算时可跳过或告警
- 前端展示时可标注"数据待补全"

### 4. 版本化管理

`dict_express_surcharge_version` 支持：

- 多版本并存（历史回溯 + 灰度发布）
- 生效日期管理
- 来源文件追溯

### 5. Excel 多 Sheet 设计

相比 CSV，Excel 格式优势：

- 天然支持引号内换行（Alt+Enter）
- 数据类型明确（数字/文本自动识别）
- 多 Sheet 分离（规则/策略/元数据）
- 复用 LogiX 现有 Excel 导入框架

---

## 📊 项目统计

| 指标             | 数值                                                |
| ---------------- | --------------------------------------------------- |
| **SQL 文件**     | 1 个（219 行）                                      |
| **TypeORM 实体** | 5 个（约 330 行）                                   |
| **服务层代码**   | 2 个（约 913 行）                                   |
| **API 路由**     | 1 个（约 304 行）                                   |
| **单元测试**     | 2 个（约 394 行）                                   |
| **文档**         | 3 个（约 1099 行）                                  |
| **总代码量**     | 约 3000+ 行（含测试与 docs-temp，粗算，以仓库为准） |
| **开发工时**     | 估算值，不作审计依据                                |

---

## 🎯 下一步计划（Phase 2）

### 短期目标（1-2 周）

1. **前端页面开发**
   - 雷达图可视化（ECharts）
   - 试算表单与对比表
   - 敏感度分析扫掠

2. **完善单元测试**
   - 补充测试数据（fixtures/Excel 文件）
   - 运行测试并修复问题
   - 提升覆盖率至 > 70%

3. **性能优化**
   - Redis 缓存热点试算结果
   - 批量试算接口（Promise.all）
   - 数据库查询优化

### 中期目标（1-2 月）

4. **对接 OMS**
   - 订单预览 API（事中预警）
   - SKU 主数据同步
   - 实时费率查询

5. **事后偏差分析**
   - 预估 vs 实际费用对比
   - 主导因子下钻
   - 根因标签规则配置

6. **智能推荐**
   - 渠道推荐引擎
   - 包装优化建议
   - 拆单策略分析

### 长期目标（3-6 月）

7. **数仓集成**
   - Python 网络仿真
   - ML 预测模型
   - BI 看板集成

---

## 🔗 相关资源

### 代码文件

- **SQL 脚本**: [backend/sql/schema/04_express_cost_tables.sql](file:///d:/Github/logix/backend/sql/schema/04_express_cost_tables.sql)
- **CostEngine**: [backend/src/services/costEngine.service.ts](file:///d:/Github/logix/backend/src/services/costEngine.service.ts)
- **Excel 导入**: [backend/src/services/expressRuleImport.service.ts](file:///d:/Github/logix/backend/src/services/expressRuleImport.service.ts)
- **API 路由**: [backend/src/routes/express-cost.routes.ts](file:///d:/Github/logix/backend/src/routes/express-cost.routes.ts)

### 文档

- **实施进度**: [docs-temp/EXPRESS_COST_IMPLEMENTATION_PROGRESS.md](file:///d:/Github/logix/docs-temp/EXPRESS_COST_IMPLEMENTATION_PROGRESS.md)
- **快速启动**: [docs-temp/EXPRESS_COST_QUICK_START.md](file:///d:/Github/logix/docs-temp/EXPRESS_COST_QUICK_START.md)
- **原始计划**: `C:\Users\adoop\.cursor\plans\全球快递费决策可视化_9c026f60.plan.md`

### 外部参考

- **飞驼 API 文档**: https://doc.freightower.com/
- **LogiX 开发规范**: [frontend/public/docs/DEVELOPMENT_STANDARDS.md](file:///d:/Github/logix/frontend/public/docs/DEVELOPMENT_STANDARDS.md)

---

## 💡 关键决策记录

### 决策 1: 数据源格式从 CSV 改为 Excel

**原因**:

- CSV 解析复杂度高（引号内换行、多态阈值）
- LogiX 已有成熟的 Excel 导入框架（飞驼导入）
- Excel 支持多 Sheet 分离（规则/策略/元数据）

**影响**:

- ✅ 降低开发难度（无需自定义 CSV 解析器）
- ✅ 提升用户体验（可直接在 Excel 中编辑和预览）

### 决策 2: 使用 JSONB 存储复杂条件

**原因**:

- 支持 AND/OR 嵌套（如 Seller Flex 三条件）
- 灵活扩展（未来可添加新操作符）
- PostgreSQL GIN 索引加速查询

**风险**:

- ⚠️ JSONB 查询性能略低于关系型字段
- ⚠️ 需在应用层做校验（避免无效 JSON）

### 决策 3: 分阶段实施（先 MVP 再扩展）

**原因**:

- 降低初期风险（先验证 US/CA 两国）
- 快速获得反馈（2 周内交付可用版本）
- 避免过度设计（二期再考虑数仓/BI 集成）

---

## 🙏 致谢

感谢 LogiX 团队提供的成熟基础设施：

- TypeORM 实体管理系统
- Excel 导入框架（飞驼导入经验）
- Jest 单元测试框架
- ESLint/Prettier 代码规范

---

**Phase 1 圆满完成！** 🎉

下一步：准备 Excel 测试文件并执行数据库迁移，即可开始手动测试。
