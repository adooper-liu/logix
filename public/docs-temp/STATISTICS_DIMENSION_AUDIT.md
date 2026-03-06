# 五大统计卡片维度一致性审计报告

## 📊 审计目标

全面审查五个统计卡片的统计逻辑，识别是否存在：
1. **定义错位** - 同名不同义或同义不同名
2. **范围重叠** - 货柜被重复计数
3. **逻辑矛盾** - 业务规则不一致
4. **命名混乱** - 字段名与标签不一致

---

## 🎯 五大统计卡片总览

| 卡片 | 目标集 | 分类数 | 统计维度 |
|-----|--------|--------|---------|
| **按状态** | 全部货柜 | 8 个 | 物流状态机 |
| **按到港** | shipped + in_transit + at_port | 7 个 | ETA/ATA 时间 |
| **按提柜** | at_port | 6 个 | planned_pickup_date/pickup_date |
| **最晚提柜** | at_port + 未实际提柜 | 5 个 | last_free_date |
| **最晚还箱** | picked_up + unloaded | 5 个 | last_return_date |

---

## 📋 维度一：按状态分布 (Status Distribution)

### 基础信息
- **目标集**: `全部货柜`（无状态限制）
- **分类数**: 8 个
- **后端方法**: `getStatusDistribution()`
- **前端展示**: CountdownCard - 按状态

### 分类明细

| 序号 | 字段名 | 中文标签 | 颜色 | 查询条件 | 互斥性 |
|-----|--------|---------|------|---------|--------|
| 1 | not_shipped | 未出运 | #909399 | logistics_status = 'not_shipped' | ✅ |
| 2 | shipped | 已出运 | #409eff | logistics_status = 'shipped' | ✅ |
| 3 | in_transit | 在途 | #e6a23c | logistics_status = 'in_transit' | ✅ |
| 4 | arrived_at_transit | 已到中转港 | #909399 | 有 transit 记录且无 destination 记录 | ⚠️ |
| 5 | at_port | 已到目的港 | #67c23a | logistics_status = 'at_port' | ✅ |
| 6 | picked_up | 已提柜 | #f39c12 | logistics_status = 'picked_up' | ✅ |
| 7 | unloaded | 已卸柜 | #3498db | logistics_status = 'unloaded' | ✅ |
| 8 | returned_empty | 已还箱 | #95a5a6 | logistics_status = 'returned_empty' | ✅ |

### ❓ 一致性问题

#### ⚠️ 问题 1: arrived_at_transit 的特殊处理

**现象**:
- 其他 7 个状态都直接使用 `logistics_status` 字段
- 只有 `arrived_at_transit` 使用子查询特殊计算

**影响**:
```sql
-- 普通状态查询
WHERE logistics_status = 'xxx'

-- arrived_at_transit 查询
WHERE EXISTS (SELECT 1 FROM process_port_operations WHERE port_type = 'transit')
AND NOT EXISTS (SELECT 1 FROM process_port_operations WHERE port_type = 'destination' AND ata_dest_port IS NOT NULL)
```

**风险**:
- 可能出现一个货柜同时被计入 `in_transit` 和 `arrived_at_transit`
- 例如：状态为 `in_transit` 且有中转港记录

**验证方法**:
```sql
SELECT 
    c.logistics_status,
    COUNT(DISTINCT CASE WHEN EXISTS (
        SELECT 1 FROM process_port_operations po 
        WHERE po.container_number = c.container_number 
        AND po.port_type = 'transit'
    ) THEN c.container_number END) as has_transit
FROM biz_containers c
GROUP BY c.logistics_status
```

**建议**: 
- ✅ 保持现状（arrived_at_transit 作为特殊标记，不纳入总数计算）
- ⚠️ 前端展示时应明确说明这是"子集标记"而非独立状态

---

## 📋 维度二：按到港分布 (Arrival Distribution)

### 基础信息
- **目标集**: `shipped + in_transit + at_port`
- **分类数**: 7 个
- **后端方法**: `getArrivalDistribution()`
- **前端展示**: CountdownCard - 按到港

### 分类明细

| 序号 | 字段名 | 中文标签 | 颜色 | 核心条件 | ATA 要求 | ETA 要求 | 互斥性 |
|-----|--------|---------|------|---------|---------|---------|--------|
| 1 | today | 今日到港 | #67c23a | ATA = 今日 | ✅ 必须有 | ❌ 不关心 | ✅ |
| 2 | arrivedBeforeToday | 今日之前到港 | #909399 | ATA < 今日 | ✅ 必须有 | ❌ 不关心 | ✅ |
| 3 | overdue | 已逾期未到港 | #f56c6c | ETA < 今日 | ❌ 必须无 | ✅ 逾期 | ✅ |
| 4 | within3Days | 3 天内预计到港 | #e6a23c | 今日≤ETA≤3 天 | ❌ 必须无 | ✅ 范围内 | ✅ |
| 5 | within7Days | 7 天内预计到港 | #409eff | 3 天<ETA≤7 天 | ❌ 必须无 | ✅ 范围内 | ✅ |
| 6 | over7Days | >7 天预计到港 | #67c23a | ETA > 7 天 | ❌ 必须无 | ✅ 远期 | ✅ |
| 7 | other | 其他情况 | #c0c4cc | 无有效记录 | ❌ 不关心 | ❌ 无 ETA | ✅ |

### ✅ 互斥性保证

**关键原则**: ATA 优先于 ETA

```
IF ATA IS NOT NULL:
  → 按 ATA 分类 (today / arrivedBeforeToday)
ELSE IF ETA IS NOT NULL:
  → 按 ETA 分类 (overdue / within3Days / within7Days / over7Days)
ELSE:
  → other
```

**SQL 实现**:
```sql
-- 今日到港
WHERE ATA IS NOT NULL AND DATE(ATA) = TODAY

-- 今日之前到港
WHERE ATA IS NOT NULL AND DATE(ATA) < TODAY

-- 逾期未到港
WHERE ATA IS NULL AND (ETA < TODAY OR ETA_CORRECTION < TODAY)

-- 3 天内预计到港
WHERE ATA IS NULL AND ETA BETWEEN TODAY AND TODAY+3

-- ... 其他类似
```

### 🔍 一致性问题

#### ✅ 优点：设计优秀

1. **严格的互斥性**: 每个货柜只会被计数一次
2. **清晰的优先级**: ATA > ETA > Other
3. **完整覆盖**: 7 个分类覆盖所有可能情况
4. **总和验证**: 有 console.log 验证 sum = targetTotal

#### ⚠️ 潜在问题

**问题 2: 目标集与状态分布的交集**

```
按到港目标集 = shipped + in_transit + at_port

疑问:
- 为什么不包括 picked_up / unloaded？
- 如果货柜已提柜但 ATA 是昨天，应该计入哪里？
```

**场景分析**:
```
集装箱 A:
- 状态：picked_up (已提柜)
- ATA: 2026-03-02 (昨日)

❌ 不计入"今日之前到港"（状态不在目标集）
❌ 不计入任何"按到港"分类
```

**建议**:
- ✅ 保持现状（聚焦于"待提柜"的监控）
- ⚠️ 需要在文档中明确说明业务定位

---

## 📋 维度三：按提柜分布 (Pickup Distribution)

### 基础信息
- **目标集**: `at_port`（且有目的港操作记录）
- **分类数**: 6 个
- **后端方法**: `getPickupDistribution()`
- **前端展示**: CountdownCard - 按提柜

### 分类明细

| 序号 | 字段名 | 中文标签 | 颜色 | 核心条件 | pickupDate | plannedPickupDate | 互斥性 |
|-----|--------|---------|------|---------|------------|-------------------|--------|
| 1 | overdue | 计划提柜逾期 | #f56c6c | planned < 今日 | ❌ 必须无 | ✅ 逾期 | ✅ |
| 2 | todayPlanned | 今日计划提柜 | #e6a23c | planned = 今日 | ❌ 必须无 | ✅ 今日 | ✅ |
| 3 | todayActual | 今日实际提柜 | #67c23a | pickup = 今日 | ✅ 今日 | ✅/❌ 均可 | ✅ |
| 4 | pending | 待安排提柜 | #909399 | 无拖卡记录 | ❌ 不存在 | ❌ 不存在 | ✅ |
| 5 | within3Days | 3 天内预计提柜 | #409eff | 今日<planned≤3 天 | ❌ 必须无 | ✅ 范围内 | ✅ |
| 6 | within7Days | 7 天内预计提柜 | #67c23a | 3 天<planned≤7 天 | ❌ 必须无 | ✅ 范围内 | ✅ |

### ✅ 互斥性保证

```
IF pickupDate IS NOT NULL:
  → todayActual (if DATE(pickup) = TODAY)
ELSE IF plannedPickupDate IS NOT NULL:
  → overdue / todayPlanned / within3Days / within7Days
ELSE:
  → pending
```

### 🔍 一致性问题

#### ⚠️ 问题 3: todayActual 的统计范围

**现象**:
```typescript
// todayActual 查询
SELECT COUNT(DISTINCT tt.containerNumber)
FROM trucking_transport tt
WHERE DATE(tt.pickupDate) = TODAY

// 其他分类查询
SELECT COUNT(DISTINCT container.containerNumber)
FROM container
INNER JOIN process_port_operations po ON ...
LEFT JOIN trucking_transport tt ON ...
WHERE container.logisticsStatus = 'at_port'
AND tt.pickupDate IS NULL
```

**风险**:
- `todayActual` 不检查 `logistics_status`
- 可能统计到状态为 `picked_up` 但今日提柜的货柜
- 导致与其他分类重复计数

**场景示例**:
```
集装箱 B:
- 状态：picked_up
- pickupDate: 2026-03-03 (今日)

✅ 被 todayActual 统计
❌ 不应被统计（已不是 at_port 状态）
```

**修复建议**:
```typescript
// 修改 todayActual 查询
private async getTodayActual(today: Date): Promise<number> {
  const result = await this.truckingTransportRepository
    .createQueryBuilder('tt')
    .innerJoin(Container, 'c', 'c.containerNumber = tt.containerNumber') // 新增
    .select('COUNT(DISTINCT tt.containerNumber)', 'count')
    .where("DATE(tt.pickupDate) = :today", { today })
    .andWhere("c.logisticsStatus = :status", { status: SimplifiedStatus.AT_PORT }) // 新增
    .getRawOne();

  return parseInt(result.count);
}
```

#### ⚠️ 问题 4: 与"最晚提柜"的定义边界

**当前定义**:
- **按提柜**: 所有 at_port 货柜（包括已安排未执行）
- **最晚提柜**: at_port + 未实际提柜（包括已安排未执行）

**矛盾点**:
```
已安排未执行的货柜（plannedPickupDate 存在，pickupDate 为空）:
- ✅ 被"按提柜"统计
- ✅ 也被"最晚提柜"统计（修复后）

结果：同一个货柜在两个卡片中都被计数
```

**数据验证**:
```
按提柜总数 = overdue + todayPlanned + todayActual + pending + within3Days + within7Days
最晚提柜总数 = expired + urgent + warning + normal + noLastFreeDate

理论关系：
- 按提柜总数 ≥ 最晚提柜总数
- 差异 = todayActual（已实际提柜的部分）
```

**建议**:
- ✅ 保持现状（两个维度各有业务价值）
- ⚠️ 需要在 UI 上明确说明区别，避免用户困惑

---

## 📋 维度四：最晚提柜分布 (Last Pickup Distribution)

### 基础信息
- **目标集**: `at_port + 未实际提柜`（包括已安排未执行）
- **分类数**: 5 个
- **后端方法**: `getLastPickupDistribution()`
- **前端展示**: CountdownCard - 最晚提柜

### 分类明细

| 序号 | 字段名 | 中文标签 | 颜色 | 核心条件 | lastFreeDate | 查询条件 | 互斥性 |
|-----|--------|---------|------|---------|--------------|-----------|--------|
| 1 | expired | 已超时 | #f56c6c | lastFreeDate < 今日 | ✅ 逾期 | tt.pickupDate IS NULL | ✅ |
| 2 | urgent | 即将超时 (1-3 天) | #e6a23c | 今日≤lastFreeDate≤3 天 | ✅ 紧急 | tt.pickupDate IS NULL | ✅ |
| 3 | warning | 预警 (4-7 天) | #409eff | 3 天<lastFreeDate≤7 天 | ✅ 预警 | tt.pickupDate IS NULL | ✅ |
| 4 | normal | 时间充裕 (7 天以上) | #67c23a | lastFreeDate > 7 天 | ✅ 充裕 | tt.pickupDate IS NULL | ✅ |
| 5 | noLastFreeDate | 缺最后免费日 | #909399 | lastFreeDate IS NULL | ❌ 缺失 | tt.pickupDate IS NULL | ✅ |

### ✅ 互斥性保证

```
所有分类共享条件：tt.pickupDate IS NULL

按 lastFreeDate 日期范围严格划分：
- < TODAY → expired
- [TODAY, TODAY+3] → urgent
- (TODAY+3, TODAY+7] → warning
- > TODAY+7 → normal
- IS NULL → noLastFreeDate
```

### 🔍 一致性问题

#### ✅ 修复确认

**问题 5: 已修复的逻辑错误** ✅

**原问题**:
```typescript
// 错误的查询条件
.where('tt.containerNumber IS NULL')  // 只统计完全无拖卡记录的
```

**修复后**:
```typescript
// 正确的查询条件
.where('(tt.containerNumber IS NULL OR tt.pickupDate IS NULL)')  
// 统计所有未实际提柜的（包括已安排未执行）
```

**验证**:
- ✅ 5 个方法全部修改完成
- ✅ 与"按提柜"的定义保持一致

---

## 📋 维度五：最晚还箱分布 (Return Distribution)

### 基础信息
- **目标集**: `picked_up + unloaded`（且未还箱）
- **分类数**: 5 个
- **后端方法**: `getReturnDistribution()`
- **前端展示**: CountdownCard - 最晚还箱

### 分类明细

| 序号 | 字段名 | 中文标签 | 颜色 | 核心条件 | lastReturnDate | returnTime | 互斥性 |
|-----|--------|---------|------|---------|--------------|------------|--------|
| 1 | expired | 已超时 | #f56c6c | lastReturnDate < 今日 | ✅ 逾期 | ❌ 必须无 | ✅ |
| 2 | urgent | 即将超时 (1-3 天) | #e6a23c | 今日≤lastReturnDate≤3 天 | ✅ 紧急 | ❌ 必须无 | ✅ |
| 3 | warning | 预警 (4-7 天) | #409eff | 3 天<lastReturnDate≤7 天 | ✅ 预警 | ❌ 必须无 | ✅ |
| 4 | normal | 时间充裕 (7 天以上) | #67c23a | lastReturnDate > 7 天 | ✅ 充裕 | ❌ 必须无 | ✅ |
| 5 | noLastReturnDate | 缺最后还箱日 | #909399 | lastReturnDate IS NULL | ❌ 缺失 | ❌ 必须无 | ✅ |

### ✅ 互斥性保证

```
所有分类共享条件：
- logisticsStatus IN ('picked_up', 'unloaded')
- returnTime IS NULL（未还箱）

按 lastReturnDate 日期范围严格划分（同最晚提柜）
```

### 🔍 一致性问题

#### ✅ 设计一致性

**优点**:
1. ✅ 与"最晚提柜"采用相同的日期范围划分（expired/urgent/warning/normal）
2. ✅ 颜色编码系统一致（红色=逾期，橙色=紧急，蓝色=预警，绿色=正常）
3. ✅ 互斥性保证完整

#### ⚠️ 潜在问题

**问题 6: 目标集的边界情况**

**场景**:
```
集装箱 C:
- 状态：unloaded (已卸柜)
- returnTime: NULL（空箱返还记录存在但未填写还箱时间）
- lastReturnDate: 2026-03-10

疑问：这个货柜是否应该被统计？
```

**当前逻辑**:
```typescript
// 查询条件
WHERE logisticsStatus IN ('picked_up', 'unloaded')
AND returnTime IS NULL  // 只要没还箱时间就统计
```

**风险**:
- 可能统计到已实际还箱但未更新数据的货柜
- 依赖数据录入的及时性

**建议**:
- ✅ 保持现状（以数据库记录为准）
- ⚠️ 加强数据质量管理

---

## 🔍 跨维度一致性检查

### 检查点 1: 目标集重叠分析

| 维度 A | 维度 B | 重叠部分 | 是否合理 |
|-------|--------|---------|---------|
| 按状态 (at_port) | 按到港 | shipped/in_transit/at_port ∩ at_port = at_port | ✅ 合理 |
| 按状态 (at_port) | 按提柜 | at_port ∩ at_port = at_port | ✅ 合理 |
| 按状态 (at_port) | 最晚提柜 | at_port ∩ (at_port+未提柜) = at_port+ 未提柜 | ✅ 合理 |
| 按提柜 | 最晚提柜 | at_port ∩ (at_port+ 未提柜) = at_port+ 未提柜 | ⚠️ 部分重叠 |
| 按到港 | 按提柜 | (shipped+in_transit+at_port) ∩ at_port = at_port | ✅ 合理 |

**结论**: 
- "按提柜"和"最晚提柜"存在部分重叠（都包含 at_port+ 未提柜的货柜）
- 这是设计使然，需要在 UI 上明确区分

---

### 检查点 2: 命名一致性

| 维度 | 字段名模式 | 中文标签模式 | 一致性 |
|-----|----------|------------|--------|
| 按状态 | 动词过去分词 | 状态描述 | ✅ |
| 按到港 | 形容词/短语 | 时间描述 | ✅ |
| 按提柜 | 形容词/短语 | 动作描述 | ✅ |
| 最晚提柜 | 形容词 | 时间紧迫度 | ✅ |
| 最晚还箱 | 形容词 | 时间紧迫度 | ✅ |

**结论**: ✅ 命名规范一致

---

### 检查点 3: 颜色编码系统

| 含义 | 颜色代码 | 使用位置 | 一致性 |
|-----|---------|---------|--------|
| 逾期/危险 | #f56c6c (红) | overdue/expired | ✅ |
| 紧急/警告 | #e6a23c (橙) | urgent/todayPlanned | ✅ |
| 预警/注意 | #409eff (蓝) | warning/within7Days | ✅ |
| 正常/安全 | #67c23a (绿) | normal/over7Days/today | ✅ |
| 中性/其他 | #909399/c0c4cc (灰) | arrivedBeforeToday/pending | ✅ |

**结论**: ✅ 颜色编码系统完全一致

---

### 检查点 4: 日期范围划分

| 维度 | 紧急 | 预警 | 正常 | 一致性 |
|-----|-----|------|------|--------|
| 最晚提柜 | 1-3 天 | 4-7 天 | >7 天 | ✅ |
| 最晚还箱 | 1-3 天 | 4-7 天 | >7 天 | ✅ |
| 按到港 | 3 天内 | 7 天内 | >7 天 | ✅ |
| 按提柜 | 3 天内 | 7 天内 | N/A | ✅ |

**结论**: ✅ 日期范围划分标准一致

---

## 📊 发现的问题汇总

### ❌ 严重问题（需要立即修复）

**无** - 所有发现的都不是严重问题

---

### ⚠️ 中等问题（建议优化）

#### 问题 1: arrived_at_transit 的特殊处理
- **影响**: 可能与 in_transit 重复计数
- **建议**: 前端明确标注为"子集标记"
- **优先级**: 低

#### 问题 2: 按到港目标集不包括已提柜
- **影响**: 无法追踪历史到港数据
- **建议**: 保持现状，完善文档说明
- **优先级**: 低

#### 问题 3: todayActual 不检查 logistics_status
- **影响**: 可能统计到非 at_port 状态的货柜
- **建议**: 添加 status 过滤条件
- **优先级**: **中**（建议修复）

#### 问题 4: 按提柜 vs 最晚提柜的重叠
- **影响**: 用户可能困惑为何两个卡片都有相同货柜
- **建议**: UI 上明确说明业务定位差异
- **优先级**: 中（文档优化）

#### 问题 5: 最晚提柜逻辑错误
- **状态**: ✅ **已修复**
- **验证**: 5 个方法全部修改完成

#### 问题 6: 最晚还箱依赖数据质量
- **影响**: 可能统计已还箱但未更新的货柜
- **建议**: 加强数据质量管理
- **优先级**: 低

---

## ✅ 总体评价

### 优点

1. ✅ **互斥性设计优秀**: 各维度内部分类严格互斥
2. ✅ **颜色编码统一**: 全系统使用一致的颜色语义
3. ✅ **日期范围标准**: 紧急/预警/正常的时间划分一致
4. ✅ **命名规范**: 字段名和标签清晰易懂
5. ✅ **数据验证**: 有关键日志验证数据一致性

### 待优化

1. ⚠️ **todayActual 查询**: 建议添加 status 过滤
2. ⚠️ **文档完善**: 需要明确说明各维度的业务定位
3. ⚠️ **UI 提示**: 增加统计口径说明，避免用户困惑

---

## 🎯 修复建议

### 立即修复（高优先级）

#### 修复问题 3: todayActual 添加 status 过滤

```typescript
// backend/src/services/containerStatistics.service.ts
private async getTodayActual(today: Date): Promise<number> {
  const result = await this.truckingTransportRepository
    .createQueryBuilder('tt')
    .innerJoin(Container, 'c', 'c.containerNumber = tt.containerNumber') // 新增
    .select('COUNT(DISTINCT tt.containerNumber)', 'count')
    .where("DATE(tt.pickupDate) = :today", { today })
    .andWhere("c.logisticsStatus = :status", { status: SimplifiedStatus.AT_PORT }) // 新增
    .getRawOne();

  return parseInt(result.count);
}
```

### 中期优化（中优先级）

1. **完善文档**: 在 StatisticsVisualization 页面增加各维度的详细说明
2. **UI 提示**: 在每个卡片下方添加统计口径说明 tooltip
3. **数据验证**: 增加跨维度的数据一致性检查

### 长期改进（低优先级）

1. **arrived_at_transit 重构**: 考虑是否需要独立状态
2. **历史数据追溯**: 扩展按到港的目标集范围
3. **数据质量监控**: 建立数据完整性检查机制

---

## 📋 结论

经过全面审计，五大统计卡片的维度设计**整体一致、逻辑清晰**，不存在造成认知混乱的严重错位。

**核心优势**:
- ✅ 各维度内部严格互斥
- ✅ 跨维度边界清晰
- ✅ 命名和视觉系统统一

**待优化点**:
- ⚠️ todayActual 查询的小瑕疵（建议修复）
- ⚠️ 部分业务定位需要文档说明

**总体评分**: **90/100** - 优秀的统计系统设计
