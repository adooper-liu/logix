/**
 * 按提柜计划 SQL 子查询模板
 * Planned Pickup Subquery Templates
 *
 * 数据子集规则（与按状态「已到目的港」对齐，对应 arrived_at_destination 46）：
 * 1. 目标集：NOT 还箱、NOT WMS、NOT 提柜 + 有目的港 ATA（状态机优先级4）
 * 2. 分组：按提柜计划时间分组
 *    - 逾期未提柜：plannedPickupDate < 今天
 *    - 今日计划提柜：plannedPickupDate = 今天
 *    - 3天内计划提柜：今天 < plannedPickupDate <= 3天
 *    - 7天内计划提柜：3天 < plannedPickupDate <= 7天
 *    - 待安排提柜：无拖卡记录或无计划提柜日期
 */

export class PlannedPickupSubqueryTemplates {
  /**
   * 目标集子查询模板（与状态机已到目的港同源）
   * 条件：NOT 还箱、NOT WMS、NOT 提柜 + EXISTS 目的港 ATA
   */
  static readonly TARGET_SET_SUBQUERY = `
    SELECT c.container_number
    FROM biz_containers c
    INNER JOIN process_port_operations po ON c.container_number = po.container_number
    LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
    LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
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
   * 逾期未提柜（plannedPickupDate < 今天）
   */
  static readonly OVERDUE_PLANNED_SUBQUERY = (today: string) => `
    SELECT DISTINCT t.container_number
    FROM (${PlannedPickupSubqueryTemplates.TARGET_SET_SUBQUERY}) t
    INNER JOIN process_trucking_transport tt ON t.container_number = tt.container_number
    WHERE tt.planned_pickup_date IS NOT NULL
    AND DATE(tt.planned_pickup_date) < '${today}'
  `;

  /**
   * 今日计划提柜（plannedPickupDate = 今天）
   */
  static readonly TODAY_PLANNED_SUBQUERY = (today: string) => `
    SELECT DISTINCT t.container_number
    FROM (${PlannedPickupSubqueryTemplates.TARGET_SET_SUBQUERY}) t
    INNER JOIN process_trucking_transport tt ON t.container_number = tt.container_number
    WHERE tt.planned_pickup_date IS NOT NULL
    AND DATE(tt.planned_pickup_date) = '${today}'
  `;

  /**
   * 3天内计划提柜（今天 < plannedPickupDate <= 3天）
   */
  static readonly WITHIN_3_DAYS_PLANNED_SUBQUERY = (today: string, threeDaysLater: string) => `
    SELECT DISTINCT t.container_number
    FROM (${PlannedPickupSubqueryTemplates.TARGET_SET_SUBQUERY}) t
    INNER JOIN process_trucking_transport tt ON t.container_number = tt.container_number
    WHERE tt.planned_pickup_date IS NOT NULL
    AND DATE(tt.planned_pickup_date) > '${today}'
    AND DATE(tt.planned_pickup_date) <= '${threeDaysLater}'
  `;

  /**
   * 7天内计划提柜（3天 < plannedPickupDate <= 7天）
   */
  static readonly WITHIN_7_DAYS_PLANNED_SUBQUERY = (today: string, threeDaysLater: string, sevenDaysLater: string) => `
    SELECT DISTINCT t.container_number
    FROM (${PlannedPickupSubqueryTemplates.TARGET_SET_SUBQUERY}) t
    INNER JOIN process_trucking_transport tt ON t.container_number = tt.container_number
    WHERE tt.planned_pickup_date IS NOT NULL
    AND DATE(tt.planned_pickup_date) > '${threeDaysLater}'
    AND DATE(tt.planned_pickup_date) <= '${sevenDaysLater}'
  `;

  /**
   * 待安排提柜（无拖卡记录或无计划提柜日期）
   */
  static readonly PENDING_ARRANGEMENT_SUBQUERY = `
    SELECT DISTINCT t.container_number
    FROM (${PlannedPickupSubqueryTemplates.TARGET_SET_SUBQUERY}) t
    LEFT JOIN process_trucking_transport tt ON t.container_number = tt.container_number
    WHERE tt.container_number IS NULL
    OR (tt.container_number IS NOT NULL AND tt.planned_pickup_date IS NULL)
  `;

  /**
   * 主分组组合（有计划提柜日期的货柜）
   */
  static readonly WITH_PLAN_SUBQUERY = (today: string, threeDaysLater: string, sevenDaysLater: string) => `
    ${PlannedPickupSubqueryTemplates.OVERDUE_PLANNED_SUBQUERY(today)}
    UNION
    ${PlannedPickupSubqueryTemplates.TODAY_PLANNED_SUBQUERY(today)}
    UNION
    ${PlannedPickupSubqueryTemplates.WITHIN_3_DAYS_PLANNED_SUBQUERY(today, threeDaysLater)}
    UNION
    ${PlannedPickupSubqueryTemplates.WITHIN_7_DAYS_PLANNED_SUBQUERY(today, threeDaysLater, sevenDaysLater)}
  `;

  /**
   * 主分组组合（全部货柜）
   */
  static readonly ALL_CONTAINERS_SUBQUERY = (today: string, threeDaysLater: string, sevenDaysLater: string) => `
    ${PlannedPickupSubqueryTemplates.WITH_PLAN_SUBQUERY(today, threeDaysLater, sevenDaysLater)}
    UNION
    ${PlannedPickupSubqueryTemplates.PENDING_ARRANGEMENT_SUBQUERY}
  `;
}
