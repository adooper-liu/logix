# Shipments 表格组件重构 SKILL 准则

## 📋 核心原则

### 原则一：数据库字段为唯一权威源

**强制要求**:

1. **表名必须与数据库一致**
   - 使用 `biz_containers` 而非自定义名称
   - 所有关联表名以 `03_create_tables.sql` 为准

2. **字段名必须与数据库一致**
   - 数据库 `container_number` → 前端属性 `containerNumber` (通过 ORM 映射)
   - 禁止创造不存在的字段
   - 所有字段必须在数据库表中有定义

3. **类型定义必须反映数据库结构**
   - 使用 TypeORM 实体作为类型基准
   - 可选字段用 `?` 标注
   - 日期类型统一用 `string` (ISO 格式)

**验证方法**:
```typescript
// ✅ 正确：基于实体定义
import type { Container } from '@/entities/Container'
type ContainerRecord = Pick<Container, 'containerNumber' | 'billOfLadingNumber'>

// ❌ 错误：凭空创造字段
interface Container {
  containerNo: string // 数据库无此字段
}
```

---

### 原则二：零破坏性重构

**强制要求**:

1. **保持现有功能完整**
   - 所有现有列必须保留
   - 所有排序、筛选、分页功能必须正常
   - 所有按钮事件必须正常工作

2. **向后兼容**
   - Props 接口设计要通用
   - 支持渐进式迁移
   - 保留原有插槽和自定义内容

3. **可回滚**
   - 新旧代码并存一段时间
   - 通过开关控制使用新版本
   - 出现问题可立即回滚

**实施策略**:
```vue
<!-- 过渡期：新旧并存 -->
<template>
  <!-- 旧版本（待删除） -->
  <el-table v-if="!useNewTable" ...>...</el-table>
  
  <!-- 新版本（默认隐藏） -->
  <ContainerTable v-else ... />
</template>
```

---

### 原则三：单一职责与微组件化

**强制要求**:

1. **一个组件只做一类事**
   - ContainerTable: 只负责表格渲染
   - ContainerNumberColumn: 只负责柜号列显示
   - useContainerTable: 只负责表格逻辑

2. **文件大小限制**
   - Vue 组件 < 300 行
   - Composable < 200 行
   - 超过限制必须拆分

3. **职责边界清晰**
   - 页面容器：数据获取、状态管理
   - 表格组件：数据展示、用户交互
   - 列组件：单列渲染逻辑

**文件结构**:
```
shipments/
├── Shipments.vue (页面容器 - ~800 行)
├── components/
│   ├── ContainerTable.vue (~250 行)
│   ├── columns/
│   │   ├── ContainerNumberColumn.vue (~80 行)
│   │   ├── BillOfLadingColumn.vue (~60 行)
│   │   ├── DateGroupColumn.vue (~100 行)
│   │   └── ActionsColumn.vue (~80 行)
│   └── composables/
│       └── useContainerTable.ts (~180 行)
```

---

### 原则四：TypeScript 类型安全

**强制要求**:

1. **所有 Props 必须有类型定义**
   ```typescript
   interface ContainerTableProps {
     data: readonly ContainerRecord[]
     loading: boolean
     pagination: PaginationParams
     // ...
   }
   ```

2. **所有 Emits 必须有类型签名**
   ```typescript
   interface ContainerTableEmits {
     (e: 'update:page', page: number): void
     (e: 'sort-change', sort: SortParams): void
     // ...
   }
   ```

3. **禁止使用 any**
   - 未知类型用 `unknown`
   - 泛型约束用 `extends`
   - 联合类型明确所有可能值

4. **使用 JSDoc 注释**
   ```typescript
   /**
    * 货柜记录类型
    * 对应数据库表：biz_containers
    */
   export interface ContainerRecord {
     /** 集装箱号 (数据库字段：container_number) */
     containerNumber: string
   }
   ```

---

### 原则五：测试驱动开发

**强制要求**:

1. **先写测试用例**
   - 列出所有需要测试的功能点
   - 定义预期行为和输出
   - 准备 Mock 数据

2. **单元测试覆盖率**
   - 核心逻辑 > 80%
   - Composables > 90%
   - 工具函数 100%

3. **集成测试必做**
   - 表格渲染完整性
   - 分页排序功能
   - 事件触发正确性

**测试清单**:
```typescript
describe('ContainerTable', () => {
  it('应正确渲染所有可见列')
  it('分页切换应触发 update:page 事件')
  it('排序变化应触发 sort-change 事件')
  it('选择行应触发 selection-change 事件')
  it('展开行应正确显示详情')
  // ... 至少 20 个测试用例
})
```

---

### 原则六：性能优先

**强制要求**:

1. **大数据量优化**
   - 100+ 条记录考虑虚拟滚动
   - 使用 `key` 优化列表渲染
   - 避免不必要的计算属性

2. **内存管理**
   - 及时清理定时器
   - 移除事件监听器
   - 避免闭包引用泄漏

3. **响应式优化**
   - 使用 `shallowRef` 处理大对象
   - 避免深层嵌套响应式
   - 合理使用 `markRaw`

**性能指标**:
- 首次渲染 < 500ms
- 分页切换 < 200ms
- 内存占用 < 50MB

---

### 原则七：文档同步

**强制要求**:

1. **组件文档必备**
   - Props 说明
   - Events 说明
   - Slots 说明（如有）
   - 使用示例

2. **类型注释完整**
   - 所有导出类型有 JSDoc
   - 复杂逻辑有实现说明
   - 数据库字段映射关系

3. **更新迁移指南**
   - Breaking Changes 说明
   - 迁移步骤
   - 常见问题

**文档模板**:
```markdown
# ContainerTable 组件

## Props

| 属性 | 类型 | 必填 | 说明 |
|------|------|------|------|
| data | ContainerRecord[] | 是 | 表格数据 |

## Events

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:page | page: number | 页码变化 |

## 使用示例

```vue
<ContainerTable
  :data="containers"
  :loading="loading"
  @update:page="handlePageChange"
/>
```
```

---

## 🎯 实施检查清单

### 阶段一：准备（Checklist）

- [ ] 已阅读并理解本 SKILL 准则
- [ ] 已确认数据库表结构和字段定义
- [ ] 已创建类型定义文件
- [ ] 已创建 Composable 文件框架
- [ ] 已准备好 Mock 数据

### 阶段二：实现（Checklist）

- [ ] ContainerTable 基础组件已完成
- [ ] 所有列组件已拆分
- [ ] 所有辅助函数已迁移
- [ ] 所有事件已正确处理
- [ ] TypeScript 类型检查通过

### 阶段三：测试（Checklist）

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试全部通过
- [ ] 性能测试达标
- [ ] 内存泄漏检查通过
- [ ] 浏览器兼容性测试通过

### 阶段四：集成（Checklist）

- [ ] 在 Shipments.vue 中成功集成
- [ ] 所有现有功能正常工作
- [ ] 无控制台错误
- [ ] 无性能退化
- [ ] 代码审查通过

### 阶段五：清理（Checklist）

- [ ] 旧代码已删除
- [ ] 文档已更新
- [ ] Git 提交信息规范
- [ ] PR 描述完整
- [ ] 相关文档已同步

---

## ⚠️ 常见陷阱与规避

### 陷阱一：数据库字段映射错误

**问题**:
```typescript
// ❌ 错误：字段名不一致
interface Container {
  containerNo: string // 应为 containerNumber
}
```

**解决**:
```typescript
// ✅ 正确：使用 TypeORM 映射
@Column({ name: 'container_number' })
containerNumber: string
```

---

### 陷阱二：过度设计

**问题**:
- 一次性重构所有功能
- 引入过多抽象层
- 代码难以理解

**解决**:
- 小步快跑，逐步迁移
- 保持代码简单直观
- 每个组件职责单一

---

### 陷阱三：测试不足

**问题**:
- 只测试 happy path
- 忽略边界情况
- 没有性能测试

**解决**:
- 覆盖所有功能点
- 测试异常场景
- 进行压力测试

---

## 📚 参考资源

### 数据库表结构
- `backend/03_create_tables.sql`
- `backend/src/entities/biz_container.ts`

### Vue 最佳实践
- Vue 3 官方文档：Composition API
- Element Plus 文档：Table 组件
- 项目规范：`frontend/public/docs/DEVELOPMENT_STANDARDS.md`

### 相关文件
- `frontend/src/views/shipments/Shipments.vue`
- `frontend/src/services/container.ts`
- `frontend/src/types/container.ts`

---

## 🔄 持续改进

### 回顾会议
- 每个阶段完成后进行回顾
- 记录经验教训
- 更新本 SKILL 准则

### 质量指标
- 代码行数减少比例
- 测试覆盖率提升
- 性能指标改善
- 团队满意度

---

**版本**: v1.0  
**创建时间**: 2026-04-02  
**最后更新**: 2026-04-02  
**作者**: AI Assistant  
**状态**: 强制执行  
**适用范围**: Shipments 表格组件重构任务
