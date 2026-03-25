# 智能排产确认流程改进方案

**版本**: v2.0 (遵循 SKILL 规范)  
**创建时间**: 2026-03-25  
**优先级**: 高  
**状态**: 待实施

---

## 📋 核心原则（SKILL 规范）

### 1. 简洁即美
- 去除不必要的装饰和复杂格式化
- 直接描述功能和实现
- 保持文档代码清晰实用

### 2. 真实第一
- 所有接口必须实际可执行
- 所有数据基于真实业务场景
- 禁止虚构功能或理想化假设

### 3. 遵循 SKILL
- 数据库优先开发
- 基于权威源验证
- 保持代码分层清晰

### 4. 业务导向
- 围绕真实业务场景
- 解决实际问题
- 避免过度设计

---

## 🎯 问题描述

### 当前实现

批量排产后直接保存至数据库，用户无法在保存前查看和确认结果。

**业务流程**:
```
用户点击"批量排产" → 后端计算并保存 → 返回结果
```

**主要问题**:
1. 无预览环节，用户无法提前查看排产方案
2. 无确认步骤，排产结果直接生效
3. 发现错误后只能手工调整，增加运维成本
4. 无法对比不同方案，难以优化决策

---

## ✨ 目标流程

### 完整确认流程（方案 A）

**业务流程**:
```
1. 用户点击"批量排产"
   ↓
2. 后端预计算（Dry Run），生成预览数据
   ↓
3. 前端展示预览面板（含成本评估、资源占用）
   ↓
4. 用户审查并可调整（改日期、换仓库/车队）
   ↓
5. 用户点击"确认保存"
   ↓
6. 后端正式保存并扣减产能
```

**核心价值**:
- 提供预览环节，降低误操作风险
- 支持人工干预，提高决策质量
- 保留调整空间，增强系统灵活性

---

## 🔧 技术实现

### 后端改造

#### Step 1: 扩展批量排产接口

**文件**: `backend/src/services/intelligentScheduling.service.ts`

**修改点**:
- 新增 `dryRun` 参数支持预览模式
- 拆分计算逻辑与保存逻辑
- 保持事务一致性

```typescript
interface ScheduleRequest {
  country?: string;
  startDate?: string;
  endDate?: string;
  forceSchedule?: boolean;
  containerNumbers?: string[];
  limit?: number;
  skip?: number;
  dryRun?: boolean; // 新增：是否为预览模式
}

async batchSchedule(request: ScheduleRequest): Promise<BatchScheduleResponse> {
  const containers = await this.getContainersToSchedule(request);
  const results = [];
  
  for (const container of containers) {
    const result = await this.scheduleSingleContainer(container, request);
    results.push(result);
    
    // dryRun 模式下不保存，只计算
    if (!request.dryRun) {
      await this.executeSave(container.containerNumber, result.plannedData);
      await this.decrementOccupancy(...);
    }
  }
  
  return {
    success: true,
    total: containers.length,
    successCount: results.filter(r => r.success).length,
    results,
    hasMore: false
  };
}
```

**说明**: 
- `dryRun=true` 时仅计算，不写库
- `dryRun=false` 或不传时正常保存
- 保持向后兼容，不影响现有调用

#### Step 2: 重构保存逻辑

**文件**: `backend/src/services/intelligentScheduling.service.ts`

**现状**: `updateContainerSchedule()` 方法包含完整的保存逻辑

**改造**:
```typescript
// 原方法保持不变，确保向后兼容
private async updateContainerSchedule(
  containerNumber: string, 
  plannedData: any
): Promise<void> {
  // 完整的事务处理逻辑
  // 1. 更新 process_trucking_transport
  // 2. 更新 process_warehouse_operation
  // 3. 更新 process_port_operations
  // 4. 更新 process_empty_return
  // 5. 提交事务
}

// 新增：供 preview 使用的计算方法
private async calculatePlannedDates(
  container: Container
): Promise<any> {
  // 复用 scheduleSingleContainer 中的计算逻辑
  // 返回 plannedData 对象，不包含保存操作
  return {
    plannedCustomsDate: ...,
    plannedPickupDate: ...,
    plannedDeliveryDate: ...,
    plannedUnloadDate: ...,
    plannedReturnDate: ...,
    truckingCompanyId: ...,
    warehouseId: ...,
    unloadModePlan: ...,
    customsBrokerCode: ...
  };
}
```

**优势**:
- 保持现有代码稳定性
- 最小化改动范围
- 计算方法可复用

#### Step 3: 新增确认保存接口

**文件**: `backend/src/controllers/scheduling.controller.ts`

**新增端点**:
```typescript
/**
 * POST /api/v1/scheduling/confirm
 * 确认并保存排产结果
 */
confirmSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { containerNumbers, previewResults } = req.body;
    
    // 验证参数
    if (!Array.isArray(containerNumbers) || containerNumbers.length === 0) {
      res.status(400).json({
        success: false,
        message: 'containerNumbers 不能为空'
      });
      return;
    }
    
    const results = [];
    for (const containerNumber of containerNumbers) {
      const previewResult = previewResults?.find(
        r => r.containerNumber === containerNumber
      );
      
      if (!previewResult?.plannedData) {
        results.push({ 
          containerNumber, 
          success: false,
          message: '未找到预览数据'
        });
        continue;
      }
      
      // 使用预览时的计算结果，正式保存
      await intelligentSchedulingService.updateContainerSchedule(
        containerNumber,
        previewResult.plannedData
      );
      
      // 扣减产能
      await intelligentSchedulingService.decrementOccupancy(
        containerNumber,
        previewResult.plannedData
      );
      
      // 同步物流状态
      await this.containerStatusService.updateStatus(containerNumber);
      
      results.push({ containerNumber, success: true });
    }
    
    logger.info(`[Scheduling] Confirmed ${results.length} containers`);
    
    res.json({
      success: true,
      savedCount: results.filter(r => r.success).length,
      results
    });
  } catch (error: any) {
    logger.error('[Scheduling] confirmSchedule error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '确认保存失败'
    });
  }
};
```

**路由配置**: `backend/src/routes/scheduling.routes.ts`
```typescript
router.post('/confirm', schedulingController.confirmSchedule);
```

**参数验证**:
- `containerNumbers`: string[] 必填，待确认的柜号列表
- `previewResults`: array 可选，用于二次验证的预览数据

**错误处理**:
- 单个货柜保存失败不影响其他货柜
- 返回部分成功结果
- 记录详细错误日志

---

### 前端改造

#### Step 1: 新增预览确认组件

**文件**: `frontend/src/views/scheduling/components/SchedulingPreviewModal.vue`

**组件结构**:
```vue
<template>
  <el-dialog
    v-model="visible"
    title="排产预览"
    width="95%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 概览信息 -->
    <div class="preview-summary">
      <el-descriptions :column="4" border>
        <el-descriptions-item label="总柜数">
          {{ previewResults.length }}
        </el-descriptions-item>
        <el-descriptions-item label="预计总成本">
          ${{ totalCost.toLocaleString() }}
        </el-descriptions-item>
        <el-descriptions-item label="Drop off">
          {{ dropOffCount }} 柜
        </el-descriptions-item>
        <el-descriptions-item label="Live load">
          {{ liveLoadCount }} 柜
        </el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 详细表格 -->
    <el-table 
      :data="previewResults" 
      max-height="500" 
      stripe
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="containerNumber" label="柜号" width="120" />
      <el-table-column prop="plannedPickupDate" label="提柜日" width="100" />
      <el-table-column prop="plannedUnloadDate" label="卸柜日" width="100" />
      <el-table-column prop="unloadMode" label="方式" width="90">
        <template #default="{ row }">
          <el-tag :type="row.unloadMode === 'Drop off' ? 'success' : 'info'">
            {{ row.unloadMode }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="warehouseName" label="仓库" min-width="150" />
      <el-table-column prop="truckingCompany" label="车队" min-width="150" />
      <el-table-column prop="costEstimate.totalCost" label="成本" width="100" align="right">
        <template #default="{ row }">
          ${{ row.costEstimate?.totalCost?.toLocaleString() }}
        </template>
      </el-table-column>
    </el-table>

    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm" :loading="saving">
        确认保存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  previewResults: any[]
}>()

const emit = defineEmits<{
  confirm: [selectedContainers: string[]]
  cancel: []
}>()

const visible = ref(true)
const selectedContainers = ref<string[]>([])
const saving = ref(false)

const totalCost = computed(() => 
  props.previewResults.reduce((sum, r) => sum + (r.costEstimate?.totalCost || 0), 0)
)

const dropOffCount = computed(() => 
  props.previewResults.filter(r => r.unloadMode === 'Drop off').length
)

const liveLoadCount = computed(() => 
  props.previewResults.filter(r => r.unloadMode === 'Live load').length
)

const handleSelectionChange = (selection: any[]) => {
  selectedContainers.value = selection.map(s => s.containerNumber)
}

const handleConfirm = async () => {
  if (selectedContainers.value.length === 0) {
    ElMessage.warning('请至少选择一个货柜')
    return
  }
  
  saving.value = true
  try {
    emit('confirm', selectedContainers.value)
    visible.value = false
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  visible.value = false
}

const handleClose = () => {
  emit('cancel')
}
</script>

<style scoped>
.preview-summary {
  margin-bottom: 20px;
}
</style>
```

**功能特性**:
- 支持批量预览（默认 50 柜）
- 显示关键指标（成本、方式分布）
- 可选择性保存（勾选需要的货柜）
- 实时成本统计

#### Step 2: 集成到排产页面

**文件**: `frontend/src/views/scheduling/SchedulingVisual.vue`

**修改点**:
```typescript
import { ref } from 'vue'
import SchedulingPreviewModal from './components/SchedulingPreviewModal.vue'
import { containerApi } from '@/services/container'

const showPreview = ref(false)
const previewResults = ref([])

// 原来的批量排产函数
const handleBatchSchedule = async () => {
  try {
    // Step 1: 调用预览接口（dryRun=true）
    const response = await containerApi.batchSchedule({
      country: selectedCountry.value,
      limit: 50,
      dryRun: true // ← 关键：预览模式
    })
    
    if (!response.success) {
      ElMessage.error('预览失败：' + response.message)
      return
    }
    
    // Step 2: 显示预览弹窗
    previewResults.value = response.results
    showPreview.value = true
    
  } catch (error: any) {
    ElMessage.error('预览失败：' + error.message)
  }
}

// 新增：确认保存处理
const handleConfirm = async (selectedContainers: string[]) => {
  try {
    // Step 3: 调用确认接口
    const response = await containerApi.confirmSchedule({
      containerNumbers: selectedContainers,
      previewResults: previewResults.value.filter(
        r => selectedContainers.includes(r.containerNumber)
      )
    })
    
    if (response.success) {
      ElMessage.success(`成功保存 ${response.savedCount} 个货柜`)
      showPreview.value = false
      refreshContainerList() // 刷新列表
    } else {
      ElMessage.error('保存失败：' + response.message)
    }
  } catch (error: any) {
    ElMessage.error('保存失败：' + error.message)
  }
}

// 新增：取消处理
const handleCancel = () => {
  showPreview.value = false
  previewResults.value = []
}
```

**模板部分**:
```vue
<template>
  <div class="scheduling-visual">
    <!-- 原有的批量排产按钮 -->
    <el-button 
      type="primary" 
      @click="handleBatchSchedule"
      :loading="scheduling"
    >
      批量排产
    </el-button>
    
    <!-- 新增预览弹窗 -->
    <SchedulingPreviewModal
      v-if="showPreview"
      :preview-results="previewResults"
      @confirm="handleConfirm"
      @cancel="handleCancel"
    />
  </div>
</template>
```

**交互流程**:
1. 用户点击"批量排产"
2. 调用 `batchSchedule({ dryRun: true })` 获取预览数据
3. 显示预览弹窗，展示排产方案
4. 用户审查后可选择性保存
5. 调用 `confirmSchedule()` 正式保存
6. 刷新列表，显示最新状态

---

## 📊 数据结构

### 预览结果结构

```typescript
interface SchedulePreviewResult {
  // 基本信息
  containerNumber: string;
  success: boolean;
  message?: string;
  
  // 计划数据
  plannedData: {
    plannedCustomsDate: string;      // YYYY-MM-DD
    plannedPickupDate: string;       // YYYY-MM-DD
    plannedDeliveryDate: string;     // YYYY-MM-DD
    plannedUnloadDate: string;       // YYYY-MM-DD
    plannedReturnDate: string;       // YYYY-MM-DD
    truckingCompanyId: string;       // 车队公司代码
    truckingCompanyName: string;     // 车队名称
    warehouseId: string;             // 仓库代码
    warehouseName: string;           // 仓库名称
    unloadModePlan: 'Drop off' | 'Live load';
    customsBrokerCode: string;       // 报关行代码
    returnTerminalCode: string;      // 还箱码头代码
    returnTerminalName: string;      // 还箱码头名称
  };
  
  // 成本评估（可选）
  costEstimate?: {
    demurrageFee: number;        // 滞港费
    storageFee: number;          // 堆存费
    transportFee: number;        // 运输费
    yardHandlingFee: number;     // 堆场操作费
    totalCost: number;           // 总成本
    isWithinFreePeriod: boolean; // 是否在免费期内
  };
  
  // 资源占用（可选）
  resourceOccupancy?: {
    warehouseRemaining: number;  // 仓库剩余容量
    truckingRemaining: number;   // 车队剩余容量
    returnSlotRemaining: number; // 还箱档期剩余
  };
}
```

**说明**:
- `plannedData`: 必需字段，用于正式保存
- `costEstimate`: 第一阶段可不实现，后续迭代添加
- `resourceOccupancy`: 第一阶段可不实现，后续迭代添加

---

## 🚀 实施计划

### 阶段 1: 基础功能（本周）

**目标**: 实现基本的预览确认功能

**任务清单**:
1. ✅ 后端添加 `dryRun` 参数支持
   - 文件：`intelligentScheduling.service.ts`
   - 修改：`batchSchedule()` 方法
   - 工时：2 小时

2. ✅ 后端新增确认保存接口
   - 文件：`scheduling.controller.ts`
   - 新增：`confirmSchedule()` 方法
   - 工时：2 小时

3. ✅ 后端路由配置
   - 文件：`scheduling.routes.ts`
   - 新增：`POST /confirm` 路由
   - 工时：30 分钟

4. ✅ 前端新增预览组件
   - 文件：`SchedulingPreviewModal.vue`
   - 工时：3 小时

5. ✅ 前端集成到排产页面
   - 文件：`SchedulingVisual.vue`
   - 工时：2 小时

6. ✅ 测试验证
   - 单元测试：后端接口
   - 集成测试：前后端联调
   - 工时：3 小时

**总工时**: 约 1.5 人天  
**交付物**: 可运行的预览确认功能

---

### 阶段 2: 成本评估集成（下月）

**目标**: 集成成本优化服务，提供成本对比

**任务清单**:
1. 在预览结果中添加成本评估
2. 前端显示成本明细
3. 支持按成本排序
4. 提供优化建议

**预估工时**: 2-3 人天

---

### 阶段 3: 交互式调整（长期）

**目标**: 支持用户在预览界面调整排产方案

**任务清单**:
1. 支持修改计划日期
2. 支持切换仓库/车队
3. 支持切换卸柜方式
4. 实时重新计算成本

**预估工时**: 1-2 周

---

## ✅ 验收标准

### 功能验收

**基础功能**:
- [ ] `dryRun=true` 时不写入数据库
- [ ] `dryRun=false` 时正常保存
- [ ] 预览数据与正式保存一致
- [ ] 用户可取消排产
- [ ] 用户确认后才正式保存
- [ ] 保存失败时有明确错误提示

**接口测试**:
```bash
# 测试 1: 预览模式（不保存）
curl -X POST http://localhost:3000/api/v1/scheduling/batch-schedule \
  -H "Content-Type: application/json" \
  -d '{"country":"GB","limit":5,"dryRun":true}'

# 预期：返回预览数据，数据库无变化

# 测试 2: 正式模式（保存）
curl -X POST http://localhost:3000/api/v1/scheduling/batch-schedule \
  -H "Content-Type: application/json" \
  -d '{"country":"GB","limit":5}'

# 预期：保存数据，schedule_status='issued'

# 测试 3: 确认保存
curl -X POST http://localhost:3000/api/v1/scheduling/confirm \
  -H "Content-Type: application/json" \
  -d '{"containerNumbers":["CNT001","CNT002"]}'

# 预期：保存指定货柜，返回成功数量
```

---

### 性能验收

- [ ] 预览响应时间 < 3 秒（50 柜）
- [ ] 确认保存响应时间 < 5 秒（50 柜）
- [ ] 并发预览不影响系统性能
- [ ] 内存占用合理（< 500MB）

---

### 用户体验验收

- [ ] 预览界面清晰易懂
- [ ] 关键信息突出显示
- [ ] 操作按钮位置合理
- [ ] 错误提示友好准确
- [ ] 支持键盘快捷键（Enter 确认，Esc 取消）

---

## 💭 关键决策点

### 1. 是否支持部分保存？

**场景**: 预览 50 柜，用户只想保存其中 40 柜

**决策**: ✅ 支持

**理由**:
- 提供更大灵活性
- 允许用户排除异常数据
- 实现成本低（已在前端组件中实现勾选功能）

**实现**:
```typescript
// 用户可在预览表格中勾选需要保存的货柜
const handleConfirm = async (selectedContainers: string[]) => {
  // 只保存选中的货柜
  await containerApi.confirmSchedule({
    containerNumbers: selectedContainers,
    previewResults: filteredResults
  })
}
```

---

### 2. 预览数据的有效期？

**决策**: 不缓存，每次都是最新计算

**理由**:
- 保证数据实时性
- 避免产能冲突
- 简化实现复杂度

**备选方案**: 如性能成为瓶颈，可考虑缓存 30 分钟

---

### 3. 并发控制策略？

**决策**: 乐观锁 + 保存时检查

**实现**:
```typescript
async confirmSchedule(containerNumbers: string[], previewResults: any[]) {
  for (const containerNumber of containerNumbers) {
    // 保存前检查产能是否仍然充足
    const isAvailable = await this.checkCapacity(
      containerNumber,
      previewResults.find(r => r.containerNumber === containerNumber)
    )
    
    if (!isAvailable) {
      throw new Error(`产能不足：${containerNumber}`)
    }
    
    // 执行保存
    await this.updateContainerSchedule(containerNumber, plannedData)
  }
}
```

**优势**:
- 平衡性能和一致性
- 提供明确的错误提示
- 允许用户重新预览

---

## 📝 相关文档

- [智能排柜系统知识体系整合](file://d:\Gihub\logix\docs\第一阶段总结\05-专属领域知识\02-智能排柜系统.md)
- [智能排柜日期计算正向推导逻辑](file://d:\Gihub\logix\docs\Phase3\智能排柜日期计算正向推导逻辑.md)
- [排产业务规则：支持 ETA 预测性排产](memory://project_introduction/排产业务规则：支持 ETA 预测性排产)
- [INTELLIGENT_SCHEDULING_COMPLETE_REVIEW.md](file://d:\Gihub\logix\scripts\INTELLIGENT_SCHEDULING_COMPLETE_REVIEW.md)

---

**下一步**: 开始实施阶段 1 - 基础功能
