# LogiX 开发环境启动指南

## 🚀 一键启动

**双击运行**: `start-logix-dev.bat`

该脚本会自动完成以下操作：
1. ✅ 检查并启动 Docker Desktop（如果未运行）
2. ✅ 启动 TimescaleDB + Redis
3. ✅ 启动数据库管理工具（Adminer + pgAdmin）
4. ✅ 启动后端服务（新窗口）
5. ✅ 启动前端服务（新窗口）

## 🛑 一键停止

**双击运行**: `stop-logix-dev.bat`

该脚本会自动完成以下操作：
1. ✅ 停止所有 Docker 容器
2. ✅ 关闭前后端 Node.js 进程
3. ✅ 保留数据库数据（volumes）

## 📍 服务访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| **前端应用** | http://localhost:5173 | Vue 3 前端 |
| **后端 API** | http://localhost:3001 | Node.js 后端 |
| **TimescaleDB** | localhost:5432 | PostgreSQL + TimescaleDB |
| **Redis** | localhost:6379 | 缓存服务 |
| **Adminer** | http://localhost:8080 | 轻量级数据库管理 |
| **pgAdmin** | http://localhost:5050 | PostgreSQL 官方管理工具 |

## 🔑 默认账号密码

### 数据库
- **用户名**: 查看 `.env` 文件中的 `DB_USERNAME`
- **密码**: 查看 `.env` 文件中的 `DB_PASSWORD`
- **数据库**: 查看 `.env` 文件中的 `DB_DATABASE`

### pgAdmin
- **Email**: admin@logix.com
- **密码**: LogiX@2024

### Adminer
- 无需登录，直接连接数据库

## 📝 手动启动（分步）

如果自动启动失败，可以手动分步启动：

### 步骤 1: 启动 Docker Desktop
```bash
# 确保正在运行
"C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### 步骤 2: 启动数据库
```bash
docker-compose -f docker-compose.timescaledb.prod.yml --env-file .env up -d postgres redis
```

### 步骤 3: 启动管理工具
```bash
docker-compose -f docker-compose.admin-tools.yml --env-file .env up -d adminer pgadmin
```

### 步骤 4: 启动后端
```bash
cd backend
npm install
npm run dev
```

### 步骤 5: 启动前端
```bash
cd frontend
npm install
npm run dev
```

## 🔧 故障排查

### Docker 未启动
```
error during connect: Get "http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine..."
```
**解决**: 手动启动 Docker Desktop

### 端口被占用
```
Bind for 0.0.0.0:5173 failed: port is already allocated
```
**解决**: 修改端口或关闭占用进程

### 数据库连接失败
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**解决**: 检查 TimescaleDB 容器是否运行
```bash
docker ps | grep timescaledb
```

### 前端显示 404
**解决**: 确保前端服务器正在运行
```bash
cd frontend
npm run dev
```

## 📊 验证服务状态

```bash
# 检查 Docker 容器
docker-compose -f docker-compose.timescaledb.prod.yml -f docker-compose.admin-tools.yml ps

# 检查端口占用
netstat -ano | findstr "5173 3001 5432 6379 8080 5050"

# 查看 Docker 日志
docker logs logix-timescaledb-prod
docker logs logix-redis-prod
```

## 🔄 日常开发流程

### 启动开发环境
```bash
start-logix-dev.bat
```

### 开发代码
- 前端: `frontend/src/`
- 后端: `backend/src/`

### 查看数据库
- 快速查看: http://localhost:8080 (Adminer)
- 复杂操作: http://localhost:5050 (pgAdmin)

### 重启服务（无需停止）
```bash
# 后端热更新（自动）
# 修改代码后自动刷新

# 前端热更新（自动）
# 修改代码后自动刷新

# 数据库重启
docker restart logix-timescaledb-prod
```

### 停止开发环境
```bash
stop-logix-dev.bat
```

## 📦 生产部署

生产环境部署请参考：
- `README_DOCKER.md`
- `TIMESCALEDB_GUIDE.md`

## 🆘 获取帮助

- **前端文档**: `frontend/README.md`
- **数据库工具**: `ADMIN_TOOLS_GUIDE.md`
- **TimescaleDB**: `TIMESCALEDB_QUICK_REFERENCE.md`
- **项目主文档**: `README_DOCKER.md`

## ⚡ 快捷命令

```bash
# 查看 Docker 容器
docker ps

# 进入数据库容器
docker exec -it logix-timescaledb-prod psql -U logix_user -d logix_db

# 清理未使用的 Docker 资源
docker system prune -f

# 查看容器日志
docker logs <container-name>

# 重启容器
docker restart <container-name>
```

---

**注意**: 首次启动需要等待数据库初始化（约 10-20 秒）
