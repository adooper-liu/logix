// 文档内容存储（作为 fetch 失败时的备选方案）
console.log('docs-content.js 加载完成');
window.DocsContent = {
    'INDEX.md': `# LogiX 项目总纲

> 📘 LogiX 物流管理系统 - 完整操作指南
>
> 本文档帮助你快速找到所需的操作指南

---

## 🚀 快速开始

### 我想快速启动开发环境
> 📄 [查看开发环境指南](./DEV_ENVIRONMENT_GUIDE.md)
>
> **操作**: 双击 \`start-logix-dev.bat\`
>
> **效果**: 一键启动数据库、管理工具、前端、后端

### 我想查看前端项目
> 📄 [查看前端文档](./frontend/README.md)
>
> **技术**: Vue 3 + TypeScript + Element Plus
>
> **访问**: http://localhost:5173

### 我想查看后端项目
> 📄 [查看后端文档](./backend/README.md)
>
> **技术**: Node.js + Express
>
> **访问**: http://localhost:3001

---

## 🗄️ 数据库管理

### 使用数据库管理工具
> 📄 [查看管理工具指南](./ADMIN_TOOLS_GUIDE.md)
>
> **Adminer**: http://localhost:8080 (轻量级）
>
> **pgAdmin**: http://localhost:5050 (功能完整）

### TimescaleDB 完整学习
> 📄 [查看 TimescaleDB 完整指南](./TIMESCALEDB_GUIDE.md)
>
> **内容**: 安装、配置、时序表、超表、函数、优化

### TimescaleDB 快速参考
> 📄 [查看快速参考](./TIMESCALEDB_QUICK_REFERENCE.md)
>
> **内容**: 常用命令、查询模板、最佳实践

### Docker 数据库操作
> 📄 [查看 Docker 指南](./README_DOCKER.md)
>
> **内容**: Docker Compose 配置、启动、停止、备份

---

## 📦 服务访问地址

| 服务 | 地址 | 用途 |
|------|------|------|
| **前端应用** | http://localhost:5173 | Vue 3 前端界面 |
| **后端 API** | http://localhost:3001 | Node.js 后端服务 |
| **TimescaleDB** | localhost:5432 | PostgreSQL + TimescaleDB |
| **Redis** | localhost:6379 | 缓存服务 |
| **Adminer** | http://localhost:8080 | 轻量级数据库管理 |
| **pgAdmin** | http://localhost:5050 | PostgreSQL 官方管理工具 |
| **Grafana** | http://localhost:3000 | 监控可视化面板 |
| **Prometheus** | http://localhost:9090 | 监控数据采集 |

---

## 🔑 默认账号密码

### 数据库
- **用户名**: 查看 \`.env\` 文件中的 \`DB_USERNAME\`
- **密码**: 查看 \`.env\` 文件中的 \`DB_PASSWORD\`
- **数据库**: 查看 \`.env\` 文件中的 \`DB_DATABASE\`

### pgAdmin
- **Email**: admin@logix.com
- **密码**: LogiX@2024

### Adminer
- 无需登录，直接连接数据库
`,

    'TIMESCALEDB_GUIDE.md': `# TimescaleDB 完整指南

> 本指南详细介绍 TimescaleDB 的安装、配置和使用

---

## 目录

1. [什么是 TimescaleDB](#什么是-timescaledb)
2. [安装与配置](#安装与配置)
3. [基本概念](#基本概念)
4. [超表操作](#超表操作)
5. [时序数据查询](#时序数据查询)
6. [连续聚合](#连续聚合)
7. [压缩与保留](#压缩与保留)
8. [最佳实践](#最佳实践)

---

## 什么是 TimescaleDB

TimescaleDB 是一个开源的时间序列数据库，基于 PostgreSQL 构建，它提供了：

- 完整的 SQL 支持
- 自动分区（超表）
- 时间序列优化查询
- 连续聚合
- 数据压缩

---

## 安装与配置

### Docker 安装

\`\`\`bash
docker-compose -f docker-compose.timescaledb.yml up -d
\`\`\`

### 连接数据库

\`\`\`bash
docker exec -it logix-timescaledb psql -U logix_user -d logix_db
\`\`\`

---

## 基本概念

### 超表（Hypertable）

超表是 TimescaleDB 的核心概念，它是一个虚拟表，自动按时间分区：

\`\`\`sql
-- 创建超表
SELECT create_hypertable('metrics', 'time');

-- 查看超表信息
SELECT * FROM timescaledb_information.hypertables;
\`\`\`

---

## 超表操作

### 创建超表

\`\`\`sql
-- 创建普通表
CREATE TABLE sensor_data (
    time TIMESTAMP NOT NULL,
    sensor_id INTEGER,
    value DOUBLE PRECISION
);

-- 转换为超表
SELECT create_hypertable('sensor_data', 'time');
\`\`\`

---

## 时序数据查询

### 时间桶查询

\`\`\`sql
-- 按 5 分钟聚合
SELECT time_bucket('5 minutes', time) AS bucket,
       avg(value) AS avg_value,
       max(value) AS max_value
FROM sensor_data
WHERE time > NOW() - INTERVAL '1 hour'
GROUP BY bucket
ORDER BY bucket DESC;
\`\`\`

---

## 最佳实践

1. **合理选择分区间隔**: 根据数据量和查询模式选择合适的时间间隔
2. **使用连续聚合**: 对于频繁的聚合查询，使用连续聚合提高性能
3. **启用压缩**: 对历史数据启用压缩以节省存储空间
4. **设置保留策略**: 自动删除过期的旧数据
`,

    'TIMESCALEDB_QUICK_REFERENCE.md': `# TimescaleDB 快速参考

> 常用命令和操作速查表

---

## 创建超表

\`\`\`sql
-- 创建超表
SELECT create_hypertable('table_name', 'time_column');

-- 指定分区间隔
SELECT create_hypertable('table_name', 'time_column', 
    chunk_time_interval => INTERVAL '1 day');
\`\`\`

---

## 时间桶查询

\`\`\`sql
-- 按时间桶聚合
SELECT time_bucket('1 hour', time) AS bucket,
       count(*) AS count,
       avg(value) AS avg_value
FROM metrics
WHERE time > NOW() - INTERVAL '24 hours'
GROUP BY bucket
ORDER BY bucket;
\`\`\`

---

## 连续聚合

\`\`\`sql
-- 创建连续聚合
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT time_bucket('1 hour', time) AS time,
       avg(value) AS avg_value
FROM metrics
GROUP BY time;

-- 刷新策略
SELECT add_continuous_aggregate_policy('metrics_hourly',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '5 minutes');
\`\`\`

---

## 压缩数据

\`\`\`sql
-- 压缩策略
SELECT add_compression_policy('table_name',
    INTERVAL '30 days');

-- 手动压缩
SELECT compress_chunk('table_name', chunk_name);
\`\`\`

---

## 保留策略

\`\`\`sql
-- 删除 30 天前的数据
SELECT add_retention_policy('table_name',
    INTERVAL '30 days');
\`\`\`
`,

    'DEV_ENVIRONMENT_GUIDE.md': `# 开发环境指南

> LogiX 项目开发环境完整配置指南

---

## 前置要求

- **Node.js**: 18.x 或更高版本
- **Docker**: 20.10 或更高版本
- **Docker Compose**: 2.x
- **Git**: 最新版本

---

## 快速启动

### 一键启动所有服务

\`\`\`bash
# Windows 双击运行
start-logix-dev.bat
\`\`\`

这个脚本会依次启动：

1. TimescaleDB 数据库
2. Redis 缓存
3. Adminer 数据库管理工具
4. pgAdmin 数据库管理工具
5. 后端 API 服务
6. 前端开发服务器

---

## 服务访问

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端应用 | http://localhost:5173 | Vue 3 应用 |
| 后端 API | http://localhost:3001 | Express API |
| TimescaleDB | localhost:5432 | PostgreSQL 数据库 |
| Redis | localhost:6379 | 缓存服务 |
| Adminer | http://localhost:8080 | 轻量级数据库管理 |
| pgAdmin | http://localhost:5050 | PostgreSQL 官方工具 |

---

## 开发工作流

1. **启动环境**: \`start-logix-dev.bat\`
2. **访问前端**: http://localhost:5173
3. **修改代码**: 在 \`frontend/\` 或 \`backend/\` 目录下编辑
4. **查看数据库**: http://localhost:8080 (Adminer)
5. **停止环境**: \`stop-logix-dev.bat\`

---

## 故障排查

### 端口被占用

如果端口被占用，可以修改 \`.env\` 文件中的端口配置：

\`\`\`env
VITE_PORT=5174
BACKEND_PORT=3002
\`\`\`

### Docker 启动失败

确保 Docker Desktop 正在运行：

\`\`\`bash
docker ps
\`\`\`

### 数据库连接失败

检查数据库容器状态：

\`\`\`bash
docker-compose -f docker-compose.timescaledb.yml ps
docker-compose -f docker-compose.timescaledb.yml logs
\`\`\`
`,

    'README_DOCKER.md': `# Docker 部署指南

> LogiX 项目 Docker 容器化部署完整指南

---

## 目录

1. [前置要求](#前置要求)
2. [快速开始](#快速开始)
3. [Docker Compose 配置](#docker-compose-配置)
4. [常用操作](#常用操作)
5. [故障排查](#故障排查)

---

## 前置要求

- **Docker**: 20.10 或更高版本
- **Docker Compose**: 2.x
- **Windows**: Docker Desktop
- **Linux/Mac**: Docker Engine

---

## 快速开始

### 启动所有服务

\`\`\`bash
# 使用生产配置
docker-compose -f docker-compose.timescaledb.prod.yml --env-file .env up -d postgres redis

# 查看服务状态
docker-compose -f docker-compose.timescaledb.prod.yml ps
\`\`\`

---

## Docker Compose 配置

### 主配置文件

**docker-compose.timescaledb.prod.yml**:

- **postgres**: TimescaleDB 数据库
- **redis**: Redis 缓存服务
- **adminer**: 数据库管理工具（轻量级）
- **pgadmin**: PostgreSQL 官方管理工具

### 管理工具配置

**docker-compose.admin-tools.yml**:

- **adminer**: http://localhost:8080
- **pgadmin**: http://localhost:5050

---

## 常用操作

### 查看运行中的容器

\`\`\`bash
docker ps
\`\`\`

### 查看容器日志

\`\`\`bash
docker logs logix-timescaledb-prod
docker logs logix-redis-prod
\`\`\`

### 进入容器

\`\`\`bash
docker exec -it logix-timescaledb-prod /bin/bash
docker exec -it logix-redis-prod redis-cli
\`\`\`

### 停止所有服务

\`\`\`bash
docker-compose -f docker-compose.timescaledb.prod.yml down
\`\`\`

### 备份数据库

\`\`\`bash
docker exec logix-timescaledb-prod pg_dump -U logix_user logix_db > backup.sql
\`\`\`

---

## 故障排查

### 端口被占用

\`\`\`bash
# Windows 查看
netstat -ano | findstr "5432"

# Linux/Mac 查看
lsof -i :5432
\`\`\`

### 容器启动失败

\`\`\`bash
# 查看日志
docker-compose -f docker-compose.timescaledb.prod.yml logs

# 重新创建容器
docker-compose -f docker-compose.timescaledb.prod.yml down
docker-compose -f docker-compose.timescaledb.prod.yml up -d
\`\`\`

### 清理所有容器

\`\`\`bash
docker-compose -f docker-compose.timescaledb.prod.yml down -v
docker system prune -a
\`\`\`
`,

    'MIGRATION_GUIDE.md': `# 迁移指南

> LogiX 项目从旧版本迁移到新版本的指南

---

## 迁移前准备

### 1. 备份数据

\`\`\`bash
# 备份数据库
docker exec logix-timescaledb-prod pg_dump -U logix_user logix_db > backup.sql

# 备份配置文件
cp .env .env.backup
\`\`\`

### 2. 记录当前版本

\`\`\`bash
# 查看当前版本
git log -1
\`\`\`

---

## 迁移步骤

### 步骤 1: 停止旧服务

\`\`\`bash
docker-compose down
\`\`\`

### 步骤 2: 拉取最新代码

\`\`\`bash
git pull origin main
\`\`\`

### 步骤 3: 更新配置

检查并更新 \`.env\` 文件中的配置项。

### 步骤 4: 更新依赖

\`\`\`bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd ../frontend
npm install
\`\`\`

### 步骤 5: 启动新服务

\`\`\`bash
# 启动数据库
docker-compose -f docker-compose.timescaledb.prod.yml up -d

# 启动开发环境
start-logix-dev.bat
\`\`\`

---

## 数据库迁移

### 运行迁移脚本

\`\`\`bash
# 进入数据库容器
docker exec -it logix-timescaledb-prod psql -U logix_user -d logix_db

# 运行迁移
\\i /path/to/migration.sql
\`\`\`

---

## 常见问题

### 迁移后数据丢失

确保运行了正确的备份恢复步骤。

### 依赖冲突

删除 \`node_modules\` 后重新安装：

\`\`\`bash
rm -rf node_modules package-lock.json
npm install
\`\`\`
`,

    'WINDOWS_DOCKER_GUIDE.md': `# Windows Docker 配置指南

> 在 Windows 系统上配置和使用 Docker 的完整指南

---

## 安装 Docker Desktop

### 下载和安装

1. 访问 [Docker Desktop 官网](https://www.docker.com/products/docker-desktop/)
2. 下载 Windows 版本
3. 运行安装程序

### 首次启动

1. 启动 Docker Desktop
2. 等待 Docker 引擎启动
3. 验证安装：

\`\`\`bash
docker --version
docker-compose --version
\`\`\`

---

## Docker Desktop 配置

### 资源设置

1. 打开 Docker Desktop 设置
2. 转到 **Resources**
3. 调整配置：

**内存**: 至少 4GB  
**磁盘**: 至少 20GB  
**CPU**: 至少 2 核心

### 文件共享

1. 转到 **Resources** → **File Sharing**
2. 添加项目目录：\`D:\\Gihub\\logix\`

### 网络设置

1. 转到 **Resources** → **Proxies**
2. 配置代理（如果需要）

---

## 常见问题

### Docker 无法启动

**解决方案**:

1. 检查 Windows 版本（需要 Windows 10 Pro 或更高版本）
2. 确保 WSL 2 已安装
3. 重启 Docker Desktop

### 权限错误

**解决方案**:

1. 以管理员身份运行终端
2. 检查 Docker Desktop 权限设置
3. 重启 Docker 服务

### 性能问题

**解决方案**:

1. 增加 Docker Desktop 分配的内存
2. 使用 WSL 2 后端
3. 关闭不必要的容器

---

## PowerShell 命令

### 快速启动

\`\`\`powershell
# 启动 Docker 服务
Start-Service docker

# 查看运行中的容器
docker ps

# 查看所有容器
docker ps -a
\`\`\`

---

## 批处理脚本

项目提供了便捷的批处理脚本：

- \`start-logix-dev.bat\`: 一键启动开发环境
- \`stop-logix-dev.bat\`: 停止所有服务
- \`prod-start.bat\`: 启动生产环境
- \`prod-stop.bat\`: 停止生产环境
`,

    'ADMIN_TOOLS_GUIDE.md': `# 数据库管理工具使用指南

> LogiX 项目数据库管理工具配置和使用指南

---

## 工具概览

| 工具 | 地址 | 特点 |
|------|------|------|
| **Adminer** | http://localhost:8080 | 轻量级、单文件、无需安装 |
| **pgAdmin** | http://localhost:5050 | 功能完整、官方工具 |

---

## Adminer 使用

### 启动 Adminer

\`\`\`bash
docker-compose -f docker-compose.admin-tools.yml up -d adminer
\`\`\`

### 登录配置

访问 http://localhost:8080，填写：

- **系统**: PostgreSQL
- **服务器**: postgres (或 localhost)
- **用户名**: 查看 \`.env\` 中的 \`DB_USERNAME\`
- **密码**: 查看 \`.env\` 中的 \`DB_PASSWORD\`
- **数据库**: 查看 \`.env\` 中的 \`DB_DATABASE\`

### 常用操作

**查看表结构**:

1. 选择数据库
2. 点击表名
3. 查看"结构"标签

**执行 SQL 查询**:

1. 点击 "SQL 命令"
2. 输入 SQL 语句
3. 点击"执行"

**导出数据**:

1. 选择表或数据库
2. 点击"导出"
3. 选择格式并下载

---

## pgAdmin 使用

### 启动 pgAdmin

\`\`\`bash
docker-compose -f docker-compose.admin-tools.yml up -d pgadmin
\`\`\`

### 登录配置

访问 http://localhost:5050，使用默认账号：

- **Email**: admin@logix.com
- **密码**: LogiX@2024

### 连接数据库

1. 点击左侧 "Object" → "Create" → "Server..."
2. 填写服务器信息：

**General**:
- Name: LogiX Database

**Connection**:
- Host: postgres
- Port: 5432
- Username: logix_user
- Password: [从 .env 获取]

3. 点击 "Save" 保存

### 常用操作

**浏览表结构**:

1. 展开 "Servers" → "Databases" → "Schemas" → "public" → "Tables"
2. 右键点击表名
3. 选择 "View/Edit Data" → "All Rows"

**执行查询**:

1. 点击工具栏的 "Query Tool"
2. 输入 SQL 语句
3. 点击 "Execute" (▶)

**备份/恢复**:

- **备份**: 右键点击数据库 → "Backup"
- **恢复**: 右键点击数据库 → "Restore"

---

## TimescaleDB 特定操作

### 查看超表信息

\`\`\`sql
SELECT * FROM timescaledb_information.hypertables;
\`\`\`

### 查看分块信息

\`\`\`sql
SELECT * FROM timescaledb_information.chunks
WHERE hypertable_name = 'your_table';
\`\`\`

### 手动压缩数据

\`\`\`sql
SELECT compress_chunk('your_table', 'chunk_name');
\`\`\`

---

## 最佳实践

### 推荐使用场景

- **Adminer**: 快速查询、简单操作
- **pgAdmin**: 复杂查询、数据导入导出、备份恢复

### 安全建议

1. 生产环境修改默认密码
2. 限制访问 IP
3. 使用 SSL 连接
4. 定期备份

---

## 故障排查

### 连接失败

**检查清单**:

1. 数据库容器是否运行
2. 网络配置是否正确
3. 用户名密码是否正确
4. 端口是否被占用

### 性能问题

1. 减少查询结果集
2. 使用索引
3. 定期清理日志
4. 压缩历史数据
`

};
