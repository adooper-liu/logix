/**
 * 日期过滤构建器
 * 负责为查询添加统一的日期过滤条件
 */

import { SelectQueryBuilder } from 'typeorm';
import { getScopedCountryCode } from '../../../utils/requestContext';
import { normalizeCountryCode } from '../../../utils/countryCode';
import { parseIsoDateOnlyForFilter } from '../../../utils/dateTimeUtils';
import { getDateRangeSubqueryRaw as getDateRangeSubqueryRawImpl } from './DateRangeSubquery';
import {
  RAW_RO_CUSTOMER_JOIN_ON,
  TYPEORM_ORDER_CUSTOMER_JOIN_ON
} from './customerCountryMatchSql';

/**
 * 日期过滤构建器
 * 提供统一的出运时间过滤逻辑
 */
export class DateFilterBuilder {
  /**
   * 为查询添加出运时间过滤（已带 order、sf 连接时）
   * 有效出运日：COALESCE(actual, expected, shipment)，与统计子查询一致
   */
  static addDateFilters(
    query: SelectQueryBuilder<any>,
    startDate?: string,
    endDate?: string
  ): SelectQueryBuilder<any> {
    const startDay = startDate ? parseIsoDateOnlyForFilter(String(startDate)) : undefined;
    const endDay = endDate ? parseIsoDateOnlyForFilter(String(endDate)) : undefined;

    if (startDay) {
      query.andWhere(
        'CAST(COALESCE(order.actualShipDate, order.expectedShipDate, sf.shipmentDate) AS date) >= CAST(:startDate AS date)',
        { startDate: startDay }
      );
    }

    if (endDay) {
      query.andWhere(
        'CAST(COALESCE(order.actualShipDate, order.expectedShipDate, sf.shipmentDate) AS date) <= CAST(:endDate AS date)',
        { endDate: endDay }
      );
    }

    return query;
  }

  /**
   * 为国家筛选添加条件（已带 order 连接时）
   */
  static addCountryFilters(
    query: SelectQueryBuilder<any>,
    countryCode?: string
  ): SelectQueryBuilder<any> {
    const raw =
      (countryCode !== undefined && countryCode !== null ? String(countryCode).trim() : getScopedCountryCode()) || '';
    const code = normalizeCountryCode(raw);
    if (!code) return query;
    query.leftJoin('biz_customers', 'cust', TYPEORM_ORDER_CUSTOMER_JOIN_ON);
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

  /**
   * 列表查询：用单一 EXISTS 同时施加国家筛选（可选）与出运日筛选（可选），
   * 要求同一备货单行同时满足国家与日期，与统计子查询口径一致。
   */
  static addListFiltersAsExists(
    query: SelectQueryBuilder<any>,
    params: { startDate?: string; endDate?: string; countryCode?: string }
  ): SelectQueryBuilder<any> {
    const dateParts: string[] = [];
    const dateParams: Record<string, unknown> = {};
    const startDay = params.startDate ? parseIsoDateOnlyForFilter(String(params.startDate)) : undefined;
    const endDay = params.endDate ? parseIsoDateOnlyForFilter(String(params.endDate)) : undefined;
    if (startDay) {
      dateParts.push(
        '(COALESCE(ro.actual_ship_date, ro.expected_ship_date, sf2.shipment_date)::date) >= CAST(:startDate AS date)'
      );
      dateParams.startDate = startDay;
    }
    if (endDay) {
      dateParts.push(
        '(COALESCE(ro.actual_ship_date, ro.expected_ship_date, sf2.shipment_date)::date) <= CAST(:endDate AS date)'
      );
      dateParams.endDate = endDay;
    }
    const hasDate = dateParts.length > 0;

    const rawCountry =
      (params.countryCode !== undefined && params.countryCode !== null
        ? String(params.countryCode).trim()
        : getScopedCountryCode()) || '';
    const code = normalizeCountryCode(rawCountry);
    const hasCountry = !!code;

    if (!hasDate && !hasCountry) return query;

    const mergeParams = { ...dateParams, ...(hasCountry ? { countryCode: code } : {}) };

    // 使用 OR 逻辑：有备货单的按国家/日期筛选
    // 注意：当有国家过滤时，不显示无备货单的货柜（避免"无订单货柜"被错误归类到任何国家）
    if (hasCountry && hasDate) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM biz_replenishment_orders ro
          LEFT JOIN process_sea_freight sf2 ON sf2.bill_of_lading_number = "container"."bill_of_lading_number"
          INNER JOIN biz_customers cust ON (
            ${RAW_RO_CUSTOMER_JOIN_ON}
          ) AND cust.country = :countryCode
          WHERE ro.container_number = "container"."container_number"
          AND ${dateParts.join(' AND ')}
        )`,
        mergeParams
      );
    } else if (hasCountry && !hasDate) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM biz_replenishment_orders ro
          INNER JOIN biz_customers cust ON (
            ${RAW_RO_CUSTOMER_JOIN_ON}
          ) AND cust.country = :countryCode
          WHERE ro.container_number = "container"."container_number"
        )`,
        { countryCode: code }
      );
    } else if (hasDate && !hasCountry) {
      query.andWhere(
        `(
          EXISTS (
            SELECT 1 FROM biz_replenishment_orders ro
            LEFT JOIN process_sea_freight sf2 ON sf2.bill_of_lading_number = "container"."bill_of_lading_number"
            WHERE ro.container_number = "container"."container_number"
            AND ${dateParts.join(' AND ')}
          )
          OR NOT EXISTS (SELECT 1 FROM biz_replenishment_orders ro2 WHERE ro2.container_number = "container"."container_number")
        )`,
        dateParams
      );
    }
    return query;
  }
}
