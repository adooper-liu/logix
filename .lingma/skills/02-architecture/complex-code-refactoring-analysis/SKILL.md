# 复杂代码重构分析框架

## 🎯 技能目标

帮助开发者系统化分析复杂代码，制定低风险、高收益的重构方案，避免"为重构而重构"的陷阱。

---

## 📋 使用场景

当遇到以下情况时自动触发此 SKILL：

- 单文件超过 **500 行**且职责不清晰
- 需要重构但不知从何下手
- 团队成员对重构方案有分歧
- 评估重构风险与收益
- 规划长期技术债务清理路线

**典型触发语句**：
- "这个文件太大了，怎么重构？"
- "如何拆分 useGanttLogic.ts？"
- "重构风险太大，有什么建议？"
- "这个模块职责混乱，怎么理清？"

---

## 🔍 分析框架（六步法）

### Step 1: 现状概览（Current State Assessment）

**目标**：量化复杂度，识别已有拆分尝试

**检查清单**：
- [ ] 文件体量：行数、函数数、类数
- [ ] 依赖关系：import 数量、外部依赖类型
- [ ] 已有模块化：是否已有纯函数提取、utils 分离
- [ ] 测试覆盖：是否有单元测试、集成测试
- [ ] 消费方：被哪些模块/组件调用

**输出模板**：
```markdown
## 现状概览

- **体量**：XXX 行，XX 个函数/类
- **依赖**：XX 个 import，涉及 [列举关键依赖]
- **已有拆分**：[列出已存在的模块化尝试]
- **测试覆盖**：[有/无] 单元测试，[有/无] 集成测试
- **主消费方**：[列出主要调用者]
```

---

### Step 2: 职责域映射（Domain Mapping）

**目标**：按职责将代码划分为相对独立的域

**方法**：
1. 扫描注释和函数簇，识别逻辑边界
2. 按**数据流**和**控制流**分组
3. 标记域之间的依赖关系

**输出模板**：
```markdown
## 职责域映射

| 域 | 代表内容 | 行数估算 | 依赖关系 |
|----|---------|---------|---------|
| 域A | 函数X, 函数Y | ~100行 | 无外部依赖 |
| 域B | 函数Z, 状态S | ~200行 | 依赖域A |
| ... | ... | ... | ... |
```

**常见域类型**：
- **纯计算域**：日期计算、格式化、数据转换
- **状态管理域**：ref/reactive 状态、computed
- **副作用域**：API 调用、路由跳转、弹窗
- **UI 交互域**：拖拽、点击、键盘事件
- **业务规则域**：验证逻辑、权限判断、流程控制

---

### Step 3: 复用形态判断（Reuse Pattern Decision）

**目标**：确定每个域的最佳复用形态

**决策树**：
```
有稳定 UI 边界？
  ├─ 是 → Component (.vue)
  │        └─ 通过 props/emits 与父组件通信
  └─ 否 → 是纯函数吗？
           ├─ 是 → Utils Module (.ts)
           │        └─ 零 Vue 依赖，易测试
           └─ 否 → Composable (useXxx.ts)
                    └─ 包含状态/副作用，可组合
```

**判断标准**：

| 特征 | Component | Composable | Utils |
|------|-----------|------------|-------|
| 有模板/UI | ✅ | ❌ | ❌ |
| 有状态 (ref) | ✅ | ✅ | ❌ |
| 有副作用 (API) | ⚠️ | ✅ | ❌ |
| 纯计算 | ❌ | ⚠️ | ✅ |
| 可独立测试 | ⚠️ | ✅ | ✅ |
| 可多处复用 | ⚠️ | ✅ | ✅ |

**输出模板**：
```markdown
## 复用形态判断

| 域 | 推荐形态 | 理由 |
|----|---------|------|
| 域A | Utils | 纯函数，零 Vue 依赖 |
| 域B | Composable | 包含状态和 API 调用 |
| 域C | Component | 有稳定 UI 边界 |
```

---

### Step 4: 拆分优先级排序（Priority Ranking）

**目标**：按风险由低到高排序，制定分阶段计划

**优先级原则**：
1. **零依赖优先**：纯函数 > Composable > 复杂域
2. **小依赖面优先**：依赖少的域先拆
3. **高收益优先**：修复 TS 错误、提升可测试性
4. **低风险优先**：不影响核心业务流程

**输出模板**：
```markdown
## 拆分优先级（风险由低到高）

### Phase 1: 纯函数提取（立即执行）
- **目标域**：[域A, 域B]
- **预期收益**：减少 XX 行，易测试，修复 TS 错误
- **预计工作量**：X 小时
- **风险等级**：🟢 低

### Phase 2: 独立 Composable（本周完成）
- **目标域**：[域C]
- **预期收益**：解耦 XX 逻辑，可单独开关
- **预计工作量**：X 小时
- **风险等级**：🟡 中

### Phase 3: 复杂域拆分（下周规划）
- **目标域**：[域D, 域E]
- **难点**：[列出具体难点]
- **前置条件**：[需要先完成的工作]
- **风险等级**：🔴 高

### Phase 4: Orchestrator 组装（最后整合）
- **目标**：原文件变为组装层
- **工作内容**：调用子 Composable，暴露统一接口
- **风险等级**：🟡 中（依赖前序阶段质量）
```

---

### Step 5: 风险预判与防御（Risk Mitigation）

**目标**：提前识别重构陷阱，设计防御机制

**常见风险与对策**：

| 风险 | 表现 | 防御策略 |
|------|------|---------|
| **循环依赖** | A 调 B，B 调 A | 回调注入、事件总线、统一 orchestrator |
| **共享状态混乱** | 多处维护同一份数据 | 明确归属：最外层维护，子模块通过 Ref/getter 访问 |
| **外部依赖渗透** | 路由/Store 到处使用 | 限定使用范围：只在 orchestrator 或数据加载层使用 |
| **接口不一致** | 子模块返回类型不统一 | 先定义 TypeScript 接口，再实现 |
| **测试缺失** | 重构后无法验证 | 先补测试，再重构；或重构同时写测试 |

**输出模板**：
```markdown
## 风险预判与防御

### 风险 1: 循环依赖
- **场景**：[描述具体场景]
- **对策**：使用回调注入，例如 `onAfterPatch: () => triggerCostOptimization(...)`

### 风险 2: 共享状态归属不清
- **场景**：`containers` 列表在多处维护
- **对策**：统一在最外层 orchestrator 维护，子模块接收 `Ref<Container[]>`

### 风险 3: [其他风险]
- **场景**：...
- **对策**：...
```

---

### Step 6: 结论与下一步（Conclusion & Next Steps）

**目标**：给出明确结论和可执行的下一步

**输出模板**：
```markdown
## 总结回答

### 是否值得重构？
**结论**：[是/否/部分]
**理由**：
- 收益：[列出主要收益]
- 成本：[列出主要成本]
- ROI：[高/中/低]

### 怎么重构？
**核心策略**：[一句话总结，例如"多 composable + utils，组件层只保留展示壳"]

### 下一步行动
1. **立即执行**：[Phase 1 的具体任务]
2. **本周完成**：[Phase 2 的具体任务]
3. **需要确认**：[需要向团队确认的问题]

### 可选深化
如果需要落地到具体代码，可以提供：
- 具体文件列表与目录结构
- Export 形状（函数签名）
- 最小拆分 PR 草图
```

---

## 🛠️ 工具与技巧

### 技巧 1: 依赖图可视化

使用工具生成依赖图，直观看到耦合关系：
```bash
# 示例：使用 madge 生成依赖图
npx madge --image dependency-graph.png src/components/common/gantt/useGanttLogic.ts
```

### 技巧 2: 增量重构验证

每完成一个 Phase，立即验证：
```bash
# 运行类型检查
npm run type-check

# 运行相关测试
npm run test -- useGanttLogic

# 手动测试核心功能
# [列出需要手动测试的功能点]
```

### 技巧 3: Git 分支策略

- **主分支**：保持可发布状态
- **重构分支**：`refactor/xxx-phase1`、`refactor/xxx-phase2`
- **每阶段合并前**：Code Review + 自动化测试通过

### 技巧 4: 「拆一块、验一块」备份对照（无损核对）

**核心原则**：**每次只拆分一个域，立即验证，确保零偏差**

**操作流程**：

#### Step 1: 备份原文件
```bash
# 在开始每个 Phase 前，先备份原文件
cp src/components/common/gantt/useGanttLogic.ts \
   src/components/common/gantt/useGanttLogic.ts.backup.phase1

# 或使用 Git tag 标记
git tag refactor-before-phase1
git commit -m "backup: before phase 1 refactoring"
```

#### Step 2: 提取单个域
```typescript
// ✅ 正确：一次只提取一个域
// Phase 1: 只提取纯函数
cp dateRangeUtils.ts dateRangeUtils.ts.new
// 修改 useGanttLogic.ts，删除已提取的函数
// 导入新模块
import { calculateDateRange } from './dateRangeUtils'
```

#### Step 3: 无损核对（Diff 对比）
```bash
# 方法 1: Git Diff（推荐）
git diff HEAD -- src/components/common/gantt/useGanttLogic.ts

# 方法 2: 文件对比工具
code --diff \
  src/components/common/gantt/useGanttLogic.ts.backup.phase1 \
  src/components/common/gantt/useGanttLogic.ts

# 方法 3:  checksum 验证（确保功能等价）
# 运行相同输入，对比输出
npm run test -- useGanttLogic
```

#### Step 4: 验证清单
- [ ] **类型检查通过**: `npm run type-check` 无新增错误
- [ ] **单元测试通过**: 相关测试全部 green
- [ ] **功能等价**: 手动测试核心功能，行为一致
- [ ] **无回归**: 其他模块不受影响
- [ ] **代码审查**: 至少一人 Review 通过

#### Step 5: 提交或回滚
```bash
# ✅ 验证通过：提交并删除备份
git add .
git commit -m "refactor: extract dateRangeUtils (phase 1)"
rm src/components/common/gantt/useGanttLogic.ts.backup.phase1

# ❌ 验证失败：立即回滚
git checkout HEAD -- src/components/common/gantt/useGanttLogic.ts
# 分析问题，修复后重试
```

**关键要点**：
1. **原子性**: 每次只改一个域，不要同时提取多个
2. **可回滚**: 保留备份直到验证通过
3. **自动化**: 用脚本自动化备份和对比流程
4. **文档化**: 记录每次拆分的 Diff 和验证结果

**自动化工具示例** (`scripts/refactor-backup.sh`):
```bash
#!/bin/bash
# 用法: ./refactor-backup.sh useGanttLogic phase1

FILE=$1
PHASE=$2
BACKUP="${FILE}.ts.backup.${PHASE}"

# 备份
cp "${FILE}.ts" "$BACKUP"
echo "✅ Backup created: $BACKUP"

# 提示下一步
echo "📝 Now extract the domain and run validation"
echo "   After validation, run: ./refactor-verify.sh $FILE $PHASE"
```

---

## 📚 参考案例

### 案例 1: useGanttLogic.ts 重构分析

**背景**：2000+ 行单文件，包含拖拽、成本优化、预警等 9 个域

**分析结果**：
- **Phase 1**：提取纯函数（还箱日 merge、日期计算）→ `gantt/dateRangeUtils.ts`
- **Phase 2**：提取 `useGanttAlerts` → 预警逻辑独立
- **Phase 3**：提取 `useGanttCostOptimization` → 成本优化可单独测
- **Phase 4**：提取 `useGanttDragAndUpdate` → 最难，最后处理
- **Phase 5**：原文件变为 orchestrator，组装各子模块

**收益**：
- TS 错误从 35+ 降到 0
- 可测试性大幅提升
- 新成员上手时间从 2 周降到 3 天

---

## ⚠️ 注意事项

### 不要做的事

1. ❌ **不要一次性重构整个文件**：分阶段，每阶段可独立验证
2. ❌ **不要为了重构而重构**：必须有明确收益（修复错误、提升可维护性等）
3. ❌ **不要忽视测试**：重构前后都要有测试保障
4. ❌ **不要强行组件化**：没有 UI 边界的逻辑用 Composable/Utils

### 要做的事

1. ✅ **先画清状态与调用链**：再动刀
2. ✅ **小步快跑**：每步都可回滚
3. ✅ **文档同步更新**：重构后更新架构文档
4. ✅ **团队共识**：重构前与团队对齐方案

---

## 🎓 学习资源

- **书籍**：《重构：改善既有代码的设计》（Martin Fowler）
- **文章**：Composable vs Component 选择指南
- **工具**：madge（依赖图）、ts-prune（未使用代码检测）

---

## 🔄 持续改进

每次重构完成后，回顾：
- [ ] 实际工作量 vs 预估工作量
- [ ] 遇到的意外问题
- [ ] 哪些做得好，哪些可以改进
- [ ] 更新本 SKILL 的经验教训章节

---

**版本**: v1.0  
**创建时间**: 2026-04-10  
**作者**: LogiX 开发团队  
**状态**: 强制执行
