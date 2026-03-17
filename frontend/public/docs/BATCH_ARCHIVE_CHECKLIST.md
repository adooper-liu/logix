# 🗄️ 批量文档归档执行清单

> **执行日期**: 2026-03-16  
> **执行人**: Lingma  
> **状态**: 🟡 进行中

---

## 已完成归档

### ✅ 命名规范系列（3 篇→1 篇）

**新文档**: [`01-standards/02-naming-guide.md`](./01-standards/02-naming-guide.md)

**已标记归档**:

- `01-standards/03-命名规范.md` → 添加归档提示
- `01-standards/04-命名快速参考.md` → 添加归档提示
- `01-standards/07-命名一致性报告.md` → 添加归档提示

**归档标记文件**: `01-standards/ARCHIVED_NAMING_DOCS.md` ✅

---

### ✅ 滞港费计算模式（2 篇→1 篇）

**新文档**: [`demurrage/01-calculation-modes-complete.md`](./demurrage/01-calculation-modes-complete.md)

**已标记归档**:

- `demurrage/08-DEMURRAGE_CALCULATION_MODES.md` → 添加归档提示
- `demurrage/08-DEMURRAGE_CALCULATION_MODES-CODE-REVIEW.md` → 添加归档提示

**归档标记文件**: `demurrage/ARCHIVED_CALC_MODES.md` ✅

---

### ✅ 甘特图统计系列（5 篇待整合）

**归档标记文件**: `06-statistics/ARCHIVED_GANTT_DOCS.md` ✅

**待创建新文档**: 《甘特图使用指南》（预计 2026-03-18）

---

## 待物理移动的文档

以下文档需要在文件系统中移动到 `99-archive/` 目录：

### 临时修复类（6 篇）

```bash
# 需要执行的移动命令（Windows PowerShell）

Move-Item -Path "09-misc/10-导入映射修复总结.md" -Destination "99-archive/temporary-fixes/"
Move-Item -Path "09-misc/11-时间戳迁移完成.md" -Destination "99-archive/temporary-fixes/"
Move-Item -Path "demurrage/10-MODE_FIX_SUMMARY.md" -Destination "99-archive/temporary-fixes/"
Move-Item -Path "demurrage/11-LAST_PICKUP_DATE_LABEL_UPDATE.md" -Destination "99-archive/temporary-fixes/"
```

### 旧计划方案类（2 篇）

```bash
# 需要执行的移动命令

Move-Item -Path "11-project/01-项目状态与计划.md" -Destination "99-archive/old-plans/"
Move-Item -Path "11-project/LogiX 项目全面解读.md" -Destination "99-archive/old-plans/"
```

### 实验性文档（1 篇）

```bash
# 需要执行的移动命令

Move-Item -Path "09-misc/15-语法高亮测试.md" -Destination "99-archive/experimental-docs/"
```

---

## 待整合的文档组

### 🔴 P0 - 滞港费前端适配（3 篇→1 篇）

**原文档**:

- `demurrage/09-FRONTEND_MODE_ADAPTATION.md`
- `demurrage/10-MODE_FIX_SUMMARY.md` (待移动)
- `demurrage/11-LAST_PICKUP_DATE_LABEL_UPDATE.md` (待移动)

**新文档规划**: `demurrage/06-frontend-adaptation-complete.md`

**章节**:

1. 前端显示模式适配
2. 计算来源标注
3. 标签更新说明
4. 常见问题

---

### 🔴 P0 - 飞驼数据集成（5 篇→1 篇）

**原文档**:

- `11-project/09-飞驼节点状态码解读与接入整合方案.md`
- `11-project/10-飞驼数据Excel导入打通指南.md`
- `11-project/11-logistics-path与飞驼API集成实施计划.md`
- `11-project/12-飞驼数据接入方式解读.md`
- `11-project/15-飞驼数据对接说明与验证.md`

**新文档规划**: `04-api-integration/03-feituo-integration-complete.md`

**章节**:

1. 飞驼API 业务概述
2. 节点状态码解读
3. Excel导入指南
4. API集成实施计划
5. 数据映射表
6. 验证与测试

---

### 🟡 P1 - 杂项文档清理

**保留并优化**:

- `09-misc/14-货柜页面逻辑与故障排除.md` → 保留，优化后移到 `10-guides/`
- `09-misc/18-Excel 列名与导入映射对照.md` → 保留，整合到 Excel导入指南

**待删除**（无价值）:

- 无（所有文档都有保留价值）

---

## 执行进度

| 类别     | 已完成 | 待处理 | 进度 |
| -------- | ------ | ------ | ---- |
| 文档整合 | 2 组   | 2 组   | 50%  |
| 归档标记 | 3 个   | 0 个   | 100% |
| 物理移动 | 0 篇   | 9 篇   | 0%   |
| 索引更新 | 1 个   | 0 个   | 100% |

**总体进度**: ████░░░░ 40%

---

## 下一步行动

### 立即执行（今天）

1. ✅ 完成滞港费计算模式整合
2. ⏳ 完成滞港费前端适配整合（30 分钟）
3. ⏳ 完成飞驼数据集成立体指南（1 小时）
4. ⏳ 执行物理移动命令（PowerShell 脚本）

### 明天完成

1. 甘特图使用指南创建
2. 验证所有链接有效性
3. 更新主 README 引用

---

**最后更新**: 2026-03-16  
**下次检查**: 每小时更新进度
