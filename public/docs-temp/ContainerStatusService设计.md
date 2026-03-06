# ContainerStatusService 设计文档

## 📋 服务概述

`ContainerStatusService`负责货柜物流状态的维护、验证和更新，确保状态机的一致性和准确性。

## 🎯 核心职责

1. **状态计算**：根据操作记录计算货柜应该的状态
2. **状态更新**：在操作记录变更时自动更新状态
3. **状态验证**：验证状态与操作记录的一致性
4. **异常检测**：检测状态不一致、数据缺失等问题

## 📐 服务设计

### 3.1 核心接口

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Container } from '../entities/Container';

export interface ContainerStatusInfo {
  currentStatus: string;
  expectedStatus: string;
  isConsistent: boolean;
  hasMissingData: boolean;
  hasDateAnomaly: boolean;
  warnings: string[];
  errors: string[];
}

export interface DateInfo {
  shipmentDate?: Date;
  ataDate?: Date;
  pickupDate?: Date;
  unloadDate?: Date;
  returnTime?: Date;
  lastFreeDate?: Date;
  lastReturnDate?: Date;
}

@Injectable()
export class ContainerStatusService {
  constructor(
    @InjectRepository(Container)
    private containerRepository: Repository<Container>
  ) {}

  /**
   * 计算货柜的预期状态
   * @param containerNumber 货柜号
   * @returns 预期状态
   */
  async determineStatus(containerNumber: string): Promise<string> {
    const dates = await this.getDateInfo(containerNumber);

    // 按优先级从后往前检查（最新状态优先）
    if (dates.returnTime) return 'returned_empty';
    if (dates.unloadDate) return 'unloaded';
    if (dates.pickupDate) return 'picked_up';
    if (dates.ataDate) return 'at_port';
    if (dates.shipmentDate) return 'in_transit';
    return 'not_shipped';
  }

  /**
   * 获取货柜的所有关键日期信息
   * @param containerNumber 货柜号
   * @returns 日期信息
   */
  async getDateInfo(containerNumber: string): Promise<DateInfo> {
    const result = await this.containerRepository.query(`
      SELECT
        sf.shipment_date as "shipmentDate",
        po.ata_dest_port as "ataDate",
        po.last_free_date as "lastFreeDate",
        tt.pickup_date as "pickupDate",
        wo.unload_date as "unloadDate",
        er.return_time as "returnTime",
        er.last_return_date as "lastReturnDate"
      FROM biz_containers c
      LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
      LEFT JOIN process_port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
      LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
      LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
      LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
      WHERE c.container_number = $1
    `, [containerNumber]);

    return result[0] || {};
  }

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
   * 验证货柜状态
   * @param containerNumber 货柜号
   * @returns 状态信息
   */
  async validateStatus(containerNumber: string): Promise<ContainerStatusInfo> {
    const container = await this.containerRepository.findOne({
      where: { containerNumber }
    });

    if (!container) {
      throw new Error(`Container ${containerNumber} not found`);
    }

    const dates = await this.getDateInfo(containerNumber);
    const currentStatus = container.logisticsStatus;
    const expectedStatus = await this.determineStatus(containerNumber);
    const warnings: string[] = [];
    const errors: string[] = [];

    // 检查状态一致性
    const isConsistent = currentStatus === expectedStatus;
    if (!isConsistent) {
      warnings.push(`状态不一致：当前状态${currentStatus}，预期状态${expectedStatus}`);
    }

    // 检查数据缺失
    const missingData = this.checkMissingData(currentStatus, dates);
    if (missingData.length > 0) {
      warnings.push(`数据缺失：${missingData.join(', ')}`);
    }

    // 检查日期异常
    const dateAnomalies = this.checkDateAnomalies(dates);
    if (dateAnomalies.length > 0) {
      errors.push(`日期异常：${dateAnomalies.join(', ')}`);
    }

    return {
      currentStatus,
      expectedStatus,
      isConsistent,
      hasMissingData: missingData.length > 0,
      hasDateAnomaly: dateAnomalies.length > 0,
      warnings,
      errors
    };
  }

  /**
   * 检查数据缺失
   * @param currentStatus 当前状态
   * @param dates 日期信息
   * @returns 缺失的数据项
   */
  private checkMissingData(currentStatus: string, dates: DateInfo): string[] {
    const missing: string[] = [];

    // 根据状态检查必需的日期
    switch (currentStatus) {
      case 'in_transit':
        if (!dates.shipmentDate) missing.push('出运日期');
        break;
      case 'at_port':
        if (!dates.shipmentDate) missing.push('出运日期');
        if (!dates.ataDate) missing.push('到港日期');
        break;
      case 'picked_up':
        if (!dates.shipmentDate) missing.push('出运日期');
        if (!dates.ataDate) missing.push('到港日期');
        if (!dates.pickupDate) missing.push('提柜日期');
        break;
      case 'unloaded':
        if (!dates.shipmentDate) missing.push('出运日期');
        if (!dates.ataDate) missing.push('到港日期');
        if (!dates.pickupDate) missing.push('提柜日期');
        if (!dates.unloadDate) missing.push('卸柜日期');
        break;
      case 'returned_empty':
        if (!dates.shipmentDate) missing.push('出运日期');
        if (!dates.ataDate) missing.push('到港日期');
        if (!dates.pickupDate) missing.push('提柜日期');
        if (!dates.unloadDate) missing.push('卸柜日期');
        if (!dates.returnTime) missing.push('还箱时间');
        break;
    }

    return missing;
  }

  /**
   * 检查日期异常
   * @param dates 日期信息
   * @returns 异常描述
   */
  private checkDateAnomalies(dates: DateInfo): string[] {
    const anomalies: string[] = [];

    // 检查日期顺序
    if (dates.shipmentDate && dates.ataDate && dates.shipmentDate > dates.ataDate) {
      anomalies.push('出运日期 > 到港日期');
    }

    if (dates.ataDate && dates.pickupDate && dates.ataDate > dates.pickupDate) {
      anomalies.push('到港日期 > 提柜日期');
    }

    if (dates.pickupDate && dates.unloadDate && dates.pickupDate > dates.unloadDate) {
      anomalies.push('提柜日期 > 卸柜日期');
    }

    if (dates.unloadDate && dates.returnTime && dates.unloadDate > dates.returnTime) {
      anomalies.push('卸柜日期 > 还箱日期');
    }

    // 检查lastFreeDate和lastReturnDate的一致性
    if (dates.lastFreeDate && dates.lastReturnDate &&
        dates.lastFreeDate.getTime() !== dates.lastReturnDate.getTime()) {
      anomalies.push('lastFreeDate与lastReturnDate不一致');
    }

    return anomalies;
  }

  /**
   * 批量更新状态
   * @param limit 每次更新的数量限制
   * @returns 更新的数量
   */
  async batchUpdateStatuses(limit: number = 1000): Promise<number> {
    // 查找所有需要更新的货柜
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

  /**
   * 获取状态不一致的货柜列表
   * @returns 货柜号列表
   */
  async getInconsistentContainers(): Promise<string[]> {
    const result = await this.containerRepository.query(`
      SELECT c.container_number
      FROM biz_containers c
      WHERE c.logistics_status != (
        CASE
          WHEN EXISTS (
            SELECT 1 FROM process_empty_returns er
            WHERE er.container_number = c.container_number
            AND er."returnTime" IS NOT NULL
          ) THEN 'returned_empty'
          WHEN EXISTS (
            SELECT 1 FROM process_warehouse_operations wo
            WHERE wo.container_number = c.container_number
            AND wo.unload_date IS NOT NULL
          ) THEN 'unloaded'
          WHEN EXISTS (
            SELECT 1 FROM process_trucking_transport tt
            WHERE tt.container_number = c.container_number
            AND tt.pickup_date IS NOT NULL
          ) THEN 'picked_up'
          WHEN EXISTS (
            SELECT 1 FROM process_port_operations po
            WHERE po.container_number = c.container_number
            AND po.port_type = 'destination'
            AND po.ata_dest_port IS NOT NULL
          ) THEN 'at_port'
          WHEN EXISTS (
            SELECT 1 FROM process_sea_freight sf
            WHERE sf.container_number = c.container_number
            AND sf.shipment_date IS NOT NULL
          ) THEN 'in_transit'
          ELSE 'not_shipped'
        END
      )
    `);

    return result.map(r => r.container_number);
  }
}
```

### 3.2 集成到其他服务

#### SeaFreightService集成

```typescript
import { ContainerStatusService } from './ContainerStatusService';

@Injectable()
export class SeaFreightService {
  constructor(
    private containerStatusService: ContainerStatusService
  ) {}

  async createSeaFreight(data: CreateSeaFreightDto): Promise<SeaFreight> {
    const seaFreight = await this.seaFreightRepository.save(data);

    // 自动更新货柜状态
    await this.containerStatusService.updateStatus(data.containerNumber);

    return seaFreight;
  }

  async updateSeaFreight(containerNumber: string, data: UpdateSeaFreightDto): Promise<SeaFreight> {
    await this.seaFreightRepository.update({ containerNumber }, data);

    // 自动更新货柜状态
    await this.containerStatusService.updateStatus(containerNumber);

    return this.seaFreightRepository.findOne({ where: { containerNumber } });
  }
}
```

#### PortOperationService集成

```typescript
@Injectable()
export class PortOperationService {
  constructor(
    private containerStatusService: ContainerStatusService
  ) {}

  async createPortOperation(data: CreatePortOperationDto): Promise<PortOperation> {
    const portOperation = await this.portOperationRepository.save(data);

    // 只在目的港操作时更新状态
    if (data.portType === 'destination') {
      await this.containerStatusService.updateStatus(data.containerNumber);
    }

    return portOperation;
  }
}
```

### 3.3 定时任务实现

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ContainerStatusScheduler {
  constructor(
    private containerStatusService: ContainerStatusService,
    private logger: Logger
  ) {}

  /**
   * 每小时批量更新状态
   */
  @Cron(CronExpression.EVERY_HOUR)
  async hourlyStatusUpdate() {
    this.logger.log('开始执行批量状态更新...');
    const updated = await this.containerStatusService.batchUpdateStatuses(1000);
    this.logger.log(`批量状态更新完成，更新了${updated}条记录`);
  }

  /**
   * 每天检查状态不一致
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyConsistencyCheck() {
    this.logger.log('开始检查状态不一致...');
    const inconsistent = await this.containerStatusService.getInconsistentContainers();

    if (inconsistent.length > 0) {
      this.logger.warn(`发现${inconsistent.length}个状态不一致的货柜`);

      // 发送告警通知
      await this.sendAlert(inconsistent);
    }
  }

  private async sendAlert(inconsistentContainers: string[]) {
    // 实现告警逻辑（邮件、Slack、企业微信等）
  }
}
```

### 3.4 API接口

```typescript
@Controller('containers/status')
export class ContainerStatusController {
  constructor(private containerStatusService: ContainerStatusService) {}

  /**
   * 获取货柜状态信息
   */
  @Get(':containerNumber')
  async getStatusInfo(
    @Param('containerNumber') containerNumber: string
  ): Promise<ContainerStatusInfo> {
    return this.containerStatusService.validateStatus(containerNumber);
  }

  /**
   * 手动更新货柜状态
   */
  @Post(':containerNumber/update')
  async updateStatus(
    @Param('containerNumber') containerNumber: string
  ): Promise<{ success: boolean; newStatus: string }> {
    const success = await this.containerStatusService.updateStatus(containerNumber);

    if (!success) {
      throw new NotFoundException(`Container ${containerNumber} not found`);
    }

    const container = await this.containerRepository.findOne({
      where: { containerNumber }
    });

    return { success: true, newStatus: container.logisticsStatus };
  }

  /**
   * 获取所有状态不一致的货柜
   */
  @Get('inconsistent/list')
  async getInconsistentContainers(): Promise<{ containerNumbers: string[]; count: number }> {
    const containerNumbers = await this.containerStatusService.getInconsistentContainers();
    return {
      containerNumbers,
      count: containerNumbers.length
    };
  }

  /**
   * 批量更新状态
   */
  @Post('batch-update')
  async batchUpdate(
    @Body() body: { limit?: number }
  ): Promise<{ updatedCount: number }> {
    const limit = body.limit || 1000;
    const updatedCount = await this.containerStatusService.batchUpdateStatuses(limit);
    return { updatedCount };
  }
}
```

## 📊 监控指标

### 4.1 状态不一致率

```typescript
async getStatusInconsistencyRate(): Promise<number> {
  const total = await this.containerRepository.count();
  const inconsistent = await this.getInconsistentContainers();

  if (total === 0) return 0;

  return inconsistent.length / total;
}
```

### 4.2 数据缺失率

```typescript
async getDataMissingRate(): Promise<number> {
  const total = await this.containerRepository.count();

  const result = await this.containerRepository.query(`
    SELECT COUNT(*) as count
    FROM biz_containers c
    WHERE
      (c.logistics_status = 'in_transit' AND NOT EXISTS (
        SELECT 1 FROM process_sea_freight sf WHERE sf.container_number = c.container_number AND sf.shipment_date IS NOT NULL
      ))
      OR (c.logistics_status = 'at_port' AND NOT EXISTS (
        SELECT 1 FROM process_sea_freight sf WHERE sf.container_number = c.container_number AND sf.shipment_date IS NOT NULL
      ))
      OR (c.logistics_status = 'at_port' AND NOT EXISTS (
        SELECT 1 FROM process_port_operations po WHERE po.container_number = c.container_number AND po.port_type = 'destination' AND po.ata_dest_port IS NOT NULL
      ))
      OR (c.logistics_status = 'picked_up' AND NOT EXISTS (
        SELECT 1 FROM process_trucking_transport tt WHERE tt.container_number = c.container_number AND tt.pickup_date IS NOT NULL
      ))
      OR (c.logistics_status = 'unloaded' AND NOT EXISTS (
        SELECT 1 FROM process_warehouse_operations wo WHERE wo.container_number = c.container_number AND wo.unload_date IS NOT NULL
      ))
      OR (c.logistics_status = 'returned_empty' AND NOT EXISTS (
        SELECT 1 FROM process_empty_returns er WHERE er.container_number = c.container_number AND er."returnTime" IS NOT NULL
      ))
  `);

  const count = result[0].count;
  return count / total;
}
```

### 4.3 状态分布

```typescript
async getStatusDistribution(): Promise<{ [status: string]: number }> {
  const result = await this.containerRepository.query(`
    SELECT logistics_status, COUNT(*) as count
    FROM biz_containers
    GROUP BY logistics_status
    ORDER BY logistics_status
  `);

  const distribution: { [status: string]: number } = {};
  for (const row of result) {
    distribution[row.logistics_status] = parseInt(row.count);
  }

  return distribution;
}
```

## 🔧 测试用例

```typescript
describe('ContainerStatusService', () => {
  let service: ContainerStatusService;

  beforeEach(async () => {
    // 初始化测试环境
  });

  it('应该正确计算未出运状态', async () => {
    const status = await service.determineStatus('TEST001');
    expect(status).toBe('not_shipped');
  });

  it('应该正确计算在途状态', async () => {
    // 创建测试数据
    await createTestContainer('TEST001', {
      shipmentDate: new Date('2026-01-01')
    });

    const status = await service.determineStatus('TEST001');
    expect(status).toBe('in_transit');
  });

  it('应该正确检测状态不一致', async () => {
    const info = await service.validateStatus('TEST001');
    expect(info.isConsistent).toBe(false);
    expect(info.warnings).toContain('状态不一致');
  });

  it('应该正确检测数据缺失', async () => {
    const info = await service.validateStatus('TEST001');
    expect(info.hasMissingData).toBe(true);
    expect(info.warnings).toContain('数据缺失');
  });

  it('应该正确检测日期异常', async () => {
    const info = await service.validateStatus('TEST001');
    expect(info.hasDateAnomaly).toBe(true);
    expect(info.errors).toContain('日期异常');
  });
});
```

## 📝 总结

`ContainerStatusService`提供了一个完整的状态机管理方案，包括：

1. ✅ 自动状态更新机制
2. ✅ 状态一致性验证
3. ✅ 数据完整性检查
4. ✅ 日期顺序验证
5. ✅ 批量更新能力
6. ✅ 监控与告警
7. ✅ RESTful API接口

通过这个服务，可以确保货柜状态始终与实际操作记录保持一致，为前端提供可靠的数据基础。
