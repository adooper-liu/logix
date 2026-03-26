# LogiX 测试数据清理工具

## 文件说明

| 文件 | 说明 |
|------|------|
| `cleanup-test-data.sql` | SQL 清理脚本，删除所有测试数据 |
| `cleanup-test-data.ps1` | PowerShell 命令行工具，可交互式执行清理 |
| `README.md` | 本说明文档 |

## 功能特性

### SQL 脚本 (`cleanup-test-data.sql`)

删除以下表的数据（按依赖关系倒序）：

#### 扩展表
- `ext_container_alerts` - 货柜预警
- `ext_container_status_events` - 货柜状态事件
- `ext_container_loading_records` - 货柜装载记录
- `ext_container_charges` - 货柜费用
- `ext_demurrage_records` - 滞港费记录
- `ext_feituo_status_events` - 飞托状态事件
- `ext_feituo_places` - 飞托地点
- `ext_feituo_import_batch` - 飞托导入批次
- `sys_data_change_log` - 系统数据变更日志
- `ext_trucking_return_slot_occupancy` - 车队还箱档期
- `ext_trucking_slot_occupancy` - 车队运输档期
- `ext_warehouse_daily_occupancy` - 仓库日占用

#### 流程表
- `process_port_operations` - 港口操作
- `process_trucking_transport` - 拖卡运输
- `process_warehouse_operations` - 仓库操作
- `process_empty_return` - 还空箱

#### 业务表
- `biz_replenishment_orders` - 备货单
- `biz_containers` - 货柜
- `process_sea_freight` - 海运

## 使用方法

### 方法一：直接执行 SQL 脚本

```bash
# 使用 psql 命令行工具
psql -h localhost -p 5432 -U postgres -d logix -f cleanup-test-data.sql

# 或使用环境变量设置密码
$env:PGPASSWORD = "your_password"
psql -h localhost -p 5432 -U postgres -d logix -f cleanup-test-data.sql
```

### 方法二：使用 PowerShell 脚本（推荐）

#### 基本用法

```powershell
# 进入 scripts 目录
cd D:\Gihub\logix\scripts

# 执行清理（交互式，需要输入密码和确认）
.\cleanup-test-data.ps1

# 使用环境变量设置密码
$env:LOGIX_DB_PASSWORD = "your_password"
.\cleanup-test-data.ps1

# 跳过确认提示（危险操作，谨慎使用）
.\cleanup-test-data.ps1 -Force

# 预览将要删除的数据
.\cleanup-test-data.ps1 -DryRun

# 指定数据库参数
.\cleanup-test-data.ps1 -Database "logix_test" -Host "192.168.1.100" -Username "admin"
```

#### 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `-Database` | 数据库名称 | logix |
| `-Host` | 数据库主机 | localhost |
| `-Port` | 数据库端口 | 5432 |
| `-Username` | 数据库用户名 | postgres |
| `-Password` | 数据库密码 | 从环境变量 LOGIX_DB_PASSWORD 读取 |
| `-SqlFile` | SQL 脚本文件路径 | cleanup-test-data.sql |
| `-DryRun` | 仅预览，不执行 | - |
| `-Force` | 跳过确认提示 | - |

#### 使用示例

```powershell
# 示例 1：基本使用（交互式）
.\cleanup-test-data.ps1

# 示例 2：使用环境变量密码
$env:LOGIX_DB_PASSWORD = "postgres123"
.\cleanup-test-data.ps1

# 示例 3：预览将要删除的数据
.\cleanup-test-data.ps1 -DryRun

# 示例 4：连接到远程数据库
$env:LOGIX_DB_PASSWORD = "remote_password"
.\cleanup-test-data.ps1 -Host "192.168.1.100" -Port 5433 -Database "logix_prod"

# 示例 5：自动化脚本中使用（跳过确认）
$env:LOGIX_DB_PASSWORD = "test_password"
.\cleanup-test-data.ps1 -Force
```

## 安全提示

⚠️ **警告**：此操作将永久删除数据，不可恢复！

1. **生产环境慎用**：请勿在生产环境直接执行，建议先在测试环境验证
2. **备份数据**：执行前请确保已备份重要数据
3. **确认机制**：PowerShell 脚本默认需要输入 "DELETE" 确认
4. **预览功能**：建议使用 `-DryRun` 参数预览将要执行的 SQL

## 依赖要求

- PostgreSQL 客户端 (`psql`) 已安装并添加到 PATH
- PowerShell 5.1 或更高版本（Windows）
- PowerShell 7.x（跨平台，推荐）

## 安装 PostgreSQL 客户端

### Windows

1. 下载 PostgreSQL 安装程序：https://www.postgresql.org/download/windows/
2. 安装时选择 "Command Line Tools"
3. 将 `C:\Program Files\PostgreSQL\<version>\bin` 添加到系统 PATH

### macOS

```bash
brew install libpq
# 或安装完整 PostgreSQL
brew install postgresql
```

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

## 故障排除

### 问题 1：找不到 psql 命令

**错误信息**：
```
未找到 psql 命令。请确保 PostgreSQL 客户端已安装并添加到 PATH。
```

**解决方案**：
1. 确认 PostgreSQL 客户端已安装
2. 将 psql 所在目录添加到系统 PATH
3. 重新打开 PowerShell 窗口

### 问题 2：连接失败

**错误信息**：
```
数据库连接失败: postgresql://postgres@localhost:5432/logix
```

**解决方案**：
1. 确认 PostgreSQL 服务正在运行
2. 检查主机名、端口、用户名和密码是否正确
3. 确认防火墙允许连接

### 问题 3：权限不足

**错误信息**：
```
ERROR:  permission denied for table xxx
```

**解决方案**：
1. 使用具有足够权限的数据库用户
2. 或联系数据库管理员授权

## 更新日志

### v1.0.0 (2026-03-26)
- 初始版本
- 支持 19 个表的数据清理
- 添加 PowerShell 交互式工具
- 支持预览和确认机制

## 相关文档

- [数据库查询 SKILL](../../backend/.cursor/rules/logix-project-map.mdc)
- [项目数据库设计](../../backend/03_create_tables.sql)

## 联系方式

如有问题，请联系 LogiX 开发团队。
