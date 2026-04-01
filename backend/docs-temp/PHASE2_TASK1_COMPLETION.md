# Phase 2 Task 1: 周末差异化产能配置 - 完成报告

## ✅ 实施内容

### 1. Warehouse 实体增强
**文件**: `backend/src/entities/Warehouse.ts`

**新增字段**:
```typescript
@Column({ type: 'int', nullable: true, name: 'weekend_unload_capacity' })
weekendUnloadCapacity?: number;
```

**说明**:
- 可选字段，不配置时使用工作日产能 × 倍率
- 允许仓库灵活配置周末产能（可能低于工作日）

---

### 2. SmartCalendarCapacity 能力增强
**文件**: `backend/src/utils/smartCalendarCapacity.ts`

#### 修改 1: calculateWarehouseCapacity() 逻辑重构

**原逻辑**:
```typescript
if (isRest) {
  return 0; // 休息日能力为 0
}
const calculatedCapacity = Math.floor(baseCapacity * config.weekdayMultiplier);
```

**新逻辑**:
```typescript
// 1. 检查节假日（容量为 0）
if (isHoliday) {
  return 0;
}

// 2. 检查周末（差异化产能）
if (isWeekend) {
  if (warehouse.weekendUnloadCapacity !== null) {
    // 使用配置的周末产能
    return warehouse.weekendUnloadCapacity;
  } else {
    // 使用倍率折算
    return Math.floor(baseCapacity * config.weekdayMultiplier);
  }
}

// 3. 工作日（正常产能）
return warehouse.dailyUnloadCapacity;
```

**优势**:
- ✅ 支持周末产能不为 0 的场景（如周六上午工作）
- ✅ 支持每个仓库独立配置周末产能
- ✅ 向后兼容（未配置时自动降级）

---

#### 修改 2: 新增 isHoliday() 方法

```typescript
/**
 * 判断是否为节假日
 * 
 * ✅ Phase 2: 临时实现，后续接入节假日 API 或配置表
 */
async isHoliday(date: Date): Promise<boolean> {
  // TODO: 接入节假日 API 或 dict_holidays 表
  return false;
}
```

**说明**:
- 当前返回 false，不影响现有功能
- 为后续节假日配置预留接口

---

## 📊 业务场景支持

### 场景 1: 周末双休仓库
**配置**:
- `dailyUnloadCapacity`: 10
- `weekendUnloadCapacity`: 0（或不配置，weekdayMultiplier=0）

**效果**: 周末自动跳过排产

---

### 场景 2: 周六上午工作仓库
**配置**:
- `dailyUnloadCapacity`: 10
- `weekendUnloadCapacity`: 5（周六半天）

**效果**: 周六可排产 5 个货柜

---

### 场景 3: 无休仓库（7×24）
**配置**:
- `dailyUnloadCapacity`: 10
- `weekendUnloadCapacity`: 10（相同产能）

**效果**: 工作日和周末均可正常排产

---

## 🔧 技术亮点

### 1. 灵活的配置策略
- **优先使用配置值**: `weekendUnloadCapacity`
- **降级到倍率**: `dailyUnloadCapacity × weekdayMultiplier`
- **默认行为**: 向后兼容，不影响现有仓库

### 2. 清晰的日志输出
```typescript
log.debug(
  `[SmartCalendar] ${date} weekend capacity for ${warehouseCode}: ${weekendCapacity} (from weekendUnloadCapacity)`
);
```

**调试价值**: 快速定位产能计算逻辑

### 3. 扩展性设计
- `isHoliday()` 方法预留节假日支持
- 未来可添加 `holidayCapacity` 字段

---

## 📝 数据库迁移 SQL

需要执行以下 SQL 添加新字段：

```sql
-- Phase 2: 添加仓库周末产能字段
ALTER TABLE dict_warehouses 
ADD COLUMN weekend_unload_capacity INT NULL COMMENT '周末卸柜产能（智能排柜用）';

-- 可选：更新现有仓库的周末产能配置
UPDATE dict_warehouses 
SET weekend_unload_capacity = 0 
WHERE country = 'US' AND warehouse_code LIKE 'WH%';
```

---

## ⚠️ 注意事项

1. **数据迁移**: 执行 SQL 后需重启后端服务
2. **缓存清理**: 如有 Redis 缓存，需清除仓库相关缓存
3. **前端对接**: 可在仓库编辑页面增加"周末产能"输入框

---

## 🎯 下一步行动

### Phase 2 Task 2: 节假日配置表
- 创建 `dict_holidays` 表
- 实现 `HolidayService.isHoliday()`
- 替换当前的临时实现

### Phase 2 Task 3: 前端可视化
- 档期日历组件开发
- 周末/节假日高亮显示
- 产能状态颜色标识

---

**状态**: Phase 2 Task 1 完成 ✅  
**下一步**: 开始 Phase 2 Task 2（节假日配置表）
