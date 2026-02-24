# LogiX Docker 测试脚本 (Windows PowerShell)
# 用于验证 Docker 环境是否正常工作

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "LogiX Docker 环境测试" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Docker 环境
Write-Host "1. 检查 Docker 环境..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "✓ Docker 已安装" -ForegroundColor Green
    Write-Host "  $dockerVersion"

    $composeVersion = docker compose version 2>&1
    Write-Host "✓ Docker Compose 已安装" -ForegroundColor Green
    Write-Host "  $composeVersion"
} catch {
    Write-Host "✗ Docker 未安装或未运行" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 检查容器状态
Write-Host "2. 检查容器状态..." -ForegroundColor Yellow
$containerStatus = docker compose -f docker-compose.timescaledb.yml ps 2>&1
if ($containerStatus -match "Up") {
    Write-Host "✓ 有容器正在运行" -ForegroundColor Green
    Write-Host ""
    docker compose -f docker-compose.timescaledb.yml ps
} else {
    Write-Host "⚠ 没有容器正在运行" -ForegroundColor Yellow
    Write-Host "提示: 使用 'tsdb-start' 或 'make tsdb-up' 启动环境"
    exit 0
}

Write-Host ""

# 测试 TimescaleDB
Write-Host "3. 测试 TimescaleDB..." -ForegroundColor Yellow
try {
    $pgResult = docker compose -f docker-compose.timescaledb.yml exec -T postgres pg_isready -U logix_user 2>&1
    if ($pgResult -match "accepting connections") {
        Write-Host "✓ TimescaleDB 正常" -ForegroundColor Green
    } else {
        Write-Host "✗ TimescaleDB 异常" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 无法连接到 TimescaleDB" -ForegroundColor Red
}

# 测试 Redis
Write-Host "4. 测试 Redis..." -ForegroundColor Yellow
try {
    $redisResult = docker compose -f docker-compose.timescaledb.yml exec -T redis redis-cli ping 2>&1
    if ($redisResult -match "PONG") {
        Write-Host "✓ Redis 正常" -ForegroundColor Green
    } else {
        Write-Host "✗ Redis 异常" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 无法连接到 Redis" -ForegroundColor Red
}

# 测试后端 API
Write-Host "5. 测试后端 API..." -ForegroundColor Yellow
try {
    $apiResult = docker compose -f docker-compose.timescaledb.yml exec -T backend curl -s http://localhost:3001/health 2>&1
    if ($apiResult -match "OK") {
        Write-Host "✓ 后端 API 正常" -ForegroundColor Green
    } else {
        Write-Host "✗ 后端 API 异常" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 无法连接到后端 API" -ForegroundColor Red
}

Write-Host ""

# 测试数据库连接
Write-Host "6. 测试数据库连接..." -ForegroundColor Yellow
try {
    $dbResult = docker compose -f docker-compose.timescaledb.yml exec -T postgres psql -U logix_user -d logix_db -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ 数据库连接正常" -ForegroundColor Green
    } else {
        Write-Host "✗ 数据库连接失败" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ 数据库连接失败" -ForegroundColor Red
}

Write-Host ""

# 检查表结构
Write-Host "7. 检查数据库表结构..." -ForegroundColor Yellow
try {
    $tableCount = docker compose -f docker-compose.timescaledb.yml exec -T postgres psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1
    $tableCount = $tableCount.Trim()
    Write-Host "数据库表数量: $tableCount" -ForegroundColor Cyan

    if ([int]$tableCount -ge 20) {
        Write-Host "✓ 表结构完整" -ForegroundColor Green
    } else {
        Write-Host "⚠ 表数量偏少，可能未完成初始化" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ 无法检查表结构" -ForegroundColor Red
}

Write-Host ""

# 检查数据卷
Write-Host "8. 检查数据卷..." -ForegroundColor Yellow
$volumes = docker volume ls --filter "name=logix" --format "{{.Name}}" 2>&1
if ($volumes) {
    Write-Host "✓ 数据卷已创建" -ForegroundColor Green
    $volumes | ForEach-Object { Write-Host "  - $_" }
} else {
    Write-Host "⚠ 未找到数据卷" -ForegroundColor Yellow
}

Write-Host ""

# 检查网络
Write-Host "9. 检查网络..." -ForegroundColor Yellow
$networks = docker network ls --filter "name=logix" --format "{{.Name}}" 2>&1
if ($networks) {
    Write-Host "✓ 网络已创建" -ForegroundColor Green
    $networks | ForEach-Object { Write-Host "  - $_" }
} else {
    Write-Host "⚠ 未找到网络" -ForegroundColor Yellow
}

Write-Host ""

# 资源使用情况
Write-Host "10. 资源使用情况..." -ForegroundColor Yellow
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "测试完成!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
