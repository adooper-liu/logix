# 飞驼数据导入规则Skill

**版本**: 1.0
**制定日期**: 2026-03-17
**适用范围**: 飞驼Excel数据导入（表一/表二）
**作者**: AI编码助手

---

## 🎯 Skill概述

本Skill定义了飞驼（Freightower）数据导入的完整字段映射规则、状态码处理逻辑和优先级策略，用于指导后端`feituoImport.service.ts`的实现。

### 核心能力
- 处理15个关键字段的复杂映射逻辑
- 支持火车/无火车港口的条件判断
- 实现状态码优先级和时间最大值算法
- 跨表数据关联（船公司信息表 + 码头信息表）
- 数据验证（LFD日期校验）

---

## 📋 字段映射规则

### P0级字段（立即实施）

#### 1. 预计到港日期 (ETA - Estimated Time of Arrival)

**业务规则**:
```typescript
判断逻辑:
  1. 先判断目的港是否有火车服务
  2. 有火车: 取BDAR, IRAR, FETA的最大值
  3. 无火车: 取BDAR, POCA的最大值
  
条件:
  - LMS目的港代码与飞驼地点CODE一致
  - 是否预计: Y (取预计值)
  
来源表:
  - 飞驼-船公司信息表（状态事件）

状态码说明:
  - BDAR: 抵港 (Vessel Arrived)
  - IRAR: 铁运到站 (Rail Arrived)
  - FETA: 交货地抵达 (Delivery Arrived)
  - POCA: 靠泊 (Vessel Berthed)
```

**实现要点**:
- 需要查询`ext_container_status_events`表
- 按状态码分组，取最大日期
- 需要火车港口配置表

#### 2. 目的港到达日期 (ATA - Actual Time of Arrival)

**业务规则**:
```typescript
判断逻辑:
  1. 先判断目的港是否有火车服务
  2. 有火车: 取IRAR, FETA的最大值
  3. 无火车: 取BDAR, POCA的最大值
  
条件:
  - LMS目的港代码与飞驼地点CODE一致
  - 是否预计: N (取实际值)
  
来源表:
  - 飞驼-船公司信息表（状态事件）
```

**实现要点**:
- 仅取`isEstimated = false`的事件
- 取最大值而非最新值

#### 3. 目的港卸船/火车日期 (Discharge Date)

**业务规则**:
```typescript
判断逻辑:
  1. 有火车: 取IRDS
  2. 无火车: 取DSCH, PCAB的最大值
  
条件:
  - LMS目的港代码与飞驼地点CODE一致
  - 是否预计: N
  
来源表:
  - 飞驼-船公司信息表（状态事件）

状态码说明:
  - IRDS: 铁运卸箱 (Rail Discharged)
  - DSCH: 卸船 (Vessel Discharged)
  - PCAB: 可提货 (Available) - 备选
```

**注意**: PCAB作为备选不合理，应优先使用DSCH/IRDS

#### 4. 实际提柜日期 (Pickup Date)

**业务规则**:
```typescript
状态码: STCS
是否预计: N
来源表: 飞驼-船公司信息表
字段映射: 'gate_out_time'
```

**实现状态**: ✅ 已实现

#### 5. 还箱日期 (Return Date)

**业务规则**:
```typescript
状态码: RCVE
是否预计: N
来源表: 飞驼-船公司信息表
字段映射: 'return_time'
```

**实现状态**: ✅ 已实现

---

### P1级字段（本周实施）

#### 6. 码头 (Terminal)

**业务规则**:
```typescript
判断逻辑:
  有火车:
    1. 先取FETA对应的码头名称
    2. 取不到再取IRAR对应的码头名称
  无火车:
    1. 先取DSCH对应的码头名称
    2. 取不到再取PCAB对应的码头名称

优先级规则:
  1. 飞驼-码头信息表: 码头代码 → 码头全称
  2. 飞驼-船公司信息表: 目的港对应的码头名称
  
回退机制:
  第一个代码取不到时，取第二个

是否预计: N
```

**复杂性**: ⭐⭐⭐⭐⭐
- 需要跨表查询（码头信息表）
- 需要按状态码优先级取值
- 需要回退机制

**设计问题**: 通过状态码取码头名称本末倒置，应优先维护码头代码-名称映射

#### 7. 最后免费日期 (Last Free Date - LFD)

**业务规则**:
```typescript
取值逻辑:
  有火车: 取飞驼-船公司信息表PLFD对应的时间
  无火车: 取飞驼-码头信息表"免费提柜截止日"

重要验证:
  如果LFD < 目的港到达日期(ATA), 则不更新该日期到物流信息表
  
来源表:
  - 有火车: 飞驼-船公司信息表
  - 无火车: 飞驼-码头信息表

状态码: PLFD (铁路免柜期)
是否预计: N
```

**业务影响**: 高
- 错误的LFD导致滞港费计算错误
- LFD早于ATA是无效数据

**实现要点**:
- 必须实现LFD < ATA验证
- 不更新时应记录日志和原因

#### 8. 途径港 (Transit Port)

**业务规则**:
```typescript
规则:
  1. 与目的港不相同的港口地点（发生地/发生地代码）都视为途经港
  2. 排除起始港
  
是否预计: N
来源表: 飞驼-船公司信息表
```

**实现状态**: ⚠️ 部分实现（P0优化中已实现基础逻辑）

**待完善**:
- 增加IRDP状态码识别（火车发出）
- 完善排除起始港的逻辑

#### 9. 途径港到达日期 (Transit Arrival Date)

**业务规则**:
```typescript
取值顺序（无论有无火车）:
  TSBA → TSCA → TSDC → BDAR → POCA → DSCH

规则:
  1. 取地点代码不等于目的港的状态代码
  2. 如果满足多个条件取日期较大的一个
  
是否预计: N
来源表: 飞驼-船公司信息表

状态码说明:
  - TSBA: 中转抵港 (T/S Vessel Arrived)
  - TSCA: 中转停泊 (T/S Vessel Berthed)
  - TSDC: 中转卸船 (T/S Vessel Discharged)
```

**实现状态**: ⚠️ 部分实现（P0优化中已实现基础逻辑）

**待完善**:
- 需要实现取最大值逻辑
- 需要严格排除目的港

#### 10. 火车发出时间 (Train Departure)

**业务规则**:
```typescript
状态码: IRDP
地点代码: 不做判断
取值优先级: 优先取是否预计=N，取不到时取=Y
是否预计: Y/N（混合）

字段映射: train_departure_time（需新增字段）
```

**实现状态**: ❌ 完全未实现

**需要**:
- 新增数据库字段
- 新增状态码映射
- 实现混合预计逻辑

---

### P2级字段（本月实施）

#### 11. 母船船名/船次 (Mother Vessel)

**业务规则**:
```typescript
字段: mother_vessel_name, mother_voyage_number
是否预计: N
来源表: 飞驼-船公司信息表
```

**实现状态**: ✅ 已实现（在SeaFreight实体中）

#### 12. 清关日期 (Customs Clearance Date)

**业务规则**:
```typescript
取值逻辑: 暂无

状态码参考:
  - PASS: 海关放行
  - CUIP: 海关滞留
  - TMPS: 码头放行
```

**建议**: 从HOLD/放行状态推导，需要明确业务规则

---

## 🔧 核心算法

### 算法1: 状态码优先级取最大值

```typescript
/**
 * 根据状态码列表和位置代码，取最大日期
 * @param events 状态事件列表
 * @param statusCodes 目标状态码数组
 * @param locationCode 位置代码（LMS匹配）
 * @param isEstimated 是否取预计值（true=仅预计, false=仅实际, null=全部）
 * @returns 最大日期或null
 */
private async getMaxDateByStatusCodes(
  events: ContainerStatusEvent[],
  statusCodes: string[],
  locationCode: string,
  isEstimated: boolean | null = false
): Promise<Date | null> {
  const filtered = events.filter(e => 
    statusCodes.includes(e.statusCode) &&
    e.location === locationCode &&
    (isEstimated === null || e.isEstimated === isEstimated)
  );
  
  if (filtered.length === 0) return null;
  
  return new Date(Math.max(
    ...filtered.map(e => e.occurredAt.getTime())
  ));
}
```

### 算法2: 火车港口判断

```typescript
/**
 * 判断港口是否提供火车服务
 * @param portCode 港口代码（UNLOCODE）
 * @returns boolean
 */
private async hasTrainService(portCode: string): Promise<boolean> {
  // 方案1: 配置表维护（推荐）
  const trainPorts = [
    'DEHAM', 'DEHAJ',  // 德国汉堡
    'NLRTM', 'NLAMS',  // 荷兰鹿特丹/阿姆斯特丹
    'BEANR', 'BEZEE',  // 比利时安特卫普
    'FRLEH', 'FRSRV'   // 法国勒阿弗尔
  ];
  
  return trainPorts.includes(portCode);
  
  // 方案2: 从历史数据推断
  // const hasTrainEvents = await eventRepo.count({
  //   where: { statusCode: In(['IRAR', 'IRDS', 'IRDP']) }
  // });
  // return hasTrainEvents > 0;
}
```

### 算法3: LFD日期验证

```typescript
/**
 * 验证最后免费日期是否有效
 * @param lastFreeDate LFD日期
 * @param ataDestPort ATA日期
 * @returns boolean（true=有效, false=无效）
 */
private validateLFD(lastFreeDate: Date, ataDestPort: Date): boolean {
  // LFD必须 >= ATA，否则无效
  return lastFreeDate.getTime() >= ataDestPort.getTime();
}

// 使用示例
const lastFreeDate = parseDate(getVal(row, 'PLFD'));
const ataDestPort = destPo.ataDestPort;

if (lastFreeDate && ataDestPort) {
  if (this.validateLFD(lastFreeDate, ataDestPort)) {
    destPo.lastFreeDate = lastFreeDate;
  } else {
    logger.warn(
      `[FeituoImport] LFD (${lastFreeDate}) < ATA (${ataDestPort}), ` +
      `skipping update for ${containerNumber}`
    );
    // 不更新LFD，保持原有值
  }
}
```

### 算法4: 码头名称获取

```typescript
/**
 * 获取码头名称（带优先级和回退）
 * @param row 飞驼数据行
 * @param statusCode 状态码（FETA/IRAR/DSCH/PCAB）
 * @param portCode 港口代码
 * @returns 码头名称或null
 */
private async getTerminalByPriority(
  row: FeituoRowData,
  statusCode: string,
  portCode: string
): Promise<string | null> {
  // 步骤1: 从状态事件获取码头名称
  const eventTerminal = getVal(row, '码头名称', statusCode);
  if (eventTerminal) return eventTerminal;
  
  // 步骤2: 从码头信息表查询
  const terminalCode = getVal(row, '码头代码');
  if (terminalCode) {
    const terminal = await this.terminalInfoRepo.findOne({
      where: { terminalCode }
    });
    if (terminal?.terminalFullName) return terminal.terminalFullName;
  }
  
  // 步骤3: 从船公司信息表获取
  const portTerminal = getVal(row, '交货地码头名称') || 
                       getVal(row, 5, '码头名称');
  return portTerminal || null;
}
```

---

## 📊 数据库表结构

### 待新增字段

```sql
-- process_port_operations表
ALTER TABLE process_port_operations 
ADD COLUMN train_arrival_date TIMESTAMP,           -- 火车到达
ADD COLUMN train_discharge_date TIMESTAMP,         -- 火车卸箱
ADD COLUMN train_departure_time TIMESTAMP,         -- 火车离站
ADD COLUMN rail_last_free_date TIMESTAMP,          -- 铁路免柜期
ADD COLUMN last_free_date_invalid BOOLEAN,         -- LFD是否无效
ADD COLUMN last_free_date_remark TEXT;             -- LFD备注
```

### 状态事件表示例数据

```sql
-- ext_container_status_events表
INSERT INTO ext_container_status_events (
  container_number, status_code, status_name, 
  occurred_at, location, is_estimated, data_source
) VALUES
('ECMU5400183', 'BDAR', '抵港', '2025-01-01 18:00:00', 'GBFXT', false, 'Feituo'),
('ECMU5400183', 'IRAR', '铁运到站', '2025-01-03 09:00:00', 'DEHAM', false, 'Feituo'),
('ECMU5400183', 'DSCH', '卸船', '2025-01-02 15:00:00', 'GBFXT', false, 'Feituo');
```

---

## 🚀 实施路线图

### 第一阶段（P0 - 立即修复）
**目标**: 使火车港口基础功能可用
**时间**: 3小时15分钟
**交付物**:
- [ ] 新增5个火车状态码映射
- [ ] 修复PCAB映射错误
- [ ] LFD验证逻辑实现
- [ ] 状态事件优先级算法

### 第二阶段（P1 - 本周）
**目标**: 完善条件逻辑和数据准确性
**时间**: 9小时
**交付物**:
- [ ] 火车/无火车判断
- [ ] 预计到港逻辑
- [ ] 目的港到达逻辑
- [ ] 卸船日期逻辑
- [ ] 单元测试覆盖率>80%

### 第三阶段（P2 - 本月）
**目标**: 优化用户体验和可观测性
**时间**: 7.5小时
**交付物**:
- [ ] 码头多表关联
- [ ] 途径港完善
- [ ] 火车发出时间
- [ ] 数据质量报告
- [ ] 性能优化

---

## 🛡️ 错误处理

### 错误类型与处理策略

```typescript
// 1. 状态码未定义
if (!getCoreFieldName(statusCode)) {
  logger.warn(`[FeituoImport] Unknown status code: ${statusCode}`);
  // 记录到raw_data但不中断导入
}

// 2. LMS匹配失败
if (!matchingEvents.length) {
  logger.warn(`[FeituoImport] No matching events for port ${portCode}`);
  // 使用Excel字段作为fallback
}

// 3. LFD验证失败
if (!this.validateLFD(lastFreeDate, ataDestPort)) {
  logger.warn(`[FeituoImport] Invalid LFD for ${containerNumber}`);
  // 记录但不更新
}

// 4. 日期解析失败
const date = parseDate(dateStr);
if (!date) {
  logger.warn(`[FeituoImport] Date parse failed: ${dateStr}`);
  // 返回null，触发fallback
}
```

---

## 📈 成功标准

### 功能标准
- [ ] 火车港口数据导入成功率>95%
- [ ] LFD验证准确性100%
- [ ] 状态码优先级计算准确性100%
- [ ] 码头跨表查询成功率>90%

### 性能标准
- [ ] 1000条数据处理时间<10分钟
- [ ] 数据库查询次数<100次（批量优化后）
- [ ] 内存使用<500MB

### 质量标准
- [ ] 单元测试覆盖率>80%
- [ ] 集成测试通过率100%
- [ ] 生产环境错误率<5%

---

## 🔗 相关文件

- **主逻辑**: `backend/src/services/feituoImport.service.ts`
- **状态码映射**: `backend/src/constants/FeiTuoStatusMapping.ts`
- **字段分组**: `backend/src/constants/FeituoFieldGroupMapping.ts`
- **数据库脚本**: `backend/03_create_tables.sql`
- **测试数据**: `backend/scripts/test-feituo-import-enhancements.ts`

---

## 📞 联系支持

**技术负责人**: 开发团队
**业务联系人**: [待填写]
**紧急情况**: 数据导入失败/数据不一致

**问题升级路径**:
1. 查看错误日志：`logger.warn('[FeituoImport]...')`
2. 检查批次记录：`ext_feituo_import_batch`
3. 查看原始数据：`ext_feituo_import_table1/2`
4. 联系开发团队

---

**文档版本**: v1.0
**最后更新**: 2026-03-17
**下次评审**: P0完成后
