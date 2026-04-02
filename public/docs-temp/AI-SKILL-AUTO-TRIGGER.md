# AI 自动调用 Skill 触发规则

## 核心原则

**你不需要记住任何 Skill 名称**，只需要描述你要做什么，AI 应该自动识别场景并调用相应的 Skill。

## 场景触发器（AI 自动识别）

### 🔴 涉及数据库字段/表结构

**当你说以下内容时，AI 必须自动调用 `fix-verification` + `database-query`**：

- "这个字段名是什么？"
- "表结构是怎样的？"
- "数据库里有这个字段吗？"
- "字段名对吗？"
- "保存失败，是不是字段有问题？"
- "前后端字段名不一致"
- 任何包含 `表名 `、` 字段名`、`数据库`、`SQL`、`实体` 的问题

**AI 执行流程**：
1. 自动调用 `fix-verification`（验证规范）
2. 自动调用 `database-query`（查询数据库）
3. 读取 `backend/sql/schema/03_create_tables.sql`
4. 读取对应的实体文件 `backend/src/entities/*.ts`
5. 验证字段名、表名、类型

---

### 🔵 涉及前端组件/Vue 代码

**当你说以下内容时，AI 必须自动调用 `vue-best-practices`**：

- "这个 Vue 组件怎么写？"
- "前端代码怎么改？"
- "组件报错"
- "Vue 3 语法"
- "TypeScript 类型错误"
- "组件复用"
- "前端样式问题"
- 任何包含 `.vue`、`组件 `、` 前端`、`Vue` 的问题

**AI 执行流程**：
1. 自动调用 `vue-best-practices`
2. 检查 Composition API 使用
3. 检查 TypeScript 类型定义
4. 检查代码规范

---

### 🟢 涉及后端代码/业务逻辑

**当你说以下内容时，AI 必须自动调用 `logix-development`**：

- "后端 API 怎么写？"
- "这个服务怎么实现？"
- "业务逻辑有问题"
- "控制器代码"
- "服务层代码"
- 任何包含 `后端 `、`API`、`Controller`、`Service`、` 业务逻辑` 的问题

**AI 执行流程**：
1. 自动调用 `logix-development`
2. 检查代码规范
3. 检查业务逻辑
4. 检查 API 设计

---

### 🟡 不确定/需要验证

**当你说以下内容时，AI 必须自动调用 `fix-verification`**：

- "这样对吗？"
- "帮我检查一下"
- "有没有问题？"
- "验证一下"
- "确认一下"
- 任何表示不确定、需要验证的问题

**AI 执行流程**：
1. 自动调用 `fix-verification`
2. 读取权威源（数据库、实体、API 路由）
3. 逐项验证
4. 输出验证报告

---

## 🚨 AI 违规处罚

如果 AI 没有自动调用相应的 Skill：

1. **第一次违规**：警告并立即调用
2. **第二次违规**：用户有权要求重新执行并调用 Skill
3. **第三次违规**：用户可以向系统报告 AI 不遵循规范

**违规判定标准**：
- ❌ 只说"会调用"但没有实际调用
- ❌ 用 AI 幻觉编造答案，而不是读取真实代码
- ❌ 违反"先验证，后修改"原则
- ❌ 没有读取权威源就直接修改代码

---

## ✅ 正确示范

### 用户问："这个字段名对吗？"

**❌ 错误回答**：
"我会调用 fix-verification 来验证...（但没有实际调用）"

**✅ 正确回答**：
[立即调用 fix-verification skill]
[立即调用 database-query skill]
[读取 03_create_tables.sql 验证]
[读取实体文件验证]
然后输出验证结果。

---

## 📋 快速参考表

| 你说什么 | AI 自动调用 | 验证内容 |
|---------|-----------|---------|
| "字段名/表名" | `fix-verification` + `database-query` | SQL、实体定义 |
| "前端/Vue/组件" | `vue-best-practices` | Composition API、TypeScript |
| "后端/API/Service" | `logix-development` | 代码规范、业务逻辑 |
| "检查一下/对吗" | `fix-verification` | 权威源验证 |
| "保存失败/报错" | `fix-verification` + 对应技能 | 数据完整性、字段映射 |

---

## 🎯 用户只需要做

1. **用自然语言描述问题**（不需要记住 Skill 名称）
2. **监督 AI 是否自动调用 Skill**
3. **检查 AI 是否读取权威源验证**

---

## 🤖 AI 自动遵循规则

```yaml
when: user_asks_question
  auto_detect:
    - if contains "字段" OR "表" OR "数据库" OR "SQL":
        call: [fix-verification, database-query]
    
    - if contains "前端" OR "Vue" OR "组件" OR ".vue":
        call: [vue-best-practices]
    
    - if contains "后端" OR "API" OR "Service" OR "Controller":
        call: [logix-development]
    
    - if contains "检查" OR "验证" OR "对吗" OR "有问题":
        call: [fix-verification]
    
    - if contains "保存失败" OR "报错" OR "错误":
        call: [fix-verification]
        then: call corresponding skill based on context

validation:
  - must_read_authority_source: true
  - must_not_hallucinate: true
  - must_verify_before_modify: true
```

---

**版本**: v1.0  
**创建时间**: 2026-04-02  
**目标**: 让用户忘记 Skill 名称，让 AI 自动遵循规范
