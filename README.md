# LogiX - 智能物流管理系统

**技术栈**: Vue 3 + Express + PostgreSQL + TypeORM + TimescaleDB

---

## 项目简介

LogiX 是智能物流管理系统，专注于集装箱物流的数字化管理和智能决策。

### 核心功能

| 功能 | 说明 |
|------|------|
| 智能排柜系统 | 成本优化算法，自动推荐最优卸柜方案 |
| 数据导入中心 | Excel 批量导入，飞驼系统数据同步 |
| 智能预警系统 | 超期预警，滞港费计算 |
| 甘特图可视化 | 4 种泳道视图，实时监控货柜状态 |
| 物流追踪 | 全流程追踪，从起运港到目的港 |

---

## 快速启动

### 环境要求

- Node.js 18+
- Docker Desktop

### 启动命令

```powershell
.\start-logix-dev.ps1
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 API | http://localhost:3001 |
| 数据库 | localhost:5432 |

---

## 项目结构

```
logix/
├── backend/                    # Express + TypeORM
│   ├── src/
│   │   ├── controllers/       # 25 个 API 控制器
│   │   ├── services/          # 业务逻辑
│   │   ├── entities/          # TypeORM 实体
│   │   ├── middleware/        # 中间件
│   │   └── schedulers/        # 定时任务
│   └── sql/
│       └── schema/            # 数据库表结构
│
├── frontend/                   # Vue 3 + Element Plus
│   └── src/
│       ├── views/             # 页面
│       │   ├── shipments/     # 货柜管理
│       │   ├── scheduling/   # 智能排柜
│       │   ├── demurrage/     # 滞港费
│       │   ├── import/       # 数据导入
│       │   └── monitoring/   # 监控中心
│       ├── components/        # 组件库
│       ├── services/          # API 服务
│       └── store/             # Pinia 状态
│
└── migrations/                # 数据库迁移脚本
```

---

## 数据库表结构 (28 张)

### 字典表 (11 张)

| 表名 | 说明 |
|------|------|
| dict_countries | 国家 |
| dict_customer_types | 客户类型 |
| dict_ports | 港口 |
| dict_shipping_companies | 船公司 |
| dict_freight_forwarders | 货代公司 |
| dict_customs_brokers | 清关公司 |
| dict_trucking_companies | 拖车公司 |
| dict_container_types | 柜型 |
| dict_overseas_companies | 海外公司 |
| dict_warehouses | 仓库 |

### 业务表 (4 张)

| 表名 | 说明 |
|------|------|
| biz_customers | 客户 |
| biz_containers | 货柜 |
| biz_replenishment_orders | 备货单 |
| biz_container_skus | SKU |

### 流程表 (7 张) - 7 层流转

| 表名 | 说明 |
|------|------|
| process_sea_freight | 海运 |
| process_port_operations | 港口操作 |
| process_trucking_transport | 拖卡运输 |
| process_warehouse_operations | 仓库操作 |
| process_empty_return | 还空箱 |
| ext_container_status_events | 状态事件 |
| ext_container_charges | 滞港费记录 |

### 映射表 (3 张)

| 表名 | 说明 |
|------|------|
| dict_port_warehouse_mapping | 港口-仓库映射 |
| dict_warehouse_trucking_mapping | 仓库-拖车映射 |
| dict_trucking_port_mapping | 拖车-港口映射 |

---

## API 控制器 (25 个)

| 控制器 | 功能 |
|--------|------|
| container | 货柜管理 |
| scheduling | 智能排柜 |
| demurrage | 滞港费计算 |
| import | 数据导入 |
| externalData | 飞驼数据同步 |
| logisticsPath | 物流路径 |
| alert | 预警通知 |
| monitoring | 监控中心 |
| dict | 字典管理 |

---

## 命令行工具

### 一、根目录命令 (npm run xxx)

#### 代码质量检查

| 命令 | 说明 | 场景 |
|------|------|------|
| `lint` | 后端 + 前端 + Markdown 完整检查 | 提交前全面检查 |
| `lint:backend` | ESLint 检查后端 TypeScript | 检查后端代码风格 |
| `lint:frontend` | ESLint 检查前端 Vue/TS | 检查前端代码风格 |
| `lint:fix` | 自动修复所有 lint 问题 | 快速修复代码风格 |
| `lint:naming` | 检查命名规范 | 统一代码命名 |
| `format` | 格式化所有代码 | 自动格式化 |

#### 类型检查

| 命令 | 说明 | 场景 |
|------|------|------|
| `type-check` | 检查前后端 TypeScript 类型 | 开发中类型验证 |
| `type-check:backend` | 检查后端类型 | 后端类型检查 |
| `type-check:frontend` | 检查前端类型 | 前端类型检查 |
| `type-check:frontend:ci` | CI 模式前端类型检查 | CI 环境使用 |

#### 测试

| 命令 | 说明 | 场景 |
|------|------|------|
| `test` | 运行后端 + 前端所有测试 | 完整测试 |
| `test:backend` | 运行后端 Jest 测试 | 后端单元测试 |
| `test:frontend` | 运行前端 Vitest 测试 | 前端单元测试 |

#### 质量验证

| 命令 | 说明 | 场景 |
|------|------|------|
| `validate` | 类型检查 + Lint + 命名检查 | 完整验证 |
| `quality` | 验证 + 测试 | 完整质量检查 |
| `quality:ci` | 测试 + 类型 + Lint | CI 环境质量检查 |

#### 开发规范检查

| 命令 | 说明 | 场景 |
|------|------|------|
| `check` | 运行开发范式检查 | 架构/问题/策略/代码检查 |
| `check:arch` | 检查架构设计 | 架构评审 |
| `check:problem` | 检查问题分析 | 问题分析评审 |
| `check:strategy` | 检查实现策略 | 策略评审 |
| `check:review` | 检查代码评审 | 代码审查 |
| `check:dev` | 检查开发规范 | 开发规范检查 |
| `check:test` | 检查测试规范 | 测试规范检查 |
| `check:retro` | 检查回顾总结 | 项目回顾 |

#### 诊断工具

| 命令 | 说明 | 场景 |
|------|------|------|
| `diagnose:country-filter` | 诊断国家筛选问题 | 排查数据筛选异常 |
| `verify:stats-filter` | 验证统计筛选一致性 | 排查统计查询问题 |
| `test:statistics-fix` | 测试统计修复逻辑 | 验证统计修复 |

---

### 二、后端命令 (cd backend && npm run xxx)

#### 开发与运行

| 命令 | 说明 | 场景 |
|------|------|------|
| `dev` | 开发模式热重载启动 | 本地开发 |
| `dev:env` | 指定 .env.dev 环境启动 | 多环境开发 |
| `build` | 编译 TypeScript | 生产构建 |
| `start` | 运行生产构建 | 生产环境启动 |

#### 数据库脚本

| 命令 | 说明 | 场景 |
|------|------|------|
| `execute-migration` | 执行数据库迁移 | 数据库升级 |
| `backfill:feituo-events` | 回填飞驼状态事件 | 数据修复 |
| `check:country-tables` | 检查国家表数据 | 数据诊断 |

#### 排产调试

| 命令 | 说明 | 场景 |
|------|------|------|
| `trace:schedule` | 追踪排产参数 | 调试排产逻辑 |
| `simulate:schedule` | 模拟单个排产 | 测试排产 |

---

### 三、前端命令 (cd frontend && npm run xxx)

#### 开发与构建

| 命令 | 说明 | 场景 |
|------|------|------|
| `dev` | Vite 开发服务器 | 本地开发 |
| `build` | TypeScript 检查 + Vite 构建 | 生产构建 |
| `preview` | 预览构建结果 | 生产预览 |

#### 测试

| 命令 | 说明 | 场景 |
|------|------|------|
| `test` | Vitest 运行测试 | 单元测试 |
| `test:watch` | Vitest 监听模式 | 实时测试 |
| `test:coverage` | 测试覆盖率报告 | 覆盖率检查 |
| `test:e2e` | Playwright E2E 测试 | 端到端测试 |
| `test:e2e:ui` | Playwright UI 模式 | 可视化 E2E |
| `test:e2e:report` | 查看 E2E 测试报告 | 查看结果 |

---

## PowerShell 脚本

### 1. start-logix-dev.ps1

一键启动完整开发环境（数据库 + 后端 + 前端 + 微服务）

```powershell
.\start-logix-dev.ps1
```

**启动服务**：TimescaleDB、Redis、Prometheus、Grafana、Adminer、Backend、Frontend、Logistics-path

### 2. stop-logix-dev.ps1

停止所有开发服务，清理 Docker 容器和 Node 进程

```powershell
.\stop-logix-dev.ps1
```

### 3. backend/reinit_database_docker.ps1

执行所有数据库迁移脚本，重建数据库结构

```powershell
cd backend
.\reinit_database_docker.ps1
```

---

## 开发规范

**核心原则**：
1. **数据库优先**: SQL → 实体 → API → 前端
2. **禁止临时补丁**: 发现错误删除数据 → 修复代码 → 重新导入
3. **日期口径统一**: actual_ship_date（备货单）→ shipment_date（海运）

详见 [.codebuddy/skills/logix-development/SKILL.md](./.codebuddy/skills/logix-development/SKILL.md)

---

**© 2026 LogiX Team**
