# ========================================
# LogiX 旧SQL文件清理脚本
# ========================================
# 用途: 删除所有过时和测试用的SQL文件
# 最后更新: 2026-02-25
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LogiX 旧SQL文件清理工具" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "当前目录: $scriptDir" -ForegroundColor Yellow
Write-Host ""

# ========================================
# 第一部分: 确认要删除的文件列表
# ========================================

$filesToDelete = @(
    # 测试和临时文件
    "test_insert.sql",
    "test_insert_country.sql",
    "test_msk_insert.sql",
    "test_ship_insert.sql",
    "test_single_insert.sql",
    "insert_msk.sql",
    "insert_with_commit.sql",

    # 检查和验证文件
    "check_container_types.sql",
    "check_country_count.sql",
    "check_country_table.sql",
    "check_dict_structure.sql",
    "check_table_structure.sql",
    "describe_table.sql",
    "list_tables.sql",
    "show_container_types.sql",
    "summary.sql",
    "verify_dicts.sql",

    # 清空和截断文件
    "clear_all_tables.sql",
    "truncate_container_types.sql",
    "truncate_sea_freight.sql",

    # 修改表结构文件（旧版本）
    "alter_all_country_fields.sql",
    "alter_dict_tables.sql",
    "alter_dict_tables_v2.sql",

    # 初始化文件（旧版本）
    "init_countries.sql",
    "init_countries_fixed.sql",
    "init_container_types.sql",
    "init_dicts_simple.sql",
    "init_ports.sql",
    "init_ports_fixed.sql",
    "init_shipping_companies.sql",
    "init_shipping_companies_fixed.sql"
)

# 检查文件是否存在
$existingFiles = @()
$missingFiles = @()

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        $existingFiles += $file
    } else {
        $missingFiles += $file
    }
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "文件检查结果" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "将删除 $($existingFiles.Count) 个文件" -ForegroundColor Yellow
Write-Host "未找到 $($missingFiles.Count) 个文件" -ForegroundColor Gray
Write-Host ""

if ($existingFiles.Count -gt 0) {
    Write-Host "将删除的文件列表:" -ForegroundColor Yellow
    foreach ($file in $existingFiles) {
        $size = (Get-Item $file).Length
        Write-Host "  - $file ($size bytes)" -ForegroundColor White
    }
    Write-Host ""
}

# ========================================
# 第二部分: 用户确认
# ========================================

Write-Host "========================================" -ForegroundColor Red
Write-Host "⚠️  警告: 此操作不可撤销！" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "确认删除这些文件吗? (输入 'YES' 确认, 其他任意键取消)"

if ($confirm -ne "YES") {
    Write-Host ""
    Write-Host "操作已取消" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "开始删除文件..." -ForegroundColor Yellow

# ========================================
# 第三部分: 执行删除
# ========================================

$deletedCount = 0
$failedCount = 0

foreach ($file in $existingFiles) {
    try {
        Remove-Item $file -Force
        Write-Host "✓ 已删除: $file" -ForegroundColor Green
        $deletedCount++
    }
    catch {
        Write-Host "✗ 删除失败: $file" -ForegroundColor Red
        Write-Host "  错误: $_" -ForegroundColor Red
        $failedCount++
    }
}

Write-Host ""

# ========================================
# 第四部分: 显示结果
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "清理完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "成功删除: $deletedCount 个文件" -ForegroundColor Green
if ($failedCount -gt 0) {
    Write-Host "删除失败: $failedCount 个文件" -ForegroundColor Red
}
Write-Host ""

# ========================================
# 第五部分: 显示保留的SQL文件
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "保留的核心SQL文件" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$keptFiles = @(
    "01_drop_all_tables.sql",
    "02_init_dict_tables.sql",
    "03_create_tables.sql",
    "04_fix_constraints.sql",
    "DATABASE_INIT_GUIDE.md",
    "EXCEL_DB_FIELD_MAPPING_24DSA1954.md",
    "EXCEL_DB_STRUCTURE_VERIFICATION.md",
    "DB_CONSTRAINTS_VALIDATION.md"
)

foreach ($file in $keptFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length / 1KB
        Write-Host "✓ $file ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "scripts/ 目录保留:" -ForegroundColor Yellow
Write-Host "  - init-database-complete.sql" -ForegroundColor Gray
Write-Host "  - init-timescaledb.sql" -ForegroundColor Gray
Write-Host "  - seed-dictionaries.ts" -ForegroundColor Gray

Write-Host ""
Write-Host "migrations/ 目录保留:" -ForegroundColor Yellow
Write-Host "  - add_new_fields_for_excel_mapping.sql" -ForegroundColor Gray
Write-Host "  - alter_documenttransferdate_to_timestamp.sql" -ForegroundColor Gray
Write-Host "  - fix_duplicate_container_number_columns.sql" -ForegroundColor Gray
Write-Host "  - fix_sea_freight_currency_amount.sql" -ForegroundColor Gray
Write-Host "  - fix_transfer_date_unload_mode.sql" -ForegroundColor Gray

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "所有操作完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# ========================================
# 第六部分: 下一步建议
# ========================================

Write-Host "下一步操作建议:" -ForegroundColor Cyan
Write-Host "1. 阅读 DATABASE_INIT_GUIDE.md 了解数据库初始化流程" -ForegroundColor White
Write-Host "2. 使用以下命令重建数据库:" -ForegroundColor White
Write-Host "   psql -U logix_user -d logix_db -f 01_drop_all_tables.sql" -ForegroundColor Gray
Write-Host "   psql -U logix_user -d logix_db -f 03_create_tables.sql" -ForegroundColor Gray
Write-Host "   psql -U logix_user -d logix_db -f 02_init_dict_tables.sql" -ForegroundColor Gray
Write-Host "   psql -U logix_user -d logix_db -f 04_fix_constraints.sql" -ForegroundColor Gray
Write-Host ""
