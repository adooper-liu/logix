# -*- coding: utf-8 -*-
# LogiX Database Count Checker Script

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  LogiX Database Record Statistics" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$DB_USER = "logix_user"
$DB_NAME = "logix_db"

# Business Tables
$businessTables = @(
    @{ Name = "Replenishment Orders"; Table = "biz_replenishment_orders" },
    @{ Name = "Containers"; Table = "biz_containers" },
    @{ Name = "Sea Freight"; Table = "process_sea_freight" },
    @{ Name = "Port Operations"; Table = "process_port_operations" },
    @{ Name = "Trucking"; Table = "process_trucking" },
    @{ Name = "Warehouse Operations"; Table = "process_warehouse_operations" },
    @{ Name = "Empty Returns"; Table = "process_empty_returns" },
    @{ Name = "Container Charges"; Table = "container_charges" },
    @{ Name = "Status Events"; Table = "container_status_events" },
    @{ Name = "Loading Records"; Table = "container_loading_records" },
    @{ Name = "Hold Records"; Table = "container_hold_records" }
)

Write-Host "[Business Tables]" -ForegroundColor Green
Write-Host ""
$totalBusiness = 0

foreach ($table in $businessTables) {
    $query = "docker exec -i logix-timescaledb-prod psql -U $DB_USER -d $DB_NAME -t -c `"SELECT COUNT(*) FROM $($table.Table);`" 2>`$null"
    $result = Invoke-Expression $query
    if ($result -is [array]) {
        $count = [int]($result[0].Trim())
    } else {
        $count = [int]($result.Trim())
    }
    $totalBusiness += $count
    Write-Host ("{0,-30} {1,10} records" -f $table.Name, $count)
}

Write-Host ""
Write-Host ("{0,-30} {1,10} records" -f "Business Tables Total", $totalBusiness) -ForegroundColor Yellow
Write-Host ""

# Dictionary Tables
$dictTables = @(
    @{ Name = "Ports"; Table = "dict_ports" },
    @{ Name = "Shipping Companies"; Table = "dict_shipping_companies" },
    @{ Name = "Container Types"; Table = "dict_container_types" },
    @{ Name = "Freight Forwarders"; Table = "dict_freight_forwarders" },
    @{ Name = "Customs Brokers"; Table = "dict_customs_brokers" },
    @{ Name = "Trucking Companies"; Table = "dict_trucking_companies" },
    @{ Name = "Warehouses"; Table = "dict_warehouses" }
)

Write-Host "[Dictionary Tables]" -ForegroundColor Green
Write-Host ""
$totalDict = 0

foreach ($table in $dictTables) {
    $query = "docker exec -i logix-timescaledb-prod psql -U $DB_USER -d $DB_NAME -t -c `"SELECT COUNT(*) FROM $($table.Table);`" 2>`$null"
    $result = Invoke-Expression $query
    if ($result -is [array]) {
        $count = [int]($result[0].Trim())
    } else {
        $count = [int]($result.Trim())
    }
    if ($result) {
        $totalDict += $count
        Write-Host ("{0,-30} {1,10} records" -f $table.Name, $count)
    } else {
        Write-Host ("{0,-30} {1,10} records" -f $table.Name, 0) -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host ("{0,-30} {1,10} records" -f "Dictionary Tables Total", $totalDict) -ForegroundColor Yellow
Write-Host ""

$totalAll = $totalBusiness + $totalDict
Write-Host ("{0,-30} {1,10} records" -f "Total Records", $totalAll) -ForegroundColor Cyan
Write-Host ""

# Container Logistics Status Distribution
Write-Host "[Container Logistics Status Distribution]" -ForegroundColor Green
Write-Host ""
$sqlQuery = @'
SELECT "logisticsStatus", COUNT(*) as count FROM biz_containers GROUP BY "logisticsStatus" ORDER BY count DESC;
'@
$query = "docker exec -i logix-timescaledb-prod psql -U $DB_USER -d $DB_NAME -c `"$sqlQuery`" 2>`$null"
$result = Invoke-Expression $query
Write-Host $result
Write-Host ""

Write-Host "Query completed!" -ForegroundColor Green
