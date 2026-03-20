/**
 * AI 业务统计服务
 * AI Business Statistics Service
 * 
 * 提供常见的业务统计指标查询，供 AI 对话时快速获取数据
 */

import { AppDataSource } from '../../database';
import { logger } from '../../utils/logger';

export interface StatisticsResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class AIBusinessService {
  /**
   * 获取概览统计
   */
  async getOverview(): Promise<StatisticsResult> {
    try {
      // 货柜总数
      const totalContainers = await AppDataSource.query(`
        SELECT COUNT(*) as count FROM biz_containers
      `);

      // 按状态统计
      const statusStats = await AppDataSource.query(`
        SELECT logistics_status, COUNT(*) as count 
        FROM biz_containers 
        GROUP BY logistics_status
      `);

      // 今日到港
      const arrivedToday = await AppDataSource.query(`
        SELECT COUNT(*) as count 
        FROM process_port_operations 
        WHERE port_type = 'destination' 
        AND DATE(ata) = CURRENT_DATE
      `);

      // 在途数量
      const inTransit = await AppDataSource.query(`
        SELECT COUNT(*) as count 
        FROM biz_containers 
        WHERE logistics_status IN ('shipped', 'in_transit')
      `);

      // 待清关
      const pendingCustoms = await AppDataSource.query(`
        SELECT COUNT(*) as count 
        FROM process_port_operations 
        WHERE port_type = 'destination' 
        AND customs_status != 'cleared'
        AND ata IS NOT NULL
      `);

      return {
        success: true,
        data: {
          totalContainers: parseInt(totalContainers[0]?.count || '0'),
          statusBreakdown: statusStats.reduce((acc: any, row: any) => {
            acc[row.logistics_status] = parseInt(row.count || '0');
            return acc;
          }, {}),
          arrivedToday: parseInt(arrivedToday[0]?.count || '0'),
          inTransit: parseInt(inTransit[0]?.count || '0'),
          pendingCustoms: parseInt(pendingCustoms[0]?.count || '0')
        }
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getOverview error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按物流状态统计
   */
  async getByStatus(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          logistics_status,
          COUNT(*) as count,
          COUNT(CASE WHEN logistics_status = 'not_shipped' THEN 1 END) as not_shipped,
          COUNT(CASE WHEN logistics_status = 'shipped' THEN 1 END) as shipped,
          COUNT(CASE WHEN logistics_status = 'in_transit' THEN 1 END) as in_transit,
          COUNT(CASE WHEN logistics_status = 'at_port' THEN 1 END) as at_port,
          COUNT(CASE WHEN logistics_status = 'picked_up' THEN 1 END) as picked_up,
          COUNT(CASE WHEN logistics_status = 'unloaded' THEN 1 END) as unloaded,
          COUNT(CASE WHEN logistics_status = 'returned_empty' THEN 1 END) as returned_empty
        FROM biz_containers 
        GROUP BY logistics_status
      `);

      const breakdown = results[0] ? {
        not_shipped: parseInt(results[0].not_shipped || '0'),
        shipped: parseInt(results[0].shipped || '0'),
        in_transit: parseInt(results[0].in_transit || '0'),
        at_port: parseInt(results[0].at_port || '0'),
        picked_up: parseInt(results[0].picked_up || '0'),
        unloaded: parseInt(results[0].unloaded || '0'),
        returned_empty: parseInt(results[0].returned_empty || '0')
      } : {};

      return {
        success: true,
        data: {
          total: Object.values(breakdown).reduce((a: any, b: any) => a + b, 0),
          breakdown
        }
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByStatus error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按到港统计
   */
  async getByArrival(dateRange?: { start: string; end: string }): Promise<StatisticsResult> {
    try {
      let dateFilter = '';
      const params: any[] = [];

      if (dateRange) {
        dateFilter = 'AND DATE(po.ata) BETWEEN $1 AND $2';
        params.push(dateRange.start, dateRange.end);
      }

      const results = await AppDataSource.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN DATE(po.ata) = CURRENT_DATE THEN 1 END) as today,
          COUNT(CASE WHEN DATE(po.ata) < CURRENT_DATE AND po.port_sequence IN (
            SELECT MAX(po2.port_sequence) FROM process_port_operations po2 
            WHERE po2.container_number = po.container_number AND po2.port_type = 'destination'
          ) THEN 1 END) as before_today
        FROM process_port_operations po
        WHERE po.port_type = 'destination'
        AND po.ata IS NOT NULL
        ${dateFilter}
      `, params);

      return {
        success: true,
        data: {
          total: parseInt(results[0]?.total || '0'),
          today: parseInt(results[0]?.today || '0'),
          beforeToday: parseInt(results[0]?.before_today || '0')
        }
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByArrival error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按 ETA 统计
   */
  async getByETA(): Promise<StatisticsResult> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const results = await AppDataSource.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN c.eta < $1 THEN 1 END) as overdue,
          COUNT(CASE WHEN c.eta >= $1 AND c.eta <= $2 THEN 1 END) as within_3_days,
          COUNT(CASE WHEN c.eta > $2 AND c.eta <= $3 THEN 1 END) as within_7_days,
          COUNT(CASE WHEN c.eta > $3 THEN 1 END) as after_7_days
        FROM biz_containers c
        LEFT JOIN process_port_operations po ON c.container_number = po.container_number
        WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
        AND (c.eta IS NOT NULL OR po.eta IS NOT NULL)
      `, [today, in3Days, in7Days]);

      return {
        success: true,
        data: {
          total: parseInt(results[0]?.total || '0'),
          overdue: parseInt(results[0]?.overdue || '0'),
          within3Days: parseInt(results[0]?.within_3_days || '0'),
          within7Days: parseInt(results[0]?.within_7_days || '0'),
          after7Days: parseInt(results[0]?.after_7_days || '0')
        }
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByETA error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按最晚提柜日统计
   */
  async getByLastFreeDate(): Promise<StatisticsResult> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const results = await AppDataSource.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN po.last_free_date < $1 THEN 1 END) as expired,
          COUNT(CASE WHEN po.last_free_date >= $1 AND po.last_free_date <= $2 THEN 1 END) as urgent,
          COUNT(CASE WHEN po.last_free_date > $2 AND po.last_free_date <= $3 THEN 1 END) as warning,
          COUNT(CASE WHEN po.last_free_date > $3 THEN 1 END) as normal,
          COUNT(CASE WHEN po.last_free_date IS NULL THEN 1 END) as no_data
        FROM process_port_operations po
        WHERE po.port_type = 'destination'
        AND po.port_sequence IN (
          SELECT MAX(po2.port_sequence) FROM process_port_operations po2 
          WHERE po2.port_type = 'destination'
          GROUP BY po2.container_number
        )
      `, [today, in3Days, in7Days]);

      return {
        success: true,
        data: {
          total: parseInt(results[0]?.total || '0'),
          expired: parseInt(results[0]?.expired || '0'),
          urgent: parseInt(results[0]?.urgent || '0'),
          warning: parseInt(results[0]?.warning || '0'),
          normal: parseInt(results[0]?.normal || '0'),
          noData: parseInt(results[0]?.no_data || '0')
        }
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByLastFreeDate error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取滞港费概览
   */
  async getDemurrageOverview(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'calculated' THEN 1 END) as calculated,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
          SUM(CASE WHEN amount IS NOT NULL THEN amount ELSE 0 END) as total_amount
        FROM container_charges
        WHERE charge_type_code IN ('DEMURRAGE', 'DETENTION', 'STORAGE')
      `);

      return {
        success: true,
        data: {
          totalRecords: parseInt(results[0]?.total_records || '0'),
          pending: parseInt(results[0]?.pending || '0'),
          calculated: parseInt(results[0]?.calculated || '0'),
          paid: parseInt(results[0]?.paid || '0'),
          totalAmount: parseFloat(results[0]?.total_amount || '0')
        }
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getDemurrageOverview error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按船公司统计
   */
  async getByShippingCompany(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          c.shipping_company,
          COUNT(*) as count
        FROM biz_containers c
        WHERE c.shipping_company IS NOT NULL
        GROUP BY c.shipping_company
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          shippingCompany: row.shipping_company,
          count: parseInt(row.count || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByShippingCompany error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按目的港统计
   */
  async getByDestinationPort(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          c.destination_port,
          COUNT(*) as count
        FROM biz_containers c
        WHERE c.destination_port IS NOT NULL
        GROUP BY c.destination_port
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          destinationPort: row.destination_port,
          count: parseInt(row.count || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByDestinationPort error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按销往国家统计
   */
  async getByCountry(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          o.sell_to_country as country,
          COUNT(*) as count
        FROM biz_containers c
        LEFT JOIN biz_replenishment_orders o ON c.order_number = o.order_number
        WHERE o.sell_to_country IS NOT NULL
        GROUP BY o.sell_to_country
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          country: row.country,
          count: parseInt(row.count || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByCountry error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按货代公司统计
   */
  async getByFreightForwarder(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          c.freight_forwarder,
          COUNT(*) as count
        FROM biz_containers c
        WHERE c.freight_forwarder IS NOT NULL
        GROUP BY c.freight_forwarder
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          freightForwarder: row.freight_forwarder,
          count: parseInt(row.count || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByFreightForwarder error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按柜型统计
   */
  async getByContainerType(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          c.container_type_code as container_type,
          COUNT(*) as count
        FROM biz_containers c
        WHERE c.container_type_code IS NOT NULL
        GROUP BY c.container_type_code
        ORDER BY count DESC
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          containerType: row.container_type,
          count: parseInt(row.count || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByContainerType error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按清关状态统计
   */
  async getByCustomsStatus(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          po.customs_status,
          COUNT(*) as count
        FROM process_port_operations po
        WHERE po.port_type = 'destination'
        AND po.customs_status IS NOT NULL
        GROUP BY po.customs_status
        ORDER BY count DESC
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          customsStatus: row.customs_status,
          count: parseInt(row.count || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByCustomsStatus error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按中转港统计
   */
  async getByTransitPort(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          po.port_code as transit_port,
          COUNT(*) as count
        FROM process_port_operations po
        WHERE po.port_type = 'transit'
        GROUP BY po.port_code
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          transitPort: row.transit_port,
          count: parseInt(row.count || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByTransitPort error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按仓库统计
   */
  async getByWarehouse(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          wo.warehouse_code,
          COUNT(*) as count
        FROM process_warehouse_operations wo
        GROUP BY wo.warehouse_code
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          warehouseCode: row.warehouse_code,
          count: parseInt(row.count || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByWarehouse error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 滞港费明细分（按国家）
   */
  async getDemurrageByCountry(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          c.destination_country as country,
          COUNT(*) as count,
          SUM(cc.amount) as total_amount
        FROM container_charges cc
        LEFT JOIN biz_containers c ON cc.container_number = c.container_number
        WHERE cc.charge_type_code IN ('DEMURRAGE', 'DETENTION', 'STORAGE')
        AND cc.amount IS NOT NULL
        GROUP BY c.destination_country
        ORDER BY total_amount DESC
        LIMIT 10
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          country: row.country,
          count: parseInt(row.count || '0'),
          totalAmount: parseFloat(row.total_amount || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getDemurrageByCountry error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 滞港费明细分（按船公司）
   */
  async getDemurrageByShippingCompany(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          c.shipping_company,
          COUNT(*) as count,
          SUM(cc.amount) as total_amount
        FROM container_charges cc
        LEFT JOIN biz_containers c ON cc.container_number = c.container_number
        WHERE cc.charge_type_code IN ('DEMURRAGE', 'DETENTION', 'STORAGE')
        AND cc.amount IS NOT NULL
        GROUP BY c.shipping_company
        ORDER BY total_amount DESC
        LIMIT 10
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          shippingCompany: row.shipping_company,
          count: parseInt(row.count || '0'),
          totalAmount: parseFloat(row.total_amount || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getDemurrageByShippingCompany error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 滞港费明细分（按目的港）
   */
  async getDemurrageByPort(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          c.destination_port as port,
          COUNT(*) as count,
          SUM(cc.amount) as total_amount
        FROM container_charges cc
        LEFT JOIN biz_containers c ON cc.container_number = c.container_number
        WHERE cc.charge_type_code IN ('DEMURRAGE', 'DETENTION', 'STORAGE')
        AND cc.amount IS NOT NULL
        GROUP BY c.destination_port
        ORDER BY total_amount DESC
        LIMIT 10
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          port: row.port,
          count: parseInt(row.count || '0'),
          totalAmount: parseFloat(row.total_amount || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getDemurrageByPort error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 待排产统计（已出运未到港）
   */
  async getPendingScheduling(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN c.logistics_status = 'shipped' THEN 1 END) as shipped,
          COUNT(CASE WHEN c.logistics_status = 'in_transit' THEN 1 END) as in_transit,
          COUNT(CASE WHEN c.logistics_status = 'at_port' THEN 1 END) as at_port
        FROM biz_containers c
        WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
      `);

      return {
        success: true,
        data: {
          total: parseInt(results[0]?.total || '0'),
          shipped: parseInt(results[0]?.shipped || '0'),
          inTransit: parseInt(results[0]?.in_transit || '0'),
          atPort: parseInt(results[0]?.at_port || '0')
        }
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getPendingScheduling error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 还空箱统计
   */
  async getEmptyReturnStatus(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN return_time IS NOT NULL THEN 1 END) as returned,
          COUNT(CASE WHEN return_time IS NULL AND scheduled_return_date < CURRENT_DATE THEN 1 END) as overdue,
          COUNT(CASE WHEN return_time IS NULL AND scheduled_return_date >= CURRENT_DATE THEN 1 END) as pending
        FROM process_empty_returns
      `);

      return {
        success: true,
        data: {
          total: parseInt(results[0]?.total || '0'),
          returned: parseInt(results[0]?.returned || '0'),
          overdue: parseInt(results[0]?.overdue || '0'),
          pending: parseInt(results[0]?.pending || '0')
        }
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getEmptyReturnStatus error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 按备货单统计
   */
  async getByReplenishmentOrder(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          o.order_number,
          o.sell_to_country,
          o.status as order_status,
          COUNT(c.container_number) as container_count,
          o.total_boxes,
          o.total_volume
        FROM biz_replenishment_orders o
        LEFT JOIN biz_containers c ON o.order_number = c.order_number
        GROUP BY o.order_number, o.sell_to_country, o.status, o.total_boxes, o.total_volume
        ORDER BY container_count DESC
        LIMIT 10
      `);

      return {
        success: true,
        data: results.map((row: any) => ({
          orderNumber: row.order_number,
          country: row.sell_to_country,
          orderStatus: row.order_status,
          containerCount: parseInt(row.container_count || '0'),
          totalBoxes: parseFloat(row.total_boxes || '0'),
          totalVolume: parseFloat(row.total_volume || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getByReplenishmentOrder error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 拖卡运输统计
   */
  async getTruckingStatus(): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN actual_pickup_date IS NOT NULL AND actual_delivery_date IS NULL THEN 1 END) as in_transit,
          COUNT(CASE WHEN actual_pickup_date IS NOT NULL AND actual_delivery_date IS NOT NULL THEN 1 END) as completed,
          COUNT(CASE WHEN actual_pickup_date IS NULL THEN 1 END) as pending
        FROM process_trucking_transport
      `);

      return {
        success: true,
        data: {
          total: parseInt(results[0]?.total || '0'),
          inTransit: parseInt(results[0]?.in_transit || '0'),
          completed: parseInt(results[0]?.completed || '0'),
          pending: parseInt(results[0]?.pending || '0')
        }
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getTruckingStatus error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 待清关货柜列表
   */
  async getPendingCustomsContainers(limit: number = 10): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          c.container_number,
          c.logistics_status,
          c.destination_port,
          po.ata,
          po.customs_status,
          po.isf_status
        FROM biz_containers c
        INNER JOIN process_port_operations po ON c.container_number = po.container_number
        WHERE po.port_type = 'destination'
        AND po.ata IS NOT NULL
        AND (po.customs_status != 'cleared' OR po.customs_status IS NULL)
        ORDER BY po.ata ASC
        LIMIT $1
      `, [limit]);

      return {
        success: true,
        data: results
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getPendingCustomsContainers error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 滞港费预警（超期待处理）
   */
  async getDemurrageAlerts(limit: number = 10): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          c.container_number,
          c.destination_port,
          po.last_free_date,
          po.ata,
          cc.amount as demurrage_amount,
          cc.status as charge_status,
          CURRENT_DATE - po.last_free_date as overdue_days
        FROM biz_containers c
        INNER JOIN process_port_operations po ON c.container_number = po.container_number
        LEFT JOIN container_charges cc ON c.container_number = cc.container_number 
          AND cc.charge_type_code IN ('DEMURRAGE', 'DETENTION', 'STORAGE')
        WHERE po.port_type = 'destination'
        AND po.last_free_date < CURRENT_DATE
        AND (cc.status != 'paid' OR cc.status IS NULL)
        ORDER BY overdue_days DESC
        LIMIT $1
      `, [limit]);

      return {
        success: true,
        data: results.map((row: any) => ({
          containerNumber: row.container_number,
          destinationPort: row.destination_port,
          lastFreeDate: row.last_free_date,
          ataDestPort: row.ata,
          demurrageAmount: parseFloat(row.demurrage_amount || '0'),
          chargeStatus: row.charge_status,
          overdueDays: parseInt(row.overdue_days || '0')
        }))
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] getDemurrageAlerts error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 搜索货柜
   */
  async searchContainers(keyword: string, limit: number = 10): Promise<StatisticsResult> {
    try {
      const results = await AppDataSource.query(`
        SELECT 
          c.container_number,
          c.logistics_status,
          c.destination_port,
          c.eta,
          c.ata,
          o.order_number,
          o.sell_to_country
        FROM biz_containers c
        LEFT JOIN biz_replenishment_orders o ON c.order_number = o.order_number
        WHERE c.container_number ILIKE $1
           OR o.order_number ILIKE $1
           OR c.bill_of_lading_number ILIKE $1
        LIMIT $2
      `, [`%${keyword}%`, limit]);

      return {
        success: true,
        data: results
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] searchContainers error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 通用查询
   */
  async executeQuery(sql: string): Promise<StatisticsResult> {
    try {
      // 只允许 SELECT 查询
      const trimmedSql = sql.trim().toUpperCase();
      if (!trimmedSql.startsWith('SELECT')) {
        return { success: false, error: '只允许 SELECT 查询' };
      }

      const results = await AppDataSource.query(sql);

      return {
        success: true,
        data: results
      };
    } catch (error: any) {
      logger.error('[AIBusinessService] executeQuery error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const aiBusinessService = new AIBusinessService();
