# 快速启动指南 - LogiX 主服务

## 前置条件

- Node.js 18+ 已安装
- npm 或 yarn 已安装
- `logistics-path-system` 微服务已启动（http://localhost:4000）

## 启动步骤

### 方式一：使用启动脚本（Linux/Mac）

```bash
cd D:/Gihub/logix/backend
chmod +x start.sh
./start.sh
```

脚本将自动：
1. 检查 Node.js 和 npm
2. 创建日志目录
3. 检查依赖并安装
4. 检查物流路径微服务状态
5. 启动开发服务器

### 方式二：手动启动

#### 1. 安装依赖

```bash
cd D:/Gihub/logix/backend
npm install
```

#### 2. 配置环境变量

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑 .env 文件（如果需要）
# 确保 LOGISTICS_PATH_SERVICE_URL=http://localhost:4000
```

#### 3. 启动服务

```bash
npm run dev
```

服务将在 `http://localhost:3001` 启动。

## 验证服务

### 1. 检查服务健康

```bash
curl http://localhost:3001/health
```

预期响应：
```json
{
  "status": "healthy",
  "timestamp": "2026-02-24T10:00:00.000Z",
  "environment": "development",
  "uptime": 123.45,
  "services": {
    "logisticsPath": "http://localhost:4000"
  }
}
```

### 2. 查看服务信息

```bash
curl http://localhost:3001/info
```

### 3. 测试物流路径 API

```bash
# 根据集装箱号获取物流路径
curl http://localhost:3001/api/v1/logistics-path/container/CNTR1234567

# 获取物流路径列表
curl http://localhost:3001/api/v1/logistics-paths?first=5
```

## 目录结构

```
backend/
├── src/
│   ├── config/           # 配置文件
│   ├── controllers/      # 控制器
│   ├── routes/          # 路由
│   ├── services/        # 服务层
│   ├── middleware/      # 中间件
│   ├── utils/           # 工具函数
│   ├── app.ts           # Express 应用
│   └── server.ts        # 服务器入口
├── logs/              # 日志目录（自动创建）
├── dist/              # 编译输出（自动创建）
├── .env               # 环境变量（需要手动创建）
├── .env.example       # 环境变量示例
├── package.json
├── tsconfig.json
└── README.md
```

## 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| LogiX 主服务 | 3001 | API 网关 |
| 物流路径微服务 | 4000 | GraphQL API |

## 环境变量说明

必须配置的环境变量：

```bash
NODE_ENV=development              # 运行环境
PORT=3001                      # 服务端口
LOGISTICS_PATH_SERVICE_URL=http://localhost:4000  # 微服务 URL
```

可选的环境变量：

```bash
CORS_ORIGIN=http://localhost:5173     # CORS 允许的源
LOG_LEVEL=info                    # 日志级别
RATE_LIMIT_WINDOW_MS=900000         # 速率限制窗口
RATE_LIMIT_MAX_REQUESTS=100        # 速率限制
```

## 测试 API

### 使用 curl

```bash
# 健康检查
curl -X GET http://localhost:3001/health

# 根据集装箱号获取物流路径
curl -X GET http://localhost:3001/api/v1/logistics-path/container/TEST1234567

# 同步外部数据
curl -X POST http://localhost:3001/api/v1/logistics-path/sync \
  -H "Content-Type: application/json" \
  -d '{
    "source": "feituo",
    "data": {"eventCode": "LOBD"},
    "containerNumber": "TEST1234567"
  }'
```

### 使用 Postman

1. 导入 API 文档（如果提供）
2. 设置 Base URL: `http://localhost:3001/api/v1`
3. 发送测试请求

## 常见问题

### 1. 端口被占用

**错误**：`Error: listen EADDRINUSE: address already in use :::3001`

**解决方案**：
```bash
# 查找占用端口的进程
netstat -ano | findstr :3001

# 或者
lsof -i :3001

# 终止进程或修改 .env 中的 PORT
```

### 2. 微服务连接失败

**错误**：`Logistics Path service is unhealthy`

**解决方案**：
1. 确保 `logistics-path-system` 正在运行
2. 检查 `LOGISTICS_PATH_SERVICE_URL` 配置
3. 检查防火墙设置

```bash
# 测试微服务连接
curl http://localhost:4000/health
```

### 3. 依赖安装失败

**错误**：`npm ERR! code ERESOLVE`

**解决方案**：
```bash
# 清除缓存
npm cache clean --force

# 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 4. TypeScript 编译错误

**错误**：编译失败

**解决方案**：
```bash
# 类型检查
npm run type-check

# 修复类型错误后重新构建
npm run build
```

## 日志查看

### 实时查看日志

```bash
# 查看所有日志
tail -f logs/combined.log

# 仅查看错误日志
tail -f logs/error.log
```

### 使用 PowerShell (Windows)

```powershell
# 查看日志
Get-Content logs\combined.log -Wait -Tail 20

# 查看错误
Get-Content logs\error.log -Wait -Tail 20
```

## 开发模式特性

- **热重载**: 代码变更后自动重启
- **详细日志**: 日志级别设置为 `debug`
- **源码映射**: 便于调试
- **类型检查**: TypeScript 严格模式

## 生产模式部署

### 1. 构建项目

```bash
npm run build
```

### 2. 启动生产服务

```bash
NODE_ENV=production npm start
```

### 3. 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start npm --name "logix-main" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs logix-main

# 停止服务
pm2 stop logix-main

# 重启服务
pm2 restart logix-main
```

### 4. Docker 部署

```bash
# 构建镜像
docker build -t logix-main-service .

# 运行容器
docker run -d \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e LOGISTICS_PATH_SERVICE_URL=http://logistics-path:4000 \
  --name logix-main \
  logix-main-service
```

## 下一步

1. 阅读完整的 [README.md](./README.md)
2. 查看 [ARCHITECTURE.md](./ARCHITECTURE.md) 了解架构
3. 集成前端应用
4. 配置反向代理（Nginx）
5. 设置监控和告警

## 获取帮助

- 查看日志: `logs/` 目录
- 检查配置: `.env` 文件
- 测试微服务: `curl http://localhost:4000/health`
- API 文档: 访问 `http://localhost:3001/info`
