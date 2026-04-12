# 数据库管理工具使用指南

## Adminer - 轻量级数据库管理工具

### 访问方式

启动本地生产环境后,可以通过以下地址访问 Adminer:

```
http://localhost:8080/
```

### 登录信息

Adminer 无需预先配置账号,每次登录时填写:

- **系统**: PostgreSQL
- **服务器**: `postgres` (Docker 内部网络)
- **用户名**: `logix_user`
- **密码**: `postgre` (见 .env 中的 DB_PASSWORD)
- **数据库**: `logix_db`

> 💡 **提示**: Adminer 是单文件应用,无需注册或配置,直接使用数据库账号登录即可。

### 常用操作

- **浏览表**: 左侧边栏点击表名查看数据
- **执行 SQL**: 顶部菜单 "SQL command"
- **导出数据**: 选择表后点击 "Export"
- **导入数据**: 顶部菜单 "Import"
- **创建/修改表**: 顶部菜单 "Create table" / 点击表名后 "Alter table"
- **查看结构**: 点击表名后查看 "Fields" 标签

### 优势

✅ **轻量级**: 单个 PHP 文件,资源占用极小
✅ **多数据库支持**: PostgreSQL, MySQL, SQLite, Oracle 等
✅ **无需配置**: 直接使用数据库账号登录
✅ **界面简洁**: 操作简单直观
✅ **功能完整**: 支持所有常用数据库操作

### 停止服务

停止所有服务(包括 Adminer):

```powershell
docker compose -f docker-compose.timescaledb.prod.yml -f docker-compose.prod.local-demo.yml -f docker-compose.prod.db-admin.yml --env-file .env down
```

仅停止 Adminer:

```powershell
docker compose -f docker-compose.prod.db-admin.yml --env-file .env down
```

## 安全注意事项

1. **不要在生产环境暴露 Adminer**
2. **Adminer 仅用于本地开发和演示**
3. **定期备份数据库**
4. **使用强密码保护数据库账号**

## 故障排查

### Adminer 无法启动

检查日志:

```powershell
docker logs logix-adminer-prod
```

常见原因:
- 端口 8080 被占用
- PostgreSQL 容器未启动

### 无法连接数据库

确保:
1. PostgreSQL 容器正在运行: `docker ps | grep postgres`
2. 使用正确的服务器名(`postgres`,不是 `localhost` 或 `db`)
3. 用户名和密码与 `.env` 中的一致
4. 数据库名称正确(`logix_db`)

**常见错误**: 
- 错误: `could not translate host name "db" to address`
- 原因: 服务器名填写错误
- 解决: 将服务器名改为 `postgres`

### 页面空白或加载缓慢

- 清除浏览器缓存
- 检查 Docker 容器状态
- 查看浏览器控制台是否有错误

## 与 pgAdmin 对比

| 特性 | Adminer | pgAdmin |
|------|---------|---------|
| 资源占用 | 极低 (~50MB) | 较高 (~500MB) |
| 启动速度 | 快 (秒级) | 慢 (分钟级) |
| 配置复杂度 | 无 | 需要配置服务器 |
| 学习曲线 | 低 | 中等 |
| 功能丰富度 | 基础够用 | 非常全面 |
| 适用场景 | 日常开发/调试 | 复杂管理任务 |

**推荐**: 日常开发使用 Adminer,需要高级功能时使用 pgAdmin 或其他专业工具。
