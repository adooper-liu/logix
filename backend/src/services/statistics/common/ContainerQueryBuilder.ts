/**
 * 货柜查询构建�? * 负责构建常用的货柜查询基础
 */

import { SelectQueryBuilder } from 'typeorm';
import { PortOperationQueryBuilder } from './PortOperationQueryBuilder';
import { DateFilterBuilder } from './DateFilterBuilder';

/**
 * 货柜查询构建�? * 提供常用的货柜查询模�? */
export class ContainerQueryBuilder {
  /**
   * 物流状态常�?   */
  static readonly STATUSES = {
    ALL_SHIPPED: ['shipped', 'in_transit', 'at_port', 'picked_up', 'unloaded', 'returned_empty'],
    NOT_PICKED_UP: ['not_shipped', 'shipped', 'in_transit', 'at_port'],
    PICKED_UP: ['picked_up', 'unloaded', 'returned_empty'],
    ETA_TARGET: ['shipped', 'in_transit'],
  };

  /**
   * 创建基础查询（带 order �?sf 连接�?   */
  static createBaseQuery(containerRepository: any): SelectQueryBuilder<any> {
    return DateFilterBuilder.createBaseQuery(containerRepository);
  }

  /**
   * 为查询添加最新目的港操作的内连接（含 ATA�?   */
  static joinLatestDestinationWithAta(
    query: SelectQueryBuilder<any>,
    alias: string = 'latest_po'
  ): SelectQueryBuilder<any> {
    return PortOperationQueryBuilder.joinLatestDestinationWithAta(query, alias);
  }

  /**
   * 为查询添加最新目的港操作的内连接（含 ETA�?   */
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
   * 为查询添加最新目的港操作的内连接（含 lastFreeDate�?   */
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
   * 为查询添加日期过�?   */
  static addDateFilters(
    query: SelectQueryBuilder<any>,
    startDate?: string,
    endDate?: string
  ): SelectQueryBuilder<any> {
    return DateFilterBuilder.addDateFilters(query, startDate, endDate);
  }

  /** 为查询添加国家过滤（销住国家/客户国家/目的港所在国） */
  static addCountryFilters(
    query: SelectQueryBuilder<any>,
    countryCode?: string
  ): SelectQueryBuilder<any> {
    return DateFilterBuilder.addCountryFilters(query, countryCode);
  }

  /**
   * 为查询添加物流状态过�?   */
  static filterByLogisticsStatus(
    query: SelectQueryBuilder<any>,
    statuses: string[]
  ): SelectQueryBuilder<any> {
    return query.andWhere('container.logisticsStatus IN (:...targetStatuses)', {
      targetStatuses: statuses
    });
  }

  /**
   * 为查询排除指定的物流状�?   */
  static excludeLogisticsStatus(
    query: SelectQueryBuilder<any>,
    statuses: string[]
  ): SelectQueryBuilder<any> {
    return query.andWhere('container.logisticsStatus NOT IN (:...excludedStatuses)', {
      excludedStatuses: statuses
    });
  }

  /**
   * 过滤目标集（必须是已出运状态的货柜�?   */
  static filterTargetStatus(
    query: SelectQueryBuilder<any>
  ): SelectQueryBuilder<any> {
    return this.filterByLogisticsStatus(query, this.STATUSES.ALL_SHIPPED);
  }
}

