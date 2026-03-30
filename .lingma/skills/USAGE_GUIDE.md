# 📖 SKILL 文件使用指南

**版本：** v1.0  
**更新日期：** 2026-03-27

---

## 🎯 如何使用技能文件

### 方式一：按图索骥（推荐新手）

1. **打开 [技能地图](./00-core/README.md)**
   ```
   .lingma/skills/00-core/README.md
   ```

2. **找到你需要的技能分类**
   - 后端开发 → `01-backend/`
   - 前端开发 → `02-frontend/`
   - 运维部署 → `03-devops/`
   - 质量保障 → `04-quality/`
   - 领域知识 → `05-domain/`

3. **点击链接查看详细技能**
   - 每个技能包含：说明、使用场景、代码示例、注意事项

**示例路径：**
```
我想学习 Vue 开发
  ↓
打开技能地图
  ↓
找到"前端技能" → "Vue 最佳实践"
  ↓
阅读 02-frontend/vue-best-practices/SKILL.md
```

---

### 方式二：直接搜索（适合老手）

#### **在命令行中搜索**

```bash
# 搜索特定主题
cd .lingma/skills

# 查找所有提到"数据库查询"的文档
grep -r "数据库查询" --include="*.md" .

# 查找包含代码示例的文档
grep -r "```typescript" --include="*.md" .

# 查找特定函数
grep -r "calculateDemurrage" --include="*.md" .
```

#### **在编辑器中搜索**

**VS Code 快捷键：**
- `Ctrl+Shift+F` - 全局搜索
- `Ctrl+P` - 快速打开文件
- `Ctrl+T` - 搜索符号

**搜索技巧：**
```
# 搜索技能文件
skill:database     → 查找数据库相关
skill:vue          → 查找 Vue 相关
skill:test         → 查找测试相关

# 搜索特定内容
ext:md calculateDemurrage  → 在 markdown 中搜索函数
```

---

### 方式三：AI 助手推荐（最智能）

在与 AI 助手的对话中提及你的需求，AI 会自动推荐相关技能。

**对话示例 1：**

> **你：** "我需要查询数据库，有什么规范吗？"
> 
> **AI：** "请参考 [数据库查询技能](./01-backend/database-query/SKILL.md)，其中包含了：
> - PostgreSQL 查询规范
> - TimescaleDB hypertable 使用
> - 性能优化技巧
> 
> 需要我详细解释某个部分吗？"

**对话示例 2：**

> **你：** "这个 Vue 组件太复杂了，怎么优化？"
> 
> **AI：** "建议参考 [Vue 最佳实践](./02-frontend/vue-best-practices/SKILL.md) 中的组件拆分原则：
> 1. 单一职责 - 拆分为多个小组件
> 2. Composition API - 使用组合式 API
> 3. `<script setup>` - 简化代码
> 
> 要我帮你重构吗？"

---

## 🔍 常见使用场景

### 场景 1：新人入职培训

**第 1 天：熟悉规范**
```
上午：
  9:00  - 阅读 [开发范式总纲](./logix-dev-paradigm.md)
  10:30 - 学习 [使用指南](./USAGE_GUIDE.md)
  
下午：
  14:00 - 浏览 [技能地图](./00-core/README.md)
  16:00 - 根据岗位学习对应技能
```

**第 2-3 天：技能学习**
```
后端开发：
  - [数据库查询](./01-backend/database-query/)
  - [Excel 导入](./01-backend/excel-import-requirements/)
  
前端开发：
  - [Vue 最佳实践](./02-frontend/vue-best-practices/)
  - [组件设计](./02-frontend/component-design/)
```

**第 4-5 天：实践应用**
```
- 参与实际功能开发
- 应用所学技能
- 遇到问题时查阅文档
```

---

### 场景 2：功能开发

**步骤 1：需求分析**
```
需求：实现滞港费计算功能

需要技能：
✅ 滞港费计算算法
✅ 日期计算逻辑
✅ 费用明细展示
```

**步骤 2：查找技能**
```bash
# 搜索相关技能
grep -r "demurrage" .lingma/skills/

# 或直接查看技能地图
# → 05-domain/scheduling/demurrage-calculation/
```

**步骤 3：应用技能**
```typescript
// 按照技能文档的示例编写代码
import { calculateDemurrage } from '@/utils/demurrage';

const cost = calculateDemurrage({
  lastFreeDate: container.lastFreeDate,
  plannedPickupDate: container.plannedPickupDate,
  dailyRate: 150
});
```

**步骤 4：代码审查**
```
参考：[代码审查规范](./04-quality/code-review/)
- 检查是否遵循技能规范
- 验证代码示例是否正确
- 确认测试覆盖
```

---

### 场景 3：问题排查

**问题：数据库查询超时**

**步骤 1：定位问题类型**
```
查询耗时 > 30s → 性能问题
→ 查找性能优化技能
```

**步骤 2：查找解决方案**
```bash
# 搜索性能优化
grep -r "性能优化" .lingma/skills/01-backend/

# 或直接查看
# → 01-backend/database-query/SKILL.md#性能优化
```

**步骤 3：应用优化**
```sql
-- 原始查询（慢）
SELECT * FROM containers WHERE ...;

-- 优化后（快）
EXPLAIN ANALYZE
SELECT container_number, eta FROM containers 
WHERE port_code = 'USLAX' 
AND eta >= '2026-03-01';
-- 添加索引：idx_port_eta (port_code, eta)
```

**步骤 4：验证效果**
```
执行 EXPLAIN ANALYZE
确认查询时间从 30s 降至 < 1s
```

---

### 场景 4：代码审查

**审查 PR 时的检查清单**

参考：[代码审查技能](./04-quality/code-review/)

**后端代码审查：**
```markdown
- [ ] 是否遵循数据库查询规范
- [ ] SQL 是否有性能问题
- [ ] 错误处理是否完整
- [ ] 日志记录是否规范
- [ ] 单元测试是否覆盖
```

**前端代码审查：**
```markdown
- [ ] 是否使用 Composition API
- [ ] 组件是否遵循单一职责
- [ ] 模板是否过于复杂
- [ ] 样式是否响应式
- [ ] 测试是否完整
```

---

## 📚 技能文档结构说明

### 标准技能文档包含

```markdown
# 技能名称

简短描述（1-2 句话）

---

## 🎯 核心能力

这个技能能做什么

---

## 📋 使用场景

- 场景 1：什么时候用
- 场景 2：什么时候用

---

## 💡 代码示例

```typescript
// 示例 1：基本用法
const result = doSomething();

// 示例 2：进阶用法
const advanced = doSomethingAdvanced();
```

---

## ⚠️ 注意事项

- 注意点 1
- 注意点 2

---

## 🔗 相关技能

- [相关技能 1](../path/to/skill1/)
- [相关技能 2](../path/to/skill2/)

---

**版本：** v1.0  
**最后更新：** 2026-03-27
```

---

## 🔄 技能更新流程

### 发现文档有问题

**步骤 1：记录问题**
```markdown
问题位置：01-backend/database-query/SKILL.md
问题描述：示例代码有语法错误
建议修复：...
```

**步骤 2：提交 Issue**
```
GitHub Issues → New Issue → 选择"文档修正"模板
```

**步骤 3：或者直接 PR**
```bash
# Fork 项目
# 修改文档
git add .lingma/skills/01-backend/database-query/SKILL.md
git commit -m "docs: 修复数据库查询示例代码"
git push origin fix-docs
# 提交 PR
```

---

### 添加新技能

**步骤 1：确定分类**
```
这个技能属于哪个领域？
- 后端 → 01-backend/
- 前端 → 02-frontend/
- 运维 → 03-devops/
- 质量 → 04-quality/
- 领域 → 05-domain/
```

**步骤 2：创建目录和文件**
```bash
mkdir .lingma/skills/01-backend/new-skill/
touch .lingma/skills/01-backend/new-skill/SKILL.md
```

**步骤 3：编写文档**
```markdown
# 新技能名称

描述...

## 核心能力
...

## 使用场景
...

## 代码示例
...
```

**步骤 4：更新索引**
```markdown
在对应的 README.md 中添加：
| [新技能](./new-skill/) | 说明 | 成熟度 |
```

**步骤 5：提交审核**
```bash
git add .
git commit -m "feat: 添加新技能 - XXX"
git push
# 通知团队审查
```

---

## 🎓 技能学习路径推荐

### 后端开发工程师

```
Week 1: 基础规范
  → [开发范式](./logix-dev-paradigm.md)
  → [数据库查询](./01-backend/database-query/)
  → [代码审查](./04-quality/code-review/)

Week 2: 业务技能
  → [Excel 导入](./01-backend/excel-import-requirements/)
  → [数据验证](./01-backend/data-import-verify/)
  → [滞港费计算](./05-domain/scheduling/demurrage-calculation/)

Week 3: 实战演练
  → 参与实际功能开发
  → 应用所学技能
  → 代码审查实践
```

---

### 前端开发工程师

```
Week 1: 基础规范
  → [开发范式](./logix-dev-paradigm.md)
  → [Vue 最佳实践](./02-frontend/vue-best-practices/)
  → [组件设计](./02-frontend/component-design/)

Week 2: 测试技能
  → [Vue 测试](./02-frontend/vue-testing-best-practices/)
  → [测试指南](./04-quality/testing-guidelines/)

Week 3: 实战演练
  → 组件开发实践
  → 编写单元测试
  → 参与 Code Review
```

---

## 💬 常见问题 FAQ

### Q: 技能文件太多找不到怎么办？

**A:** 使用技能地图！
```
1. 打开 .lingma/skills/00-core/README.md
2. 按分类查找
3. 或使用 Ctrl+F 搜索关键词
```

---

### Q: 两个技能内容有冲突怎么办？

**A:** 查看成熟度评级
```
✅ Recommended > ⚠️ Use with care > 🧪 Experimental

优先选择经过验证的技能
```

---

### Q: 如何知道某个技能是否还在使用？

**A:** 检查以下信息
```
1. 最后更新时间（超过 1 年未更新可能已过时）
2. 成熟度等级（Deprecated 或 Obsolete 表示废弃）
3. 是否有新技能替代（查看"相关技能"部分）
```

---

### Q: 可以修改技能文档吗？

**A:** 当然可以！但需要遵循流程
```
1. 确保修改是必要的
2. 保留历史版本（使用 git 历史）
3. 更新版本号
4. 提交团队审查
```

---

## 📊 使用统计（可选）

如果你想追踪技能文件的使用情况：

### Git 日志分析

```bash
# 查看某个技能的访问历史
git log --follow -- .lingma/skills/01-backend/database-query/

# 查看最常修改的技能
git log --name-only --pretty=format: | 
  grep ".lingma/skills" | 
  sort | uniq -c | sort -rn | head -20
```

### 搜索引擎统计（如果部署了内部搜索）

```
热门搜索词：
1. "数据库查询" - 120 次/月
2. "Vue 组件" - 95 次/月
3. "滞港费" - 80 次/月
```

---

## 🎯 下一步

1. **立即实践** - 选择一个技能开始学习
2. **分享交流** - 在团队会议中讨论
3. **持续改进** - 发现问题及时提出

---

**维护者：** LogiX Team  
**反馈渠道：** GitHub Issues  
**下次更新：** 2026-06-27
