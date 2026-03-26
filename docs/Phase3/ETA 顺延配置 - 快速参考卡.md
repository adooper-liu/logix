# ETA 顺延天数 - 快速参考卡

## 一句话说明

前端输入 ETA 顺延天数，给清关预留时间，避免排产计划从一开始就过期。

## 快速操作

### 前端界面输入

**位置**：排产预览模态框顶部

**输入框**：
```
智能排产参数设置
├─ ETA 顺延天数：[ 2 ] 天
└─ [开始排产] 按钮
```

**输入范围**：`0-7` 天

### 调用 API

**代码**：
```typescript
const scheduleParams = {
  country: selectedCountry,
  startDate: startDate,
  endDate: endDate,
  dryRun: true,
  etaBufferDays: etaBufferDays.value // 传入用户输入的值
};

await api.post('/scheduling/schedule', scheduleParams);
```

## 效果对比

### 修复前（buffer = 0）

```
ETA: 3-24
清关日：3-24
提柜日：3-25 ❌（昨天）
今天：3-26
结果：过期，被动调整
```

### 修复后（buffer = 2）

```
ETA: 3-24
+ buffer: 2 天
清关日：3-26 ✅
提柜日：3-27 ✅（明天）
今天：3-26
结果：正常，主动规划
```

## 推荐配置

| 场景 | buffer 天数 | 说明 |
|-----|-----------|------|
| 普通货物 | 2 天 | 标准流程 |
| 清关旺季 | 3-5 天 | 海关处理慢 |
| 紧急货物 | 1 天 | 快速清关 |
| 英国货物 | 2-3 天 | 脱欧后清关慢 |
| 美国货物 | 2 天 | 清关较快 |

## 参数位置

- **前端**：排产预览模态框输入框
- **后端**：`ScheduleRequest.etaBufferDays`
- **文件**：`backend/src/services/intelligentScheduling.service.ts`
- **行号**：L41-50（接口定义），L306-323（计算逻辑）

## 代码位置

- **方法**：`scheduleSingleContainer()`
- **文件**：`backend/src/services/intelligentScheduling.service.ts`
- **行号**：L306-323（清关日计算）

## 相关配置

| 配置项 | 默认值 | 说明 |
|-------|-------|------|
| `etaBufferDays` | 0 | ETA 顺延天数（前端输入） |
| `skip_weekends` | true | 跳过周末 |
| `expedited_handling_fee` | 50 | 加急费 |

## 验证方法

### 1. 前端添加输入框

**文件**：`frontend/src/views/scheduling/components/SchedulingPreviewModal.vue`

**添加**：
```vue
<el-form-item label="ETA 顺延天数">
  <el-input-number 
    v-model="etaBufferDays" 
    :min="0" 
    :max="7" 
    :step="1"
  />
</el-form-item>
```

### 2. 测试排产

1. 打开排产页面
2. 输入 ETA 顺延天数（如 2）
3. 执行排产
4. 查看计划提柜日
5. 确认是未来日期 ✅

## 日志输出

```
[IntelligentScheduling] ETA buffer applied: +2 days for ECMU5399586
```

## 注意事项

1. **buffer 天数范围**：0-7 天
2. **默认值**：0（不顺延）
3. **配置生效**：输入后立即生效
4. **不持久化**：仅当次排产使用
5. **兜底逻辑**：即使 buffer=0，提柜日也不会早于今天

## 常见问题

**Q: 为什么要设置 buffer？**
A: 给清关预留时间，避免排产计划过期。

**Q: buffer 设置多少合适？**
A: 一般 2 天，清关慢的港口 3 天，紧急货物 1 天。

**Q: 可以禁用 buffer 吗？**
A: 可以，输入 `0` 或不填（默认 0）。

**Q: 每次排产都要输入吗？**
A: 是的，每次排产可设置不同的 buffer 天数。

**Q: 系统会记住我的设置吗？**
A: 当前不会，未来可以通过 localStorage 实现。

## 更多信息

- [计划提柜日过期问题修复](./Phase3/计划提柜日过期问题修复.md)
- [ETA 顺延天数设计变更](./Phase3/ETA 顺延天数设计变更.md)
- [智能排柜日期计算规范](./.codebuddy/skills/intelligent-scheduling-date-calculation/SKILL.md)

---

**版本**：v1.0  
**更新日期**：2026-03-25
