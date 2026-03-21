---
name: excel-import-requirements
description: Defines requirements and specifications for Excel import in LogiX. Use when implementing, debugging, or extending Excel import features for business data or dictionary tables.
---

# LogiX Excel 导入规范

> 📚 本技能定义 LogiX 项目中 Excel 导入的完整要求与实现规范。开发或修改导入功能时请遵循。

## 导入类型

| 类型 | 入口 | 后端 | 用途 |
|-----|------|------|------|
| **业务数据** | `ExcelImport.vue` | `import.controller.ts` | 备货单、货柜、海运、港口操作等 |
| **字典数据** | `DictManage.vue` | `dict-manage.controller.ts` | 港口、国家、仓库、车队映射等 |

---

## 业务数据完整导入流程（7表）

### 数据流架构

```
Excel文件 → useExcelParser → groupByTable → /api/v1/import/excel/batch → 后端7表写入
```

### 7表写入流程

| 序号 | 表名 | 后端处理方法 | 关键字段 |
|------|------|-------------|----------|
| 1 | biz_replenishment_orders | 第615行 | order_number |
| 2 | biz_containers | 第548-596行 | container_number |
| 3 | process_sea_freight | 第501-546行 | bill_of_lading_number |
| 4 | process_port_operations | 第618-661行 | container_number + port_type + port_sequence（数组） |
| 5 | process_trucking_transport | 第663-683行 | container_number |
| 6 | process_warehouse_operations | 第685-700行 | container_number |
| 7 | process_empty_return | 第702-722行 | container_number |

### 关键处理逻辑

1. **外键依赖顺序**：
   - 先创建海运（process_sea_freight）→ 货柜（biz_containers）依赖 bill_of_lading_number
   - 再创建货柜 → 备货单（biz_replenishment_orders）依赖 container_number
   - 最后创建备货单

2. **港口操作多港经停**：
   - 支持数组格式，每个元素包含 port_type（origin/transit/destination）和 port_sequence
   - 按 container_number + port_type + port_sequence 作为主键
   - **自动识别**：根据Excel中"起运港"/"途径港"/"目的港"字段自动拆分多条记录
   - **port_sequence**：起运港=1，途径港=2，目的港=3（自动递增）

### 港口操作字段映射（自动多港拆分）

| Excel列名 | 映射字段 | 说明 |
|----------|---------|------|
| 起运港 | port_type=origin, port_sequence=1 | 航次第一港 |
| 途径港/中转港 | port_type=transit, port_sequence=2 | 航次中转港 |
| 目的港 | port_type=destination, port_sequence=3 | 航次目的港 |
| 预计到港日期(ETA) | eta | 预计到港日期 |
| 实际到港日期(ATA) | ata | 实际到港日期 |
| 免堆期(天) | free_storage_days | 免堆期天数 |
| 场内免箱期(天) | free_detention_days | 免箱期天数 |
| 最后免费日期 | last_free_date | 最后免费日期 |

3. **导入后自动触发**：
   - 第741-752行：导入成功后自动调用 `ContainerStatusService.updateStatus()` 更新货柜物流状态
   - 自动计算状态机流转

### 子表字段映射（前端 container.ts）

| 表 | Excel列名示例 | 数据库字段 |
|---|--------------|-----------|
| process_port_operations | 预计到港日期(目的港)、实际到港日期(目的港)、免堆期、最后免费日期 | eta, ata, free_storage_days, last_free_date |
| process_trucking_transport | 最晚提柜日期、提柜日期、最晚送仓日期、送仓日期 | last_pickup_date, pickup_date, last_delivery_date, delivery_date |
| process_warehouse_operations | 入库仓库组、仓库(计划)、卸空日期、入库日期 | warehouse_group, planned_warehouse, unload_date, warehouse_arrival_date |
| process_empty_return | 最晚还箱日期、还箱日期、还箱地点 | last_return_date, return_time, return_terminal_name |

### 子表为空的常见原因与修复

**原因1**：Excel模板缺少子表对应的列字段
- 排查：检查前端控制台日志 `[uploadBatchData] 分组后的数据 tables:` 确认有哪些表
- 修复：更新Excel模板，添加子表对应的列字段

**原因2**：缺少 port_type 字段映射
- 现象：后端日志显示"跳过无效港口操作"
- 修复：前端 container.ts 已添加 port_type 字段映射，Excel列名"港口类型"

**原因3**：groupByTable 未创建空子表
- 现象：transformed 有 container_number 但子表未创建
- 修复：groupByTable 第二轮确保子表在主表有 container_number 时也被创建

**当前支持字段**：
| 表 | 必需字段 | 可选字段 |
|---|---------|----------|
| process_port_operations | container_number, port_type | eta, ata, free_storage_days, last_free_date |
| process_trucking_transport | container_number | last_pickup_date, pickup_date, last_delivery_date, delivery_date |
| process_warehouse_operations | container_number | warehouse_group, planned_warehouse, unload_date, warehouse_arrival_date |
| process_empty_return | container_number | last_return_date, return_time, return_terminal_name |

---

## 🔧 实战问题排查与修复

### 问题：process_port_operations 导入为空

**现象**：Excel导入后，process_port_operations 表无数据

**排查过程**：

1. **第一轮检查**：groupByTable 是否创建子表？
   - 结果：已创建，确保有 container_number

2. **第二轮检查**：port_type 字段映射？
   - 结果：已添加 port_type 字段映射，支持智能推断

3. **第三轮检查**：多港经停拆分逻辑？
   - 结果：已实现自动拆分，起运港/途径港/目的港分别创建记录

4. **根本原因**：字段名不匹配
   - 问题：groupByTable 检查 `transformed['起运港']`
   - 实际：Excel "起运港" 已被字段映射转换为 `port_of_loading`
   - 所以 `transformed['起运港']` 永远为 undefined

**修复方案**（useFileUpload.ts）：

```javascript
// 修改前（错误）
if (transformed['起运港']) { ... }

// 修改后（正确）- 同时支持中文字段名和英文字段名
if (transformed['起运港'] || transformed['port_of_loading']) { ... }
if (transformed['目的港'] || transformed['port_of_discharge']) { ... }
```

**修改文件**：
- `frontend/src/components/common/UniversalImport/useFileUpload.ts`

**验证结果**：
- 5个货柜 × 2个港口（起运港+目的港）= 10条记录

---

## 1. 映射与命名

### 1.1 数据库对齐（必须）

```
✅ table / field 必须与 backend/03_create_tables.sql 完全一致
✅ 字段名使用 snake_case：container_number, port_code, eta_dest_port
❌ 禁止 camelCase 或自定义命名
```

### 1.2 列名匹配顺序

字典导入（DictManage）按以下顺序尝试匹配 Excel 列：

1. **中文标签**：`field.label`（如「港口代码」「国家」）
2. **camelCase**：`portCode`, `country`
3. **snake_case**：`port_code`, `country`
4. **全大写**：`PORTCODE`, `COUNTRY`

业务导入（ExcelImport）使用固定 `excelField` + `aliases` 映射。

---

## 2. 类型转换

### 2.1 布尔值

Excel 常见写法需转为 `true`/`false`：

| 真 | 否 |
|----|-----|
| 是、yes、true、1、y | 否、no、false、0、n |

```typescript
function transformBoolean(value: any): boolean {
  if (value === null || value === undefined || value === '') return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const s = value.toString().toLowerCase().trim()
    return ['是', 'yes', 'true', '1', 'y'].includes(s)
  }
  return false
}
```

### 2.2 日期

支持格式：`YYYY-MM-DD`、`YYYY/MM/DD`、`YYYYMMDD`、`DD-MM-YYYY`、Excel 序列号。输出统一为 `YYYY-MM-DD HH:mm:ss`。

### 2.3 数字/小数

- 去除千分位逗号、货币符号（¥$€£）
- 空值返回 `null`，非法返回 `null`

---

## 3. 主键处理

### 3.1 业务主键（portCode、companyCode 等）

- 必填，导入前校验
- 若已存在，后端返回 400「记录已存在」

### 3.2 自增主键（id）

- **模板**：ID 列留空，不填「示例值」
- **导入**：不传 `id`，由数据库生成
- **禁止**：在 ID 列填业务编码（如 US0001），会导致 `invalid input syntax for type integer` 错误

适用表：`dict_trucking_port_mapping`、`dict_warehouse_trucking_mapping`、`dict_port_warehouse_mapping`

---

## 4. 模板导出

### 4.1 字典模板（DictManage）

```typescript
// 主键为 id：留空
// 主键为业务代码：填「示例值」
fields.forEach(field => {
  if (!field.isPrimaryKey) templateData[field.label] = ''
  else if (field.field === 'id') templateData[field.label] = ''
  else templateData[field.label] = '示例值'
})
```

### 4.2 列顺序

与 `fields` 配置顺序一致，首行为表头。

---

## 5. 后端要求

### 5.1 请求体格式

- 前端发送 **snake_case**（与数据库对齐）
- 后端使用 `snakeToCamel` 转为 camelCase 再写实体

### 5.2 布尔字段规范化

后端需对 `isActive`、`isDefault`、`supportExport`、`supportImport`、`supportContainerOnly` 做字符串→boolean 转换。

### 5.3 自增主键

`primaryKey === 'id'` 时：删除请求体中的 `id`，不做存在性检查。

---

## 6. 校验与错误

### 6.1 行级校验

- 缺少必填主键 → 跳过该行，计入失败
- 空行（无有效数据）→ 跳过
- 导入失败 → 记录错误信息，继续下一行

### 6.2 错误反馈

- 显示成功/失败条数
- 失败详情：行号、记录摘要、后端错误信息
- 建议限制展示条数（如前 10 条）

---

## 7. 新增导入检查清单

- [ ] 表/字段与 `03_create_tables.sql` 一致
- [ ] 配置 `transform`（boolean、date、decimal）
- [ ] 主键类型正确（业务主键 vs 自增 id）
- [ ] 模板导出符合规范（id 列留空）
- [ ] 后端 create 使用 snakeToCamel
- [ ] 布尔字段后端 normalize
- [ ] 自增主键不参与存在性检查、不传入 create

---

## 8. 参考文件

| 用途 | 路径 |
|-----|------|
| 业务导入映射 | `frontend/src/views/import/ExcelImport.vue` |
| 字典导入 | `frontend/src/views/system/DictManage.vue` |
| 字典后端 | `backend/src/controllers/dict-manage.controller.ts` |
| 业务导入后端 | `backend/src/controllers/import.controller.ts` |
| snakeToCamel | `backend/src/utils/snakeToCamel.ts` |
| 表结构 | `backend/03_create_tables.sql` |
