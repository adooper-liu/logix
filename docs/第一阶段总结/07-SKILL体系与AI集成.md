# 07-SKILL体系与AI集成

**创建日期**: 2026-03-21  
**最后更新**: 2026-03-24  
**阅读时间**: 15 分钟

---

## 目录

1. [SKILL体系架构](#1-skill-体系架构)
2. [SKILL 使用方法](#2-skill-使用方法)
3. [SKILL 编写规范](#3-skill-编写规范)
4. [AI 辅助开发实践](#4-ai-辅助开发实践)
5. [知识库建设](#5-知识库建设)

---

## 1. SKILL体系架构

### 1.1 SKILL 分类

核心 SKILL：

- **logix-development**: 核心开发技能（必学）
- **database-query**: 数据库查询专用
- **document-processing**: Excel/PDF文档处理
- **excel-import-requirements**: Excel 导入规范
- **code-review**: 代码质量审查
- **commit-message**: Git 提交信息生成
- **feituo-eta-ata-validation**: 飞驼数据验证
- **logix-demurrage**: 滞港费计算
- **typeorm-exists-subquery**: TypeORM EXISTS 子查询

### 1.2 项目中的 SKILL 位置

```
logix/
├── .codebuddy/skills/          # CodeBuddy SKILL
│   ├── logix-development/
│   ├── database-query/
│   ├── document-processing/
│   └── ...
│
├── .cursor/skills/             # Cursor IDE SKILL
│   ├── container-intelligent-processing/
│   └── ...
│
└── .lingma/skills/             # Lingma IDE SKILL
    └── ...
```

### 1.3 SKILL 结构

基本结构：

````markdown
---
name: skill-name
description: 简短描述
---

# 技能标题

## 核心原则

- 关键规则 1
- 关键规则 2

## 使用场景

- 场景 1
- 场景 2

## 示例代码

```typescript
// 代码示例
```
````

## 注意事项

- 注意 1
- 注意 2

````

---

## 2. SKILL 使用方法

### 2.1 在 CodeBuddy 中使用

步骤 1: 查看可用 SKILL
- 在 CodeBuddy 对话框中输入 /skills

步骤 2: 加载特定 SKILL
- 使用 use_skill 工具
- 命令：use_skill({ command: 'logix-development' })

步骤 3: 使用 SKILL 中的规则进行开发

### 2.2 在 Cursor 中使用

步骤 1: 打开 .cursor/skills/ 下的 SKILL 文件
- Cursor 会自动加载 SKILL 规则

步骤 2: 在对话中引用 SKILL 名称
- 格式：@skill-name
- 示例：@logix-development 帮我创建一个新的货柜实体

---

## 3. SKILL 编写规范

### 3.1 编写模板

```markdown
---
name: example-skill
description: 这是一个示例 SKILL
---

# 示例技能

## 核心原则
1. 第一条原则
2. 第二条原则

## 使用场景
- 当你需要做某事时
- 当你遇到某个问题时

## 示例代码

### 示例 1：基本用法
```typescript
function example() {
  // 代码
}
````

### 示例 2：进阶用法

```typescript
function advanced() {
  // 更多代码
}
```

## 注意事项

- 注意点 1
- 注意点 2

```

### 3.2 内容要求

应该包含：
- 明确的核心原则
- 具体的使用场景
- 可执行的代码示例
- 关键的注意事项

避免：
- 模糊的描述
- 不可执行的伪代码
- 过度复杂的示例
- 重复的内容

---

## 4. AI 辅助开发实践

### 4.1 应用场景

代码生成助手：
- 根据需求生成代码框架
- 自动生成重复性代码
- 提供代码优化建议

文档编写助手：
- 生成 API 文档
- 编写技术说明
- 整理会议纪要

问题诊断助手：
- 分析错误日志
- 定位问题原因
- 提供解决方案

知识查询助手：
- 查询技术规范
- 检索业务规则
- 解答技术问题

### 4.2 最佳实践

有效提问：
- 明确具体需求
- 提供上下文信息
- 说明期望结果

验证输出：
- 检查代码可执行性
- 验证逻辑正确性
- 测试边界条件

持续改进：
- 记录成功案例
- 总结失败教训
- 优化 SKILL 规则

---

## 5. 知识库建设

### 5.1 知识分类

技术规范：
- 命名规范
- 代码风格
- 架构设计原则

业务知识：
- 物流流程
- 费用计算规则
- 预警判断逻辑

实践经验：
- 踩坑记录
- 解决方案
- 最佳实践

### 5.2 知识维护

定期更新：
- 每月审查 SKILL
- 补充新知识点
- 删除过期内容

质量保证：
- 所有代码可执行
- 所有案例真实
- 所有规则经过验证

团队共享：
- 建立知识索引
- 组织培训分享
- 鼓励贡献 SKILL

---

## 总结

### 核心要点

1. **SKILL体系**: 9 大核心 SKILL，覆盖开发全流程
2. **使用方法**: CodeBuddy/Cursor/Lingma多平台支持
3. **编写规范**: 明确的模板和内容要求
4. **AI 辅助**: 代码生成、文档编写、问题诊断
5. **知识库**: 技术规范、业务知识、实践经验

### 相关文件

- [CodeBuddy SKILL 目录](../../.codebuddy/skills/)
- [Cursor SKILL 目录](../../.cursor/skills/)
- [Lingma SKILL 目录](../../.lingma/skills/)
- [SKILL.md 主文件](../../.codebuddy/skills/logix-development/SKILL.md)

---

**文档版本**: v2.0 (精简版)
**审查状态**: ✅ 已审查
**精简比例**: -40% (从 297 行 → 178 行)
**下次审查**: 2026-04-24
```
