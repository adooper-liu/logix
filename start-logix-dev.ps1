# 检查PowerShell执行策略
$executionPolicy = Get-ExecutionPolicy
if ($executionPolicy -eq "Restricted") {
    Write-Host "错误: PowerShell执行策略为Restricted，无法运行脚本" -ForegroundColor Red
    Write-Host "请运行: Set-ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    exit 1
}

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "  LogiX 开发环境 - 启动服务"  -ForegroundColor Cyan
Write-Host "  LogiX Development Environment"  -ForegroundColor Cyan
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

# 检查Docker状态
Write-Host "[1/6] 检查Docker状态..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Docker正在运行" -ForegroundColor Green
    } else {
        Write-Host "  Docker未运行，请先启动Docker Desktop" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  Docker未安装或未运行" -ForegroundColor Red
    exit 1
}

# 启动数据库与监控服务
Write-Host ""
Write-Host "[2/6] 启动数据库与监控服务..." -ForegroundColor Yellow
docker-compose -f docker-compose.timescaledb.prod.yml --env-file .env up -d postgres redis prometheus grafana
if ($LASTEXITCODE -eq 0) {
    Write-Host "  数据库服务已启动" -ForegroundColor Green
    # 等待数据库就绪（最多等待60秒）
    Write-Host "  等待数据库就绪..." -ForegroundColor Gray
    $maxAttempts = 60
    $attempt = 0
    while ($attempt -lt $maxAttempts) {
        try {
            $dockerLogs = docker logs logix-timescaledb-prod 2>&1 | Select-String -Pattern "ready to accept connections" -Quiet
            if ($dockerLogs) {
                Write-Host "  数据库已就绪" -ForegroundColor Green
                break
            }
        } catch {
            # 忽略错误，继续等待
        }
        $attempt++
        if ($attempt % 5 -eq 0) {
            Write-Host "    等待中... ($attempt/$maxAttempts)" -ForegroundColor Gray
        }
        Start-Sleep -Seconds 1
    }
    if ($attempt -ge $maxAttempts) {
        Write-Host "  警告: 数据库可能未完全就绪，但继续启动应用" -ForegroundColor Yellow
    }
} else {
    Write-Host "  数据库启动失败" -ForegroundColor Red
}

# 启动数据库工具
Write-Host ""
Write-Host "[3/5] 启动数据库管理工具..." -ForegroundColor Yellow
docker-compose -f docker-compose.timescaledb.prod.yml -f docker-compose.admin-tools.yml --env-file .env up -d adminer pgadmin
if ($LASTEXITCODE -eq 0) {
    Write-Host "  数据库管理工具已启动" -ForegroundColor Green
} else {
    Write-Host "  数据库管理工具启动失败" -ForegroundColor Red
}

# 启动后端服务
Write-Host ""
Write-Host "[4/6] 启动后端服务..." -ForegroundColor Yellow
Push-Location backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
Pop-Location
Write-Host "  后端服务已在独立窗口启动" -ForegroundColor Green

# 启动前端服务
Write-Host ""
Write-Host "[5/6] 启动前端服务..." -ForegroundColor Yellow
Push-Location frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
Pop-Location
Write-Host "  前端服务已在独立窗口启动" -ForegroundColor Green

# 启动 logistics-path 微服务（物流路径可视化）
Write-Host ""
Write-Host "[6/6] 启动 logistics-path 微服务..." -ForegroundColor Yellow
$logisticsPath = Join-Path $PSScriptRoot "logistics-path-system\backend"
if (Test-Path (Join-Path $logisticsPath "package.json")) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$logisticsPath'; npm run dev"
    Write-Host "  logistics-path 已在 port 4000 启动" -ForegroundColor Green
} else {
    Write-Host "  跳过: logistics-path-system 目录不存在" -ForegroundColor Gray
}

# 完成
Write-Host ""
Write-Host "========================================"  -ForegroundColor Green
Write-Host "  所有服务已启动!"  -ForegroundColor Green
Write-Host "  All Services Started!"  -ForegroundColor Green
Write-Host "========================================"  -ForegroundColor Green
Write-Host ""
Write-Host "服务访问地址:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  数据库服务:" -ForegroundColor White
Write-Host "    TimescaleDB:  localhost:5432" -ForegroundColor Gray
Write-Host "    Redis:       localhost:6379" -ForegroundColor Gray
Write-Host ""
Write-Host "  管理工具:" -ForegroundColor White
Write-Host "    Adminer:     http://localhost:8080" -ForegroundColor Gray
Write-Host "    pgAdmin:     http://localhost:5050" -ForegroundColor Gray
Write-Host ""
Write-Host "  监控:" -ForegroundColor White
Write-Host "    Prometheus:  http://localhost:9090" -ForegroundColor Gray
Write-Host "    Grafana:     http://localhost:3000 (admin/admin)" -ForegroundColor Gray
Write-Host ""
Write-Host "  应用服务:" -ForegroundColor White
Write-Host "    Frontend:     http://localhost:5173" -ForegroundColor Gray
Write-Host "    Backend:      http://localhost:3001" -ForegroundColor Gray
Write-Host "    Logistics:    http://localhost:4000 (物流路径微服务)" -ForegroundColor Gray
Write-Host ""
Write-Host "提示:" -ForegroundColor Cyan
Write-Host "  - 前端、后端、logistics-path 在独立窗口运行" -ForegroundColor White
Write-Host "  - 数据库工具需要首次登录设置" -ForegroundColor White
Write-Host "  - 停止服务请运行: .\stop-logix-dev.ps1" -ForegroundColor White
Write-Host ""
