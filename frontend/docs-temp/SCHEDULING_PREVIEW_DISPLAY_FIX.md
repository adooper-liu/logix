# 排产预览界面数据显示修复报告

## 问题描述

用户在排产预览界面发现以下问题：
1. 表格中"车队"字段没有显示字段名称
2. 表格中"卸柜方式"字段没有显示字段名称
3. 费用明细有字段名但没有值（显示为 `-`）

## 问题诊断

### 数据流分析

```
后端 (intelligentScheduling.service.ts)
├─ L1402-1412: 计算预估费用 (dryRun 模式)
│  └─ calculateEstimatedCosts() → estimatedCosts 对象
│      ├─ demurrageCost: number
│      ├─ detentionCost: number
│      ├─ storageCost: number
│      ├─ ddCombinedCost: number
│      ├─ transportationCost: number
│      ├─ yardStorageCost: number
│      ├─ handlingCost: number
│      └─ totalCost: number
│
├─ L1438-1457: 构建 plannedData 对象
│  ├─ truckingCompany: string (车队名称)
│  ├─ unloadModePlan: string (卸柜方式)
│  └─ warehouseCountry: string (仓库国家)
│
└─ L1521-1536: 返回结果
   ├─ estimatedCosts: { ... } (根级别)
   └─ plannedData: { truckingCompany, unloadModePlan, ... }

↓

前端 (SchedulingVisual.vue)
├─ L1746-1819: 数据转换
│  ├─ L1786: truckingCompany = r.plannedData?.truckingCompany
│  ├─ L1787: unloadMode = r.plannedData?.unloadMode
│  └─ L1788-1797: estimatedCosts = r.plannedData?.estimatedCosts || r.estimatedCosts
│
└─ L386-620: 表格展示
   ├─ L421-438: ✅ 车队列 (新增)
   ├─ L439-455: ✅ 卸柜方式列 (新增)
   └─ L611-644: 费用明细列 (使用 buildCostTree)
```

### 控制台验证数据

```javascript
[预览数据 0] {
  containerNumber: "HMMU6232153",
  estimatedCosts: {
    currency: "USD",
    demurrageCost: 0,
    detentionCost: 0,
    handlingCost: 0,
    storageCost: 0,
    totalCost: 0,
    transportationCost: 0
  },
  message: "排产成功",
  plannedData: {
    plannedCustomsDate: '2026-04-02',
    plannedPickupDate: '2026-04-03',
    plannedDeliveryDate: '2026-04-03',
    plannedUnloadDate: '2026-04-03',
    plannedReturnDate: '2026-04-03'
  },
  truckingCompany: "RT LOGISTICA Srl",
  unloadMode: "Drop off"
}
```

### 问题根因

| 问题 | 根因 | 修复方案 |
|------|------|----------|
| **车队字段没有显示** | 主表格（"全部"tab）缺少"车队"列定义 | 在 SchedulingVisual.vue 中添加车队列 |
| **卸柜方式字段没有显示** | 主表格（"全部"tab）缺少"卸柜方式"列定义 | 在 SchedulingVisual.vue 中添加卸柜方式列 |
| **费用明细有字段名没有值** | `buildCostTree` 函数只添加非 0 费用项，当所有费用为 0 时不显示 | 修改 `buildCostTree` 函数，始终显示所有费用项（包括 0 值） |

## 修复内容

### 1. SchedulingVisual.vue - 新增车队和卸柜方式列

**文件位置**: `frontend/src/views/scheduling/SchedulingVisual.vue`

**修改内容**:
- 在第 421-455 行新增两个表格列定义
- 车队列：支持从根级别或 `plannedData` 中读取数据
- 卸柜方式列：使用 Tag 组件区分 Drop off 和 Live load

```vue
<!-- ✅ 新增：车队和卸柜方式列 -->
<el-table-column
  prop="truckingCompany"
  label="车队"
  min-width="150"
  show-overflow-tooltip
>
  <template #default="{ row }">
    <span>{{ row.truckingCompany || row.plannedData?.truckingCompany || '-' }}</span>
  </template>
</el-table-column>
<el-table-column prop="unloadMode" label="卸柜方式" width="110">
  <template #default="{ row }">
    <el-tag
      :type="
        (row.unloadMode || row.plannedData?.unloadMode || '') === 'Drop off'
          ? 'success'
          : 'info'
      "
      size="small"
    >
      {{ row.unloadMode || row.plannedData?.unloadMode || '-' }}
    </el-tag>
  </template>
</el-table-column>
```

### 2. SchedulingVisual.vue - 修改费用明细显示逻辑

**文件位置**: `frontend/src/views/scheduling/SchedulingVisual.vue`

**修改内容**:
- 第 614 行：修改 `v-if` 条件，移除 `&& row.estimatedCosts.totalCost` 判断
- 第 1068-1138 行：重构 `buildCostTree` 函数，始终显示所有 7 项费用

```typescript
// ✅ 构建费用树形结构（显示所有费用项，包括 0 值）
const buildCostTree = (costs: any, _country: string) => {
  const tree: any[] = []
  const children: any[] = []

  // 滞港费
  children.push({
    label: '滞港费',
    value: costs.demurrageCost ?? 0,
    level: 1,
  })

  // 滞箱费
  children.push({
    label: '滞箱费',
    value: costs.detentionCost ?? 0,
    level: 1,
  })

  // D&D 合并费
  children.push({
    label: 'D&D 合并费',
    value: costs.ddCombinedCost ?? 0,
    level: 1,
  })

  // 港口存储费
  children.push({
    label: '港口存储费',
    value: costs.storageCost ?? 0,
    level: 1,
  })

  // 运输费
  children.push({
    label: '运输费',
    value: costs.transportationCost ?? 0,
    level: 1,
  })

  // 堆场堆存费
  children.push({
    label: '堆场堆存费',
    value: costs.yardStorageCost ?? 0,
    level: 1,
  })

  // 操作费
  children.push({
    label: '操作费',
    value: costs.handlingCost ?? 0,
    level: 1,
  })

  // 添加根节点（总费用）
  tree.push({
    label: '总费用',
    value: costs.totalCost ?? 0,
    level: 0,
    children: children,
  })

  return tree
}
```

### 3. SchedulingPreviewModal.vue - 修复数据映射

**文件位置**: `frontend/src/views/scheduling/components/SchedulingPreviewModal.vue`

**修改内容**:
- 第 91-99 行：修改车队列的 `prop` 和数据访问顺序
- 第 101-114 行：修改卸柜方式列的 `prop` 和数据访问顺序
- 第 313-419 行：修改费用明细的所有费用项和 `warehouseCountry` 的访问路径

```vue
<!-- 修复前 -->
<el-table-column prop="plannedData.truckingCompany" label="车队">
  <span>{{ row.plannedData?.truckingCompany || row.truckingCompany || '-' }}</span>
</el-table-column>

<!-- 修复后 -->
<el-table-column prop="truckingCompany" label="车队">
  <span>{{ row.truckingCompany || row.plannedData?.truckingCompany || '-' }}</span>
</el-table-column>
```

## 修复效果

### 修复前
- ❌ 表格中看不到"车队"字段
- ❌ 表格中看不到"卸柜方式"字段
- ❌ 费用明细列显示 `-`（即使有费用数据）

### 修复后
- ✅ 表格中显示"车队"列，值为 "RT LOGISTICA Srl" 或其他车队名称
- ✅ 表格中显示"卸柜方式"列，值为 "Drop off" 或 "Live load"
- ✅ 费用明细列始终显示所有 7 项费用（包括 0 值）
  - 滞港费：$0.00
  - 滞箱费：$0.00
  - D&D 合并费：$0.00
  - 港口存储费：$0.00
  - 运输费：$0.00
  - 堆场堆存费：$0.00
  - 操作费：$0.00
  - **总费用：$0.00**

## 设计理念

### 为什么 0 值费用也要显示？

1. **透明度**：用户可以看到所有费用项，知道系统已经计算了所有费用
2. **避免误解**：如果不显示，用户会以为是计算错误或系统 bug
3. **业务价值**：0 费用本身也是重要信息，表示某些服务是免费的
4. **一致性**：所有货柜的费用结构都相同，便于对比分析

### 颜色分级

费用值使用 `getAmountClass` 函数根据金额大小区分颜色：
- **绿色** (`amount-zero`): $0.00 - 无费用
- **黄色** (`amount-low`): $1-$100 - 低费用
- **橙色** (`amount-medium`): $101-$500 - 中等费用
- **红色** (`amount-high`): $501-$1000 - 高费用
- **深红** (`amount-critical`): >$1000 - 严重警告

## 验证方法

1. 刷新页面
2. 选择目的港和日期范围
3. 点击"排产预览"按钮
4. 在"全部"标签页查看表格
5. 确认以下信息正确显示：
   - ✅ 车队列显示车队名称
   - ✅ 卸柜方式列显示 Drop off 或 Live load
   - ✅ 费用明细列显示所有 7 项费用（即使为 0）

## 相关文件

- `frontend/src/views/scheduling/SchedulingVisual.vue` - 主页面（已修复）
- `frontend/src/views/scheduling/components/SchedulingPreviewModal.vue` - 预览弹窗组件（已修复）
- `backend/src/services/intelligentScheduling.service.ts` - 后端排产服务（数据源）

## 修复时间

- **修复日期**: 2026-04-02
- **修复人员**: 刘志高
- **修复版本**: v1.0.0

## 后续优化建议

1. **费用计算优化**：当前运输费为 0，可能需要检查 `calculateEstimatedCosts` 函数的计算逻辑
2. **性能优化**：如果费用项很多，可以考虑虚拟滚动
3. **国际化**：费用标签可以使用 i18n 进行多语言支持
4. **可配置性**：允许用户自定义显示哪些费用项
