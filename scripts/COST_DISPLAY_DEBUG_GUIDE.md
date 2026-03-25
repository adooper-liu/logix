# 费用显示调试指南

## 问题现象

排产预览弹窗中，所有费用都显示为 $00.00

## 可能原因

### 1. 数据库缺少费用配置

#### 检查滞港费标准

```sql
-- 检查是否有滞港费标准配置
SELECT * FROM dict_demurrage_standards
WHERE is_active = true
ORDER BY charge_type_code;
```

**预期结果**：应该有至少一条记录

**如果为空**：需要初始化滞港费标准数据

---

### 2. 货柜在免费期内

如果卸柜日期在免费期内，滞港费和滞箱费都会是 0。

#### 检查免费期配置

```sql
-- 查看免费天数配置
SELECT id, charge_type_code, free_days, free_days_basis
FROM dict_demurrage_standards
WHERE is_active = true;
```

---

### 3. 缺少仓库 - 车队映射

运输费需要 `warehouse_trucking_mapping` 和 `trucking_port_mapping` 配置。

#### 检查映射配置

```sql
-- 检查仓库 - 车队映射
SELECT * FROM warehouse_trucking_mapping
WHERE warehouse_code = 'WH001' AND is_active = true;

-- 检查车队 - 港口映射
SELECT * FROM dict_trucking_port_mapping
WHERE port_code = 'USLAX' AND is_active = true;
```

---

## 调试步骤

### Step 1: 检查后端日志

```bash
cd backend
Get-Content logs\*.log -Tail 100 | Select-String -Pattern "calculateEstimatedCosts|Demurrage|Transportation"
```

**查找以下日志**：

- `[IntelligentScheduling] Demurrage prediction failed` - 滞港费计算失败
- `[IntelligentScheduling] No trucking mapping found` - 缺少映射配置
- `[IntelligentScheduling] No trucking-port mapping found` - 缺少港口映射

---

### Step 2: 手动测试费用计算

创建一个测试脚本：

```typescript
// test-cost-calculation.ts
import { intelligentSchedulingService } from "./src/services/intelligentScheduling.service";

async function testCostCalculation() {
  const result = await intelligentSchedulingService.calculateEstimatedCosts(
    "ECMU5397691", // 测试柜号
    new Date("2026-03-25"), // 提柜日
    new Date("2026-03-25"), // 卸柜日
    new Date("2026-03-25"), // 还箱日
    "Live load", // 卸柜方式
    { warehouseCode: "WH001", warehouseName: "Test" } as any,
    { companyCode: "TRUCK001", companyName: "Test" } as any,
  );

  console.log("Cost calculation result:", result);
}

testCostCalculation();
```

---

### Step 3: 检查数据完整性

```sql
-- 1. 检查货柜是否有目的港信息
SELECT
  c.container_number,
  po.port_code,
  po.ata,
  po.eta
FROM containers c
LEFT JOIN port_operations po ON c.container_number = po.container_number
  AND po.port_type = 'destination'
WHERE c.container_number = 'ECMU5397691';

-- 2. 检查仓库配置
SELECT * FROM warehouses WHERE warehouse_code = 'WH001';

-- 3. 检查车队配置
SELECT * FROM trucking_companies WHERE company_code = 'TRUCK001';
```

---

## 快速验证方案

### 方案 A: 添加测试数据

```sql
-- 1. 添加滞港费标准（如果不存在）
INSERT INTO dict_demurrage_standards (
  charge_type_code, charge_name, free_days, rate_per_day,
  calculation_basis, currency, is_active
) VALUES (
  'DEMER', 'Demurrage', 5, 100, 'BY_ARRIVAL', 'USD', true
), (
  'DETEN', 'Detention', 5, 100, 'BY_ARRIVAL', 'USD', true
) ON CONFLICT DO NOTHING;

-- 2. 添加仓库 - 车队映射（如果不存在）
INSERT INTO warehouse_trucking_mapping (
  country, warehouse_code, trucking_company_id,
  is_default, is_active
) VALUES (
  'US', 'WH001', 'TRUCK001', true, true
) ON CONFLICT DO NOTHING;

-- 3. 添加车队 - 港口映射（如果不存在）
INSERT INTO dict_trucking_port_mapping (
  country, trucking_company_id, port_code,
  transport_fee, standard_rate, yard_operation_fee,
  is_active
) VALUES (
  'US', 'TRUCK001', 'USLAX',
  150, 50, 25,
  true
) ON CONFLICT DO NOTHING;
```

---

### 方案 B: 修改代码强制返回测试费用

临时修改 `calculateEstimatedCosts` 方法：

```typescript
private async calculateEstimatedCosts(...) {
  // 强制返回测试费用
  return {
    demurrageCost: 500,
    detentionCost: 300,
    storageCost: 200,
    transportationCost: 400,
    totalCost: 1400,
    currency: 'USD'
  };
}
```

然后重启后端，刷新前端页面，看是否显示费用。

---

## 预期行为

### 成功场景

如果所有配置都正确：

```
预估费用列应该显示：
- 滞港费：$XXX
- 滞箱费：$XXX
- 仓储费：$XXX（Drop off 模式）
- 运输费：$XXX
- 总费用：$XXXX
```

### 失败场景

如果配置缺失：

```
预估费用列显示：$00.00
日志输出警告信息
```

---

## 下一步

1. **检查数据库配置**（优先）
2. **查看后端日志**（最重要）
3. **添加测试数据**（如果配置缺失）
4. **手动测试费用计算**（高级调试）

---

**创建时间**: 2026-03-25  
**目的**: 诊断费用显示为 0 的问题
