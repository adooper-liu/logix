# 📋 archive_temp 文档整理速查卡

**版本**: v1.0  
**更新日期**: 2026-03-29  
**适用对象**: 文档整理人员

---

## 🎯 **一分钟了解**

### 这是什么？

`docs/_archive_temp/` 包含 **342 篇**归档文档，需要系统整理到 `docs/00-开发范式案例库/`

### 为什么要整理？

- ✅ 消除重复（30% 重复率）
- ✅ 建立统一分类体系
- ✅ 提升查找效率
- ✅ 沉淀知识资产

### 整理原则

```
🔥 高价值文档（50 篇）→ P0 优先级
⭐ 中价值文档（45 篇）→ P1 优先级
📦 低价值文档（115 篇）→ P2 优先级（标记归档即可）
```

---

## 📊 **文档分布速览**

| 类别 | 数量 | 位置 | 优先级 |
|------|------|------|--------|
| 💰 **成本优化** | 35 篇 | 根目录 + Phase3/ | P0 |
| 🐛 **Bug 修复** | 27 篇 | 根目录 + Phase3/ | P0 |
| 🗄️ **TimescaleDB** | 11 篇 | 根目录 | P0 |
| 📚 **Phase3 实施** | 131 篇 | Phase3/ | P1 |
| 📜 **旧项目文档** | 33 篇 | project-old/ | P1 |
| 🎨 **前端旧文档** | 39 篇 | frontend-old-docs/ | P1 |
| 📦 **其他归档** | 66 篇 | 各子目录 | P2 |

---

## 🚀 **快速上手指南**

### Step 1: 确定文档类型

```markdown
看到文档 → 问自己：这是什么类型？

💰 讲成本优化的？ 
  → 移到 06-成本优化案例/

🐛 讲 Bug 修复的？
  → 移到 05-Bug 修复案例/

🗄️ 讲数据迁移的？
  → 移到 07-数据迁移案例/

🏗️ 讲架构设计的？
  → 移到 02-架构设计案例/

💻 讲前端开发的？
  → 移到 03-前端开发案例/

⚙️ 讲后端开发的？
  → 移到 04-后端开发案例/
```

### Step 2: 按规范重命名

```markdown
格式：分类前缀 - 描述名称【中文说明】.md

示例:
❌ 成本优化日期错误修复报告.md
✅ 案例 - 成本优化日期错误修复.md

❌ 深度分析 - 智能排产成本优化功能重构方案.md
✅ 方案 - 智能排产成本优化重构设计.md

❌ 智能排产成本优化 - 实施清单.md
✅ 清单 - 智能排产成本优化实施.md
```

### Step 3: 放入正确位置

```bash
# PowerShell 移动示例
cd docs/_archive_temp

# 移动成本优化文档
Move-Item "成本优化*.md" "../00-开发范式案例库/06-成本优化案例/" -Force

# 移动 Bug 修复文档
Move-Item "*修复报告*.md" "../00-开发范式案例库/05-Bug 修复案例/" -Force

# 移动 TimescaleDB 文档
Move-Item "TimescaleDB*.md" "../00-开发范式案例库/07-数据迁移案例/" -Force
```

---

## 📋 **核心文档清单（Top 20）**

### 必须优先整理的文档 ⭐⭐⭐

#### 成本优化（8 篇）

```markdown
1. 深度分析 - 智能排产成本优化功能重构方案.md (53KB)
   → 方案 - 智能排产成本优化重构设计.md

2. 智能排产成本优化 - 实施清单.md (27.4KB)
   → 清单 - 智能排产成本优化实施.md

3. 单柜与批量优化方案评审报告.md (16KB)
   → 评审 - 单柜与批量优化方案.md

4. 智能批量成本优化方案设计.md (23.7KB)
   → 方案 - 智能批量成本优化设计.md

5. 成本优化逻辑问题深度分析.md (16.5KB)
   → 案例 - 成本优化逻辑问题分析.md

6. 成本优化流程详细分析.md (23.9KB)
   → 分析 - 成本优化流程详解.md

7. 成本优化日期错误修复报告.md (11.5KB)
   → 案例 - 成本优化日期错误修复.md

8. 最终测试验证报告 - 智能排产成本优化功能.md (12.8KB)
   → 测试 - 智能排产成本优化验证.md
```

#### Bug 修复（6 篇）

```markdown
9. 修复报告 - 计划日期列缺少卸柜日期.md (6.6KB)
   → 案例 - 卸柜日期字段缺失修复.md

10. 修复报告 - 优化功能缺少必要参数.md (8.1KB)
    → 案例 - 优化功能参数缺失修复.md

11. 紧急修复报告 - SchedulingVisual.vue 样式重复问题.md (7.4KB)
    → 案例 - Vue 组件样式重复修复.md

12. ECharts 图表溢出问题修复报告.md (9.8KB)
    → 案例 - ECharts 图表溢出修复.md

13. 后端数据修复报告 - 成本优化 breakdown 返回.md (14.6KB)
    → 案例 - 成本优化 breakdown 数据修复.md

14. 类型通用化修复报告 - CostTrendChart.md (12.7KB)
    → 案例 - CostTrendChart 类型通用化修复.md
```

#### TimescaleDB（6 篇）

```markdown
15. TimescaleDB 迁移成功报告.md (9.3KB)
    → 报告 - TimescaleDB 迁移成功.md

16. TimescaleDB 迁移执行清单.md (11.6KB)
    → 清单 - TimescaleDB 迁移执行步骤.md

17. TimescaleDB 迁移最终方案.md (9.9KB)
    → 方案 - TimescaleDB 迁移最终方案.md

18. TimescaleDB 迁移问题诊断.md (9.3KB)
    → 案例 - TimescaleDB 迁移问题诊断.md

19. TimescaleDB 迁移 - 紧急修复指南.md (7.2KB)
    → 指南 - TimescaleDB 迁移紧急修复.md

20. TimescaleDB 迁移指南.md (7.8KB)
    → 参考 - TimescaleDB 迁移技术指南.md
```

---

## 🔧 **常用命令速查**

### 文件操作

```powershell
# 1. 查看某类文档
Get-ChildItem -Recurse | Where-Object { $_.Name -match "成本优化" }

# 2. 统计文档大小
Get-ChildItem -Recurse -File | Measure-Object -Property Length -Sum

# 3. 移动文档
Move-Item "源文件名.md" "目标路径/" -Force

# 4. 批量移动
Get-ChildItem "*成本优化*.md" | Move-Item -Destination "06-成本优化案例/" -Force

# 5. 重命名
Rename-Item "旧名称.md" "新名称.md"
```

### 内容搜索

```powershell
# 1. 搜索包含特定内容的文档
grep -r "智能排产成本优化" --include="*.md" -l

# 2. 查找重复内容
grep -r "lastFreeDate" --include="*.md" -l

# 3. 统计文档行数
Get-ChildItem -Recurse -File | Get-Content | Measure-Object -Line
```

### 质量检查

```powershell
# 1. 检查命名规范性
Get-ChildItem -Recurse | Where-Object { $_.Name -notmatch "^(索引 | 指南 | 专题 | 核心 | 报告 | 案例 | 方案 | 清单)-" }

# 2. 查找大文件（>30KB）
Get-ChildItem -Recurse -File | Where-Object { $_.Length -gt 30KB }

# 3. 查找短文档（<3KB）
Get-ChildItem -Recurse -File | Where-Object { $_.Length -lt 3KB }
```

---

## 📊 **整理进度跟踪**

### 总体进度

```
总文档数：342 篇
已完成：0 篇 (0%)
进行中：0 篇
待处理：342 篇
```

### 分类进度

| 分类 | 总数 | 已完成 | 进行中 | 待处理 | 进度 |
|------|------|--------|--------|--------|------|
| 成本优化 | 35 | 0 | 0 | 35 | 0% |
| Bug 修复 | 27 | 0 | 0 | 27 | 0% |
| TimescaleDB | 11 | 0 | 0 | 11 | 0% |
| Phase3 | 131 | 0 | 0 | 131 | 0% |
| 旧项目 | 33 | 0 | 0 | 33 | 0% |
| 前端旧文档 | 39 | 0 | 0 | 39 | 0% |
| 其他 | 66 | 0 | 0 | 66 | 0% |

### 每日目标

```markdown
Day 1 (今天):
  □ 完成成本优化专题（35 篇）
  □ 更新索引
  预计耗时：8h

Day 2:
  □ 完成 Bug 修复案例（27 篇）
  □ 完成 TimescaleDB 迁移（11 篇）
  预计耗时：6h

Day 3:
  □ Phase3 精华提取（20 篇）
  □ 质量审查
  预计耗时：7h

Day 4-5:
  □ 剩余文档归档（115 篇）
  □ 最终检查
  预计耗时：12h
```

---

## ⚠️ **常见陷阱**

### 陷阱 1: 命名不规范

```markdown
❌ 错误：
  - 成本优化文档.md (无分类前缀)
  - 修复 Bug.md (太模糊)

✅ 正确：
  - 案例 - 成本优化逻辑问题分析.md
  - 案例 - Vue 组件类型冲突修复.md
```

### 陷阱 2: 分类不明确

```markdown
问题：这篇文档既像成本优化又像 Bug 修复

解决：
1. 看主要内容（>50% 篇幅讲什么）
2. 看文档标题（原标题倾向）
3. 看实际价值（哪边价值更大）
```

### 陷阱 3: 上下文不够

```markdown
问题：不知道这篇文档的背景

解决：
1. 先读 ARCHIVE_MANIFEST.md
2. 查看 DOCUMENT_INDEX.md
3. 搜索相关文档对照
```

---

## 💡 **提效技巧**

### 技巧 1: 批量处理

```powershell
# 一次性移动所有成本优化文档
Get-ChildItem *成本优化*.md | Move-Item -Destination "06-成本优化案例/"

# 批量重命名（使用正则）
Get-ChildItem *修复报告*.md | ForEach-Object {
    $newName = $_.Name -replace "修复报告", "案例"
    Rename-Item $_.FullName $newName
}
```

### 技巧 2: 模板化

```markdown
创建重命名模板:

成本优化:
  "成本优化*.md" → "案例 - 成本优化*.md"
  "深度分析 - 成本优化*.md" → "方案 - 成本优化*.md"

Bug 修复:
  "*修复报告*.md" → "案例 - *.md"
  "紧急修复*.md" → "案例 - 紧急修复*.md"
```

### 技巧 3: 并行处理

```markdown
两人协作:
  A: 负责移动和重命名
  B: 负责检查和更新索引

三人协作:
  A: 成本优化专题
  B: Bug 修复专题
  C: TimescaleDB 专题
```

---

## 📞 **获取帮助**

### 自助服务

```markdown
1. 查看完整分析报告:
   → 分析-archive_temp 文档遍历与分析报告.md

2. 查看整理清单:
   → 文档整理清单.md

3. 查看命名规范:
   → 规范 - 文档命名规则.md

4. 查看使用指南:
   → README.md
```

### 联系团队

```markdown
- Slack: #dev-paradigm
- 邮箱：tech-committee@logix.com
- 办公时间：每周一、三、五下午 2:00-4:00
```

---

## 🎯 **质量标准**

### 整理完成后检查

```markdown
□ 所有文档都已移动到正确分类
□ 所有文档都按规范重命名
□ 索引文档已更新
□ 没有遗漏的文档
□ 没有重复的文档
□ 文档链接都正确
```

### 验收标准

```markdown
✅ 完整性：100% 文档都已整理
✅ 准确性：100% 文档都在正确位置
✅ 规范性：100% 文档都符合命名规范
✅ 可用性：索引导航清晰可用
```

---

## 🚀 **立即开始**

### 3 分钟快速启动

```markdown
1. 打开终端
   cd docs/_archive_temp

2. 查看第一个要整理的文档
   Get-ChildItem *成本优化*.md | Select-Object -First 1

3. 确定分类和命名
   参考本速查卡的"核心文档清单"

4. 执行移动和重命名
   Move-Item "文件名.md" "../00-开发范式案例库/06-成本优化案例/" -Force
   Rename-Item "文件名.md" "新名称.md"

5. 记录进度
   在进度表中打勾 ✅
```

### 30 分钟深度学习

```markdown
1. 阅读完整分析报告（15 分钟）
   → 分析-archive_temp 文档遍历与分析报告.md

2. 学习命名规范（10 分钟）
   → 规范 - 文档命名规则.md

3. 练习 3 篇文档整理（5 分钟）
   → 实际操作
```

---

**维护者**: LogiX 技术委员会  
**最后更新**: 2026-03-29  
**反馈渠道**: GitHub Issues / Slack #dev-paradigm

**开始整理吧！** 🎉
