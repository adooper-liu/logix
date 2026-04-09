# CI 测试数据管理指南

## 概述

本文档说明如何从开发数据库 `logix_db` 导出测试数据，提交到 Git，并在 GitHub Actions CI 环境中使用这些数据进行集成测试。

---

## 为什么需要测试数据？

集成测试需要真实的数据才能有效验证业务逻辑：

1. **字典表数据** - 国家、港口、仓库等基础数据（必需）
2. **业务数据** - 货柜、海运记录等实际业务数据（提高测试覆盖率）
3. **边界情况** - 覆盖各种异常场景的数据

### 数据来源策略

| 方案 | 优点 | 缺点 |
|------|------|------|
| **从 logix_db 导出**（推荐） | 真实数据、覆盖全面、维护简单 | 需定期更新 |
| 手动编写 SQL INSERT | 完全可控 | 工作量大、易出错 |
| 使用 Faker 生成 | 自动化 | 数据不真实、可能不符合业务规则 |

---

## 工作流程

### 完整流程图

```
开发环境 (本地)                    Git 仓库                  CI 环境 (GitHub Actions)
┌─────────────────┐          ┌──────────────┐          ┌──────────────────────┐
│                 │          │              │          │                      │
│  logix_db       │          │              │          │  Ubuntu Runner VM    │
│  (PostgreSQL)   │          │              │          │                      │
│                 │          │              │          │  ┌────────────────┐  │
│  1. 运行导出脚本 │ ──────> │  test-data/  │ ──────> │  │ PostgreSQL 15  │  │
│     ↓           │  git push│  (Git)       │  CI 触发 │  │  └─ logix_ci   │  │
│  2. 生成文件    │          │              │          │  └────────────────┘  │
│     - dictionaries.sql    │              │          │                      │
│     - containers.csv      │              │          │  3. 创建表结构       │
│     - sea_freight.csv     │              │          │     ↓                │
│     - metadata.json       │              │          │  4. 导入测试数据     │
│                 │          │              │          │     ↓                │
│                 │          │              │          │  5. 运行集成测试     │
└─────────────────┘          └──────────────┘          └──────────────────────┘
```

---

## 步骤详解

### 步骤 1: 从开发数据库导出数据

#### 前置条件

- ✅ Docker 已安装并运行
- ✅ PostgreSQL 容器正在运行（`logix-timescaledb-prod`）
- ✅ 开发数据库 `logix_db` 中有测试数据

#### 执行导出

```bash
cd d:\Gihub\logix
bash backend/scripts/export-test-data.sh
```

#### 导出内容

脚本会自动导出以下文件到 `backend/tests/integration/test-data/`：

| 文件 | 格式 | 内容 | 大小（示例） |
|------|------|------|-------------|
| `dictionaries.sql` | SQL INSERT | 10 个字典表的全部数据 | ~100 KB |
| `containers.csv` | CSV | 最近 50 个货柜记录 | ~25 KB |
| `sea_freight.csv` | CSV | 对应的 50 条海运记录 | ~8 KB |
| `metadata.json` | JSON | 元数据信息（导出时间、来源等） | ~600 B |

#### 导出的字典表

- `dict_countries` - 国家字典
- `dict_ports` - 港口字典
- `dict_container_types` - 集装箱类型
- `dict_customer_types` - 客户类型
- `dict_warehouses` - 仓库字典
- `dict_trucking_companies` - 车队字典
- `dict_customs_brokers` - 清关行字典
- `dict_shipping_companies` - 船公司字典
- `dict_freight_forwarders` - 货代字典
- `dict_overseas_companies` - 海外公司字典

#### 预期输出

```
==========================================
从开发数据库导出测试数据
Source DB: logix_db
Export Dir: backend/tests/integration/test-data
DB Container: logix-timescaledb-prod
==========================================
1. 导出字典表数据...
   ✓ 字典表数据已导出
2. 导出示例业务数据...
   ✓ 业务数据已导出
   ✓ 元数据已生成

==========================================
导出完成！
导出文件:
total 140K
-rwxrwxrwx 1 user user  25K Apr  9 18:46 containers.csv
-rwxrwxrwx 1 user user 104K Apr  9 18:46 dictionaries.sql
-rwxrwxrwx 1 user user 604 Apr  9  2026 metadata.json
-rwxrwxrwx 1 user user 7.6K Apr  9  2026 sea_freight.csv
==========================================

下一步：
1. 提交导出的数据到 Git: git add backend/tests/integration/test-data
2. 在 CI 中使用这些数据初始化 logix_ci 数据库
```

---

### 步骤 2: 提交测试数据到 Git

#### 检查文件状态

```bash
git status backend/tests/integration/test-data/
```

预期输出：
```
Changes to be committed:
  new file:   backend/tests/integration/test-data/containers.csv
  new file:   backend/tests/integration/test-data/dictionaries.sql
  new file:   backend/tests/integration/test-data/metadata.json
  new file:   backend/tests/integration/test-data/sea_freight.csv
```

#### 添加到暂存区

```bash
git add backend/tests/integration/test-data/
```

#### 提交更改

```bash
git commit -m "test: 添加 CI 集成测试数据（从 logix_db 导出）

- 导出字典表数据（446 条记录，10 个字典表）
- 导出最近 50 个货柜及对应的海运记录
- 用于 GitHub Actions CI 环境中的集成测试
- 确保 CI 测试使用真实业务数据"
```

#### 推送到远程仓库

```bash
git push origin main
```

---

### 步骤 3: CI 自动使用测试数据

当您推送代码后，GitHub Actions 会自动执行以下流程：

#### CI 工作流程

1. **创建临时数据库**
   ```yaml
   services:
     postgres:
       image: postgres:15
       env:
         POSTGRES_DB: logix_ci  # CI 专用测试数据库
   ```

2. **初始化表结构**
   ```bash
   psql -h postgres -U postgres -d logix_ci \
     -f backend/sql/schema/03_create_tables.sql
   ```

3. **导入测试数据**
   ```bash
   bash backend/scripts/import-test-data-ci.sh
   ```
   
   该脚本会：
   - 导入 `dictionaries.sql`（字典表数据）
   - 导入 `containers.csv`（货柜数据）
   - 导入 `sea_freight.csv`（海运数据）
   - 验证导入结果

4. **运行集成测试**
   ```bash
   npm run test:backend:integration
   ```

#### 查看 CI 执行结果

1. 进入 GitHub 仓库页面
2. 点击 **Actions** 标签
3. 选择最新的 workflow run
4. 展开 **integration-tests** job
5. 查看以下步骤的输出：
   - `Initialize test database with real schema`
   - `Import test data from exported files`
   - `Run integration tests`

---

## 何时需要更新测试数据？

### 需要更新的情况 ✅

| 场景 | 说明 | 优先级 |
|------|------|--------|
| **新增字典项** | 添加了新的国家、港口、仓库等 | P0 - 高 |
| **Schema 变更** | 表结构修改（新增字段、修改类型） | P0 - 高 |
| **业务逻辑调整** | 智能排柜算法、成本计算规则变化 | P1 - 中 |
| **测试覆盖率不足** | 当前数据无法覆盖某些边界情况 | P1 - 中 |
| **定期更新** | 保持数据新鲜度（建议每 2-4 周） | P2 - 低 |

### 不需要更新的情况 ❌

- 仅修改代码逻辑（数据结构未变化）
- 修复 bug（不涉及数据模型）
- 性能优化
- 临时本地调试

---

## 数据脱敏与安全

### 敏感数据处理原则

导出的测试数据**不应包含**：

❌ **禁止导出的内容**:
- 真实的 API Token / Secret Key
- 客户敏感信息（姓名、电话、邮箱、地址）
- 财务数据（真实金额、银行账号、信用卡号）
- 内部配置密钥
- 用户密码或加密密钥

✅ **可以导出的内容**:
- 字典表数据（公开信息）
- 业务标识符（货柜号、提单号、订单号）
- 港口代码、日期、状态
- 非敏感的物流节点信息

### 当前导出策略的安全性

| 数据类型 | 是否导出 | 安全性评估 |
|---------|---------|-----------|
| 字典表（国家、港口等） | ✅ 是 | 🟢 安全（公开信息） |
| 货柜号、提单号 | ✅ 是 | 🟡 中等（业务标识符，建议脱敏） |
| 港口代码、日期 | ✅ 是 | 🟢 安全 |
| 客户名称、联系方式 | ❌ 否 | 🔴 不包含 |
| 金额、费用 | ❌ 否 | 🔴 不包含 |

### 定期检查清单

每次更新测试数据前，请检查：

- [ ] 确认不包含敏感个人信息
- [ ] 确认不包含 API Token 或密钥
- [ ] 确认货柜号、提单号为测试数据或已脱敏
- [ ] 确认数据量适中（不会导致 CI 超时）
- [ ] 审查 `metadata.json` 中的导出时间戳

---

## 故障排查

### 问题 1: 导出脚本失败 - "command not found"

**症状**:
```
backend/scripts/export-test-data.sh: line 23: pg_dump: command not found
```

**原因**: 系统未安装 PostgreSQL 命令行工具，或使用的是 Docker 化 PostgreSQL

**解决方案**: 
脚本已更新为使用 Docker 方式导出，确保：
1. Docker 已安装并运行
2. PostgreSQL 容器正在运行
3. 容器名称正确（默认：`logix-timescaledb-prod`）

---

### 问题 2: 数据库连接失败

**症状**:
```
pg_dump: error: connection to server failed: FATAL: role "xxx" does not exist
```

**原因**: 数据库用户名或密码不正确

**解决方案**:
1. 检查 `.env` 文件中的数据库凭据：
   ```bash
   grep DB_USERNAME .env
   grep DB_PASSWORD .env
   ```

2. 更新脚本中的凭据（如果需要）：
   ```bash
   # 编辑 backend/scripts/export-test-data.sh
   DB_USER="your_username"
   DB_PASSWORD="your_password"
   ```

---

### 问题 3: CI 中测试数据导入失败

**症状**: CI 日志显示 "未找到 dictionaries.sql"

**原因**: 测试数据文件未提交到 Git

**解决方案**:
```bash
# 检查文件是否存在
ls backend/tests/integration/test-data/

# 如果不存在，重新导出
bash backend/scripts/export-test-data.sh

# 提交到 Git
git add backend/tests/integration/test-data/
git commit -m "test: 添加 CI 测试数据"
git push
```

---

### 问题 4: 测试数据过时

**症状**: 测试失败，提示缺少某些字典项或字段不匹配

**原因**: 开发数据库已更新，但测试数据未同步

**解决方案**:
```bash
# 重新导出最新数据
bash backend/scripts/export-test-data.sh

# 提交更新
git add backend/tests/integration/test-data/
git commit -m "test: 更新测试数据以匹配最新 schema"
git push
```

---

### 问题 5: CI 运行时间过长或超时

**症状**: CI job 超过 30 分钟未完成

**原因**: 导出的业务数据太多

**解决方案**:
编辑 `backend/scripts/export-test-data.sh`，减少 LIMIT 数量：

```bash
# 从 LIMIT 50 改为 LIMIT 20
SELECT * FROM biz_containers 
ORDER BY created_at DESC 
LIMIT 20  # 原来是 50
```

---

## 最佳实践

### 1. 定期更新测试数据

**建议频率**: 每 2-4 周 或当 schema 变更时

设置日历提醒或使用 GitHub Issue 跟踪：
```markdown
## 待办：更新 CI 测试数据

- [ ] 从 logix_db 导出最新数据
- [ ] 检查数据敏感性
- [ ] 提交到 Git
- [ ] 验证 CI 测试结果
```

### 2. 保持数据最小化

只导出**必要的**测试数据：

| 数据类型 | 推荐数量 | 说明 |
|---------|---------|------|
| 字典表 | 全部 | 必需，保证完整性 |
| 货柜记录 | 20-50 条 | 足够覆盖常见场景 |
| 海运记录 | 20-50 条 | 与货柜对应 |

### 3. 版本控制测试数据

每次更新测试数据时：

```bash
# 在 commit message 中说明更新原因
git commit -m "test: 更新测试数据

原因：新增 dict_warehouses 中的 FBW_CA 仓库
影响：智能排柜测试现在可以验证 FBW_CA 分派逻辑"
```

### 4. 监控 CI 测试结果

如果测试突然失败：

1. 检查是否是测试数据问题
2. 对比本地开发和 CI 环境的数据差异
3. 查看 CI 日志中的数据导入步骤
4. 必要时重新导出测试数据

### 5. 数据备份

虽然测试数据可以从 `logix_db` 重新导出，但建议：

- 保留最近 3 个版本的测试数据（使用 Git 历史）
- 重要更新前手动备份：
  ```bash
  cp -r backend/tests/integration/test-data \
      backend/tests/integration/test-data.backup.$(date +%Y%m%d)
  ```

---

## 高级用法

### 自定义导出范围

如果需要导出特定数据，可以修改 `export-test-data.sh`：

#### 示例 1: 导出特定国家的货柜

```bash
# 只导出美国的货柜
docker exec -t $DB_CONTAINER psql \
  -U "$DB_USER" \
  -d "$DEV_DB" \
  -c "COPY (
    SELECT * FROM biz_containers 
    WHERE country_code = 'US'
    ORDER BY created_at DESC 
    LIMIT 30
  ) TO STDOUT WITH CSV HEADER" \
  > "$EXPORT_DIR/containers_us.csv"
```

#### 示例 2: 导出特定时间范围的数据

```bash
# 只导出最近 3 个月的数据
docker exec -t $DB_CONTAINER psql \
  -U "$DB_USER" \
  -d "$DEV_DB" \
  -c "COPY (
    SELECT * FROM biz_containers 
    WHERE created_at >= NOW() - INTERVAL '3 months'
    ORDER BY created_at DESC 
    LIMIT 50
  ) TO STDOUT WITH CSV HEADER" \
  > "$EXPORT_DIR/containers_recent.csv"
```

### 多环境测试数据

可以为不同环境维护不同的测试数据集：

```
backend/tests/integration/test-data/
├── dev/          # 开发环境完整数据（大量数据）
├── ci-minimal/   # CI 最小数据集（快速测试，20 条）
└── ci-full/      # CI 完整数据集（全面测试，50 条）
```

修改 CI 配置使用不同的数据集：

```yaml
- name: Import minimal test data
  if: github.event_name == 'pull_request'
  run: bash backend/scripts/import-test-data-ci.sh ci-minimal/

- name: Import full test data
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  run: bash backend/scripts/import-test-data-ci.sh ci-full/
```

### 自动化数据更新（可选）

可以设置 GitHub Action 定期触发数据导出提醒：

```yaml
# .github/workflows/test-data-reminder.yml
name: Test Data Update Reminder

on:
  schedule:
    - cron: '0 0 1 * *'  # 每月 1 日

jobs:
  remind:
    runs-on: ubuntu-latest
    steps:
      - name: Create Issue
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🔄 提醒：更新 CI 测试数据',
              body: '本月已过去，建议从 logix_db 导出最新测试数据。\n\n操作步骤：\n1. 运行 `bash backend/scripts/export-test-data.sh`\n2. 检查数据敏感性\n3. 提交到 Git',
              labels: ['maintenance', 'test-data']
            })
```

---

## 相关文件

### 脚本文件

| 文件 | 用途 | 执行环境 |
|------|------|---------|
| `backend/scripts/export-test-data.sh` | 从 logix_db 导出数据 | 本地开发环境 |
| `backend/scripts/import-test-data-ci.sh` | 导入数据到 logix_ci | GitHub Actions CI |

### 配置文件

| 文件 | 用途 |
|------|------|
| `.github/workflows/ci.yml` | CI 配置，包含测试数据导入步骤 |
| `backend/sql/schema/03_create_tables.sql` | 数据库表结构定义 |

### 文档文件

| 文件 | 用途 |
|------|------|
| `docs/quality/CI_TEST_DATA_GUIDE.md` | 本指南（详细说明） |
| `docs/quality/INTEGRATION_TEST_EFFECTIVENESS.md` | 集成测试有效性说明 |

### 数据文件

| 文件 | 说明 |
|------|------|
| `backend/tests/integration/test-data/dictionaries.sql` | 字典表数据（SQL INSERT） |
| `backend/tests/integration/test-data/containers.csv` | 货柜数据（CSV） |
| `backend/tests/integration/test-data/sea_freight.csv` | 海运数据（CSV） |
| `backend/tests/integration/test-data/metadata.json` | 元数据信息 |

---

## 常见问题 FAQ

### Q1: 为什么不直接在 CI 中连接开发数据库？

**A**: 安全和隔离考虑：
- CI 应该是独立、可重复的环境
- 不依赖外部资源（您的本地数据库可能关闭）
- 避免数据竞争和污染
- 支持多个 PR 并行测试

---

### Q2: 测试数据会泄露敏感信息吗？

**A**: 当前只导出字典表和少量业务标识符，不包含敏感信息。但仍需：
- 定期审查导出数据
- 避免导出客户个人信息
- 避免导出财务数据
- 遵循数据脱敏原则

---

### Q3: 能否自动化测试数据更新？

**A**: 可以，但需要谨慎：
- 可以设置定时任务自动导出
- 但必须人工审核后再提交（安全检查）
- 建议使用 GitHub Issue 提醒，而非自动提交

---

### Q4: 测试数据文件太大怎么办？

**A**: 优化策略：
1. 减少导出的业务数据量（从 50 条减到 20 条）
2. 只导出必需的字典表
3. 压缩 CSV 文件（CI 中解压）
4. 使用 Git LFS 管理大文件

---

### Q5: 如何验证导出的数据是否正确？

**A**: 验证步骤：
```bash
# 1. 检查文件大小
ls -lh backend/tests/integration/test-data/

# 2. 查看字典数据条数
grep -c "INSERT INTO" backend/tests/integration/test-data/dictionaries.sql

# 3. 查看 CSV 行数
wc -l backend/tests/integration/test-data/containers.csv

# 4. 本地导入测试
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_test \
  < backend/tests/integration/test-data/dictionaries.sql
```

---

### Q6: 如果开发数据库被清空了怎么办？

**A**: 不用担心：
- Git 中保留了历史版本的测试数据
- 可以从 Git 历史恢复：
  ```bash
  git checkout HEAD~1 -- backend/tests/integration/test-data/
  ```
- 或者从备份恢复开发数据库后重新导出

---

## 总结

### 核心要点

1. **数据来源**: 从开发数据库 `logix_db` 导出真实数据
2. **存储位置**: 提交到 Git 的 `backend/tests/integration/test-data/`
3. **CI 使用**: GitHub Actions 自动导入到 `logix_ci` 数据库
4. **更新频率**: 每 2-4 周或 schema 变更时
5. **安全原则**: 不包含敏感信息，定期审查

### 快速操作命令

```bash
# 导出测试数据
bash backend/scripts/export-test-data.sh

# 提交到 Git
git add backend/tests/integration/test-data/
git commit -m "test: 更新 CI 测试数据"
git push

# 查看 CI 结果
# 访问: https://github.com/your-repo/actions
```

### 优势

✅ **真实性** - 使用真实业务数据，测试更可靠  
✅ **一致性** - 开发和 CI 使用相同数据集  
✅ **可维护性** - 一行命令即可更新  
✅ **灵活性** - CI 中 `continue-on-error`，即使没有数据也能运行  

---

**最后更新**: 2026-04-09  
**维护者**: LogiX 开发团队  
**相关文档**: 
- [集成测试有效性说明](./INTEGRATION_TEST_EFFECTIVENESS.md)
- [开发规范](../第%201%20层%20-%20开发规范/01-代码规范.md)
