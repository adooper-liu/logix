# 📋 排产历史记录功能部署脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📋 排产历史记录功能部署" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 配置参数
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "logix"
$DB_USER = "postgres"
$DB_PASSWORD = "postgres"

Write-Host "⚙️  数据库配置:" -ForegroundColor Yellow
Write-Host "   Host: $DB_HOST"
Write-Host "   Port: $DB_PORT"
Write-Host "   Database: $DB_NAME"
Write-Host "   User: $DB_USER"
Write-Host ""

# 步骤 1: 创建数据库表
Write-Host "📝 步骤 1/3: 创建数据库表和触发器..." -ForegroundColor Green
try {
    $sqlFile = ".\create_scheduling_history_table.sql"
    
    if (Test-Path $sqlFile) {
        $sql = Get-Content $sqlFile -Raw
        
        # 通过 Docker 执行 SQL
        $dockerCmd = "docker exec logix-postgres psql -U $DB_USER -d $DB_NAME -c `":memory:`""
        Write-Host "   执行方式：Docker 内执行 SQL" -ForegroundColor Gray
        
        # 使用临时文件传递 SQL（避免命令行长度限制）
        $tempFile = [System.IO.Path]::GetTempFileName() + ".sql"
        Set-Content -Path $tempFile -Value $sql
        
        docker exec -i logix-postgres psql -U $DB_USER -d $DB_NAME < $tempFile
        
        Remove-Item $tempFile -Force
        
        Write-Host "✅ 数据库表创建成功" -ForegroundColor Green
    } else {
        throw "SQL 文件不存在：$sqlFile"
    }
} catch {
    Write-Host "❌ 数据库表创建失败：$_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 步骤 2: 编译 TypeScript
Write-Host "📝 步骤 2/3: 编译 TypeScript 代码..." -ForegroundColor Green
try {
    npm run build
    Write-Host "✅ TypeScript 编译成功" -ForegroundColor Green
} catch {
    Write-Host "❌ TypeScript 编译失败：$_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 步骤 3: 重启后端服务
Write-Host "📝 步骤 3/3: 重启后端服务..." -ForegroundColor Green
try {
    # 如果使用 Docker
    docker restart logix-backend
    
    Start-Sleep -Seconds 5
    
    Write-Host "✅ 后端服务已重启" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Docker 重启失败，请手动重启后端服务" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 验证部署
Write-Host "🔍 验证部署..." -ForegroundColor Yellow
Write-Host ""

try {
    # 检查表是否存在
    $checkTable = @"
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'hist_scheduling_records'
);
"@
    
    $result = docker exec -i logix-postgres psql -U $DB_USER -d $DB_NAME -t -c $checkTable
    if ($result.Trim() -eq "t") {
        Write-Host "✅ 表 hist_scheduling_records 存在" -ForegroundColor Green
    } else {
        Write-Host "❌ 表 hist_scheduling_records 不存在" -ForegroundColor Red
    }
    
    # 检查触发器是否存在
    $checkTrigger = @"
SELECT EXISTS (
    SELECT FROM pg_trigger 
    WHERE tgname = 'trg_increment_scheduling_version'
);
"@
    
    $result = docker exec -i logix-postgres psql -U $DB_USER -d $DB_NAME -t -c $checkTrigger
    if ($result.Trim() -eq "t") {
        Write-Host "✅ 触发器 trg_increment_scheduling_version 存在" -ForegroundColor Green
    } else {
        Write-Host "❌ 触发器 trg_increment_scheduling_version 不存在" -ForegroundColor Red
    }
    
} catch {
    Write-Host "⚠️  验证过程出现错误：$_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 下一步操作:" -ForegroundColor Cyan
Write-Host "   1. 运行测试脚本：npm run ts-node scripts/test-scheduling-history.ts"
Write-Host "   2. 测试 API: curl http://localhost:8080/api/v1/scheduling/history/TEST001"
Write-Host "   3. 查看文档：docs/排产历史记录保存方案.md"
Write-Host ""
