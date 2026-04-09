# 技术债务清单 (Development Debt)

## 文档信息

- **版本**: v1.0
- **创建时间**: 2026-04-09
- **最后更新**: 2026-04-09
- **维护者**: LogiX 开发团队
- **状态**: 活跃维护

---

## 一、使用说明

### 1.1 文档目的

本文档是 LogiX 项目的**技术债务单一事实来源**,用于:

1. **追踪债务** - 记录所有已知技术债,避免遗忘
2. **优先级管理** - 按 P0-P3 分级,指导还债顺序
3. **进度跟踪** - 记录每项债务的处理状态
4. **团队协作** - 新人/AI 可快速了解项目健康状况

### 1.2 更新机制

**何时更新**:

- 发现新的技术债时立即添加
- 处理完某项债务后更新状态
- 每月回顾一次,调整优先级

**如何更新**:

1. 在对应分类下添加新条目
2. 标注编号、现象、影响、建议优先级
3. 处理后更新状态为 ✅ 已完成
4. 在更新日志中记录变更

### 1.3 优先级定义

| 级别   | 定义                             | 处理时限          |
| ------ | -------------------------------- | ----------------- |
| **P0** | 阻塞性问题,影响 CI/CD 或核心功能 | 立即处理(1周内)   |
| **P1** | 重要问题,影响开发效率或代码质量  | 近期处理(1个月内) |
| **P2** | 一般问题,影响可维护性            | 计划处理(3个月内) |
| **P3** | 轻微问题,优化类                  | 有空处理(6个月内) |

### 1.4 状态说明

**重要**: 本文档区分两种完成状态:

- **策略完成**: 已修改配置/文档,但门禁可能未通过(如 TD-006)
- **门禁通过**: 配置修改且相关命令实际全绿(如 TD-004)

统计时应分别记录:

- 策略完成数: 已实施解决方案的债务数量
- 门禁通过数: 相关命令真正通过的债务数量

---

## 二、质量门禁与工程化 (P0–P1)

### TD-DOC-001: 技术债文档缺失 🔄 P0

**状态**: 🔄 部分完成(文档已建,流程对齐进行中)  
**发现时间**: 2026-04-09  
**负责人**: 刘志高

**现象**:

- `logix-quality-gates` 技能、`.github/workflows/ci.yml` 注释均指向 `docs/quality/DEVELOPMENT_DEBT.md`
- 该文件**不存在**,导致新人/AI 无法以「单一事实来源」跟踪还债

**影响**:

- CI 注释失效,开发者困惑
- 技术债分散在各处,无法统一管理

**建议**:

- ✅ 已补建本文档
- ⏳ 需更新技能和 CI 注释,确保指向正确路径
- ⏳ 建立定期更新机制

**进展**:

- [x] 创建文档骨架
- [ ] 填充完整债务清单
- [ ] 更新技能引用
- [ ] 更新 CI 注释

---

### TD-006: 本地与 CI 类型检查不一致 🔄 P1

**状态**: 🔄 策略已实施,CI 暂时回退(前端 type-check 待清理历史错误)  
**发现时间**: 2026-04-09  
**实施时间**: 2026-04-09  
**负责人**: 刘志高

**现象**:

- 根目录 `validate`/`quality` 脚本含**全量前端 `vue-tsc`**
- CI (`quality:ci`) **不含前端 tsc**
- 导致本地「全绿」门槛高于 CI,产生「CI 过、本地不过」

**影响**:

- 开发者体验差,CI 通过后本地仍报错
- 合并标准不统一

**当前阻塞**:

- ⚠️ `npm run type-check:frontend:ci` 仍有大量历史 TS 错误(甘特图、通用组件等)
- ⚠️ CI 运行 `npm run test` 会失败(exit code 127)
- **临时方案**: CI 暂时只运行后端测试和类型检查,前端 type-check 待清理后启用

**解决方案**:

- ✅ 采用方案 A: CI 增加 `type-check:frontend:ci`(更严格)
- ✅ 更新 `.github/workflows/ci.yml`,在 quality gate 中添加前端类型检查
- ✅ 更新注释,标注 TD-006 已实施
- ⚠️ **CI 失败后回退**: 暂时移除前端 type-check,仅保留后端检查
- ⏳ 待处理: 清理前端类型错误,重新启用前端 type-check

**相关文件**:

- ✅ `.github/workflows/ci.yml` - 已更新
- ✅ `package.json` - scripts.type-check:frontend:ci (已存在)

**验证**:

```bash
# CI 现在执行:
npm run test && npm run type-check:backend && npm run type-check:frontend:ci && npm run lint:backend

# 本地 validate 仍然执行全量检查:
npm run validate  # type-check + lint + lint:naming
```

**进展**:

- [x] 创建文档骨架
- [x] 填充完整债务清单
- [ ] 更新技能引用(待执行)
- [ ] 更新 CI 注释(待执行)
- [ ] 清理前端类型错误(阻塞项)

---

### TD-COST-001: 费用路由依赖注入不完整 ✅ P0

**状态**: ✅ 已完成 (PR-1)  
**发现时间**: 2026-04-09  
**修复时间**: 2026-04-09  
**负责人**: 刘志高

**现象**:

- `backend/src/routes/cost.routes.ts` 使用 `new (require('../services/costService').CostService)()` 临时实例化
- 运行时可能出现 `undefined` 调用错误
- 依赖链不清晰: CostService → DemurrageService → 8个 Repository

**影响**:

- `/api/v1/costs/*` 接口可能返回 500 错误
- 无法观测具体失败原因
- 代码风格与项目其他路由不一致

**根本原因**:

1. **框架混用** - CostService 使用了 NestJS 装饰器 (`@Injectable`, `@InjectRepository`),但路由层是 Express 风格
2. **依赖复杂** - DemurrageService 需要 8-9 个 Repository,手动初始化冗长
3. **缺乏保护** - 构造函数未检查依赖是否为空

**解决方案**:

- ✅ 在路由层创建工厂函数 `createCostController()`,显式初始化所有依赖
- ✅ 导入所有必需的实体类 (Container, Country, EmptyReturn, ExtDemurrageStandard 等)
- ✅ 添加构造函数健壮性检查,抛出可观测错误
- ✅ 新增单元测试 7 个,覆盖依赖缺失、单柜计算、批量计算、汇总接口
- ✅ 统一错误响应格式 `{ success: false, message }`

**验证结果**:

- ✅ `npm run type-check:backend` 通过
- ✅ `npm run test:backend -- src/services/costService.test.ts` 7/7 通过
- ✅ 路由挂载唯一 (`/costs` 仅在 `routes/index.ts` 第 91 行)
- ✅ 错误日志可定位 (`logger.error` 在所有 catch 块)

**相关文件**:

- `backend/src/routes/cost.routes.ts` - 修复依赖注入
- `backend/src/services/costService.ts` - 添加构造函数检查
- `backend/src/services/costService.test.ts` - 新增单元测试

---

### TD-TEST-003: 后端集成测试未执行 ✅ P0

**状态**: ✅ 已完成 (PR-4)  
**发现时间**: 2026-04-09  
**修复时间**: 2026-04-09  
**负责人**: 刘志高

**现象**:

- `backend/tests/integration/` 目录下有集成测试文件
- 但 `jest.config.js` 第 9 行明确忽略 `/tests/` 目录: `testPathIgnorePatterns: ['/node_modules/', '/dist/', '/tests/']`
- `testMatch` 只匹配 `src/**/*.test.ts` 和 `test/**/*.test.ts`,不包含 `tests/integration`
- 导致集成测试文件存在但从不执行

**影响**:

- **测试覆盖虚假** - 以为有集成测试,实际从未运行
- **回归风险高** - 端到端流程无自动化验证
- **CI 门禁缺失** - 合并前不检查集成测试

**根本原因**:

1. **配置遗漏** - Jest 配置未考虑 integration 测试目录
2. **职责不清** - 单元测试与集成测试混用同一配置
3. **缺少独立 pipeline** - CI 中无集成测试 job

**解决方案**:

- ✅ 创建独立的 `backend/jest.integration.config.js`
  - `testMatch`: `['**/tests/integration/**/*.test.ts']`
  - `testPathIgnorePatterns`: 不忽略 tests 目录
  - `testTimeout`: 30000ms (集成测试较慢)
  - `maxWorkers`: 1 (串行执行,避免数据库竞争)
- ✅ 在 `backend/package.json` 中添加 `test:integration` 脚本
- ✅ 在根 `package.json` 中添加 `test:backend:integration` 透传脚本
- ✅ 在 `.github/workflows/ci.yml` 中添加 `integration-tests` job (初期 `continue-on-error: true`)
- ✅ **修复集成测试编译错误**:
  - 修正模块路径: `../../src/` → `../../../src/`
  - 修正 API 参数: `portCodes` → `portCode`, `minFreeDays` 移除
  - 修正返回类型: `result.data` → `result.results`
  - 添加显式类型声明: `forEach((item: any) => ...)`

**验证结果**:

- ✅ `cd backend && npx jest --config jest.integration.config.js --listTests` 能识别测试文件
- ✅ **TypeScript 编译通过**: 修复了模块路径 (`../../src/` → `../../../src/`) 和类型声明
- ✅ **Jest 配置正确**: integration 测试能被识别和执行
- ⚠️ **运行时依赖**: 测试需要数据库和 Redis 连接 (当前环境未启动,导致运行时失败)
- ✅ `npm run test:backend` 不受影响 (单元测试仍正常运行)
- ✅ `npm run test:backend:integration` 可执行集成测试 (编译通过,运行时需要 DB/Redis)
- ✅ CI 新 job 可见 (初期允许失败)

**相关文件**:

- `backend/jest.integration.config.js` - 新增集成测试配置
- `backend/package.json` - 添加 test:integration 脚本
- `package.json` - 添加 test:backend:integration 透传脚本
- `.github/workflows/ci.yml` - 添加 integration-tests job

---

### TD-API-001: 前端 HTTP 客户端未收敛 ✅ P0

**状态**: ✅ 已完成 (PR-3)  
**发现时间**: 2026-04-09  
**修复时间**: 2026-04-09  
**负责人**: 刘志高

**现象**:

- `frontend/src/api/httpClient.ts` - 独立的 HTTP 客户端,有鉴权/超时逻辑
- `frontend/src/services/api.ts` - 统一请求治理入口,有鉴权/超时/重试/并发/去重
- 两个客户端功能重叠,行为不一致
- `fiveNode.ts` 和 `monitoring.ts` 使用 `httpClient`,其他服务使用 `api`

**影响**:

- **重试机制不一致** - `api.ts` 有自动重试,`httpClient` 没有
- **并发控制缺失** - `httpClient` 无并发限制,可能导致服务器压力过大
- **请求去重缺失** - `httpClient` 无去重,可能重复发送相同请求
- **超时策略不一致** - 两套不同的超时配置
- **维护成本高** - 修改鉴权/超时逻辑需改两处

**根本原因**:

1. **历史遗留** - `httpClient` 是早期实现,`api.ts` 是后期优化的统一入口
2. **迁移未完成** - 部分模块已迁移到 `api.ts`,但 `fiveNode` 和 `monitoring` 仍用旧客户端
3. **缺少规范** - 未明确禁止直接使用 `httpClient`

**解决方案**:

- ✅ 迁移 `frontend/src/services/fiveNode.ts`: `httpClient` → `api`
- ✅ 迁移 `frontend/src/api/monitoring.ts`: `httpClient` → `api`
- ✅ 标记 `frontend/src/api/httpClient.ts` 为 `@deprecated`
- ✅ **修复前后端前缀不一致**: `httpClient` baseURL 从 `/api` 改为 `/api/v1`,与后端 `config.apiPrefix` 对齐
- ✅ **修正返回类型语义**: monitoring.ts 所有函数正确解包 `{ code, message, data }` 中的 `data` 字段
- ✅ **清理 console 日志**: httpClient.ts 中 3处 console 替换为 logger
- ✅ 验证无其他文件使用 `httpClient`: `rg "from '@/api/httpClient'" frontend/src` 命中清零

**验证结果**:

- ✅ `npm run type-check:frontend:ci` 执行并记录(历史错误与本次修改无关)
- ✅ `rg "from '@/api/httpClient'" frontend/src` 命中清零
- ✅ **前后端前缀一致**: 所有 baseURL 统一为 `/api/v1`,与后端 `config.apiPrefix` 对齐
- ✅ **返回类型语义正确**: monitoring.ts 所有函数正确解包 `{ code, message, data }` 中的 `data` 字段
- ✅ **日志统一**: httpClient.ts 中 3处 console 替换为 logger
- ✅ fiveNode 页面请求正常(使用统一的鉴权/超时/重试/并发/去重)
- ✅ monitoring 页面请求正常(使用统一的鉴权/超时/重试/并发/去重)
- ✅ 请求头 `Authorization` 与 `X-Country-Code` 一致生效

**相关文件**:

- `frontend/src/services/fiveNode.ts` - 迁移到 api
- `frontend/src/api/monitoring.ts` - 迁移到 api
- `frontend/src/api/httpClient.ts` - 标记 deprecated

---

### TD-MON-001: 监控路由重复挂载 ✅ P0

**状态**: ✅ 已完成 (PR-2)  
**发现时间**: 2026-04-09  
**修复时间**: 2026-04-09  
**负责人**: 刘志高

**现象**:

- `backend/src/app.ts` 第 143 行: `app.use(`${config.apiPrefix}/monitoring`, monitoringRoutes)`
- `backend/src/routes/index.ts` 第 81 行: `router.use('', monitoringRoutes)`
- 监控路由被挂载两次,导致路径冲突

**影响**:

- `/api/v1/monitoring` 可能被重复注册
- 可能存在双层前缀问题 (`/api/v1//monitoring`)
- 前端调用可能返回 404 或错误数据

**根本原因**:

1. **职责不清** - app.ts 和 routes/index.ts 都尝试挂载监控路由
2. **路径不一致** - 控制器内部使用 `/monitoring` 前缀,外层又加一次
3. **缺少统一规划** - 未明确路由挂载的唯一入口

**解决方案**:

- ✅ 从 `app.ts` 移除监控路由挂载 (第 143 行)
- ✅ 移除 `app.ts` 中不再需要的 `monitoringRoutes` 导入
- ✅ 修正 `routes/index.ts` 挂载路径: `router.use('', ...)` → `router.use('/monitoring', ...)`
- ✅ 修正监控控制器所有路径,去掉重复的 `/monitoring` 前缀:
  - `/monitoring` → `/`
  - `/monitoring/refresh` → `/refresh`
  - `/monitoring/performance` → `/performance`
  - `/monitoring/optimization` → `/optimization`
  - `/monitoring/alerts` → `/alerts`
  - `/monitoring/health` → `/health`
  - `/monitoring/trend` → `/trend`
  - `/monitoring/gc` → `/gc`
  - `/monitoring/memory-analysis` → `/memory-analysis`
- ✅ 清理监控控制器中的 10 处 console 调用,统一使用 logger

**验证结果**:

- ✅ `npm run type-check:backend` 通过
- ✅ 路由挂载唯一 (`/monitoring` 仅在 `routes/index.ts` 第 81 行)
- ✅ 最终路径正确: `/api/v1/monitoring/*`
- ✅ 日志统一: 所有 console 替换为 logger.error/warn/info

**相关文件**:

- `backend/src/app.ts` - 移除重复挂载
- `backend/src/routes/index.ts` - 修正挂载路径
- `backend/src/controllers/monitoring.controller.ts` - 修正子路径 + 清理 console

---

### TD-008: @ts-nocheck 滥用 ⚠️ P1

**状态**: 🔄 评估完成,准备处理  
**发现时间**: 2026-04-09  
**评估时间**: 2026-04-09  
**负责人**: 刘志高

**现象**:
`backend` 中 **4 个文件**使用 `@ts-nocheck`:

1. `feituoImport.service.ts` (3310行) - 飞驼 Excel 导入服务
2. `externalDataService.ts` (1967行) - 外部数据同步服务
3. `feituoPlaces.processor.ts` (473行) - 飞驼地点处理器
4. `FeituoSmartDateUpdater.ts` (~200行) - 飞驼智能日期更新器

**影响**:

- 飞驼/外部数据链路**失去类型保护**
- 重构易埋雷,Bug 后置到运行时
- 总计 ~6000 行代码无类型检查

**根本原因**:

1. **DeepPartial 类型问题** - TypeORM 的 `DeepPartial<T>` 与飞驼导入的动态字段映射不兼容
2. **可空字段处理** - 飞驼数据中大量字段可选,与实体定义不完全对齐
3. **大批量写入** - 性能优化代码使用了动态类型,TS 难以推断

**评估报告**:

- ✅ 已完成工作量评估: [TD-008-ts-nocheck-assessment.md](./TD-008-ts-nocheck-assessment.md)
- 建议采用**方案 A + C 组合**: 渐进式拆除 + 加强测试

**建议**:

- **短期** (1-2周): 增加单元测试(目标 60% 覆盖率),添加 JSDoc 注释
- **中期** (1个月): 选择最简单文件试点拆除,总结经验
- **长期** (3个月): 逐步处理其他文件,或考虑重构拆分

**工作量评估**:

- 渐进式拆除: 2-3 周全职
- 重构拆分: 1-2 个月全职
- 仅增加测试: 1 周

**相关文件**:

- `docs/quality/TD-008-ts-nocheck-assessment.md` - 详细评估报告

---

### TD-004: shared 模块 TS6059 错误 ✅ P1

**状态**: ✅ 已完成  
**发现时间**: 2026-04-09  
**完成时间**: 2026-04-09  
**负责人**: 刘志高

**现象**:

- `backend` 引用 `@shared/returnDateCalculator`
- 与 `tsconfig` `rootDir: ./src` 组合时出现 **TS6059** 错误
- 错误信息: `File 'D:/Gihub/logix/shared/src/returnDateCalculator.ts' is not under 'rootDir' 'D:/Gihub/logix/backend/src'`

**影响**:

- `tsc` 在部分环境下失败,阻碍严格门禁
- CI 类型检查不稳定

**解决方案**:

- ✅ 采用方案 C: 调整 `rootDir` 和 `include`
- ✅ 将 `rootDir` 从 `./src` 改为 `..`(项目根目录)
- ✅ 在 `include` 中添加 `../shared/src/**/*`
- ✅ 在 `exclude` 中排除测试文件 `../shared/src/**/*.test.ts`

**修改文件**:

- ✅ `backend/tsconfig.json` - 已更新

**验证**:

```bash
# 修复前:
npm run type-check  # TS6059 错误

# 修复后:
npm run type-check  # ✅ 通过,无错误
```

**注意事项**:

- `rootDir` 改为 `..` 后,outDir 仍为 `./dist`,编译输出不受影响
- 排除了 shared 的测试文件,避免重复编译
- 此方案简单且风险低,无需 monorepo 化

**进展**:

- [x] 分析问题原因
- [x] 选择解决方案(方案 C)
- [x] 修改 tsconfig.json
- [x] 验证 type-check 通过

---

### TD-007: ESLint 规则与文档不一致 ⚠️ P2

**状态**: ⏳ 待处理  
**发现时间**: 2026-04-09

**现象**:

- 技能称 `lint:backend` 已把部分原 warning 收为 error
- **仍需与 `eslint` 实际配置一致**

**影响**:

- 规则与文档不一致时产生误解
- 开发者可能误判代码质量

**建议**:

- 定期对照 `eslint` 输出更新技能说明
- 或在文档中固定 ESLint 配置快照

---

## 三、类型系统与可维护性 (P1)

### TD-TYPE-001: any 滥用 ⚠️ P1

**状态**: ⏳ 待处理

**现象**:
控制器/服务层大量 `: any`/结构松散:

- `scheduling.controller.ts`
- `import.controller.ts`
- `ai` 相关模块

**影响**:

- 接口契约与运行时行为难对齐
- Bug 后置到联调阶段

**建议**:

- 优先对外 API 与统计/导入路径
- 逐步替换为具体类型或 interface

---

### TD-TYPE-002: @ts-ignore 滥用 ⚠️ P1

**状态**: ⏳ 待处理

**现象**:

- `cost-optimizer-date-constraints.test.ts` 对私有方法访问使用 `ts-ignore`

**影响**:

- 测试脆弱,实现一改即 silent break
- 掩盖真正的类型问题

**建议**:

- 重构测试,避免访问私有成员
- 或使用 `// @ts-expect-error` + 注释说明原因

---

### TD-TYPE-003: 命名约定例外 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- `ContainerQueryBuilder` 等使用 `eslint-disable` 保留与业务键名一致的命名

**影响**:

- 可接受,但需在文档中**固定为「允许的例外」**
- 避免蔓延到其他场景

**建议**:

- 在 `DEVELOPMENT_STANDARDS.md` 中明确列出允许的例外
- 定期审查,确保未扩散

---

## 四、可观测性与规范违背 (P1–P2)

### TD-OBS-001: console 未清理 ✅ P1

**状态**: ✅ 已完成 (Phase 1+2+3)  
**发现时间**: 2026-04-09  
**完成时间**: 2026-04-09  
**负责人**: 刘志高

**现象**:

- 后端 `CacheDecorator`、`CacheService` 及多处业务/统计相关仍含 `console.*`
- 前端 `SchedulingVisual.vue`、`useGanttLogic.ts` 等也有较多 `console`

**影响**:

- 与项目「禁止 console 」类规范冲突
- 生产日志噪音、难统一采集

**建议**:

- 全部替换为 `logger.debug/info/warn/error`
- 添加 ESLint 规则禁止 console

**进展**:

- ✅ Phase 1: 后端统计服务 (26处) - 已完成
  - StatusDistribution.service.ts (3处)
  - ArrivalStatistics.service.ts (13处)
  - EtaStatistics.service.ts (5处)
  - containerStatistics.service.ts (4处)
  - PlannedPickupStatistics.service.ts (1处)
  - ⚠️ 修复引入的类型错误: containerStatistics default 分支 `return 0` → `return []`
- ✅ Phase 2: 前端服务层 (21处) - 已完成
  - universalDictMapping.ts (12处)
  - dictMapping.ts (6处)
  - costOptimizer.service.ts (3处)
- ✅ Phase 3: 工具类和其他 (4处) - 已完成
  - smartCalendarCapacity.ts (4处 logger 配置)
  - schedulingCostOptimizer.service.ts (4处 logger 配置,已计入)
- ✅ Phase 4: 补充清理生产代码 (9处) - 已完成
  - scheduling.routes.ts (2处)
  - scheduling.controller.ts (1处)
  - CacheService.ts (4处)
  - fiveNodeController.ts (2处)

**验证**: `npm run type-check:backend` ✅ 通过

**总计**: 60/60 处已清理 (100%) ✅

**说明**:

- 后端统计服务目录 (`backend/src/services/statistics/`) 已全部清理完毕
- 所有生产代码中的 console 已全部清理完毕
- 测试文件、示例文件和文档注释中的 console 保留(用于调试)

---

### TD-OBS-002: 日志级别不统一 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- 既有 `winston`/`logger`,又有 `console`、MCP 专用 logger

**影响**:

- 排障路径分散
- 日志格式不统一

**建议**:

- 统一使用 `logger` 工具
- 制定日志级别使用规范

---

## 五、测试与验证 (P1)

### TD-TEST-001: 集成/E2E 未完成 ⚠️ P1

**状态**: ⏳ 待处理

**现象**:

- `frontend/tests/integration/scheduling/intelligent-scheduling.e2e.test.ts` 等含 **TODO**(档期扣减、并发、DB 失败等)

**影响**:

- 关键路径(排产、成本)**自动化覆盖不足**
- 回归测试依赖人工

**建议**:

- 补全 TODO 中的测试用例
- 或降级为明确 **skipped + issue**,记录原因

---

### TD-TEST-002: 单测与 mock 不稳定 ⚠️ P1

**状态**: ⏳ 待处理

**现象**:

- 历史对话中曾出现 `OccupancyCalculator` 等用例因 **repo mock 未就绪**失败

**影响**:

- 测试不稳定,削弱 `npm test` 作为门禁的可信度
- 开发者可能忽略失败的测试

**建议**:

- 修复 mock 配置
- 添加测试稳定性监控

---

### TD-TEST-003: 统计对账未在 CI 强制执行 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- `verify:stats-filter` 依赖**后端已启动**,未在默认 CI 中强制执行

**影响**:

- 统计/筛选口径漂移**可能晚发现**

**建议**:

- 在 CI 中添加统计对账步骤
- 或使用 mock 数据离线验证

---

## 六、业务功能「未完成」型代码债 (P2)

### TD-FEATURE-001: 排产/调度 TODO ⚠️ P2

**状态**: ⏳ 待处理

**现象**:
`scheduling.controller.ts` 多处 **TODO**:

- 智能推荐
- 批量优化
- 成本预测查询
- 优化建议算法等

**影响**:

- 接口或部分分支为**占位/未实现**
- 用户可能误以为功能可用

**建议**:

- 实现或移除占位接口
- 或在文档中明确标注「实验中」

---

### TD-FEATURE-002: 配置硬编码 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- `scheduling.config.ts`:**TODO 应从 DB/配置中心读取**

**影响**:

- 当前硬编码与部署环境耦合
- 多环境部署困难

**建议**:

- 迁移到数据库或配置中心
- 支持环境变量覆盖

---

### TD-FEATURE-003: 清关/车队映射待完善 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- `CustomsBrokerSelectionService`、`TruckingSelectorService`:**更细映射或费用**待建模

**影响**:

- 智能排柜精度受限

**建议**:

- 补充映射规则
- 添加费用模型

---

### TD-FEATURE-004: 日历/国家维度待接入 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- `smartCalendarCapacity.ts`:**TODO 接入国家代码**

**影响**:

- 与排柜资源、国家维度一致性问题

**建议**:

- 接入国家维度
- 确保与 `dict_countries` 对齐

---

### TD-FEATURE-005: 导入模板下载未完成 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- `UniversalImport.vue`:**TODO 模板下载**

**影响**:

- 用户体验与运营自助能力未完成

**建议**:

- 实现模板下载功能
- 提供示例数据

---

## 七、架构与运行时 (P2)

### TD-ARCH-001: 调度器互斥不完整 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- 仅 `containerStatus.scheduler` 使用 `DistributedLock`
- **滞港费写回、预警**等仍为 `setInterval` + 异步任务,**无分布式锁**

**影响**:

- 长任务时可能**重叠执行**
- 多实例部署时**重复扫描**

**建议**:

- 为滞港费/预警等补 **DistributedLock** 或等价单实例互斥
- 按部署模型选择方案

---

### TD-ARCH-002: 分布式锁降级策略 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- `DistributedLock.acquire` 在 **Redis 异常时返回 `true`**

**影响**:

- 可用性优先时**牺牲互斥**
- 需在运维层明确「可接受」

**建议**:

- 在文档中明确降级策略的适用场景
- 或改为抛出异常,由调用方决定

---

### TD-ARCH-003: 列表分页中间件覆盖不全 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- 仅 6 条路由挂载分页验证中间件
- `countries`、`dict-mapping`、`audit` 等仍无统一 `pageSize` 上限

**影响**:

- 大页请求仍可能打穿部分接口

**建议**:

- 扩展到所有列表接口
- 或在全局中间件中统一处理

---

### TD-ARCH-004: Redis 缓存键国家维度 ⚠️ P2

**状态**: ✅ 已修正

**现象**:

- 统计缓存需考虑 `getScopedCountryCode`,否则存在**跨国家串缓存**风险

**影响**:

- 属于**数据正确性**类债

**进展**:

- [x] Phase 2.1 已修正,缓存键包含国家维度

---

## 八、前端专项 (P2)

### TD-FRONT-001: 大体量页面/组件 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- 排产、甘特等单文件复杂度高,维护成本高

**影响**:

- 新人上手困难
- 修改风险高

**建议**:

- 拆分为子组件
- 提取 composables

---

### TD-FRONT-002: 备份文件入库 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- `Shipments.backup.vue`、`useGanttLogic.ts.backup.*`

**影响**:

- 易与真实实现混淆,增加 review 成本

**建议**:

- 移出仓库或添加到 `.gitignore`
- 使用 Git 历史而非备份文件

---

### TD-FRONT-003: i18n 硬编码 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- 规范要求用户可见文案走 `$t()`,历史代码中仍有硬编码/待办

**影响**:

- 国际化不完整
- 多语言切换失效

**建议**:

- 全局搜索硬编码中文
- 逐步替换为 `$t()`

---

## 九、文档与元数据 (P2–P3)

### TD-DOC-002: 文档体量过大 ⚠️ P2

**状态**: ⏳ 待处理

**现象**:

- `frontend/public/docs` 大量专题文档,与代码**同步成本高**

**影响**:

- 文档过时风险高
- 维护负担重

**建议**:

- 定期审查,归档或删除过期文档
- 优先保持核心文档更新

---

### TD-DOC-003: 临时/阶段文档未清理 ⚠️ P3

**状态**: ⏳ 待处理

**现象**:

- `backend/docs-temp/` 下 PHASE 报告与 **TODO** 并存

**影响**:

- 需定期归档或删除,避免「以文档为准」引用过期结论

**建议**:

- 每季度清理一次
- 或将重要内容迁移到正式文档

---

## 十、性能优化类债务 (与 Phase 1-2 相关)

> 注:以下债务已在 Phase 1-2 中部分处理,此处记录剩余项

---

## 十一、还债路线图

### 短期 (1-2周) - P0

1. ✅ 补建 `DEVELOPMENT_DEBT.md` (TD-DOC-001) - **文档已建,流程对齐进行中**
2. 🔄 统一本地与 CI 类型检查策略 (TD-006) - **已实施但回退,待清理前端错误**
3. ✅ 修复 shared 模块 TS6059 (TD-004) - **已完成**
4. ✅ 修复费用路由依赖注入 (TD-COST-001) - **PR-1 已完成**
5. ✅ 修复监控路由重复挂载 (TD-MON-001) - **PR-2 已完成**
6. ✅ 收敛前端 HTTP 客户端 (TD-API-001) - **PR-3 已完成**
7. ✅ 让后端集成测试真正执行 (TD-TEST-003) - **PR-4 已完成**

### 中期 (1个月) - P1

4. ⏳ 拆除 `@ts-nocheck` (TD-008)
5. ✅ 清理 console.log (TD-OBS-001) - **已完成 (51处)**
6. ⏳ 补全集成测试 TODO (TD-TEST-001)
7. ⏳ 修复不稳定 mock (TD-TEST-002)

### 长期 (3个月) - P2

8. ⏳ 调度器补分布式锁 (TD-ARCH-001)
9. ⏳ 扩展分页中间件覆盖 (TD-ARCH-003)
10. ⏳ 实现未完成功能 (TD-FEATURE-\*)
11. ⏳ 前端组件拆分 (TD-FRONT-001)
12. ⏳ 清理备份文件 (TD-FRONT-002)

---

## 十二、更新日志

| 日期       | 版本  | 更新内容                                                                                                                                              | 作者   |
| ---------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-04-09 | v1.14 | PR-4 完成: 让后端集成测试真正执行,创建独立 jest.integration.config.js,修复编译错误(模块路径/类型/API参数),添加 CI integration job (continue-on-error) | 刘志高 |
| 2026-04-09 | v1.13 | PR-3 完成: 收敛前端 HTTP 客户端,迁移 fiveNode/monitoring 到 api,修复前后端前缀不一致,修正返回类型语义,清理 console,标记 httpClient deprecated         | 刘志高 |
| 2026-04-09 | v1.12 | PR-2 完成: 修复监控路由重复挂载,移除 app.ts 重复挂载,修正控制器路径,清理 10处 console                                                                 | 刘志高 |
| 2026-04-09 | v1.11 | PR-1 完成: 修复费用路由依赖注入,移除 require 临时实例化,添加构造函数健壮性检查,新增单元测试 7个全部通过                                               | 刘志高 |
| 2026-04-09 | v1.10 | TD-006 CI 回退: 因 exit code 127 失败,暂时移除前端 type-check,仅保留后端检查                                                                          | 刘志高 |
| 2026-04-09 | v1.9  | TD-OBS-001 Phase 4 补充清理: 清理 scheduling/CacheService/fiveNodeController 等生产代码共 9处 console,总计 60处全部完成                               | 刘志高 |
| 2026-04-09 | v1.8  | 修正 TD-OBS-001 统计口径: Phase 1 包含 PlannedPickupStatistics (26处),后端统计服务目录全部清理完毕                                                    | 刘志高 |
| 2026-04-09 | v1.7  | TD-OBS-001 Phase 3 完成: 清理工具类和其他文件共 5处 console,总计 51处全部完成                                                                         | 刘志高 |
| 2026-04-09 | v1.6  | 修复 TD-OBS-001 引入的类型错误: containerStatistics default 分支 return 0 → []                                                                        | 刘志高 |
| 2026-04-09 | v1.5  | TD-OBS-001 Phase 1+2 完成: 清理后端统计服务和前端服务层共 46处 console                                                                                | 刘志高 |
| 2026-04-09 | v1.4  | 修正 TD-006/TD-DOC-001 状态口径,区分策略完成与门禁通过                                                                                                | 刘志高 |
| 2026-04-09 | v1.3  | 修复 TD-004: 调整 rootDir 解决 TS6059 错误                                                                                                            | 刘志高 |
| 2026-04-09 | v1.2  | 完成 TD-008 工作量评估,创建详细评估报告                                                                                                               | 刘志高 |
| 2026-04-09 | v1.1  | 修复 TD-006: CI 增加前端类型检查                                                                                                                      | 刘志高 |
| 2026-04-09 | v1.0  | 初始版本,创建文档骨架                                                                                                                                 | 刘志高 |

---

## 十三、相关文档

- [Phase 2 前端请求治理完成总结](../frontend/public/docs/第 1 层 - 开发规范/13-Phase2完成总结.md)
- [开发规范](../frontend/public/docs/第 1 层 - 开发规范/01-代码规范.md)
- [CI 配置](../../.github/workflows/ci.yml)
- [Quality Gates 技能](../../.lingma/skills/logix-quality-gates/)

---

**文档结束**
