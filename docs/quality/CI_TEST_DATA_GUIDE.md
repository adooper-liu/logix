# CI 测试数据管理指南

## 概述

本指南说明如何从开发数据库 `logix_db` 导出测试数据，并在 CI 环境的 `logix_ci` 中使用。

---

## 为什么需要测试数据？

集成测试需要真实的数据才能有效验证业务逻辑：

1. **字典表数据** - 国家、港口、仓库等基础数据
2. **业务数据** - 货柜、海运记录等实际业务数据
3. **边界情况** - 覆盖各种异常场景的数据

---

## 工作流程

### 1. 从开发数据库导出数据（本地执行）

当您的 `logix_db` 中有合适的测试数据时，运行：

```bash
cd d:\Gihub\logix
bash backend/scripts/export-test-data.sh
```

**导出内容**:

- `backend/tests/integration/test-data/dictionaries.sql` - 所有字典表数据
- `backend/tests/integration/test-data/containers.csv` - 最近 50 个货柜
- `backend/tests/integration/test-data/sea_freight.csv` - 对应的海运记录
- `backend/tests/integration/test-data/metadata.json` - 元数据信息

### 2. 提交测试数据到 Git

```bash
git add backend/tests/integration/test-data/
git commit -m "test: 更新 CI 测试数据"
git push
```

**注意**: 测试数据文件应该提交到 Git，这样 CI 才能使用。

### 3. CI 自动导入

当代码推送到 GitHub 后，CI 会自动：

1. 创建 `logix_ci` 数据库
2. 执行 `03_create_tables.sql` 创建表结构
3. 运行 `import-test-data-ci.sh` 导入测试数据
4. 执行集成测试

---

## 何时需要更新测试数据？

### 需要更新的情况

✅ **新增字典项**

- 添加了新的国家、港口、仓库等
- 修改了字典表结构

✅ **业务逻辑变更**

- 智能排柜算法调整
- 成本计算规则变化
- 需要新的测试场景

✅ **测试覆盖率不足**

- 当前数据无法覆盖某些边界情况
- 需要更多样化的测试数据

### 不需要更新的情况

❌ **仅修改代码逻辑**

- 如果只是修复 bug 或优化性能
- 数据结构未变化

❌ **临时测试**

- 只是本地调试，不影响 CI

---

## 数据脱敏与安全

### 敏感数据处理

导出的测试数据**不应包含**：

- ❌ 真实的 API Token
- ❌ 客户敏感信息（姓名、电话、地址）
- ❌ 财务数据（真实金额、银行账号）
- ❌ 内部配置密钥

### 当前导出策略

**安全的数据**:

- ✅ 字典表数据（公开信息）
- ✅ 货柜号、提单号（业务标识符）
- ✅ 港口代码、日期（非敏感信息）

**需要注意**:

- ⚠️ 如果 `biz_containers` 表包含客户信息，需要在导出前脱敏
- ⚠️ 定期审查导出的数据，确保无敏感信息泄露

---

## 故障排查

### 问题 1: CI 中测试数据导入失败

**症状**: CI 日志显示 "未找到 dictionaries.sql"

**原因**: 测试数据文件未提交到 Git

**解决**:

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

### 问题 2: 测试数据过时

**症状**: 测试失败，提示缺少某些字典项

**原因**: 开发数据库已更新，但测试数据未同步

**解决**:

```bash
# 重新导出最新数据
bash backend/scripts/export-test-data.sh

# 提交更新
git add backend/tests/integration/test-data/
git commit -m "test: 更新测试数据以匹配最新 schema"
git push
```

### 问题 3: 数据量太大导致 CI 超时

**症状**: CI 运行时间过长或超时

**原因**: 导出的业务数据太多

**解决**:
编辑 `backend/scripts/export-test-data.sh`，减少 LIMIT 数量：

```bash
# 从 LIMIT 50 改为 LIMIT 20
LIMIT 20
```

---

## 最佳实践

### 1. 定期更新测试数据

建议频率：**每 2-4 周** 或当 schema 变更时

### 2. 保持数据最小化

只导出**必要的**测试数据：

- 字典表：全部（必需）
- 业务数据：20-50 条（足够覆盖常见场景）

### 3. 版本控制测试数据

每次更新测试数据时：

- 在 commit message 中说明更新原因
- 记录数据版本号（在 metadata.json 中）

### 4. 监控 CI 测试结果

如果测试突然失败：

1. 检查是否是测试数据问题
2. 对比本地开发和 CI 环境的数据差异
3. 必要时重新导出测试数据

---

## 高级用法

### 自定义导出范围

如果需要导出特定数据，可以修改 `export-test-data.sh`：

```bash
# 导出特定国家的货柜
psql -h localhost -U postgres -d "$DEV_DB" -c "
COPY (
  SELECT * FROM biz_containers
  WHERE country_code = 'US'
  ORDER BY created_at DESC
  LIMIT 30
) TO STDOUT WITH CSV HEADER
" > "$EXPORT_DIR/containers_us.csv"
```

### 多环境测试数据

可以为不同环境维护不同的测试数据集：

```
backend/tests/integration/test-data/
├── dev/          # 开发环境完整数据
├── ci-minimal/   # CI 最小数据集（快速测试）
└── ci-full/      # CI 完整数据集（全面测试）
```

---

## 相关文件

- **导出脚本**: `backend/scripts/export-test-data.sh`
- **导入脚本**: `backend/scripts/import-test-data-ci.sh`
- **测试数据目录**: `backend/tests/integration/test-data/`
- **CI 配置**: `.github/workflows/ci.yml`

---

## 常见问题

**Q: 为什么不直接在 CI 中连接开发数据库？**  
A: 安全和隔离考虑。CI 应该是独立、可重复的环境，不依赖外部资源。

**Q: 测试数据会泄露敏感信息吗？**  
A: 当前只导出字典表和少量业务标识符，不包含敏感信息。但仍需定期审查。

**Q: 能否自动化测试数据更新？**  
A: 可以设置 GitHub Action 定期触发导出，但需要人工审核后再提交。

---

**最后更新**: 2026-04-09  
**维护者**: LogiX 开发团队
