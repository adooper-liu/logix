# LogiX 开发规范

## 核心原则（必须遵守）

### 1. 数据库表结构是唯一基准
- 所有表名、字段名以`backend/sql/schema/03_create_tables.sql`为准
- 代码与API对齐数据库，不反向改库补数据
- 新增或修改表/字段时：先改SQL → 再改实体 → 再改API → 最后改前端

### 2. 禁止临时补丁修数据
- 导入错误时：删除错误数据 → 修映射/逻辑 → 重新导入
- 禁止用临时SQL UPDATE/INSERT修补

### 3. 开发顺序
```
数据库表设计(SQL) → TypeORM实体(TS) → 后端API(TS) → 前端对接(Vue/TS) → 联调
```

---

## 命名规范

### 数据库层
| 层级 | 规则 | 示例 |
|------|------|------|
| 表名 | `prefix_` + snake_case | `biz_containers`, `process_sea_freight` |
| 字段名 | snake_case | `container_number`, `eta_dest_port` |
| 主键 | 统一用`id`或业务唯一键 | `container_number`, `bill_of_lading_number` |

### TypeORM实体层
```typescript
@Entity({ name: 'biz_containers' })
export class Container {
  @PrimaryColumn()
  containerNumber: string;  // camelCase
  
  @Column({ name: 'bill_of_lading_number' })
  billOfLadingNumber: string;  // @Column指定数据库字段名
}
```

**规则**：
- 实体属性：camelCase
- `@Column({ name: 'snake_case' })` 映射到数据库字段

### API层
**请求体格式**：snake_case（与数据库对齐）
```json
{
  "container_number": "MSKU1234567",
  "eta_dest_port": "2026-06-25"
}
```

**后端处理**：对body做`snakeToCamel`转换后写实体  
**前端处理**：对payload做`camelToSnake`转换后发送

### 前端层
| 类型 | 规则 | 示例 |
|------|------|------|
| 组件文件名 | PascalCase.vue | `ContainerDetails.vue` |
| 组合式函数 | use + PascalCase | `useContainerData.ts` |
| CSS类名 | kebab-case | `.container-card` |
| 变量/函数 | camelCase | `const containerList = ref([])` |

---

## 前端规范

### 颜色使用
❌ **禁止硬编码色值**
```vue
<!-- 错误 -->
<div style="color: #ff0000">
```

✅ **正确做法**
```scss
// SCSS中使用变量
@use '@/assets/styles/variables' as *;
.container-card { color: $color-danger; }
```

```typescript
// JS/TS中使用hook
import { useColors } from '@/composables/useColors';
const { dangerColor } = useColors();
```

### 文案国际化
❌ **禁止硬编码中文**
```vue
<template>
  <span>货柜列表</span>
</template>
```

✅ **正确使用$t()**
```vue
<template>
  <span>{{ $t('container.list') }}</span>
</template>
```

### 性能优化
- **搜索输入**：必须防抖（debounce 300ms）
- **长列表**：虚拟滚动或分页（每页≤50条）
- **API调用**：考虑缓存（Pinia store或SWR）

---

## 单一职责与组件拆分

### 文件大小限制
- **Vue组件**：单文件 > 300行 → 拆分子组件
- **TS逻辑**：单文件 > 200行 → 拆成composable或utils

### 前端拆分原则
```
页面组件（布局编排）
├── 子组件1（具体展示）
├── 子组件2（交互逻辑）
└── composables/（复用逻辑）
    ├── useXxxData.ts（数据获取）
    └── useXxxLogic.ts（业务逻辑）
```

### 后端拆分原则
```
Controller（参数校验+路由）
└── Service（业务逻辑）
    ├── XxxService.ts（主服务）
    └── utils/（工具函数）
        └── calculateXxx.ts（复杂计算）
```

### 命名体现职责
- ✅ `CountdownCard.vue` - 倒计时卡片
- ✅ `useContainerStats.ts` - 货柜统计逻辑
- ✅ `getContainersByFilter.ts` - 按条件查询货柜
- ❌ `Component1.vue` - 无意义命名

---

## 数据展示与顶部日期

### 全项目统一约定
- **所有数据展示**（列表、统计卡片、图表等）均以**顶部日期范围**为筛选条件
- **对应数据库字段**：`actual_ship_date`（备货单出运日期）或`shipment_date`（海运出运日期）
- **必须有可见的日期范围选择器**
- **同一页内**：卡片、表格、图表共用同一套日期，不得出现「统计用全量、列表用日期」

### 后端口径
```typescript
// DateFilterBuilder.ts
if (actualShipDate) {
  return actualShipDate;  // 优先备货单实际出运日期
} else {
  return shipmentDate;    // 备用海运出运日期
}
```

---

## 代码风格

### TypeScript
- 缩进：2空格
- 引号：单引号
- 分号：加分号
- 行宽：约120字符
- 禁止any类型（除非第三方库）

### Vue
- 缩进：2空格
- 引号：单引号
- 分号：无分号
- 行宽：约100字符
- 优先Composition API + `<script setup>`

### 通用规则
- ❌ 禁止提交console.log
- ❌ 禁止硬编码魔法数字（提取为常量）
- ✅ 优先明确类型定义
- ✅ 函数名动词开头（get/create/update/delete）

---

## Lint检查

```bash
# 根目录执行
npm run lint          # ESLint检查
npm run type-check    # TypeScript类型检查
npm run validate      # 完整验证
```

---

## 参考文档

- 详细规范：见.qoder/rules/logix-development-standards.mdc
- 命名细则：见.qoder/skills/01-business/logix-business-knowledge/Skill.md

---

**维护者**: LogiX Team  
**最后更新**: 2026-06-23
