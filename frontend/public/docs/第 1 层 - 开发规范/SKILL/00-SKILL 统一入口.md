# LogiX SKILL 开发规范

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-04-10  
**作者**: 刘志高  
**状态**: 强制执行

---

## 什么是 SKILL

SKILL 是 LogiX 项目的业务知识沉淀单元，包含两个层面：

### 1. SKILL 原则（开发规范）

五大核心原则指导代码开发：

| 原则                          | 说明     | 要求                      |
| ----------------------------- | -------- | ------------------------- |
| **S** - Single Responsibility | 单一职责 | 一个类只做一件事          |
| **K** - Knowledge             | 知识沉淀 | JSDoc、执行报告、踩坑记录 |
| **I** - Indexed               | 索引清晰 | 命名清晰、接口明确        |
| **L** - Living                | 活文档   | 测试即文档、持续更新      |
| **L** - Learning              | 面向学习 | 示例丰富、新人友好        |

### 2. SKILL 文档（业务知识）

业务知识的标准化文档：

- **SKILL-001**: 时间线标签显示规则
- **SKILL-002**: TypeScript 类型错误修复流程
- **SKILL-004**: 数据库迁移自动化管理
- **SKILL-005**: 文件夹定位与文件生成路径

---

## 核心原则

### 原则一：简洁即美

**强制要求**：

1. **禁止使用 emoji 表情**
   - 文档中不得使用任何 emoji
   - 使用纯文字表达含义
   - 保持技术文档的专业风格

2. **避免装饰性符号**
   - 不使用 ←→➤ 等装饰符号
   - 统一使用 ASCII 箭头（<- ->）
   - 状态标记使用文字（OK/FAIL）

3. **保持清爽排版**
   - 避免过度使用引用块
   - 合理使用标题层级
   - 保持适当的留白

**示例**：

```markdown
错误：## 快速导航 通过：6 失败：0
正确：## 快速导航 OK 通过：6 FAIL 失败：0
```

### 原则二：真实第一

**强制要求**：

1. **内容真实性**
   - 基于真实数据和事实
   - 禁止编造示例数据
   - 所有代码示例必须可运行

2. **表达直接性**
   - 用文字而非符号表达
   - 避免隐喻和暗示
   - 直截了当说明问题

3. **信息准确性**
   - 路径必须准确可访问
   - 命令必须实际可用
   - 引用必须有据可查

### 原则三：业务导向

**强制要求**：

1. **聚焦业务场景**
   - 文档开头明确业务场景
   - 代码示例贴近实际业务
   - 避免脱离业务的纯理论

2. **提高信息传递效率**
   - 重要信息放在显眼位置
   - 使用表格归纳关键点
   - 提供快速查找表

3. **便于实践应用**
   - 提供完整代码示例
   - 包含常见错误案例
   - 给出检查清单

---

## 智能体自动遵循规则

### 规则 1：文档生成检查

```yaml
when: generating_document
checks:
  - no_emoji: true
  - no_decorative_symbols: true
  - use_plain_text: true
  - professional_style: true

validation:
  pattern: '[🎯📁⭐🚀📋🤖✅❌📊💡🔗🎉💪📄📌📈🔄🛠️🎊]'
  action: remove_and_warn
```

### 规则 2：文档质量验证

```yaml
after_creating_document:
  verify:
    - has_emoji: false
    - has_decorative_arrows: false
    - uses_ascii_arrows: true
    - status_markers: 'OK/FAIL'

  if_failed:
    - auto_fix: true
    - warn_user: true
```

### 规则 3：优先级顺序

```yaml
priority_order:
  1. simplicity: 简洁即美
  2. authenticity: 真实第一
  3. business_oriented: 业务导向

conflict_resolution:
  - if_beauty_vs_simplicity: choose_simplicity
  - if_form_vs_content: choose_content
  - if_theory_vs_practice: choose_practice
```

---

## 文档结构

```
frontend/public/docs/第 1 层 - 开发规范/SKILL/
├── README.md              <- 本文件（统一入口）
├── 01-SKILL 原则.md        <- 核心理念与要求
├── 02-SKILL Check 指南.md  <- 代码质量检查工具
├── 03-开发流程.md          <- 七步开发流程
└── 04-SKILL 编写规范.md    <- 文档编写模板
```

---

## 快速开始

### 步骤 1：阅读 SKILL 原则

阅读 [01-SKILL 原则.md](01-SKILL 原则.md)，理解五大核心原则。

### 步骤 2：安装工具

按照 [02-SKILL Check 指南.md](02-SKILL Check 指南.md) 配置本地环境。

### 步骤 3：遵循开发流程

按照 [03-开发流程.md](03-开发流程.md) 进行七步开发。

### 步骤 4：创建 SKILL 文档

参考 [04-SKILL 编写规范.md](04-SKILL 编写规范.md) 创建新文档。

---

## 强制要求

### 代码质量标准

```bash
# 文件行数
≤300 行/文件

# 方法行数
≤50 行/方法

# JSDoc
100% 覆盖公共函数

# 函数参数
≤4 个参数
```

### 开发流程

```
1. 写测试 -> 失败
   <-
2. 写代码 -> 通过
   <-
3. 运行检查 -> npm run skill:check
   <-
4. 重构优化 -> 保持绿色
   <-
5. 提交代码 -> 小步提交
```

### 文档规范

- 文件路径：`frontend/public/docs/第 1 层 - 开发规范/SKILL-{编号}-{主题}.md`
- 命名格式：`SKILL-XXX-主题名称.md`
- 文档位置：只能在 `frontend/public/docs/` 目录下
- 禁止位置：docs/, backend/, scripts/ 等目录

---

## 检查清单

### 开发前

- [ ] 已阅读 SKILL 原则
- [ ] 已了解开发流程
- [ ] 已查阅相关 SKILL 文档
- [ ] 已配置好本地工具

### 开发中

- [ ] 遵循测试先行（TDD）
- [ ] 每步运行 `npm run skill:check`
- [ ] 文件行数 ≤300 行
- [ ] 方法行数 ≤50 行
- [ ] JSDoc 完整（100% 覆盖）
- [ ] 函数参数 ≤4 个

### 开发后

- [ ] 所有测试通过（覆盖率≥80%）
- [ ] SKILL Check 通过
- [ ] Lint 检查通过
- [ ] TypeScript 编译通过
- [ ] 创建了 SKILL 文档（如需要）
- [ ] 更新了相关索引

---

## 相关文件

### 核心文档

- [SKILL 原则详解](01-SKILL 原则.md) - 五大原则完整说明
- [SKILL Check 使用](02-SKILL Check 指南.md) - 工具使用指南
- [开发流程](03-开发流程.md) - 七步开发法
- [SKILL 编写规范](04-SKILL 编写规范.md) - 文档模板

### SKILL 文档

- [SKILL-001](../SKILL-时间线标签显示规则.md) - 时间线标签规则
- [SKILL-002](../SKILL-002-TypeScript 类型错误修复流程.md) - TypeScript 错误修复
- [SKILL-004](../SKILL-004-数据库迁移自动化管理.md) - 数据库迁移
- [SKILL-005](../SKILL-005-文件夹定位与文件生成路径.md) - 文件夹定位

### 规则文件

- [logix-development-standards.mdc](../../../../.lingma/rules/logix-development-standards.mdc) - 开发准则
- [skill-principles.mdc](../../../../.lingma/rules/skill-principles.mdc) - SKILL 原则（智能体强制遵循）

---

## 总结

### 三个关键点

1. **开发前读 SKILL 原则**
   - 理解五大原则
   - 熟悉检查清单

2. **开发中用 SKILL Check**
   - 每步验证代码质量
   - 及时发现问题

3. **开发后建 SKILL 文档**
   - 沉淀业务知识
   - 更新索引文档

### 一个目标

一次就做对、做好，不堆积技术债

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-04-10  
**作者**: 刘志高  
**审核状态**: 已验证
