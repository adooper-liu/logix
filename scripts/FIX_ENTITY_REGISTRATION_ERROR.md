# 修复 ExtTruckingReturnSlotOccupancy 实体注册错误

## 🐛 问题描述

**错误信息**:

```
✗ ECMU5397691: No metadata for "ExtTruckingReturnSlotOccupancy" was found.
✗ ECMU5381817: No metadata for "ExtTruckingReturnSlotOccupancy" was found.
✗ ECMU5399797: No metadata for "ExtTruckingReturnSlotOccupancy" was found.
✗ ECMU5400183: No metadata for "ExtTruckingReturnSlotOccupancy" was found.
✗ ECMU5399586: No metadata for "ExtTruckingReturnSlotOccupancy" was found.
```

**影响**: 智能排产完全失败（成功 0/5，失败 5）

---

## 🔍 根本原因

`ExtTruckingReturnSlotOccupancy` 实体类虽然已创建并在使用，但**没有在 TypeORM 的 entities 数组中注册**，导致 TypeORM 无法找到该实体的元数据。

---

## ✅ 解决方案

### Step 1: 添加实体导入

在 `backend/src/database/index.ts` 中添加：

```typescript
import { ExtTruckingReturnSlotOccupancy } from "../entities/ExtTruckingReturnSlotOccupancy";
```

### Step 2: 注册到 entities 数组

在 `@Entity()` 装饰器配置中添加：

```typescript
entities: [
  // ... 其他实体
  ExtWarehouseDailyOccupancy,
  ExtTruckingSlotOccupancy,
  ExtTruckingReturnSlotOccupancy, // ← 新增
  ExtYardDailyOccupancy,
  Yard,
];
```

---

## 📋 修改文件

**文件**: `backend/src/database/index.ts`

**修改内容**:

```diff
+ import { ExtTruckingReturnSlotOccupancy } from '../entities/ExtTruckingReturnSlotOccupancy';

  // 智能排柜资源占用表 (Intelligent Scheduling Resource Tables)
  ExtWarehouseDailyOccupancy,
  ExtTruckingSlotOccupancy,
+ ExtTruckingReturnSlotOccupancy,
  ExtYardDailyOccupancy,
  Yard,
```

---

## 🧪 验证步骤

### 1. 重新编译后端

```bash
cd d:\Gihub\logix\backend
npm run build
```

### 2. 重启后端服务

```bash
# 如果使用 Docker
docker restart logix-backend

# 或者直接运行
npm run start:dev
```

### 3. 检查日志

启动日志应包含：

```
[TypeORM] Entity loaded: ExtTruckingReturnSlotOccupancy
```

### 4. 重新执行排产

```bash
POST http://localhost:3000/api/intelligent-scheduling/schedule
{
  "containerNumbers": [
    "ECMU5399797",
    "ECMU5381817",
    "ECMU5397691",
    "ECMU5399586",
    "ECMU5400183"
  ]
}
```

**预期结果**: 成功 5/5 ✅

---

## 📊 相关实体关系

### 三个占用表对比

| 实体                               | 表名                                   | 用途                 | 模式         |
| ---------------------------------- | -------------------------------------- | -------------------- | ------------ |
| ExtWarehouseDailyOccupancy         | ext_warehouse_daily_occupancy          | 仓库日产能占用       | 卸柜约束     |
| ExtTruckingSlotOccupancy           | ext_trucking_slot_occupancy            | 车队提柜档期占用     | 提柜约束     |
| **ExtTruckingReturnSlotOccupancy** | **ext_trucking_return_slot_occupancy** | **车队还箱档期占用** | **还柜约束** |

### Drop off vs Live load

```
Drop off (有堆场):
  提 < 送 = 卸 < 还
              ↑
         需要还箱档期约束

Live load (无堆场):
  提 = 送 = 卸 = 还
         ↑
    不需要单独的还箱档期
```

---

## 🎯 业务逻辑

### 还箱档期的作用

在 **Drop off** 模式下：

1. 货柜卸在堆场后，需要安排还箱日期
2. 还箱日期必须 >= 卸柜日期
3. 还箱日期不能超过车队的 `daily_return_capacity`
4. 通过 `ExtTruckingReturnSlotOccupancy` 跟踪每天的已计划还箱数量

### 扣减逻辑

```typescript
// intelligentScheduling.service.ts Line 1027-1060
private async decrementFleetReturnOccupancy(
  truckingCompanyId: string,
  returnDate: Date,
  _warehouseCode?: string,
  _portCode?: string
): Promise<void> {
  const repo = AppDataSource.getRepository(ExtTruckingReturnSlotOccupancy);

  const occupancy = await repo.findOne({
    where: { truckingCompanyId, slotDate: returnDate }
  });

  if (occupancy) {
    occupancy.plannedCount += 1;
    occupancy.remaining -= 1;
    await repo.save(occupancy);
  } else {
    // 创建新记录
    const trucking = await AppDataSource.getRepository(TruckingCompany).findOne({
      where: { companyCode: truckingCompanyId },
      select: ['dailyReturnCapacity', 'dailyCapacity']
    });

    const capacity = trucking?.dailyReturnCapacity || trucking?.dailyCapacity || 0;
    const newOccupancy = repo.create({
      truckingCompanyId,
      slotDate: returnDate,
      plannedCount: 1,
      capacity,
      remaining: capacity - 1
    });
    await repo.save(newOccupancy);
  }
}
```

---

## ⚠️ 如果不修复

### 短期影响

- ❌ 所有需要 Drop off 模式的货柜无法排产
- ❌ 有堆场的车队无法使用还箱档期功能
- ❌ 排产成功率大幅下降

### 长期影响

- ❌ 系统信用下降（用户不再信任智能排产）
- ❌ 退回人工排产，效率低下
- ❌ 可能错过最佳的还箱日期安排

---

## 📝 经验教训

### 开发规范

1. ✅ **创建新实体后立即注册**

   ```typescript
   // 每创建一个 @Entity()，立即添加到 database/index.ts
   import { NewEntity } from "../entities/NewEntity";

   entities: [
     // ...
     NewEntity, // ← 不要忘记！
   ];
   ```

2. ✅ **使用 TypeScript 严格模式**
   - 可以在编译时发现未使用的导入
   - 但仍然需要手动注册到 TypeORM

3. ✅ **编写单元测试**

   ```typescript
   describe("ExtTruckingReturnSlotOccupancy", () => {
     it("should be able to create repository", () => {
       const repo = AppDataSource.getRepository(ExtTruckingReturnSlotOccupancy);
       expect(repo).toBeDefined();
     });
   });
   ```

4. ✅ **代码审查清单**
   - [ ] 新实体是否已添加到 entities 数组？
   - [ ] 是否有对应的数据库表？
   - [ ] 是否需要迁移脚本？

---

## 🔗 相关文件

- **实体定义**: [`ExtTruckingReturnSlotOccupancy.ts`](file://d:\Gihub\logix\backend\src\entities\ExtTruckingReturnSlotOccupancy.ts)
- **数据库配置**: [`database/index.ts`](file://d:\Gihub\logix\backend\src\database\index.ts)
- **使用位置**: [`intelligentScheduling.service.ts#L1033`](file://d:\Gihub\logix\backend\src\services\intelligentScheduling.service.ts#L1033)

---

## ✅ 检查清单

- [x] 添加实体导入
- [x] 注册到 entities 数组
- [ ] 重新编译后端
- [ ] 重启后端服务
- [ ] 验证排产功能
- [ ] 添加单元测试
- [ ] 更新文档

---

**修复状态**: ✅ 已完成  
**修复时间**: 2026-03-25 16:15  
**影响范围**: 智能排产 - Drop off 模式  
**下一步**: 重新编译并测试！
