# LogiX 数据库迁移自动化管理方案

**版本**：v1.0  
**创建时间**：2026-03-31  
**最后更新**：2026-03-31  
**状态**：✅ 强制执行

---

## 🎯 问题与解决方案

### 当前问题

1. **手动维护迁移列表** → 容易遗漏新脚本
2. **无自动发现机制** → 依赖人工记忆
3. **无验证机制** → 无法确保完整性
4. **文档不同步** → 代码与文档脱节

### 解决方案

```
自动化迁移管理 = 自动发现 + 智能分类 + 完整验证 + 文档同步
```

---

## 🔧 实施方案

### 方案一：自动发现机制（推荐）

**核心思路**：扫描 migrations/ 目录，自动执行所有 .sql 文件

**优势**：
- ✅ 零遗漏：新脚本自动被发现
- ✅ 零维护：无需手动更新列表
- ✅ 可扩展：支持子目录分类
- ✅ 可追溯：生成执行报告

**实现**：
```powershell
# 自动发现并执行所有迁移脚本
$migrationFiles = Get-ChildItem -Path $MIGRATIONS_DIR -Filter *.sql -Recurse | Sort-Object Name

foreach ($file in $migrationFiles) {
    Execute-Migration -Script $file.FullName
}
```

### 方案二：迁移注册表

**核心思路**：维护一个迁移注册表文件

**实现**：
```yaml
# migrations/registry.yaml
migrations:
  - file: 001_add_scheduling_config.sql
    category: scheduling
    executed: true
    timestamp: 2026-03-27T10:00:00Z
    
  - file: 002_add_customs_broker.sql
    category: system
    executed: false
```

### 方案三：混合方案（最佳实践）

结合方案一和方案二的优点：
- 自动发现新脚本
- 记录执行历史
- 支持增量迁移
- 生成完整报告

---

## 📋 开发工作流

### 创建新迁移

```bash
# 1. 创建迁移脚本（带编号）
migrations/010_add_new_feature.sql

# 2. 编写头部注释
/**
 * 迁移：010_add_new_feature.sql
 * 描述：添加新功能
 * 创建时间：2026-03-31
 * 验证：已测试
 * 回滚：可回滚
 */

# 3. 运行迁移
.\reinit_database_docker.ps1

# 4. 验证迁移
npm run db:verify

# 5. 更新文档
# - 更新 DOCS_INDEX.md
# - 更新 migrations/README.md
```

### 验证迁移完整性

```bash
# 运行完整性检查
npm run db:check-integrity

# 输出：
# ✓ 发现 78 个迁移脚本
# ✓ 已执行 78 个
# ✗ 未执行 0 个
# ✓ 所有迁移都已记录
```

---

## ⚠️ 遵循两大核心原则

### 原则一：不积累技术债

**在迁移管理中体现**：

1. **立即执行**
   - 创建迁移 → 立即执行测试
   - 发现问题 → 立即修复
   - 执行失败 → 立即回滚

2. **完整测试**
   ```sql
   -- 迁移脚本必须包含测试
   /**
    * 测试用例：
    * 1. 空表场景
    * 2. 有数据场景
    * 3. 约束冲突场景
    * 4. 回滚场景
    */
   ```

3. **文档同步**
   - 创建迁移 → 更新 README
   - 修改结构 → 更新实体定义
   - 新增功能 → 创建 SKILL 文档

### 原则二：有效文档管理

**在迁移管理中体现**：

1. **30 秒定位**
   ```
   migrations/
   ├── 001-050_基础迁移/
   ├── 051-100_业务迁移/
   └── README.md  # 索引所有迁移
   ```

2. **自动文档生成**
   ```powershell
   # 自动生成迁移清单
   npm run db:generate-docs
   
   # 输出：migrations/MANIFEST.md
   ```

3. **定期审查**
   - 每月：清理废弃迁移
   - 每季：整理迁移分类
   - 年度：重构迁移体系

---

## 🤖 智能体自动化遵循

### 让智能体自动遵循两大原则

#### 规则 1：创建迁移时自动检查

```yaml
# .lingma/rules/migration-rules.yaml
rules:
  - name: check-migration-integrity
    trigger: create_migration
    checks:
      - has_header_comment: true
      - has_test_cases: true
      - has_rollback: optional
      - naming_convention: "^[0-9]{3}_.*\\.sql$"
    
  - name: update-documentation
    trigger: after_migration_created
    actions:
      - update_file: migrations/README.md
      - update_file: frontend/public/docs/03-database/01-表结构.md
      - commit_message: "docs: 更新迁移文档 [auto]"
```

#### 规则 2：执行迁移后自动验证

```yaml
rules:
  - name: verify-after-execution
    trigger: after_migration_executed
    actions:
      - run_command: npm run db:verify
      - if_failed: rollback_migration
      - if_success: update_registry
      - generate_report: migration-report.md
```

#### 规则 3：定期自动审查

```yaml
rules:
  - name: monthly-review
    schedule: "0 0 1 * *"  # 每月 1 号
    actions:
      - scan_untracked_migrations
      - check_documentation_sync
      - generate_review_report
      - create_github_issue
```

---

## 📊 实施检查清单

### 每次创建迁移时

- [ ] **命名规范**
  - [ ] 使用编号前缀（001_, 002_, ...）
  - [ ] 使用下划线分隔
  - [ ] 全小写字母

- [ ] **头部注释**
  - [ ] 迁移文件名
  - [ ] 描述说明
  - [ ] 创建时间
  - [ ] 验证状态
  - [ ] 回滚策略

- [ ] **测试用例**
  - [ ] 正常场景测试
  - [ ] 异常场景测试
  - [ ] 边界条件测试

- [ ] **文档更新**
  - [ ] 更新 migrations/README.md
  - [ ] 更新数据库文档
  - [ ] 提交时引用文档

### 每次执行迁移后

- [ ] **验证检查**
  - [ ] 所有迁移已执行
  - [ ] 无错误发生
  - [ ] 数据完整性验证

- [ ] **文档同步**
  - [ ] 执行记录已更新
  - [ ] 变更日志已生成
  - [ ] 相关文档已同步

---

## 相关文件

- [SKILL 开发规范](../frontend/public/docs/01-standards/SKILL/README.md) - SKILL 原则与开发流程
- [migrations/README.md](migrations/README.md) - 迁移脚本索引

---

**版本**：v1.0  
**创建时间**：2026-03-31  
**最后更新**：2026-03-31  
**作者**：刘志高  
**审核状态**：✅ 已验证
