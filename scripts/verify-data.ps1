# LogiX 数据验证脚本 - PowerShell版本
# 用途：验证Excel导入数据与数据库数据的一致性

param(
    [string]$OrderNumber = "24DSC4914",
    [string]$ContainerNumber = "FANU3376528",
    [string]$BillOfLading = "HLCUNG12501WPWJ9"
)

# 容器名称
$ContainerName = "logix-timescaledb-prod"

# 构建SQL命令
$sqlScript = Get-Content "$PSScriptRoot\verify_excel_data_consistency.sql" -Raw

# 替换SQL中的变量
$sqlScript = $sqlScript -replace "\\set order_number '.*'", "\\set order_number '$OrderNumber'"
$sqlScript = $sqlScript -replace "\\set container_number '.*'", "\\set container_number '$ContainerNumber'"
$sqlScript = $sqlScript -replace "\\set bill_of_lading '.*'", "\\set bill_of_lading '$BillOfLading'"

# 执行验证
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "数据验证脚本" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "备货单号: $OrderNumber" -ForegroundColor Yellow
Write-Host "货柜号: $ContainerNumber" -ForegroundColor Yellow
Write-Host "提单号: $BillOfLading" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 检查容器是否运行
$containerStatus = docker ps --filter "name=$ContainerName" --format "{{.Status}}"
if (-not $containerStatus) {
    Write-Host "错误: 容器 $ContainerName 未运行!" -ForegroundColor Red
    exit 1
}

Write-Host "正在执行验证..." -ForegroundColor Green
Write-Host ""

# 执行SQL
echo $sqlScript | docker exec -i $ContainerName psql -U logix_user -d logix_db

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "验证完成!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
