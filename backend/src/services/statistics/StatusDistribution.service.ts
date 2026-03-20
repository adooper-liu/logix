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
import { createDateRangeSubQuery } from './common/DateRangeSubquery';

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
      let result: { status?: string; count?: string }[];

      if (startDate && endDate) {
        const subQuery = createDateRangeSubQuery(this.containerRepository, startDate, endDate);
        const mainQuery = this.containerRepository
          .createQueryBuilder('container')
          .select('container.logisticsStatus', 'status')
          .addSelect('COUNT(*)', 'count')
          .where(`container.containerNumber IN (${subQuery.getQuery()})`)
          .setParameters(subQuery.getParameters())
          .groupBy('container.logisticsStatus');
        result = await mainQuery.getRawMany();
      } else {
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

    // 查询有transit类型港口操作记录的货柜数
    distribution.arrived_at_transit = await this.getTransitArrivalCount(startDate, endDate);

    const destCount = await this.getDestinationArrivalCount(startDate, endDate);
    distribution.arrived_at_destination = destCount;

    // 调试：桑基图「已到目的港」= arrived_at_destination + picked_up + unloaded + returned_empty，若只显示 173 多为 arrived_at_destination 丢失
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.log('[StatusDistributionService] getDestinationArrivalCount(已到目的港未提)=', destCount, '; picked_up+unloaded+returned_empty=', distribution.picked_up + distribution.unloaded + distribution.returned_empty, '; 已到目的港合计=', destCount + distribution.picked_up + distribution.unloaded + distribution.returned_empty);
    }
    console.log('[StatusDistributionService] Final distribution:', distribution);

    return distribution;
    } catch (error) {
      console.error('[StatusDistributionService] Error in getDistribution:', error);
      throw error;
    }
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
        .andWhere(qb => {
          // 排除优先级1：还空箱记录
          const notEmptyReturn = qb.subQuery()
            .select('1')
            .from('process_empty_return', 'er')
            .where('er.container_number = container.container_number')
            .andWhere('er.return_time IS NOT NULL')
            .getQuery();

          // 排除优先级2：WMS确认（仓库卸柜）
          const notWmsConfirmed = qb.subQuery()
            .select('1')
            .from('process_warehouse_operations', 'wo')
            .where('wo.container_number = container.container_number')
            .andWhere('(wo.wms_status = :wmsStatus OR wo.ebs_status = :ebsStatus OR wo.wms_confirm_date IS NOT NULL)', {
              wmsStatus: 'WMS已完成',
              ebsStatus: '已入库'
            })
            .getQuery();

          // 排除优先级3：拖车提柜记录
          const notPickedUp = qb.subQuery()
            .select('1')
            .from('process_trucking_transport', 'tt')
            .where('tt.container_number = container.container_number')
            .andWhere('tt.pickup_date IS NOT NULL')
            .getQuery();

          // 排除优先级4：目的港ATA
          const notDestinationAta = qb.subQuery()
            .select('1')
            .from('process_port_operations', 'dest_po')
            .where('dest_po.container_number = container.container_number')
            .andWhere('dest_po.port_type = :destType', { destType: 'destination' })
            .andWhere('dest_po.ata IS NOT NULL')
            .getQuery();

          // 包含优先级5：中转港有到港/进闸（ata、gate_in_time 或 transit_arrival_date）
          const hasTransitArrival = qb.subQuery()
            .select('1')
            .from('process_port_operations', 'transit_po')
            .where('transit_po.container_number = container.container_number')
            .andWhere('transit_po.port_type = :transitType')
            .andWhere('(transit_po.ata IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)')
            .getQuery();

          return `NOT EXISTS ${notEmptyReturn} AND NOT EXISTS ${notWmsConfirmed} AND NOT EXISTS ${notPickedUp} AND NOT EXISTS ${notDestinationAta} AND EXISTS ${hasTransitArrival}`;
        });

      // 子查询中的占位符必须绑定到主查询
      query.setParameter('transitType', 'transit');
      query.setParameter('destType', 'destination');
      query.setParameter('wmsStatus', 'WMS已完成');
      query.setParameter('ebsStatus', '已入库');

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
   * 获取at_port状态且current_port_type='destination'的货柜数
   * 严格按状态机优先级4的逻辑：
   * 1. 必须有还空箱记录 → NOT in (优先级1)
   * 2. 必须有WMS确认（仓库卸柜） → NOT in (优先级2)
   * 3. 必须有拖车提柜记录 → NOT in (优先级3)
   * 4. 必须有目的港ATA → in (优先级4)
   */
  private async getDestinationArrivalCount(startDate?: string, endDate?: string): Promise<number> {
    try {
      const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
      query.select('COUNT(DISTINCT container.container_number)', 'count')
        .andWhere(qb => {
          // 排除优先级1：还空箱记录
          const notEmptyReturn = qb.subQuery()
            .select('1')
            .from('process_empty_return', 'er')
            .where('er.container_number = container.container_number')
            .andWhere('er.return_time IS NOT NULL')
            .getQuery();

          // 排除优先级2：WMS确认（仓库卸柜）
          const notWmsConfirmed = qb.subQuery()
            .select('1')
            .from('process_warehouse_operations', 'wo')
            .where('wo.container_number = container.container_number')
            .andWhere('(wo.wms_status = :wmsStatus OR wo.ebs_status = :ebsStatus OR wo.wms_confirm_date IS NOT NULL)', {
              wmsStatus: 'WMS已完成',
              ebsStatus: '已入库'
            })
            .getQuery();

          // 排除优先级3：拖车提柜记录
          const notPickedUp = qb.subQuery()
            .select('1')
            .from('process_trucking_transport', 'tt')
            .where('tt.container_number = container.container_number')
            .andWhere('tt.pickup_date IS NOT NULL')
            .getQuery();

          // 包含优先级4：目的港ATA
          const hasDestinationAta = qb.subQuery()
            .select('1')
            .from('process_port_operations', 'dest_po')
            .where('dest_po.container_number = container.container_number')
            .andWhere('dest_po.port_type = :destType', { destType: 'destination' })
            .andWhere('dest_po.ata IS NOT NULL')
            .getQuery();

          return `NOT EXISTS ${notEmptyReturn} AND NOT EXISTS ${notWmsConfirmed} AND NOT EXISTS ${notPickedUp} AND EXISTS ${hasDestinationAta}`;
        });

      query.setParameter('destType', 'destination');
      query.setParameter('wmsStatus', 'WMS已完成');
      query.setParameter('ebsStatus', '已入库');

      if (startDate && endDate) {
        const subQuery = createDateRangeSubQuery(this.containerRepository, startDate, endDate);
        query.andWhere(`container.containerNumber IN (${subQuery.getQuery()})`);
        query.setParameters({ ...query.getParameters(), ...subQuery.getParameters() });
      } else {
        DateFilterBuilder.addDateFilters(query, startDate, endDate);
        DateFilterBuilder.addCountryFilters(query);
      }

      if (process.env?.NODE_ENV !== 'production') {
        console.log('[StatusDistributionService] getDestinationArrivalCount SQL params:', { startDate, endDate, params: query.getParameters() });
      }
      const result = await query.getRawOne();
      const count = parseInt(result?.count || '0');
      if (process.env?.NODE_ENV !== 'production') {
        console.log('[StatusDistributionService] getDestinationArrivalCount raw result:', result, '-> count:', count);
      }
      return count;
    } catch (error) {
      console.error('[StatusDistributionService] Error in getDestinationArrivalCount:', error);
      throw error;
    }
  }

  /**
   * 按状态维度：获取「已到中转港」货柜列表（与 getTransitArrivalCount 同源逻辑）
   * 条件：无还箱/WMS/提柜/目的港ATA + 有中转港 ata / gate_in_time / transit_arrival_date
   */
  async getContainersByArrivedAtTransit(startDate?: string, endDate?: string): Promise<Container[]> {
    const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
    query.andWhere(qb => {
      const notEmptyReturn = qb.subQuery()
        .select('1')
        .from('process_empty_return', 'er')
        .where('er.container_number = container.container_number')
        .andWhere('er.return_time IS NOT NULL')
        .getQuery();
      const notWmsConfirmed = qb.subQuery()
        .select('1')
        .from('process_warehouse_operations', 'wo')
        .where('wo.container_number = container.container_number')
        .andWhere('(wo.wms_status = :wmsStatus OR wo.ebs_status = :ebsStatus OR wo.wms_confirm_date IS NOT NULL)')
        .getQuery();
      const notPickedUp = qb.subQuery()
        .select('1')
        .from('process_trucking_transport', 'tt')
        .where('tt.container_number = container.container_number')
        .andWhere('tt.pickup_date IS NOT NULL')
        .getQuery();
      const notDestinationAta = qb.subQuery()
        .select('1')
        .from('process_port_operations', 'dest_po')
        .where('dest_po.container_number = container.container_number')
        .andWhere('dest_po.port_type = :destType')
        .andWhere('dest_po.ata IS NOT NULL')
        .getQuery();
      const hasTransitArrival = qb.subQuery()
        .select('1')
        .from('process_port_operations', 'transit_po')
        .where('transit_po.container_number = container.container_number')
        .andWhere('transit_po.port_type = :transitType')
        .andWhere('(transit_po.ata IS NOT NULL OR transit_po.gate_in_time IS NOT NULL OR transit_po.transit_arrival_date IS NOT NULL)')
        .getQuery();
      return `NOT EXISTS ${notEmptyReturn} AND NOT EXISTS ${notWmsConfirmed} AND NOT EXISTS ${notPickedUp} AND NOT EXISTS ${notDestinationAta} AND EXISTS ${hasTransitArrival}`;
    });
    query.setParameter('transitType', 'transit');
    query.setParameter('destType', 'destination');
    query.setParameter('wmsStatus', 'WMS已完成');
    query.setParameter('ebsStatus', '已入库');
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
    query.andWhere(qb => {
      const notEmptyReturn = qb.subQuery()
        .select('1')
        .from('process_empty_return', 'er')
        .where('er.container_number = container.container_number')
        .andWhere('er.return_time IS NOT NULL')
        .getQuery();
      const notWmsConfirmed = qb.subQuery()
        .select('1')
        .from('process_warehouse_operations', 'wo')
        .where('wo.container_number = container.container_number')
        .andWhere('(wo.wms_status = :wmsStatus OR wo.ebs_status = :ebsStatus OR wo.wms_confirm_date IS NOT NULL)', {
          wmsStatus: 'WMS已完成',
          ebsStatus: '已入库'
        })
        .getQuery();
      const notPickedUp = qb.subQuery()
        .select('1')
        .from('process_trucking_transport', 'tt')
        .where('tt.container_number = container.container_number')
        .andWhere('tt.pickup_date IS NOT NULL')
        .getQuery();
      const hasDestinationAta = qb.subQuery()
        .select('1')
        .from('process_port_operations', 'dest_po')
        .where('dest_po.container_number = container.container_number')
        .andWhere('dest_po.port_type = :destType', { destType: 'destination' })
        .andWhere('dest_po.ata IS NOT NULL')
        .getQuery();
      return `NOT EXISTS ${notEmptyReturn} AND NOT EXISTS ${notWmsConfirmed} AND NOT EXISTS ${notPickedUp} AND EXISTS ${hasDestinationAta}`;
    });
    DateFilterBuilder.addDateFilters(query, startDate, endDate);
    DateFilterBuilder.addCountryFilters(query);
    return query.getMany();
  }
}
