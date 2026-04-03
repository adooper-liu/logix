/**
 * 按到港统计服务
 * Arrival Statistics Service
 * 负责按实际到港时间（ATA）的统计查询
 *
 * 采用方案2重构：定义子查询模板，统计和过滤方法共用同一套SQL逻辑
 */

import { Repository } from 'typeorm';
import { Container } from '../../entities/Container';
import { ContainerQueryBuilder } from './common/ContainerQueryBuilder';
import { DateFilterBuilder } from './common/DateFilterBuilder';
import { createDateRangeSubQuery } from './common/DateRangeSubquery';
import { ArrivalSubqueryTemplates } from './ArrivalSubqueryTemplates';

export class ArrivalStatisticsService {
  constructor(private containerRepository: Repository<Container>) {}

  // ========================================
  // 辅助方法：添加日期过滤条件
  // ========================================

  /** 为 raw SQL 子查询添加出运日期条件，占位符 $1=startDate、$2=endDate（各用同一参数避免占位符与 params 数量不一致） */
  private addDateFilterToSubquery(
    sql: string,
    startDate?: string,
    endDate?: string,
    params: any[] = []
  ): { sql: string; params: any[] } {
    if (startDate) {
      const idx = params.length + 1;
      sql += ` AND (o.expected_ship_date >= $${idx} OR (o.expected_ship_date IS NULL AND o.actual_ship_date >= $${idx}) OR (o.expected_ship_date IS NULL AND o.actual_ship_date IS NULL AND sf.shipment_date >= $${idx}))`;
      params.push(new Date(startDate));
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      const idx = params.length + 1;
      sql += ` AND (o.expected_ship_date <= $${idx} OR (o.expected_ship_date IS NULL AND o.actual_ship_date <= $${idx}) OR (o.expected_ship_date IS NULL AND o.actual_ship_date IS NULL AND sf.shipment_date <= $${idx}))`;
      params.push(endDateObj);
    }
    return { sql, params };
  }

  // ========================================
  // 统计方法（返回count）
  // ========================================

  /**
   * 获取按到港分布的统计
   */
  async getDistribution(startDate?: string, endDate?: string): Promise<Record<string, number>> {
    const today = DateFilterBuilder.toDayStart(new Date());
    const threeDaysLater = DateFilterBuilder.addDays(today, 3);
    const sevenDaysLater = DateFilterBuilder.addDays(today, 7);

    const [
      arrivedToday,
      arrivedBeforeNotPickedUp,
      arrivedBeforePickedUp,
      arrivedAtTransit,
      arrivedBeforeNoATA,
      transitOverdue,
      transitWithin3Days,
      transitWithin7Days,
      transitOver7Days,
      transitNoETA
    ] = await Promise.all([
      this.getArrivedToday(today, startDate, endDate).catch((err) => {
        console.error('[ArrivalStatistics] getArrivedToday error:', err);
        return 0;
      }),
      this.getArrivedBeforeTodayNotPickedUp(today, startDate, endDate).catch((err) => {
        console.error('[ArrivalStatistics] getArrivedBeforeTodayNotPickedUp error:', err);
        return 0;
      }),
      this.getArrivedBeforeTodayPickedUp(today, startDate, endDate).catch((err) => {
        console.error('[ArrivalStatistics] getArrivedBeforeTodayPickedUp error:', err);
        return 0;
      }),
      this.getArrivedAtTransit(startDate, endDate).catch((err) => {
        console.error('[ArrivalStatistics] getArrivedAtTransit error:', err);
        return 0;
      }),
      this.getArrivedBeforeTodayNoATA(startDate, endDate).catch((err) => {
        console.error('[ArrivalStatistics] getArrivedBeforeTodayNoATA error:', err);
        return 0;
      }),
      this.getTransitOverdue(today, startDate, endDate).catch((err) => {
        console.error('[ArrivalStatistics] getTransitOverdue error:', err);
        return 0;
      }),
      this.getTransitWithin3Days(today, threeDaysLater, startDate, endDate).catch((err) => {
        console.error('[ArrivalStatistics] getTransitWithin3Days error:', err);
        return 0;
      }),
      this.getTransitWithin7Days(today, threeDaysLater, sevenDaysLater, startDate, endDate).catch(
        (err) => {
          console.error('[ArrivalStatistics] getTransitWithin7Days error:', err);
          return 0;
        }
      ),
      this.getTransitOver7Days(today, sevenDaysLater, startDate, endDate).catch((err) => {
        console.error('[ArrivalStatistics] getTransitOver7Days error:', err);
        return 0;
      }),
      this.getTransitNoETA(startDate, endDate).catch((err) => {
        console.error('[ArrivalStatistics] getTransitNoETA error:', err);
        return 0;
      })
    ]);

    const total =
      arrivedToday +
      arrivedBeforeNotPickedUp +
      arrivedBeforePickedUp +
      arrivedAtTransit +
      arrivedBeforeNoATA;

    return {
      today: arrivedToday,
      beforeTodayNotPickedUp: arrivedBeforeNotPickedUp,
      beforeTodayPickedUp: arrivedBeforePickedUp,
      arrivedAtTransit,
      arrivedBeforeTodayNoATA: arrivedBeforeNoATA,
      // 中转港按ETA细分
      transitOverdue,
      transitWithin3Days,
      transitWithin7Days,
      transitOver7Days,
      transitNoETA,
      total
    };
  }

  /**
   * 今日到港
   */
  async getArrivedToday(today: Date, startDate?: string, endDate?: string): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithAta(query);
    ContainerQueryBuilder.filterTargetStatus(query);
    query.andWhere('DATE(latest_po.latest_ata) = :today', { today });

    if (startDate && endDate) {
      const subQuery = createDateRangeSubQuery(this.containerRepository, startDate, endDate);
      query.andWhere(`container.containerNumber IN (${subQuery.getQuery()})`).setParameters({
        ...subQuery.getParameters(),
        today
      });
    } else {
      ContainerQueryBuilder.addDateFilters(query, startDate, endDate);
      ContainerQueryBuilder.addCountryFilters(query);
    }

    const result = await query
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .getRawOne();
    const count = parseInt(result.count || '0');
    console.log(`[ArrivalStatistics] getArrivedToday returned: ${count}`);
    return count;
  }

  /**
   * 今日之前到港未提柜
   */
  async getArrivedBeforeTodayNotPickedUp(
    today: Date,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithAta(query);
    ContainerQueryBuilder.filterTargetStatus(query);
    query.andWhere('DATE(latest_po.latest_ata) < :today', { today });
    query.andWhere(`NOT EXISTS (
      SELECT 1
      FROM process_trucking_transport tt
      WHERE tt.container_number = container.container_number
      AND tt.pickup_date IS NOT NULL
    )`);

    if (startDate && endDate) {
      const subQuery = createDateRangeSubQuery(this.containerRepository, startDate, endDate);
      query.andWhere(`container.containerNumber IN (${subQuery.getQuery()})`).setParameters({
        ...subQuery.getParameters(),
        today
      });
    } else {
      ContainerQueryBuilder.addDateFilters(query, startDate, endDate);
      ContainerQueryBuilder.addCountryFilters(query);
    }

    const result = await query
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .getRawOne();
    const count = parseInt(result.count || '0');
    console.log(`[ArrivalStatistics] getArrivedBeforeTodayNotPickedUp returned: ${count}`);
    return count;
  }

  /**
   * 已到中转港
   */
  async getArrivedAtTransit(startDate?: string, endDate?: string): Promise<number> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.ARRIVED_AT_TRANSIT_SUBQUERY,
      startDate,
      endDate
    );
    const sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * 今日之前到港无ATA
   */
  async getArrivedBeforeTodayNoATA(startDate?: string, endDate?: string): Promise<number> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.ARRIVED_BEFORE_NO_ATA_SUBQUERY,
      startDate,
      endDate
    );
    const sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * 今日之前到港已提柜
   */
  async getArrivedBeforeTodayPickedUp(
    today: Date,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithAta(query);
    ContainerQueryBuilder.filterTargetStatus(query);
    query.andWhere('DATE(latest_po.latest_ata) < :today', { today });
    query.andWhere(`EXISTS (
      SELECT 1
      FROM process_trucking_transport tt
      WHERE tt.container_number = container.container_number
      AND tt.pickup_date IS NOT NULL
    )`);

    if (startDate && endDate) {
      const subQuery = createDateRangeSubQuery(this.containerRepository, startDate, endDate);
      query.andWhere(`container.containerNumber IN (${subQuery.getQuery()})`).setParameters({
        ...subQuery.getParameters(),
        today
      });
    } else {
      ContainerQueryBuilder.addDateFilters(query, startDate, endDate);
      ContainerQueryBuilder.addCountryFilters(query);
    }

    const result = await query
      .select('COUNT(DISTINCT container.containerNumber)', 'count')
      .getRawOne();
    const count = parseInt(result.count || '0');
    console.log(`[ArrivalStatistics] getArrivedBeforeTodayPickedUp returned: ${count}`);
    return count;
  }

  /**
   * 中转港已逾期（ETA < 今天）
   */
  async getTransitOverdue(today: Date, startDate?: string, endDate?: string): Promise<number> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.TRANSIT_OVERDUE_SUBQUERY(today),
      startDate,
      endDate
    );
    const sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * 中转港3天内到港（ETA）
   */
  async getTransitWithin3Days(
    today: Date,
    threeDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.TRANSIT_WITHIN_3_DAYS_SUBQUERY(today, threeDaysLater),
      startDate,
      endDate
    );
    const sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * 中转港7天内到港（ETA）
   */
  async getTransitWithin7Days(
    today: Date,
    threeDaysLater: Date,
    sevenDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.TRANSIT_WITHIN_7_DAYS_SUBQUERY(threeDaysLater, sevenDaysLater),
      startDate,
      endDate
    );
    const sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * 中转港超过7天到港（ETA）
   */
  async getTransitOver7Days(
    today: Date,
    sevenDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.TRANSIT_OVER_7_DAYS_SUBQUERY(sevenDaysLater),
      startDate,
      endDate
    );
    const sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * 中转港无ETA记录
   */
  async getTransitNoETA(startDate?: string, endDate?: string): Promise<number> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.TRANSIT_NO_ETA_SUBQUERY,
      startDate,
      endDate
    );
    const sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    return parseInt(result[0]?.count || '0');
  }

  // ========================================
  // 过滤方法（返回Container[]）
  // ========================================

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
      case 'arrivedAtDestination':
        return this.getContainersByArrivedAtDestination(today, startDate, endDate);
      case 'arrivedAtTransit':
        return this.getContainersByArrivedAtTransit(startDate, endDate);
      case 'expectedArrival':
        return this.getContainersByExpectedArrival(today, startDate, endDate);
      case 'arrivalToday':
        return this.getContainersByArrivalToday(today, startDate, endDate);
      case 'arrivedBeforeTodayNotPickedUp':
        return this.getContainersByArrivedBeforeTodayNotPickedUp(today, startDate, endDate);
      case 'arrivedBeforeTodayPickedUp':
        return this.getContainersByArrivedBeforeTodayPickedUp(today, startDate, endDate);
      case 'arrivedBeforeTodayNoATA':
        return this.getContainersByArrivedBeforeTodayNoATA(startDate, endDate);
      case 'transitOverdue':
        return this.getContainersByTransitOverdue(today, startDate, endDate);
      case 'transitWithin3Days':
        return this.getContainersByTransitWithin3Days(today, threeDaysLater, startDate, endDate);
      case 'transitWithin7Days':
        return this.getContainersByTransitWithin7Days(
          today,
          threeDaysLater,
          sevenDaysLater,
          startDate,
          endDate
        );
      case 'transitOver7Days':
        return this.getContainersByTransitOver7Days(today, sevenDaysLater, startDate, endDate);
      case 'transitNoETA':
        return this.getContainersByTransitNoETA(startDate, endDate);
      default:
        return [];
    }
  }

  /**
   * 已到目的港（主分组）
   * 组合三个子分类：今日到港 + 今日之前未提柜 + 今日之前已提柜
   * 使用 ContainerQueryBuilder 确保与统计方法逻辑一致
   */
  private async getContainersByArrivedAtDestination(
    today: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithAta(query);
    ContainerQueryBuilder.filterTargetStatus(query);
    ContainerQueryBuilder.addDateFilters(query, startDate, endDate);
    ContainerQueryBuilder.addCountryFilters(query);
    return query.getMany();
  }

  /**
   * 已到中转港（主分组）
   */
  private async getContainersByArrivedAtTransit(
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.ARRIVED_AT_TRANSIT_SUBQUERY,
      startDate,
      endDate
    );
    const sql = `SELECT DISTINCT t.container_number FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    if (result.length === 0) return [];

    const containerNumbers = result.map((r: any) => r.container_number);
    return this.containerRepository
      .createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }

  /**
   * 预计到港（主分组）
   * 涵盖：有ETA + 无ETA无ATA
   * 使用 ContainerQueryBuilder 确保与统计方法逻辑一致
   */
  private async getContainersByExpectedArrival(
    today: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    // 预计到港：目的港无ATA + 状态为shipped/in_transit + 无中转港记录
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    // 状态过滤
    query.andWhere('container.logisticsStatus IN (:...statuses)', {
      statuses: ['shipped', 'in_transit']
    });
    // 排除中转港记录（因为中转港货柜归类到"已到中转港"分组）
    query.andWhere((qb) => {
      const subQuery = qb
        .subQuery()
        .select('1')
        .from('process_port_operations', 'transit_po')
        .where('transit_po.container_number = container.containerNumber')
        .andWhere('transit_po.port_type = :transitType', { transitType: 'transit' })
        .getQuery();
      return `NOT EXISTS ${subQuery}`;
    });
    // 检查目的港是否无ATA（使用子查询）
    query.andWhere((qb) => {
      const destSubQuery = qb
        .subQuery()
        .select('1')
        .from('process_port_operations', 'dest_po')
        .where('dest_po.container_number = container.containerNumber')
        .andWhere('dest_po.port_type = :portType', { portType: 'destination' })
        .andWhere(
          "dest_po.port_sequence = (SELECT MAX(po2.port_sequence) FROM process_port_operations po2 WHERE po2.container_number = dest_po.container_number AND po2.port_type = 'destination')"
        )
        .andWhere('dest_po.ata IS NOT NULL')
        .getQuery();
      return `NOT EXISTS ${destSubQuery}`;
    });

    ContainerQueryBuilder.addDateFilters(query, startDate, endDate);
    ContainerQueryBuilder.addCountryFilters(query);
    return query.getMany();
  }

  /**
   * 今日到港（子分类）
   */
  private async getContainersByArrivalToday(
    today: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithAta(query);
    ContainerQueryBuilder.filterTargetStatus(query);
    query.andWhere('DATE(latest_po.latest_ata) = :today', { today });
    if (startDate && endDate) {
      const subQuery = createDateRangeSubQuery(this.containerRepository, startDate, endDate);
      query.andWhere(`container.containerNumber IN (${subQuery.getQuery()})`).setParameters({
        ...subQuery.getParameters(),
        today
      });
    } else {
      ContainerQueryBuilder.addDateFilters(query, startDate, endDate);
      ContainerQueryBuilder.addCountryFilters(query);
    }
    return query.getMany();
  }

  /**
   * 今日之前到港未提柜（子分类）
   */
  private async getContainersByArrivedBeforeTodayNotPickedUp(
    today: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithAta(query);
    ContainerQueryBuilder.filterTargetStatus(query);
    query.andWhere('DATE(latest_po.latest_ata) < :today', { today });
    query.andWhere(`NOT EXISTS (
      SELECT 1
      FROM process_trucking_transport tt
      WHERE tt.container_number = container.container_number
      AND tt.pickup_date IS NOT NULL
    )`);
    if (startDate && endDate) {
      const subQuery = createDateRangeSubQuery(this.containerRepository, startDate, endDate);
      query.andWhere(`container.containerNumber IN (${subQuery.getQuery()})`).setParameters({
        ...subQuery.getParameters(),
        today
      });
    } else {
      ContainerQueryBuilder.addDateFilters(query, startDate, endDate);
      ContainerQueryBuilder.addCountryFilters(query);
    }
    return query.getMany();
  }

  /**
   * 今日之前到港已提柜（子分类）
   */
  private async getContainersByArrivedBeforeTodayPickedUp(
    today: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.joinLatestDestinationWithAta(query);
    ContainerQueryBuilder.filterTargetStatus(query);
    query.andWhere('DATE(latest_po.latest_ata) < :today', { today });
    query.andWhere(`EXISTS (
      SELECT 1
      FROM process_trucking_transport tt
      WHERE tt.container_number = container.container_number
      AND tt.pickup_date IS NOT NULL
    )`);
    if (startDate && endDate) {
      const subQuery = createDateRangeSubQuery(this.containerRepository, startDate, endDate);
      query.andWhere(`container.containerNumber IN (${subQuery.getQuery()})`).setParameters({
        ...subQuery.getParameters(),
        today
      });
    } else {
      ContainerQueryBuilder.addDateFilters(query, startDate, endDate);
      ContainerQueryBuilder.addCountryFilters(query);
    }
    return query.getMany();
  }

  /**
   * 今日之前到港无ATA（子分类）
   */
  private async getContainersByArrivedBeforeTodayNoATA(
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.ARRIVED_BEFORE_NO_ATA_SUBQUERY,
      startDate,
      endDate
    );
    const sql = `SELECT DISTINCT c.container_number FROM biz_containers c WHERE c.container_number IN (${sqlInner})`;

    const result = await this.containerRepository.query(sql, params);
    if (result.length === 0) return [];

    // 提取container_number数组，使用QueryBuilder获取完整的Container实体
    const containerNumbers = result.map((r: any) => r.container_number);

    const containers = await this.containerRepository
      .createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();

    return containers;
  }

  /**
   * 中转港已逾期（子分类）
   */
  private async getContainersByTransitOverdue(
    today: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.TRANSIT_OVERDUE_SUBQUERY(today),
      startDate,
      endDate
    );
    const sql = `SELECT DISTINCT t.container_number FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    if (result.length === 0) return [];

    const containerNumbers = result.map((r: any) => r.container_number);
    return this.containerRepository
      .createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }

  /**
   * 中转港3天内到港（子分类）
   */
  private async getContainersByTransitWithin3Days(
    today: Date,
    threeDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.TRANSIT_WITHIN_3_DAYS_SUBQUERY(today, threeDaysLater),
      startDate,
      endDate
    );
    const sql = `SELECT DISTINCT t.container_number FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    if (result.length === 0) return [];

    const containerNumbers = result.map((r: any) => r.container_number);
    return this.containerRepository
      .createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }

  /**
   * 中转港7天内到港（子分类）
   */
  private async getContainersByTransitWithin7Days(
    today: Date,
    threeDaysLater: Date,
    sevenDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.TRANSIT_WITHIN_7_DAYS_SUBQUERY(threeDaysLater, sevenDaysLater),
      startDate,
      endDate
    );
    const sql = `SELECT DISTINCT t.container_number FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    if (result.length === 0) return [];

    const containerNumbers = result.map((r: any) => r.container_number);
    return this.containerRepository
      .createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }

  /**
   * 中转港超过7天到港（子分类）
   */
  private async getContainersByTransitOver7Days(
    today: Date,
    sevenDaysLater: Date,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.TRANSIT_OVER_7_DAYS_SUBQUERY(sevenDaysLater),
      startDate,
      endDate
    );
    const sql = `SELECT DISTINCT t.container_number FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    if (result.length === 0) return [];

    const containerNumbers = result.map((r: any) => r.container_number);
    return this.containerRepository
      .createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }

  /**
   * 中转港无ETA记录（子分类）
   */
  private async getContainersByTransitNoETA(
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const { sql: sqlInner, params } = this.addDateFilterToSubquery(
      ArrivalSubqueryTemplates.TRANSIT_NO_ETA_SUBQUERY,
      startDate,
      endDate
    );
    const sql = `SELECT DISTINCT t.container_number FROM (${sqlInner}) t`;

    const result = await this.containerRepository.query(sql, params);
    if (result.length === 0) return [];

    const containerNumbers = result.map((r: any) => r.container_number);
    return this.containerRepository
      .createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }
}
