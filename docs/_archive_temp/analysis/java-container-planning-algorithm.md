# Java 排柜算法深度解读 (ContainerPlanning - 0913_release.java)

**分析日期**: 2026-03-17  
**文件来源**: `D:\Filez\提送卸还\ContainerPlanning - 0913_release.java`  
**算法类型**: 启发式优化算法（贪心 + 局部搜索）

---

## 📋 一、算法核心目标

**最小化总成本**，包括：

1. **滞港费** (Demurrage Charge) - 超过免租期未提柜
2. **滞箱费** (Detention Charge) - 超期占用集装箱
3. **堆场存储费** (Storage Charge) - 车队堆场存放费用
4. **拖卡费** (Trucking Fee) - 车队运输费用

---

## 🏗️ 二、核心数据结构

### 1. Container（货柜类）

```java
public class Container {
    // 基本信息
    String id;                // 集装箱号
    String order_id;          // 备货单号
    String shipCompany;       // 船公司
    String forwardCompany;    // 货代公司
    String port;              // 目的港

    // 时间轴（关键！）
    Integer eta;              // 预计到港日期（相对天数）
    Integer pick;             // 提柜日期
    Integer delivery;         // 送仓日期
    Integer unload;           // 卸柜日期
    Integer returnT;          // 还箱日期

    // 约束
    LocalDate latestPick;     // 最晚提柜日
    LocalDate latestReturn;   // 最晚还箱日

    // 资源分配
    String currentWarehouse;  // 当前仓库
    List<String> possibleWarehouses;  // 可选仓库列表
    String truck;             // 指派车队
    Integer yard;             // 堆场存放天数

    // 卸柜方式
    String unloadType;        // "Drop unload" 或 "Live unload"

    // 固定标记（已实际发生不可改）
    boolean fixedPick;
    boolean fixedDelivery;
    boolean fixedUnload;
    boolean fixedReturn;
    boolean fixedWarehouse;
    boolean fixedTruck;

    // 费用明细
    Double combine_fee;       // 合并费用（DDC）
    Double port_storage;      // 堆存费
    Double port_fee;          // 滞港费
    Double container_fee;     // 滞箱费
    Double yard_fee;          // 堆场费
    Double truck_fee;         // 拖车费
}
```

### 2. 时间轴约束关系

```
提 ≤ 送 ≤ 卸 ≤ 还
pick ≤ delivery ≤ unload ≤ returnT

Live unload: 提 = 送 = 卸 = 还 + 1（直接送仓）
Drop unload: 提 < 送 = 卸（先放堆场，再送仓）
```

---

## ⚙️ 三、核心算法流程

### 主流程概览

```java
1. 读取 Excel 数据（10 个 sheet）
   ├─ 货柜清单
   ├─ 滞港滞箱标准
   ├─ 港口、仓库、车队
   ├─ 拖卡费、堆场容量、卸柜能力、送还能力

2. 数据预处理
   ├─ 过滤无效数据
   ├─ 日期转换（绝对日期 → 相对天数）
   ├─ 仓库列表过滤（按港口限制）

3. 生成初始解 (generateInitialSolution)
   └─ 按 ETA 排序，先到先得

4. 计算成本 (calCost)
   └─ 滞港费 + 滞箱费 + 堆存费 + 拖车费 + 堆场费

5. 优化迭代（局部搜索）
   ├─ 尝试更换仓库 (_try_change_warehouse)
   ├─ 尝试调整卸柜日期 (_try_change_unload)
   └─ 接受更优解
```

---

## 💰 四、费用计算逻辑（核心）

### 1. 免费天数判定

```java
// 找到首个正数费用的索引作为免费天数
int detFreeDays = findFirstPositiveIndex(detFees);    // 滞箱费免费天数
int ddcFreeDays = findFirstPositiveIndex(ddcFees);    // 合并费免费天数
int demFreeDays = findFirstPositiveIndex(demFees);    // 滞港费免费天数
int storageFreeDays = findFirstPositiveIndex(storageFees); // 堆存费免费天数

int minFreeDay = Math.min(demFreeDays, storageFreeDays);
```

### 2. 计费天数计算

```java
if (container.isFixedPick()) {  // 已提柜
    T_g = 0;  // 无滞港费
    T_c = max( DAYS_BETWEEN(pickDate, returnDate) + 1, 0 );  // 滞箱费
} else {  // 未提柜
    T_g = max( DAYS_BETWEEN(latestPickDate, pickDate) + minFreeDay + 1, 0 );  // 滞港费
    T_c = max( DAYS_BETWEEN(pickDate, returnDate) + 1, 0 );  // 滞箱费
}

T_b = max( DAYS_BETWEEN(latestPickDate, returnDate) + ddcFreeDays + 1, 0 );  // DDC
```

### 3. 费用分段计算

```java
// 模式 1：分开计费（ddcFees 全为 0）
costDem = calculateFee(startDate_T_g, T_g, demFees, baseType);      // 滞港费
costStorage = calculateFee(startDate_T_g, T_g, storageFees, baseType); // 堆存费
costDet = calculateFee(startDate_T_c, T_c, detFees, baseType);      // 滞箱费

// 模式 2：合并计费（DDC）
costStorage = calculateFee(startDate_T_g, T_g, storageFees, baseType); // 堆存费
costDdc = calculateFee(startDate_T_b, T_b, ddcFees, baseType);      // DDC 合并费
```

### 4. 车队与堆场费用

```java
// 堆场存放天数 = delivery - pick（Drop unload 模式）
Integer yardDays = container.getYard();

// 从嵌套字典查价格
Double yardPrice = getDeepValue(mapFleetYardCapacity, fleet, port, "单柜价格");
Double yardTransportation = getDeepValue(mapFleetYardCapacity, fleet, port, "运费");

costYard = yardDays > 0 ? yardPrice * yardDays + yardTransportation : 0;
costTruck = truckFee;

totalCost = costDem + costStorage + costDet + costDdc + costYard + costTruck;
```

---

## 🔍 五、初始解生成算法

### Case 分类处理

#### Drop unload 模式（需使用堆场）

| Case  | 状态                 | 处理逻辑                      |
| ----- | -------------------- | ----------------------------- |
| **A** | 卸柜日已定           | 直接使用，分配还箱日期        |
| **B** | 送仓日已定，卸柜未定 | 找最早可用卸柜日 ≥ 送仓 +1    |
| **C** | 提柜日已定，送仓未定 | 检查堆场可用性，决定送仓策略  |
| **D** | 全部未定             | 从 ETA+1 开始枚举，找最优组合 |

#### Live unload 模式（直接送仓）

```java
// 特点：delivery = unload = return + 1
if (unloadType.equals("Live unload")) {
    container.setDelivery(unloadDay);
    container.setUnload(unloadDay);
    container.setReturnT(unloadDay);  // 或 unloadDay + 1
}
```

### 关键代码片段

```java
// Case D：全部未定（最复杂情况）
while (!assigned) {
    int minUnloadDay = Math.max(container.getEta() + 1, currentDay);
    int unloadDay = minUnloadDay + dayOffset;

    for (String whId : container.getPossibleWarehouses()) {
        // 检查仓库容量
        if (warehouseUsage.get(key) < warehouseCapacity) {
            container.setCurrentWarehouse(whId);

            // 检查堆场可用性
            boolean isYardUsable = checkYardUsability(container);

            if (isYardUsable) {
                // 有堆场：可以提前送仓
                container.setPick(Math.min(container.getEta() + random.nextInt(3) + 1, unloadDay));
                container.setDelivery(...);  // 受送还能力限制
            } else {
                // 无堆场：提=送=卸
                container.setPick(unloadDay);
                container.setDelivery(unloadDay);
                container.setUnload(unloadDay);
            }

            // 分配还箱日期和车队送还能力
            allocateFleetReturnCapacity(...);

            assigned = true;
        }
    }

    if (!assigned) dayOffset++;  // 推迟卸柜日
}
```

---

## 🎯 六、约束条件与校验

### 1. 仓库容量约束

```java
// 每日每仓库的卸柜能力限制
Map<List<Object>, Integer> warehouseUsage;  // key: [warehouseId, day]
warehouseUsage.get(key) < warehouseCapacity
```

### 2. 车队送还能力约束

```java
// 双层嵌套：日期 → 车队_仓库 → 使用量
Map<LocalDate, Map<String, Integer>> mapFleetReturnUsage;

// 查找可用能力（按价格排序）
List<Map<String, Object>> availableFleets =
    getAvailableFleetReturnCapacityByPrice(warehouse, port, returnDay);

// 分配能力
allocateFleetReturnCapacity(fleetName, warehouse, returnDay, count);
```

### 3. 周末跳过

```java
List<Integer> weekendDays = getWeekendDays(maxT);

if (weekendDays.contains(day)) {
    continue;  // 跳过周末
}
```

### 4. 车队堆场可用性

```java
boolean isYardUsable = checkYardUsability(container);

if (isYardUsable) {
    // 可以 Drop off（提 < 送）
} else {
    // 必须 Live unload（提 = 送 = 卸）
}
```

---

## 🔧 七、优化策略（局部搜索）

### 1. 更换仓库

```java
_try_change_warehouse(solution, currentCost, warehouseUsage, idx, dfFee)

// 尝试所有可能的仓库
for (String newWarehouse : container.possibleWarehouses) {
    if (newWarehouse.equals(oldWarehouse)) continue;

    // 检查容量和送还能力
    if (capacity_ok && fleet_return_ok) {
        // 计算新成本
        double newCost = calCost(newSolution, dfFee);

        if (newCost < currentCost) {
            // 接受更优解
        }
    }
}
```

### 2. 调整卸柜日期

```java
_try_change_unload(solution, currentCost, warehouseUsage, idx, dfFee)

// 尝试前后调整（-2, -1, +1, +2, +3, +4, +5 天）
int[] deltas = {-2, -1, 1, 2, 3, 4, 5};

for (int delta : deltas) {
    int newUnload = oldUnload + delta;

    // 检查约束
    if (newUnload >= delivery + 1 &&
        !weekendDays.contains(newUnload) &&
        capacity_ok && fleet_return_ok) {

        double newCost = calCost(newSolution, dfFee);

        if (newCost < currentCost) {
            // 接受更优解
        }
    }
}
```

---

## 📊 八、与 LogiX 项目对比

### 相同点

| 特性         | Java 算法           | LogiX TypeScript   |
| ------------ | ------------------- | ------------------ |
| **映射链**   | 港口 → 车队 → 仓库  | 港口 → 车队 → 仓库 |
| **卸柜方式** | Live/Drop unload    | Live load/Drop off |
| **约束**     | 提 ≤ 送 ≤ 卸 ≤ 还   | 提 ≤ 送 ≤ 卸 ≤ 还  |
| **费用**     | 滞港/滞箱/堆存/拖车 | 待实现             |

### 差异点

| 特性         | Java 算法       | LogiX TypeScript           |
| ------------ | --------------- | -------------------------- |
| **优化目标** | 成本最小化      | 目前仅满足约束             |
| **算法**     | 贪心 + 局部搜索 | 规则引擎（先到先得）       |
| **车队选择** | 价格最低优先    | 映射表第一个可用           |
| **仓库选择** | 成本优化        | 优先级（自营>平台>第三方） |
| **周末处理** | 跳过周末        | 未实现                     |

---

## 🚀 九、可借鉴到 LogiX 的优化

### P0: 费用计算模型

```typescript
interface DemurrageCalculation {
  freeDays: number;           // 免租期
  tiers: number[];            // 分段费率 [0, 100, 200, ...]
  basis: '自然日' | '工作日';   // 计费基准
}

calculateFee(startDate, days, fees, basis): number
```

### P1: 局部搜索优化

```typescript
// 在现有排产结果基础上优化
async optimizeSchedule(schedule: ScheduleResult[]): Promise<ScheduleResult[]> {
  let currentCost = calculateTotalCost(schedule);
  let improved = true;

  while (improved) {
    improved = false;

    // 尝试更换仓库
    for (const container of schedule) {
      const newSchedule = tryChangeWarehouse(schedule, container);
      const newCost = calculateTotalCost(newSchedule);

      if (newCost < currentCost) {
        schedule = newSchedule;
        currentCost = newCost;
        improved = true;
      }
    }
  }

  return schedule;
}
```

### P2: 车队送还能力管理

```sql
-- 参考 Java 的双层结构
CREATE TABLE ext_trucking_return_capacity (
  date DATE NOT NULL,
  fleet_name VARCHAR(100) NOT NULL,
  warehouse_code VARCHAR(50) NOT NULL,
  capacity INT DEFAULT 0,
  planned_trips INT DEFAULT 0,
  PRIMARY KEY (date, fleet_name, warehouse_code)
);
```

---

## ✅ 十、关键洞察

### 1. 时间窗口的重要性

- **最晚提柜日** 是硬约束，影响滞港费计算起点
- **最晚还箱日** 决定还箱时间安排
- **免费天数** 是费用优化的关键杠杆

### 2. 堆场策略的两难

```
有堆场（Drop off）:
  ✅ 灵活性高（可提前送仓）
  ❌ 产生堆场费

无堆场（Live unload）:
  ✅ 无堆场费
  ❌ 必须在提柜日当天送仓
```

### 3. 周末效应对产能的影响

- 周末不工作 → 有效工作日减少 → 需要更早安排
- 建议 LogiX 也加入周末跳过逻辑

---

## 📝 十一、行动建议

### 立即执行（P0）

1. **实现费用计算服务**

   - 参考 `calCost()` 方法
   - 支持分段费率和免费天数
   - 区分 DDC 模式和分开计费模式

2. **添加周末跳过逻辑**
   ```typescript
   const isWeekend = (date: Date): boolean => {
     const day = date.getDay();
     return day === 0 || day === 6;
   };
   ```

### 下周完成（P1）

3. **实现局部搜索优化器**

   - 基于现有排产结果
   - 尝试更换仓库和调整日期
   - 接受成本更低的方案

4. **建立车队送还能力表**
   - 记录每日每车队的送还能力
   - 在排产时检查和扣减能力

### 后续优化（P2）

5. **引入随机扰动**

   - 避免陷入局部最优
   - 模拟退火或遗传算法

6. **可视化成本构成**
   - 饼图展示各项费用占比
   - 帮助用户理解优化方向

---

## 🔗 十二、相关代码位置

| 功能模块         | Java 行号范围 | LogiX 对应文件                   |
| ---------------- | ------------- | -------------------------------- |
| Container 类     | 55-283        | 待创建                           |
| 费用计算 calCost | 492-695       | 待实现                           |
| 初始解生成       | 937-1470      | intelligentScheduling.service.ts |
| 仓库容量查找     | 915-933       | 已有类似逻辑                     |
| 车队送还能力     | 多处          | 待完善                           |

---

**总结**: 该 Java 算法是一个成熟的启发式优化系统，核心价值在于：

1. **完整的费用模型**（值得 LogiX 学习）
2. **局部搜索优化策略**（可直接移植）
3. **多维度约束管理**（仓库、车队、日期）

建议 LogiX 分阶段吸收这些优秀设计，逐步从「满足约束」升级到「成本优化」。
