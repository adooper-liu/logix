/**
 * 按最晚提柜统计服务
 * Last Pickup Statistics Service
 *
 * 采用方案2：SQL模板 + 子查询组合
 * 确保统计方法与查询方法的数据子集范围完全一致
 *
 * 数据子集规则：
 * 1. 第1层：基础筛选 - 按"出运时间筛选"
 * 2. 第2层：目标集过滤 - 已实际到目的港 AND (无拖卡运输记录 OR 不是实际已提柜状态)
 * 3. 第3层：主要分组 - 有lastFreeDate的货柜、没有lastFreeDate的货柜
 * 4. 第4层：时间分类（已超时/即将超时/预警/时间充裕）
 * 5. 第5层：完整分类 - 5个分类
 */

import { Repository } from 'typeorm';
import { Container } from '../../entities/Container';
import { TruckingTransport } from '../../entities/TruckingTransport';
import { DateFilterBuilder } from './common/DateFilterBuilder';
import { getDateRangeSubqueryRaw } from './common/DateRangeSubquery';
import { LastPickupSubqueryTemplates } from './LastPickupSubqueryTemplates';

export class LastPickupStatisticsService {
  constructor(
    private containerRepository: Repository<Container>,
    private _truckingTransportRepository: Repository<TruckingTransport>
  ) {}

  /**
   * 获取按最晚提柜分布的统计
   * 目标集：与按状态「已到目的港」对齐（NOT 还箱/WMS/提柜 + 有目的港 ATA），总数对应 arrived_at_destination
   */
  async getDistribution(startDate?: string, endDate?: string): Promise<Record<string, number>> {
    const today = DateFilterBuilder.toDayStart(new Date());
    const threeDaysLater = DateFilterBuilder.addDays(today, 3);
    const sevenDaysLater = DateFilterBuilder.addDays(today, 7);

    const todayStr = today.toISOString().split('T')[0];
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];

    // 并行执行所有查询
    const [expiredCount, urgentCount, warningCount, normalCount, noLastFreeDateCount] =
      await Promise.all([
        this.getExpiredCount(todayStr, startDate, endDate),
        this.getUrgentCount(todayStr, threeDaysLaterStr, startDate, endDate),
        this.getWarningCount(todayStr, threeDaysLaterStr, sevenDaysLaterStr, startDate, endDate),
        this.getNormalCount(sevenDaysLaterStr, startDate, endDate),
        this.getNoLastFreeDateCount(startDate, endDate)
      ]);

    const total = expiredCount + urgentCount + warningCount + normalCount + noLastFreeDateCount;

    return {
      expired: expiredCount,
      urgent: urgentCount,
      warning: warningCount,
      normal: normalCount,
      noLastFreeDate: noLastFreeDateCount,
      total
    };
  }

  /**
   * 统计与查询共用：按条件子查询 + 可选出运日期过滤，返回柜号列表（同一套 SQL，避免重复）
   */
  private async runSubqueryForCondition(
    innerSql: string,
    startDate?: string,
    endDate?: string
  ): Promise<string[]> {
    let sql: string;
    let params: any[] = [];
    if (startDate && endDate) {
      const { sql: dateSql, params: dateParams } = getDateRangeSubqueryRaw(startDate, endDate);
      sql = `SELECT DISTINCT t.container_number FROM (${innerSql}) t WHERE t.container_number IN (${dateSql})`;
      params = dateParams;
    } else {
      sql = `SELECT DISTINCT t.container_number FROM (${innerSql}) t`;
    }
    const result = await this.containerRepository.query(sql, params);
    return (result || []).map((r: any) => r.container_number).filter(Boolean);
  }

  /** 由柜号列表取 Container 实体（统计与查询共用） */
  private async getContainersByNumbers(containerNumbers: string[]): Promise<Container[]> {
    if (containerNumbers.length === 0) return [];
    return this.containerRepository.createQueryBuilder('container')
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }

  /**
   * 已超时（last_free_date < 今天）
   */
  async getExpiredCount(today: string, startDate?: string, endDate?: string): Promise<number> {
    const innerSql = LastPickupSubqueryTemplates.EXPIRED_SUBQUERY(today);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return containerNumbers.length;
  }

  /**
   * 即将超时（今天 <= last_free_date <= 3天）
   */
  async getUrgentCount(today: string, threeDaysLater: string, startDate?: string, endDate?: string): Promise<number> {
    const innerSql = LastPickupSubqueryTemplates.URGENT_SUBQUERY(today, threeDaysLater);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return containerNumbers.length;
  }

  /**
   * 预警（3天 < last_free_date <= 7天）
   */
  async getWarningCount(today: string, threeDaysLater: string, sevenDaysLater: string, startDate?: string, endDate?: string): Promise<number> {
    const innerSql = LastPickupSubqueryTemplates.WARNING_SUBQUERY(today, threeDaysLater, sevenDaysLater);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return containerNumbers.length;
  }

  /**
   * 时间充裕（last_free_date > 7天）
   */
  async getNormalCount(sevenDaysLater: string, startDate?: string, endDate?: string): Promise<number> {
    const innerSql = LastPickupSubqueryTemplates.NORMAL_SUBQUERY(sevenDaysLater);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return containerNumbers.length;
  }

  /**
   * 最晚提柜日为空（last_free_date IS NULL）
   */
  async getNoLastFreeDateCount(startDate?: string, endDate?: string): Promise<number> {
    const innerSql = LastPickupSubqueryTemplates.NO_LAST_FREE_DATE_SUBQUERY;
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return containerNumbers.length;
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

    const todayStr = today.toISOString().split('T')[0];
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];

    switch (filterCondition) {
      case 'expired':
        return this.getContainersByExpired(todayStr, startDate, endDate);
      case 'urgent':
        return this.getContainersByUrgent(todayStr, threeDaysLaterStr, startDate, endDate);
      case 'warning':
        return this.getContainersByWarning(todayStr, threeDaysLaterStr, sevenDaysLaterStr, startDate, endDate);
      case 'normal':
        return this.getContainersByNormal(sevenDaysLaterStr, startDate, endDate);
      case 'noLastFreeDate':
        return this.getContainersByNoLastFreeDate(startDate, endDate);
      default:
        return [];
    }
  }

  /**
   * 已超时（last_free_date < 今天）— 与 getExpiredCount 共用同一套 SQL
   */
  private async getContainersByExpired(today: string, startDate?: string, endDate?: string): Promise<Container[]> {
    const innerSql = LastPickupSubqueryTemplates.EXPIRED_SUBQUERY(today);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return this.getContainersByNumbers(containerNumbers);
  }

  /**
   * 即将超时（今天 <= last_free_date <= 3天）— 与 getUrgentCount 共用同一套 SQL
   */
  private async getContainersByUrgent(today: string, threeDaysLater: string, startDate?: string, endDate?: string): Promise<Container[]> {
    const innerSql = LastPickupSubqueryTemplates.URGENT_SUBQUERY(today, threeDaysLater);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return this.getContainersByNumbers(containerNumbers);
  }

  /**
   * 预警（3天 < last_free_date <= 7天）— 与 getWarningCount 共用同一套 SQL
   */
  private async getContainersByWarning(today: string, threeDaysLater: string, sevenDaysLater: string, startDate?: string, endDate?: string): Promise<Container[]> {
    const innerSql = LastPickupSubqueryTemplates.WARNING_SUBQUERY(today, threeDaysLater, sevenDaysLater);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return this.getContainersByNumbers(containerNumbers);
  }

  /**
   * 时间充裕（last_free_date > 7天）— 与 getNormalCount 共用同一套 SQL
   */
  private async getContainersByNormal(sevenDaysLater: string, startDate?: string, endDate?: string): Promise<Container[]> {
    const innerSql = LastPickupSubqueryTemplates.NORMAL_SUBQUERY(sevenDaysLater);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return this.getContainersByNumbers(containerNumbers);
  }

  /**
   * 最晚提柜日为空（last_free_date IS NULL）— 与 getNoLastFreeDateCount 共用同一套 SQL
   */
  private async getContainersByNoLastFreeDate(startDate?: string, endDate?: string): Promise<Container[]> {
    const innerSql = LastPickupSubqueryTemplates.NO_LAST_FREE_DATE_SUBQUERY;
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return this.getContainersByNumbers(containerNumbers);
  }
}
