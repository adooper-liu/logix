/**
 * 按最晚提柜 SQL 子查询模板
 * Last Pickup Subquery Templates
 *
 * 根据状态机方案简化：
 * 1. 目标集：logistics_status = 'at_port'
 * 2. 时间分类（基于last_free_date）：
 *    - 已超时: last_free_date < 今天
 *    - 即将超时(1-3天): 今天 <= last_free_date <= 3天
 *    - 预警(4-7天): 3天 < last_free_date <= 7天
 *    - 时间充裕(7天以上): last_free_date > 7天
 *    - 缺最后免费日: last_free_date IS NULL
 */

export class LastPickupSubqueryTemplates {
  /**
   * 目标集子查询模板（基础条件）
   * 根据状态机方案：目标集为 logistics_status = 'at_port'
   */
  static readonly TARGET_SET_SUBQUERY = `
    SELECT c.container_number, po.last_free_date
    FROM biz_containers c
    LEFT JOIN process_port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
    WHERE c.logistics_status = 'at_port'
  `;

  /**
   * 已超时（last_free_date < 今天）
   */
  static readonly EXPIRED_SUBQUERY = (today: string) => `
    SELECT container_number
    FROM (${LastPickupSubqueryTemplates.TARGET_SET_SUBQUERY}) t
    WHERE last_free_date IS NOT NULL
    AND DATE(last_free_date) < '${today}'
  `;

  /**
   * 即将超时（今天 <= last_free_date < 3天后）
   */
  static readonly URGENT_SUBQUERY = (today: string, threeDaysLater: string) => `
    SELECT container_number
    FROM (${LastPickupSubqueryTemplates.TARGET_SET_SUBQUERY}) t
    WHERE last_free_date IS NOT NULL
    AND DATE(last_free_date) >= '${today}'
    AND DATE(last_free_date) < '${threeDaysLater}'
  `;

  /**
   * 预警（3天后 <= last_free_date < 7天后）
   */
  static readonly WARNING_SUBQUERY = (today: string, threeDaysLater: string, sevenDaysLater: string) => `
    SELECT container_number
    FROM (${LastPickupSubqueryTemplates.TARGET_SET_SUBQUERY}) t
    WHERE last_free_date IS NOT NULL
    AND DATE(last_free_date) >= '${threeDaysLater}'
    AND DATE(last_free_date) < '${sevenDaysLater}'
  `;

  /**
   * 时间充裕（last_free_date >= 7天后）
   */
  static readonly NORMAL_SUBQUERY = (sevenDaysLater: string) => `
    SELECT container_number
    FROM (${LastPickupSubqueryTemplates.TARGET_SET_SUBQUERY}) t
    WHERE last_free_date IS NOT NULL
    AND DATE(last_free_date) >= '${sevenDaysLater}'
  `;

  /**
   * 缺最后免费日（last_free_date IS NULL）
   */
  static readonly NO_LAST_FREE_DATE_SUBQUERY = `
    SELECT container_number
    FROM (${LastPickupSubqueryTemplates.TARGET_SET_SUBQUERY}) t
    WHERE last_free_date IS NULL
  `;

  /**
   * 主分组组合（有lastFreeDate的货柜）
   */
  static readonly WITH_LAST_FREE_DATE_SUBQUERY = (today: string, threeDaysLater: string, sevenDaysLater: string) => `
    ${LastPickupSubqueryTemplates.EXPIRED_SUBQUERY(today)}
    UNION
    ${LastPickupSubqueryTemplates.URGENT_SUBQUERY(today, threeDaysLater)}
    UNION
    ${LastPickupSubqueryTemplates.WARNING_SUBQUERY(today, threeDaysLater, sevenDaysLater)}
    UNION
    ${LastPickupSubqueryTemplates.NORMAL_SUBQUERY(sevenDaysLater)}
  `;

  /**
   * 主分组组合（全部货柜）
   */
  static readonly ALL_CONTAINERS_SUBQUERY = (today: string, threeDaysLater: string, sevenDaysLater: string) => `
    ${LastPickupSubqueryTemplates.WITH_LAST_FREE_DATE_SUBQUERY(today, threeDaysLater, sevenDaysLater)}
    UNION
    ${LastPickupSubqueryTemplates.NO_LAST_FREE_DATE_SUBQUERY}
  `;
}
