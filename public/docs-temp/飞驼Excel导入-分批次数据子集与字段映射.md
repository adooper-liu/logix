# 飞驼Excel导入 - 分批次数据子集与字段映射

## 一、数据处理流程

```
Excel原始数据（多列多行）
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 按行读取 + 去重处理                                          │
└─────────────────────────────────────────────────────────────┘
         ↓
① 基础信息子集（去重）: MBL Number + 集装箱号
         ↓
② 发生地信息子集（去重）: MBL Number + 28个place字段
         ↓
③ 集装箱物流信息子集（去重）: MBL Number + 30个status字段
         ↓
④ 船舶信息子集（去重）: MBL Number + 船名/IMO/MMSI等
         ↓
┌─────────────────────────────────────────────────────────────┐
│ 分别写入目标表                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、去重逻辑

### ① 基础信息子集

| 目标表 | 去重键 | 说明 |
|--------|--------|------|
| ext_feituo_import_table1 | (mbl_number, container_number) | 每行Excel对应一个MBL+集装箱组合 |

### ② 发生地信息子集

| 目标表 | 去重键 | 说明 |
|--------|--------|------|
| ext_feituo_places | (bill_of_lading_number, port_code, place_type, place_index) | 同一MBL下，按港口+类型+序号去重 |

### ③ 集装箱物流信息子集

| 目标表 | 去重键 | 说明 |
|--------|--------|------|
| ext_feituo_status_events | (bill_of_lading_number, container_number, event_code, event_time) | 同一MBL+集装箱下，按状态+时间去重 |

### ④ 船舶信息子集

| 目标表 | 去重键 | 说明 |
|--------|--------|------|
| ext_feituo_vessels | (bill_of_lading_number, vessel_name) | 同一MBL下，按船名去重 |

---

## 三、字段映射详细对照

### ① 基础信息子集 → ext_feituo_import_table1

| Excel字段（分组1） | 数据库字段 | 类型 | 说明 |
|---------------------|------------|------|------|
| 基本信息_MBL Number | mbl_number | varchar(50) | 主键1 |
| 基本信息_集装箱号 | container_number | varchar(50) | 主键2 |
| 订单状态 | order_status | varchar(50) | 订单状态 |
| 订单状态说明 | order_status_desc | varchar(200) | 订单状态说明 |
| 更新时间 | update_time | timestamp | 更新时间 |
| 是否3PL | is_3pl | boolean | 是否3PL |
| 是否海铁联运 | is_rail_transport | boolean | 是否海铁联运 |
| 首次获取时间 | first_fetch_time | timestamp | 首次获取时间 |

| Excel字段（分组11-集装箱物流信息） | 数据库字段 | 类型 | 说明 |
|-----------------------------------|------------|------|------|
| 集装箱物流信息_箱型 | container_type | varchar(20) | 箱型 |
| 集装箱物流信息_箱尺寸 | container_size | varchar(20) | 箱尺寸 |
| 集装箱物流信息_箱型（飞驼标准） | container_type_std | varchar(20) | 箱型（飞驼标准） |
| 集装箱物流信息_铅封号 | seal_number | varchar(50) | 铅封号 |
| 集装箱物流信息_当前状态代码 | current_status_code | varchar(20) | 当前状态代码 |
| 集装箱物流信息_当前状态中文描述 | current_status_cn | varchar(200) | 当前状态中文描述 |
| 集装箱物流信息_当前状态英文描述 | current_status_en | varchar(200) | 当前状态英文描述 |
| 集装箱物流信息_是否甩柜 | is_rolled | boolean | 是否甩柜 |

| Excel字段（分组14-港区货运单证） | 数据库字段 | 类型 | 说明 |
|----------------------------------|------------|------|------|
| 港区货运单证_箱皮重 | tare_weight | decimal(10,2) | 箱皮重 |
| 港区货运单证_箱总重 | total_weight | decimal(10,2) | 箱总重 |
| 港区货运单证_超限长度 | over_length | decimal(8,2) | 超限长度 |
| 港区货运单证_超高 | over_height | decimal(8,2) | 超高 |
| 港区货运单证_危险品等级 | danger_class | varchar(20) | 危险品等级 |
| 港区货运单证_持箱人 | container_holder | varchar(100) | 持箱人 |

---

### ② 发生地信息子集 → ext_feituo_places

| Excel字段（分组8-发生地信息） | 数据库字段 | 类型 | 说明 |
|------------------------------|------------|------|------|
| 基本信息_MBL Number | bill_of_lading_number | varchar(50) | 外键关联 |
| 发生地信息_地点CODE | port_code | varchar(50) | 港口代码 |
| 发生地信息_地点名称英文（标准） | port_name_en | varchar(100) | 港口英文名 |
| 发生地信息_地点名称中文（标准） | port_name_cn | varchar(100) | 港口中文名 |
| 发生地信息_地点名称（原始） | name_origin | varchar(200) | 原始名称 |
| 发生地信息_地点类型 | place_type | int | 地点类型(1=起运港,2=中转港,3=目的港) |
| 发生地信息_纬度 | latitude | decimal(10,6) | 纬度 |
| 发生地信息_经度 | longitude | decimal(10,6) | 经度 |
| 发生地信息_时区 | port_timezone | varchar(10) | 时区 |
| 发生地信息_预计离开时间 | std | timestamp | 预计开航时间(STA) |
| 发生地信息_预计到达时间 | eta | timestamp | 预计到港时间(ETA) |
| 发生地信息_实际到达时间 | ata | timestamp | 实际到港时间(ATA) |
| 发生地信息_实际离开时间 | atd | timestamp | 实际离港时间(ATD) |
| 发生地信息_首次获取到的etd | etd_first | timestamp | 首次获取的ETD |
| 发生地信息_首次获取到的eta | eta_first | timestamp | 首次获取的ETA |
| 发生地信息_实际装船时间 | load | timestamp | 实际装船时间 |
| 发生地信息_实际卸船时间 | disc | timestamp | 实际卸船时间 |
| 发生地信息_AIS实际到港时间 | ata_ais | timestamp | AIS到港时间 |
| 发生地信息_AIS实际靠泊时间 | atb_ais | timestamp | AIS靠泊时间 |
| 发生地信息_AIS实际离港时间 | atd_ais | timestamp | AIS离港时间 |
| 发生地信息_码头名称 | terminal_name | varchar(100) | 码头名称 |
| 发生地信息_船名 | vessel_name | varchar(100) | 船名 |
| 发生地信息_航次 | voyage_number | varchar(50) | 航次 |
| 发生地信息_货物存储位置 | cargo_location | varchar(200) | 货物存储位置 |
| 发生地信息_铁路预计离开时间 | rail_std | timestamp | 铁路预计离开时间 |
| 发生地信息_免堆存天数 | free_storage_days | int | 免堆存天数 |
| 发生地信息_免用箱天数 | free_detention_days | int | 免用箱天数 |
| 发生地信息_免堆存时间 | free_storage_time | timestamp | 免堆存截止时间 |
| 发生地信息_免用箱时间 | free_detention_time | timestamp | 免用箱截止时间 |

**place_type 类型映射**：
- 1 = 起运港 (origin)
- 2 = 中转港 (transit)
- 3 = 目的港 (destination)

---

### ③ 集装箱物流信息子集 → ext_feituo_status_events

| Excel字段（分组12-集装箱物流信息-状态） | 数据库字段 | 类型 | 说明 |
|----------------------------------------|------------|------|------|
| 基本信息_MBL Number | bill_of_lading_number | varchar(50) | 外键关联 |
| 集装箱物流信息_集装箱号 | container_number | varchar(50) | 集装箱号 |
| 集装箱物流信息-状态_船名/车牌号 | vessel_name | varchar(100) | 船名/车牌号 |
| 集装箱物流信息-状态_航次 | voyage_number | varchar(50) | 航次 |
| 集装箱物流信息-状态_运输方式 | transport_mode | varchar(20) | 运输方式(VESSEL/TRUCK) |
| 集装箱物流信息-状态_状态代码 | event_code | varchar(20) | **主键：状态代码** |
| 集装箱物流信息-状态_发生时间 | event_time | timestamp | **主键：发生时间** |
| 集装箱物流信息-状态_是否预计 | is_estimated | boolean | 是否预计 |
| 集装箱物流信息-状态_发生地 | event_place | varchar(100) | 发生地 |
| 集装箱物流信息-状态_时区 | port_timezone | varchar(10) | 时区 |
| 集装箱物流信息-状态_状态描述中文（标准） | description_cn | varchar(200) | 标准中文描述 |
| 集装箱物流信息-状态_状态描述英文（标准） | description_en | varchar(200) | 标准英文描述 |
| 集装箱物流信息-状态_发生地（原始） | event_place_origin | varchar(200) | 原始发生地 |
| 集装箱物流信息-状态_状态描述（原始） | event_description_origin | varchar(500) | 原始状态描述 |
| 集装箱物流信息-状态_地点CODE | port_code | varchar(50) | 地点代码 |
| 集装箱物流信息-状态_码头名称 | terminal_name | varchar(100) | 码头名称 |
| 集装箱物流信息-状态_货物存储位置 | cargo_location | varchar(200) | 货物存储位置 |
| 集装箱物流信息-状态_分单号 | bill_no | varchar(50) | 分单号 |
| 集装箱物流信息-状态_报关单号 | declaration_no | varchar(50) | 报关单号 |
| 集装箱物流信息-状态_异常节点 | exception_node | varchar(100) | 异常节点 |
| 集装箱物流信息-状态_数据来源 | data_source | varchar(50) | 数据来源 |

---

### ④ 船舶信息子集 → ext_feituo_vessels（新建表）

| Excel字段（分组13-船舶信息） | 数据库字段 | 类型 | 说明 |
|-----------------------------|------------|------|------|
| 基本信息_MBL Number | bill_of_lading_number | varchar(50) | 外键关联 |
| 船泊信息_船名 | vessel_name | varchar(100) | **主键：船名** |
| 船泊信息_imo | imo_number | varchar(20) | IMO号 |
| 船泊信息_mmsi | mmsi_number | varchar(20) | MMSI号 |
| 船泊信息_船舶建造日 | build_date | date | 船舶建造日期 |
| 船泊信息_船籍 | flag | varchar(50) | 船籍国 |
| 船泊信息_箱尺寸 | container_size | varchar(20) | 箱尺寸 |
| 船泊信息_运营方 | operator | varchar(100) | 运营方 |

---

## 四、去重SQL示例

### ① 基础信息去重（ext_feituo_import_table1）
```sql
INSERT INTO ext_feituo_import_table1 (mbl_number, container_number, ...)
SELECT mbl_number, container_number, ...
FROM (
  SELECT DISTINCT mbl_number, container_number, ...
  FROM excel_rows
) t
ON CONFLICT (mbl_number, container_number) DO UPDATE SET
  update_time = NOW();
```

### ② 发生地去重（ext_feituo_places）
```sql
INSERT INTO ext_feituo_places (bill_of_lading_number, port_code, place_type, place_index, ...)
SELECT bill_of_lading_number, port_code, place_type, place_index, ...
FROM (
  SELECT DISTINCT bill_of_lading_number, port_code, place_type, place_index, ...
  FROM excel_places
) t
ON CONFLICT (bill_of_lading_number, port_code, place_type, place_index) DO UPDATE SET
  ata = EXCLUDED.ata,
  atd = EXCLUDED.atd;
```

### ③ 状态事件去重（ext_feituo_status_events）
```sql
INSERT INTO ext_feituo_status_events (bill_of_lading_number, container_number, event_code, event_time, ...)
SELECT bill_of_lading_number, container_number, event_code, event_time, ...
FROM (
  SELECT DISTINCT bill_of_lading_number, container_number, event_code, event_time, ...
  FROM excel_statuses
) t
ON CONFLICT (bill_of_lading_number, container_number, event_code, event_time) DO NOTHING;
```

### ④ 船舶信息去重（ext_feituo_vessels）
```sql
INSERT INTO ext_feituo_vessels (bill_of_lading_number, vessel_name, ...)
SELECT bill_of_lading_number, vessel_name, ...
FROM (
  SELECT DISTINCT bill_of_lading_number, vessel_name, ...
  FROM excel_vessels
) t
ON CONFLICT (bill_of_lading_number, vessel_name) DO UPDATE SET
  imo_number = EXCLUDED.imo_number,
  mmsi_number = EXCLUDED.mmsi_number;
```

---

## 五、数据流向图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Excel 原始数据                                     │
│  MBL Number | 集装箱号 | 发生地信息字段(28个) | 状态字段(30个) | 船舶字段   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        分组解析 (buildRawDataByGroup)                       │
│  Group 1: 基本信息 | Group 8: 发生地信息 | Group 12: 状态 | Group 13: 船舶  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   去重子集①     │   │   去重子集②     │   │   去重子集③     │   │   去重子集④     │
│ (MBL+箱号)      │   │ (MBL+地点+类型) │   │ (MBL+箱号+状态) │   │ (MBL+船名)      │
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
          │                         │                         │                 │
          ▼                         ▼                         ▼                 ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ ext_feituo_     │   │ ext_feituo_     │   │ ext_feituo_     │   │ ext_feituo_     │
│ import_table1   │   │ places          │   │ status_events   │   │ vessels(新建)   │
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
          │                         │                         │                 │
          └─────────────────────────┼─────────────────────────┘                 │
                                    ▼                                           │
                    ┌───────────────────────────────────────┐                  │
                    │         合并到核心业务表                │                  │
                    │  biz_containers / process_sea_freight │                  │
                    │  process_port_operations / ...         │                  │
                    └───────────────────────────────────────┘                  │
```

---

## 六、字段数量统计

| 数据子集 | Excel字段数 | 目标表 | 去重字段数 |
|----------|-------------|--------|------------|
| ① 基础信息 | ~25个 | ext_feituo_import_table1 | 2个 (mbl_number, container_number) |
| ② 发生地信息 | 28个 | ext_feituo_places | 4个 (bill_of_lading_number, port_code, place_type, place_index) |
| ③ 集装箱物流信息 | 30个 | ext_feituo_status_events | 4个 (bill_of_lading_number, container_number, event_code, event_time) |
| ④ 船舶信息 | 8个 | ext_feituo_vessels(新建) | 2个 (bill_of_lading_number, vessel_name) |

---

## 七、 ext_feituo_vessels 表结构建议

```sql
CREATE TABLE ext_feituo_vessels (
  id SERIAL PRIMARY KEY,
  bill_of_lading_number VARCHAR(50) NOT NULL,
  vessel_name VARCHAR(100) NOT NULL,
  imo_number VARCHAR(20),
  mmsi_number VARCHAR(20),
  build_date DATE,
  flag VARCHAR(50),
  container_size VARCHAR(20),
  operator VARCHAR(100),
  sync_request_id VARCHAR(100),
  data_source VARCHAR(50) DEFAULT 'Excel',
  raw_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT uk_vessels_bol_vessel UNIQUE (bill_of_lading_number, vessel_name)
);

CREATE INDEX idx_vessels_bol ON ext_feituo_vessels(bill_of_lading_number);
CREATE INDEX idx_vessels_name ON ext_feituo_vessels(vessel_name);
```
