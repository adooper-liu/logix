# local-prod-demo.ps1 改进说明

## 问题

原始的 `scripts/local-prod-demo.ps1` 脚本只启动了 Docker 容器,但没有执行数据库初始化和迁移脚本,导致:

1. 数据库表结构不完整
2. 缺少必要的字段(如 `api_provider`, `forwarder_name` 等)
3. 字典数据未初始化
4. 应用启动后出现大量 "column does not exist" 错误

## 解决方案

参照 `backend/reinit_database_docker.ps1` 的完整迁移流程,在 `local-prod-demo.ps1` 中添加了数据库初始化步骤。

## 改进内容

### 1. 添加参数支持

```powershell
param(
  [switch]$SkipDbInit  # 跳过数据库初始化
)
```

允许用户选择是否执行数据库初始化:
- 默认: 执行完整的数据库初始化
- `-SkipDbInit`: 跳过初始化(用于快速重启)

### 2. 等待数据库就绪

```powershell
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
```

确保在数据库完全启动后再执行迁移脚本。

### 3. 执行数据库初始化

```powershell
if (-not $SkipDbInit) {
  Write-Host '>>> 执行数据库初始化与迁移...' -ForegroundColor Cyan
  Push-Location (Join-Path $Root 'backend')
  if (Test-Path '.\reinit_database_docker.ps1') {
    .\reinit_database_docker.ps1
  } else {
    Write-Host '⚠ 未找到 reinit_database_docker.ps1，跳过数据库初始化' -ForegroundColor Yellow
  }
  Pop-Location
}
```

调用 `backend/reinit_database_docker.ps1` 执行完整的7步迁移流程:
1. 基础表创建 (sql/schema/ & sql/data/)
2. 核心迁移脚本 (migrations/)
3. 配置与索引迁移
4. 数据修复与扩展
5. 港口数据
6. 智能处理与其他
7. scripts/ 目录的迁移

## 使用方法

### 首次启动(包含数据库初始化)

```powershell
.\scripts\local-prod-demo.ps1
```

这将:
1. 构建前端
2. 启动所有 Docker 服务
3. 等待数据库就绪
4. 执行完整的数据库初始化和迁移
5. 显示访问信息

### 快速重启(跳过数据库初始化)

```powershell
.\scripts\local-prod-demo.ps1 -SkipDbInit
```

适用于:
- 数据库已经初始化过
- 只需要重启服务
- 节省时间(跳过 ~2-3 分钟的迁移过程)

## 迁移脚本覆盖范围

`reinit_database_docker.ps1` 执行的迁移包括:

### 基础表
- 所有业务表(biz_*)
- 所有流程表(process_*)
- 所有字典表(dict_*)
- 所有扩展表(ext_*)

### 关键字段
- `dict_shipping_companies.api_provider`
- `dict_freight_forwarders.forwarder_name`
- `dict_trucking_companies.partnership_level`
- 等等...

### 字典数据
- 92个船公司
- 所有港口数据
- 仓库数据
- 国家数据
- 等等...

### 索引和约束
- 外键约束
- 性能索引
- 唯一约束

## 验证

脚本执行完成后,会显示验证结果:
- 总表数
- 关键表存在性检查
- 关键字段检查
- 配置项数量
- 外键约束数量
- 索引数量

## 故障排查

### 数据库初始化失败

如果看到错误信息,检查:
1. Docker 容器是否正常运行: `docker ps`
2. 数据库健康状态: `docker inspect logix-timescaledb-prod`
3. 手动运行迁移脚本: `cd backend; .\reinit_database_docker.ps1`

### 跳过初始化后应用报错

如果跳过初始化后出现 "column does not exist" 错误:
1. 停止服务: `docker compose down`
2. 重新运行(不带 -SkipDbInit): `.\scripts\local-prod-demo.ps1`

## 最佳实践

1. **首次部署**: 总是执行完整的初始化
2. **日常开发**: 可以使用 `-SkipDbInit` 加快重启速度
3. **数据库结构变更**: 重新运行完整初始化以确保一致性
4. **生产环境**: 使用专门的部署脚本,不要使用此演示脚本
