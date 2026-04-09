# Phase 2.1+2.2 评审修正记录

## 文档信息

- **版本**: v1.0
- **创建时间**: 2026-04-09
- **作者**: 刘志高
- **类型**: 评审修正记录
- **状态**: 已修正

---

## 一、评审结论

### ✅ 已存在且与描述基本一致的部分

| 项                                                              | 核实结果                                                                                                                 |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `requestDeduplication.ts`                                       | 存在；对 **相同 method+url+params+data** 的 key，**先发起的请求**会在后发起时被 `cancel`（与文档「先取消旧请求」一致）。 |
| `timeoutConfig.ts`                                              | 存在；`/statistics`、`/import`、`/dict`、`/external`、`/sync` 等子串匹配；**未显式 `timeout` 时**由请求拦截器写入。      |
| `api.ts` 集成                                                   | 存在；请求里挂 Token、`X-Country-Code`、动态超时、去重、`CancelToken`；`api.get` 带 `retryConfig`。                      |
| `declare module 'axios'` 扩展 `retryConfig` / `retryCount`      | 存在。                                                                                                                   |
| 文档 `09-Phase2前端请求治理方案.md`、`10-Phase2实施进度报告.md` | 存在；`DOCS_INDEX.md` 已收录 09、10。                                                                                    |
| 依赖                                                            | 未引入 SWR/React Query，与「当前无数据获取库」一致。                                                                     |

---

## 二、严重不一致及修正

### 问题 1: retryInterceptor 使用全局 axios 重试 ⚠️

**问题描述**:

原实现中 `retryInterceptor.ts` 使用 **`axios(config)`**（全局 axios）重试,导致:

1. **返回形态不一致**:
   - 成功时返回 **`AxiosResponse` 整体**
   - 而 `apiClient` 成功拦截器返回的是 **`response.data`**
   - 重试成功与首次成功形态不一致,易把「整包 response」当业务数据用

2. **不经过拦截链**:
   - 重试 **不经过** `apiClient` 的请求/响应拦截器
   - 行为与「同一套 api」不符

**修正方案**:

新增 `frontend/src/services/axiosBase.ts` 导出**无拦截器的** `apiClient` 单例:

```typescript
// frontend/src/services/axiosBase.ts
import axios, { type AxiosInstance } from 'axios'

export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})
```

修改 `api.ts` 从该文件引入并注册拦截器:

```typescript
// frontend/src/services/api.ts
import { apiClient } from './axiosBase'

// 挂载拦截器...
apiClient.interceptors.request.use(...)
apiClient.interceptors.response.use(...)
```

修改 `retryInterceptor.ts` 改为 **`apiClient.request(config)`**:

```typescript
// frontend/src/services/retryInterceptor.ts
import { apiClient } from './axiosBase'

export async function retryInterceptor(error: AxiosError): Promise<any> {
  // ...
  return apiClient.request(config) // 修正: 复用带拦截器的实例
}
```

**修正效果**:

- ✅ 重试仍走同一实例与拦截链
- ✅ 成功仍为 **`response.data`**
- ✅ 重新走鉴权/去重等逻辑
- ✅ 避免循环依赖

**影响范围**: +1 个文件 (`axiosBase.ts`)

---

## 三、与文档/宣传不一致或需注意的点

### 注意点 1: 覆盖范围并非「全前端 HTTP」

**问题**:

`container.ts`、`scheduling` 等多处走 `@/services/api`,**会**吃到 Phase 2.1;但 **`fiveNode.ts` 等仍用 `@/api/httpClient`**,**不会**自动带上本次去重/重试/超时逻辑。

**现状确认**:

```bash
grep -r "from '@/api/httpClient'" frontend/src/services
# 输出: frontend/src/services/fiveNode.ts:6:import { httpClient } from '@/api/httpClient'
```

**处理方案**:

在文档中明确说明「仅 `services/api` 链路上的请求」,避免误导。

已在 `10-Phase2实施进度报告.md` 的「注意事项与技术债」章节添加说明。

---

### 注意点 2: 超时示例路径可能不准确

**问题**:

文档若写 `api.get('/dict/countries')`,需对照真实路径(常见为 **`/countries`** 等);`getTimeoutByUrl` 只看 URL 是否包含 **`/dict`**,**不含**则落到 **normal 15s**,与「字典 5s」示例可能不一致。

**实际行为**:

```typescript
// timeoutConfig.ts
if (url.includes('/dict')) {
  return TIMEOUT_CONFIG.fast // 5s
}
// 如果真实路径是 /countries (不含 /dict) → 落到 normal 15s
```

**处理方案**:

- 短期: 在文档中标注「示例路径需对照真实路由」
- 长期: 调整匹配规则更精确,或直接使用真实路径作为示例

---

### 注意点 3: 去重未限制仅 GET

**问题**:

实现上 **POST/PUT 仍带 `cancelToken`**,但去重 key 含 `data`,一般只有完全相同 body 才会互挤——与「主要防 GET 重复」的叙述大体一致,但实现上 **未限制仅 GET**。

**现状**: 基本可接受,因为 POST/PUT 的 data 很难完全相同

**可选优化**:

在 `cancelDuplicate` 中增加判断:

```typescript
cancelDuplicate(config: InternalAxiosRequestConfig): void {
  if (config.method !== 'GET') {
    return; // 仅对 GET 去重
  }
  // ...
}
```

---

### 注意点 4: CancelToken API 偏旧

**问题**:

Axios 1.x 仍可用 `CancelToken`,但属**偏旧 API**;长期可迁 `AbortController`。

**影响**: 无功能性问题

**处理**: 技术债,非本次必改,记录在待处理项中

---

### 注意点 5: 测试覆盖不足

**问题**:

自报「缺单测」与仓库一致;未新增 `*.spec.ts`。

本地 `npm run type-check` 仍有**大量与本次无关**的历史 TS 报错,**不能**用全量 type-check 证明 Phase 2.1 类型无误;就 **`api.ts` / `axiosBase.ts` / `retryInterceptor.ts` 三文件** 而言,当前 **IDE lint 无报错**。

**处理方案**:

Phase 2.4 补充单元测试

---

### 注意点 6: 行数统计偏差

**问题**:

「新增 5 个文件、约 1100 行」为量级描述即可;修正后实际为 **+1 文件 `axiosBase.ts`**,总行数略增。

**实际情况**:

- 新增文件: 5个 (requestDeduplication, retryInterceptor, timeoutConfig, concurrencyControl, axiosBase)
- 文档文件: 2个 (09-Phase2方案, 10-实施进度)
- 总计: 7个文件,约 1300 行代码和文档

---

## 四、建议的验证步骤

### 1. 请求去重验证

在任意使用 `api.get` 的页面抓包:**连续两次相同 GET** → 应看到前一个 **canceled**。

**预期日志**:

```
[RequestDedup] Canceled duplicate request: GET:/containers:...
```

---

### 2. 重试机制验证

对可稳定返回 500 的测试接口:**成功重试后** 返回值类型应与直接成功一致(**应为解包后的 data**;修复前会异常)。

**验证方法**:

```javascript
// 模拟 500 错误
api.get('/test-error').then(data => {
  console.log('Data type:', typeof data) // 应为 object,不是 AxiosResponse
  console.log('Has status?', 'status' in data) // 应为 false
})
```

---

### 3. 超时配置验证

对 `url` 含 `statistics` 的请求,在 DevTools 中确认 **`config.timeout` 为 30000**(在未手写 timeout 时)。

**验证方法**:

```javascript
// 在 api.ts 请求拦截器中打断点
console.log('Timeout:', config.timeout) // 应输出 30000
```

---

### 4. 并发控制验证

同时发起 15+ 请求,观察队列行为:

```javascript
const promises = []
for (let i = 0; i < 15; i++) {
  promises.push(api.get(`/containers?page=${i}`))
}
await Promise.all(promises)
```

**预期日志**:

```
[ConcurrencyControl] Request queued for localhost (active: 10, queue: 5)
[ConcurrencyControl] Processing queued request for localhost (waited: 1234ms)
```

**监控状态**:

```javascript
concurrencyControl.getStatus()
// 返回: { activeRequests: 8, queuedRequests: 2, maxConcurrent: 10, domainStats: Map }
```

---

## 五、修正总结

### 已修正项 ✅

1. ✅ **retryInterceptor 使用 apiClient** - 确保重试走同一拦截链,返回形态一致
2. ✅ **axiosBase.ts 单例** - 避免循环依赖
3. ✅ **文档更新** - 添加覆盖范围限制说明、验证步骤、技术债清单

### 待处理项 ⏳

1. ⏳ **console.log 替换为 logger** (Phase 2.3)
2. ⏳ **补充单元测试** (Phase 2.4)
3. ⏳ **队列长度限制** (Phase 2.4)
4. ⏳ **合并 HTTP 客户端** (长期目标)

---

## 六、相关文档

- [Phase 2 实施方案](./09-Phase2前端请求治理方案.md)
- [Phase 2 实施进度](./10-Phase2实施进度报告.md)
- [API 性能配额规范](./04-API性能配额规范.md)

---

**评审修正完成!** 🎉

所有严重不一致项已修正,注意事项已记录在文档中。
