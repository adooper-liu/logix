---
name: container-intelligent-processing
description: Implement and maintain LogiX Container Intelligent Processing System (alerts, time prediction, risk assessment). Use when working on ext_container_alerts, ext_container_risk_assessments, AlertService, TimeService, RiskService, or the enhancement implementation plan.
---

# LogiX 货柜智能处理系统实施技能

> 关联：状态机文档 `public/docs-temp/状态机.md`、增强实施方案（预警持久化、时间预测、风险评分）

## 一、核心实施要点

### 1.1 必须遵守

| 要点 | 说明 |
|------|------|
| `calculateLogisticsStatus` | 必须传入完整 6 参数：container, portOperations, seaFreight, truckingTransport, warehouseOperation, emptyReturn |
| 实体关系 | `@ManyToOne(() => Container)` + `@JoinColumn`，不写 `container.alerts` 反向 |
| 定时任务 | 用 `setInterval`，不引入 `node-schedule` |
| 导入路径 | `from '../database/index.js'` |
| raw SQL | 用 `AppDataSource.query()`，不用 `repository.query()` |
| 新实体 | 在 `database/index.ts` 的 entities 中注册 |
| 预警与状态机 | 修改 `AlertService`、最晚提柜 SQL、预警幂等时须遵循 **container-alerts-state-machine** 技能 |

### 1.2 前端 API 路径

```typescript
// api baseURL 为 '/api'，后端路由在 /api/v1 下，路径必须含 /v1
api.get(`/v1/alerts/container/${containerNumber}`)   // ✅
api.get(`/alerts/container/${containerNumber}`)       // ❌ 会 404
```

**完整服务示例**：

```typescript
// frontend/src/services/alert.ts
import { api } from './api';

export const alertApi = {
  // 获取货柜预警（路径含 /v1）
  getContainerAlerts: (containerNumber: string) =>
    api.get(`/v1/alerts/container/${containerNumber}`),
  
  // 获取全部预警（路径含 /v1）
  getAllAlerts: (params?: { level?: string; resolved?: boolean }) =>
    api.get('/v1/alerts', { params }),
  
  // 确认预警（路径含 /v1，userId 转 string）
  acknowledgeAlert: (id: number, userId: string) =>
    api.post(`/v1/alerts/${id}/acknowledge`, { userId }),
  
  // 解决预警（路径含 /v1，userId 转 string）
  resolveAlert: (id: number, userId: string) =>
    api.post(`/v1/alerts/${id}/resolve`, { userId })
};

// frontend/src/services/time.ts
import { api } from './api';

export const timeApi = {
  // 获取时间预测（路径含 /v1）
  getPrediction: (containerNumber: string) =>
    api.get(`/v1/time/predict/${containerNumber}`)
};

// frontend/src/services/risk.ts
import { api } from './api';

export const riskApi = {
  // 获取风险评估（路径含 /v1）
  getContainerRisk: (containerNumber: string) =>
    api.get(`/v1/risk/container/${containerNumber}`)
};
```

### 1.3 响应结构兼容

```typescript
// 后端返回 { success: true, data: ... }，api 拦截器返回 response.data
const response = await alertApi.getContainerAlerts(containerNumber);
alerts.value = response.data ?? response;  // 兼容两种结构
```

**组件中使用示例**：

```typescript
// frontend/src/components/common/AlertCenter.vue
const loadAlerts = async () => {
  try {
    const response = await alertApi.getContainerAlerts(props.containerNumber);
    // 兼容 response.data 和 response 两种结构
    alerts.value = response.data ?? response;
  } catch (error) {
    ElMessage.error('加载预警失败');
  }
};

const acknowledgeAlert = async (id: number) => {
  try {
    // userId 转 string，处理为空情况
    const userId = String(userStore.userInfo?.id ?? 'system');
    await alertApi.acknowledgeAlert(id, userId);
    ElMessage.success('预警已确认');
    loadAlerts();
  } catch (error) {
    ElMessage.error('确认失败');
  }
};
```

### 1.4 用户 ID

```typescript
// userStore.userInfo?.id 为 number，后端 userId 为 string
const userId = String(userStore.userInfo?.id ?? 'system');
```

---

## 二、实施顺序

按以下顺序实施，确保依赖正确：

### 2.1 第一阶段：数据库与实体（基础）

```bash
# 1. 执行建表 SQL
# 将 ext_container_alerts 和 ext_container_risk_assessments 的建表 SQL
# 加入 backend/03_create_tables.sql 或单独迁移脚本

# 2. 创建 TypeORM 实体
# backend/src/entities/ContainerAlert.ts
# backend/src/entities/ContainerRiskAssessment.ts

# 3. 注册实体
# 在 backend/src/database/index.ts 的 entities 数组中添加：
ContainerAlert,
ContainerRiskAssessment,
```

### 2.2 第二阶段：后端服务与路由（核心）

```bash
# 1. 实现三个核心服务
AlertService  - 预警检查、创建、确认、解决
TimeService    - 时间预测、历史偏差计算
RiskService    - 风险评估、因素计算

# 2. 实现路由
time.routes.ts  - /v1/time/predict/:containerNumber
risk.routes.ts  - /v1/risk/container/:containerNumber
alert.routes.ts - /v1/alerts/* (保持原有路径不变)

# 3. 注册路由
# 在 backend/src/routes/index.ts 中添加：
router.use('/time', timeRoutes);
router.use('/risk', riskRoutes);
router.use('/alerts', alertRoutes);  # 保持原有路径
```

### 2.3 第三阶段：定时任务与集成

```bash
# 1. 启动 alertScheduler
# 在 backend/src/server.ts 中，containerStatusScheduler 之后：
alertScheduler.start(60, 10);
log.info('✅ Alert scheduler started');

# 2. 启动服务验证
# 启动后端服务，检查日志确认 alertScheduler 正常启动
# 查看数据库确认预警数据正常生成
```

### 2.4 第四阶段：前端对接（最后）

```bash
# 1. 创建 API 服务
# frontend/src/services/alert.ts   (路径含 /v1，userId 转 string)
# frontend/src/services/time.ts    (路径含 /v1)
# frontend/src/services/risk.ts    (路径含 /v1)

# 2. 创建/增强组件
# AlertCenter.vue      - 预警中心
# EnhancedTimeline.vue - 增强时间线
# RiskCard.vue         - 风险卡片

# 3. 集成到页面
# 在货柜详情页添加预警 Tab
# 集成时间预测功能
# 添加风险卡片展示
```

### 2.5 第五阶段：测试验证

```bash
# 1. API 测试
# 测试 /v1/alerts/container/:containerNumber
# 测试 /v1/time/predict/:containerNumber
# 测试 /v1/risk/container/:containerNumber

# 2. 功能测试
# 验证预警自动生成
# 验证预警确认/解决功能
# 验证时间预测准确性
# 验证风险评估计算

# 3. 联调测试
# 前端调用后端 API 验证
# 检查响应数据格式
# 验证页面展示效果
```

---

## 三、数据库与实体

### 2.1 新增表

- `ext_container_alerts`：预警持久化，含 is_acknowledged、acknowledged_at、resolved_at
- `ext_container_risk_assessments`：风险评估，含 risk_score、risk_level、risk_factors(JSONB)

### 2.2 SQL 注意

```sql
-- 清关超时检查必须加 status_occurred_at IS NOT NULL
WHERE po.status_occurred_at IS NOT NULL
  AND po.status_occurred_at < NOW() - INTERVAL '48 hours'
```

### 2.3 实体注册

在 `backend/src/database/index.ts` 的 `entities` 数组中添加：

```typescript
ContainerAlert,
ContainerRiskAssessment,
```

---

## 三、服务实现要点

### 3.1 TimeService

```typescript
// SeaFreight 通过 relations 加载，不单独 query
const container = await this.containerRepository.findOne({
  where: { containerNumber },
  relations: ['seaFreight']
});
const seaFreight = container.seaFreight ?? undefined;

// ContainerStatusEvent.occurredAt 可能为 null
if (!prevEvent.occurredAt || !currEvent.occurredAt) continue;
```

### 3.2 AlertService

- 使用 `AppDataSource.query(query)` 执行 raw SQL
- `createAlert` 同类型未解决预警不重复创建（去重）
- 使用 `logger` 替代 `console.log`
- **清关超时 SQL 必须加** `status_occurred_at IS NOT NULL` 判断

```typescript
// ✅ 正确：带 NULL 检查
WHERE po.status_occurred_at IS NOT NULL
  AND po.status_occurred_at < NOW() - INTERVAL '48 hours'

// ❌ 错误：无 NULL 检查可能导致异常
WHERE po.status_occurred_at < NOW() - INTERVAL '48 hours'
```

- **userId 默认值**：后端 `acknowledgeAlert`/`resolveAlert` 需处理空值

```typescript
// backend/src/routes/alert.routes.ts
const userId = req.body?.userId ?? 'system';
```

### 3.3 RiskService

- `evaluateETADeviation(destPort)`、`evaluateDocumentationIssues(destPort)` 的 destPort 可为 undefined，方法内用 `portOperation?.xxx`
- `document_status` 取值需与业务一致（PENDING/REJECTED 等）

---

## 四、集成步骤

### 4.1 路由注册

在 `backend/src/routes/index.ts` 中：

```typescript
import timeRoutes from './time.routes.js';
import riskRoutes from './risk.routes.js';

router.use('/time', timeRoutes);
router.use('/risk', riskRoutes);
```

### 4.2 启动 alertScheduler

在 `backend/src/server.ts` 中，`containerStatusScheduler` 之后：

```typescript
import { alertScheduler } from './schedulers/alertScheduler.js';

alertScheduler.start(60, 10);
log.info('✅ Alert scheduler started');
```

### 4.3 预警路由

重写 `alert.routes.ts`，直接调用新的 `AlertService`，保持路径 `/alerts` 不变。

**完整实现示例**：

```typescript
// backend/src/routes/alert.routes.ts
import express from 'express';
import { AlertService } from '../services/alertService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const alertService = new AlertService();

// 获取货柜预警
router.get('/container/:containerNumber', async (req, res) => {
  try {
    const { containerNumber } = req.params;
    const alerts = await alertService.getContainerAlerts(containerNumber);
    res.json({ success: true, data: alerts });
  } catch (error) {
    logger.error('获取货柜预警失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取全部预警
router.get('/', async (req, res) => {
  try {
    const { level, resolved } = req.query;
    const resolvedParam = resolved === undefined ? undefined : resolved === 'true';
    const alerts = await alertService.getAllAlerts({ 
      level: level as string, 
      resolved: resolvedParam 
    });
    res.json({ success: true, data: alerts });
  } catch (error) {
    logger.error('获取全部预警失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 确认预警
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;
    // 处理 userId 为空的情况，设置默认值 'system'
    const userId = req.body?.userId ?? 'system';
    const alert = await alertService.acknowledgeAlert(parseInt(id), userId);
    res.json({ success: true, data: alert });
  } catch (error) {
    logger.error('确认预警失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 解决预警
router.post('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    // 处理 userId 为空的情况，设置默认值 'system'
    const userId = req.body?.userId ?? 'system';
    const alert = await alertService.resolveAlert(parseInt(id), userId);
    res.json({ success: true, data: alert });
  } catch (error) {
    logger.error('解决预警失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

**路由注册**：

```typescript
// backend/src/routes/index.ts
import alertRoutes from './alert.routes.js';

// 在现有路由之后添加
router.use('/alerts', alertRoutes);
```

---

## 五、检查清单

实施前确认：

- [ ] 建表 SQL 已执行
- [ ] 新实体已注册到 database
- [ ] time、risk 路由已注册
- [ ] alertScheduler 已在 server.ts 启动
- [ ] 前端 API 路径含 `/v1`
- [ ] userId 转为 string

---

## 六、常见错误

| 错误 | 正确做法 | 说明 |
|------|----------|------|
| `calculateLogisticsStatus(container, portOperations)` | 传入完整 6 参数 | 缺少 seaFreight 等参数 |
| `portOperationRepository.query(sql)` | `AppDataSource.query(sql)` | repository 无 query 方法 |
| `api.get('/alerts/container/xxx')` | `api.get('/v1/alerts/container/xxx')` | 缺少 /v1 前缀会 404 |
| `userStore.currentUser?.id` | `userStore.userInfo?.id` | currentUser 不存在 |
| `@ManyToOne(() => Container, c => c.alerts)` | `@ManyToOne(() => Container)` | 不写反向关系 |
| `scheduleJob` (node-schedule) | `setInterval` | 不引入额外依赖 |
| `WHERE po.status_occurred_at < ...` (无 NULL 检查) | `WHERE po.status_occurred_at IS NOT NULL AND ...` | 避免 NULL 值异常 |
| `req.body.userId` (无默认值) | `req.body?.userId ?? 'system'` | 空值时设置默认值 |
| `const seaFreight = await seaFreightRepository.findOne(...)` | `relations: ['seaFreight']` + `container.seaFreight` | 避免 N+1 查询 |
| `response.data` (直接赋值) | `response.data ?? response` | 兼容不同响应结构 |

---

## 七、实施注意事项

### 7.1 必须修正项（来自评审报告）

1. **前端 API 路径必须含 `/v1`**
   - 所有前端服务（alert/time/risk）的路径必须以 `/v1` 开头
   - 错误：`/alerts/container/xxx` → 正确：`/v1/alerts/container/xxx`

2. **userId 类型转换**
   - 前端：`userStore.userInfo?.id` 是 number
   - 后端：`userId` 是 string
   - 必须显式转换：`String(userStore.userInfo?.id ?? 'system')`

3. **后端 userId 默认值**
   - `acknowledgeAlert`/`resolveAlert` 需处理 userId 为空的情况
   - 使用：`const userId = req.body?.userId ?? 'system';`

4. **使用 logger 替代 console.log**
   - AlertService 中使用 `logger.info`/`logger.error` 替代 console
   - 导入：`import { logger } from '../utils/logger.js';`

### 7.2 建议优化项

1. **预警去重逻辑**
   - `createAlert` 时检查同类型未解决预警，避免重复创建
   - 查询条件：`{ containerNumber, alertType, isResolved: false }`

2. **SQL NULL 安全检查**
   - 所有使用 `status_occurred_at` 的查询必须加 `IS NOT NULL` 判断
   - 避免 NULL 值导致的比较异常

3. **SeaFreight 加载方式**
   - 使用 `relations: ['seaFreight']` 而不是单独查询
   - 避免 N+1 查询问题

### 7.3 测试验证重点

1. **API 路径测试**
   ```bash
   # 必须测试的路径
   GET    /v1/alerts/container/:containerNumber
   GET    /v1/alerts
   POST   /v1/alerts/:id/acknowledge
   POST   /v1/alerts/:id/resolve
   GET    /v1/time/predict/:containerNumber
   GET    /v1/risk/container/:containerNumber
   ```

2. **功能测试场景**
   - 清关超过 48 小时，预警自动生成
   - LFD 在 72 小时内，预警自动生成
   - 预警确认功能正常
   - 预警解决功能正常
   - 时间预测返回合理值
   - 风险评估计算正确

3. **数据一致性验证**
   - 预警生成后，数据库中有记录
   - 确认/解决后，is_acknowledged/is_resolved 正确更新
   - acknowledged_at/resolved_at 时间正确
   - userId 正确记录（或默认为 'system'）

---

## 八、参考文档

- **状态机文档**：`public/docs-temp/状态机.md`
- **增强实施方案**：包含预警持久化、时间预测、风险评分完整方案
- **评审报告**：本文档已吸收评审意见，所有必须修正项已包含

---

## 九、版本记录

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0 | 2026-03-18 | 初始版本，基于增强实施方案和评审意见 |
| 1.1 | 2026-03-18 | 补充完整代码示例、实施顺序、注意事项 |
