# 飞驼 API 与 Excel 导入字段对齐

## 一、差异概览

飞驼 API 与 Excel 导入的数据**落库到同一张表** `process_port_operations`，但**字段来源与覆盖范围**存在明显差异：

| 维度 | 飞驼 API | 业务 Excel 导入 | 飞驼 Excel 导入 |
|------|----------|-----------------|-----------------|
| 数据形态 | 状态事件序列（status_code + occurred_at） | 宽表列名（如「预计到港日期(目的港)」） | 飞驼分组列名（如「交货地预计到达时间」） |
| 映射方式 | FeiTuoStatusMapping 状态码→核心字段 | ExcelImport 列名→字段 | FeituoFieldGroupMapping + 直接列名 |
| 覆盖字段 | 闸口/到港/中转/卸船/可提货 | 到港/卸船/清关/免堆期 | 到港/卸船/闸口/免费期/可提货 |

---

## 二、process_port_operations 字段映射对照

### 2.1 共同字段（已对齐）

| LogiX 字段 | 业务 Excel 列名 | 飞驼 API 来源 | 飞驼 Excel 列名 |
|------------|-----------------|---------------|-----------------|
| eta_dest_port | 预计到港日期(目的港) | 状态码 ETA | 交货地预计到达时间、预计到港日期 |
| ata_dest_port | 实际到港日期(目的港) | 状态码 BDAR/ATA/POCA 等 | 交货地实际到达时间、目的港到达日期 |
| dest_port_unload_date | 目的港卸船/火车日期 | 状态码 DSCH/DISC | 实际卸船时间、目的港卸船/火车日期、卸船时间 |
| gate_in_terminal | 目的港码头 | - | 交货地码头名称、码头代码、码头名称 |

### 2.2 飞驼有、业务 Excel 无（需补齐）

| LogiX 字段 | 飞驼 API 来源 | 飞驼 Excel 列名 | 建议业务 Excel 列名 |
|------------|---------------|-----------------|----------------------|
| gate_in_time | GATE_IN/GITM/GTIN | 重箱进场时间 | 进闸时间 / 重箱进场时间 |
| gate_out_time | GATE_OUT/GTOT/STCS | 实际提箱日期、出场时间 | 出闸时间 / 提柜日期 |
| available_time | AVAIL/PCAB | 可提箱日期 | 可提货日期 / 可提箱日期 |
| last_free_date | - | 免费提箱截止日 | 最后免费日期（已有） |
| transit_arrival_date | TSBA/TRANSIT_ARRIVE | - | 中转港到港日期 |
| atd_transit | TSDP/TRANSIT_DEPART | 接货地实际离开时间（途经港） | 中转港离港日期 |

### 2.3 业务 Excel 有、飞驼无（业务专属）

| LogiX 字段 | 业务 Excel 列名 | 说明 |
|------------|-----------------|------|
| eta_correction | ETA修正 | 飞驼不提供 |
| planned_customs_date | 计划清关日期 | 清关业务 |
| actual_customs_date | 实际清关日期 | 清关业务 |
| customs_broker_code | 目的港清关公司 | 清关业务 |
| document_status | 清关单据状态 | 清关业务 |
| all_generated_date | 全部生成日期 | 清关业务 |
| customs_remarks | 异常原因(清关信息表） | 清关业务 |
| isf_status | ISF申报状态 | 清关业务 |
| isf_declaration_date | ISF申报日期 | 清关业务 |
| document_transfer_date | 传递日期 | 清关业务 |
| free_storage_days | 免堆期(天) | 滞港费计算 |
| free_detention_days | 场内免箱期(天) | 滞港费计算 |
| free_off_terminal_days | 场外免箱期(天) | 滞港费计算 |
| remarks | 备注(物流信息表） | 通用备注 |

> 飞驼 Excel 表二有 HOLD 相关字段，可映射到 customs_status、customs_remarks。

---

## 三、对齐建议

### 3.1 业务 Excel 导入补齐

在 `ExcelImport.vue` 的 `FIELD_MAPPINGS` 中增加以下映射（若 Excel 模板有对应列）：

```javascript
// 闸口与可提货（与飞驼对齐）
{ excelField: '进闸时间', table: 'process_port_operations', field: 'gate_in_time', required: false, transform: parseDate },
{ excelField: '重箱进场时间', table: 'process_port_operations', field: 'gate_in_time', required: false, transform: parseDate },
{ excelField: '出闸时间', table: 'process_port_operations', field: 'gate_out_time', required: false, transform: parseDate },
{ excelField: '可提货日期', table: 'process_port_operations', field: 'available_time', required: false, transform: parseDate },
{ excelField: '可提箱日期', table: 'process_port_operations', field: 'available_time', required: false, transform: parseDate },
{ excelField: '最后免费日期', table: 'process_port_operations', field: 'last_free_date', required: false, transform: parseDate },
// 中转港（若业务有）
{ excelField: '中转港到港日期', table: 'process_port_operations', field: 'transit_arrival_date', required: false, transform: parseDate },
{ excelField: '中转港离港日期', table: 'process_port_operations', field: 'atd_transit', required: false, transform: parseDate },
```

> 注意：`last_free_date` 若已在 `splitRowToTables` 中单独处理，需确保与上述映射不重复。

### 3.2 飞驼 Excel 表一补齐

飞驼表一若有「免费提箱截止日」或类似列，应在 `feituoImport.service.ts` 的 `mergeTable1ToCore` 中增加 `lastFreeDate` 的解析（表二已有）。

### 3.3 字段语义统一

| 业务含义 | 统一字段名 | 状态机依赖 |
|----------|------------|------------|
| 目的港预计到港 | eta_dest_port | 是 |
| 目的港实际到港 | ata_dest_port | 是 |
| 进闸时间 | gate_in_time | 是 |
| 出闸/提柜时间 | gate_out_time | 是 |
| 可提货日期 | available_time | 是 |
| 卸船日期 | dest_port_unload_date | 是 |
| 免费期截止日 | last_free_date | 滞港费计算 |
| 中转港到港 | transit_arrival_date | 是 |
| 中转港离港 | atd_transit | 是 |

---

## 四、数据写入优先级（冲突时）

同一货柜、同一字段被多源写入时，建议策略：

| 场景 | 建议 |
|------|------|
| 飞驼 API vs 业务 Excel | 以**最新写入**为准，或按 `data_source` 标记后由业务规则决定 |
| 飞驼 API vs 飞驼 Excel | 飞驼 API 为实时数据，优先于离线 Excel |
| 手工维护 vs 任意导入 | 手工维护优先级最高 |

---

## 五、相关文件

| 文件 | 用途 |
|------|------|
| `backend/src/constants/FeiTuoStatusMapping.ts` | 飞驼状态码→核心字段 |
| `backend/src/constants/FeituoFieldGroupMapping.ts` | 飞驼 Excel 列名→分组 |
| `frontend/src/views/import/ExcelImport.vue` | 业务 Excel 列名→字段 |
| `backend/src/services/feituoImport.service.ts` | 飞驼 Excel 解析与落库 |
| `frontend/public/docs/11-project/13-飞驼导出字段与LogiX映射表.md` | 飞驼导出字段完整映射 |
