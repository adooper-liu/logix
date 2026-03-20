/**
 * 日期过滤构建器
 * 负责为查询添加统一的日期过滤条件
 */

import { SelectQueryBuilder } from 'typeorm';
import { getScopedCountryCode } from '../../../utils/requestContext';
import { normalizeCountryCode } from '../../../utils/countryCode';
import { getDateRangeSubqueryRaw as getDateRangeSubqueryRawImpl } from './DateRangeSubquery';

/**
 * 日期过滤构建器
 * 提供统一的出运时间过滤逻辑
 */
export class DateFilterBuilder {
  /**
   * 为查询添加出运时间过滤
   * 优先使用 expectedShipDate，如果为空则使用 actualShipDate，如果还为空则使用海运日期
   */
  static addDateFilters(
    query: SelectQueryBuilder<any>,
    startDate?: string,
    endDate?: string
  ): SelectQueryBuilder<any> {
    if (startDate) {
      query.andWhere(
        '(order.expectedShipDate >= :startDate OR (order.expectedShipDate IS NULL AND order.actualShipDate >= :startDate2) OR (order.expectedShipDate IS NULL AND order.actualShipDate IS NULL AND sf.shipmentDate >= :startDate3))',
        {
          startDate: new Date(startDate),
          startDate2: new Date(startDate),
          startDate3: new Date(startDate)
        }
      );
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      query.andWhere(
        '(order.expectedShipDate <= :endDate OR (order.expectedShipDate IS NULL AND order.actualShipDate <= :endDate2) OR (order.expectedShipDate IS NULL AND order.actualShipDate IS NULL AND sf.shipmentDate <= :endDate3))',
        {
          endDate: endDateObj,
          endDate2: endDateObj,
          endDate3: endDateObj
        }
      );
    }

    return query;
  }

  /**
   * 为国家筛选添加条件：
   * 数据链：biz_containers --[container_number]--> biz_replenishment_orders 取得 sell_to_country
   *        → sell_to_country 与 biz_customers.customer_name 关联 → 取 biz_customers.country 作为国家过滤值
   * 即：JOIN biz_customers cust ON cust.customer_name = order.sell_to_country，过滤 WHERE cust.country = :countryCode
   */
  static addCountryFilters(
    query: SelectQueryBuilder<any>,
    countryCode?: string
  ): SelectQueryBuilder<any> {
    const raw = (countryCode !== undefined && countryCode !== null ? String(countryCode).trim() : getScopedCountryCode()) || '';
    const code = normalizeCountryCode(raw);
    if (!code) return query;
    query.leftJoin('biz_customers', 'cust', 'cust.customer_name = order.sell_to_country');
    query.andWhere('cust.country = :countryCode', { countryCode: code });
    return query;
  }

  /**
   * 创建基础查询（带 order 和 sf 连接）
   * 注意：由于一个货柜可能有多个备货单，使用leftJoin处理
   */
  static createBaseQuery(
    containerRepository: any
  ): SelectQueryBuilder<any> {
    return containerRepository
      .createQueryBuilder('container')
      .leftJoin('container.replenishmentOrders', 'order')
      .leftJoin('container.seaFreight', 'sf');
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

  /**
   * 出运日期范围子查询（raw SQL）- 委托给统一组件，避免重复实现
   */
  static getDateRangeSubqueryRaw(startDate: string, endDate: string): { sql: string; params: any[] } {
    return getDateRangeSubqueryRawImpl(startDate, endDate);
  }
}
