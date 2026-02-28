# LogiX 快速启动指南

> 5分钟快速启动开发环境

---

## 🚀 一键启动

### Windows 用户

```powershell
# 双击运行
start-logix-dev.ps1
```

### Linux/Mac 用户

```bash
# 启动 TimescaleDB
docker-compose -f docker-compose.timescaledb.yml up -d

# 启动后端
cd backend && npm run dev

# 启动前端
cd frontend && npm run dev
```

---

## 📍 服务地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5173 |
| 后端 | http://localhost:3001 |
| Adminer | http://localhost:8080 |
| pgAdmin | http://localhost:5050 |

---

## 📚 必读文档

1. **[开发规范](./DEVELOPMENT_STANDARDS.md)** ⭐⭐⭐
   - 数据库表结构是唯一不变基准
   - 命名规范：数据库snake_case，实体camelCase

2. **[核心映射参考](./docs/CORE_MAPPINGS_REFERENCE.md)** ⭐⭐⭐
   - 11张核心表的完整字段映射
   - API接口映射示例

3. **[开发环境指南](./DEV_ENVIRONMENT_GUIDE.md)** ⭐⭐
   - 完整的环境配置说明

---

## 🛑 一键停止

### Windows 用户

```powershell
# 双击运行
stop-logix-dev.ps1
```

### Linux/Mac 用户

```bash
# 停止所有服务
docker-compose -f docker-compose.timescaledb.yml down
```

---

## 🔑 默认账号

### 数据库
查看 `.env` 文件：
- `DB_USERNAME`: logix_user
- `DB_PASSWORD`: LogiX@2024!Secure
- `DB_DATABASE`: logix_db

### pgAdmin
- Email: admin@logix.com
- Password: LogiX@2024

---

## 🆘 常见问题

### Docker 未启动
```
错误: Cannot connect to the Docker daemon
解决: 启动 Docker Desktop
```

### 端口被占用
```bash
# 查看端口占用
netstat -ano | findstr :5432
netstat -ano | findstr :3001
netstat -ano | findstr :5173
```

### 数据库连接失败
```bash
# 检查TimescaleDB状态
tsdb-logs

# 重启TimescaleDB
tsdb-restart
```

---

## 📖 更多文档

- [项目总纲](./INDEX.md) - 完整文档导航
- [TimescaleDB指南](./TIMESCALEDB_GUIDE.md) - 完整学习指南
- [TimescaleDB快速参考](./TIMESCALEDB_QUICK_REFERENCE.md) - 命令速查

---

**最后更新**: 2026-02-26
