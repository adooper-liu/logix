# logistics-path-system 微服务功能评估与协同方案

> 评估 logistics-path-system 的现状、价值，以及与主项目 LogiX 的协同方式。

---

## 一、微服务功能概览

### 1.1 设计能力

| 能力 | 说明 |
|------|------|
| **33 种详细状态** | 未出运、提空箱、进港、装船、离港、航行、抵港、卸船、可提货、出港、送达、拆箱、还空箱、已完成；以及扣留、延误、滞期等异常 |
| **100+ 状态流转规则** | 时间顺序、流转合法性、重复检测、异常识别 |
| **GraphQL API** | getStatusPathByContainer、syncExternalData、validateStatusPath 等 |
| **路径生成** | 将状态节点转为 StatusPath（overallStatus、eta、节点列表） |
| **前端组件** | LogisticsPath.vue 时间轴、LogisticsPathView 完整页面 |

### 1.2 技术栈

- 前端：Vue 3 + GraphQL Apollo Client
- 后端：Node.js + Apollo Server + Express
- 端口：4000

---

## 二、现状评估

### 2.1 已实现

| 项目 | 状态 |
|------|------|
| GraphQL Schema 与 Resolvers | ✅ |
| 状态机验证（pathValidator） | ✅ |
| Mock 数据与模拟路径 | ✅ |
| 主服务代理路由 /api/v1/logistics-path/* | ✅ |
| LogisticsPathAdapter（AdapterManager 备用） | ✅ |
| logisticsPathService 客户端 | ✅ |

### 2.2 未完成 / 问题

| 项目 | 说明 |
|------|------|
| **无真实数据源** | 使用 `mockDatabase: Map`，syncExternalData 写入内存，重启即丢失 |
| **无数据库** | 未连接 PostgreSQL/TimescaleDB |
| **主服务未实际同步** | 飞驼同步后未调用 `logisticsPathService.syncExternalData` |
| **前端未使用** | 货柜详情页的 StatusEventsTimeline 来自主服务 `ext_container_status_events`，不经过微服务 |
| **独立前端未集成** | logistics-path-system 自带前端，未嵌入主项目 |

### 2.3 价值评估

| 维度 | 评估 |
|------|------|
| **状态机规则** | 有价值：100+ 规则可复用，与主服务 7 层简化状态互补 |
| **路径可视化** | 有价值：时间轴、异常高亮、延误分析 |
| **当前可用性** | 低：无真实数据，主项目不依赖 |
| **维护成本** | 中：独立部署、两套技术栈、需同步演进 |

---

## 三、与主项目的关系

### 3.1 当前数据流

```
飞驼 API → FeiTuoAdapter → ext_container_status_events (主库)
                              ↓
                    主服务 Container API
                              ↓
                    前端 StatusEventsTimeline
                     (货柜详情页状态事件)

logistics-path-system: 独立运行，使用 Mock，主项目不依赖
```

### 3.2 设计中的协同（文档描述）

```
主服务 ──syncExternalData──→ logistics-path-system (GraphQL)
  ↓
主服务 ←──getStatusPathByContainer── 微服务
  ↓
前端 ←── 物流路径可视化
```

**现状**：主服务未调用 sync，微服务无持久化，该链路未打通。

---

## 四、协同方案

### 4.1 方案 A：微服务接主库（推荐）

**思路**：微服务直接读主项目 PostgreSQL，从 `ext_container_status_events` 等表生成 StatusPath。

| 步骤 | 内容 |
|------|------|
| 1 | 微服务配置主库连接（只读或读写） |
| 2 | 实现 `getStatusPathByContainer`：查询 ext_container_status_events，按时间排序，经 pathValidator 校验 |
| 3 | 废弃 syncExternalData 或改为可选（主服务不再推送） |
| 4 | 主服务代理 `/logistics-path/container/:id` 到微服务 |

**优点**：数据一致、无需同步、主服务改动小  
**缺点**：微服务依赖主库，需网络/权限配置

---

### 4.2 方案 B：主服务同步到微服务

**思路**：飞驼/外部数据同步后，主服务调用微服务 `syncExternalData`，微服务持久化。

| 步骤 | 内容 |
|------|------|
| 1 | 微服务增加 PostgreSQL，建 status_paths、status_nodes 等表 |
| 2 | syncExternalData 写入数据库 |
| 3 | 主服务在 externalDataService 同步完成后调用 logisticsPathService.syncToMicroservice |
| 4 | getStatusPathByContainer 从微服务库查询 |

**优点**：微服务数据独立，可做缓存、预计算  
**缺点**：需维护同步逻辑、双写、一致性

---

### 4.3 方案 C：合并到主服务

**思路**：将 pathValidator、路径生成逻辑迁入主服务，废弃微服务。

| 步骤 | 内容 |
|------|------|
| 1 | 将 logistics-path-system 的 pathValidator、状态枚举迁入 backend/src/utils/ |
| 2 | 主服务新增 `GET /containers/:id/status-path`，直接查 ext_container_status_events 并生成路径 |
| 3 | 前端 StatusEventsTimeline 可增强为「路径视图」（计划 vs 实际、异常高亮） |
| 4 | 停用 logistics-path-system，删除相关路由与适配器 |

**优点**：架构简单、无跨服务调用、部署简单  
**缺点**：主服务职责增加，需迁移代码

---

### 4.4 方案 D：微服务独立可视化工具

**思路**：微服务作为独立「物流路径分析」工具，主服务仅提供数据 API。

| 步骤 | 内容 |
|------|------|
| 1 | 主服务提供 `GET /api/v1/containers/:id/status-events`（已有） |
| 2 | 微服务前端直接调主服务 API，或主服务代理 |
| 3 | 微服务后端可选：接主库（方案 A）或仅做校验/展示 |
| 4 | 主项目增加入口：「物流路径分析」跳转微服务前端 |

**优点**：职责清晰，微服务专注可视化与规则  
**缺点**：需维护两套前端，用户体验割裂

---

## 五、建议

### 5.1 短期（1–2 周）

1. **明确是否保留微服务**：若保留，优先 **方案 A（微服务接主库）**
2. **打通数据**：微服务实现从 `ext_container_status_events` 读取并生成 StatusPath
3. **主服务健康检查**：启动时若微服务不可用，降级为仅用主服务数据，不阻塞

### 5.2 中期（1–2 月）

1. **前端集成**：货柜详情页增加「物流路径」Tab，调用主服务代理的微服务 API
2. **状态机复用**：将 pathValidator 规则与主服务 `logisticsStatusMachine` 对齐，避免两套逻辑冲突

### 5.3 长期

- 若微服务价值有限：考虑 **方案 C（合并到主服务）**
- 若需独立分析能力：采用 **方案 D**，微服务作为独立工具

---

## 六、与项目行动指南的衔接

| 行动指南阶段 | 与 logistics-path 的关系 |
|--------------|--------------------------|
| P0 滞港费闭环 | 无直接关系 |
| P1 五节点可视化 | 可复用微服务「路径/时间轴」展示思路 |
| P2 智能排柜 | 无直接关系 |
| P3 甘特图资源 | 无直接关系 |

**结论**：logistics-path-system 当前为**未完全接入**的独立微服务。建议先按方案 A 打通数据，再评估是否长期保留或合并。

---

**关联文档**：[02-架构说明](../02-architecture/01-架构说明.md)、[05-统一状态机实现](../02-architecture/05-统一状态机实现.md)、[00-项目行动指南](./00-项目行动指南.md)
