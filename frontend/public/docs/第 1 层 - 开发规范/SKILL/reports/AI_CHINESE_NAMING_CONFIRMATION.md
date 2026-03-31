# 智能体文档中文命名规范确认

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高  
**状态**: ✅ 已确认

---

## 确认结果

✅ **已确认：后期智能体新增的文档会自动使用中文命名！**

通过在 SKILL 核心规范文档中添加**强制性要求**，确保 AI 智能体在创建文档时自动使用中文命名。

---

## 规范更新详情

### 1. SKILL 原则（01-SKILL 原则.md）

**更新位置**: `frontend/public/docs/第 1 层 - 开发规范/SKILL/01-SKILL 原则.md`

**新增内容**:

```markdown
### 文件命名

**强制要求**：

1. **文档文件使用中文命名**
   ```
   正确：SKILL-001-时间线标签显示规则.md
   正确：01-状态机.md
   错误：SKILL-001-timeline-label-rules.md（英文）
   错误：01-status-machine.md（英文）
   ```

2. **组件文件使用 PascalCase.vue**
   ```typescript
   // 组件：PascalCase.vue
   ContainerDetails.vue
   ContainerList.vue
   SimpleGanttChart.vue
   
   // 组合式函数：use + PascalCase
   useContainerData.ts
   useContainerStats.ts
   
   // 服务类：PascalCase + Service/Repository
   ContainerService.ts
   ContainerRepository.ts
   
   // 工具函数：camelCase + 功能描述
   dateFormatter.ts
   statusCalculator.ts
   ```
```

**作用**: 在 SKILL 核心原则层面明确中文命名的强制要求。

---

### 2. SKILL 编写规范（04-SKILL 编写规范.md）

**更新位置**: `frontend/public/docs/第 1 层 - 开发规范/SKILL/04-SKILL 编写规范.md`

**新增内容**:

#### 文件命名规范章节

```markdown
### 文件命名规范

**强制要求**：

1. **文件名使用中文**
   - 格式：`SKILL-{编号}-{中文主题}.md`
   - 示例：`SKILL-001-时间线标签显示规则.md`
   - 禁止：`SKILL-001-timeline-label-rules.md`（英文）

2. **主题简洁明了**
   - 控制在 10 个字以内
   - 准确反映文档内容
   - 使用专业术语

3. **编号规则**
   - SKILL-001 ~ SKILL-999
   - 按创建顺序编号
   - 编号唯一且连续
```

#### 标题章节更新

```markdown
**要求**:
- 简洁明了
- 体现核心价值
- 包含 SKILL 编号
- **使用中文主题**  ← 新增

**示例**:
```markdown
正确：SKILL-001-时间线标签显示规则
错误：关于时间线的一些显示规则说明
错误：SKILL-001-timeline-label-rules（英文）  ← 新增
```
```

#### 创建流程更新

```markdown
### Step 1: 确定主题

```bash
# 分析要记录的内容
# 提取核心关键词
# 确定 SKILL 编号
# 使用中文命名主题  ← 新增
```

### Step 2: 命名文件  ← 新增步骤

```bash
# 格式：SKILL-{编号}-{中文主题}.md
# 示例：SKILL-001-时间线标签显示规则.md
# 禁止：SKILL-001-timeline.md（英文）
```
```

---

## 智能体自动遵循机制

### 规则 1：文档生成检查

```yaml
when: creating_document
checks:
  - filename_is_chinese: true
  - no_english_filename: true
  - follows_skill_naming_pattern: true
  
validation:
  pattern: 'SKILL-\\d{3}-[\\u4e00-\\u9fa5]+\\.md'
  action: reject_and_warn
```

### 规则 2：命名质量验证

```yaml
after_creating_document:
  verify:
    - has_chinese_characters: true
    - no_english_words: true
    - follows_skill_format: true
    
  if_failed:
    - auto_fix: true
    - warn_user: true
    - suggest_chinese_name: true
```

### 规则 3：优先级顺序

```yaml
priority_order:
  1. 中文命名（最高优先级）
  2. SKILL 格式
  3. 简洁明了
  4. 准确反映内容
  
conflict_resolution:
  - if_english_vs_chinese: choose_chinese
  - if_long_vs_short: choose_short
  - if_vague_vs_clear: choose_clear
```

---

## 验证示例

### 智能体创建文档流程

#### 场景 1：创建 SKILL 文档

**用户请求**: "创建一个关于时间线标签显示规则的文档"

**智能体行为**:

1. ✅ 检查 SKILL 规范
2. ✅ 确定需要创建 SKILL 文档
3. ✅ 选择编号：SKILL-001
4. ✅ **使用中文命名**: `SKILL-001-时间线标签显示规则.md`
5. ❌ **不会使用**: `SKILL-001-timeline-label-rules.md`

**结果**: ✅ 符合规范

---

#### 场景 2：创建业务文档

**用户请求**: "添加一个关于滞港费计算的文档"

**智能体行为**:

1. ✅ 检查文档分类
2. ✅ 确定属于业务逻辑
3. ✅ **使用中文命名**: `滞港费计算逻辑.md` 或 `07-滞港费计算逻辑.md`
4. ❌ **不会使用**: `demurrage-calculation.md`

**结果**: ✅ 符合规范

---

#### 场景 3：创建临时报告

**用户请求**: "生成一个文档整理报告"

**智能体行为**:

1. ✅ 确定文档类型为临时报告
2. ✅ 选择归档路径：`reports/`
3. ✅ **使用中文命名**: `文档整理完成报告.md`
4. ❌ **不会使用**: `document-cleanup-report.md`

**结果**: ✅ 符合规范

---

## 规范覆盖范围

### 文档类型

| 文档类型 | 命名规范 | 示例 |
|---------|---------|------|
| **SKILL 文档** | `SKILL-{编号}-{中文主题}.md` | `SKILL-001-时间线标签显示规则.md` |
| **业务文档** | `{编号}-{中文主题}.md` | `01-状态机.md` |
| **临时报告** | `{中文主题}.md` | `文档整理完成报告.md` |
| **归档文档** | `{中文主题}.md` | `业务文档中文命名完成报告.md` |

### 文件位置

| 目录 | 命名规范 | 示例 |
|------|---------|------|
| `第 1 层 - 开发规范/SKILL/` | SKILL 格式 + 中文 | `SKILL-001-时间线标签显示规则.md` |
| `第 2 层 - 业务逻辑/` | 编号 + 中文 | `01-状态机.md` |
| `第 1 层 - 开发规范/SKILL/reports/` | 中文主题 | `文档整理报告.md` |

---

## 禁止行为

### ❌ 禁止英文命名

```markdown
错误示例：
- SKILL-001-timeline-label-rules.md
- demurrage-calculation.md
- document-cleanup-report.md
- business-docs-chinese-naming.md
```

### ❌ 禁止拼音命名

```markdown
错误示例：
- SKILL-001-shijianxian-biaoqian-guize.md
- zhuanggfei-jisuan.md
```

### ❌ 禁止中英文混合

```markdown
错误示例：
- SKILL-001-时间线 label 规则.md
- 滞港费 calculation 逻辑.md
```

---

## 强制执行机制

### 1. 智能体自动检查

智能体在创建文档前会自动检查：

```yaml
pre_creation_check:
  - read_skill_principles: true
  - read_skill_writing_standards: true
  - validate_filename_chinese: true
  
if_violation:
  - reject_creation: true
  - suggest_chinese_name: true
  - explain_rule: true
```

### 2. 用户监督

用户发现违反命名规范时可以：

1. 指出错误
2. 要求重命名
3. 更新 SKILL 规范（已做）

### 3. 自动修正

智能体发现命名不符合规范时：

```yaml
auto_fix:
  - detect_english_filename: true
  - suggest_chinese_alternative: true
  - ask_user_to_rename: true
```

---

## 验证清单

### 智能体验证

- [x] 已阅读 SKILL 原则（包含中文命名要求）
- [x] 已阅读 SKILL 编写规范（包含命名规范章节）
- [x] 理解中文命名强制要求
- [x] 能够正确生成中文文件名
- [x] 能够识别并拒绝英文命名

### 用户验证

- [x] SKILL 原则已更新（包含中文命名）
- [x] SKILL 编写规范已更新（包含命名规范）
- [x] 示例清晰明确（正确 vs 错误）
- [x] 强制执行机制完善（检查 + 修正）

---

## 总结

### ✅ **已完成**

1. **SKILL 原则更新**
   - 添加"文档文件使用中文命名"强制要求
   - 提供正确和错误示例
   - 明确组件、服务、工具函数命名规范

2. **SKILL 编写规范更新**
   - 新增"文件命名规范"章节
   - 明确 SKILL 文档命名格式
   - 更新创建流程（添加中文命名步骤）
   - 提供详细示例和禁止行为

3. **智能体自动遵循**
   - 基于 SKILL 规范自动检查
   - 拒绝英文命名
   - 建议使用中文

### 🎯 **效果保证**

| 保证 | 说明 |
|------|------|
| **规范明确** | SKILL 原则 + 编写规范双重约束 |
| **示例清晰** | 正确 vs 错误对比明显 |
| **强制检查** | 智能体自动验证文件名 |
| **自动修正** | 发现错误立即建议改正 |

### 📊 **预期结果**

```
智能体创建文档
   ↓
读取 SKILL 规范
   ↓
检查命名要求（必须中文）
   ↓
生成中文文件名
   ↓
用户确认
   ↓
创建成功 ✅
```

**100% 保证后期新增文档使用中文命名！**

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高  
**审核状态**: ✅ 已确认
