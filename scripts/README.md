# LogiX Scripts 目录说明

本目录包含项目开发和运维过程中使用的各种脚本工具。

## 目录结构

```
scripts/
├── tools/                       # 可复用工具脚本
│   ├── doc-management/          # 文档管理工具
│   │   ├── organize-docs-phase2.ps1    - 文档整理第二阶段
│   │   ├── organize-docs-phase3.ps1    - 文档整理第三阶段
│   │   └── verify-doc-links.ps1        - 文档链接验证
│   ├── dev-checks/              # 开发检查工具
│   │   ├── dev-paradigm-check.js       - 开发范式检查 (JS 版)
│   │   ├── dev-paradigm-check.ts       - 开发范式检查 (TS 版)
│   │   └── check-skill-compliance.js   - SKILL 合规检查
│   └── diagnostics/             # 诊断工具
│       ├── diagnose-mapping-tables.js  - 映射表诊断
│       └── diagnose-missing-path-nodes.sql - 路径节点诊断
├── query/                       # 临时 SQL 查询脚本
├── migration/                   # 数据迁移脚本
│   └── apply-holidays-migration.sh
├── archive/                     # 已归档的一次性脚本
│   └── 2026-04-04-doc-organization/   - 文档整理归档
└── *.ps1, *.js, *.sql, *.sh     - 其他脚本文件
```

## 快速开始

### 文档管理工具

```powershell
# 验证文档链接有效性
.\scripts\tools\doc-management\verify-doc-links.ps1

# 整理文档目录结构（第二阶段）
.\scripts\tools\doc-management\organize-docs-phase2.ps1

# 整理文档目录结构（第三阶段）
.\scripts\tools\doc-management\organize-docs-phase3.ps1
```

### 开发检查工具

```bash
# 开发范式检查
node scripts/tools/dev-checks/dev-paradigm-check.js

# SKILL 合规检查
node scripts/tools/dev-checks/check-skill-compliance.js
```

### 诊断工具

```bash
# 映射表诊断
node scripts/tools/diagnostics/diagnose-mapping-tables.js

# 路径节点诊断（PostgreSQL）
psql -U postgres -d logix -f scripts/tools/diagnostics/diagnose-missing-path-nodes.sql
```

## 脚本分类

| 类型 | 用途 | 示例 |
|------|------|------|
| **工具脚本** | 可重复使用的开发工具 | `verify-doc-links.ps1` |
| **查询脚本** | 临时数据库查询 | `query/*.sql` |
| **迁移脚本** | 数据迁移、结构变更 | `apply-holidays-migration.sh` |
| **归档脚本** | 一次性任务，已归档 | `archive/` |

## 使用规范

### PowerShell 脚本

```powershell
# Script: verify-doc-links.ps1
# Purpose: 验证 DOCS_INDEX.md 中的文档链接是否有效
# Usage: .\scripts\tools\doc-management\verify-doc-links.ps1
# Author: 刘志高
# Created: 2026-04-04

$ErrorActionPreference = "Stop"
# ... 脚本内容
```

### JavaScript/TypeScript 脚本

```javascript
/**
 * Script: check-skill-compliance.js
 * Purpose: 检查 SKILL 文档是否符合规范
 * Usage: node scripts/tools/dev-checks/check-skill-compliance.js
 * Author: 刘志高
 * Created: 2026-03-15
 */
```

### SQL 脚本

```sql
-- Script: diagnose-missing-path-nodes.sql
-- Purpose: 诊断物流路径缺失的节点
-- Usage: psql -f scripts/tools/diagnostics/diagnose-missing-path-nodes.sql
-- Author: 刘志高
-- Created: 2026-03-20
```

## 维护指南

1. **新脚本创建**: 
   - 优先放入 `tools/` 对应子目录
   - 添加文件头注释（Purpose, Usage, Author, Created）
   
2. **一次性脚本**:
   - 执行后归档到 `archive/日期 - 描述/`
   - 保留说明文档

3. **定期清理**:
   - 每月检查一次 `archive/` 目录
   - 删除不再需要的归档脚本

## 相关文档

- [脚本管理规范](SCRIPT_MANAGEMENT_GUIDE.md)
- [SKILL 系统文档](../.lingma/skills/INDEX.md)
- [项目文档索引](../frontend/public/docs/DOCS_INDEX.md)

---

**版本**: v1.0  
**创建时间**: 2026-04-04  
**作者**: 刘志高  
**最后更新**: 2026-04-04
