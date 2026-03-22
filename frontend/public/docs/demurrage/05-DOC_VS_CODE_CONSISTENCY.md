# 滞港费：文档与代码一致性解读

> 对照 `01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md` 与 `backend/src/services/demurrage.service.ts` 的实际实现。

**自动计算**：滞港费计算前，系统会按货柜与标准自动计算 最晚提柜日、最晚还箱日；滞箱费**必须有实际提柜日**才计算，不得用最晚提柜日作为回退。

---

## 一、滞港费（Demurrage）

### 起算日

| 来源 | 逻辑 |
|------|------|
| 文档 | 按到港：ATA；按卸船：卸船日 |
| 代码 | 按到港标准：`ata`；按卸船标准：`discharge`（L1044-1107） |
| **结论** | ✅ 一致：根据标准中的计算方式决定使用实际卸船日还是实际ATA

### 截止日

| 来源 | 逻辑 |
|------|------|
| 文档 [01] | **forecast**：max(今天, 计划提柜日)；无计划提柜日则用今天。**actual**：实际提柜日；无则当天（有提柜后封顶） |
| 代码 | `calculateForContainer` 内 `demurragePortEndDate`：`forecast` → `plannedPickupDate ? max(today, planned) : today`；`actual` → `pickupDateActual ?? today` |
| **结论** | ✅ 与 [01] 两段口径一致 |

---

## 二、滞箱费（Detention）

### 起算日

| 来源 | 逻辑 |
|------|------|
| 文档 | 实际提柜日；**无实际提柜日则不计算此项费用** |
| 代码 | `detentionStartDate = pickupDateActual ?? null`（无则跳过） |
| **结论** | ✅ 一致：不得用最晚提柜日（last_free_date）作为回退 |

### 截止日

| 来源 | 逻辑 |
|------|------|
| 文档 | 实际还空箱日期；无则当天 |
| 代码 | `detentionEndDate = returnTime ?? toDateOnly(new Date())` |
| **结论** | ✅ 一致 |

---

## 三、堆存费（Storage）

> **修订说明**：旧版曾写「与滞港费共用时间范围」，与 [01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md](./01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md) §2.1 **堆存费**段落及业务口径不一致，已更正。

| 来源 | 逻辑 |
|------|------|
| 文档 [01] §2.1 | 堆存费：**提柜 → 还箱（无则当天）**；无实际提柜日不计算；**非**到港→提柜 |
| 代码 | `isStorageCharge(std)` 为真时：`rangeStart = pickupDateActual`，`rangeEnd = returnTime ?? today`（与滞箱费区间一致，与滞港费区间不同） |
| **结论** | ✅ 与 [01] 对齐：堆存与 **滞箱费共用「提柜→还箱」区间**，与 **滞港费「到港→提柜」** 区分 |

**勿混淆**：`process_port_operations.last_free_date`（最晚提柜日）**不能**代替 `pickup_date`（实际提柜日）参与堆存/滞箱类计费。

---

## 四、前端显示原则

**以代码实际逻辑为准**，确保用户看到的「计算逻辑」说明与系统真实计算口径一致。

| 费用类型 | 前端应显示的计算逻辑（与代码一致） |
|----------|----------------------------------|
| 滞港费 | 起算：根据标准计算方式，按到港用 ATA，按卸船用卸船日；截止：实际提柜日，无则当天 |
| 滞箱费 | 起算：实际提柜日（**必须有**，无则不计此项）；截止：实际还箱日，无则当天 |
| 堆存费 | 起算：实际提柜日（必须有）；截止：实际还箱日，无则当天（与滞箱费区间相同） |
