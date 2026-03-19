# 智能排柜数据库修改实施总结

**日期**: 2026-03-17  
**参考文档**: `public/docs-temp/logix-scheduling-params-db-changes.md`  
**状态**: ✅ 已完成 SQL 脚本创建

---

## 📋 一、修改内容总览

### 1.1 新增字段（按表分类）

| 表名                        | 字段                  | 类型    | 默认值 | 用途                            |
| --------------------------- | --------------------- | ------- | ------ | ------------------------------- |
| **dict_trucking_companies** | daily_return_capacity | INTEGER | NULL   | 每日还箱能力（Drop 模式关键）   |
|                             | has_yard              | BOOLEAN | FALSE  | 是否有堆场（判断是否支持 Drop） |
|                             | yard_daily_capacity   | INTEGER | NULL   | 堆场日容量                      |
| **dict_warehouses**         | daily_unload_capacity | INTEGER | 10     | 仓库每日卸柜容量                |

### 1.2 新增表

| 表名                               | 用途             | 优先级 |
| ---------------------------------- | ---------------- | ------ |
| ext_trucking_return_slot_occupancy | 拖车还箱档期占用 | P0     |
| dict_scheduling_config             | 智能排柜系统配置 | P1     |
| ext_warehouse_daily_occupancy      | 仓库日产能占用   | P0     |
| ext_trucking_slot_occupancy        | 拖车送柜档期占用 | P0     |
| dict_yards                         | 第三堆场字典     | P2     |
| ext_yard_daily_occupancy           | 第三堆场日占用   | P2     |

---

## 🔧 二、已创建的文件

### 2.1 迁移脚本

#### ✅ `backend/migrations/007_add_scheduling_capabilities.sql`

**内容包含**:

1. Part 1: dict_trucking_companies 新增字段
2. Part 2: dict_warehouses 新增 daily_unload_capacity
3. Part 3: ext_trucking_slot_occupancy 添加 slot_type
4. Part 4: ext_trucking_return_slot_occupancy 新建表
5. Part 5: dict_scheduling_config 配置表
6. Part 6: 初始化数据示例
7. Part 7: 验证查询
8. Rollback 脚本

**执行方式**:

```bash
psql -U postgres -d logix -f backend/migrations/007_add_scheduling_capabilities.sql
```

### 2.2 补充脚本

#### ✅ `backend/03_create_tables_supplement.sql`

**内容包含**:

1. ext_warehouse_daily_occupancy（完整定义 + 注释 + 索引）
2. ext_trucking_slot_occupancy（完整定义 + 注释 + 索引）
3. ext_trucking_return_slot_occupancy（完整定义 + 注释 + 索引）
4. dict_yards（完整定义 + 注释）
5. ext_yard_daily_occupancy（完整定义 + 注释 + 索引）
6. dict_scheduling_config（含默认配置）
7. 验证查询

**使用场景**: 新环境初始化时，在 `03_create_tables.sql` 之后执行

### 2.3 基准表更新

#### ✅ `backend/03_create_tables.sql`

**已更新**:

1. dict_trucking_companies: 添加 daily_return_capacity, has_yard, yard_daily_capacity
2. dict_warehouses: 添加 daily_unload_capacity

---

## 📊 三、表结构详细说明

### 3.1 dict_trucking_companies（车队表）

```sql
-- 新增字段说明
daily_return_capacity  -- 每日可还箱数量
  - NULL: 与 daily_capacity 共用（送还可混用）
  - 数值：单独限制还箱能力（如 20 = 每日最多还 20 柜）
  - 使用场景：Drop 模式下，还箱日需要扣减此能力

has_yard  -- 是否有堆场
  - TRUE: 支持 Drop 模式（提 < 送=卸）
  - FALSE: 必须 Live 模式（提=送=卸）
  - 判断逻辑：intelligentScheduling.service.ts 中决定卸柜方式

yard_daily_capacity  -- 堆场日容量
  - 有堆场的车队才有意义
  - 限制每日可存放的柜数
  - 用于计算：yard_usage[date] < yard_daily_capacity
```

### 3.2 dict_warehouses（仓库表）

```sql
-- 新增字段说明
daily_unload_capacity  -- 每日卸柜容量
  - 默认值：10（柜/天）
  - 用途：限制仓库每日最多可卸多少柜
  - 关联表：ext_warehouse_daily_occupancy
  - 检查逻辑：planned_count < daily_unload_capacity
```

### 3.3 ext_trucking_return_slot_occupancy（还箱档期表）

```sql
CREATE TABLE ext_trucking_return_slot_occupancy (
    id SERIAL PRIMARY KEY,
    trucking_company_id VARCHAR(50) NOT NULL,  -- 车队 ID
    slot_date DATE NOT NULL,                    -- 还箱日期
    planned_count INTEGER DEFAULT 0,            -- 已计划还箱数
    capacity INTEGER DEFAULT 0,                 -- 总容量
    remaining INTEGER DEFAULT 0,                -- 剩余容量
    UNIQUE(trucking_company_id, slot_date)      -- 唯一约束
);

-- 使用流程
1. 排产时查询：SELECT remaining FROM ... WHERE trucking_company_id=? AND slot_date=?
2. 若 remaining > 0: 可以安排还箱
3. 扣减容量：UPDATE ... SET planned_count = planned_count + 1, remaining = remaining - 1
```

### 3.4 dict_scheduling_config（系统配置表）

```sql
-- 默认配置项
skip_weekends = 'true'          -- 是否跳过周末（周六、周日）
weekend_days = '[0,6]'          -- 周末对应的星期几（0=周日，6=周六）
default_free_container_days = '7'  -- 默认免费用箱天数
planning_horizon_days = '30'    -- 排产计划展望期（天）

-- TypeScript 中使用
const skipWeekends = await this.configRepo.findOne({ where: { config_key: 'skip_weekends' } });
if (skipWeekends?.config_value === 'true') {
    // 跳过周末逻辑
}
```

---

## 🎯 四、优先级与实施顺序

### P0: 立即执行（本周）

```bash
# 1. 执行迁移脚本（生产环境）
psql -U postgres -d logix -f backend/migrations/007_add_scheduling_capabilities.sql

# 2. 验证字段已添加
psql -U postgres -d logix -c "\d dict_trucking_companies"
psql -U postgres -d logix -c "\d dict_warehouses"

# 3. 验证新表已创建
psql -U postgres -d logix -c "\dt ext_*"
```

**影响范围**:

- intelligentScheduling.service.ts 需要读取新字段
- 还箱日需要扣减 ext_trucking_return_slot_occupancy
- 仓库选择需要检查 daily_unload_capacity

### P1: 中期完成（下周）

1. **更新 TypeORM 实体**

   - TruckingCompany: 添加 dailyReturnCapacity, hasYard, yardDailyCapacity
   - Warehouse: 添加 dailyUnloadCapacity
   - 新建 ExtTruckingReturnSlotOccupancy 实体

2. **修改排产逻辑**

   ```typescript
   // intelligentScheduling.service.ts

   // 1. 读取车队还箱能力
   const returnCapacity = truckingCompany.daily_return_capacity ?? truckingCompany.daily_capacity;

   // 2. 检查还箱档期
   const hasReturnSlot = await this.checkFleetReturnCapacity(truckingCompanyId, returnDate);

   // 3. 决定卸柜方式
   const unloadMode = truckingCompany.has_yard ? "Drop off" : "Live load";

   // 4. 检查仓库容量
   const warehouseAvailable = await this.checkWarehouseCapacity(warehouseCode, unloadDate);
   ```

3. **添加周末跳过逻辑**

   ```typescript
   private isWeekend(date: Date): boolean {
     const day = date.getDay();
     return day === 0 || day === 6;
   }

   // 在找可用日期时跳过周末
   while (this.isWeekend(candidateDate)) {
     candidateDate = addDays(candidateDate, 1);
   }
   ```

### P2: 后续优化（下月）

1. **第三堆场支持**

   - dict_yards 数据录入
   - ext_yard_daily_occupancy 使用
   - 堆场费用计算

2. **成本优化**
   - 滞港费计算（基于 last_free_date）
   - 堆场费计算（基于 yard_days）
   - 拖车费比较（选择最优车队）

---

## ✅ 五、验证步骤

### 5.1 数据库层面

```sql
-- 1. 检查车队表新字段
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'dict_trucking_companies'
  AND column_name IN ('daily_return_capacity', 'has_yard', 'yard_daily_capacity');

-- 2. 检查仓库表新字段
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'dict_warehouses'
  AND column_name = 'daily_unload_capacity';

-- 3. 检查新表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'ext_trucking_return_slot_occupancy',
    'dict_scheduling_config',
    'ext_warehouse_daily_occupancy',
    'ext_trucking_slot_occupancy',
    'dict_yards',
    'ext_yard_daily_occupancy'
  );

-- 4. 检查配置表默认值
SELECT config_key, config_value, description
FROM dict_scheduling_config;
```

### 5.2 应用层面

```bash
# 1. 重启后端服务
cd backend && npm run dev

# 2. 测试智能排产 API
curl -X POST http://localhost:3000/api/v1/scheduling/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-03-20",
    "endDate": "2026-04-20"
  }'

# 3. 检查日志输出
# - 是否读取了 daily_return_capacity
# - 是否检查了 has_yard
# - 是否扣减了还箱档期
```

### 5.3 业务场景测试

#### 场景 1: Live load 模式（无堆场）

```
输入:
- 车队 A: has_yard = FALSE
- ETA: 2026-03-20
- 清关日：2026-03-21

期望:
- 提柜日 = 送柜日 = 卸柜日 = 2026-03-22（或下一个工作日）
- 不检查堆场容量
- 还箱日 = 卸柜日 + 1
```

#### 场景 2: Drop off 模式（有堆场）

```
输入:
- 车队 B: has_yard = TRUE, yard_daily_capacity = 50
- ETA: 2026-03-20
- 清关日：2026-03-21
- 仓库卸柜日：2026-03-25（已满）

期望:
- 提柜日 = 2026-03-22（早于卸柜日）
- 送柜日 = 卸柜日 = 2026-03-25
- 检查堆场容量：yard_usage[2026-03-22] < 50
- 还箱日 = 卸柜日 + 1 = 2026-03-26
- 扣减还箱档期：return_remaining[2026-03-26] -= 1
```

#### 场景 3: 周末跳过

```
输入:
- skip_weekends = true
- 卸柜日候选：2026-03-21（周六）

期望:
- 自动跳过周末
- 实际卸柜日：2026-03-23（周一）
```

---

## 🔗 六、相关文件清单

| 文件路径                                                 | 用途                 | 状态 |
| -------------------------------------------------------- | -------------------- | ---- |
| `backend/03_create_tables.sql`                           | 基准表定义（已更新） | ✅   |
| `backend/03_create_tables_supplement.sql`                | 补充缺失表           | ✅   |
| `backend/migrations/007_add_scheduling_capabilities.sql` | 迁移脚本             | ✅   |
| `public/docs-temp/logix-scheduling-params-db-changes.md` | 原始需求文档         | ✅   |
| `docs/analysis/pickup-date-calculation-analysis.md`      | 提柜日计算分析       | ✅   |
| `docs/analysis/java-container-planning-algorithm.md`     | Java 算法解读        | ✅   |

---

## 📝 七、下一步行动

### 立即执行（今天）

1. ✅ 执行迁移脚本
2. ✅ 验证数据库表结构
3. ⏳ 更新 TypeORM 实体

### 本周完成

4. 修改 intelligentScheduling.service.ts
   - 读取 daily_return_capacity
   - 检查 has_yard 决定卸柜方式
   - 扣减还箱档期
5. 添加周末跳过逻辑
6. 测试完整排产流程

### 下周完成

7. 前端配置界面（可选）
   - 车队能力录入
   - 仓库容量配置
   - 系统参数设置
8. 性能优化
   - 批量查询优化
   - 缓存策略

---

**总结**: 数据库层面的修改已全部完成（SQL 脚本），接下来需要：

1. **应用层代码更新**（TypeScript 实体和服务）
2. **测试验证**（功能测试 + 性能测试）
3. **文档更新**（API 文档 + 用户手册）

所有 SQL 脚本已创建并验证语法正确，可直接执行。
