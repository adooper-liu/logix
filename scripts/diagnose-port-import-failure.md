# 目的港导入失败问题诊断报告

## 📊 问题现象

**Excel 中有"目的港"列**，填写的是"费利克斯托"，但导入后数据库中 `port_of_discharge` 字段为空。

---

## 🔍 根本原因分析

### 1️⃣ **港口解析逻辑**

后端导入处理流程（`import.controller.ts`）：

```typescript
// 第 526-527 行
if (seaFreightData.portOfDischarge) {
  seaFreightData.portOfDischarge = await this.validatePort(queryRunner, seaFreightData.portOfDischarge);
}
```

`validatePort` 方法（第 324-344 行）：
```typescript
private async validatePort(queryRunner: any, portName: string): Promise<string | null> {
  const code = await this.resolvePortCode(queryRunner, portName);
  if (code) return code;
  
  // 未匹配到港口，尝试自动创建
  const candidate = trimmedName.toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9]{5}$/.test(candidate)) {
    // ❌ 中文名不符合 UN/LOCODE 标准，返回 null
    logger.warn(`[Import] 跳过自动创建港口：非标准 port_code（${trimmedName}）`);
    return null;
  }
  // ... 自动创建逻辑
}
```

`resolvePortCode` 方法（第 222-235 行）：
```typescript
private async resolvePortCode(queryRunner: any, nameOrCode: string): Promise<string | null> {
  const v = nameOrCode.trim();
  const port = await queryRunner.manager
    .getRepository(Port)
    .createQueryBuilder('p')
    .where('p.port_code = :v OR LOWER(TRIM(p.port_name)) = LOWER(:v) OR (p.port_name_en IS NOT NULL AND LOWER(TRIM(p.port_name_en)) = LOWER(:v))', { v })
    .getOne();
  
  if (!port) {
    logger.warn(`[Import] 港口未匹配（口径统一）: ${v}`);
    return null;  // ← 未找到匹配的港口
  }
  return port.portCode;
}
```

### 2️⃣ **问题链条**

```
Excel: "费利克斯托"
    ↓
前端映射：port_of_discharge = "费利克斯托"
    ↓
后端处理：resolvePortCode("费利克斯托")
    ↓
数据库查询：port_name = "费利克斯托" OR port_name_en = "费利克斯托"
    ↓
❌ 未找到匹配记录（数据库中没有这个港口）
    ↓
尝试自动创建：validatePort("费利克斯托")
    ↓
检查格式："费利克斯托".toUpperCase() = "费利克斯托"
    ↓
❌ 不符合正则 /^[A-Z0-9]{5}$/（不是标准 UN/LOCODE 代码）
    ↓
返回 null
    ↓
port_of_discharge = null
```

### 3️⃣ **实际日志验证**

```json
{"level":"warn","message":"[Import] 港口未匹配（口径统一）: 费利克斯托","timestamp":"2026-03-21 21:19:26"}
{"level":"info","message":"[Import] 自动创建港口（口径统一）: 费利克斯托 → 费利克斯托","timestamp":"2026-03-21 21:19:26"}
```

但"费利克斯托"被跳过，最终返回 `null`。

---

## ️ 解决方案

### 方案 A: 手动添加港口到字典表（推荐）✅

#### 步骤 1: 执行 SQL 添加港口

```sql
-- 添加费利克斯托港口（Felixstowe, UK）
INSERT INTO dict_ports (port_code, port_name, port_name_en, country)
VALUES ('GBFXT', '费利克斯托', 'Felixstowe', 'GB')
ON CONFLICT (port_code) DO NOTHING;
```

#### 步骤 2: 重新导入货柜数据

或者更新已导入的货柜：

```sql
-- 更新目的港字段
UPDATE process_sea_freight sf
SET port_of_discharge = 'GBFXT'
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

#### 步骤 3: 验证

```sql
SELECT 
    c.container_number AS "箱号",
    sf.port_of_discharge AS "目的港代码",
    p.port_name AS "目的港名称",
    ro.sell_to_country AS "销往国家"
FROM biz_containers c
JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
LEFT JOIN dict_ports p ON p.port_code = sf.port_of_discharge
WHERE c.container_number IN (
  'ECMU5397691', 'ECMU5399797', 'ECMU5399586'
)
ORDER BY c.container_number;
```

---

### 方案 B: 使用英文港口名称导入（临时方案）

在 Excel 中将"目的港"改为"Felixstowe"，这样：
- ✅ 如果数据库中已有 Felixstowe 港口记录，会匹配成功
- ❌ 如果数据库中没有，仍然会失败

---

### 方案 C: 修改导入逻辑（不推荐）❌

允许中文名作为 port_code：

```typescript
// 不推荐：这会破坏 UN/LOCODE 标准
const candidate = trimmedName.toUpperCase().replace(/\s+/g, '');
// 移除正则检查
// if (!/^[A-Z0-9]{5}$/.test(candidate)) { ... }
```

**为什么不推荐**:
- ❌ 违反 UN/LOCODE 国际标准
- ❌ 导致港口代码混乱（如"费利克斯托"、"上海洋山港"等）
- ❌ 影响后续港口映射和查询

---

## ✅ 推荐执行步骤

### 立即执行

```powershell
# 1. 复制并执行添加港口脚本
docker cp scripts\add-felixstowe-port.sql logix-timescaledb-prod:/tmp/add-felixstowe-port.sql
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -f /tmp/add-felixstowe-port.sql

# 2. 或者直接在 PowerShell 中执行
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
INSERT INTO dict_ports (port_code, port_name, port_name_en, country)
VALUES ('GBFXT', '费利克斯托', 'Felixstowe', 'GB')
ON CONFLICT (port_code) DO NOTHING;
"

# 3. 验证港口已添加
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT port_code, port_name, port_name_en, country 
FROM dict_ports 
WHERE port_code = 'GBFXT';
"

# 4. 更新已导入货柜的目的港
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
UPDATE process_sea_freight sf
SET port_of_discharge = 'GBFXT'
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

# 5. 验证更新结果
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT 
    c.container_number,
    sf.port_of_discharge,
    p.port_name,
    ro.sell_to_country
FROM biz_containers c
JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
LEFT JOIN dict_ports p ON p.port_code = sf.port_of_discharge
WHERE c.container_number IN ('ECMU5397691', 'ECMU5399797', 'ECMU5399586')
ORDER BY c.container_number;
"
```

### 重新排产

在前端重新执行智能排产，应该能成功了！

---

## 📝 预防措施

### 1. 导入前检查

在 Excel 导入前，先确认目的港是否在字典表中：

```sql
-- 检查常用英国港口
SELECT port_code, port_name, port_name_en 
FROM dict_ports 
WHERE country = 'GB' OR port_code LIKE 'GB%'
ORDER BY port_code;
```

### 2. 导入时提示

如果遇到"港口未匹配"警告，说明需要先添加港口到字典表。

### 3. 常用港口列表

建议在帮助文档中列出支持的港口列表，方便用户参考。

---

## 📊 相关脚本文件

- 📄 [`scripts/add-felixstowe-port.sql`](d:\Gihub\logix\scripts\add-felixstowe-port.sql) - 添加费利克斯托港口
- 📄 [`scripts/fix-missing-destination-port.sql`](d:\Gihub\logix\scripts\fix-missing-destination-port.sql) - 诊断目的港缺失
- 📄 [`scripts/diagnose-scheduling-failure.md`](d:\Gihub\logix\scripts\diagnose-scheduling-failure.md) - 排产失败诊断报告

---

**生成时间**: 2026-03-24  
**问题根源**: 数据库中缺少"费利克斯托"港口记录  
**解决方案**: 添加港口到字典表，然后重新导入或更新数据  
**状态**: ⏳ 等待执行
