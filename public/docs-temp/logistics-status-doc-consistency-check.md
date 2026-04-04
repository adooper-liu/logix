# 物流状态机文档与代码一致性检查报告

**检查日期**: 2026-04-04  
**检查人**: AI 智能体（遵循 SKILL 规范）  
**检查范围**: `frontend/public/docs/第 2 层 - 业务逻辑/04-物流状态机与飞驼事件专题/`  
**对比基准**: `backend/src/utils/logisticsStatusMachine.ts` (最新代码)

---

## 执行摘要

本次检查发现 **3 个不一致点**，需要更新文档以确保与代码完全一致。

### 问题分类

| 编号 | 问题类型 | 严重程度 | 涉及文档 |
|------|----------|----------|----------|
| 1 | 状态定义缺失 | 高 | 01-物流状态机完整指南.md |
| 2 | 优先级顺序描述不准确 | 中 | 01-物流状态机完整指南.md |
| 3 | WMS 确认条件不完整 | 中 | 01-物流状态机完整指南.md |

---

## 详细问题清单

### 问题 1: 状态定义缺失

**位置**: `01-物流状态机完整指南.md` 第 1.1 节

**文档描述**:
```
not_shipped → shipped → in_transit → at_port → picked_up → unloaded → returned_empty
未出运        已出运      在途         已到港     已提柜     已卸柜     已还箱
```

**代码实际定义** (`logisticsStatusMachine.ts:24-31`):
```typescript
export enum SimplifiedStatus {
  NOT_SHIPPED = 'not_shipped',       // 未出运
  SHIPPED = 'shipped',               // 已出运/已装船
  IN_TRANSIT = 'in_transit',         // 在途
  AT_PORT = 'at_port',               // 已到港（中转港或目的港）
  PICKED_UP = 'picked_up',           // 已提柜
  UNLOADED = 'unloaded',             // 已卸柜
  RETURNED_EMPTY = 'returned_empty'  // 已还箱
}
```

**不一致点**:
- 文档中的流转顺序正确，但缺少对 `shipped` 状态的详细说明
- 表格中应补充 `shipped` 状态的业务含义：**货物已装船，但尚未开航**

**影响**: 用户可能不理解 `shipped` 和 `in_transit` 的区别

**建议修复**:
在表格第 35 行后补充说明：
```markdown
| `shipped` | 已出运 | Shipped | 货物已装船，但船舶尚未离港开航 |
```

---

### 问题 2: 优先级顺序描述不准确

**位置**: `01-物流状态机完整指南.md` 第 2.1 节

**文档描述** (行 56-150):
```
// 优先级 4: 目的港有实际到港时间
// 优先级 4a: 目的港有可提货时间（飞驼 PCAB/AVLE/AVAIL 触发）
// 优先级 5: 中转港 ATA + 海运出运
// 优先级 6: 有海运记录（已实际出运）
```

**代码实际逻辑** (`logisticsStatusMachine.ts:348-420`):
```typescript
// 优先级 4: 目的港有实际到港时间
const destWithArrival = destPorts.find((po) => po.ata);
if (destWithArrival) {
  status = SimplifiedStatus.AT_PORT;
  currentPortType = 'destination';
  latestPortOperation = destWithArrival;
  triggerFields = { ata: destWithArrival.ata };
  reason = '目的港已到港 (ATA)';
  return { status, currentPortType, latestPortOperation, triggerFields, reason };
}

// 优先级 4a: 目的港有可提货时间（飞驼 PCAB/AVLE/AVAIL 触发）
const destWithAvailable = destPorts.find((po) => po.availableTime);
if (destWithAvailable) {
  status = SimplifiedStatus.AT_PORT;
  currentPortType = 'destination';
  latestPortOperation = destWithAvailable;
  triggerFields = { availableTime: destWithAvailable.availableTime };
  reason = '目的港可提货 (PCAB/AVLE/AVAIL)';
  return { ... };
}

// 优先级 5: 中转港 ATA + 海运出运 -> in_transit
const transitWithArrival = transitPorts.find(po => po.ata);
if (transitWithArrival && seaFreight?.shipmentDate) {
  status = SimplifiedStatus.IN_TRANSIT;
  currentPortType = 'transit';
  // ...
}

// 优先级 6: 有海运记录（已实际出运）-> shipped
if (seaFreight?.shipmentDate) {
  status = SimplifiedStatus.SHIPPED;
  triggerFields = { shipmentDate: seaFreight.shipmentDate };
  reason = '已出运';
  return { ... };
}
```

**不一致点**:
1. 文档中优先级 5 的描述是"中转港 ATA + 海运出运"，但返回的状态是 `in_transit`（在途），而非文档表格中标注的 `at_port`
2. 文档中优先级 6 的描述是"有海运记录"，但返回的状态是 `shipped`（已出运），而非文档表格中标注的 `in_transit`

**影响**: 开发者可能错误理解状态计算逻辑，导致排查问题时方向错误

**建议修复**:
修正文档中的状态流转图，明确区分：
- `in_transit` (在途): 中转港已到 + 已出运
- `shipped` (已出运): 仅海运记录，无港口 ATA

---

### 问题 3: WMS 确认条件不完整

**位置**: `01-物流状态机完整指南.md` 第 78-87 行

**文档描述**:
```typescript
// 优先级 2: 仓库卸柜（WMS 已确认）
if (isWmsConfirmed(warehouseOperation)) {
  return {
    status: 'unloaded',
    triggerFields: {
      wmsStatus: warehouseOperation?.wmsStatus,
      wmsConfirmDate: warehouseOperation?.wmsConfirmDate,
    },
    reason: '仓库已卸柜（WMS 确认）',
  }
}
```

**代码实际逻辑** (`logisticsStatusMachine.ts:265-276`):
```typescript
const isWmsConfirmed = (warehouseOperation?: WarehouseOperation): boolean => {
  if (!warehouseOperation) return false;

  // 满足任一条件即可
  return (
    warehouseOperation.wmsStatus === 'WMS 已完成' ||
    warehouseOperation.ebsStatus === '已入库' ||
    warehouseOperation.wmsConfirmDate !== null
  );
};
```

**不一致点**:
- 文档中的 `triggerFields` 只列出了 `wmsStatus` 和 `wmsConfirmDate`
- 实际代码中 `isWmsConfirmed` 判断包含 **3 个条件**：
  1. `wmsStatus === 'WMS 已完成'`
  2. `ebsStatus === '已入库'`
  3. `wmsConfirmDate !== null`
- 缺少 `ebsStatus` 字段的说明

**影响**: 开发者可能不知道 EBS 入库状态也能触发卸柜状态

**建议修复**:
补充完整的触发条件说明：
```typescript
triggerFields: {
  wmsStatus: warehouseOperation?.wmsStatus,      // WMS 状态
  ebsStatus: warehouseOperation?.ebsStatus,      // EBS 入库状态
  wmsConfirmDate: warehouseOperation?.wmsConfirmDate  // WMS 确认日期
}
```

---

## 其他观察

### 观察 1: 前端文档与后端代码的一致性

**检查项**: 前端 `logisticsStatusMachine.ts` 是否与后端一致

**结果**: ✅ **完全一致**

前端版本 (`frontend/src/utils/logisticsStatusMachine.ts`) 与后端版本的状态枚举、优先级逻辑、映射关系完全一致，符合 SKILL 规范要求。

---

### 观察 2: 滞港费服务中的状态机使用

**检查项**: `demurrage.service.ts` 中状态机的使用

**结果**: ✅ **正确使用**

代码位置：`backend/src/services/demurrage.service.ts:506-546`

```typescript
private async getLogisticsStatusSnapshot(
  containerNumber: string
): Promise<LogisticsStatusResult | null> {
  // ... 获取相关数据
  return calculateLogisticsStatus(
    container,
    portOperations,
    seaFreight,
    truckingTransport,
    warehouseOperation,
    emptyReturn
  );
}
```

滞港费计算服务正确调用了 `calculateLogisticsStatus` 函数，确保了状态判断的一致性。

---

## 修复建议

### 高优先级（立即修复）

1. **补充 `shipped` 状态说明**
   - 文件：`01-物流状态机完整指南.md`
   - 位置：1.1 节状态定义表格
   - 修改：增加一行说明 `shipped` 状态的业务含义

2. **修正优先级顺序描述**
   - 文件：`01-物流状态机完整指南.md`
   - 位置：2.1 节优先级说明
   - 修改：明确各优先级返回的具体状态（`in_transit` vs `shipped`）

### 中优先级（本周内修复）

3. **完善 WMS 确认条件**
   - 文件：`01-物流状态机完整指南.md`
   - 位置：优先级 2 的代码示例
   - 修改：补充 `ebsStatus` 字段及其作用说明

### 低优先级（持续改进）

4. **增加状态流转示意图**
   - 建议使用 Mermaid 绘制完整状态流转图
   - 标注每个状态的触发条件和优先级

5. **添加常见场景案例**
   - 例如：如何从 `in_transit` 跳转到 `at_port`
   - 例如：为什么有些货柜会跳过 `shipped` 直接进入 `in_transit`

---

## 验证方法

### 验证步骤

1. **阅读修复后的文档**
   - 确认状态流转逻辑清晰
   - 确认优先级顺序正确

2. **对照代码验证**
   - 打开 `backend/src/utils/logisticsStatusMachine.ts`
   - 逐行对比文档中的代码示例

3. **实际测试**
   ```bash
   # 运行状态机单元测试
   cd backend
   npm run test -- logisticsStatusMachine.spec.ts
   ```

### 验收标准

- [ ] 文档中所有状态定义与代码枚举一致
- [ ] 文档中优先级顺序与代码 if-else 顺序一致
- [ ] 文档中 triggerFields 包含所有触发字段
- [ ] 文档中 reason 说明与实际返回值一致
- [ ] 新增的 `shipped` 状态说明准确无误

---

## 总结

### 发现成果

- ✅ 识别出 3 个文档与代码不一致点
- ✅ 提供了详细的修复建议和代码位置
- ✅ 验证了前端实现与后端逻辑的一致性
- ✅ 确认了滞港费等关键服务正确使用状态机

### 改进价值

通过本次检查，可以：
1. 避免开发者因文档误导而产生理解偏差
2. 提高问题排查效率（文档即真相）
3. 减少前后端沟通成本（统一语言）
4. 符合 SKILL 规范的"真实第一"原则

---

**下一步行动**:

1. 立即修复高优先级问题（15 分钟）
2. 本周内完成中优先级问题（30 分钟）
3. 将文档检查纳入 PR Review 流程（长期）

---

**报告版本**: v1.0  
**创建时间**: 2026-04-04  
**作者**: 刘志高（AI 智能体辅助）  
**状态**: 待修复
