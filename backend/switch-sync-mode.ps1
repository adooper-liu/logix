# ============================================================
# 切换数据库同步模式脚本
# Switch Database Synchronize Mode Script
# ============================================================
# 用途: 在TypeORM自动同步和SQL脚本管理之间切换
# Usage: .\switch-sync-mode.ps1 [mode]
#   mode: true  - 启用TypeORM自动同步
#   mode: false - 禁用自动同步，使用SQL脚本
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("true", "false", "check")]
    [string]$Mode
)

$envFiles = @(
    ".env",
    ".env.dev"
)

# 颜色输出
$Green = "`e[0;32m"
$Red = "`e[0;31m"
$Yellow = "`e[1;33m"
$NC = "`e[0m" # No Color

Write-Host "${Yellow}========================================${NC}"
Write-Host "${Yellow}数据库同步模式切换${NC}"
Write-Host "${Yellow}========================================${NC}"

if ($Mode -eq "check") {
    Write-Host ""
    Write-Host "${Yellow}当前同步模式:${NC}"

    foreach ($file in $envFiles) {
        if (Test-Path $file) {
            $content = Get-Content $file | Select-String "DB_SYNCHRONIZE"
            if ($content) {
                $modeValue = $content.ToString() -replace '.*=', ''
                $modeValue = $modeValue.Trim()

                if ($modeValue -eq "true") {
                    Write-Host "  $file : ${Green}启用 (TypeORM自动同步)${NC}"
                } else {
                    Write-Host "  $file : ${Red}禁用 (SQL脚本管理)${NC}"
                }
            } else {
                Write-Host "  $file : ${Yellow}未配置 (默认禁用)${NC}"
            }
        } else {
            Write-Host "  $file : ${Red}文件不存在${NC}"
        }
    }

    Write-Host ""
    Write-Host "${Yellow}说明:${NC}"
    Write-Host "  ${Green}启用 (true)${NC}  - 实体修改后自动同步表结构"
    Write-Host "  ${Red}禁用 (false)${NC} - 使用SQL脚本管理，更安全"
    exit 0
}

# 切换模式
Write-Host ""
Write-Host "${Yellow}设置同步模式为: ${NC}$Mode"

$modified = 0

foreach ($file in $envFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw

        if ($content -match 'DB_SYNCHRONIZE\s*=\s*\w+') {
            $content = $content -replace 'DB_SYNCHRONIZE\s*=\s*\w+', "DB_SYNCHRONIZE=$Mode"
            Set-Content -Path $file -Value $content -NoNewline
            Write-Host "${Green}✓${NC} 已更新: $file"
            $modified++
        } else {
            # 添加配置
            Add-Content -Path $file -Value "`r`nDB_SYNCHRONIZE=$Mode"
            Write-Host "${Green}✓${NC} 已添加: $file"
            $modified++
        }
    } else {
        Write-Host "${Red}✗${NC} 文件不存在: $file"
    }
}

Write-Host ""
if ($Mode -eq "true") {
    Write-Host "${Green}已启用TypeORM自动同步${NC}"
    Write-Host ""
    Write-Host "${Yellow}注意事项:${NC}"
    Write-Host "  1. 确保实体定义与SQL表结构完全一致"
    Write-Host "  2. 外键关系可能同步失败"
    Write-Host "  3. 生产环境请禁用此功能"
    Write-Host "  4. 重启后端服务生效"
} else {
    Write-Host "${Red}已禁用自动同步，使用SQL脚本管理${NC}"
    Write-Host ""
    Write-Host "${Yellow}说明:${NC}"
    Write-Host "  1. 表结构修改需更新SQL脚本"
    Write-Host "  2. 初始化执行: .\reinit_database_docker.ps1"
    Write-Host "  3. 生产环境推荐使用此模式"
    Write-Host "  4. 重启后端服务生效"
}

Write-Host ""
Write-Host "${Green}已修改 $modified 个文件${NC}"
Write-Host "${Yellow}========================================${NC}"
