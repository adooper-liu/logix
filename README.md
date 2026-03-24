# LogiX - 智能物流管理系统

**项目代号**: LogiX  
**版本**: v1.0.0  
**技术栈**: Vue 3 + Express + PostgreSQL + TypeORM  
**文档更新日期**: 2026-03-21  

---

## 🎯 **项目简介**

LogiX 是一个**智能物流管理系统**，专注于集装箱物流的数字化管理和智能决策。

### 核心价值

- 📊 **数据统一管理**：所有货柜信息在一个平台，实时数据更新
- 🤖 **智能决策支持**：系统自动推荐最优方案，提前预警潜在风险
- ⚡ **自动化流程**：外部数据自动同步，状态变更自动通知
- 💰 **降本增效**：减少人工判断错误，避免不必要的滞期费

### 核心功能模块

| 功能 | 说明 | 状态 |
|------|------|------|
| **智能排柜系统** | 成本优化算法，自动推荐最优卸柜方案 | ✅ 已完成 |
| **数据导入中心** | Excel 批量导入，飞驼系统数据同步 | ✅ 已完成 |
| **智能预警系统** | 即将超期/逾期未提预警，滞港费计算 | ✅ 已完成 |
| **甘特图可视化** | 4 种泳道视图，实时监控货柜状态 | ✅ 已完成 |
| **物流追踪** | 从起运港到目的港全流程追踪 | ✅ 已完成 |

---

## 📚 **文档导航**

### 🚀 快速开始

**新人入职第 1 周阅读路径**：

```
第 1 步：阅读 [快速指南](./docs/快速指南.md)（5 分钟）⭐⭐⭐
  ↓
第 2 步：查看 [全项目文档索引](./docs/DOCUMENT_INDEX.md) ⭐⭐⭐
  ↓
第 3 步：学习 [第一阶段总结前 2 章](./docs/Phase3/第一阶段总结/)
  - 01-项目愿景与战略定位.md
  - 02-项目结构与布局.md
  ↓
第 4 步：掌握 [.codebuddy/skills/logix-development/SKILL.md](./.codebuddy/skills/logix-development/SKILL.md) 🔥
  ↓
第 5 步：根据岗位选择专项文档深入学习
```

### 📖 核心文档

| 文档 | 用途 | 位置 |
|------|------|------|
| **[全项目文档总索引](./docs/DOCUMENT_INDEX.md)** ⭐⭐⭐ | **全项目文档导航（必读）** | `docs/DOCUMENT_INDEX.md` |
| **[快速指南](./docs/快速指南.md)** ⭐⭐⭐ | 5 分钟快速入门 | `docs/快速指南.md` |
| **[文档使用说明](./docs/README-文档使用说明.md)** ⭐⭐ | 如何使用文档体系 | `docs/README-文档使用说明.md` |
| **[Phase3 核心文档](./docs/Phase3/README.md)** ⭐⭐⭐ | Phase3 功能模块详解 | `docs/Phase3/README.md` |
| **[开发规范 SKILL](./.codebuddy/skills/logix-development/SKILL.md)** 🔥 | 数据库优先、命名规范等 | `.codebuddy/skills/` |
| **[TimescaleDB 迁移专题](./docs/TimescaleDB 迁移成功报告.md)** 🔥 | TimescaleDB  hypertable 迁移完整记录 | `docs/TimescaleDB/` |

### 🗂️ 文档体系架构

```
LogiX项目文档体系（三级架构）
│
├── Level 1: 项目总索引 ⭐⭐⭐
│   └── docs/DOCUMENT_INDEX.md (本文档指向的总索引)
│       - 全项目导航
│       - 快速开始指南
│       - 按角色查找表格
│       - 文档维护规范
│
├── Level 2: 分索引 ⭐⭐
│   ├── docs/Phase3/README.md (Phase3 索引)
│   ├── docs/README-文档使用说明.md (使用指南)
│   ├── docs/快速指南.md (快速入门)
│   ├── frontend/public/docs/README.md (前端索引)
│   └── backend/docs/DATABASE_SCRIPTS_INDEX.md (SQL 索引)
│
└── Level 3: 专项文档 ⭐
    ├── 综合文档（5 篇 Phase3 完整文档）
    ├── 第一阶段总结（10 章，编写中）
    ├── SKILL 体系（10 个 AI 技能）
    ├── 前端规范（9 篇）
    └── 后端文档（4 篇）
```

---

## 🏗️ **项目结构**

```
logix/
├── backend/                    # 后端服务（Express + TypeORM）
│   ├── src/
│   │   ├── adapters/           # 外部数据适配器（飞驼、物流路径）
│   │   ├── controllers/        # API 控制器
│   │   ├── services/           # 业务逻辑层
│   │   ├── entities/           # 数据库实体
│   │   └── middleware/         # 中间件
│   ├── migrations/             # 数据库迁移脚本
│   └── docs/                   # 后端文档
│
├── frontend/                   # 前端应用（Vue 3 + Element Plus）
│   ├── src/
│   │   ├── components/         # 组件库
│   │   ├── views/              # 页面组件
│   │   ├── composables/        # Composable 函数
│   │   ├── services/           # API 服务
│   │   └── store/              # 状态管理
│   └── public/docs/            # 前端文档
│
├── logistics-path-system/      # 物流路径微服务（GraphQL）
│   ├── backend/                # GraphQL 服务
│   └── frontend/               # 路径系统前端
│
├── docs/                       # 📚 项目核心文档
│   ├── Phase3/                 # Phase3 综合文档
│   ├── 第一阶段总结/            # 第一阶段总结（10 章）
│   ├── DOCUMENT_INDEX.md       # 🔑 全项目文档总索引
│   ├── 快速指南.md             # 5 分钟快速入门
│   └── ...
│
├── .codebuddy/skills/          # 🤖 AI 辅助开发技能
│   ├── logix-development/      # 核心开发技能（必学）
│   ├── database-query/         # 数据库查询
│   ├── excel-import-requirements/ # Excel 导入规范
│   └── ...
│
└── docker-compose.yml          # Docker 编排配置
```

---

## 🚀 **快速启动**

### 开发环境要求

- Node.js 18+
- PostgreSQL 14+ / TimescaleDB
- Redis 7+
- Docker & Docker Compose（可选）

### 方式一：Docker 启动（推荐）

```bash
# 启动开发环境
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式二：本地启动

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
cd backend
npm run init-db

# 3. 启动后端服务
cd backend
npm run dev

# 4. 启动前端服务（新终端）
cd frontend
npm run dev
```

### 访问地址

- **前端应用**: http://localhost:5173
- **后端 API**: http://localhost:3001
- **物流路径微服务**: http://localhost:4000 (GraphQL Playground)

---

## 👥 **团队协作**

### 按角色划分的学习路径

| 角色 | 必读文档 | 选读文档 |
|------|---------|---------|
| **产品经理** | [01-项目愿景](./docs/Phase3/第一阶段总结/01-项目愿景与战略定位.md)、[智能排柜系统完整文档](./docs/Phase3/智能排柜系统完整文档.md) | [数据导入系统完整文档](./docs/Phase3/数据导入系统完整文档.md) |
| **架构师** | [02-项目结构](./docs/Phase3/第一阶段总结/02-项目结构与布局.md)、[数据库与 API 完整文档](./docs/Phase3/数据库与 API 完整文档.md) | [03-技术选型](./docs/Phase3/第一阶段总结/03-技术选型与架构决策.md)（待编写） |
| **后端开发** | [SKILL](./.codebuddy/skills/logix-development/SKILL.md)、[数据库与 API 完整文档](./docs/Phase3/数据库与 API 完整文档.md) | [数据导入系统完整文档](./docs/Phase3/数据导入系统完整文档.md) |
| **前端开发** | [SKILL](./.codebuddy/skills/logix-development/SKILL.md)、[甘特图模块完整文档](./docs/Phase3/甘特图模块完整文档.md) | [智能预警系统完整文档](./docs/Phase3/智能预警系统完整文档.md) |
| **测试工程师** | [数据导入系统完整文档](./docs/Phase3/数据导入系统完整文档.md)、[智能预警系统完整文档](./docs/Phase3/智能预警系统完整文档.md) | 各模块测试指南 |
| **新人入职** | [快速指南](./docs/快速指南.md)、[全项目文档索引](./docs/DOCUMENT_INDEX.md)、[01-项目愿景](./docs/Phase3/第一阶段总结/01-项目愿景与战略定位.md) | [02-项目结构](./docs/Phase3/第一阶段总结/02-项目结构与布局.md) |

---

## 📊 **项目统计**

### 文档统计

- **核心文档**: 72 篇（精简 58%）
- **归档文档**: ~100 篇（不主动维护）
- **SKILL 技能**: 10 个
- **综合文档**: 5 篇 Phase3 完整文档（3,852 行）

### 代码统计

- **后端代码**: ~15,000 行 TypeScript
- **前端代码**: ~20,000 行 Vue 3 + TypeScript
- **数据库表**: 25+ 张表
- **API 端点**: 50+ 个

---

## 🛠️ **开发工具**

### 必备工具

- **VS Code** - 推荐 IDE
- **Git** - 版本控制
- **Docker Desktop** - 容器化开发
- **Postman** - API 调试

### 推荐插件

- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **Volar** - Vue 3 开发
- **Thunder Client** - REST API 客户端

### AI 辅助开发

本项目集成了 **AI 辅助开发技能体系**（SKILL），大幅提升开发效率：

```bash
# 使用 AI 助手时会自动加载相关 SKILL
.codebuddy/skills/
├── logix-development/          # 核心开发技能（数据库优先、命名规范等）
├── database-query/             # 数据库查询专用
├── excel-import-requirements/  # Excel 导入规范
├── code-review/                # 代码质量审查
├── logix-demurrage/            # 滞港费计算
└── ...
```

---

## 📝 **开发规范**

### 核心原则

1. **数据库优先原则** 🔥
   - 数据库表结构是唯一基准
   - 开发顺序：SQL → 实体 → API → 前端 → 联调
   - 禁止反向：代码对齐数据库，不反向改库补数据

2. **数据完整性** 
   - 禁止临时补丁：不用 UPDATE/INSERT 修补导入错误
   - 正确流程：删除错误数据 → 修复映射/逻辑 → 重新导入

3. **日期口径统一**
   - 全项目统一：所有数据展示使用顶部日期范围筛选
   - 后端口径：actual_ship_date（备货单）→ shipment_date（海运）

4. **代码简洁性**
   - 优先修正源数据而非代码兼容
   - Excel 列名映射使用别名配置
   - 保持代码整洁，定期重构

### 详细规范

请查阅 [.codebuddy/skills/logix-development/SKILL.md](./.codebuddy/skills/logix-development/SKILL.md)



欢迎加入 LogiX项目！🚀

这是一个**智能化、规范化、可扩展**的物流管理系统。我们致力于：

- ✅ **用科技驱动物流行业升级**
- ✅ **让物流管理更简单、更智能**
- ✅ **建立完善的知识体系和文档文化**

**开始你的探索之旅吧！** 

👉 **下一步**: 阅读 [快速指南](./docs/快速指南.md) 或 [全项目文档索引](./docs/DOCUMENT_INDEX.md)

---

**项目状态**: 🟢 正常运行  
**版本**: v1.0.0  
**协议**: Proprietary  
**© 2026 LogiX Team**
