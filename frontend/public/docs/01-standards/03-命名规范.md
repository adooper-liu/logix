# LogiX 命名规范 (Naming Conventions)

本文档定义了 LogiX 项目的统一命名规范，涵盖数据库、实体类、API 和前端组件。

---

## 📊 数据库层

### 表名 (Table Names)

**规则**: `snake_case`

```sql
-- ✅ 正确
CREATE TABLE port_operations (...);
CREATE TABLE replenishment_orders (...);
CREATE TABLE containers (...);

-- ❌ 错误
CREATE TABLE PortOperations (...);
CREATE TABLE Port_Operations (...);
CREATE TABLE portOperations (...);
```

**特殊表类型**:
- 字典表: `dict_xxx` (如 `dict_ports`, `dict_shipping_companies`)
- 流程表: `process_xxx` (如 `process_trucking_transport`, `process_warehouse_operations`)
- 业务表: 业务实体名复数 (如 `containers`, `replenishment_orders`)

### 字段名 (Column Names)

**规则**: `snake_case`

```sql
-- ✅ 正确
container_number VARCHAR(50)
eta_dest_port DATE
is_inspection_required BOOLEAN

-- ❌ 错误
containerNumber VARCHAR(50)
EtaDestPort DATE
isInspectionRequired BOOLEAN
```

**外键命名**: `foreign_table_id`
```sql
order_number VARCHAR(50)        -- 备货单号
container_number VARCHAR(50)    -- 集装箱号
```

---

## 🔷 Backend - TypeScript 实体

### 实体类名 (Entity Class Names)

**规则**: `PascalCase`，对应表名的单数形式

```typescript
// ✅ 正确
@Entity('port_operations')
export class PortOperation { }

@Entity('replenishment_orders')
export class ReplenishmentOrder { }

@Entity('containers')
export class Container { }

// ❌ 错误
@Entity('port_operations')
export class portOperation { }  // 小写开头

@Entity('port_operations')
export class Port_Operation { } // 包含下划线
```

**字典实体**: 必须使用 `Dict` 前缀
```typescript
// ✅ 正确
@Entity('dict_ports')
export class DictPort { }

@Entity('dict_shipping_companies')
export class DictShippingCompany { }

// ❌ 错误
@Entity('dict_ports')
export class Port { }  // 缺少 Dict 前缀
```

### 实体属性名 (Entity Properties)

**规则**: `camelCase`，映射到数据库的 `snake_case` 字段

```typescript
@Entity('port_operations')
export class PortOperation {
  // ✅ 正确
  @Column({ name: 'container_number' })
  containerNumber: string;

  @Column({ name: 'eta_dest_port' })
  etaDestPort: Date;

  @Column({ name: 'is_inspection_required' })
  isInspectionRequired: boolean;

  // ❌ 错误（缺少 @Column name 注解时使用 snake_case）
  @Column()
  container_number: string;  // 应该使用 camelCase

  // ✅ 正确方式 1: camelCase + name 注解
  @Column({ name: 'container_number' })
  containerNumber: string;

  // ✅ 正确方式 2: 使用装饰器自动转换（如果配置了）
  @Column()
  containerNumber: string;  // 自动映射到 container_number
}
```

### 接口和类型 (Interfaces & Types)

**接口**: `PascalCase` + `I` 前缀

```typescript
// ✅ 正确
export interface IContainer {
  containerNumber: string;
  logisticsStatus: LogisticsStatusEnum;
}

export interface IPortOperation {
  portType: 'origin' | 'transit' | 'destination';
  portSequence: number;
}

// ❌ 错误
export interface Container { }           // 缺少 I 前缀
export interface icontainer { }          // 小写开头
export interface I_container { }        // 包含下划线
```

**类型别名**: `PascalCase` + `T` 前缀

```typescript
// ✅ 正确
export type TLogisticsStatus = 'not_shipped' | 'in_transit' | 'at_port';
export type TPortType = 'origin' | 'transit' | 'destination';

// ❌ 错误
export type LogisticsStatus = '...';     // 缺少 T 前缀
export type tLogisticsStatus = '...';    // 小写开头
```

### 枚举 (Enums)

**规则**: `PascalCase` + `Enum` 后缀

```typescript
// ✅ 正确
export enum LogisticsStatusEnum {
  NOT_SHIPPED = 'not_shipped',
  IN_TRANSIT = 'in_transit',
  AT_PORT = 'at_port',
  PICKED_UP = 'picked_up',
  UNLOADED = 'unloaded',
  RETURNED_EMPTY = 'returned_empty'
}

export enum PortTypeEnum {
  ORIGIN = 'origin',
  TRANSIT = 'transit',
  DESTINATION = 'destination'
}

// ❌ 错误
export enum LogisticsStatus { }         // 缺少 Enum 后缀
export enum logisticsStatusEnum { }       // 小写开头
```

### 常量 (Constants)

**规则**: `UPPER_SNAKE_CASE`

```typescript
// ✅ 正确
export const MAX_FREE_DAYS = 7;
export const DEFAULT_PORT_SEQUENCE = 1;
export const STORAGE_CHARGE_RATE = 10.50;

// ❌ 错误
export const maxFreeDays = 7;           // camelCase
export const Max_Free_Days = 7;         // 混合大小写
```

### 函数和方法 (Functions & Methods)

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

## 🎨 Frontend - Vue 3

### 组件文件名 (Component File Names)

**规则**: `PascalCase`

```
src/views/
├── ContainerList.vue          ✅ 正确
├── PortOperationsTab.vue      ✅ 正确
├── SankeyDiagram.vue          ✅ 正确

├── containerList.vue          ❌ 错误（小写开头）
├── Container-list.vue         ❌ 错误（包含连字符）
├── container_list.vue         ❌ 错误（下划线）
```

### 组件定义名 (Component Definition Names)

**规则**: `PascalCase`

```typescript
// ✅ 正确
<script setup lang="ts">
defineOptions({
  name: 'ContainerList'
})
</script>

<script lang="ts">
export default defineComponent({
  name: 'PortOperationsTab',
  // ...
})
</script>

// ❌ 错误
defineOptions({
  name: 'containerList'  // 小写开头
})
```

### 组合式函数 (Composables)

**规则**: `use` + `PascalCase`

```typescript
// ✅ 正确
// composables/useContainerData.ts
export function useContainerData() {
  // ...
}

// composables/usePortOperations.ts
export function usePortOperations(containerNumber: string) {
  // ...
}

// ❌ 错误
export function useContainerData() { }      // ✅ 正确
export function containerData() { }          // ❌ 缺少 use 前缀
export function use_container_data() { }    // ❌ snake_case
export function UseContainerData() { }       // ❌ 大写 use
```

### Props 和 Emits 定义

**规则**: `camelCase` + `Props`/`Emits` 后缀

```typescript
// ✅ 正确
interface ContainerCardProps {
  containerNumber: string;
  showActions?: boolean;
}

interface ContainerCardEmits {
  (e: 'edit', container: IContainer): void;
  (e: 'delete', containerNumber: string): void;
}

// ❌ 错误
interface containerCardProps { }        // 小写开头
interface ContainerCard { }            // 缺少 Props 后缀
```

### CSS 类名 (CSS Class Names)

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
  <div class="container_card">         <!-- snake_case -->
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
.containerCard { }     <!-- camelCase -->
.container_card { }   <!-- snake_case -->
</style>
```

### API 请求函数 (API Functions)

**规则**: 动作 + `PascalCase`

```typescript
// ✅ 正确
export async function fetchContainerList() { }
export async function fetchContainerByNumber(number: string) { }
export async function createContainer(data: ICreateContainerDto) { }
export async function updateContainer(number: string, data: IUpdateContainerDto) { }
export async function deleteContainer(number: string) { }

// ❌ 错误
export async function getContainerList() { }      // 应该用 fetch
export async function Containers() { }            // 缺少动作前缀
export async function fetch_containers() { }       // snake_case
```

---

## 🔄 命名转换映射表

| 层级 | 数据库 | 实体/接口 | 前端变量 | 样式类 |
|------|--------|-----------|----------|--------|
| **格式** | `snake_case` | `PascalCase` | `camelCase` | `kebab-case` |
| **示例** | `container_number` | `ContainerNumber` | `containerNumber` | `container-number` |
| **字段** | `eta_dest_port` | `EtaDestPort` | `etaDestPort` | `eta-dest-port` |
| **表名** | `port_operations` | `PortOperation` | `portOperation` | `port-operation` |

---

## ✅ 快速检查清单

提交代码前，请检查：

### Backend
- [ ] 实体类名是 `PascalCase` 且对应表名单数形式
- [ ] 字典实体使用 `Dict` 前缀
- [ ] 实体属性使用 `camelCase` 并通过 `@Column({ name: 'xxx' })` 映射
- [ ] 接口使用 `I` 前缀 + `PascalCase`
- [ ] 类型使用 `T` 前缀 + `PascalCase`
- [ ] 枚举使用 `Enum` 后缀 + `PascalCase`
- [ ] 常量使用 `UPPER_SNAKE_CASE`

### Frontend
- [ ] 组件文件名是 `PascalCase`
- [ ] 组合式函数使用 `use` + `PascalCase`
- [ ] CSS 类名使用 `kebab-case`
- [ ] API 函数使用 `fetch/create/update/delete` + `PascalCase`

---

## 🛠️ Lint 配置

项目已配置 ESLint 自定义规则自动检查这些命名规范：

```bash
# 检查命名规范
npm run lint:backend    # Backend 命名检查
npm run lint:frontend   # Frontend 命名检查

# 自动修复（可修复部分问题）
npm run lint:fix:backend
npm run lint:fix:frontend
```

详细配置见：
- Backend: `backend/.eslintrc.naming.js`
- Frontend: `frontend/.eslintrc.naming.js`
- 自定义规则: `backend/eslint-plugin-custom-naming-rules.js`
