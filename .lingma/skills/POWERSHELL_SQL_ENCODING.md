# PowerShell 执行 SQL 脚本编码规范

## 核心问题

PowerShell 默认编码与 Docker exec、SQL 语句中的中文字符存在兼容性问题。

## 编码陷阱

### 陷阱 1: Here-String 中的中文导致命令解析失败

**错误示例**:
```powershell
$sqlQuery = @"
SELECT '测试' as test_name FROM table;
"@
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c $sqlQuery
```

**错误信息**:
```
所在位置 D:\Gihub\logix\scripts\verify-demurrage-currency-fix.ps1:26 字符: 31
+   LEFT(s.destination_port_code, 2) as country_code,
+                               ~
参数列表中缺少参量。
所在位置 D:\Gihub\logix\scripts\verify-demurrage-currency-fix.ps1:42 字符: 13
+ Write-Host "鎵ц SQL 鏌ヨ..." -ForegroundColor Green
+             ~~~
表达式或语句中包含意外的标记"鎵ц"。
```

**根本原因**:
1. PowerShell 文件编码不是 UTF-8 BOM
2. Here-String 中的特殊字符被误解析
3. 中文注释在管道传递时字符集转换失败

### 陷阱 2: Get-Content 管道传递的编码问题

**错误示例**:
```powershell
Get-Content script.sql | docker exec -i ... psql ...
```

**问题**: PowerShell 默认使用 UTF-16 LE 编码，而 PostgreSQL 期望 UTF-8。

## 解决方案

### 方案 1: 使用纯英文 SQL（推荐）

```powershell
# ✅ 避免中文，使用英文注释和别名
$sqlQuery = @"
-- Demurrage standard currency verification
SELECT 
  LEFT(s.destination_port_code, 2) as country_code,
  s.currency as standard_currency,
  c.currency as expected_currency,
  CASE WHEN s.currency = c.currency THEN 'OK' ELSE 'MISMATCH' END as status,
  COUNT(*) as count
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.is_chargeable = 'N' AND s.destination_port_code IS NOT NULL
GROUP BY country_code, standard_currency, expected_currency
ORDER BY country_code;
"@

docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c $sqlQuery
```

### 方案 2: 使用外部 SQL 文件 + UTF-8 编码

**步骤 1**: 创建 SQL 文件（UTF-8 编码）

```sql
-- verify-demurrage-currency.sql
-- 滞港费标准货币配置验证

SELECT 
  LEFT(s.destination_port_code, 2) as country_code,
  s.currency as standard_currency,
  c.currency as expected_currency,
  CASE WHEN s.currency = c.currency THEN 'OK' ELSE 'MISMATCH' END as status,
  COUNT(*) as count
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.is_chargeable = 'N' AND s.destination_port_code IS NOT NULL
GROUP BY country_code, standard_currency, expected_currency
ORDER BY country_code;
```

**步骤 2**: PowerShell 中正确读取并执行

```powershell
# ✅ 指定 UTF-8 编码读取
$sqlContent = Get-Content -Path "d:\Gihub\logix\scripts\query\verify-demurrage-currency.sql" -Encoding UTF8 -Raw

# ✅ 使用 Docker exec 执行（文件需在容器内可访问）
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c $sqlContent
```

### 方案 3: 直接 Bash 命令（最简单）

```bash
# ✅ 直接在 bash/zsh 中执行，避免 PowerShell 编码问题
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db <<EOF
SELECT 
  LEFT(s.destination_port_code, 2) as country_code,
  s.currency as standard_currency,
  c.currency as expected_currency,
  CASE WHEN s.currency = c.currency THEN 'OK' ELSE 'MISMATCH' END as status,
  COUNT(*) as count
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.is_chargeable = 'N' AND s.destination_port_code IS NOT NULL
GROUP BY country_code, standard_currency, expected_currency
ORDER BY country_code;
EOF
```

**Windows PowerShell 中使用 Git Bash**:
```powershell
# ✅ 调用 Git Bash 执行
& 'C:\Program Files\Git\bin\bash.exe' -c "docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c \"SELECT ...\""
```

## 最佳实践

### 1. 文件编码规范

所有 SQL 脚本文件必须使用 **UTF-8 (无 BOM)** 编码：

```powershell
# 检查文件编码
[System.IO.File]::ReadAllText("script.sql")

# 保存为 UTF-8 (无 BOM)
$content = Get-Content "script.sql"
[System.IO.File]::WriteAllText(
  "script.sql", 
  $content, 
  [System.Text.UTF8Encoding]::new($false)
)
```

### 2. PowerShell 脚本头部声明

```powershell
# encoding: utf-8
#Requires -Version 7.0

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

### 3. 避免在 PowerShell 中使用 Here-String 包含复杂 SQL

**不推荐**:
```powershell
$sql = @"
SELECT ... -- 多行 SQL
"@
```

**推荐**:
```powershell
# 方式 1: 单行简单 SQL
docker exec ... -c "SELECT column FROM table WHERE condition"

# 方式 2: 外部 SQL 文件
docker exec ... -f /path/to/script.sql

# 方式 3: 使用 Git Bash
& 'C:\Program Files\Git\bin\bash.exe' -c "command"
```

### 4. 使用专用 Bash 脚本

对于复杂的数据库操作，创建 `.sh` 脚本：

```bash
#!/bin/bash
# verify-demurrage-currency.sh

set -e

CONTAINER_NAME="logix-timescaledb-prod"
DB_USER="logix_user"
DB_NAME="logix_db"

echo "Verifying demurrage standard currency configuration..."

docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" <<EOF
SELECT 
  LEFT(s.destination_port_code, 2) as country_code,
  s.currency as standard_currency,
  c.currency as expected_currency,
  CASE WHEN s.currency = c.currency THEN 'OK' ELSE 'MISMATCH' END as status,
  COUNT(*) as count
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.is_chargeable = 'N' AND s.destination_port_code IS NOT NULL
GROUP BY country_code, standard_currency, expected_currency
ORDER BY country_code;
EOF

echo "Verification complete."
```

**执行方式**:
```powershell
# 在 Git Bash 中运行
& 'C:\Program Files\Git\bin\bash.exe' ./verify-demurrage-currency.sh
```

## 编码检查工具

### 检查 PowerShell 脚本编码

```powershell
function Test-ScriptEncoding {
    param([string]$FilePath)
    
    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    $utf8BOM = [System.Text.Encoding]::UTF8.GetPreamble()
    
    # 检查是否有 BOM
    $hasBOM = $true
    for ($i = 0; $i -lt $utf8BOM.Length; $i++) {
        if ($bytes[$i] -ne $utf8BOM[$i]) {
            $hasBOM = $false
            break
        }
    }
    
    if ($hasBOM) {
        Write-Host "文件包含 UTF-8 BOM (推荐)" -ForegroundColor Green
    } else {
        Write-Host "警告：文件不包含 UTF-8 BOM，可能导致编码问题" -ForegroundColor Yellow
    }
}
```

### 自动修复编码

```powershell
function Fix-ScriptEncoding {
    param([string]$FilePath)
    
    $content = Get-Content $FilePath -Raw
    $utf8NoBOM = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($FilePath, $content, $utf8NoBOM)
    
    Write-Host "已修复为 UTF-8 (无 BOM) 编码" -ForegroundColor Green
}
```

## 快速参考

| 场景 | 推荐做法 | 避免做法 |
|------|---------|---------|
| 简单查询 | `docker exec -c "SELECT ..."` | PowerShell Here-String |
| 复杂 SQL | 外部 .sql 文件 + UTF-8 | 内嵌多行 SQL |
| 含中文 SQL | 使用 Git Bash 执行 | PowerShell 直接执行 |
| 批量更新 | Bash 脚本 + 事务 | PowerShell 循环调用 |
| 输出结果 | 重定向到文件再读取 | 直接管道传递 |

## 案例：滞港费货币验证脚本修复

### 错误版本（PowerShell + Here-String）

```powershell
# ❌ verify-demurrage-currency-fix.ps1
$sqlQuery = @"
SELECT 
  LEFT(s.destination_port_code, 2) as country_code,  -- 包含中文注释
  s.currency as standard_currency
FROM ...
"@

Write-Host "执行 SQL 查询..." -ForegroundColor Green  # 中文字符串
docker exec ... -c $sqlQuery  # 编码错误导致解析失败
```

**错误信息**:
```
参数列表中缺少参量。
表达式或语句中包含意外的标记"鎵ц"。
```

### 正确版本（Bash 脚本）

```bash
#!/bin/bash
# verify-demurrage-currency.sh

echo "Verifying demurrage currency configuration..."

docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db <<EOF
SELECT 
  LEFT(s.destination_port_code, 2) as country_code,
  s.currency as standard_currency,
  c.currency as expected_currency,
  CASE WHEN s.currency = c.currency THEN 'OK' ELSE 'MISMATCH' END as status,
  COUNT(*) as count
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.is_chargeable = 'N' AND s.destination_port_code IS NOT NULL
GROUP BY country_code, standard_currency, expected_currency
ORDER BY country_code;
EOF

echo "Verification complete."
```

**执行**:
```powershell
& 'C:\Program Files\Git\bin\bash.exe' ./verify-demurrage-currency.sh
```

**结果**: ✅ 成功执行，无编码错误

## 总结

1. **优先使用 Bash 脚本**处理复杂 SQL 操作
2. **避免 PowerShell Here-String**包含多行 SQL
3. **使用外部 SQL 文件**时必须指定 UTF-8 编码
4. **简单查询**可直接在 PowerShell 中使用 `docker exec -c`
5. **包含中文**时务必使用 Git Bash 执行

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**作者**: 刘志高  
**状态**: 强制执行
