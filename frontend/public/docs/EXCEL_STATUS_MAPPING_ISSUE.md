# Excel 状态映射问题诊断

## 问题描述

**Excel 数据：**
```
集装箱号: SUDU6797842
备货单号: 26DSA00167
备货单状态: 已出运
清关状态: 未清关
物流状态: 已到中转港
```

**前端显示：**
- 物流状态：**未出运** ❌ (应该是"已到中转港")
- 订单状态：**已出运** ✅

## 问题根因分析

### 问题 1: 物流状态映射不完整

**Excel 中的值**: `"已到中转港"`

**当前的 `transformLogisticsStatus()` 函数：**
```typescript
function transformLogisticsStatus(value: string): string {
  const map: Record<string, string> = {
    '未出运': 'not_shipped',
    '已装船': 'shipped',
    '在途': 'in_transit',
    '已到港': 'at_port',
    '已提柜': 'picked_up',
    '已卸柜': 'unloaded',
    '已还箱': 'returned_empty',
    '已取消': 'cancelled',
  }
  return map[value] || value  // ⚠️ 未匹配时返回原值
}
```

**问题：**
- 映射表中没有 `"已到中转港"` 这个状态
- 函数会返回原值 `"已到中转港"`
- 数据库中存储的是 `"已到中转港"`（中文）
- 前端的 `statusMap` 中没有这个状态的映射

**前端显示逻辑：**
```typescript
const statusMap: Record<string, { text: string; type: '...' }> = {
  'not_shipped': { text: '未出运', type: 'info' },
  'in_transit': { text: '在途', type: 'success' },
  'at_port': { text: '已到港', type: 'success' },
  // ... 其他标准代码
  // ❌ 没有 '已到中转港' 的映射
}

// 显示代码
<el-tag :type="statusMap[containerData.logisticsStatus]?.type || 'info'">
  {{ statusMap[containerData.logisticsStatus]?.text || containerData.logisticsStatus }}
</el-tag>

// 当 logisticsStatus = '已到中转港' 时
// statusMap['已到中转港'] = undefined
// 显示: statusMap['已到中转港']?.text || '已到中转港' = '已到中转港'
```

**但是**，用户看到的是"未出运"，这说明数据库中可能存储的确实是 `'not_shipped'` 或者有其他问题。

### 问题 2: 可能的数据不一致

**可能的原因：**

1. **Excel 导入时使用了默认值**
   - 如果物流状态为空，可能被设置为默认值 `'not_shipped'`

2. **数据被后续逻辑覆盖**
   - 导入后可能有其他逻辑更新了状态

3. **前端显示的是缓存的旧数据**
   - 数据库已更新，但前端还在显示旧数据

4. **Excel 字段名不匹配**
   - Excel 中的物流状态列名可能与配置不一致

## 完整的物流状态映射

### 数据库约束允许的值

```sql
CHECK (logistics_status IN (
  'not_shipped', 'in_transit', 'at_port',
  'picked_up', 'unloaded', 'returned_empty', 'cancelled'
))
```

### 前端支持的映射

```typescript
const statusMap = {
  'not_shipped': { text: '未出运', type: 'info' },
  'shipped': { text: '已装船', type: 'success' },
  'in_transit': { text: '在途', type: 'success' },
  'at_port': { text: '已到港', type: 'success' },
  'picked_up': { text: '已提柜', type: 'warning' },
  'unloaded': { text: '已卸柜', type: 'warning' },
  'returned_empty': { text: '已还箱', type: 'success' },
  'hold': { text: '扣留', type: 'danger' },
  'completed': { text: '已完成', type: 'success' }
}
```

### Excel 中可能出现的物流状态

根据业务场景，Excel 中可能有以下状态：

| Excel 中的状态 | 是否有映射 | 转换后 | 说明 |
|--------------|-----------|--------|------|
| 未出运 | ✅ | `not_shipped` | 已映射 |
| 已装船 | ✅ | `shipped` | 已映射 |
| 在途 | ✅ | `in_transit` | 已映射 |
| 已到港 | ✅ | `at_port` | 已映射 |
| **已到中转港** | ❌ | `已到中转港` | **未映射！** |
| 已提柜 | ✅ | `picked_up` | 已映射 |
| 已卸柜 | ✅ | `unloaded` | 已映射 |
| 已还箱 | ✅ | `returned_empty` | 已映射 |
| 已取消 | ✅ | `cancelled` | 已映射 |

## 解决方案

### 方案 1: 扩展物流状态映射（推荐）

将 "已到中转港" 映射到合适的标准代码：

```typescript
function transformLogisticsStatus(value: string): string {
  const map: Record<string, string> = {
    '未出运': 'not_shipped',
    '已装船': 'shipped',
    '在途': 'in_transit',
    '已到港': 'at_port',
    '已到中转港': 'at_port',          // ✅ 新增：映射到已到港
    '已提柜': 'picked_up',
    '已卸柜': 'unloaded',
    '已还箱': 'returned_empty',
    '已取消': 'cancelled',
  }
  return map[value] || value
}
```

**映射逻辑：**
- "已到中转港" 表示货物已到达中转港口，应该映射到 `at_port`（已到港）
- 如果需要区分"到中转港"和"到目的港"，可以：
  - 使用 `at_port` + 港口类型标识
  - 或者添加新的状态码 `at_transit_port`

### 方案 2: 添加新的状态码

如果业务需要区分中转港和目的港：

```typescript
function transformLogisticsStatus(value: string): string {
  const map: Record<string, string> = {
    '未出运': 'not_shipped',
    '已装船': 'shipped',
    '在途': 'in_transit',
    '已到港': 'at_port',
    '已到中转港': 'at_transit_port',   // 新状态码
    '已提柜': 'picked_up',
    '已卸柜': 'unloaded',
    '已还箱': 'returned_empty',
    '已取消': 'cancelled',
  }
  return map[value] || value
}
```

**同时需要更新：**
1. 数据库约束
2. 前端 `statusMap`
3. 桑基图流转关系

### 方案 3: 使用通用字典映射

将物流状态纳入通用字典映射系统：

```typescript
// 前端
export async function getLogisticsStatusCode(name: string): Promise<string | null> {
  return getStandardCodeCached('LOGISTICS_STATUS', name)
}

// 使用
const statusCode = await getLogisticsStatusCode('已到中转港')  // 返回: 'at_port'
```

**数据库映射：**
```sql
INSERT INTO dict_universal_mapping (dict_type, standard_code, name_cn, name_en, is_active)
VALUES
  ('LOGISTICS_STATUS', 'not_shipped', '未出运', 'Not Shipped', true),
  ('LOGISTICS_STATUS', 'in_transit', '在途', 'In Transit', true),
  ('LOGISTICS_STATUS', 'at_port', '已到港', 'At Port', true),
  ('LOGISTICS_STATUS', 'at_port', '已到中转港', 'At Transit Port', true),  -- 同一个标准码
  ('LOGISTICS_STATUS', 'picked_up', '已提柜', 'Picked Up', true);
```

## 立即排查步骤

### 1. 检查数据库中的实际值

```sql
SELECT
  container_number,
  logistics_status,
  order_status,
  created_at,
  updated_at
FROM biz_containers
WHERE container_number = 'SUDU6797842';

-- 查看备货单状态
SELECT
  order_number,
  order_status
FROM biz_replenishment_orders
WHERE order_number = '26DSA00167';
```

### 2. 检查 Excel 导入日志

查看控制台日志，确认：
- Excel 中的物流状态列名是否匹配
- `transformLogisticsStatus()` 是否被调用
- 转换后的值是什么

### 3. 验证前端显示

在浏览器控制台执行：
```javascript
// 查看前端接收的数据
console.log(containerData)
```

### 4. 检查是否有数据更新逻辑

搜索代码中是否有更新物流状态的逻辑:

```bash
grep -r "logistics_status" backend/src/controllers/
grep -r "updateContainer" backend/src/
```

## 建议的完整修复

### 步骤 1: 更新 Excel 导入转换函数

```typescript
function transformLogisticsStatus(value: string): string {
  const map: Record<string, string> = {
    '未出运': 'not_shipped',
    '已装船': 'shipped',
    '在途': 'in_transit',
    '已到港': 'at_port',
    '已到中转港': 'at_port',          // ✅ 新增
    '已提柜': 'picked_up',
    '已卸柜': 'unloaded',
    '已还箱': 'returned_empty',
    '已取消': 'cancelled',
    // 空值或未识别的值，默认为未出运
    '': 'not_shipped',
    null: 'not_shipped',
    undefined: 'not_shipped'
  }
  return map[value] || 'not_shipped'  // 默认值改为 not_shipped
}
```

### 步骤 2: 更新前端状态映射

```typescript
const statusMap: Record<string, { text: string; type: '...' }> = {
  'not_shipped': { text: '未出运', type: 'info' },
  'shipped': { text: '已装船', type: 'success' },
  'in_transit': { text: '在途', type: 'success' },
  'at_port': { text: '已到港', type: 'success' },
  'picked_up': { text: '已提柜', type: 'warning' },
  'unloaded': { text: '已卸柜', type: 'warning' },
  'returned_empty': { text: '已还箱', type: 'success' },
  'cancelled': { text: '已取消', type: 'danger' },
  // 兼容未映射的中文状态
  '已到中转港': { text: '已到中转港', type: 'success' },
  '未出运': { text: '未出运', type: 'info' }
}
```

### 步骤 3: 添加订单状态转换函数（同样的问题）

```typescript
function transformOrderStatus(value: string): string {
  const map: Record<string, string> = {
    '草稿': 'DRAFT',
    '已确认': 'CONFIRMED',
    '已出运': 'SHIPPED',
    '运输中': 'IN_TRANSIT',
    '已交付': 'DELIVERED',
    '已取消': 'CANCELLED',
    // 英文状态直接返回
    'DRAFT': 'DRAFT',
    'CONFIRMED': 'CONFIRMED',
    'SHIPPED': 'SHIPPED',
    'IN_TRANSIT': 'IN_TRANSIT',
    'DELIVERED': 'DELIVERED',
    'CANCELLED': 'CANCELLED',
    // 默认值
    '': 'DRAFT',
    null: 'DRAFT',
    undefined: 'DRAFT'
  }
  return map[value] || 'DRAFT'
}
```

### 步骤 4: 更新 Excel 导入配置

```typescript
// 订单状态添加转换函数
{
  excelField: '备货单状态',
  table: 'biz_replenishment_orders',
  field: 'order_status',
  required: false,
  transform: transformOrderStatus  // ✅ 添加转换函数
}
```

## 其他可能的物流状态变体

根据实际情况，Excel 中可能还有其他物流状态表述：

| 可能的表述 | 建议映射 | 说明 |
|----------|---------|------|
| 待出运 | `not_shipped` | 未出运的另一种说法 |
| 已发货 | `shipped` | 同已装船 |
| 运输途中 | `in_transit` | 同在途 |
| 到达中转港 | `at_port` | 同已到中转港 |
| 到达目的港 | `at_port` | 同已到港 |
| 已提货 | `picked_up` | 同已提柜 |
| 已卸货 | `unloaded` | 同已卸柜 |
| 已还空箱 | `returned_empty` | 同已还箱 |
| 已完结 | `returned_empty` | 或 completed |

## 相关文件

- `frontend/src/views/import/ExcelImport.vue` - Excel 导入和转换函数
- `frontend/src/views/shipments/Shipments.vue` - 集装箱列表
- `frontend/src/views/shipments/ContainerDetail.vue` - 集装箱详情
- `docs/EXCEL_STATUS_MAPPING.md` - 状态映射文档

## 总结

**问题核心：**
1. Excel 中的 `"已到中转港"` 状态没有被映射函数识别
2. 导致数据库中可能存储了原始中文值或默认值
3. 前端 `statusMap` 中也没有这个状态的映射

**推荐解决方案：**
1. 扩展 `transformLogisticsStatus()` 函数，将 `"已到中转港"` 映射到 `"at_port"`
2. 添加默认值处理，避免未识别的状态导致显示错误
3. 为订单状态添加转换函数，保持数据一致性
4. 考虑长期使用通用字典映射系统管理所有状态映射

**下一步：**
1. 检查数据库中 SUDU6797842 的实际物流状态值
2. 应用上述修复代码
3. 重新导入 Excel 测试
4. 验证前端显示是否正确
