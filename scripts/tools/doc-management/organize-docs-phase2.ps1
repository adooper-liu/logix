# LogiX 文档整理脚本 - 第二阶段
# 用途：整理不符合规范的文件夹

$ErrorActionPreference = "Stop"
$DOCS_ROOT = "frontend\public\docs"

Write-Host "=== LogiX 文档整理 - 第二阶段 ===" -ForegroundColor Green

# 1. 移动 05-state-machine -> 第 2 层 - 业务逻辑/04-物流状态机与飞驼事件专题/
Write-Host "`n[1/5] 归档 05-state-machine..." -ForegroundColor Yellow
if (Test-Path "$DOCS_ROOT\05-state-machine") {
    $stateMachineFiles = Get-ChildItem "$DOCS_ROOT\05-state-machine\*.md"
    foreach ($file in $stateMachineFiles) {
        $newName = "$($file.BaseName)_ARCHIVE_$($file.Extension)"
        Move-Item $file.FullName -Destination "$DOCS_ROOT\第 2 层 - 业务逻辑\04-物流状态机与飞驼事件专题\$newName" -Force
        Write-Host "  OK: $($file.Name) -> 04-物流状态机与飞驼事件专题/$newName" -ForegroundColor Green
    }
    Remove-Item "$DOCS_ROOT\05-state-machine" -Recurse -Force
    Write-Host "  OK: 05-state-machine/ 目录已删除" -ForegroundColor Green
}

# 2. 移动 技术架构 -> 第 2 层 - 架构设计/
Write-Host "`n[2/5] 归档 技术架构..." -ForegroundColor Yellow
if (Test-Path "$DOCS_ROOT\技术架构") {
    $archFiles = Get-ChildItem "$DOCS_ROOT\技术架构\*.md"
    foreach ($file in $archFiles) {
        $newName = "$($file.BaseName)_ARCHIVE_$($file.Extension)"
        Move-Item $file.FullName -Destination "$DOCS_ROOT\第 2 层 - 架构设计\$newName" -Force
        Write-Host "  OK: $($file.Name) -> 第 2 层 - 架构设计/$newName" -ForegroundColor Green
    }
    Remove-Item "$DOCS_ROOT\技术架构" -Recurse -Force
    Write-Host "  OK: 技术架构/ 目录已删除" -ForegroundColor Green
}

# 3. 移动 智能排产 -> 第 2 层 - 业务逻辑/08-智能排柜系统专题/
Write-Host "`n[3/5] 归档 智能排产..." -ForegroundColor Yellow
if (Test-Path "$DOCS_ROOT\智能排产") {
    $schedulingFiles = Get-ChildItem "$DOCS_ROOT\智能排产\*.md"
    foreach ($file in $schedulingFiles) {
        $newName = "$($file.BaseName)_ARCHIVE_$($file.Extension)"
        Move-Item $file.FullName -Destination "$DOCS_ROOT\第 2 层 - 业务逻辑\08-智能排柜系统专题\$newName" -Force
        Write-Host "  OK: $($file.Name) -> 08-智能排柜系统专题/$newName" -ForegroundColor Green
    }
    Remove-Item "$DOCS_ROOT\智能排产" -Recurse -Force
    Write-Host "  OK: 智能排产/ 目录已删除" -ForegroundColor Green
}

# 4. 移动 智能排柜 -> 第 2 层 - 业务逻辑/08-智能排柜系统专题/
Write-Host "`n[4/5] 归档 智能排柜..." -ForegroundColor Yellow
if (Test-Path "$DOCS_ROOT\智能排柜") {
    $intelligentFiles = Get-ChildItem "$DOCS_ROOT\智能排柜\*.md"
    foreach ($file in $intelligentFiles) {
        $newName = "$($file.BaseName)_ARCHIVE_$($file.Extension)"
        Move-Item $file.FullName -Destination "$DOCS_ROOT\第 2 层 - 业务逻辑\08-智能排柜系统专题\$newName" -Force
        Write-Host "  OK: $($file.Name) -> 08-智能排柜系统专题/$newName" -ForegroundColor Green
    }
    Remove-Item "$DOCS_ROOT\智能排柜" -Recurse -Force
    Write-Host "  OK: 智能排柜/ 目录已删除" -ForegroundColor Green
}

# 5. 移动 11-project -> 第 2 层 - 项目专题/
Write-Host "`n[5/5] 重命名 11-project..." -ForegroundColor Yellow
if (Test-Path "$DOCS_ROOT\11-project") {
    Rename-Item "$DOCS_ROOT\11-project" -NewName "第 2 层 - 项目专题" -Force
    Write-Host "  OK: 11-project/ -> 第 2 层 - 项目专题/" -ForegroundColor Green
}

Write-Host "`n=== 文档整理完成（第二阶段）===" -ForegroundColor Green
Write-Host "`n后续工作:" -ForegroundColor Yellow
Write-Host "1. 检查 '第 2 层 - 项目专题/' 中的文档是否需要进一步归类" -ForegroundColor White
Write-Host "2. 更新 DOCS_INDEX.md 索引" -ForegroundColor White
Write-Host "3. 验证文档链接是否有效" -ForegroundColor White
