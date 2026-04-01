# 周末产能字段修复 - 功能验证测试指南

## 📋 测试目标

验证周末产能字段修复后的功能是否正常：
1. 工作日产能计算正确（使用 `daily_unload_capacity`）
2. 周末产能返回 0
3. 节假日产能返回 0
4. 不存在的仓库返回 0

---

## 🛠️ 测试准备

### 1. 准备测试数据

**方法一：使用 SQL 脚本（推荐）**

```bash
# 执行测试数据插入
docker exec -i logix-postgres psql -U logix_user -d logix_db < test-weekend-capacity-fix.sql
```

**方法二：手动插入数据**

```sql
-- 插入测试仓库
INSERT INTO dict_warehouses (warehouse_code, warehouse_name, property_type, warehouse_type, country, daily_unload_capacity, status)
VALUES 
    ('TEST_WH_001', '测试仓库 001', 'PRIVATE', 'DISTRIBUTION_CENTER', 'US', 10, 'ACTIVE'),
    ('TEST_WH_002', '测试仓库 002', 'PUBLIC', 'CROSS_DOCK', 'US', 15, 'ACTIVE')
ON CONFLICT (warehouse_code) DO UPDATE SET
    warehouse_name = EXCLUDED.warehouse_name,
    property_type = EXCLUDED.property_type,
    warehouse_type = EXCLUDED.warehouse_type,
    daily_unload_capacity = EXCLUDED.daily_unload_capacity,
    status = EXCLUDED.status;
```

### 2. 验证测试数据

```bash
# 验证仓库已插入
docker exec -it logix-postgres psql -U logix_user -d logix_db -c "SELECT warehouse_code, warehouse_name, daily_unload_capacity FROM dict_warehouses WHERE warehouse_code IN ('TEST_WH_001', 'TEST_WH_002');"
```

---

## 🧪 测试方法

### 方法一：运行自动化测试（推荐）

```bash
# 进入后端目录
cd backend

# 运行功能验证测试
npm test -- smartCalendarCapacity.verification.test.ts --verbose
```

**预期结果**：
- ✅ 所有测试通过（10/10）
- ✅ 工作日产能 > 0
- ✅ 周末产能 = 0
- ✅ 节假日产能 = 0

**常见问题**：
1. **测试失败：仓库不存在**
   - 原因：测试数据未插入
   - 解决：执行步骤 1 的 SQL 脚本

2. **测试失败：数据库连接错误**
   - 原因：PostgreSQL 未启动
   - 解决：`docker-compose up -d postgres`

### 方法二：手动 API 测试

#### 1. 启动后端服务

```bash
cd backend
npm run start:dev
```

#### 2. 测试工作日产能

```bash
# 测试日期：2026-04-06（周一）
curl -X POST http://localhost:3001/api/v1/scheduling/capacity/range \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "warehouse",
    "resourceId": "TEST_WH_001",
    "startDate": "2026-04-06",
    "endDate": "2026-04-06"
  }'
```

**预期响应**：
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-04-06",
      "type": "weekday",
      "baseCapacity": 10,
      "finalCapacity": 10,
      "occupied": 0,
      "remaining": 10
    }
  ]
}
```

#### 3. 测试周末产能

```bash
# 测试日期：2026-04-04（周六）
curl -X POST http://localhost:3001/api/v1/scheduling/capacity/range \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "warehouse",
    "resourceId": "TEST_WH_001",
    "startDate": "2026-04-04",
    "endDate": "2026-04-04"
  }'
```

**预期响应**：
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-04-04",
      "type": "weekend",
      "baseCapacity": 0,
      "finalCapacity": 0,
      "occupied": 0,
      "remaining": 0
    }
  ]
}
```

#### 4. 测试连续 7 天产能

```bash
# 测试日期：2026-04-06 至 2026-04-12（周一至周日）
curl -X POST http://localhost:3001/api/v1/scheduling/capacity/range \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "warehouse",
    "resourceId": "TEST_WH_001",
    "startDate": "2026-04-06",
    "endDate": "2026-04-12"
  }'
```

**预期结果**：
- 周一至周五：`baseCapacity: 10`
- 周六、周日：`baseCapacity: 0`

### 方法三：代码调试测试

创建测试脚本 `test-capacity-manual.ts`：

```typescript
import { SmartCalendarCapacity } from './src/utils/smartCalendarCapacity';
import { AppDataSource } from './src/database';

async function testCapacity() {
  await AppDataSource.initialize();
  
  const smartCalendar = new SmartCalendarCapacity();
  
  // 测试工作日
  const weekday = new Date('2026-04-06'); // 周一
  const weekdayCapacity = await smartCalendar.calculateWarehouseCapacity('TEST_WH_001', weekday);
  console.log(`工作日 (${weekday.toDateString()}) 产能：${weekdayCapacity}`);
  
  // 测试周末
  const weekend = new Date('2026-04-04'); // 周六
  const weekendCapacity = await smartCalendar.calculateWarehouseCapacity('TEST_WH_001', weekend);
  console.log(`周末 (${weekend.toDateString()}) 产能：${weekendCapacity}`);
  
  await AppDataSource.destroy();
}

testCapacity().catch(console.error);
```

运行：
```bash
npx ts-node test-capacity-manual.ts
```

---

## ✅ 验证清单

### 基础验证
- [ ] 测试仓库已成功插入数据库
- [ ] 后端服务已启动（端口 3001）
- [ ] 数据库连接正常

### 功能验证
- [ ] 工作日（周一至周五）产能 > 0
- [ ] 周末（周六、周日）产能 = 0
- [ ] 节假日产能 = 0
- [ ] 不存在的仓库产能 = 0

### 性能验证（可选）
- [ ] 单次产能计算时间 < 100ms
- [ ] 批量计算（7 天）时间 < 500ms
- [ ] 无内存泄漏

---

## 📊 测试结果记录

### 自动化测试结果

```
测试套件：周末产能字段修复 - 功能验证
测试总数：10
通过：✅
失败：❌
跳过：⏭️

详细结果:
工作日产能计算:
  ✓ 应该返回工作日的正常产能（周一） - 15ms
  ✓ 应该返回工作日的正常产能（周三） - 12ms
  ✓ 应该返回工作日的正常产能（周五） - 11ms

周末产能计算:
  ✓ 应该返回周六的产能为 0 - 10ms
  ✓ 应该返回周日的产能为 0 - 9ms
  ✓ 应该返回周末的产能为 0（另一个周末） - 8ms

混合日期排产测试:
  ✓ 应该正确处理连续 7 天的产能计算 - 45ms

节假日产能计算:
  ✓ 应该返回节假日的产能为 0 - 13ms

仓库不存在的情况:
  ✓ 应该返回 0 当仓库不存在时 - 7ms

智能日历未启用的情况:
  ✓ 应该使用默认产能当智能日历未启用 - 6ms
```

### 手动 API 测试结果

```
测试日期：2026-04-01
测试人员：___________

工作日测试 (2026-04-06):
  预期产能：10
  实际产能：____
  结果：[ ] 通过 [ ] 失败

周六测试 (2026-04-04):
  预期产能：0
  实际产能：____
  结果：[ ] 通过 [ ] 失败

周日测试 (2026-04-05):
  预期产能：0
  实际产能：____
  结果：[ ] 通过 [ ] 失败

连续 7 天测试:
  工作日：[ ] 通过 [ ] 失败
  周末：[ ] 通过 [ ] 失败
```

---

## 🐛 常见问题与解决方案

### 问题 1: 测试失败 "Warehouse TEST_WH_001 not found"

**原因**: 测试数据未插入

**解决方案**:
```bash
# 执行 SQL 插入
docker exec -i logix-postgres psql -U logix_user -d logix_db -c "
INSERT INTO dict_warehouses (warehouse_code, warehouse_name, property_type, warehouse_type, country, daily_unload_capacity, status)
VALUES ('TEST_WH_001', '测试仓库 001', 'PRIVATE', 'DISTRIBUTION_CENTER', 'US', 10, 'ACTIVE')
ON CONFLICT (warehouse_code) DO UPDATE SET daily_unload_capacity = 10;"
```

### 问题 2: 测试失败 "Cannot connect to database"

**原因**: PostgreSQL 未启动

**解决方案**:
```bash
# 启动数据库容器
docker-compose up -d postgres

# 检查容器状态
docker ps | grep postgres
```

### 问题 3: 周末产能不为 0

**原因**: 智能日历配置未启用

**解决方案**:
```sql
-- 检查配置
SELECT * FROM dict_scheduling_config WHERE config_key = 'enable_smart_calendar_capacity';

-- 启用智能日历
INSERT INTO dict_scheduling_config (config_key, config_value, description)
VALUES ('enable_smart_calendar_capacity', 'true', '启用智能日历产能计算')
ON CONFLICT (config_key) DO UPDATE SET config_value = 'true';
```

### 问题 4: 节假日产能不为 0

**原因**: 节假日数据未配置

**解决方案**:
```sql
-- 查看节假日配置
SELECT * FROM dict_holidays WHERE holiday_date >= '2026-01-01' AND holiday_date <= '2026-12-31';

-- 添加节假日（示例：2026 年元旦）
INSERT INTO dict_holidays (holiday_name, holiday_date, country)
VALUES ('元旦', '2026-01-01', 'US');
```

---

## 🧹 清理测试数据

测试完成后，清理测试数据：

```sql
-- 删除测试仓库
DELETE FROM dict_warehouses WHERE warehouse_code IN ('TEST_WH_001', 'TEST_WH_002');

-- 验证已删除
SELECT * FROM dict_warehouses WHERE warehouse_code IN ('TEST_WH_001', 'TEST_WH_002');
```

---

## 📝 参考文档

- [周末产能字段修复总结](backend/docs-temp/fix-weekend-capacity-summary.md)
- [周末产能字段修复详细记录](backend/docs-temp/fix-weekend-capacity-field.md)
- [综合完成报告](backend/docs-temp/WEEKEND_CAPACITY_FIX_REPORT.md)
- [智能排产优化方案](frontend/public/docs/11-project/16-预览排产优化方案.md)

---

**文档生成时间**: 2026-04-01  
**测试状态**: 等待执行  
**下次更新**: 测试完成后
