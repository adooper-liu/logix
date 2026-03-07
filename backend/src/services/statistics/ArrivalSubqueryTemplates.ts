/**
 * 按到港统计 - SQL子查询模板
 * Arrival Statistics - SQL Subquery Templates
 *
 * 定义所有按到港相关的SQL子查询模板
 * 只定义查询条件，不包含COUNT或SELECT
 */

export class ArrivalSubqueryTemplates {
  // ========================================
  // 已到目的港子查询模板
  // ========================================

  /**
   * 今日到港子查询模板（与状态机对齐：NOT 还箱、NOT WMS）
   * 条件：目的港有ATA + ATA=今日 + 无中转港记录 + 状态在ALL_SHIPPED范围内
   */
  static readonly ARRIVED_TODAY_SUBQUERY = `
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
    AND NOT EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
    )
    AND c.logistics_status IN ('shipped', 'in_transit', 'at_port', 'picked_up', 'unloaded', 'returned_empty')
  `;

  /**
   * 今日之前到港未提柜子查询模板（与状态机对齐：NOT 还箱、NOT WMS）
   * 条件：目的港有ATA + ATA<今日 + 未提柜 + 无中转港记录 + 状态在ALL_SHIPPED范围内
   */
  static readonly ARRIVED_BEFORE_NOT_PICKED_UP_SUBQUERY = `
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
    AND NOT EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
    )
    AND c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  `;

  /**
   * 今日之前到港已提柜子查询模板（与状态机对齐：NOT 还箱、NOT WMS）
   * 条件：目的港有ATA + ATA<今日 + 已提柜 + 无中转港记录 + 状态在ALL_SHIPPED范围内
   */
  static readonly ARRIVED_BEFORE_PICKED_UP_SUBQUERY = `
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
    AND NOT EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
    )
    AND c.logistics_status IN ('picked_up', 'unloaded', 'returned_empty')
  `;

  // ========================================
  // 已到中转港子查询模板
  // ========================================

  /**
   * 已到中转子查询模板（与按状态/状态机对齐）
   * 条件：NOT 还箱/WMS/提柜 + 目的港无ATA + 有中转港到港（ata/gate_in/transit_arrival_date）
   * 不要求目的港有 ETA，按 ETA 细分在子项中处理
   */
  static readonly ARRIVED_AT_TRANSIT_SUBQUERY = `
    SELECT c.container_number
    FROM biz_containers c
    INNER JOIN process_port_operations po ON c.container_number = po.container_number
    LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
    LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
    WHERE po.port_type = 'destination'
    AND po.ata_dest_port IS NULL
    AND po.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po.container_number
      AND po2.port_type = 'destination'
    )
    AND NOT EXISTS (SELECT 1 FROM process_empty_return er WHERE er.container_number = c.container_number AND er.return_time IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM process_warehouse_operations wo WHERE wo.container_number = c.container_number AND (wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL))
    AND NOT EXISTS (SELECT 1 FROM process_trucking_transport tt WHERE tt.container_number = c.container_number AND tt.pickup_date IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
      AND (transit_po.ata_dest_port IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)
    )
  `;

  /**
   * 中转港已逾期子查询模板（与状态机对齐：NOT 还箱/WMS/提柜）
   * 条件：目的港无ATA + 有ETA + ETA<今日 + 有中转港到港
   */
  static readonly TRANSIT_OVERDUE_SUBQUERY = (today: Date) => `
    SELECT c.container_number
    FROM biz_containers c
    INNER JOIN process_port_operations po ON c.container_number = po.container_number
    LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
    LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
    WHERE po.port_type = 'destination'
    AND po.ata_dest_port IS NULL
    AND po.eta_dest_port IS NOT NULL
    AND DATE(po.eta_dest_port) < '${today.toISOString().split('T')[0]}'
    AND po.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po.container_number
      AND po2.port_type = 'destination'
    )
    AND NOT EXISTS (SELECT 1 FROM process_empty_return er WHERE er.container_number = c.container_number AND er.return_time IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM process_warehouse_operations wo WHERE wo.container_number = c.container_number AND (wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL))
    AND NOT EXISTS (SELECT 1 FROM process_trucking_transport tt WHERE tt.container_number = c.container_number AND tt.pickup_date IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
      AND (transit_po.ata_dest_port IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)
    )
  `;

  /**
   * 中转港3天内到港子查询模板（与状态机对齐：NOT 还箱/WMS/提柜）
   * 条件：目的港无ATA + 有ETA + 今日≤ETA≤3天 + 有中转港到港
   */
  static readonly TRANSIT_WITHIN_3_DAYS_SUBQUERY = (today: Date, threeDaysLater: Date) => `
    SELECT c.container_number
    FROM biz_containers c
    INNER JOIN process_port_operations po ON c.container_number = po.container_number
    LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
    LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
    WHERE po.port_type = 'destination'
    AND po.ata_dest_port IS NULL
    AND po.eta_dest_port IS NOT NULL
    AND DATE(po.eta_dest_port) >= '${today.toISOString().split('T')[0]}'
    AND DATE(po.eta_dest_port) <= '${threeDaysLater.toISOString().split('T')[0]}'
    AND po.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po.container_number
      AND po2.port_type = 'destination'
    )
    AND NOT EXISTS (SELECT 1 FROM process_empty_return er WHERE er.container_number = c.container_number AND er.return_time IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM process_warehouse_operations wo WHERE wo.container_number = c.container_number AND (wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL))
    AND NOT EXISTS (SELECT 1 FROM process_trucking_transport tt WHERE tt.container_number = c.container_number AND tt.pickup_date IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
      AND (transit_po.ata_dest_port IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)
    )
  `;

  /**
   * 中转港7天内到港子查询模板（与状态机对齐：NOT 还箱/WMS/提柜）
   * 条件：目的港无ATA + 有ETA + 3天<ETA≤7天 + 有中转港到港
   */
  static readonly TRANSIT_WITHIN_7_DAYS_SUBQUERY = (threeDaysLater: Date, sevenDaysLater: Date) => `
    SELECT c.container_number
    FROM biz_containers c
    INNER JOIN process_port_operations po ON c.container_number = po.container_number
    LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
    LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
    WHERE po.port_type = 'destination'
    AND po.ata_dest_port IS NULL
    AND po.eta_dest_port IS NOT NULL
    AND DATE(po.eta_dest_port) > '${threeDaysLater.toISOString().split('T')[0]}'
    AND DATE(po.eta_dest_port) <= '${sevenDaysLater.toISOString().split('T')[0]}'
    AND po.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po.container_number
      AND po2.port_type = 'destination'
    )
    AND NOT EXISTS (SELECT 1 FROM process_empty_return er WHERE er.container_number = c.container_number AND er.return_time IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM process_warehouse_operations wo WHERE wo.container_number = c.container_number AND (wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL))
    AND NOT EXISTS (SELECT 1 FROM process_trucking_transport tt WHERE tt.container_number = c.container_number AND tt.pickup_date IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
      AND (transit_po.ata_dest_port IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)
    )
  `;

  /**
   * 中转港超过7天到港子查询模板（与状态机对齐：NOT 还箱/WMS/提柜）
   * 条件：目的港无ATA + 有ETA + ETA>7天 + 有中转港到港
   */
  static readonly TRANSIT_OVER_7_DAYS_SUBQUERY = (sevenDaysLater: Date) => `
    SELECT c.container_number
    FROM biz_containers c
    INNER JOIN process_port_operations po ON c.container_number = po.container_number
    LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
    LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
    WHERE po.port_type = 'destination'
    AND po.ata_dest_port IS NULL
    AND po.eta_dest_port IS NOT NULL
    AND DATE(po.eta_dest_port) > '${sevenDaysLater.toISOString().split('T')[0]}'
    AND po.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po.container_number
      AND po2.port_type = 'destination'
    )
    AND NOT EXISTS (SELECT 1 FROM process_empty_return er WHERE er.container_number = c.container_number AND er.return_time IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM process_warehouse_operations wo WHERE wo.container_number = c.container_number AND (wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL))
    AND NOT EXISTS (SELECT 1 FROM process_trucking_transport tt WHERE tt.container_number = c.container_number AND tt.pickup_date IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
      AND (transit_po.ata_dest_port IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)
    )
  `;

  /**
   * 中转港无ETA子查询模板（与状态机对齐：NOT 还箱/WMS/提柜）
   * 条件：目的港无ATA无ETA + 有中转港到港
   */
  static readonly TRANSIT_NO_ETA_SUBQUERY = `
    SELECT c.container_number
    FROM biz_containers c
    INNER JOIN process_port_operations po ON c.container_number = po.container_number
    LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
    LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
    WHERE po.port_type = 'destination'
    AND po.ata_dest_port IS NULL
    AND po.eta_dest_port IS NULL
    AND po.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po.container_number
      AND po2.port_type = 'destination'
    )
    AND NOT EXISTS (SELECT 1 FROM process_empty_return er WHERE er.container_number = c.container_number AND er.return_time IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM process_warehouse_operations wo WHERE wo.container_number = c.container_number AND (wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL))
    AND NOT EXISTS (SELECT 1 FROM process_trucking_transport tt WHERE tt.container_number = c.container_number AND tt.pickup_date IS NOT NULL)
    AND EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
      AND (transit_po.ata_dest_port IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)
    )
  `;

  // ========================================
  // 其他子查询模板
  // ========================================

  /**
   * 今日之前到港无ATA子查询模板
   * 条件：目的港无ATA无ETA + 状态为at_port/picked_up/unloaded/returned_empty + 无中转港记录
   */
  static readonly ARRIVED_BEFORE_NO_ATA_SUBQUERY = `
    SELECT c.container_number
    FROM biz_containers c
    INNER JOIN process_port_operations po ON c.container_number = po.container_number
    LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
    LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
    WHERE po.port_type = 'destination'
    AND po.ata_dest_port IS NULL
    AND po.eta_dest_port IS NULL
    AND po.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po.container_number
      AND po2.port_type = 'destination'
    )
    AND c.logistics_status IN ('at_port', 'picked_up', 'unloaded', 'returned_empty')
    AND NOT EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
    )
  `;

  // ========================================
  // 主分组组合模板
  // ========================================

  /**
   * 已到目的港主分组子查询模板
   * 组合：今日到港 + 今日之前未提柜 + 今日之前已提柜
   */
  static readonly ARRIVED_AT_DESTINATION_SUBQUERY = `
    ${ArrivalSubqueryTemplates.ARRIVED_TODAY_SUBQUERY}
    UNION
    ${ArrivalSubqueryTemplates.ARRIVED_BEFORE_NOT_PICKED_UP_SUBQUERY}
    UNION
    ${ArrivalSubqueryTemplates.ARRIVED_BEFORE_PICKED_UP_SUBQUERY}
  `;

  /**
   * 预计到港主分组子查询模板
   * 条件：目的港无ATA + 状态为shipped/in_transit + 无中转港记录
   * 涵盖：有ETA（4个子分类）+ 无ETA无ATA（1个子分类）
   */
  static readonly EXPECTED_ARRIVAL_SUBQUERY = `
    SELECT c.container_number
    FROM biz_containers c
    INNER JOIN process_port_operations po ON c.container_number = po.container_number
    LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
    LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
    WHERE po.port_type = 'destination'
    AND po.ata_dest_port IS NULL
    AND po.port_sequence = (
      SELECT MAX(po2.port_sequence)
      FROM process_port_operations po2
      WHERE po2.container_number = po.container_number
      AND po2.port_type = 'destination'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
    )
    AND c.logistics_status IN ('shipped', 'in_transit')
  `;
}
