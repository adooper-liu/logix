# LogiX 数据重新导入指南

## 📌 前置条件

当发现以下问题时,需要重新导入数据:
1. 字段映射缺失导致大量数据未导入
2. 数据库中出现大量空记录
3. 导入数据与Excel原始数据不一致

## ⚠️ 核心原则

**禁止临时补丁修复**: 永远不要使用临时SQL UPDATE/INSERT补丁修复已导入的错误数据

必须按照以下步骤处理:
1. 删除错误的导入数据
2. 修复字段映射或代码逻辑
3. 重新导入Excel,确保数据100%正确

---

## 🔄 完整重新导入流程

### 步骤1: 验证问题存在

检查数据库中是否存在错误导入的数据:

```sql
-- 检查拖卡运输表
SELECT
    container_number,
    carrier_company,
    pickup_date,
    delivery_date
FROM process_trucking_transport
WHERE container_number = 'FANU3376528';

-- 检查仓库操作表
SELECT
    container_number,
    actual_warehouse,
    warehouse_arrival_date,
    wms_status,
    ebs_status
FROM process_warehouse_operations
WHERE container_number = 'FANU3376528';
```

如果返回空记录或关键字段为NULL,说明存在导入问题。

---

### 步骤2: 分析根本原因

#### 2.1 检查前端字段映射

查看 `frontend/src/views/import/ExcelImport.vue` 文件中的 `FIELD_MAPPINGS` 数组:

```typescript
// 拖卡运输表字段映射
{ excelField: '目的港卡车', table: 'process_trucking_transport', field: 'carrier_company', required: false },
{ excelField: '提柜日期', table: 'process_trucking_transport', field: 'pickup_date', required: false, transform: parseDate },
// ... 更多字段

// 仓库操作表字段映射
{ excelField: '入库仓库组', table: 'process_warehouse_operations', field: 'warehouse_group', required: false },
{ excelField: '仓库(实际)', table: 'process_warehouse_operations', field: 'actual_warehouse', required: false },
// ... 更多字段
```

#### 2.2 对比数据库表结构

查看数据库表结构,确认字段名是否正确:

```bash
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "\d process_trucking_transport"
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "\d process_warehouse_operations"
```

#### 2.3 参考正确的字段映射

参考 `docs/CORRECT_FIELD_MAPPINGS.ts` 确认完整的字段映射配置。

---

### 步骤3: 修复字段映射

在 `frontend/src/views/import/ExcelImport.vue` 中更新字段映射:

**关键原则**:
- 使用数据库表名 (如 `process_trucking_transport`)
- 使用数据库字段名 (snake_case, 如 `carrier_company`)
- 确保所有Excel字段都有对应映射
- 日期字段添加 `transform: parseDate`

**示例修复**:

```typescript
// ❌ 错误 - 字段映射不足
{ excelField: '目的港卡车', table: 'process_trucking_transport', field: 'delivery_location', required: false },

// ✅ 正确 - 完整映射
{ excelField: '目的港卡车', table: 'process_trucking_transport', field: 'carrier_company', required: false },
{ excelField: '提柜日期', table: 'process_trucking_transport', field: 'pickup_date', required: false, transform: parseDate },
{ excelField: '送仓日期', table: 'process_trucking_transport', field: 'delivery_date', required: false, transform: parseDate },
```

---

### 步骤4: 删除错误的导入数据

使用清理脚本删除错误导入的数据:

```bash
# 执行清理脚本 (仅检查模式)
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -f scripts/cleanup-invalid-imports.sql

# 如果确认需要删除,取消脚本中的注释后重新执行
```

或者直接删除特定集装箱的数据:

```sql
-- 删除拖卡运输数据
DELETE FROM process_trucking_transport WHERE container_number = 'FANU3376528';

-- 删除仓库操作数据
DELETE FROM process_warehouse_operations WHERE container_number = 'FANU3376528';

-- 验证删除结果
SELECT * FROM process_trucking_transport WHERE container_number = 'FANU3376528';
SELECT * FROM process_warehouse_operations WHERE container_number = 'FANU3376528';
```

**⚠️ 注意**: 删除数据前请确认已修复字段映射!

---

### 步骤5: 重新导入Excel数据

1. 启动前端和后端服务

```bash
# 启动后端
cd backend
npm run dev

# 启动前端
cd frontend
npm run dev
```

2. 打开浏览器访问 Excel 导入页面: `http://localhost:3000/import`

3. 上传Excel文件并解析

4. 检查预览数据,确认字段映射正确

5. 点击"导入数据库"按钮

6. 等待导入完成,检查导入结果

---

### 步骤6: 验证导入结果

使用验证脚本检查导入的数据是否正确:

```bash
# 使用验证脚本
npx tsx scripts/verify-imported-data.ts FANU3376528
```

或直接查询数据库:

```sql
-- 验证拖卡运输数据
SELECT
    container_number as 集装箱号,
    is_pre_pickup as 是否预提,
    carrier_company as 目的港卡车,
    last_pickup_date as 最晚提柜日期,
    planned_pickup_date as 计划提柜日期,
    pickup_date as 提柜日期,
    delivery_date as 送仓日期,
    unload_mode_plan as 卸柜方式计划
FROM process_trucking_transport
WHERE container_number = 'FANU3376528';

-- 验证仓库操作数据
SELECT
    container_number as 集装箱号,
    warehouse_group as 入库仓库组,
    planned_warehouse as 计划仓库,
    actual_warehouse as 实际仓库,
    warehouse_arrival_date as 入库日期,
    wms_status as WMS入库状态,
    ebs_status as EBS入库状态
FROM process_warehouse_operations
WHERE container_number = 'FANU3376528';
```

---

## 📊 数据完整性检查清单

完成重新导入后,使用以下清单验证:

### 拖卡运输表 (process_trucking_transport)

- [ ] `container_number` 存在且正确
- [ ] `carrier_company` (目的港卡车) 已导入
- [ ] `pickup_date` (提柜日期) 已导入
- [ ] `delivery_date` (送仓日期) 已导入
- [ ] `planned_pickup_date` (计划提柜日期) 已导入
- [ ] `planned_delivery_date` (计划送仓日期) 已导入
- [ ] `unload_mode_plan` (卸柜方式计划) 已导入

### 仓库操作表 (process_warehouse_operations)

- [ ] `container_number` 存在且正确
- [ ] `warehouse_group` (入库仓库组) 已导入
- [ ] `planned_warehouse` (计划仓库) 已导入
- [ ] `actual_warehouse` (实际仓库) 已导入
- [ ] `warehouse_arrival_date` (入库日期) 已导入
- [ ] `wms_status` (WMS入库状态) 已导入
- [ ] `ebs_status` (EBS入库状态) 已导入
- [ ] `wms_confirm_date` (WMS Confirm Date) 已导入

---

## 🔍 常见问题排查

### 问题1: 重新导入后数据仍然为空

**原因**: 字段映射修复不完整

**解决方案**:
1. 检查 `ExcelImport.vue` 中的 `FIELD_MAPPINGS` 数组
2. 确保Excel列名与映射中的 `excelField` 完全一致
3. 确认 `table` 和 `field` 使用正确的数据库表名和字段名

### 问题2: 导入成功但数据不正确

**原因**: 日期格式解析失败

**解决方案**:
1. 检查Excel中的日期格式
2. 确认日期字段使用了 `transform: parseDate`
3. 查看浏览器控制台是否有解析警告

### 问题3: 部分字段未导入

**原因**: Excel列名与映射不匹配

**解决方案**:
1. 打开Excel文件,确认列名
2. 对比 `FIELD_MAPPINGS` 中的 `excelField`
3. 确保列名完全一致(包括空格、括号等)

---

## 📝 记录更新日志

完成重新导入后,更新 `docs/IMPORT_ISSUES_LOG.md` 记录:

```markdown
## [YYYY-MM-DD] 修复拖卡运输和仓库操作字段映射缺失

### 问题描述
- 拖卡运输表只映射了2个字段,导致大量数据未导入
- 仓库操作表只映射了2个字段,导致大量数据未导入
- 影响集装箱: FANU3376528

### 修复内容
- 更新 `frontend/src/views/import/ExcelImport.vue` 字段映射
- 添加拖卡运输表14个字段映射
- 添加仓库操作表14个字段映射

### 验证结果
- 拖卡运输数据: ✅ 完整导入
- 仓库操作数据: ✅ 完整导入

### 重新导入
- 删除错误数据: 已完成
- 重新导入Excel: 已完成
- 验证通过: ✅
```

---

## 📚 相关文档

- [开发规范](../DEVELOPMENT_STANDARDS.md) - 包含"禁止临时补丁修复"原则
- [字段映射参考](./CORRECT_FIELD_MAPPINGS.ts) - 完整的字段映射配置
- [数据验证脚本](../scripts/verify-imported-data.ts) - 数据导入验证工具
