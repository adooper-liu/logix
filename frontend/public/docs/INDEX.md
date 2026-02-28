# LogiX 项目总纲

> 📘 LogiX 物流管理系统 - 完整操作指南
>
> 本文档帮助你快速找到所需的操作指南

---

## 📚 核心文档导航（必读）

### 1. 开发规范与流程 ⭐⭐⭐
> 📄 [查看开发规范](./DEVELOPMENT_STANDARDS.md)
>
> **核心原则**: 数据库表结构是唯一不变基准
>
> **内容包括**:
> - 失败案例总结（外键约束、表名不统一、字段名混用）
> - 开发流程规范（数据库→实体→API→前端）
> - 命名规范（snake_case/camelCase分离）
> - 关键开发步骤（新增表/字段的完整流程）
> - 常用映射参考（表名、字段名、API参数）

### 2. 核心映射参考 ⭐⭐⭐
> 📄 [查看核心映射参考](./docs/CORE_MAPPINGS_REFERENCE.md)
>
> **快速查询**:
> - 完整表名映射（数据库↔实体↔API）
> - 11张核心表的完整字段映射
> - 外键关系速查
> - 主键字段速查
> - API接口映射示例
> - 常见错误速查

**开发必读顺序**: 开发规范 → 核心映射参考 → 开始编码

---

## 📊 项目状态与开发计划

### 想了解项目当前状态 ⭐⭐⭐
> 📄 [查看项目现状与开发计划](../../docs-temp/PROJECT_STATUS_AND_DEVELOPMENT_PLAN.md)
>
> **内容包括**:
> - 项目技术架构总览
> - container-system整合方案
> - 核心功能完成度统计
> - 已实现功能清单
> - 待开发功能列表（P0-P4优先级）
> - 详细的整合开发计划
> - 下一步开发内容（P0阶段）

### 想查看开发前必读规则
> 📄 [查看开发前必读规则](../../.MUST_READ_BEFORE_DEVELOPMENT.md)
>
> **核心内容**:
> - 核心开发原则（数据库优先、代码优先、数据完整性）
> - 文档生成规则
> - 命名规范
> - 数据库规则
> - 物流业务定义
> - 物流状态定义
> - 滞港费计算规则

---

## 🚀 快速开始

### 我第一次使用 LogiX（5分钟快速启动）
> 📄 [查看快速启动指南](./QUICK_START.md) ⭐⭐⭐
>
> **操作**: 双击 `start-logix-dev.ps1`
>
> **效果**: 一键启动 TimescaleDB、前端、后端

### 我想启动开发环境
> 📄 [查看开发环境指南](./DEV_ENVIRONMENT_GUIDE.md) ⭐⭐
>
> **操作**: 双击 `start-logix-dev.ps1`
>
> **服务地址**:
> - 前端: http://localhost:5173
> - 后端: http://localhost:3001
> - Adminer: http://localhost:8080

### 我想查看前端项目
> 📄 [查看前端文档](./frontend/README.md)
>
> **技术**: Vue 3 + TypeScript + Element Plus
>
> **访问**: http://localhost:5173

### 我想查看后端项目
> 📄 [查看后端文档](./backend/README.md)
>
> **技术**: Node.js + Express + TypeORM
>
> **访问**: http://localhost:3001

---

## 🗄️ 数据库管理

### 数据库管理完整指南 ⭐⭐⭐
> 📄 [查看数据库管理指南](./backend/DATABASE_MANAGEMENT_GUIDE.md)
>
> **核心策略**: SQL 脚本管理表结构 + TypeORM 操作数据
>
> **内容包括**:
> - 核心SQL脚本说明（5个核心脚本）
> - 数据库初始化完整流程
> - 表结构变更流程
> - Entity 定义与 SQL 表结构对齐
> - 开发环境配置

### TimescaleDB 快速参考 ⭐⭐
> 📄 [查看快速参考](./TIMESCALEDB_QUICK_REFERENCE.md)
>
> **常用命令**:
> ```bash
> tsdb-start      # 启动TimescaleDB
> tsdb-stop       # 停止TimescaleDB
> tsdb-logs       # 查看日志
> tsdb-db         # 连接数据库
> tsdb-info       # 查看统计
> ```

### TimescaleDB 完整指南 ⭐
> 📄 [查看完整指南](./TIMESCALEDB_GUIDE.md)
>
> **内容**: 安装、配置、时序表、超表、函数、优化

### 数据库管理工具
>
> **Adminer**: http://localhost:8080 (轻量级）
>
> **pgAdmin**: http://localhost:5050 (功能完整）

---

## 🔧 开发与部署

### 启动开发环境
```bash
# 双击运行
start-logix-dev.bat
```

### 停止开发环境
```bash
# 双击运行
stop-logix-dev.bat
```

### 启动生产环境
```bash
# 生产启动
prod-start.bat

# 生产停止
prod-stop.bat

# 查看日志
prod-logs.bat
```

### TimescaleDB 快速操作
```bash
# 启动数据库
tsdb-start.bat

# 停止数据库
tsdb-stop.bat

# 查看日志
tsdb-logs.bat

# 数据库信息
tsdb-db.bat

# 清理数据
tsdb-clean.bat
```

---

## 📦 服务访问地址

||| 服务 | 地址 | 用途 |
|||------|------|
||| **前端应用** | http://localhost:5173 | Vue 3 前端界面 |
||| **后端 API** | http://localhost:3001 | Node.js 后端服务 |
||| **TimescaleDB** | localhost:5432 | PostgreSQL + TimescaleDB |
||| **Redis** | localhost:6379 | 缓存服务 |
||| **Adminer** | http://localhost:8080 | 轻量级数据库管理 |
||| **pgAdmin** | http://localhost:5050 | PostgreSQL 官方管理工具 |
||| **Grafana** | http://localhost:3000 | 监控可视化面板 |
||| **Prometheus** | http://localhost:9090 | 监控数据采集 |

---

## 📚 文档分类

### 🚀 快速入门
||| 文档 | 说明 |
|||------|------|
||| [DEV_ENVIRONMENT_GUIDE.md](./DEV_ENVIRONMENT_GUIDE.md) | 开发环境完整指南 ⭐ |
||| [README_DOCKER.md](./README_DOCKER.md) | Docker 部署指南 |

### 💻 前后端开发
||| 文档 | 说明 |
|||------|------|
||| [frontend/README.md](./frontend/README.md) | 前端技术栈和架构 |
||| [backend/README.md](./backend/README.md) | 后端 API 开发文档 |

### 🗄️ 数据库
||| 文档 | 说明 |
|||------|------|
||| [DATABASE_MANAGEMENT_GUIDE.md](./backend/DATABASE_MANAGEMENT_GUIDE.md) | 数据库管理完整指南 ⭐ |
||| [TIMESCALEDB_GUIDE.md](./TIMESCALEDB_GUIDE.md) | TimescaleDB 完整指南 ⭐ |
||| [TIMESCALEDB_QUICK_REFERENCE.md](./TIMESCALEDB_QUICK_REFERENCE.md) | TimescaleDB 快速参考 ⭐ |
||| [ADMIN_TOOLS_GUIDE.md](./ADMIN_TOOLS_GUIDE.md) | 数据库管理工具指南 ⭐ |

### 🛠️ 管理工具
||| 文档 | 说明 |
|||------|------|
||| [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) | 迁移指南 |

### 📋 docs/ 目录文档

#### 📚 架构与参考文档 ⭐⭐⭐
||| 文档 | 说明 |
|||------|------|
||| [ARCHITECTURE_EXPLAINED.md](./docs/ARCHITECTURE_EXPLAINED.md) | 系统架构详细说明 |
||| [BACKEND_QUICK_REFERENCE.md](./docs/BACKEND_QUICK_REFERENCE.md) | 后端快速参考 |
||| [CORE_MAPPINGS_REFERENCE.md](./docs/CORE_MAPPINGS_REFERENCE.md) | 核心映射参考 ⭐ |
||| [CORRECT_FIELD_MAPPINGS.ts](./docs/CORRECT_FIELD_MAPPINGS.ts) | 正确字段映射文件 |
||| [LOGISTICS_STATUS_STATE_MACHINE.md](./docs/LOGISTICS_STATUS_STATE_MACHINE.md) | 物流状态机说明 |
||| [UNIFIED_STATUS_MACHINE_IMPLEMENTATION.md](./docs/UNIFIED_STATUS_MACHINE_IMPLEMENTATION.md) | 统一状态机实现 |
||| [UNIVERSAL_DICT_MAPPING_GUIDE.md](./docs/UNIVERSAL_DICT_MAPPING_GUIDE.md) | 通用字典映射指南 |

#### 🚀 功能实现与集成
||| 文档 | 说明 |
|||------|------|
||| [EXTERNAL_DATA_INTEGRATION_GUIDE.md](./docs/EXTERNAL_DATA_INTEGRATION_GUIDE.md) | 外部数据集成指南 ⭐ |
||| [EXTERNAL_DATA_INTEGRATION_SUMMARY.md](./docs/EXTERNAL_DATA_INTEGRATION_SUMMARY.md) | 外部数据集成总结 |
||| [EXTERNAL_DATA_QUICKSTART.md](./docs/EXTERNAL_DATA_QUICKSTART.md) | 外部数据快速开始 |
||| [IMPLEMENT_TIME_FIX_GUIDE.md](./docs/IMPLEMENT_TIME_FIX_GUIDE.md) | 时间修复实现指南 |
||| [TIMESTAMP_MIGRATION_COMPLETE.md](./docs/TIMESTAMP_MIGRATION_COMPLETE.md) | 时间戳迁移完成标记 |
||| [MULTIPLE_ORDERS_PER_CONTAINER.md](./docs/MULTIPLE_ORDERS_PER_CONTAINER.md) | 多订单货柜说明 |

#### 🐛 问题分析与修复
||| 文档 | 说明 |
|||------|------|
||| [DATE_FIX_SUMMARY.md](./docs/DATE_FIX_SUMMARY.md) | 日期修复总结 |
||| [DATE_PARSING_FIX.md](./docs/DATE_PARSING_FIX.md) | 日期解析修复 |
||| [DOCUMENT_TRANSFER_DATE_TYPE_CHANGE.md](./docs/DOCUMENT_TRANSFER_DATE_TYPE_CHANGE.md) | 文档传递日期类型变更 |
||| [EXCEL_IMPORT_GUIDE.md](./docs/EXCEL_IMPORT_GUIDE.md) | Excel导入指南 |
||| [EXCEL_STATUS_MAPPING_ISSUE.md](./docs/EXCEL_STATUS_MAPPING_ISSUE.md) | Excel状态映射问题 |
||| [EXCEL_STATUS_MAPPING.md](./docs/EXCEL_STATUS_MAPPING.md) | Excel状态映射 |
||| [IMPORT_MAPPING_FIX_SUMMARY.md](./docs/IMPORT_MAPPING_FIX_SUMMARY.md) | 导入映射修复总结 |

#### ✅ 验证与测试
||| 文档 | 说明 |
|||------|------|
||| [ARRIVAL_COUNTDOWN_VERIFICATION.md](./docs/ARRIVAL_COUNTDOWN_VERIFICATION.md) | 到港倒计时验证 |
||| [DATA_VERIFICATION_REPORT_MRKU4896861.md](./docs/DATA_VERIFICATION_REPORT_MRKU4896861.md) | 数据验证报告示例 |
||| [date-parsing-test.html](./docs/date-parsing-test.html) | 日期解析测试页面 |

#### 📝 开发与维护
||| 文档 | 说明 |
|||------|------|
||| [COUNTDOWN_CARD_LOGIC.md](./docs/COUNTDOWN_CARD_LOGIC.md) | 倒计时卡片逻辑说明 ⭐ |
||| [DEVELOPMENT_SUMMARY.md](./docs/DEVELOPMENT_SUMMARY.md) | 开发总结 |
||| [CLEAR_PORTS_TAB_DUPLICATION.md](./docs/CLEAR_PORTS_TAB_DUPLICATION.md) | 清除港口标签重复 |
||| [CONTAINER_NUMBER_FIX.md](./docs/CONTAINER_NUMBER_FIX.md) | 集装箱号修复 |

### 📖 参考手册
||| 文档 | 说明 |
|||------|------|
||| [NAMING_CONVENTIONS.md](./NAMING_CONVENTIONS.md) | 字段命名规范 ⭐ |
||| [WINDOWS_DOCKER_GUIDE.md](./WINDOWS_DOCKER_GUIDE.md) | Windows Docker 配置 |

---

## 🔑 默认账号密码

### 数据库
- **用户名**: 查看 `.env` 文件中的 `DB_USERNAME`
- **密码**: 查看 `.env` 文件中的 `DB_PASSWORD`
- **数据库**: 查看 `.env` 文件中的 `DB_DATABASE`

### pgAdmin
- **Email**: admin@logix.com
- **密码**: LogiX@2024

### Adminer
- 无需登录，直接连接数据库

---

## ⚡ 常用命令

### Docker 操作
```bash
# 查看运行中的容器
docker ps

# 查看所有容器
docker ps -a

# 查看容器日志
docker logs <容器名>

# 进入容器
docker exec -it <容器名> /bin/bash

# 停止容器
docker stop <容器名>

# 启动容器
docker start <容器名>

# 重启容器
docker restart <容器名>
```

### 数据库连接
```bash
# 使用 psql 连接
docker exec -it logix-timescaledb-prod psql -U logix_user -d logix_db

# 查看所有表
\dt

# 退出
\q
```

### 数据库管理
```bash
# 启动管理工具
docker-compose -f docker-compose.admin-tools.yml up -d

# 停止管理工具
docker-compose -f docker-compose.admin-tools.yml down
```

---

## 🎯 按场景查找

### 场景 1: 我要开始开发
1. 双击 `start-logix-dev.bat`
2. 等待所有服务启动
3. 访问 http://localhost:5173
4. 开始编码

### 场景 2: 我要查看数据库数据
1. 访问 http://localhost:8080 (Adminer)
2. 填写数据库连接信息
3. 浏览和查询数据

### 场景 3: 我要部署到生产环境
1. 修改 `.env` 文件（生产配置）
2. 运行 `prod-start.bat`
3. 访问生产地址

### 场景 4: 我要学习 TimescaleDB
1. 阅读 [TIMESCALEDB_GUIDE.md](./TIMESCALEDB_GUIDE.md)
2. 按章节学习
3. 在数据库管理工具中实践

### 场景 5: 我要备份数据库
1. 停止服务: `stop-logix-dev.bat`
2. 复制 `backups/` 目录
3. 恢复时放回原位置

---

## 🆘 故障排查

### 问题: Docker 未启动
**症状**: `error during connect`
**解决**: 启动 Docker Desktop

### 问题: 端口被占用
**症状**: `port is already allocated`
**解决**: 修改 `.env` 中的端口配置

### 问题: 前端显示 404
**症状**: 页面空白或 404
**解决**:
1. 检查 `npm run dev` 是否运行
2. 清除浏览器缓存
3. 尝试访问 http://localhost:5173/index.html

### 问题: 数据库连接失败
**症状**: `connect ECONNREFUSED`
**解决**:
1. 检查 TimescaleDB 容器是否运行
2. 检查 `.env` 配置是否正确
3. 查看容器日志

---

## 📝 开发工作流

```
┌─────────────────────────────────────┐
│   1. 启动开发环境                 │
│   start-logix-dev.bat            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   2. 访问应用                   │
│   Frontend: http://localhost:5173  │
│   Backend:  http://localhost:3001  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   3. 开发代码                   │
│   前端: frontend/src/             │
│   后端: backend/src/              │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   4. 查看数据库（可选）          │
│   Adminer: http://localhost:8080  │
│   pgAdmin: http://localhost:5050  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   5. 停止环境                   │
│   stop-logix-dev.bat             │
└─────────────────────────────────────┘
```

---

## 🔗 技术栈

### 前端
- Vue 3.4.0
- TypeScript 5.3.0
- Vite 5.0.10
- Element Plus 2.4.4
- Pinia 2.1.7
- Vue Router 4.2.5
- ECharts 5.4.3

### 后端
- Node.js 18+
- Express
- TypeScript

### 数据库
- PostgreSQL 15 (TimescaleDB 2.15.1)
- Redis 7

### 监控
- Prometheus
- Grafana
- TimescaleDB Toolkit

---

## 📞 获取帮助

### 常见问题
- 查看 [故障排查](#🆘-故障排查)
- 查看各文档的故障排查章节

### 学习资源
- [Vue 3 官方文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [TimescaleDB 文档](https://docs.timescale.com/)
- [Vite 文档](https://vitejs.dev/)

### 项目文档
- [开发环境指南](./DEV_ENVIRONMENT_GUIDE.md) ⭐
- [数据库管理指南](./backend/DATABASE_MANAGEMENT_GUIDE.md) ⭐
- [字段命名规范](./NAMING_CONVENTIONS.md) ⭐
- [数据库管理工具指南](./ADMIN_TOOLS_GUIDE.md) ⭐
- [TimescaleDB 完整指南](./TIMESCALEDB_GUIDE.md) ⭐
- [TimescaleDB 快速参考](./TIMESCALEDB_QUICK_REFERENCE.md) ⭐

---

**提示**: ⭐ 标记的是最常用的文档，建议优先阅读
