# LogiX 文档链接验证脚本
# 用途：验证 DOCS_INDEX.md 中的文档链接是否有效

$ErrorActionPreference = "Stop"
$DOCS_ROOT = "frontend\public\docs"
$INDEX_FILE = "$DOCS_ROOT\DOCS_INDEX.md"

Write-Host "=== LogiX 文档链接验证 ===" -ForegroundColor Green

if (-not (Test-Path $INDEX_FILE)) {
    Write-Host "ERROR: 找不到 DOCS_INDEX.md" -ForegroundColor Red
    exit 1
}

$indexContent = Get-Content $INDEX_FILE -Raw
$totalCount = 0
$validCount = 0
$invalidCount = 0
$invalidLinks = @()

# 提取所有 markdown 链接
$markdownLinkPattern = '\[([^\]]+)\]\(([^\)]+)\)'
$matches = [regex]::Matches($indexContent, $markdownLinkPattern)

foreach ($match in $matches) {
    $linkText = $match.Groups[1].Value
    $linkPath = $match.Groups[2].Value
    
    # 跳过外部链接
    if ($linkPath -match '^https?://') {
        continue
    }
    
    $totalCount++
    $fullPath = Join-Path $DOCS_ROOT $linkPath
    
    if (Test-Path $fullPath) {
        $validCount++
        Write-Host "  OK: $linkText" -ForegroundColor Green
    } else {
        $invalidCount++
        $invalidLinks += [PSCustomObject]@{
            Text = $linkText
            Path = $linkPath
        }
        Write-Host "  FAIL: $linkText -> $linkPath" -ForegroundColor Red
    }
}

Write-Host "`n=== 验证结果 ===" -ForegroundColor Cyan
Write-Host "总链接数：$totalCount" -ForegroundColor White
Write-Host "有效链接：$validCount" -ForegroundColor Green
Write-Host "无效链接：$invalidCount" -ForegroundColor Red

if ($invalidCount -gt 0) {
    Write-Host "`n无效链接列表:" -ForegroundColor Yellow
    $invalidLinks | Format-Table -AutoSize | Out-String | Write-Host
    
    Write-Host "`n建议操作:" -ForegroundColor Yellow
    Write-Host "1. 检查文档是否被移动或删除" -ForegroundColor White
    Write-Host "2. 更新 DOCS_INDEX.md 中的链接路径" -ForegroundColor White
    Write-Host "3. 恢复缺失的文档文件" -ForegroundColor White
} else {
    Write-Host "`n所有文档链接均有效！" -ForegroundColor Green
}
