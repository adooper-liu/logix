# LogiX Windows TimescaleDB 快速启动指南

## 🚀 快速开始

### 前置要求

- ✅ Windows 10/11
- ✅ Docker Desktop 已安装并运行
- ✅ PowerShell (Windows 自带)
- ✅ 至少 4GB 可用内存
- ✅ 10GB 可用磁盘空间

---

## 💻 TimescaleDB 开发环境

### 启动开发环境

双击运行:

```
tsdb-start.bat
```

或在命令行中:

```cmd
tsdb-start
```

### 常用命令

| 脚本 | 功能 | 危险程度 |
|------|------|---------|
| `tsdb-start.bat` | 启动 TimescaleDB 开发环境 | ✅ 安全 |
| `tsdb-stop.bat` | 停止 TimescaleDB 开发环境 | ✅ 安全 |
| `tsdb-logs.bat` | 查看服务日志 | ✅ 安全 |
| `tsdb-db.bat` | 连接到 TimescaleDB 数据库 | ✅ 安全 |
| `tsdb-info.bat` | 查看统计信息 | ✅ 安全 |
| `tsdb-restart.bat` | 重启服务 | ✅ 安全 |
| `tsdb-clean.bat` | **删除所有数据** | ⚠️ 危险 |

---

## 🏭 TimescaleDB 生产环境

### 首次配置

```cmd
# 1. 复制环境变量文件
copy .env.timescaledb.example .env

# 2. 编辑 .env 文件
# 使用记事本或其他编辑器编辑，填入实际配置
# 必须修改：数据库密码、API 密钥等

# 3. 启动生产环境
docker-compose -f docker-compose.timescaledb.prod.yml --env-file .env up -d --build
```

### 常用命令

| 命令 | 功能 |
|------|------|
| `docker-compose -f docker-compose.timescaledb.prod.yml logs -f` | 查看生产环境日志 |
| `docker-compose -f docker-compose.timescaledb.prod.yml ps` | 查看服务状态 |
| `docker-compose -f docker-compose.timescaledb.prod.yml down` | 停止生产环境 |

---

## 📊 监控和可视化

### Grafana 仪表板

访问: http://localhost:3000

默认登录: `admin` / `admin`

**预置仪表板**:
- LogiX 容器追踪 - 货柜状态事件趋势
- 港口容器分布 - 各港口货柜数量统计
- 状态码分布 - 物流状态统计
- 数据压缩率 - TimescaleDB 压缩效果

### Prometheus 监控

访问: http://localhost:9090

**查看指标**:
- TimescaleDB 压缩统计
- 数据保留策略执行
- 查询性能指标
- 数据库连接数

---

## 🧪 测试环境

在 PowerShell 中运行:

```powershell
.\scripts\test-docker.ps1
```

---

## 📋 服务端口映射

| 服务 | 端口 | 说明 |
|------|------|------|
| TimescaleDB | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| Backend API | 3001 | 后端 API |
| Grafana | 3000 | 监控面板 |
| Prometheus | 9090 | 指标收集 |
| Elasticsearch | 9200 | 搜索服务 (生产环境) |

---

## 🔍 故障排查

### Docker 未运行

```
[错误] Docker 未安装或未运行
```

**解决方法**:
1. 启动 Docker Desktop
2. 等待 Docker 完全启动
3. 重新运行脚本

### 端口被占用

如果端口 5432/3001/3000/6379 被占用:

编辑 `docker-compose.timescaledb.yml` 修改端口映射:

```yaml
ports:
  - "5433:5432"  # 数据库端口改为 5433
```

### 容器启动失败

```cmd
# 查看详细日志
tsdb-logs postgres

# 查看容器状态
docker-compose -f docker-compose.timescaledb.yml ps

# 查看所有日志
tsdb-logs
```

### TimescaleDB 初始化失败

```cmd
# 检查数据库日志
tsdb-logs postgres

# 手动执行初始化脚本
docker exec -it logix-timescaledb-dev psql -U postgres -d logix_db -f /docker-entrypoint-initdb.d/02-timescaledb.sql
```

### 内存不足

如果遇到内存不足错误:

1. 关闭其他 Docker 容器
2. 在 Docker Desktop 中增加内存分配
3. 或者编辑 `docker-compose.timescaledb.yml` 调整服务资源限制

---

## 💡 提示

- 所有脚本都可以双击运行
- 使用 PowerShell 运行可以获得更好的输出体验
- 首次启动需要下载镜像，可能需要几分钟
- 开发环境支持热重载，修改代码会自动重启
- **不要在生产环境使用默认密码**
- 定期运行 `tsdb-info` 检查数据压缩效果

---

## 🎯 快速上手流程

```cmd
# 1. 启动环境
tsdb-start

# 2. 等待 30 秒让服务完全启动

# 3. 查看统计信息
tsdb-info

# 4. 进入数据库探索
tsdb-db

# 5. 访问监控面板
# 打开浏览器访问: http://localhost:3000

# 6. 查看日志
tsdb-logs backend
```

---

## 📚 相关文档

- **完整指南**: `TIMESCALEDB_GUIDE.md`
- **快速参考**: `TIMESCALEDB_QUICK_REFERENCE.md`
- **脚本说明**: `SCRIPTS_GUIDE.md`

---

## 📞 获取帮助

遇到问题时:

1. 查看日志: `tsdb-logs`
2. 检查统计: `tsdb-info`
3. 阅读完整指南: `TIMESCALEDB_GUIDE.md`
4. 查看故障排查部分

---

## 🔄 从标准 PostgreSQL 迁移

如果你之前使用标准 PostgreSQL 版本:

1. 备份现有数据
2. 停止旧服务
3. 启动 TimescaleDB 环境
4. 数据会自动迁移（表结构兼容）

---

**版本**: 2.0.0 (TimescaleDB Edition)
**最后更新**: 2024-02-24
