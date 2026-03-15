---
name: logix-development
description: Develop features for LogiX logistics management system following project standards. Use when implementing new features, fixing bugs, or modifying existing code.
---

# LogiX 项目开发技能

> 📚 **Skills 索引**: 本技能是 LogiX 项目的核心开发技能，其他专用技能请参考 [Skills 索引](../README.md)
>
> - 🔗 **database-query** - 数据库查询专用技能
> - 🔗 **document-processing** - Excel/PDF 文档处理技能
> - 🔗 **excel-import-requirements** - Excel 导入规范（映射、类型转换、主键、模板）
> - 🔗 **code-review** - 代码质量审查技能
> - 🔗 **commit-message** - Git 提交信息生成技能

## 🎯 核心原则（必须遵守）

### 1. 数据库优先原则

```
✅ 唯一基准：数据库表结构是唯一基准
✅ 开发顺序：SQL → 实体 → API → 前端 → 联调
✅ 禁止反向：代码对齐数据库，不反向改库补数据
```

### 2. 数据完整性

```
❌ 禁止临时补丁：不用 UPDATE/INSERT 修补导入错误
✅ 正确流程：删除错误数据 → 修复映射/逻辑 → 重新导入
```

### 3. 日期口径统一

```
✅ 全项目统一：所有数据展示使用顶部日期范围筛选
✅ 后端口径：actual_ship_date（备货单）→ shipment_date（海运）
✅ 页面规范：必须有日期选择器，卡片/表格/图表共用同一套日期
```

---

## 📐 命名与映射规则

### 完整对照表

| 层级           | 规则                  | 示例                                    | 位置                           |
:| -------------- | --------------------- | --------------------------------------- | ------------------------------ |
| **数据库表名** | 前缀 + snake_case     | `biz_containers`, `process_sea_freight` | `backend/03_create_tables.sql` |
| **数据库字段** | snake_case            | `container_number`, `eta_dest_port`     | 同上                           |
| **实体属性**    | camelCase + `@Column`| `containerNumber`                       | `backend/src/entities/`        |
| **API 映射**    | 与数据库一致          | `table: 'process_port_operations'`      | `ExcelImport.vue`              |
| **API 请求体**  | snake_case            | `{ container_number: '...' }`           | Controller 层                  |
| **前端组件**    | PascalCase.vue        | `ContainerDetails.vue`                  | `frontend/src/components/`     |
| **组合式函数**  | use+PascalCase        | `useContainerData`                      | `frontend/src/composables/`    |
| **CSS 类名**    | kebab-case            | `.container-card`                       | `.vue` 文件中                  |

### 表前缀含义

```typescript
dict_; // 字典表：ports, countries, container_types
biz_; // 业务表：containers, replenishment_orders
process_; // 流程表：sea_freight, port_operations
ext_; // 扩展表：status_events, loading_records
```

---

## 🗂️ 项目结构速查

### 数据库表关联链

```mermaid
graph LR
    RO[biz_replenishment_orders] -->|container_number| BC[biz_containers]
    BC -->|bill_of_lading_number| SF[process_sea_freight]
    BC -->|container_number| PO[process_port_operations]
    BC -->|container_number| TT[process_trucking_transport]
    BC -->|container_number| WO[process_warehouse_operations]
    BC -->|container_number| ER[process_empty_return]
```

### 核心实体映射

```typescript
// backend/src/entities/
Container.ts              → biz_containers
ReplenishmentOrder.ts     → biz_replenishment_orders
SeaFreight.ts             → process_sea_freight
PortOperation.ts          → process_port_operations
TruckingTransport.ts      → process_trucking_transport
WarehouseOperation.ts     → process_warehouse_operations
EmptyReturn.ts            → process_empty_return
```

### API 路由（前缀 `/api/v1`）

```typescript
// 集装箱管理
GET    /containers                      // 列表（分页+筛选）
GET    /containers/:id                  // 详情
POST   /containers                      // 创建
PATCH  /containers/:id                  // 更新
DELETE /containers/:id                  // 删除

// 统计相关
GET    /containers/statistics/arrival    // 按到港统计
GET    /containers/statistics/eta        // 按ETA统计
GET    /containers/statistics/planned    // 按计划提柜统计

// 备货单
GET    /replenishment-orders
GET    /replenishment-orders/:id
POST   /replenishment-orders
PATCH  /replenishment-orders/:id
DELETE /replenishment-orders/:id

// 字典表
GET    /dict-manage/types                // 所有字典类型
GET    /dict-manage/:type                // 字典数据列表
GET    /dict-manage/:type/fields        // 字段配置
POST   /dict-manage/:type               // 新增
PUT    /dict-manage/:type/:id           // 更新
DELETE /dict-manage/:type/:id           // 删除
```

---

## 🔧 开发流程

### 1. 新增功能

1. **数据库**：在 `03_create_tables.sql` 添加表/字段
2. **实体**：`backend/src/entities/` 创建或更新 Entity
3. **Controller**：在 `controllers/` 添加 API 方法
4. **前端**：组件开发、API 调用、状态管理

### 2. 修改已有功能

1. **数据库变更**：创建 migration 脚本
2. **实体同步**：更新 Entity 字段
3. **API 调整**：修改 Controller 逻辑
4. **前端适配**：更新组件和调用

### 3. Bug 修复

1. **复现问题**：确认 bug 表现
2. **定位根因**：分析数据流和代码逻辑
3. **修复代码**：从数据源到展示的完整链路
4. **验证修复**：测试确认问题解决

---

## 📋 常见任务速查

### 货柜状态流转

```
not_shipped → shipped → in_transit → at_port → picked_up → unloaded → returned_empty
```

### 滞港费计算条件

- 匹配字段：进口国、目的港、船公司、货代
- 免费天数基准：按到港 / 按卸船
- 多行费用项合计

### 甘特图数据来源

- **按到港**：ATA（实际到港日）> ETA（预计到港日）
- **按计划提柜**：plannedPickupDate
- **按最晚提柜**：lastFreeDate
- **按最晚还箱**：lastReturnDate

---

## ⚠️ 注意事项

1. **所有日期字段必须使用统一的日期筛选器**
2. **修改表结构前先创建 migration 脚本**
3. **导入功能遵循 excel-import-requirements 规范**
4. **前端组件使用 TypeScript 类型定义**
5. **API 响应格式统一：`{ success, data, message? }`**

---

## 📖 参考文档

- 数据库表结构：`backend/03_create_tables.sql`
- 实体定义：`backend/src/entities/`
- API 路由：`backend/src/routes/`
- 前端组件：`frontend/src/views/`
- 项目规范：`.cursor/skills/` 中的各专业技能
