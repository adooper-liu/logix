# LogiX Docker & TimescaleDB 文档导航
# LogiX Docker & TimescaleDB Documentation Navigation

> **🎯 快速找到你需要的文档**
> **🎯 Quickly find the documentation you need**

---

## 📚 文档清单 / Documentation List

### 🚀 快速开始 / Quick Start

| 文档 / Document | 说明 / Description | 适用人群 / Target Audience |
|-----------------|-------------------|---------------------------|
| **[WINDOWS_DOCKER_GUIDE.md](./WINDOWS_DOCKER_GUIDE.md)** | Windows 快速启动指南 | 新手用户 / Beginners |
| **[TIMESCALEDB_QUICK_REFERENCE.md](./TIMESCALEDB_QUICK_REFERENCE.md)** | 快速命令参考 | 所有用户 / All Users |

### 📖 完整指南 / Complete Guides

| 文档 / Document | 说明 / Description | 适用人群 / Target Audience |
|-----------------|-------------------|---------------------------|
| **[TIMESCALEDB_GUIDE.md](./TIMESCALEDB_GUIDE.md)** | TimescaleDB 完整集成指南 | 所有用户 / All Users |
| **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** | 从 PostgreSQL 迁移指南 | 正在迁移的用户 / Migrating Users |

### 🛠️ 配置文件 / Configuration Files

| 文件 / Document | 说明 / Description |
|-----------------|-------------------|
| [.env.example](./.env.example) | 通用环境变量示例 |
| [.env.timescaledb.example](./.env.timescaledb.example) | TimescaleDB 详细配置 |

---

## 🎯 我该看哪个文档？/ Which Document Should I Read?

### 场景 1: 我第一次使用 LogiX / Scenario 1: First Time User

**推荐阅读 / Recommended:**

1. 📖 **[WINDOWS_DOCKER_GUIDE.md](./WINDOWS_DOCKER_GUIDE.md)** - 快速启动
2. 📖 **[TIMESCALEDB_QUICK_REFERENCE.md](./TIMESCALEDB_QUICK_REFERENCE.md)** - 命令参考

**快速开始 / Quick Start:**
```cmd
tsdb-start      # 启动环境
tsdb-info       # 查看统计
tsdb-db         # 进入数据库
```

---

### 场景 2: 我想了解 TimescaleDB 的详细功能 / Scenario 2: Want to Learn TimescaleDB Features

**推荐阅读 / Recommended:**

📖 **[TIMESCALEDB_GUIDE.md](./TIMESCALEDB_GUIDE.md)** - 完整指南

**包含内容 / Contents:**
- ✅ 概述和架构
- ✅ 功能特性详解
- ✅ Windows 脚本使用
- ✅ 命令参考
- ✅ 监控和可视化
- ✅ 最佳实践
- ✅ 故障排查
- ✅ 性能调优

---

### 场景 3: 我正在从标准 PostgreSQL 迁移 / Scenario 3: Migrating from Standard PostgreSQL

**推荐阅读 / Recommended:**

📖 **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - 迁移指南

**包含内容 / Contents:**
- ✅ 迁移检查清单
- ✅ 清理旧文件
- ✅ 迁移步骤
- ✅ 数据备份和恢复
- ✅ 性能对比
- ✅ 故障排查
- ✅ 新旧命令对照

---

### 场景 4: 我只是想快速查个命令 / Scenario 4: Just Want to Quick Look Up a Command

**推荐阅读 / Recommended:**

📖 **[TIMESCALEDB_QUICK_REFERENCE.md](./TIMESCALEDB_QUICK_REFERENCE.md)** - 快速参考

**包含内容 / Contents:**
- ✅ 快速命令
- ✅ 常用 SQL 查询
- ✅ 维护命令
- ✅ 监控和告警
- ✅ 故障排查

---

### 场景 5: 我想配置生产环境 / Scenario 5: Want to Configure Production Environment

**推荐阅读 / Recommended:**

1. 📖 **[TIMESCALEDB_GUIDE.md](./TIMESCALEDB_GUIDE.md)** - 性能调优部分
2. ⚙️ **[.env.timescaledb.example](./.env.timescaledb.example)** - 环境变量配置

**配置步骤 / Configuration Steps:**
```cmd
# 1. 复制配置文件
copy .env.timescaledb.example .env

# 2. 编辑 .env 文件（填写真实配置）

# 3. 启动生产环境
docker-compose -f docker-compose.timescaledb.prod.yml --env-file .env up -d --build
```

---

## 🔧 Windows 脚本快速查找 / Windows Scripts Quick Lookup

| 想做什么 / What to Do | 运行命令 / Command |
|---------------------|-------------------|
| 启动开发环境 | `tsdb-start` |
| 停止开发环境 | `tsdb-stop` |
| 重启服务 | `tsdb-restart` |
| 查看日志 | `tsdb-logs` |
| 进入数据库 | `tsdb-db` |
| 查看统计信息 | `tsdb-info` |
| 清理所有数据 | `tsdb-clean` |

---

## 📊 TimescaleDB 核心功能速览 / TimescaleDB Core Features Overview

| 功能 / Feature | 说明 / Description | 查看文档 / Documentation |
|--------------|-------------------|------------------------|
| **超表 (Hypertables)** | 自动时间分区优化查询 | TIMESCALEDB_GUIDE.md - 功能特性 |
| **数据压缩** | 自动压缩 70%-90% 存储空间 | TIMESCALEDB_GUIDE.md - 功能特性 |
| **数据保留策略** | 自动删除过期数据 | TIMESCALEDB_GUIDE.md - 功能特性 |
| **连续聚合视图** | 预聚合统计加速查询 | TIMESCALEDB_GUIDE.md - 功能特性 |
| **实用函数** | 内置查询函数简化开发 | TIMESCALEDB_GUIDE.md - 功能特性 |
| **监控和可视化** | Grafana + Prometheus 监控 | TIMESCALEDB_GUIDE.md - 监控和可视化 |

---

## 🆘 遇到问题？/ Having Issues?

### 按问题类型查找文档 / Find Documentation by Issue Type

| 问题类型 / Issue Type | 推荐文档 / Recommended Document |
|---------------------|------------------------------|
| 不知道怎么启动 / Don't know how to start | WINDOWS_DOCKER_GUIDE.md |
| 启动失败 / Startup failed | WINDOWS_DOCKER_GUIDE.md - 故障排查 |
| 查询性能慢 / Slow query performance | TIMESCALEDB_GUIDE.md - 性能调优 |
| 数据压缩不工作 / Compression not working | TIMESCALEDB_QUICK_REFERENCE.md - 维护命令 |
| 需要迁移数据 / Need to migrate data | MIGRATION_GUIDE.md |
| 找不到命令 / Can't find command | TIMESCALEDB_QUICK_REFERENCE.md |
| 配置生产环境 / Configure production | TIMESCALEDB_GUIDE.md - 最佳实践 |

---

## 📈 文档结构关系图 / Documentation Structure Diagram

```
README_DOCKER.md (本文件 / This File)
    │
    ├─► WINDOWS_DOCKER_GUIDE.md (快速开始 / Quick Start)
    │      └─► 适合：新手 / Beginners
    │
    ├─► TIMESCALEDB_QUICK_REFERENCE.md (快速参考 / Quick Reference)
    │      └─► 适合：所有用户 / All Users
    │
    ├─► TIMESCALEDB_GUIDE.md (完整指南 / Complete Guide)
    │      ├─► 快速开始 / Quick Start
    │      ├─► 架构说明 / Architecture
    │      ├─► 功能特性 / Features
    │      ├─► Windows 脚本使用 / Windows Scripts
    │      ├─► 命令参考 / Command Reference
    │      ├─► 监控和可视化 / Monitoring
    │      ├─► 最佳实践 / Best Practices
    │      ├─► 故障排查 / Troubleshooting
    │      └─► 性能调优 / Performance Tuning
    │
    └─► MIGRATION_GUIDE.md (迁移指南 / Migration Guide)
           └─► 适合：正在迁移的用户 / Migrating Users
```

---

## 🎯 快速决策树 / Quick Decision Tree

```
你是新手？
├─ 是 → WINDOWS_DOCKER_GUIDE.md
│       └─ tsdb-start → 开始使用
│
├─ 否 → 想了解详细功能？
│       ├─ 是 → TIMESCALEDB_GUIDE.md
│       └─ 否 → 只需要快速查命令？
│               └─ 是 → TIMESCALEDB_QUICK_REFERENCE.md
│
└─ 需要迁移？
    └─ MIGRATION_GUIDE.md
```

---

## 📞 获取更多帮助 / Get More Help

### 文档顺序阅读建议 / Suggested Reading Order

**新手 / Beginners:**
1. WINDOWS_DOCKER_GUIDE.md
2. TIMESCALEDB_QUICK_REFERENCE.md

**进阶 / Advanced:**
1. TIMESCALEDB_GUIDE.md
2. TIMESCALEDB_QUICK_REFERENCE.md

**迁移 / Migrating:**
1. MIGRATION_GUIDE.md
2. TIMESCALEDB_GUIDE.md

### 在线资源 / Online Resources

- [TimescaleDB 官方文档](https://docs.timescale.com/)
- [Docker 官方文档](https://docs.docker.com/)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)

---

## ✅ 文档检查清单 / Documentation Checklist

- ✅ [WINDOWS_DOCKER_GUIDE.md](./WINDOWS_DOCKER_GUIDE.md) - Windows 快速启动指南
- ✅ [TIMESCALEDB_GUIDE.md](./TIMESCALEDB_GUIDE.md) - TimescaleDB 完整指南
- ✅ [TIMESCALEDB_QUICK_REFERENCE.md](./TIMESCALEDB_QUICK_REFERENCE.md) - 快速参考
- ✅ [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - 迁移指南
- ✅ [.env.example](./.env.example) - 环境变量示例
- ✅ [.env.timescaledb.example](./.env.timescaledb.example) - TimescaleDB 配置

---

## 📅 文档版本 / Documentation Version

| 文档 / Document | 版本 / Version | 最后更新 / Last Updated | 状态 / Status |
|---------------|---------------|----------------------|---------------|
| README_DOCKER.md | 1.0.0 | 2024-02-24 | ✅ 最新 |
| WINDOWS_DOCKER_GUIDE.md | 2.0.0 | 2024-02-24 | ✅ 最新 |
| TIMESCALEDB_GUIDE.md | 1.0.0 | 2024-02-24 | ✅ 最新 |
| TIMESCALEDB_QUICK_REFERENCE.md | 1.0.0 | 2024-02-24 | ✅ 最新 |
| MIGRATION_GUIDE.md | 1.0.0 | 2024-02-24 | ✅ 最新 |

---

## 🎉 开始使用 / Get Started

### 最快速的启动方式 / Fastest Way to Start

```cmd
# 1. 启动环境
tsdb-start

# 2. 访问监控面板
# 浏览器打开: http://localhost:3000 (admin/admin)

# 3. 查看快速参考
# 打开文件: TIMESCALEDB_QUICK_REFERENCE.md
```

---

**版本 / Version**: 1.0.0
**最后更新 / Last Updated**: 2024-02-24
