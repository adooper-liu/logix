# Shipments页面调试指南

## 调试信息位置

所有调试信息都通过前缀 `[Shipments]` 或 `[LogiX-Debug]` 标记，可在浏览器控制台查看。

## 主要交互点

### 1. 🔍 搜索按钮
```
🔍 [Shipments] 搜索按钮点击
- searchKeyword: 搜索关键词
- shipmentDateRange: 日期范围
- currentPage: 当前页码
```

### 2. 🔄 重置按钮
```
🔄 [Shipments] 重置搜索按钮点击
- beforeKeyword: 重置前的关键词
- beforeFilter: 重置前的过滤条件

✅ [Shipments] 重置完成
- afterKeyword: 重置后的关键词
- afterFilter: 重置后的过滤条件
```

### 3. 📅 日期范围筛选
```
📅 [Shipments] 日期范围改变
- value: 原始日期值
- formattedValue: 格式化后的日期（YYYY-MM-DD）

✅ [Shipments] 日期筛选完成
```

### 4. 🎯 倒计时卡片点击（重点）
```
🎯 [Shipments] 倒计时卡片点击
- type: 筛选类型（如"按提柜计划"）
- days: 时间维度（如"overdue"）
- filterLabel: 组合标签（如"按提柜计划 - overdue"）
- path: 完整调用路径
  frontend → handleCountdownFilter → loadContainersByFilter → backend API
```

### 5. 🔄 刷新统计数据
```
🔄 [Shipments] 刷新统计数据按钮点击
```

### 6. 📄 分页改变
```
📄 [Shipments] 分页改变
- fromPage: 起始页
- toPage: 目标页
- hasFilter: 是否有过滤条件
- filter: 当前过滤条件

📄 [Shipments] 使用前端分页（已加载全部数据）
或
📄 [Shipments] 使用后端分页
```

### 7. 📏 页面大小改变
```
📏 [Shipments] 页面大小改变
- fromPageSize: 起始大小
- toPageSize: 目标大小
- hasFilter: 是否有过滤条件
- filter: 当前过滤条件

📏 [Shipments] 使用前端分页（已加载全部数据）
或
📏 [Shipments] 使用后端分页
```

### 8. 👁️ 查看详情
```
👁️ [Shipments] 查看详情按钮点击
- containerNumber: 集装箱号
- orderNumber: 订单号
- targetPath: 目标路由路径
```

### 9. ✏️ 编辑按钮
```
✏️ [Shipments] 编辑按钮点击
- containerNumber: 集装箱号
- orderNumber: 订单号
```

## 数据加载调试

### loadContainers（正常加载）
```
📦 [Shipments] loadContainers 开始
- page: 页码
- pageSize: 每页大小
- keyword: 搜索关键词
- dateRange: 日期范围
- path: 完整调用路径

📦 [Shipments] loadContainers 后端响应
- success: 是否成功
- count: 总数
- itemsLength: 返回条目数
- firstItem: 第一条数据
- lastItem: 最后一条数据

✅ [Shipments] 成功加载 X 条货柜数据
或
⚠️ [Shipments] 后端返回空数据
```

### loadContainersByFilter（过滤加载）
```
🎯 [Shipments] 倒计时卡片点击（触发点）

Loading containers by filter condition from backend:
- filterCondition: 后端筛选条件（如"overduePlanned"）
- filterType: 前端类型（如"按提柜计划"）
- originalDays: 原始days值（如"overdue"）
- startDate: 开始日期
- endDate: 结束日期

后端日志：
[ContainerStatisticsService] Route to service: plannedPickup
[PlannedPickupStatisticsService] Method: getContainersByOverduePlanned
[PlannedPickupStatisticsService] SQL result count: 46
[PlannedPickupStatisticsService] Final containers count: 46

Loaded 0 containers from backend filter（如果是错误）
Loaded 46 containers from backend filter（如果是正确）
```

### loadStatistics（统计加载）
```
Loading detailed statistics from backend...
Statistics loaded: { statusDistribution, arrivalDistribution, ... }
```

## 快速排错流程

### 问题1: 点击统计卡片返回0条数据

1. **查看前端日志**
   ```
   🎯 [Shipments] 倒计时卡片点击
   - type: "按提柜计划"
   - days: "overdue"
   ```

2. **查看映射日志**
   ```
   Loading containers by filter condition from backend:
   - filterCondition: "overduePlanned"  ← 检查是否正确映射
   - filterType: "按提柜计划"
   - originalDays: "overdue"
   ```

3. **查看后端路由日志**
   ```
   [ContainerStatisticsService] Route to service: plannedPickup
   ```

4. **查看服务方法日志**
   ```
   [PlannedPickupStatisticsService] Method: getContainersByOverduePlanned
   [PlannedPickupStatisticsService] SQL result count: 0  ← 如果是0，说明SQL查询有问题
   ```

5. **对比统计方法日志**
   ```
   [getOverduePlanned] Count result: 46  ← 统计方法返回46，但查询方法返回0
   ```

**排错结论**：查询方法与统计方法使用了不同的SQL条件，需要确保两者一致。

### 问题2: 前端映射失败

1. **检查映射日志**
   ```
   Loading containers by filter condition from backend:
   - filterCondition: "overdue"  ← 应该是"overduePlanned"
   ```

2. **检查FILTER_CONDITION_MAP**
   ```
   前端日志应该显示：
   filterCondition = FILTER_CONDITION_MAP["按提柜计划"]["overdue"]
   结果应该是: "overduePlanned"
   ```

**排错结论**：前端映射逻辑错误，需要检查`Shipments.vue`中的映射代码。

### 问题3: 后端路由失败

1. **查看路由日志**
   ```
   [ContainerStatisticsService] Unknown filterCondition: overduePlanned
   ```

2. **检查CONDITION_TO_SERVICE_MAP**
   ```
   应该包含: { overduePlanned: 'plannedPickup' }
   ```

**排错结论**：后端常量文件缺少映射，需要在`shared/constants/FilterConditions.ts`中添加。

### 问题4: 服务方法未找到

1. **查看服务日志**
   ```
   [PlannedPickupStatisticsService] Unknown filterCondition: overduePlanned
   ```

2. **检查METHOD_MAP**
   ```
   应该包含: { [FilterCondition.OVERDUE_PLANNED]: method }
   ```

**排错结论**：服务方法Map映射错误，检查switch/case或METHOD_MAP。

## 调试最佳实践

1. **按顺序查看日志**：从前端 → 中间层 → 后端路由 → 服务方法 → SQL查询
2. **关注关键点**：filterCondition映射、service路由、method查找
3. **对比统计和查询**：统计方法返回count，查询方法返回items，两者应使用相同SQL
4. **使用console.table**：对于大量数据，使用`console.table(data)`查看表格化输出

## 控制台过滤技巧

在Chrome DevTools中，可以过滤日志：

```javascript
// 只看Shipments相关日志
[Shipments]

// 只看点击事件
🖱️

// 只看API调用
🌐

// 只看错误
❌
```
