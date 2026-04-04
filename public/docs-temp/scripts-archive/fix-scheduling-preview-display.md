# 排产预览显示问题修复方案

## 问题分析

### 问题 1: 车队和卸柜方式没有显示
**原因**: 数据映射路径不正确
- 前端期望：`row.plannedData.truckingCompany` 和 `row.plannedData.unloadModePlan`
- 后端可能返回：不同的字段名或嵌套结构

### 问题 2: 费用明细和消息没有显示
**原因**: `estimatedCosts` 数据结构可能为空或未正确映射

### 问题 3: 规则管理 500 错误
**原因**: 需要检查数据库表是否存在以及实体定义是否正确

## 立即修复步骤

### 步骤 1: 检查后端规则表

运行以下 SQL 检查表是否存在：

```sql
-- 检查规则表
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'scheduling_rules';

-- 检查表数据
SELECT COUNT(*) FROM scheduling_rules;
```

### 步骤 2: 检查后端日志

```bash
cd backend
npm run dev
```

查看控制台输出，特别关注：
- `[RuleController]` 相关日志
- 数据库连接错误
- TypeORM 错误

### 步骤 3: 前端数据映射修复（临时方案）

在 `SchedulingVisual.vue` 的 `handlePreviewSchedule` 方法中，修改数据转换逻辑（第 1779-1806 行）：

```typescript
const transformed = {
  ...r,
  // 确保字段正确映射
  plannedPickupDate: r.plannedData?.plannedPickupDate || '-',
  plannedDeliveryDate: r.plannedData?.plannedDeliveryDate || '-',
  plannedUnloadDate: r.plannedData?.plannedUnloadDate || '-',
  plannedReturnDate: r.plannedData?.plannedReturnDate || '-',
  warehouseName: r.warehouseName || r.plannedData?.warehouseName || '-',
  
  // ✅ 关键修复：确保车队和卸柜方式字段有值
  truckingCompany: r.plannedData?.truckingCompany || r.truckingCompany || '未分配',
  unloadMode: r.plannedData?.unloadModePlan || r.unloadMode || '未指定',
  
  // ✅ 费用数据映射
  estimatedCosts: r.plannedData?.estimatedCosts || r.estimatedCosts || {
    transportationCost: 0,
    handlingCost: 0,
    storageCost: 0,
    demurrageCost: 0,
    detentionCost: 0,
    totalCost: 0,
  },
  
  lastFreeDate: r.lastFreeDate || '-',
  lastReturnDate: r.lastReturnDate || '-',
  pickupFreeDays: r.pickupFreeDays,
  returnFreeDays: r.returnFreeDays,
  freeDaysRemaining: r.freeDaysRemaining ?? undefined,
  
  // ✅ 确保消息字段有值
  message: r.message || (r.success ? '排产成功' : '排产失败'),
}
```

### 步骤 4: 添加调试日志

在 `SchedulingPreviewModal.vue` 中添加调试输出（第 796-804 行）：

```typescript
// ✅ 调试：输出前 3 条数据的完整结构
if (index < 3) {
  console.log(`[预览数据 ${index}]`, {
    containerNumber: r.containerNumber,
    truckingCompany: transformed.truckingCompany,
    unloadMode: transformed.unloadMode,
    estimatedCosts: transformed.estimatedCosts,
    message: transformed.message,
    plannedData: r.plannedData,
  })
}
```

然后在浏览器控制台查看数据结构，确认字段名称。

### 步骤 5: 检查后端数据源

检查 `intelligentScheduling.service.ts` 中的排产结果生成逻辑，确保返回的数据包含：

```typescript
interface SchedulingResult {
  containerNumber: string;
  success: boolean;
  message?: string;
  plannedData?: {
    truckingCompany?: string;      // ← 确保有值
    unloadModePlan?: string;        // ← 确保有值
    warehouseName?: string;
    estimatedCosts?: {
      transportationCost?: number;
      handlingCost?: number;
      storageCost?: number;
      demurrageCost?: number;
      detentionCost?: number;
      totalCost?: number;
    };
  };
  estimatedCosts?: any;  // 备用字段
}
```

## 长期解决方案

### 方案 1: 统一数据结构定义

创建共享的 TypeScript 接口文件：

```typescript
// shared/interfaces/scheduling.ts
export interface SchedulingPreviewResult {
  containerNumber: string;
  success: boolean;
  message: string;
  plannedData: {
    truckingCompany: string;
    unloadModePlan: 'Drop off' | 'Live load';
    warehouseName: string;
    estimatedCosts: CostBreakdown;
  };
  estimatedCosts: CostBreakdown;
}

export interface CostBreakdown {
  transportationCost: number;
  handlingCost: number;
  storageCost: number;
  demurrageCost: number;
  detentionCost: number;
  totalCost: number;
}
```

### 方案 2: 添加数据验证层

在后端返回数据前进行验证：

```typescript
// backend/src/services/intelligentScheduling.service.ts
private validateSchedulingResult(result: SchedulingResult): void {
  if (!result.plannedData?.truckingCompany) {
    result.plannedData.truckingCompany = '未分配车队';
  }
  if (!result.plannedData?.unloadModePlan) {
    result.plannedData.unloadModePlan = '未指定';
  }
  if (!result.estimatedCosts) {
    result.estimatedCosts = {
      transportationCost: 0,
      handlingCost: 0,
      storageCost: 0,
      demurrageCost: 0,
      detentionCost: 0,
      totalCost: 0,
    };
  }
}
```

## 验证清单

- [ ] 后端规则表 `scheduling_rules` 存在且有数据
- [ ] 后端服务启动无错误
- [ ] 规则管理 API `/api/v1/scheduling/rules` 返回 200
- [ ] 排产预览 API 返回的数据包含 `truckingCompany` 和 `unloadModePlan`
- [ ] 浏览器控制台调试日志显示正确的数据结构
- [ ] 前端表格正确显示车队、卸柜方式、费用明细和消息

## 快速诊断命令

```bash
# 1. 检查后端服务状态
curl http://localhost:3001/api/v1/scheduling/rules

# 2. 检查数据库连接
cd backend
npm run type-check

# 3. 查看后端日志
tail -f backend/logs/*.log

# 4. 前端调试
# 打开浏览器控制台，执行排产预览，查看 [预览数据] 日志输出
```

---

**创建时间**: 2026-04-02  
**紧急程度**: 高  
**影响范围**: 排产预览功能
