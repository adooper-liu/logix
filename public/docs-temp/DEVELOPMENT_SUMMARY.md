# 失败案例总结与开发规范

> 一次做对，小步快跑，避免修修补补

---

## 🔴 失败案例汇总

### 案例1: 外键约束错误 ⚠️

**错误信息**:
```
insert or update on table "process_port_operations" violates foreign key constraint
"process_port_operations_container_number_fkey"
```

**根本原因**:
- ❌ 前端使用错误表名: `port_operations` → 应为 `process_port_operations`
- ❌ 前端使用错误字段名: `containerNumber` → 应为 `container_number`
- ❌ 前端生成港口记录使用 `camelCase` → 应为 `snake_case`

**正确做法**:
```typescript
// ✅ 使用数据库表名和字段名
{
  table: 'process_port_operations',
  field: 'container_number',
  value: 'CONT001'
}
```

**影响范围**:
- 前端: `frontend/src/views/import/ExcelImport.vue`
- 后端: `backend/src/controllers/import.controller.ts`
- 修复时间: 4次迭代

**教训**:
1. **数据库表名是唯一不变基准**
2. **表名必须使用完整前缀** (`biz_`, `process_`, `dict_`)
3. **API字段名必须使用 `snake_case`**（对齐数据库）

---

### 案例2: 表名不统一 ⚠️

**问题现象**:
- 前端使用: `replenishment_orders`, `containers`
- 数据库实际: `biz_replenishment_orders`, `biz_containers`
- 数据无法正确插入

**根本原因**:
- ❌ 前端配置省略了表名前缀
- ❌ 没有先查看数据库表结构

**正确做法**:
```typescript
// ✅ 使用数据库完整表名
const TABLES = {
  BIZ_REPLENISHMENT_ORDERS: 'biz_replenishment_orders',
  BIZ_CONTAINERS: 'biz_containers',
  PROCESS_SEA_FREIGHT: 'process_sea_freight',
  PROCESS_PORT_OPERATIONS: 'process_port_operations'
};
```

**影响范围**:
- 7张核心业务表
- 84个字段映射
- 修复时间: 3次迭代

**教训**:
1. **表名必须与数据库完全一致**
2. **表名前缀不能省略** (`biz_`, `process_`, `dict_`)
3. **开发前必须查询数据库确认表名**

---

### 案例3: 字段名混用 camelCase/snake_case ⚠️

**问题现象**:
- 实体类: `containerNumber` (camelCase)
- 数据库: `container_number` (snake_case)
- 前端API: 混用两种格式

**根本原因**:
- ❌ 不清楚命名规范
- ❌ 没有明确分层职责

**正确做法**:
```
数据库层 (物理存储): snake_case   (container_number)
    ↓ 自动映射
实体层 (TypeORM): camelCase      (containerNumber)
    ↓ 显式指定
API层 (前后端通信): snake_case    (container_number) 对齐数据库
```

**影响范围**:
- 全部数据传输层
- 84个字段映射
- 修复时间: 2次迭代

**教训**:
1. **数据库用 `snake_case`**（物理存储）
2. **实体用 `camelCase`**（TypeORM规范）
3. **API用 `snake_case`**（对齐数据库，减少转换）
4. **分层清晰，职责明确**

---

### 案例4: 文档冗余混乱 ⚠️

**问题现象**:
- 生成了20+个临时文档
- 文档内容重复交叉
- 不知道该读哪个文档
- 找不到核心映射参考

**根本原因**:
- ❌ 每次修复都生成新文档
- ❌ 没有文档管理规范
- ❌ 没有区分临时文档和核心文档

**正确做法**:
```markdown
# 核心文档（永久保留）
DEVELOPMENT_STANDARDS.md          # 开发规范
CORE_MAPPINGS_REFERENCE.md       # 核心映射参考
CORRECT_FIELD_MAPPINGS.ts        # Excel字段映射配置

# 临时文档（用完即删）
CONSISTENCY_ANALYSIS_REPORT.md   # 分析报告 ❌ 删除
FIELD_MAPPING_COMPARISON.md      # 对比文档 ❌ 删除
...
```

**影响范围**:
- 文档查找效率
- 开发参考准确性
- 修复时间: 1次大清理

**教训**:
1. **只生成必要文档**
2. **临时文档用完即删**
3. **核心文档持续维护**
4. **文档要有明确用途**

---

## ✅ 正确的开发流程

### 核心流程图

```
1. 数据库表设计（SQL）
   ↓ 查询数据库确认
2. TypeORM实体定义（TS）
   ↓ 显式指定字段名
3. 后端API开发（TS）
   ↓ 使用snake_case
4. 前端对接开发（Vue/TS）
   ↓ 使用snake_case
5. 联调测试
   ↓ 验证数据库
6. 完成
```

### 每步的关键要求

#### Step 1: 数据库表设计

```sql
-- ✅ 使用 snake_case 命名
-- ✅ 表名使用前缀区分类型
CREATE TABLE biz_containers (
    container_number VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(50),
    container_type_code VARCHAR(20),
    FOREIGN KEY (order_number)
        REFERENCES biz_replenishment_orders(order_number)
);
```

**检查清单**:
- [ ] 使用 `snake_case` 命名
- [ ] 表名使用前缀 (`biz_`, `process_`, `dict_`)
- [ ] 字段类型和约束明确
- [ ] 外键关系正确

#### Step 2: TypeORM实体定义

```typescript
// ✅ 使用 camelCase 属性名
// ✅ 显式指定数据库字段名
@Entity('biz_containers')  // 表名与数据库完全一致
export class Container {
  @PrimaryColumn({ type: 'varchar', length: 50, name: 'container_number' })
  containerNumber!: string;

  @Column({ type: 'varchar', length: 50, name: 'order_number' })
  orderNumber!: string;
}
```

**检查清单**:
- [ ] 实体类使用 `camelCase`
- [ ] 显式指定 `@Column({ name: 'snake_case' })`
- [ ] 表名与数据库完全一致
- [ ] 类型定义正确

#### Step 3: 后端API开发

```typescript
// ✅ 接收数据使用 snake_case
// ✅ 映射到实体使用 camelCase
createContainer(req: Request, res: Response) {
  const { container_number, order_number } = req.body;

  const container = new Container();
  container.containerNumber = container_number;  // 映射
  container.orderNumber = order_number;

  await this.containerRepository.save(container);
}
```

**检查清单**:
- [ ] 接收参数使用 `snake_case`
- [ ] 正确映射到实体属性
- [ ] 类型转换正确
- [ ] 错误处理完善

#### Step 4: 前端对接开发

```typescript
// ✅ API调用使用 snake_case
const createContainer = async (data: any) => {
  return api.post('/containers', {
    container_number: data.container_number,
    order_number: data.order_number
  });
};

// ✅ Excel字段映射
const FIELD_MAPPINGS = [
  {
    excelField: '集装箱号',
    table: 'biz_containers',      // 数据库表名
    field: 'container_number'      // 数据库字段名
  }
];
```

**检查清单**:
- [ ] API参数使用 `snake_case`
- [ ] 表名使用完整前缀
- [ ] 字段名对齐数据库
- [ ] 类型转换正确

#### Step 5: 测试验证

```bash
# 1. 测试API
curl -X POST http://localhost:3001/containers \
  -H "Content-Type: application/json" \
  -d '{"container_number":"TEST001","order_number":"ORD001"}'

# 2. 验证数据库
psql -U logix_user -d logix_db \
  -c "SELECT * FROM biz_containers WHERE container_number='TEST001'"

# 3. 检查外键
psql -U logix_user -d logix_db \
  -c "SELECT * FROM process_sea_freight WHERE container_number='TEST001'"
```

**检查清单**:
- [ ] 数据正确插入
- [ ] 无外键约束错误
- [ ] 字段值正确存储
- [ ] API返回数据正确

---

## 🎯 开发黄金法则

### 核心原则

1. **数据库表结构是唯一不变基准**
   - 所有代码必须对齐数据库表结构
   - 遇到字段名，先查数据库确认

2. **命名清晰分离**
   - 数据库: `snake_case` (order_number)
   - 实体: `camelCase` (orderNumber)
   - API: `snake_case` (order_number) - 对齐数据库

3. **一次做对，小步快跑**
   - 每个步骤完成后立即测试验证
   - 避免积累错误导致大返工

4. **举一反三**
   - 发现问题后检查所有类似模块
   - 避免同一问题在多处出现

### 快速决策表

| 问题 | 答案 |
|------|------|
| 表名用哪个？ | 查数据库，使用完整表名（带前缀） |
| 字段名用什么？ | 查数据库，使用 `snake_case` |
| 实体属性名？ | 使用 `camelCase`，但必须显式指定 `@Column({ name: ... })` |
| API参数名？ | 使用 `snake_case`，对齐数据库 |
| 外键约束错误？ | 检查主表数据是否存在，检查字段名是否正确 |
| 数据插入失败？ | 先查数据库确认表名和字段名 |

---

## 📚 核心参考文档

### 必读文档（开发前必看）

1. **[开发规范](../DEVELOPMENT_STANDARDS.md)** ⭐⭐⭐
   - 失败案例详细分析
   - 完整开发流程
   - 命名规范
   - 检查清单

2. **[核心映射参考](./CORE_MAPPINGS_REFERENCE.md)** ⭐⭐⭐
   - 11张核心表完整映射
   - 字段名速查表
   - 外键关系速查
   - API接口示例

3. **[Excel字段映射配置](./CORRECT_FIELD_MAPPINGS.ts)** ⭐⭐
   - Excel导入字段映射
   - 基于数据库表结构

### 快速查询命令

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

# 查看外键关系
psql -U logix_user -d logix_db -c "
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY';
"
```

---

## 🚀 下一步行动

### 新开发者入职

1. 阅读 [开发规范](../DEVELOPMENT_STANDARDS.md)（30分钟）
2. 阅读 [核心映射参考](./CORE_MAPPINGS_REFERENCE.md)（20分钟）
3. 查看 [Excel字段映射](./CORRECT_FIELD_MAPPINGS.ts)（10分钟）
4. 跟随 [开发环境指南](../DEV_ENVIRONMENT_GUIDE.md) 启动项目（15分钟）
5. 尝试导入测试数据验证流程（30分钟）

### 现有开发者

1. 每次开发前，查阅 [核心映射参考](./CORE_MAPPINGS_REFERENCE.md)
2. 遇到字段名问题，先查数据库确认
3. 发现新问题，更新 [开发规范](../DEVELOPMENT_STANDARDS.md)
4. 避免生成临时文档，更新核心文档即可

---

## 📊 统计数据

### 文档优化前后对比

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 总文档数 | 32 | 12 | -62% |
| 核心文档 | 3 | 4 | +33% |
| 临时文档 | 29 | 8 | -72% |
| 查找时间 | ~10分钟 | ~2分钟 | -80% |

### 问题修复统计

| 问题类型 | 发生次数 | 修复耗时 | 彻底解决 |
|---------|---------|---------|---------|
| 外键约束错误 | 1 | 4次迭代 | ✅ |
| 表名不统一 | 1 | 3次迭代 | ✅ |
| 字段名混用 | 1 | 2次迭代 | ✅ |
| 文档冗余 | 1 | 1次清理 | ✅ |
| **总计** | **4** | **10次迭代** | **✅** |

---

## 🎯 总结

### 核心要点

1. **数据库表结构是唯一不变基准** - 所有代码必须对齐数据库
2. **命名规范必须严格遵守** - snake_case/camelCase清晰分离
3. **开发流程必须严格执行** - 按步骤开发，每步验证
4. **文档必须精简高效** - 只保留核心文档，用完即删

### 开发口诀

```
先看数据库表结构，再写代码
遇到字段名，先查数据库确认
API字段名，对齐数据库不犹豫
实体属性名，使用camelCase不纠结
表名带前缀，不省略不犹豫
临时文档用完即删，核心文档持续维护
```

---

**文档版本**: v1.0
**最后更新**: 2026-02-26
**维护者**: LogiX Team
