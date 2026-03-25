# 排产预览费用显示功能实施记录

## 实施时间

2026-03-21

## 需求描述

在智能排产预览弹窗中增加各项费用值显示，包括：

- 滞港费（Demurrage）
- 滞箱费（Detention）
- 仓储费（Storage）
- 运输费（Transportation）
- 总费用（Total Cost）

## 实施方案

### 1. 后端改造

#### 文件：`backend/src/services/intelligentScheduling.service.ts`

**修改位置 1**: Line 430-439 - 在 `plannedData` 中添加费用信息

```typescript
const plannedData = {
  // ... 其他字段
  // 费用信息（dryRun 模式下计算但不保存）
  estimatedCosts: _request.dryRun ? await this.calculateEstimatedCosts(container.containerNumber, plannedPickupDate, unloadDate, plannedReturnDate, unloadMode, warehouse, truckingCompany) : undefined,
};
```

**修改位置 2**: Line 1104-1209 - 新增 `calculateEstimatedCosts` 方法

该方法包含完整的费用计算逻辑：

1. **滞港费计算**：基于 ETA 和免费期限
2. **滞箱费计算**：基于卸货日和还箱日
3. **仓储费计算**：基于堆存天数和费率
4. **运输费计算**：基于距离估算
5. **总费用汇总**

**修改位置 3**: Line 1214-1254 - 新增 `calculateTransportationCost` 辅助方法

基于港口到仓库的距离计算运输费用。

---

### 2. 前端改造

#### 文件：`frontend/src/views/scheduling/components/SchedulingPreviewModal.vue`

**修改位置 1**: Line 11-27 - 概览信息增加"预估总费用"

```vue
<el-descriptions :column="5" border>
  <!-- ... 其他统计项 -->
  <el-descriptions-item label="预估总费用">
    <el-tag type="warning">${{ totalEstimatedCost.toLocaleString() }}</el-tag>
  </el-descriptions-item>
</el-descriptions>
```

**修改位置 2**: Line 54-94 - 表格增加费用列

```vue
<!-- 预估费用列 -->
<el-table-column prop="estimatedCosts.totalCost" label="预估费用" width="100" align="right">
  <template #default="{ row }">
    <span v-if="row.estimatedCosts?.totalCost" style="color: #E6A23C; font-weight: bold;">
      ${{ row.estimatedCosts.totalCost.toLocaleString() }}
    </span>
    <span v-else>-</span>
  </template>
</el-table-column>

<!-- 费用明细列（Popover） -->
<el-table-column label="费用明细" width="120" align="center">
  <template #default="{ row }">
    <el-popover
      v-if="row.estimatedCosts"
      placement="left"
      :width="200"
      trigger="hover"
    >
      <div style="font-size: 12px;">
        <p v-if="row.estimatedCosts.demurrageCost">
          滞港费：${{ row.estimatedCosts.demurrageCost.toLocaleString() }}
        </p>
        <p v-if="row.estimatedCosts.detentionCost">
          滞箱费：${{ row.estimatedCosts.detentionCost.toLocaleString() }}
        </p>
        <p v-if="row.estimatedCosts.storageCost">
          仓储费：${{ row.estimatedCosts.storageCost.toLocaleString() }}
        </p>
        <p v-if="row.estimatedCosts.transportationCost">
          运输费：${{ row.estimatedCosts.transportationCost.toLocaleString() }}
        </p>
        <el-divider />
        <p style="font-weight: bold; color: #E6A23C;">
          合计：${{ row.estimatedCosts.totalCost?.toLocaleString() }}
        </p>
      </div>
      <template #reference>
        <el-icon style="cursor: pointer; color: #409EFF;"><QuestionFilled /></el-icon>
      </template>
    </el-popover>
  </template>
</el-table-column>
```

**修改位置 3**: Line 121 - 导入 QuestionFilled 图标

```typescript
import { CircleCheck, CircleClose, QuestionFilled } from "@element-plus/icons-vue";
```

**修改位置 4**: Line 139-146 - 接口定义增加费用字段

```typescript
interface PreviewResult {
  // ... 其他字段
  estimatedCosts?: {
    demurrageCost?: number;
    detentionCost?: number;
    storageCost?: number;
    transportationCost?: number;
    totalCost?: number;
    currency?: string;
  };
}
```

**修改位置 5**: Line 175-180 - 新增总费用计算

```typescript
const totalEstimatedCost = computed(() => {
  return props.previewResults.filter((r) => r.success && r.estimatedCosts?.totalCost).reduce((sum, r) => sum + (r.estimatedCosts?.totalCost || 0), 0);
});
```

**修改位置 6**: Line 35 - 修复事件命名

```vue
<el-link type="primary" @click="$emit('viewContainer', row.containerNumber)">
```

---

#### 文件：`frontend/src/views/scheduling/SchedulingVisual.vue`

**修改位置**: Line 756 - 数据映射增加费用字段

```typescript
previewResults.value = result.results.map((r: any) => ({
  ...r,
  // ... 其他字段
  estimatedCosts: r.plannedData?.estimatedCosts || undefined,
}));
```

---

## 技术要点

### 1. 费用计算架构

- **dryRun 模式专用**：只在预览时计算费用，正式保存时不计算（节省性能）
- **独立计算方法**：`calculateEstimatedCosts()` 封装完整计算逻辑
- **错误处理**：每个费用项都有独立的 try-catch，单项失败不影响整体

### 2. 前端展示设计

- **分层展示**：
  - 第一层：概览区显示总费用
  - 第二层：表格列显示单个费用
  - 第三层：Popover 显示明细（hover 触发）
- **视觉设计**：
  - 总费用使用 warning 类型 tag 突出显示
  - 单条费用使用橙色加粗字体
  - Popover 使用分隔线区分总计

### 3. 性能优化

- **条件计算**：只在 dryRun=true 时计算费用
- **缓存友好**：费用计算依赖基础数据，无额外数据库查询
- **前端聚合**：使用 computed 自动聚合总费用

---

## 验证步骤

1. **后端验证**

   ```bash
   cd backend
   npm run dev
   ```

   测试预览接口，检查返回的 `estimatedCosts` 字段

2. **前端验证**

   ```bash
   cd frontend
   npm run dev
   ```

   - 打开排产可视化页面
   - 点击"预览排产"按钮
   - 查看弹窗中的费用显示

3. **数据验证**
   - 检查各项费用是否合理
   - 验证总费用计算是否正确
   - 测试 hover Popover 是否正常显示

---

## 代码统计

| 文件                             | 新增行数 | 修改行数 |
| -------------------------------- | -------- | -------- |
| intelligentScheduling.service.ts | ~120     | 10       |
| SchedulingPreviewModal.vue       | 50       | 10       |
| SchedulingVisual.vue             | 1        | 1        |
| **合计**                         | **~171** | **21**   |

---

## 注意事项

1. **费用计算准确性**
   - 当前使用示例数据（如距离矩阵、费率等）
   - 生产环境需从数据库读取真实配置

2. **性能考虑**
   - 大批量预览时（>100 柜），费用计算可能影响响应时间
   - 建议后续考虑缓存机制（TTL=5 分钟）

3. **用户体验**
   - Popover 宽度固定为 200px，可能在某些情况下不够
   - 建议根据实际内容动态调整宽度

4. **国际化**
   - 当前硬编码中文标签
   - 后续应使用 i18n 方案

---

## 数据源说明

### 已实现：从数据库读取真实配置 ✅

1. **滞港费（Demurrage Cost）**
   - 数据源：`dict_demurrage_standards`
   - 字段：`free_days`, `rate_per_day`, `tiers`
   - 服务：`demurrageService.predictDemurrageForUnloadDate()`

2. **滞箱费（Detention Cost）**
   - 数据源：`dict_demurrage_standards`
   - 字段：`free_days`, `rate_per_day`, `tiers`
   - 服务：`demurrageService.predictDetentionForReturnDate()`

3. **仓储费（Storage Cost）**
   - 数据源：`dict_trucking_port_mapping`
   - 字段：`standard_rate`（日费率）, `yard_operation_fee`（操作费）
   - 计算：堆存天数 × 日费率 + 操作费

4. **运输费（Transportation Cost）**
   - 数据源：`dict_trucking_port_mapping`
   - 字段：`transport_fee`（单次运输费用）
   - 逻辑：
     - 通过 `warehouse_trucking_mapping` 获取仓库关联的车队
     - 通过 `trucking_port_mapping` 获取该车队到港口的运输费用
     - Drop off 模式费用翻倍（往返两次运输）

5. **默认值处理**
   - 当数据库无配置时，使用默认值 $100
   - 日志输出警告信息，便于排查

---

## 相关文件

- 后端服务：`backend/src/services/intelligentScheduling.service.ts`
- 前端组件：`frontend/src/views/scheduling/components/SchedulingPreviewModal.vue`
- 主页面：`frontend/src/views/scheduling/SchedulingVisual.vue`

---

## 下一步优化建议

1. **性能优化**
   - 实现费用计算结果缓存（TTL=5 分钟）
   - 批量计算时并行处理

2. **功能增强**
   - 支持费用明细导出
   - 添加费用对比分析（不同方案对比）

3. **用户体验**
   - 支持按费用排序
   - 支持费用筛选（如只显示超过$1000 的）
   - Popover 宽度动态调整

4. **国际化**
   - 使用 i18n 方案替换硬编码中文标签

---

**实施状态**: ✅ 完成
**测试状态**: ⏳ 待验证
