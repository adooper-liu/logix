# at_port 状态逻辑修复总结

> 文档版本: v1.0
> 最后更新: 2026-03-04
> 适用范围: 按到港维度统计

---

## 一、问题描述

### 原始问题

用户发现：
- "已到目的港 状态 有92 条件货柜"
- "日之前到港未提柜 只有46"
- "还46条去哪里了"

### 根本原因

**业务逻辑矛盾：**

`at_port` 状态表示"已到目的港"，但在原有的统计逻辑中：
- `at_port` 状态的货柜如果**没有 ATA**（只有 ETA）
- 会被错误地归类到"未到港"维度（如"已逾期未到港"、"3日内预计到港"等）
- 这违反了"已到目的港"的业务含义

### 问题示例

```
货柜 A:
  - logistics_status: 'at_port'  // 状态表示已到港
  - ata_dest_port: NULL           // 但没有实际到港日期
  - eta_dest_port: '2026-02-28'   // 只有预计到港日期

旧逻辑: 归类到"已逾期未到港"
新逻辑: 归类到"今日之前到港，但无ATA"（新增分类）
```

---

## 二、业务规则更新

### 新的业务规则

```
按到港总计 (全部已出运货柜)
├── ① 实际已到目的港 (状态为"已到目的港"，或有ATA)
│   ├── 今日到港
│   └── 今日之前到港
│       ├── 今日之前到港未提柜
│       ├── 今日之前到港已提柜
│       └── 今日之前到港，但无ATA（新增）
└── ② 未到目的港 (状态不是"已到目的港"，且无ATA)
    ├── 已逾期未到港
    ├── 3日内预计到港
    ├── 7日内预计到港
    ├── 7日后预计到港
    └── 其他记录 (无ETA)
```

### 规则说明

#### 规则1：实际已到目的港

**条件（满足任一即视为已到港）：**
- ✅ 状态为 `at_port`（已到目的港）
- ✅ 有 ATA（实际到港日期）

**说明：**
- `at_port` 状态本身就表示已到港，不需要 ATA 也能归类到"实际已到目的港"
- 如果 `at_port` 状态但有 ATA，则按 ATA 时间进一步分类
- 如果 `at_port` 状态但无 ATA，归类到新增的"今日之前到港，但无ATA"

#### 规则2：未到目的港

**条件（同时满足）：**
- ✅ 状态**不是** `at_port`
- ✅ **无 ATA**（实际到港日期）

**说明：**
- 只包含 `shipped` 和 `in_transit` 状态
- 排除 `at_port` 状态，因为 `at_port` 表示已到港
- 通过 ETA（预计到港日期）进行进一步分类

---

## 三、代码修改

### 1. 新增方法：`getArrivedBeforeTodayNoATA`

**功能：** 统计状态为 `at_port` 但没有 ATA 的货柜

```typescript
/**
 * 2.2 今日之前到港但无ATA：状态为"已到目的港"(at_port)，但没有实际到港日期(ATA)
 * 这是新增的分类，用于处理状态为at_port但缺少ATA数据的货柜
 */
private async getArrivedBeforeTodayNoATA(
  today: Date,
  targetStatuses: string[],
  startDate?: string,
  endDate?: string
): Promise<number> {
  const query = this.containerRepository
    .createQueryBuilder('container')
    .leftJoin('container.order', 'order')
    .leftJoin('container.seaFreight', 'sf')
    .select('COUNT(DISTINCT container.containerNumber)', 'count')
    .innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata_dest_port IS NULL
        AND po1.port_sequence = (
          SELECT MAX(po2.port_sequence)
          FROM process_port_operations po2
          WHERE po2.container_number = po1.container_number
          AND po2.port_type = 'destination'
        )
      )`,
      'dest_po',
      'dest_po.container_number = container.containerNumber'
    )
    .where('container.logisticsStatus = :atPortStatus', { atPortStatus: 'at_port' });

  // ... 日期过滤逻辑

  const result = await query.getRawOne();
  return parseInt(result.count);
}
```

**筛选条件：**
- ✅ `logistics_status = 'at_port'`
- ✅ `port_type = 'destination'` 且为主要目的港
- ✅ `ata_dest_port IS NULL`

### 2. 修改 ETA 相关方法：排除 `at_port` 状态

修改了以下 5 个方法的 `etaTargetStatuses`：

| 方法名 | 修改前 | 修改后 |
|-------|-------|-------|
| `getOverdueNotArrived` | `['shipped', 'in_transit', 'at_port']` | `['shipped', 'in_transit']` |
| `getWithin3Days` | `['shipped', 'in_transit', 'at_port']` | `['shipped', 'in_transit']` |
| `getWithin7Days` | `['shipped', 'in_transit', 'at_port']` | `['shipped', 'in_transit']` |
| `getOver7Days` | `['shipped', 'in_transit', 'at_port']` | `['shipped', 'in_transit']` |
| `getOtherRecords` | `['shipped', 'in_transit', 'at_port']` | `['shipped', 'in_transit']` |

**修改原因：**
- `at_port` 状态表示已到港，不应该出现在"未到港"维度
- 这些方法只统计 `shipped` 和 `in_transit` 状态的货柜

### 3. 更新主方法：添加新统计项

在 `getArrivalDistribution` 方法中：

```typescript
// 添加新方法的调用
const arrivedBeforeTodayNoATAResult = await this.getArrivedBeforeTodayNoATA(
  today,
  targetStatuses,
  startDate,
  endDate
);

// 更新总和计算
const sum =
  arrivedTodayResult +
  arrivedBeforeTodayNotPickedUpResult +
  arrivedBeforeTodayPickedUpResult +
  arrivedBeforeTodayNoATAResult +  // 新增
  overdueNotArrivedResult +
  within3DaysResult +
  within7DaysResult +
  over7DaysResult +
  otherRecordsResult;

// 更新返回值
return {
  today: arrivedTodayResult,
  arrivedBeforeTodayNotPickedUp: arrivedBeforeTodayNotPickedUpResult,
  arrivedBeforeTodayPickedUp: arrivedBeforeTodayPickedUpResult,
  arrivedBeforeTodayNoATA: arrivedBeforeTodayNoATAResult,  // 新增
  overdue: overdueNotArrivedResult,
  within3Days: within3DaysResult,
  within7Days: within7DaysResult,
  over7Days: over7DaysResult,
  other: otherRecordsResult
};
```

---

## 四、修改后的统计逻辑

### 物流状态分布

#### `at_port` 状态（已到目的港）

| 统计维度 | 是否可能 | 条件 | 说明 |
|---------|---------|------|------|
| **今日到港** | ✅ 可能 | `ATA = 今天` | 今天刚到港 |
| **今日之前到港未提柜** | ✅ 可能 | `ATA < 今天` | 之前到港且未提柜 |
| **今日之前到港已提柜** | ❌ 不可能 | - | 状态矛盾 |
| **今日之前到港，但无ATA** | ✅ 可能 | `ATA IS NULL` | 已到港但缺少ATA数据 |
| **已逾期未到港** | ❌ 不可能 | - | 已到港，不应在未到港维度 |
| **3日内预计到港** | ❌ 不可能 | - | 已到港，不应在未到港维度 |
| **7日内预计到港** | ❌ 不可能 | - | 已到港，不应在未到港维度 |
| **7日后预计到港** | ❌ 不可能 | - | 已到港，不应在未到港维度 |
| **其他记录** | ❌ 不可能 | - | 已到港，不应在未到港维度 |

#### `shipped/in_transit` 状态（未到港）

| 统计维度 | 是否可能 | 条件 | 说明 |
|---------|---------|------|------|
| **今日到港** | ✅ 可能 | `ATA = 今天` | 刚到港（状态可能还未更新） |
| **今日之前到港未提柜** | ✅ 可能 | `ATA < 今天` | 已到港但状态未更新 |
| **今日之前到港已提柜** | ✅ 可能 | `ATA < 今天` | 已到港且已提柜 |
| **今日之前到港，但无ATA** | ❌ 不可能 | - | 状态不是at_port |
| **已逾期未到港** | ✅ 可能 | `ATA IS NULL` 且 `ETA < 今天` | ETA已过期 |
| **3日内预计到港** | ✅ 可能 | `ATA IS NULL` 且 `ETA ∈ [今天, 今天+3天]` | 预计3天内到港 |
| **7日内预计到港** | ✅ 可能 | `ATA IS NULL` 且 `ETA ∈ (今天+3天, 今天+7天]` | 预计3-7天内到港 |
| **7日后预计到港** | ✅ 可能 | `ATA IS NULL` 且 `ETA > 今天+7天` | 预计7天后到港 |
| **其他记录** | ✅ 可能 | `ATA IS NULL` 且 `ETA IS NULL` | 既无ETA也无ATA |

---

## 五、问题解决

### 原始问题解答

**问题：** "已到目的港 状态 有92 条件货柜，日之前到港未提柜 只有46，还46条去哪里了"

**答案：** 92个 `at_port` 状态的货柜现在会正确分布到以下维度：

| 统计项 | 说明 |
|-------|------|
| **今日到港** | 有 ATA = 今天的货柜 |
| **今日之前到港未提柜** | 有 ATA < 今天的货柜（之前统计到46） |
| **今日之前到港，但无ATA** | **新增分类**，统计状态为 `at_port` 但无 ATA 的货柜（之前被错误归类到未到港维度） |

**结论：** 之前失踪的46条货柜现在会出现在新增的"今日之前到港，但无ATA"分类中。

---

## 六、验证步骤

### 1. 数据验证

重启后端服务后，检查以下统计关系：

```
按到港总计 = 今日到港 + 今日之前到港未提柜 + 今日之前到港已提柜 + 今日之前到港，但无ATA + 已逾期未到港 + 3日内预计到港 + 7日内预计到港 + 7日后预计到港 + 其他记录
```

### 2. 状态验证

- ✅ 所有 `at_port` 状态的货柜都应该在"实际已到目的港"维度
- ✅ 所有 `at_port` 状态的货柜都不应该出现在"未到港"维度
- ✅ 新增的"今日之前到港，但无ATA"应该包含所有 `at_port` 状态但无 ATA 的货柜

### 3. 业务逻辑验证

- ✅ 有 ATA 的货柜按 ATA 时间分类
- ✅ `at_port` 状态但无 ATA 的货柜归入新增分类
- ✅ 非(at_port)且无 ATA 的货柜按 ETA 分类

---

## 七、前端适配

### API 返回值变化

`getArrivalDistribution` 方法现在返回9个统计项（新增1个）：

```typescript
{
  today: number,                          // 今日到港
  arrivedBeforeTodayNotPickedUp: number,   // 今日之前到港未提柜
  arrivedBeforeTodayPickedUp: number,     // 今日之前到港已提柜
  arrivedBeforeTodayNoATA: number,        // 今日之前到港，但无ATA（新增）
  overdue: number,                        // 已逾期未到港
  within3Days: number,                    // 3日内预计到港
  within7Days: number,                    // 7日内预计到港
  over7Days: number,                      // 7日后预计到港
  other: number                           // 其他记录
}
```

### 前端需要修改的地方

1. **StatisticsVisualization.vue** - 添加新统计项的显示
2. **统计卡片组件** - 更新显示逻辑以包含新分类
3. **数据验证** - 更新汇总计算以包含新统计项

---

## 八、相关文档

- 记忆 ID: 49315841 - 按到港统计逻辑规则（更新版）
- `统计口径完整说明_按到港维度.md` - 完整统计口径文档（待更新）
- `ATA_STATISTICS_FIX_SUMMARY.md` - ATA 统计修复记录
- `STATISTICS_FIX_SUMMARY.md` - ETA 统计修复记录

---

## 九、总结

### 核心改进

1. ✅ **业务逻辑一致性**：`at_port` 状态始终表示已到港
2. ✅ **数据完整性**：新增分类处理缺失 ATA 的情况
3. ✅ **统计准确性**：避免 `at_port` 状态被错误归类到"未到港"维度
4. ✅ **状态过滤优化**：ETA 分组明确排除 `at_port` 状态

### 影响范围

- **后端**：`containerStatistics.service.ts`（新增1个方法，修改6个方法）
- **前端**：需要适配新的返回值结构（新增 `arrivedBeforeTodayNoATA` 字段）

### 下一步

1. 重启后端服务
2. 更新前端代码以支持新统计项
3. 验证统计数据准确性
4. 更新统计口径文档

---

**修复完成时间：** 2026-03-04
