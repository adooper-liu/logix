# LogiX 文档整理脚本 - 第三阶段
# 用途：归类项目专题文档到对应业务专题

$ErrorActionPreference = "Stop"
$DOCS_ROOT = "frontend\public\docs"

Write-Host "=== LogiX 文档整理 - 第三阶段 ===" -ForegroundColor Green

# 1. 移动 14-时间预测 TAB 逻辑梳理.md -> 第 2 层 - 业务逻辑/04-物流状态机与飞驼事件专题/
Write-Host "`n[1/4] 归档时间预测文档..." -ForegroundColor Yellow
if (Test-Path "$DOCS_ROOT\第 2 层 - 项目专题\14-时间预测 TAB 逻辑梳理.md") {
    Move-Item "$DOCS_ROOT\第 2 层 - 项目专题\14-时间预测 TAB 逻辑梳理.md" `
              -Destination "$DOCS_ROOT\第 2 层 - 业务逻辑\04-物流状态机与飞驼事件专题\14-时间预测 TAB 逻辑梳理_ARCHIVE_.md" -Force
    Write-Host "  OK: 14-时间预测 TAB 逻辑梳理.md -> 04-物流状态机与飞驼事件专题/" -ForegroundColor Green
}

# 2. 移动 15-智能排柜优化方案.md -> 第 2 层 - 业务逻辑/08-智能排柜系统专题/
Write-Host "`n[2/4] 归档智能排柜优化方案..." -ForegroundColor Yellow
if (Test-Path "$DOCS_ROOT\第 2 层 - 项目专题\15-智能排柜优化方案.md") {
    Move-Item "$DOCS_ROOT\第 2 层 - 项目专题\15-智能排柜优化方案.md" `
              -Destination "$DOCS_ROOT\第 2 层 - 业务逻辑\08-智能排柜系统专题\15-智能排柜优化方案_ARCHIVE_.md" -Force
    Write-Host "  OK: 15-智能排柜优化方案.md -> 08-智能排柜系统专题/" -ForegroundColor Green
}

# 3. 移动 16-预览排产优化方案.md -> 第 2 层 - 业务逻辑/08-智能排柜系统专题/
Write-Host "`n[3/4] 归档预览排产优化方案..." -ForegroundColor Yellow
if (Test-Path "$DOCS_ROOT\第 2 层 - 项目专题\16-预览排产优化方案.md") {
    Move-Item "$DOCS_ROOT\第 2 层 - 项目专题\16-预览排产优化方案.md" `
              -Destination "$DOCS_ROOT\第 2 层 - 业务逻辑\08-智能排柜系统专题\16-预览排产优化方案_ARCHIVE_.md" -Force
    Write-Host "  OK: 16-预览排产优化方案.md -> 08-智能排柜系统专题/" -ForegroundColor Green
}

# 4. 移动 物流路径三模式智能分组规范.md -> 第 2 层 - 业务逻辑/04-物流状态机与飞驼事件专题/
Write-Host "`n[4/4] 归档物流路径文档..." -ForegroundColor Yellow
if (Test-Path "$DOCS_ROOT\第 2 层 - 项目专题\物流路径三模式智能分组规范.md") {
    Move-Item "$DOCS_ROOT\第 2 层 - 项目专题\物流路径三模式智能分组规范.md" `
              -Destination "$DOCS_ROOT\第 2 层 - 业务逻辑\04-物流状态机与飞驼事件专题\物流路径三模式智能分组规范_ARCHIVE_.md" -Force
    Write-Host "  OK: 物流路径三模式智能分组规范.md -> 04-物流状态机与飞驼事件专题/" -ForegroundColor Green
}

Write-Host "`n=== 文档整理完成（第三阶段）===" -ForegroundColor Green
Write-Host "`n后续工作:" -ForegroundColor Yellow
Write-Host "1. 删除空的 '第 2 层 - 项目专题/' 目录" -ForegroundColor White
Write-Host "2. 更新 DOCS_INDEX.md 索引" -ForegroundColor White
Write-Host "3. 验证文档链接是否有效" -ForegroundColor White
