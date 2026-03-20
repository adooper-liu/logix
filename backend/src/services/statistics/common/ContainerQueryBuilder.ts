/**
 * 货柜查询构建器 - 负责构建常用的货柜查询基础
 */

import { Brackets, SelectQueryBuilder } from 'typeorm';
import { PortOperationQueryBuilder } from './PortOperationQueryBuilder';
import { DateFilterBuilder } from './DateFilterBuilder';

/**
 * 货柜查询构建器 - 提供常用的货柜查询模板
 */
export class ContainerQueryBuilder {
  /**
   * 物流状态常量
   */
  /* eslint-disable @typescript-eslint/naming-convention -- 与既有统计/筛选键名一致 */
  static readonly STATUSES = {
    ALL_SHIPPED: ['shipped', 'in_transit', 'at_port', 'picked_up', 'unloaded', 'returned_empty'],
    NOT_PICKED_UP: ['not_shipped', 'shipped', 'in_transit', 'at_port'],
    PICKED_UP: ['picked_up', 'unloaded', 'returned_empty'],
    ETA_TARGET: ['shipped', 'in_transit'],
  };
  /* eslint-enable @typescript-eslint/naming-convention */

  /**
   * 创建基础查询（带 order 和 sf 连接）
   */
  static createBaseQuery(containerRepository: any): SelectQueryBuilder<any> {
    return DateFilterBuilder.createBaseQuery(containerRepository);
  }

  /**
   * 创建货柜列表查询（用于 getContainers）
   * 日期/国家用 EXISTS，避免多备货单行膨胀；仅 leftJoinAndSelect 海运供 enrich
   */
  static createListQuery(
    containerRepository: any,
    params: { search?: string; startDate?: string; endDate?: string }
  ): SelectQueryBuilder<any> {
    const qb = containerRepository
      .createQueryBuilder('container')
      .leftJoinAndSelect('container.seaFreight', 'sf');

    if (params.search) {
      const search = `%${params.search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('container.containerNumber ILIKE :search', { search })
            .orWhere('sf.billOfLadingNumber ILIKE :search', { search })
            .orWhere('sf.mblNumber ILIKE :search', { search })
            .orWhere(
              'EXISTS (SELECT 1 FROM biz_replenishment_orders ro_search WHERE ' +
                'ro_search.container_number = "container"."container_number" AND ro_search.order_number ILIKE :search)',
              { search }
            );
        })
      );
    }

    DateFilterBuilder.addListFiltersAsExists(qb, {
      startDate: params.startDate,
      endDate: params.endDate
    });

    return qb.orderBy('container.updatedAt', 'DESC');
  }

  /**
   * 为查询添加最新目的港操作的内连接（含 ATA）
   */
  static joinLatestDestinationWithAta(
    query: SelectQueryBuilder<any>,
    alias: string = 'latest_po'
  ): SelectQueryBuilder<any> {
    return PortOperationQueryBuilder.joinLatestDestinationWithAta(query, alias);
  }

  /**
   * 为查询添加最新目的港操作的内连接（含 ETA）
   */
  static joinLatestDestinationWithEta(
    query: SelectQueryBuilder<any>,
    alias: string = 'latest_po'
  ): SelectQueryBuilder<any> {
    return PortOperationQueryBuilder.joinLatestDestinationWithEta(query, alias);
  }

  /**
   * 为查询添加最新目的港操作的内连接（不含时间）
   */
  static joinLatestDestination(
    query: SelectQueryBuilder<any>,
    alias: string = 'latest_po'
  ): SelectQueryBuilder<any> {
    return PortOperationQueryBuilder.joinLatestDestination(query, alias);
  }

  /**
   * 为查询添加最新目的港操作的内连接（含 lastFreeDate）
   */
  static joinLatestDestinationWithLastFreeDate(
    query: SelectQueryBuilder<any>,
    alias: string = 'latest_po'
  ): SelectQueryBuilder<any> {
    return PortOperationQueryBuilder.joinLatestDestinationWithLastFreeDate(query, alias);
  }

  /**
   * 为查询添加还空箱记录的内连接（用于 lastReturnDate）
   */
  static joinEmptyReturn(
    query: SelectQueryBuilder<any>,
    alias: string = 'er'
  ): SelectQueryBuilder<any> {
    return query.leftJoin(
      'process_empty_return',
      alias,
      `${alias}.container_number = container.container_number`
    );
  }

  /**
   * 为查询添加还空箱记录的内连接（用于 lastReturnDate，使用正确的列名）
   */
  static joinEmptyReturnWithColumn(
    query: SelectQueryBuilder<any>,
    alias: string = 'er'
  ): SelectQueryBuilder<any> {
    return query.leftJoin(
      'process_empty_return',
      alias,
      `${alias}.container_number = container.container_number`
    );
  }

  /**
   * 为查询添加日期过滤
   */
  static addDateFilters(
    query: SelectQueryBuilder<any>,
    startDate?: string,
    endDate?: string
  ): SelectQueryBuilder<any> {
    return DateFilterBuilder.addDateFilters(query, startDate, endDate);
  }

  /** 为查询添加国家过滤 */
  static addCountryFilters(
    query: SelectQueryBuilder<any>,
    countryCode?: string
  ): SelectQueryBuilder<any> {
    return DateFilterBuilder.addCountryFilters(query, countryCode);
  }

  /**
   * 为查询添加物流状态过滤
   */
  static filterByLogisticsStatus(
    query: SelectQueryBuilder<any>,
    statuses: string[]
  ): SelectQueryBuilder<any> {
    return query.andWhere('container.logisticsStatus IN (:...targetStatuses)', {
      targetStatuses: statuses
    });
  }

  /**
   * 为查询排除指定的物流状态
   */
  static excludeLogisticsStatus(
    query: SelectQueryBuilder<any>,
    statuses: string[]
  ): SelectQueryBuilder<any> {
    return query.andWhere('container.logisticsStatus NOT IN (:...excludedStatuses)', {
      excludedStatuses: statuses
    });
  }

  /**
   * 过滤目标集（必须是已出运状态的货柜）
   */
  static filterTargetStatus(
    query: SelectQueryBuilder<any>
  ): SelectQueryBuilder<any> {
    return this.filterByLogisticsStatus(query, this.STATUSES.ALL_SHIPPED);
  }
}
