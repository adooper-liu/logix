# 滞港费架构文档修订记录

## 修订概述

**原文档**: `frontend/public/docs/demurrage/DEMURRAGE_SYSTEM_ARCHITECTURE.md`  
**修订日期**: 2026-04-02  
**修订原因**: 评审发现文档与代码存在多处不一致，需修正以避免误导排障与二次开发

---

## 已完成的修订清单

### 1. 架构图 API 方法修正 (§2)

**问题**:

- 图中写 `GET /batch-write-back`，实际为 `POST`
- 遗漏 `POST /standards`、`POST /batch-compute-records`

**修订**:

```diff
│  DemurrageController           # 控制器（路由入口）           │
│  ├─ GET /calculate/:containerNumber                        │
│  ├─ GET /standards                                         │
+│  ├─ POST /standards                                        │
│  ├─ POST /batch-write-back                                 │
+│  ├─ POST /write-back/:containerNumber                      │
+│  ├─ POST /batch-compute-records                            │
│  └─ GET /diagnose/:containerNumber                         │
```

**依据**: `backend/src/routes/demurrage.routes.ts`

---

### 2. 数据源层补充 ext_demurrage_records (§2, §3)

**问题**: 未提及预计算记录表，易误解为汇总始终实时全量计算

**修订**:

```diff
│  ext_demurrage_standards       # 收费标准表                  │
+│  ext_demurrage_records         # 预计算记录表（汇总/统计用） │
│  biz_containers                # 货柜主表                    │
```

**说明**:

- `summary`、`top-containers`、`batch-compute-records` 接口与该表关系密切
- 汇总类接口优先读预计算记录，无记录时再实时计算

---

### 3. 实际提柜日字段修正 (§5.2)

**问题**: 表中写实际提柜依赖 `process_port_operations.pickup_date`

**真相**:

- PortOperation 实体中没有 `pickup_date` 字段
- 实际提柜统一来自 `process_trucking_transport.pickup_date`

**修订**:

```diff
| **滞港费** | actual | ATA 或卸船日 | 实际提柜日或今天 | `process_port_operations.pickup_date` |
```

改为：

```diff
+| **滞港费** | actual | ATA 或卸船日 | 实际提柜日或今天 | `process_trucking_transport.pickup_date` |
```

**依据**: `demurrage.service.ts` 中 `endDateSource` 为 `'process_trucking_transport.pickup_date'`

---

### 4. getContainerMatchParams 可见性说明 (§3.2, §4)

**问题**: 文档多处将其描述为对外可调用的步骤入口

**真相**:

- 该方法是 `private async getContainerMatchParams`
- 仅服务内部使用，不对外暴露

**修订**:

```diff
-**DemurrageService.getContainerMatchParams()** 方法负责从数据库提取计算所需的所有日期和维度信息：
+**DemurrageService.getContainerMatchParams()** 方法负责从数据库提取计算所需的所有日期和维度信息（服务内部方法，不对外暴露）：
```

---

### 5. freePeriodUsesWorkingDays 字符串匹配规则 (§7.1.3)

**问题**: 文档示例使用带空格的 `'工作 + 自然'`

**实现**:

```typescript
function freePeriodUsesWorkingDays(basis: string | null | undefined): boolean {
  const b = (basis ?? '').toLowerCase()
  return (
    b.includes('工作 + 自然') || // 注意：加号两侧无空格
    b.includes('natural+working') ||
    b === '工作日' ||
    b === 'working'
  )
}
```

**修订**:

- 在代码注释中明确标注「注意：加号两侧无空格」
- 补充 `chargePeriodUsesWorkingDays` 函数实现
- 添加重要注意事项：
  - 数据库中 `free_days_basis` 字段的值**不应在加号两侧添加空格**
  - 若录入为 `'工作 + 自然'`（带空格），将无法匹配，导致按自然日计算
  - 建议在数据导入时做校验，或在 UI 层限制输入格式

---

### 6. 阶梯示例计算错误修正 (§5.3)

**问题**: §5.3 写总费用 $1050，且「第 15–21 天：7 天×$100」——在截止日为 3/22 时，3/22 仍属计费日，应再计 1 天×$100

**真相**:

- 附录 A 的 $1150 与按 15 个计费日、阶梯 8–14 / 15+ 的拆分一致
- §5.3 示例算错

**修订**:

- 在§5.3 末尾添加注释：「注意：若截止日为 3/22，则 3/22 仍属计费日，应再计 1 天×$100，总计$1150。详见附录 A 的正确示例。」
- 保留§5.3 的计算步骤演示，但注明以附录 A 为准

**状态**: 已在§5.3 补充说明

---

### 7. lastPickupDate 的含义收紧 (§3.2)

**问题**: 文档写「最晚提柜日 (DB)」，易误解为直接来自数据库

**实现**:

- 该字段仅在 `process_port_operations.last_free_date` 且 `last_free_date_source === 'manual'` 时才有值
- 非手工时多为 null，计算用 LFD 来自后续 `lastPickupDateComputed` 等逻辑

**修订**:

```diff
-    lastPickupDate: Date | null;           // 最晚提柜日 (DB)
+    lastPickupDate: Date | null;           // 最晚提柜日（仅在 last_free_date_source='manual' 时有值）
```

---

### 8. plannedPickupDate 数据来源修正 (§3.2)

**问题**:

- `getContainerMatchParams` 内 JSDoc（约 605–606 行）写来自 `last_pickup_date`
- 实际读取的是 `planned_pickup_date`（724–728 行）
- 796–797 行注释也写成了 `last_pickup_date`，与代码不一致

**修订**:

```diff
-    plannedPickupDate: Date | null;        // 计划提柜日
+    plannedPickupDate: Date | null;        // 计划提柜日（来自 planned_pickup_date）
```

**备注**: 代码注释错误需在 `demurrage.service.ts` 中同步修正（第 605、797 行）

---

### 9. startDateSource 枚举补充 (§3.2)

**问题**: 文档列举 `'discharged_time'`，实现里更多出现 `dest_port_unload_date / discharged_time` 组合，且存在 `'process_sea_freight.eta'` 等分支

**修订**:

```diff
| `process_port_operations` | 港口操作记录 | `ata` (实际到港), `eta` (预计到港), `revised_eta` (修正 ETA), `dest_port_unload_date` (卸船日), `discharged_time` (卸船时间), `last_free_date` (最晚提柜日) |
```

**建议**: 在文档中添加「具体枚举值以代码/响应字段为准」

---

### 10. 前端写回 API 位置说明 (§6.2)

**问题**: 文档§6.2 把写回放在 `demurrageService` 下

**实现**:

- `frontend/src/services/demurrage.ts` 未封装 `batch-write-back` / `write-back/:containerNumber`
- 这两类调用在 `frontend/src/services/container.ts`

**修订**:

```diff
#### `demurrageService` - 滞港费 API 服务

**位置**：`frontend/src/services/demurrage.ts`

**主要方法**：

**注意**：写回类 API（`batch-write-back`、`write-back/:containerNumber`）未在 `demurrageService` 中封装，而是在 `frontend/src/services/container.ts` 中实现。
```

---

### 11. API 表补充 POST /batch-compute-records (§8.2)

**修订**:

```diff
| 方法 | 路径 | 说明 | 超时 |
|------|------|------|------|
| GET | `/api/v1/demurrage/calculate/:containerNumber` | 单柜计算 | 默认 |
| GET | `/api/v1/demurrage/standards` | 获取收费标准列表 | 默认 |
+| POST | `/api/v1/demurrage/standards` | 创建收费标准 | 默认 |
| GET | `/api/v1/demurrage/summary` | 汇总统计 | 90s |
| GET | `/api/v1/demurrage/top-containers` | 高费用货柜 Top N | 90s |
| GET | `/api/v1/demurrage/diagnose/:containerNumber` | 诊断匹配失败 | 默认 |
| POST | `/api/v1/demurrage/batch-write-back` | 批量写回免费日期 | 90s |
| POST | `/api/v1/demurrage/write-back/:containerNumber` | 单条写回免费日期 | 默认 |
+| POST | `/api/v1/demurrage/batch-compute-records` | 批量预计算并写入记录表 | 90s |
```

---

### 12. 核心文件路径补充 (§8.1)

**修订**:

```diff
| 文件 | 路径 | 用途 |
|------|------|------|
| **后端核心服务** | `backend/src/services/demurrage.service.ts` | 主计算逻辑 |
| **后端控制器** | `backend/src/controllers/demurrage.controller.ts` | API 入口 |
| **后端路由** | `backend/src/routes/demurrage.routes.ts` | 路由定义 |
| **前端服务** | `frontend/src/services/demurrage.ts` | API 调用封装（读） |
+| **前端服务** | `frontend/src/services/container.ts` | 写回 API 调用 |
| **前端主导组件** | `frontend/src/components/demurrage/DemurrageDetailSection.vue` | 详情页展示 |
| **前端计算面板** | `frontend/src/components/demurrage/DemurrageCalculationPanel.vue` | 结果可视化 |
| **前端可复用组件** | `frontend/src/components/demurrage/DemurrageCalculator.vue` | 轻量计算器 |
| **前端组合式** | `frontend/src/composables/useDemurrageCalculation.ts` | 前端计算逻辑 |
| **实体定义** | `backend/src/entities/ExtDemurrageStandard.ts` | 收费标准实体 |
+| **实体定义** | `backend/src/entities/ExtDemurrageRecord.ts` | 预计算记录实体 |
| **工具函数** | `backend/src/utils/demurrageTiers.ts` | 阶梯费率处理 |
```

---

### 13. DemurrageCalculationResponse 类型补全 (§6.3)

**问题**: 文档中的类型定义是简化版，实际还有更多字段

**修订**:

```diff
interface DemurrageCalculationResponse {
  success: boolean
  data?: { ... }
  reason?: 'no_arrival_at_dest' | 'missing_dates' | 'no_matching_standards' | 'missing_pickup_date_actual' | ...
+  keyTimeline?: KeyTimelineResult
+  logisticsStatusSnapshot?: LogisticsStatusResult
+  dateOrderWarnings?: Array<{ code: string; message: string }>
+  skippedItems?: DemurrageSkippedItem[]
}
```

---

### 14. 调试日志级别修正 (§7.4.1)

**问题**: 文档写 `logger.debug`，代码中阶梯相关多为 `logger.info`

**修订**:

```diff
-logger.debug('[Demurrage] Charge days calculation:', {
+logger.info('[Demurrage] Tier calculation:', {
   lastFreeDate,
   endDate,
   freeDaysBasis,
   chargeStart,
   chargeDays,
   isWorkingDaysOnly
 });
```

---

## 待处理的代码修正

### 1. demurrage.service.ts 注释错误

**位置**: 第 605、797 行

**问题**: JSDoc 注释写 `plannedPickupDate` 来自 `last_pickup_date`，实际读取的是 `planned_pickup_date`

**建议修正**:

```diff
-/** 计划提柜日（从 process_trucking_transport.last_pickup_date 读取，用于预测模式前置条件） */
+/** 计划提柜日（从 process_trucking_transport.planned_pickup_date 读取，用于预测模式） */
```

```diff
-plannedPickupDate, // 计划提柜日（从 process_trucking_transport.last_pickup_date）
+plannedPickupDate, // 计划提柜日（从 process_trucking_transport.planned_pickup_date）
```

---

## 与代码一致且保留的要点

以下要点经核实与代码一致，无需修改：

- ✅ 核心文件路径：`demurrage.service.ts`、`demurrage.controller.ts`、`demurrage.routes.ts`、前端组件路径等
- ✅ `is_chargeable = 'N'` 表示参与计费，`'Y'` 表示不收费
- ✅ `freePeriodUsesWorkingDays` / `chargePeriodUsesWorkingDays` 分工与伪代码一致
- ✅ `DemurrageSummarySection.vue` 存在于 `frontend/src/components/demurrage/`
- ✅ `calculateSingleDemurrage` 行号仍在 307 附近
- ✅ 附录 A 测试用例数值正确（$1150）

---

## 修订影响评估

### 对现有功能的影响

本次修订**仅修改文档**，不涉及业务代码变更，不影响现有功能。

### 对开发者的影响

- ✅ 更准确的 API 方法和路径指引
- ✅ 更清晰的数据源和字段映射
- ✅ 避免字符串匹配的坑（加号空格问题）
- ✅ 更完整的类型定义参考

### 对排查问题的帮助

- ✅ 快速定位写回 API 的实际位置（container.ts）
- ✅ 明确 `lastPickupDate` 的来源限制（manual 模式）
- ✅ 了解预计算记录的作用（优化汇总查询性能）

---

## 下一步行动

### 已完成

- [x] 修正架构图 API 方法
- [x] 补充数据源层说明
- [x] 修正实际提柜日字段
- [x] 明确 `getContainerMatchParams` 可见性
- [x] 补充工作日/自然日匹配细节
- [x] 修正阶梯示例说明
- [x] 收紧 `lastPickupDate` 含义
- [x] 修正 `plannedPickupDate` 数据来源说明
- [x] 补充卸船日枚举值
- [x] 明确写回 API 位置
- [x] 补充 API 表
- [x] 更新核心文件路径
- [x] 补全类型定义
- [x] 修正日志级别

### 待完成

- [ ] 修正 `demurrage.service.ts` 第 605、797 行的注释错误
- [ ] 在数据导入 UI 层添加 `free_days_basis` 空格校验
- [ ] 考虑在文档中添加「具体枚举值以代码为准」的通用声明

---

**文档版本**: v1.1  
**修订时间**: 2026-04-02  
**修订者**: 刘志高  
**状态**: 大部分修订已完成，待代码注释修正
