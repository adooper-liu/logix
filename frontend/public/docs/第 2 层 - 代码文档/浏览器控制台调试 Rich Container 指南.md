# 浏览器控制台调试 Rich Container 数据指南

**版本**: v1.0  
**创建时间**: 2026-04-04  
**作者**: 刘志高

---

## 🚀 快速参考（立即上手）

### ❌ 错误写法（会报错）

```javascript
// 浏览器控制台直接执行 - 这会报错！
const row = await containerService.getListRowByContainerNumber('CAIU1234567')
// Uncaught ReferenceError: containerService is not defined
```

### ✅ 正确写法一：Network 面板（最简单 ⭐⭐⭐⭐⭐）

**适用场景**: 查看 API 返回的完整 Rich Container 数据

#### 方法 A：查看列表数据

**Step 1**: 打开 Network 面板
- 按 `F12` → 切换到 **Network** 标签

**Step 2**: 清空现有记录
- 点击 🚫 按钮（Clear）清空所有记录
- 或按快捷键 `Ctrl + E`（Windows）/ `Cmd + E`（Mac）

**Step 3**: 刷新页面或触发查询
- 按 `F5` 刷新页面
- 或在 Shipments 页面修改筛选条件（如日期范围、关键词）

**Step 4**: 筛选请求
- 在 **Filter** 输入框输入：`containers`
- 或输入具体箱号：`CAIU1234567`

**Step 5**: 找到目标请求
- 查找请求：`GET /api/v1/containers?page=1&pageSize=20&...`
- 这是获取货柜列表的 API

**Step 6**: 查看响应数据
- 点击该请求
- 切换到 **Response** 标签
- 展开 JSON 数据 → 查看完整的 `items[]` 数组

---

#### 方法 B：查看单个货柜详情

**Step 1**: 打开 Network 面板并清空
- 按 `F12` → Network → 🚫 清空

**Step 2**: 进入货柜详情页
- 在 Shipments 列表中点击某个货柜
- 进入 ContainerDetailRefactored 页面

**Step 3**: 筛选详情请求
- 在 Filter 输入：`containers/CAIU`（或具体箱号）
- 找到请求：`GET /api/v1/containers/CAIU1234567`

**Step 4**: 查看完整详情
- 点击该请求 → Response 标签
- 查看完整的 Rich Container JSON 对象

---

#### 💡 常见问题解答

**Q: 为什么 Filter 无效？**

A: 可能的原因：
1. **页面已加载完成**：Network 面板只显示当前会话的请求
   - ✅ 解决：清空记录（🚫）后刷新页面
   
2. **Filter 关键字不对**：
   - ✅ 解决：尝试更具体的关键字，如 `containers` 或完整箱号
   
3. **请求已被过滤**：
   - ✅ 解决：检查 Filter 右侧的下拉菜单，确保选择了 "All" 或 "XHR"

**Q: 如何查看特定箱号的数据？**

A: 两种方法：
1. **方法 1**：在 Shipments 页面搜索该箱号，刷新后查看列表请求
2. **方法 2**：直接进入该箱柜的详情页，查看详情请求

**Q: Response 数据太多怎么办？**

A: 使用格式化查看：
1. 点击 Response 标签右上角的 `{}` 按钮（Pretty Print）
2. JSON 会自动格式化，便于阅读
3. 或使用 Console 面板：
   ```javascript
   // 右键 Response → Copy → Copy response
   // 然后在 Console 执行：
   const data = {/* 粘贴 */}
   console.table(data.data)  // 表格形式查看
   ```

### ✅ 正确写法二：临时暴露到全局（推荐 ⭐⭐⭐⭐）

**在组件中添加**（如 `ContainerDetailRefactored.vue`）：

```typescript
const loadContainerDetail = async () => {
  const response = await containerService.getContainerById(props.containerNumber)
  
  // 🔍 添加这行 - 暴露到全局供调试
  window.debugContainerDetail = response.data
  
  containerData.value = response.data
}
```

**刷新页面后，在控制台执行**：

```javascript
// ✅ 现在可以访问了
const row = window.debugContainerDetail
console.log('Rich Container:', JSON.stringify(row, null, 2))

// 查看特定字段
row.orderNumber         // 备货单号
row.logisticsStatus     // 物流状态
row.seaFreight          // 海运信息
row.ganttDerived        // 甘特图数据
```

### ✅ 正确写法三：永久暴露 Service（开发环境专用）

**修改 `frontend/src/main.ts`**：

```typescript
import { containerService } from '@/services/container'

if (import.meta.env.DEV) {
  ;(window as any).containerService = containerService
}
```

**重启开发服务器后，在控制台直接使用**：

```javascript
// ✅ 可以直接调用 service 了
const row = await window.containerService.getListRowByContainerNumber('CAIU1234567')
console.log('Rich Container:', JSON.stringify(row, null, 2))
```

---

## 一、问题说明

### 1.1 错误现象

在浏览器控制台（Console）中直接执行以下代码会报错：

```javascript
const row = await containerService.getListRowByContainerNumber('CAIU1234567')
// ❌ Uncaught ReferenceError: containerService is not defined
```

### 1.2 错误原因

**根本原因**: `containerService` 是在 Vue 组件的 `<script setup>` 中通过 ES6 import 导入的模块，它只在模块作用域内有效，不会暴露到浏览器的全局作用域（window 对象）。

```typescript
// frontend/src/services/container.ts
export const containerService = new ContainerService()

// frontend/src/views/shipments/Shipments.vue
import { containerService } from '@/services/container'
// ✅ 在组件内部可以使用
// ❌ 在控制台无法访问
```

---

## 二、正确的调试方法

### 2.1 方法一：使用页面全局变量（推荐）

大多数 Vue 应用会在 `window` 对象上暴露一些全局变量用于调试。

#### Step 1: 打开浏览器控制台

按 `F12` 或右键 → 检查 → Console

#### Step 2: 检查是否有全局 API 实例

```javascript
// 尝试访问全局变量
window.__APP__          // 检查是否有全局应用实例
window.containerService // 检查是否暴露了 service
```

#### Step 3: 使用页面现有的变量

如果页面已经加载了货柜列表，可以直接从 Vue 组件中获取数据：

```javascript
// 查找 Shipments 页面组件实例
const app = document.querySelector('#app').__vue_app__
console.log('Vue App Instance:', app)

// 或者查找组件实例
const shipmentsVM = document.querySelector('.shipments-page').__vueParentComponent
console.log('Shipments Component:', shipmentsVM)
```

### 2.2 方法二：通过 Network 面板查看（最简单）

#### Step 1: 打开 Network 面板

按 `F12` → Network 标签

#### Step 2: 筛选 API 请求

在 Filter 中输入 `containers` 或 `api/v1/containers`

#### Step 3: 查看响应数据

点击请求 → Response 标签 → 查看完整的 Rich Container 数据

**优点**:
- ✅ 无需写代码
- ✅ 数据最真实（原始 API 响应）
- ✅ 可以看到完整的数据结构

### 2.3 方法三：在代码中临时添加调试日志

#### Step 1: 找到相关组件文件

打开 `frontend/src/views/shipments/Shipments.vue`

#### Step 2: 在合适位置添加 console.log

```typescript
// 在 loadContainers 函数中添加
const loadContainers = async () => {
  const response = await containerService.getContainers({
    page: 1,
    pageSize: 20,
  })
  
  // 🔍 临时调试代码
  console.log('[DEBUG] Rich Container Data:', response.items)
  window.debugContainers = response.items  // 暴露到全局
  
  containers.value = response.items
}
```

#### Step 3: 刷新页面并在控制台访问

```javascript
// 现在可以在控制台访问了
window.debugContainers[0]  // 查看第一个货柜的 Rich Container 数据
```

### 2.4 方法四：使用 Vue DevTools（最专业）

#### Step 1: 安装 Vue Devtools

- Chrome: [Vue.js devtools](https://chrome.google.com/webstore/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- Edge: 同上
- Firefox: [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

#### Step 2: 打开 Devtools

按 `F12` → 选择 Vue 标签

#### Step 3: 查看组件数据

- Components 标签：选择 Shipments 组件
- State 面板：查看 `containers` 响应式数据
- 右键数据 → Store as global variable（存储为全局变量）

---

## 三、实际调试示例

### 3.1 调试单个货柜数据

**场景**: 想查看箱号为 `CAIU1234567` 的完整 Rich Container 数据

#### 方案 A：通过 Network 面板（推荐）

1. 打开 Network 面板
2. 在 Filter 输入 `CAIU1234567`
3. 找到请求 `GET /api/v1/containers/CAIU1234567`
4. 点击 → Response → 查看完整 JSON

#### 方案 B：在详情页添加调试代码

1. 打开 `frontend/src/views/shipments/ContainerDetailRefactored.vue`
2. 找到 `loadContainerDetail` 函数
3. 添加调试代码：

```typescript
const loadContainerDetail = async () => {
  loading.value = true
  try {
    const response = await containerService.getContainerById(props.containerNumber)
    
    // 🔍 调试代码
    console.log('[DEBUG] Container Detail:', response.data)
    window.debugContainerDetail = response.data
    
    containerData.value = response.data
  } catch (error) {
    console.error('Failed to load container detail:', error)
  } finally {
    loading.value = false
  }
}
```

4. 刷新页面后，在控制台执行：

```javascript
// 查看完整详情
window.debugContainerDetail

// 查看特定字段
window.debugContainerDetail.orderNumber      // 备货单号
window.debugContainerDetail.logisticsStatus  // 物流状态
window.debugContainerDetail.seaFreight       // 海运信息
window.debugContainerDetail.ganttDerived     // 甘特图数据
```

### 3.2 调试列表数据

**场景**: 想查看列表中所有货柜的 Rich Container 数据

#### 在 Shipments.vue 中添加调试代码

```typescript
// frontend/src/views/shipments/Shipments.vue
const loadContainers = async () => {
  loading.value = true
  try {
    const response = await containerService.getContainers({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      search: searchKeyword.value,
      startDate: shipmentDateRange.value[0].toISOString(),
      endDate: shipmentDateRange.value[1].toISOString(),
    })
    
    // 🔍 调试代码 - 暴露到全局
    window.debugContainersList = response.items
    window.debugContainersPagination = response.pagination
    
    console.log('[DEBUG] Containers List:')
    console.table(response.items.map(c => ({
      箱号：c.containerNumber,
      订单：c.orderNumber,
      状态：c.logisticsStatus,
      目的港：c.portOperations?.find(p => p.portType === 'destination')?.portName
    })))
    
    containers.value = response.items
    pagination.value.total = response.pagination.total
  } catch (error) {
    console.error('Failed to load containers:', error)
  } finally {
    loading.value = false
  }
}
```

#### 在控制台执行的操作

```javascript
// 1. 查看所有货柜数据
window.debugContainersList

// 2. 查看表格形式的摘要
console.table(window.debugContainersList.map(c => ({
  箱号：c.containerNumber,
  订单：c.orderNumber,
  状态：c.logisticsStatus,
  体积：c.cbm,
  重量：c.grossWeight
})))

// 3. 查找特定货柜
const target = window.debugContainersList.find(
  c => c.containerNumber === 'CAIU1234567'
)
console.log('Target container:', target)

// 4. 查看费用明细
target.costBreakdown

// 5. 查看关联的备货单
target.allOrders

// 6. 查看物流状态事件
target.statusEvents
```

### 3.3 调试 enrich 逻辑性能

**场景**: 想知道 enrich 过程耗时多久

#### 在后端添加性能日志

```typescript
// backend/src/services/container.service.ts
async enrichContainersList(containers: Container[]): Promise<any[]> {
  const startTime = Date.now();
  console.log(`[PERF] Starting enrich for ${containers.length} containers`);

  // ... enrich 逻辑 ...

  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`[PERF] Enrich completed in ${duration}ms`, {
    total: containers.length,
    avgMsPerContainer: duration / containers.length,
    itemsPerSecond: Math.round(containers.length / (duration / 1000))
  });
  
  return enriched;
}
```

#### 查看后端日志

```bash
# PowerShell 查看实时日志
Get-Content backend\logs\app.log -Tail 50 -Wait

# 或者在 Docker 中查看
docker logs logix-backend --tail 50 --follow
```

---

## 四、常用调试命令速查

### 4.1 查看 Rich Container 结构

```javascript
// 查看完整结构
JSON.stringify(window.debugContainerDetail, null, 2)

// 查看有哪些字段
Object.keys(window.debugContainerDetail)

// 查看嵌套对象
window.debugContainerDetail.seaFreight?.[0]
window.debugContainerDetail.portOperations
window.debugContainerDetail.truckingTransports
```

### 4.2 验证数据一致性

```javascript
// 对比前端显示与后端数据
const container = window.debugContainerDetail
console.log('Frontend cbm:', container.cbm)           // 前端显示的 cbm
console.log('Summary cbm:', container.summary?.totalCbm) // 汇总的 cbm

// 检查 ganttDerived 是否正确
console.log('Gantt Derived:', container.ganttDerived)
console.log('Expected stage:', calculateExpectedStage(container))
```

### 4.3 查找问题数据

```javascript
// 查找没有 enrich 数据的货柜
window.debugContainersList.filter(c => !c.orderNumber)

// 查找状态异常的货柜
window.debugContainersList.filter(c => 
  c.logisticsStatus === 'unknown'
)

// 查找费用为 0 的货柜
window.debugContainersList.filter(c => 
  !c.costBreakdown || c.costBreakdown.total === 0
)
```

---

## 五、最佳实践建议

### 5.1 开发环境专用调试代码

```typescript
// 使用环境变量控制调试代码
if (import.meta.env.DEV) {
  window.debugContainers = containers.value
  window.debugContainerDetail = containerData.value
}
```

### 5.2 使用条件日志

```typescript
// 只在开发环境打印详细日志
const debug = import.meta.env.DEV ? console.log : () => {}

debug('Rich Container:', container)
```

### 5.3 清理调试代码

✅ **推荐做法**:
- 使用环境变量控制
- 调试代码集中管理
- 提交前移除调试代码

❌ **不推荐做法**:
- 在生产环境保留调试代码
- 到处散落 console.log
- 忘记清理调试代码

---

## 六、常见问题 FAQ

### Q1: 为什么不能直接在控制台使用 containerService？

**A**: 因为 `containerService` 是通过 ES6 module 系统导入的，它只在模块作用域内有效。浏览器控制台是全局作用域（window），两者不在同一个作用域中。

### Q2: 如何永久暴露 containerService 到控制台？

**A**: 在 `main.ts` 或入口文件中添加：

```typescript
// main.ts
import { containerService } from '@/services/container'

if (import.meta.env.DEV) {
  (window as any).containerService = containerService
}
```

然后在控制台就可以直接使用：

```javascript
// ✅ 现在可以直接使用了
const row = await window.containerService.getListRowByContainerNumber('CAIU1234567')
```

### Q3: 如何在控制台调用 Vue 组件的方法？

**A**: 先找到组件实例：

```javascript
// 找到组件 DOM 元素
const el = document.querySelector('.shipments-page')

// 获取 Vue 组件实例
const vm = el.__vueParentComponent

// 调用组件方法
vm.loadContainers()

// 访问组件数据
vm.containers.value
```

### Q4: 控制台打印的数据太多怎么办？

**A**: 使用结构化展示：

```javascript
// 使用 table 展示
console.table(data)

// 只打印关键字段
console.log({
  containerNumber: data.containerNumber,
  orderNumber: data.orderNumber,
  logisticsStatus: data.logisticsStatus
})

// 分组展示
console.group('Container Info')
console.log('Basic:', { number: data.containerNumber })
console.log('Order:', { order: data.orderNumber })
console.groupEnd()
```

---

## 七、总结

### 7.1 调试方法对比

| 方法 | 难度 | 适用场景 | 推荐度 |
|------|------|---------|--------|
| Network 面板 | ⭐ | 查看 API 原始数据 | ⭐⭐⭐⭐⭐ |
| Vue DevTools | ⭐⭐ | 查看组件响应式数据 | ⭐⭐⭐⭐⭐ |
| 临时调试代码 | ⭐⭐ | 深度调试特定逻辑 | ⭐⭐⭐⭐ |
| 全局变量暴露 | ⭐⭐⭐ | 频繁调试多个数据 | ⭐⭐⭐ |

### 7.2 核心要点

- ✅ **理解作用域**: 模块作用域 ≠ 全局作用域
- ✅ **善用工具**: Network、Vue Devtools 比控制台更强大
- ✅ **临时暴露**: 通过 window 对象临时暴露调试数据
- ✅ **环境隔离**: 使用环境变量控制调试代码
- ✅ **及时清理**: 调试完成后删除调试代码

---

**文档版本**: v1.0  
**最后更新**: 2026-04-04  
**维护者**: 刘志高  
**审核状态**: ✅ 已验证

---

**END**
