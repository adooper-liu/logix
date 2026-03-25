# 移除 ATA 字段自动填充逻辑

## 📋 修改说明

### 修改文件
**文件**: `backend/src/controllers/import.controller.ts`

**位置**: 第 1072-1084 行（原代码）

### 修改内容

#### ❌ 已删除的代码

```typescript
// 重要：ata 字段在 process_port_operations 表中是 NOT NULL（TimescaleDB 分区键要求）
// 如果未提供，使用一个合理的默认值（当前日期 + 30 天，模拟预计到港）
if (!port.ata && !port.eta) {
  // 如果没有 ETA，使用当前日期后推 30 天作为占位值
  const defaultAta = new Date();
  defaultAta.setDate(defaultAta.getDate() + 30);
  port.ata = defaultAta;
  logger.info(`[Import] 港口操作 ata 为空，使用默认值：${defaultAta.toISOString()}`);
} else if (!port.ata && port.eta) {
  // 如果有 ETA，使用 ETA 作为 ata 的默认值
  port.ata = port.eta;
  logger.info(`[Import] 港口操作 ata 为空，使用 eta 作为默认值：${port.eta}`);
}
```

#### ✅ 新代码

```typescript
// 【已移除】不再自动填充 ata 字段
// 原因：数据库已改为普通表，ata 字段可以为 NULL
// 业务场景：货物未到达前，ata 应该为空
```

## 🎯 修改原因

### 1. **数据库结构已变更**
- ✅ `process_port_operations` 表现在是普通 PostgreSQL 表
- ✅ 不再是 TimescaleDB hypertable
- ✅ `ata` 字段允许为 NULL（已移除 NOT NULL约束）

### 2. **符合业务实际**
- ✅ 货物未到达港口前，`ata`（实际到港日期）应该为空
- ✅ 不应该用预计日期或当前日期填充不真实的值
- ✅ 保持数据的真实性和准确性

### 3. **数据质量提升**
- ✅ 避免误导用户（虚假的"实际到港日期"）
- ✅ 明确区分"预计"和"实际"
- ✅ 便于后续数据统计和分析

## 📊 影响范围

### 导入行为变化

| 场景 | Excel 中的列 | 修改前的 ATA 值 | 修改后的 ATA 值 |
|------|------------|---------------|---------------|
| **有 `实际到港日期`** | ✅ 填写了 ATA | ✅ Excel 中的实际值 | ✅ Excel 中的实际值（不变） |
| **有 `预计到港日期`** | ✅ 只有 ETA | ⚠️ 自动填充为 ETA | ✅ **NULL**（不再自动填充） |
| **无任何到港日期** | ❌ 没有 ETA 也没有 ATA | ⚠️ 自动填充为当前日期+30 天 | ✅ **NULL**（不再自动填充） |

### 对现有数据的影响

- ✅ **不影响**：已经导入的数据保持不变
- ✅ **仅影响**：新导入的数据不再自动填充 ATA

## 🔧 相关配置

### 前端映射保持不变

**文件**: `frontend/src/configs/importMappings/container.ts`

ATA 字段的映射配置仍然有效：

```typescript
{
  excelField: '实际到港日期 (目的港)',
  table: 'process_port_operations',
  field: 'ata',
  required: false,  // 非必填
  transform: parseDate,
  aliases: [
    '实际到港日期 (目的港)',
    '实际到港日期（目的港）',
    'ATA(目的港)',
    '目的港实际到港日期',
  ],
}
```

### 后端处理逻辑

现在后端会：
1. ✅ 检查 Excel 中是否有 `实际到港日期` 或其别名
2. ✅ 如果有值，解析并保存到数据库
3. ✅ 如果为空或不存在，**保持为 NULL**（不再自动填充）

## ✅ 验证方法

### 1. 重新初始化数据库

```powershell
.\backend\reinit_database_docker.ps1
```

### 2. 导入测试数据

准备一个 Excel 文件，包含以下情况：
- ✅ 货柜 A：有 `预计到港日期`，无 `实际到港日期`
- ✅ 货柜 B：无任何到港日期
- ✅ 货柜 C：有 `实际到港日期`

### 3. 查询验证

```sql
-- 查询导入结果
SELECT 
    c.container_number AS "箱号",
    sf.eta AS "海运_预计到港",
    sf.ata AS "海运_实际到港",
    po.ata AS "港口_实际到港"
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON sf.bill_of_lading_number = c.bill_of_lading_number
LEFT JOIN process_port_operations po ON po.container_number = c.container_number
WHERE c.container_number IN ('箱号 A', '箱号 B', '箱号 C');
```

**预期结果**：
- 货柜 A：`po.ata` = NULL（不再自动填充 ETA）
- 货柜 B：`po.ata` = NULL（不再自动填充当前日期）
- 货柜 C：`po.ata` = Excel 中的实际值

## 📝 注意事项

### 1. **甘特图显示**

如果甘特图依赖 `ata` 字段显示货柜位置，需要确保：
- ✅ 处理 NULL 值的情况
- ✅ 使用 `eta` 作为 fallback（当 `ata` 为 NULL 时）

### 2. **统计报表**

统计实际到港率等指标时：
- ✅ 只统计 `ata IS NOT NULL` 的记录
- ✅ 明确标注分母是"已到港货柜"，不是"全部货柜"

### 3. **预警规则**

滞港费计算、免费期判断等：
- ✅ 检查 `ata` 是否为 NULL
- ✅ NULL 值表示尚未到港，不应开始计费

## 🔄 回滚方案

如果需要恢复自动填充逻辑（不推荐），可以参考 git 历史：

```bash
git checkout HEAD~1 backend/src/controllers/import.controller.ts
```

然后重新编译并重启后端服务。

---

**修改时间**: 2026-03-24  
**关联问题**: process_port_operations 表 NOT NULL约束冲突  
**状态**: ✅ 已完成
