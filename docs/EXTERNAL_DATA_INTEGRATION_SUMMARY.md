# 飞驼等外部数据接入 - 实施总结

## 完成的工作

### 1. 核心文件创建/修改

#### 新增文件
- ✅ `backend/src/services/externalDataService.ts` - 外部数据服务（已创建，作为备用方案）
- ✅ `backend/src/controllers/externalData.controller.ts` - 外部数据控制器
- ✅ `backend/src/routes/externalData.routes.ts` - 外部数据路由
- ✅ `docs/EXTERNAL_DATA_INTEGRATION_GUIDE.md` - 完整接入指南
- ✅ `docs/EXTERNAL_DATA_QUICKSTART.md` - 快速开始指南

#### 修改文件
- ✅ `backend/src/routes/index.ts` - 注册外部数据路由
- ✅ `backend/src/controllers/container.controller.ts` - 修改状态事件获取逻辑（先从表查询，表空时再从业务表生成）

### 2. 架构设计

```
外部数据源 (飞驼)
    ↓
FeiTuoAdapter (适配器层) - 已存在
    ↓
ExternalDataController (控制器层) - 新增
    ↓
container_status_events (持久化存储)
    ↓
前端状态事件页签展示
```

### 3. API接口

| 接口 | 方法 | 路径 | 说明 |
|-----|------|------|------|
| 同步单个货柜 | POST | /api/external/sync/:containerNumber | 从外部数据源同步状态事件 |
| 批量同步 | POST | /api/external/sync/batch | 批量同步多个货柜 |
| 获取事件 | GET | /api/external/events/:containerNumber | 获取货柜的状态事件 |
| 删除事件 | DELETE | /api/external/events/:containerNumber | 删除货柜的状态事件 |
| 清理过期事件 | POST | /api/external/cleanup | 清理过期的预计事件 |
| 统计信息 | GET | /api/external/stats | 获取数据源统计 |

### 4. 数据流

```
1. 用户调用同步API
   ↓
2. ExternalDataController 接收请求
   ↓
3. 调用 FeiTuoAdapter 获取外部数据
   ↓
4. 数据格式转换 (外部格式 → 系统格式)
   ↓
5. 去重检查 (基于 containerNumber + statusCode + occurredAt)
   ↓
6. 保存到 container_status_events 表
   ↓
7. 返回同步结果
```

## 使用方法

### 配置

在 `.env` 文件中添加：

```bash
FEITUO_API_KEY=your_api_key_here
FEITUO_API_URL=https://api.feituo.com/v1
```

### 手动同步

```bash
# 同步单个货柜
curl -X POST http://localhost:3000/api/external/sync/MRKU4896861 \
  -H "Content-Type: application/json" \
  -d '{"dataSource": "Feituo"}'

# 批量同步
curl -X POST http://localhost:3000/api/external/sync/batch \
  -H "Content-Type: application/json" \
  -d '{
    "containerNumbers": ["MRKU4896861", "TEMU1234567"],
    "dataSource": "Feituo"
  }'
```

### 代码调用

```typescript
import axios from 'axios'

// 同步单个货柜
const response = await axios.post(
  `/api/external/sync/MRKU4896861`,
  { dataSource: 'Feituo' }
)

// 获取状态事件
const events = await axios.get(
  `/api/external/events/MRKU4896861`
)
```

## 数据存储

### container_status_events 表结构

| 字段 | 说明 |
|------|------|
| id | 主键 |
| containerNumber | 集装箱号 |
| statusCode | 状态代码 |
| occurredAt | 发生时间 |
| isEstimated | 是否预计 |
| locationNameCn | 地点名称(中文) |
| locationNameEn | 地点名称(英文) |
| dataSource | 数据来源 (Feituo/AIS/ShipCompany等) |
| ... | 其他字段 |

## 与现有系统的整合

### 1. 前端展示

前端状态事件页签会：
1. 先从 `container_status_events` 表查询
2. 如果表为空，则从各业务表（港口操作、拖卡运输、仓库操作、还空箱）动态生成

### 2. 数据来源

状态事件现在有三个来源：
- **外部数据源** (Feituo等) - 存储在 `container_status_events` 表
- **Excel导入** - 存储在各业务表的时间节点字段
- **系统内部** - 从业务表动态生成的事件

### 3. 去重机制

基于以下字段组合进行去重：
- containerNumber
- statusCode
- occurredAt

相同组合的事件会被更新而不是重复创建。

## 扩展其他数据源

如需接入其他数据源（如AIS、其他船期API），步骤如下：

### 1. 创建适配器

```typescript
// backend/src/adapters/XXXAdapter.ts
import { IExternalDataAdapter } from './ExternalDataAdapter.interface'

export class XXXAdapter implements IExternalDataAdapter {
  readonly name = 'XXX Adapter'
  readonly sourceType = ExternalDataSource.XXX
  readonly enabled = true

  async getContainerStatusEvents(containerNumber: string) {
    // 实现数据获取逻辑
  }

  // ... 其他方法
}
```

### 2. 在控制器中注册

```typescript
// externalData.controller.ts
if (dataSource === 'XXX') {
  const result = await xxxAdapter.getContainerStatusEvents(containerNumber)
  // 处理结果
}
```

### 3. 更新配置

在 `.env` 中添加配置，并在 `config/index.ts` 中读取。

## 定时同步

创建定时任务服务，定期同步活跃货柜：

```typescript
// backend/src/jobs/externalSync.job.ts
import cron from 'node-cron'

export class ExternalSyncJob {
  constructor() {
    // 每小时同步一次
    cron.schedule('0 * * * *', async () => {
      await this.syncActiveContainers()
    })
  }

  async syncActiveContainers() {
    // 获取活跃货柜并批量同步
  }
}

export const externalSyncJob = new ExternalSyncJob()
```

## 监控与日志

关键日志：
```typescript
logger.info(`[ExternalData] 开始同步: ${containerNumber}`)
logger.info(`[ExternalData] 创建状态事件: ${containerNumber} - ${statusCode}`)
logger.error(`[ExternalData] 同步失败: ${error.message}`)
```

## 故障排查

### 问题: 同步失败

1. 检查API密钥是否正确
2. 检查网络连接
3. 查看后端日志获取详细错误信息
4. 测试外部API是否可访问

### 问题: 状态事件不显示

1. 检查数据是否保存到 `container_status_events` 表
2. 刷新前端页面
3. 查看浏览器控制台错误
4. 检查API响应格式

## 下一步建议

1. **配置飞驼API** - 获取API密钥并配置到环境变量
2. **测试同步功能** - 使用测试货柜验证同步是否正常
3. **设置定时任务** - 配置自动定时同步活跃货柜
4. **监控与告警** - 添加API调用监控和失败告警
5. **前端集成** - 在货柜详情页添加"同步外部数据"按钮
6. **扩展数据源** - 根据需要接入其他船期API或AIS数据

## 相关文档

- [完整接入指南](./EXTERNAL_DATA_INTEGRATION_GUIDE.md)
- [快速开始](./EXTERNAL_DATA_QUICKSTART.md)
- [FeiTuoAdapter实现](../backend/src/adapters/FeiTuoAdapter.ts)
- [状态事件页签修复](./STATUS_EVENTS_TAB_FIX.md)

## 技术栈

- **后端框架**: Express + TypeScript
- **数据库**: PostgreSQL (TimescaleDB)
- **ORM**: TypeORM
- **HTTP客户端**: Axios
- **定时任务**: node-cron
- **日志**: Winston
- **前端**: Vue 3 + Element Plus
