-- ============================================================
-- TimescaleDB 迁移 - 回滚脚本（紧急情况使用）
-- ============================================================
-- 用途：在迁移失败或出现严重问题时回滚
-- 警告：此脚本会删除所有 hypertable 相关数据！
-- 使用场景：仅在迁移后出现严重问题时使用
-- ============================================================

\echo '============================================================'
\echo '⚠️  警告：即将执行回滚操作 ⚠️'
\echo '============================================================'
\echo '此操作将:'
\echo '  1. 删除所有 hypertable'
\echo '  2. 恢复普通表结构'
\echo '  3. 重新添加外键约束'
\echo ''
\echo '请确认已备份数据！'
\echo '============================================================'

-- 暂停 10 秒，给操作者反悔时间
\echo '10 秒后开始回滚...'
\echo '按 Ctrl+C 取消'
SELECT pg_sleep(10);

-- ============================================================
-- Step 1: 删除 hypertable（保留数据）
-- ============================================================
\echo ''
\echo '[Step 1] 删除 hypertable 结构...'

-- 注意：drop_chunks 只删除数据，不删除表结构
-- 我们需要完全删除 hypertable 并重建

-- 由于 TimescaleDB 的限制，最可靠的回滚方式是从备份恢复
-- 以下脚本仅供参考，实际建议使用备份恢复

\echo '⚠️  重要提示:'
\echo 'TimescaleDB hypertable 无法直接转换回普通表'
\echo '最安全的回滚方式是从备份恢复数据库'
\echo ''
\echo '建议的回滚步骤:'
\echo '1. 停止所有应用'
\echo '2. 删除当前数据库'
\echo '3. 创建新数据库'
\echo '4. 从备份恢复'
\echo ''

-- 如果坚持要继续，请取消下面的注释
-- 但请注意这可能导致数据丢失

-- DROP TABLE IF EXISTS ext_container_status_events CASCADE;
-- DROP TABLE IF EXISTS process_port_operations CASCADE;
-- DROP TABLE IF EXISTS process_sea_freight CASCADE;
-- DROP TABLE IF EXISTS sys_data_change_log CASCADE;

\echo '回滚脚本结束'
\echo '请参考 docs/TimescaleDB 迁移最终方案.md 中的回滚章节'
