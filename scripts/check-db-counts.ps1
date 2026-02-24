#!/usr/bin/env pwsh

<#
.SYNOPSIS
    查询 LogiX 数据库所有表的记录数
.DESCRIPTION
    一键查询 TimescaleDB 中所有表的记录统计
#>

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  LogiX 数据库记录统计" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 数据库连接信息
$DB_HOST = "localhost"
$DB_PORT = 5432
$DB_USER = "logix_user"
$DB_NAME = "logix_db"

# 查询业务表的记录数
$businessTables = @(
    @{ Name = "备货单"; Table = "biz_replenishment_orders" },
    @{ Name = "货柜"; Table = "biz_containers" },
    @{ Name = "海运信息"; Table = "process_sea_freight" },
    @{ Name = "港口操作"; Table = "process_port_operations" },
    @{ Name = "拖卡运输"; Table = "process_trucking" },
    @{ Name = "仓库操作"; Table = "process_warehouse_operations" },
    @{ Name = "还空箱"; Table = "process_empty_returns" },
    @{ Name = "海运费用"; Table = "container_charges" },
    @{ Name = "状态事件"; Table = "container_status_events" },
    @{ Name = "提柜记录"; Table = "container_loading_records" },
    @{ Name = "滞柜记录"; Table = "container_hold_records" }
)

# 查询字典表的记录数
$dictTables = @(
    @{ Name = "港口字典"; Table = "dict_ports" },
    @{ Name = "船公司字典"; Table = "dict_shipping_companies" },
    @{ Name = "柜型字典"; Table = "dict_container_types" },
    @{ Name = "货代公司字典"; Table = "dict_freight_forwarders" },
    @{ Name = "清关公司字典"; Table = "dict_customs_brokers" },
    @{ Name = "拖车公司字典"; Table = "dict_trucking_companies" },
    @{ Name = "仓库字典"; Table = "dict_warehouses" }
)

Write-Host "【业务表】" -ForegroundColor Green
Write-Host ""
$totalBusiness = 0

foreach ($table in $businessTables) {
    $query = "docker exec -i logix-timescaledb-prod psql -U $DB_USER -d $DB_NAME -t -c `"SELECT COUNT(*) FROM $($table.Table);`" 2>$null"
    $result = Invoke-Expression $query
    $count = [int]($result.Trim())
    $totalBusiness += $count

    Write-Host ("{0,-16} {1,-10} {2,10} 条" -f $table.Name, " $($table.Table)", $count)
}

Write-Host ""
Write-Host ("{0,-26} {1,10} 条" -f "业务表总计", $totalBusiness) -ForegroundColor Yellow
Write-Host ""

Write-Host "【字典表】" -ForegroundColor Green
Write-Host ""
$totalDict = 0

foreach ($table in $dictTables) {
    $query = "docker exec -i logix-timescaledb-prod psql -U $DB_USER -d $DB_NAME -t -c `"SELECT COUNT(*) FROM $($table.Table);`" 2>$null"
    $result = Invoke-Expression $query
    if ($result) {
        $count = [int]($result.Trim())
        $totalDict += $count
        Write-Host ("{0,-16} {1,-10} {2,10} 条" -f $table.Name, " $($table.Table)", $count)
    } else {
        Write-Host ("{0,-16} {1,-10} {2,10} 条" -f $table.Name, " $($table.Table)", 0) -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host ("{0,-26} {1,10} 条" -f "字典表总计", $totalDict) -ForegroundColor Yellow
Write-Host ""

$totalAll = $totalBusiness + $totalDict
Write-Host ("{0,-26} {1,10} 条" -f "总记录数", $totalAll) -ForegroundColor Cyan
Write-Host ""

# 显示货柜物流状态分布
Write-Host "【货柜物流状态分布】" -ForegroundColor Green
Write-Host ""
$query = "docker exec -i logix-timescaledb-prod psql -U $DB_USER -d $DB_NAME -c `"SELECT `"logisticsStatus`", COUNT(*) as count FROM biz_containers GROUP BY `"logisticsStatus`" ORDER BY count DESC;`" 2>$null"
$result = Invoke-Expression $query
Write-Host $result
Write-Host ""

Write-Host "查询完成！" -ForegroundColor Green
