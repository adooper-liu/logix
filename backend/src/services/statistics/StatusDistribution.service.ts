/**
 * 状态分布统计服务
 * Status Distribution Service
 * 负责货柜状态的分布统计
 */

import { Repository } from 'typeorm';
import { Container } from '../../entities/Container';
import { ContainerQueryBuilder } from './common/ContainerQueryBuilder';
import { DateFilterBuilder } from './common/DateFilterBuilder';

export class StatusDistributionService {
  constructor(private containerRepository: Repository<Container>) {}

  /**
   * 获取状态分布统计
   * 支持按出运时间（actualShipDate 或 shipmentDate）筛选
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
   * 优先级4: 目的港有ata_dest_port → at_port + current_port_type='destination'
   * 优先级5: 中转港有ata_dest_port或gate_in_time → at_port + current_port_type='transit'
   * 注意：两个统计都是基于状态机计算结果，受更高优先级状态（还空箱、WMS确认、拖车提柜）的排除
   */
  async getDistribution(startDate?: string, endDate?: string): Promise<Record<string, number>> {
    try {
      console.log('[StatusDistributionService] Starting getDistribution with dates:', { startDate, endDate });

      const query = ContainerQueryBuilder.createBaseQuery(this.containerRepository);
      query.select('container.logisticsStatus', 'status')
        .addSelect('COUNT(*)', 'count');

      console.log('[StatusDistributionService] Base query created');

      // 按出运时间筛选
      const filteredQuery = DateFilterBuilder.addDateFilters(query, startDate, endDate);

      console.log('[StatusDistributionService] Date filters added');

      const result = await filteredQuery.groupBy('container.logisticsStatus').getRawMany();

      console.log('[StatusDistributionService] Query result:', result);

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
      distribution[row.status] = parseInt(row.count);
    });

    // 查询有transit类型港口操作记录的货柜数
    distribution.arrived_at_transit = await this.getTransitArrivalCount(startDate, endDate);

    // 查询有destination类型港口操作记录的货柜数
    distribution.arrived_at_destination = await this.getDestinationArrivalCount(startDate, endDate);

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
            .andWhere('dest_po.ata_dest_port IS NOT NULL')
            .getQuery();

          // 包含优先级5：中转港ATA或gate_in_time
          const hasTransitArrival = qb.subQuery()
            .select('1')
            .from('process_port_operations', 'transit_po')
            .where('transit_po.container_number = container.container_number')
            .andWhere('transit_po.port_type = :transitType', { transitType: 'transit' })
            .andWhere('(transit_po.ata_dest_port IS NOT NULL OR transit_po.gate_in_time IS NOT NULL)')
            .getQuery();

          return `NOT EXISTS ${notEmptyReturn} AND NOT EXISTS ${notWmsConfirmed} AND NOT EXISTS ${notPickedUp} AND NOT EXISTS ${notDestinationAta} AND EXISTS ${hasTransitArrival}`;
        });

      const result = await DateFilterBuilder.addDateFilters(query, startDate, endDate)
        .getRawOne();
      return parseInt(result.count || '0');
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
            .andWhere('dest_po.ata_dest_port IS NOT NULL')
            .getQuery();

          return `NOT EXISTS ${notEmptyReturn} AND NOT EXISTS ${notWmsConfirmed} AND NOT EXISTS ${notPickedUp} AND EXISTS ${hasDestinationAta}`;
        });

      const result = await DateFilterBuilder.addDateFilters(query, startDate, endDate)
        .getRawOne();
      return parseInt(result.count || '0');
    } catch (error) {
      console.error('[StatusDistributionService] Error in getDestinationArrivalCount:', error);
      throw error;
    }
  }
}
