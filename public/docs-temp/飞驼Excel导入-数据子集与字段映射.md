# 飞驼 Excel 导入 - 数据子集与字段映射

## 概述

飞驼 Excel 导入时，按行解析数据并分批次写入 4 个原始数据子集表，支持去重和审计。

## 数据子集去重逻辑

| # | 子集名称 | 去重 Key | 目标表 |
|---|---|---|---|
| ① | 基本信息 | `container_number` | `ext_feituo_import_table1` |
| ② | 发生地信息 | `mbl_number + port_code + place_type + place_index` | `ext_feituo_places` |
| ③ | 集装箱物流信息 | `mbl_number + container_number + event_code + event_time` | `ext_feituo_status_events` |
| ④ | 船舶信息 | `mbl_number + vessel_name` | `ext_feituo_vessels` |

## 原始数据存储

### raw_data vs raw_data_by_group

| 字段 | 存储内容 | 说明 |
|---|---|---|
| `raw_data` | 扁平 JSON | 所有字段按列名存储，**同名列会被覆盖** |
| `raw_data_by_group` | 分组 JSON | 按分组编号（1-15）存储，解决同名字段错位 |

**示例**：
```
原始 Excel 列：船名(分组13), 船名_1(分组14)
→ raw_data: { "船名": "MSC", "船名_1": "CMA CGM" }  // 同名覆盖
→ raw_data_by_group: {
    "13": { "船名": "MSC" },
    "14": { "船名": "CMA CGM" }
  }
```

## 各子集字段映射

### ① ext_feituo_import_table1（基本信息）

**去重条件**：`container_number`

| Excel 字段 | 实体字段 | 说明 |
|---|---|---|
| MBL Number / 提单号 | `mblNumber` | 提单号 |
| 集装箱物流信息_集装箱号 / 集装箱号 | `containerNumber` | 集装箱号（主键） |
| - | `rawData` | 原始行数据 |
| - | `rawDataByGroup` | 按分组存储的原始数据 |

### ② ext_feituo_places（发生地信息）

**去重条件**：`bill_of_lading_number + port_code + place_type + place_index`

| Excel 字段 | 实体字段 |
|---|---|
| 基本信息_MBL Number | `billOfLadingNumber` |
| 发生地信息_地点CODE | `portCode` |
| 发生地信息_地点名称英文（标准） | `portNameEn` |
| 发生地信息_地点名称中文（标准） | `portNameCn` |
| 发生地信息_地点名称（原始） | `portNameOriginal` |
| 发生地信息_地点类型 | `placeType` |
| 发生地信息_纬度 | `latitude` |
| 发生地信息_经度 | `longitude` |
| 发生地信息_时区 | `timezone` |
| 发生地信息_预计离开时间 | `etd` |
| 发生地信息_预计到达时间 | `eta` |
| 发生地信息_实际到达时间 | `ata` |
| 发生地信息_实际离开时间 | `atd` |
| 发生地信息_首次获取到的etd | `firstEtd` |
| 发生地信息_首次获取到的eta | `firstEta` |
| 发生地信息_实际装船时间 | `loadedOnBoardDate` |
| 发生地信息_实际卸船时间 | `unloadDate` |
| 发生地信息_AIS实际到港时间 | `aisAta` |
| 发生地信息_AIS实际靠泊时间 | `aisBerthing` |
| 发生地信息_AIS实际离港时间 | `aisAtd` |
| 发生地信息_码头名称 | `terminalName` |
| 发生地信息_船名 | `vesselName` |
| 发生地信息_航次 | `voyageNumber` |
| 发生地信息_货物存储位置 | `cargoLocation` |
| 发生地信息_铁路预计离开时间 | `railEtd` |
| 发生地信息_免堆存天数 | `freeStorageDays` |
| 发生地信息_免用箱天数 | `freeDetentionDays` |
| 发生地信息_免堆存时间 | `freeStorageTime` |
| 发生地信息_免用箱时间 | `freeDetentionTime` |

### ③ ext_feituo_status_events（集装箱物流信息）

**去重条件**：`bill_of_lading_number + container_number + event_code + event_time`

| Excel 字段 | 实体字段 | 说明 |
|---|---|---|
| 基本信息_MBL Number | `billOfLadingNumber` | |
| 集装箱物流信息_集装箱号 | `containerNumber` | |
| - | `statusIndex` | API 同步时有值，Excel 导入为 NULL |
| 集装箱物流信息-状态_状态代码 | `eventCode` | |
| 集装箱物流信息-状态_状态描述中文（标准） | `descriptionCn` | |
| 集装箱物流信息-状态_状态描述英文（标准） | `descriptionEn` | |
| 集装箱物流信息-状态_状态描述（原始） | `eventDescriptionOrigin` | |
| 集装箱物流信息-状态_发生时间 | `eventTime` | |
| 集装箱物流信息-状态_是否预计 | `isEstimated` | |
| 集装箱物流信息-状态_时区 | `portTimezone` | |
| 集装箱物流信息-状态_发生地 | `eventPlace` | |
| 集装箱物流信息-状态_发生地（原始） | `eventPlaceOrigin` | |
| 集装箱物流信息-状态_地点CODE | `portCode` | |
| 集装箱物流信息-状态_码头名称 | `terminalName` | |
| 集装箱物流信息-状态_运输方式 | `transportMode` | |
| 集装箱物流信息-状态_船名/车牌号 | `vesselName` | |
| 集装箱物流信息-状态_航次 | `voyageNumber` | |
| 集装箱物流信息-状态_分单号 | `billNo` | |
| 集装箱物流信息-状态_报关单号 | `declarationNo` | |
| 集装箱物流信息-状态_数据来源 | `dataSource` | 默认为 'Excel' |
| - | `rawJson` | 分组12原始数据，Excel 导入可为 NULL |

**注意**：以下字段在实体中不存在，已不再写入此表：
- `containerType` / `containerSize` / `containerTypeStd` / `sealNumber`
- `currentStatusCode` / `currentStatusDescCn` / `currentStatusDescEn` / `isRolled`
- `cargoLocation`（组11）/ `exceptionNode`

这些字段通过 `mergeTable1ToCore` 写入业务核心表。

### ④ ext_feituo_vessels（船舶信息）

**去重条件**：`bill_of_lading_number + vessel_name`

| Excel 字段 | 实体字段 |
|---|---|
| 基本信息_MBL Number | `billOfLadingNumber` |
| 船泊信息_船名 | `vesselName` |
| 船泊信息_imo | `imoNumber` |
| 船泊信息_mmsi | `mmsiNumber` |
| 船泊信息_船舶建造日 | `buildDate` |
| 船泊信息_船籍 | `flag` |
| 船泊信息_箱尺寸 | `containerSize` |
| 船泊信息_运营方 | `operator` |

## 代码位置

- 入口：`backend/src/controllers/feituo.controller.ts` - `importFeituoExcel`
- 服务：`backend/src/services/feituoImport.service.ts`
- 实体：`backend/src/entities/ExtFeituo*.ts`

## 相关修复记录

- **2026-03-21**：修复 `saveStatusEventsSubset` 字段映射问题
  - 删除 21 个幽灵字段（实体中不存在）
  - 修正 9 个字段名不匹配
  - `statusIndex` 和 `rawJson` 改为可 NULL，支持 Excel 导入
