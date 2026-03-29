# dict_scheduling_config 配置参数完整说明

## 📋 配置表概述

`dict_scheduling_config` 是智能排柜系统的核心配置表，用于控制排产策略、费用计算、日期计算等关键业务逻辑。

---

## 🔧 配置参数详解

### **1. 日期计算相关配置**

#### **1.1 skip_weekends**

```yaml
config_key: skip_weekends
config_value: true
description: 卸柜/还箱日是否跳过周末（周六、周日）
```

**业务意义**：

- `true`：排产时自动跳过周末（周六、周日不安排卸柜/还箱）
- `false`：周末也可以安排卸柜/还箱

**使用场景**：

- 仓库/堆场周末不工作时设置为 `true`
- 周末正常工作时设置为 `false`

**代码使用**：

```typescript
// intelligentScheduling.service.ts:550
const config = await this.schedulingConfigRepo.findOne({
  where: { configKey: "skip_weekends" },
});
const shouldSkipWeekends = config?.configValue === "true";
if (shouldSkipWeekends) {
  // 跳过周末逻辑
}
```

---

#### **1.2 weekend_days**

```yaml
config_key: weekend_days
config_value: 6,0
description: 周末定义（0=周日，1=周一...6=周六，逗号分隔）
```

**业务意义**：

- 定义哪些天是周末（非工作日）
- `6,0` 表示周六 (6) 和周日 (0)
- 可以调整为其他组合，如 `0`（仅周日）

**使用场景**：

- 不同国家/地区的周末定义不同
- 中东地区可能是 `5,6`（周五、周六）

---

#### **1.3 default_free_container_days**

```yaml
config_key: default_free_container_days
config_value: 7
description: 默认免费用箱天数（天）
```

**业务意义**：

- 货柜从提柜日起，免费使用天数
- 超过此天数将收取滞箱费（Detention）

**计算公式**：

```
免费期截止日 = 提柜日 + default_free_container_days - 1
滞箱费从第 8 天开始计算
```

**使用场景**：

- 船公司通常提供 5-10 天免费期
- 根据实际合同调整

---

#### **1.4 planning_horizon_days**

```yaml
config_key: planning_horizon_days
config_value: 30
description: 排产计划展望期（天）
```

**业务意义**：

- 排产时向前规划的天数范围
- 超过此范围不考虑

**使用场景**：

- `30`：未来 30 天内的排产计划
- 避免过度规划，保持灵活性

---

#### **1.5 search_window_days**

```yaml
config_key: search_window_days
config_value: 7
description: 卸柜日搜索窗口（天数）
```

**业务意义**：

- 在成本优化时，搜索最优卸柜日的范围
- 从基准卸柜日前后搜索 `7` 天

**使用场景**：

- 成本优化算法使用
- 寻找最低成本的卸柜日期

---

### **2. 运输费用相关配置**

#### **2.1 transport_base_rate_per_mile**

```yaml
config_key: transport_base_rate_per_mile
config_value: 2.5
description: 运输基础费率 (USD/英里)
```

**业务意义**：

- 每英里的基础运输费率
- 用于计算运输距离费用

**计算公式**：

```
运输费 = 距离（英里）× transport_base_rate_per_mile × 模式系数
```

**使用场景**：

- 根据实际运输成本调整
- 燃油价格波动时更新

---

#### **2.2 transport_direct_multiplier**

```yaml
config_key: transport_direct_multiplier
config_value: 1.0
description: Direct 模式倍数
```

**业务意义**：

- Direct（Live load）模式的运费倍数
- `1.0` 表示按基础费率计算

**计算公式**：

```
Direct 模式运费 = 基础运费 × 1.0
```

---

#### **2.3 transport_dropoff_multiplier**

```yaml
config_key: transport_dropoff_multiplier
config_value: 1.0 # ✅ 已配置化：从硬编码×2 改为可配置
description: Drop off 模式倍数
```

**业务意义**：

- Drop off 模式的运费倍数
- `1.0` 表示与 Direct 模式基础运费相同
- **✅ 关键改进：从硬编码 `×2` 改为从配置表读取**

**计算公式**：

```
Drop off 模式运费 = 基础运费 × transport_dropoff_multiplier
```

**代码使用**：

```typescript
// demurrage.service.ts:3249-3252
if (unloadMode === "Drop off") {
  const dropoffMultiplier = await this.getDropoffMultiplier();
  transportFee *= dropoffMultiplier;
  logger.debug(`[Demurrage] Drop off mode: transportFee=${transportFee}, multiplier=${dropoffMultiplier}`);
}
```

**配置值场景**：

- `1.0`：Drop off 与 Direct 基础运费相同（当前配置）
- `2.0`：标准 Drop off 模式（两次完整运输）
- `1.5`：如果第二次运输距离较短

**修复历史**：

- **2026-03-25**：从硬编码 `×2` 改为配置驱动
- **修复前**：代码固定 `transportFee *= 2`
- **修复后**：从 `dict_scheduling_config` 读取，当前值 `1.0`

---

#### **2.4 transport_expedited_multiplier**

```yaml
config_key: transport_expedited_multiplier
config_value: 1.5
description: Expedited 模式倍数
```

**业务意义**：

- Expedited（加急）模式的运费倍数
- `1.5` 表示比 Direct 模式贵 50%

**计算公式**：

```
Expedited 模式运费 = 基础运费 × 1.5
```

---

### **3. 堆存费相关配置**

#### **3.1 external_storage_daily_rate**

```yaml
config_key: external_storage_daily_rate
config_value: 50
description: 外部堆场日费率 (USD/天）
```

**业务意义**：

- 外部堆场的每日堆存费率
- Drop off 模式专属费用

**计算公式**：

```
外部堆场堆存费 = external_storage_daily_rate × 堆存天数 + 操作费
```

**注意**：

- ⚠️ **当前代码从 `TruckingPortMapping` 读取实际费率**
- 此配置作为备用/默认值

**代码现状**：

```typescript
// intelligentScheduling.service.ts:1176
yardStorageCost = (truckingPortMapping.standardRate || 0) * yardStorageDays + (truckingPortMapping.yardOperationFee || 0);
```

---

#### **3.2 expedited_handling_fee**

```yaml
config_key: expedited_handling_fee
config_value: 50
description: 加急操作费 (USD)
```

**业务意义**：

- Expedited 模式的一次性操作费
- 固定费用，与天数无关

**计算公式**：

```
Expedited 总费用 = 运输费 × 1.5 + expedited_handling_fee
```

**代码使用**：

```typescript
// intelligentScheduling.service.ts:1192
const config = await this.schedulingConfigRepo.findOne({
  where: { configKey: "expedited_handling_fee" },
});
handlingCost = config?.configValue ? parseFloat(config.configValue) : 50;
```

---

### **4. 成本优化相关配置**

#### **4.1 cost_optimization_enabled**

```yaml
config_key: cost_optimization_enabled
config_value: false
description: 是否启用成本优化（true=启用，false=禁用）
```

**业务意义**：

- 控制是否启用智能成本优化算法
- `false`：使用默认排产策略
- `true`：自动寻找最低成本方案

**使用场景**：

- 系统上线初期可能设置为 `false`
- 稳定后设置为 `true`

---

#### **4.2 demurrage_warning_threshold**

```yaml
config_key: demurrage_warning_threshold
config_value: 500
description: 滞港费预警阈值 (USD)
```

**业务意义**：

- 当预计滞港费超过此值时触发预警
- 提醒优先处理该货柜

**使用场景**：

- 预警系统使用
- 避免高额滞港费

---

#### **4.3 drop_off_cost_comparison_threshold**

```yaml
config_key: drop_off_cost_comparison_threshold
config_value: 300
description: Drop off 成本对比触发阈值 (USD)
```

**业务意义**：

- 当 Direct 模式滞港费超过此值时
- 自动对比 Drop off 方案的成本

**使用场景**：

- 成本优化算法使用
- 判断是否需要考虑 Drop off 方案

---

#### **4.4 prioritize_free_period**

```yaml
config_key: prioritize_free_period
config_value: true
description: 优先安排在免费期内（true/false）
```

**业务意义**：

- `true`：优先安排在免费期内卸柜/还箱
- `false`：不考虑免费期

**使用场景**：

- 成本优化策略
- 避免滞箱费

---

#### **4.5 free_period_buffer_days**

```yaml
config_key: free_period_buffer_days
config_value: 1
description: 免费期缓冲天数（提前安排）
```

**业务意义**：

- 在免费期截止前 `1` 天安排
- 预留缓冲时间，避免意外超时

**使用场景**：

- 降低风险
- 应对突发情况

---

### **5. 智能日历相关配置**

#### **5.1 enable_smart_calendar_capacity**

```yaml
config_key: enable_smart_calendar_capacity
config_value: true
description: 是否启用智能日历能力（周末=0，工作日=字典表值）
```

**业务意义**：

- `true`：启用智能日历，区分工作日/周末的处理能力
- `false`：不区分

**使用场景**：

- 仓库/堆场工作日和周末处理能力不同时

---

#### **5.2 weekday_capacity_multiplier**

```yaml
config_key: weekday_capacity_multiplier
config_value: 1.0
description: 工作日能力倍率（可用于节假日调整）
```

**业务意义**：

- 工作日的相对处理能力
- `1.0`：标准能力
- `0.5`：能力减半（如节假日）

**使用场景**：

- 节假日调整
- 特殊日期安排

---

## 📊 配置参数分类汇总

### **按业务领域分类**

| 类别     | 配置项数量 | 配置项                                                                                                                                      |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 日期计算 | 5          | skip_weekends, weekend_days, default_free_container_days, planning_horizon_days, search_window_days                                         |
| 运输费用 | 4          | transport_base_rate_per_mile, transport_direct_multiplier, transport_dropoff_multiplier, transport_expedited_multiplier                     |
| 堆存费用 | 2          | external_storage_daily_rate, expedited_handling_fee                                                                                         |
| 成本优化 | 5          | cost_optimization_enabled, demurrage_warning_threshold, drop_off_cost_comparison_threshold, prioritize_free_period, free_period_buffer_days |
| 智能日历 | 2          | enable_smart_calendar_capacity, weekday_capacity_multiplier                                                                                 |
| **总计** | **18**     | -                                                                                                                                           |

---

## ⚠️ 配置与代码不一致问题

### **问题 1：Drop off 模式运输费倍数**

**配置值**：`transport_dropoff_multiplier = 1.2`  
**代码实现**：固定 `×2`

**影响**：

- 配置表的 `1.2` 未实际使用
- 实际计算使用固定的 `2.0`

**建议**：

1. 修改代码使用配置值
2. 或将配置值更新为 `2.0`

---

### **问题 2：外部堆场日费率**

**配置值**：`external_storage_daily_rate = 50`  
**代码实现**：从 `TruckingPortMapping.standardRate` 读取

**影响**：

- 配置表作为备用值
- 实际费率以映射表为准

**建议**：

- 保持现状（映射表优先，配置表兜底）

---

## 🎯 配置最佳实践

### **1. 初始化配置**

```sql
-- 基础配置
skip_weekends = true           -- 默认跳过周末
weekend_days = 6,0             -- 周六、周日
default_free_container_days = 7  -- 7 天免费期

-- 费用配置
transport_base_rate_per_mile = 2.5  -- $2.5/英里
transport_direct_multiplier = 1.0   -- Direct 不加价
transport_dropoff_multiplier = 2.0  -- Drop off 翻倍（建议修改）
transport_expedited_multiplier = 1.5 -- Expedited 加 50%

-- 优化配置
cost_optimization_enabled = false   -- 初期不启用
demurrage_warning_threshold = 500   -- $500 预警
```

### **2. 定期审查**

- 每月审查费用配置是否符合市场
- 根据实际运营调整参数
- 监控预警阈值是否合理

### **3. 变更管理**

- 修改配置前记录当前值
- 小范围测试后推广
- 监控关键指标变化

---

## 📝 配置表维护建议

### **1. 添加配置说明文档**

- 在数据库中为每个配置项添加详细注释
- 维护配置变更日志

### **2. 配置验证**

- 添加配置值范围验证
- 防止无效配置导致系统异常

### **3. 配置分组**

- 按业务域分组管理
- 便于查找和维护

---

## 🔗 相关文档

- [智能排柜系统费用计算逻辑](./费用计算逻辑说明.md)
- [Drop off vs Direct 模式对比](./Drop_off_vs_Direct.md)
- [成本优化算法说明](./成本优化算法.md)

---

**最后更新**：2026-03-25  
**维护人员**：LogiX 开发团队
