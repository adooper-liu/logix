# 全局问题排查 SKILL

## 核心原则

**剥洋葱式排查法**：从外层（用户看到的现象）逐层深入到内层（数据库实际数据），每一层都要验证预期与实际是否一致，避免局部修复导致新的问题。

## 排查流程（七层模型）

### 第一层：前端渲染需求（最外层 - 用户视角）
**问题**：用户看到了什么？期望看到什么？

**检查项**：
- [ ] 用户描述的实际现象是什么？
- [ ] 用户的期望效果是什么？
- [ ] 差异点在哪里？

**示例**：
```
实际：已提柜货柜的提柜泳道仍然显示绿色圆点
期望：已提柜货柜的提柜泳道圆点应该销毁，不显示
差异：提柜节点的显示逻辑有问题
```

### 第二层：前端渲染逻辑
**问题**：前端如何决定显示/隐藏元素？

**检查项**：
- [ ] 哪个组件负责渲染？
- [ ] 渲染条件是什么（v-if / v-show）？
- [ ] CSS 类名如何决定样式？

**工具**：
```bash
# 查看模板代码
grep_code(regex="v-if.*getNodeDisplayType", path="frontend/src/components")
```

**示例**：
```vue
<!-- SimpleGanttChartRefactored.vue Line 793 -->
<div
  v-if="getNodeDisplayType(container, node as string) !== null"
  class="container-dot"
  :class="{
    'main-task': getNodeDisplayType(container, node as string) === 'main',
    'dashed-task': getNodeDisplayType(container, node as string) === 'dashed',
  }"
></div>
```

**结论**：
- 如果 `getNodeDisplayType` 返回 `null` → 不显示
- 如果返回 `'main'` → 显示实心绿色圆点
- 如果返回 `'dashed'` → 显示虚线圆点

### 第三层：前端计算逻辑
**问题**：前端如何计算显示类型？

**检查项**：
- [ ] `getNodeDisplayType` 函数的实现逻辑
- [ ] 依赖哪些输入数据？
- [ ] 返回值的判断条件

**工具**：
```bash
# 查看函数实现
read_file(file_path="frontend/src/components/common/SimpleGanttChartRefactored.vue", start_line=1964, end_line=2008)
```

**示例**：
```typescript
// Line 1996-1998: 提柜节点使用本地状态
if (nodeName === '提柜') {
  return getNodeTypeFromLocalStatus(node)
}

// Line 1951-1956: 本地状态转换
const getNodeTypeFromLocalStatus = (node: any): 'main' | 'dashed' | null => {
  if (node.status === 'completed') return null      // 销毁
  if (node.status === 'active') return 'main'       // 实心绿色
  if (node.status === 'pending') return 'dashed'    // 虚线
  return null
}
```

**结论**：
- 提柜节点的状态由 `node.status` 决定
- 如果 `status='completed'` → 销毁
- 如果 `status='active'` → 实心绿色

### 第四层：前端状态计算
**问题**：前端如何计算节点状态？

**检查项**：
- [ ] `calculateNodeStatus` 函数的实现
- [ ] 如何从 API 返回数据中提取字段？
- [ ] 状态判断的业务规则

**工具**：
```bash
# 查看状态计算逻辑
read_file(file_path="frontend/src/components/common/SimpleGanttChartRefactored.vue", start_line=2612, end_line=2648)
```

**示例**：
```typescript
// Line 2636-2637: 提柜状态判断
if (pickupTransport.deliveryDate || pickupTransport.pickupDate) {
  nodes.提柜.status = 'completed' // 已送仓或已提柜 = 完成，销毁不显示
}
```

**关键依赖**：
- `pickupTransport` 来自 `container.truckingTransports[0]`
- 需要 `pickupDate` 或 `deliveryDate` 有值

**验证方法**：
```typescript
// 添加调试日志
console.log('[DEBUG] container.truckingTransports:', container.truckingTransports)
console.log('[DEBUG] pickupDate:', container.truckingTransports?.[0]?.pickupDate)
```

### 第五层：后端 API 返回数据
**问题**：后端返回的数据结构是否符合前端预期？

**检查项**：
- [ ] API 路由定义
- [ ] Controller 方法实现
- [ ] Service 层数据处理
- [ ] 返回的 JSON 结构

**工具**：
```bash
# 1. 查看路由定义
read_file(file_path="backend/src/routes/container.routes.ts", start_line=60, end_line=70)

# 2. 查看 Controller
grep_code(regex="async getContainers\\(", path="backend/src/controllers")

# 3. 查看 Service
grep_code(regex="async enrichContainersList\\(", path="backend/src/services")
```

**示例**：
```typescript
// backend/src/services/container.service.ts Line 372
return {
  ...container,
  truckingTransports: truckingTransport ? [truckingTransport] : [],
  // ...
}
```

**验证方法**：
```bash
# 直接在浏览器开发者工具 Network 标签查看 API 响应
# 或者使用 curl
curl http://localhost:3001/api/v1/containers?page=1&pageSize=10 \
  | jq '.items[] | select(.containerNumber == "HMMU6855127") | .truckingTransports'
```

### 第六层：数据库实际数据
**问题**：数据库中的实际数据是否支持业务逻辑？

**检查项**：
- [ ] 相关表的字段是否有值？
- [ ] 数据类型是否正确？
- [ ] 是否有 NULL 值导致逻辑失效？

**工具**：
```bash
# 创建查询脚本
create_file(file_path="backend/scripts/query-test-data.ts")

# 执行查询
npx ts-node scripts/query-test-data.ts
```

**示例**：
```sql
-- 查询 process_trucking_transport 表
SELECT 
  container_number,
  pickup_date,
  delivery_date,
  planned_pickup_date,
  planned_delivery_date
FROM process_trucking_transport
WHERE container_number IN ('HMMU6855127', 'GAOU6195045', 'KOCU5129260');
```

**验证结果**：
```
container_number | pickup_date          | delivery_date
-----------------+----------------------+---------------
HMMU6855127      | 2026-03-28 15:03:00  | NULL
GAOU6195045      | 2026-03-28 15:03:00  | NULL
KOCU5129260      | 2026-03-28 16:54:00  | NULL
```

**结论**：
- ✅ 数据库中有 `pickup_date` 值
- ✅ 后端会返回这个值
- ✅ 前端会接收到这个值
- ✅ 前端逻辑会将 status 设置为 'completed'
- ✅ 前端会销毁提柜圆点

### 第七层：后端业务逻辑（可选 - 如果需要后端也实现相同逻辑）
**问题**：后端是否需要实现相同的业务逻辑？

**检查项**：
- [ ] 后端是否有独立的计算逻辑（如 ganttDerived）？
- [ ] 后端的逻辑是否与前端一致？
- [ ] 是否需要数据迁移？

**工具**：
```bash
# 查看后端计算逻辑
read_file(file_path="backend/src/utils/ganttDerivedBuilder.ts", start_line=185, end_line=240)

# 创建迁移脚本
create_file(file_path="backend/scripts/migrate-data.ts")

# 执行迁移
npx ts-node scripts/migrate-data.ts
```

**示例**：
```typescript
// backend/src/utils/ganttDerivedBuilder.ts Line 223
// 已提柜 -> 清关、提柜销毁
else if ((hasDeliveryDate || hasPickupDate) && (key === 'customs' || key === 'pickup')) {
  taskRole = 'none';
}
```

## 排查 checklist

在修复任何问题前，必须完成以下检查：

### 数据流验证
- [ ] 第一层：明确用户看到的现象和期望
- [ ] 第二层：确认前端渲染条件和 CSS 类名
- [ ] 第三层：确认前端计算逻辑和返回值
- [ ] 第四层：确认前端状态计算的依赖字段
- [ ] 第五层：确认后端 API 返回的数据结构
- [ ] 第六层：确认数据库中的实际数据
- [ ] 第七层：确认后端业务逻辑（如果需要）

### 一致性验证
- [ ] 前端逻辑与后端逻辑是否一致？
- [ ] 数据库数据是否支持业务规则？
- [ ] API 返回数据是否符合前端预期？
- [ ] 修改后是否会影响其他功能？

### 测试验证
- [ ] 硬刷新浏览器（Ctrl+Shift+R）清除缓存
- [ ] 检查控制台日志确认数据流
- [ ] 验证多个测试用例（正常/边界/异常）
- [ ] 回归测试相关功能

## 常见陷阱

### 陷阱1：局部修复导致新问题
**错误做法**：
- 直接修改后端代码，假设前端会自动生效
- 没有验证前端实际接收到的数据

**正确做法**：
- 从前端渲染需求反推，逐层验证
- 确保每一层的输入输出都符合预期

### 陷阱2：忽略浏览器缓存
**错误做法**：
- 修改前端代码后直接刷新页面
- 认为代码已经更新

**正确做法**：
- 硬刷新浏览器（Ctrl+Shift+R）
- 检查 Network 标签确认加载的是最新代码

### 陷阱3：假设数据存在
**错误做法**：
- 假设数据库中有某个字段的值
- 假设 API 会返回某个字段

**正确做法**：
- 实际查询数据库验证
- 实际调用 API 验证返回数据

### 陷阱4：前后端逻辑不一致
**错误做法**：
- 只修改前端，不修改后端
- 只修改后端，不修改前端

**正确做法**：
- 遵循"单一真相源"原则
- 确保前后端逻辑一致
- 必要时进行数据迁移

### 陷阱5：组件中存在多套渲染逻辑
**错误做法**：
- 只检查一处渲染逻辑，忽略其他并存的渲染代码
- 假设所有相似元素都使用同一套逻辑
- 在错误的函数中添加调试代码

**真实案例**：
甘特图组件 `SimpleGanttChartRefactored.vue` 中同时存在两套圆点渲染逻辑：
- Line 145、189、687、793：使用 `getNodeDisplayType`（新版，支持反向链式依赖）
- Line 309：使用 `isMainTask/isDashedTask`（旧版，不支持反向链式依赖）

用户看到的圆点来自 Line 309 的旧版逻辑，但我一直在调试 Line 793 的 `getNodeDisplayType` 函数，绕了很多圈才发现问题。

**正确做法**：
1. **从实际 DOM 出发**：让用户右键检查元素，获取完整的 HTML 结构
2. **全局搜索渲染点**：使用 `grep_code` 搜索所有渲染目标元素的模板代码
   ```bash
   grep_code(regex="container-dot", path="frontend/src/components")
   ```
3. **对比不同模板**：检查每处渲染使用的逻辑是否一致
4. **统一修复**：确保所有渲染点使用同一套逻辑
5. **避免盲目调试**：不要在没有确认渲染逻辑前就添加调试代码

## 实战案例：甘特图提柜圆点销毁问题

### 问题描述
用户反馈：已提柜货柜的提柜泳道仍然显示绿色圆点，应该销毁。

### 排查过程

#### 第一层：前端渲染需求
- **实际**：提柜泳道显示绿色圆点
- **期望**：提柜泳道圆点销毁
- **差异**：提柜节点的显示逻辑

#### 第二层：前端渲染逻辑
- 文件：`SimpleGanttChartRefactored.vue` Line 793
- 条件：`v-if="getNodeDisplayType(container, node) !== null"`
- 结论：需要 `getNodeDisplayType` 返回 `null`

#### 第三层：前端计算逻辑
- 文件：`SimpleGanttChartRefactored.vue` Line 1996-1998
- 逻辑：提柜节点调用 `getNodeTypeFromLocalStatus(node)`
- 转换：`status='completed'` → `null`
- 结论：需要 `node.status='completed'`

#### 第四层：前端状态计算
- 文件：`SimpleGanttChartRefactored.vue` Line 2636-2637
- 逻辑：`if (pickupTransport.deliveryDate || pickupTransport.pickupDate) nodes.提柜.status = 'completed'`
- 依赖：`container.truckingTransports[0].pickupDate` 或 `deliveryDate`
- 结论：需要 API 返回 `pickupDate` 或 `deliveryDate`

#### 第五层：后端 API 返回数据
- 路由：`GET /api/v1/containers`
- Controller：`ContainerController.getContainers`
- Service：`ContainerService.enrichContainersList`
- 返回：`truckingTransports: truckingTransport ? [truckingTransport] : []`
- 结论：需要数据库中有 `pickup_date` 或 `delivery_date`

#### 第六层：数据库实际数据
- 表：`process_trucking_transport`
- 字段：`pickup_date`, `delivery_date`
- 查询结果：3个货柜都有 `pickup_date` 值
- 结论：✅ 数据库数据正确

#### 第七层：后端业务逻辑
- 文件：`ganttDerivedBuilder.ts` Line 223
- 逻辑：已提柜时，清关和提柜节点 `taskRole='none'`
- 迁移：运行 `migrate-gantt-v3.ts` 更新所有货柜
- 结论：✅ 后端逻辑已修复

### 最终结论
- **根本原因**：后端 `ganttDerivedBuilder.ts` 的反向推导逻辑只处理了清关节点，没有处理提柜节点
- **修复方案**：修改 Line 223，同时销毁清关和提柜节点
- **验证方法**：硬刷新浏览器，检查控制台日志

## 总结

**剥洋葱式排查法的核心**：
1. 从外层（用户看到的）向内层（数据库）逐层深入
2. 每一层都要验证预期与实际是否一致
3. 不要假设任何一层的数据是正确的
4. 修改前要理解完整的数据流
5. 修改后要全面测试，避免引入新问题

**记住**：看似解决了局部问题，实则可能制造了新的全局问题。只有从全局框架出发，才能确保修复的正确性。
