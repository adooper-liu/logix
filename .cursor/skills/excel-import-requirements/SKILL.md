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

适用表：`dict_trucking_port_mapping`、`dict_warehouse_trucking_mapping`

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
