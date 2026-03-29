# ETA 顺延天数设计变更

## 变更日期

2026-03-25

## 变更原因

用户反馈：

> "eta_buffer_days 是根据需要，在前端界面排产时选择或录入的，不能固定为数据库字典表参数，不要保存。"

## 变更内容

### 原设计（已废弃）

**方案**：通过数据库字典表配置

```sql
-- 废弃的数据库迁移脚本
INSERT INTO dict_scheduling_config (config_key, config_value, description)
VALUES ('eta_buffer_days', '2', 'ETA 顺延天数');
```

**问题**：

- ❌ 固定配置，不够灵活
- ❌ 全局统一，无法针对不同排产任务设置不同 buffer
- ❌ 需要数据库操作才能修改

### 新设计（当前方案）

**方案**：前端界面输入，临时参数

**实现**：

1. 前端排产界面添加输入框
2. 用户每次排产时自行输入 0-7 天
3. 后端从请求参数读取，仅当次排产使用
4. 不保存到数据库

**优点**：

- ✅ 灵活：每次排产可设置不同的 buffer 天数
- ✅ 临时：不持久化，不影响其他排产任务
- ✅ 用户友好：用户根据实际需要自行决定

## 修改的文件

### 后端代码

**文件**：`backend/src/services/intelligentScheduling.service.ts`

**修改**：

1. **添加接口字段**（L41-50）：

   ```typescript
   export interface ScheduleRequest {
     // ... 其他字段
     etaBufferDays?: number; // ETA 顺延天数（可选，前端传入，默认 0）
   }
   ```

2. **修改计算逻辑**（L306-323）：

   ```typescript
   // 从请求参数读取
   const etaBufferDays = _request.etaBufferDays || 0;
   if (etaBufferDays > 0) {
     plannedCustomsDate.setDate(plannedCustomsDate.getDate() + etaBufferDays);
   }
   ```

3. **删除辅助方法**：
   - ❌ 删除 `getEtaBufferDays()` 方法
   - ❌ 不再从数据库读取配置

### 数据库迁移

**文件**：`migrations/add_eta_buffer_days_config.sql`

**操作**：❌ 已删除（不再需要）

### 前端待修改

**文件**：`frontend/src/views/scheduling/components/SchedulingPreviewModal.vue`

**待添加**：

```vue
<template>
  <div class="scheduling-params">
    <el-form-item label="ETA 顺延天数">
      <el-input-number v-model="etaBufferDays" :min="0" :max="7" :step="1" placeholder="请输入 0-7 天" />
      <span class="form-tip">0-7 天，可选，默认 0</span>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
const etaBufferDays = ref<number>(0);

const scheduleParams = computed(() => ({
  country: selectedCountry.value,
  startDate: startDate.value,
  endDate: endDate.value,
  dryRun: true,
  etaBufferDays: etaBufferDays.value,
}));
</script>
```

## 使用示例

### 场景 1：清关旺季（buffer = 3 天）

```
用户输入：3
ETA: 2026-03-24
清关日：2026-03-27
提柜日：2026-03-28
```

### 场景 2：普通货物（buffer = 2 天）

```
用户输入：2
ETA: 2026-03-24
清关日：2026-03-26
提柜日：2026-03-27
```

### 场景 3：紧急货物（buffer = 1 天）

```
用户输入：1
ETA: 2026-03-24
清关日：2026-03-25
提柜日：2026-03-26
```

### 场景 4：不顺延（buffer = 0）

```
用户输入：0
ETA: 2026-03-24
清关日：2026-03-24
提柜日：2026-03-25
（如果已过期，系统会自动调整到今天）
```

## 数据流

```
前端输入框 (etaBufferDays: number)
  ↓
排产请求参数 { etaBufferDays: 2 }
  ↓
后端 ScheduleRequest.etaBufferDays
  ↓
清关日计算：ETA + etaBufferDays
  ↓
提柜日计算：清关日 + 1
  ↓
排产结果（不保存 etaBufferDays）
```

## 配置管理

### 当前方案

- **配置位置**：前端界面输入框
- **配置范围**：0-7 天
- **默认值**：0
- **持久化**：否
- **影响范围**：仅当次排产

### 未来可选方案

如果需要记住用户偏好，可以考虑：

1. **本地存储**（localStorage）：

   ```typescript
   // 保存用户上次输入
   localStorage.setItem("etaBufferDays", "2");

   // 下次自动填充
   const saved = localStorage.getItem("etaBufferDays");
   etaBufferDays.value = saved ? parseInt(saved) : 0;
   ```

2. **用户配置表**（可选）：

   ```sql
   CREATE TABLE user_preferences (
     user_id VARCHAR(50),
     preference_key VARCHAR(50),
     preference_value TEXT,
     PRIMARY KEY (user_id, preference_key)
   );

   INSERT INTO user_preferences (user_id, preference_key, preference_value)
   VALUES ('user123', 'eta_buffer_days', '2');
   ```

## 相关文档

- [计划提柜日过期问题修复](./Phase3/计划提柜日过期问题修复.md)
- [排产日期修复总结](./Phase3/排产日期修复总结.md)
- [智能排柜日期计算规范](./.codebuddy/skills/intelligent-scheduling-date-calculation/SKILL.md)

## 完成状态

✅ **已完成**

- [x] 修改后端接口定义
- [x] 修改清关日计算逻辑
- [x] 删除数据库配置依赖
- [x] 删除数据库迁移脚本
- [x] 更新文档
- [ ] 前端添加输入框
- [ ] 测试排产功能

## 经验总结

### 设计原则

1. **用户主导 vs 系统固定**
   - 用户主导：每次排产自行决定 buffer 天数
   - 更灵活：适应不同业务场景

2. **临时参数 vs 持久配置**
   - 临时参数：仅当次使用，不保存
   - 更轻量：无需数据库操作

3. **前端输入 vs 后端配置**
   - 前端输入：用户界面友好
   - 更直观：所见即所得

### 最佳实践

1. **参数设计**
   - 可选参数：不强制要求
   - 默认值：0（不顺延）
   - 范围限制：0-7

2. **用户体验**
   - 输入框：数字输入，带上下限
   - 提示文字：说明用途和范围
   - 默认值：预设为 0 或常用值

3. **日志记录**
   - 记录 buffer 应用情况
   - 便于问题排查
   - 便于业务审计
