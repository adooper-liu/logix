# 滞港费计算逻辑与取值逻辑（最终版）

> 更新时间：2026-03-22  
> 状态：**代码实现与业务规则已验证一致**

---

## 一、入口与主要 API

| 能力 | 方法 | 说明 |
|------|------|------|
| 单柜计算 | `GET /api/v1/demurrage/calculate/:containerNumber` | 核心：`DemurrageService.calculateForContainer` |
| 标准列表 | `GET /api/v1/demurrage/standards` | 可筛目的港、船公司 |
| 匹配诊断 | `GET /api/v1/demurrage/diagnose/:containerNumber` | 对比货柜参数与各条标准被排除原因 |
| 汇总 | `GET /api/v1/demurrage/summary` | 按出运日期范围取柜列表后汇总 |
| Top 高费用柜 | `GET /api/v1/demurrage/top-containers` | 同上日期范围 |

---

## 二、涉及的数据表与实体（取值来源）

| 数据表 | 实体 | 关键字段 |
|--------|------|----------|
| `ext_demurrage_standards` | `ExtDemurrageStandard` | 费率、免费天数、阶梯 tiers、free_days_basis、calculation_basis、四维度匹配字段、有效期、is_chargeable |
| `biz_containers` + `process_sea_freight` | `Container` + `SeaFreight` | 目的港相关、船公司、货代、ETA |
| `process_port_operations` | `PortOperation` | ATA、ETA、revised_eta、卸船/卸货时间、last_free_date、last_free_date_source |
| `process_trucking_transport` | `TruckingTransport` | planned_pickup_date、pickup_date（实际提柜日） |
| `process_empty_return` | `EmptyReturn` | return_time（实际还箱日）、last_return_date、planned_return_date |
| `biz_replenishment_orders` + `biz_customers` | 备货单 + 客户 | 海外公司/客户维度 |
| 字典表 | dict_* | 名称/别名 → 标准 code |

---

## 三、计算模式：actual vs forecast

由 `calculateLogisticsStatus`（utils/logisticsStatusMachine）得到快照，再 `isArrivedAtDestinationPortForDemurrage` 判断：

### 判定规则

| 视为 actual（已到达） | 视为 forecast（未到达） |
|----------------------|------------------------|
| 状态为 `PICKED_UP`（已提柜） | 状态为 `NOT_SHIPPED` |
| 状态为 `UNLOADED`（已卸柜） | 状态为 `SHIPPED` / `IN_TRANSIT` |
| 状态为 `RETURNED_EMPTY`（已还箱） | 状态为 `AT_PORT` 且 `currentPortType !== 'destination'` |
| 状态为 `AT_PORT` 且 `currentPortType === 'destination'` | 仅中转港到港 |

### 时序封顶逻辑

- **一旦切换为 actual 模式**：截止日固定为实际提柜日/实际还箱日，金额封顶不随日期增长
- **forecast 模式**：每日滚动更新，金额会随今天日期变化

---

## 四、滞港费 (Demurrage) 计算规则

### 起算日

| 计算模式 | 计算方式 | 起算日 |
|----------|----------|--------|
| **actual** | 按到港 | ATA（ata_dest_port） |
| **actual** | 按卸船 | 卸船日（discharge_date） |
| **forecast** | 按到港 | ATA > 修正ETA > ETA |
| **forecast** | 按卸船 | 卸船日 > 修正ETA > ETA |

### 截止日

| 计算模式 | 截止日逻辑 |
|----------|------------|
| **forecast** | `max(Today, 计划提柜日planned_pickup_date)`，无计划提柜日则用 Today |
| **actual** | `实际提柜日pickup_date`（有则用），无则 Today。**有实际提柜后金额封顶** |

### 公式

```
滞港费 = max(0, 截止日 - 起算日 + 1 - 免费天数) × 每日费率
```

---

## 五、滞箱费 (Detention) 计算规则

### 起算日

| 计算模式 | 起算日 |
|----------|--------|
| **forecast** | 计划提柜日（planned_pickup_date） |
| **actual** | 实际提柜日（pickup_date） |

### 截止日

| 计算模式 | 截止日逻辑 |
|----------|------------|
| **forecast** | `max(Today, 计划还箱日planned_return_date)`，无则 Today |
| **actual** | `实际还箱日return_time`（有则用），无则 Today |

### 前置条件

- **forecast 模式**：必须有计划提柜日，否则跳过该项
- **actual 模式**：必须有实际提柜日，否则跳过该项

---

## 六、合并模式 (Demurrage & Detention) 计算规则

### 起算日

| 计算模式 | 计算方式 | 起算日 |
|----------|----------|--------|
| **forecast** | 任意 | 修正ETA > ETA |
| **actual** | 按到港 | ATA > 卸船日 |
| **actual** | 按卸船 | 卸船日 |

### 截止日

与 **滞箱费** 一致：
- **forecast**：`max(Today, 计划还箱日)`
- **actual**：`实际还箱日` 或 Today

### 前置条件

- **forecast 模式**：必须有修正ETA或ETA，否则跳过
- **actual 模式**：必须有ATA或卸船日（按标准计算方式），否则跳过

---

## 七、堆存费 (Storage) 计算规则

堆存费与 **滞箱费** 使用完全相同的区间：
- **起算日**：实际提柜日（actual）或计划提柜日（forecast）
- **截止日**：实际还箱日或 Today
- **必须依赖实际提柜日**：无实际提柜日则不计算

---

## 八、费用类型识别规则

通过 `chargeTypeCode` / `chargeName` 关键词判断：

| 类型 | 判断条件 |
|------|----------|
| **合并 D&D** | 同时包含 Demurrage 与 Detention（或滞港与滞箱） |
| **纯滞箱 Detention** | 包含 Detention/滞箱，且非合并类型 |
| **堆存 Storage** | 包含 Storage/堆存，且非滞箱/非合并 |
| **滞港 Demurrage** | 其余非滞箱/非堆存/非合并 |

---

## 九、标准匹配逻辑

### 四字段过滤

| 字段 | 来源 |
|------|------|
| 目的港 | port_operations.destination_port_code / port_name |
| 船公司 | sea_freight.shipping_company_code |
| 货代 | sea_freight.origin_forwarder_code |
| 境外公司 | 备货单客户.overseas_company_code |

### 有效期

- `effective_date <= Today` 且 (`expiry_date IS NULL` 或 `expiry_date >= Today`)
- 若无有效期匹配，取四字段匹配中 `effective_date` 最大的标准

### 收费标志

- `is_chargeable = 'N'`：收费并参与计算
- `is_chargeable = 'Y'`：不收费跳过

---

## 十、日期顺序校验

- **actual 模式**：若实际提柜日早于 ATA/卸船日，触发警告
- **forecast 模式**：若计划提柜日早于 ETA/修正ETA，触发警告

---

## 十一、数据流与更新

### 取值来源（按优先级）

| 字段 | 来源表 | 字段名 |
|------|--------|--------|
| 目的港 ATA | process_port_operations | ata_dest_port |
| 修正 ETA | process_port_operations | revised_eta |
| 目的港 ETA | process_port_operations | eta_dest_port |
| 卸船日 | process_port_operations | discharge_date / dest_port_unload_date |
| 计划提柜日 | process_trucking_transport | planned_pickup_date |
| 实际提柜日 | process_trucking_transport | pickup_date |
| 计划还箱日 | process_empty_return | planned_return_date |
| 实际还箱日 | process_empty_return | return_time |
| 最晚提柜日 | process_port_operations | last_free_date |
| 最晚还箱日 | process_empty_return | last_return_date |

### 自动写回

- **last_free_date**：仅当 尚无实际提柜 且 算出 computedLastFreeDate，且原 last_free_date 来源为空或为 computed 时写入
- **last_return_date**：仅 actual 模式、有实际提柜、无 return_time、有 computedLastReturnDate 时写入

---

## 十二、代码位置参考

| 功能 | 文件位置 |
|------|----------|
| 入口 | `backend/src/services/demurrage.service.ts` - `calculateForContainer` |
| 计算模式判定 | `isArrivedAtDestinationPortForDemurrage` |
| 标准匹配 | `matchStandards` |
| 日期取值 | `getContainerMatchParams` |
| 费用类型识别 | `isDetentionCharge` / `isCombinedDemurrageDetention` / `isStorageCharge` |
| 单项计算 | `calculateSingleDemurrage` |

---

## 十三、业务规则速查表

| 场景 | 费用类型 | 计算模式 | 起算日 | 截止日 |
|------|----------|----------|--------|--------|
| 未到港，有计划提柜日 | 滞港费 | forecast | 修正ETA/ETA | max(Today, 计划提柜日) |
| 未到港，无计划提柜日 | 滞港费 | forecast | 修正ETA/ETA | Today |
| 已到港/已卸船，有实际提柜日 | 滞港费 | actual | ATA/卸船日 | 实际提柜日（封顶） |
| 未到港，有计划提柜日+计划还箱日 | 滞箱费 | forecast | 计划提柜日 | max(Today, 计划还箱日) |
| 已提柜，有实际还箱日 | 滞箱费 | actual | 实际提柜日 | 实际还箱日 |
| 未到港，有ETA+计划还箱日 | 合并D&D | forecast | 修正ETA/ETA | max(Today, 计划还箱日) |
| 已到港/已卸船 | 合并D&D | actual | ATA/卸船日 | 实际还箱日或Today |

---

## 十四、验证记录

- **验证日期**：2026-03-22
- **验证结果**：代码实现与业务规则 **完全一致**
- **核心代码段**：
  - 滞港费 forecast 截止日：第1155行 `maxDate(today, plannedPickupDate)`
  - 滞港费 actual 截止日：第1160行 `pickupDateActualEarly ?? today`
  - 滞箱费 forecast 截止日：第1332行 `maxDate(today, plannedReturnDate)`
  - 滞箱费 forecast 起算日：第1337行 `plannedPickupDate`
  - 合并模式 forecast 起算日：第1500-1506行 修正ETA/ETA
  - 合并模式 forecast 截止日：第1507行 `enhancedParams.detentionEndDate`
