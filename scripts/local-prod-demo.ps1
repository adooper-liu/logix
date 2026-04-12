# 在本地用 Docker 拉起「生产」Compose 栈并挂载前端 dist，便于联调演示。
# 前置：已安装 Docker Desktop；必须在仓库根目录执行，例如:
#   PS E:\logix> .\scripts\local-prod-demo.ps1
#   PS E:\logix> .\scripts\local-prod-demo.ps1 -SkipDbInit  # 跳过数据库初始化
# （在 frontend 目录下执行 .\scripts\... 会找不到脚本）

param(
  [switch]$SkipDbInit  # 跳过数据库初始化
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $Root 'frontend\package.json'))) {
  throw "未找到 frontend\package.json。请 cd 到仓库根目录后再运行: .\scripts\local-prod-demo.ps1"
}
Set-Location $Root

if (-not (Test-Path (Join-Path $Root '.env'))) {
  Copy-Item (Join-Path $Root '.env.local-docker-prod.example') (Join-Path $Root '.env')
  Write-Host '已根据 .env.local-docker-prod.example 创建 .env，可按需修改后再次运行本脚本。' -ForegroundColor Yellow
}

Write-Host '>>> 构建前端 (production，API 使用相对路径 /api/v1)...' -ForegroundColor Cyan
Push-Location (Join-Path $Root 'frontend')

# 检查 node_modules 是否存在且可能被占用
if (Test-Path 'node_modules') {
  Write-Host '  检测到 node_modules，尝试清理...' -ForegroundColor Gray
  try {
    # 先尝试正常安装
    if (Test-Path 'package-lock.json') {
      npm ci --prefer-offline 2>&1 | Out-Null
    } else {
      npm install 2>&1 | Out-Null
    }
  } catch {
    Write-Host '  ⚠ npm ci 失败，可能是文件被占用' -ForegroundColor Yellow
    Write-Host '  尝试手动清理 node_modules...' -ForegroundColor Gray

    # 停止可能占用文件的进程
    Get-Process | Where-Object { $_.ProcessName -match 'node|vite|esbuild' } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    # 强制删除 node_modules
    try {
      Remove-Item -Recurse -Force node_modules -ErrorAction Stop
      Write-Host '  ✓ node_modules 已清理' -ForegroundColor Green
    } catch {
      Write-Host '  ⚠ 无法自动清理 node_modules，请手动删除后重试' -ForegroundColor Red
      Write-Host "  命令: Remove-Item -Recurse -Force frontend\node_modules" -ForegroundColor Gray
      Pop-Location
      exit 1
    }

    # 重新安装
    Write-Host '  重新安装依赖...' -ForegroundColor Gray
    npm install
  }
} else {
  # 首次安装
  if (Test-Path 'package-lock.json') {
    npm ci
  } else {
    npm install
  }
}

npm run build
$distIndex = Join-Path $Root 'frontend\dist\index.html'
if (-not (Test-Path $distIndex)) {
  throw "前端构建未生成 dist/index.html（路径: $distIndex）。请查看上方 npm run build 是否报错。"
}
Pop-Location

Write-Host '>>> 启动 Docker Compose（生产文件 + 本地演示覆盖 + 数据库管理工具）...' -ForegroundColor Cyan
docker compose `
  -f docker-compose.timescaledb.prod.yml `
  -f docker-compose.prod.local-demo.yml `
  -f docker-compose.prod.db-admin.yml `
  --env-file .env `
  up -d --build --remove-orphans

# 等待数据库就绪
Write-Host ''
Write-Host '>>> 等待数据库服务就绪...' -ForegroundColor Cyan
$retryCount = 0
$maxRetries = 30
while ($retryCount -lt $maxRetries) {
  $dbHealthy = docker inspect --format='{{.State.Health.Status}}' logix-timescaledb-prod 2>$null
  if ($dbHealthy -eq 'healthy') {
    Write-Host '✓ 数据库已就绪' -ForegroundColor Green
    break
  }
  $retryCount++
  Write-Host "  等待中... ($retryCount/$maxRetries)" -ForegroundColor Gray
  Start-Sleep -Seconds 2
}
if ($retryCount -eq $maxRetries) {
  Write-Host '⚠ 数据库健康检查超时，但将继续尝试初始化' -ForegroundColor Yellow
}

# 执行数据库初始化
if (-not $SkipDbInit) {
  Write-Host ''
  Write-Host '>>> 执行数据库初始化与迁移...' -ForegroundColor Cyan
  Push-Location (Join-Path $Root 'backend')
  if (Test-Path '.\reinit_database_docker.ps1') {
    .\reinit_database_docker.ps1
  } else {
    Write-Host '⚠ 未找到 reinit_database_docker.ps1，跳过数据库初始化' -ForegroundColor Yellow
    Write-Host '  如需初始化数据库，请手动运行: backend\reinit_database_docker.ps1' -ForegroundColor Gray
  }
  Pop-Location
} else {
  Write-Host ''
  Write-Host '⚠ 已跳过数据库初始化（使用 -SkipDbInit 参数）' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '就绪：' -ForegroundColor Green
Write-Host '  前端 + API 入口   http://localhost/'
Write-Host '  健康检查         http://localhost/health'
Write-Host '  Grafana          http://localhost/grafana/  （账号见 .env 中 GRAFANA_*）'
Write-Host '  Prometheus       http://localhost:9090'
Write-Host '  Adminer          http://localhost:8080/  （系统: PostgreSQL, 服务器: postgres, 用户名: logix_user, 密码: postgre, 数据库: logix_db）'
Write-Host ''
Write-Host '停止：docker compose -f docker-compose.timescaledb.prod.yml -f docker-compose.prod.local-demo.yml -f docker-compose.prod.db-admin.yml --env-file .env down' -ForegroundColor DarkGray
