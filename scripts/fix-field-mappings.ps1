# ============================================================
# Excel导入字段映射修复脚本
# Field Mapping Fix Script
# ============================================================
# 说明: 修复前端Excel导入的字段映射配置
#       以数据库表结构为基准,对齐字段名
# ============================================================

$ErrorActionPreference = "Stop"

$FRONTEND_FILE = "d:\Gihub\logix\frontend\src\views\import\ExcelImport.vue"
$FIXED_MAPPINGS_FILE = "d:\Gihub\logix\docs\FIXED_FIELD_MAPPINGS.ts"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Excel导入字段映射修复" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 检查文件是否存在
if (-not (Test-Path $FRONTEND_FILE)) {
    Write-Host "错误: 前端文件不存在 $FRONTEND_FILE" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $FIXED_MAPPINGS_FILE)) {
    Write-Host "错误: 修复后的映射文件不存在 $FIXED_MAPPINGS_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 文件检查通过" -ForegroundColor Green

# 读取文件内容
$content = Get-Content $FRONTEND_FILE -Raw -Encoding UTF8
$fixedMappings = Get-Content $FIXED_MAPPINGS_FILE -Raw -Encoding UTF8

# 备份原文件
$backupFile = "$FRONTEND_FILE.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item $FRONTEND_FILE $backupFile
Write-Host "✓ 原文件已备份到: $backupFile" -ForegroundColor Green

# 提取FIXED_FIELD_MAPPINGS数组的定义
$mappingsPattern = 'export const FIXED_FIELD_MAPPINGS: FieldMapping\[\] = \[(.*?)\];' -split "`r`n|`n|`r"
# $mappingsPattern = 'export const FIXED_FIELD_MAPPINGS: FieldMapping\[\] = \[([\s\S]*?)\];'

# 使用更简单的方法:直接替换FIELD_MAPPINGS数组
# 找到const FIELD_MAPPINGS: FieldMapping[] = [和];之间的内容

$pattern = '(const FIELD_MAPPINGS: FieldMapping\[\] = \[)([\s\S]*?)(\])'

if ($content -match $pattern) {
    $before = $matches[1]
    $after = $matches[3]

    Write-Host "✓ 找到FIELD_MAPPINGS定义" -ForegroundColor Green

    # 从FIXED_MAPPINGS_FILE中提取数组内容(不包含export const和类型定义)
    $fixedMappingsContent = Get-Content $FIXED_MAPPINGS_FILE -Raw -Encoding UTF8

    # 提取数组内容
    if ($fixedMappingsContent -match 'FIXED_FIELD_MAPPINGS: FieldMapping\[\] = \[([\s\S]*?)\]') {
        $newMappings = $matches[1]

        # 替换映射定义
        $newContent = $content -replace $pattern, "${before}`n$newMappings`n$after"

        # 添加新的工具函数
        # 检查是否需要添加transformBoolean函数
        if ($newContent -notmatch 'function transformBoolean') {
            # 在transformLogisticsStatus函数前添加
            $transformBooleanFunc = @'

function transformBoolean(value: any): boolean {
  if (value === null || value === undefined || value === '') return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    return ['是', 'yes', 'true', '1', 'y'].includes(value.toLowerCase().trim())
  }
  return false
}
'@
            # 在transformLogisticsStatus之前插入
            $newContent = $newContent -replace "(function transformLogisticsStatus)", "$transformBooleanFunc`n`nfunction transformLogisticsStatus"
        }

        # 写入文件
        Set-Content $FRONTEND_FILE $newContent -Encoding UTF8

        Write-Host "✓ 字段映射已更新" -ForegroundColor Green
        Write-Host "`n修复内容:" -ForegroundColor Yellow
        Write-Host "  1. 添加了缺失的字段映射" -ForegroundColor Green
        Write-Host "  2. 修正了字段名不匹配的问题" -ForegroundColor Green
        Write-Host "  3. 修正了字段错位问题" -ForegroundColor Green
        Write-Host "  4. 添加了transformBoolean工具函数" -ForegroundColor Green
    } else {
        Write-Host "错误: 无法从FIXED_MAPPINGS文件中提取数组内容" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "警告: 未找到FIELD_MAPPINGS定义,可能需要手动修复" -ForegroundColor Yellow
    Write-Host "请手动将FIXED_FIELD_MAPPINGS.ts中的内容复制到ExcelImport.vue中" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "修复完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 检查修复后的文件: $FRONTEND_FILE" -ForegroundColor White
Write-Host "  2. 重启前端服务以应用更改" -ForegroundColor White
Write-Host "  3. 重新导入Excel数据" -ForegroundColor White
