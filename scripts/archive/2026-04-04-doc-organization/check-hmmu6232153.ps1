# 加载环境变量
$envPath = Join-Path $PSScriptRoot "..\backend\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)\s*=\s*(.+)\s*$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            Set-Item -Path "env:$key" -Value $value -Force
        }
    }
}

# 执行 SQL 查询
$query = @"
SELECT 
  po.container_number,
  po.port_type,
  po.gate_out_time,
  tt.pickup_date,
  tt.pickup_date_source,
  (SELECT COUNT(*) FROM ext_container_status_events 
   WHERE container_number = po.container_number AND status_code = 'STCS') as stcs_count,
  CASE 
    WHEN po.gate_out_time IS NOT NULL AND tt.pickup_date IS NOT NULL THEN 'OK'
    WHEN po.gate_out_time IS NOT NULL AND tt.pickup_date IS NULL THEN 'MISSING_PICKUP_DATE'
    WHEN po.gate_out_time IS NULL AND tt.pickup_date IS NOT NULL THEN 'MISSING_GATE_OUT'
    ELSE 'BOTH_MISSING'
  END AS consistency_status
FROM process_port_operations po
LEFT JOIN process_trucking_transport tt ON po.container_number = tt.container_number
WHERE po.container_number = 'HMMU6232153'
  AND po.port_type = 'destination';
"@

Write-Host "=== 检查 HMMU6232153 提柜日期一致性 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "SQL Query:"
Write-Host $query
Write-Host ""
Write-Host "执行结果:" -ForegroundColor Green

docker exec -i logix-postgres psql -U logix_user -d logix_db -c "$query"
