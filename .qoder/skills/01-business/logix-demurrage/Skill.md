---
name: logix-demurrage
description: 滞港费计算业务规则 - LFD计算、免费期政策、费用分级
version: 1.0.0
updated: 2026-06-23
trigger: manual
tags: [demurrage, business, calculation, lfd]
---

# 滞港费计算业务规则

## 核心概念

**滞港费（Demurrage）**：集装箱在目的港超过免费期后产生的仓储费用。

**关键日期**：
- **ATA（Actual Time of Arrival）**：实际到港时间（`process_port_operations.ata_dest_port`）
- **LFD（Last Free Date）**：最晚免费日期（`process_port_operations.last_free_date`）
- **提柜时间**：实际提柜时间（`process_trucking_transport.pickup_time`）

**计算公式**：
```
滞港天数 = 提柜时间 - LFD（若提柜时间 > LFD）
滞港费用 = 滞港天数 × 每日费率（根据港口政策阶梯计费）
```

---

## 1. LFD 计算规则

### 基础规则

```typescript
// LFD = ATA + 免费期天数
const ata = portOperation.ata_dest_port; // 目的港实际到港时间
const freeDays = getFreeDaysByPort(portCode); // 根据港口查询免费期

const lfd = addBusinessDays(ata, freeDays); // 跳过周末和节假日
portOperation.last_free_date = lfd;
```

### 免费期天数查询

```typescript
// 从字典表查询港口免费期
async function getFreeDaysByPort(portCode: string): Promise<number> {
  const policy = await this.portPolicyRepo.findOne({
    where: { port_code: portCode }
  });
  
  return policy?.free_days || 7; // 默认7天
}

// 数据库表：dict_port_policies
// | port_code | free_days | demurrage_rates | ... |
// |-----------|-----------|-----------------|-----|
// | USLAX     | 7         | {"1-5": 100, "6-10": 150} | ... |
```

### 考虑节假日

```typescript
// ✅ 正确：跳过周末和节假日
import { addBusinessDays } from 'date-fns';

const holidays = await this.holidayRepo.find({
  where: {
    country_code: portCountry,
    holiday_date: Between(ata, addDays(ata, 30))
  }
});

const holidaySet = new Set(holidays.map(h => h.holiday_date.toISOString().split('T')[0]));

let lfd = ata;
let daysAdded = 0;

while (daysAdded < freeDays) {
  lfd = addDays(lfd, 1);
  
  // 跳过周末
  if (getDay(lfd) === 0 || getDay(lfd) === 6) {
    continue;
  }
  
  // 跳过节假日
  const dateStr = lfd.toISOString().split('T')[0];
  if (holidaySet.has(dateStr)) {
    continue;
  }
  
  daysAdded++;
}

return lfd;
```

---

## 2. 滞港费分级计算

### 阶梯费率政策

```typescript
// 港口费率配置（JSON格式存储在 dict_port_policies.demurrage_rates）
{
  "1-5": 100,    // 第1-5天：$100/天
  "6-10": 150,   // 第6-10天：$150/天
  "11-20": 200,  // 第11-20天：$200/天
  "21+": 300     // 第21天起：$300/天
}
```

### 计算函数

```typescript
interface DemurrageResult {
  demurrageDays: number;      // 滞港天数
  demurrageFee: number;       // 滞港费用
  breakdown: Array<{          // 费用明细
    days: number;
    rate: number;
    subtotal: number;
  }>;
}

function calculateDemurrage(
  pickupTime: Date,
  lfd: Date,
  rates: Record<string, number>
): DemurrageResult {
  // 未超期
  if (pickupTime <= lfd) {
    return { demurrageDays: 0, demurrageFee: 0, breakdown: [] };
  }
  
  // 计算滞港天数（只计工作日）
  const demurrageDays = getBusinessDaysBetween(lfd, pickupTime);
  
  // 阶梯计费
  let remainingDays = demurrageDays;
  let totalFee = 0;
  const breakdown: DemurrageResult['breakdown'] = [];
  
  // 解析费率区间
  const rateRanges = Object.entries(rates)
    .map(([range, rate]) => {
      const [start, end] = range.split('-').map(Number);
      return { start, end: end || Infinity, rate };
    })
    .sort((a, b) => a.start - b.start);
  
  // 逐段计算
  for (const { start, end, rate } of rateRanges) {
    if (remainingDays <= 0) break;
    
    const daysInThisRange = Math.min(
      remainingDays,
      end - start + 1
    );
    
    const subtotal = daysInThisRange * rate;
    breakdown.push({
      days: daysInThisRange,
      rate,
      subtotal
    });
    
    totalFee += subtotal;
    remainingDays -= daysInThisRange;
  }
  
  return {
    demurrageDays,
    demurrageFee: totalFee,
    breakdown
  };
}
```

### 使用示例

```typescript
// Service 层调用
async function getContainerDemurrage(containerNumber: string): Promise<DemurrageResult> {
  // 1. 查询港口操作记录
  const portOp = await this.portOpRepo.findOne({
    where: { container_number: containerNumber }
  });
  
  if (!portOp?.ata_dest_port || !portOp?.last_free_date) {
    throw new Error('缺少ATA或LFD数据');
  }
  
  // 2. 查询提柜时间
  const trucking = await this.truckingRepo.findOne({
    where: { container_number: containerNumber }
  });
  
  if (!trucking?.pickup_time) {
    throw new Error('尚未提柜');
  }
  
  // 3. 查询港口费率政策
  const portPolicy = await this.portPolicyRepo.findOne({
    where: { port_code: portOp.dest_port_code }
  });
  
  const rates = JSON.parse(portPolicy.demurrage_rates);
  
  // 4. 计算滞港费
  return calculateDemurrage(
    trucking.pickup_time,
    portOp.last_free_date,
    rates
  );
}
```

---

## 3. 统计分类

### 五类统计口径

```typescript
// LastPickupStatisticsService 统计逻辑
enum PickupStatus {
  EXPIRED = 'expired',        // 已超期（当前时间 > LFD 且未提柜）
  URGENT = 'urgent',          // 紧急（距离LFD <= 3天）
  WARNING = 'warning',        // 警告（距离LFD 4-7天）
  NORMAL = 'normal',          // 正常（距离LFD > 7天）
  NO_LAST_FREE_DATE = 'no_lfd' // 无LFD数据
}

async function classifyContainers(containers: Container[]): Promise<Record<PickupStatus, number>> {
  const now = new Date();
  const stats: Record<PickupStatus, number> = {
    expired: 0,
    urgent: 0,
    warning: 0,
    normal: 0,
    no_lfd: 0
  };
  
  for (const container of containers) {
    const portOp = await this.getPortOperation(container.containerNumber);
    
    if (!portOp?.last_free_date) {
      stats.no_lfd++;
      continue;
    }
    
    const lfd = portOp.last_free_date;
    const daysUntilLfd = differenceInBusinessDays(now, lfd);
    
    if (now > lfd && !container.pickup_time) {
      stats.expired++;
    } else if (daysUntilLfd <= 3) {
      stats.urgent++;
    } else if (daysUntilLfd <= 7) {
      stats.warning++;
    } else {
      stats.normal++;
    }
  }
  
  return stats;
}
```

---

## 4. 数据库表结构

### 核心表

```sql
-- 港口操作记录
CREATE TABLE process_port_operations (
  id SERIAL PRIMARY KEY,
  container_number VARCHAR(20) NOT NULL,
  dest_port_code VARCHAR(10),           -- 目的港代码
  ata_dest_port TIMESTAMP,              -- 目的港实际到港时间
  last_free_date TIMESTAMP,             -- 最晚免费日期（LFD）
  last_return_date TIMESTAMP,           -- 最晚还箱日期
  created_at TIMESTAMP DEFAULT NOW()
);

-- 港口费率政策
CREATE TABLE dict_port_policies (
  id SERIAL PRIMARY KEY,
  port_code VARCHAR(10) UNIQUE,         -- 港口代码
  free_days INTEGER DEFAULT 7,          -- 免费期天数
  demurrage_rates JSONB,                -- 滞港费率（阶梯）
  storage_rates JSONB,                  -- 仓储费率
  created_at TIMESTAMP DEFAULT NOW()
);

-- 节假日配置
CREATE TABLE dict_holidays (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(5),              -- 国家代码
  holiday_date DATE,                    -- 节假日日期
  holiday_name VARCHAR(100),            -- 节日名称
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_port_ops_container ON process_port_operations(container_number);
CREATE INDEX idx_port_ops_ata ON process_port_operations(ata_dest_port);
CREATE INDEX idx_port_ops_lfd ON process_port_operations(last_free_date);
```

---

## 5. 前端展示

### 统计卡片

```vue
<!-- frontend/src/components/DemurrageStats.vue -->
<template>
  <div class="demurrage-stats">
    <el-card v-for="(count, status) in stats" :key="status">
      <div class="stat-item" :class="status">
        <div class="stat-label">{{ getStatusLabel(status) }}</div>
        <div class="stat-value">{{ count }}</div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
const statusColors = {
  expired: '#F56C6C',    // 红色
  urgent: '#E6A23C',     // 橙色
  warning: '#F4C842',    // 黄色
  normal: '#67C23A',     // 绿色
  no_lfd: '#909399'      // 灰色
};

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    expired: '已超期',
    urgent: '紧急（≤3天）',
    warning: '警告（4-7天）',
    normal: '正常（>7天）',
    no_lfd: '无LFD数据'
  };
  return labels[status];
}
</script>
```

### 费用明细表格

```vue
<!-- frontend/src/components/DemurrageBreakdown.vue -->
<template>
  <el-table :data="breakdown">
    <el-table-column prop="days" label="天数" />
    <el-table-column prop="rate" label="费率（$/天）" />
    <el-table-column prop="subtotal" label="小计（$）" />
  </el-table>
  
  <div class="total">
    总费用：${{ totalFee }}
  </div>
</template>
```

---

## 6. 常见错误与修复

### 错误1：LFD计算未跳过节假日

```typescript
// ❌ 错误：简单加法
const lfd = addDays(ata, freeDays); // 包含周末和节假日

// ✅ 正确：跳过非工作日
const lfd = addBusinessDays(ata, freeDays, { holidays });
```

### 错误2：滞港天数计算错误

```typescript
// ❌ 错误：自然日计算
const demurrageDays = differenceInDays(pickupTime, lfd);

// ✅ 正确：只计工作日
const demurrageDays = getBusinessDaysBetween(lfd, pickupTime);
```

### 错误3：费率区间重叠

```json
// ❌ 错误：区间重叠
{
  "1-5": 100,
  "5-10": 150  // 第5天重复
}

// ✅ 正确：区间不重叠
{
  "1-5": 100,
  "6-10": 150
}
```

---

## 7. 检查清单

生成滞港费相关代码后自检：

- [ ] LFD计算是否跳过周末和节假日？
- [ ] 滞港天数是否只计工作日？
- [ ] 费率区间是否无重叠？
- [ ] 是否处理了无LFD数据的边界情况？
- [ ] 是否处理了未提柜的边界情况？
- [ ] 统计分类是否符合五类口径？
- [ ] 数据库查询是否有适当索引？

---

## 8. 参考资源

- 重构指南：../05-refactoring/logix-quick-start-refactoring/Skill.md
- 现有实现：backend/src/services/demurrage.service.ts

---

**适用场景**：
- 实现滞港费计算功能
- 修改LFD计算逻辑
- 调整免费期政策
- 优化滞港费统计报表

**相关 Skills**：
- `logix-business-knowledge` - 业务知识总览
- `database-query` - 数据库查询优化
- `feituo-import-rules` - 飞驼数据导入（提供ATA数据）
