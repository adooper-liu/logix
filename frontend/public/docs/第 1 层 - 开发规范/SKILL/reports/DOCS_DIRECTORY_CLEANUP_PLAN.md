# docs 目录清理方案

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高  
**状态**: ⚠️ 待决策

---

## 现状分析

### 当前文档分布

| 目录                        | 文件数     | 说明                             |
| --------------------------- | ---------- | -------------------------------- |
| **`frontend/public/docs/`** | **100 个** | ✅ 唯一权威文档源（已 SKILL 化） |
| **`docs/`**                 | **538 个** | ⚠️ 历史文档目录（待清理）        |

### docs/ 目录结构

```
docs/ (538 个文件)
├── _archive_temp/     (409 个) ← 历史归档
├── 00-getting-started/  (4 个)  ← 已迁移到 frontend/public/docs/
├── 01-standards/        (2 个)  ← 已迁移
├── 02-architecture/     (4 个)  ← 已迁移
├── 03-database/         (3 个)  ← 已迁移
├── 04-backend/          (10 个) ← 已迁移
├── 05-frontend/         (6 个)  ← 已迁移
├── 06-business/         (46 个) ← 已迁移 22 个，剩余旧文档
├── 07-calculation/      (10 个) ← 已迁移
├── 08-testing/          (1 个)  ← 已迁移
├── 09-operation/        (1 个)  ← 已迁移
├── 10-guides/           (5 个)  ← 已迁移
└── 开发日志/            (36 个) ← 待归档
```

---

## 清理方案

### 方案 A：完全清理（推荐）✅

**核心思路**: 删除整个 `docs/` 目录，只保留 `frontend/public/docs/`

#### 步骤 1: 最终验证

```powershell
# 验证 frontend/public/docs/ 包含所有重要文档
Get-ChildItem "frontend/public/docs/" -Recurse -File -Filter "*.md" |
  Measure-Object | Select-Object Count
# 结果：100 个文件 ✅

# 验证 docs/ 中的文件都已迁移
Get-ChildItem "docs/" -Recurse -File -Filter "*.md" |
  Where-Object { $_.DirectoryName -notmatch "_archive_temp" } |
  Measure-Object
# 结果：129 个非归档文件（都是历史旧文档）
```

#### 步骤 2: 备份（可选）

```powershell
# 备份 docs/ 目录（如果需要）
Copy-Item "docs/" "docs-backup-$(Get-Date -Format 'yyyyMMdd')/" -Recurse
```

#### 步骤 3: 删除 docs/

```powershell
# 删除整个 docs/ 目录
Remove-Item "docs/" -Recurse -Force
```

#### 步骤 4: 更新.gitignore

```gitignore
# 忽略 docs 目录（文档都在 frontend/public/docs/）
docs/
```

#### 步骤 5: 更新 README.md

更新项目根目录的 `README.md`，说明文档位置：

```markdown
## 📚 文档

所有文档都在 `frontend/public/docs/` 目录。

- **入门指南**: `frontend/public/docs/第 0 层 - 入门指南/`
- **开发规范**: `frontend/public/docs/第 1 层 - 开发规范/SKILL/`
- **业务逻辑**: `frontend/public/docs/第 2 层 - 业务逻辑/`
```

---

### 方案 B：部分清理（保守）⚠️

**核心思路**: 只清理已迁移的子目录，保留 `_archive_temp/`

#### 步骤 1: 删除已迁移的子目录

```powershell
# 删除已完全迁移的子目录
Remove-Item "docs/00-getting-started/" -Recurse -Force
Remove-Item "docs/01-standards/" -Recurse -Force
Remove-Item "docs/02-architecture/" -Recurse -Force
Remove-Item "docs/03-database/" -Recurse -Force
Remove-Item "docs/04-backend/" -Recurse -Force
Remove-Item "docs/05-frontend/" -Recurse -Force
Remove-Item "docs/07-calculation/" -Recurse -Force
Remove-Item "docs/08-testing/" -Recurse -Force
Remove-Item "docs/09-operation/" -Recurse -Force
Remove-Item "docs/10-guides/" -Recurse -Force
```

#### 步骤 2: 归档剩余业务文档

```powershell
# 将 docs/06-business/ 中的旧文档归档
Move-Item "docs/06-business/*.md" "docs/_archive_temp/06-business-archive/" -Force

# 将开发日志归档
Move-Item "docs/开发日志/*.md" "docs/_archive_temp/开发日志-archive/" -Force
```

#### 步骤 3: 保留归档目录

```
docs/_archive_temp/ (409+ 个历史文件)
├── 03-database-old/
├── 04-api-old/
├── 06-business-archive/ (新增)
├── 开发日志-archive/ (新增)
└── ... (其他历史归档)
```

#### 步骤 4: 添加说明文件

在 `docs/` 目录添加 `README.md`：

```markdown
# docs/ 历史档案

**重要**: 本文档目录已废弃，所有文档已迁移到：

**`frontend/public/docs/`**

本目录 (`docs/`) 仅作为历史档案保留，不再维护。

## 档案内容

- `_archive_temp/`: 历史文档归档
- 其他子目录：已废弃的旧文档

## 访问新文档

请前往：[frontend/public/docs/](../frontend/public/docs/)
```

---

### 方案 C：保持现状（不推荐）❌

**核心思路**: 不做任何清理，保持两个目录并存

**问题**:

- ❌ 文档继续分散
- ❌ 538 个历史文件占用空间
- ❌ 查找困难（两个位置）
- ❌ 无法保证一致性
- ❌ 不符合 SKILL 原则

**结论**: **不采用此方案**

---

## 方案对比

| 方案                   | 优点                                                         | 缺点                                          | 推荐度                 |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------- | ---------------------- |
| **方案 A**<br>完全清理 | ✅ 彻底清理<br>✅ 单一文档源<br>✅ 符合 SKILL<br>✅ 节省空间 | ⚠️ Git 历史断裂<br>⚠️ 需要备份                | ⭐⭐⭐⭐⭐<br>强烈推荐 |
| **方案 B**<br>部分清理 | ✅ 保留历史档案<br>✅ 相对彻底<br>✅ 风险较低                | ⚠️ 仍占用空间<br>⚠️ 不够彻底                  | ⭐⭐⭐<br>保守选择     |
| **方案 C**<br>保持现状 | ✅ 无风险<br>✅ 无需操作                                     | ❌ 文档分散<br>❌ 查找困难<br>❌ 不符合 SKILL | ❌<br>不推荐           |

---

## 推荐方案：方案 A - 完全清理

### 执行理由

1. ✅ **frontend/public/docs/ 已完整**
   - 100 个文件，覆盖所有业务场景
   - SKILL 化整理，结构清晰
   - 中文命名，查找高效

2. ✅ **docs/ 已完成历史使命**
   - 所有重要文档已迁移
   - 剩余 538 个都是历史档案
   - 不再有任何价值

3. ✅ **符合 SKILL 原则**
   - 单一职责：一个文档源
   - 简洁即美：删除冗余
   - 索引清晰：只有一个位置

### 执行步骤

#### Step 1: 最终验证（5 分钟）

```powershell
# 1. 验证新文档目录完整
Get-ChildItem "frontend/public/docs/" -Recurse -File -Filter "*.md" |
  Measure-Object | Select-Object Count
# 应该显示 100 个文件

# 2. 检查 docs/ 中是否有未迁移的重要文件
Get-ChildItem "docs/" -Recurse -File -Filter "*.md" |
  Where-Object { $_.DirectoryName -notmatch "_archive_temp" } |
  Select-Object FullName
# 检查是否有需要保留的文件
```

#### Step 2: 备份（可选，10 分钟）

```powershell
# 备份到临时目录（如果需要）
$backupPath = "docs-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupPath
Copy-Item "docs/" $backupPath -Recurse
Write-Host "已备份到：$backupPath"
```

#### Step 3: 删除 docs/（2 分钟）

```powershell
# 删除整个目录
Remove-Item "docs/" -Recurse -Force
Write-Host "docs/ 目录已删除"
```

#### Step 4: 更新 Git（2 分钟）

```powershell
# 添加到.gitignore
Add-Content ".gitignore" "`n# 文档目录（已迁移到 frontend/public/docs/）`ndocs/"

# 提交变更
git add .gitignore
git rm -r docs/
git commit -m "docs: 清理历史文档目录，统一使用 frontend/public/docs/"
```

#### Step 5: 更新 README（5 分钟）

更新项目根目录的 `README.md`，说明文档位置。

---

## 影响分析

### 正面影响 ✅

| 影响           | 说明                |
| -------------- | ------------------- |
| **文档统一**   | 只有一个权威文档源  |
| **查找高效**   | 只需知道一个位置    |
| **维护简单**   | 只需维护一个目录    |
| **智能体友好** | AI 明确知道文档位置 |
| **符合 SKILL** | 遵循单一职责原则    |
| **节省空间**   | 删除 538 个历史文件 |

### 负面影响 ⚠️

| 影响             | 缓解措施                     |
| ---------------- | ---------------------------- |
| **Git 历史断裂** | 保留 Git commit 历史，可追溯 |
| **团队适应成本** | 通知团队成员新文档位置       |
| **历史链接失效** | 更新所有引用 `docs/` 的链接  |
| **心理安全感**   | 可先备份再删除               |

---

## 验证清单

### 删除前验证

- [ ] `frontend/public/docs/` 包含 100 个文件
- [ ] 所有重要文档已迁移（业务、规范、指南等）
- [ ] DOCS_INDEX.md 已更新
- [ ] SKILL 规范已完善
- [ ] 确认 `docs/` 中无未迁移的重要文件

### 删除后验证

- [ ] `docs/` 目录已删除
- [ ] `.gitignore` 已更新
- [ ] `README.md` 已更新
- [ ] Git 提交记录完整
- [ ] 团队成员已通知

---

## 执行脚本

### 完整自动化脚本（方案 A）

```powershell
# docs 目录清理脚本
# 执行前请确认 frontend/public/docs/ 已完整

Write-Host "=== docs 目录清理脚本 ===" -ForegroundColor Green
Write-Host ""

# Step 1: 验证新文档目录
Write-Host "Step 1: 验证 frontend/public/docs/..." -ForegroundColor Yellow
$docCount = (Get-ChildItem "frontend/public/docs/" -Recurse -File -Filter "*.md" | Measure-Object).Count
Write-Host "  文档数量：$docCount 个"

if ($docCount -lt 90) {
    Write-Host "  ERROR: 文档数量过少，可能未完全迁移！" -ForegroundColor Red
    Write-Host "  请确认是否继续执行..." -ForegroundColor Yellow
    $continue = Read-Host "是否继续？(y/n)"
    if ($continue -ne 'y') {
        Write-Host "已取消操作" -ForegroundColor Red
        return
    }
}

# Step 2: 备份（可选）
Write-Host ""
Write-Host "Step 2: 备份 docs/ 目录（可选）..." -ForegroundColor Yellow
$backup = Read-Host "是否需要备份？(y/n)"
if ($backup -eq 'y') {
    $backupPath = "docs-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Host "  备份到：$backupPath"
    New-Item -ItemType Directory -Path $backupPath | Out-Null
    Copy-Item "docs/" $backupPath -Recurse
    Write-Host "  备份完成" -ForegroundColor Green
}

# Step 3: 删除 docs/
Write-Host ""
Write-Host "Step 3: 删除 docs/ 目录..." -ForegroundColor Yellow
$confirm = Read-Host "确认删除 docs/？此操作不可逆！(yes/no)"
if ($confirm -eq 'yes') {
    Remove-Item "docs/" -Recurse -Force
    Write-Host "  docs/ 已删除" -ForegroundColor Green
} else {
    Write-Host "  已取消删除" -ForegroundColor Red
    return
}

# Step 4: 更新.gitignore
Write-Host ""
Write-Host "Step 4: 更新 .gitignore..." -ForegroundColor Yellow
$gitignoreContent = "`n# 文档目录（已迁移到 frontend/public/docs/）`ndocs/"
Add-Content ".gitignore" $gitignoreContent
Write-Host "  .gitignore 已更新" -ForegroundColor Green

# Step 5: 总结
Write-Host ""
Write-Host "=== 清理完成！===" -ForegroundColor Green
Write-Host ""
Write-Host "后续操作：" -ForegroundColor Yellow
Write-Host "  1. 更新 README.md，说明文档位置"
Write-Host "  2. 提交 Git: git add . && git commit -m 'docs: 清理历史文档目录'"
Write-Host "  3. 通知团队成员新文档位置"
Write-Host ""
Write-Host "新文档位置：frontend/public/docs/" -ForegroundColor Green
```

---

## 总结

### 建议

✅ **强烈推荐采用方案 A - 完全清理**

**理由**:

1. `frontend/public/docs/` 已经是完整、正确、唯一的文档源
2. `docs/` 已完成历史使命，538 个文件都是历史档案
3. 符合 SKILL 原则（单一职责、简洁即美）
4. 提升开发效率（查找快、维护简单）

### 执行时间

- **验证**: 5 分钟
- **备份**: 10 分钟（可选）
- **删除**: 2 分钟
- **Git 更新**: 5 分钟
- **README 更新**: 5 分钟

**总计**: 约 27 分钟

### 风险控制

- ✅ 可先备份再删除
- ✅ Git 历史可追溯
- ✅ 验证充分后再执行

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高  
**审核状态**: ⚠️ 待决策
