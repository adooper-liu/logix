# Excel 数据导入功能

## 功能概述

本功能允许用户通过 Excel 文件批量导入货柜物流数据到系统数据库。

## 安装依赖

前端已自动安装 `xlsx` 库用于处理 Excel 文件：

```bash
cd frontend
npm install xlsx
```

## 使用方法

### 1. 访问导入页面

访问 `http://localhost:5173/import` 进入 Excel 数据导入页面。

### 2. 下载模板

点击页面右上方的"下载模板"按钮，下载标准导入模板。

### 3. 填写数据

根据模板填写货柜物流数据：

- **备货单信息**：备货单号、客户名称、销往国家等
- **货柜信息**：集装箱号、柜型、货物描述等
- **海运信息**：提单号、船名、航次、起运港/目的港等
- **港口操作**：到港日期、清关状态、ISF申报等
- **拖卡运输**：提柜日期、送仓日期、司机信息等
- **仓库操作**：入库日期、卸柜方式、WMS状态等
- **还空箱**：还箱日期、还箱地点等

### 4. 上传文件

将填写好的 Excel 文件拖拽到上传区域，或点击上传按钮选择文件。

### 5. 解析预览

点击"解析Excel"按钮，系统会解析文件内容并显示前10条数据预览。

### 6. 导入数据

确认数据无误后，点击"导入数据库"按钮，系统会批量将数据导入数据库。

## 数据映射关系

系统支持以下7个数据表的导入：

| 数据库表 | Excel字段示例 | 说明 |
|---------|--------------|------|
| `biz_replenishment_orders` | 备货单号、客户名称、销往国家 | 备货单基础信息 |
| `biz_containers` | 集装箱号、柜型、货物描述 | 货柜基础信息 |
| `process_sea_freight` | 提单号、船名、航次、起运港 | 海运运输信息 |
| `process_port_operations` | 预计到港日期、清关状态 | 目的港操作信息 |
| `process_trucking` | 提柜日期、送仓日期、司机信息 | 拖卡运输信息 |
| `process_warehouse_operations` | 入库日期、卸柜方式、WMS状态 | 仓库操作信息 |
| `process_empty_returns` | 还箱日期、还箱地点 | 还空箱信息 |

## 字典映射

### 物流状态
- `未出运` → `not_shipped`
- `已装船` → `shipped`
- `在途` → `in_transit`
- `已到港` → `at_port`
- `已提柜` → `picked_up`
- `已卸柜` → `unloaded`
- `已还箱` → `returned_empty`

### 清关状态
- `未开始` → `NOT_STARTED`
- `进行中` → `IN_PROGRESS`
- `已完成` → `COMPLETED`
- `失败` → `FAILED`

### ISF申报状态
- `未申报` → `NOT_STARTED`
- `已提交` → `SUBMITTED`
- `已批准` → `APPROVED`
- `已拒绝` → `REJECTED`

## 数据处理规则

1. **唯一键检查**：
   - 备货单号：`orderNumber`
   - 集装箱号：`containerNumber`
   - 提单号：`billOfLadingNumber`

2. **数据更新策略**：
   - 如果记录已存在（根据唯一键判断），则更新该记录
   - 如果记录不存在，则创建新记录

3. **关联关系处理**：
   - 货柜通过 `orderNumber` 关联备货单
   - 海运、港口操作、拖卡、仓库、还空箱通过 `containerNumber` 关联货柜

4. **事务处理**：
   - 单条数据导入使用数据库事务，确保数据一致性
   - 事务失败会自动回滚，不会产生脏数据

## 错误处理

### 常见错误

1. **唯一约束冲突**：
   - 错误信息：数据已存在，唯一约束冲突
   - 解决方案：检查备货单号、集装箱号等唯一字段是否重复

2. **外键约束失败**：
   - 错误信息：外键约束失败，关联数据不存在
   - 解决方案：确保关联的备货单已存在，或先导入备货单

3. **必填字段缺失**：
   - 错误信息：某行数据缺少必填字段
   - 解决方案：填写Excel中标记为必填的字段（备货单号、集装箱号）

## 技术实现

### 后端 API

**路由**：`POST /api/v1/import/excel`

**请求格式**：
```json
{
  "tables": {
    "replenishment_orders": {
      "orderNumber": "ORD202600001",
      "customerName": "示例客户"
    },
    "containers": {
      "containerNumber": "CONT202600001",
      "containerTypeCode": "40HQ"
    },
    "sea_freight": {
      "billOfLadingNumber": "BL202600001",
      "vesselName": "MSC Europa"
    },
    ...
  }
}
```

**响应格式**：
```json
{
  "success": true,
  "message": "数据导入成功",
  "data": {
    "orderNumber": "ORD202600001",
    "containerNumber": "CONT202600001"
  }
}
```

### 前端功能

- **文件解析**：使用 `xlsx` 库读取 Excel 文件
- **数据验证**：检查必填字段
- **批量导入**：每批处理50条记录，显示进度
- **错误汇总**：收集所有导入失败的记录及错误原因

## 注意事项

1. **文件格式**：仅支持 `.xlsx` 和 `.xls` 格式
2. **数据量限制**：单次最多导入1000条记录
3. **数据质量**：请确保填写的数据格式正确，日期格式支持 `YYYY-MM-DD`、`YYYY/MM/DD`、`YYYYMMDD`
4. **网络超时**：大批量导入时可能需要较长时间，请耐心等待

## 扩展开发

如需支持更多字段或修改映射关系，请编辑以下文件：

- **前端**：`frontend/src/views/import/ExcelImport.vue` 中的 `FIELD_MAPPINGS` 数组
- **后端**：`backend/src/controllers/import.controller.ts` 中的数据表处理逻辑
