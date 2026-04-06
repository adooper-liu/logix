# E2E 测试环境修复 - data-testid 添加报告

**实施时间**: 2026-04-06  
**实施人员**: AI Assistant  
**实施状态**: ✅ 第 1 步完成

---

## 一、实施概览

### 1.1 已完成任务

| 任务 | 状态 | 说明 |
|------|------|------|
| ✅ 添加 data-testid 属性 | 完成 | GanttDot 组件已添加 |
| ✅ 添加 data-date 属性 | 完成 | 动态获取计划日期 |
| ⏳ 准备测试数据 | 待执行 | 需要插入测试货柜 |
| ⏳ 验证后端 API | 待执行 | 需要测试优化 API |

### 1.2 修改文件

| 文件 | 变更行数 | 主要改动 |
|------|---------|---------|
| [GanttDot.vue](../../../src/components/common/gantt/GanttDot.vue) | +63行 | 添加 data-testid 和 data-date |

---

## 二、技术实现

### 2.1 data-testid 属性

**实现方式**: 根据节点名称动态生成

```vue
<div
  class="container-dot"
  :data-testid="`${getNodeTestid(nodeName)}-node`"
  ...
>
</div>
```

**映射关系**:

| 节点名称 | testid | 示例 |
|---------|--------|------|
| 清关 | customs | `customs-node` |
| 提柜 | pickup | `pickup-node` |
| 卸柜 | unload | `unload-node` |
| 还箱 | return | `return-node` |

**代码实现**:
```typescript
const getNodeTestid = (nodeName: string): string => {
  const mapping: Record<string, string> = {
    '清关': 'customs',
    '提柜': 'pickup',
    '卸柜': 'unload',
    '还箱': 'return',
  }
  return mapping[nodeName] || nodeName.toLowerCase()
}
```

---

### 2.2 data-date 属性

**实现方式**: 从货柜数据中动态获取计划日期

```vue
<div
  class="container-dot"
  :data-date="getPlannedDate()"
  ...
>
</div>
```

**日期来源**:

| 节点名称 | 数据源 | 字段 |
|---------|--------|------|
| 清关 | customsClearance | customsClearanceDate |
| 提柜 | truckingTransports[0] | plannedPickupDate |
| 卸柜 | warehouseOperations[0] | plannedUnloadDate |
| 还箱 | emptyReturns[0] | plannedReturnDate |

**代码实现**:
```typescript
const getPlannedDate = (): string => {
  const nodeMapping: Record<string, string> = {
    '清关': 'customsClearanceDate',
    '提柜': 'plannedPickupDate',
    '卸柜': 'plannedUnloadDate',
    '还箱': 'plannedReturnDate',
  }

  const dateField = nodeMapping[props.nodeName]
  if (!dateField) return ''

  // 从不同的数据源获取日期
  let dateValue: any = null

  switch (props.nodeName) {
    case '清关':
      dateValue = props.container.customsClearance?.customsClearanceDate
      break
    case '提柜':
      dateValue = props.container.truckingTransports?.[0]?.plannedPickupDate
      break
    case '卸柜':
      dateValue = props.container.warehouseOperations?.[0]?.plannedUnloadDate
      break
    case '还箱':
      dateValue = props.container.emptyReturns?.[0]?.plannedReturnDate
      break
  }

  if (!dateValue) return ''

  // 转换为 YYYY-MM-DD 格式
  const date = new Date(dateValue)
  if (isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
```

**输出格式**: `YYYY-MM-DD`（例如：`2026-04-15`）

---

## 三、E2E 测试使用示例

### 3.1 定位提柜节点

```typescript
// 定位第一个提柜节点
const pickupNode = page.locator('[data-testid="pickup-node"]').first()
await expect(pickupNode).toBeVisible()
```

### 3.2 定位特定日期的节点

```typescript
// 定位 2026-04-15 的提柜节点
const pickupNode = page.locator('[data-testid="pickup-node"][data-date="2026-04-15"]')
await expect(pickupNode).toBeVisible()
```

### 3.3 拖拽操作

```typescript
// 拖拽提柜节点到新日期
const pickupNode = page.locator('[data-testid="pickup-node"]').first()
await pickupNode.dragTo(page.locator('[data-date="2026-04-10"]'))
```

### 3.4 验证所有节点类型

```typescript
// 验证清关节点
const customsNode = page.locator('[data-testid="customs-node"]')
await expect(customsNode).toBeVisible()

// 验证提柜节点
const pickupNode = page.locator('[data-testid="pickup-node"]')
await expect(pickupNode).toBeVisible()

// 验证卸柜节点
const unloadNode = page.locator('[data-testid="unload-node"]')
await expect(unloadNode).toBeVisible()

// 验证还箱节点
const returnNode = page.locator('[data-testid="return-node"]')
await expect(returnNode).toBeVisible()
```

---

## 四、验证方法

### 4.1 浏览器开发者工具验证

**步骤**:
1. 打开甘特图页面
2. 按 F12 打开开发者工具
3. 切换到 Elements 面板
4. 搜索 `data-testid="pickup-node"`
5. 验证属性存在且值正确

**预期结果**:
```html
<div
  class="container-dot clickable main-task"
  data-container="ECMU5399797"
  data-node="提柜"
  data-testid="pickup-node"
  data-date="2026-04-15"
  ...
></div>
```

---

### 4.2 Console 验证

在 Console 中执行：

```javascript
// 查找所有提柜节点
document.querySelectorAll('[data-testid="pickup-node"]')

// 查找特定日期的节点
document.querySelectorAll('[data-testid="pickup-node"][data-date="2026-04-15"]')

// 验证属性值
const node = document.querySelector('[data-testid="pickup-node"]')
console.log('testid:', node.getAttribute('data-testid'))
console.log('date:', node.getAttribute('data-date'))
```

---

## 五、下一步工作

### P0 - 立即执行（今天）

#### 任务 2: 准备测试数据

**目标**: 在数据库中插入至少 1 个测试货柜

**SQL 脚本**:
```sql
-- 1. 插入测试货柜
INSERT INTO biz_containers (
  container_number,
  bill_of_lading_number,
  destination_port,
  logistics_status,
  created_at,
  updated_at
) VALUES (
  'TEST0000001',
  'BL_TEST_001',
  'USLAX',
  '未出运',
  NOW(),
  NOW()
);

-- 2. 插入海运数据
INSERT INTO process_sea_freight (
  bill_of_lading_number,
  eta_dest_port,
  last_free_date,
  created_at,
  updated_at
) VALUES (
  'BL_TEST_001',
  '2026-04-20',
  '2026-04-20',
  NOW(),
  NOW()
);

-- 3. 插入提柜数据
INSERT INTO process_trucking_transport (
  container_number,
  trucking_company_id,
  planned_pickup_date,
  planned_unload_date,
  unload_mode_plan,
  created_at,
  updated_at
) VALUES (
  'TEST0000001',
  'TRUCK001', -- 需要确保车队存在
  '2026-04-15',
  '2026-04-15',
  'Direct',
  NOW(),
  NOW()
);

-- 4. 插入卸柜数据
INSERT INTO process_warehouse_operations (
  container_number,
  warehouse_id,
  planned_unload_date,
  planned_return_date,
  created_at,
  updated_at
) VALUES (
  'TEST0000001',
  'WH001', -- 需要确保仓库存在
  '2026-04-15',
  '2026-04-16',
  NOW(),
  NOW()
);
```

**前置条件**:
- 确保 `dict_trucking_companies` 表中有 `TRUCK001`
- 确保 `dict_warehouses` 表中有 `WH001`

**验证 SQL**:
```sql
-- 验证数据插入成功
SELECT 
  c.container_number,
  c.logistics_status,
  t.planned_pickup_date,
  w.planned_unload_date,
  w.planned_return_date
FROM biz_containers c
LEFT JOIN process_trucking_transport t ON c.container_number = t.container_number
LEFT JOIN process_warehouse_operations w ON c.container_number = w.container_number
WHERE c.container_number = 'TEST0000001';
```

**工作量**: 30分钟

---

#### 任务 3: 验证后端 API

**目标**: 确保优化 API 正常运行

**测试命令**:
```bash
curl -X POST http://localhost:3001/api/v1/scheduling/optimize-container/TEST0000001 \
  -H "Content-Type: application/json" \
  -d '{
    "warehouseCode": "WH001",
    "truckingCompanyId": "TRUCK001",
    "basePickupDate": "2026-04-15"
  }'
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "containerNumber": "TEST0000001",
    "originalCost": 1250.00,
    "optimizedCost": 980.00,
    "savings": 270.00,
    "savingsPercent": 21.6,
    "suggestedPickupDate": "2026-04-10",
    "suggestedStrategy": "Direct",
    "alternatives": [...]
  }
}
```

**失败情况**:
- 404: API 路由不存在
- 500: 后端服务错误
- 400: 参数错误

**工作量**: 15分钟

---

### P1 - 重新运行 E2E 测试

**命令**:
```bash
cd d:\Gihub\logix\frontend
npx playwright test e2e/cost-optimization.spec.ts --reporter=list
```

**预期结果**:
- 至少 1-2 个测试通过
- 其他测试可能因 Mock 数据问题失败

**工作量**: 30分钟

---

## 六、经验教训

### 6.1 成功经验

✅ **小步快跑**: 先添加 data-testid，再逐步完善  
✅ **动态生成**: 使用函数动态生成 testid，避免硬编码  
✅ **日期格式化**: 统一使用 YYYY-MM-DD 格式，便于测试  

### 6.2 注意事项

⚠️ **Props 定义**: Vue 3 `<script setup>` 中需要使用 `const props = defineProps()`  
⚠️ **空值处理**: 所有数据访问都需要可选链 `?.` 防止报错  
⚠️ **日期验证**: 需要验证日期有效性，避免 NaN  

---

## 七、参考资源

- **组件源码**: [GanttDot.vue](../../../src/components/common/gantt/GanttDot.vue)
- **E2E 测试**: [cost-optimization.spec.ts](../../../e2e/cost-optimization.spec.ts)
- **显示条件说明**: [22-优化面板显示条件说明.md](./22-优化面板显示条件说明.md)
- **E2E 执行报告**: [21-E2E 测试执行报告.md](./21-E2E 测试执行报告.md)

---

**实施状态**: ✅ **第 1 步完成（data-testid 添加）**  
**下一步**: 准备测试数据 + 验证后端 API  
**预计剩余时间**: 45分钟
