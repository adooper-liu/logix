# LogiX 状态机完整方案

## 📋 目录

1. [状态机定义](#1-状态机定义)
2. [状态判断逻辑](#2-状态判断逻辑)
3. [状态更新机制](#3-状态更新机制)
4. [数据验证规则](#4-数据验证规则)
5. [数据修复方案](#5-数据修复方案)
6. [前端展示方案](#6-前端展示方案)
7. [实施步骤](#7-实施步骤)

---

## 1. 状态机定义

### 1.1 状态流转图

```
未出运 (not_shipped)
  ↓ shipment_date 有值
在途 (in_transit)
  ↓ 已到中转港 OR 已到目的港
已到港 (at_port)
  - 已到中转港（port_type='transit'，destination无ata）
  - 已到目的港（destination有ata）
  ↓ pickup_date 有值
已提柜 (picked_up)
  ↓ WMS已确认（wms_status='WMS已完成' OR ebs_status='已入库' OR wms_confirm_date有值）
已卸柜 (unloaded)
  ↓ return_time 有值
已还箱 (returned_empty)
```

### 1.2 状态与对应表/字段

| 状态 | 表名 | 关键字段 | 判断条件 |
|------|------|----------|----------|
| not_shipped | - | - | 初始状态，无其他操作记录 |
| in_transit | process_sea_freight | shipment_date | 有出运记录 |
| at_port | process_port_operations | ata_dest_port | 已到中转港或目的港 |
| picked_up | process_trucking_transport | pickup_date | 有提柜记录 |
| unloaded | process_warehouse_operations | wms_status, ebs_status, wms_confirm_date | WMS已确认 |
| returned_empty | process_empty_returns | return_time | 有还箱记录 |

### 1.3 特殊字段说明

| 字段 | 表名 | 业务含义 | 用途 |
|------|------|----------|------|
| last_free_date | process_port_operations | 最晚提柜日 | "按最晚提柜日"统计 |
| lastReturnDate | process_empty_returns | 最晚还箱日 | "按最晚还箱日"统计 |

---

## 2. 状态判断逻辑

### 2.1 核心判断函数

```typescript
interface DateInfo {
  // 海运信息
  shipmentDate?: Date;

  // 港口操作
  hasTransit: boolean;           // 有中转港记录
  hasDestinationAta: boolean;    // 目的港有ATA
  lastFreeDate?: Date;           // 最晚提柜日

  // 拖卡运输
  pickupDate?: Date;

  // 仓库操作
  wmsStatus?: string;            // WMS状态
  ebsStatus?: string;            // EBS状态
  wmsConfirmDate?: Date;         // WMS确认日期
  warehouseArrivalDate?: Date;   // 仓库到达日期

  // 还箱操作
  lastReturnDate?: Date;         // 最晚还箱日
  returnTime?: Date;             // 还箱时间
}

async determineStatus(containerNumber: string): Promise<string> {
  const dates = await this.getDateInfo(containerNumber);

  // 1. 已还箱（优先级最高）
  if (dates.returnTime) return 'returned_empty';

  // 2. 已卸柜（WMS已确认）
  if (this.isWmsConfirmed(dates)) return 'unloaded';

  // 3. 已提柜
  if (dates.pickupDate) return 'picked_up';

  // 4. 已到港（包括中转港和目的港）
  if (dates.hasTransit || dates.hasDestinationAta) return 'at_port';

  // 5. 在途
  if (dates.shipmentDate) return 'in_transit';

  // 6. 未出运
  return 'not_shipped';
}

/**
 * 判断是否WMS已确认（已卸柜）
 */
private isWmsConfirmed(dates: DateInfo): boolean {
  // 满足任一条件即可
  return dates.wmsStatus === 'WMS已完成' ||
         dates.ebsStatus === '已入库' ||
         dates.wmsConfirmDate !== null;
}
```

### 2.2 多港经停的at_port状态判断

```typescript
/**
 * 判断是否已到港（包括中转港和目的港）
 */
private isAtPort(dates: DateInfo): boolean {
  // 条件1：已到中转港（有transit记录，destination无ATA）
  if (dates.hasTransit && !dates.hasDestinationAta) {
    return true; // 已到中转港，等待到目的港
  }

  // 条件2：已到目的港（destination有ATA）
  if (dates.hasDestinationAta) {
    return true; // 已到目的港
  }

  return false; // 未到港
}
```

---

## 3. 状态更新机制

### 3.1 自动更新策略

**原则**：在各操作记录创建/更新时自动更新货柜状态

**触发时机**：
1. 创建/更新海运记录（shipment_date）
2. 创建/更新港口操作记录（ata_dest_port）
3. 创建/更新拖卡运输记录（pickup_date）
4. 创建/更新仓库操作记录（wms_status, ebs_status, wms_confirm_date）
5. 创建/更新还箱记录（return_time）

### 3.2 ContainerStatusService实现

```typescript
@Injectable()
export class ContainerStatusService {
  constructor(
    @InjectRepository(Container)
    private containerRepository: Repository<Container>
  ) {}

  /**
   * 更新货柜状态
   * @param containerNumber 货柜号
   * @returns 是否成功更新
   */
  async updateStatus(containerNumber: string): Promise<boolean> {
    const expectedStatus = await this.determineStatus(containerNumber);

    const result = await this.containerRepository.update(
      { containerNumber },
      { logisticsStatus: expectedStatus }
    );

    return result.affected > 0;
  }

  /**
   * 批量更新状态
   * @param limit 每次更新的数量限制
   * @returns 更新的数量
   */
  async batchUpdateStatuses(limit: number = 1000): Promise<number> {
    const containers = await this.containerRepository
      .createQueryBuilder('container')
      .limit(limit)
      .getMany();

    let updatedCount = 0;

    for (const container of containers) {
      const expectedStatus = await this.determineStatus(container.containerNumber);

      if (container.logisticsStatus !== expectedStatus) {
        await this.containerRepository.update(
          { containerNumber: container.containerNumber },
          { logisticsStatus: expectedStatus }
        );
        updatedCount++;
      }
    }

    return updatedCount;
  }
}
```

---

## 4. 数据验证规则

### 4.1 状态一致性验证

```typescript
async validateStatus(containerNumber: string): Promise<ContainerStatusInfo> {
  const container = await this.containerRepository.findOne({
    where: { containerNumber }
  });

  if (!container) {
    throw new Error(`Container ${containerNumber} not found`);
  }

  const currentStatus = container.logisticsStatus;
  const expectedStatus = await this.determineStatus(containerNumber);
  const warnings: string[] = [];

  // 检查状态一致性
  const isConsistent = currentStatus === expectedStatus;
  if (!isConsistent) {
    warnings.push(`状态不一致：当前状态${currentStatus}，预期状态${expectedStatus}`);
  }

  return {
    currentStatus,
    expectedStatus,
    isConsistent,
    hasMissingData: false,
    hasDateAnomaly: false,
    warnings,
    errors: []
  };
}
```

---

## 5. 数据修复方案

### 5.1 批量修复SQL

#### 修复1：picked_up → unloaded（基于WMS确认）

```sql
-- 更新picked_up状态但WMS已确认的货柜为unloaded
UPDATE biz_containers c
SET logistics_status = 'unloaded'
WHERE logistics_status = 'picked_up'
  AND EXISTS (
    SELECT 1 FROM process_warehouse_operations wo
    WHERE wo.container_number = c.container_number
      AND (
        wo.wms_status = 'WMS已完成'
        OR wo.ebs_status = '已入库'
        OR wo.wms_confirm_date IS NOT NULL
      )
  )
  AND NOT EXISTS (
    SELECT 1 FROM process_empty_returns er
    WHERE er.container_number = c.container_number
      AND er.return_time IS NOT NULL
  );
```

---

## 6. 前端展示方案

### 6.1 统计卡片展示

**原则**：直接基于`logistics_status`统计，不需要额外约束

#### "按最晚还箱日"统计

```typescript
// 统计逻辑
async getReturnedEmptyStatistics() {
  const result = await this.containerRepository.query(`
    SELECT
      CASE
        WHEN er."lastReturnDate" IS NULL THEN '最后还箱日为空'
        WHEN DATE(er."lastReturnDate") < CURRENT_DATE THEN '已逾期未还箱'
        WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '3 days' THEN '紧急：倒计时3天内'
        WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '7 days' THEN '警告：倒计时7天内'
        ELSE '正常'
      END as category,
      COUNT(*) as count
    FROM biz_containers c
    LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
    WHERE c.logistics_status IN ('picked_up', 'unloaded')
    GROUP BY category
    ORDER BY category
  `);

  return result;
}
```

### 6.2 桑基图展示

```typescript
// 桑基图数据
const sankeyData = {
  nodes: [
    { name: '未出运' },
    { name: '在途' },
    { name: '已到港' },
    { name: '已提柜' },
    { name: '已卸柜' },
    { name: '已还箱' }
  ],
  links: [
    { source: '未出运', target: '在途', value: 85 },
    { source: '在途', target: '已到港', value: 92 },
    { source: '已到港', target: '已提柜', value: 54 },
    { source: '已提柜', target: '已卸柜', value: 0 },
    { source: '已卸柜', target: '已还箱', value: 0 },
    { source: '已提柜', target: '已还箱', value: 54 }
  ]
};
```

---

## 7. 实施步骤

### 阶段1：数据修复（1天）

1. **验证当前状态分布**
   ```sql
   SELECT logistics_status, COUNT(*) as count
   FROM biz_containers
   GROUP BY logistics_status;
   ```

2. **批量修复picked_up → unloaded**
   ```sql
   -- 执行修复SQL
   UPDATE biz_containers SET logistics_status = 'unloaded' WHERE ...;
   ```

3. **验证修复结果**
   ```sql
   -- 检查状态不一致的货柜
   -- 应该为0
   ```

### 阶段2：ContainerStatusService实现（2-3天）

1. 创建`ContainerStatusService`
2. 实现`determineStatus`方法
3. 实现`updateStatus`方法
4. 实现`batchUpdateStatuses`方法
5. 编写单元测试

### 阶段3：集成到各服务（2-3天）

1. 在`SeaFreightService`中集成
2. 在`PortOperationService`中集成
3. 在`TruckingTransportService`中集成
4. 在`WarehouseOperationService`中集成
5. 在`EmptyReturnService`中集成

### 阶段4：修改统计服务（1-2天）

1. 修改`LastReturnStatistics.service.ts`
   - 目标集：`logistics_status IN ('picked_up', 'unloaded')`
   - 移除所有额外约束

2. 修改`LastPickupStatistics.service.ts`
   - 目标集：`logistics_status = 'at_port'`
   - 移除所有额外约束

### 阶段5：前端改造（1-2天）

1. 添加异常状态标记
2. 更新统计卡片查询逻辑
3. 添加数据质量提示

### 阶段6：定时任务实现（1天）

1. 实现`ContainerStatusScheduler`
2. 配置每小时批量更新
3. 配置每日一致性检查

### 阶段7：测试与优化（2-3天）

1. 端到端测试
2. 性能优化
3. 监控指标配置

---

## 📊 预期结果

### 状态分布（修复后）

| 状态 | 当前数量 | 预期数量 | 变化 |
|------|----------|----------|------|
| not_shipped | 0 | 0 | - |
| in_transit | 85 | 85 | - |
| at_port | 92 | 92 | - |
| picked_up | 54 | 0 | -54 |
| **unloaded** | **0** | **~54** | **+54** |
| returned_empty | 119 | 119 | - |

### "按最晚还箱日"统计

目标集：`logistics_status IN ('picked_up', 'unloaded')`

| 分类 | 预期数量 |
|------|----------|
| 已逾期未还箱 | ? |
| 紧急：倒计时3天内 | ? |
| 警告：倒计时7天内 | ? |
| 正常 | ? |
| 最后还箱日为空 | ? |
| **合计** | **~54** |

---

## ❓ 待确认的问题

1. **"按最晚还箱日"的目标集确认**：
   - ✅ 确认包含`unloaded`状态
   - ✅ 目标集：`logistics_status IN ('picked_up', 'unloaded')`

2. **WMS确认的判断条件确认**：
   - ✅ 使用`wms_status = 'WMS已完成'` OR `ebs_status = '已入库'` OR `wms_confirm_date IS NOT NULL`

3. **unloaded状态的必要性确认**：
   - ✅ unloaded状态是必需的
   - ✅ 用于表示"提柜-卸柜-还箱"流转中的卸柜环节

4. **数据修复策略确认**：
   - ✅ 先批量修复历史数据
   - ✅ 后续通过自动更新机制维护

---

## 📝 总结

### 核心原则

1. **状态完全基于logistics_status字段**
2. **统计不需要额外约束条件**
3. **状态更新自动化**
4. **多港经停正确处理**

### 关键要点

1. **at_port状态包含两个子状态**：
   - 已到中转港
   - 已到目的港

2. **unloaded状态基于WMS/EBS确认**：
   - `wms_status = 'WMS已完成'`
   - `ebs_status = '已入库'`
   - `wms_confirm_date IS NOT NULL`

3. **lastFreeDate vs lastReturnDate**：
   - `lastFreeDate`：最晚提柜日（港口免费期截止）
   - `lastReturnDate`：最晚还箱日（货代要求还箱截止）

### 实施优先级

1. **高优先级**：数据修复、ContainerStatusService实现
2. **中优先级**：集成到各服务、修改统计服务
3. **低优先级**：前端异常标记、定时任务

---

**方案完成时间**：2025-03-06

**版本**：v1.0
