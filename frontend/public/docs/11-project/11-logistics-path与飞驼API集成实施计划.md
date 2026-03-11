# logistics-path-system 同步应用与飞驼 API 数据集成实施计划

> 梳理 logistics-path-system 与主应用 LogiX 的协同方式，以及飞驼 API 数据集成的完整实施步骤。

---

## 一、logistics-path-system 与主应用同步

### 1.1 当前架构关系

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LogiX 主应用 (backend 3001 + frontend 5173)                             │
│  - 货柜 CRUD、统计、甘特图、滞港费                                        │
│  - 飞驼同步 → ext_container_status_events + process_port_operations     │
│  - 状态机 → logistics_status (7 层简化)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP 调用 (config.logisticsPath.url)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  logistics-path-system 微服务 (port 4000)                                │
│  - GraphQL API (getStatusPathByContainer, syncExternalData 等)          │
│  - 33 种详细状态 + 100+ 流转规则 (pathValidator)                          │
│  - 当前：mockDatabase (内存)，重启即丢失，无持久化                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 开发环境同步启动

**方式一：手动启动（当前）**

```powershell
# 1. 启动主应用（start-logix-dev.ps1 已包含）
.\start-logix-dev.ps1   # 启动 DB + backend + frontend，不含 logistics-path

# 2. 单独启动 logistics-path-system
cd logistics-path-system/backend
npm install
npm run dev   # 默认 port 4000
```

**方式二：扩展启动脚本（推荐）**

在 `start-logix-dev.ps1` 中增加 logistics-path 启动步骤：

```powershell
# [6/6] 启动 logistics-path 微服务（可选）
Write-Host "[6/6] 启动 logistics-path 微服务..." -ForegroundColor Yellow
Push-Location logistics-path-system/backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
Pop-Location
Write-Host "  logistics-path 已在 port 4000 启动" -ForegroundColor Green
```

**环境变量（backend/.env 或 .env.dev）**

```bash
# 微服务地址（主应用调用时使用）
LOGISTICS_PATH_SERVICE_URL=http://localhost:4000
```

### 1.3 协同方案选择（参考 08-logistics-path-system评估与协同方案）

| 方案 | 说明 | 推荐阶段 |
|------|------|----------|
| **A. 微服务接主库** | 微服务直接读主项目 PostgreSQL，从 ext_container_status_events 生成 StatusPath | 短期（1–2 周） |
| **B. 主服务同步到微服务** | 飞驼同步后主服务调用 syncExternalData，微服务自建库持久化 | 中期 |
| **C. 合并到主服务** | 将 pathValidator、路径生成迁入主服务，废弃微服务 | 长期可选 |
| **D. 独立可视化工具** | 微服务作为独立分析工具，主服务仅提供数据 API | 长期可选 |

**建议**：短期采用 **方案 A**，打通数据；中期评估是否保留微服务。

---

## 二、飞驼 API 数据集成完整实施计划

### 2.1 阶段总览

| 阶段 | 目标 | 工期 | 依赖 |
|------|------|------|------|
| **P0** | 飞驼 API 账号与主链路打通 | 1 周 | 飞驼 CLIENTID/SECRET |
| **P1** | 数据持久化与核心字段映射完善 | 1 周 | P0 |
| **P2** | logistics-path 与主应用协同 | 1–2 周 | P1 |
| **P3** | 定时同步与 Webhook（可选） | 1 周 | P1 |

---

### 2.2 P0：飞驼 API 账号与主链路打通

#### 步骤 1：获取飞驼 API 账号

1. 联系飞驼获取 `CLIENTID` 和 `SECRET`
2. 参考文档：[飞驼 API 对接流程](https://doc.freightower.com/7120359m0)、[获取 Token](https://doc.freightower.com/317090390e0)

#### 步骤 2：配置环境变量

在项目根目录 `.env` 或 `backend/.env.dev` 中增加：

```bash
# 飞驼 API（使用官方文档中的接口地址）
FEITUO_API_ENDPOINT=https://openapi.freightower.com
FEITUO_CLIENT_ID=your_client_id
FEITUO_CLIENT_SECRET=your_secret
```

#### 步骤 3：实现 Token 获取

飞驼 API 需先调用「获取 Token」接口，再在请求 Header 中携带 `Authorization: Bearer <Token>`。

- 在 `FeiTuoAdapter` 中实现 `getToken()` 方法
- 缓存 Token 至过期前刷新，避免频繁请求

#### 步骤 4：对接集装箱综合跟踪接口

- 接口：`POST https://openapi.freightower.com/application/v1/query`
- 参数：`billNo`、`containerNo`、`carrierCode`、`portCode`、`isExport` 等
- 返回：`data.result.containers`、`data.result.places`、`data.result.routes` 等

#### 步骤 5：验证主链路

```bash
# 调用主应用同步接口（使用 external 或 adapters 路由）
curl -X POST "http://localhost:3001/api/v1/external/sync/BEAU5730626" \
  -H "Content-Type: application/json" \
  -d '{"dataSource": "Feituo"}'
```

**验收**：能成功拉取飞驼数据并返回事件列表（可暂不落库）。

---

### 2.3 P1：数据持久化与核心字段映射完善

#### 步骤 1：确认 ext_container_status_events 表结构

当前表结构（`03_create_tables.sql`）：

| 字段 | 类型 | 说明 |
|------|------|------|
| container_number | varchar(50) | 集装箱号 |
| status_code | varchar(20) | 飞驼状态码（BDAR、DSCH、STCS 等） |
| status_name | varchar(100) | 状态名称 |
| occurred_at | timestamp | 发生时间 |
| location | varchar(200) | 地点 |
| description | text | 描述 |
| data_source | varchar(50) | 数据来源（Feituo） |
| raw_data | jsonb | 原始 JSON |

若飞驼返回字段更丰富，可将扩展信息存入 `raw_data`。

#### 步骤 2：完善 FeiTuoStatusMapping 与核心字段写回

- 按 [09-飞驼节点状态码解读与接入整合方案](./09-飞驼节点状态码解读与接入整合方案.md) 完善映射
- 飞驼事件 → 更新 `process_port_operations`：`ata_dest_port`、`eta_dest_port`、`dest_port_unload_date`、`gate_in_time`、`gate_out_time` 等
- 飞驼事件 → 更新 `process_sea_freight`：`shipment_date`
- 飞驼事件 → 更新 `process_empty_return`：`return_time`
- 按 `port_type`（origin/transit/destination）写入对应港口操作记录

#### 步骤 3：同步后触发状态重算

- 飞驼数据写入后，调用 `ContainerStatusService.updateStatus(containerNumber)` 或批量接口
- 确保 `biz_containers.logistics_status` 与最新数据一致

#### 步骤 4：Excel 导入与飞驼并存

- Excel 导入写基础数据；飞驼同步做增量更新
- 冲突策略：飞驼数据可覆盖 Excel 导入的对应字段，或按时间戳取最新

**验收**：飞驼同步后，`ext_container_status_events` 有记录，`process_port_operations` 等核心字段更新，货柜详情页状态正确。

---

### 2.4 P2：logistics-path 与主应用协同

#### 步骤 1：微服务接主库（方案 A）

1. logistics-path-system 配置主项目 PostgreSQL 连接（只读或读写）
2. 实现 `getStatusPathByContainer`：从 `ext_container_status_events` 查询，按 `occurred_at` 排序
3. 将飞驼 `status_code` 映射到微服务 `StandardStatus`（复用 `shared/constants/statusMappings.ts`）
4. 经 `pathValidator` 校验后返回 StatusPath

#### 步骤 2：主服务代理与降级

- 主服务 `/api/v1/logistics-path/*` 已代理到微服务
- 微服务不可用时：返回 503 或降级为从主服务 `ext_container_status_events` 直接生成简化路径

#### 步骤 3：前端集成

- 货柜详情页增加「物流路径」Tab 或区块
- 调用 `GET /api/v1/logistics-path/container/:containerNumber`
- 展示时间轴、节点状态、异常高亮

#### 步骤 4：状态机对齐

- 将 pathValidator 规则与主服务 `logisticsStatusMachine` 对齐
- 避免两套逻辑冲突（如 33 种详细状态 ↔ 7 层简化状态）

**验收**：货柜详情页可展示物流路径时间轴，数据来自飞驼同步后的 `ext_container_status_events`。

---

### 2.5 P3：定时同步与 Webhook（可选）

#### 定时同步

- 对「已出运且未还箱」的货柜，按日或按小时批量调用飞驼同步
- 可复用 `demurrageWriteBack.scheduler` 的调度框架，新增 `feituoSync.scheduler`

#### Webhook 实时推送

- 配置飞驼 Webhook URL，接收状态变更推送
- 实现 `POST /api/v1/webhooks/feituo` 处理逻辑
- 验证签名、解析 payload、写入 `ext_container_status_events` 并触发状态重算

---

## 三、实施步骤清单（可勾选）

### P0 飞驼主链路

- [ ] 获取飞驼 CLIENTID、SECRET
- [ ] 配置 FEITUO_* 环境变量
- [ ] 实现 getToken() 与 Token 缓存
- [ ] 对接 POST /application/v1/query
- [ ] 验证能拉取到飞驼返回数据

### P1 持久化与映射

- [ ] 飞驼事件写入 ext_container_status_events
- [ ] FeiTuoStatusMapping 完善（含 port_type 区分）
- [ ] 核心字段写回 process_port_operations 等
- [ ] 同步后触发 ContainerStatusService 状态重算
- [ ] 货柜详情页状态事件时间线展示正确

### P2 logistics-path 协同

- [ ] 微服务配置主库连接
- [ ] getStatusPathByContainer 从 ext_container_status_events 读取
- [ ] 飞驼 status_code → StandardStatus 映射
- [ ] 主服务健康检查与降级
- [ ] 货柜详情页「物流路径」Tab 集成

### P3 增强（可选）

- [ ] 定时批量同步调度
- [ ] Webhook 接收与处理

---

## 四、开发环境快速启动

```powershell
# 1. 启动主应用
.\start-logix-dev.ps1

# 2. 启动 logistics-path 微服务（另开终端）
cd logistics-path-system/backend
npm run dev

# 3. 验证
# 主应用: http://localhost:3001
# 前端:   http://localhost:5173
# 微服务: http://localhost:4000
# 物流路径健康检查: GET http://localhost:3001/api/v1/logistics-path/health
```

---

## 五、相关文档

| 文档 | 说明 |
|------|------|
| [08-logistics-path-system评估与协同方案](./08-logistics-path-system评估与协同方案.md) | 微服务评估与方案 A/B/C/D |
| [09-飞驼节点状态码解读与接入整合方案](./09-飞驼节点状态码解读与接入整合方案.md) | 飞驼 API、状态码、映射 |
| [10-飞驼数据Excel导入打通指南](./10-飞驼数据Excel导入打通指南.md) | Excel 模拟飞驼数据 |
| [04-api/01-外部数据集成指南](../04-api/01-外部数据集成指南.md) | 外部数据架构与配置 |
