# LogiX 命名规范指南

> **最后更新**: 2026-03-16  
> **适用范围**: 数据库、Backend (TypeScript)、Frontend (Vue 3)  
> **核心原则**: 数据库表结构是唯一基准，各层命名清晰分离

---

## 一、命名规则总览

| 层级             | 命名规则              | 示例                                        |
| ---------------- | --------------------- | ------------------------------------------- |
| **数据库表名**   | `snake_case` + 前缀   | `biz_containers`, `dict_ports`              |
| **数据库字段**   | `snake_case`          | `container_number`, `eta_dest_port`         |
| **实体类名**     | `PascalCase` (单数)   | `Container`, `PortOperation`                |
| **实体属性**     | `camelCase`           | `containerNumber`, `etaDestPort`            |
| **接口**         | `I` + `PascalCase`    | `IContainer`, `IPortOperation`              |
| **类型别名**     | `T` + `PascalCase`    | `TLogisticsStatus`, `TPortType`             |
| **枚举**         | `PascalCase` + `Enum` | `LogisticsStatusEnum`                       |
| **常量**         | `UPPER_SNAKE_CASE`    | `MAX_FREE_DAYS`, `DEFAULT_PORT_SEQUENCE`    |
| **函数/方法**    | `camelCase`           | `fetchContainerList`, `updatePortOperation` |
| **Vue 组件文件** | `PascalCase.vue`      | `ContainerList.vue`                         |
| **Composables**  | `use` + `PascalCase`  | `useContainerData()`                        |
| **CSS 类名**     | `kebab-case`          | `.container-card`, `.port-operation-table`  |

---

## 二、数据库层命名

### 2.1 表名规范

**规则**: `前缀_snake_case`（单数或复数）

```sql
-- ✅ 正确
CREATE TABLE biz_containers (...);              -- 业务表（复数）
CREATE TABLE biz_replenishment_orders (...);    -- 业务表（复数）
CREATE TABLE port_operations (...);             -- 流程表（复数）
CREATE TABLE dict_ports (...);                  -- 字典表（复数）

-- ❌ 错误
CREATE TABLE Containers (...);                  -- PascalCase
CREATE TABLE Port_Operations (...);             -- 混合大小写
CREATE TABLE portoperations (...);              -- 无分隔符
```

**前缀规范**:

- `biz_` - 业务表（如 `biz_containers`, `biz_replenishment_orders`）
- `process_` - 流程表（如 `process_port_operations`, `process_trucking_transport`）
- `dict_` - 字典表（如 `dict_ports`, `dict_shipping_companies`）
- `ext_` - 扩展表（如 `ext_demurrage_standards`, `ext_container_status_events`）

### 2.2 字段名规范

**规则**: `snake_case`（全小写，下划线分隔）

```sql
-- ✅ 正确
container_number VARCHAR(50)
eta_dest_port DATE
ata_dest_port DATE
is_inspection_required BOOLEAN
last_free_date DATE

-- ❌ 错误
containerNumber VARCHAR(50)      -- camelCase
ContainerNumber VARCHAR(50)      -- PascalCase
container_Number VARCHAR(50)     -- 混合大小写
```

**外键字段**: `关联表主键名`

```sql
order_number VARCHAR(50)        -- 关联备货单
container_number VARCHAR(50)    -- 关联货柜
port_code VARCHAR(20)           -- 关联港口字典
```

---

## 三、Backend - TypeScript 实体

### 3.1 实体类名

**规则**: `PascalCase`，对应表名的单数形式

```typescript
// ✅ 正确
@Entity('biz_containers')
export class Container {}

@Entity('port_operations')
export class PortOperation {}

@Entity('dict_ports')
export class DictPort {} // 字典表必须使用 Dict 前缀

// ❌ 错误
@Entity('biz_containers')
export class container {} // 小写开头

@Entity('dict_ports')
export class Port {} // 缺少 Dict 前缀
```

### 3.2 实体属性

**规则**: `camelCase` + `@Column({ name: 'snake_case' })`

```typescript
@Entity('port_operations')
export class PortOperation {
  @PrimaryGeneratedColumn()
  id: number

  // ✅ 正确：camelCase + name 注解
  @Column({ name: 'container_number' })
  containerNumber: string

  @Column({ name: 'eta_dest_port' })
  etaDestPort: Date

  @Column({ name: 'is_inspection_required' })
  isInspectionRequired: boolean

  // ❌ 错误：直接使用 snake_case
  @Column()
  container_number: string // 应该使用 camelCase
}
```

### 3.3 接口定义

**规则**: `I` + `PascalCase`

```typescript
// ✅ 正确
export interface IContainer {
  containerNumber: string
  logisticsStatus: LogisticsStatusEnum
  orderNumber?: string
}

export interface IPortOperation {
  id: number
  containerNumber: string
  portType: 'origin' | 'transit' | 'destination'
  portSequence: number
}

// ❌ 错误
export interface Container {} // 缺少 I 前缀
export interface iContainer {} // 小写开头
```

### 3.4 类型别名

**规则**: `T` + `PascalCase`

```typescript
// ✅ 正确
export type TLogisticsStatus =
  | 'not_shipped'
  | 'in_transit'
  | 'at_port'
  | 'picked_up'
  | 'unloaded'
  | 'returned_empty'

export type TPortType = 'origin' | 'transit' | 'destination'

// ❌ 错误
export type LogisticsStatus = '...' // 缺少 T 前缀
export type tLogisticsStatus = '...' // 小写开头
```

### 3.5 枚举

**规则**: `PascalCase` + `Enum` 后缀

```typescript
// ✅ 正确
export enum LogisticsStatusEnum {
  NOT_SHIPPED = 'not_shipped',
  IN_TRANSIT = 'in_transit',
  AT_PORT = 'at_port',
  PICKED_UP = 'picked_up',
  UNLOADED = 'unloaded',
  RETURNED_EMPTY = 'returned_empty',
}

export enum PortTypeEnum {
  ORIGIN = 'origin',
  TRANSIT = 'transit',
  DESTINATION = 'destination',
}

// ❌ 错误
export enum LogisticsStatus {} // 缺少 Enum 后缀
export enum logisticsStatusEnum {} // 小写开头
```

### 3.6 常量

**规则**: `UPPER_SNAKE_CASE`

```typescript
// ✅ 正确
export const MAX_FREE_DAYS = 7
export const DEFAULT_PORT_SEQUENCE = 1
export const STORAGE_CHARGE_RATE = 10.5

// ❌ 错误
export const maxFreeDays = 7 // camelCase
export const Max_Free_Days = 7 // 混合大小写
```

### 3.7 函数和方法

**规则**: `camelCase`

```typescript
// ✅ 正确
export async function findContainerByNumber(containerNumber: string) {
  // ...
}

public async updatePortOperation(id: number, data: Partial<IPortOperation>) {
  // ...
}

// ❌ 错误
export async function FindContainer(...) { }   // PascalCase
export async function find_container(...) { }  // snake_case
```

---

## 四、Frontend - Vue 3

### 4.1 组件文件名

**规则**: `PascalCase.vue`

```
src/views/
├── ContainerList.vue          ✅ 正确
├── PortOperationsTab.vue      ✅ 正确
├── SankeyDiagram.vue          ✅ 正确

├── containerList.vue          ❌ 错误（小写开头）
├── Container-list.vue         ❌ 错误（连字符）
├── container_list.vue         ❌ 错误（下划线）
```

### 4.2 组合式函数 (Composables)

**规则**: `use` + `PascalCase`

```typescript
// ✅ 正确
// composables/useContainerData.ts
export function useContainerData() {
  const containers = ref<IContainer[]>([])
  return { containers }
}

export function usePortOperations(containerNumber: string) {
  const operations = ref<IPortOperation[]>([])
  return { operations }
}

// ❌ 错误
export function containerData() {} // 缺少 use 前缀
export function use_container_data() {} // snake_case
export function UseContainerData() {} // 大写 use
```

### 4.3 API 请求函数

**规则**: 动作 + `PascalCase`

```typescript
// ✅ 正确
export async function fetchContainerList(params: {
  page?: number
  pageSize?: number
}): Promise<IPaginatedResponse<IContainer>> {}

export async function fetchContainerByNumber(number: string): Promise<IContainer> {}

export async function createContainer(data: ICreateContainerDto): Promise<IContainer> {}

export async function updateContainer(
  number: string,
  data: IUpdateContainerDto
): Promise<IContainer> {}

export async function deleteContainer(number: string): Promise<void> {}

// ❌ 错误
export async function getContainerList() {} // 应该用 fetch
export async function Containers() {} // 缺少动作前缀
export async function fetch_containers() {} // snake_case
```

### 4.4 CSS 类名

**规则**: `kebab-case`

```vue
<template>
  <!-- ✅ 正确 -->
  <div class="container-card">
    <div class="container-header">
      <span class="container-number">{{ containerNumber }}</span>
    </div>
    <div class="port-operation-table">
      <!-- ... -->
    </div>
  </div>

  <!-- ❌ 错误 -->
  <div class="containerCard">           <!-- camelCase -->
  <div class="container_card">          <!-- snake_case -->
  <div class="ContainerCard">           <!-- PascalCase -->
</template>

<style scoped>
/* ✅ 正确 */
.container-card {
  padding: 16px;
}

.container-number {
  font-weight: bold;
}

/* ❌ 错误 */
.containerCard { }     /* camelCase */
.container_card { }    /* snake_case */
</style>
```

---

## 五、命名转换映射表

### 5.1 跨层命名对照

| 数据库字段               | 实体属性               | TypeScript 接口        | 前端变量               | CSS 类                   |
| ------------------------ | ---------------------- | ---------------------- | ---------------------- | ------------------------ |
| `container_number`       | `containerNumber`      | `containerNumber`      | `containerNumber`      | `container-number`       |
| `eta_dest_port`          | `etaDestPort`          | `etaDestPort`          | `etaDestPort`          | `eta-dest-port`          |
| `ata_dest_port`          | `ataDestPort`          | `ataDestPort`          | `ataDestPort`          | `ata-dest-port`          |
| `is_inspection_required` | `isInspectionRequired` | `isInspectionRequired` | `isInspectionRequired` | `is-inspection-required` |
| `last_free_date`         | `lastFreeDate`         | `lastFreeDate`         | `lastFreeDate`         | `last-free-date`         |

### 5.2 核心表名映射

| 表名 (snake_case)              | 实体类 (PascalCase)    | 说明         |
| ------------------------------ | ---------------------- | ------------ |
| `biz_containers`               | `Container`            | 货柜表       |
| `biz_replenishment_orders`     | `ReplenishmentOrder`   | 备货单表     |
| `biz_customers`                | `Customer`             | 客户表       |
| `port_operations`              | `PortOperation`        | 港口操作表   |
| `sea_freights`                 | `SeaFreight`           | 海运表       |
| `process_trucking_transport`   | `TruckingTransport`    | 拖卡运输表   |
| `process_warehouse_operations` | `WarehouseOperation`   | 仓库操作表   |
| `empty_returns`                | `EmptyReturn`          | 还空箱表     |
| `dict_ports`                   | `DictPort`             | 港口字典     |
| `dict_shipping_companies`      | `DictShippingCompany`  | 船公司字典   |
| `dict_container_types`         | `DictContainerType`    | 柜型字典     |
| `dict_freight_forwarders`      | `DictFreightForwarder` | 货代字典     |
| `dict_customs_brokers`         | `DictCustomsBroker`    | 清关行字典   |
| `dict_trucking_companies`      | `DictTruckingCompany`  | 拖车公司字典 |
| `dict_warehouses`              | `DictWarehouse`        | 仓库字典     |

---

## 六、API 数据流转约定

### 6.1 请求体规范

**原则**: API 请求体使用 `snake_case`（与数据库对齐）

```typescript
// 前端发送请求（使用 snake_case）
const payload = {
  container_number: 'MRKU4896861',
  container_type_code: '40HC',
  logistics_status: 'in_transit',
}

await api.post('/containers', payload)
```

### 6.2 后端处理流程

```typescript
// Backend Controller
@Post('/containers')
async createContainer(@Body() req: Request) {
  // 1. 将 snake_case 转为 camelCase
  const data = snakeToCamel(req.body);

  // 2. 创建实体（使用 camelCase 属性）
  const container = this.containerRepository.create({
    containerNumber: data.containerNumber,
    containerTypeCode: data.containerTypeCode,
    logisticsStatus: data.logisticsStatus
  });

  // 3. 保存到数据库
  return await this.containerRepository.save(container);
}
```

### 6.3 响应格式

```typescript
// 后端返回（自动序列化为 snake_case）
{
  "success": true,
  "data": {
    "container_number": "MRKU4896861",
    "logistics_status": "in_transit",
    "eta_dest_port": "2024-03-20"
  }
}
```

---

## 七、快速检查清单

### Backend 提交前检查

- [ ] 实体类名是 `PascalCase` 且对应表名单数形式
- [ ] 字典实体使用 `Dict` 前缀（如 `DictPort`）
- [ ] 实体属性使用 `camelCase` 并通过 `@Column({ name: 'xxx' })` 映射
- [ ] 接口使用 `I` 前缀 + `PascalCase`（如 `IContainer`）
- [ ] 类型使用 `T` 前缀 + `PascalCase`（如 `TLogisticsStatus`）
- [ ] 枚举使用 `Enum` 后缀 + `PascalCase`（如 `LogisticsStatusEnum`）
- [ ] 常量使用 `UPPER_SNAKE_CASE`（如 `MAX_FREE_DAYS`）
- [ ] 函数使用 `camelCase`（如 `fetchContainerList`）

### Frontend 提交前检查

- [ ] 组件文件名是 `PascalCase.vue`（如 `ContainerList.vue`）
- [ ] 组合式函数使用 `use` + `PascalCase`（如 `useContainerData`）
- [ ] CSS 类名使用 `kebab-case`（如 `.container-card`）
- [ ] API 函数使用 `fetch/create/update/delete` + `PascalCase`
- [ ] Props 接口以 `Props` 结尾（如 `ContainerCardProps`）
- [ ] Emits 接口以 `Emits` 结尾（如 `ContainerCardEmits`）

---

## 八、Lint 配置与自动化

### 运行命名检查

```bash
# 检查所有命名规范
npm run lint:naming

# 只检查 Backend
npm run lint:naming:backend

# 只检查 Frontend
npm run lint:naming:frontend

# 自动修复（可修复部分问题）
npm run lint:fix
```

### ESLint 配置文件

- Backend: `backend/.eslintrc.naming.js`
- Frontend: `frontend/.eslintrc.naming.js`
- 自定义规则：`backend/eslint-plugin-custom-naming-rules.js`

---

## 九、常见错误案例

### 错误 1: 混用命名规则

```typescript
// ❌ 错误：在同一个文件中混用多种命名规则
@Entity('biz_containers')
export class Container {
  @Column()
  container_number: string // snake_case（错误）

  @Column({ name: 'logistics_status' })
  logisticsStatus: string // camelCase（正确）
}
```

**修正**:

```typescript
// ✅ 正确：统一使用 camelCase + name 注解
@Entity('biz_containers')
export class Container {
  @Column({ name: 'container_number' })
  containerNumber: string

  @Column({ name: 'logistics_status' })
  logisticsStatus: string
}
```

### 错误 2: 接口命名缺少前缀

```typescript
// ❌ 错误
export interface Container {
  containerNumber: string
}

// ✅ 正确
export interface IContainer {
  containerNumber: string
}
```

### 错误 3: CSS 类名使用 camelCase

```vue
<!-- ❌ 错误 -->
<template>
  <div class="containerCard">
    <div class="containerHeader">
      <!-- ... -->
    </div>
  </div>
</template>

<!-- ✅ 正确 -->
<template>
  <div class="container-card">
    <div class="container-header">
      <!-- ... -->
    </div>
  </div>
</template>
```

---

## 十、相关文档

- [代码规范](./01-code-style.md) - 完整的代码风格指南
- [颜色系统指南](./03-color-system.md) - 颜色命名和使用规范
- [国际化指南](./04-i18n-guide.md) - 多语言文件和键名规范
- [Lint 使用指南](./05-lint-usage.md) - ESLint 配置和使用说明

---

**维护者**: Tech Lead  
**审查频率**: 季度审查  
**最后更新**: 2026-03-16
