# 飞驼ETA/ATA日期验证规范

## 核心原则

### 1. 优先接收并存储原始时间戳
系统应首先信任并保存从数据源（如船公司、码头EDI、AIS）接收到的时间值，这是最宝贵的事实。

### 2. 校验改为"软"警告而非硬阻断
校验应是"软"的，产生警告、标记可疑，供人工复核，而非在数据入口处武断拒绝，以免丢失真实数据。

### 3. 内部一致性校验（最重要！）
比较同一运输链上的多个事件时间：
- ATA必须晚于上一港的ATD（上一港离港后才能到港）
- ATA不能早于同地点的ETD（同港先离港才能到港）
- ATA/ETA不能早于出运日期

### 4. 与计划时间的合理性范围校验
- ATA比ETA异常提早超过7天 → 警告
- ATA比ETA延迟超过30天 → 警告
- ETA比ATA提早超过30天 → 警告
- ETA为过去时间但无ATA → 警告

## ETA/ATA独立关系

ETA和ATA是独立字段，可以早于、等于或晚于对方：
- 船舶提前到达：ATA早于ETA（正常）
- 准时到达：ATA等于ETA（正常）
- 延迟到达：ATA晚于ETA（正常）

## 必须移除的错误规则

### ❌ "ATA不能是未来日期"
错误原因：
- 数据录入延迟：船到港后几小时/几天才生成报告
- 跨时区问题：ATA是当地时间，服务器可能是UTC
- 批量补录：运营人员补录历史数据

### ❌ "ETA不能是未来太久"（如90天限制）
错误原因：
- 远洋航程可能超过90天
- 船舶可能因天气、拥堵等原因延误数月

## 验证维度

### A. 内部一致性校验
| 规则 | 逻辑 | 处理方式 |
|------|------|----------|
| ATA < 上一港ATD | 逻辑矛盾 | 软警告 |
| ATA < 本港ETD | 逻辑矛盾 | 软警告 |
| ATA < 出运日期 | 逻辑矛盾 | 软警告 |
| ETA < 出运日期 | 逻辑矛盾 | 软警告 |

### B. 合理性范围校验
| 规则 | 阈值 | 处理方式 |
|------|------|----------|
| ATA比ETA提早 | >7天 | 软警告 |
| ATA比ETA延迟 | >30天 | 软警告 |
| ETA比ATA提早 | >30天 | 软警告 |
| ETA为过去且无ATA | - | 软警告 |

### C. 极端值校验
| 规则 | 范围 | 处理方式 |
|------|------|----------|
| ATA/ETA年份 | <2000 或 >当前年份+1 | 硬错误阻断 |

## 硬错误（阻断）场景

只有以下情况才阻断数据更新：
1. 年份超出有效范围（<2000 或 >当前年份+1）
2. 未出运状态有ATA

## 软警告场景

以下情况产生警告但继续处理：
1. 内部时间逻辑矛盾（ATA < 上一港ATD等）
2. 与ETA/ATA差值超出合理范围
3. ETA为过去时间但无ATA

## 代码实现位置

- 后端：`backend/src/services/feituo/FeituoSmartDateUpdater.ts`
- 核心方法：
  - `validateATA()` - ATA验证
  - `validateETA()` - ETA验证
  - `smartUpdateATA()` - ATA智能更新
  - `smartUpdateETA()` - ETA智能更新
  - `findLatestPortOperation()` - 状态码优先级算法

---

## 状态码优先级算法

### 问题背景

当货柜有多条港口操作记录时，需要确定哪个记录是最新的，以用于：
1. 确定当前物流状态
2. 更新ETA/ATA字段
3. 计算滞港费

### 解决方案（分阶段比较算法）

采用**分阶段比较**而非加权得分，确保业务逻辑清晰：

```
阶段1: 按港口顺序倒序（port_sequence大的优先）
阶段2: 同港口内按状态码优先级倒序
阶段3: 同状态内按时间戳倒序
```

**为什么不用加权得分？**
- 权重比例难以平衡，容易出现"权重碾压"问题
- 分阶段更符合业务逻辑：先看运输进度，再看具体状态，最后看时间

### 状态码优先级表（按业务重要性分层）

| 层级 | 优先级 | 状态码 | 说明 |
|------|--------|--------|------|
| 最终状态 | 80-100 | RCVE(100), STCS(95), RTNT(90) | 还箱、提货完成 |
| 关键节点 | 60-80 | LOBD(80), DSCH(80), PASS(78), AVLE(75) | 装卸船、海关放行 |
| 火车专用 | 65-73 | IRDS(73), IRAR(72), IRDP(70), PLFD(68), IRLB(65) | 海铁联运 |
| 运输状态 | 40-60 | DLPT(60), BDAR(58), ARRI(55), DEPA(50) | 抵港、离港 |
| 场站操作 | 30-45 | GITM(45), DISC(42), LOAD(40), GTOT(38), GTIN(36) | 进场、装卸 |
| 驳船/中转 | 45-55 | F DDP(55), FDLB(50), FDBA(48), TSDP(52), TSBA(48) | 驳船、中转 |
| 查验 | 35-40 | CUIP(35), CPI(38), CPI_I(40) | 查验状态 |

### 核心方法

```typescript
// 获取状态码优先级
getStatusCodePriority(statusCode: string): number

// 从多条记录中找出最新（分阶段比较）
findLatestPortOperation<T>(portOps: T[], portType?: string): T | null

// 获取货柜的最新港口操作记录
getLatestPortOperation(containerNumber: string, portType?: string): Promise<PortOperation>
```

---

## 火车港口配置（海铁联运）

### 问题背景

当物流路径包含火车（海铁联运）时，需要特殊处理：
1. 区分海港目的港和火车目的地（交货地）
2. 火车状态码与海港状态码的优先级处理
3. 火车专用时间字段的存储

### 火车专用字段

在 `PortOperation` 实体中添加了以下火车专用字段：

| 字段名 | 数据库列名 | 说明 |
|--------|------------|------|
| trainArrivalDate | train_arrival_date | 火车到站日期 |
| trainDischargeDate | train_discharge_date | 火车卸箱日期 |
| trainDepartureTime | train_departure_time | 火车出发时间 |
| railLastFreeDate | rail_last_free_date | 铁路最后免费日（LFD） |
| lastFreeDateInvalid | last_free_date_invalid | LFD是否无效 |
| lastFreeDateRemark | last_free_date_remark | LFD备注 |

### 火车目的地识别

`FeituoPlaceAnalyzer` 区分两类目的地：
- **海港目的港** (`seaDestPlace`)：用于滞港费计算
- **火车目的地** (`railDestPlace`)：用于海铁联运跟踪

识别规则：
- `placeType` 包含"交货地" → 火车目的地
- `placeType` 包含"目的地"且不包含"交货地" → 海港目的港
- 兜底：最后一个目的地作为火车目的地

### 火车状态码优先级

| 状态码 | 优先级 | 说明 |
|--------|--------|------|
| IRLB | 29 | 铁运装箱 Rail Loaded |
| IRDP | 33 | 铁运离站 Rail Departed |
| IRAR | 36 | 铁运到站 Rail Arrived |
| IRDS | 39 | 铁运卸箱 Rail Discharged |
| PLFD | 65 | 铁路免柜期/最后免费日 |
| RTNT | 68 | 铁路还箱 Rail Return |

**注意**：火车状态码优先级高于对应海港状态码：
- IRAR (36) > ARRI (15) - 火车到站优先
- IRDS (39) > DISC (28) - 火车卸箱优先
- PLFD (65) > RCVE (70 之前) - LFD是还箱前置事件
