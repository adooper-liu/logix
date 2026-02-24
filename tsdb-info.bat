@echo off
REM ============================================
REM LogiX TimescaleDB 信息查询脚本
REM LogiX TimescaleDB Info Query Script
REM ============================================

echo.
echo ========================================
echo TimescaleDB Information
echo ========================================
echo.

REM 检查容器是否运行
docker ps --filter "name=logix-timescaledb-dev" --format "{{.Names}}" | findstr "logix-timescaledb-dev" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: TimescaleDB container is not running!
    echo Please run tsdb-start.bat first.
    pause
    exit /b 1
)

echo.
echo ========================================
echo 1. TimescaleDB Version
echo ========================================
docker exec logix-timescaledb-dev psql -U postgres -d logix_db -c "SELECT extversion AS 'TimescaleDB Version' FROM pg_extension WHERE extname='timescaledb';"
echo.

echo ========================================
echo 2. Hypertables (Time-series Tables)
echo ========================================
docker exec logix-timescaledb-dev psql -U postgres -d logix_db -c "SELECT hypertable_schema, hypertable_name, table_name FROM timescaledb_information.hypertables;"
echo.

echo ========================================
echo 3. Continuous Aggregates
echo ========================================
docker exec logix-timescaledb-dev psql -U postgres -d logix_db -c "SELECT view_schema, view_name, query_schema, query_name FROM timescaledb_information.continuous_aggregates;"
echo.

echo ========================================
echo 4. Compression Statistics
echo ========================================
docker exec logix-timescaledb-dev psql -U postgres -d logix_db -c "SELECT hypertable_name, COUNT(*) AS total_chunks, COUNT(*) FILTER (WHERE compressed = true) AS compressed_chunks, ROUND((COUNT(*) FILTER (WHERE compressed = true)::NUMERIC / COUNT(*)::NUMERIC * 100), 2) AS compression_pct FROM timescaledb_information.chunks GROUP BY hypertable_name;"
echo.

echo ========================================
echo 5. Retention Policies
echo ========================================
docker exec logix-timescaledb-dev psql -U postgres -d logix_db -c "SELECT j.hypertable_name::TEXT, j.proc_name, j.schedule_interval, j.config->>'drop_after' AS drop_after FROM timescaledb_information.jobs j WHERE j.proc_name = 'policy_retention';"
echo.

echo ========================================
echo 6. Compression Policies
echo ========================================
docker exec logix-timescaledb-dev psql -U postgres -d logix_db -c "SELECT j.hypertable_name::TEXT, j.proc_name, j.schedule_interval, j.config->>'compress_after' AS compress_after FROM timescaledb_information.jobs j WHERE j.proc_name = 'policy_compression';"
echo.

echo ========================================
echo 7. Table Sizes
echo ========================================
docker exec logix-timescaledb-dev psql -U postgres -d logix_db -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
echo.

echo ========================================
echo 8. Recent Activity
echo ========================================
docker exec logix-timescaledb-dev psql -U postgres -d logix_db -c "SELECT relname, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables ORDER BY seq_scan DESC LIMIT 5;"
echo.

echo ========================================
echo TimescaleDB Information Complete!
echo ========================================
echo.
pause
