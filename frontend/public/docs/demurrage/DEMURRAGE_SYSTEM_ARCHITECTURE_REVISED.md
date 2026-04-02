# 滞港费计算系统完整架构与数据流（修订版）

## 修订记录

| 版本 | 日期 | 修订内容 | 依据 |
|------|------|----------|------|
| v1.0 | 2026-04-02 | 初始版本 | - |
| v1.1 | 2026-04-02 | 根据代码一致性评审修正事实错误和遗漏 | `backend/src/routes/demurrage.routes.ts`, `demurrage.service.ts` |

### 主要修订点

1. **API 路由方法修正**：`GET /batch-write-back` → `POST /batch-write-back`
2. **补充缺失的 API**：`POST /batch-compute-records`、`POST /standards`
3. **修正实际提柜日字段来源**：`process_port_operations.pickup_date` → `process_trucking_transport.pickup_date`
4. **明确 `getContainerMatchParams` 为内部方法**：`private async`
5. **修正工作日判断字符串**：`'工作 + 自然'` → `'工作 + 自然'`（无空格）
6. **修正阶梯费率示例计算错误**：$1050 → $1150
7. **补充 `calculationDates.lastPickupDate` 的条件说明**
8. **修正 `plannedPickupDate` 注释错误**：`last_pickup_date` → `planned_pickup_date`
9. **补充 `ext_demurrage_records` 预计算记录表**
10. **明确写回 API 在 `container.ts` 而非 `demurrage.ts`**

---

## 1. 系统概述

### 1.1 业务目标

滞港费计算系统根据货柜的物流状态、时间节点和预设的收费标准，自动计算以下内容：

- **最晚提柜日 (LFD)**：避免产生滞港费的最后提柜日期
- **最晚还箱日 (LRD)**：避免产生滞箱费的最后还箱日期
- **费用明细**：按不同费用类型（滞港费、滞箱费、堆存费）逐项计算
- **费用汇总**：所有收费项的金额总和

### 1.2 核心概念

| 术语 | 英文 | 说明 |
|------|------|------|
| 滞港费 | Demurrage | 货物在港区内堆存产生的费用 |
| 滞箱费 | Detention | 超期使用集装箱产生的费用 |
| 堆存费 | Storage | 港区堆存服务费用 |
| 合并费用 | D&D (Demurrage & Detention) | 滞港费和滞箱费合并计费 |
| 免费期 | Free Period | 不产生费用的时间段 |
| 计费期 | Charge Period | 按阶梯费率计费的时间段 |
| 起算日 | Start Date | 免费期开始计算的基准日期 |
| 截止日 | End Date | 费用计算截止日期 |

---

## 2. 核心组件架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      前端展示层 (Frontend)                    │
├─────────────────────────────────────────────────────────────┤
│  DemurrageDetailSection.vue    # 详情区块（主导组件）         │
│  ├─ DemurrageCalculationPanel  # 计算结果面板                │
│  ├─ DemurrageCalculator        # 可复用计算器                 │
│  └─ DemurrageSummarySection    # 汇总统计                    │
└─────────────────────────────────────────────────────────────┘
                              ↕ API (REST)
┌─────────────────────────────────────────────────────────────┐
│                      后端服务层 (Backend)                     │
├─────────────────────────────────────────────────────────────┤
│  DemurrageController           # 控制器（路由入口）           │
│  ├─ GET  /calculate/:containerNumber                        │
│  ├─ GET  /standards                                         │
│  ├─ POST /standards          # 创建标准                      │
│  ├─ GET  /summary                                           │
│  ├─ GET  /top-containers                                    │
│  ├─ POST /batch-compute-records  # 批量预计算并写入记录      │
│  ├─ GET  /diagnose/:containerNumber                         │
│  ├─ POST /batch-write-back       # 批量写回免费日期          │
│  └─ POST /write-back/:containerNumber # 单条写回免费日期     │
├─────────────────────────────────────────────────────────────┤
│  DemurrageService              # 核心服务（业务逻辑）         │
│  ├─ calculateForContainer()    # 单柜计算                   │
│  ├─ matchStandards()           # 匹配收费标准               │
│  ├─ getContainerMatchParams()  # 获取计算参数 (private)     │
│  ├─ batchComputeAndSaveRecords() # 批量计算并写入 ext_demurrage_records │
│  └─ runManualFreeDateUpdate()  # 手动写回免费日期            │
├─────────────────────────────────────────────────────────────┤
│  工具函数模块                                                │
│  ├─ calculateSingleDemurrage() # 单项费用计算               │
│  ├─ addDays() / addWorkingDays() # 日期累加                 │
│  ├─ daysBetween() / workingDaysBetween() # 日期间隔          │
│  ├─ normalizeTiers()           # 阶梯费率标准化             │
│  ├─ freePeriodUsesWorkingDays() # 免费期是否工作日           │
│  ├─ chargePeriodUsesWorkingDays() # 计费期是否工作日         │
│  └─ isDetentionCharge() 等     # 费用类型判断               │
└─────────────────────────────────────────────────────────────┘
                              ↕ TypeORM
┌─────────────────────────────────────────────────────────────┐
│                      数据源层 (Database)                      │
├─────────────────────────────────────────────────────────────┤
│  ext_demurrage_standards       # 收费标准表                  │
│  ext_demurrage_records         # 滞港费计算记录表（预计算）   │
│  biz_containers                # 货柜主表                    │
│  process_sea_freight           # 海运流程表                  │
│  process_port_operations       # 港口操作表                  │
│  process_trucking_transport    # 拖卡运输表                  │
│  process_empty_return          # 还箱记录表                  │
│  biz_replenishment_orders      # 备货订单表                  │
│  dict_*                        # 字典表（港口/船公司等）       │
└─────────────────────────────────────────────────────────────┘
```

**关键说明**：

1. ✅ **API 方法修正**：`/batch-write-back`、`/standards`、`/batch-compute-records`、`/write-back/:containerNumber` 均为 **POST** 方法
2. ✅ **新增 `ext_demurrage_records`**：用于批量预计算和缓存，减少实时计算开销
3. ✅ **`getContainerMatchParams` 标记为 `private`**：仅服务内部使用，不对外暴露

---

## 3. 数据源层

### 3.1 核心数据库表

#### 3.1.1 `ext_demurrage_standards` - 收费标准表

**用途**：存储不同客户、港口、船公司的滞港费收费标准

**关键字段**：

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `id` | INTEGER | 主键 | 123 |
| `foreign_company_code` | VARCHAR | 客户编码（境外公司） | 'MH_UK' |
| `foreign_company_name` | VARCHAR | 客户名称 | 'MH UK LIMITED' |
| `destination_port_code` | VARCHAR | 目的港编码 | 'GBFXT' |
| `destination_port_name` | VARCHAR | 目的港名称 | 'FELIXSTOWE' |
| `shipping_company_code` | VARCHAR | 船公司编码 | 'CMA' |
| `shipping_company_name` | VARCHAR | 船公司名称 | 'CMA CGM' |
| `origin_forwarder_code` | VARCHAR | 起运港货代编码 | 'FORWARDER001' |
| `charge_type_code` | VARCHAR | 费用类型编码 | 'DEMURRAGE' |
| `charge_name` | VARCHAR | 费用名称 | '滞港费' |
| `free_days` | INTEGER | 免费天数 | 7 |
| `free_days_basis` | VARCHAR | 免费天数计算基础 | `'自然日'`/`'工作日'`/`'工作 + 自然'`/`'自然 + 工作'` |
| `calculation_basis` | VARCHAR | 起算口径 | `'按到港'`/`'按卸船'` |
| `rate_per_day` | DECIMAL | 单日费率（无阶梯时） | 50.00 |
| `tiers` | JSONB | 阶梯费率配置 | `[{"fromDay":1,"toDay":7,"ratePerDay":50}]` |
| `currency` | VARCHAR | 币种 | 'USD' |
| `is_chargeable` | CHAR | 是否收费 | **`'N'=收费`**，`'Y'=不收费` ⭐ |
| `effective_date` | DATE | 生效日期 | '2026-01-01' |
| `expiry_date` | DATE | 失效日期 | NULL |

**⭐ 重要**：`is_chargeable = 'N'` 表示**收费项**（参与计算），`'Y'` 表示不收费（跳过）

**阶梯费率格式** (`tiers` JSONB)：

```json
[
  {"fromDay": 1, "toDay": 7, "ratePerDay": 0},
  {"fromDay": 8, "toDay": 14, "ratePerDay": 50},
  {"fromDay": 15, "toDay": null, "ratePerDay": 100}
]
```

#### 3.1.2 `ext_demurrage_records` - 滞港费计算记录表

**用途**：存储批量预计算的结果，用于汇总统计和高费用货柜查询，避免重复计算

**关键字段**：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | INTEGER | 主键 |
| `container_number` | VARCHAR | 柜号 |
| `destination_port` | VARCHAR | 目的港 |
| `logistics_status` | VARCHAR | 物流状态 |
| `charge_type` | VARCHAR | 费用类型编码 |
| `charge_name` | VARCHAR | 费用名称 |
| `free_days` | INTEGER | 免费天数 |
| `charge_days` | INTEGER | 计费天数 |
| `charge_amount` | DECIMAL | 费用金额 |
| `currency` | VARCHAR | 币种 |
| `charge_status` | VARCHAR | `'TEMP'`=临时，`'FINAL'`=最终 |
| `computed_at` | TIMESTAMP | 计算时间 |

**使用场景**：

- ✅ `/api/v1/demurrage/summary` - 汇总统计优先读此表
- ✅ `/api/v1/demurrage/top-containers` - Top N 高费用货柜优先读此表
- ✅ 定时任务批量预计算（`POST /batch-compute-records`）

#### 3.1.3 物流流程表（用于提取时间节点）

| 表名 | 用途 | 关键日期字段 |
|------|------|--------------|
| `process_port_operations` | 港口操作记录 | `ata` (实际到港), `eta` (预计到港), `revised_eta` (修正 ETA), `dest_port_unload_date` (卸船日), `discharged_time` (卸船时间), `last_free_date` (最晚提柜日), `last_free_date_source` (LFD 来源：`'manual'`=手工) |
| `process_trucking_transport` | 拖卡运输记录 | `pickup_date` (**实际提柜**), `planned_pickup_date` (**计划提柜**), `last_pickup_date` (最晚提柜) |
| `process_empty_return` | 还箱记录 | `return_time` (实际还箱), `planned_return_date` (计划还箱), `last_return_date` (最晚还箱) |
| `biz_replenishment_orders` | 备货订单 | `actual_ship_date` (实际出运), `sell_to_country` (销往国家) |

**⭐ 关键修正**：

1. **实际提柜日来源**：`process_trucking_transport.pickup_date`（不是 `process_port_operations.pickup_date`，PortOperation 实体中无此字段）
2. **计划提柜日来源**：`process_trucking_transport.planned_pickup_date`（代码注释中的 `last_pickup_date` 为笔误）
3. **最晚提柜日条件**：仅当 `process_port_operations.last_free_date_source === 'manual'` 时才使用，否则为 NULL

### 3.2 数据获取流程

**`getContainerMatchParams()`** 方法负责从数据库提取计算所需的所有日期和维度信息

**可见性**：`private async`（仅服务内部使用，不对外暴露）

**返回结构**：

```typescript
async getContainerMatchParams(containerNumber: string): Promise<{
  // 四维匹配字段
  destinationPortCode: string | null;      // 目的港
  shippingCompanyCode: string | null;      // 船公司
  originForwarderCode: string | null;      // 起运港货代
  foreignCompanyCode: string | null;       // 客户/境外公司
  
  // 滞港费起算日
  startDate: Date | null;                  // ATA/ETA/卸船日
  startDateSource: string | null;          // `'ata'` | `'eta'` | `'discharged_time'` | `'dest_port_unload_date'` | `'process_sea_freight.eta'`
  
  // 滞港费截止日
  endDate: Date | null;                    // 实际提柜日或今天
  endDateSource: string | null;            // `'process_trucking_transport.pickup_date'` | `'当前日期'`
  
  // 滞箱费起止日
  detentionStartDate: Date | null;         // 提柜日
  detentionEndDate: Date | null;           // 还箱日或今天
  
  // 关键日期集合（calculationDates）
  calculationDates: {
    ataDestPort: Date | null;              // 目的港 ATA
    etaDestPort: Date | null;              // 目的港 ETA
    revisedEtaDestPort: Date | null;       // 修正 ETA
    dischargeDate: Date | null;            // 卸船日
    dischargeDateSource: string | null;    // `'dest_port_unload_date'` | `'discharged_time'`
    
    // ⭐ 最晚提柜日（仅在 last_free_date_source === 'manual' 时有值）
    lastPickupDate: Date | null;           // 从 process_port_operations.last_free_date（手工维护）
    lastPickupDateSource: string | null;   // `'process_port_operations.last_free_date (manual)'` | `'process_port_operations.last_free_date'` | `'process_trucking_transport.planned_pickup_date'`
    
    // 计划提柜日（用于预测模式）
    plannedPickupDate: Date | null;        // 从 process_trucking_transport.planned_pickup_date ⭐（非 last_pickup_date）
    
    // 其他日期
    pickupDateActual: Date | null;         // 实际提柜日
    returnTime: Date | null;               // 实际还箱日
    plannedReturnDate: Date | null;        // 计划还箱日
    today: Date;                           // 当前日期
  }
}>
```

**⭐ 关键说明**：

1. **`calculationDates.lastPickupDate`**：仅在 `last_free_date_source === 'manual'` 时有值，否则为 NULL
2. **`calculationDates.plannedPickupDate`**：来自 `process_trucking_transport.planned_pickup_date`（代码注释中的 `last_pickup_date` 为笔误）
3. **`startDateSource`**：可能值包括 `'ata'`, `'eta'`, `'discharged_time'`, `'dest_port_unload_date'`, `'process_sea_freight.eta'`
4. **`endDateSource`**：固定为 `'process_trucking_transport.pickup_date'` 或 `'当前日期'`

---

## 4. 逻辑计算层

### 4.1 核心计算引擎

#### 4.1.1 `calculateSingleDemurrage()` - 单项费用计算函数

**位置**：`backend/src/services/demurrage.service.ts#L307`

**职责**：根据给定的起止日期、免费天数和费率，计算单项费用

**入参**：

```typescript
{
  startDate: Date;        // 起算日
  endDate: Date;          // 截止日
  freeDays: number;       // 免费天数
  ratePerDay: number;     // 单日费率
  tiers: DemurrageTierDto[] | null;  // 阶梯费率
  currency: string;       // 币种
  freeDaysBasis?: string | null;      // 免费期计算基础
}
```

**计算步骤**：

1. **计算最晚免费日**
   ```typescript
   const n = Math.max(0, freeDays - 1);
   const lastFreeDate = freePeriodUsesWorkingDays(freeDaysBasis)
     ? addWorkingDays(startDate, n)  // 工作日模式
     : addDays(startDate, n);         // 自然日模式
   ```

2. **判断是否在免费期内**
   ```typescript
   if (endDate <= lastFreeDate) {
     return { lastFreeDate, chargeDays: 0, totalAmount: 0, tierBreakdown: [] };
   }
   ```

3. **计算计费天数**
   ```typescript
   const chargeStart = addDays(lastFreeDate, 1);
   const chargeDays = chargePeriodUsesWorkingDays(freeDaysBasis)
     ? workingDaysBetween(chargeStart, endDate)  // 工作日模式
     : daysBetween(chargeStart, endDate);         // 自然日模式
   ```

4. **按阶梯费率计算费用**
   ```typescript
   let currentDay = freeDays + 1;  // ✅ 关键：从免费期后的第一天开始
   for (const tier of sortedTiers) {
     const daysInTier = /* 计算该阶梯的天数 */;
     const subtotal = daysInTier * tier.ratePerDay;
     totalAmount += subtotal;
     tierBreakdown.push({ fromDay, toDay, days: daysInTier, ratePerDay, subtotal });
   }
   ```

**返回**：

```typescript
{
  lastFreeDate: Date;           // 免费期截止日
  chargeDays: number;           // 计费天数
  totalAmount: number;          // 总费用
  tierBreakdown: Array<{        // 阶梯明细
    fromDay: number;
    toDay: number;
    days: number;
    ratePerDay: number;
    subtotal: number;
  }>
}
```

### 4.2 费用类型识别

系统通过以下函数判断费用类型，决定计算区间：

| 函数 | 判断条件 | 计算区间 |
|------|----------|----------|
| `isDemurrageCharge(std)` | 纯滞港费 | 到港/卸船 → 实际提柜/今天 |
| `isDetentionCharge(std)` | 纯滞箱费 | 实际提柜 → 实际还箱/今天 |
| `isStorageCharge(std)` | 堆存费 | 到港/卸船/ETA → 实际提柜/计划提柜 |
| `isCombinedDemurrageDetention(std)` | 合并 D&D | 到港/卸船/ETA → 实际还箱/计划还箱 |

### 4.3 计算模式判定 (actual vs forecast)

**核心规则**：通过物流状态机判断是否到达目的港

```typescript
// 第一步：状态机判定
const logisticsSnapshot = await this.getLogisticsStatusSnapshot(containerNumber);
const arrivedAtDestinationPort = logisticsSnapshot
  ? isArrivedAtDestinationPortForDemurrage(logisticsSnapshot)
  : false;

const calculationMode: 'actual' | 'forecast' = arrivedAtDestinationPort ? 'actual' : 'forecast';
```

**判定标准**：

| 状态 | 模式 | 说明 |
|------|------|------|
| `PICKED_UP` (已提柜) | actual | 已进入提柜环节 |
| `UNLOADED` (已卸柜) | actual | 已在目的港卸柜 |
| `RETURNED_EMPTY` (已还箱) | actual | 已完成还箱 |
| `AT_PORT` + `destination` (在目的港) | actual | 已到目的港 |
| 其他状态 | forecast | 未到达目的港，使用预测逻辑 |

### 4.4 工作日判断规则 ⭐ 修正

**免费期和计费期是否按工作日计算**：

```typescript
// backend/src/services/demurrage.service.ts#L288-L301

/** 免费期是否按工作日（周六、周日不计入） */
function freePeriodUsesWorkingDays(basis: string | null | undefined): boolean {
  const b = (basis ?? '').toLowerCase();
  return (
    b.includes('工作+自然') ||      // ⭐ 注意：无空格
    b.includes('natural+working') || 
    b === '工作日' || 
    b === 'working'
  );
}

/** 计费期是否按工作日 */
function chargePeriodUsesWorkingDays(basis: string | null | undefined): boolean {
  const b = (basis ?? '').toLowerCase();
  return (
    b.includes('自然+工作') ||      // ⭐ 注意：无空格
    b.includes('working+natural') || 
    b === '工作日' || 
    b === 'working'
  );
}
```

**⭐ 重要**：数据库中应使用 **`'工作 + 自然'`**（无空格），而非 `'工作 + 自然'`（带空格）

**支持的 `free_days_basis` 值**：

| 值 | 免费期 | 计费期 |
|----|--------|--------|
| `'自然日'` | 自然日 | 自然日 |
| `'工作日'` | 工作日（排除周末） | 工作日（排除周末） |
| `'工作 + 自然'` | 工作日（排除周末） | 自然日 |
| `'自然 + 工作'` | 自然日 | 工作日（排除周末） |

---

## 5. 计算流程详解

### 5.1 完整计算流程图

```
用户请求 /api/v1/demurrage/calculate/:containerNumber
    ↓
DemurrageController.calculateForContainer()
    ↓
DemurrageService.calculateForContainer()
    │
    ├─ 步骤 1: 获取货柜参数
    │   └─ getContainerMatchParams(containerNumber) [private]
    │       ├─ 查询 Container 主表
    │       ├─ 查询 PortOperation (目的港 ATA/ETA/卸船日/LFD)
    │       ├─ 查询 TruckingTransport (实际/计划提柜日) ⭐
    │       ├─ 查询 EmptyReturn (实际/计划还箱日)
    │       └─ 查询 ReplenishmentOrder (出运日/销往国家)
    │
    ├─ 步骤 2: 状态机判定计算模式
    │   └─ calculateLogisticsStatus() → actual | forecast
    │
    ├─ 步骤 3: 匹配收费标准
    │   └─ matchStandards(containerNumber)
    │       ├─ 查询 ext_demurrage_standards
    │       ├─ 过滤 is_chargeable = 'N' (收费项) ⭐
    │       ├─ 四字段匹配（客户、港口、船公司、货代）
    │       ├─ 有效期匹配（effective_date <= today <= expiry_date）
    │       └─ 返回匹配的标准列表
    │
    ├─ 步骤 4: 确定最晚提柜日/还箱日
    │   ├─ LFD = 起算日 + (min(滞港/堆存/D&D 免费天数) - 1)
    │   └─ LRD = 提柜日 + (min(D&D/滞箱免费天数) - 1)
    │
    ├─ 步骤 5: 逐项计算费用
    │   for each standard in matchedStandards:
    │       ├─ 确定费用类型（滞港/滞箱/堆存/D&D）
    │       ├─ 确定计算区间 [rangeStart, rangeEnd]
    │       ├─ 调用 calculateSingleDemurrage()
    │       │   ├─ 计算 lastFreeDate
    │       │   ├─ 计算 chargeDays
    │       │   ├─ 按阶梯计算 amount
    │       │   └─ 返回 { lastFreeDate, chargeDays, amount, tierBreakdown }
    │       └─ 添加到 items 数组
    │
    ├─ 步骤 6: 写回免费日期（可选）
    │   ├─ 更新 process_port_operations.last_free_date
    │   └─ 更新 process_empty_return.last_return_date
    │
    └─ 步骤 7: 返回结果
        {
          containerNumber: 'CNTR001',
          calculationMode: 'actual',
          calculationDates: { ... },
          matchedStandards: [...],
          items: [...],
          skippedItems: [...],
          totalAmount: 1234.56,
          currency: 'USD',
          keyTimeline: { ... },
          logisticsStatusSnapshot: { ... },
          dateOrderWarnings: [...]
        }
```

### 5.2 各费用类型计算区间对照表

| 费用类型 | 模式 | 起算日 | 截止日 | 依赖字段 |
|----------|------|--------|--------|----------|
| **滞港费** | actual | ATA 或卸船日 | **实际提柜日或今天** | `process_trucking_transport.pickup_date` ⭐ |
| **滞港费** | forecast | ETA 或修正 ETA | max(计划提柜日，今天) | `process_trucking_transport.planned_pickup_date` |
| **滞箱费** | actual | 实际提柜日 | 实际还箱日或今天 | `process_empty_return.return_time` |
| **滞箱费** | forecast | 计划提柜日 | max(计划还箱日，今天) | `process_empty_return.planned_return_date` |
| **堆存费** | actual | ATA 或卸船日 | 实际提柜日或今天 | `process_trucking_transport.pickup_date` ⭐ |
| **堆存费** | forecast | ETA 或修正 ETA | max(计划提柜日，今天) | `process_trucking_transport.planned_pickup_date` |
| **D&D 合并** | actual | ATA 或卸船日 | 实际还箱日或今天 | `process_empty_return.return_time` |
| **D&D 合并** | forecast | ETA 或修正 ETA | max(计划还箱日，今天) | `process_empty_return.planned_return_date` |

**⭐ 关键修正**：实际提柜日依赖 `process_trucking_transport.pickup_date`，而非 `process_port_operations.pickup_date`（PortOperation 实体中无此字段）

### 5.3 日期计算示例 ⭐ 修正

**场景**：滞港费计算，免费 7 天（自然日），统一费率 $50/天

```
已知:
- 起算日 (ATA): 2026-03-01
- 截止日 (实际提柜): 2026-03-15
- 免费天数：7 天
- 费率：$50/天

计算步骤:
1. 最晚免费日 = 2026-03-01 + (7 - 1) = 2026-03-07
2. 计费起始日 = 2026-03-08 (免费期次日)
3. 计费天数 = 2026-03-15 - 2026-03-08 + 1 = 8 天
4. 总费用 = 8 × $50 = $400
```

**带阶梯费率（修正版）** ⭐：

```
已知:
- 起算日：2026-03-01
- 截止日：2026-03-22 (21 天)
- 免费天数：7 天
- 阶梯费率:
  - 第 1-7 天：免费
  - 第 8-14 天：$50/天
  - 第 15 天起：$100/天

计算:
1. 最晚免费日 = 2026-03-07
2. 计费天数 = 21 - 7 = 14 天
3. 由于 currentDay = freeDays + 1 = 8（从第 8 天开始计费）
   - 第 8-14 天：7 天 × $50 = $350
   - 第 15-21 天：7 天 × $100 = $700
4. 总费用 = $350 + $700 = $1050

❌ 错误：截止日 3/22 仍属计费日，应再计 1 天 × $100
✅ 正确：
   - 第 8-14 天：7 天 × $50 = $350
   - 第 15-21 天：7 天 × $100 = $700
   - 第 22 天：1 天 × $100 = $100
   - 总费用 = $350 + $700 + $100 = $1150
```

**验证**：
- 免费期：3/1 - 3/7（7 天）
- 计费期：3/8 - 3/22（15 天）
- 阶梯：
  - 第 8-14 天（7 天）× $50 = $350
  - 第 15-21 天（7 天）× $100 = $700
  - 第 22 天（1 天）× $100 = $100
- **总计：$1150** ✅

---

## 6. 前端展示层

### 6.1 核心组件

#### 6.1.1 `DemurrageDetailSection.vue` - 详情区块（主导组件）

**位置**：`frontend/src/components/demurrage/DemurrageDetailSection.vue`

**职责**：

- 调用后端 API 获取计算结果
- 展示匹配标准列表
- 展示每项费用计算明细
- 错误提示与诊断

**关键代码**：

```vue
<script setup lang="ts">
const props = defineProps<{
  containerNumber: string
  calculationData?: DemurrageCalculationResponse['data'] | null
}>()

const loading = ref(false)
const data = ref<DemurrageCalculationResponse['data'] | null>(null)

async function load() {
  loading.value = true
  try {
    const response = await demurrageService.calculateForContainer(props.containerNumber)
    data.value = response.data || null
    
    // 处理错误情况
    if (!response.data) {
      currentReason.value = response.reason as any
      emptyMessage.value = ERROR_MESSAGES[response.reason!]
    }
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}
</script>
```

#### 6.1.2 `DemurrageCalculationPanel.vue` - 计算结果面板

**位置**：`frontend/src/components/demurrage/DemurrageCalculationPanel.vue`

**职责**：可视化展示计算结果（匹配标准 → 单项计算 → 汇总）

**展示内容**：

1. **匹配标准信息**
   - 客户、目的港、船公司、货代
   - 免费天数、免费期计算基础
   - 费率配置（单日费率或阶梯费率）

2. **费用计算明细**
   - 起算日、截止日、来源
   - 免费期截止日
   - 计费天数
   - 金额、币种
   - 阶梯明细表格

3. **汇总信息**
   - 已计费项数量
   - 暂不计算项数量
   - 总金额

#### 6.1.3 `DemurrageCalculator.vue` - 可复用计算器

**位置**：`frontend/src/components/demurrage/DemurrageCalculator.vue`

**特点**：

- 支持传入货柜数据或显式参数
- 内置前端计算逻辑（`useDemurrageCalculation`）
- 适用于列表页、卡片等轻量场景

#### 6.1.4 `DemurrageSummarySection.vue` - 汇总统计

**位置**：`frontend/src/components/demurrage/DemurrageSummarySection.vue`

**职责**：展示滞港费汇总统计（总金额、货柜数量、平均费用等）

### 6.2 前端服务 ⭐ 修正

#### `demurrageService` - 滞港费 API 服务

**位置**：`frontend/src/services/demurrage.ts`

**主要方法**：

```typescript
class DemurrageService {
  // 单柜计算
  async calculateForContainer(containerNumber: string): Promise<DemurrageCalculationResponse>
  
  // 获取收费标准列表
  async getStandards(params?: { port?: string, shippingCompany?: string }): Promise<...>
  
  // 汇总统计
  async getSummary(params?: { startDate?: string, endDate?: string }): Promise<...>
  
  // 高费用货柜 Top N
  async getTopContainers(params?: { topN?: number }): Promise<...>
  
  // 诊断匹配失败原因
  async diagnoseMatch(containerNumber: string): Promise<...>
  
  // ⭐ 注意：以下方法在 container.ts 中，不在 demurrage.ts 中
  // async batchWriteBack(params?: { limit_last_free?: number, limit_last_return?: number }): Promise<...>
  // async writeBackSingleContainer(containerNumber: string): Promise<...>
}
```

**⭐ 重要修正**：

- **批量写回 API**（`POST /demurrage/batch-write-back`）在 `frontend/src/services/container.ts` 中，**不在** `demurrage.ts` 中
- **单条写回 API**（`POST /demurrage/write-back/:containerNumber`）同样在 `container.ts` 中

#### `containerService` - 货柜综合服务（包含写回 API）

**位置**：`frontend/src/services/container.ts`

**写回相关方法**：

```typescript
class ContainerService {
  /**
   * POST /api/v1/demurrage/batch-write-back
   * 批量写回最晚提柜日/最晚还箱日
   */
  async batchWriteBackDemurrage(params?: { 
    limit_last_free?: number, 
    limit_last_return?: number 
  }): Promise<...> {
    const response = await this.api.post('/demurrage/batch-write-back', params || {})
    return response.data
  }
  
  /**
   * POST /api/v1/demurrage/write-back/:containerNumber
   * 单条货柜免费日更新
   */
  async writeBackDemurrageSingle(containerNumber: string): Promise<...> {
    const response = await this.api.post(
      `/demurrage/write-back/${encodeURIComponent(containerNumber)}`
    )
    return response.data
  }
}
```

### 6.3 数据类型定义

```typescript
interface DemurrageCalculationResponse {
  success: boolean
  data?: {
    containerNumber: string
    calculationMode: 'actual' | 'forecast'
    startDate: string
    endDate: string
    calculationDates: {
      ataDestPort?: string | null
      etaDestPort?: string | null
      lastPickupDate?: string | null           // ⭐ 仅在 manual 时有值
      lastPickupDateComputed?: string | null   // ⭐ 计算得出的 LFD
      plannedPickupDate?: string | null
      pickupDateActual?: string | null
      // ...
    }
    matchedStandards: Array<{
      id: number
      chargeName: string
      freeDays: number
      freeDaysBasis?: string
      ratePerDay?: number
      tiers?: Array<{ fromDay: number; toDay: number | null; ratePerDay: number }>
      currency: string
    }>
    items: Array<{
      standardId: number
      chargeName: string
      freeDays: number
      startDate: string
      endDate: string
      lastFreeDate: string
      chargeDays: number
      amount: number
      currency: string
      tierBreakdown: Array<{
        fromDay: number
        toDay: number
        days: number
        ratePerDay: number
        subtotal: number
      }>
    }>
    skippedItems?: Array<{
      standardId: number
      chargeName: string
      reasonCode: string
      reason: string
    }>
    totalAmount: number
    currency: string
    // ⭐ 新增字段（文档 v1.1 补充）
    keyTimeline?: KeyTimelineResult
    logisticsStatusSnapshot?: {
      status: string
      reason: string
      arrivedAtDestinationPort: boolean
      currentPortType: 'origin' | 'transit' | 'destination' | null
    }
    dateOrderWarnings?: string[]
  }
  reason?: 'no_arrival_at_dest' | 'missing_dates' | 'no_matching_standards' | 
           'missing_pickup_date_actual' | 'missing_planned_pickup_date' |
           'missing_eta_combined_forecast' | 'missing_arrival_for_combined_actual' |
           'missing_eta_storage_forecast' | 'missing_arrival_storage_actual'
}
```

---

## 7. 特别事项与易错点

### 7.1 关键业务规则

#### 7.1.1 免费期计算规则

**规则**：免费期结束日 = 起算日 + (免费天数 - 1)

**原因**：起算日当天算第 1 天

```typescript
// ✅ 正确
const lastFreeDate = addDays(startDate, freeDays - 1);

// ❌ 错误（会多算 1 天）
const lastFreeDate = addDays(startDate, freeDays);
```

#### 7.1.2 计费天数起始点

**规则**：计费从免费期结束后的**第 1 天**开始

```typescript
// ✅ 关键修复：currentDay 从 freeDays + 1 开始
let currentDay = freeDays + 1;

// 例如：免费 7 天，计费从第 8 天开始
```

**影响**：阶梯费率计算必须遵循此规则，否则会将第 1-7 天重复计入阶梯

#### 7.1.3 工作日 vs 自然日 ⭐ 修正

**规则**：

| freeDaysBasis | 免费期计算 | 计费期计算 |
|---------------|------------|------------|
| `'自然日'` | 自然日累加 | 自然日累加 |
| `'工作日'` | 排除周六、周日 | 排除周六、周日 |
| `'工作 + 自然'` | 工作日累加 | 自然日累加 |
| `'自然 + 工作'` | 自然日累加 | 工作日累加 |

**实现**：

```typescript
function freePeriodUsesWorkingDays(basis: string | null | undefined): boolean {
  const b = (basis ?? '').toLowerCase();
  return (
    b.includes('工作+自然') ||      // ⭐ 注意：无空格
    b.includes('natural+working') || 
    b === '工作日' || 
    b === 'working'
  );
}

function chargePeriodUsesWorkingDays(basis: string | null | undefined): boolean {
  const b = (basis ?? '').toLowerCase();
  return (
    b.includes('自然+工作') ||      // ⭐ 注意：无空格
    b.includes('working+natural') || 
    b === '工作日' || 
    b === 'working'
  );
}
```

**⭐ 重要**：数据库中应使用 **`'工作 + 自然'`**（无空格），而非 `'工作 + 自然'`（带空格），否则 `includes()` 无法命中

### 7.2 常见错误与解决方案

#### 错误 1：货币配置错误

**现象**：滞港费显示为 USD，但实际应为销往国货币（如 GBP）

**原因**：未从 `biz_customers` 或 `dict_overseas_companies` 获取正确的货币配置

**解决方案**：

```typescript
// 货币优先级
const standardCurrency = std.currency ?? null;         // 1. 标准配置货币
const defaultCurrency = await getContainerCurrency();  // 2. 销往国货币
const curr = standardCurrency || defaultCurrency || 'USD'; // 3. USD 兜底
```

#### 错误 2：时间解析不一致

**现象**：前端计算与后端结果相差 1 天

**原因**：时区处理不一致（UTC vs Local）

**解决方案**：

```typescript
// ✅ 统一使用 Date-only 模式（忽略时分秒）
function toDateOnly(d: Date | string): Date {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// ❌ 避免直接比较带时区的 Date 对象
if (endDate <= lastFreeDate) { ... }
```

#### 错误 3：is_chargeable 字段理解错误

**误解**：认为 `is_chargeable = 'Y'` 表示收费

**真相**：

| is_chargeable | 含义 | 是否参与计算 |
|---------------|------|--------------|
| `'N'` | Not Chargeable (收费项) | ✅ 是 |
| `'Y'` | Yes, Free (不收费) | ❌ 否 |

**代码体现**：

```typescript
// 过滤收费项
const allChargeable = await this.standardRepo
  .createQueryBuilder('s')
  .where('s.is_chargeable = :chargeable', { chargeable: 'N' }) // N=收费
  .getMany();
```

### 7.3 性能优化建议

#### 7.3.1 缓存策略

**场景**：批量计算时重复查询相同的收费标准

**方案**：使用 `CacheService` 缓存全量标准列表（24 小时）

```typescript
private async getAllActiveStandards(): Promise<ExtDemurrageStandard[]> {
  const cacheKey = SchedulingCacheKeys.DEMURRAGE_ALL_STANDARDS;
  
  let allStandards = await this.cacheService.get<ExtDemurrageStandard[]>(cacheKey);
  if (!allStandards) {
    allStandards = await this.standardRepo.find({ order: { sequenceNumber: 'ASC' } });
    await this.cacheService.set(cacheKey, allStandards, SchedulingCacheTTL.DEMURRAGE_STANDARD);
  }
  
  return allStandards;
}
```

#### 7.3.2 并发控制

**场景**：批量计算 Top 100 货柜

**方案**：限制并发数为 10，避免数据库连接池耗尽

```typescript
const CONCURRENCY = 10;
for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
  const batch = toProcess.slice(i, i + CONCURRENCY);
  const batchResults = await Promise.all(batch.map(cn => this.calculateForContainer(cn)));
  // 处理结果...
}
```

### 7.4 调试技巧

#### 7.4.1 启用调试日志

```typescript
// backend/src/utils/logger.ts
logger.debug('[Demurrage] Charge days calculation:', {
  lastFreeDate,
  endDate,
  freeDaysBasis,
  chargeStart,
  chargeDays,
  isWorkingDaysOnly
});

// ⭐ 注：阶梯相关日志多为 logger.info
logger.info(`[Demurrage] Tier calculation:`, {
  freeDays,
  chargeDays,
  currentDay,
  tiers: sorted.map((t) => ({
    fromDay: t.fromDay,
    toDay: t.toDay,
    ratePerDay: t.ratePerDay
  }))
});
```

#### 7.4.2 诊断匹配失败

**API**：`GET /api/v1/demurrage/diagnose/:containerNumber`

**返回**：

```json
{
  "containerParams": {
    "destinationPortCode": "GBFXT",
    "shippingCompanyCode": "CMA",
    "resolvedForMatch": { ... }
  },
  "standardsTotal": 50,
  "standardsAfterEffectiveDate": 45,
  "excludedByIsChargeable": 5,
  "standardsAfterFourFieldMatch": 3,
  "allStandardsSample": [
    {
      "id": 123,
      "destinationPortCode": "USLAX",
      "excludeReasons": ["目的港不匹配：货柜=GBFXT 标准=USLAX"]
    }
  ]
}
```

---

## 8. 快速参考表

### 8.1 核心文件路径

| 文件 | 路径 | 用途 |
|------|------|------|
| **后端核心服务** | `backend/src/services/demurrage.service.ts` | 主计算逻辑 |
| **后端控制器** | `backend/src/controllers/demurrage.controller.ts` | API 入口 |
| **后端路由** | `backend/src/routes/demurrage.routes.ts` | 路由定义 |
| **前端服务** | `frontend/src/services/demurrage.ts` | API 调用封装（不含写回） |
| **前端写回服务** | `frontend/src/services/container.ts` | 批量/单条写回 API ⭐ |
| **前端主导组件** | `frontend/src/components/demurrage/DemurrageDetailSection.vue` | 详情页展示 |
| **前端计算面板** | `frontend/src/components/demurrage/DemurrageCalculationPanel.vue` | 结果可视化 |
| **前端可复用组件** | `frontend/src/components/demurrage/DemurrageCalculator.vue` | 轻量计算器 |
| **前端汇总组件** | `frontend/src/components/demurrage/DemurrageSummarySection.vue` | 汇总统计 |
| **前端组合式** | `frontend/src/composables/useDemurrageCalculation.ts` | 前端计算逻辑 |
| **实体定义** | `backend/src/entities/ExtDemurrageStandard.ts` | 收费标准实体 |
| **工具函数** | `backend/src/utils/demurrageTiers.ts` | 阶梯费率处理 |

### 8.2 关键 API 接口 ⭐ 修正

| 方法 | 路径 | 说明 | 超时 |
|------|------|------|------|
| GET | `/api/v1/demurrage/calculate/:containerNumber` | 单柜计算 | 默认 |
| GET | `/api/v1/demurrage/standards` | 获取收费标准列表 | 默认 |
| POST | `/api/v1/demurrage/standards` | 创建收费标准 ⭐ | 默认 |
| GET | `/api/v1/demurrage/summary` | 汇总统计 | 90s |
| GET | `/api/v1/demurrage/top-containers` | 高费用货柜 Top N | 90s |
| POST | `/api/v1/demurrage/batch-compute-records` ⭐ | 批量预计算并写入 ext_demurrage_records | 90s |
| GET | `/api/v1/demurrage/diagnose/:containerNumber` | 诊断匹配失败 | 默认 |
| POST | `/api/v1/demurrage/batch-write-back` ⭐ | 批量写回免费日期（在 `container.ts` 中） | 90s |
| POST | `/api/v1/demurrage/write-back/:containerNumber` ⭐ | 单条写回免费日期（在 `container.ts` 中） | 默认 |

**⭐ 关键修正**：

1. `/batch-write-back`、`/standards`、`/batch-compute-records`、`/write-back/:containerNumber` 均为 **POST** 方法
2. 批量写回和单条写回 API 在 `frontend/src/services/container.ts` 中，**不在** `demurrage.ts` 中

### 8.3 关键业务公式

| 项目 | 公式 | 说明 |
|------|------|------|
| **最晚免费日** | `startDate + (freeDays - 1)` | 起算日算第 1 天 |
| **计费起始日** | `lastFreeDate + 1` | 免费期次日 |
| **计费天数** | `daysBetween(chargeStart, endDate)` | 含起止 |
| **工作日免费期** | `addWorkingDays(startDate, freeDays - 1)` | 排除周末 |
| **阶梯计费** | `Σ(daysInTier × ratePerDay)` | 逐段累加 |

### 8.4 决策树速查

**是否到达目的港？**

```
查看物流状态
  ├─ PICKED_UP / UNLOADED / RETURNED_EMPTY → actual 模式
  ├─ AT_PORT + destination → actual 模式
  └─ 其他 → forecast 模式
```

**选择起算日？**

```
按标准 calculationBasis:
  ├─ 「按卸船」→ dischargeDate
  └─ 「按到港」→ 
       ├─ actual 模式 → ATA 优先，无则卸船日
       └─ forecast 模式 → ATA 优先，无则卸船日，再无则 ETA/修正 ETA
```

**货币选择优先级？**

```
1. 收费标准配置的 currency
2. 销往国家对应的货币（从 biz_customers 或 dict_overseas_companies）
3. USD 兜底
```

**工作日判断？**

```
free_days_basis 值:
  ├─ '自然日' → 免费期和计费期都按自然日
  ├─ '工作日' → 免费期和计费期都按工作日（排除周末）
  ├─ '工作 + 自然' → 免费期按工作日，计费期按自然日 ⭐
  └─ '自然 + 工作' → 免费期按自然日，计费期按工作日 ⭐

注意：数据库中勿在加号两侧加空格！
```

---

## 附录 A：测试用例示例

### A.1 单元测试（后端）

```typescript
describe('calculateSingleDemurrage', () => {
  it('应该计算统一费率的费用', () => {
    const result = calculateSingleDemurrage(
      new Date('2026-03-01'),  // startDate
      new Date('2026-03-15'),  // endDate
      7,                       // freeDays
      50,                      // ratePerDay
      null,                    // tiers
      'USD',                   // currency
      '自然日'                  // freeDaysBasis
    );
    
    expect(result.lastFreeDate).toEqual(new Date('2026-03-07'));
    expect(result.chargeDays).toBe(8);
    expect(result.totalAmount).toBe(400); // 8 * 50
  });
  
  it('应该计算阶梯费率的费用（修正版）', () => {
    const tiers = [
      { fromDay: 1, toDay: 7, ratePerDay: 0 },
      { fromDay: 8, toDay: 14, ratePerDay: 50 },
      { fromDay: 15, toDay: null, ratePerDay: 100 }
    ];
    
    const result = calculateSingleDemurrage(
      new Date('2026-03-01'),
      new Date('2026-03-22'),  // 21 天
      7,
      0,
      tiers,
      'USD',
      '自然日'
    );
    
    // 免费期：3/1 - 3/7
    // 计费期：3/8 - 3/22 = 15 天
    // 由于 currentDay = freeDays + 1 = 8（从第 8 天开始计费）
    // 第 8-14 天：7 天 * 50 = 350
    // 第 15-21 天：7 天 * 100 = 700
    // 第 22 天：1 天 * 100 = 100
    expect(result.totalAmount).toBe(1150); // ✅ 修正：$1150
  });
});
```

---

## 附录 B：SQL 查询示例

### B.1 查询某客户的所有有效收费标准

```sql
SELECT 
  s.id,
  s.charge_name,
  s.charge_type_code,
  s.free_days,
  s.free_days_basis,
  s.calculation_basis,
  s.rate_per_day,
  s.tiers,
  s.currency,
  s.effective_date,
  s.expiry_date
FROM ext_demurrage_standards s
WHERE s.is_chargeable = 'N'  -- N=收费项 ⭐
  AND (s.effective_date IS NULL OR s.effective_date <= CURRENT_DATE)
  AND (s.expiry_date IS NULL OR s.expiry_date >= CURRENT_DATE)
  AND (
    s.foreign_company_code = 'MH_UK' 
    OR s.destination_port_code = 'GBFXT'
    OR s.shipping_company_code = 'CMA'
  )
ORDER BY s.sequence_number ASC, s.id ASC;
```

### B.2 查询货柜的关键日期

```sql
SELECT 
  c.container_number,
  po.ata AS dest_ata,
  po.eta AS dest_eta,
  po.revised_eta,
  po.dest_port_unload_date,
  po.discharged_time,
  po.last_free_date,
  po.last_free_date_source,  -- 'manual' 表示手工维护
  tt.pickup_date,            -- ⭐ 实际提柜日
  tt.planned_pickup_date,    -- ⭐ 计划提柜日
  er.return_time,
  er.planned_return_date,
  ro.actual_ship_date
FROM biz_containers c
LEFT JOIN process_port_operations po 
  ON c.container_number = po.container_number AND po.port_type = 'destination'
LEFT JOIN process_trucking_transport tt 
  ON c.container_number = tt.container_number
LEFT JOIN process_empty_return er 
  ON c.container_number = er.container_number
LEFT JOIN biz_replenishment_orders ro 
  ON c.container_number = ro.container_number
WHERE c.container_number = 'CNTR001';
```

---

## 修订总结

本次修订基于代码一致性评审，修正了以下关键问题：

1. ✅ **API 路由方法修正**：`GET` → `POST`（`/batch-write-back`、`/standards`、`/batch-compute-records`、`/write-back/:containerNumber`）
2. ✅ **补充缺失的 API**：新增 `POST /standards`、`POST /batch-compute-records`
3. ✅ **修正实际提柜日字段来源**：`process_port_operations.pickup_date` → `process_trucking_transport.pickup_date`
4. ✅ **明确 `getContainerMatchParams` 为内部方法**：标记为 `private async`
5. ✅ **修正工作日判断字符串**：`'工作 + 自然'`（带空格）→ `'工作 + 自然'`（无空格）
6. ✅ **修正阶梯费率示例计算错误**：$1050 → $1150
7. ✅ **补充 `calculationDates.lastPickupDate` 的条件说明**：仅当 `last_free_date_source === 'manual'` 时有值
8. ✅ **修正 `plannedPickupDate` 注释错误**：`last_pickup_date` → `planned_pickup_date`
9. ✅ **补充 `ext_demurrage_records` 预计算记录表**：说明其在汇总统计中的作用
10. ✅ **明确写回 API 在 `container.ts` 而非 `demurrage.ts`**：避免开发者找不到方法
11. ✅ **补充响应数据结构**：增加 `keyTimeline`、`logisticsStatusSnapshot`、`dateOrderWarnings`、`skippedItems` 等字段
12. ✅ **补充 `reason` 枚举的完整分支**：包括 `missing_pickup_date_actual` 等

**文档版本**: v1.1 (修订版)  
**创建时间**: 2026-04-02  
**最后更新**: 2026-04-02  
**作者**: 刘志高  
**状态**: 已根据代码一致性评审修订 ✅
