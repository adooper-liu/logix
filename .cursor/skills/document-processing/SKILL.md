---
name: document-processing
description: Process Excel and PDF files for import, export, and analysis. Use when working with Excel spreadsheets, PDF documents, or when the user mentions xlsx, xls, PDF, forms, or document extraction.
---

# Document Processing Skill

> 💡 **提示**: 本技能专注于文档处理。LogiX Excel 导入完整规范（映射、类型转换、主键、模板）请参考 **excel-import-requirements** 技能。

## Excel

### 项目依赖

- `xlsx`：通用读写
- `exceljs`：高级格式、流式处理

### LogiX Excel 导入约定

- 映射配置在 `frontend/src/views/import/ExcelImport.vue`
- `table` / `field` 必须与数据库**完全一致**（snake_case）
- 示例：`table: 'process_port_operations'`, `field: 'container_number'`
- 日期/数字/布尔需配置 `transform`

### 读取示例（xlsx）

```javascript
import * as XLSX from "xlsx";

const wb = XLSX.readFile("file.xlsx");
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
```

### 写入示例（exceljs）

```javascript
import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Sheet1");
ws.columns = [{ header: "container_number", key: "container_number", width: 20 }];
ws.addRow({ container_number: "ABCD1234567" });
await wb.xlsx.writeFile("output.xlsx");
```

### 字段映射校验

新增或修改 Excel 导入时，确保：

- `table` 对应 `backend/03_create_tables.sql` 中的表名
- `field` 对应表中字段名（snake_case）
- 参考 `logix-project-map.mdc` 中的表结构

## PDF

### 常见库

- **pdfplumber**：文本、表格提取（推荐）
- **pdf-parse**：纯文本
- **pdf2image + pytesseract**：扫描件 OCR

### 文本提取（pdfplumber）

```python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
    tables = pdf.pages[0].extract_tables()
```

### 表单填写

- 使用 **PyPDF2** 或 **pypdf** 读写表单字段
- 扫描件需 OCR 后再填充

## 注意事项

- 大文件考虑流式读取或分块处理
- 日期格式统一（如 ISO 或项目约定）
- 导入前校验必填字段与类型
