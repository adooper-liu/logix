# 飞驼 Excel 导入数据分批次解读需求验证报告

## 一、需求回顾

根据用户提出的需求，飞驼 EXCEL 导入数据需要分批次解读：

### ① 基础信息子集（去重）
- **字段**: MBL Number + 集装箱号
- **目标表**: `ext_feituo_import_table1` / `ext_feituo_import_table2`

### ② 发生地信息子集（去重）
- **字段**: MBL Number + 28 个 place 字段
  - 发生地信息_地点CODE、地点名称英文（标准）、地点名称中文（标准）、地点名称（原始）、地点类型、纬度、经度、时区
  - 预计离开时间、预计到达时间、实际到达时间、实际离开时间、首次获取到的 etd、首次获取到的 eta
  - 实际装船时间、实际卸船时间、AIS 实际到港时间、AIS 实际靠泊时间、AIS 实际离港时间
  - 码头名称、船名、航次、货物存储位置、铁路预计离开时间
  - 免堆存天数、免用箱天数、免堆存时间、免用箱时间
- **目标表**: `ext_feituo_places` ❌

### ③ 集装箱物流信息子集（去重）
- **字段**: MBL Number + 30 个 status 字段
  - 集装箱号、箱型、箱尺寸、箱型（飞驼标准）、铅封号
  - 当前状态代码、当前状态中文描述、当前状态英文描述、是否甩柜
  - 状态_船名/车牌号、航次、运输方式、状态代码、发生时间、是否预计、发生地、时区
  - 状态描述中文（标准）、状态描述英文（标准）、发生地（原始）、状态描述（原始）
  - 地点 CODE、码头名称、货物存储位置、分单号、报关单号、异常节点、数据来源
- **目标表**: `ext_feituo_status_events` ✅

### ④ 船舶信息子集（去重）
- **字段**: MBL Number + 船名/IMO/MMSI/船舶建造日/船籍/箱尺寸/运营方
- **目标表**: `ext_feituo_vessels` ✅

### ⑤ 其它字段不需要导入了

### ⑥ 写入目标表
- `ext_feituo_import_table1` / `ext_feituo_import_table2`
- `ext_feituo_places`
- `ext_feituo_status_events`
- `ext_feituo_vessels`

---

## 二、实现验证

### 2.1 数据库表结构验证

```sql
-- 查询 ext_feituo 相关表
docker exec logix-timescaledb-prod psql -U logix_user -d logix_db -c \
"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ext_feituo%'"

table_name        
--------------------------
 ext_feituo_import_batch
 ext_feituo_import_table1
 ext_feituo_import_table2
 ext_feituo_places
 ext_feituo_status_events
 ext_feituo_vessels      ← 已创建
```

✅ **所有目标表已创建**

---

## 三、代码实现逐项评审

### 3.1 基础信息子集 ✅

**实现位置**: `feituoImport.service.ts:295-355`

```typescript
// 表一
const mbl = getVal(row, 'MBL Number', 'MBL Number（一）', 'MBLNumber', 'mbl_number');
const containerNumber = getVal(row, '集装箱物流信息_集装箱号', '集装箱号', '集装箱号（一）', 'container_number');

const rec = repo.create({
  batchId,
  mblNumber: mbl,
  containerNumber,
  rawData,              // ✅ 存储完整 raw_data
  rawDataByGroup        // ✅ 存储分组 raw_data_by_group
});
```

**验证结果**: 
- ✅ MBL Number + 集装箱号正确提取
- ✅ `rawData` 和 `rawDataByGroup` JSON 都已存储
- ✅ 写入 `ext_feituo_import_table1` / `ext_feituo_import_table2`

---

### 3.2 发生地信息子集 ⚠️ **严重问题**

**实现位置**: `feituoImport.service.ts:1456-1558`

#### 问题 1: 字段名不匹配实体定义

| 代码中使用的字段 | 实体中实际字段 | 状态 |
|-----------------|---------------|------|
| `portNameEn` | ✅ `portNameEn` | 正确 |
| `portNameCn` | ✅ `portNameCn` | 正确 |
| `portNameOriginal` | ❌ **不存在** | **幽灵字段** |
| `placeType` (string) | `placeType` (int) | **类型错误** |
| `latitude` | ✅ `latitude` | 正确 |
| `longitude` | ✅ `longitude` | 正确 |
| `timezone` | ❌ **应为** `portTimezone` | **名称错误** |
| `etd` | ✅ `etd` | 正确 |
| `eta` | ✅ `eta` | 正确 |
| `ata` | ✅ `ata` | 正确 |
| `atd` | ✅ `atd` | 正确 |
| `firstEtd` | ❌ **不存在** | **幽灵字段** |
| `firstEta` | ❌ **不存在** | **幽灵字段** |
| `loadedOnBoardDate` | ❌ **应为** `load` | **名称错误** |
| `unloadDate` | ❌ **应为** `disc` | **名称错误** |
| `aisAta` | ❌ **应为** `ataAis` | **名称错误** |
| `aisBerthing` | ❌ **应为** `atbAis` | **名称错误** |
| `aisAtd` | ❌ **应为** `atdAis` | **名称错误** |
| `terminalName` | ✅ `terminalName` | 正确 |
| `vesselName` | ✅ `vesselName` | 正确 |
| `voyageNumber` | ✅ `voyageNumber` | 正确 |
| `cargoLocation` | ❌ **不存在** | **幽灵字段** |
| `railEtd` | ❌ **不存在** | **幽灵字段** |
| `freeStorageDays` | ❌ **不存在** | **幽灵字段** |
| `freeDetentionDays` | ❌ **不存在** | **幽灵字段** |
| `freeStorageTime` | ❌ **不存在** | **幽灵字段** |
| `freeDetentionTime` | ❌ **不存在** | **幽灵字段** |
| `batchId` | ❌ **不存在** | **幽灵字段** |

#### 问题 2: 缺少必需字段

实体要求：
```typescript
@Column({ type: 'int', name: 'place_index' })
placeIndex: number;  // ❗ NOT NULL

@Column({ type: 'varchar', length: 100, nullable: true, name: 'port_name' })
portName: string | null;  // ❗ 代码中未设置

@Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
latitude: number | null;  // ✅ 已设置

@Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
longitude: number | null;  // ✅ 已设置

@Column({ type: 'varchar', length: 50, default: 'API', name: 'data_source' })
dataSource: string;  // ❗ 代码中未设置

@Column({ type: 'jsonb' })
rawJson: Record<string, unknown>;  // ❗ 代码中未设置
```

#### 问题 3: 去重逻辑问题

```typescript
// 当前实现
const existing = await placesRepo.findOne({
  where: {
    billOfLadingNumber: mblNumber,
    portCode: portCode,
    placeType: placeType || undefined,
    placeIndex: i  // ❗ 使用循环索引作为去重条件
  }
});
```

**问题**: 
- `placeIndex` 是人为分配的（0-9），不是数据本身的唯一标识
- 同一 MBL + portCode 可能有多条记录（不同 placeType），但 `placeIndex` 会重复
- **正确的去重逻辑应该是**: `(mblNumber, portCode, placeType)` 或 `(mblNumber, portCode, placeIndex)`

#### 问题 4: placeType 类型错误

```typescript
// 实体定义
@Column({ type: 'int', name: 'place_type' })
placeType: number;  // INT 类型

// 代码中使用
const placeType = getVal(row, `发生地信息_地点类型${suffix}`, '发生地信息_地点类型') as string;  // ❌ STRING 类型
```

---

### 3.3 集装箱物流信息子集 ✅ **部分正确**

**实现位置**: `feituoImport.service.ts:1565-1627`

#### 正确的部分 ✅

```typescript
const fieldValues = {
  eventCode: statusCode,
  descriptionCn: ...,
  descriptionEn: ...,
  eventDescriptionOrigin: ...,
  eventTime: statusOccurredAt,
  isEstimated: parseBool(...),
  portTimezone: ...,
  eventPlace: ...,
  eventPlaceOrigin: ...,
  portCode: ...,
  terminalName: ...,
  transportMode: ...,
  vesselName: ...,
  voyageNumber: ...,
  billNo: ...,
  declarationNo: ...,
  dataSource: ...
};

const rec = eventsRepo.create({
  billOfLadingNumber: mblNumber,
  containerNumber: containerNumberVal,
  statusIndex: null,  // ✅ 关键修复
  rawJson: row._rawDataByGroup?.['12'] || null,  // ✅ 保存原始数据
  ...fieldValues
});
```

- ✅ 只使用实体中实际存在的字段
- ✅ `statusIndex` 设置为 NULL（Excel 导入无数组索引）
- ✅ `rawJson` 保存原始数据
- ✅ 字段名与实体定义一致

#### 遗漏的字段 ⚠️

实体中存在的字段，但代码未设置：
```typescript
@Column({ type: 'int', nullable: true, name: 'related_place_index' })
relatedPlaceIndex: number | null;  // ❗ 未设置

@Column({ type: 'int', nullable: true })
source: number | null;  // ❗ 未设置

@Column({ type: 'varchar', length: 50, nullable: true, name: 'firms_code' })
firmsCode: string | null;  // ❗ 未设置
```

**影响**: 这些是可选字段，不影响核心功能，但建议补充。

---

### 3.4 船舶信息子集 ⚠️ **部分问题**

**实现位置**: `feituoImport.service.ts:1633-1679`

#### 正确的部分 ✅

```typescript
const rec = vesselsRepo.create({
  billOfLadingNumber: mblNumber,
  vesselName: vesselName,
  imoNumber: getVal(row, 13, 'IMO') || getVal(row, '船泊信息_imo') as string,
  mmsiNumber: getVal(row, 13, 'MMSI') || getVal(row, '船泊信息_mmsi') as string,
  buildDate: parseDate(getVal(row, 13, '船舶建造日') || getVal(row, '船泊信息_船舶建造日')),
  flag: getVal(row, 13, '船籍') || getVal(row, '船泊信息_船籍') as string,
  containerSize: getVal(row, 13, '箱尺寸') || getVal(row, '船泊信息_箱尺寸') as string,
  operator: getVal(row, 13, '运营方') || getVal(row, '船泊信息_运营方') as string,
  batchId  // ❌ 幽灵字段
});
```

- ✅ 主要字段都已设置
- ✅ 字段名与实体定义一致

#### 问题 ⚠️

1. **batchId 字段不存在**
   ```typescript
   // ExtFeituoVessel 实体中没有 batchId 字段
   batchId  // ❌ 幽灵字段
   ```

2. **缺少必需字段**
   ```typescript
   @Column({ type: 'varchar', length: 50, default: 'Excel', name: 'data_source' })
   dataSource: string;  // ✅ 实体有默认值，可不设置
   
   @Column({ type: 'jsonb' })
   rawJson: Record<string, unknown>;  // ❗ 建议保存原始数据
   ```

---

## 四、总体评估

### 4.1 符合需求的部分 ✅

1. ✅ **基础信息子集**: 正确提取 MBL Number + 集装箱号，存储到 `ext_feituo_import_table1/2`
2. ✅ **集装箱物流信息子集**: 大部分字段正确映射到 `ext_feituo_status_events`
3. ✅ **船舶信息子集**: 主要字段正确映射到 `ext_feituo_vessels`
4. ✅ **RAW 数据保存**: `rawData` 和 `rawDataByGroup` 都已存储

### 4.2 严重问题 ❌

#### 问题 1: 发生地信息子集大量字段不匹配

- **28 个字段中约 15 个字段名错误或不存在**
- **缺少必需字段**: `placeIndex`, `portName`, `dataSource`, `rawJson`
- **类型错误**: `placeType` 应为 INT 但代码使用 STRING
- **幽灵字段**: `batchId`, `portNameOriginal`, `firstEtd`, `firstEta` 等不存在于实体

#### 问题 2: 去重逻辑缺陷

- `savePlacesSubset` 使用循环索引 `i` 作为 `placeIndex`，不符合业务逻辑
- 应该从数据中提取真实的 `placeIndex` 或使用 `(mblNumber, portCode, placeType)` 去重

#### 问题 3: 违反 fix-verification SKILL

- ❌ **未先验证实体定义**就编写代码
- ❌ **推断字段名**而非从权威源读取
- ❌ **使用不存在的字段**（幽灵字段）

---

## 五、修复建议

### 5.1 紧急修复（必须立即执行）

#### 修复 1: savePlacesSubset 字段映射

```typescript
private async savePlacesSubset(
  batchId: number,
  row: FeituoRowData,
  mblNumber: string
): Promise<void> {
  const placesRepo = AppDataSource.getRepository(ExtFeituoPlace);
  
  for (let i = 0; i < 10; i++) {
    const suffix = i === 0 ? '' : `_${i + 1}`;
    const portCode = getVal(row, `发生地信息_地点 CODE${suffix}`, '发生地信息_地点 CODE') as string;
    if (!portCode) continue;

    const placeTypeStr = getVal(row, `发生地信息_地点类型${suffix}`, '发生地信息_地点类型') as string;
    // ✅ 将字符串转换为数字（根据实际业务规则）
    const placeType = this.parsePlaceType(placeTypeStr); 

    // ✅ 正确的去重逻辑
    const existing = await placesRepo.findOne({
      where: {
        billOfLadingNumber: mblNumber,
        portCode: portCode,
        placeType: placeType,
        placeIndex: i  // 或者从数据中提取
      }
    });

    // ✅ 只使用实体中实际存在的字段
    const placeData = {
      billOfLadingNumber: mblNumber,
      containerNumber: getVal(row, '集装箱物流信息_集装箱号', '集装箱号') as string,
      portCode,
      placeType,
      placeIndex: i,
      portName: getVal(row, `发生地信息_地点名称（原始）${suffix}`, '发生地信息_地点名称（原始）'), // 使用原始名称填充
      portNameEn: getVal(row, `发生地信息_地点名称英文（标准）${suffix}`, '发生地信息_地点名称英文（标准）'),
      portNameCn: getVal(row, `发生地信息_地点名称中文（标准）${suffix}`, '发生地信息_地点名称中文（标准）'),
      nameOrigin: getVal(row, `发生地信息_地点名称（原始）${suffix}`, '发生地信息_地点名称（原始）'),
      latitude: parseFloat(String(getVal(row, `发生地信息_纬度${suffix}`, '发生地信息_纬度') || 0)) || null,
      longitude: parseFloat(String(getVal(row, `发生地信息_经度${suffix}`, '发生地信息_经度') || 0)) || null,
      portTimezone: getVal(row, `发生地信息_时区${suffix}`, '发生地信息_时区'), // ✅ 使用正确的字段名
      etd: parseDate(getVal(row, `发生地信息_预计离开时间${suffix}`, '发生地信息_预计离开时间')),
      eta: parseDate(getVal(row, `发生地信息_预计到达时间${suffix}`, '发生地信息_预计到达时间')),
      ata: parseDate(getVal(row, `发生地信息_实际到达时间${suffix}`, '发生地信息_实际到达时间')),
      atd: parseDate(getVal(row, `发生地信息_实际离开时间${suffix}`, '发生地信息_实际离开时间')),
      // ✅ 使用实体中的真实字段名
      ataAis: parseDate(getVal(row, `发生地信息_AIS 实际到港时间${suffix}`, '发生地信息_AIS 实际到港时间')),
      atbAis: parseDate(getVal(row, `发生地信息_AIS 实际靠泊时间${suffix}`, '发生地信息_AIS 实际靠泊时间')),
      atdAis: parseDate(getVal(row, `发生地信息_AIS 实际离港时间${suffix}`, '发生地信息_AIS 实际离港时间')),
      disc: parseDate(getVal(row, `发生地信息_实际卸船时间${suffix}`, '发生地信息_实际卸船时间')),
      std: parseDate(getVal(row, `发生地信息_预计离开时间${suffix}`, '发生地信息_预计离开时间')),
      load: parseDate(getVal(row, `发生地信息_实际装船时间${suffix}`, '发生地信息_实际装船时间')),
      vesselName: getVal(row, `发生地信息_船名${suffix}`, '发生地信息_船名'),
      voyageNumber: getVal(row, `发生地信息_航次${suffix}`, '发生地信息_航次'),
      terminalName: getVal(row, `发生地信息_码头名称${suffix}`, '发生地信息_码头名称'),
      transportModeIn: getVal(row, `发生地信息_运输方式${suffix}`, '发生地信息_运输方式'),
      transportModeOut: getVal(row, `发生地信息_运输方式${suffix}`, '发生地信息_运输方式'),
      firmsCode: getVal(row, `发生地信息_FIRMS 代码${suffix}`, '发生地信息_FIRMS 代码'),
      dataSource: 'Excel',  // ✅ 显式设置
      rawJson: row._rawDataByGroup?.[String(i)] || null  // ✅ 保存原始数据
    };

    if (existing) {
      Object.assign(existing, placeData);
      await placesRepo.save(existing);
    } else {
      const rec = placesRepo.create(placeData);
      await placesRepo.save(rec);
    }
  }
}

/** 解析地点类型字符串为数字 */
private parsePlaceType(val: string | null): number {
  if (!val) return 0;
  const map: Record<string, number> = {
    'POL': 1,  // 起运港
    'POD': 2,  // 目的港
    'DISC': 3, // 卸货港
    'DEL': 4,  // 交货地
    'CY': 5,   // 堆场
    'CFS': 6,  // 货运站
    'DOOR': 7, // 门点
  };
  return map[val.toUpperCase()] || 0;
}
```

#### 修复 2: saveVesselsSubset 补充字段

```typescript
const rec = vesselsRepo.create({
  billOfLadingNumber: mblNumber,
  vesselName: vesselName,
  imoNumber: getVal(row, 13, 'IMO') || getVal(row, '船泊信息_imo') as string,
  mmsiNumber: getVal(row, 13, 'MMSI') || getVal(row, '船泊信息_mmsi') as string,
  buildDate: parseDate(getVal(row, 13, '船舶建造日') || getVal(row, '船泊信息_船舶建造日')),
  flag: getVal(row, 13, '船籍') || getVal(row, '船泊信息_船籍') as string,
  containerSize: getVal(row, 13, '箱尺寸') || getVal(row, '船泊信息_箱尺寸') as string,
  operator: getVal(row, 13, '运营方') || getVal(row, '船泊信息_运营方') as string,
  vesselNameEn: getVal(row, 13, '船名') || getVal(row, '船泊信息_船名') as string, // ✅ 补充
  vesselNameCn: getVal(row, 13, '船名') || getVal(row, '船泊信息_船名') as string, // ✅ 补充
  dataSource: 'Excel',  // ✅ 显式设置（实体有默认值）
  rawJson: row._rawDataByGroup?.['13'] || null  // ✅ 保存原始数据
  // ❌ 删除 batchId（幽灵字段）
});
```

#### 修复 3: saveStatusEventsSubset 补充字段

```typescript
const fieldValues = {
  // ... 现有字段 ...
  
  // ✅ 补充缺失的可选字段
  firmsCode: getVal(row, 12, 'FIRMS 代码') || getVal(row, '集装箱物流信息 - 状态_FIRMS 代码') || null,
  source: parseInt(getVal(row, 12, 'source') || '0'),
  relatedPlaceIndex: parseInt(getVal(row, 12, 'relatedPlaceIndex') || '0'),
};
```

### 5.2 建议优化（可选）

1. **建立字段映射文档**: 创建 `docs/飞驼 Excel 导入字段映射表.md`，详细列出每个分组的字段映射关系

2. **添加数据验证**: 在保存前验证必填字段、数据类型

3. **完善错误处理**: 对字段转换失败提供更详细的错误信息

4. **性能优化**: 批量保存时使用 `Promise.all()` + 事务

---

## 六、验证清单

### 必须完成的修复

- [ ] **修复 savePlacesSubset**: 字段名对齐实体定义
- [ ] **修复 savePlacesSubset**: 补充 `placeIndex`, `portName`, `dataSource`, `rawJson`
- [ ] **修复 savePlacesSubset**: `placeType` 转换为数字
- [ ] **修复 savePlacesSubset**: 删除所有幽灵字段（`batchId`, `portNameOriginal` 等）
- [ ] **修复 saveVesselsSubset**: 删除 `batchId`
- [ ] **修复 saveVesselsSubset**: 补充 `rawJson`
- [ ] **修复 saveStatusEventsSubset**: 补充 `firmsCode`, `source`, `relatedPlaceIndex`

### 验证测试

- [ ] 执行数据库迁移脚本（如需要修改表结构）
- [ ] 运行 TypeScript 编译检查
- [ ] 执行单元测试（如有）
- [ ] 实际导入测试数据验证
- [ ] 检查数据库中各表的记录是否正确

---

## 七、总结

### 实现评分

| 子集 | 完成度 | 评分 |
|-----|--------|------|
| ① 基础信息子集 | 100% | ✅ 完全符合 |
| ② 发生地信息子集 | 30% | ❌ 严重问题 |
| ③ 集装箱物流信息子集 | 85% | ⚠️ 基本正确，少量遗漏 |
| ④ 船舶信息子集 | 80% | ⚠️ 基本正确，少量问题 |

### 核心问题

1. **违反 fix-verification SKILL**: 未验证实体定义就编写代码
2. **AI 幻觉**: 使用了大量不存在的"幽灵字段"
3. **字段名不匹配**: 约 50% 的字段名与实体定义不一致
4. **类型错误**: `placeType` 应为 INT 但使用 STRING

### 建议

1. **立即暂停导入功能**，直到完成所有修复
2. **严格遵循 fix-verification SKILL**: 修改前必须先验证实体定义
3. **建立自动化测试**: 确保字段映射的正确性
4. **代码审查**: 所有涉及数据库字段的代码必须经过双人审查

---

**报告生成时间**: 2026-03-21  
**验证人**: AI Assistant  
**参考文档**: 
- `backend/src/entities/ExtFeituoPlace.ts`
- `backend/src/entities/ExtFeituoStatusEvent.ts`
- `backend/src/entities/ExtFeituoVessel.ts`
- `backend/src/services/feituoImport.service.ts`
- `.cursor/skills/fix-verification/SKILL.md`
