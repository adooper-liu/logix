# 目的港清关公司显示为空问题修复报告

## 问题描述

货柜MRKU4896861的"目的港清关信息"中，目的港清关公司显示为空。

## 问题分析

### 1. 数据库检查

```sql
SELECT "containerNumber", "portType", "customsBrokerCode"
FROM process_port_operations
WHERE "containerNumber" = 'MRKU4896861';

结果：
containerNumber |  portType   |      customsBrokerCode
-----------------+-------------+-----------------------------
MRKU4896861     | destination | Sen Mart International Inc.
```

数据库中有数据，清关公司为"Sen Mart International Inc."。

### 2. 前端显示代码

查看前端清关信息显示逻辑：

```vue
<!-- ContainerDetail.vue -->
<el-descriptions-item label="目的港清关公司编码">{{ po.customsBrokerCode || '-' }}</el-descriptions-item>
<el-descriptions-item label="目的港清关公司">{{ po.customsBroker || '-' }}</el-descriptions-item>
```

前端显示的是`po.customsBroker`字段，但数据库中存储的是`customsBrokerCode`。

### 3. 后端实体定义

```typescript
// PortOperation.ts
@Column({ type: 'varchar', length: 50, nullable: true })
customsBrokerCode?: string; // 目的港清关公司
```

后端实体中只有`customsBrokerCode`字段，没有`customsBroker`字段。

### 4. 前端类型定义

```typescript
// container.ts
export interface PortOperation {
  customsBrokerCode?: string;
  customsBroker?: string;  // 前端有这个字段，但后端没有
}
```

前端类型定义中有`customsBroker`字段，但后端实体中没有。

## 问题根源

1. **字段命名不一致**：
   - 数据库字段：`customsBrokerCode`
   - 前端显示字段：`customsBroker`
   - 后端实体缺少`customsBroker`字段

2. **数据语义混淆**：
   - `customsBrokerCode`应该是清关公司编码（如"SMI"）
   - `customsBroker`应该是清关公司名称（如"Sen Mart International Inc."）
   - 但当前数据库中`customsBrokerCode`存储的是公司名称而不是编码

## 解决方案

### 方案说明

保持前后端字段语义正确性：
- `customsBrokerCode`：存储清关公司编码
- `customsBroker`：存储清关公司名称

由于当前数据将公司名称存储在`customsBrokerCode`中，临时方案是在后端返回数据时，将`customsBrokerCode`的值同步到`customsBroker`字段。

### 1. 后端修改

**修改文件**：`backend/src/controllers/container.controller.ts`

**修改内容**：在返回数据前，将`customsBrokerCode`同步到`customsBroker`

```typescript
// 处理港口操作数据，将customsBrokerCode同步到customsBroker字段
if (container.portOperations && container.portOperations.length > 0) {
  container.portOperations = container.portOperations.map((po: any) => ({
    ...po,
    customsBroker: po.customsBrokerCode || null
  }));
}
```

### 2. 前端修改

**修改文件**：`frontend/src/views/shipments/ContainerDetail.vue`

**修改内容**：优先显示`customsBroker`，如果没有则显示`customsBrokerCode`

```vue
<el-descriptions-item label="目的港清关公司">
  {{ po.customsBroker || po.customsBrokerCode || '-' }}
</el-descriptions-item>
```

### 3. 长期方案

#### 方案A：建立清关公司字典表

创建清关公司字典表，实现编码与名称的关联：

```sql
CREATE TABLE dict_customs_brokers (
    broker_code VARCHAR(50) PRIMARY KEY,
    broker_name VARCHAR(100) NOT NULL,
    broker_name_en VARCHAR(100),
    contact_person VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT
);

-- 示例数据
INSERT INTO dict_customs_brokers VALUES
('SMI', 'Sen Mart International Inc.', 'Sen Mart International Inc.', NULL, NULL, NULL, NULL);
```

然后在后端查询时，通过`customsBrokerCode`查询字典表获取`customsBroker`名称。

#### 方案B：扩展PortOperation实体

在PortOperation实体中添加`customsBroker`字段：

```typescript
// PortOperation.ts
@Column({ type: 'varchar', length: 100, nullable: true })
customsBroker?: string; // 清关公司名称
```

然后更新数据库表结构并迁移现有数据。

## 验证结果

修复后，前端应显示：
- 目的港清关公司：Sen Mart International Inc.

## 后续建议

1. **统一字段命名规范**：明确区分"编码"和"名称"字段
2. **建立字典表**：为船公司、货代公司、清关公司等建立字典表
3. **数据迁移**：将现有的`customsBrokerCode`中的公司名称迁移到`customsBroker`字段
4. **编码规范化**：为现有公司分配标准编码

---

**修复日期**：2026-02-25
**修复方式**：后端同步字段值 + 前端兼容显示
**影响范围**：所有货柜的港口操作信息
**建议**：实施长期方案，建立清关公司字典表
