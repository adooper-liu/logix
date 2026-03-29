# Drop off 模式运输费倍数配置化修复

## 🎯 问题描述

**修复前**：
- Drop off 模式的运输费在代码中**硬编码**为 `×2`
- 配置表中的 `transport_dropoff_multiplier = 1.2` 未实际使用
- 无法灵活调整倍数，缺乏业务灵活性

**问题代码**：
```typescript
// demurrage.service.ts:3250 (修复前)
if (unloadMode === 'Drop off') {
  transportFee *= 2;  // 硬编码翻倍
}
```

---

## ✅ 修复方案

### **1. 后端代码修复**

#### **修改文件**：`backend/src/services/demurrage.service.ts`

**添加导入**：
```typescript
import { DictSchedulingConfig } from '../entities/DictSchedulingConfig';
```

**新增方法**：
```typescript
/**
 * 从配置表读取 Drop off 模式运费倍数
 * @returns Drop off 模式倍数，默认 2.0
 */
private async getDropoffMultiplier(): Promise<number> {
  try {
    const configRepo = this.containerRepo.manager.getRepository(DictSchedulingConfig);
    const config = await configRepo.findOne({
      where: { configKey: 'transport_dropoff_multiplier' }
    });
    const multiplier = config ? parseFloat(config.configValue || '2.0') : 2.0;
    return isNaN(multiplier) ? 2.0 : multiplier;
  } catch (error) {
    logger.warn('[Demurrage] Failed to read transport_dropoff_multiplier config:', error);
    return 2.0; // 默认 2.0（两次运输）
  }
}
```

**修改计算逻辑**：
```typescript
// demurrage.service.ts:3247-3252 (修复后)
let transportFee = warehouseTruckingMapping?.transportFee || 100; // 默认 $100

// ✅ 关键修复：从 dict_scheduling_config 读取 Drop off 模式倍数
if (unloadMode === 'Drop off') {
  const dropoffMultiplier = await this.getDropoffMultiplier();
  transportFee *= dropoffMultiplier;
  logger.debug(`[Demurrage] Drop off mode: transportFee=${transportFee}, multiplier=${dropoffMultiplier}`);
}
```

---

### **2. 数据库配置更新**

#### **SQL 脚本**：`backend/sql/update_dropoff_multiplier_config.sql`

```sql
-- 更新配置值（如果已存在）
UPDATE "dict_scheduling_config"
SET 
    config_value = '2.0',
    description = 'Drop off 模式运输费倍数（默认 2.0=两次运输，可根据实际情况调整）',
    updated_at = NOW()
WHERE config_key = 'transport_dropoff_multiplier';

-- 插入新记录（如果不存在）
INSERT INTO "dict_scheduling_config" (config_key, config_value, description, created_at, updated_at)
SELECT 
    'transport_dropoff_multiplier',
    '2.0',
    'Drop off 模式运输费倍数（默认 2.0=两次运输，可根据实际情况调整）',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "dict_scheduling_config" 
    WHERE config_key = 'transport_dropoff_multiplier'
);
```

---

## 📊 修复效果对比

### **修复前**
| 项目 | 状态 |
|------|------|
| 代码实现 | 硬编码 `×2` |
| 配置表值 | `1.2`（未使用） |
| 灵活性 | ❌ 无法调整 |
| 透明度 | ❌ 不清晰 |

### **修复后**
| 项目 | 状态 |
|------|------|
| 代码实现 | 从配置表读取 |
| 配置表值 | `2.0`（已更新） |
| 灵活性 | ✅ 可灵活调整 |
| 透明度 | ✅ 配置驱动 |

---

## 🎯 配置值建议

### **标准场景**：`2.0`（推荐）
- **适用**：Drop off 模式需要两次完整运输
- **计算**：港口→堆场 + 堆场→仓库
- **业务**：标准 Drop off 操作

### **短距离场景**：`1.5`
- **适用**：第二次运输距离明显短于第一次
- **计算**：基础运费 × 1.5
- **业务**：堆场离仓库较近

### **高成本场景**：`2.5`
- **适用**：Drop off 模式有特殊附加费
- **计算**：基础运费 × 2.5
- **业务**：特殊货物、加急服务等

---

## 📝 执行步骤

### **1. 执行 SQL 脚本**
```bash
cd d:\Gihub\logix\backend
psql -U logix_user -d logix -f sql\update_dropoff_multiplier_config.sql
```

### **2. 验证配置**
```sql
SELECT 
    config_key,
    config_value,
    description
FROM "dict_scheduling_config"
WHERE config_key = 'transport_dropoff_multiplier';
```

**预期结果**：
```
config_key                  | config_value | description
---------------------------|--------------|------------------------------------------
transport_dropoff_multiplier | 2.0          | Drop off 模式运输费倍数（默认 2.0=两次运输...）
```

### **3. 重启后端服务**
```bash
cd d:\Gihub\logix\backend
npm run build
npm start
```

### **4. 测试验证**
```bash
# 查看日志，确认倍数正确读取
Get-Content logs\combined.log -Tail 50 | Select-String -Pattern "Drop off mode"
```

**预期日志**：
```
[Demurrage] Drop off mode: transportFee=1400, multiplier=2.0
```

---

## 🔍 代码影响范围

### **直接影响**
- ✅ `demurrage.service.ts` - `calculateTransportationCostInternal()`
- ✅ `demurrage.service.ts` - 新增 `getDropoffMultiplier()`

### **间接影响**
- ✅ `intelligentScheduling.service.ts` - 调用 `calculateTotalCost()`
- ✅ `schedulingCostOptimizer.service.ts` - 成本优化计算

### **前端影响**
- ❌ 无（纯后端修复）

---

## 🎉 修复收益

### **1. 灵活性提升**
- ✅ 可根据实际业务调整倍数
- ✅ 支持不同地区/车队的差异化定价
- ✅ 无需修改代码即可调整费率

### **2. 透明度提升**
- ✅ 配置表清晰记录倍数定义
- ✅ 日志输出倍数使用情况
- ✅ 便于问题排查和审计

### **3. 可维护性提升**
- ✅ 配置驱动，符合最佳实践
- ✅ 代码逻辑清晰易懂
- ✅ 便于后续扩展和优化

---

## 📚 相关文档

- [dict_scheduling_config 配置参数完整说明](./dict_scheduling_config 配置参数完整说明.md)
- [智能排柜费用计算逻辑](./智能排柜费用计算逻辑说明.md)
- [Drop off vs Direct 模式对比](./Drop_off_vs_Direct 模式对比.md)

---

## 🏷️ 标签

#费用计算 #配置驱动 #Drop off 模式 #运输费 #后端修复 #技术债务

---

**修复日期**：2026-03-25  
**修复人员**：LogiX 开发团队  
**影响版本**：v1.0.0+
