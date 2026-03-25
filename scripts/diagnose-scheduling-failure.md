# 排产失败问题诊断报告

## 📊 问题现象

**错误消息**:

```
✗ ECMU5397691: 无映射关系中的仓库（请配置 dict_trucking_port_mapping、dict_warehouse_trucking_mapping）
✗ ECMU5399797: 无映射关系中的仓库（请配置 dict_trucking_port_mapping、dict_warehouse_trucking_mapping）
✗ ECMU5399586: 无映射关系中的仓库（请配置 dict_trucking_port_mapping、dict_warehouse_trucking_mapping）
```

**排产结果**: 成功 0/5，失败 5

---

## 🔍 根本原因

### 1️⃣ **目的港字段缺失**

查询结果显示：

- ✅ **5 个货柜全部缺失目的港**（missing_rate = 100%）
- ✅ **都是 GB（英国）的货柜**
- ✅ **port_of_discharge 字段为空**

```sql
container_number | port_of_discharge | sell_to_country
-----------------+-------------------+----------------
ECMU5399586      |                   | GB
ECMU5397691      |                   | GB
ECMU5399797      |                   | GB
```

### 2️⃣ **映射链断裂**

智能排产的映射逻辑：

```
港口 (portCode) → dict_trucking_port_mapping → 车队 (truckingCompanyId)
                → dict_warehouse_trucking_mapping → 仓库 (warehouseCode)
```

**问题**: 因为 `port_of_discharge` 为空，代码执行到：

```typescript
const portMappings = await this.truckingPortMappingRepo.find({
  where: { portCode, country: countryCode, isActive: true },
});
if (portMappings.length === 0) return []; // ← 返回空数组
```

由于 `portCode` 为空或不存在，找不到任何映射，导致排产失败。

---

## 🛠️ 解决方案

### 方案 A: 补充目的港数据（推荐）✅

#### 步骤 1: 确定正确的目的港

根据业务实际情况，英国的常见目的港可能是：

- **GBLHR** - London（伦敦）- ✅ 数据库中已有
- **GBPVG** - Port of Grangemouth
- **GBSOU** - Southampton
- **GBFXT** - Felixstowe

#### 步骤 2: 执行修复 SQL

```sql
-- 使用 GBLHR（伦敦）作为默认目的港
UPDATE process_sea_freight sf
SET port_of_discharge = 'GBLHR'
WHERE bill_of_lading_number IN (
  SELECT c.bill_of_lading_number
  FROM biz_containers c
  JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
  WHERE c.container_number IN (
    'ECMU5397691', 'ECMU5399797', 'ECMU5399586',
    'ECMU5381817', 'ECMU5400183'
  )
);
```

#### 步骤 3: 验证修复

```sql
SELECT
    c.container_number AS "箱号",
    sf.port_of_discharge AS "目的港",
    ro.sell_to_country AS "销往国家"
FROM biz_containers c
JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
WHERE c.container_number IN ('ECMU5397691', 'ECMU5399797', 'ECMU5399586');
```

#### 步骤 4: 重新排产

在前端重新执行排产操作。

---

### 方案 B: 添加港口→车队映射（如果港口已存在）

如果这些货柜实际上有其他港口信息（如 transit_port_code），可以添加相应的映射：

```sql
-- 检查是否有中转港
SELECT container_number, transit_port_code
FROM process_sea_freight
WHERE bill_of_lading_number IN (...);

-- 如果有中转港，添加映射
INSERT INTO dict_trucking_port_mapping (port_code, country, trucking_company_id, is_active)
VALUES ('TRANSIT_PORT_CODE', 'GB', 'TRUCKING_COMPANY_ID', true);
```

---

### 方案 C: 修改代码逻辑（不推荐）❌

修改 `getCandidateWarehouses` 方法，在 portCode 为空时回退到按国家查找仓库：

```typescript
// 不推荐：这会绕过港口映射约束，可能导致不合理的仓库分配
if (!portCode) {
  // 回退到按国家查找所有仓库
  return await this.warehouseRepo.find({
    where: { country: countryCode, status: "ACTIVE" },
  });
}
```

**为什么不推荐**:

- ❌ 违反了"港口→车队→仓库"的映射设计原则
- ❌ 可能导致货物被分配到不合理或不经济的仓库
- ❌ 掩盖了数据质量问题

---

## ✅ 推荐操作顺序

### 立即执行（修复当前问题）

1. **确认目的港** - 联系业务团队确认这 5 个货柜的实际目的港
2. **更新数据** - 执行方案 A 的 SQL 更新
3. **重新排产** - 在前端重新执行排产

### 长期改进（防止再次发生）

1. **数据验证** - 在导入时强制要求提供目的港
2. **前端提示** - 如果目的港为空，显示警告但不阻止导入
3. **智能推断** - 根据历史数据或航线自动推断目的港（可选）

---

## 📝 执行脚本

### 快速修复脚本

```powershell
# 复制并执行修复 SQL
docker cp scripts\fix-missing-destination-port.sql logix-timescaledb-prod:/tmp/
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -f /tmp/fix-missing-destination-port.sql

# 执行实际修复（假设目的港为 GBLHR）
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
UPDATE process_sea_freight sf
SET port_of_discharge = 'GBLHR'
WHERE bill_of_lading_number IN (
  SELECT c.bill_of_lading_number
  FROM biz_containers c
  JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
  WHERE c.container_number IN (
    'ECMU5397691', 'ECMU5399797', 'ECMU5399586',
    'ECMU5381817', 'ECMU5400183'
  )
);
"
```

### 验证查询

```sql
-- 检查修复后的状态
SELECT
    c.container_number,
    sf.port_of_discharge,
    ro.sell_to_country,
    CASE
        WHEN sf.port_of_discharge IS NULL OR sf.port_of_discharge = '' THEN '❌ 仍需修复'
        ELSE '✅ 已修复'
    END AS status
FROM biz_containers c
JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
WHERE c.container_number IN ('ECMU5397691', 'ECMU5399797', 'ECMU5399586')
ORDER BY c.container_number;
```

---

## 🎯 总结

**问题根源**: 目的港字段缺失导致映射链断裂  
**推荐方案**: 补充目的港数据（GBLHR - London）  
**预计效果**: 修复后 5 个货柜都能正常排产

---

**生成时间**: 2026-03-24  
**诊断依据**: SKILL 规范 - 基于权威源验证  
**状态**: ⏳ 等待修复执行
