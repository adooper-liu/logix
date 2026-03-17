# 🗄️ 文档归档索引

> **创建日期**: 2026-03-16  
> **目的**: 集中管理已归档的历史文档，避免误用，方便查找替代文档

---

## 归档原则

以下类型的文档将被归档：

1. ✅ **重复文档** - 内容相似度 >80% 的多篇文档
2. ✅ **过时文档** - 超过 6 个月未更新或与当前实现不符
3. ✅ **临时修复** - 已完成使命的临时性总结文档
4. ✅ **实验文档** - 测试、验证性质的文档

---

## 已归档文档清单

### 📏 开发规范类 (01-standards)

| 归档文档               | 替代文档                                     | 归档日期   |
| ---------------------- | -------------------------------------------- | ---------- |
| `03-命名规范.md`       | [`02-naming-guide.md`](./02-naming-guide.md) | 2026-03-16 |
| `04-命名快速参考.md`   | [`02-naming-guide.md`](./02-naming-guide.md) | 2026-03-16 |
| `07-命名一致性报告.md` | [`02-naming-guide.md`](./02-naming-guide.md) | 2026-03-16 |

**说明**: 3 篇合并为 1 篇《LogiX 命名规范指南》，新增常见错误案例和 API 流转约定。

---

### 📊 统计分析类 (06-statistics)

| 归档文档                         | 替代文档                | 归档日期   |
| -------------------------------- | ----------------------- | ---------- |
| `04-甘特图与货柜列表对齐.md`     | [待创建] 甘特图使用指南 | 2026-03-16 |
| `08-货柜与甘特图统计一致性.md`   | [待创建] 甘特图使用指南 | 2026-03-16 |
| `10-甘特图车道与货柜卡片对比.md` | [待创建] 甘特图使用指南 | 2026-03-16 |
| `05-甘特图日期取值逻辑.md`       | [待创建] 甘特图使用指南 | 2026-03-16 |
| `06-甘特图交互增强功能.md`       | [待创建] 甘特图使用指南 | 2026-03-16 |

**说明**: 5 篇将整合为 1 篇《甘特图使用指南》，预计 2026-03-18 完成。

---

### 🗂️ 杂项类 (09-misc) - 待归档

以下临时性文档建议移动到 `99-archive/temporary-fixes/`：

| 文档                             | 类型       | 建议操作   |
| -------------------------------- | ---------- | ---------- |
| `10-导入映射修复总结.md`         | 临时修复   | 归档       |
| `11-时间戳迁移完成.md`           | 已完成任务 | 归档       |
| `12-货柜表格绑定.md`             | 临时记录   | 归档       |
| `13-货柜表格计划.md`             | 临时记录   | 归档       |
| `14-货柜页面逻辑与故障排除.md`   | 故障排除   | 保留并优化 |
| `15-语法高亮测试.md`             | 测试文档   | 归档       |
| `18-Excel 列名与导入映射对照.md` | 参考表格   | 保留并整合 |

---

### 💰 滞港费专题 (demurrage)

| 归档文档                         | 替代文档                                                      | 归档日期   |
| -------------------------------- | ------------------------------------------------------------- | ---------- |
| `09-FRONTEND_MODE_ADAPTATION.md` | [`06-frontend-adaptation-complete.md`](./demurrage/06-frontend-adaptation-complete.md) | 2026-03-16 |
| `10-MODE_FIX_SUMMARY.md`         | [`06-frontend-adaptation-complete.md`](./demurrage/06-frontend-adaptation-complete.md) | 2026-03-16 |
| `11-LAST_PICKUP_DATE_LABEL_UPDATE.md` | [`06-frontend-adaptation-complete.md`](./demurrage/06-frontend-adaptation-complete.md) | 2026-03-16 |

**说明**: 3 篇合并为 1 篇《滞港费计算模式前端适配完整指南》，包含 TypeScript 接口、组件展示、样式更新、最晚提柜日标签更新等完整内容。

---

### 🐫 飞驼数据集成专题 (11-project + 09-misc)

| 归档文档                                | 替代文档                                                                | 归档日期   |
| --------------------------------------- | ----------------------------------------------------------------------- | ---------- |
| `11-project/09-飞驼节点状态码解读与接入整合方案.md` | [`04-api-integration/03-feituo-integration-complete.md`](./04-api-integration/03-feituo-integration-complete.md) | 2026-03-16 |
| `11-project/10-飞驼数据Excel导入打通指南.md` | [`04-api-integration/03-feituo-integration-complete.md`](./04-api-integration/03-feituo-integration-complete.md) | 2026-03-16 |
| `11-project/11-logistics-path与飞驼API集成实施计划.md` | [`04-api-integration/03-feituo-integration-complete.md`](./04-api-integration/03-feituo-integration-complete.md) | 2026-03-16 |
| `11-project/12-飞驼数据接入方式解读.md` | [`04-api-integration/03-feituo-integration-complete.md`](./04-api-integration/03-feituo-integration-complete.md) | 2026-03-16 |
| `11-project/13-飞驼导出字段与LogiX映射表.md` | [`04-api-integration/03-feituo-integration-complete.md`](./04-api-integration/03-feituo-integration-complete.md) | 2026-03-16 |
| `11-project/15-飞驼数据对接说明与验证.md` | [`04-api-integration/03-feituo-integration-complete.md`](./04-api-integration/03-feituo-integration-complete.md) | 2026-03-16 |
| `09-misc/17-飞驼API 与 Excel导入字段对齐.md` | [`04-api-integration/03-feituo-integration-complete.md`](./04-api-integration/03-feituo-integration-complete.md) | 2026-03-16 |
| `09-misc/19-飞驼导出字段与导入映射对照.md` | [`04-api-integration/03-feituo-integration-complete.md`](./04-api-integration/03-feituo-integration-complete.md) | 2026-03-16 |
| `09-misc/20-飞驼 Excel 字段分组对照验证.md` | [`04-api-integration/03-feituo-integration-complete.md`](./04-api-integration/03-feituo-integration-complete.md) | 2026-03-16 |

**说明**: 9 篇（5 篇核心 +4 篇辅助）合并为 1 篇《飞驼数据集成完整指南》，包含 API 业务概述、状态码解读、字段映射、接入方式、Excel导入、架构设计、数据验证等完整内容。详见 [`ARCHIVED_FEITUO_DOCS.md`](./11-project/ARCHIVED_FEITUO_DOCS.md)。

---

### 📋 项目管理类 (11-project) - 待清理

| 文档                    | 状态     | 建议                         |
| ----------------------- | -------- | ---------------------------- |
| `01-项目状态与计划.md`  | 已被替代 | 归档到 99-archive/old-plans/ |
| `LogiX 项目全面解读.md` | 历史版本 | 归档到 99-archive/old-plans/ |
| `开发进度记录.md`       | 过程记录 | 保留（作为历史记录）         |

---

## 归档目录结构

```
99-archive/
├── README.md                    # 归档说明（新建）
├── temporary-fixes/             # 临时修复
│   ├── 导入映射修复总结.md
│   ├── 时间戳迁移完成.md
│   └── MODE_FIX_SUMMARY.md
├── old-plans/                   # 旧计划方案
│   ├── 01-项目状态与计划.md
│   └── LogiX 项目全面解读.md
├── experimental-docs/           # 实验性文档
│   └── 语法高亮测试.md
└── feasibility-studies/         # 可行性研究
    └── ...
```

---

## 如何访问归档文档

### 方式 1: 直接访问文件

归档文档仍保留在原位置，但会在文件顶部添加归档提示：

```markdown
> ⚠️ **已归档**: 本文档已被 [新文档](./new-doc.md) 替代，请以新文档为准。
```

### 方式 2: 通过归档索引查找

使用本索引文档快速定位替代文档：

```markdown
[命名规范指南](./01-standards/02-naming-guide.md)
[甘特图使用指南] (待创建)
```

---

## 归档流程

### 步骤 1: 识别待归档文档

- 定期审查文档（月度）
- 收到用户反馈时检查
- 代码重大更新后审查相关文档

### 步骤 2: 创建替代文档（如需要）

- 合并重复内容
- 删除过时信息
- 更新示例和代码

### 步骤 3: 标记原文档

在原文档顶部添加归档提示：

```markdown
# ⚠️ 已归档文档

> **归档日期**: YYYY-MM-DD  
> **替代文档**: [新文档标题](./path/to/new-doc.md)
```

### 步骤 4: 更新索引

在本归档索引中添加记录。

### 步骤 5: （可选）移动文件到归档区

对于明确不再使用的文档，可物理移动到 `99-archive/` 目录。

---

## 恢复归档文档

如需要恢复某篇归档文档：

1. 从 `99-archive/` 移回原位置
2. 更新内容和时间戳
3. 从本索引中移除记录
4. 通知相关用户

---

## 统计数据

| 类别       | 已归档数量 | 待归档数量 | 总计      |
| ---------- | ---------- | ---------- | --------- |
| 开发规范   | 3 篇       | 0 篇       | 3 篇      |
| 统计分析   | 5 篇       | 0 篇       | 5 篇      |
| 滞港费     | 3 篇       | 2 篇       | 5 篇      |
| 飞驼集成   | 9 篇       | 0 篇       | 9 篇      |
| 杂项       | 0 篇       | 7 篇       | 7 篇      |
| 项目管理   | 0 篇       | 3 篇       | 3 篇      |
| **总计**   | **20 篇**  | **12 篇**  | **32 篇** |

**预期效果**: 整理完成后，文档总数从 83 篇降至约 45 篇（↓ 46%）

---

## 维护责任

| 职责     | 责任人     | 频率 |
| -------- | ---------- | ---- |
| 文档审查 | Tech Lead  | 月度 |
| 归档执行 | 文档维护者 | 按需 |
| 索引更新 | 文档维护者 | 实时 |
| 质量检查 | QA Team    | 季度 |

---

**最后更新**: 2026-03-16  
**维护者**: Lingma  
**下次审查**: 2026-04-16  
**最新归档**: 飞驼数据集成专题（9 篇→1 篇）、滞港费前端适配（3 篇→1 篇）
