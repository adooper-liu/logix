# Docker 数据库操作规范

## 核心原则

**一次正确执行，禁止试错**。所有数据库操作必须提前验证容器名、用户名、数据库名等参数。

## 标准操作流程

### Step 1: 检查运行中的容器

```powershell
docker ps -a | Select-String postgres
# 或
docker ps --filter "name=postgres" --format "{{.Names}}"
```

**常见容器名**:

- `logix-timescaledb-prod` (生产环境)
- `logix-postgres` (开发环境)
- `postgres` (默认)

### Step 2: 从配置文件确认数据库参数

```powershell
# 读取 .env 文件
$envFile = "d:\Gihub\logix\backend\.env"
$dbUsername = (Get-Content $envFile | Where-Object { $_ -match "^DB_USERNAME=" }) -replace "DB_USERNAME=", ""
$dbDatabase = (Get-Content $envFile | Where-Object { $_ -match "^DB_DATABASE=" }) -replace "DB_DATABASE=", ""
```

**典型配置**:

```ini
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=logix_user
DB_PASSWORD=LogiX@2024!Secure
DB_DATABASE=logix_db
```

### Step 3: 验证表结构（可选）

```bash
# 查看表结构
docker exec -it <container_name> psql -U <username> -d <database> -c "\d <table_name>"
```

**示例**:

```bash
docker exec -it logix-timescaledb-prod psql -U logix_user -d logix_db -c "\d dict_countries"
```

### Step 4: 执行 SQL 查询/更新

#### 方式一：直接执行单条 SQL（推荐）

```bash
docker exec -i <container_name> psql -U <username> -d <database> -c "<SQL 语句>"
```

**示例**:

```bash
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT code, name_cn, currency FROM dict_countries WHERE code = 'IT';"
```

#### 方式二：执行 SQL 文件

```bash
docker exec -i <container_name> psql -U <username> -d <database> -f /path/to/script.sql
```

**注意**: 文件路径是容器内路径，需要挂载或使用绝对路径。

#### 方式三：PowerShell 多行 SQL（使用 Here-String）

```powershell
$sqlQuery = @"
SELECT
  s.destination_port_code,
  s.currency,
  c.currency as expected_currency
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.is_chargeable = 'N'
ORDER BY s.destination_port_code;
"@

docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c $sqlQuery
```

## 编码陷阱与解决方案

### 陷阱 1: PowerShell 中直接执行含中文的 SQL

**错误示例**:

```powershell
# ❌ 会导致编码错误，显示乱码
docker exec ... -c "SELECT '测试' as test;"
```

**解决方案**:

1. 使用 SQL 文件（UTF-8 编码）
2. 避免在 SQL 中使用中文
3. 使用英文别名

### 陷阱 2: PowerShell Here-String 中的特殊字符

**错误示例**:

```powershell
# ❌ 双引号内的 $ 变量会被展开
$sql = @"
SELECT * FROM table WHERE id = $id
"@
```

**正确做法**:

```powershell
# ✅ 使用单引号或转义
$sql = @"
SELECT * FROM table WHERE id = '$id'
"@
# 或
$sql = @"
SELECT * FROM table WHERE id = ``$id
"@
```

### 陷阱 3: 管道传递 SQL 时的编码

**错误示例**:

```powershell
# ❌ PowerShell 默认编码可能导致问题
Get-Content script.sql | docker exec ... psql ...
```

**正确做法**:

```powershell
# ✅ 指定 UTF-8 编码
Get-Content script.sql -Encoding UTF8 | docker exec -i ... psql ...
```

## 事务处理规范

### 批量更新必须使用事务

```bash
# 开始事务
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "BEGIN;"

# 执行更新
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "UPDATE ..."

# 验证结果
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT ..."

# 提交事务
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "COMMIT;"

# 如有问题回滚
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "ROLLBACK;"
```

## 备份与恢复

### 创建备份表

```sql
CREATE TABLE backup_table_YYYYMMDD AS
SELECT * FROM original_table WHERE conditions;
```

**示例**:

```bash
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "CREATE TABLE ext_demurrage_standards_currency_backup_20260331 AS SELECT id, destination_port_code, currency, updated_at FROM ext_demurrage_standards WHERE is_chargeable = 'N' AND destination_port_code IS NOT NULL;"
```

### 从备份恢复

```sql
UPDATE original_table o
SET column = b.column
FROM backup_table_YYYYMMDD b
WHERE o.id = b.id;
```

## 常用命令模板

### 1. 检查数据一致性

```bash
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT
  LEFT(s.destination_port_code, 2) as country,
  s.currency as standard_currency,
  c.currency as expected_currency,
  CASE WHEN s.currency = c.currency THEN 'OK' ELSE 'MISMATCH' END as status,
  COUNT(*)
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.is_chargeable = 'N' AND s.destination_port_code IS NOT NULL
GROUP BY country, standard_currency, expected_currency
ORDER BY country;
"
```

### 2. 批量更新（带条件）

```bash
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
UPDATE ext_demurrage_standards s
SET currency = c.currency, updated_at = CURRENT_TIMESTAMP
FROM dict_countries c
WHERE LEFT(s.destination_port_code, 2) = c.code
  AND s.is_chargeable = 'N'
  AND s.destination_port_code IS NOT NULL
  AND s.currency != c.currency;
"
```

### 3. 统计更新行数

```bash
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT LEFT(destination_port_code, 2) as country, currency, COUNT(*)
FROM ext_demurrage_standards
WHERE is_chargeable = 'N' AND destination_port_code IS NOT NULL
GROUP BY country, currency
ORDER BY country;
"
```

## 检查清单

执行数据库操作前必须检查：

- [ ] 已确认容器名称（`docker ps -a`）
- [ ] 已从 `.env` 文件确认用户名和数据库名
- [ ] 已验证表结构和字段名（`\d table_name`）
- [ ] SQL 语句已在测试环境验证
- [ ] 已创建备份表
- [ ] 已使用事务包装批量更新
- [ ] 已准备回滚方案
- [ ] 已验证 PowerShell 编码（避免中文）

## 常见错误与解决方案

| 错误                             | 原因                | 解决方案                            |
| -------------------------------- | ------------------- | ----------------------------------- |
| `role "postgres" does not exist` | 用户名错误          | 从 .env 读取正确的用户名            |
| `column "xxx" does not exist`    | 字段名错误          | 使用 `\d table_name` 查看真实字段名 |
| 中文显示乱码                     | PowerShell 编码问题 | 使用 SQL 文件或避免中文             |
| `No such container`              | 容器名错误          | `docker ps -a` 确认容器名           |
| 更新行数为 0                     | WHERE 条件不匹配    | 先 SELECT 验证条件                  |

## 参考案例

### 案例 1: 滞港费货币配置修复

**背景**: 所有国家滞港费标准货币都配置为 USD，需修正为国家对应货币。

**执行流程**:

1. 检查容器：`docker ps -a` → `logix-timescaledb-prod`
2. 检查配置：读取 `.env` → `logix_user`, `logix_db`
3. 验证表结构：`\d dict_countries` → 字段名为 `code`, `currency`
4. 创建备份：
   ```bash
   docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "CREATE TABLE ext_demurrage_standards_currency_backup_20260331 AS SELECT ..."
   ```
5. 执行更新（事务包装）:
   ```bash
   docker exec -i ... -c "BEGIN;"
   docker exec -i ... -c "UPDATE ... WHERE ..."
   docker exec -i ... -c "COMMIT;"
   ```
6. 验证结果:
   ```bash
   docker exec -i ... -c "SELECT country, currency, COUNT(*) FROM ... GROUP BY ..."
   ```

**结果**: 成功更新 2,272 条记录，所有国家货币配置正确。

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**作者**: 刘志高  
**状态**: 强制执行
