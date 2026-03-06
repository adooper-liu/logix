/**
 * 日期过滤构建器
 * 负责为查询添加统一的日期过滤条件
 */

import { SelectQueryBuilder } from 'typeorm';

/**
 * 日期过滤构建器
 * 提供统一的出运时间过滤逻辑
 */
export class DateFilterBuilder {
  /**
   * 为查询添加出运时间过滤
   * 按 actualShipDate 筛选
   */
  static addDateFilters(
    query: SelectQueryBuilder<any>,
    startDate?: string,
    endDate?: string
  ): SelectQueryBuilder<any> {
    if (startDate) {
      query.andWhere('order.actualShipDate >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      query.andWhere('order.actualShipDate <= :endDate', { endDate: endDateObj });
    }

    return query;
  }

  /**
   * 创建基础查询（带 order 和 sf 连接）
   */
  static createBaseQuery(
    containerRepository: any
  ): SelectQueryBuilder<any> {
    return containerRepository
      .createQueryBuilder('container')
      .leftJoin('container.order', 'order');
  }

  /**
   * 格式化日期为当天的开始（00:00:00）
   */
  static toDayStart(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * 格式化日期为当天的结束（23:59:59.999）
   */
  static toDayEnd(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * 获取相对日期
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
