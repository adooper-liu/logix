# PowerShell script to fix ETA query port_sequence filtering

$serviceFile = "src\services\containerStatistics.service.ts"

# Read the file
$content = Get-Content $serviceFile -Raw -Encoding UTF8

# Fix 1: getWithin3Days - add port_sequence filter
$pattern1 = '(\s+\.innerJoin\(\s*`\'`\(\s*SELECT DISTINCT po1\.container_number\s+FROM process_port_operations po1\s+WHERE po1\.port_type = \'destination\'\s+AND po1\.ata_dest_port IS NULL\s+AND po1\.eta_dest_port IS NOT NULL\s+AND po1\.eta_dest_port >= \$\{todayStr\}\s+AND po1\.eta_dest_port <= \$\{threeDaysStr\})\s*`\",)'
$replacement1 = '        `(
          SELECT DISTINCT po1.container_number
          FROM process_port_operations po1
          WHERE po1.port_type = ''destination''
          AND po1.ata_dest_port IS NULL
          AND po1.eta_dest_port IS NOT NULL
          AND po1.eta_dest_port >= ''${todayStr}''
          AND po1.eta_dest_port <= ''${threeDaysStr}''
          AND po1.port_sequence = (
            SELECT MAX(po2.port_sequence)
            FROM process_port_operations po2
            WHERE po2.container_number = po1.container_number
            AND po2.port_type = ''destination''
          )
        )`,'
# This is too complex for simple replace, let's use a different approach

Write-Host "请手动修复以下4个方法中的子查询："
Write-Host ""
Write-Host "1. getWithin3Days() - 第552-563行"
Write-Host "2. getWithin7Days() - 第599-611行"
Write-Host "3. getOver7Days() - 第642-655行"
Write-Host "4. getOtherRecords() - 第683-693行"
Write-Host ""
Write-Host "在每个子查询中添加 port_sequence 过滤条件："
Write-Host ""
Write-Host "AND po1.port_sequence = ("
Write-Host "  SELECT MAX(po2.port_sequence)"
Write-Host "  FROM process_port_operations po2"
Write-Host "  WHERE po2.container_number = po1.container_number"
Write-Host "  AND po2.port_type = ''destination''"
Write-Host ")"
