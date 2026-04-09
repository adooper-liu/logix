# LogiX API 性能配额规范

## 文档信息

- **版本**: v1.0
- **创建时间**: 2026-04-09
- **作者**: 刘志高
- **类型**: 开发规范
- **状态**: 强制执行

---

## 概述

本文档定义所有 API 接口的性能配额,包括 `maxPageSize`、`timeout`、并发限制和缓存 TTL,作为开发规范的强制要求。

---

## 一、分页接口性能配额

### 1.1 货柜管理

| 接口                                          | maxPageSize | timeout | 并发限制    | 缓存TTL | 说明                    |
| --------------------------------------------- | ----------- | ------- | ----------- | ------- | ----------------------- |
| `GET /api/v1/containers`                      | 100         | 30s     | 50 req/min  | 60s     | 列表查询,支持多条件筛选 |
| `GET /api/v1/containers/:id`                  | -           | 5s      | 100 req/min | 30s     | 单个详情,高频访问       |
| `POST /api/v1/containers/statistics`          | -           | 60s     | 10 req/min  | 300s    | 统计查询,重负载         |
| `POST /api/v1/containers/statistics-detailed` | -           | 60s     | 5 req/min   | 300s    | 详细统计,极重负载       |

**风险点**:

- 统计接口无 pageSize 限制,但计算量大
- 建议增加按日期范围的缓存键:`statistics:{startDate}:{endDate}:{country}`

---

### 1.2 客户管理

| 接口                        | maxPageSize | timeout | 并发限制   | 缓存TTL | 说明     |
| --------------------------- | ----------- | ------- | ---------- | ------- | -------- |
| `GET /api/v1/customers`     | 100         | 10s     | 30 req/min | 120s    | 客户列表 |
| `GET /api/v1/customers/:id` | -           | 3s      | 50 req/min | 60s     | 客户详情 |

---

### 1.3 外部数据

| 接口                                          | maxPageSize | timeout | 并发限制   | 缓存TTL | 说明                         |
| --------------------------------------------- | ----------- | ------- | ---------- | ------- | ---------------------------- |
| `GET /api/v1/external/containers`             | 100         | 15s     | 20 req/min | 60s     | 外部数据列表（飞驼验证页等） |
| `POST /api/v1/external/sync/:containerNumber` | -           | 30s     | 5 req/min  | -       | 单柜同步,调用外部API         |
| `POST /api/v1/external/sync/batch`            | 50          | 120s    | 2 req/min  | -       | 批量同步,最多50个            |

**约束**:

- 批量同步硬上限: 50 个货柜
- 并发控制: `MAX_CONCURRENT_REQUESTS=5`,间隔 200ms

---

### 1.4 字典管理

| 接口                                     | maxPageSize | timeout | 并发限制   | 缓存TTL | 说明              |
| ---------------------------------------- | ----------- | ------- | ---------- | ------- | ----------------- |
| `GET /api/v1/dict-manage/:type`          | 200         | 5s      | 30 req/min | 300s    | 字典列表,低频变更 |
| `GET /api/v1/dict-mapping`               | 200         | 5s      | 20 req/min | 300s    | 映射关系列表      |
| `GET /api/v1/trucking-port-mapping`      | 200         | 5s      | 20 req/min | 300s    | 车队-港口映射     |
| `GET /api/v1/warehouse-trucking-mapping` | 200         | 5s      | 20 req/min | 300s    | 仓库-车队映射     |

---

## 二、导入接口性能配额

### 2.1 Excel 导入

| 接口                              | 最大记录数 | timeout | 并发限制  | 内存限制 | 说明                |
| --------------------------------- | ---------- | ------- | --------- | -------- | ------------------- |
| `POST /api/v1/import/excel`       | 5000       | 300s    | 2 req/min | 500MB    | 单次导入            |
| `POST /api/v1/import/excel/batch` | 10000      | 600s    | 1 req/min | 500MB    | 批量导入,分批50-100 |

**强制约束**:

- 前端文件大小限制: 10MB (`UniversalImport.vue`)
- 后端 body 限制: 500MB (`app.ts`)
- **新增**: 记录数上限 5000/10000,超限拒绝

**建议改进**:

- 实现分片上传协议(每片 500 条)
- 异步处理 + 进度查询接口
- 导入队列化管理,避免并发导入

---

## 三、调度器任务性能配额

### 3.1 周期性任务

| 任务         | 批大小 | 执行间隔 | 超时时间 | 互斥锁  | 说明                               |
| ------------ | ------ | -------- | -------- | ------- | ---------------------------------- |
| 状态重算调度 | 200    | 60min    | 30min    | ✅ 需要 | 遍历所有货柜,重算 logistics_status |
| 滞港费写回   | 200    | 360min   | 60min    | ✅ 需要 | 计算并写回 demurrage 费用          |
| 告警扫描     | 500    | 30min    | 15min    | ✅ 需要 | 扫描预警条件,生成 alert            |
| 外部数据同步 | 50     | 120min   | 60min    | ✅ 需要 | 调用飞驼 API 同步状态              |

**关键改进**:

- ✅ **必须添加互斥锁**,防止重叠执行
- 实现方式: Redis SETNX 或数据库 advisory lock
- 示例:
  ```typescript
  const lockKey = `scheduler:status-recalc:${date}`
  const acquired = await redis.set(lockKey, '1', 'EX', 1800, 'NX')
  if (!acquired) {
    logger.info('任务已在执行中,跳过')
    return
  }
  ```

---

## 四、统计接口性能配额

### 4.1 实时统计(高风险)

| 接口                                              | timeout | 并发限制   | 缓存TTL | 缓存键                                   | 风险等级 |
| ------------------------------------------------- | ------- | ---------- | ------- | ---------------------------------------- | -------- |
| `POST /api/v1/containers/statistics`              | 60s     | 10 req/min | 300s    | `stats:{start}:{end}:{country}`          | 🔴 高    |
| `POST /api/v1/containers/statistics-detailed`     | 60s     | 5 req/min  | 300s    | `stats-detailed:{start}:{end}:{country}` | 🔴 高    |
| `GET /api/v1/containers/statistics-yearly-volume` | 30s     | 10 req/min | 3600s   | `yearly-volume:{year}`                   | 🟡 中    |

**优化建议**:

1. **短期**(1周内): 添加 Redis 缓存,TTL 5分钟
2. **中期**(1月内): 预计算统计表,定时更新
3. **长期**(3月内): 引入物化视图(Materialized View)

**缓存策略**:

```typescript
// 缓存键设计
const cacheKey = `statistics:${startDate}:${endDate}:${country || 'all'}`

// 缓存逻辑
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const result = await calculateStatistics(startDate, endDate, country)
await redis.setex(cacheKey, 300, JSON.stringify(result)) // 5分钟TTL
return result
```

---

## 五、前端请求治理规范

### 5.1 全局配置

| 配置项       | 值     | 说明                     |
| ------------ | ------ | ------------------------ |
| 默认 timeout | 30s    | Axios 全局超时           |
| 重试次数     | 2      | 仅对 GET 请求重试        |
| 重试延迟     | 1s, 2s | 指数退避                 |
| 并发阀门     | 10     | 同一域名最多10个并发请求 |
| 取消过时请求 | ✅     | 新请求发出时取消旧请求   |

### 5.2 页面级缓存

| 页面            | 缓存TTL | 自动刷新 | 说明                |
| --------------- | ------- | -------- | ------------------- |
| Dashboard       | 300s    | 5min     | 首页统计数据        |
| Shipments 列表  | 60s     | 手动     | 货柜列表,筛选后失效 |
| Container 详情  | 30s     | 手动     | 单个货柜详情        |
| Statistics 统计 | 300s    | 手动     | 统计页,日期变更失效 |

**实现建议**:

```typescript
// 使用 SWR 或 React Query 风格的数据获取
const { data, error } = useSWR(`/api/v1/containers?page=${page}&pageSize=${pageSize}`, fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 1分钟内去重
  keepPreviousData: true,
})
```

---

## 六、性能基线压测场景

### 6.1 核心场景

| 场景         | 并发用户 | 持续时间 | 目标 TPS | P95 延迟 | 说明                |
| ------------ | -------- | -------- | -------- | -------- | ------------------- |
| 货柜列表查询 | 50       | 5min     | 100      | <2s      | 典型列表页操作      |
| 统计页加载   | 10       | 5min     | 20       | <5s      | 重负载统计查询      |
| Excel 导入   | 2        | 10min    | 2        | <300s    | 5000条记录导入      |
| 外部同步     | 5        | 10min    | 5        | <30s     | 单柜同步            |
| 调度器并发   | 4        | 30min    | -        | <1800s   | 4个调度任务同时执行 |

### 6.2 压测工具推荐

- **k6**: 现代压测工具,支持 JavaScript 脚本
- **Artillery**: 轻量级,适合 API 压测
- **JMeter**: 传统工具,功能全面

**示例 k6 脚本**:

```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  const res = http.get('http://localhost:3001/api/v1/containers?page=1&pageSize=50')
  check(res, {
    'status is 200': r => r.status === 200,
    'response time < 2s': r => r.timings.duration < 2000,
  })
  sleep(1)
}
```

---

## 七、监控与告警

### 7.1 关键指标

| 指标               | 阈值 | 告警级别    | 说明                   |
| ------------------ | ---- | ----------- | ---------------------- |
| API P95 延迟       | >3s  | ⚠️ Warning  | 大部分接口应在1s内响应 |
| API P99 延迟       | >10s | 🔴 Critical | 极端情况不应超过10s    |
| 错误率             | >1%  | 🔴 Critical | 5xx 错误占比           |
| 数据库连接池使用率 | >80% | ⚠️ Warning  | 连接池耗尽风险         |
| Node.js 内存使用   | >1GB | ⚠️ Warning  | 内存泄漏风险           |
| 调度器重叠执行     | >0   | 🔴 Critical | 必须为0                |

### 7.2 日志记录

**必须记录的日志**:

```typescript
// 1. 超限请求
console.warn(
  `[PaginationValidator] pageSize 超限: path=${req.path}, requested=${pageSizeNum}, limited=${maxPageSize}`
)

// 2. 慢查询
if (duration > 5000) {
  logger.warn(`[SlowQuery] ${query} took ${duration}ms`)
}

// 3. 调度器重叠
if (!acquired) {
  logger.info(`[Scheduler] Task ${taskName} already running, skip`)
}

// 4. 导入超限
if (recordCount > MAX_RECORDS) {
  logger.error(`[Import] Record count exceeded: ${recordCount} > ${MAX_RECORDS}`)
}
```

---

## 八、实施计划

### Phase 1: 立即执行(1周内)

- [x] ✅ 添加 pageSize 上限中间件
- [ ] 给统计接口添加 Redis 缓存(TTL 5min)
- [ ] 调度器添加互斥锁
- [ ] 导入接口增加记录数上限检查

### Phase 2: 短期优化(1月内)

- [ ] 统一前端请求治理(重试/取消/并发阀门)
- [ ] 建立性能基线压测场景
- [ ] 添加关键指标监控(Prometheus + Grafana)
- [ ] 导入接口实现分片上传

### Phase 3: 中期改进(3月内)

- [ ] 统计接口预计算表
- [ ] 引入物化视图优化复杂查询
- [ ] 实现导入队列化管理
- [ ] 前端引入 SWR/React Query

---

## 九、违规处理

### 9.1 代码审查检查点

合并前必须检查:

- [ ] 新增列表接口是否设置了 maxPageSize?
- [ ] 统计接口是否添加了缓存?
- [ ] 调度任务是否有互斥锁?
- [ ] 导入接口是否有记录数上限?
- [ ] 是否有慢查询日志?

### 9.2 违规示例

❌ **错误**:

```typescript
// 无 pageSize 限制
const containers = await containerRepository.find({
  take: req.query.pageSize, // 可能是 10000!
})
```

✅ **正确**:

```typescript
// 有上限保护
const pageSize = Math.min(Number(req.query.pageSize) || 10, 100)
const containers = await containerRepository.find({
  take: pageSize,
})
```

---

## 十、相关文档

- [分页参数验证中间件](../../backend/src/middleware/pagination.validator.ts)
- [速率限制中间件](../../backend/src/middleware/rateLimit.middleware.ts)
- [调度器实现](../../backend/src/schedulers/)
- [统计服务](../../backend/src/services/statistics/)

---

**文档结束**
