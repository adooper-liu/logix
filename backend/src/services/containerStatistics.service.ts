/**
 * 货柜统计服务
 * Container Statistics Service
 * 负责货柜相关的统计查询
 */

import { Repository } from 'typeorm';
import { Container } from '../entities/Container';
import { TruckingTransport } from '../entities/TruckingTransport';
import { EmptyReturn } from '../entities/EmptyReturn';
import { SimplifiedStatus } from '../utils/logisticsStatusMachine';

export class ContainerStatisticsService {
  constructor(
    private containerRepository: Repository<Container>,
    private truckingTransportRepository: Repository<TruckingTransport>,
    private emptyReturnRepository: Repository<EmptyReturn>
  ) {}

  /**
   * 获取按状态分布的统计
   */
  async getStatusDistribution(): Promise<Record<string, number>> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('container.logisticsStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('container.logisticsStatus')
      .getRawMany();

    // 转换为对象格式
    const distribution: Record<string, number> = {
      not_shipped: 0,
      shipped: 0,
      in_transit: 0,
      arrived_at_transit: 0,
      at_port: 0,
      picked_up: 0,
      unloaded: 0,
      returned_empty: 0
    };

    result.forEach((row: any) => {
      distribution[row.status] = parseInt(row.count);
    });

    // 查询到达中转港的货柜数（有transit类型港口操作记录，但没有到达目的港记录的货柜）
    const transitArrivalResult = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin(
        `(
          SELECT po1.container_number
          FROM process_port_operations po1
          WHERE po1.port_type = 'transit'
          AND NOT EXISTS (
            SELECT 1
            FROM process_port_operations po2
            WHERE po2.container_number = po1.container_number
            AND po2.port_type = 'destination'
            AND po2.ata_dest_port IS NOT NULL
          )
        )`,
        'transit_po',
        'transit_po.container_number = container.containerNumber'
      )
      .getRawOne();

    distribution.arrived_at_transit = parseInt(transitArrivalResult.count);

    return distribution;
  }

  /**
   * 获取按到港时间分布的统计
   * 目标集：shipped + in_transit + at_port
   * 原则：每个货柜只被计数一次，按目的港到港情况分类
   */
  async getArrivalDistribution(): Promise<Record<string, number>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetStatuses = [
      SimplifiedStatus.SHIPPED,
      SimplifiedStatus.IN_TRANSIT,
      SimplifiedStatus.AT_PORT
    ];

    // 先获取目标集总数
    const totalTarget = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(*)', 'count')
      .where('container.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
      .getRawOne();

    // 先执行各查询并记录结果
    const arrivedTodayResult = await this.getArrivedToday(today, targetStatuses);
    const arrivedBeforeTodayResult = await this.getArrivedBeforeToday(today, targetStatuses);
    const overdueNotArrivedResult = await this.getOverdueNotArrived(today, targetStatuses);
    const within3DaysResult = await this.getWithin3Days(today, targetStatuses);
    const within7DaysResult = await this.getWithin7Days(today, targetStatuses);
    const over7DaysResult = await this.getOver7Days(today, targetStatuses);
    const otherRecordsResult = await this.getOtherRecords(today, targetStatuses);

    const sum = arrivedTodayResult + arrivedBeforeTodayResult +
               overdueNotArrivedResult + within3DaysResult + within7DaysResult + over7DaysResult + otherRecordsResult;

    console.log('[getArrivalDistribution]', {
      targetTotal: parseInt(totalTarget.count),
      calculatedSum: sum,
      diff: parseInt(totalTarget.count) - sum,
      targetStatuses,
      details: {
        today: arrivedTodayResult,
        arrivedBeforeToday: arrivedBeforeTodayResult,
        overdue: overdueNotArrivedResult,
        within3Days: within3DaysResult,
        within7Days: within7DaysResult,
        over7Days: over7DaysResult,
        other: otherRecordsResult
      }
    });

    return {
      today: arrivedTodayResult,
      arrivedBeforeToday: arrivedBeforeTodayResult,
      overdue: overdueNotArrivedResult,
      within3Days: within3DaysResult,
      within7Days: within7DaysResult,
      over7Days: over7DaysResult,
      other: otherRecordsResult
    };
  }

  /**
   * 获取按提柜时间分布的统计
   */
  async getPickupDistribution(): Promise<Record<string, number>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    // 并行执行所有查询
    const [
      overduePlanned,
      todayPlanned,
      todayActual,
      pendingArrangement,
      within3Days,
      within7Days
    ] = await Promise.all([
      this.getOverduePlanned(today),
      this.getTodayPlanned(today),
      this.getTodayActual(today),
      this.getPendingArrangement(),
      this.getPlannedWithin3Days(today, threeDaysLater),
      this.getPlannedWithin7Days(today, threeDaysLater, sevenDaysLater)
    ]);

    return {
      overdue: overduePlanned,
      todayPlanned,
      todayActual,
      pending: pendingArrangement,
      within3Days,
      within7Days
    };
  }

  /**
   * 获取按最晚提柜时间分布的统计
   */
  async getLastPickupDistribution(): Promise<Record<string, number>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    // 并行执行所有查询
    const [
      expiredCount,
      urgentCount,
      warningCount,
      normalCount,
      noLastFreeDateCount
    ] = await Promise.all([
      this.getExpiredCount(today),
      this.getUrgentCount(today, threeDaysLater),
      this.getWarningCount(today, threeDaysLater, sevenDaysLater),
      this.getNormalCount(today, sevenDaysLater),
      this.getNoLastFreeDateCount()
    ]);

    return {
      expired: expiredCount,
      urgent: urgentCount,
      warning: warningCount,
      normal: normalCount,
      noLastFreeDate: noLastFreeDateCount
    };
  }

  /**
   * 获取按最晚还箱时间分布的统计
   */
  async getReturnDistribution(): Promise<Record<string, number>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    // 并行执行所有查询
    const [
      expiredCount,
      urgentCount,
      warningCount,
      normalCount,
      noLastReturnDateCount
    ] = await Promise.all([
      this.getReturnExpiredCount(today),
      this.getReturnUrgentCount(today, threeDaysLater),
      this.getReturnWarningCount(today, threeDaysLater, sevenDaysLater),
      this.getReturnNormalCount(today, sevenDaysLater),
      this.getNoLastReturnDateCount()
    ]);

    return {
      expired: expiredCount,
      urgent: urgentCount,
      warning: warningCount,
      normal: normalCount,
      noLastReturnDate: noLastReturnDateCount
    };
  }

  // ==================== 到港分布查询 ====================
  // 关键原则：这7个查询必须互斥，确保每个货柜只被计数一次

  /**
   * 1. 今日到港：目的港ATA = today，且状态在目标集内
   * 注意：如果一个货柜有多条目的港记录，只统计最近一次到港的
   */
  private async getArrivedToday(today: Date, targetStatuses: string[]): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin(
        `(
          SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NOT NULL
          GROUP BY po1.container_number
        )`,
        'latest_po',
        'latest_po.container_number = container.container_number'
      )
      .where('container.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
      .andWhere("DATE(latest_po.latest_ata) = :today", { today })
      .getRawOne();

    return parseInt(result.count);
  }

  /**
   * 2. 今日之前到港：目的港ATA < today，且状态在目标集内
   * 注意：如果一个货柜有多条目的港记录，只统计最近一次到港的
   */
  private async getArrivedBeforeToday(today: Date, targetStatuses: string[]): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin(
        `(
          SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NOT NULL
          GROUP BY po1.container_number
        )`,
        'latest_po',
        'latest_po.container_number = container.container_number'
      )
      .where('container.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
      .andWhere('DATE(latest_po.latest_ata) < :today', { today })
      .getRawOne();

    return parseInt(result.count);
  }

  /**
   * 3. 逾期未到港：ETA < today，ATA is null，且状态在目标集内
   */
  private async getOverdueNotArrived(today: Date, targetStatuses: string[]): Promise<number> {
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD 格式
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin(
        `(
          SELECT po1.container_number
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NULL
          AND (po1.eta_dest_port < '${todayStr}' OR po1.eta_correction < '${todayStr}')
        )`,
        'dest_po',
        'dest_po.container_number = container.container_number'
      )
      .where('container.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
      .getRawOne();

    return parseInt(result.count);
  }

  /**
   * 4. 3日内预计到港：ETA in [today, today+3]，且状态在目标集内
   */
  private async getWithin3Days(today: Date, targetStatuses: string[]): Promise<number> {
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const todayStr = today.toISOString().split('T')[0];
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0];

    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin(
        `(
          SELECT po1.container_number
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NULL
          AND po1.eta_dest_port >= '${todayStr}'
          AND po1.eta_dest_port <= '${threeDaysStr}'
        )`,
        'dest_po',
        'dest_po.container_number = container.container_number'
      )
      .where('container.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
      .getRawOne();

    return parseInt(result.count);
  }

  /**
   * 5. 7日内预计到港：ETA in (today+3, today+7]，且状态在目标集内
   */
  private async getWithin7Days(today: Date, targetStatuses: string[]): Promise<number> {
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const threeDaysStr = threeDaysLater.toISOString().split('T')[0];
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin(
        `(
          SELECT po1.container_number
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NULL
          AND po1.eta_dest_port > '${threeDaysStr}'
          AND po1.eta_dest_port <= '${sevenDaysStr}'
        )`,
        'dest_po',
        'dest_po.container_number = container.container_number'
      )
      .where('container.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
      .getRawOne();

    return parseInt(result.count);
  }

  /**
   * 6. 7日后预计到港：ETA > today+7，且状态在目标集内
   */
  private async getOver7Days(today: Date, targetStatuses: string[]): Promise<number> {
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];

    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin(
        `(
          SELECT po1.container_number
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NULL
          AND po1.eta_dest_port > '${sevenDaysStr}'
        )`,
        'dest_po',
        'dest_po.container_number = container.container_number'
      )
      .where('container.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
      .getRawOne();

    return parseInt(result.count);
  }

  /**
   * 7. 其他：ETA is null，且状态在目标集内
   */
  private async getOtherRecords(today: Date, targetStatuses: string[]): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin(
        `(
          SELECT po1.container_number
          FROM process_port_operations po1
          WHERE po1.port_type = 'destination'
          AND po1.ata_dest_port IS NULL
          AND po1.eta_dest_port IS NULL
        )`,
        'dest_po',
        'dest_po.container_number = container.container_number'
      )
      .where('container.logisticsStatus IN (:...targetStatuses)', { targetStatuses })
      .getRawOne();

    return parseInt(result.count);
  }

  // ==================== 提柜分布查询 ====================

  private async getOverduePlanned(today: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin('container.portOperations', 'po')
      .leftJoin('container.seaFreight', 'sf')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('tt.pickupDate IS NULL')
      .andWhere('tt.plannedPickupDate < :today', { today })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getTodayPlanned(today: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin('container.portOperations', 'po')
      .leftJoin('container.seaFreight', 'sf')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('tt.pickupDate IS NULL')
      .andWhere("DATE(tt.plannedPickupDate) = :today", { today })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getTodayActual(today: Date): Promise<number> {
    const result = await this.truckingTransportRepository
      .createQueryBuilder('tt')
      .select('COUNT(DISTINCT tt.containerNumber)', 'count')
      .where("DATE(tt.pickupDate) = :today", { today })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getPendingArrangement(): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('tt.containerNumber IS NULL')
      .getRawOne();

    return parseInt(result.count);
  }

  private async getPlannedWithin3Days(today: Date, threeDaysLater: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin('container.portOperations', 'po')
      .leftJoin('container.seaFreight', 'sf')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('tt.pickupDate IS NULL')
      .andWhere('tt.plannedPickupDate >= :today', { today })
      .andWhere('tt.plannedPickupDate <= :threeDays', { threeDays: threeDaysLater })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getPlannedWithin7Days(today: Date, threeDaysLater: Date, sevenDaysLater: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .innerJoin('container.portOperations', 'po')
      .leftJoin('container.seaFreight', 'sf')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('tt.pickupDate IS NULL')
      .andWhere('tt.plannedPickupDate > :threeDays', { threeDays: threeDaysLater })
      .andWhere('tt.plannedPickupDate <= :sevenDays', { sevenDays: sevenDaysLater })
      .getRawOne();

    return parseInt(result.count);
  }

  // ==================== 最晚提柜分布查询 ====================

  private async getExpiredCount(today: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .leftJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('tt.containerNumber IS NULL')
      .andWhere('po.lastFreeDate < :today', { today })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getUrgentCount(today: Date, threeDaysLater: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .leftJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('tt.containerNumber IS NULL')
      .andWhere('po.lastFreeDate >= :today', { today })
      .andWhere('po.lastFreeDate <= :threeDays', { threeDays: threeDaysLater })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getWarningCount(today: Date, threeDaysLater: Date, sevenDaysLater: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .leftJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('tt.containerNumber IS NULL')
      .andWhere('po.lastFreeDate > :threeDays', { threeDays: threeDaysLater })
      .andWhere('po.lastFreeDate <= :sevenDays', { sevenDays: sevenDaysLater })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getNormalCount(today: Date, sevenDaysLater: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .leftJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('tt.containerNumber IS NULL')
      .andWhere('po.lastFreeDate > :sevenDays', { sevenDays: sevenDaysLater })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getNoLastFreeDateCount(): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .leftJoin('container.portOperations', 'po')
      .leftJoin(TruckingTransport, 'tt', 'tt.containerNumber = container.containerNumber')
      .where('po.portType = :portType', { portType: 'destination' })
      .andWhere('container.logisticsStatus = :status', { status: SimplifiedStatus.AT_PORT })
      .andWhere('tt.containerNumber IS NULL')
      .andWhere('po.lastFreeDate IS NULL')
      .getRawOne();

    return parseInt(result.count);
  }

  // ==================== 最晚还箱分布查询 ====================

  private async getReturnExpiredCount(today: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .leftJoin(EmptyReturn, 'er', 'er.containerNumber = container.containerNumber')
      .where('container.logisticsStatus IN (:...statuses)', {
        statuses: [SimplifiedStatus.PICKED_UP, SimplifiedStatus.UNLOADED]
      })
      .andWhere('er.containerNumber IS NOT NULL')
      .andWhere('er.returnTime IS NULL')
      .andWhere('er.lastReturnDate < :today', { today })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getReturnUrgentCount(today: Date, threeDaysLater: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .leftJoin(EmptyReturn, 'er', 'er.containerNumber = container.containerNumber')
      .where('container.logisticsStatus IN (:...statuses)', {
        statuses: [SimplifiedStatus.PICKED_UP, SimplifiedStatus.UNLOADED]
      })
      .andWhere('er.containerNumber IS NOT NULL')
      .andWhere('er.returnTime IS NULL')
      .andWhere('er.lastReturnDate >= :today', { today })
      .andWhere('er.lastReturnDate <= :threeDays', { threeDays: threeDaysLater })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getReturnWarningCount(today: Date, threeDaysLater: Date, sevenDaysLater: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .leftJoin(EmptyReturn, 'er', 'er.containerNumber = container.containerNumber')
      .where('container.logisticsStatus IN (:...statuses)', {
        statuses: [SimplifiedStatus.PICKED_UP, SimplifiedStatus.UNLOADED]
      })
      .andWhere('er.containerNumber IS NOT NULL')
      .andWhere('er.returnTime IS NULL')
      .andWhere('er.lastReturnDate > :threeDays', { threeDays: threeDaysLater })
      .andWhere('er.lastReturnDate <= :sevenDays', { sevenDays: sevenDaysLater })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getReturnNormalCount(today: Date, sevenDaysLater: Date): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .leftJoin(EmptyReturn, 'er', 'er.containerNumber = container.containerNumber')
      .where('container.logisticsStatus IN (:...statuses)', {
        statuses: [SimplifiedStatus.PICKED_UP, SimplifiedStatus.UNLOADED]
      })
      .andWhere('er.containerNumber IS NOT NULL')
      .andWhere('er.returnTime IS NULL')
      .andWhere('er.lastReturnDate > :sevenDays', { sevenDays: sevenDaysLater })
      .getRawOne();

    return parseInt(result.count);
  }

  private async getNoLastReturnDateCount(): Promise<number> {
    const result = await this.containerRepository
      .createQueryBuilder('container')
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .leftJoin(EmptyReturn, 'er', 'er.containerNumber = container.containerNumber')
      .where('container.logisticsStatus IN (:...statuses)', {
        statuses: [SimplifiedStatus.PICKED_UP, SimplifiedStatus.UNLOADED]
      })
      .andWhere('er.containerNumber IS NOT NULL')
      .andWhere('er.returnTime IS NULL')
      .andWhere('er.lastReturnDate IS NULL')
      .getRawOne();

    return parseInt(result.count);
  }
}
