<#
.SYNOPSIS
    LogiX 测试数据清理工具
    删除导入的测试数据（备货单、货柜及相关流程表、扩展表）

.DESCRIPTION
    该脚本连接到 PostgreSQL 数据库并执行清理脚本，删除所有测试数据。
    支持本地开发和测试环境使用。

.PARAMETER Database
    数据库名称，默认为 logix

.PARAMETER Host
    数据库主机，默认为 localhost

.PARAMETER Port
    数据库端口，默认为 5432

.PARAMETER Username
    数据库用户名，默认为 postgres

.PARAMETER Password
    数据库密码（建议使用环境变量 LOGIX_DB_PASSWORD）

.PARAMETER SqlFile
    SQL 脚本文件路径，默认为当前目录下的 cleanup-test-data.sql

.PARAMETER DryRun
    仅显示将要执行的 SQL 语句，不实际执行

.PARAMETER Force
    跳过确认提示，直接执行

.EXAMPLE
    .\cleanup-test-data.ps1
    使用默认参数执行清理

.EXAMPLE
    .\cleanup-test-data.ps1 -Database "logix_test" -Username "admin"
    指定数据库和用户名

.EXAMPLE
    .\cleanup-test-data.ps1 -DryRun
    预览将要执行的 SQL 语句

.EXAMPLE
    $env:LOGIX_DB_PASSWORD = "your_password"; .\cleanup-test-data.ps1 -Force
    使用环境变量设置密码并跳过确认

.NOTES
    文件名: cleanup-test-data.ps1
    作者: LogiX Team
    版本: 1.0.1
    创建日期: 2026-03-26
    更新日期: 2026-03-26

.LINK
    https://github.com/your-org/logix
#>

[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(HelpMessage = "数据库名称")]
    [string]$Database = "logix",

    [Parameter(HelpMessage = "数据库主机")]
    [string]$DbHost = "localhost",

    [Parameter(HelpMessage = "数据库端口")]
    [int]$Port = 5432,

    [Parameter(HelpMessage = "数据库用户名")]
    [string]$Username = "postgres",

    [Parameter(HelpMessage = "数据库密码")]
    [string]$Password = $env:LOGIX_DB_PASSWORD,

    [Parameter(HelpMessage = "SQL 脚本文件路径")]
    [string]$SqlFile = (Join-Path $PSScriptRoot "cleanup-test-data.sql"),

    [Parameter(HelpMessage = "仅预览 SQL 语句")]
    [switch]$DryRun,

    [Parameter(HelpMessage = "跳过确认提示")]
    [switch]$Force
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色定义
$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"

# 输出函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $ColorInfo
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $ColorSuccess
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $ColorWarning
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $ColorError
}

# 显示脚本信息
function Show-Banner {
    Write-Host @"
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           LogiX 测试数据清理工具 v1.0.1                      ║
║                                                              ║
║   警告：此操作将删除所有测试数据，请谨慎使用！               ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
"@ -ForegroundColor $ColorWarning
}

# 检查依赖
function Test-Dependencies {
    Write-Info "检查依赖项..."

    # 检查 psql 是否安装
    $psqlPath = Get-Command "psql" -ErrorAction SilentlyContinue
    if (-not $psqlPath) {
        Write-Error "未找到 psql 命令。请确保 PostgreSQL 客户端已安装并添加到 PATH。"
        Write-Info "下载地址: https://www.postgresql.org/download/"
        exit 1
    }

    Write-Success "psql 已找到: $($psqlPath.Source)"

    # 检查 SQL 文件是否存在
    if (-not (Test-Path $SqlFile)) {
        Write-Error "SQL 文件不存在: $SqlFile"
        exit 1
    }

    Write-Success "SQL 文件已找到: $SqlFile"
}

# 验证数据库连接
function Test-DatabaseConnection {
    Write-Info "验证数据库连接..."

    $env:PGPASSWORD = $Password
    $connectionString = "postgresql://$Username@$DbHost`:$Port/$Database"

    try {
        $result = psql -h $DbHost -p $Port -U $Username -d $Database -c "SELECT 1 as connected;" 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "连接失败"
        }
        Write-Success "数据库连接成功: $connectionString"
    }
    catch {
        Write-Error "数据库连接失败: $connectionString"
        Write-Error $_.Exception.Message
        exit 1
    }
    finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

# 预览将要删除的数据
function Show-Preview {
    Write-Info "预览将要删除的数据..."
    Write-Host ""

    $env:PGPASSWORD = $Password

    $tables = @(
        @{Name = "ext_container_alerts"; Desc = "货柜预警"},
        @{Name = "ext_container_status_events"; Desc = "货柜状态事件"},
        @{Name = "ext_container_loading_records"; Desc = "货柜装载记录"},
        @{Name = "ext_container_charges"; Desc = "货柜费用"},
        @{Name = "ext_demurrage_records"; Desc = "滞港费记录"},
        @{Name = "ext_feituo_status_events"; Desc = "飞托状态事件"},
        @{Name = "ext_feituo_places"; Desc = "飞托地点"},
        @{Name = "sys_data_change_log"; Desc = "系统数据变更日志"},
        @{Name = "ext_trucking_return_slot_occupancy"; Desc = "车队还箱档期"},
        @{Name = "ext_trucking_slot_occupancy"; Desc = "车队运输档期"},
        @{Name = "ext_warehouse_daily_occupancy"; Desc = "仓库日占用"},
        @{Name = "process_port_operations"; Desc = "港口操作"},
        @{Name = "process_trucking_transport"; Desc = "拖卡运输"},
        @{Name = "process_warehouse_operations"; Desc = "仓库操作"},
        @{Name = "process_empty_return"; Desc = "还空箱"},
        @{Name = "biz_replenishment_orders"; Desc = "备货单"},
        @{Name = "biz_containers"; Desc = "货柜"},
        @{Name = "process_sea_freight"; Desc = "海运"}
    )

    Write-Host "表名                                      记录数      说明" -ForegroundColor $ColorInfo
    Write-Host "─────────────────────────────────────────────────────────────────" -ForegroundColor $ColorInfo

    $totalRecords = 0

    foreach ($table in $tables) {
        try {
            $count = psql -h $DbHost -p $Port -U $Username -d $Database -t -c "SELECT COUNT(*) FROM $($table.Name);" 2>$null
            $count = $count.Trim()
            if ($count -match '^\d+$') {
                $totalRecords += [int]$count
                $color = if ([int]$count -gt 0) { $ColorWarning } else { $ColorSuccess }
                Write-Host ($table.Name.PadRight(40) + $count.PadRight(12) + $table.Desc) -ForegroundColor $color
            }
        }
        catch {
            Write-Host ($table.Name.PadRight(40) + "N/A".PadRight(12) + $table.Desc) -ForegroundColor $ColorError
        }
    }
}
