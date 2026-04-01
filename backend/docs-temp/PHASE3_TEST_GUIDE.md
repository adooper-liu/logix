# Phase 3 测试验证指南

**创建时间**: 2026-04-01  
**作者**: 刘志高  
**版本**: v1.0

---

## 📋 测试概述

本文档提供 Phase 3 新增功能的完整测试流程，包括单元测试、集成测试和 E2E 测试。

---

## 🔧 环境准备

### 前置条件
- ✅ Node.js 18+ 
- ✅ PostgreSQL 数据库
- ✅ Redis 服务
- ✅ 后端服务运行在 http://localhost:3001
- ✅ 前端服务运行在 http://localhost:5173

### 测试数据准备

```sql
-- 确保有以下测试数据
SELECT * FROM scheduling_history WHERE container_number = 'HMMU6232153';
SELECT * FROM dict_holidays WHERE country_code = 'US';
```

---

## ✅ 单元测试

### 运行命令

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- CacheService.test.ts
npm test -- smartCalendarCapacity.test.ts
```

### 测试覆盖率

```bash
# 生成覆盖率报告
npm test -- --coverage

# 查看 HTML 报告
open backend/coverage/index.html
```

---

## 🌐 集成测试（API 端点）

### 1. 测试成本重算 API

**端点**: `POST /api/v1/scheduling/cost/recalculate`

**cURL 命令**:
```bash
curl -X POST http://localhost:3001/api/v1/scheduling/cost/recalculate \
  -H "Content-Type: application/json" \
  -d '{
    "containers": [
      {
        "containerNumber": "HMMU6232153",
        "nodes": [
          {"type": "pickup", "date": "2026-04-05"},
          {"type": "delivery", "date": "2026-04-06"},
          {"type": "unload", "date": "2026-04-07"},
          {"type": "return", "date": "2026-04-11"}
        ]
      }
    ]
  }'
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "totalCost": 1500,
    "breakdown": {
      "demurrage": 200,
      "detention": 150,
      "transportation": 300
    },
    "optimization": {
      "suggestion": "发现 1 个货柜可通过调整日期降低成本",
      "potentialSavings": 75
    }
  }
}
```

**验证点**:
- ✅ HTTP 状态码 200
- ✅ success: true
- ✅ totalCost > 0
- ✅ breakdown 包含各项费用
- ✅ 如果是周末提柜，应有 optimization 建议

---

### 2. 测试保存 API

**端点**: `POST /api/v1/scheduling/save`

**cURL 命令**:
```bash
curl -X POST http://localhost:3001/api/v1/scheduling/save \
  -H "Content-Type: application/json" \
  -d '{
    "schedulingId": "SCH-20260401-001",
    "containers": [
      {
        "containerNumber": "HMMU6232153",
        "nodes": [
          {"type": "pickup", "date": "2026-04-06"},
          {"type": "delivery", "date": "2026-04-07"}
        ]
      }
    ]
  }'
```

**预期响应**:
```json
{
  "success": true,
  "message": "保存成功",
  "data": {
    "savedCount": 1
  }
}
```

**验证点**:
- ✅ HTTP 状态码 200
- ✅ success: true
- ✅ message: "保存成功"
- ✅ savedCount >= 1

---

### 3. 测试获取优化建议 API

**端点**: `GET /api/v1/scheduling/optimizations`

**cURL 命令**:
```bash
curl -X GET "http://localhost:3001/api/v1/scheduling/optimizations?containerNumbers=HMMU6232153&startDate=2026-04-01&endDate=2026-04-30"
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "containerNumber": "HMMU6232153",
        "title": "调整提柜日期至非高峰时段",
        "priority": "high",
        "savings": 150
      }
    ],
    "totalPotentialSavings": 150
  }
}
```

**验证点**:
- ✅ HTTP 状态码 200
- ✅ suggestions 是数组
- ✅ 每个建议包含 containerNumber, title, priority, savings

---

### 4. 测试应用优化建议 API

**端点**: `POST /api/v1/scheduling/optimization/apply`

**cURL 命令**:
```bash
curl -X POST http://localhost:3001/api/v1/scheduling/optimization/apply \
  -H "Content-Type: application/json" \
  -d '{
    "containerNumber": "HMMU6232153",
    "suggestion": {
      "containerNumber": "HMMU6232153",
      "title": "调整提柜日期至非高峰时段",
      "savings": 150
    }
  }'
```

**预期响应**:
```json
{
  "success": true,
  "message": "优化建议已应用",
  "data": {
    "containerNumber": "HMMU6232153",
    "appliedAt": "2026-04-01T10:30:00Z"
  }
}
```

**验证点**:
- ✅ HTTP 状态码 200
- ✅ success: true
- ✅ appliedAt 是有效的 ISO 日期

---

## 🖥️ E2E 测试（用户操作流程）

### 测试场景 1: 拖拽调整日期

**步骤**:
1. 打开排产预览页面
   ```
   http://localhost:5173/scheduling/visual
   ```

2. 选择一个货柜

3. 拖拽提柜日期节点到新的日期

4. **验证点**:
   - ✅ 任务条移动到新日期位置
   - ✅ 实时成本面板更新
   - ✅ 显示节省金额（如果有）

5. 点击"确认保存"按钮

6. **验证点**:
   - ✅ 显示"保存成功"提示
   - ✅ 刷新页面后日期保持在新位置

---

### 测试场景 2: 查看优化建议

**步骤**:
1. 打开排产预览页面

2. 如果有优化建议，会显示建议卡片

3. **验证点**:
   - ✅ 建议卡片显示优先级标签
   - ✅ 显示原始成本和优化后成本
   - ✅ 显示节省金额

4. 点击"应用此建议"

5. **验证点**:
   - ✅ 日期自动调整
   - ✅ 成本更新
   - ✅ 显示成功提示

---

### 测试场景 3: 成本趋势图表

**步骤**:
1. 打开成本趋势页面

2. 选择日期范围

3. **验证点**:
   - ✅ 图表正确渲染
   - ✅ 显示总成本、滞港费、滞箱费、运输费曲线
   - ✅ 数据摘要显示平均成本、最高/最低成本

4. 切换图表类型（折线图 ↔ 柱状图）

5. **验证点**:
   - ✅ 图表类型切换正常
   - ✅ 数据保持一致

---

### 测试场景 4: 甘特图视图

**步骤**:
1. 打开甘特图页面

2. **验证点**:
   - ✅ 资源列表显示
   - ✅ 任务条按日期排列
   - ✅ 不同任务类型颜色不同

3. 缩放视图（放大/缩小）

4. **验证点**:
   - ✅ 任务条宽度变化
   - ✅ 可见日期范围变化

5. 点击任务条查看详情

6. **验证点**:
   - ✅ 显示详情对话框
   - ✅ 信息准确完整

---

## 📊 性能测试

### 负载测试脚本

```javascript
// load-test.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/scheduling/cost/recalculate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

// 并发 10 个请求
for (let i = 0; i < 10; i++) {
  const req = http.request(options, (res) => {
    console.log(`Request ${i}: STATUS ${res.statusCode}`);
  });
  
  req.write(JSON.stringify({
    containers: [{
      containerNumber: `HMMU623215${i}`,
      nodes: []
    }]
  }));
  
  req.end();
}
```

**运行命令**:
```bash
node load-test.js
```

**验证点**:
- ✅ 所有请求返回 200
- ✅ 平均响应时间 < 500ms
- ✅ 无内存泄漏

---

## 🐛 常见问题排查

### 问题 1: API 返回 404

**可能原因**:
- 后端服务未启动
- 路由未正确注册

**解决方案**:
```bash
# 检查后端服务
cd backend
npm run dev

# 查看路由注册日志
# 应看到类似：
# [Scheduling Routes] ✅ cost/recalculate route registered
```

---

### 问题 2: 成本计算结果为 0

**可能原因**:
- 数据库中无排产历史
- DemurrageService 未正确初始化

**解决方案**:
```sql
-- 检查排产历史
SELECT * FROM scheduling_history 
WHERE container_number = 'HMMU6232153';

-- 如无数据，先执行排产
```

---

### 问题 3: 拖拽不流畅

**可能原因**:
- 浏览器性能问题
- DOM 结构过深

**解决方案**:
- 使用 Chrome 浏览器
- 减少同时显示的集装箱数量
- 启用分页

---

### 问题 4: 优化建议不显示

**可能原因**:
- 提柜日期不是周末
- Mock 数据逻辑问题

**解决方案**:
```typescript
// 检查 recalculateCost 方法中的优化建议生成逻辑
if (isWeekend(pickupDate)) {
  // 生成优化建议
}
```

---

## ✅ 测试检查清单

### 后端 API
- [ ] POST /cost/recalculate 返回正确成本
- [ ] POST /save 成功保存修改
- [ ] GET /optimizations 返回建议列表
- [ ] POST /optimization/apply 应用建议
- [ ] 事务处理正常工作
- [ ] 错误处理完善

### 前端组件
- [ ] DragDropScheduler 拖拽流畅
- [ ] OptimizationSuggestions 显示正确
- [ ] CostTrendChart 图表渲染正常
- [ ] GanttChart 视图清晰
- [ ] 实时成本更新及时
- [ ] 保存操作成功

### 集成测试
- [ ] 前后端通信正常
- [ ] 数据一致性良好
- [ ] 错误提示友好
- [ ] 用户体验流畅

### 性能测试
- [ ] API 响应时间 < 500ms
- [ ] 前端渲染帧率 > 60fps
- [ ] 内存使用合理
- [ ] 无内存泄漏

---

## 📈 测试结果记录

### 单元测试结果
```
Test Suites: X passed, Y failed
Tests:       A passed, B failed
```

### 集成测试结果
| API 端点 | 状态码 | 响应时间 | 结果 |
|---------|--------|----------|------|
| POST /cost/recalculate | 200 | XXXms | ✅/❌ |
| POST /save | 200 | XXXms | ✅/❌ |
| GET /optimizations | 200 | XXXms | ✅/❌ |
| POST /optimization/apply | 200 | XXXms | ✅/❌ |

### E2E 测试结果
| 测试场景 | 通过率 | 问题数 |
|---------|--------|--------|
| 拖拽调整日期 | XX% | X |
| 查看优化建议 | XX% | X |
| 成本趋势图表 | XX% | X |
| 甘特图视图 | XX% | X |

---

## 📝 下一步行动

1. **修复发现的 Bug**
   - 记录所有测试中发现的问题
   - 按优先级排序
   - 逐一修复并回归测试

2. **补充测试用例**
   - 边界条件测试
   - 异常场景测试
   - 性能压力测试

3. **文档更新**
   - 更新 API 文档
   - 补充使用示例
   - 添加故障排查指南

---

**测试负责人**: 刘志高  
**最后更新**: 2026-04-01  
**下次测试计划**: 2026-04-08
