/**
 * 状态分布统计服务
 * Status Distribution Service
 * 负责货柜状态的分布统计。
 *
 * 数据用途（与 Shipments 卡片、桑基图对齐）：
 * - Shipments 页「按状态」卡片及子维度（已到中转港、已到目的港）与本服务 getDistribution 同源。
 * - 桑基图各节点数值均由此服务 getDistribution 返回的 statusDistribution 计算，不改变桑基图结构。
 * - 日期口径：与 Shipments 一致，按出运日期（expected_ship_date / shipment_date）在 [startDate,endDate] 内，
 *   使用 createDateRangeSubQuery 统一子查询，与 ArrivalStatistics、LastPickupStatistics 等卡片统计同源。
 */

import { Repository } from 'typeorm';
import { Container } from '../../entities/Container';
import { ContainerQueryBuilder } from './common/ContainerQueryBuilder';
import { DateFilterBuilder } from './common/DateFilterBuilder';
import { createDateRangeSubQuery, getDateRangeSubqueryRaw } from './common/DateRangeSubquery';

export class StatusDistributionService {
  constructor(private containerRepository: Repository<Container>) {}

  /**
   * 获取状态分布统计
   * 支持按出运时间（expectedShipDate 或 shipmentDate）筛选
   *
   * 状态机定义（严格按状态机7优先级）：
   * - not_shipped: 无任何流程记录
   * - shipped: 有海运记录但无港口操作记录
   * - in_transit: 有海运记录但港口操作无ATA
   * - at_port: 有港口操作记录的ATA (hasTransit || hasDestinationAta)
   * - picked_up: 有拖车运输记录且已提柜
   * - unloaded: 有仓库操作记录
   * - returned_empty: 有还空箱记录
   *
   * 补充维度（按港口类型统计,严格按状态机逻辑）：
   * - arrived_at_transit: at_port状态且current_port_type='transit'的货柜数（状态机优先级5）
   * - arrived_at_destination: at_port状态且current_port_type='destination'的货柜数（状态机优先级4）
   *
   * 状态机优先级说明：
   * 优先级4: 目的港有ata → at_port + current_port_type='destination'
   * 优先级5: 中转港有 ata / gate_in_time / transit_arrival_date 任一 → at_port + current_port_type='transit'
   * 注意：两个统计都是基于状态机计算结果，受更高优先级状态（还空箱、WMS确认、拖车提柜）的排除
   */
  async getDistribution(startDate?: string, endDate?: string): Promise<Record<string, number>> {
    try {
      // 有日期范围时，按流程事实实时推导状态机，避免 logistics_status 迟滞导致统计失真
      if (startDate && endDate) {
        return await this.getDistributionByProcessFacts(startDate, endDate);
      }

      let result: { status?: string; count?: string }[];

      {
        // 未传日期时统计全部货柜（可选国家）
        const query = this.containerRepository
          .createQueryBuilder('container')
          .select('container.logisticsStatus', 'status')
          .addSelect('COUNT(*)', 'count')
          .leftJoin('container.replenishmentOrders', 'order')
          .leftJoin('container.seaFreight', 'sf');
        DateFilterBuilder.addCountryFilters(query);
        query.groupBy('container.logisticsStatus');
        result = await query.getRawMany();
      }

    // 转换为对象格式
    const distribution: Record<string, number> = {
      not_shipped: 0,
      shipped: 0,
      in_transit: 0,
      at_port: 0,
      arrived_at_transit: 0,  // 有transit类型港口操作记录
      arrived_at_destination: 0,  // 有destination类型港口操作记录
      picked_up: 0,
      unloaded: 0,
      returned_empty: 0
    };

    result.forEach((row: any) => {
      const statusKey = row.status ?? row.STATUS ?? row.logistics_status ?? row.logisticsStatus;
      const cnt = row.count ?? row.COUNT;
      if (statusKey != null) distribution[statusKey] = parseInt(String(cnt || '0'), 10);
    });

    // 对 at_port 状态做互斥拆分，确保 arrived_at_transit + arrived_at_destination = at_port
    const transitCount = await this.getTransitArrivalCount(startDate, endDate);
    distribution.arrived_at_transit = transitCount;
    distribution.arrived_at_destination = Math.max((distribution.at_port || 0) - transitCount, 0);

    // 调试：桑基图「已到目的港」= arrived_at_destination + picked_up + unloaded + returned_empty，若只显示 173 多为 arrived_at_destination 丢失
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.log('[StatusDistributionService] arrived_at_destination(已到目的港未提)=', distribution.arrived_at_destination, '; picked_up+unloaded+returned_empty=', distribution.picked_up + distribution.unloaded + distribution.returned_empty, '; 已到目的港合计=', distribution.arrived_at_destination + distribution.picked_up + distribution.unloaded + distribution.returned_empty);
    }
    console.log('[StatusDistributionService] Final distribution:', distribution);

    return distribution;
    } catch (error) {
      console.error('[StatusDistributionService] Error in getDistribution:', error);
      throw error;
    }
  }

  /**
   * 按流程事实推导状态分布（有日期范围时使用）
   * 优先级：returned_empty > unloaded > picked_up > arrived_at_destination > arrived_at_transit > in_transit > shipped > not_shipped
   */
  private async getDistributionByProcessFacts(startDate: string, endDate: string): Promise<Record<string, number>> {
    const dateRange = getDateRangeSubqueryRaw(startDate, endDate);
    const sql = `
      WITH base AS (
        ${dateRange.sql}
      ),
      flags AS (
        SELECT
          b.container_number,
          EXISTS (
            SELECT 1 FROM process_empty_return er
            WHERE er.container_number = b.container_number
              AND er.return_time IS NOT NULL
          ) AS has_returned,
          EXISTS (
            SELECT 1 FROM process_warehouse_operations wo
            WHERE wo.container_number = b.container_number
              AND (wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL)
          ) AS has_unloaded,
          EXISTS (
            SELECT 1 FROM process_trucking_transport tt
            WHERE tt.container_number = b.container_number
              AND tt.pickup_date IS NOT NULL
          ) AS has_picked_up,
          EXISTS (
            SELECT 1 FROM process_port_operations po
            WHERE po.container_number = b.container_number
              AND po.port_type = 'destination'
              AND (po.ata IS NOT NULL OR po.available_time IS NOT NULL)
          ) AS has_dest_arrival,
          EXISTS (
            SELECT 1 FROM process_port_operations po
            WHERE po.container_number = b.container_number
              AND po.port_type = 'transit'
              AND (po.ata IS NOT NULL OR po.gate_in_time IS NOT NULL OR po.transit_arrival_date IS NOT NULL)
          ) AS has_transit_arrival,
          EXISTS (
            SELECT 1 FROM process_port_operations po
            WHERE po.container_number = b.container_number
          ) AS has_any_port_record,
          EXISTS (
            SELECT 1 FROM process_sea_freight sf
            WHERE sf.bill_of_lading_number = c.bill_of_lading_number
          ) AS has_sea_freight
        FROM base b
        JOIN biz_containers c ON c.container_number = b.container_number
      ),
      classified AS (
        SELECT
          container_number,
          CASE
            WHEN has_returned THEN 'returned_empty'
            WHEN has_unloaded THEN 'unloaded'
            WHEN has_picked_up THEN 'picked_up'
            WHEN has_dest_arrival THEN 'arrived_at_destination'
            WHEN has_transit_arrival THEN 'arrived_at_transit'
            WHEN has_sea_freight AND has_any_port_record THEN 'in_transit'
            WHEN has_sea_freight THEN 'shipped'
            ELSE 'not_shipped'
          END AS derived_status
        FROM flags
      )
      SELECT derived_status AS status, COUNT(*)::int AS count
      FROM classified
      GROUP BY derived_status
    `;

    const rows: Array<{ status: string; count: number }> = await this.containerRepository.query(sql, dateRange.params);
    const distribution: Record<string, number> = {
      not_shipped: 0,
      shipped: 0,
      in_transit: 0,
      at_port: 0,
      arrived_at_transit: 0,
      arrived_at_destination: 0,
      picked_up: 0,
      unloaded: 0,
      returned_empty: 0
    };

    for (const row of rows) {
      const key = row.status;
      const count = Number(row.count || 0);
      if (key === 'arrived_at_transit') distribution.arrived_at_transit = count;
      else if (key === 'arrived_at_destination') distribution.arrived_at_destination = count;
      else if (key && key in distribution) distribution[key] = count;
    }

    distribution.at_port = distribution.arrived_at_transit + distribution.arrived_at_destination;
    return distribution;
  }

  /**
   * 与 getDistributionByProcessFacts 使用同一套 CASE 推导，按 derived_status 取柜号列表（有日期范围时与统计同源）
   */
  async getContainersByDerivedStatuses(
    startDate: string,
    endDate: string,
    derivedStatuses: string[]
  ): Promise<Container[]> {
    if (!derivedStatuses.length) return [];

    const dateRange = getDateRangeSubqueryRaw(startDate, endDate);
    const statusParamIndex = dateRange.params.length + 1;
    const params = [...dateRange.params, derivedStatuses];

    const sql = `
      WITH base AS (
        ${dateRange.sql}
      ),
      flags AS (
        SELECT
          b.container_number,
          EXISTS (
            SELECT 1 FROM process_empty_return er
            WHERE er.container_number = b.container_number
              AND er.return_time IS NOT NULL
          ) AS has_returned,
          EXISTS (
            SELECT 1 FROM process_warehouse_operations wo
            WHERE wo.container_number = b.container_number
              AND (wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL)
          ) AS has_unloaded,
          EXISTS (
            SELECT 1 FROM process_trucking_transport tt
            WHERE tt.container_number = b.container_number
              AND tt.pickup_date IS NOT NULL
          ) AS has_picked_up,
          EXISTS (
            SELECT 1 FROM process_port_operations po
            WHERE po.container_number = b.container_number
              AND po.port_type = 'destination'
              AND (po.ata IS NOT NULL OR po.available_time IS NOT NULL)
          ) AS has_dest_arrival,
          EXISTS (
            SELECT 1 FROM process_port_operations po
            WHERE po.container_number = b.container_number
              AND po.port_type = 'transit'
              AND (po.ata IS NOT NULL OR po.gate_in_time IS NOT NULL OR po.transit_arrival_date IS NOT NULL)
          ) AS has_transit_arrival,
          EXISTS (
            SELECT 1 FROM process_port_operations po
            WHERE po.container_number = b.container_number
          ) AS has_any_port_record,
          EXISTS (
            SELECT 1 FROM process_sea_freight sf
            WHERE sf.bill_of_lading_number = c.bill_of_lading_number
          ) AS has_sea_freight
        FROM base b
        JOIN biz_containers c ON c.container_number = b.container_number
      ),
      classified AS (
        SELECT
          container_number,
          CASE
            WHEN has_returned THEN 'returned_empty'
            WHEN has_unloaded THEN 'unloaded'
            WHEN has_picked_up THEN 'picked_up'
            WHEN has_dest_arrival THEN 'arrived_at_destination'
            WHEN has_transit_arrival THEN 'arrived_at_transit'
            WHEN has_sea_freight AND has_any_port_record THEN 'in_transit'
            WHEN has_sea_freight THEN 'shipped'
            ELSE 'not_shipped'
          END AS derived_status
        FROM flags
      )
      SELECT DISTINCT container_number
      FROM classified
      WHERE derived_status = ANY($${statusParamIndex}::text[])
    `;

    const rows: Array<{ container_number: string }> = await this.containerRepository.query(sql, params);
    if (!rows.length) return [];

    const containerNumbers = rows.map(r => r.container_number).filter(Boolean);
    return this.containerRepository
      .createQueryBuilder('container')
      .where('container.containerNumber IN (:...containerNumbers)', { containerNumbers })
      .getMany();
  }

  /**
   * 获取at_port状态且current_port_type='transit'的货柜数
   * 严格按状态机优先级5的逻辑：
   * 1. 必须有还空箱记录 → NOT in (优先级1)
   * 2. 必须有WMS确认（仓库卸柜） → NOT in (优先级2)
   * 3. 必须有拖车提柜记录 → NOT in (优先级3)
   * 4. 必须没有目的港ATA → NOT in (优先级4)
   * 5. 必须有中转港ATA或gate_in_time → in (优先级5)
   */
  private async getTransitArrivalCount(startDate?: string, endDate?: string): Promise<number> {
    try {
      const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
      query.select('COUNT(DISTINCT container.container_number)', 'count')
        .andWhere('container.logisticsStatus = :atPortStatus', { atPortStatus: 'at_port' })
        .andWhere(qb => {
          const hasTransitArrival = qb.subQuery()
            .select('1')
            .from('process_port_operations', 'transit_po')
            .where('transit_po.container_number = container.container_number')
            .andWhere('transit_po.port_type = :transitType')
            .andWhere('(transit_po.ata IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)')
            .getQuery();

          const noDestinationArrival = qb.subQuery()
            .select('1')
            .from('process_port_operations', 'dest_po')
            .where('dest_po.container_number = container.container_number')
            .andWhere('dest_po.port_type = :destType')
            .andWhere('(dest_po.ata IS NOT NULL OR dest_po.available_time IS NOT NULL)')
            .getQuery();

          return `EXISTS ${hasTransitArrival} AND NOT EXISTS ${noDestinationArrival}`;
        });

      // 子查询中的占位符必须绑定到主查询
      query.setParameter('transitType', 'transit');
      query.setParameter('destType', 'destination');

      if (startDate && endDate) {
        const subQuery = createDateRangeSubQuery(this.containerRepository, startDate, endDate);
        query.andWhere(`container.containerNumber IN (${subQuery.getQuery()})`);
        query.setParameters({ ...query.getParameters(), ...subQuery.getParameters() });
      } else {
        DateFilterBuilder.addDateFilters(query, startDate, endDate);
        DateFilterBuilder.addCountryFilters(query);
      }

      const result = await query.getRawOne();
      return parseInt(result?.count || '0');
    } catch (error) {
      console.error('[StatusDistributionService] Error in getTransitArrivalCount:', error);
      throw error;
    }
  }

  /**
   * 按状态维度：获取「已到中转港」货柜列表（与 getTransitArrivalCount 同源逻辑）
   * 条件：无还箱/WMS/提柜/目的港ATA + 有中转港 ata / gate_in_time / transit_arrival_date
   */
  async getContainersByArrivedAtTransit(startDate?: string, endDate?: string): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    query.andWhere('container.logisticsStatus = :atPortStatus', { atPortStatus: 'at_port' });
    query.andWhere(qb => {
      const hasTransitArrival = qb.subQuery()
        .select('1')
        .from('process_port_operations', 'transit_po')
        .where('transit_po.container_number = container.container_number')
        .andWhere('transit_po.port_type = :transitType')
        .andWhere('(transit_po.ata IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)')
        .getQuery();
      const noDestinationArrival = qb.subQuery()
        .select('1')
        .from('process_port_operations', 'dest_po')
        .where('dest_po.container_number = container.container_number')
        .andWhere('dest_po.port_type = :destType')
        .andWhere('(dest_po.ata IS NOT NULL OR dest_po.available_time IS NOT NULL)')
        .getQuery();
      return `EXISTS ${hasTransitArrival} AND NOT EXISTS ${noDestinationArrival}`;
    });
    query.setParameter('transitType', 'transit');
    query.setParameter('destType', 'destination');
    DateFilterBuilder.addDateFilters(query, startDate, endDate);
    DateFilterBuilder.addCountryFilters(query);
    return query.getMany();
  }

  /**
   * 按状态维度：获取「已到目的港」货柜列表（与 getDestinationArrivalCount 同源逻辑）
   * 条件：无还箱/WMS/提柜 + 有目的港 ATA
   */
  async getContainersByArrivedAtDestination(startDate?: string, endDate?: string): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    query.andWhere('container.logisticsStatus = :atPortStatus', { atPortStatus: 'at_port' });
    query.andWhere(qb => {
      const hasTransitArrival = qb.subQuery()
        .select('1')
        .from('process_port_operations', 'transit_po')
        .where('transit_po.container_number = container.container_number')
        .andWhere('transit_po.port_type = :transitType')
        .andWhere('(transit_po.ata IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)')
        .getQuery();
      const noDestinationArrival = qb.subQuery()
        .select('1')
        .from('process_port_operations', 'dest_po')
        .where('dest_po.container_number = container.container_number')
        .andWhere('dest_po.port_type = :destType')
        .andWhere('(dest_po.ata IS NOT NULL OR dest_po.available_time IS NOT NULL)')
        .getQuery();
      return `NOT (EXISTS ${hasTransitArrival} AND NOT EXISTS ${noDestinationArrival})`;
    });
    query.setParameter('transitType', 'transit');
    query.setParameter('destType', 'destination');
    DateFilterBuilder.addDateFilters(query, startDate, endDate);
    DateFilterBuilder.addCountryFilters(query);
    return query.getMany();
  }

  /**
   * 按流程事实获取状态列表（用于避免与统计口径漂移）
   * 仅覆盖易漂移状态：picked_up / unloaded / returned_empty
   */
  async getContainersByProcessFactStatus(
    status: 'picked_up' | 'unloaded' | 'returned_empty',
    startDate?: string,
    endDate?: string
  ): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);

    if (status === 'returned_empty') {
      query.andWhere(`EXISTS (
        SELECT 1
        FROM process_empty_return er
        WHERE er.container_number = container.container_number
          AND er.return_time IS NOT NULL
      )`);
    }

    if (status === 'unloaded') {
      query.andWhere(`EXISTS (
        SELECT 1
        FROM process_warehouse_operations wo
        WHERE wo.container_number = container.container_number
          AND (wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL)
      )`);
      query.andWhere(`NOT EXISTS (
        SELECT 1
        FROM process_empty_return er
        WHERE er.container_number = container.container_number
          AND er.return_time IS NOT NULL
      )`);
    }

    if (status === 'picked_up') {
      query.andWhere(`EXISTS (
        SELECT 1
        FROM process_trucking_transport tt
        WHERE tt.container_number = container.container_number
          AND tt.pickup_date IS NOT NULL
      )`);
      query.andWhere(`NOT EXISTS (
        SELECT 1
        FROM process_warehouse_operations wo
        WHERE wo.container_number = container.container_number
          AND (wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL)
      )`);
      query.andWhere(`NOT EXISTS (
        SELECT 1
        FROM process_empty_return er
        WHERE er.container_number = container.container_number
          AND er.return_time IS NOT NULL
      )`);
    }

    DateFilterBuilder.addDateFilters(query, startDate, endDate);
    DateFilterBuilder.addCountryFilters(query);
    return query.getMany();
  }
}
