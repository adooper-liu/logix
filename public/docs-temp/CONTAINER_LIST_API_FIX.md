# 集装箱列表API修复记录

## 问题描述
用户报告"获取集装箱列表失败"

## 根本原因分析

### 1. API 路径不匹配
- **前端配置**：`VITE_API_BASE_URL=http://localhost:3001/api`
- **后端配置**：`config.apiPrefix=/api/v1`
- **问题**：前端请求 `/containers` 时，实际请求 `http://localhost:3001/api/containers`，但后端实际需要 `http://localhost:3001/api/v1/containers`

### 2. 后端路由冲突
- **监控路由冲突**：`app.ts` 中监控路由直接挂载到 `/api`，与主要 API 路由 `/api/v1` 产生冲突
- **容器统计路由顺序问题**：`router.get('/:id')` 在 `router.get('/statistics')` 之前定义，导致 `/statistics` 被 `/:id` 捕获

## 修复方案

### 1. 修复后端路由配置

#### 文件：`backend/src/app.ts`
```typescript
// 修改前：
app.use('/api', monitoringRoutes);

// 修改后：
app.use(`${config.apiPrefix}/monitoring`, monitoringRoutes);
```

**说明**：将监控路由从 `/api` 改为 `/api/v1/monitoring`，避免与主 API 路由冲突

### 2. 修复前端 API 基础 URL

#### 文件：`frontend/.env.development`
```bash
# 修改前：
VITE_API_BASE_URL=http://localhost:3001/api

# 修改后：
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

#### 文件：`frontend/.env.production`
```bash
# 修改前：
VITE_API_BASE_URL=/api

# 修改后：
VITE_API_BASE_URL=/api/v1
```

**说明**：统一前后端 API 路径，确保前端请求能够正确路由到后端

### 3. 修复容器统计路由顺序

#### 文件：`backend/src/routes/container.routes.ts`
```typescript
// 修改前：
router.get('/', containerController.getContainers);
router.get('/:id', containerController.getContainerById);
// ... 其他路由
router.get('/statistics', containerController.getStatistics);  // 这会被 /:id 捕获

// 修改后：
router.get('/statistics', containerController.getStatistics);  // 放到 /:id 之前
router.get('/', containerController.getContainers);
router.get('/:id', containerController.getContainerById);
```

**说明**：Express 路由匹配按顺序执行，特定路由（如 `/statistics`）必须放在动态路由（如 `/:id`）之前

## 修复后的路由结构

### 后端路由
```
/api/v1
  ├── /health          (健康检查)
  ├── /containers      (货柜管理)
  │   ├── /            (获取货柜列表)
  │   ├── /statistics  (获取统计数据) ✅ 修复顺序
  │   └── /:id         (获取货柜详情)
  ├── /monitoring      (监控服务) ✅ 修复路径
  │   ├── /            (获取监控数据)
  │   ├── /refresh     (刷新监控数据)
  │   ├── /performance (性能指标)
  │   ├── /optimization (优化数据)
  │   ├── /alerts      (告警信息)
  │   ├── /health      (服务健康度)
  │   ├── /trend       (性能趋势)
  │   ├── /memory-analysis (内存分析) ✅ 新增
  │   └── /gc          (垃圾回收) ✅ 新增
  └── ... 其他路由
```

### 前端 API 配置
```typescript
// frontend/src/services/container.ts
this.api = axios.create({
  baseURL: 'http://localhost:3001/api/v1',  // ✅ 修复后
  timeout: 30000
});

// frontend/src/api/monitoring.ts
// 使用相对路径，自动拼接 baseURL
httpClient.get('/monitoring')  // → http://localhost:3001/api/v1/monitoring
httpClient.get('/monitoring/refresh')  // → http://localhost:3001/api/v1/monitoring/refresh
```

## 验证步骤

### 1. 重启后端服务
```bash
# 停止服务
npm run stop

# 重新启动
npm run dev
```

### 2. 重启前端服务
```bash
# 停止前端（如果正在运行）
Ctrl + C

# 重新启动
npm run dev
```

### 3. 测试 API 端点

#### 测试货柜列表 API
```bash
curl http://localhost:3001/api/v1/containers
```

预期响应：
```json
{
  "success": true,
  "items": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

#### 测试货柜统计 API
```bash
curl http://localhost:3001/api/v1/containers/statistics
```

预期响应：
```json
{
  "success": true,
  "data": {
    "total": 100,
    "todayUpdated": 10,
    "statusDistribution": [...]
  }
}
```

#### 测试监控 API
```bash
curl http://localhost:3001/api/v1/monitoring
```

预期响应：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "performanceMetrics": {...},
    "optimizationData": {...},
    "alerts": [...],
    "serviceHealth": {...},
    "performanceTrend": {...}
  }
}
```

### 4. 测试前端页面

1. 打开浏览器访问 `http://localhost:5173`（或前端实际端口）
2. 导航到"货柜列表"或"出运管理"页面
3. 确认能够正常加载集装箱列表
4. 检查浏览器控制台，确认没有 404 错误
5. 测试分页、搜索等功能

## 可能遇到的问题

### 1. 修改环境变量后需要重启前端
环境变量（`VITE_*`）在构建时注入，修改后必须重启开发服务器才能生效。

### 2. 监控页面可能需要刷新
如果监控页面之前已经加载，刷新页面以确保使用新的 API 路径。

### 3. 缓存问题
如果仍然遇到问题，清除浏览器缓存或使用无痕模式测试。

## 最佳实践建议

### 1. 路由定义顺序
- 特定路由（如 `/statistics`）必须放在动态路由（如 `/:id`）之前
- 常规路由放在参数化路由之前

### 2. API 路径统一
- 前后端使用统一的 API 前缀（如 `/api/v1`）
- 在环境变量中集中管理 API 基础 URL
- 使用相对路径调用 API，避免硬编码

### 3. 路由冲突避免
- 不同模块使用不同的路由前缀
- 避免在根路径（`/api`）直接挂载路由
- 使用层级结构组织路由

## 相关文件

- `backend/src/app.ts` - 后端应用配置
- `backend/src/config/index.ts` - 配置文件
- `backend/src/routes/index.ts` - 路由聚合
- `backend/src/routes/container.routes.ts` - 货柜路由
- `backend/src/routes/monitoring.routes.ts` - 监控路由
- `frontend/.env.development` - 开发环境配置
- `frontend/.env.production` - 生产环境配置
- `frontend/src/services/container.ts` - 货柜服务
- `frontend/src/api/monitoring.ts` - 监控 API

## 变更日志

- 2026-02-28: 修复集装箱列表 API 路径问题
  - 修复前端 API 基础 URL
  - 修复后端监控路由挂载路径
  - 修复容器统计路由顺序问题
- 2026-02-28: 添加内存泄漏检测 API（在 `/api/v1/monitoring` 下）

## 备注

此次修复确保了：
1. ✅ 前端能够正确调用后端 API
2. ✅ 集装箱列表能够正常加载
3. ✅ 货柜统计数据能够正常获取
4. ✅ 监控功能不受影响
5. ✅ 路由冲突已解决
