# Phase 2: 智能日历增强实施计划

## 📋 目标

实现智能日历的完整能力，支持：
1. **周末自动识别** - 区分工作日/周末产能配置
2. **节假日支持** - 接入节假日 API 或配置表
3. **前端可视化** - 档期日历展示

## ✅ 任务分解

### Task 1: 周末差异化产能配置
- **文件**: `backend/src/utils/smartCalendarCapacity.ts`
- **修改内容**:
  - 在 `calculateWarehouseCapacity()` 中检查周末
  - 使用 `warehouse.weekendUnloadCapacity` 字段
  - 周末产能为 0 时自动跳过
  
**预期效果**: 
- 周末自动识别，无需人工干预
- 排产计划避开周末（除非紧急）

### Task 2: 节假日配置表设计与实现
- **数据库表**: `dict_holidays`
- **字段**:
  - `id`: 主键
  - `country_code`: 国家代码（如 US, CA）
  - `holiday_date`: 节假日日期
  - `holiday_name`: 节假日名称
  - `is_recurring`: 是否每年重复
  - `created_at`, `updated_at`: 时间戳

- **实体**: `DictHoliday`
- **服务**: `HolidayService.isHoliday(date, countryCode)`

**预期效果**:
- 支持多国节假日配置
- 自动识别节假日，排产跳过

### Task 3: 智能日历能力增强
- **文件**: `backend/src/utils/smartCalendarCapacity.ts`
- **新增方法**:
  - `isWeekend(date: Date): boolean`
  - `isHoliday(date: Date, countryCode: string): Promise<boolean>`
  - `getWorkingDays(startDate: Date, endDate: Date, countryCode: string): Promise<number>`

**预期效果**:
- 完整的日历能力
- 支持工作日计算

### Task 4: 前端档期日历可视化
- **组件**: `frontend/src/views/scheduling/components/OccupancyCalendar.vue`
- **功能**:
  - 日历视图展示仓库/车队档期
  - 颜色标识：绿色（充足）、黄色（紧张）、红色（已满）
  - 周末/节假日高亮显示
  - 点击日期查看详情

**预期效果**:
- 直观的档期展示
- 用户可快速识别可用日期

## 📊 成功指标

| 指标 | 目标值 |
|------|--------|
| 周末自动识别率 | 100% |
| 节假日覆盖率（主要国家） | >95% |
| 工作日计算准确性 | 100% |
| 前端日历加载速度 | <500ms |
| 用户满意度 | >4.5/5 |

## ⏱️ 时间估算

- **Task 1**: 周末支持 - 0.5 天
- **Task 2**: 节假日配置 - 1 天
- **Task 3**: 日历能力增强 - 1 天
- **Task 4**: 前端可视化 - 2 天
- **测试与修复**: 1.5 天

**总计**: 6 天（约 2 周）

## 🔗 依赖关系

- ✅ Phase 1 已完成（缓存、批量查询、成本优化前置）
- ⏳ Phase 2 依赖 Phase 1 的批量查询能力
- ⏳ Phase 3 依赖 Phase 2 的智能日历能力

## 📝 下一步

**立即开始 Task 1**: 周末差异化产能配置
