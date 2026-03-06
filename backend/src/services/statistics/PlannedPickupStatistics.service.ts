/**
 * 按计划提柜统计服务
 * Planned Pickup Statistics Service
 * 负责按计划提柜时间的统计查询
 *
 * 采用方案2：SQL模板 + 子查询组合
 * 目标集与"按最晚提柜日"相同
 */

import { Repository } from 'typeorm';
import { Container } from '../../entities/Container';
import { TruckingTransport } from '../../entities/TruckingTransport';
import { DateFilterBuilder } from './common/DateFilterBuilder';
import { PlannedPickupSubqueryTemplates } from './PlannedPickupSubqueryTemplates';

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
  private readonly METHOD_MAP: Record<string, (today: string, threeDaysLater: string, sevenDaysLater: string, startDate?: string, endDate?: string) => Promise<Container[]>> = {
    'overduePlanned': (today, _three, _seven, start, end) => this.getContainersByOverduePlanned(today, start, end),
    'todayPlanned': (today, _three, _seven, start, end) => this.getContainersByTodayPlanned(today, start, end),
    'plannedWithin3Days': (today, three, _seven, start, end) => this.getContainersByPlannedWithin3Days(today, three, start, end),
    'plannedWithin7Days': (today, three, seven, start, end) => this.getContainersByPlannedWithin7Days(today, three, seven, start, end),
    'pendingArrangement': (_today, _three, _seven, start, end) => this.getContainersByPendingArrangement(start, end)
  };

  /**
   * 获取按计划提柜分布的统计
   * 目标集：与"按最晚提柜日"相同 - 已到目的港（有ATA）+ 状态在 ('shipped', 'in_transit', 'at_port')
   */
  async getDistribution(startDate?: string, endDate?: string): Promise<Record<string, number>> {
    const today = DateFilterBuilder.toDayStart(new Date());
    const threeDaysLater = DateFilterBuilder.addDays(today, 3);
    const sevenDaysLater = DateFilterBuilder.addDays(today, 7);

    const todayStr = today.toISOString().split('T')[0];
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];
    const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];

    // 并行执行所有查询
    const [overduePlanned, todayPlanned, within3Days, within7Days, pendingArrangement] =
      await Promise.all([
        this.getOverduePlanned(todayStr, startDate, endDate),
        this.getTodayPlanned(todayStr, startDate, endDate),
        this.getPlannedWithin3Days(todayStr, threeDaysLaterStr, startDate, endDate),
        this.getPlannedWithin7Days(todayStr, threeDaysLaterStr, sevenDaysLaterStr, startDate, endDate),
        this.getPendingArrangement(startDate, endDate)
      ]);

    // 计算总数和分类统计
    const withPlan = overduePlanned + todayPlanned + within3Days + within7Days;
    const withoutPlan = pendingArrangement;
    const total = withPlan + withoutPlan;

    console.log('[PlannedPickupStatisticsService.getDistribution]', {
      overdue: overduePlanned,
      todayPlanned,
      within3Days,
      within7Days,
      pending: pendingArrangement,
      withPlan,
      withoutPlan,
      total,
      breakdown: '按计划提柜目标集总数应该是46个（与按最晚提柜日一致）'
    });

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
   * 逾期未提柜（plannedPickupDate < 今天）
   */
  async getOverduePlanned(today: string, startDate?: string, endDate?: string): Promise<number> {
    let sql = PlannedPickupSubqueryTemplates.OVERDUE_PLANNED_SUBQUERY(today);
    console.log('[getOverduePlanned] Subquery SQL:', sql);
    sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sql}) t`;

    const result = await this.containerRepository.query(sql);
    console.log('[getOverduePlanned] Count result:', result);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * 今日计划提柜（plannedPickupDate = 今天）
   */
  async getTodayPlanned(today: string, startDate?: string, endDate?: string): Promise<number> {
    let sql = PlannedPickupSubqueryTemplates.TODAY_PLANNED_SUBQUERY(today);
    sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sql}) t`;

    const result = await this.containerRepository.query(sql);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * 3天内计划提柜（今天 < plannedPickupDate <= 3天）
   */
  async getPlannedWithin3Days(today: string, threeDaysLater: string, startDate?: string, endDate?: string): Promise<number> {
    let sql = PlannedPickupSubqueryTemplates.WITHIN_3_DAYS_PLANNED_SUBQUERY(today, threeDaysLater);
    sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sql}) t`;

    const result = await this.containerRepository.query(sql);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * 7天内计划提柜（3天 < plannedPickupDate <= 7天）
   */
  async getPlannedWithin7Days(today: string, threeDaysLater: string, sevenDaysLater: string, startDate?: string, endDate?: string): Promise<number> {
    let sql = PlannedPickupSubqueryTemplates.WITHIN_7_DAYS_PLANNED_SUBQUERY(today, threeDaysLater, sevenDaysLater);
    sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sql}) t`;

    const result = await this.containerRepository.query(sql);
    return parseInt(result[0]?.count || '0');
  }

  /**
   * 待安排提柜（无拖卡记录或无计划提柜日期）
   */
  async getPendingArrangement(startDate?: string, endDate?: string): Promise<number> {
    let sql = PlannedPickupSubqueryTemplates.PENDING_ARRANGEMENT_SUBQUERY;
    sql = `SELECT COUNT(DISTINCT t.container_number) as count FROM (${sql}) t`;

    const result = await this.containerRepository.query(sql);
    return parseInt(result[0]?.count || '0');
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
    const method = this.METHOD_MAP[filterCondition as FilterCondition];

    if (!method) {
      console.warn(`[PlannedPickupStatisticsService] Unknown filterCondition: ${filterCondition}`);
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

  private async getContainersByOverduePlanned(today: string, startDate?: string, endDate?: string): Promise<Container[]> {
    let sql = PlannedPickupSubqueryTemplates.OVERDUE_PLANNED_SUBQUERY(today);
    const result = await this.containerRepository.query(sql);
    console.log('[getContainersByOverduePlanned] SQL result count:', result.length);
    console.log('[getContainersByOverduePlanned] containerNumbers:', result.map((r: any) => r.container_number));
    if (result.length === 0) return [];

    const containerNumbers = result.map((r: any) => r.container_number);
    const containers = await this.containerRepository.createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
    console.log('[getContainersByOverduePlanned] Final containers count:', containers.length);
    return containers;
  }

  private async getContainersByTodayPlanned(today: string, startDate?: string, endDate?: string): Promise<Container[]> {
    let sql = PlannedPickupSubqueryTemplates.TODAY_PLANNED_SUBQUERY(today);
    const result = await this.containerRepository.query(sql);
    if (result.length === 0) return [];

    const containerNumbers = result.map((r: any) => r.container_number);
    return this.containerRepository.createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }

  private async getContainersByPlannedWithin3Days(today: string, threeDaysLater: string, startDate?: string, endDate?: string): Promise<Container[]> {
    let sql = PlannedPickupSubqueryTemplates.WITHIN_3_DAYS_PLANNED_SUBQUERY(today, threeDaysLater);
    const result = await this.containerRepository.query(sql);
    if (result.length === 0) return [];

    const containerNumbers = result.map((r: any) => r.container_number);
    return this.containerRepository.createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }

  private async getContainersByPlannedWithin7Days(today: string, threeDaysLater: string, sevenDaysLater: string, startDate?: string, endDate?: string): Promise<Container[]> {
    let sql = PlannedPickupSubqueryTemplates.WITHIN_7_DAYS_PLANNED_SUBQUERY(today, threeDaysLater, sevenDaysLater);
    const result = await this.containerRepository.query(sql);
    if (result.length === 0) return [];

    const containerNumbers = result.map((r: any) => r.container_number);
    return this.containerRepository.createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }

  private async getContainersByPendingArrangement(startDate?: string, endDate?: string): Promise<Container[]> {
    let sql = PlannedPickupSubqueryTemplates.PENDING_ARRANGEMENT_SUBQUERY;
    const result = await this.containerRepository.query(sql);
    if (result.length === 0) return [];

    const containerNumbers = result.map((r: any) => r.container_number);
    return this.containerRepository.createQueryBuilder('container')
      .setFindOptions({ relations: [] })
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }
}
