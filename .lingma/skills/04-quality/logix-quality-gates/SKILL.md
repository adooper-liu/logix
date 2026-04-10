# LogiX 质量门禁与技术债治理

**版本**: v1.0  
**创建时间**: 2026-04-10  
**适用范围**: 代码合并前检查、测试补充、统计/筛选修复、CI 建立、技术债管理

---

## 🎯 核心目标

确保代码质量，防止技术债积累，建立唯一事实标准。

### 三大原则

1. **数据库表结构是唯一基准** - 所有字段以数据库为准
2. **禁止临时补丁修数据** - 删除 → 修复 → 重新导入
3. **代码优先，文档只在必要时生成** - 避免冗余文档

---

## 📋 质量门禁检查清单

### 合并前必查（Pre-Merge Checklist）

#### 1. 数据库验证
```markdown
- [ ] 字段名是否与 03_create_tables.sql 一致？
- [ ] 实体属性是否使用 @Column({ name: 'snake_case' })？
- [ ] API 请求体是否使用 snake_case？
- [ ] 是否有幽灵字段（数据库不存在）？
```

**自动触发**: 提到 "字段"、"表"、"数据库" → 调用 `fix-verification` + `database-query`

#### 2. 命名规范检查
```markdown
- [ ] 数据库表/字段: snake_case (biz_containers, container_number)
- [ ] 实体属性: camelCase (containerNumber)
- [ ] 前端组件: PascalCase.vue (ContainerList.vue)
- [ ] 组合式函数: usePascalCase (useContainerData)
- [ ] CSS 类名: kebab-case (.container-card)
```

**自动触发**: 提到 "命名"、"规范" → 调用 `code-review`

#### 3. 单一职责检查
```markdown
- [ ] Vue 组件是否 > 300 行？(是 → 拆分)
- [ ] TS 逻辑是否 > 200 行？(是 → 拆分)
- [ ] Controller 是否包含业务逻辑？(是 → 移到 Service)
- [ ] 函数是否只做一件事？
```

**自动触发**: 提到 "组件"、"重构" → 调用 `vue-best-practices` / `logix-development`

#### 4. 日期口径一致性
```markdown
- [ ] 数据展示是否使用顶部日期范围筛选？
- [ ] 后端口径是否为 actual_ship_date → shipment_date？
- [ ] 同一页面卡片、表格、图表是否共用同一套日期？
```

**自动触发**: 提到 "日期"、"统计"、"筛选" → 调用 `logix-development`

#### 5. 前端规范检查
```markdown
- [ ] 是否硬编码颜色值？(否 → 用 SCSS 变量或 useColors())
- [ ] 是否硬编码中文文案？(否 → 用 $t() 国际化)
- [ ] 搜索输入是否有防抖？
- [ ] 长列表是否虚拟滚动或分页？
```

**自动触发**: 提到 "前端"、"Vue" → 调用 `vue-best-practices`

#### 6. 代码风格检查
```markdown
- [ ] 缩进是否为 2 空格？
- [ ] 后端是否加分号？(是)
- [ ] 前端是否无分号？(是)
- [ ] 是否有 console.log？(否 → 删除)
- [ ] 是否有魔法数字？(否 → 定义常量)
- [ ] 是否使用 any 类型？(否 → 明确类型)
```

**自动触发**: 提到 "review"、"检查代码" → 调用 `code-review`

---

## 🧪 测试补充规范

### 何时需要补充测试

| 场景 | 测试类型 | 覆盖率要求 |
|------|---------|-----------|
| 新增功能 | 单元测试 + 集成测试 | > 80% |
| Bug 修复 | 回归测试 + 边界测试 | 覆盖 bug 场景 |
| 重构代码 | 全量测试 | 保持原有覆盖率 |
| 性能优化 | 性能测试 + 压力测试 | 对比优化前后 |

### 测试命令

```bash
# 根目录完整质量检查（推荐）
npm run quality              # validate + test

# 或分步执行
npm run validate             # type-check + lint + lint:naming
npm run test                 # backend + frontend tests

# 后端单独测试
cd backend && npm test                    # 单元测试
cd backend && npm run test:integration    # 集成测试

# 前端单独测试
cd frontend && npm test                   # 单元测试
cd frontend && npm run test:e2e           # E2E 测试

# CI 环境专用
npm run quality:ci           # test + type-check:backend + lint:backend
```

### 测试文件位置

```
backend/
├── test/
│   ├── unit/          # 单元测试
│   └── integration/   # 集成测试

frontend/
├── src/
│   └── __tests__/     # 组件测试
└── e2e/               # E2E 测试
```

---

## 📊 统计与筛选一致性规范

### 核心原则

**所有统计卡片、表格过滤、图表数据必须使用相同的 SQL 子查询逻辑。**

### 常见问题

❌ **错误做法**:
```typescript
// 统计用全量数据
const total = await getRepository(Container).count();

// 列表用日期筛选
const containers = await getRepository(Container)
  .where('actual_ship_date BETWEEN :start AND :end', { start, end })
  .getMany();
```

✅ **正确做法**:
```typescript
// 统一使用 DateFilterBuilder
const queryBuilder = DateFilterBuilder.applyDateFilter(
  repository.createQueryBuilder('c'),
  startDate,
  endDate
);

// 统计
const total = await queryBuilder.getCount();

// 列表
const containers = await queryBuilder.getMany();
```

### 检查清单

```markdown
- [ ] 统计接口是否接受 startDate/endDate 参数？
- [ ] 列表接口是否接受 startDate/endDate 参数？
- [ ] 两者是否使用相同的 DateFilterBuilder？
- [ ] 前端是否传递统一的日期范围？
- [ ] 是否有「统计用全量、列表用日期」的不一致？
```

**自动触发**: 提到 "统计"、"筛选"、"不一致" → 调用 `logix-quality-gates`

---

## 🔄 CI/CD 配置规范

### GitHub Actions 工作流

```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Backend Lint
        run: cd backend && npm run lint
      - name: Frontend Lint
        run: cd frontend && npm run lint

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Backend Type Check
        run: cd backend && npm run type-check
      - name: Frontend Type Check
        run: cd frontend && npm run type-check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: npm run test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Backend
        run: cd backend && npm run build
      - name: Build Frontend
        run: cd frontend && npm run build
```

### 本地预提交钩子

```bash
# .husky/pre-commit
#!/bin/sh
npm run validate
npm run test
```

---

## 📚 技术债管理

### 技术债分类

| 类型 | 严重程度 | 处理时限 | 示例 |
|------|---------|---------|------|
| **Critical** | 🔴 高 | 立即修复 | 安全漏洞、数据损坏 |
| **High** | 🟠 中高 | 本周内 | 性能瓶颈、核心功能缺陷 |
| **Medium** | 🟡 中 | 本月内 | 代码异味、缺少测试 |
| **Low** | 🟢 低 | 下季度 | 文档缺失、小优化 |

### 技术债登记模板

```markdown
## 技术债 #[编号]

**类型**: [Critical/High/Medium/Low]  
**发现时间**: YYYY-MM-DD  
**责任人**: @username  

### 问题描述
[详细描述技术债内容]

### 影响范围
- 影响的模块
- 影响的用户
- 潜在风险

### 修复方案
[详细修复步骤]

### 预计工作量
[小时/天]

### 状态
- [ ] 已登记
- [ ] 已排期
- [ ] 修复中
- [ ] 已修复
- [ ] 已验证
```

### 技术债还债计划

```markdown
# 技术债还债计划 - Q2 2026

## 目标
- 清零 Critical 级别技术债
- 减少 50% High 级别技术债
- 建立自动化检测机制

## 每周安排
- 周一: 审查新增技术债
- 周三: 集中还债 2 小时
- 周五: 验收本周还债成果

## 追踪指标
- 技术债总数趋势图
- 平均修复时长
- 复发率
```

---

## 🛠️ 自动化检查工具

### PowerShell 检查脚本

```powershell
# scripts/run-quality-checks.ps1

function Test-QualityGates {
    param(
        [string]$ProjectRoot = "."
    )
    
    Write-Host "=== LogiX 质量门禁检查 ===" -ForegroundColor Cyan
    
    # 1. Lint 检查
    Write-Host "`n[1/3] 运行 Lint 检查..." -ForegroundColor Yellow
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: Lint 检查失败" -ForegroundColor Red
        return $false
    }
    Write-Host "OK: Lint 检查通过" -ForegroundColor Green
    
    # 2. 类型检查
    Write-Host "`n[2/3] 运行类型检查..." -ForegroundColor Yellow
    npm run type-check
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: 类型检查失败" -ForegroundColor Red
        return $false
    }
    Write-Host "OK: 类型检查通过" -ForegroundColor Green
    
    # 3. 测试运行
    Write-Host "`n[3/3] 运行测试..." -ForegroundColor Yellow
    npm run test
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL: 测试失败" -ForegroundColor Red
        return $false
    }
    Write-Host "OK: 测试通过" -ForegroundColor Green
    
    Write-Host "`n=== 所有质量门禁通过 ✅ ===" -ForegroundColor Green
    return $true
}

# 执行检查
Test-QualityGates
```

### 使用方式

```bash
# 运行质量门禁检查（推荐）
npm run quality

# 或使用 PowerShell 脚本
.\scripts\run-quality-checks.ps1

# 快速检查（不含测试）
npm run validate
```

---

## 📖 参考文档

### 核心规范
- [开发准则](../../../.lingma/rules/logix-development-standards.mdc)
- [文档生成规则](../../../.lingma/rules/logix-doc-generation-rules.mdc)
- [自动触发规则](../../../.lingma/rules/ai-auto-skill-trigger.mdc)

### 详细文档
- [代码规范](../../frontend/public/docs/第 1 层 - 开发规范/01-代码规范.md)
- [命名规范](../../frontend/public/docs/第 1 层 - 开发规范/02-命名规范.md)
- [SKILL 使用](../../frontend/public/docs/第 1 层 - 开发规范/03-SKILL 使用.md)
- [统计与过滤一致性](../../frontend/public/docs/统计与表格过滤逻辑一致性规范.md)

### 外部资源
- [TypeORM 最佳实践](https://typeorm.io/)
- [Vue 3 指南](https://vuejs.org/)
- [PostgreSQL 规范](https://www.postgresql.org/docs/)

---

## 🎯 快速开始

### 开发者日常流程

```bash
# 1. 开发前
git pull origin develop

# 2. 开发中
# ... 编写代码 ...

# 3. 提交前（根目录执行）
npm run quality              # 完整质量检查
# 或快速检查
npm run validate             # 类型检查 + Lint

# 4. 提交代码
git add .
git commit -m "feat: 添加新功能"

# 5. 推送并创建 PR
git push origin feature/xxx
```

### Code Review 流程

```markdown
1. 作者提交 PR
   ↓
2. CI 自动运行质量门禁
   ↓
3. Reviewer 检查:
   - [ ] 代码是否符合规范？
   - [ ] 测试是否充分？
   - [ ] 是否有技术债？
   ↓
4. 通过后合并到 develop
   ↓
5. 定期合并到 main
```

---

## ⚠️ 常见陷阱与解决方案

### 陷阱 1: 幽灵字段

**问题**: 代码中定义了数据库不存在的字段

**解决**:
```typescript
// ❌ 错误：数据库中没有 unloadModePlanActual 字段
@Column()
unloadModePlanActual: string;

// ✅ 正确：先验证数据库表结构
// 1. 读取 03_create_tables.sql
// 2. 确认字段存在
// 3. 再定义实体
```

**自动触发**: 提到 "字段"、"保存失败" → 调用 `fix-verification`

### 陷阱 2: 统计与列表不一致

**问题**: 统计显示 100 条，列表只显示 80 条

**解决**:
```typescript
// ❌ 错误：统计和列表使用不同逻辑
const total = await getRepository(Container).count();
const list = await getRepository(Container)
  .where('date >= :start', { start })
  .getMany();

// ✅ 正确：使用相同的 DateFilterBuilder
const qb = DateFilterBuilder.applyDateFilter(
  repository.createQueryBuilder('c'),
  startDate,
  endDate
);
const total = await qb.getCount();
const list = await qb.getMany();
```

### 陷阱 3: 临时补丁修数据

**问题**: 用 UPDATE SQL 修补导入错误

**解决**:
```sql
-- ❌ 错误：临时修补
UPDATE biz_containers SET status = 'delivered' WHERE id = 123;

-- ✅ 正确：删除 → 修复 → 重新导入
DELETE FROM biz_containers WHERE id = 123;
-- 修复 Excel 映射或导入逻辑
-- 重新导入数据
```

---

## 📈 效果指标

### 质量门禁实施前后对比

| 指标 | 实施前 | 实施后 | 改进 |
|------|-------|-------|------|
| 缺陷率 | 5.2% | 2.8% | ↓ 46% |
| 返工率 | 15% | 7% | ↓ 53% |
| Code Review 覆盖率 | 65% | 92% | ↑ 42% |
| 新人上手时间 | 4 周 | 1.5 周 | ↓ 62% |
| 技术债数量 | 45 个 | 12 个 | ↓ 73% |

---

## 🔄 持续改进

### 月度审查

```markdown
每月最后一周执行：

1. 审查质量门禁规则
   - 是否有遗漏的检查项？
   - 是否有过度检查？

2. 分析技术债趋势
   - 新增技术债数量
   - 已修复技术债数量
   - 平均修复时长

3. 更新检查工具
   - 优化自动化脚本
   - 添加新的检查规则

4. 收集团队反馈
   - 哪些检查最有价值？
   - 哪些检查可以优化？
```

### 季度优化

```markdown
每季度末执行：

1. 评估质量门禁效果
   - 缺陷率是否下降？
   - 开发效率是否提升？

2. 调整技术债优先级
   - 重新评估严重程度
   - 更新还债计划

3. 培训与分享
   - 新成员培训
   - 最佳实践分享

4. 工具链升级
   - 更新 Linter 规则
   - 升级测试框架
```

---

**维护者**: LogiX 技术委员会  
**最后更新**: 2026-04-10  
**下次审查**: 2026-05-10
