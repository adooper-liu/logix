# 全量 SKILL 自动触发配置完成报告

## 📦 配置概览

**配置时间**: 2026-04-01  
**配置范围**: 全量 10+ 技能自动触发  
**验证状态**: ✅ 已完成  
**文档路径**: ✅ 已规范

---

## 🎯 核心目标

让用户**完全忘记 Skill 名称**，AI 自动识别场景并调用相应的 Skill。

用户只需要用自然语言描述需求，AI 就会自动调用对应的技能执行任务！

---

## 📋 支持的自动触发技能（11 个）

### 规则 1：数据库相关 → fix-verification + database-query

**触发关键词**：

- "字段"、"表"、"数据库"、"SQL"、"实体"
- "检查"、"验证"、"对吗"、"有问题"

**典型语句**：

```
"unload_mode_plan 这个字段名对吗？"
"帮我检查一下数据库表结构"
```

---

### 规则 2：前端相关 → vue-best-practices

**触发关键词**：

- "前端"、"Vue"、"组件"、".vue"

**典型语句**：

```
"这个 Vue 组件怎么写？"
"前端如何用 Composition API？"
```

---

### 规则 3：后端相关 → logix-development

**触发关键词**：

- "后端"、"API"、"Service"、"Controller"

**典型语句**：

```
"后端 API 怎么设计？"
"Service 层应该包含哪些逻辑？"
```

---

### 规则 4：文档生成 → code-to-doc ⭐

**触发关键词**：

- "分析...计算逻辑"、"生成文档"、"场景模拟"

**典型语句**：

```
"帮我分析 demurrage.service.ts 的计算逻辑"
"生成一份场景模拟文档"
"这个模块是怎么计算费用的？"
```

**执行步骤**：

1. 识别目标模块类型
2. 读取源代码
3. 提取核心计算公式
4. 设计场景矩阵
5. 手工验算
6. 生成标准格式文档
7. 标注权威来源

**生成的文档必须包含**：

- ✅ 核心计算公式
- ✅ 关键参数表（注明数据库来源）
- ✅ 至少 3 个场景模拟
- ✅ 对比表格（如适用）
- ✅ 权威源代码引用

---

### 规则 5：验证/检查 → fix-verification

**触发关键词**：

- "检查"、"验证"、"对吗"、"有问题"

**典型语句**：

```
"这个字段名对吗？"
"保存失败，是不是字段有问题？"
```

---

### 规则 6：滞港费计算 → logix-demurrage

**触发关键词**：

- "滞港费"、"demurrage"、"滞箱费"、"detention"
- last_free_date、last_return_date

**典型语句**：

```
"滞港费是怎么计算的？"
"actual 模式和 forecast 模式有什么区别？"
"last_free_date 怎么算出来的？"
```

**数据来源**：

- 目的港 ATA：`process_port_operations.ata_dest_port`
- 修正 ETA：`process_port_operations.revised_eta`
- 计划提柜日：`process_trucking_transport.planned_pickup_date`
- 实际提柜日：`process_trucking_transport.pickup_date`
- 最晚提柜日：`process_port_operations.last_free_date`

---

### 规则 7：智能排产 → intelligent-scheduling-mapping

**触发关键词**：

- "智能排产"、"排柜"、"调度"
- dict_warehouse_trucking_mapping、CA-S003/FBW_CA

**典型语句**：

```
"智能排产是怎么选择仓库的？"
"CA-S003 这个仓库是怎么分配的？"
"销往英国的货柜应该去哪个仓库？"
```

---

### 规则 8：物流状态机 → container-alerts-state-machine

**触发关键词**：

- "状态机"、"物流状态"、"7 层状态"
- returned_empty、unloaded、picked_up

**典型语句**：

```
"状态机的优先级是怎么判断的？"
"为什么这个货柜是 returned_empty 状态？"
"ext_container_alerts 是怎么触发预警的？"
```

---

### 规则 9：飞驼 ETA 验证 → feituo-eta-ata-validation

**触发关键词**：

- "飞驼"、"ETA 验证"、"ATA 数据"
- status_code、ata_time

**典型语句**：

```
"飞驼的 ETA 数据准确吗？"
"status_code 是怎么映射到本地状态的？"
"ATA 时间为什么对不上？"
```

---

### 规则 10：代码审查 → code-review

**触发关键词**：

- "代码审查"、"review"、"检查代码"

**典型语句**：

```
"帮我 review 一下这段代码"
"这个 PR 有什么问题吗？"
"代码符合规范吗？"
```

---

### 规则 11：Git 提交 → commit-message

**触发关键词**：

- "commit message"、"提交信息"

**典型语句**：

```
"帮我写个 commit message"
"这个提交怎么写？"
```

---

## 📁 文档生成路径规范

### 正式文档路径

**固定位置**: `frontend/public/docs/`

| 文档类型             | 保存路径                                   | 示例                                                              |
| -------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| **计算逻辑场景模拟** | `frontend/public/docs/第 2 层 - 代码文档/` | `frontend/public/docs/第 2 层 - 代码文档/滞港费计算场景模拟.md`   |
| **开发规范**         | `frontend/public/docs/01-standards/`       | `frontend/public/docs/01-standards/SKILL/code-to-doc-usage.md`    |
| **业务逻辑文档**     | `frontend/public/docs/02-business-logic/`  | `frontend/public/docs/02-business-logic/demurrage-calculation.md` |
| **架构设计文档**     | `frontend/public/docs/03-architecture/`    | `frontend/public/docs/03-architecture/system-design.md`           |

### code-to-doc 生成文档要求

当调用 `code-to-doc` 技能生成文档时，**必须**：

1. **询问用户保存位置**:

   ```
   请问您希望将文档保存在哪个目录？
   - frontend/public/docs/第 2 层 - 代码文档/ (推荐)
   - 其他位置 (请指定)
   ```

2. **如用户未指定，默认保存至**:

   ```
   frontend/public/docs/第 2 层 - 代码文档/[模块名称] 计算逻辑场景模拟.md
   ```

3. **文档命名规范**:
   - 使用中文名称
   - 包含模块名称和文档类型
   - 使用短横线分隔

4. **文档末尾标注**:

   ```markdown
   ---

   **保存路径**: `frontend/public/docs/第 2 层 - 代码文档/[文件名].md`
   **生成时间**: YYYY-MM-DD
   **代码来源**: `backend/src/services/[文件名].ts`
   ```

### 禁止行为

- ❌ 在项目根目录创建文档
- ❌ 在 `backend/` 或 `scripts/` 目录创建文档
- ❌ 使用临时文档路径（除非明确标注为临时）
- ❌ 不标注保存路径

---

## 🔍 验证结果

运行验证脚本的检查结果：

```
✅ 自动触发规则文件存在
✅ 技能索引文件存在
✅ 包含规则：数据库相关|验证/检查 -> fix-verification
✅ 包含规则：前端相关 -> vue-best-practices
✅ 包含规则：后端相关 -> logix-development
✅ 包含规则：文档生成 -> code-to-doc
✅ 包含规则：滞港费计算 -> logix-demurrage
✅ 包含规则：智能排产 -> intelligent-scheduling-mapping
✅ 包含规则：物流状态机 -> container-alerts-state-machine
✅ 包含规则：飞驼 ETA 验证 -> feituo-eta-ata-validation
✅ 包含规则：代码审查 -> code-review
✅ 包含规则：Git 提交 -> commit-message
✅ 包含文档生成路径规范章节
✅ 指定了正确的文档保存路径
✅ 包含 code-to-doc 生成文档的特殊要求
```

---

## 📊 配置统计

| 项目         | 数量   | 状态    |
| ------------ | ------ | ------- |
| 自动触发规则 | 11 条  | ✅ 完整 |
| 覆盖技能     | 10+ 个 | ✅ 全面 |
| 示例场景     | 8 个   | ✅ 充足 |
| 文档路径规范 | 4 类   | ✅ 清晰 |

---

## 🚀 快速开始

### 现在就试试！

选择一个你感兴趣的主题，对 AI 说：

**文档生成**：

```
帮我分析 demurrage.service.ts 的计算逻辑，生成场景模拟文档
```

**滞港费咨询**：

```
滞港费是怎么计算的？actual 模式和 forecast 模式有什么区别？
```

**智能排产**：

```
CA-S003 这个仓库是怎么分配的？销往英国的货柜应该去哪个仓库？
```

**状态机**：

```
状态机的优先级是怎么判断的？为什么这个货柜是 returned_empty 状态？
```

**代码审查**：

```
帮我 review 一下这段代码，看看有什么问题吗？
```

AI 会自动调用相应的技能，为你生成专业的答案！

---

## 📚 相关文件

### 规则文件

- `.lingma/rules/ai-auto-skill-trigger.mdc` - 自动触发规则（11 条规则）

### 技能文件

- `.lingma/skills/INDEX.md` - 技能索引地图
- `.lingma/skills/04-quality/code-to-doc/` - code-to-doc 技能目录

### 验证脚本

- `.lingma/skills/04-quality/code-to-doc/verify-all-skills-auto-trigger.ps1` - 全量验证脚本

---

## 🎓 最佳实践

### 1. 明确表达需求

**好**：

```
帮我分析 demurrage.service.ts 的计算逻辑，生成场景模拟文档
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

### 3. 监督 AI 正确执行

检查 AI 是否：

- [ ] 自动调用了相应的技能
- [ ] 读取了真实的源代码文件
- [ ] 标注了具体的文件路径和行号
- [ ] 提供了详细的分析过程

---

## ❓ 常见问题

### Q1: 我必须记住 skill 名称吗？

A: **不需要**！你只需要用自然语言描述需求，AI 会自动识别并调用。

### Q2: 如果 AI 没有自动调用怎么办？

A: 提醒它："请按照 ai-auto-skill-trigger.mdc 规则 X，自动调用 XXX 技能"

### Q3: 生成的文档保存在哪里？

A: 默认保存在 `frontend/public/docs/第 2 层 - 代码文档/` 目录下

### Q4: 可以自定义文档格式吗？

A: 可以！在请求时说明你的特殊需求即可

---

## 🎉 总结

全量 SKILL 自动触发配置已完成并验证通过！

**核心特点**：

- ✅ **零学习成本** - 用自然语言即可触发
- ✅ **自动识别** - AI 自动判断场景并调用
- ✅ **强制执行** - AI 必须读取源代码并验证
- ✅ **质量保证** - 遵循严格的文档标准和检查清单
- ✅ **路径规范** - 所有文档保存到统一位置

**配置状态**：

- ✅ 自动触发规则已配置（11 条规则）
- ✅ 技能索引已更新
- ✅ 文档生成路径已规范
- ✅ 验证脚本已创建
- ✅ 所有检查已通过

**下一步行动**：

1. 选择一个熟悉的主题进行测试
2. 验证 AI 是否自动调用了相应的技能
3. 根据实际使用情况持续优化

---

**配置者**: AI Assistant  
**配置时间**: 2026-04-01  
**最后更新**: 2026-04-01  
**维护者**: LogiX 团队  
**状态**: ✅ 已完成并验证通过
