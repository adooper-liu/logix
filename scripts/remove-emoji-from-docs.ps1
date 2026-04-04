# Batch remove emoji from documentation files
# Following SKILL standard: Simplicity is beauty, no emoji allowed

$docsPath = "d:\Gihub\logix\frontend\public\docs\第 2 层 - 业务逻辑"

# README files to process
$readmeFiles = @(
    "04-物流状态机与飞驼事件专题\README.md",
    "05-货柜数据管理与 Pinia 专题\README.md",
    "07-统计系统专题\README.md",
    "08-智能排柜系统专题\README.md",
    "09-甘特图系统专题\README.md"
)

Write-Host "Starting batch emoji removal..." -ForegroundColor Green

foreach ($file in $readmeFiles) {
    $filePath = Join-Path $docsPath $file
    
    if (Test-Path $filePath) {
        Write-Host "Processing: $file" -ForegroundColor Yellow
        
        # Read file content
        $content = Get-Content $filePath -Raw -Encoding UTF8
        
        # Common emoji patterns to remove
        $originalContent = $content
        
        # Remove specific emojis commonly used in documentation
        $content = $content -replace "📁", ""
        $content = $content -replace "📚", ""
        $content = $content -replace "🎯", ""
        $content = $content -replace "📋", ""
        $content = $content -replace "🔍", ""
        $content = $content -replace "📊", ""
        $content = $content -replace "🎓", ""
        $content = $content -replace "🔄", ""
        $content = $content -replace "📞", ""
        $content = $content -replace "✨", ""
        $content = $content -replace "⭐", ""
        $content = $content -replace "📜", ""
        $content = $content -replace "🚀", ""
        $content = $content -replace "✅", ""
        $content = $content -replace "❌", ""
        $content = $content -replace "⚠️", ""
        $content = $content -replace "💡", ""
        $content = $content -replace "🔗", ""
        $content = $content -replace "📄", ""
        $content = $content -replace "📌", ""
        $content = $content -replace "📈", ""
        $content = $content -replace "🛠️", ""
        $content = $content -replace "🎊", ""
        $content = $content -replace "💪", ""
        
        # Write back if content changed
        if ($content -ne $originalContent) {
            $content | Out-File -FilePath $filePath -Encoding UTF8 -NoNewline
            Write-Host "  Emoji removed successfully" -ForegroundColor Green
        } else {
            Write-Host "  No emoji found" -ForegroundColor Gray
        }
    } else {
        Write-Host "File not found: $file" -ForegroundColor Red
    }
}

Write-Host "`nBatch processing completed!" -ForegroundColor Green
