# LogiX 脚本工具目录

本目录包含 LogiX 项目的数据清理、初始化、迁移和诊断工具。

## 目录结构

```
scripts/
├── README.md                    # 本说明文档
├── cleanup/                     # 数据清理工具
│   ├── cleanup-test-data.sql   # SQL 清理脚本
│   └── cleanup-test-data.ps1   # PowerShell 交互工具
├── init/                       # 数据库初始化脚本
├── migration/                  # 数据库迁移脚本
├── utils/                      # 诊断和工具脚本
└── query/                      # 通用查询脚本
```

## 使用说明

### 数据清理 (cleanup/)

清理测试数据，删除所有业务数据：

```powershell
# 进入目录
cd scripts/cleanup

# 执行清理
.\cleanup-test-data.ps1

# 预览模式
.\cleanup-test-data.ps1 -DryRun
```

### 数据库初始化 (init/)

数据库表结构初始化和字典数据导入。

### 数据库迁移 (migration/)

数据库结构变更脚本，如添加索引、新增字段等。

### 诊断工具 (utils/)

常用诊断脚本：

| 文件 | 说明 |
|------|------|
| `check-db-counts.ps1` | 检查数据库表记录数 |
| `diagnose-country-filter.js` | 国家筛选诊断 |
| `check-skill-compliance.js` | SKILL 规范检查 |
| `search-backend-logs.ps1` | 后端日志搜索 |
| `view-backend-logs.ps1` | 后端日志查看 |

### 通用查询 (query/)

通用 SQL 查询脚本，用于数据检查和分析。

## 相关文档

- [数据库查询 SKILL](../../backend/.cursor/rules/logix-project-map.mdc)
- [项目数据库设计](../../backend/03_create_tables.sql)
