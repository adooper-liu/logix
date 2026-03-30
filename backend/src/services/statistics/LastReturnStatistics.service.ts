/**
 * 按最晚还箱统计服�? * Last Return Statistics Service
 * 负责按最晚还箱时间的统计查询
 */

import { Repository } from 'typeorm';
import { Container } from '../../entities/Container';
import { EmptyReturn } from '../../entities/EmptyReturn';
import { TruckingTransport } from '../../entities/TruckingTransport';
import { ContainerQueryBuilder } from './common/ContainerQueryBuilder';
import { DateFilterBuilder } from './common/DateFilterBuilder';
import { applyDateFilterToQuery } from './common/DateRangeSubquery';

export class LastReturnStatisticsService {
  constructor(
    private containerRepository: Repository<Container>,
    private _truckingTransportRepository: Repository<TruckingTransport>,
    private _emptyReturnRepository: Repository<EmptyReturn>
  ) {}

  /**
   * 获取按最晚还箱分布的统计
   */
  async getDistribution(startDate?: string, endDate?: string): Promise<Record<string, number>> {
    const today = DateFilterBuilder.toDayStart(new Date());
    const threeDaysLater = DateFilterBuilder.addDays(today, 3);
    const sevenDaysLater = DateFilterBuilder.addDays(today, 7);

    // 并行执行所有查询
    const results = await Promise.all([
      this.getReturnExpiredCount(today, startDate, endDate),
      this.getReturnUrgentCount(today, threeDaysLater, startDate, endDate),
      this.getReturnWarningCount(today, threeDaysLater, sevenDaysLater, startDate, endDate),
      this.getReturnNormalCount(today, sevenDaysLater, startDate, endDate),
      this.getNoLastReturnDateCount(startDate, endDate)
    ]);

    const expiredCount = results[0];
    const urgentCount = results[1];
    const warningCount = results[2];
    const normalCount = results[3];
    const noLastReturnDateCount = results[4];

    const total = expiredCount + urgentCount + warningCount + normalCount + noLastReturnDateCount;

    return {
      expired: expiredCount,
      urgent: urgentCount,
      warning: warningCount,
      normal: normalCount,
      noLastReturnDate: noLastReturnDateCount,
      total
    };
  }

  /**
   * 已过期（最晚还箱日�?< 今天�?   */
  async getReturnExpiredCount(today: Date, startDate?: string, endDate?: string): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.addCountryFilters(query);
    this.filterTargetSet(query);
    this.joinEmptyReturn(query);
    query.andWhere('er.last_return_date IS NOT NULL');
    query.andWhere('er.last_return_date < :today', { today });
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, { today });
    const result = await query.select('COUNT(DISTINCT container.containerNumber)', 'count').getRawOne();
    return parseInt(result?.count || '0');
  }

  /**
   * 紧急（今天�?天内过期�?   */
  async getReturnUrgentCount(today: Date, threeDaysLater: Date, startDate?: string, endDate?: string): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.addCountryFilters(query);
    this.filterTargetSet(query);
    this.joinEmptyReturn(query);
    query.andWhere('er.last_return_date IS NOT NULL');
    query.andWhere('er.last_return_date >= :today', { today });
    query.andWhere('er.last_return_date <= :threeDays', { threeDays: threeDaysLater });
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, { today, threeDays: threeDaysLater });
    const result = await query.select('COUNT(DISTINCT container.containerNumber)', 'count').getRawOne();
    return parseInt(result?.count || '0');
  }

  /**
   * 警告�?天内�?天内过期�?   */
  async getReturnWarningCount(today: Date, threeDaysLater: Date, sevenDaysLater: Date, startDate?: string, endDate?: string): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.addCountryFilters(query);
    this.filterTargetSet(query);
    this.joinEmptyReturn(query);
    query.andWhere('er.last_return_date IS NOT NULL');
    query.andWhere('er.last_return_date > :threeDays', { threeDays: threeDaysLater });
    query.andWhere('er.last_return_date <= :sevenDays', { sevenDays: sevenDaysLater });
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, { threeDays: threeDaysLater, sevenDays: sevenDaysLater });
    const result = await query.select('COUNT(DISTINCT container.containerNumber)', 'count').getRawOne();
    return parseInt(result?.count || '0');
  }

  /**
   * 正常（超�?天）
   */
  async getReturnNormalCount(today: Date, sevenDaysLater: Date, startDate?: string, endDate?: string): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.addCountryFilters(query);
    this.filterTargetSet(query);
    this.joinEmptyReturn(query);
    query.andWhere('er.last_return_date IS NOT NULL');
    query.andWhere('er.last_return_date > :sevenDays', { sevenDays: sevenDaysLater });
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate, { sevenDays: sevenDaysLater });
    const result = await query.select('COUNT(DISTINCT container.containerNumber)', 'count').getRawOne();
    return parseInt(result?.count || '0');
  }

  /**
   * 无最晚还箱日�?   */
  async getNoLastReturnDateCount(startDate?: string, endDate?: string): Promise<number> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.addCountryFilters(query);
    this.filterTargetSet(query);
    this.joinEmptyReturn(query);
    query.andWhere('er.last_return_date IS NULL');
    applyDateFilterToQuery(query, this.containerRepository, startDate, endDate);
    const result = await query.select('COUNT(DISTINCT container.containerNumber)', 'count').getRawOne();
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
      case 'returnExpired':
        return this.getContainersByReturnExpired(today, startDate, endDate);
      case 'returnUrgent':
        return this.getContainersByReturnUrgent(today, threeDaysLater, startDate, endDate);
      case 'returnWarning':
        return this.getContainersByReturnWarning(today, threeDaysLater, sevenDaysLater, startDate, endDate);
      case 'returnNormal':
        return this.getContainersByReturnNormal(today, sevenDaysLater, startDate, endDate);
      case 'noLastReturnDate':
        return this.getContainersByNoLastReturnDate(startDate, endDate);
      default:
        return [];
    }
  }

  /**
   * 过滤目标�?   * 根据状态机方案：目标集�?logistics_status IN ('picked_up', 'unloaded')
   */
  private filterTargetSet(query: any) {
    query.where(`EXISTS (
      SELECT 1
      FROM process_trucking_transport tt
      WHERE tt.container_number = container.container_number
      AND tt.pickup_date IS NOT NULL
    )`);
    query.andWhere(`NOT EXISTS (
      SELECT 1
      FROM process_empty_return er2
      WHERE er2.container_number = container.container_number
      AND er2.return_time IS NOT NULL
    )`);
  }

  /**
   * 添加还空箱记录的内连�?   */
  private joinEmptyReturn(query: any) {
    return query.leftJoin(
      'process_empty_return',
      'er',
      'er.container_number = container.container_number'
    );
  }

  private async getContainersByReturnExpired(today: Date, startDate?: string, endDate?: string): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.addCountryFilters(query);
    this.filterTargetSet(query);
    this.joinEmptyReturn(query);
    query.andWhere('er.last_return_date IS NOT NULL');
    query.andWhere('er.last_return_date < :today', { today });

    return ContainerQueryBuilder.addDateFilters(query, startDate, endDate).getMany();
  }

  private async getContainersByReturnUrgent(today: Date, threeDaysLater: Date, startDate?: string, endDate?: string): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.addCountryFilters(query);
    this.filterTargetSet(query);
    this.joinEmptyReturn(query);
    query.andWhere('er.last_return_date IS NOT NULL');
    query.andWhere('er.last_return_date >= :today', { today });
    query.andWhere('er.last_return_date <= :threeDays', { threeDays: threeDaysLater });

    return ContainerQueryBuilder.addDateFilters(query, startDate, endDate).getMany();
  }

  private async getContainersByReturnWarning(today: Date, threeDaysLater: Date, sevenDaysLater: Date, startDate?: string, endDate?: string): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.addCountryFilters(query);
    this.filterTargetSet(query);
    this.joinEmptyReturn(query);
    query.andWhere('er.last_return_date IS NOT NULL');
    query.andWhere('er.last_return_date > :threeDays', { threeDays: threeDaysLater });
    query.andWhere('er.last_return_date <= :sevenDays', { sevenDays: sevenDaysLater });

    return ContainerQueryBuilder.addDateFilters(query, startDate, endDate).getMany();
  }

  private async getContainersByReturnNormal(today: Date, sevenDaysLater: Date, startDate?: string, endDate?: string): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.addCountryFilters(query);
    this.filterTargetSet(query);
    this.joinEmptyReturn(query);
    query.andWhere('er.last_return_date IS NOT NULL');
    query.andWhere('er.last_return_date > :sevenDays', { sevenDays: sevenDaysLater });

    return ContainerQueryBuilder.addDateFilters(query, startDate, endDate).getMany();
  }

  private async getContainersByNoLastReturnDate(startDate?: string, endDate?: string): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    ContainerQueryBuilder.addCountryFilters(query);
    this.filterTargetSet(query);
    this.joinEmptyReturn(query);
    query.andWhere('er.last_return_date IS NULL');

    return ContainerQueryBuilder.addDateFilters(query, startDate, endDate).getMany();
  }
}

