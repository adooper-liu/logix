# LogiX 脚本文件管理规范

## 分类规则

### 1. SKILL 技能脚本 (`.lingma/skills/`)

**用途**: AI 智能体专用技能、开发规范、操作指南

**存放位置**: `.lingma/skills/` 及其子目录

**示例**:
- `00-core/` - 核心技能
- `01-backend/` - 后端开发技能
- `02-frontend/` - 前端开发技能
- `03-devops/` - 运维部署技能
- `04-quality/` - 质量检查技能
- `05-domain/` - 业务领域技能

---

### 2. 临时性脚本 (`scripts/`)

**用途**: 一次性任务、临时数据修复、快速验证

**特点**:
- 执行完即可删除或归档
- 不重复使用
- 针对特定问题

**示例**:
- `analyze-return-date-logs.ps1` - 日志分析（一次性）
- `check-hmmu6232153.ps1` - 特定货柜检查（一次性）
- `verify-return-node-fix.sql` - 数据验证（一次性）

---

### 3. 可复用工具脚本 (`scripts/tools/`)

**用途**: 日常开发中重复使用的工具脚本

**特点**:
- 可重复使用
- 通用性强
- 类似 Makefile 命令的补充

**示例**:
- `dev-paradigm-check.js/ts` - 开发范式检查
- `check-skill-compliance.js` - SKILL 合规检查
- `diagnose-mapping-tables.js` - 映射表诊断

---

### 4. SQL 脚本 (`migrations/` 或 `backend/sql/`)

**用途**: 数据库结构变更、数据迁移、批量数据操作

**存放位置**:
- 结构变更：`migrations/*.sql`
- 查询脚本：`backend/sql/*.sql`
- 临时查询：`scripts/query/*.sql`

---

### 5. Shell/Bash脚本 (`scripts/`)

**用途**: Linux/Mac环境下的自动化脚本

**示例**:
- `apply-holidays-migration.sh` - 假期数据迁移
- `analyze-return-date-logs.sh` - 日志分析（Linux版）

---

## 清理策略

### 第一步：识别脚本类型

```powershell
# 列出所有脚本文件
Get-ChildItem scripts\*.* -Include *.ps1,*.js,*.ts,*.sql,*.sh | 
  Select-Object Name, Length, LastWriteTime |
  Sort-Object LastWriteTime -Descending
```

### 第二步：分类处理

| 类型 | 处理方式 | 目标位置 |
|------|----------|----------|
| SKILL 相关 | 移动到 SKILL 系统 | `.lingma/skills/` |
| 一次性脚本 | 归档到 docs-temp | `public/docs-temp/` + 说明文档 |
| 可复用工具 | 保留并整理 | `scripts/tools/` |
| SQL 脚本 | 移动到 migrations | `migrations/` 或 `backend/sql/` |
| 临时查询 | 保留在 query 子目录 | `scripts/query/` |

### 第三步：更新索引

在 `scripts/README.md` 或 `scripts/CATALOG.md` 中记录：
- 脚本名称
- 用途说明
- 执行命令
- 创建日期
- 状态（活跃/已归档）

---

## 当前 scripts 文件夹问题

### 问题 1：文档整理脚本混放

**文件**:
- `organize-docs-phase2.ps1`
- `organize-docs-phase3.ps1`
- `verify-doc-links.ps1`

**处理**: 这些是文档体系整理工具，应归档为 SKILL 或工具脚本

**建议**: 
- 作为文档管理工具 -> `scripts/tools/doc-management/`
- 或作为 SKILL 辅助脚本 -> `.lingma/skills/03-devops/doc-tools/`

### 问题 2：临时性脚本未标记

**文件**:
- `check-hmmu6232153.ps1` - 检查特定货柜（一次性）
- `verify-return-node-fix.sql` - 验证修复（一次性）

**处理**: 执行后应删除或归档到 `docs-temp/`

### 问题 3：缺少脚本文档

大部分脚本没有说明文档，不清楚用途和执行方式。

**处理**: 每个脚本应配套 `.md` 说明文档

---

## 推荐目录结构

```
scripts/
├── README.md                    # 脚本使用说明
├── CATALOG.md                   # 脚本索引
├── tools/                       # 可复用工具
│   ├── doc-management/          # 文档管理工具
│   │   ├── organize-docs.ps1
│   │   └── verify-doc-links.ps1
│   ├── dev-checks/              # 开发检查工具
│   │   ├── dev-paradigm-check.js
│   │   └── check-skill-compliance.js
│   └── diagnostics/             # 诊断工具
│       ├── diagnose-mapping-tables.js
│       └── diagnose-missing-path-nodes.sql
├── query/                       # 临时查询脚本
│   └── *.sql
├── migration/                   # 数据迁移脚本
│   └── apply-holidays-migration.sh
└── archive/                     # 已归档的一次性脚本
    ├── 2026-04-04-doc-organization/
    │   ├── organize-docs-phase2.ps1
    │   ├── organize-docs-phase3.ps1
    │   └── README.md
    └── 2026-04-01-container-check/
        └── check-hmmu6232153.ps1
```

---

## 执行清理的命令

### 1. 创建目录结构

```powershell
cd d:\Gihub\logix\scripts
New-Item -ItemType Directory -Path tools/doc-management -Force
New-Item -ItemType Directory -Path tools/dev-checks -Force
New-Item -ItemType Directory -Path tools/diagnostics -Force
New-Item -ItemType Directory -Path archive -Force
```

### 2. 移动文档管理脚本

```powershell
Move-Item organize-docs-phase2.ps1 tools/doc-management/
Move-Item organize-docs-phase3.ps1 tools/doc-management/
Move-Item verify-doc-links.ps1 tools/doc-management/
```

### 3. 移动开发检查脚本

```powershell
Move-Item dev-paradigm-check.js tools/dev-checks/
Move-Item dev-paradigm-check.ts tools/dev-checks/
Move-Item check-skill-compliance.js tools/dev-checks/
```

### 4. 移动诊断脚本

```powershell
Move-Item diagnose-mapping-tables.js tools/diagnostics/
Move-Item diagnose-missing-path-nodes.sql tools/diagnostics/
```

### 5. 归档一次性脚本

```powershell
$archivePath = "archive/$(Get-Date -Format 'yyyy-MM-dd')-cleanup"
New-Item -ItemType Directory -Path $archivePath -Force
Move-Item check-hmmu6232153.ps1 $archivePath/
Move-Item verify-return-node-fix.sql $archivePath/
```

---

## 脚本编写规范

### PowerShell 脚本 (.ps1)

```powershell
# Script: organize-docs.ps1
# Purpose: 整理文档目录结构，按 SKILL 规范归档
# Usage: .\scripts\tools\doc-management\organize-docs.ps1
# Author: 刘志高
# Created: 2026-04-04

$ErrorActionPreference = "Stop"
# ... 脚本内容
```

### JavaScript/TypeScript 脚本 (.js/.ts)

```javascript
/**
 * Script: check-skill-compliance.js
 * Purpose: 检查 SKILL 文档是否符合规范
 * Usage: node scripts/tools/dev-checks/check-skill-compliance.js
 * Author: 刘志高
 * Created: 2026-03-15
 */

// 脚本内容
```

### SQL 脚本 (.sql)

```sql
-- Script: diagnose-missing-path-nodes.sql
-- Purpose: 诊断物流路径缺失的节点
-- Usage: psql -f scripts/tools/diagnostics/diagnose-missing-path-nodes.sql
-- Author: 刘志高
-- Created: 2026-03-20
```

---

## 维护建议

1. **定期清理**: 每月检查一次 scripts 文件夹，归档一次性脚本
2. **文档先行**: 创建新脚本时先写说明文档
3. **版本控制**: 重要脚本应有版本号和变更记录
4. **测试验证**: 可复用工具脚本应包含测试用例

---

**版本**: v1.0  
**创建时间**: 2026-04-04  
**作者**: 刘志高  
**状态**: 草稿
