# 费用计算数据源修复记录

## 问题描述

在排产预览费用显示功能实施时，运输费计算使用了**硬编码的距离矩阵示例值**，而非从数据库读取真实配置。

### 原始代码（需要修复）

```typescript
// intelligentScheduling.service.ts Line 1234-1246
const distanceMatrix: Record<string, Record<string, number>> = {
  USLAX: { WH001: 25, WH002: 35, WH003: 45 },
  USLGB: { WH001: 30, WH002: 40, WH003: 50 },
  USOAK: { WH004: 20, WH005: 35 },
  USSEA: { WH006: 25 }
};

const distance = distanceMatrix[portCode]?.[warehouse.warehouseCode] || 50;
const transportationCost = baseRate + distance * ratePerMile;
```

---

## 解决方案

### 参考实现

`schedulingCostOptimizer.service.ts` 已经正确实现了从数据库读取运输费用的逻辑（Line 720-734）。

### 修复方案

修改 `intelligentScheduling.service.ts` 的 `calculateTransportationCost` 方法，采用与成本优化器相同的逻辑：

1. **获取目的港**：从货柜的 portOperations 获取 destination port
2. **获取仓库关联车队**：查询 `warehouse_trucking_mapping` 表
3. **获取运输费用**：查询 `trucking_port_mapping` 表的 `transport_fee` 字段
4. **Drop off 模式处理**：费用翻倍（往返两次运输）

---

## 代码修改对比

### 修改前（基于距离估算）

```typescript
// 1. 硬编码距离矩阵
const distanceMatrix = { ... };

// 2. 查距离
const distance = distanceMatrix[portCode]?.[warehouseCode] || 50;

// 3. 计算费用
const transportationCost = 100 + distance * 2;

// 4. Drop off 翻倍
return unloadMode === 'Drop off' ? transportationCost * 2 : transportationCost;
```

### 修改后（从数据库读取）

```typescript
// 1. 获取仓库关联的车队
const warehouseTruckingMappings = await this.warehouseTruckingMappingRepo.find({
  where: { warehouseCode, country, isActive: true }
});

// 2. 查询 TruckingPortMapping 获取运输费用
for (const mapping of warehouseTruckingMappings) {
  const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
    where: { country, portCode, truckingCompanyId, isActive: true }
  });
  
  if (truckingPortMapping) {
    transportFee = truckingPortMapping.transportFee || 0;
    break;
  }
}

// 3. Drop off 翻倍
return unloadMode === 'Drop off' ? transportFee * 2 : transportFee;
```

---

## 数据库表结构

### dict_trucking_port_mapping

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | int | 主键 |
| country | varchar(50) | 国家代码 |
| trucking_company_id | varchar(100) | 车队公司代码 |
| port_code | varchar(50) | 港口代码 |
| yard_capacity | decimal(10,2) | 堆场容量 |
| standard_rate | decimal(10,2) | 堆存日费率 |
| yard_operation_fee | decimal(10,2) | 堆场操作费 |
| **transport_fee** | decimal(10,2) | **运输费（单次）** |
| is_active | boolean | 是否启用 |

### warehouse_trucking_mapping

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | int | 主键 |
| country | varchar(50) | 国家代码 |
| warehouse_code | varchar(50) | 仓库代码 |
| trucking_company_id | varchar(100) | 车队公司代码 |
| is_default | boolean | 是否默认 |
| is_active | boolean | 是否启用 |

---

## 费用计算流程

```
1. 输入：containerNumber, warehouse, unloadMode
   ↓
2. 获取货柜的目的港 (portCode)
   ↓
3. 查询 warehouse_trucking_mapping
   → 获取与该仓库关联的所有车队
   ↓
4. 遍历车队，查询 trucking_port_mapping
   → 匹配条件：country + portCode + truckingCompanyId
   → 读取 transport_fee 字段
   ↓
5. 如果找到映射：使用 transport_fee
   如果未找到：使用默认值 $100
   ↓
6. 如果是 Drop off 模式：费用 × 2
   否则：保持原费用
   ↓
7. 返回最终运输费用
```

---

## 测试验证

### 测试场景 1：有完整映射配置

```
输入：
- containerNumber: "TEST123"
- warehouse: { warehouseCode: "WH001", country: "US" }
- unloadMode: "Direct"
- portCode: "USLAX"

数据库配置：
- warehouse_trucking_mapping: WH001 → TRUCK001
- trucking_port_mapping: TRUCK001 + USLAX → transport_fee = 150

预期输出：
- transportationCost = 150
```

### 测试场景 2：Drop off 模式

```
输入：同上，但 unloadMode = "Drop off"

预期输出：
- transportationCost = 150 × 2 = 300
```

### 测试场景 3：无映射配置（使用默认值）

```
输入：
- warehouse: { warehouseCode: "WH999", country: "US" }
- portCode: "USLAX"

数据库配置：
- warehouse_trucking_mapping: 无记录

预期输出：
- transportationCost = 100（默认值）
- 日志输出警告信息
```

---

## 日志输出示例

### 正常情况

```
[IntelligentScheduling] Transport cost for TEST123: 
Port=USLAX, Warehouse=WH001, Fee=$150
```

### 警告情况

```
[IntelligentScheduling] No trucking mapping found for warehouse WH999
[IntelligentScheduling] No trucking-port mapping found for port USLAX, using default fee
```

---

## 与其他服务的一致性

### schedulingCostOptimizer.service.ts

```typescript
// Line 720-731
const truckingPortMapping = await this.truckingPortMappingRepo.findOne({
  where: { country, portCode, truckingCompanyId, isActive: true }
});

if (truckingPortMapping) {
  totalTransportCost = truckingPortMapping.standardRate || 0;
  break;
}
```

⚠️ **注意**：成本优化器使用的是 `standardRate`（堆存费率），而我们需要的是 `transportFee`（运输费）。

### intelligentScheduling.service.ts（修复后）

```typescript
if (truckingPortMapping) {
  transportFee = truckingPortMapping.transportFee || 0; // ← 使用 transportFee
  break;
}
```

✅ **一致性保证**：两个服务都从同一个数据表读取配置，确保费用计算的一致性。

---

## 影响范围

### 修改的文件

- `backend/src/services/intelligentScheduling.service.ts` (Line 1214-1258)

### 影响的功能

- 排产预览（dryRun 模式）的费用计算
- 正式排产的费用预估

### 不受影响的功能

- 成本优化器的独立费用评估（使用 `standardRate`）
- 滞港费、滞箱费、仓储费的计算逻辑

---

## 后续优化建议

### 1. 缓存机制

```typescript
// 建议实现：TTL=5 分钟的缓存
private transportFeeCache = new Map<string, { fee: number, timestamp: number }>();

async getTransportFee(portCode: string, warehouseCode: string): Promise<number> {
  const cacheKey = `${portCode}:${warehouseCode}`;
  const cached = this.transportFeeCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.fee;
  }
  
  // 从数据库读取并缓存
  const fee = await this.fetchFromDatabase(portCode, warehouseCode);
  this.transportFeeCache.set(cacheKey, { fee, timestamp: Date.now() });
  return fee;
}
```

### 2. 批量查询优化

```typescript
// 当前：N+1 查询问题
for (const mapping of warehouseTruckingMappings) {
  await this.truckingPortMappingRepo.findOne(...)
}

// 优化：一次性查询所有映射
const truckingCompanyIds = warehouseTruckingMappings.map(m => m.truckingCompanyId);
const mappings = await this.truckingPortMappingRepo.findBy({
  country,
  portCode,
  truckingCompanyId: In(truckingCompanyIds),
  isActive: true
});
```

### 3. 配置化默认值

```typescript
// 当前：硬编码默认值
transportFee = 100;

// 建议：从配置表读取
transportFee = await this.getConfigNumber('transport_default_fee', 100);
```

---

## 验证步骤

1. **检查数据库配置**
   ```sql
   -- 查看 trucking_port_mapping 配置
   SELECT * FROM dict_trucking_port_mapping 
   WHERE port_code = 'USLAX' AND is_active = true;
   
   -- 查看 warehouse_trucking_mapping 配置
   SELECT * FROM warehouse_trucking_mapping 
   WHERE warehouse_code = 'WH001' AND is_active = true;
   ```

2. **重启后端服务**
   ```bash
   cd backend
   npm run dev
   ```

3. **测试预览功能**
   - 打开排产可视化页面
   - 点击"预览排产"
   - 查看费用明细中的运输费

4. **检查日志**
   - 查看是否有"No trucking mapping found"警告
   - 确认费用计算是否正确

---

## 相关文档

- [费用显示实施记录](./SCHEDULING_COST_DISPLAY_IMPLEMENTATION.md)
- [快速参考](./COST_DISPLAY_QUICK_REFERENCE.md)
- [智能排产完整回顾](./INTELLIGENT_SCHEDULING_COMPLETE_REVIEW.md)

---

**修复时间**: 2026-03-21  
**修复状态**: ✅ 完成  
**测试状态**: ⏳ 待验证
