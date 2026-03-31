# ============================================================
# LogiX 通用字典映射系统初始化脚本
# Description: 初始化通用字典映射功能,支持所有字典类型的
#              名称到标准代码的转换
# 使用当前项目 Docker 配置：docker-compose.timescaledb.yml，服务 postgres，用户 postgres，库 logix_db
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  通用字典映射系统初始化" -ForegroundColor Cyan
Write-Host "  Universal Dictionary Mapping System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# 项目根目录（脚本在 backend/scripts，上一级 backend，再上一级为根）
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir
$ProjectRoot = Split-Path -Parent $BackendDir
$ComposeFile = Join-Path $ProjectRoot "docker-compose.timescaledb.yml"

# 开发环境配置（与 docker-compose.timescaledb.yml 一致）
$PgUser = "postgres"
$PgDb = "logix_db"

# 检查 compose 文件存在且 postgres 服务在运行（从项目根执行 compose 命令）
if (-not (Test-Path $ComposeFile)) {
    Write-Host "✗ 未找到: $ComposeFile" -ForegroundColor Red
    exit 1
}
Push-Location $ProjectRoot
try {
    $postgresId = docker compose -f $ComposeFile ps -q postgres 2>$null
    if (-not $postgresId) {
        Write-Host "✗ postgres 未运行。请在项目根目录执行: docker compose -f docker-compose.timescaledb.yml up -d postgres" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

# 迁移文件路径
$MigrationDir = Join-Path $BackendDir "migrations"
$CreateMappingSql = Join-Path $MigrationDir "create_universal_dict_mapping.sql"
$FixPortLengthSql = Join-Path $MigrationDir "fix_port_field_length.sql"

function Invoke-ComposePsql {
    param([string]$InputSql)
    Push-Location $ProjectRoot
    try { $InputSql | docker compose -f $ComposeFile exec -T postgres psql -U $PgUser -d $PgDb 2>&1 }
    finally { Pop-Location }
}
function Invoke-ComposePsqlCmd {
    param([string]$Cmd)
    Push-Location $ProjectRoot
    try { docker compose -f $ComposeFile exec -T postgres psql -U $PgUser -d $PgDb -c $Cmd 2>&1 }
    finally { Pop-Location }
}

# 1. 创建通用字典映射表
Write-Host "[1/3] 创建通用字典映射表..." -ForegroundColor Yellow
if (-not (Test-Path $CreateMappingSql)) {
    Write-Host "✗ 未找到: $CreateMappingSql" -ForegroundColor Red
    exit 1
}
Invoke-ComposePsql -InputSql (Get-Content $CreateMappingSql -Raw) | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 通用字典映射表创建成功" -ForegroundColor Green
} else {
    Write-Host "✗ 通用字典映射表创建失败" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. 扩大字段长度(临时兼容措施)
Write-Host "[2/3] 扩大字段长度..." -ForegroundColor Yellow
if (Test-Path $FixPortLengthSql) {
    Invoke-ComposePsql -InputSql (Get-Content $FixPortLengthSql -Raw) | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 字段长度调整成功" -ForegroundColor Green
    } else {
        Write-Host "✗ 字段长度调整失败" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  跳过（文件不存在）" -ForegroundColor Gray
}
Write-Host ""

# 3. 验证映射表数据
Write-Host "[3/3] 验证映射数据..." -ForegroundColor Yellow
Write-Host ""

Write-Host "字典类型统计:" -ForegroundColor White
Invoke-ComposePsqlCmd -Cmd "SELECT dict_type, COUNT(*) as count FROM dict_universal_mapping GROUP BY dict_type ORDER BY dict_type;"
Write-Host ""

Write-Host "港口映射示例:" -ForegroundColor White
Invoke-ComposePsqlCmd -Cmd "SELECT name_cn, standard_code FROM dict_universal_mapping WHERE dict_type = 'PORT' LIMIT 5;"
Write-Host ""

Write-Host "国家映射示例:" -ForegroundColor White
Invoke-ComposePsqlCmd -Cmd "SELECT name_cn, standard_code FROM dict_universal_mapping WHERE dict_type = 'COUNTRY' LIMIT 5;"
Write-Host ""

Write-Host "船公司映射示例:" -ForegroundColor White
Invoke-ComposePsqlCmd -Cmd "SELECT name_cn, standard_code FROM dict_universal_mapping WHERE dict_type = 'SHIPPING_COMPANY' LIMIT 5;"
Write-Host ""

# 4. 测试数据库函数（通过 stdin 传 SQL 避免 PowerShell 中文编码问题）
Write-Host "测试数据库函数..." -ForegroundColor Yellow
Write-Host ""

$utf8 = [System.Text.Encoding]::UTF8
$testSql1 = "SELECT get_standard_code('PORT', '青岛');"
$testSql2 = "SELECT get_standard_code('COUNTRY', '中国');"
$testSql3 = "SELECT get_standard_codes_batch('PORT', ARRAY['青岛', '宁波', '洛杉矶'])::text;"

Write-Host "测试 get_standard_code('PORT', '青岛'):" -ForegroundColor Gray
Push-Location $ProjectRoot
[System.IO.File]::WriteAllText("$ProjectRoot\tmp_psql1.sql", $testSql1, $utf8)
$portResult = Get-Content "$ProjectRoot\tmp_psql1.sql" -Raw -Encoding UTF8 | docker compose -f $ComposeFile exec -T postgres psql -U $PgUser -d $PgDb -t 2>$null | ForEach-Object { $_.Trim() }
Remove-Item "$ProjectRoot\tmp_psql1.sql" -ErrorAction SilentlyContinue
Pop-Location
Write-Host "  结果: $portResult" -ForegroundColor White
Write-Host ""

Write-Host "测试 get_standard_code('COUNTRY', '中国'):" -ForegroundColor Gray
Push-Location $ProjectRoot
[System.IO.File]::WriteAllText("$ProjectRoot\tmp_psql2.sql", $testSql2, $utf8)
$countryResult = Get-Content "$ProjectRoot\tmp_psql2.sql" -Raw -Encoding UTF8 | docker compose -f $ComposeFile exec -T postgres psql -U $PgUser -d $PgDb -t 2>$null | ForEach-Object { $_.Trim() }
Remove-Item "$ProjectRoot\tmp_psql2.sql" -ErrorAction SilentlyContinue
Pop-Location
Write-Host "  结果: $countryResult" -ForegroundColor White
Write-Host ""

Write-Host "测试批量查询 get_standard_codes_batch('PORT', ...):" -ForegroundColor Gray
Push-Location $ProjectRoot
[System.IO.File]::WriteAllText("$ProjectRoot\tmp_psql3.sql", $testSql3, $utf8)
$batchResult = Get-Content "$ProjectRoot\tmp_psql3.sql" -Raw -Encoding UTF8 | docker compose -f $ComposeFile exec -T postgres psql -U $PgUser -d $PgDb -t 2>$null | ForEach-Object { $_.Trim() }
Remove-Item "$ProjectRoot\tmp_psql3.sql" -ErrorAction SilentlyContinue
Pop-Location
Write-Host "  结果: $batchResult" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  初始化完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "新增API端点:" -ForegroundColor White
Write-Host "  GET  /api/dict-mapping/universal/code?dictType=X&name=Y" -ForegroundColor Gray
Write-Host "       - 获取标准代码(通用)" -ForegroundColor Gray
Write-Host ""
Write-Host "  POST /api/dict-mapping/universal/batch" -ForegroundColor Gray
Write-Host "       - 批量获取标准代码" -ForegroundColor Gray
Write-Host ""
Write-Host "  GET  /api/dict-mapping/universal/types" -ForegroundColor Gray
Write-Host "       - 获取所有字典类型" -ForegroundColor Gray
Write-Host ""
Write-Host "  GET  /api/dict-mapping/universal/type/:dictType" -ForegroundColor Gray
Write-Host "       - 获取指定类型的所有映射" -ForegroundColor Gray
Write-Host ""
Write-Host "  GET  /api/dict-mapping/universal/search/:dictType?keyword=X" -ForegroundColor Gray
Write-Host "       - 模糊搜索映射" -ForegroundColor Gray
Write-Host ""
Write-Host "  POST /api/dict-mapping/universal" -ForegroundColor Gray
Write-Host "       - 添加新的映射" -ForegroundColor Gray
Write-Host ""
Write-Host "  POST /api/dict-mapping/universal/batch-add" -ForegroundColor Gray
Write-Host "       - 批量添加映射" -ForegroundColor Gray
Write-Host ""
Write-Host "  PUT  /api/dict-mapping/universal/:id" -ForegroundColor Gray
Write-Host "       - 更新映射" -ForegroundColor Gray
Write-Host ""
Write-Host "  DELETE /api/dict-mapping/universal/:id" -ForegroundColor Gray
Write-Host "       - 删除映射" -ForegroundColor Gray
Write-Host ""
Write-Host "  GET  /api/dict-mapping/universal/stats/summary" -ForegroundColor Gray
Write-Host "       - 获取映射统计信息" -ForegroundColor Gray
Write-Host ""

Write-Host "支持的字典类型:" -ForegroundColor White
Write-Host "  - PORT               (港口)" -ForegroundColor Gray
Write-Host "  - COUNTRY            (国家)" -ForegroundColor Gray
Write-Host "  - SHIPPING_COMPANY   (船公司)" -ForegroundColor Gray
Write-Host "  - CONTAINER_TYPE     (柜型)" -ForegroundColor Gray
Write-Host "  - FREIGHT_FORWARDER  (货代公司)" -ForegroundColor Gray
Write-Host "  - CUSTOMS_BROKER     (清关公司)" -ForegroundColor Gray
Write-Host "  - TRUCKING_COMPANY   (拖车公司)" -ForegroundColor Gray
Write-Host "  - WAREHOUSE          (仓库)" -ForegroundColor Gray
Write-Host "  - CUSTOMER           (客户)" -ForegroundColor Gray
Write-Host "  - ...                (可扩展)" -ForegroundColor Gray
Write-Host ""

Write-Host "下一步操作:" -ForegroundColor White
Write-Host "  1. 重启后端服务以加载新的路由和控制器" -ForegroundColor Gray
Write-Host "  2. 重启前端服务以加载通用字典映射服务" -ForegroundColor Gray
Write-Host "  3. 查看文档: docs/UNIVERSAL_DICT_MAPPING_GUIDE.md" -ForegroundColor Gray
Write-Host "  4. Excel 导入时会自动使用通用映射进行转换" -ForegroundColor Gray
Write-Host ""
