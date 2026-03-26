# ETA 顺延天数输入框 - 前端实现

## 📋 功能说明

在智能排产页面添加 **ETA 顺延天数** 输入框，允许用户在排产前设置清关缓冲时间。

---

## 🎯 修改内容

### 1. 排产主页面 (`SchedulingVisual.vue`)

#### 添加输入框

**位置**：顶部工具栏，"逻辑"按钮和"预览排产"按钮之间

```vue
<span class="filter-label">ETA 顺延：</span>
<el-input-number
  v-model="etaBufferDays"
  :min="0"
  :max="7"
  :step="1"
  placeholder="0-7 天"
  controls-position="right"
  size="small"
  style="width: 120px"
/>
```

**变量定义**：
```typescript
const etaBufferDays = ref<number>(0) // 默认 0 天
```

#### 调用排产 API 时传入参数

```typescript
// 预览排产
const result = await containerService.batchSchedule({
  country: resolvedCountry.value || undefined,
  startDate: dateRange.value?.[0] ? dayjs(dateRange.value[0]).format('YYYY-MM-DD') : undefined,
  endDate: dateRange.value?.[1] ? dayjs(dateRange.value[1]).format('YYYY-MM-DD') : undefined,
  dryRun: true,
  etaBufferDays: etaBufferDays.value, // ✅ 新增
})

// 执行排产（同样需要添加）
const result = await containerService.batchSchedule({
  // ... 其他参数
  etaBufferDays: etaBufferDays.value,
})
```

---

### 2. Container Service (`container.ts`)

#### 更新接口定义

```typescript
async batchSchedule(params: {
  country?: string
  startDate?: string
  endDate?: string
  forceSchedule?: boolean
  limit?: number
  skip?: number
  dryRun?: boolean
  containerNumbers?: string[]
  etaBufferDays?: number // ✅ 新增：ETA 顺延天数
}): Promise<{
  success: boolean
  total: number
  successCount: number
  failedCount: number
  results: Array<{...}>
  hasMore?: boolean
}>
```

---

### 3. 预览模态框 (`SchedulingPreviewModal.vue`)

**移除内部输入框**（因为参数已在父组件设置）

- ❌ 删除模态框内的参数设置区域
- ❌ 删除 `etaBufferDays` 变量

---

## 🎨 UI 效果

```
┌─────────────────────────────────────────────────────────┐
│ 日期：[日期选择器] 刷新 [逻辑] ETA 顺延：[0] [+/-]      │
│                  ↑                                      │
│                  新输入框 (0-7 天)                       │
│                                                         │
│ [预览排产] [执行排产] [返回货柜管理]                    │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 数据流

```
用户输入：2 天
    ↓
SchedulingVisual.vue: etaBufferDays.value = 2
    ↓
containerService.batchSchedule({ etaBufferDays: 2 })
    ↓
后端 /api/scheduling/batch-schedule
    ↓
intelligentScheduling.service.ts
  → 清关日 = ETA + 2 天
  → 提柜日 = 清关日 + 1 天
    ↓
返回排产结果
    ↓
预览模态框显示（带 buffer 的日期）
```

---

## ✅ 使用场景

### 场景 1：正常排产（无缓冲）
- **设置**：`etaBufferDays = 0`
- **效果**：清关日 = ETA
- **适用**：清关能力强，无需额外缓冲

### 场景 2：预留清关时间
- **设置**：`etaBufferDays = 2`
- **效果**：清关日 = ETA + 2 天
- **适用**：需要 2 天清关准备时间

### 场景 3：假期后处理
- **设置**：`etaBufferDays = 3`
- **效果**：清关日 = ETA + 3 天
- **适用**：周末或假期后恢复工作

---

## 🔧 技术要点

### 1. 输入范围限制
- **最小值**：0 天
- **最大值**：7 天
- **步长**：1 天
- **默认值**：0 天

### 2. 参数传递
- ✅ 在父组件 (`SchedulingVisual.vue`) 中定义
- ✅ 预览和保存都使用同一个参数
- ✅ 实时调整，立即生效

### 3. 后端配合
- ✅ 后端从请求参数读取 `_request.etaBufferDays`
- ✅ 仅当次排产使用，不持久化
- ✅ 灵活应对不同场景需求

---

## 🧪 测试验证

### 测试用例

| 序号 | Buffer 天数 | 预期效果 | 验证点 |
|------|------------|----------|--------|
| 1 | 0 | 清关日 = ETA | 基准测试 |
| 2 | 1 | 清关日 = ETA + 1 | 基础缓冲 |
| 3 | 2 | 清关日 = ETA + 2 | 常用场景 |
| 4 | 3 | 清关日 = ETA + 3 | 假期后 |
| 5 | 7 | 清关日 = ETA + 7 | 最大缓冲 |

### 测试步骤

1. **打开排产页面**
   ```
   访问：/scheduling/visual?from=shipments&country=GB
   ```

2. **设置不同 Buffer 值**
   - 输入 0、1、2、3、7
   - 点击"预览排产"

3. **检查排产日期**
   - 提柜日是否顺延相应天数
   - 送仓日、卸柜日、还箱日是否联动调整

4. **确认保存**
   - 点击"确认保存"
   - 检查数据库中的计划日期是否正确

---

## 📝 注意事项

### 1. 输入提示
- 占位符："0-7 天"
- 控件右侧显示 +/- 按钮
- 超出范围自动修正

### 2. 用户体验
- 输入框宽度：120px（紧凑布局）
- 大小：small（与工具栏一致）
- 标签："ETA 顺延："（简洁明了）

### 3. 边界情况
- **负数**：自动修正为 0
- **超过 7**：自动修正为 7
- **非数字**：输入框自动过滤

---

## 🎯 业务价值

### 解决的问题
✅ 避免计划从一开始就过期  
✅ 给清关预留充足时间  
✅ 提高排产计划的实际可执行性  

### 带来的好处
✅ 灵活应对不同清关能力  
✅ 减少因清关延误导致的滞港费  
✅ 提升仓库作业效率  

---

## 📚 相关文档

- [ETA 顺延天数设计变更](./ETA 顺延天数设计变更.md)
- [排产 ETA 顺延功能 - 设计变更总结](./排产 ETA 顺延功能 - 设计变更总结.md)
- [ETA 顺延配置 - 快速参考卡](./ETA 顺延配置 - 快速参考卡.md)
- [计划提柜日过期问题修复](./计划提柜日过期问题修复.md)

---

**创建时间**：2026-03-25  
**更新时间**：2026-03-25  
**状态**：✅ 已完成
