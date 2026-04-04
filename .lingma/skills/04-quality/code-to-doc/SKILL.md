---
name: code-to-doc
description: 基于代码自动生成符合规范的计算逻辑场景模拟文档。当用户需要理解复杂业务逻辑、费用计算、状态机转换或排产调度时使用此技能。
---

# Code to Documentation Generator

## 目标

分析后端服务代码，生成类似 `frontend/public/docs/第 2 层 - 代码文档/计算逻辑场景模拟.md` 格式的技术文档。

## 核心原则

**代码优先，文档精简**：只记录能防止开发出错的业务逻辑和计算场景。

**真实第一**：所有计算公式、场景参数必须与源代码完全一致，禁止编造。

**场景驱动**：通过具体数值示例展示计算过程，而非抽象描述。

## 文档结构标准

### 固定章节

```markdown
# [模块名称] 计算逻辑场景模拟

**项目**: LogiX 物流管理系统  
**所属层级**: 第 2 层 - 代码文档

---

## 一、文档概述

简短说明（1-2 句话）：本文档说明什么逻辑，覆盖哪些场景。

---

## 二、核心计算逻辑

### X.1 核心公式
```

[数学公式或伪代码]

```

### X.2 关键参数表

| 参数 | 说明 | 来源表/字段 | 类型 |
|------|------|------------|------|
| startDate | 起始日期 | process_sea_freight.ata_dest_port | Date |
| freeDays | 免费天数 | dict_demurrage_standards.free_days | Number |

---

## 三、场景模拟

### 场景 N: [场景名称]

**参数**:
- 参数 1: 具体值
- 参数 2: 具体值

**计算过程**:
```

步骤 1: 计算 lastFreeDate = ATA + freeDays - 1
步骤 2: 计算 endDate = min(today, plannedPickup)
步骤 3: 计算 chargeDays = endDate - lastFreeDate - 1
步骤 4: 计算费用 = chargeDays × ratePerDay

```

**结果**: 数值结果 + 单位

---

## 四、对比表格（如适用）

| 场景 | 模式 | 起始日 | 截止日 | 收费天数 | 费用 |
|------|------|--------|--------|----------|------|
| 1 | actual | ATA | today | 27 天 | $2,700 |
| 2 | forecast | ETA | today | 0 天 | $0 |

---

## 权威来源

- `backend/src/services/[文件].ts` - [功能]
- `backend/03_create_tables.sql` - [表名]
```

## 执行流程

### 步骤 1: 确定分析目标

识别需要分析的模块类型：

| 模块类型 | 典型文件路径                                              | 计算特征            |
| -------- | --------------------------------------------------------- | ------------------- |
| 费用计算 | `backend/src/services/demurrage.service.ts`               | 日期差值 × 费率     |
| 智能排柜 | `backend/src/services/intelligentScheduling.service.ts`   | 5 个计划日期链      |
| 成本优化 | `backend/src/services/schedulingCostOptimizer.service.ts` | 多方案对比选优      |
| 状态机   | `backend/src/utils/calculateLogisticsStatus.ts`           | 7 层优先级判断      |
| 统计分析 | `backend/src/services/*statistics.service.ts`             | GROUP BY + 聚合函数 |

### 步骤 2: 阅读源代码

**必读文件位置**：

1. **Service 层**：`backend/src/services/*.service.ts`
2. **工具函数**：`backend/src/utils/*.ts`
3. **实体定义**：`backend/src/entities/*.ts`
4. **数据库表**：`backend/03_create_tables.sql`

**提取信息清单**：

- [ ] 核心计算公式（查找数学运算、日期运算）
- [ ] 输入参数来源（数据库字段、API 请求体）
- [ ] 输出结果去向（返回对象、写入数据库）
- [ ] 条件分支逻辑（if/switch 语句）
- [ ] 边界条件处理（null 检查、空数组处理）

**代码阅读技巧**：

```typescript
// 1. 查找计算方法
public calculateFee(container: Container): number {
  const chargeDays = this.dateDiff(endDate, startDate);
  return chargeDays * this.ratePerDay;
}

// 2. 追踪变量来源
private getStartDate(container: Container): Date {
  return container.ataDestPort || container.etaDestPort;
}

// 3. 查看分支处理
if (status === 'actual') {
  // 实际模式逻辑
} else if (status === 'forecast') {
  // 预测模式逻辑
}
```

### 步骤 3: 设计场景矩阵

根据代码逻辑复杂度，设计覆盖以下维度的场景：

**基础维度**（必选）：

| 维度     | 最少场景数 | 示例            |
| -------- | ---------- | --------------- |
| 正常流程 | 1          | 免费期内提柜    |
| 边界条件 | 1          | 刚好第 7 天提柜 |
| 异常情况 | 1          | 已超期未提柜    |

**扩展维度**（可选）：

| 维度 | 变化因素     | 示例                             |
| ---- | ------------ | -------------------------------- |
| 时间 | 不同日期范围 | ATA+3 天 vs ATA+10 天            |
| 状态 | 不同业务状态 | forecast vs actual               |
| 数值 | 阈值临界点   | freeDays = 7, chargeDays = 6/7/8 |
| 分支 | 不同条件分支 | 分段费率 1-7 天 / 8-14 天        |

**场景命名规范**：

```
场景 1: 免费期内提柜
场景 2: 刚好免费期最后一天
场景 3: 已超期提柜
场景 4: 分段费率计算（跨区间）
场景 5: 工作日 vs 自然日差异
```

### 步骤 4: 手动验算场景

对每个场景进行手工计算验证：

**验算模板**：

```
场景参数:
- ATA: 2026-02-01
- 免费天数：7 天
- 提柜日：2026-02-10

手工计算:
1. lastFreeDate = 2026-02-01 + 7 - 1 = 2026-02-07
2. endDate = 2026-02-10
3. chargeDays = 2026-02-10 - 2026-02-07 - 1 = 2 天
4. 费用 = 2 × $100 = $200

验证通过 ✅
```

### 步骤 5: 生成文档

按照标准结构生成 Markdown 文档：

**写作要点**：

1. **公式部分**：使用代码块展示，避免纯文本
2. **参数表格**：注明每个参数的数据库来源
3. **计算过程**：分步骤展示，每步一个等式
4. **结果标注**：包含数值和单位（天、USD 等）

**禁止事项**：

- ❌ 使用 Emoji 表情（用 ASCII 符号代替）
- ❌ 编造不存在的字段或表
- ❌ 模糊描述（如"大约"、"可能"）
- ❌ 缺少单位的数值

### 步骤 6: 添加权威来源

在文档末尾标注引用的源代码：

```markdown
---

## 权威来源

- `backend/src/services/demurrage.service.ts` - 滞港费计算服务
  - `calculateDemurrage()` - 主计算方法
  - `getChargeDays()` - 收费天数计算
- `backend/src/entities/container.entity.ts` - 货柜实体
- `backend/03_create_tables.sql` - biz_containers 表定义
```

## 代码分析方法论

### 费用计算逻辑分析

**识别特征**：

```typescript
// 特征 1: 日期运算
const days = differenceInDays(date1, date2);

// 特征 2: 条件判断
if (days <= freeDays) {
  return 0; // 免费期内
}

// 特征 3: 乘法运算
const total = chargeDays * ratePerDay;

// 特征 4: 分段计费
for (const tier of tiers) {
  if (days >= tier.start && days <= tier.end) {
    total += tierDays * tier.rate;
  }
}
```

**分析步骤**：

1. 找到主计算方法（通常名为 `calculateXxx`）
2. 追踪每个变量的来源
3. 列出所有分支条件
4. 记录费率查找逻辑

**文档输出要点**：

- 明确起算日（ATA/ETA/dischargeDate）
- 明确截止日（today/plannedPickup/actualPickup）
- 说明免费日计算基准（自然日/工作日）
- 展示分段费率表（如有）

### 排产调度逻辑分析

**识别特征**：

```typescript
// 特征 1: 日期链计算
const customsDate = subDays(ata, 1);
const pickupDate = addDays(customsDate, 1);
const unloadDate = this.calculateWarehouseCapacity(...);
const deliveryDate = unloadDate;
const returnDate = addDays(unloadDate, 1);

// 特征 2: 产能检查
const available = warehouse.dailyCapacity - warehouse.scheduledCount;
if (available < required) {
  unloadDate = this.findNextAvailableDate(...);
}

// 特征 3: 多目标优化
const options = generateCandidates();
const best = minimizeCost(options);
```

**分析步骤**：

1. 绘制日期依赖关系图
2. 找出约束条件（产能、时间窗口）
3. 识别优化目标（成本最低、时间最早）

**文档输出要点**：

- 用箭头图表示日期链依赖
- 列出所有约束条件公式
- 展示产能不足时的顺延逻辑

### 状态机逻辑分析

**识别特征**：

```typescript
// 特征 1: 优先级判断
if (emptyReturnDate) return "returned_empty"; // 优先级 1
if (wmsUnloaded) return "unloaded"; // 优先级 2
if (pickupDate) return "picked_up"; // 优先级 3
if (ataDestPort) return "at_port"; // 优先级 4
// ...

// 特征 2: 状态映射
const statusMap = {
  FEITUO_100: "at_port",
  FEITUO_200: "picked_up",
};
```

**分析步骤**：

1. 列出所有状态枚举值
2. 标注每个状态的触发条件
3. 画出状态转换图

**文档输出要点**：

- 状态优先级表格（1-7）
- 状态与计算模式关联表
- 飞驼 API 状态码映射表

## 质量检查清单

生成文档后，必须逐项检查：

### 一致性检查（Critical）

- [ ] 所有表名与 `backend/03_create_tables.sql` 一致
- [ ] 所有字段名与数据库定义一致（snake_case）
- [ ] 计算公式与源代码完全吻合
- [ ] 参数值在合理范围内（如免费天数 5-14 天）

### 完整性检查（Required）

- [ ] 覆盖所有主要计算分支
- [ ] 包含至少 1 个边界条件场景
- [ ] 包含至少 1 个异常场景
- [ ] 提供了对比表格（如存在多模式）

### 格式检查（Required）

- [ ] 无 Emoji 表情（检查正则：`[\u{1F300}-\u{1F9FF}]`）
- [ ] 表格对齐整齐
- [ ] 代码块标注语言（```typescript）
- [ ] 权威来源路径准确可访问

### 可追溯性检查（Recommended）

- [ ] 每个公式都能对应到源代码行
- [ ] 每个参数都标注了数据来源
- [ ] 每个场景都有手工验算过程

## 特殊场景处理

### 场景 A: 代码分散在多个文件

**问题**：计算逻辑不在单一方法中，而是分散调用。

**解决方案**：

1. **绘制调用链**：

   ```mermaid
   graph LR
     A[Controller.calculateFee] --> B[Service.calculate]
     B --> C[Calculator.getChargeDays]
     B --> D[Repository.getRate]
   ```

2. **分章节说明**：

   ```markdown
   ### 3.1 收费天数计算

   [说明 getChargeDays 逻辑]

   ### 3.2 费率查找逻辑

   [说明 getRate 逻辑]

   ### 3.3 总费用计算

   [说明主方法如何组合前两者]
   ```

### 场景 B: 涉及外部 API 数据

**问题**：计算依赖飞驼 API 或其他外部数据源。

**解决方案**：

1. **提供字段映射表**：

   ```markdown
   | 外部字段    | 本地字段         | 转换规则                  |
   | ----------- | ---------------- | ------------------------- |
   | status_code | logistics_status | StatusMapping.translate() |
   | ata_time    | ata_dest_port    | 直接映射                  |
   ```

2. **说明数据更新频率**：
   - 实时同步（每次请求拉取）
   - 定时同步（每小时/每天）
   - 事件触发（货柜状态变更时）

### 场景 C: 存在历史遗留逻辑

**问题**：代码中包含兼容旧数据的特殊处理。

**解决方案**：

1. **标注新旧逻辑**：

   ```markdown
   ### 新逻辑（2026-01-01 后）

   [说明新计算方式]

   ### 旧逻辑（兼容历史数据）

   [说明为什么需要兼容，何时可以移除]
   ```

2. **提供迁移时间表**：
   - 旧逻辑保留至：2026-06-30
   - 预计移除时间：2026-07-01

## 注意事项

1. **禁止编造数据**：所有场景参数必须有业务依据或合理假设
2. **单位统一**：金额用 USD，日期用 YYYY-MM-DD，天数用"天"
3. **边界显式**：明确标注"包含本日"还是"不包含本日"
4. **代码版本**：基于最新代码生成，如代码更新需重新生成文档
5. **验算必须**：每个场景必须手工验算并保留计算过程

## 相关技能

- `logix-development`: LogiX 系统开发规范
- `fix-verification`: 代码修改前必须验证权威来源
- `database-query`: 数据库查询和表结构分析
- `code-review`: 代码审查和质量检查
