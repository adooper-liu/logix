# Drop off 模式运输费倍数配置变更

## 📊 配置变更历史

### **2026-03-25：配置化改造**

- **变更内容**：从硬编码 `×2` 改为从配置表读取
- **配置值**：`2.0`（默认值）
- **原因**：提高灵活性，支持业务场景调整

### **2026-03-25：配置值调整为 1.0**

- **变更内容**：将 `transport_dropoff_multiplier` 从 `2.0` 改为 `1.0`
- **配置值**：`1.0`（当前值）
- **原因**：根据实际业务需求调整

---

## 🎯 当前配置状态

```yaml
config_key: transport_dropoff_multiplier
config_value: "1.0"
description: Drop off 模式运输费倍数（默认 1.0，可根据实际情况调整）
updated_at: 2026-03-25
```

---

## 💡 配置值含义

### **1.0（当前配置）**

- **含义**：Drop off 模式与 Direct 模式基础运费相同
- **业务场景**：
  - Drop off 模式的额外运输成本已包含在其他费用中（如外部堆场费）
  - 或者 Drop off 模式的两次运输距离相近，总成本与 Direct 模式相当
  - 或者业务策略上鼓励使用 Drop off 模式

### **2.0（原默认值）**

- **含义**：Drop off 模式运费是 Direct 模式的 2 倍
- **业务场景**：标准 Drop off 模式（两次完整运输）
- **计算**：港口→堆场 + 堆场→仓库

### **1.5（可选配置）**

- **含义**：Drop off 模式运费是 Direct 模式的 1.5 倍
- **业务场景**：第二次运输距离明显短于第一次

---

## 📈 费用计算对比

### **场景：Bedford 仓库 + YunExpress UK Ltd 车队**

假设基础运费（从 `dict_warehouse_trucking_mapping` 读取）为 £700

| 模式                  | 倍数 | 运输费计算 | 运输费 |
| --------------------- | ---- | ---------- | ------ |
| **Direct**            | 1.0  | £700 × 1.0 | £700   |
| **Drop off** (当前)   | 1.0  | £700 × 1.0 | £700   |
| **Drop off** (原默认) | 2.0  | £700 × 2.0 | £1,400 |
| **Drop off** (可选)   | 1.5  | £700 × 1.5 | £1,050 |

---

## 🔍 完整费用结构（Drop off 模式）

### **当前配置（倍数=1.0）**

```
Drop off 模式总费用：
├─ 运输费：£700 × 1.0 = £700      ← 不翻倍
├─ 堆场费：£80 × 2 天 + £50 = £210  ← 另计
├─ D&D 费用：$1,710
└─ 总计：£910 + $1,710 ≈ $2,600+
```

### **原默认配置（倍数=2.0）**

```
Drop off 模式总费用：
├─ 运输费：£700 × 2.0 = £1,400    ← 翻倍
├─ 堆场费：£80 × 2 天 + £50 = £210  ← 另计
├─ D&D 费用：$1,710
└─ 总计：£1,610 + $1,710 ≈ $3,500+
```

---

## ⚙️ 配置调整建议

### **何时使用 1.0？**

✅ 堆场费已经覆盖了额外运输成本  
✅ 业务策略鼓励使用 Drop off 模式  
✅ 两次运输距离相近，总成本差异不大

### **何时使用 2.0？**

✅ 标准 Drop off 模式，两次独立运输  
✅ 需要反映真实的运输成本差异  
✅ 堆场费不包含运输成本

### **何时使用 1.5？**

✅ 第二次运输距离明显短于第一次  
✅ 部分运输成本已包含在其他费用中

---

## 配置变更影响

### **正面影响**

- ✅ **费用降低**：Drop off 模式总费用下降（相比 2.0 倍数）
- ✅ **竞争力提升**：Drop off 模式更具价格优势
- ✅ **灵活性**：可根据市场策略快速调整

### **潜在风险**

- ⚠️ **成本覆盖**：需确保运输成本能够被覆盖
- ⚠️ **利润影响**：可能降低 Drop off 模式的利润率
- ⚠️ **用户行为**：可能引导更多用户选择 Drop off 模式

---

## 🎯 最佳实践

### **1. 定期审查**

- 每月审查 Drop off 模式的实际运输成本
- 对比 Direct 和 Drop off 模式的成本差异
- 根据实际数据调整倍数

### **2. 成本核算**

```sql
-- 分析 Drop off 模式的实际运输成本
SELECT
    tt.trucking_company_id,
    w.warehouse_code,
    AVG(tt.distance_km) as avg_distance,
    AVG(tt.cost) as avg_cost,
    COUNT(*) as trip_count
FROM trucking_transport tt
JOIN warehouse_operation wo ON tt.container_number = wo.container_number
JOIN dict_warehouses w ON wo.warehouse_code = w.warehouse_code
WHERE tt.trucking_type = 'Drop off'
GROUP BY tt.trucking_company_id, w.warehouse_code
ORDER BY avg_distance DESC;
```

### **3. 策略调整**

- **旺季**：可提高倍数（如 2.0）以反映真实成本
- **淡季**：可降低倍数（如 1.0）以吸引客户
- **特殊时期**：可根据市场情况灵活调整

---

## 📊 监控指标

### **关键指标**

1. **Drop off 模式使用率**
   - 公式：Drop off 柜数 / 总柜数
   - 目标：根据业务策略调整

2. **单次运输平均成本**
   - 公式：Drop off 模式总运输费 / Drop off 柜数
   - 目标：覆盖成本并保持合理利润

3. **Direct vs Drop off 成本比**
   - 公式：Drop off 平均成本 / Direct 平均成本
   - 目标：反映真实成本差异

---

## 🔗 相关文档

- [dict_scheduling_config 配置参数完整说明](./dict_scheduling_config 配置参数完整说明.md)
- [Drop off 模式运输费倍数配置化修复](./Drop off 模式运输费倍数配置化修复.md)
- [智能排柜费用计算逻辑](./智能排柜费用计算逻辑说明.md)

---

**最后更新**：2026-03-25  
**维护人员**：LogiX 开发团队  
**当前配置值**：`1.0`
