# SchedulingVisual.vue 组件重构建议

## 📊 当前状态

**文件**: `frontend/src/views/scheduling/SchedulingVisual.vue`
**大小**: 108.1KB
**行数**: 3561 行
**问题**: 巨型单体组件，违反 SKILL 原则中的 Single Responsibility（单一职责）

---

## 🔍 识别出的问题模块

### 1. **顶部操作区** (TopActionBar) - ✅ 已部分组件化

**当前代码位置**: 第 3-105 行
**功能**: 
- 日期范围选择
- 目的港过滤
- ETA 顺延设置
- 操作按钮组（预览排产、手工指定、返回、刷新）

**建议**: 已有 `SchedulingFilterBar.vue`，但功能不完整，需要扩展

**重构方案**: 
- 创建 `TopActionBar.vue` 组件
- 将所有过滤条件、按钮组逻辑移入
- 通过 props 传递 `dateRange`、`selectedPortCode`、`etaBufferDays`
- 通过 emits 传递用户操作事件

---

### 2. **统计栏** (StatsBar) - ✅ 已组件化

**当前代码位置**: 第 108-129 行
**功能**: 显示待排产、initial、issued、仓库数量统计

**现状**: 已有 `SchedulingStatsBar.vue` 组件

**建议**: 检查是否完全复用，如未复用需要整合

---

### 3. **执行日志** (ExecutionLogs) - ✅ 已组件化

**当前代码位置**: 第 131-175 行
**功能**: 
- 显示排产执行日志
- 支持折叠/展开
- 支持清空
- 自动滚动到底部

**现状**: 已有 `ExecutionLogs.vue` 组件

**建议**: 检查是否完全复用，如未复用需要整合

---

### 4. **排产结果展示区** (ResultDisplay) - ❌ 未组件化

**当前代码位置**: 第 184-700+ 行（大量代码）
**功能**: 
- 预览模式/正式模式切换
- 结果表格展示
- 费用树形结构展示
- 全选/单选操作
- 确认保存/放弃操作
- 搜索/过滤/分页
- TAB 切换（全部/成功/失败）

**建议**: 
- 创建 `ResultDisplay.vue` 组件
- 拆分为更小的子组件：
  - `ResultTable.vue` - 结果表格
  - `ResultFilters.vue` - 搜索/过滤/分页
  - `ResultActions.vue` - 确认/放弃/导出操作
  - `CostTreeDisplay.vue` - 费用树形展示

---

### 5. **成本优化面板** (CostOptimization) - ✅ 已组件化

**现状**: 已有 `CostOptimizationPanel.vue`、`OptimizationResultCard.vue`

**建议**: 检查是否完全复用

---

### 6. **资源档期检查** (ResourceCapacity) - ❌ 未组件化

**当前代码位置**: 第 1990-2200+ 行
**功能**: 
- 仓库档期 API 调用
- 车队档期 API 调用
- 占用率计算
- 档期状态判断（正常/紧张/超负荷）
- 预加载逻辑

**建议**: 
- 创建 `ResourceCapacityView.vue` 组件
- 已有 `CalendarCapacityView.vue`，但需要检查是否复用
- 将档期检查逻辑封装为 composable：`useResourceCapacity()`

---

### 7. **批量成本优化** (BatchOptimization) - ❌ 未组件化

**当前代码位置**: 第 2200-2400+ 行
**功能**: 
- 批量优化逻辑
- 原计划对比
- 费用涨跌计算
- 优化方案保存

**建议**: 
- 创建 `BatchOptimizationPanel.vue` 组件
- 已有 `CostOptimizationPanel.vue`，需要检查功能覆盖

---

### 8. **执行日志逻辑** (Logics) - ❌ 未组件化

**当前代码位置**: 第 1403-1415 行
**功能**: 
- 日志添加
- 时间格式化
- 自动滚动

**建议**: 
- 封装为 composable：`useExecutionLog()`
- 支持多个组件复用日志逻辑

---

### 9. **排产流程控制** (SchedulingFlow) - ❌ 未组件化

**当前代码位置**: 第 1432-1603 行（handleSchedule）、第 1657-1800+ 行（handlePreviewSchedule）
**功能**: 
- 批量排产逻辑
- 分批处理（每批 3 个）
- 用户确认继续/停止
- 日志记录
- 错误处理

**建议**: 
- 封装为 composable：`useSchedulingFlow()`
- 支持预览模式和正式模式
- 统一处理批量逻辑、日志、错误

---

### 10. **手工指定仓库** (DesignatedWarehouse) - ✅ 已组件化

**现状**: 已有 `DesignatedWarehouseDialog.vue`

**建议**: 检查是否完全复用

---

### 11. **数据导出** (DataExport) - ❌ 未组件化

**当前代码位置**: 第 1173-1399 行
**功能**: 
- 导出 Excel
- 包含费用明细
- 包含筛选条件
- 包含统计信息

**建议**: 
- 封装为 composable：`useDataExport()`
- 支持多种导出格式（Excel、CSV）
- 统一处理导出逻辑

---

### 12. **分页逻辑** (Pagination) - ❌ 未组件化

**当前代码位置**: 第 952-1006 行
**功能**: 
- 当前页码
- 每页大小
- 总页数计算
- 分页数据切片
- 页码改变事件

**建议**: 
- 封装为 composable：`usePagination()`
- 支持任意列表数据的分页

---

## 📦 建议的重构架构

### 组件树结构

```
SchedulingVisual.vue (主容器，协调各组件)
├── TopActionBar.vue (顶部操作区)
│   ├── DateRangePicker (日期选择)
│   ├── PortFilter (目的港过滤)
│   └── ActionButtons (操作按钮组)
├── SchedulingStatsBar.vue (统计栏)
├── ExecutionLogs.vue (执行日志)
├── ResultDisplay.vue (结果展示区) ← 新增
│   ├── ResultFilters.vue (搜索/过滤/TAB)
│   ├── ResultTable.vue (结果表格)
│   │   └── CostTreeDisplay.vue (费用树)
│   └── ResultActions.vue (确认/放弃操作)
├── CostOptimizationPanel.vue (成本优化)
│   └── OptimizationResultCard.vue (优化方案卡片)
├── BatchOptimizationPanel.vue (批量优化) ← 新增
└── DesignatedWarehouseDialog.vue (手工指定仓库)
```

### Composables 列表

```
composables/
├── useSchedulingFlow.ts (排产流程控制)
├── useResourceCapacity.ts (资源档期检查)
├── useDataExport.ts (数据导出)
├── useExecutionLog.ts (执行日志)
├── usePagination.ts (分页)
└── useCostCalculation.ts (费用计算)
```

---

## 🎯 重构优先级

### P0 - 紧急（影响代码可维护性）

1. **排产流程控制** → `useSchedulingFlow.ts`
   - 当前代码重复严重（handleSchedule、handlePreviewSchedule）
   - 逻辑复杂，难以测试

2. **结果展示区** → `ResultDisplay.vue`
   - 代码量过大（500+ 行）
   - 职责不单一

3. **资源档期检查** → `useResourceCapacity.ts` + `ResourceCapacityView.vue`
   - 逻辑复杂，包含 API 调用、计算、缓存
   - 需要独立测试

### P1 - 重要（提升代码质量）

4. **数据导出** → `useDataExport.ts`
   - 工具函数性质，适合复用

5. **分页逻辑** → `usePagination.ts`
   - 通用逻辑，可复用

6. **执行日志** → `useExecutionLog.ts`
   - 工具函数性质

### P2 - 优化（锦上添花）

7. **顶部操作区** → `TopActionBar.vue`
   - 已有部分组件化，但不完整

8. **批量成本优化** → `BatchOptimizationPanel.vue`
   - 功能相对独立

---

## 📋 重构检查清单

### 组件拆分原则

- [ ] **单一职责**: 每个组件只负责一个功能模块
- [ ] **props 向下，emits 向上**: 数据流清晰
- [ ] **逻辑复用**: 提取 composable 函数
- [ ] **可测试性**: 每个组件可独立测试
- [ ] **性能优化**: 避免不必要的重新渲染

### 重构步骤

1. **准备阶段**
   - [ ] 创建新的组件文件
   - [ ] 创建 composable 文件
   - [ ] 确保有完整的测试覆盖

2. **提取逻辑**
   - [ ] 将业务逻辑移至 composable
   - [ ] 保持原有组件功能正常
   - [ ] 逐步替换，不要一次性重构

3. **拆分组件**
   - [ ] 定义清晰的 props 和 emits
   - [ ] 保持组件间松耦合
   - [ ] 使用 TypeScript 确保类型安全

4. **验证测试**
   - [ ] 单元测试通过
   - [ ] 集成测试通过
   - [ ] 手动测试核心功能

---

## 💡 具体重构示例

### 示例 1: 提取 `useSchedulingFlow`

```typescript
// composables/useSchedulingFlow.ts
export function useSchedulingFlow(options: {
  onLog: (message: string, type: string) => void
  onProgress: (progress: number) => void
}) {
  const scheduling = ref(false)
  const BATCH_SIZE = 3
  
  const handleBatchSchedule = async (params: ScheduleParams) => {
    scheduling.value = true
    const allResults = []
    let totalSuccess = 0
    let totalFailed = 0
    
    try {
      // 分批处理逻辑
      while (hasMore) {
        const result = await containerService.batchSchedule({
          ...params,
          limit: BATCH_SIZE,
          skip,
        })
        
        // 处理结果
        result.results.forEach(r => {
          if (r.success) totalSuccess++
          else totalFailed++
          allResults.push(r)
        })
        
        // 用户确认
        if (hasMore && !await confirmContinue()) {
          break
        }
      }
      
      return {
        success: true,
        results: allResults,
        totalSuccess,
        totalFailed,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    } finally {
      scheduling.value = false
    }
  }
  
  return {
    scheduling,
    handleBatchSchedule,
  }
}
```

### 示例 2: 拆分 `ResultDisplay.vue`

```vue
<!-- components/ResultDisplay.vue -->
<template>
  <el-card class="result-display">
    <template #header>
      <div class="card-header-optimized">
        <div class="header-left">
          <span class="header-title">{{ isPreviewMode ? '排产预览' : '排产结果' }}</span>
        </div>
        <div class="header-right">
          <slot name="actions" />
        </div>
      </div>
    </template>
    
    <!-- 统计徽章 -->
    <div class="result-stats-enhanced">
      <slot name="stats" />
    </div>
    
    <!-- 过滤和 TAB -->
    <ResultFilters 
      v-model:search="searchText"
      v-model:tab="resultTab"
      :success-count="successCount"
      :failed-count="failedCount"
    />
    
    <!-- 结果表格 -->
    <ResultTable
      ref="resultTableRef"
      :data="filteredDisplayResults"
      :is-preview="isPreviewMode"
      @selection-change="handleSelectionChange"
    >
      <template #cost="{ row }">
        <CostTreeDisplay :costs="row.estimatedCosts" />
      </template>
    </ResultTable>
    
    <!-- 分页 -->
    <Pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :total="filteredDisplayResults.length"
    />
  </el-card>
</template>

<script setup lang="ts">
// 简化的组件逻辑
</script>
```

---

## ⚠️ 注意事项

1. **不要一次性重构完成**
   - 逐步替换，确保每一步都可回退
   - 先提取逻辑，再拆分组件

2. **保持向后兼容**
   - 新组件和旧代码共存一段时间
   - 确保测试覆盖

3. **文档同步更新**
   - 更新组件文档
   - 记录重构决策

4. **性能监控**
   - 确保重构后性能不下降
   - 监控关键指标

---

## 📈 预期收益

1. **代码可读性提升**: 单个文件从 3561 行降至 500 行以内
2. **可维护性提升**: 职责清晰，易于定位问题
3. **可测试性提升**: 独立组件易于单元测试
4. **代码复用**: composable 可在其他页面复用
5. **团队协作**: 多人可并行开发不同模块

---

## 🎓 SKILL 原则对应

- **S (Single Responsibility)**: 每个组件只负责一个功能
- **K (Keep It Simple)**: 简化逻辑，避免过度设计
- **I (Interface Segregation)**: 清晰的 props/emits 接口
- **L (Loose Coupling)**: 组件间松耦合
- **L (Learnability)**: 易于理解和上手

---

**生成时间**: 2026-03-27
**建议执行优先级**: P0 → P1 → P2
**预计工作量**: 3-5 天（包含测试）
