# SKILL 原则执行指南

**版本：** v1.0  
**最后更新：** 2026-03-27  
**状态：** ✅ 强制执行

---

## 🎯 快速开始

### **1. 阅读 skill.md**

在开始任何开发工作前，请先阅读：

📄 [skill.md](skill.md) - 完整的 SKILL 原则规范

**重点章节：**

- SKILL 原则详解
- 七步开发流程
- 检查清单
- 技术债预防机制

---

### **2. 本地验证**

在提交代码前，运行本地检查：

```bash
# 方式 1: 进入 backend 目录运行（推荐）
cd backend
npm run skill:check

# 方式 2: 直接运行脚本
cd backend
node scripts/check-skill-compliance.js

# 运行测试（确保覆盖率 ≥ 80%）
npm test -- --coverage

# 运行 Lint 检查
npm run lint

# TypeScript 编译检查
npm run type-check
```

**所有检查必须通过！**

---

### **3. 使用 PR 模板**

创建 Pull Request 时，必须使用模板：

📄 [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md)

**必填内容：**

- ✅ 检查清单（全部勾选）
- ✅ SKILL 原则评估（自评分数）
- ✅ 测试结果截图
- ✅ 技术方案说明

---

## 🔧 工具使用说明

### **skill:check 命令**

**功能：** 自动检查代码是否符合 SKILL 原则

**运行方式：**

```bash
# 方式 1: 使用 npm 脚本
cd backend
npm run skill:check

# 方式 2: 直接运行脚本
node scripts/check-skill-compliance.js
```

**检查内容：**

- ✅ 文件行数（≤300 行）
- ✅ 方法行数（≤50 行）
- ✅ JSDoc 完整性
- ✅ TODO/FIXME 数量
- ✅ 函数参数数量

**输出示例：**

```
================================
SKILL 原则代码质量检查
================================

正在检查 6 个服务文件...

ContainerFilterService.ts
  行数：125
  函数数：3
  JSDoc: 3/3

SchedulingSorter.ts
  行数：188
  函数数：4
  JSDoc: 4/4

================================
检查结果
================================

总体统计:
  总文件数：6
  ✅ 通过：6
  ❌ 失败：0
  平均行数：209
  TODO 数量：2
  FIXME 数量：0

================================
✅ 恭喜！所有文件都符合 SKILL 原则！
================================
```

---

### **GitHub Actions CI**

**自动触发条件：**

- Push 到 main/develop 分支
- 创建 Pull Request

**检查项目：**

1. **SKILL 原则合规检查**
   - 文件行数检查
   - 方法行数检查
   - JSDoc 完整性
   - TODO/FIXME 检查

2. **测试覆盖率检查**
   - 覆盖率 ≥ 80%
   - 所有测试通过

3. **Lint & Build**
   - ESLint 无错误
   - TypeScript 编译通过

4. **文档完整性检查**
   - 执行报告完整
   - README 已更新

**查看结果：**

在 PR 页面底部查看检查结果：

```
✅ All checks have passed
- SKILL 原则合规检查
- 测试覆盖率检查
- Lint & Build
- 文档完整性检查
```

---

## 📋 开发流程

### **Step-by-Step 指南**

#### **开发前**

1. **阅读 skill.md**
   - 理解 SKILL 原则
   - 熟悉检查清单
2. **创建分支**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **运行现有测试**
   ```bash
   npm test
   # 确保现有测试全部通过
   ```

---

#### **开发中**

遵循 **小步快跑** 策略：

```
┌─────────────────┐
│  1. 写一个测试  │ ← 先失败
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. 写最少代码  │ ← 让测试通过
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. 运行测试    │ ← 验证通过
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. 运行检查    │ ← npm run skill:check
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. 提交代码    │ ← 小步提交
└────────┬────────┘
         │
         ▼
    回到起点
```

**每步检查：**

- [ ] 测试通过了吗？
- [ ] `npm run skill:check` 通过了吗？
- [ ] 代码符合 SKILL 吗？
- [ ] 需要重构吗？

---

#### **开发后**

1. **运行完整测试**

   ```bash
   npm test -- --coverage
   # 确保覆盖率 ≥ 80%
   ```

2. **运行技能检查**

   ```bash
   npm run skill:check
   # 确保所有检查通过
   ```

3. **编写执行报告**

   ```bash
   # 在 backend/scripts/ 目录创建报告
   # 格式参考 phase2-step*-report.md
   ```

4. **更新文档**
   - [ ] README.md
   - [ ] API 文档
   - [ ] 相关 Wiki

---

#### **提交 PR**

1. **填写 PR 模板**
   - 使用 `.github/PULL_REQUEST_TEMPLATE.md`
   - 勾选所有检查项
   - 填写 SKILL 评估

2. **上传测试结果**
   - 测试覆盖率截图
   - skill:check 结果截图

3. **等待 CI 检查**
   - 关注 GitHub Actions 结果
   - 如有失败，立即修复

4. **Code Review**
   - 回复 Review 意见
   - 进行必要修改

---

## ✅ 检查清单速查

### **开发前自检**

```markdown
## 需求理解

- [ ] 我理解了业务的真实需求吗？
- [ ] 我知道要修改哪些文件吗？
- [ ] 我识别了所有风险点吗？
- [ ] 我有更简单的方案吗？

## 方案设计

- [ ] 符合 SKILL 原则吗？
- [ ] 有零破坏性变更吗？
- [ ] 测试策略完善吗？
- [ ] 文档计划明确吗？
```

### **开发中检查**

```markdown
## 每步检查

- [ ] 测试通过了吗？
- [ ] npm run skill:check 通过了吗？
- [ ] 代码符合 SKILL 吗？
- [ ] 需要重构吗？
```

### **开发后检查**

```markdown
## 测试验证

- [ ] 所有测试通过吗？
- [ ] 覆盖率≥80% 吗？
- [ ] 边界条件测了吗？
- [ ] 异常情况测了吗？

## 文档完善

- [ ] JSDoc 完整吗？
- [ ] 示例充分吗？
- [ ] 执行报告写了吗？
- [ ] 踩坑记录了吗？
```

### **提交前检查**

```markdown
## 代码质量

- [ ] npm run skill:check 通过
- [ ] npm run lint 通过
- [ ] npm run type-check 通过
- [ ] 格式化代码

## PR 准备

- [ ] 使用 PR 模板
- [ ] 填写检查清单
- [ ] 上传测试结果
- [ ] 填写 SKILL 评估
```

---

## 🎯 常见问题 FAQ

### **Q1: skill:check 失败怎么办？**

**A:** 根据错误信息逐个修复：

```bash
# 示例错误：
❌ 错误：文件行数过多 (350 > 300)

# 解决方案：
1. 拆分大文件为多个小文件
2. 提取公共逻辑到新类
3. 删除无用代码
```

**常见错误及解决：**

| 错误         | 原因    | 解决方案       |
| ------------ | ------- | -------------- |
| 文件行数过多 | >300 行 | 拆分为多个服务 |
| 方法行数过多 | >50 行  | 提取子方法     |
| 缺少 JSDoc   | 无注释  | 添加完整 JSDoc |
| TODO 过多    | >5 个   | 尽快实现或移除 |

---

### **Q2: 测试覆盖率不足怎么办？**

**A:** 补充测试用例：

```typescript
// 分层测试策略
describe("methodName", () => {
  // Layer 1: 基本功能
  it("should work for normal case", () => {});

  // Layer 2: 边界条件
  it("should handle empty input", () => {});
  it("should handle null input", () => {});

  // Layer 3: 异常情况
  it("should throw error for invalid input", () => {});
});
```

---

### **Q3: JSDoc 怎么写？**

**A:** 参考模板：

````typescript
/**
 * 方法名称
 *
 * 一句话描述职责
 *
 * 详细说明（可选）
 *
 * @param paramName - 参数说明
 * @returns 返回值说明
 *
 * @example
 * ```typescript
 * const result = await service.method({...});
 * ```
 */
async methodName(paramName: Type): Promise<ReturnType> {
  // ...
}
````

---

### **Q4: 如何评估 SKILL 原则？**

**A:** 问自己这些问题：

**S - 单一职责：**

- 这个类只做一件事吗？
- 能用一句话说清楚职责吗？

**K - 知识沉淀：**

- JSDoc 完整吗？
- 执行报告写了吗？

**I - 索引清晰：**

- 命名清晰吗？
- 接口定义完善吗？

**L - 活文档：**

- 测试覆盖全面吗？
- 测试即文档吗？

**L - 面向学习：**

- 示例充分吗？
- 新人能看懂吗？

---

### **Q5: CI 检查失败怎么办？**

**A:** 查看 GitHub Actions 日志：

1. **打开 PR 页面**
2. **点击 "Checks" 标签**
3. **查看失败的检查**
4. **阅读错误日志**
5. **本地复现并修复**
6. **重新提交**

**常见失败原因：**

- ❌ 测试覆盖率 < 80%
- ❌ ESLint 有错误
- ❌ TypeScript 编译失败
- ❌ 缺少执行报告

---

## 🎊 最佳实践

### **实践 1: 小步提交**

```bash
# ✅ 好的提交
git commit -m "feat: 添加货柜筛选服务"
git commit -m "test: 添加筛选服务单元测试"
git commit -m "docs: 添加筛选服务执行报告"

# ❌ 不好的提交
git commit -m "update code"  # 太大、太模糊
```

---

### **实践 2: 测试先行**

```typescript
// 1. 先写测试（会失败）
it('should filter invalid containers', () => {
  const result = service.filter(containers);
  expect(result.length).toBeLessThan(containers.length);
});

// 2. 再写代码（让测试通过）
filter(containers: Container[]): Container[] {
  return containers.filter(c => c.isValid);
}

// 3. 运行测试（验证通过）
```

---

### **实践 3: 持续重构**

```typescript
// 发现代码异味 → 立即重构

// ❌ 重构前：100 行方法
async processContainers() {
  // 50 行筛选逻辑
  // 30 行排序逻辑
  // 20 行保存逻辑
}

// ✅ 重构后：3 个方法
async processContainers() {
  const filtered = this.filter(containers);
  const sorted = this.sort(filtered);
  await this.save(sorted);
}
```

---

### **实践 4: 文档同步**

```markdown
# 执行报告结构

## 执行摘要

- 执行时间：XX 分钟
- 代码行数：XXX 行
- 测试数量：XX 个
- 通过率：XX%

## 技术方案

[核心思路]

## 踩坑记录

[问题 + 解决]

## 测试结果

[测试覆盖]
```

---

## 📚 学习资源

### **必读文档**

1. 📄 [skill.md](skill.md) - SKILL 原则完整规范
2. 📄 [PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) - PR 检查清单
3. 📄 [Phase 2 案例](backend/scripts/phase2-grand-summary.md) - 实战案例

### **推荐书籍**

1. 《代码整洁之道》
2. 《重构：改善既有代码的设计》
3. 《测试驱动开发》

### **在线资源**

- [Refactoring Guru](https://refactoring.guru/) - 重构指南
- [Testing JavaScript](https://testingjavascript.com/) - JS 测试
- [Clean Code Lectures](https://cleancoders.com/) - 整洁代码

---

## 🎯 总结

### **三个关键点**

1. **开发前读 skill.md**
   - 理解 SKILL 原则
   - 熟悉检查清单

2. **开发中用 skill:check**
   - 每步验证代码质量
   - 及时发现问题

3. **提交前填检查清单**
   - 使用 PR 模板
   - 完成 SKILL 评估

### **一个目标**

> **"一次就做对、做好，不堆积技术债"**

---

**让我们一起写出优雅的代码！** 💪🎉🚀

**如有疑问，请参考 skill.md 或询问团队成员！**
