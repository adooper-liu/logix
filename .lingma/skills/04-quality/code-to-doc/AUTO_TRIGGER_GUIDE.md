# Code-to-Doc 技能自动触发指南

## 🎯 目标

让你**完全忘记 Skill 名称**，AI 会自动识别场景并调用 `code-to-doc` 技能。

---

## ⚡ 自动触发规则

### 规则说明

根据 `.lingma/rules/ai-auto-skill-trigger.mdc` **规则 4**：

当用户提到以下关键词时，AI **必须自动调用** `code-to-doc` 技能：

- "分析...计算逻辑"
- "生成文档"
- "场景模拟"
- "这个模块是怎么计算的？"
- 打开 Service 文件并要求解释

---

## 💬 典型触发语句

### ✅ 正确说法（AI 会自动调用）

**直接请求分析**：

```
帮我分析 demurrage.service.ts 的计算逻辑
生成一份场景模拟文档
这个模块是怎么计算费用的？
我想了解 intelligentScheduling.service.ts 的排产逻辑
用 code-to-doc 技能分析成本优化模块
```

**打开文件后请求**：

```
[打开 backend/src/services/demurrage.service.ts]
这个文件里的计算逻辑能帮我整理成文档吗？
```

**询问具体场景**：

```
滞港费是怎么计算的？能生成文档说明吗？
智能排柜的 5 个计划日期是怎么算出来的？
状态机的优先级判断逻辑是什么？
```

### ❌ 错误说法（AI 可能不理解）

```
给我写个文档
解释一下这个代码
这个怎么用？
```

---

## 📋 AI 的执行流程

当你触发规则后，AI 会自动执行以下步骤：

### 步骤 1：识别目标模块

AI 会识别你要分析的模块类型：

| 模块类型 | 典型文件                             | 计算特征            |
| -------- | ------------------------------------ | ------------------- |
| 费用计算 | `demurrage.service.ts`               | 日期差值 × 费率     |
| 智能排柜 | `intelligentScheduling.service.ts`   | 5 个计划日期链      |
| 成本优化 | `schedulingCostOptimizer.service.ts` | 多方案对比选优      |
| 状态机   | `calculateLogisticsStatus.ts`        | 7 层优先级判断      |
| 统计分析 | `*statistics.service.ts`             | GROUP BY + 聚合函数 |

### 步骤 2：读取源代码

AI 会自动读取：

1. **Service 层**：`backend/src/services/*.service.ts`
2. **工具函数**：`backend/src/utils/*.ts`
3. **实体定义**：`backend/src/entities/*.ts`
4. **数据库表**：`backend/03_create_tables.sql`

### 步骤 3：提取计算逻辑

AI 会提取：

- [ ] 核心计算公式
- [ ] 输入参数来源
- [ ] 输出结果去向
- [ ] 条件分支逻辑
- [ ] 边界条件处理

### 步骤 4：设计场景矩阵

AI 会设计覆盖以下维度的场景：

| 维度     | 最少场景数 | 示例            |
| -------- | ---------- | --------------- |
| 正常流程 | 1          | 免费期内提柜    |
| 边界条件 | 1          | 刚好第 7 天提柜 |
| 异常情况 | 1          | 已超期未提柜    |

### 步骤 5：手工验算

AI 会对每个场景进行手工计算验证：

```
场景参数:
- ATA: 2026-02-01
- 免费天数：7 天
- 提柜日：2026-02-10

手工计算:
1. lastFreeDate = 2026-02-01 + 7 - 1 = 2026-02-07
2. endDate = 2026-02-10
3. chargeDays = 2026-02-10 - 2026-02-07 - 1 = 2 天
4. 费用 = 2 × $100 = $200

验证通过 ✅
```

### 步骤 6：生成文档

AI 会生成标准格式的 Markdown 文档，包含：

- ✅ 核心计算公式
- ✅ 关键参数表（注明数据库来源）
- ✅ 至少 3 个场景模拟（含详细计算过程）
- ✅ 对比表格（如存在多模式）
- ✅ 权威源代码引用

---

## 🎯 实际案例

### 案例 1：滞港费计算分析

**你说**：

```
帮我分析 demurrage.service.ts 的计算逻辑，生成场景模拟文档
```

**AI 应该**：

1. [自动调用 code-to-doc]
2. [读取 backend/src/services/demurrage.service.ts]
3. [提取核心计算公式]
4. [设计 3-5 个典型场景]
5. [手工验算每个场景]
6. [生成标准格式的 Markdown 文档]

**预期输出**：

```markdown
# 滞港费计算场景模拟

## 一、文档概述

本文档详细说明 LogiX 系统中滞港费的计算逻辑...

## 二、核心计算逻辑

### 2.1 核心公式

费用 = chargeDays × ratePerDay

### 2.2 关键参数表

| 参数      | 说明     | 来源                               |
| --------- | -------- | ---------------------------------- |
| startDate | 起始日期 | process_sea_freight.ata_dest_port  |
| freeDays  | 免费天数 | dict_demurrage_standards.free_days |

## 三、场景模拟

### 场景 1: 免费期内提柜

**参数**:

- ATA: 2026-02-01
- 免费天数：7 天
  ...
```

---

### 案例 2：智能排柜日期计算

**你说**：

```
我想了解 intelligentScheduling.service.ts 的 5 个计划日期是怎么计算的
```

**AI 应该**：

1. [自动调用 code-to-doc]
2. [读取源代码]
3. [分析日期链依赖关系]
4. [设计产能充足和不足两种场景]
5. [生成带流程图的文档]

**预期输出**：

```markdown
# 智能排柜日期计算场景模拟

## 一、文档概述

本文档说明智能排柜系统中 5 个计划日期的计算逻辑...

## 二、核心计算逻辑

### 2.1 日期链依赖关系

plannedCustomsDate <- plannedPickupDate <- plannedUnloadDate
<- plannedDeliveryDate
<- plannedReturnDate

### 2.2 关键约束条件

- 仓库日产能限制
- 运输天数
- 在仓天数
  ...
```

---

### 案例 3：状态机逻辑分析

**你说**：

```
状态机的 7 层优先级是怎么判断的？能生成文档吗？
```

**AI 应该**：

1. [自动调用 code-to-doc]
2. [读取 calculateLogisticsStatus.ts]
3. [分析优先级判断逻辑]
4. [设计不同状态场景]
5. [生成状态优先级表格]

**预期输出**：

```markdown
# 状态机计算逻辑场景模拟

## 一、文档概述

本文档说明 LogiX 物流状态机的 7 层优先级判断逻辑...

## 二、状态优先级

| 优先级 | 条件         | 状态           |
| ------ | ------------ | -------------- |
| 1      | 还空箱日期   | returned_empty |
| 2      | WMS 已确认   | unloaded       |
| 3      | 拖车提柜日期 | picked_up      |

...
```

---

## 🔍 监督 AI 是否正确执行

### 检查清单

当你触发文档生成请求后，检查 AI 是否：

**必须做到**：

- [ ] 自动调用了 `code-to-doc` 技能
- [ ] 读取了真实的源代码文件
- [ ] 标注了具体的文件路径和行号
- [ ] 提供了至少 3 个场景模拟
- [ ] 每个场景都有详细的计算过程

**禁止行为**：

- ❌ 只说"会调用"但没有实际调用
- ❌ 编造不存在的字段或表
- ❌ 没有读取源代码就生成文档
- ❌ 场景参数没有业务依据

---

## 🛠️ 如果 AI 没有自动调用

### 情况 1：AI 忘记了

**你说**：

```
请自动调用 code-to-doc 技能来分析这个模块
```

**AI 应该**：立即调用并执行完整流程

---

### 情况 2：AI 不理解你的需求

**你说**：

```
按照 ai-auto-skill-trigger.mdc 规则 4，你应该自动调用 code-to-doc 技能
```

**AI 应该**：立即纠正并重新执行

---

### 情况 3：AI 没有读取源代码

**你说**：

```
请先读取 backend/src/services/demurrage.service.ts 的源代码再分析
```

**AI 应该**：立即读取源代码并重新分析

---

## 📊 生成的文档质量检查

### 一致性检查（Critical）

- [ ] 所有表名与 `backend/03_create_tables.sql` 一致
- [ ] 所有字段名与数据库定义一致（snake_case）
- [ ] 计算公式与源代码完全吻合
- [ ] 参数值在合理范围内

### 完整性检查（Required）

- [ ] 覆盖所有主要计算分支
- [ ] 包含至少 1 个边界条件场景
- [ ] 包含至少 1 个异常场景
- [ ] 提供了对比表格（如存在多模式）

### 格式检查（Required）

- [ ] 无 Emoji 表情
- [ ] 表格对齐整齐
- [ ] 代码块标注语言
- [ ] 权威来源路径准确

---

## 🎓 最佳实践

### 1. 明确指定要分析的模块

**好**：

```
帮我分析 demurrage.service.ts 的计算逻辑
```

**不够好**：

```
分析一下这个（没说清楚是哪个）
```

### 2. 提供额外上下文（可选）

如果你知道更多信息，可以告诉 AI：

```
帮我分析 demurrage.service.ts，特别注意分段费率的计算逻辑
```

### 3. 要求特定格式（可选）

如果你有特殊需求：

```
生成文档时，请重点对比 forecast 和 actual 两种模式的差异
```

---

## 📚 相关文件

### 规则文件

- `.lingma/rules/ai-auto-skill-trigger.mdc` - 自动触发规则（规则 4）

### 技能文件

- `.lingma/skills/04-quality/code-to-doc/SKILL.md` - 技能主文件
- `.lingma/skills/04-quality/code-to-doc/README.md` - 使用指南
- `.lingma/skills/04-quality/code-to-doc/CREATION_REPORT.md` - 创建报告

### 参考文档

- `frontend/public/docs/第 2 层 - 代码文档/计算逻辑场景模拟.md` - 参考格式

---

## 🚀 快速开始

### 现在就试试！

选择一个你感兴趣的模块，对 AI 说：

```
帮我分析 [模块文件名] 的计算逻辑，生成场景模拟文档
```

例如：

- `backend/src/services/demurrage.service.ts` - 滞港费计算
- `backend/src/services/intelligentScheduling.service.ts` - 智能排柜
- `backend/src/services/schedulingCostOptimizer.service.ts` - 成本优化
- `backend/src/utils/calculateLogisticsStatus.ts` - 状态机

AI 会自动调用 `code-to-doc` 技能，为你生成专业的技术文档！

---

## ❓ 常见问题

### Q1: 我必须记住 skill 名称吗？

A: **不需要**！你只需要用自然语言描述需求，AI 会自动识别并调用。

### Q2: 如果 AI 没有自动调用怎么办？

A: 提醒它："请按照 ai-auto-skill-trigger.mdc 规则 4，自动调用 code-to-doc 技能"

### Q3: 生成的文档保存在哪里？

A: 建议保存在 `frontend/public/docs/第 2 层 - 代码文档/` 目录下

### Q4: 可以自定义文档格式吗？

A: 可以！在请求时说明你的特殊需求即可

---

**版本**: v1.0  
**创建时间**: 2026-04-01  
**最后更新**: 2026-04-01  
**维护者**: LogiX 团队  
**状态**: ✅ 已配置自动触发
