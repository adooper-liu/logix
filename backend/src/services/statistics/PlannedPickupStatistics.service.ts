/**
 * 按提柜计划统计服务
 * Planned Pickup Statistics Service
 * 负责按提柜计划时间的统计查询
 *
 * 采用方案2：SQL模板 + 子查询组合
 * 目标集与"按最晚提柜日"相同
 */

import { Repository } from 'typeorm';
import { Container } from '../../entities/Container';
import { TruckingTransport } from '../../entities/TruckingTransport';
import { DateFilterBuilder } from './common/DateFilterBuilder';
import { getDateRangeSubqueryRaw } from './common/DateRangeSubquery';
import { PlannedPickupSubqueryTemplates } from './PlannedPickupSubqueryTemplates';
import { getScopedCountryCode } from '../../utils/requestContext';
import { normalizeCountryCode } from '../../utils/countryCode';
import { logger } from '../../utils/logger';

export class PlannedPickupStatisticsService {
  constructor(
    private containerRepository: Repository<Container>,
    private _truckingTransportRepository: Repository<TruckingTransport>
  ) {}

  /**
   * 方法名映射表
   * 使用Map代替switch，消除字符串硬编码
   * 直接使用字符串key，无需枚举
   */
  private readonly METHOD_MAP: Record<
    string,
    (
      today: string,
      threeDaysLater: string,
      sevenDaysLater: string,
      startDate?: string,
      endDate?: string
    ) => Promise<Container[]>
  > = {
    overduePlanned: (today, _three, _seven, start, end) =>
      this.getContainersByOverduePlanned(today, start, end),
    todayPlanned: (today, _three, _seven, start, end) =>
      this.getContainersByTodayPlanned(today, start, end),
    plannedWithin3Days: (today, three, _seven, start, end) =>
      this.getContainersByPlannedWithin3Days(today, three, start, end),
    plannedWithin7Days: (today, three, seven, start, end) =>
      this.getContainersByPlannedWithin7Days(today, three, seven, start, end),
    pendingArrangement: (_today, _three, _seven, start, end) =>
      this.getContainersByPendingArrangement(start, end)
  };

  /**
   * 获取按提柜计划分布的统计
   * 目标集：与按状态「已到目的港」对齐（NOT 还箱/WMS/提柜 + 有目的港 ATA），总数对应 arrived_at_destination
   */
  async getDistribution(startDate?: string, endDate?: string): Promise<Record<string, number>> {
    const today = DateFilterBuilder.toDayStart(new Date());
    const threeDaysLater = DateFilterBuilder.addDays(today, 3);
    const sevenDaysLater = DateFilterBuilder.addDays(today, 7);

    const todayStr = today.toISOString().split('T')[0];
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];

    const [overduePlanned, todayPlanned, within3Days, within7Days, pendingArrangement] =
      await Promise.all([
        this.getOverduePlanned(todayStr, startDate, endDate),
        this.getTodayPlanned(todayStr, startDate, endDate),
        this.getPlannedWithin3Days(todayStr, threeDaysLaterStr, startDate, endDate),
        this.getPlannedWithin7Days(
          todayStr,
          threeDaysLaterStr,
          sevenDaysLaterStr,
          startDate,
          endDate
        ),
        this.getPendingArrangement(startDate, endDate)
      ]);

    // 计算总数和分类统计
    const withPlan = overduePlanned + todayPlanned + within3Days + within7Days;
    const withoutPlan = pendingArrangement;
    const total = withPlan + withoutPlan;

    return {
      overdue: overduePlanned,
      todayPlanned,
      pending: pendingArrangement,
      within3Days,
      within7Days,
      withPlan,
      withoutPlan,
      total
    };
  }

  /**
   * 统计与查询共用：按条件子查询 + 可选出运日期过滤，返回柜号列表（同一套 SQL，避免重复）
   * 支持国家过滤：自动从请求上下文读取国家代码
   */
  private async runSubqueryForCondition(
    innerSql: string,
    startDate?: string,
    endDate?: string
  ): Promise<string[]> {
    // 获取国家过滤
    const rawCountryCode = getScopedCountryCode();
    const countryCode = rawCountryCode ? normalizeCountryCode(rawCountryCode) : undefined;

    let sql: string;
    let params: any[] = [];
    if (startDate && endDate) {
      const { sql: dateSql, params: dateParams } = getDateRangeSubqueryRaw(
        startDate,
        endDate,
        countryCode
      );
      sql = `SELECT DISTINCT t.container_number FROM (${innerSql}) t WHERE t.container_number IN (${dateSql})`;
      params = dateParams;
    } else if (countryCode) {
      // 只有国家过滤，无日期过滤
      sql = `SELECT DISTINCT t.container_number FROM (${innerSql}) t
INNER JOIN biz_replenishment_orders ro ON t.container_number = ro.container_number
INNER JOIN biz_customers cust ON (
  (ro.sell_to_country IS NOT NULL AND LOWER(TRIM(ro.sell_to_country)) = LOWER(TRIM(cust.customer_name)))
  OR (ro.customer_name IS NOT NULL AND LOWER(TRIM(ro.customer_name)) = LOWER(TRIM(cust.customer_name)))
  OR (ro.customer_code IS NOT NULL AND LOWER(TRIM(ro.customer_code)) = LOWER(TRIM(cust.customer_code)))
)
WHERE cust.country = $1`;
      params = [countryCode];
    } else {
      sql = `SELECT DISTINCT t.container_number FROM (${innerSql}) t`;
    }
    const result = await this.containerRepository.query(sql, params);
    return (result || []).map((r: any) => r.container_number).filter(Boolean);
  }

  /** 由柜号列表取 Container 实体（统计与查询共用） */
  private async getContainersByNumbers(containerNumbers: string[]): Promise<Container[]> {
    if (containerNumbers.length === 0) return [];
    // 获取国家过滤
    const rawCountryCode = getScopedCountryCode();
    const countryCode = rawCountryCode ? normalizeCountryCode(rawCountryCode) : undefined;

    const qb = this.containerRepository
      .createQueryBuilder('container')
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers });

    // 添加国家过滤
    if (countryCode) {
      qb.leftJoin('container.replenishmentOrders', 'order')
        .leftJoin(
          'biz_customers',
          'cust',
          '(order.sellToCountry IS NOT NULL AND LOWER(TRIM(cust.customerName)) = LOWER(TRIM(order.sellToCountry))) OR (order.customerName IS NOT NULL AND LOWER(TRIM(cust.customerName)) = LOWER(TRIM(order.customerName))) OR (order.customerCode IS NOT NULL AND LOWER(TRIM(cust.customerCode)) = LOWER(TRIM(order.customerCode)))'
        )
        .andWhere('cust.country = :countryCode', { countryCode });
    }

    return qb.getMany();
  }

  /**
   * 逾期未提柜（plannedPickupDate < 今天）
   */
  async getOverduePlanned(today: string, startDate?: string, endDate?: string): Promise<number> {
    const innerSql = PlannedPickupSubqueryTemplates.OVERDUE_PLANNED_SUBQUERY(today);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return containerNumbers.length;
  }

  /**
   * 今日计划提柜（plannedPickupDate = 今天）
   */
  async getTodayPlanned(today: string, startDate?: string, endDate?: string): Promise<number> {
    const innerSql = PlannedPickupSubqueryTemplates.TODAY_PLANNED_SUBQUERY(today);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return containerNumbers.length;
  }

  /**
   * 3天内计划提柜（今天 < plannedPickupDate <= 3天）
   */
  async getPlannedWithin3Days(
    today: string,
    threeDaysLater: string,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const innerSql = PlannedPickupSubqueryTemplates.WITHIN_3_DAYS_PLANNED_SUBQUERY(
      today,
      threeDaysLater
    );
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return containerNumbers.length;
  }

  /**
   * 7天内计划提柜（3天 < plannedPickupDate <= 7天）
   */
  async getPlannedWithin7Days(
    today: string,
    threeDaysLater: string,
    sevenDaysLater: string,
    startDate?: string,
    endDate?: string
  ): Promise<number> {
    const innerSql = PlannedPickupSubqueryTemplates.WITHIN_7_DAYS_PLANNED_SUBQUERY(
      today,
      threeDaysLater,
      sevenDaysLater
    );
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return containerNumbers.length;
  }

  /**
   * 待安排提柜（无拖卡记录或无计划提柜日期）
   */
  async getPendingArrangement(startDate?: string, endDate?: string): Promise<number> {
    const innerSql = PlannedPickupSubqueryTemplates.PENDING_ARRANGEMENT_SUBQUERY;
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return containerNumbers.length;
  }

  /**
   * 根据条件获取货柜列表
   * 使用Map映射，消除switch语句和字符串硬编码
   */
  async getContainersByCondition(
    filterCondition: string,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const method = this.METHOD_MAP[filterCondition];

    if (!method) {
      logger.warn('[PlannedPickupStatisticsService] Unknown filterCondition', { filterCondition });
      return [];
    }

    const today = DateFilterBuilder.toDayStart(new Date());
    const threeDaysLater = DateFilterBuilder.addDays(today, 3);
    const sevenDaysLater = DateFilterBuilder.addDays(today, 7);

    const todayStr = today.toISOString().split('T')[0];
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];

    return method.call(this, todayStr, threeDaysLaterStr, sevenDaysLaterStr, startDate, endDate);
  }

  /** 逾期未提柜 — 与 getOverduePlanned 共用同一套 SQL */
  private async getContainersByOverduePlanned(
    today: string,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const innerSql = PlannedPickupSubqueryTemplates.OVERDUE_PLANNED_SUBQUERY(today);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return this.getContainersByNumbers(containerNumbers);
  }

  /** 今日计划提柜 — 与 getTodayPlanned 共用同一套 SQL */
  private async getContainersByTodayPlanned(
    today: string,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const innerSql = PlannedPickupSubqueryTemplates.TODAY_PLANNED_SUBQUERY(today);
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return this.getContainersByNumbers(containerNumbers);
  }

  /** 3天内计划提柜 — 与 getPlannedWithin3Days 共用同一套 SQL */
  private async getContainersByPlannedWithin3Days(
    today: string,
    threeDaysLater: string,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const innerSql = PlannedPickupSubqueryTemplates.WITHIN_3_DAYS_PLANNED_SUBQUERY(
      today,
      threeDaysLater
    );
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return this.getContainersByNumbers(containerNumbers);
  }

  /** 7天内计划提柜 — 与 getPlannedWithin7Days 共用同一套 SQL */
  private async getContainersByPlannedWithin7Days(
    today: string,
    threeDaysLater: string,
    sevenDaysLater: string,
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const innerSql = PlannedPickupSubqueryTemplates.WITHIN_7_DAYS_PLANNED_SUBQUERY(
      today,
      threeDaysLater,
      sevenDaysLater
    );
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return this.getContainersByNumbers(containerNumbers);
  }

  /** 待安排提柜 — 与 getPendingArrangement 共用同一套 SQL */
  private async getContainersByPendingArrangement(
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const innerSql = PlannedPickupSubqueryTemplates.PENDING_ARRANGEMENT_SUBQUERY;
    const containerNumbers = await this.runSubqueryForCondition(innerSql, startDate, endDate);
    return this.getContainersByNumbers(containerNumbers);
  }
}
