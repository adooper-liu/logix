# 车队选择优化方案 - Phase 3 测试与优化指南

**创建日期**: 2026-03-26  
**测试状态**: 🟡 **待执行**  
**遵循原则**: SKILL 原则（真实性、权威性、完整性）

---

## 📋 **Phase 3 测试计划**

### **测试目标**

1. ✅ 验证关系评分逻辑正确性
2. ✅ 验证综合评分模型有效性
3. ✅ 验证保底分配机制
4. ✅ 性能分析与参数调优

---

## 🔧 **测试策略**

由于单元测试需要复杂的 Mock 设置，我们采用**集成测试 + 日志分析**的方式：

```
实际排产 → 记录日志 → 分析结果 → 验证功能
```

---

## 🎯 **测试场景设计**

### **场景 1: 成本优先（日常）**

**测试目的**: 验证成本评分逻辑

**前置条件**:

- 仓库 A 映射 3 个车队
- 车队 1: 成本$180, 日产能 50
- 车队 2: 成本$200, 日产能 60
- 车队 3: 成本$220, 日产能 80

**预期结果**:

```
车队 1: costScore=100, capacityScore=100, relationshipScore=?
总分 = 100×0.4 + 100×0.3 + ?×0.3

如果关系分相近 → 选择车队 1（成本最低）✅
```

**验证方法**:

```bash
# 查看日志
[IntelligentScheduling] Selected trucking company: TRUCK_001,
score=XX.XX, cost=180
```

---

### **场景 2: 能力约束（繁忙期）**

**测试目的**: 验证能力约束逻辑

**前置条件**:

- 车队 1: 档期已满（无能力）
- 车队 2: 有剩余能力
- 车队 3: 有剩余能力

**预期结果**:

```
车队 1: capacityScore=0 → 直接淘汰
车队 2: capacityScore=100 → 参与评分
车队 3: capacityScore=100 → 参与评分

选择得分最高的车队 2 或 3 ✅
```

**验证方法**:

```bash
# 查看日志中是否有能力检查记录
[ExtTruckingSlotOccupancy] Planned trips >= capacity
```

---

### **场景 3: 关系维护（淡季）**

**测试目的**: 验证关系评分逻辑

**前置条件**:

- 车队 A: 长期合作伙伴（过去 30 天合作 8 次）
- 车队 B: 新合作伙伴（过去 30 天合作 0 次）
- 成本相近（$200 vs $195）

**预期结果**:

```
车队 A:
- 基础分：50
- 合作加分：8×2 = 16
- 运力加分：60>=50 → +15
- 服务加分：+5
- 关系分：86

车队 B:
- 基础分：50
- 合作加分：0
- 运力加分：30<50 → 0
- 服务加分：+5
- 关系分：55

综合得分：
车队 A: costScore×0.4 + capacityScore×0.3 + 86×0.3
车队 B: costScore×0.4 + capacityScore×0.3 + 55×0.3

即使车队 B 成本低$5，但关系分差 31 分
最终可能选择车队 A ✅
```

**验证方法**:

```bash
# 查看关系评分日志
[IntelligentScheduling] Relationship score for TRUCK_A: 86.00
(collaboration: 8, base: 50)

[IntelligentScheduling] Relationship score for TRUCK_B: 55.00
(collaboration: 0, base: 50)
```

---

### **场景 4: 混合场景（综合验证）**

**测试目的**: 验证多目标平衡

**前置条件**:

- 3 个车队竞争
- 成本、能力、关系各不相同

**数据示例**:

| 指标         | 车队 A | 车队 B | 车队 C |
| ------------ | ------ | ------ | ------ |
| **成本**     | $200   | $180   | $220   |
| **能力**     | ✅ 有  | ✅ 有  | ❌ 无  |
| **合作次数** | 8 次   | 0 次   | 3 次   |
| **日产能**   | 60     | 30     | 80     |

**预期评分**:

```
① 成本评分
   车队 A: 50 分
   车队 B: 100 分 ← 成本最低
   车队 C: 0 分

② 能力评分
   车队 A: 100 分
   车队 B: 100 分
   车队 C: 0 分（淘汰）

③ 关系评分
   车队 A: 86 分 ← 长期伙伴
   车队 B: 55 分 ← 新伙伴
   车队 C: 76 分

④ 综合得分
   车队 A: 50×0.4 + 100×0.3 + 86×0.3 = 75.8 分
   车队 B: 100×0.4 + 100×0.3 + 55×0.3 = 86.5 分 ← 最优
   车队 C: 0×0.4 + 0×0.3 + 76×0.3 = 22.8 分

结果：车队 B 胜出（成本优势明显）✅
```

---

## 🧪 **执行测试步骤**

### **Step 1: 准备测试数据**

```sql
-- 1. 确保有至少 3 个车队映射到同一个仓库
SELECT * FROM dict_warehouse_trucking_mapping
WHERE warehouse_code = 'WH_TEST_001';

-- 2. 查看车队基本信息
SELECT company_code, company_name, daily_capacity, has_yard
FROM trucking_company
WHERE company_code IN ('TRUCK_001', 'TRUCK_002', 'TRUCK_003');

-- 3. 查看历史合作记录
SELECT trucking_company_id, COUNT(*) as collaboration_count
FROM container
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY trucking_company_id;
```

---

### **Step 2: 启动后端服务（调试模式）**

```bash
cd backend
npm run dev
```

**观察日志输出**:

```bash
# 应该看到详细的关系评分日志
[IntelligentScheduling] Relationship score for TRUCK_001: 86.00
(collaboration: 8, base: 50)

[IntelligentScheduling] Scored candidates:
- TRUCK_001: cost=200, capacity=100, relationship=86, total=75.8
- TRUCK_002: cost=180, capacity=100, relationship=55, total=86.5
- TRUCK_003: cost=220, capacity=0, relationship=76, total=22.8

[IntelligentScheduling] Selected trucking company: TRUCK_002,
score=86.50, cost=180
```

---

### **Step 3: 执行排产**

**前端操作**:

1. 访问排产页面
2. 点击"预览排产"
3. 观察日志输出
4. 确认排产结果

**查看数据库**:

```sql
-- 查看最新排产的货柜使用的车队
SELECT container_number, trucking_company_id, planned_pickup_date
FROM container
WHERE schedule_status = 'scheduled'
ORDER BY created_at DESC
LIMIT 10;
```

---

### **Step 4: 分析结果**

**验证清单**:

- [ ] **成本评分**: 是否成本越低分数越高？
- [ ] **能力评分**: 无能力的车队是否被淘汰？
- [ ] **关系评分**: 长期合作伙伴是否有加分？
- [ ] **综合得分**: 权重是否正确（40%/30%/30%）？
- [ ] **最终选择**: 是否选择了得分最高的车队？

---

## 📊 **性能分析**

### **查询性能要求**

| 查询类型         | 目标时间 | 可接受时间 |
| ---------------- | -------- | ---------- |
| **关系评分统计** | < 100ms  | < 500ms    |
| **候选车队筛选** | < 200ms  | < 1s       |
| **综合评分计算** | < 50ms   | < 200ms    |
| **总耗时**       | < 500ms  | < 2s       |

### **性能监控 SQL**

```sql
-- 查看最近 30 天合作统计查询性能
EXPLAIN ANALYZE
SELECT COUNT(*) FROM container
WHERE trucking_company_id = 'TRUCK_001'
  AND created_at >= NOW() - INTERVAL '30 days';

-- 期望结果：使用索引扫描，耗时 < 100ms
```

### **优化建议**

如果性能不达标：

1. **添加索引**:

```sql
CREATE INDEX idx_container_trucking_created
ON container(trucking_company_id, created_at);
```

2. **缓存统计数据**:
   - 在 `trucking_company` 表添加 `recent_collaboration_count` 字段
   - 每天定时更新
   - 查询时直接读取，避免实时统计

3. **批量计算**:
   - 一次性计算所有车队的关系分
   - 缓存到内存中
   - 排产时直接使用

---

## 🔧 **参数调优**

### **当前参数配置**

```typescript
const WEIGHTS = {
  cost: 0.4, // 成本权重 40%
  capacity: 0.3, // 能力权重 30%
  relationship: 0.3, // 关系权重 30%
};

const RELATIONSHIP_PARAMS = {
  baseScore: 50, // 基础分
  collaborationMultiplier: 2, // 合作频次系数
  maxCollaborationBonus: 20, // 合作加分上限
  capacityThreshold: 50, // 运力规模阈值
  capacityBonus: 15, // 运力加分
  serviceQualityBonus: 5, // 服务质量加分
};
```

### **调优场景**

#### **场景 1: 成本敏感型业务**

```typescript
// 提高成本权重
WEIGHTS = {
  cost: 0.6, // ↑ 60%
  capacity: 0.25, // ↓ 25%
  relationship: 0.15, // ↓ 15%
};
```

#### **场景 2: 关系导向型业务**

```typescript
// 提高关系权重
WEIGHTS = {
  cost: 0.3, // ↓ 30%
  capacity: 0.3, // 保持 30%
  relationship: 0.4, // ↑ 40%
};
```

#### **场景 3: 旺季模式**

```typescript
// 提高能力权重
WEIGHTS = {
  cost: 0.3, // ↓ 30%
  capacity: 0.5, // ↑ 50%
  relationship: 0.2, // ↓ 20%
};
```

### **调优方法**

1. **A/B 测试**:
   - 在不同时间段使用不同权重
   - 对比成本和满意度指标
   - 找到最优配置

2. **数据分析**:
   - 收集历史排产数据
   - 分析各维度的影响
   - 回归分析确定最优权重

3. **业务反馈**:
   - 收集采购团队意见
   - 收集车队反馈
   - 平衡各方利益

---

## ✅ **验收标准**

### **功能验收**

- [ ] **成本优先**: 成本越低分数越高
- [ ] **能力约束**: 无能力的车队被淘汰
- [ ] **关系维护**: 长期合作伙伴有加分
- [ ] **综合评分**: 权重配置正确
- [ ] **决策优化**: 选择得分最高的车队

### **性能验收**

- [ ] **单次排产耗时**: < 2 秒
- [ ] **关系评分统计**: < 500ms
- [ ] **候选车队筛选**: < 1 秒
- [ ] **数据库查询**: 使用索引，无全表扫描

### **业务验收**

- [ ] **成本下降**: 平均运输成本↓10-15%
- [ ] **车队利用率**: 提升↑20%
- [ ] **合作关系**: 核心车队满意度↑30%
- [ ] **排产成功率**: 提升↑5%

---

## 📝 **测试报告模板**

### **测试执行记录**

| 测试日期   | 测试场景 | 测试结果 | 备注 |
| ---------- | -------- | -------- | ---- |
| 2026-03-26 | 成本优先 | ✅/❌    | 描述 |
| 2026-03-26 | 能力约束 | ✅/❌    | 描述 |
| 2026-03-26 | 关系维护 | ✅/❌    | 描述 |
| 2026-03-26 | 混合场景 | ✅/❌    | 描述 |

### **性能测试结果**

| 指标             | 目标值  | 实测值 | 是否达标 |
| ---------------- | ------- | ------ | -------- |
| **关系评分统计** | < 500ms | XX ms  | ✅/❌    |
| **候选车队筛选** | < 1s    | XX ms  | ✅/❌    |
| **总耗时**       | < 2s    | XX ms  | ✅/❌    |

### **问题与改进**

| 问题描述     | 影响程度 | 改进建议 | 负责人 |
| ------------ | -------- | -------- | ------ |
| 示例：查询慢 | 中       | 添加索引 | @张三  |

---

## 🎉 **下一步行动**

### **立即执行（今天）**

1. **准备测试数据**

   ```sql
   -- 确保有足够的测试数据
   SELECT COUNT(*) FROM container WHERE schedule_status = 'initial';
   ```

2. **启动后端服务**

   ```bash
   cd backend
   npm run dev
   ```

3. **执行排产测试**
   - 访问排产页面
   - 点击"预览排产"
   - 观察日志

4. **分析结果**
   - 查看日志中的评分详情
   - 验证是否符合预期
   - 记录测试结果

### **明天可以做的**

1. **性能分析**
   - 查看慢查询日志
   - 分析 EXPLAIN 结果
   - 考虑是否需要优化

2. **参数调优**
   - 根据测试结果调整权重
   - 收集业务反馈
   - 迭代优化

3. **文档更新**
   - 更新测试报告
   - 记录最佳实践
   - 分享给团队

---

_本测试指南遵循 SKILL 原则，所有测试场景基于实际业务需求_
