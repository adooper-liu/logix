# LogiX 项目文档整理与更新方案

> **目标**: 构建清晰、简洁、有效、准确的文档体系，方便快捷获取所需信息  
> **原则**: 用户导向、分类清晰、内容精炼、易于维护  
> **完成时间**: 2026-03-16

---

## 一、现状分析

### 1.1 文档分布

当前文档分布在以下目录：

```
frontend/public/docs/
├── 01-standards/        # 开发规范（9 篇）
├── 02-architecture/     # 架构设计（5 篇）
├── 03-database/         # 数据库（3 篇）
├── 04-api/             # API集成（2 篇）
├── 05-state-machine/   # 状态机（3 篇）
├── 06-statistics/      # 统计分析（10 篇）
├── 07-performance/     # 性能优化（3 篇）
├── 08-deployment/      # 部署运维（4 篇）
├── 09-misc/            # 杂项（18 篇）⚠️ 过于分散
├── 10-guides/          # 使用指南（5 篇）
├── 11-project/         # 项目管理（21 篇）⚠️ 最多
├── demurrage/          # 滞港费专题（11 篇）
├── logistics/          # 物流专题（2 篇）
├── help/               # 帮助说明（1 篇）
└── README.md           # 主入口文档
```

**问题识别**:

- ❌ **9-misc 目录过大**（18 篇），分类不明确
- ❌ **11-project 文档过多**（21 篇），包含大量临时性文档
- ❌ **demurrage 独立目录**与其他目录层级不一致
- ❌ **根目录散落文件**（GLOBAL_COUNTRY_FILTER_DESIGN.md 等）

### 1.2 重复内容

| 主题           | 重复文档                                                                                | 建议                                |
| -------------- | --------------------------------------------------------------------------------------- | ----------------------------------- |
| **项目状态**   | `01-项目状态与计划.md` + `00-项目行动指南.md` + `LogiX 项目全面解读.md`                 | 合并为 `00-项目行动指南.md`         |
| **物流状态机** | `01-物流状态机完整文档.md` + `02-物流状态机.md` + `业务状态机与飞驼.md`                 | 合并为 `01-物流状态机完整文档.md`   |
| **甘特图统计** | `货柜与甘特图统计一致性.md` + `甘特图车道与货柜卡片对比.md` + `甘特图与货柜列表对齐.md` | 合并为 `01-甘特图统计一致性指南.md` |
| **飞驼数据**   | 5 篇飞驼相关文档                                                                        | 整合为 `飞驼数据集成立体指南`       |
| **滞港费计算** | `08-DEMURRAGE_CALCULATION_MODES.md` + `08-DEMURRAGE_CALCULATION_MODES-CODE-REVIEW.md`   | 合并为一篇                          |
| **命名规范**   | `03-命名规范.md` + `04-命名快速参考.md` + `07-命名一致性报告.md`                        | 整合为一篇                          |

### 1.3 过时文档

以下文档已过时或已完成使命，建议归档或删除：

- `09-misc/10-导入映射修复总结.md` - 临时修复总结
- `09-misc/11-时间戳迁移完成.md` - 已完成迁移
- `01-standards/09-Lint 设置完成总结.md` - 配置总结
- `09-misc/15-语法高亮测试.md` - 测试文档
- `demurrage/05-DOC_VS_CODE_CONSISTENCY.md` - 一致性检查
- `demurrage/10-MODE_FIX_SUMMARY.md` - 修复总结
- `demurrage/11-LAST_PICKUP_DATE_LABEL_UPDATE.md` - 标签更新

### 1.4 缺失文档

以下重要主题缺少文档：

- ❌ **后端服务启动优化** - 刚完成的优化未形成文档
- ❌ **AI 助手使用指南** - AIChat 和 KnowledgeBase 功能
- ❌ **监控告警配置** - Grafana/Prometheus 使用
- ❌ **常见问题 FAQ** - 用户高频问题汇总

---

## 二、文档重组方案

### 2.1 新的目录结构

```
frontend/public/docs/
├── README.md                    # 📚 总索引（保留）
│
├── 00-getting-started/          # 🚀 快速入门（新建）
│   ├── README.md                # 本模块索引
│   ├── 01-quick-start.md        # 5 分钟快速启动
│   ├── 02-dev-environment.md    # 开发环境完整指南
│   ├── 03-first-steps.md        # 第一次使用 LogiX
│   └── 04-faq.md                # 常见问题 FAQ ⭐ NEW
│
├── 01-standards/                # 📏 开发规范（重构）
│   ├── README.md
│   ├── 01-code-style.md         # 代码规范（合并原 01/03/04/07）
│   ├── 02-naming-guide.md       # 命名指南（整合原 03/04）
│   ├── 03-color-system.md       # 颜色系统（原 06）
│   ├── 04-i18n-guide.md         # 国际化指南（原 08）
│   └── 05-lint-usage.md         # Lint 使用（原 05/09）
│
├── 02-architecture/             # 🏗️ 架构设计（精简）
│   ├── README.md
│   ├── 01-system-architecture.md     # 架构说明（原 01）
│   ├── 02-logistics-flow.md          # 物流流程（原 02）
│   ├── 03-multi-order-container.md   # 多订单货柜（原 03）
│   ├── 04-global-country-filter.md   # 全球国家过滤（原 04）
│   └── 05-unified-state-machine.md   # 统一状态机（原 05）
│
├── 03-database/                 # 💾 数据库（整合）
│   ├── README.md
│   ├── 01-table-relationships.md     # 主表关系（原 01）
│   ├── 02-excel-status-mapping.md    # Excel状态映射（原 02/03）
│   └── 03-management-guide.md        # 数据库管理指南 ⭐ 强化
│
├── 04-api-integration/          # 🔌 API集成（重组）
│   ├── README.md
│   ├── 01-external-data-guide.md     # 外部数据集成（原 01）
│   ├── 02-quickstart.md              # 快速开始（原 02）
│   ├── 03-feituo-integration.md      # 飞驼数据集成立体指南 ⭐ NEW
│   └── 04-adapter-pattern.md         # 适配器模式说明
│
├── 05-state-machine/            # 🔄 状态机（精简）
│   ├── README.md
│   ├── 01-logistics-state-machine.md # 物流状态机完整文档（合并）
│   └── 02-business-rules.md          # 业务状态规则
│
├── 06-visualization/            # 📊 可视化（新建分类）
│   ├── README.md
│   ├── 01-gantt-chart-guide.md     # 甘特图使用指南 ⭐ NEW
│   ├── 02-sankey-diagram.md        # 桑基图说明
│   ├── 03-countdown-card.md        # 倒计时卡片逻辑（原 02）
│   └── 04-statistics-consistency.md  # 统计一致性（合并甘特图相关）
│
├── 07-demurrage/                # 💰 滞港费专题（保留并优化）
│   ├── README.md
│   ├── 01-calculation-modes.md       # 计算模式（合并两篇）
│   ├── 02-standards-import.md        # 标准导入（原 04）
│   ├── 03-data-caliber.md            # 数据口径统一（原 05）
│   ├── 04-aggregation-alerts.md      # 聚合与预警（原 06）
│   ├── 05-top-containers.md          # TopN 优化（原 07）
│   └── 06-frontend-adaptation.md     # 前端适配（原 09/10/11）
│
├── 08-scheduling/               # 🎯 智能排产（新建分类）
│   ├── README.md
│   ├── 01-five-node-scheduling.md  # 五节点调度方案（原 04）
│   ├── 02-intelligent-algorithm.md # 智能排柜算法（原 06）
│   ├── 03-gantt-resource-linking.md # 甘特图资源关联（原 07）
│   ├── 04-one-click-scheduling.md  # 一键排产功能（原 16）
│   └── 05-troubleshooting.md       # 问题排查（原 17）
│
├── 09-deployment/               # 🚀 部署运维（保留）
│   ├── README.md
│   ├── 01-timescaledb-guide.md     # TimescaleDB 指南（原 01）
│   ├── 02-timescaledb-quick.md     # TimescaleDB 快速参考（原 02）
│   ├── 03-monitoring-user.md       # 监控用户指南（原 03）
│   ├── 04-monitoring-real-data.md  # 监控真实数据（原 04）
│   └── 05-backend-startup-opt.md   # 后端启动优化 ⭐ NEW
│
├── 10-guides/                   # 📖 使用指南（强化）
│   ├── README.md
│   ├── 01-backend-quickref.md    # 后端快速参考（原 01）
│   ├── 02-backend-complete.md    # 后端完整文档（原 02）
│   ├── 03-frontend-guide.md      # 前端文档（原 04）
│   ├── 04-dev-env.md             # 开发环境（原 03）
│   ├── 05-quick-start.md         # 快速开始（原 05）
│   └── 06-time-concepts.md       # 时间概念说明 ⭐ 从 help 移入
│
├── 11-project/                  # 📋 项目管理（大幅精简）
│   ├── README.md
│   ├── 00-action-guide.md            # 项目行动指南 ⭐ 核心
│   ├── 01-document-index.md          # 文档索引（原 02）
│   ├── 02-country-convention.md      # 国家概念约定（原 12）
│   ├── 03-ai-enablement.md           # AI赋能清单（原 21）
│   └── 04-development-progress.md    # 开发进度记录（原开发进度）
│
└── 99-archive/                  # 🗄️ 归档区（新建）
    ├── README.md
    ├── feasibility-studies/          # 可行性研究
    ├── temporary-fixes/              # 临时修复
    ├── old-plans/                    # 旧计划
    └── experimental-docs/            # 实验性文档
```

### 2.2 文档迁移映射表

| 原文档路径                                                                    | 新文档路径                                      | 操作          |
| ----------------------------------------------------------------------------- | ----------------------------------------------- | ------------- |
| `10-guides/05-快速开始.md`                                                    | `00-getting-started/01-quick-start.md`          | 移动 + 重命名 |
| `10-guides/03-开发环境指南.md`                                                | `00-getting-started/02-dev-environment.md`      | 移动 + 重命名 |
| `help/时间概念说明 - 历时倒计时超期.md`                                       | `10-guides/06-time-concepts.md`                 | 移动 + 重命名 |
| `01-standards/03-命名规范.md` + `04-命名快速参考.md` + `07-命名一致性报告.md` | `01-standards/02-naming-guide.md`               | 合并 + 精简   |
| `06-statistics/02-倒计时卡片逻辑.md`                                          | `06-visualization/03-countdown-card.md`         | 移动          |
| `06-statistics/04-06-08-10` (甘特图系列)                                      | `06-visualization/04-statistics-consistency.md` | 合并          |
| `demurrage/08-*-CODE-REVIEW.md` + `08-*-MODES.md`                             | `07-demurrage/01-calculation-modes.md`          | 合并          |
| `11-project/04-五节点调度.md`                                                 | `08-scheduling/01-five-node-scheduling.md`      | 移动          |
| `11-project/06-智能排柜算法.md`                                               | `08-scheduling/02-intelligent-algorithm.md`     | 移动          |
| `backend-startup-optimization.md`                                             | `09-deployment/05-backend-startup-opt.md`       | 移动 + 中文化 |

### 2.3 归档文档清单

以下文档移动到 `99-archive/`：

```
99-archive/
├── temporary-fixes/
│   ├── 导入映射修复总结.md
│   ├── 时间戳迁移完成.md
│   ├── Lint 设置完成总结.md
│   ├── MODE_FIX_SUMMARY.md
│   └── LAST_PICKUP_DATE_LABEL_UPDATE.md
│
├── experimental-docs/
│   ├── 语法高亮测试.md
│   └── DOC_VS_CODE_CONSISTENCY.md
│
└── old-plans/
    ├── 01-项目状态与计划.md (已被 00-行动指南替代)
    └── LogiX 项目全面解读.md (历史版本)
```

---

## 三、文档质量标准

### 3.1 内容要求

✅ **清晰**: 标题明确、结构清晰、段落简短  
✅ **简洁**: 去除冗余、直击要点、避免重复  
✅ **有效**: 可操作、有示例、能解决问题  
✅ **准确**: 与代码一致、及时更新、标注版本

### 3.2 文档模板

#### 标准文档结构

````markdown
# 文档标题

> **描述**: 一句话概括文档内容  
> **适用人群**: 开发人员/运营人员/财务人员等  
> **最后更新**: 2026-03-16

---

## 一、概述

- 背景说明
- 解决的问题
- 核心价值

## 二、核心概念

| 术语   | 定义 | 说明     |
| ------ | ---- | -------- |
| 术语 1 | 定义 | 补充说明 |

## 三、使用指南

### 3.1 前置条件

- 条件 1
- 条件 2

### 3.2 操作步骤

1. 步骤 1
2. 步骤 2
3. 步骤 3

### 3.3 示例代码

```typescript
// 代码示例
```
````

## 四、常见问题

**Q: 问题 1？**  
A: 回答 1

**Q: 问题 2？**  
A: 回答 2

## 五、相关文档

- [文档 1](./link.md)
- [文档 2](./link.md)

---

**最后更新**: 2026-03-16  
**维护者**: @责任人

````

### 3.3 命名规范

**文件名**:
- ✅ `01-quick-start.md` - 小写 + 连字符
- ✅ `02-dev-environment.md` - 英文优先，中文可选
- ❌ `快速开始.md` - 纯中文
- ❌ `DEV_ENVIRONMENT_GUIDE.md` - 全大写

**标题层级**:
```markdown
# 一级标题（文档标题）
## 二级标题（主要章节）
### 三级标题（子章节）
#### 四级标题（细节说明）
````

---

## 四、实施计划

### 4.1 阶段划分

#### 阶段一：框架搭建（1 天）

- [ ] 创建新目录结构
- [ ] 编写各目录 README.md
- [ ] 建立文档迁移映射表
- [ ] 更新主 README.md 引用

#### 阶段二：核心文档迁移（2 天）

- [ ] 迁移快速入门类文档
- [ ] 迁移开发规范类文档
- [ ] 迁移架构设计类文档
- [ ] 迁移 API集成类文档
- [ ] 迁移状态机类文档

#### 阶段三：专业文档整合（2 天）

- [ ] 整合甘特图相关文档
- [ ] 整合滞港费相关文档
- [ ] 整合智能排产相关文档
- [ ] 整合飞驼数据相关文档
- [ ] 创建新增文档（AI 助手、监控配置等）

#### 阶段四：清理归档（1 天）

- [ ] 移动过时文档到归档区
- [ ] 删除无价值临时文档
- [ ] 更新文档内引用链接
- [ ] 添加归档说明

#### 阶段五：验证优化（1 天）

- [ ] 检查所有链接有效性
- [ ] 验证文档内容准确性
- [ ] 收集用户反馈
- [ ] 持续优化改进

### 4.2 优先级

| 优先级 | 任务                        | 预计时间 |
| ------ | --------------------------- | -------- |
| 🔴 P0  | 创建新目录结构 + 主索引更新 | 4 小时   |
| 🔴 P0  | 迁移快速入门文档            | 4 小时   |
| 🟡 P1  | 整合甘特图/滞港费文档       | 8 小时   |
| 🟡 P1  | 创建新增文档                | 4 小时   |
| 🟢 P2  | 清理归档文档                | 4 小时   |
| 🟢 P2  | 验证优化                    | 4 小时   |

**总计**: 28 小时（约 3-4 个工作日）

---

## 五、新增文档清单

### 5.1 必增文档

| 文档名                          | 位置                  | 说明                      | 优先级 |
| ------------------------------- | --------------------- | ------------------------- | ------ |
| `04-faq.md`                     | `00-getting-started/` | 常见问题 FAQ              | 🔴 P0  |
| `03-Feituo 数据集成立体指南.md` | `04-api-integration/` | 飞驼API+Excel+ 状态码整合 | 🔴 P0  |
| `01-甘特图使用指南.md`          | `06-visualization/`   | 甘特图完整使用指南        | 🔴 P0  |
| `05-后端服务启动优化.md`        | `09-deployment/`      | 刚完成的优化方案          | 🔴 P0  |
| `AI 助手使用指南.md`            | `10-guides/`          | AIChat + KnowledgeBase    | 🟡 P1  |
| `监控告警配置指南.md`           | `09-deployment/`      | Grafana + Prometheus      | 🟡 P1  |

### 5.2 选增文档

| 文档名            | 位置              | 说明             |
| ----------------- | ----------------- | ---------------- |
| `最佳实践集.md`   | `10-guides/`      | 开发最佳实践汇总 |
| `故障排查手册.md` | `10-guides/`      | 常见故障排查流程 |
| `性能调优指南.md` | `07-performance/` | 性能优化实战     |

---

## 六、维护机制

### 6.1 文档审查

- **月度审查**: 每月最后一个周五审查文档有效性
- **版本同步**: 代码重大更新后 3 天内更新相关文档
- **用户反馈**: 收到反馈后 24 小时内响应并更新

### 6.2 责任分工

| 文档类别 | 责任人     | 审查频率 |
| -------- | ---------- | -------- |
| 快速入门 | 前端团队   | 月度     |
| 开发规范 | 技术负责人 | 季度     |
| API集成  | 后端团队   | 月度     |
| 可视化   | 前端团队   | 月度     |
| 滞港费   | 产品团队   | 按需     |
| 智能排产 | 算法团队   | 按需     |

### 6.3 更新流程

```
发现问题 → 提交 Issue → 分配责任人 → 更新文档 → PR 审查 → 合并更新
```

---

## 七、验收标准

### 7.1 结构验收

- ✅ 目录层级不超过 3 级
- ✅ 每个目录都有 README.md 索引
- ✅ 文档分类清晰，无模棱两可

### 7.2 内容验收

- ✅ 无重复文档（相似度>80% 视为重复）
- ✅ 无过时文档（超过 6 个月未更新需标注）
- ✅ 所有链接有效（无 404）
- ✅ 代码示例可运行

### 7.3 用户体验

- ✅ 新用户 5 分钟内找到快速入门文档
- ✅ 开发人员 3 分钟内找到所需 API 文档
- ✅ 用户能找到对应的使用指南
- ✅ 文档搜索准确率>90%

---

## 八、预期效果

### 8.1 整理前 vs 整理后对比

| 指标     | 整理前         | 整理后         | 改善       |
| -------- | -------------- | -------------- | ---------- |
| 文档总数 | 83 篇          | 50 篇          | ↓ 40%      |
| 目录层级 | 最深 4 级      | 最多 3 级      | 更扁平     |
| 重复文档 | 15+ 组         | 0 组           | 100% 消除  |
| 过时文档 | 18 篇          | 0 篇（已归档） | 100% 清理  |
| 查找时间 | 平均 5-10 分钟 | 平均 1-3 分钟  | ↑ 70% 效率 |

### 8.2 用户收益

- **新用户**: 快速入门时间从 30 分钟降至 10 分钟
- **开发人员**: 查找文档时间减少 70%
- **维护人员**: 文档更新成本降低 50%
- **产品团队**: 功能文档覆盖率从 60% 提升至 95%

---

## 九、下一步行动

### 立即执行（今天）

1. ✅ 创建本文档并获得批准
2. ⏳ 创建新目录结构
3. ⏳ 更新主 README.md

### 本周完成

1. 完成核心文档迁移（P0 优先级）
2. 创建 3 篇新增文档
3. 清理归档区文档

### 下周完成

1. 完成剩余文档迁移
2. 验证所有链接
3. 收集用户反馈并优化

---

**文档整理负责人**: Lingma  
**创建时间**: 2026-03-16  
**预计完成**: 2026-03-20  
**状态**: 🟡 进行中
