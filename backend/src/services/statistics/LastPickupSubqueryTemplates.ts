/**
 * 按最晚提柜 SQL 子查询模板
 * Last Pickup Subquery Templates
 *
 * 数据子集规则（与按状态「已到目的港」对齐，对应 arrived_at_destination 46）：
 * 1. 目标集：NOT 还箱、NOT WMS、NOT 提柜 + 有目的港 ATA（状态机优先级4），取目的港 last_free_date
 * 2. 时间分类（基于 last_free_date）：
 *    - 已超时: last_free_date < 今天
 *    - 即将超时(1-3天): 今天 <= last_free_date <= 3天
 *    - 预警(4-7天): 3天 < last_free_date <= 7天
 *    - 时间充裕(7天以上): last_free_date > 7天
 *    - 最晚提柜日为空: last_free_date IS NULL
 */

export class LastPickupSubqueryTemplates {
  /**
   * 目标集子查询模板（与状态机已到目的港同源）
   * 条件：NOT 还箱、NOT WMS、NOT 提柜 + 目的港有 ATA，并取该目的港的 last_free_date
   */
  static readonly TARGET_SET_SUBQUERY = `
    SELECT c.container_number, po.last_free_date
    FROM biz_containers c
    INNER JOIN process_port_operations po ON c.container_number = po.container_number
    WHERE po.port_type = 'destination'
    AND po.ata_dest_port IS NOT NULL
    AND po.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po.container_number
      AND po2.port_type = 'destination'
    )
    AND NOT EXISTS (SELECT 1 FROM process_empty_return er WHERE er.container_number = c.container_number AND er.return_time IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM process_warehouse_operations wo WHERE wo.container_number = c.container_number AND (wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL))
    AND NOT EXISTS (SELECT 1 FROM process_trucking_transport tt WHERE tt.container_number = c.container_number AND tt.pickup_date IS NOT NULL)
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
   * 最晚提柜日为空（last_free_date IS NULL）
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
