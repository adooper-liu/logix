# Excel 状态映射说明

## 概述
LogiX 系统在 Excel 导入时，需要将 Excel 中的中文状态转换为数据库存储的标准代码。本文档详细说明物流状态和订单状态的映射规则。

---

## 物流状态映射

### 定义位置
- **前端代码**: `frontend/src/views/import/ExcelImport.vue`
- **转换函数**: `transformLogisticsStatus()`
- **目标表**: `biz_containers`
- **目标字段**: `logistics_status`

### Excel 字段映射
| Excel 字段名 | 数据库表 | 数据库字段 | 转换函数 |
|-------------|---------|-----------|---------|
| 物流状态 | biz_containers | logistics_status | transformLogisticsStatus |

### 映射规则

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
  return map[value] || value
}
```

### 详细映射表

| Excel 中的中文状态 | 数据库标准代码 | 说明 | 桑基图阶段 |
|-------------------|--------------|------|----------|
| 未出运 | `not_shipped` | 备货单已创建，但货物尚未出运 | 第 1 层 |
| 已装船 | `shipped` | 货物已装船离港 | 第 1-2 层 |
| 在途 | `in_transit` | 货物正在海运途中 | 第 2 层 |
| 已到港 | `at_port` | 货物已到达目的港 | 第 3 层 |
| 已提柜 | `picked_up` | 已从港口提走货柜 | 第 4 层 |
| 已卸柜 | `unloaded` | 已在仓库卸柜 | 第 5 层 |
| 已还箱 | `returned_empty` | 空箱已归还船公司 | 第 6 层 |
| 已取消 | `cancelled` | 订单已取消 | - |

### 数据库约束

```sql
ALTER TABLE biz_containers
ADD CONSTRAINT chk_logistics_status
CHECK (logistics_status IN (
  'not_shipped', 'in_transit', 'at_port',
  'picked_up', 'unloaded', 'returned_empty', 'cancelled'
));
```

### 桑基图流转关系

```
未出运 (not_shipped)
    ↓
已装船 (shipped) ──→ 在途 (in_transit)
                      ↓
                  已到港 (at_port)
                      ↓
                  已提柜 (picked_up)
                      ↓
                  已卸柜 (unloaded)
                      ↓
                  已还箱 (returned_empty)
```

### 使用示例

**Excel 中的值：**
```csv
集装箱号,物流状态
ABC1234567,未出运
ABC1234568,在途
ABC1234569,已到港
```

**导入后的数据库值：**
```sql
container_number  | logistics_status
------------------|-----------------
ABC1234567        | not_shipped
ABC1234568        | in_transit
ABC1234569        | at_port
```

---

## 订单状态映射

### 定义位置
- **前端代码**: `frontend/src/views/import/ExcelImport.vue`
- **Excel 字段**: `备货单状态`
- **目标表**: `biz_replenishment_orders`
- **目标字段**: `order_status`

### Excel 字段映射
| Excel 字段名 | 数据库表 | 数据库字段 | 转换方式 |
|-------------|---------|-----------|---------|
| 备货单状态 | biz_replenishment_orders | order_status | 直接存储 |

### 当前状态
**重要**: 目前 `备货单状态` 字段在 Excel 导入时**没有转换函数**，直接使用 Excel 中的值。

配置代码：
```typescript
{ excelField: '备货单状态', table: 'biz_replenishment_orders', field: 'order_status', required: false }
```

### 数据库允许的值

```sql
ALTER TABLE biz_replenishment_orders
ADD CONSTRAINT chk_order_status
CHECK (order_status IN (
  'DRAFT',        -- 草稿
  'CONFIRMED',    -- 已确认
  'SHIPPED',      -- 已出运
  'IN_TRANSIT',   -- 运输中
  'DELIVERED',    -- 已交付
  'CANCELLED',    -- 已取消
  '已出运',       -- 中文兼容值
  '已确认',       -- 中文兼容值
  '草稿'          -- 中文兼容值
));
```

### 建议的映射规则

为了保持数据一致性，建议添加订单状态转换函数：

```typescript
/**
 * 订单状态映射
 */
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
  }
  return map[value] || 'DRAFT' // 默认为草稿状态
}
```

### 使用示例

**Excel 中的值（当前方式）：**
```csv
备货单号,备货单状态
RO202402240001,已确认
RO202402240002,已出运
```

**导入后的数据库值（当前方式）：**
```sql
order_number   | order_status
---------------|---------------
RO202402240001 | 已确认
RO202402240002 | 已出运
```

**建议使用转换函数后的值：**
```sql
order_number   | order_status
---------------|---------------
RO202402240001 | CONFIRMED
RO202402240002 | SHIPPED
```

---

## 其他状态字段

### 清关状态映射
虽然 Excel 配置中定义了 `transformCustomsStatus` 函数，但在 `FIELD_MAPPINGS` 中没有实际使用。

```typescript
/**
 * 清关状态映射
 */
function transformCustomsStatus(value: string): string {
  const map: Record<string, string> = {
    '未开始': 'NOT_STARTED',
    '进行中': 'IN_PROGRESS',
    '已完成': 'COMPLETED',
    '失败': 'FAILED',
  }
  return map[value] || value
}
```

### ISF 申报状态映射
同样在 Excel 配置中定义了 `transformISFStatus` 函数，但没有实际使用。

```typescript
/**
 * ISF申报状态映射
 */
function transformISFStatus(value: string): string {
  const map: Record<string, string> = {
    '未申报': 'NOT_STARTED',
    '已提交': 'SUBMITTED',
    '已批准': 'APPROVED',
    '已拒绝': 'REJECTED',
  }
  return map[value] || value
}
```

---

## 完整的状态字段映射表

| 字段名称 | Excel 字段 | 数据库表 | 数据库字段 | 转换函数 | 是否使用 |
|---------|-----------|---------|-----------|---------|---------|
| 物流状态 | 物流状态 | biz_containers | logistics_status | transformLogisticsStatus | ✅ 使用 |
| 订单状态 | 备货单状态 | biz_replenishment_orders | order_status | 无 | ❌ 未使用 |
| 清关状态 | 清关单据状态 | process_port_operations | document_status | transformCustomsStatus | ❌ 未使用 |
| ISF 申报状态 | ISF 申报状态 | process_port_operations | isf_status | transformISFStatus | ❌ 未使用 |

---

## 建议改进

### 1. 为订单状态添加转换函数

修改 Excel 导入配置：

```typescript
// 修改前
{ excelField: '备货单状态', table: 'biz_replenishment_orders', field: 'order_status', required: false }

// 修改后
{
  excelField: '备货单状态',
  table: 'biz_replenishment_orders',
  field: 'order_status',
  required: false,
  transform: transformOrderStatus  // 添加转换函数
}
```

### 2. 统一使用英文状态码

**优点：**
- 数据库查询更高效
- 避免字符编码问题
- 便于国际化
- 统一数据格式

**实施步骤：**
1. 添加状态转换函数
2. 更新 Excel 导入配置
3. 数据迁移（将现有的中文状态转换为英文）

### 3. 在通用字典映射中管理状态

可以考虑将状态映射也纳入通用字典映射系统：

```typescript
// 前端服务
export async function getOrderStatusCode(name: string): Promise<string | null> {
  return getStandardCodeCached('ORDER_STATUS', name)
}

// 使用
const statusCode = await getOrderStatusCode('已确认')  // 返回: 'CONFIRMED'
```

---

## 相关文件

### 前端文件
- `frontend/src/views/import/ExcelImport.vue` - Excel 导入页面和映射配置
- `frontend/src/views/shipments/Shipments.vue` - 集装箱管理页面
- `frontend/src/views/monitoring/Monitoring.vue` - 看板（桑基图）

### 后端文件
- `backend/03_create_tables.sql` - 数据库表结构
- `backend/04_fix_constraints.sql` - 数据库约束定义
- `backend/src/controllers/container.controller.ts` - 货柜控制器

### 文档
- `docs/UNIVERSAL_DICT_MAPPING_GUIDE.md` - 通用字典映射指南
- `docs/EXAMPLE_NEW_PORT_MAPPING.md` - 港口映射示例
- `TIMESCALEDB_QUICK_REFERENCE.md` - TimescaleDB 快速参考

---

## 快速参考

### 物流状态（7 层流转）
```
未出运 → 已装船 → 在途 → 已到港 → 已提柜 → 已卸柜 → 已还箱
```

### 订单状态（6 种状态）
```
草稿 → 已确认 → 已出运 → 运输中 → 已交付 → 已取消
```

### 前端映射函数
```typescript
// 物流状态
transformLogisticsStatus('未出运')  // → 'not_shipped'

// 订单状态（建议添加）
transformOrderStatus('已确认')     // → 'CONFIRMED'

// 清关状态
transformCustomsStatus('进行中')   // → 'IN_PROGRESS'

// ISF 申报状态
transformISFStatus('已提交')       // → 'SUBMITTED'
```

---

## 更新日志

| 日期 | 版本 | 更改内容 |
|------|------|---------|
| 2026-02-27 | 1.0 | 初始版本，记录物流状态和订单状态的 Excel 映射规则 |

---

**注意**: 如果需要修改状态映射规则，请同时更新：
1. 前端的转换函数
2. Excel 导入配置
3. 数据库约束
4. 相关文档
