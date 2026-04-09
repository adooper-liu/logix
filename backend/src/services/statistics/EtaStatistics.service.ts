/**
 * 按 ETA 统计服务
 * ETA Statistics Service
 * 负责按预计到港时间（ETA）的统计查询
 */

import { Repository } from 'typeorm';
import { Container } from '../../entities/Container';
import { logger } from '../../utils/logger';
import { ContainerQueryBuilder } from './common/ContainerQueryBuilder';
import { DateFilterBuilder } from './common/DateFilterBuilder';
import { applyDateFilterToQuery } from './common/DateRangeSubquery';

export class EtaStatisticsService {
  constructor(private containerRepository: Repository<Container>) {}

  /**
   * 获取按 ETA 分布的统计
   * 目标集：未到目的港的货柜（状态 shipped 或 in_transit，排除 at_port）
   * 修正：必须排除有中转港记录的货柜
   */
  async getDistribution(startDate?: string, endDate?: string): Promise<Record<string, number>> {
    const today = DateFilterBuilder.toDayStart(new Date());
    const threeDaysLater = DateFilterBuilder.addDays(today, 3);
    const sevenDaysLater = DateFilterBuilder.addDays(today, 7);

    const [overdue, within3Days, within7Days, over7Days, otherRecords] = await Promise.all([
      this.getOverdueNotArrived(today, startDate, endDate).catch((err) => {
        logger.error('[EtaStatistics] getOverdueNotArrived error', { err });
        return 0;
      }),
      this.getWithin3Days(today, threeDaysLater, startDate, endDate).catch((err) => {
        logger.error('[EtaStatistics] getWithin3Days error', { err });
        return 0;
      }),
      this.getWithin7Days(today, threeDaysLater, sevenDaysLater, startDate, endDate).catch(
        (err) => {
          logger.error('[EtaStatistics] getWithin7Days error', { err });
          return 0;
        }
      ),
      this.getOver7Days(today, sevenDaysLater, startDate, endDate).catch((err) => {
        logger.error('[EtaStatistics] getOver7Days error', { err });
        return 0;
      }),
      this.getOtherRecords(startDate, endDate).catch((err) => {
        logger.error('[EtaStatistics] getOtherRecords error', { err });
        return 0;
      })
    ]);

    const total = overdue + within3Days + within7Days + over7Days + otherRecords;

    return {
      overdue,
      within3Days,
      within7Days,
      over7Days,
      otherRecords,
      total
    };
  }

  /**
   * 已逾期未到港（ETA < 今天）
   * 修正：必须排除有中转港记录的货柜
   */
  async getOverdueNotArrived(today: Date, startDate?: string, endDate?: string): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithEta(query);
    ContainerQueryBuilder.filterByLogisticsStatus(query, ContainerQueryBuilder.STATUSES.ETA_TARGET);
    query.andWhere('DATE(latest_po.latest_eta) < :today', { today });
    this.excludeContainersArrivedAtTransit(query);
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, { today });
    const result = await query
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .getRawOne();
    return parseInt(result?.count || '0');
  }

  /**
   * 3天内到港（ETA）
   * 修正：必须排除有中转港记录的货柜
   */
  async getWithin3Days(
    today: Date,
    threeDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithEta(query);
    ContainerQueryBuilder.filterByLogisticsStatus(query, ContainerQueryBuilder.STATUSES.ETA_TARGET);
    query.andWhere('DATE(latest_po.latest_eta) >= :today', { today });
    query.andWhere('DATE(latest_po.latest_eta) <= :threeDays', { threeDays: threeDaysLater });
    this.excludeContainersArrivedAtTransit(query);
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, {
      today,
      threeDays: threeDaysLater
    });
    const result = await query
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .getRawOne();
    return parseInt(result?.count || '0');
  }

  /**
   * 7天内到港（ETA）
   * 修正：必须排除有中转港记录的货柜
   */
  async getWithin7Days(
    today: Date,
    threeDaysLater: Date,
    sevenDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithEta(query);
    ContainerQueryBuilder.filterByLogisticsStatus(query, ContainerQueryBuilder.STATUSES.ETA_TARGET);
    query.andWhere('DATE(latest_po.latest_eta) > :threeDays', { threeDays: threeDaysLater });
    query.andWhere('DATE(latest_po.latest_eta) <= :sevenDays', { sevenDays: sevenDaysLater });
    this.excludeContainersArrivedAtTransit(query);
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, {
      threeDays: threeDaysLater,
      sevenDays: sevenDaysLater
    });
    const result = await query
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .getRawOne();
    return parseInt(result?.count || '0');
  }

  /**
   * 超过7天到港（ETA）
   * 修正：必须排除有中转港记录的货柜
   */
  async getOver7Days(
    today: Date,
    sevenDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithEta(query);
    ContainerQueryBuilder.filterByLogisticsStatus(query, ContainerQueryBuilder.STATUSES.ETA_TARGET);
    query.andWhere('DATE(latest_po.latest_eta) > :sevenDays', { sevenDays: sevenDaysLater });
    this.excludeContainersArrivedAtTransit(query);
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, {
      sevenDays: sevenDaysLater
    });
    const result = await query
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .getRawOne();
    return parseInt(result?.count || '0');
  }

  /**
   * 其他记录（无 ETA 且无 ATA）
   * 修正：必须排除有中转港记录的货柜
   */
  async getOtherRecords(startDate?: string, endDate?: string): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);

    query.innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata IS NULL
        AND po1.eta IS NULL
        AND po1.port_sequence = (
          SELECT MAX(po2.port_sequence)
          FROM process_port_operations po2
          WHERE po2.container_number = po1.container_number
          AND po2.port_type = 'destination'
        )
      )`,
      'dest_po',
      'dest_po.container_number = container.containerNumber'
    );

    ContainerQueryBuilder.filterByLogisticsStatus(query, ContainerQueryBuilder.STATUSES.ETA_TARGET);
    this.excludeContainersArrivedAtTransit(query);
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, undefined);
    const result = await query
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .getRawOne();
    return parseInt(result?.count || '0');
  }

  /**
   * 根据条件获取货柜列表
   */
  async getContainersByCondition(
    filterCondition: string,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const today = DateFilterBuilder.toDayStart(new Date());
    const threeDaysLater = DateFilterBuilder.addDays(today, 3);
    const sevenDaysLater = DateFilterBuilder.addDays(today, 7);

    switch (filterCondition) {
      case 'overdue':
        return this.getContainersByOverdue(today, startDate, endDate);
      case 'within3Days':
        return this.getContainersByWithin3Days(today, threeDaysLater, startDate, endDate);
      case 'within7Days':
        return this.getContainersByWithin7Days(
          today,
          threeDaysLater,
          sevenDaysLater,
          startDate,
          endDate
        );
      case 'over7Days':
        return this.getContainersByOver7Days(today, sevenDaysLater, startDate, endDate);
      case 'otherRecords':
        return this.getContainersByOtherRecords(startDate, endDate);
      default:
        return [];
    }
  }

  /**
   * 排除有中转港记录的货柜（任意 transit 类型记录）
   * @deprecated 与按状态「在途未到港」对齐请用 excludeContainersArrivedAtTransit
   */
  private excludeTransitContainers(query: any): void {
    query.andWhere(`NOT EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = container.container_number
      AND transit_po.port_type = 'transit'
    )`);
  }

  /**
   * 仅排除已到中转港的货柜（与状态机在途未到港一致）
   * 有 transit 记录但未到港（无 ata/gate_in_time/transit_arrival_date）的仍算预计到港
   */
  private excludeContainersArrivedAtTransit(query: any): void {
    query.andWhere(`NOT EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = container.container_number
      AND transit_po.port_type = 'transit'
      AND (transit_po.ata IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)
    )`);
  }

  private async getContainersByWithin3Days(
    today: Date,
    threeDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithEta(query);
    ContainerQueryBuilder.filterByLogisticsStatus(query, ContainerQueryBuilder.STATUSES.ETA_TARGET);
    query.andWhere('DATE(latest_po.latest_eta) >= :today', { today });
    query.andWhere('DATE(latest_po.latest_eta) <= :threeDays', { threeDays: threeDaysLater });
    this.excludeContainersArrivedAtTransit(query);
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, {
      today,
      threeDays: threeDaysLater
    });
    return query.getMany();
  }

  private async getContainersByWithin7Days(
    today: Date,
    threeDaysLater: Date,
    sevenDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithEta(query);
    ContainerQueryBuilder.filterByLogisticsStatus(query, ContainerQueryBuilder.STATUSES.ETA_TARGET);
    query.andWhere('DATE(latest_po.latest_eta) > :threeDays', { threeDays: threeDaysLater });
    query.andWhere('DATE(latest_po.latest_eta) <= :sevenDays', { sevenDays: sevenDaysLater });
    this.excludeContainersArrivedAtTransit(query);
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, {
      threeDays: threeDaysLater,
      sevenDays: sevenDaysLater
    });
    return query.getMany();
  }

  private async getContainersByOver7Days(
    today: Date,
    sevenDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithEta(query);
    ContainerQueryBuilder.filterByLogisticsStatus(query, ContainerQueryBuilder.STATUSES.ETA_TARGET);
    query.andWhere('DATE(latest_po.latest_eta) > :sevenDays', { sevenDays: sevenDaysLater });
    this.excludeContainersArrivedAtTransit(query);
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, {
      sevenDays: sevenDaysLater
    });
    return query.getMany();
  }

  private async getContainersByOverdue(
    today: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithEta(query);
    ContainerQueryBuilder.filterByLogisticsStatus(query, ContainerQueryBuilder.STATUSES.ETA_TARGET);
    query.andWhere('DATE(latest_po.latest_eta) < :today', { today });
    this.excludeContainersArrivedAtTransit(query);
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, { today });
    return query.getMany();
  }

  private async getContainersByOtherRecords(
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);

    query.innerJoin(
      `(
        SELECT po1.container_number
        FROM process_port_operations po1
        WHERE po1.port_type = 'destination'
        AND po1.ata IS NULL
        AND po1.eta IS NULL
        AND po1.port_sequence = (
          SELECT MAX(po2.port_sequence)
          FROM process_port_operations po2
          WHERE po2.container_number = po1.container_number
          AND po2.port_type = 'destination'
        )
      )`,
      'dest_po',
      'dest_po.container_number = container.containerNumber'
    );

    ContainerQueryBuilder.filterByLogisticsStatus(query, ContainerQueryBuilder.STATUSES.ETA_TARGET);
    this.excludeContainersArrivedAtTransit(query);
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate);
    return query.getMany();
  }
}
