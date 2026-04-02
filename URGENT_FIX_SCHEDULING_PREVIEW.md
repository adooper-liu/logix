# 紧急修复：排产预览显示问题 & 规则管理 500 错误

##  当前问题

### 问题 1: 排产预览表格数据显示不全
- ❌ 车队列：无数据
- ❌ 卸柜方式列：无数据  
- ❌ 费用明细列：显示 "-"
- ❌ 消息列：无数据

### 问题 2: 规则管理 API 500 错误
```
GET /api/v1/scheduling/rules?ruleType=&keyword=&page=1&pageSize=20
Status: 500 Internal Server Error
```

## 🔍 根本原因分析

### 排产预览问题
后端 `intelligentScheduling.service.ts` 返回的数据结构中，字段命名与前端期望不一致：

**后端可能返回**：
```typescript
{
  plannedData: {
    truckingCompanyId: 'xxx',  // ← 前端期望 truckingCompany
    unloadMode: 'Drop off',     // ← 前端期望 unloadModePlan
    // estimatedCosts 可能为空
  }
}
```

**前端期望**：
```typescript
{
  plannedData: {
    truckingCompany: 'RT LOGISTICA Srl',
    unloadModePlan: 'Drop off',
    estimatedCosts: {
      transportationCost: 100,
      handlingCost: 50,
      // ...
    }
  }
}
```

### 规则管理 500 错误
可能原因：
1. 数据库表 `scheduling_rules` 未创建
2. 数据库连接失败（密码认证错误）
3. TypeORM 实体定义有问题

## 🛠️ 立即修复步骤

### 步骤 1: 检查并创建规则表

运行 SQL 检查表是否存在：

```sql
-- 检查表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE 'scheduling_rule%';

-- 如果不存在，创建表（需要先确认实体定义）
```

### 步骤 2: 修复后端数据映射

**文件**: `backend/src/services/intelligentScheduling.service.ts`

找到排产结果生成的地方（搜索 `scheduleSingleContainer` 或 `scheduleContainer`），确保返回的数据包含正确的字段：

```typescript
// 在返回结果前，确保字段正确映射
const result = {
  containerNumber: container.containerNumber,
  success: true,
  message: '排产成功',
  
  // ✅ 确保 plannedData 包含正确的字段
  plannedData: {
    // 车队信息
    truckingCompany: truckingCompany?.truckingCompanyName || '未分配车队',
    truckingCompanyId: truckingCompany?.truckingCompanyId,
    
    // 卸柜方式
    unloadModePlan: unloadMode || '未指定',
    
    // 仓库信息
    warehouseName: warehouse?.warehouseName || '未分配仓库',
    warehouseId: warehouse?.warehouseId,
    
    // 日期信息
    plannedPickupDate: plannedPickupDate?.toISOString(),
    plannedDeliveryDate: plannedDeliveryDate?.toISOString(),
    plannedUnloadDate: plannedUnloadDate?.toISOString(),
    plannedReturnDate: plannedReturnDate?.toISOString(),
    
    // ✅ 关键：费用明细
    estimatedCosts: {
      transportationCost: transportationCost || 0,
      handlingCost: handlingCost || 0,
      storageCost: storageCost || 0,
      demurrageCost: demurrageCost || 0,
      detentionCost: detentionCost || 0,
      totalCost: totalCost || 0,
    },
  },
  
  // 备用字段（兼容旧代码）
  truckingCompany: truckingCompany?.truckingCompanyName || '未分配车队',
  unloadMode: unloadMode || '未指定',
  warehouseName: warehouse?.warehouseName || '未分配仓库',
  estimatedCosts: {
    transportationCost: transportationCost || 0,
    handlingCost: handlingCost || 0,
    storageCost: storageCost || 0,
    demurrageCost: demurrageCost || 0,
    detentionCost: detentionCost || 0,
    totalCost: totalCost || 0,
  },
  
  lastFreeDate: lastFreeDate?.toISOString() || '-',
  lastReturnDate: lastReturnDate?.toISOString() || '-',
};
```

### 步骤 3: 修复前端数据转换

**文件**: `frontend/src/views/scheduling/SchedulingVisual.vue`

修改 `handlePreviewSchedule` 方法中的数据转换逻辑（约第 1779-1806 行）：

```typescript
const transformed = {
  ...r,
  // 日期字段
  plannedPickupDate: r.plannedData?.plannedPickupDate || '-',
  plannedDeliveryDate: r.plannedData?.plannedDeliveryDate || '-',
  plannedUnloadDate: r.plannedData?.plannedUnloadDate || '-',
  plannedReturnDate: r.plannedData?.plannedReturnDate || '-',
  
  // 仓库信息
  warehouseName: r.warehouseName || r.plannedData?.warehouseName || '-',
  
  // ✅ 关键修复：车队和卸柜方式
  truckingCompany: r.plannedData?.truckingCompany || r.truckingCompany || r.plannedData?.truckingCompanyId || '未分配车队',
  unloadMode: r.plannedData?.unloadModePlan || r.unloadMode || r.plannedData?.unloadMode || '未指定',
  
  // ✅ 费用数据（确保有值）
  estimatedCosts: r.plannedData?.estimatedCosts || r.estimatedCosts || {
    transportationCost: 0,
    handlingCost: 0,
    storageCost: 0,
    demurrageCost: 0,
    detentionCost: 0,
    totalCost: 0,
  },
  
  // 免费期信息
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

在 `SchedulingVisual.vue` 的 `handlePreviewSchedule` 方法中添加（约第 1796-1804 行）：

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
    rawResult: r, // 原始数据
  })
}
```

### 步骤 5: 修复规则管理 API

#### 5.1 检查数据库表

```sql
-- 检查表是否存在
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'scheduling_rules';

-- 检查实体定义
SELECT * FROM pg_tables 
WHERE tablename LIKE '%scheduling%';
```

#### 5.2 运行数据库迁移

如果表不存在，需要运行迁移或手动创建表。参考实体定义：

```bash
cd backend
npm run type-check  # 确保实体定义正确
npm run dev         # 启动服务（DB_SYNCHRONIZE=true 时会自动创建表）
```

#### 5.3 检查后端日志

```bash
cd backend
tail -f logs/*.log
```

查看是否有以下错误：
- `Relation 'scheduling_rules' does not exist`
- `password authentication failed`
- `Cannot find module`

### 步骤 6: 前端显示修复（备选方案）

如果上述修复后仍然无法显示，修改 `SchedulingPreviewModal.vue` 的模板：

**文件**: `frontend/src/views/scheduling/components/SchedulingPreviewModal.vue`

```vue
<!-- 车队列 -->
<el-table-column label="车队" min-width="180" show-overflow-tooltip>
  <template #default="{ row }">
    <span>{{ row.plannedData?.truckingCompany || row.truckingCompany || '未分配' }}</span>
  </template>
</el-table-column>

<!-- 卸柜方式列 -->
<el-table-column label="卸柜方式" width="110">
  <template #default="{ row }">
    <el-tag :type="getUnloadModeType(row.plannedData?.unloadModePlan || row.unloadMode)" size="small">
      {{ row.plannedData?.unloadModePlan || row.unloadMode || '未指定' }}
    </el-tag>
  </template>
</el-table-column>

<!-- 费用明细列 -->
<el-table-column label="费用明细" width="120" align="center" fixed="right">
  <template #default="{ row }">
    <el-popover v-if="hasCostData(row)" placement="left" :width="240" trigger="hover">
      <template #reference>
        <el-button type="primary" size="small" icon="QuestionFilled">明细</el-button>
      </template>
      <div style="font-size: 12px">
        <p style="margin: 4px 0; font-weight: bold">费用明细：</p>
        <p v-if="getCostValue(row, 'transportationCost') > 0" style="margin: 4px 0">
          运输费：{{ formatCurrency(getCostValue(row, 'transportationCost'), row.plannedData?.warehouseCountry || 'US') }}
        </p>
        <p v-if="getCostValue(row, 'handlingCost') > 0" style="margin: 4px 0">
          卸货费：{{ formatCurrency(getCostValue(row, 'handlingCost'), row.plannedData?.warehouseCountry || 'US') }}
        </p>
        <!-- ... 其他费用项 ... -->
        <el-divider style="margin: 8px 0" />
        <p style="margin: 4px 0; font-weight: bold; color: #e6a23c">
          合计：{{ formatCurrency(getCostValue(row, 'totalCost'), row.plannedData?.warehouseCountry || 'US') }}
        </p>
      </div>
    </el-popover>
    <span v-else style="color: #999">-</span>
  </template>
</el-table-column>

<!-- 消息列 -->
<el-table-column prop="message" label="消息" min-width="150" show-overflow-tooltip fixed="right" />
```

添加辅助函数：

```typescript
// 获取费用值（兼容多种数据结构）
const getCostValue = (row: any, field: string): number => {
  return row.estimatedCosts?.[field] || 
         row.plannedData?.estimatedCosts?.[field] || 
         0;
}

// 检查是否有费用数据
const hasCostData = (row: any): boolean => {
  return (row.estimatedCosts?.totalCost || 0) > 0 ||
         (row.plannedData?.estimatedCosts?.totalCost || 0) > 0;
}

// 卸柜方式类型
const getUnloadModeType = (mode: string): string => {
  if (mode === 'Drop off') return 'success';
  if (mode === 'Live load') return 'warning';
  return 'info';
}
```

## ✅ 验证清单

修复完成后，按以下顺序验证：

### 后端验证
- [ ] 数据库连接正常（无密码认证错误）
- [ ] 表 `scheduling_rules` 存在
- [ ] `GET /api/v1/scheduling/rules` 返回 200
- [ ] 后端日志无错误

### 前端验证
- [ ] 打开浏览器控制台
- [ ] 执行排产预览
- [ ] 查看 `[预览数据]` 日志，确认数据结构正确
- [ ] 表格显示车队名称（如 "RT LOGISTICA Srl"）
- [ ] 表格显示卸柜方式（如 "Drop off"）
- [ ] 费用明细可以点击显示详情
- [ ] 消息列显示 "排产成功" 或具体说明

## 🚨 快速诊断流程

如果修复后仍有问题，按以下流程诊断：

```bash
# 1. 检查后端服务
curl -v http://localhost:3001/api/v1/scheduling/rules

# 2. 检查数据库表
psql -U logix_user -d logix_db -c "\dt scheduling_*"

# 3. 查看后端日志
tail -f backend/logs/*.log | grep -E "Rule|Error"

# 4. 前端调试
# 打开浏览器 F12，执行排产预览，查看：
# - Network 标签：API 返回数据
# - Console 标签：[预览数据] 日志
```

## 📝 修复记录

- **创建时间**: 2026-04-02
- **紧急程度**: 高
- **影响功能**: 排产预览、规则管理
- **修复优先级**: 1. 后端数据映射 → 2. 前端转换逻辑 → 3. 数据库表修复

---

**下一步行动**:
1. 优先修复后端数据映射（步骤 2）
2. 然后修复前端转换逻辑（步骤 3）
3. 最后验证规则管理 API（步骤 5）
