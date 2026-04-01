/**
 * 出运日期范围子查询 - 统一组件
 * 所有按「出运日期在 [startDate, endDate] 内」筛选的统计均由此组件提供，避免重复实现。
 */

import { Repository, SelectQueryBuilder } from 'typeorm';
import { Container } from '../../../entities/Container';
import { getScopedCountryCode } from '../../../utils/requestContext';
import { normalizeCountryCode } from '../../../utils/countryCode';
import { DateFilterBuilder } from './DateFilterBuilder';
import { ContainerQueryBuilder } from './ContainerQueryBuilder';
import { RAW_O_CUSTOMER_JOIN_ON, TYPEORM_O_CUSTOMER_JOIN_ON } from './customerCountryMatchSql';
import { parseIsoDateOnlyForFilter } from '../../../utils/dateTimeUtils';

/**
 * TypeORM 版：创建「出运日期在 [startDate, endDate] 内」且可选「国家」的货柜号子查询
 * 国家：sell_to_country 与 biz_customers.customer_name 关联取 cust.country，过滤 cust.country = :countryCode
 * 用于 mainQuery.andWhere('container.containerNumber IN (subquery)').setParameters(subquery.getParameters())
 */
export function createDateRangeSubQuery(
  containerRepository: Repository<Container>,
  startDate: string,
  endDate: string,
  countryCode?: string
): SelectQueryBuilder<Container> {
  const startDay = parseIsoDateOnlyForFilter(startDate);
  const endDay = parseIsoDateOnlyForFilter(endDate);
  const qb = containerRepository
    .createQueryBuilder('c')
    .select('DISTINCT c.containerNumber')
    .leftJoin('c.replenishmentOrders', 'o')
    .leftJoin('c.seaFreight', 'sf')
    .where(
      'CAST(COALESCE(o.actualShipDate, o.expectedShipDate, sf.shipmentDate) AS date) >= CAST(:startDate AS date)',
      { startDate: startDay ?? startDate }
    )
    .andWhere(
      'CAST(COALESCE(o.actualShipDate, o.expectedShipDate, sf.shipmentDate) AS date) <= CAST(:endDate AS date)',
      { endDate: endDay ?? endDate }
    );

  const raw =
    (countryCode !== undefined && countryCode !== null
      ? String(countryCode).trim()
      : getScopedCountryCode()) || '';
  const code = normalizeCountryCode(raw);
  if (code) {
    qb.leftJoin('biz_customers', 'cust', TYPEORM_O_CUSTOMER_JOIN_ON).andWhere(
      'cust.country = :countryCode',
      {
        countryCode: code
      }
    );
  }
  return qb;
}

/**
 * Raw SQL 版：返回子查询 SQL 与参数（占位符 $1=startDate, $2=endDate；若有国家则 $3=countryCode）
 * 用于与模板 SQL 组合：WHERE t.container_number IN (sql)
 */
export function getDateRangeSubqueryRaw(
  startDate: string,
  endDate: string,
  countryCode?: string
): { sql: string; params: any[] } {
  const startDay = parseIsoDateOnlyForFilter(startDate) ?? startDate;
  const endDay = parseIsoDateOnlyForFilter(endDate) ?? endDate;
  const params: any[] = [startDay, endDay];
  const raw =
    (countryCode !== undefined && countryCode !== null
      ? String(countryCode).trim()
      : getScopedCountryCode()) || '';
  const code = normalizeCountryCode(raw);
  let sql = `SELECT DISTINCT c.container_number FROM biz_containers c
LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
LEFT JOIN biz_customers cust ON ${RAW_O_CUSTOMER_JOIN_ON.replace(/\s+/g, ' ').trim()}
WHERE COALESCE(o.actual_ship_date, o.expected_ship_date, sf.shipment_date)::date >= $1::date
AND COALESCE(o.actual_ship_date, o.expected_ship_date, sf.shipment_date)::date <= $2::date`;
  if (code) {
    params.push(code);
    sql += ` AND cust.country = $3`;
  }
  return { sql, params };
}

/**
 * 为已带 order/sf 的 TypeORM 查询应用出运日期与国家筛选
 * - 若提供 startDate 且 endDate：用 IN (子查询)，并合并 extraParams
 * - 否则：调用 DateFilterBuilder.addDateFilters
 * - countryCode 传入子查询或由调用方在无子查询时用 DateFilterBuilder.addCountryFilters
 */
export function applyDateFilterToQuery(
  query: SelectQueryBuilder<any>,
  containerRepository: Repository<Container>,
  startDate?: string,
  endDate?: string,
  extraParams?: Record<string, unknown>,
  countryCode?: string
): void {
  if (startDate && endDate) {
    const subQuery = createDateRangeSubQuery(containerRepository, startDate, endDate, countryCode);
    query.andWhere(`container.containerNumber IN (${subQuery.getQuery()})`).setParameters({
      ...subQuery.getParameters(),
      ...(extraParams || {})
    });
  } else {
    ContainerQueryBuilder.addDateFilters(query, startDate, endDate);
    DateFilterBuilder.addCountryFilters(query, countryCode);
  }
}
