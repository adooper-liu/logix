# 飞驼状态码命名规范

## 命名依据

所有状态码的中文描述（`description_cn`）以飞驼系统提供的标准为准。

## 完整映射表

| event_code | description_cn | description_en | StandardStatus |
|------------|----------------|----------------|----------------|
| STSP | 提空箱 | Pick-up Empty | EMPTY_PICKED_UP |
| GITM | 进场 | Received | CONTAINER_STUFFED |
| GTIN | 卡车进场 | Gated in | GATE_IN |
| LOBD | 装船 | Loaded | LOADED |
| DLPT | 离港 | Vessel Departed | DEPARTED |
| BDAR | 抵港 | Vessel Arrived | ARRIVED |
| FETA | 交货地抵达 | Delivery Arrived | DELIVERY_ARRIVED |
| POCA | 靠泊 | Vessel Berthed | BERTHED |
| DSCH | 卸船 | Vessel Discharged | DISCHARGED |
| STCS | 提柜 (货) | Gate Out for Delivery | IN_TRANSIT_TO_DEST |
| GTOT | 已提柜 | Gate Out for Delivery | GATE_OUT |
| RCVE | 还空箱 | Empty Returned | RETURNED_EMPTY |
| RTNE | 还空箱 | Empty Returned | RETURNED_EMPTY |
| PCAB | 可提货 | Available for Pickup | AVAILABLE |
| STRP | 拆箱 | Stripped | STRIPPED |

## 特殊状态

| event_code | description_cn | description_en | StandardStatus |
|------------|----------------|----------------|----------------|
| CUIP | 海关滞留 | Customs Inspection | CUSTOMS_HOLD |
| PASS | 海关放行 | Customs Released | AVAILABLE |

## 铁路状态（海铁联运）

| event_code | description_cn | description_en | StandardStatus |
|------------|----------------|----------------|----------------|
| IRLB | 铁路装车 | Rail Loaded | RAIL_LOADED |
| IRDP | 铁路运输 | Rail Departed | RAIL_DEPARTED |
| IRAR | 铁路到达 | Rail Arrived | RAIL_ARRIVED |
| IRDS | 铁路卸箱 | Rail Discharged | RAIL_DISCHARGED |

## 驳船状态（驳船联运）

| event_code | description_cn | description_en | StandardStatus |
|------------|----------------|----------------|----------------|
| FDLB | 驳船装船 | Feeder Loaded | FEEDER_LOADED |
| FDDP | 驳船离港 | Feeder Departed | FEEDER_DEPARTED |
| FDBA | 驳船抵达 | Feeder Arrived | FEEDER_ARRIVED |
| FDDC | 驳船卸船 | Feeder Discharged | FEEDER_DISCHARGED |

## 警告状态

| event_code | description_cn | description_en | StandardStatus |
|------------|----------------|----------------|----------------|
| WGITM | 延迟进仓 | Delayed Received | DELAYED |
| WDLPT | 延迟离港 | Delayed Departure | DELAYED |
| WBDAR | 延迟抵港 | Delayed Arrival | DELAYED |
| WGTOT | 滞箱费 | Detention Charge | DETENTION |
| WSTCS | 超期提柜 | Overdue Delivery | OVERDUE |
| WRCVE | 超期还箱 | Overdue Return | OVERDUE |

## 代码实现

### STATUS_CODE_DISPLAY 映射

```typescript
const STATUS_CODE_DISPLAY: Record<string, string> = {
  STSP: "提空箱",
  GITM: "进场",
  GTIN: "卡车进场",
  LOBD: "装船",
  DLPT: "离港",
  BDAR: "抵港",
  FETA: "交货地抵达",
  POCA: "靠泊",
  DSCH: "卸船",
  STCS: "提柜 (货)",
  GTOT: "已提柜",
  RCVE: "还空箱",
  RTNE: "还空箱",
  PCAB: "可提货",
  CUIP: "海关滞留",
  PASS: "海关放行",
};
```

## 显示格式

前端节点显示格式：`event_code + description_cn`

**示例**：
- `STSP 提空箱`
- `LOBD 装船`
- `DLPT 离港`
- `BDAR 抵港`
- `FETA 交货地抵达`
- `POCA 靠泊`
- `DSCH 卸船`
- `STCS 提柜 (货)`
- `GTOT 已提柜`
- `RCVE 还空箱`

## 版本历史

| 版本 | 日期 | 修改内容 | 作者 |
|------|------|----------|------|
| 1.0 | 2026-04-02 | 初始版本：统一状态码命名 | 刘志高 |

---

**文档位置**：`frontend/public/docs/05-state-machine/02-飞驼状态码命名规范.md`  
**创建日期**：2026-04-02  
**维护者**：刘志高
