# 智能排柜优化提案

**日期**: 2026-03-17  
**优先级**: P0（关键阻塞修复） → P2（功能增强）  
**状态**: 提案中

---

## 📊 当前实现分析

### 已实现的核心逻辑 ✅

1. **映射关系链**：港口 → 车队 → 仓库（严格匹配，禁止回退）
2. **排产流程**：清关日 → 提柜日 → 卸柜日 → 还箱日
3. **仓库排序**：is_default > 自营仓 > 平台仓 > 第三方仓
4. **卸柜方式**：Live load（提=送=卸）vs Drop off（提<送=卸）
5. **清关公司匹配**：按国家代码匹配（但数据库缺少 country 字段）

### 发现的问题 ⚠️

| 问题                                       | 影响                                         | 优先级 |
| ------------------------------------------ | -------------------------------------------- | ------ |
| `dict_customs_brokers` 缺少 `country` 字段 | 清关公司无法按国家匹配，始终返回 UNSPECIFIED | P0     |
| 仓库选择仅考虑优先级，未考虑距离/成本      | 可能选择非最优仓库                           | P2     |
| 车队选择未考虑价格因素                     | 可能增加物流成本                             | P2     |
| 无可视化排程调整工具                       | 用户无法手动优化排产结果                     | P3     |

---

## 🔧 立即执行的修复（P0）

### 修复 1：为 `dict_customs_brokers` 添加 `country` 字段

#### 文件变更

1. **`backend/03_create_tables.sql`** - 更新建表语句

   ```sql
   ALTER TABLE dict_customs_brokers
   ADD COLUMN country VARCHAR(50);

   CREATE INDEX idx_customs_brokers_country ON dict_customs_brokers(country);
   ```

2. **`backend/migrations/006_add_customs_broker_country.sql`** - 新增迁移脚本

   - 添加字段和索引
   - 更新现有数据的国家信息
   - 初始化"未指定"清关公司

3. **`backend/migrations/006_add_customs_broker_country_data.sql`** - 示例数据
   - 美国、加拿大、欧洲、澳洲、亚洲清关公司示例

#### 验证步骤

```bash
# 1. 执行迁移脚本
psql -U postgres -d logix -f backend/migrations/006_add_customs_broker_country.sql

# 2. 验证字段已添加
psql -U postgres -d logix -c "\d dict_customs_brokers"

# 3. 验证数据
psql -U postgres -d logix -c "SELECT country, COUNT(*) FROM dict_customs_brokers WHERE country IS NOT NULL GROUP BY country;"

# 4. 重启后端服务
cd backend && npm run dev

# 5. 测试智能排产
curl -X POST http://localhost:3000/api/v1/scheduling/schedule \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2026-03-17","endDate":"2026-03-31"}'
```

---

## 🚀 后续优化建议（P2-P3）

### 优化 1：仓库选择增加距离/成本权重

**现状**：仅按 `is_default` > 自营仓 > 平台仓排序

**改进方案**：

```typescript
interface WarehouseScore {
  warehouse: Warehouse;
  priorityScore: number; // is_default + 属性类型
  distanceScore: number; // 距港口的距离（公里）
  costScore: number; // 单位成本（元/柜）
  totalScore: number; // 加权总分
}

// 权重配置（可在系统设置中调整）
const WEIGHTS = {
  priority: 0.5, // 优先级权重 50%
  distance: 0.3, // 距离权重 30%
  cost: 0.2, // 成本权重 20%
};
```

**实现步骤**：

1. 在 `dict_warehouse_trucking_mapping` 中添加 `distance_km` 和 `cost_per_container` 字段
2. 修改 `getCandidateWarehouses()` 计算综合得分
3. 选择总分最高的仓库而非仅按优先级

---

### 优化 2：车队选择增加价格评分

**现状**：从映射表中选第一个有档期的车队

**改进方案**：

```typescript
interface TruckingScore {
  company: TruckingCompany;
  priceScore: number; // 报价（元/车次）
  serviceScore: number; // 服务评分（1-5 星）
  availableScore: number; // 剩余档期
  totalScore: number;
}
```

**所需数据**：

- 创建 `dict_trucking_price` 表（港口 → 仓库 → 车队 → 价格）
- 在 `dict_trucking_companies` 中添加 `service_rating` 字段

---

### 优化 3：滞港费精细化计算

**现状**：使用 `lastFreeDate` 作为单一约束

**改进方案**：

```typescript
interface DemurrageCalculation {
  freeDays: number; // 免租期（如 7 天）
  overdueDays: number; // 超期天数
  tier1Rate: number; // 1-7 天超期费率
  tier2Rate: number; // 8-14 天超期费率
  tier3Rate: number; // 15+ 天超期费率
  totalFee: number; // 总费用
}
```

**已实现**：`demurrage.service.ts` 已存在，需在排产时调用并写入 `ext_demurrage_records`

---

### 优化 4：可视化排程调整（P3）

**功能**：

- 甘特图展示各仓库/车队的排产计划
- 拖拽调整货柜的仓库分配
- 实时显示冲突检测（产能超限、档期冲突）
- 多方案对比（成本、时效、资源利用率）

**技术选型**：

- 前端：基于现有 `SimpleGanttChartRefactored.vue` 扩展
- 后端：新增 `/scheduling/gantt` API 返回排产计划数据

---

## 📋 实施计划

### Phase 1: 关键修复（本周）

- [x] 添加 `country` 字段到 `dict_customs_brokers`
- [ ] 执行迁移脚本并验证数据
- [ ] 测试清关公司匹配功能

### Phase 2: 业务优化（下周）

- [ ] 实现仓库选择的距离/成本权重
- [ ] 实现车队选择的价格评分
- [ ] 集成滞港费计算到排产流程

### Phase 3: 用户体验（下下周）

- [ ] 可视化排程甘特图
- [ ] 拖拽调整功能
- [ ] 多方案对比工具

---

## 📊 预期收益

| 优化项           | 预期效果                | 实现难度 |
| ---------------- | ----------------------- | -------- |
| country 字段修复 | 清关公司匹配准确率 100% | ⭐       |
| 仓库选择优化     | 物流成本降低 10-15%     | ⭐⭐⭐   |
| 车队选择优化     | 运输成本降低 5-10%      | ⭐⭐     |
| 滞港费优化       | 超期费用减少 20-30%     | ⭐⭐     |
| 可视化工具       | 人工干预效率提升 50%    | ⭐⭐⭐⭐ |

---

## 🔗 相关文件

- **核心服务**: `backend/src/services/intelligentScheduling.service.ts`
- **建表脚本**: `backend/03_create_tables.sql`
- **迁移脚本**: `backend/migrations/006_add_customs_broker_country.sql`
- **示例数据**: `backend/migrations/006_add_customs_broker_country_data.sql`
- **前端页面**: `frontend/src/views/scheduling/SchedulingVisual.vue`
- **技能文档**: `.cursor/skills/intelligent-scheduling-mapping/SKILL.md`

---

## ✅ 下一步行动

1. **立即执行**：运行迁移脚本修复 `country` 字段
2. **验证功能**：测试智能排产，确认清关公司正确匹配
3. **收集反馈**：用户对仓库/车队选择策略的意见
4. **排期优化**：根据业务优先级安排 P2、P3 优化项
