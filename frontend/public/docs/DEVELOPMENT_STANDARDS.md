# LogiX 开发规范与最佳实践

> **核心原则**: 数据库表结构是唯一不变基准，所有代码必须对齐数据库表结构。

> **数据完整性原则**: 禁止临时补丁修复导入数据,必须从源头修复并重新导入

---

## 📋 目录

1. [核心原则](#核心原则)
2. [失败案例总结](#失败案例总结)
3. [开发流程规范](#开发流程规范)
4. [命名规范](#命名规范)
5. [颜色系统规范](#颜色系统规范) ⭐ 新增
6. [多语言规范](#多语言规范) ⭐ 新增
7. [关键开发步骤](#关键开发步骤)
8. [常用映射参考](#常用映射参考)

---

## 🎯 核心原则

### 1. 数据完整性原则

**禁止临时补丁修复**: 永远不要使用临时SQL补丁修复已导入的错误数据

- ❌ **错误做法**: 发现数据导入问题后,直接编写SQL UPDATE/INSERT补丁修复
- ✅ **正确做法**:
  1. 删除错误的导入数据
  2. 修复字段映射或代码逻辑
  3. 重新导入Excel,确保数据100%正确

**原因**:
- 临时补丁会导致数据来源不清晰
- 后续无法追溯数据的准确性
- 可能掩盖代码中的根本问题
- 违反"数据库表结构是唯一基准"原则

**实施规则**:
```bash
# 发现导入错误后,按以下步骤处理:

# 1. 删除错误的导入数据
DELETE FROM process_trucking_transport WHERE container_number = 'XXX';
DELETE FROM process_warehouse_operations WHERE container_number = 'XXX';

# 2. 修复字段映射 (检查 frontend/src/views/import/ExcelImport.vue)
# 3. 重新导入Excel文件
```

### 2. 数据库表结构优先原则

## 🔴 失败案例总结

### 案例1: 外键约束错误

**问题描述**:
```
insert or update on table "process_port_operations" violates foreign key constraint
```

**根本原因**:
- 前端使用错误的表名 `port_operations` 而不是 `process_port_operations`
- 前端使用错误的字段名 `containerNumber` 而不是 `container_number`
- 前端生成的港口操作记录字段全部使用 `camelCase` 而不是 `snake_case`

**正确做法**:
```typescript
// ❌ 错误
{ table: 'port_operations', field: 'containerNumber' }

// ✅ 正确 - 使用数据库表名和字段名
{ table: 'process_port_operations', field: 'container_number' }
```

---

### 案例2: 表名不统一

**问题描述**:
- 前端使用: `replenishment_orders`, `containers`
- 数据库实际: `biz_replenishment_orders`, `biz_containers`
- 导致数据无法正确插入

**正确做法**:
```typescript
// ✅ 使用数据库表名（带前缀）
biz_replenishment_orders  // 业务表
biz_containers            // 业务表
process_sea_freight       // 流程表
process_port_operations   // 流程表
dict_ports                // 字典表
```

---

### 案例3: 拖卡运输和仓库操作字段映射缺失

**问题描述**:
- 拖卡运输表 (process_trucking_transport) 只映射了2个字段
- 仓库操作表 (process_warehouse_operations) 只映射了2个字段
- 导致大量数据未被导入,数据库中出现大量空记录

**Excel原始数据** (FANU3376528):
```
目的港卡车: TRANS PRO LOGISTIC INC
提柜日期: 2025-05-21 02:04:30
卸柜方式: Drop off

入库仓库组: Toronto Warehouse Group
仓库(实际): Oshawa
入库日期: 2025-05-31 11:38:58
WMS入库状态: WMS已完成
```

**数据库实际结果**:
```sql
-- 拖卡运输表
SELECT * FROM process_trucking_transport WHERE container_number = 'FANU3376528';
-- 结果: 0行数据 (完全未导入)

-- 仓库操作表
SELECT * FROM process_warehouse_operations WHERE container_number = 'FANU3376528';
-- 结果: 1行空记录,所有关键字段为NULL
```

**根本原因**:
- 前端 `ExcelImport.vue` 中字段映射严重不足
- 缺少 `目的港卡车` → `carrier_company` 等关键映射
- 只映射了少量字段,导致大量数据丢失

**正确做法**:
```typescript
// ❌ 错误 - 字段映射不足
{ excelField: '目的港卡车', table: 'process_trucking_transport', field: 'delivery_location', required: false },
{ excelField: '卸柜方式(计划)', table: 'process_trucking_transport', field: 'unload_mode_plan', required: false },

// ✅ 正确 - 完整的字段映射 (对齐数据库表结构)
{ excelField: '是否预提', table: 'process_trucking_transport', field: 'is_pre_pickup', required: false, transform: transformBoolean },
{ excelField: '目的港卡车', table: 'process_trucking_transport', field: 'carrier_company', required: false },
{ excelField: '提柜通知', table: 'process_trucking_transport', field: 'pickup_notification', required: false },
{ excelField: '货柜承运商', table: 'process_trucking_transport', field: 'carrier_company', required: false },
{ excelField: '司机姓名', table: 'process_trucking_transport', field: 'driver_name', required: false },
{ excelField: '司机电话', table: 'process_trucking_transport', field: 'driver_phone', required: false },
{ excelField: '车牌号', table: 'process_trucking_transport', field: 'truck_plate', required: false },
{ excelField: '最晚提柜日期', table: 'process_trucking_transport', field: 'last_pickup_date', required: false, transform: parseDate },
{ excelField: '计划提柜日期', table: 'process_trucking_transport', field: 'planned_pickup_date', required: false, transform: parseDate },
{ excelField: '提柜日期', table: 'process_trucking_transport', field: 'pickup_date', required: false, transform: parseDate },
{ excelField: '最晚送仓日期', table: 'process_trucking_transport', field: 'last_delivery_date', required: false, transform: parseDate },
{ excelField: '计划送仓日期', table: 'process_trucking_transport', field: 'planned_delivery_date', required: false, transform: parseDate },
{ excelField: '送仓日期', table: 'process_trucking_transport', field: 'delivery_date', required: false, transform: parseDate },
{ excelField: '提柜地点', table: 'process_trucking_transport', field: 'pickup_location', required: false },
{ excelField: '卸柜方式(计划)', table: 'process_trucking_transport', field: 'unload_mode_plan', required: false },

// 仓库操作表 - 完整映射
{ excelField: '入库仓库组', table: 'process_warehouse_operations', field: 'warehouse_group', required: false },
{ excelField: '仓库(计划)', table: 'process_warehouse_operations', field: 'planned_warehouse', required: false },
{ excelField: '仓库(实际)', table: 'process_warehouse_operations', field: 'actual_warehouse', required: false },
{ excelField: '计划卸柜日期', table: 'process_warehouse_operations', field: 'planned_unload_date', required: false, transform: parseDate },
{ excelField: '最晚卸柜日期', table: 'process_warehouse_operations', field: 'last_unload_date', required: false, transform: parseDate },
{ excelField: '卸空日期', table: 'process_warehouse_operations', field: 'unload_date', required: false, transform: parseDate },
{ excelField: '入库日期', table: 'process_warehouse_operations', field: 'warehouse_arrival_date', required: false, transform: parseDate },
{ excelField: '卸柜方式(实际)', table: 'process_warehouse_operations', field: 'unload_mode_actual', required: false },
{ excelField: '卸柜方式（实际）', table: 'process_warehouse_operations', field: 'unload_mode_actual', required: false },
{ excelField: 'WMS入库状态', table: 'process_warehouse_operations', field: 'wms_status', required: false },
{ excelField: 'EBS入库状态', table: 'process_warehouse_operations', field: 'ebs_status', required: false },
{ excelField: 'WMS Confirm Date', table: 'process_warehouse_operations', field: 'wms_confirm_date', required: false, transform: parseDate },
{ excelField: '卸柜门', table: 'process_warehouse_operations', field: 'unload_gate', required: false },
{ excelField: '卸柜公司', table: 'process_warehouse_operations', field: 'unload_company', required: false },
{ excelField: '备注(仓库信息表)', table: 'process_warehouse_operations', field: 'warehouse_remarks', required: false },
```

**实施步骤** (遵循"禁止临时补丁修复"原则):
1. 删除错误的导入数据
   ```sql
   DELETE FROM process_trucking_transport WHERE container_number = 'FANU3376528';
   DELETE FROM process_warehouse_operations WHERE container_number = 'FANU3376528';
   ```

2. 修复字段映射 (在 `frontend/src/views/import/ExcelImport.vue` 中)
   - 参考数据库表结构 `backend/03_create_tables.sql`
   - 确保所有字段都有对应映射
   - 字段名必须使用数据库的 snake_case 格式

3. 重新导入Excel文件,验证数据100%正确

---

### 案例3: 字段名混用 camelCase/snake_case

**问题描述**:
- 实体类使用 `camelCase`: `orderNumber`, `containerNumber`
- 数据库使用 `snake_case`: `order_number`, `container_number`
- 前端后端混用两种命名，导致映射复杂易出错

**正确做法**:
```
数据库层 (物理):      snake_case   (order_number)
实体层 (TypeORM):     camelCase    (orderNumber) - @Column指定name
API层 (前后端通信):   snake_case   (order_number) - 对齐数据库
Controller/Service层: camelCase    (orderNumber) - 使用实体属性名
```

**转换规则**:
- 前端→后端接收: 直接使用 snake_case（与数据库一致）
- 后端处理: 将 snake_case 转换为 camelCase 用于 TypeORM entity
- 后端→前端返回: 可以直接返回或转换（保持一致即可）

---

## 🎯 开发流程规范

### 核心流程（适用于任何数据相关开发）

```
1. 数据库表设计（SQL）
   ↓
2. TypeORM实体定义（TS）
   ↓
3. 后端API开发（TS）
   ↓
4. 前端对接开发（Vue/TS）
   ↓
5. 联调测试
```

### 每个步骤的关键要求

#### 步骤1: 数据库表设计

**必须遵守**:
- ✅ 使用标准的 `snake_case` 命名
- ✅ 表名使用前缀区分类型: `biz_`, `process_`, `dict_`, `ext_`
- ✅ 所有字段必须有明确的类型和约束
- ✅ 外键关系必须明确定义

```sql
-- ✅ 正确示例
CREATE TABLE biz_containers (
    container_number VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(50),
    container_type_code VARCHAR(20),
    -- 字段名使用 snake_case
    FOREIGN KEY (order_number) REFERENCES biz_replenishment_orders(order_number)
);
```

#### 步骤2: TypeORM实体定义

**必须遵守**:
- ✅ 实体属性使用 `camelCase`
- ✅ 使用 `@Column({ name: 'snake_case_field' })` 显式指定数据库字段名
- ✅ 表名必须与数据库完全一致

```typescript
// ✅ 正确示例
@Entity('biz_containers')  // 表名与数据库完全一致
export class Container {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber!: string;  // 属性名: camelCase

  @Column({ type: 'varchar', length: 50, name: 'order_number' })
  orderNumber!: string;  // 显式指定数据库字段名

  @Column({ type: 'varchar', length: 20, name: 'container_type_code' })
  containerTypeCode!: string;
}
```

#### 步骤3: 后端API开发

**必须遵守**:
- ✅ 接收数据使用 `snake_case` 字段名（对齐数据库）
- �返回数据可以使用 `camelCase`（前端友好），或直接返回数据库结构
- ✅ 使用 DTO 类型定义，明确字段映射

```typescript
// ✅ 正确示例 - 接收数据
class CreateContainerDTO {
  container_number: string;    // 使用 snake_case
  order_number: string;
  container_type_code: string;
}

// 控制器方法
createContainer(req: Request, res: Response) {
  const { container_number, order_number } = req.body;

  const container = new Container();
  container.containerNumber = container_number;  // 映射到实体
  container.orderNumber = order_number;

  await this.containerRepository.save(container);
}

// ✅ 正确示例 - 返回数据（可选转换）
res.json({
  success: true,
  data: {
    container_number: container.containerNumber,
    order_number: container.orderNumber
    // 或者使用实例直接返回，TypeORM会自动转换
  }
});
```

#### 步骤4: 前端对接开发

**必须遵守**:
- ✅ 发送数据使用 `snake_case` 字段名（对齐数据库）
- ✅ API调用参数使用数据库字段名
- ✅ 配置映射时参考数据库表结构

```typescript
// ✅ 正确示例 - API调用
const createContainer = async (data: any) => {
  return api.post('/containers', {
    container_number: data.container_number,  // snake_case
    order_number: data.order_number,
    container_type_code: data.container_type_code
  });
};

// ✅ 正确示例 - Excel字段映射
const FIELD_MAPPINGS = [
  {
    excelField: '集装箱号',
    table: 'biz_containers',           // 使用数据库表名
    field: 'container_number',           // 使用数据库字段名
    required: true
  }
];
```

---

## 📝 命名规范

### 表命名规范

| 表类型 | 前缀 | 示例 | 说明 |
|-------|------|------|------|
| 业务表 | `biz_` | `biz_replenishment_orders` | 存储业务核心数据 |
| 流程表 | `process_` | `process_sea_freight` | 存储流程操作数据 |
| 字典表 | `dict_` | `dict_ports` | 存储基础字典数据 |
| 扩展表 | `ext_` | `ext_container_status_events` | 存储扩展数据 |

### 字段命名规范

```
数据库字段:         snake_case  (order_number, container_number)
实体属性:           camelCase   (orderNumber, containerNumber)
API层(前后端通信):  snake_case  (order_number, container_number) - 对齐数据库
Controller层:       camelCase   (orderNumber, containerNumber) - 用于实体操作
```

**重要原则**:
1. **数据库是唯一基准** - 所有表名和字段名以数据库为准（snake_case）
2. **前端使用数据库命名** - 前端发送数据直接使用数据库表名和字段名（snake_case）
3. **后端自动转换** - 后端接收后自动将 snake_case 转换为 camelCase 用于 TypeORM
4. **不使用 useSnakeCase 参数** - 统一规范，不再做条件判断
5. **统一使用完整表名** - 所有表名使用带前缀的完整名称（如 `biz_replenishment_orders`），不做任何缩写或映射

**转换示例**:
```typescript
// 前端发送（对齐数据库）
{
  "biz_replenishment_orders": {
    "order_number": "24DSC4914",
    "customer_name": "AOSOM CANADA INC."
  }
}

// 后端接收后转换为 camelCase（用于 TypeORM）
{
  "biz_replenishment_orders": {
    "orderNumber": "24DSC4914",
    "customerName": "AOSOM CANADA INC."
  }
}
```

```typescript
// ❌ 错误 - 混用snake_case和camelCase
const container = repository.create(Container, {
  container_number: 'CONT001',  // snake_case - 错误
  orderNumber: 'ORD001',        // camelCase - 正确
  logisticsStatus: 'in_transit'
});

// ✅ 正确 - 全部使用camelCase
const container = repository.create(Container, {
  containerNumber: 'CONT001',   // 实体属性名
  orderNumber: 'ORD001',
  logisticsStatus: 'in_transit'
});
```

### API表名规范

**当前方案**: 前端发送完整表名（如`biz_replenishment_orders`），后端支持两种格式

| 场景 | 表名格式 |
|------|---------|
| 前端发送 | 完整表名（`biz_replenishment_orders`, `process_sea_freight`） |
| 后端处理 | 兼容完整表名和短表名 |
| 后端内部 | 使用短表名（`replenishment_orders`, `sea_freight`） |

**统一命名建议（可选）**:
为减少转换复杂度，建议前端和后端统一使用**短表名**，避免完整表名。

**当前映射关系**:
```typescript
{
  'biz_replenishment_orders' -> 'replenishment_orders',
  'biz_containers' -> 'containers',
  'process_sea_freight' -> 'sea_freight',
  'process_port_operations' -> 'port_operations',
  'process_trucking_transport' -> 'trucking_transports',
  'process_warehouse_operations' -> 'warehouse_operations',
  'process_empty_return' -> 'empty_returns'
}
```

### 字段映射维护规范

**目的**: 确保Excel字段到数据库字段的映射完整、准确、可维护

**维护原则**:
1. **数据库表结构是唯一基准** - 所有字段映射必须参考 `backend/03_create_tables.sql`
2. **完整性优先** - 每个表的所有字段都应该有对应的映射(可选字段可标记为非必填)
3. **命名一致性** - 字段名使用数据库的 snake_case 格式,不要使用别名或简写
4. **同步更新** - 修改数据库表结构时,必须同步更新字段映射
5. **验证机制** - 添加新字段后,必须验证导入数据是否正确

**字段映射维护流程**:

```
1. 新增/修改数据库字段
   ↓
2. 更 docs/CORRECT_FIELD_MAPPINGS.ts (参考文档)
   ↓
3. 更新 frontend/src/views/import/ExcelImport.vue (实际使用)
   ↓
4. 测试导入Excel数据
   ↓
5. 验证数据库中的数据完整性
   ↓
6. 更新开发文档和案例
```

**字段映射检查清单**:

每次添加或修改字段映射时,检查以下内容:

- [ ] 映射配置包含 `excelField` (Excel列名)
- [ ] 映射配置包含 `table` (数据库表名,使用完整表名)
- [ ] 映射配置包含 `field` (数据库字段名,snake_case)
- [ ] 日期字段添加 `transform: parseDate`
- [ ] 数字字段添加 `transform: parseDecimal`
- [ ] 布尔字段添加 `transform: transformBoolean`
- [ ] 参考文档 `docs/CORRECT_FIELD_MAPPINGS.ts` 已同步更新

**示例**:

```typescript
// ✅ 正确的字段映射
{
  excelField: '入库日期',           // Excel列名
  table: 'process_warehouse_operations',  // 完整表名
  field: 'warehouse_arrival_date', // 数据库字段名(snake_case)
  required: false,
  transform: parseDate             // 日期转换函数
}

// ❌ 错误的字段映射
{
  excelField: '入库日期',
  table: 'warehouse_operations',    // 缺少前缀
  field: 'arrivalDate',            // 使用camelCase
  required: false,
  // 缺少transform函数
}
```

**批量验证脚本**:

使用以下脚本验证字段映射的完整性:

```bash
# 1. 检查数据库表结构
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "\d process_trucking_transport"
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "\d process_warehouse_operations"

# 2. 验证导入数据
npx tsx scripts/verify-imported-data.ts FANU3376528

# 3. 检查是否有空记录
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -f scripts/cleanup-invalid-imports.sql
```

**常见问题处理**:

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 字段未导入 | Excel列名与映射不匹配 | 检查Excel列名,确保与 `excelField` 完全一致 |
| 日期为NULL | 日期解析失败 | 添加 `transform: parseDate`,检查Excel日期格式 |
| 数字格式错误 | 数字解析失败 | 添加 `transform: parseDecimal`,检查Excel数字格式 |
| 布尔值错误 | 布尔转换失败 | 添加 `transform: transformBoolean` |

---

### 特殊字段命名

| 字段类型 | 命名模式 | 示例 |
|---------|---------|------|
| 主键 | `{entity}_number` | `order_number`, `container_number` |
| 外键 | `{foreign_table}_number` | `order_number`, `container_type_code` |
| 日期字段 | `{entity}_{event}_date` | `created_at`, `updated_at`, `shipment_date` |
| 时间戳字段 | `{entity}_{event}_time` | `gate_in_time`, `available_time` |
| 布尔字段 | `is_{action}` | `is_unboxing`, `is_rolled` |
| 数量字段 | `{entity}_{unit}` | `total_boxes`, `total_gross_weight` |

---

## 🎨 颜色系统规范

### 核心原则

**禁止硬编码颜色**: 所有颜色必须使用统一的颜色变量系统。

---

### 颜色变量系统

#### 1. 在 SCSS 中使用

**必须**:
- ✅ 在样式文件顶部导入颜色变量：`@use '@/assets/styles/variables' as *;`
- ✅ 使用 SCSS 变量：`$primary-color`, `$success-color`, 等
- ✅ 根据语义选择合适的颜色变量

```scss
// ✅ 正确
@use '@/assets/styles/variables' as *;

.my-button {
  color: $primary-color;
  background-color: $bg-color;
  border-color: $border-base;
}

.status-badge {
  &.success { color: $success-color; }
  &.warning { color: $warning-color; }
  &.danger { color: $danger-color; }
}
```

**禁止**:
- ❌ 硬编码十六进制颜色：`#409EFF`, `#67C23A`, 等
- ❌ 混用大小写：`#409EFF` vs `#409eff`
- ❌ 魔法数字：`rgba(64, 158, 255, 0.1)`

---

#### 2. 在 JS/TS 中使用

**必须**:
- ✅ 导入颜色组合式函数：`import { useColors } from '@/composables/useColors'`
- ✅ 使用颜色对象：`colors.primary`, `colors.success`, 等
- ✅ 使用辅助方法：`colors.getStatusColor(status)`

```typescript
// ✅ 正确
import { useColors } from '@/composables/useColors'

const colors = useColors()

// 基础用法
const buttonStyle = {
  color: colors.primary,
  backgroundColor: colors.bg.color
}

// 业务逻辑
const statusColor = computed(() => {
  return colors.getStatusColor(props.status)
})

// ECharts 配置
const series = [{
  itemStyle: { color: colors.primary }
}]
```

**禁止**:
- ❌ 硬编码颜色字符串：`'#409EFF'`, `'#67C23A'`
- ❌ 在对象中直接写颜色：`color: '#409EFF'`

---

### 颜色分类使用规范

#### 1. 主题色（Primary）

**用途**: 主要操作、按钮、链接、高亮

```scss
// ✅ 正确
.primary-button { color: $primary-color; }
.active-link { color: $primary-color; }
```

#### 2. 功能色（Functional）

| 颜色 | 变量 | 用途 |
|------|------|------|
| 成功 | `$success-color` | 成功状态、确认操作、正常 |
| 警告 | `$warning-color` | 警告状态、注意提醒、即将到期 |
| 危险 | `$danger-color` | 危险状态、删除操作、已超时 |
| 信息 | `$info-color` | 信息提示、次要内容、待处理 |

```scss
// ✅ 正确
.status-badge {
  &.success { background: $success-color; }
  &.warning { background: $warning-color; }
  &.danger { background: $danger-color; }
}
```

#### 3. 中性色（Neutral）

**文字色**:
- `$text-primary`: 主要文字、标题
- `$text-regular`: 常规文字、正文
- `$text-secondary`: 次要文字、辅助说明
- `$text-placeholder`: 占位文字、禁用文本

**背景色**:
- `$bg-color`: 默认背景、卡片背景
- `$bg-page`: 页面背景、容器背景

**边框色**:
- `$border-base`: 基础边框、默认边框
- `$border-light`: 浅色边框、分割线
- `$border-lighter`: 更浅边框、装饰线

```scss
// ✅ 正确
.card {
  background: $bg-color;
  border: 1px solid $border-base;
  color: $text-primary;
}

.page-container {
  background: $bg-page;
}
```

#### 4. 业务色（Business）

**物流状态**:
```typescript
// ✅ 正确 - 使用辅助方法
const statusColor = colors.getStatusColor('shipped')        // $status-shipped (#409EFF)
const statusColor = colors.getStatusColor('at-port')        // $status-at-port (#67C23A)
const statusColor = colors.getStatusColor('picked-up')      // $status-picked-up (#E6A23C)
```

**优先级**:
```typescript
// ✅ 正确 - 使用辅助方法
const priorityColor = colors.getPriorityColor('critical')  // $priority-critical (#F56C6C)
const priorityColor = colors.getPriorityColor('high')       // $priority-high (#E6A23C)
const priorityColor = colors.getPriorityColor('medium')     // $priority-medium (#409EFF)
```

---

### 迁移步骤

#### 1. 新代码强制使用颜色变量

**代码审查检查点**:
- [ ] 样式文件中是否有硬编码颜色值？
- [ ] JS/TS 中是否有硬编码颜色字符串？
- [ ] 是否使用了语义化的颜色变量？

**拒绝规则**:
```typescript
// ❌ 拒绝
.button { color: #409EFF; }
const color = '#409EFF';

// ✅ 接受
@use '@/assets/styles/variables' as *;
.button { color: $primary-color; }
import { useColors } from '@/composables/useColors'
const colors = useColors()
const color = colors.primary
```

#### 2. 逐步迁移现有代码

**迁移顺序**:
1. **核心组件**: Dashboard, Shipments, ContainerDetail
2. **常用组件**: CountdownCard, Timeline, StatusBadge
3. **次要组件**: Settings, About, Help

**迁移工具**:
```bash
# 使用自动迁移脚本
cd frontend
node scripts/migrate-colors.js
```

**手动验证**:
- 检查替换后的文件
- 测试页面显示
- 确认颜色效果正确

---

### 常见错误示例

#### 错误 1: 硬编码颜色

```typescript
// ❌ 错误
const statusColors = {
  shipped: '#409EFF',
  atPort: '#67C23A',
  pickedUp: '#E6A23C'
}

// ✅ 正确
import { useColors } from '@/composables/useColors'
const colors = useColors()
const statusColors = {
  shipped: colors.status.shipped,
  atPort: colors.status.atPort,
  pickedUp: colors.status.pickedUp
}
```

#### 错误 2: 在样式中直接写颜色

```scss
// ❌ 错误
.button {
  color: #409EFF;
  background: #ffffff;
  border: 1px solid #DCDFE6;
}

// ✅ 正确
@use '@/assets/styles/variables' as *;

.button {
  color: $primary-color;
  background: $bg-color;
  border: 1px solid $border-base;
}
```

#### 错误 3: 使用了错误的颜色类型

```scss
// ❌ 错误 - 使用功能色表示物流状态
.status-shipped { color: $success-color; }

// ✅ 正确 - 使用业务色
.status-shipped { color: $status-shipped; }
```

---

### 检查清单

#### 新代码开发
- [ ] 样式文件导入了 `@use '@/assets/styles/variables' as *;`
- [ ] 没有硬编码颜色值
- [ ] 使用了语义化的颜色变量
- [ ] 代码审查已通过

#### 现有代码迁移
- [ ] 使用了迁移脚本
- [ ] 手动检查替换结果
- [ ] 测试页面显示正常
- [ ] 没有引入新的问题

---

### 相关文档

- **[颜色系统使用指南](./COLOR_SYSTEM_GUIDE.md)** - 完整的颜色系统文档
- **[variables.scss](../src/assets/styles/variables.scss)** - 颜色变量定义
- **[useColors.ts](../src/composables/useColors.ts)** - 颜色组合式函数

---

## 🌍 多语言规范

### 核心原则

**禁止硬编码文本**: 所有用户可见的文本必须使用多语言翻译。

- ❌ **错误做法**: 直接在模板中写中文文本
- ✅ **正确做法**: 使用 `$t()` 或 `t()` 函数翻译

**实施规则**:
```vue
<!-- ❌ 错误 -->
<el-button>确认</el-button>
<el-button>删除</el-button>

<!-- ✅ 正确 -->
<el-button>{{ $t('common.confirm') }}</el-button>
<el-button>{{ $t('common.delete') }}</el-button>
```

### 支持的语言

| 语言代码 | 语言名称 | 使用场景 |
|---------|---------|---------|
| `zh-CN` | 简体中文 | 默认语言，中文用户 |
| `en-US` | English | 国际化用户 |
| `ja-JP` | 日本語 | 日本用户 |

### 使用方法

#### 1. 在模板中使用

```vue
<template>
  <div>
    <!-- 简单翻译 -->
    <h1>{{ $t('common.appName') }}</h1>
    <p>{{ $t('common.slogan') }}</p>

    <!-- 带参数的翻译 -->
    <p>{{ $t('user.welcome', { name: userName }) }}</p>

    <!-- 列表翻译 -->
    <span>{{ $t('common.total', { count: items.length }) }}</span>
  </div>
</template>
```

#### 2. 在 Composition API 中使用

```typescript
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 简单翻译
const title = t('common.appName')

// 带参数的翻译
const welcomeMessage = computed(() => t('user.welcome', { name: userName.value }))
</script>
```

#### 3. 动态语言切换

```vue
<script setup lang="ts">
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
</script>

<template>
  <LanguageSwitcher />
</template>
```

### 翻译文件结构

```typescript
// frontend/src/locales/zh-CN.ts
export default {
  // 按模块分组
  common: {
    appName: 'LogiX',
    slogan: '让复杂物流变得简单愉快',
    confirm: '确认',
    cancel: '取消'
  },
  nav: {
    shipments: '货柜',
    system: '系统',
    settings: '设置'
  },
  container: {
    containerNumber: '集装箱号',
    logisticsStatus: '物流状态',
    status: {
      shipped: '已出运',
      atPort: '已到港'
    }
  }
}
```

### 翻译键命名规范

#### 1. 使用嵌套结构

✅ **推荐**:
```typescript
{
  container: {
    status: {
      shipped: '已出运',
      atPort: '已到港'
    }
  }
}
```

❌ **不推荐**:
```typescript
{
  'container.status.shipped': '已出运',
  'container.status.atPort': '已到港'
}
```

#### 2. 使用小写字母和连字符

✅ **推荐**:
```typescript
{
  containerNumber: '集装箱号',
  logisticsStatus: '物流状态',
  orderNumber: '订单号'
}
```

❌ **不推荐**:
```typescript
{
  ContainerNumber: '集装箱号',
  logistics_status: '物流状态',
  order_number: '订单号'
}
```

#### 3. 按功能模块分组

推荐的结构：
```typescript
{
  // 通用
  common: { ... },

  // 导航菜单
  nav: { ... },

  // 用户相关
  user: { ... },

  // 业务模块
  container: { ... },
  order: { ... },
  port: { ... },
  demurrage: { ... },

  // 验证和错误
  validation: { ... },
  error: { ... }
}
```

### 添加新翻译的步骤

#### 1. 在所有语言文件中添加相同的键

**zh-CN.ts**:
```typescript
export default {
  myModule: {
    newKey: '新的翻译文本'
  }
}
```

**en-US.ts**:
```typescript
export default {
  myModule: {
    newKey: 'New translated text'
  }
}
```

**ja-JP.ts**:
```typescript
export default {
  myModule: {
    newKey: '新しい翻訳テキスト'
  }
}
```

#### 2. 在组件中使用

```vue
<template>
  <span>{{ $t('myModule.newKey') }}</span>
</template>
```

### 最佳实践

#### 1. 避免文本拼接

❌ **不推荐**:
```vue
<template>
  <span>{{ $t('welcome') }} {{ userName }}</span>
</template>
```

✅ **推荐**:
```typescript
// 翻译文件
welcome: '欢迎，{name}'

// 组件中
<template>
  <span>{{ $t('user.welcome', { name: userName }) }}</span>
</template>
```

#### 2. 保持所有语言文件结构一致

所有语言的翻译文件必须包含相同的键：

```typescript
// ✅ 正确
// zh-CN.ts
{ container: { status: { shipped: '已出运' } } }

// en-US.ts
{ container: { status: { shipped: 'Shipped' } } }

// ja-JP.ts
{ container: { status: { shipped: '出荷済み' } } }
```

#### 3. 考虑文本长度差异

- 英文通常比中文长约 20-30%
- 日文可能比中文略长
- UI 设计时预留足够空间

```vue
<!-- ✅ 推荐 - 使用弹性布局 -->
<div class="flex items-center">
  <span>{{ $t('some.longText') }}</span>
</div>

<!-- ❌ 不推荐 - 固定宽度可能导致溢出 -->
<div style="width: 100px;">
  <span>{{ $t('some.longText') }}</span>
</div>
```

#### 4. 使用语义化键名

✅ **推荐**:
```typescript
{
  validation: {
    required: '此项为必填项',
    email: '请输入有效的邮箱地址'
  }
}
```

❌ **不推荐**:
```typescript
{
  error1: '此项为必填项',
  error2: '请输入有效的邮箱地址'
}
```

### 代码审查检查清单

#### 新代码开发
- [ ] 所有用户可见文本使用了翻译函数
- [ ] 没有硬编码的中文字符串
- [ ] 翻译键使用了嵌套结构
- [ ] 所有语言文件都添加了对应翻译
- [ ] 测试了语言切换功能

#### 翻译文件维护
- [ ] 新增翻译时，所有语言文件都同步更新
- [ ] 翻译键命名符合规范
- [ ] 使用了语义化的模块分组
- [ ] 翻译文本准确且符合语言习惯

### 常见错误示例

#### 错误 1: 硬编码文本

```vue
<!-- ❌ 错误 -->
<el-button>确认</el-button>

<!-- ✅ 正确 -->
<el-button>{{ $t('common.confirm') }}</el-button>
```

#### 错误 2: 文本拼接

```vue
<!-- ❌ 错误 -->
<template>
  <span>共 {{ count }} 条</span>
</template>

<!-- ✅ 正确 -->
// 翻译文件
total: '共 {count} 条'

// 组件中
<template>
  <span>{{ $t('common.total', { count }) }}</span>
</template>
```

#### 错误 3: 翻译键不一致

```typescript
// ❌ 错误 - 只在中文文件中添加
// zh-CN.ts
{ myModule: { newKey: '新功能' } }

// en-US.ts
// 缺少翻译

// ✅ 正确 - 所有语言都添加
// zh-CN.ts
{ myModule: { newKey: '新功能' } }

// en-US.ts
{ myModule: { newKey: 'New Feature' } }

// ja-JP.ts
{ myModule: { newKey: '新機能' } }
```

### 相关文档

- **[多语言使用指南](./INTERNATIONALIZATION_GUIDE.md)** - 完整的多语言系统文档
- **[locales/](../src/locales/)** - 翻译文件目录
- **[LanguageSwitcher.vue](../src/components/LanguageSwitcher.vue)** - 语言切换组件

---

## 🔑 关键开发步骤

### 新增数据表或字段的完整步骤

#### Step 1: 修改数据库表结构（SQL）

```sql
-- backend/03_create_tables.sql
ALTER TABLE biz_containers
ADD COLUMN new_field VARCHAR(50);
```

#### Step 2: 更新TypeORM实体（TS）

```typescript
// backend/src/entities/Container.ts
@Entity('biz_containers')
export class Container {
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'new_field' })
  newField?: string;
}
```

#### Step 3: 更新后端API（TS）

```typescript
// backend/src/controllers/container.controller.ts
// 如果需要处理新字段，更新DTO和业务逻辑
```

#### Step 4: 更新前端对接（Vue/TS）

```typescript
// frontend/src/views/import/ExcelImport.vue
const FIELD_MAPPINGS = [
  { excelField: '新字段', table: 'biz_containers', field: 'new_field' }
];
```

#### Step 5: 测试验证

```bash
# 1. 重启后端服务
cd backend && npm run dev

# 2. 测试API
curl -X POST http://localhost:3001/containers \
  -H "Content-Type: application/json" \
  -d '{"container_number": "TEST001", "new_field": "value"}'

# 3. 验证数据库
psql -U logix_user -d logix_db -c "SELECT * FROM biz_containers WHERE container_number='TEST001'"
```

---

### 案例4: 日期解析时区转换问题

**问题描述**:
- 所有导入的日期字段比Excel原始数据早1天
- 例如: Excel中`2025-03-30`导入到数据库变成`2025-03-29`
- 影响: 海运、港口、拖卡、仓库、还空箱等所有表的日期字段

**根本原因**:
原`parseDate`函数使用`date.toISOString()`转换日期,引入UTC时区转换:

```typescript
// ❌ 错误的实现
function parseDate(value: any): string | null {
  const date = new Date('2025-03-30')  // 本地时区: 2025-03-30 00:00:00
  return date.toISOString()            // 转为UTC: 2025-03-29T16:00:00.000Z (早1天!)
}
```

**正确做法**:
```typescript
// ✅ 正确的实现 - 避免时区转换
function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split(/[\s-:T]/)
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1  // JavaScript月份从0开始
  const day = parseInt(parts[2], 10)
  const hour = parts[3] ? parseInt(parts[3], 10) : 0
  const minute = parts[4] ? parseInt(parts[4], 10) : 0
  const second = parts[5] ? parseInt(parts[5], 10) : 0

  return new Date(year, month, day, hour, minute, second)
}

function formatDateToLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

function parseDate(value: any): string | null {
  if (!value) return null

  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return isNaN(date.getTime()) ? null : formatDateToLocal(date)
  }

  // 各种格式解析...
  const date = parseLocalDate(dateStr)
  return isNaN(date.getTime()) ? null : formatDateToLocal(date)
}
```

**实施步骤**:
1. 修复`frontend/src/views/import/ExcelImport.vue`中的`parseDate`函数
2. 添加`parseLocalDate`和`formatDateToLocal`辅助函数
3. 删除错误数据并重新导入Excel
4. 验证所有日期字段准确无误

**相关文档**: `docs/DATE_PARSING_FIX.md`

---

## 📊 常用映射参考

### 完整表名映射

| 功能分类 | 数据库表名 | 前端使用 | 实体类 |
|---------|-----------|---------|--------|
| 备货单 | `biz_replenishment_orders` | `biz_replenishment_orders` | `ReplenishmentOrder` |
| 货柜 | `biz_containers` | `biz_containers` | `Container` |
| 海运 | `process_sea_freight` | `process_sea_freight` | `SeaFreight` |
| 港口操作 | `process_port_operations` | `process_port_operations` | `PortOperation` |
| 拖卡运输 | `process_trucking_transport` | `process_trucking_transport` | `TruckingTransport` |
| 仓库操作 | `process_warehouse_operations` | `process_warehouse_operations` | `WarehouseOperation` |
| 还空箱 | `process_empty_returns` | `process_empty_return` | `EmptyReturn` |

### 核心字段映射示例

#### 货柜表 (biz_containers)

| 数据库字段 | 实体属性 | 前端API |
|-----------|---------|---------|
| `container_number` | `containerNumber` | `container_number` |
| `order_number` | `orderNumber` | `order_number` |
| `container_type_code` | `containerTypeCode` | `container_type_code` |
| `cargo_description` | `cargoDescription` | `cargo_description` |
| `logistics_status` | `logisticsStatus` | `logistics_status` |

#### 海运表 (process_sea_freight)

| 数据库字段 | 实体属性 | 前端API |
|-----------|---------|---------|
| `bill_of_lading_number` | `billOfLadingNumber` | `bill_of_lading_number` |
| `vessel_name` | `vesselName` | `vessel_name` |
| `voyage_number` | `voyageNumber` | `voyage_number` |
| `eta` | `eta` | `eta` |
| `ata` | `ata` | `ata` |

#### 港口操作表 (process_port_operations)

| 数据库字段 | 实体属性 | 前端API |
|-----------|---------|---------|
| `container_number` | `containerNumber` | `container_number` |
| `port_type` | `portType` | `port_type` |
| `port_code` | `portCode` | `port_code` |
| `eta_dest_port` | `etaDestPort` | `eta_dest_port` |
| `ata_dest_port` | `ataDestPort` | `ata_dest_port` |

---

## ⚠️ 常见错误与检查清单

### 开发前检查清单

- [ ] 数据库表结构已确认（查询 `information_schema.columns`）
- [ ] TypeORM实体字段已正确映射（使用 `name: 'snake_case'`）
- [ ] 表名使用正确的前缀（`biz_`, `process_`, `dict_`）
- [ ] 所有字段名使用 `snake_case`（数据库和API）

### 开发中检查清单

- [ ] API请求使用 `snake_case` 字段名
- [ ] API响应与前端期望一致
- [ ] 外键关系正确设置
- [ ] 数据类型匹配（String, Number, Date等）

### 测试检查清单

- [ ] 数据能正确插入数据库
- [ ] 无外键约束错误
- [ ] 字段值正确存储
- [ ] API返回数据格式正确

---

## 🚀 快速参考

### 命令速查

```bash
# 查看表结构
psql -U logix_user -d logix_db -c "\d biz_containers"

# 查看表字段
psql -U logix_user -d logix_db -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'biz_containers'
  ORDER BY ordinal_position;
"

# 重启后端服务
cd backend && npm run dev

# 重启前端服务
cd frontend && npm run dev
```

### 调试技巧

```typescript
// 打印接收到的原始数据
console.log('Received data:', JSON.stringify(req.body, null, 2));

// 打印保存前的实体对象
console.log('Before save:', JSON.stringify(entity, null, 2));

// 打印查询结果
console.log('Query result:', JSON.stringify(result, null, 2));

// 数据库查询调试
const sql = queryBuilder.getSql();
console.log('Generated SQL:', sql);
```

---

## 📚 附录

### 数据库表分类

| 分类 | 前缀 | 数量 | 示例 |
|-----|------|------|------|
| 字典表 | `dict_` | 7 | `dict_ports`, `dict_shipping_companies` |
| 业务表 | `biz_` | 3 | `biz_replenishment_orders`, `biz_containers` |
| 流程表 | `process_` | 7 | `process_sea_freight`, `process_port_operations` |
| 扩展表 | `ext_` | 5 | `ext_container_status_events` |
| 系统表 | `sys_` | 6 | `sys_users`, `sys_roles` |

### 7层流转架构

```
备货单 (biz_replenishment_orders)
  ↓
货柜 (biz_containers)
  ↓
海运 (process_sea_freight)
  ↓
港口 (process_port_operations)
  ↓
拖卡 (process_trucking_transport)
  ↓
仓库 (process_warehouse_operations)
  ↓
还空箱 (process_empty_return)
```

---

## 🎯 总结

### 核心原则

1. **数据库表结构是唯一不变基准** - 所有代码必须对齐数据库
2. **命名清晰分离** - 数据库用 `snake_case`，实体用 `camelCase`，API用 `snake_case`
3. **一次做对** - 严格按照流程开发，避免返工
4. **小步快跑** - 每个步骤完成后立即测试验证
5. **举一反三** - 发现问题后检查所有类似模块

### 开发黄金法则

```
先看数据库表结构，再写代码
遇到字段名，先查数据库确认
API字段名，对齐数据库不犹豫
实体属性名，使用camelCase不纠结
Controller层创建实体，必须用camelCase
```
