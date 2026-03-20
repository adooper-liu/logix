/**
 * 货柜统计服务（重构版）
 * Container Statistics Service (Refactored)
 * 负责货柜相关的统计查询 - 统一入口，委托给子服务处理
 */

import { Repository } from 'typeorm';
import { Container } from '../entities/Container';
import { EmptyReturn } from '../entities/EmptyReturn';
import { TruckingTransport } from '../entities/TruckingTransport';
import { CONDITION_TO_SERVICE_MAP } from '../constants/FilterConditions';

// 子服务导入
import { StatusDistributionService } from './statistics/StatusDistribution.service';
import { ArrivalStatisticsService } from './statistics/ArrivalStatistics.service';
import { EtaStatisticsService } from './statistics/EtaStatistics.service';
import { PlannedPickupStatisticsService } from './statistics/PlannedPickupStatistics.service';
import { LastPickupStatisticsService } from './statistics/LastPickupStatistics.service';
import { LastReturnStatisticsService } from './statistics/LastReturnStatistics.service';
import { MonthlyVolumeService } from './statistics/MonthlyVolume.service';
import { DateFilterBuilder } from './statistics/common/DateFilterBuilder';

export class ContainerStatisticsService {
  private statusDistribution: StatusDistributionService;
  private arrivalStatistics: ArrivalStatisticsService;
  private etaStatistics: EtaStatisticsService;
  private plannedPickupStatistics: PlannedPickupStatisticsService;
  private lastPickupStatistics: LastPickupStatisticsService;
  private lastReturnStatistics: LastReturnStatisticsService;
  private monthlyVolume: MonthlyVolumeService;

  constructor(
    private containerRepository: Repository<Container>,
    private _truckingTransportRepository: Repository<TruckingTransport>,
    private _emptyReturnRepository: Repository<EmptyReturn>
  ) {
    // 初始化子服务
    this.statusDistribution = new StatusDistributionService(containerRepository);
    this.arrivalStatistics = new ArrivalStatisticsService(containerRepository);
    this.etaStatistics = new EtaStatisticsService(containerRepository);
    this.plannedPickupStatistics = new PlannedPickupStatisticsService(
      containerRepository,
      _truckingTransportRepository
    );
    this.lastPickupStatistics = new LastPickupStatisticsService(
      containerRepository,
      _truckingTransportRepository
    );
    this.lastReturnStatistics = new LastReturnStatisticsService(
      containerRepository,
      _truckingTransportRepository,
      _emptyReturnRepository
    );
    this.monthlyVolume = new MonthlyVolumeService(containerRepository);
  }

  /**
   * 获取状态分布统计
   */
  async getStatusDistribution(
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, number>> {
    try {
      return await this.statusDistribution.getDistribution(startDate, endDate);
    } catch (error) {
      console.error('[ContainerStatisticsService] Error in getStatusDistribution:', error);
      throw error;
    }
  }

  /**
   * 获取按到港分布的统计（合并到港和ETA统计）
   * 修正版：将统计分为三个分组
   * - 已到目的港：今日到港 + 今日之前到港未提柜 + 今日之前到港已提柜
   * - 已到中转港：已到中转港（有中转港记录，目的港无ATA）
   * - 预计到港：逾期未到港 + 3天内 + 7天内 + 7天以上 + 其他
   */
  async getArrivalDistribution(
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, number>> {
    const [arrivalDist, etaDist] = await Promise.all([
      this.arrivalStatistics.getDistribution(startDate, endDate).catch(err => {
        console.error('[ContainerStatistics] arrivalStatistics.getDistribution error:', err);
        return {
          today: 0,
          beforeTodayNotPickedUp: 0,
          beforeTodayPickedUp: 0,
          arrivedAtTransit: 0,
          arrivedBeforeTodayNoATA: 0,
          transitOverdue: 0,
          transitWithin3Days: 0,
          transitWithin7Days: 0,
          transitOver7Days: 0,
          transitNoETA: 0,
          total: 0
        };
      }),
      this.etaStatistics.getDistribution(startDate, endDate).catch(err => {
        console.error('[ContainerStatistics] etaStatistics.getDistribution error:', err);
        return { overdue: 0, within3Days: 0, within7Days: 0, over7Days: 0, otherRecords: 0, total: 0 };
      })
    ]);

    // 四个主分组；预计到港 = 子项之和，保证主数与子项一致
    const arrivedAtDestination = (arrivalDist.today || 0) + (arrivalDist.beforeTodayNotPickedUp || 0) + (arrivalDist.beforeTodayPickedUp || 0);
    const arrivedAtTransit = arrivalDist.arrivedAtTransit || 0;
    const overdue = etaDist.overdue || 0;
    const within3Days = etaDist.within3Days || 0;
    const within7Days = etaDist.within7Days || 0;
    const over7Days = etaDist.over7Days || 0;
    const other = etaDist.otherRecords || 0;
    const expectedArrival = overdue + within3Days + within7Days + over7Days + other;
    const arrivedBeforeTodayNoATA = arrivalDist.arrivedBeforeTodayNoATA || 0;

    return {
      // 四个主分组（含漏失修复：到港数据缺失）
      arrivedAtDestination,
      arrivedAtTransit,
      expectedArrival,
      arrivedBeforeTodayNoATA,

      // 已到目的港的子分类
      today: arrivalDist.today || 0,
      arrivedBeforeTodayNotPickedUp: arrivalDist.beforeTodayNotPickedUp || 0,
      arrivedBeforeTodayPickedUp: arrivalDist.beforeTodayPickedUp || 0,

      // 已到中转港的子分类（按ETA细分）
      transitOverdue: arrivalDist.transitOverdue || 0,
      transitWithin3Days: arrivalDist.transitWithin3Days || 0,
      transitWithin7Days: arrivalDist.transitWithin7Days || 0,
      transitOver7Days: arrivalDist.transitOver7Days || 0,
      transitNoETA: arrivalDist.transitNoETA || 0,

      // 预计到港的子分类
      overdue,
      within3Days,
      within7Days,
      over7Days,
      other
    };
  }

  /**
   * 获取按 ETA 分布的统计
   */
  async getEtaDistribution(
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, number>> {
    return this.etaStatistics.getDistribution(startDate, endDate);
  }

  /**
   * 获取按提柜计划分布的统计
   */
  async getPickupDistribution(
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, number>> {
    return this.plannedPickupStatistics.getDistribution(startDate, endDate);
  }

  /**
   * 获取按最晚提柜时间分布的统计
   */
  async getLastPickupDistribution(
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, number>> {
    return this.lastPickupStatistics.getDistribution(startDate, endDate);
  }

  /**
   * 获取按最晚还箱时间分布的统计
   */
  async getLastReturnDistribution(
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, number>> {
    return this.lastReturnStatistics.getDistribution(startDate, endDate);
  }

  /**
   * 获取按最晚还箱时间分布的统计（兼容旧方法名）
   */
  async getReturnDistribution(
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, number>> {
    return this.lastReturnStatistics.getDistribution(startDate, endDate);
  }

  /**
   * 获取最近3年的月度出运量统计
   */
  async getRecentYearsDistribution(): Promise<any[]> {
    return this.monthlyVolume.getRecentYearsDistribution();
  }

  /**
   * 根据统计条件获取货柜列表
   * 统一路由，委托给对应的子服务处理
   * @param filterCondition 统计条件
   * @param startDate 出运开始日期
   * @param endDate 出运结束日期
   */
  async getContainersByCondition(
    filterCondition: string,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    if (filterCondition === 'in_transit_transit') {
      return this.getContainersByInTransitTransit(startDate, endDate);
    }
    if (filterCondition === 'arrived_at_transit') {
      return this.statusDistribution.getContainersByArrivedAtTransit(startDate, endDate);
    }
    if (filterCondition === 'arrived_at_destination') {
      return this.statusDistribution.getContainersByArrivedAtDestination(startDate, endDate);
    }
    const validStatuses = ['not_shipped', 'shipped', 'in_transit', 'at_port', 'picked_up', 'unloaded', 'returned_empty'];
    if (validStatuses.includes(filterCondition)) {
      return this.getContainersByStatus(filterCondition, startDate, endDate);
    }
    const serviceName = CONDITION_TO_SERVICE_MAP[filterCondition];
    switch (serviceName) {
      case 'arrival':
        return this.arrivalStatistics.getContainersByCondition(filterCondition, startDate, endDate);
      case 'eta':
        return this.etaStatistics.getContainersByCondition(filterCondition, startDate, endDate);
      case 'plannedPickup':
        return this.plannedPickupStatistics.getContainersByCondition(filterCondition, startDate, endDate);
      case 'lastPickup':
        return this.lastPickupStatistics.getContainersByCondition(filterCondition, startDate, endDate);
      case 'lastReturn':
        return this.lastReturnStatistics.getContainersByCondition(filterCondition, startDate, endDate);
      default:
        console.warn(`[ContainerStatisticsService] Unknown filterCondition: ${filterCondition}`);
        return [];
    }
  }

  /**
   * 按物流状态获取货柜列表
   */
  private async getContainersByStatus(
    logisticsStatus: string,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = this.containerRepository.createQueryBuilder('container');
    query.where('container.logisticsStatus = :logisticsStatus', { logisticsStatus });
    query.leftJoin('container.replenishmentOrders', 'order');
    query.leftJoin('container.seaFreight', 'sf');
    if (startDate) {
      query.andWhere(
        '(order.actualShipDate >= :startDate OR (order.actualShipDate IS NULL AND sf.shipmentDate >= :startDate))',
        { startDate: new Date(startDate) }
      );
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      query.andWhere(
        '(order.actualShipDate <= :endDate OR (order.actualShipDate IS NULL AND sf.shipmentDate <= :endDate))',
        { endDate: endDateObj }
      );
    }
    DateFilterBuilder.addCountryFilters(query);
    return query.getMany();
  }

  /**
   * 获取已到中转港的货柜列表
   * 条件：in_transit状态 且 有中转港记录且无目的港ATA
   */
  private async getContainersByInTransitTransit(
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = this.containerRepository.createQueryBuilder('container');
    query.where('container.logisticsStatus = :logisticsStatus', { logisticsStatus: 'in_transit' });
    query.andWhere(qb => {
      const subQuery = qb.subQuery()
        .select('1')
        .from('process_port_operations', 'transit_po')
        .where('transit_po.container_number = container.container_number')
        .andWhere('transit_po.port_type = :transitType', { transitType: 'transit' })
        .getQuery();
      return `EXISTS ${subQuery}`;
    });
    query.andWhere(qb => {
      const destSubQuery = qb.subQuery()
        .select('1')
        .from('process_port_operations', 'dest_po')
        .where('dest_po.container_number = container.container_number')
        .andWhere('dest_po.port_type = :portType', { portType: 'destination' })
        .andWhere('dest_po.port_sequence = (SELECT MAX(po2.port_sequence) FROM process_port_operations po2 WHERE po2.container_number = dest_po.container_number AND po2.port_type = \'destination\')')
        .andWhere('dest_po.ata IS NOT NULL')
        .getQuery();
      return `NOT EXISTS ${destSubQuery}`;
    });
    query.leftJoin('container.replenishmentOrders', 'order');
    query.leftJoin('container.seaFreight', 'sf');
    if (startDate) {
      query.andWhere(
        '(order.actualShipDate >= :startDate OR (order.actualShipDate IS NULL AND sf.shipmentDate >= :startDate))',
        { startDate: new Date(startDate) }
      );
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      query.andWhere(
        '(order.actualShipDate <= :endDate OR (order.actualShipDate IS NULL AND sf.shipmentDate <= :endDate))',
        { endDate: endDateObj }
      );
    }
    DateFilterBuilder.addCountryFilters(query);
    return query.getMany();
  }

  // 为了兼容旧代码，保留 getYearlyVolume 方法
  async getYearlyVolume(): Promise<any[]> {
    return this.monthlyVolume.getRecentYearsDistribution();
  }

  /**
   * 获取异常集装箱统计（逾期/异常状态等）
   */
  async getAbnormalDistribution(): Promise<Record<string, number>> {
    // 可后续接入具体异常维度统计，先返回空结构避免 500
    return {
      overdue: 0,
      abnormal: 0,
      total: 0
    };
  }
}
