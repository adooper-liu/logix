# 字典表完整数据初始化指南

## 📊 数据概览

| 字典表 | 精简版 | 完整版 | 状态 |
|--------|--------|--------|------|
| dict_countries | 43 | 43 | ✅ 完整 |
| dict_customer_types | 3 | 3 | ✅ 完整 |
| dict_container_types | 4 | 37 | ⚠️ 示例 |
| dict_overseas_companies | 9 | 9 | ✅ 完整 |
| dict_customs_brokers | 12 | 12 | ✅ 完整 |
| dict_freight_forwarders | 7 | 7 | ✅ 完整 |
| dict_shipping_companies | 10 | 92 | ⚠️ 示例 |
| dict_ports | 19 | 72 | ⚠️ 示例 |
| dict_warehouses | 5 | 149 | ⚠️ 示例 |
| dict_trucking_companies | 21 | 21 | ✅ 完整 |
| **总计** | **134** | **445** | - |

---

## 🎯 三种初始化方案

### 方案一：精简版（推荐用于开发/测试）

**文件**: `backend/02_init_dict_tables_final.sql`

**特点**：
- ✅ 快速部署（~2 秒）
- ✅ 包含核心主数据
- ✅ 适合功能开发和测试
- ⚠️ 部分表只有示例数据

**使用方式**：
```bash
.\reinit_database_docker.ps1
```

**适用场景**：
- 本地开发环境
- 单元测试
- 功能演示

---

### 方案二：完整版（推荐用于生产/UAT）

**文件**: `backend/02_init_dict_tables_complete.sql`

**特点**：
- ✅ 所有 445 条记录完整数据
- ✅ 符合最新业务规范
- ✅ 支持智能排产系统
- ⏱️ 部署时间适中（~5 秒）

**生成方式**：
```bash
# Step 1: 从生产库导出完整数据
cd d:\Gihub\logix\scripts
type export-complete-dict-data.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -t -A > ..\backend\02_init_dict_tables_complete.sql

# Step 2: 手动替换 reinit_database_docker.ps1 中的引用
# 将 "02_init_dict_tables_final.sql" 改为 "02_init_dict_tables_complete.sql"
```

**使用方式**：
修改 `backend/reinit_database_docker.ps1`：
```powershell
$coreScripts = @(
    "01_drop_all_tables.sql",
    "03_create_tables.sql",
    "03_create_tables_supplement.sql",
    "02_init_dict_tables_complete.sql",  # ← 修改这里
    "04_fix_constraints.sql",
    "05_init_warehouses.sql"
)
```

然后执行：
```bash
.\reinit_database_docker.ps1
```

**适用场景**：
- UAT 环境
- 生产环境
- 性能测试
- 用户培训

---

### 方案三：实时导出（最完整、最新）

**脚本**: `scripts/export-complete-dict-data.sql`

**特点**：
- ✅ 100% 与生产数据一致
- ✅ 包含所有业务配置
- ✅ 实时更新
- ⏱️ 导出时间 ~8 秒

**使用方式**：
```bash
# 导出为 SQL 文件
cd d:\Gihub\logix\scripts
type export-complete-dict-data.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -t -A > dict-tables-full-backup.sql

# 直接导入到新数据库
type export-complete-dict-data.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db
```

**适用场景**：
- 生产数据库迁移
- 灾难恢复
- 完整备份
- 数据审计

---

## 📁 文件清单

### 核心文件

| 文件名 | 用途 | 大小 | 位置 |
|--------|------|------|------|
| `02_init_dict_tables_final.sql` | 精简版初始化 | ~50KB | `backend/` |
| `02_init_dict_tables_complete.sql` | 完整版初始化 | ~200KB | `backend/` |
| `export-complete-dict-data.sql` | 实时导出脚本 | ~15KB | `scripts/` |
| `reinit_database_docker.ps1` | 一键初始化脚本 | ~10KB | `backend/` |

### 辅助文件

| 文件名 | 用途 | 位置 |
|--------|------|------|
| `DICT_TABLES_INIT_REPORT.md` | 初始化报告 | `scripts/` |
| `DICT_TABLE_RELATIONSHIPS_GUIDE.md` | 关系指南 | `docs/Database/` |
| `DICT_DATA_EXPORT_GUIDE.md` | 本指南 | `scripts/` |

---

## 🛠️ 操作步骤详解

### 方法 A：使用精简版（默认）

**Step 1**: 确保 Docker 容器运行
```bash
docker ps | Select-String logix-timescaledb-prod
```

**Step 2**: 执行初始化脚本
```bash
cd d:\Gihub\logix\backend
.\reinit_database_docker.ps1
```

**Step 3**: 验证数据
```bash
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT 'dict_countries' as table_name, COUNT(*) FROM dict_countries UNION ALL SELECT 'dict_trucking_companies', COUNT(*) FROM dict_trucking_companies;"
```

---

### 方法 B：使用完整版

**Step 1**: 生成完整 SQL 文件
```bash
cd d:\Gihub\logix\scripts
type export-complete-dict-data.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -t -A > ..\backend\02_init_dict_tables_complete.sql
```

**Step 2**: 修改 PowerShell 脚本
编辑 `backend/reinit_database_docker.ps1`，找到第 38 行：
```powershell
"02_init_dict_tables_final.sql",
```
改为：
```powershell
"02_init_dict_tables_complete.sql",
```

**Step 3**: 执行初始化
```bash
cd d:\Gihub\logix\backend
.\reinit_database_docker.ps1
```

**Step 4**: 验证完整性
```bash
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT 
  (SELECT COUNT(*) FROM dict_countries) as countries,
  (SELECT COUNT(*) FROM dict_ports) as ports,
  (SELECT COUNT(*) FROM dict_warehouses) as warehouses,
  (SELECT COUNT(*) FROM dict_trucking_companies) as trucking_companies;
"
```

预期结果：
```
 countries | ports | warehouses | trucking_companies
-----------+-------+------------+--------------------
        43 |    72 |        149 |                 21
```

---

### 方法 C：实时导出并导入

**适用场景**：生产环境数据迁移

**Step 1**: 备份现有数据（可选）
```bash
docker exec -i logix-timescaledb-prod pg_dump -U logix_user logix_db > backup_before_init.sql
```

**Step 2**: 导出完整数据
```bash
cd d:\Gihub\logix\scripts
type export-complete-dict-data.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -t -A > full_dict_data.sql
```

**Step 3**: 在新环境中执行
```bash
type full_dict_data.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db
```

---

## ✅ 数据质量检查

### 1. 国家代码规范性检查

```sql
-- 检查是否全部为大写 ISO 代码
SELECT code, name_en 
FROM dict_countries 
WHERE code !~ '^[A-Z]{2}$';
-- 应返回 0 行
```

### 2. 车队代码规范性检查

```sql
-- 检查是否全部为大写，只包含 A-Z, 0-9, 下划线
SELECT company_code 
FROM dict_trucking_companies 
WHERE company_code !~ '^[A-Z0-9_]+$';
-- 应返回 0 行
```

### 3. 港口坐标有效性检查

```sql
-- 检查纬度是否在有效范围 (-90 ~ 90)
SELECT port_code, latitude 
FROM dict_ports 
WHERE latitude < -90 OR latitude > 90;
-- 应返回 0 行

-- 检查经度是否在有效范围 (-180 ~ 180)
SELECT port_code, longitude 
FROM dict_ports 
WHERE longitude < -180 OR longitude > 180;
-- 应返回 0 行
```

### 4. 外键完整性检查

```sql
-- 检查车队的国家代码是否都能在 dict_countries 中找到
SELECT tc.company_code, tc.country
FROM dict_trucking_companies tc
LEFT JOIN dict_countries c ON c.code = tc.country
WHERE tc.country IS NOT NULL AND c.code IS NULL;
-- 应返回 0 行

-- 检查仓库的国家代码
SELECT wh.warehouse_code, wh.country
FROM dict_warehouses wh
LEFT JOIN dict_countries c ON c.code = wh.country
WHERE wh.country IS NOT NULL AND c.code IS NULL;
-- 应返回 0 行

-- 检查港口的国家代码
SELECT p.port_code, p.country
FROM dict_ports p
LEFT JOIN dict_countries c ON c.code = p.country
WHERE p.country IS NOT NULL AND c.code IS NULL;
-- 应返回 0 行
```

### 5. 容量一致性检查

```sql
-- 检查有堆场的车队是否有 yard_daily_capacity
SELECT company_code, has_yard, yard_daily_capacity
FROM dict_trucking_companies
WHERE has_yard = true AND yard_daily_capacity IS NULL;
-- 应返回 0 行

-- 检查无堆场的车队 yard_daily_capacity 是否为 NULL
SELECT company_code, has_yard, yard_daily_capacity
FROM dict_trucking_companies
WHERE has_yard = false AND yard_daily_capacity IS NOT NULL;
-- 应返回 0 行
```

---

## 🔄 定期同步流程

建议每月从生产库同步一次字典表数据：

### 月度同步步骤

**Step 1**: 创建备份
```bash
cd d:\Gihub\logix\backend
Copy-Item 02_init_dict_tables_complete.sql 02_init_dict_tables_complete.backup.$(Get-Date -Format "yyyyMMdd").sql
```

**Step 2**: 重新导出
```bash
cd d:\Gihub\logix\scripts
type export-complete-dict-data.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -t -A > ..\backend\02_init_dict_tables_complete.sql
```

**Step 3**: 对比差异
```bash
# 比较新旧文件的行数
$old_lines = (Get-Content backend\02_init_dict_tables_complete.backup.*.sql | Measure-Object -Line).Lines
$new_lines = (Get-Content backend\02_init_dict_tables_complete.sql | Measure-Object -Line).Lines
Write-Host "旧版本：$old_lines 行，新版本：$new_lines 行"
```

**Step 4**: 验证并更新文档
```bash
# 统计各表记录数
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT 
  'dict_countries' as table_name, COUNT(*) as row_count FROM dict_countries
UNION ALL SELECT 'dict_ports', COUNT(*) FROM dict_ports
UNION ALL SELECT 'dict_warehouses', COUNT(*) FROM dict_warehouses
UNION ALL SELECT 'dict_trucking_companies', COUNT(*) FROM dict_trucking_companies;
"
```

---

## 📊 性能对比

| 方案 | 文件大小 | 执行时间 | 内存占用 | 适用环境 |
|------|----------|----------|----------|----------|
| 精简版 | ~50KB | ~2 秒 | 低 | 开发/测试 |
| 完整版 | ~200KB | ~5 秒 | 中 | UAT/生产 |
| 实时导出 | ~300KB | ~8 秒 | 中高 | 迁移/备份 |

---

## ⚠️ 注意事项

### 1. 数据安全

- ⚠️ **不要**将包含真实联系信息的完整数据提交到公共 Git 仓库
- ✅ 精简版数据已脱敏，可以安全共享
- 🔒 完整版数据请通过内部渠道分发

### 2. 版本控制

- ✅ 精简版脚本 (`02_init_dict_tables_final.sql`) 应纳入 Git 管理
- ⚠️ 完整版脚本 (`02_init_dict_tables_complete.sql`) 建议加入 `.gitignore`
- 📦 使用 Git LFS 管理大型 SQL 文件（如果必须纳入版本控制）

### 3. 环境隔离

- 🟢 **开发环境**：使用精简版
- 🟡 **测试环境**：使用精简版或完整版
- 🔴 **生产环境**：必须使用完整版或实时导出

---

## 🐛 常见问题

### Q1: 为什么我的初始化失败了？

**A**: 检查以下几点：
1. Docker 容器是否运行
2. 数据库用户权限是否正确
3. SQL 文件编码是否为 UTF-8
4. 表结构是否已正确创建

### Q2: 如何确认数据已正确导入？

**A**: 运行以下验证查询：
```bash
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT 
  (SELECT COUNT(*) FROM dict_countries) as countries,
  (SELECT COUNT(*) FROM dict_trucking_companies) as trucking,
  (SELECT COUNT(*) FROM dict_ports) as ports;
"
```

### Q3: 能否只更新某个字典表？

**A**: 可以。单独执行对应表的 INSERT 语句：
```bash
type scripts/export-single-table.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db
```

### Q4: 数据不一致怎么办？

**A**: 重新运行完整性检查脚本，然后根据需要重新导入。

---

## 📈 最佳实践总结

### ✅ DO（推荐做法）

1. ✅ 开发环境使用精简版，提高迭代速度
2. ✅ 生产环境使用完整版，确保数据准确
3. ✅ 每月同步一次生产数据
4. ✅ 定期检查数据规范性
5. ✅ 变更前先备份
6. ✅ 使用版本控制管理 SQL 脚本

### ❌ DON'T（避免做法）

1. ❌ 在生产环境使用过时的数据
2. ❌ 跳过数据验证步骤
3. ❌ 手动修改导出的 SQL 文件（容易出错）
4. ❌ 忽略外键约束检查
5. ❌ 不保留历史备份

---

## 📚 相关资源

### 内部文档

- `DICT_TABLE_RELATIONSHIPS_GUIDE.md` - 字典表关系指南
- `DICT_TABLES_INIT_REPORT.md` - 初始化报告
- `TRUCKING_COMPANY_CODE_STANDARDIZATION.md` - 车队代码规范化

### 外部标准

- [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) - 国家代码标准
- [UN/LOCODE](https://unece.org/trade/uncefact/unlocode) - 联合国港口代码
- [WGS84](https://en.wikipedia.org/wiki/World_Geodetic_System) - 地理坐标系统

---

**最后更新**: 2026-03-25  
**维护者**: SOLO Coder  
**版本**: v1.0
