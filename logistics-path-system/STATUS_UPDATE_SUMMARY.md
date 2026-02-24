# 状态类型更新总结

## 更新时间
2026-02-24

## 更新目的
将 `logistics-path-system` 项目的状态类型定义与飞驼事件码集成完成总结文档保持一致，确保支持多式联运（海运、铁路、驳船、卡车）和完整的中转流转。

## 更新内容

### 1. 标准状态枚举扩展

**更新前**: 25个标准状态
**更新后**: **33个标准状态**

#### 新增状态 (8个)

| 状态码 | 中文名称 | 类别 | 说明 |
|--------|---------|------|------|
| `PLANNED` | 已计划 | 计划 | 货物已安排计划 |
| `CONTAINER_STUFFED` | 已装箱 | 起运地 | 集装箱已装箱 |
| `RAIL_LOADED` | 铁路装箱 | 铁路 | 铁路运输装箱 |
| `RAIL_DEPARTED` | 铁路离站 | 铁路 | 铁路离站 |
| `RAIL_ARRIVED` | 铁路到站 | 铁路 | 铁路到达 |
| `RAIL_DISCHARGED` | 铁路卸箱 | 铁路 | 铁路卸箱 |
| `FEEDER_LOADED` | 驳船装船 | 驳船 | 驳船装船 |
| `FEEDER_DEPARTED` | 驳船离港 | 驳船 | 驳船离港 |
| `FEEDER_ARRIVED` | 驳船抵达 | 驳船 | 驳船抵达 |
| `FEEDER_DISCHARGED` | 驳船卸船 | 驳船 | 驳船卸船 |
| `TRANSIT_BERTHED` | 中转停泊 | 中转 | 中转停泊 |
| `TRANSIT_DISCHARGED` | 中转卸船 | 中转 | 中转卸船 |
| `TRANSIT_LOADED` | 中转装船 | 中转 | 中转装船 |
| `BERTHED` | 已停泊 | 到港 | 港口停泊 |
| `IN_TRANSIT_TO_DEST` | 运输至目的地 | 提柜 | 运输到目的地 |
| `HOLD` | 扣留 | 扣留 | 通用扣留状态 |

#### 状态类别完整清单

1. **初始/计划状态** (2个)
   - `NOT_SHIPPED` - 未出运
   - `PLANNED` - 已计划

2. **起运地操作** (3个)
   - `EMPTY_PICKED_UP` - 已提空箱
   - `CONTAINER_STUFFED` - 已装箱
   - `GATE_IN` - 已进港

3. **铁路运输** (4个)
   - `RAIL_LOADED` - 铁路装箱
   - `RAIL_DEPARTED` - 铁路离站
   - `RAIL_ARRIVED` - 铁路到站
   - `RAIL_DISCHARGED` - 铁路卸箱

4. **驳船运输** (4个)
   - `FEEDER_LOADED` - 驳船装船
   - `FEEDER_DEPARTED` - 驳船离港
   - `FEEDER_ARRIVED` - 驳船抵达
   - `FEEDER_DISCHARGED` - 驳船卸船

5. **海运** (3个)
   - `LOADED` - 已装船
   - `DEPARTED` - 已离港
   - `SAILING` - 航行中

6. **中转** (5个)
   - `TRANSIT_ARRIVED` - 中转抵港
   - `TRANSIT_BERTHED` - 中转停泊
   - `TRANSIT_DISCHARGED` - 中转卸船
   - `TRANSIT_LOADED` - 中转装船
   - `TRANSIT_DEPARTED` - 中转离港

7. **到港** (4个)
   - `ARRIVED` - 已抵港
   - `BERTHED` - 已停泊
   - `DISCHARGED` - 已卸船
   - `AVAILABLE` - 可提货

8. **提柜/陆运** (4个)
   - `IN_TRANSIT_TO_DEST` - 运输至目的地
   - `GATE_OUT` - 已出港
   - `DELIVERY_ARRIVED` - 已送达
   - `STRIPPED` - 已拆箱

9. **还空箱** (1个)
   - `RETURNED_EMPTY` - 已还空箱

10. **完成状态** (1个)
    - `COMPLETED` - 已完成

11. **扣留/滞留状态** (5个)
    - `CUSTOMS_HOLD` - 海关滞留
    - `CARRIER_HOLD` - 船公司滞留
    - `TERMINAL_HOLD` - 码头滞留
    - `CHARGES_HOLD` - 运费滞留
    - `HOLD` - 扣留

12. **异常状态** (1个)
    - `DUMPED` - 已甩柜

13. **预警状态** (4个)
    - `DELAYED` - 延误
    - `DETENTION` - 滞期
    - `OVERDUE` - 超期
    - `CONGESTION` - 拥堵

14. **未知状态** (1个)
    - `UNKNOWN` - 未知状态

### 2. 状态流转规则扩展

**更新前**: 约60条流转规则
**更新后**: **100+条流转规则**

#### 新增流转类别

1. **铁路运输流转**
   - `NOT_SHIPPED/PLANNED` → `EMPTY_PICKED_UP` → `CONTAINER_STUFFED` → `RAIL_LOADED` → `RAIL_DEPARTED` → `RAIL_ARRIVED` → `RAIL_DISCHARGED`

2. **驳船运输流转**
   - `EMPTY_PICKED_UP/CONTAINER_STUFFED` → `FEEDER_LOADED` → `FEEDER_DEPARTED` → `FEEDER_ARRIVED` → `FEEDER_DISCHARGED`

3. **中转流转**
   - `ARRIVED/DEPARTED` → `TRANSIT_ARRIVED` → `TRANSIT_BERTHED` → `TRANSIT_DISCHARGED` → `TRANSIT_LOADED` → `TRANSIT_DEPARTED`

4. **多式联运流转**
   - 铁路 → 海运: `RAIL_DISCHARGED` → `GATE_IN` → `LOADED`
   - 驳船 → 海运: `FEEDER_DISCHARGED` → `GATE_IN` → `LOADED`
   - 海运 → 陆运: `DISCHARGED` → `AVAILABLE` → `GATE_OUT` → `IN_TRANSIT_TO_DEST` → `DELIVERY_ARRIVED`

5. **扣留恢复流转**
   - `CUSTOMS_HOLD` → `AVAILABLE/GATE_OUT`
   - `CARRIER_HOLD` → `AVAILABLE/GATE_OUT`
   - `TERMINAL_HOLD` → `AVAILABLE/GATE_OUT`
   - `CHARGES_HOLD` → `AVAILABLE/GATE_OUT`
   - `HOLD` → 恢复到之前状态

6. **异常流转**
   - `DUMPED` → `RAIL_LOADED/FEEDER_LOADED/LOADED` (重新安排)
   - `DUMPED` → `GATE_OUT/RETURNED_EMPTY/COMPLETED`

### 3. 飞驼事件码映射扩展

**更新前**: 约15个事件码映射
**更新后**: **40+个事件码映射**

#### 新增事件码类别

1. **起运地节点** (5个)
   - `STSP` → `EMPTY_PICKED_UP` (空箱提取)
   - `STUF` → `CONTAINER_STUFFED` (装箱)
   - `GITM` → `CONTAINER_STUFFED` (装箱通用)
   - `PRLD` → `CONTAINER_STUFFED` (预装箱)
   - `GTIN` → `GATE_IN` (进港)

2. **铁路运输节点** (4个)
   - `IRLB` → `RAIL_LOADED` (铁路装箱)
   - `IRDP` → `RAIL_DEPARTED` (铁路离站)
   - `IRAR` → `RAIL_ARRIVED` (铁路到站)
   - `IRDS` → `RAIL_DISCHARGED` (铁路卸箱)

3. **驳船运输节点** (4个)
   - `FDLB` → `FEEDER_LOADED` (驳船装船)
   - `FDDP` → `FEEDER_DEPARTED` (驳船离港)
   - `FDBA` → `FEEDER_ARRIVED` (驳船抵达)
   - `FDDC` → `FEEDER_DISCHARGED` (驳船卸船)

4. **中转节点** (5个)
   - `TSBA` → `TRANSIT_ARRIVED` (中转抵港)
   - `TSCA` → `TRANSIT_BERTHED` (中转停泊)
   - `TSDC` → `TRANSIT_DISCHARGED` (中转卸船)
   - `TSLB` → `TRANSIT_LOADED` (中转装船)
   - `TSDP` → `TRANSIT_DEPARTED` (中转离港)

5. **到港节点** (4个)
   - `BDAR` → `ARRIVED` (抵港)
   - `POCA` → `AVAILABLE` (可提货)
   - `DSCH` → `DISCHARGED` (卸船)
   - `PCAB` → `AVAILABLE` (可提货-港口)

6. **陆运节点** (5个)
   - `STCS` → `IN_TRANSIT_TO_DEST` (起运卡车)
   - `GTOT` → `GATE_OUT` (出港)
   - `STRP` → `STRIPPED` (拆箱)
   - `FETA` → `DELIVERY_ARRIVED` (货物送达)
   - `RCVE` → `DELIVERY_ARRIVED` (接收货物)

7. **扣留/放行节点** (8个)
   - `CUIP` → `CUSTOMS_HOLD` (海关滞留)
   - `PASS` → `AVAILABLE` (海关放行)
   - `SRHD` → `CARRIER_HOLD` (船公司滞留)
   - `SRRS` → `AVAILABLE` (船公司放行)
   - `TMHD` → `TERMINAL_HOLD` (码头滞留)
   - `TMPS` → `AVAILABLE` (码头放行)
   - `SRSD` → `CHARGES_HOLD` (运费滞留)
   - `SRSE` → `AVAILABLE` (运费放行)

8. **异常节点** (2个)
   - `DUMP` → `DUMPED` (甩柜)
   - `STLH` → `HOLD` (通用扣留)

9. **预警事件码** (10个)
   - `WGITM` → `DELAYED` (装箱延误)
   - `WDLPT` → `DELAYED` (离港延误)
   - `WDUMP` → `DUMPED` (甩柜预警)
   - `WTSBA` → `DELAYED` (中转延误)
   - `WPCGI` → `DETENTION` (停留延误)
   - `WBDAR` → `DELAYED` (抵港延误)
   - `WGTOT` → `DETENTION` (出港延误)
   - `WETA` → `DELAYED` (ETA延误)
   - `WSTCS` → `OVERDUE` (超期)
   - `WRCVE` → `OVERDUE` (逾期预警)

### 4. 状态优先级重新定义

更新了33个状态的优先级（0-999），确保异常和扣留状态有更高的优先级显示：

| 优先级 | 范围 | 状态类别 |
|-------|------|---------|
| 0-1 | 初始/计划 | `NOT_SHIPPED(0)`, `PLANNED(1)` |
| 2-11 | 起运地/铁路/驳船 | `EMPTY_PICKED_UP(2)` 到 `FEEDER_DISCHARGED(11)` |
| 12-14 | 起运地/海运 | `GATE_IN(12)`, `LOADED(13)`, `DEPARTED(14)` |
| 15-20 | 海运/中转 | `SAILING(15)` 到 `TRANSIT_DEPARTED(20)` |
| 21-29 | 到港/提柜 | `ARRIVED(21)` 到 `STRIPPED(29)` |
| 31-32 | 还箱/完成 | `RETURNED_EMPTY(31)`, `COMPLETED(32)` |
| 200-204 | 扣留状态 | `CUSTOMS_HOLD(200)` 到 `HOLD(204)` |
| 300 | 异常状态 | `DUMPED(300)` |
| 400-403 | 预警状态 | `DELAYED(400)` 到 `CONGESTION(403)` |
| 999 | 未知状态 | `UNKNOWN(999)` |

### 5. Location 类型扩展

新增两种位置类型：
- `RAIL` - 铁路站/场
- `FEEDER` - 驳船码头

## 更新的文件清单

| 文件路径 | 更新内容 |
|---------|---------|
| `frontend/src/types/Logistics.ts` | 扩展 `StandardStatus` 枚举到33个状态，新增 `LocationType.RAIL` 和 `LocationType.FEEDER` |
| `frontend/src/types/StateMachine.ts` | 更新状态流转规则到100+条，更新状态标签映射和优先级定义 |
| `shared/types/index.ts` | 扩展 `StandardStatus` 枚举和 `LocationType` 枚举 |
| `shared/constants/statusMappings.ts` | 完整的飞驼事件码映射（40+个），新增预警事件映射，更新状态标签和图标 |

## 兼容性

✅ **向后兼容**: 所有原有的状态和事件码映射保持不变
✅ **无破坏性变更**: 只新增状态，不删除或修改现有状态
✅ **零 Linter 错误**: 所有更新代码通过类型检查

## 多式联运支持

### 支持的运输方式

1. **海运 (SEA)**
   - 流程: `GATE_IN` → `LOADED` → `DEPARTED` → `SAILING` → `ARRIVED` → `DISCHARGED` → `AVAILABLE`

2. **铁路 (RAIL)**
   - 流程: `RAIL_LOADED` → `RAIL_DEPARTED` → `RAIL_ARRIVED` → `RAIL_DISCHARGED`

3. **驳船 (FEEDER)**
   - 流程: `FEEDER_LOADED` → `FEEDER_DEPARTED` → `FEEDER_ARRIVED` → `FEEDER_DISCHARGED`

4. **卡车 (TRUCK)**
   - 流程: `GATE_IN` → `GATE_OUT` → `IN_TRANSIT_TO_DEST` → `DELIVERY_ARRIVED`

### 中转流转

- **中转抵港**: `TRANSIT_ARRIVED` → `TRANSIT_BERTHED` → `TRANSIT_DISCHARGED` → `TRANSIT_LOADED` → `TRANSIT_DEPARTED`
- **驳船中转**: `FEEDER_DEPARTED` → `FEEDER_ARRIVED` → `FEEDER_DISCHARGED`
- **铁路中转**: `RAIL_DEPARTED` → `RAIL_ARRIVED` → `RAIL_DISCHARGED`

### 异常流转

- **海关滞留**: `AVAILABLE` → `CUSTOMS_HOLD` → `AVAILABLE` (放行后恢复)
- **船公司滞留**: `AVAILABLE` → `CARRIER_HOLD` → `AVAILABLE` (放行后恢复)
- **码头滞留**: `AVAILABLE` → `TERMINAL_HOLD` → `AVAILABLE` (放行后恢复)
- **运费滞留**: `AVAILABLE` → `CHARGES_HOLD` → `AVAILABLE` (放行后恢复)
- **甩柜**: `任何状态` → `DUMPED` → `重新安排` → `继续流转`

## 下一步建议

1. **更新后端状态机**: 确保后端的状态机规则与前端保持一致
2. **更新GraphQL Schema**: 确保 Schema 中的状态枚举包含新增的33个状态
3. **更新数据库Schema**: 如果数据库有状态字段，需要扩展以支持新增状态
4. **测试多式联运流程**: 创建测试用例验证铁路、驳船、海运的完整流转
5. **更新文档**: 更新用户手册和API文档，说明新增状态的使用方法
6. **前端组件适配**: 确保 `LogisticsPath` 组件正确渲染所有新增状态的图标和标签

## 相关文档

- [飞驼事件码集成完成总结](D:/Gihub/container-system/docs/飞驼事件码集成完成总结.md)
- [项目 README](./README.md)
- [前端类型定义](./frontend/src/types/Logistics.ts)
- [共享类型定义](./shared/types/index.ts)
- [状态映射常量](./shared/constants/statusMappings.ts)
