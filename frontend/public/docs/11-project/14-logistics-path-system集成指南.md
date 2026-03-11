# logistics-path-system 集成指南

> 如何集成 logistics-path-system 微服务能力，以及可集成的能力清单。

---

## 一、可集成能力清单

| 能力 | 说明 | 主服务 API | 集成难度 |
|------|------|------------|----------|
| **1. 物流路径可视化** | 按集装箱号/提单号/订舱号获取 StatusPath（节点列表、时间轴、overallStatus、ETA） | `GET /logistics-path/container/:id` | 低 |
| **2. 33 种详细状态** | 未出运、提空箱、进港、装船、离港、航行、抵港、卸船、可提货、出港、送达、拆箱、还空箱、已完成；扣留、延误、滞期等异常 | 路径节点中的 `status` | 低 |
| **3. 100+ 状态流转规则** | 时间顺序、流转合法性、重复检测、异常识别 | `POST /logistics-path/validate/:pathId` | 中 |
| **4. 延误天数计算** | `calculateDelayDays` 计算计划 vs 实际延误 | 路径中的 `isAlert`、节点 `nodeStatus` | 中 |
| **5. 飞驼状态码映射** | LOBD→LOADED、BDAR→ARRIVED、DSCH→DISCHARGED、STCS→IN_TRANSIT 等 | `statusMappings.ts` | 已实现 |
| **6. 路径列表与过滤** | 分页、按集装箱号/状态/日期过滤 | `GET /logistics-paths` | 低 |

---

## 二、当前限制（需先打通数据）

| 问题 | 说明 |
|------|------|
| **无真实数据** | 微服务使用 `mockDatabase`（内存），`getStatusPathByContainer` 返回 Mock 数据 |
| **syncExternalData 未接入** | 主服务飞驼同步/Excel 导入后未调用微服务 sync |
| **无持久化** | 微服务无 PostgreSQL，重启即丢失 |

---

## 三、集成方案（推荐：方案 A）

### 方案 A：微服务接主库（推荐，1–2 周）

**思路**：微服务直接读主项目 PostgreSQL，从 `ext_container_status_events` 生成 StatusPath。

```
主库 ext_container_status_events
         ↓
logistics-path-system 查询并转换
         ↓
StatusPath（nodes、overallStatus、eta）
         ↓
主服务代理 /logistics-path/container/:id
         ↓
前端货柜详情「物流路径」Tab
```

**实施步骤**：

| 步骤 | 内容 |
|------|------|
| 1 | 微服务配置主库连接（`logistics-path-system/backend/.env` 增加 `DATABASE_URL`） |
| 2 | 实现 `getStatusPathByContainer`：查询 `ext_container_status_events`，按 `occurred_at` 排序 |
| 3 | 使用 `statusMappings.ts` 将飞驼 `status_code` 映射为 `StandardStatus` |
| 4 | 调用 `processStatusPath`、`validateStatusPath` 生成路径并校验 |
| 5 | 主服务 `/logistics-path/*` 已代理，前端增加「物流路径」Tab 调用即可 |

**优点**：数据一致、无需同步、主服务改动小  
**缺点**：微服务依赖主库，需配置网络/权限

---

### 方案 B：主服务同步到微服务（中期）

**思路**：飞驼/Excel 导入后，主服务调用 `syncExternalData`，微服务自建库持久化。

| 步骤 | 内容 |
|------|------|
| 1 | 微服务增加 PostgreSQL，建 `status_paths`、`status_nodes` 表 |
| 2 | `syncExternalData` 将 `ext_container_status_events` 数据写入微服务库 |
| 3 | 主服务在 `feituoImport.service` 合并完成后、`externalData.controller` 同步完成后调用 `logisticsPathService.syncExternalData` |
| 4 | `getStatusPathByContainer` 从微服务库查询 |

**优点**：微服务数据独立，可做缓存、预计算  
**缺点**：需维护同步逻辑、双写、一致性

---

### 方案 C：合并到主服务（长期可选）

**思路**：将 `pathValidator`、`statusMappings`、路径生成逻辑迁入主服务，废弃微服务。

| 步骤 | 内容 |
|------|------|
| 1 | 将 `logistics-path-system/backend/src/utils/pathValidator.ts`、`shared/constants/statusMappings.ts` 迁入 `backend/src/utils/` |
| 2 | 主服务新增 `GET /containers/:id/status-path`，直接查 `ext_container_status_events` 并生成路径 |
| 3 | 前端 StatusEventsTimeline 增强为「路径视图」（计划 vs 实际、异常高亮） |
| 4 | 停用 logistics-path-system |

**优点**：架构简单、无跨服务调用  
**缺点**：主服务职责增加

---

## 四、快速启动（当前可用的 Mock 能力）

即使微服务仍用 Mock，也可先打通调用链路，验证前端集成。

### 4.1 启动微服务

```powershell
cd logistics-path-system/backend
npm install
npm run dev   # 默认 port 4000
```

### 4.2 配置主服务

在 `backend/.env` 或 `.env.dev` 中：

```bash
LOGISTICS_PATH_SERVICE_URL=http://localhost:4000
```

### 4.3 主服务代理（已实现）

主服务已代理以下路由到微服务：

| 主服务路由 | 微服务 | 说明 |
|------------|--------|------|
| `GET /api/v1/logistics-path/health` | `/health` | 健康检查 |
| `GET /api/v1/logistics-path/container/:containerNumber` | GraphQL `getStatusPathByContainer` | 按集装箱号获取路径 |
| `GET /api/v1/logistics-path/bl/:billOfLadingNumber` | GraphQL `getStatusPathByBL` | 按提单号获取路径 |
| `GET /api/v1/logistics-path/booking/:bookingNumber` | GraphQL `getStatusPathByBooking` | 按订舱号获取路径 |
| `GET /api/v1/logistics-paths` | GraphQL `getStatusPaths` | 路径列表（分页） |
| `POST /api/v1/logistics-path/validate/:pathId` | GraphQL `validateStatusPath` | 验证路径 |
| `POST /api/v1/logistics-path/sync` | GraphQL `syncExternalData` | 同步外部数据 |
| `POST /api/v1/logistics-path/batch-sync` | GraphQL `batchSyncExternalData` | 批量同步 |

### 4.4 前端集成示例

在货柜详情页增加「物流路径」Tab，调用主服务代理：

```typescript
// frontend/src/services/logisticsPath.ts
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL })

export async function getStatusPathByContainer(containerNumber: string) {
  const res = await api.get(`/logistics-path/container/${encodeURIComponent(containerNumber)}`)
  return res.data
}
```

```vue
<!-- 货柜详情页增加 Tab -->
<el-tab-pane label="物流路径" name="path">
  <LogisticsPathView v-if="containerNumber" :container-number="containerNumber" />
</el-tab-pane>
```

---

## 五、飞驼状态码与 StandardStatus 映射（已实现）

`logistics-path-system/shared/constants/statusMappings.ts` 已包含飞驼→标准状态映射：

| 飞驼码 | StandardStatus | 说明 |
|--------|----------------|------|
| LOBD | LOADED | 装船 |
| DLPT | DEPARTED | 离港 |
| BDAR | ARRIVED | 抵港 |
| DSCH | DISCHARGED | 卸船 |
| PCAB | AVAILABLE | 可提货 |
| STCS | IN_TRANSIT_TO_DEST | 起运卡车 |
| GTOT | GATE_OUT | 出港 |
| RCVE | DELIVERY_ARRIVED | 接收货物 |
| RTNE | RETURNED_EMPTY | 还空箱 |
| TSBA | TRANSIT_ARRIVED | 中转抵港 |
| TSDP | TRANSIT_DEPARTED | 中转离港 |
| … | … | 共 30+ 映射 |

---

## 六、建议实施顺序

| 阶段 | 内容 | 工期 |
|------|------|------|
| **1. 打通 Mock 调用** | 启动微服务，主服务代理可用，前端增加「物流路径」Tab 调用 | 1–2 天 |
| **2. 方案 A 实施** | 微服务接主库，`getStatusPathByContainer` 从 `ext_container_status_events` 读取真实数据 | 1 周 |
| **3. 路径校验与延误** | 使用 `validateStatusPath`、`calculateDelayDays` 做异常高亮 | 3–5 天 |
| **4. 可选：方案 B** | 主服务飞驼/Excel 导入后调用 sync，微服务持久化 | 1–2 周 |

---

## 七、相关文档

- [08-logistics-path-system评估与协同方案](./08-logistics-path-system评估与协同方案.md)
- [11-logistics-path与飞驼API集成实施计划](./11-logistics-path与飞驼API集成实施计划.md)
- [09-飞驼节点状态码解读与接入整合方案](./09-飞驼节点状态码解读与接入整合方案.md)
