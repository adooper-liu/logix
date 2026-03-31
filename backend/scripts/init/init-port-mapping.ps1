# ============================================================
# LogiX 港口映射功能初始化脚本
# Description: 初始化港口名称映射功能,支持Excel导入时
#              将中文港口名称转换为标准代码
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LogiX 港口映射功能初始化" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 执行数据库迁移:创建港口映射表
Write-Host "[1/3] 创建港口名称映射表..." -ForegroundColor Yellow
& psql -h localhost -U logix_user -d logix_db -f "d:\Gihub\logix\backend\migrations\create_port_name_mapping.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 港口名称映射表创建成功" -ForegroundColor Green
} else {
    Write-Host "✗ 港口名称映射表创建失败" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. 扩大字段长度(临时兼容措施)
Write-Host "[2/3] 扩大字段长度..." -ForegroundColor Yellow
& psql -h localhost -U logix_user -d logix_db -f "d:\Gihub\logix\backend\migrations\fix_port_field_length.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 字段长度调整成功" -ForegroundColor Green
} else {
    Write-Host "✗ 字段长度调整失败" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. 验证映射表数据
Write-Host "[3/3] 验证映射数据..." -ForegroundColor Yellow
& psql -h localhost -U logix_user -d logix_db -c "SELECT COUNT(*) as mapping_count FROM dict_port_name_mapping;"
& psql -h localhost -U logix_user -d logix_db -c "SELECT * FROM v_ports_with_mapping LIMIT 5;"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  初始化完成!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "新增API端点:" -ForegroundColor White
Write-Host "  GET  /api/dict-mapping/port/:portName    - 根据中文名称获取标准代码" -ForegroundColor Gray
Write-Host "  POST /api/dict-mapping/port/batch         - 批量获取港口代码映射" -ForegroundColor Gray
Write-Host "  GET  /api/dict-mapping/port/all           - 获取所有港口映射" -ForegroundColor Gray
Write-Host "  POST /api/dict-mapping/port               - 添加新的港口映射" -ForegroundColor Gray
Write-Host "  DELETE /api/dict-mapping/port/:id         - 删除港口映射" -ForegroundColor Gray
Write-Host ""
Write-Host "使用说明:" -ForegroundColor White
Write-Host "  1. 重启后端服务以加载新的路由和控制器" -ForegroundColor Gray
Write-Host "  2. 重启前端服务以加载端口映射服务" -ForegroundColor Gray
Write-Host "  3. Excel导入时会自动将中文港口名称转换为标准代码" -ForegroundColor Gray
Write-Host "  4. 如果遇到未知港口名称,可以手动添加映射" -ForegroundColor Gray
Write-Host ""
