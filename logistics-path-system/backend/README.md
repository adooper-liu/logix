# Logistics Path Visualization Microservice

物流路径可视化微服务 - 基于 GraphQL 的物流状态跟踪服务

## 功能特性

- ✅ GraphQL API 查询物流路径
- ✅ 支持多维度查询(集装箱号/提单号/订舱号)
- ✅ 状态路径验证
- ✅ 外部数据同步
- ✅ 健康检查端点

## 快速开始

### 1. 安装依赖

```bash
cd d:/Gihub/logix/logistics-path-system/backend
npm install
```

### 2. 启动服务

开发模式:
```bash
npm run dev
```

生产模式:
```bash
npm run build
npm start
```

### 3. 验证服务

- GraphQL Playground: http://localhost:4000/graphql
- 健康检查: http://localhost:4000/health
- Apollo Studio: http://localhost:4000/graphql (浏览器访问)

## API 端点

### 健康检查
```
GET /health
```

### GraphQL 查询

#### 根据集装箱号获取物流路径
```graphql
query GetStatusPathByContainer($containerNumber: String!) {
  getStatusPathByContainer(containerNumber: $containerNumber) {
    id
    containerNumber
    nodes {
      id
      status
      description
      timestamp
      location {
        id
        name
        code
        type
        country
      }
      nodeStatus
      isAlert
    }
    overallStatus
    eta
    startedAt
    completedAt
  }
}
```

#### 根据提单号获取物流路径
```graphql
query GetStatusPathByBL($billOfLadingNumber: String!) {
  getStatusPathByBL(billOfLadingNumber: $billOfLadingNumber) {
    id
    containerNumber
    nodes {
      id
      status
      description
      timestamp
    }
    overallStatus
    eta
  }
}
```

#### 批量同步外部数据
```graphql
mutation BatchSyncExternalData($source: String!, $dataList: [JSON!]!) {
  batchSyncExternalData(source: $source, dataList: $dataList) {
    successCount
    failureCount
    results {
      containerNumber
      success
      message
      pathId
    }
  }
}
```

## 配置

### 环境变量

创建 `.env` 文件:

```env
PORT=4000
NODE_ENV=development
CORS_ORIGIN=*
```

### 配置项

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务端口 | 4000 |
| NODE_ENV | 运行环境 | development |
| CORS_ORIGIN | CORS 允许源 | * |

## 项目结构

```
backend/
├── src/
│   ├── graphql/
│   │   └── logistics.schema.ts    # GraphQL Schema
│   ├── resolvers/
│   │   └── logistics.resolvers.ts # GraphQL Resolvers
│   ├── utils/
│   │   └── pathValidator.ts       # 路径验证工具
│   └── server.ts                   # 服务入口
├── dist/                           # 编译输出
├── .env                            # 环境变量
├── package.json
├── tsconfig.json
└── README.md
```

## 与主服务集成

主服务通过 HTTP 调用本微服务的 GraphQL API:

```typescript
// 主服务配置
LOGISTICS_PATH_SERVICE_URL=http://localhost:4000
```

## 错误处理

- 400: 请求参数错误
- 500: 服务器内部错误
- 503: 微服务不可用

## 开发说明

- 使用 TypeScript + GraphQL
- Apollo Server 作为 GraphQL 服务器
- 支持热重载(开发模式)
- 完整的类型安全

## 许可证

MIT
