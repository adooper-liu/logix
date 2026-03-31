-- 创建logix_user用户
CREATE USER logix_user WITH PASSWORD 'LogiX@2024!Secure';

-- 授予logix_user用户对logix_db数据库的所有权限
GRANT ALL PRIVILEGES ON DATABASE logix_db TO logix_user;

-- 切换到logix_db数据库
\c logix_db;

-- 授予logix_user用户对所有现有表的所有权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO logix_user;

-- 授予logix_user用户对所有现有序列的所有权限
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO logix_user;

-- 授予logix_user用户对所有现有函数的所有权限
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO logix_user;

-- 授予logix_user用户创建新表、序列、函数等的权限
GRANT CREATE ON SCHEMA public TO logix_user;

-- 提交更改
COMMIT;