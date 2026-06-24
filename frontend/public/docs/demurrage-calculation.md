# LogiX 滞港费计算逻辑

## 核心概念

### Demurrage vs Detention
- **Demurrage（滞港费）**：货柜在港口堆存超过免费期的费用
- **Detention（滞箱费）**：货柜提离港口后未按时还空箱的费用
- **D&D（合并计费）**：部分船公司将两者合并为一个费率表

### 关键日期
| 日期字段 | 来源表 | 说明 |
|---------|--------|------|
| `ata_dest_port` | process_port_operations | 目的港实际到港时间 |
| `revised_eta` | process_port_operations | 修正后的预计到港时间 |
| `last_free_date` | process_port_operations | 最晚免费日期（LFD） |
| `pickup_date` | process_trucking_transport | 实际提柜日期 |
| `planned_pickup_date` | process_trucking_transport | 计划提柜日期 |
| `return_time` | process_empty_return | 实际还空箱时间 |

---

## 计算模式判定

### Actual模式（实际发生）
**触发条件**：`return_time`存在
```typescript
if (container.emptyReturn?.returnTime) {
  mode = 'actual';
}
```

**计算逻辑**：
- 起算日：`ata_dest_port`（实际到港日）
- 截止日：`return_time`（实际还箱日）
- 免费天数：从费率表中获取
- 计费天数：`max(0, 截止日 - 起算日 - 免费天数)`

### Forecast模式（预测）
**触发条件**：`return_time`不存在
```typescript
if (!container.emptyReturn?.returnTime) {
  mode = 'forecast';
}
```

**计算逻辑**：
- 起算日：`revised_eta`（修正ETA）或`ata_dest_port`
- 截止日：`planned_pickup_date`（计划提柜日）+ 预估卸柜天数
- 免费天数：从费率表中获取
- 计费天数：`max(0, 截止日 - 起算日 - 免费天数)`

---

## last_free_date 计算

### 计算公式
```typescript
lastFreeDate = ataDestPort + freeDays
```

**示例**：
- ATA: 2026-06-15
- Free Days: 7天
- LFD: 2026-06-22

### 数据来源
```sql
-- process_port_operations表
SELECT 
  container_number,
  ata_dest_port,
  last_free_date  -- 由后端计算后写入
FROM process_port_operations
WHERE port_type = 'destination';
```

---

## 费率表结构

### demurrage_rates 表（假设）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| shipping_company | VARCHAR | 船公司代码 |
| container_type | VARCHAR | 柜型（40HQ/20GP等） |
| free_days | INT | 免费天数 |
| tier_1_days | INT | 第1阶梯天数（如1-7天） |
| tier_1_rate | DECIMAL | 第1阶梯费率（如$100/天） |
| tier_2_days | INT | 第2阶梯天数（如8-14天） |
| tier_2_rate | DECIMAL | 第2阶梯费率（如$150/天） |
| tier_3_rate | DECIMAL | 第3阶梯费率（如$200/天，15天以上） |

---

## 计算步骤详解

### Step 1: 确定计费区间
```typescript
const startDate = mode === 'actual' 
  ? container.ataDestPort 
  : container.revisedEta || container.ataDestPort;

const endDate = mode === 'actual'
  ? container.returnTime
  : container.plannedPickupDate.addDays(estimatedUnloadDays);
```

### Step 2: 获取费率配置
```typescript
const rateConfig = await getDemurrageRate({
  shippingCompany: container.shippingCompany,
  containerType: container.containerType
});
```

### Step 3: 计算免费期
```typescript
const freeEndDate = addDays(startDate, rateConfig.freeDays);
```

### Step 4: 分段计算费用
```typescript
let totalFee = 0;
let remainingDays = differenceInDays(endDate, freeEndDate);

if (remainingDays <= 0) {
  return 0;  // 未超期
}

// 第1阶梯
const tier1Days = Math.min(remainingDays, rateConfig.tier1Days);
totalFee += tier1Days * rateConfig.tier1Rate;
remainingDays -= tier1Days;

// 第2阶梯
if (remainingDays > 0) {
  const tier2Days = Math.min(remainingDays, rateConfig.tier2Days);
  totalFee += tier2Days * rateConfig.tier2Rate;
  remainingDays -= tier2Days;
}

// 第3阶梯（无限）
if (remainingDays > 0) {
  totalFee += remainingDays * rateConfig.tier3Rate;
}

return totalFee;
```

---

## 场景模拟

### 场景1: 正常提柜（无滞港费）
**数据**：
- ATA: 2026-06-15
- Free Days: 7
- LFD: 2026-06-22
- Pickup Date: 2026-06-20
- Return Time: 2026-06-25

**计算**：
```
计费区间: 2026-06-15 ~ 2026-06-25 (10天)
免费期: 7天
超期天数: 10 - 7 = 3天
费率: $100/天（第1阶梯）
总费用: 3 × $100 = $300
```

### 场景2: 严重超期（多阶梯）
**数据**：
- ATA: 2026-06-01
- Free Days: 7
- LFD: 2026-06-08
- Return Time: 2026-06-25

**计算**：
```
计费区间: 2026-06-01 ~ 2026-06-25 (24天)
免费期: 7天
超期天数: 24 - 7 = 17天

第1阶梯 (1-7天): 7 × $100 = $700
第2阶梯 (8-14天): 7 × $150 = $1,050
第3阶梯 (15天+): 3 × $200 = $600

总费用: $700 + $1,050 + $600 = $2,350
```

### 场景3: Forecast模式（预测）
**数据**：
- Revised ETA: 2026-06-20
- Free Days: 7
- Planned Pickup: 2026-06-28
- Estimated Unload Days: 2

**计算**：
```
起算日: 2026-06-20
截止日: 2026-06-28 + 2 = 2026-06-30
计费区间: 10天
免费期: 7天
超期天数: 10 - 7 = 3天
预测费用: 3 × $100 = $300
```

---

## 预警规则

### 预警级别
| 级别 | 条件 | 操作 |
|------|------|------|
| Critical | 已过LFD | 立即通知操作人员 |
| High | 距LFD ≤ 3天 | 每日提醒 |
| Medium | 距LFD ≤ 7天 | 每周提醒 |
| Low | 缺少LFD | 检查数据完整性 |

### 预警生成
```typescript
async function generateDemurrageAlerts(container: Container) {
  if (!container.lastFreeDate) {
    return [{ type: 'NO_LFD', severity: 'low' }];
  }
  
  const daysUntilLfd = daysUntil(container.lastFreeDate);
  
  if (daysUntilLfd < 0) {
    return [{ type: 'EXPIRED', severity: 'critical', days: Math.abs(daysUntilLfd) }];
  } else if (daysUntilLfd <= 3) {
    return [{ type: 'URGENT', severity: 'high', days: daysUntilLfd }];
  } else if (daysUntilLfd <= 7) {
    return [{ type: 'WARNING', severity: 'medium', days: daysUntilLfd }];
  }
  
  return [];
}
```

---

## 数据来源验证

### 验证清单
- [ ] `ata_dest_port`来自飞驼API的ATA事件
- [ ] `last_free_date`由后端根据free days计算
- [ ] `pickup_date`来自process_trucking_transport
- [ ] `return_time`来自process_empty_return
- [ ] 费率配置来自demurrage_rates表

### 常见问题
**Q**: last_free_date为空怎么办？  
**A**: 检查process_port_operations是否有destination类型的记录，以及free days配置是否正确。

**Q**: 为什么actual和forecast结果差异大？  
**A**: forecast使用planned_pickup_date + 预估卸柜天数，可能与实际偏差较大。建议定期校准预估参数。

---

## 参考实现

- 计算服务：`backend/src/services/demurrage.service.ts`
- 费率配置：`backend/src/entities/demurrage-rate.entity.ts`
- 预警服务：`backend/src/services/container-alerts.service.ts`

---

**维护者**: LogiX Team  
**最后更新**: 2026-06-23
