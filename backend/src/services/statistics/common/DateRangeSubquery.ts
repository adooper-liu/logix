/**
 * 出运日期范围子查询 - 统一组件
 * 所有按「出运日期在 [startDate, endDate] 内」筛选的统计均由此组件提供，避免重复实现。
 */

import { SelectQueryBuilder } from 'typeorm';
import { Repository } from 'typeorm';
import { Container } from '../../../entities/Container';
import { getScopedCountryCode } from '../../../utils/requestContext';
import { normalizeCountryCode } from '../../../utils/countryCode';
import { DateFilterBuilder } from './DateFilterBuilder';
import { ContainerQueryBuilder } from './ContainerQueryBuilder';

/** 出运日期 endDate 使用当天 23:59:59.999 */
function toEndDateEnd(endDate: string): Date {
  const d = new Date(endDate);
  d.setHours(23, 59, 59, 999);
  return d;
}

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
  const qb = containerRepository
    .createQueryBuilder('c')
    .select('DISTINCT c.containerNumber')
    .leftJoin('c.replenishmentOrders', 'o')
    .leftJoin('c.seaFreight', 'sf')
    .where(
      '(o.expectedShipDate >= :startDate OR (o.expectedShipDate IS NULL AND o.actualShipDate >= :startDate2) OR (o.expectedShipDate IS NULL AND o.actualShipDate IS NULL AND sf.shipmentDate >= :startDate3))',
      { startDate: new Date(startDate), startDate2: new Date(startDate), startDate3: new Date(startDate) }
    )
    .andWhere(
      '(o.expectedShipDate <= :endDate OR (o.expectedShipDate IS NULL AND o.actualShipDate <= :endDate2) OR (o.expectedShipDate IS NULL AND o.actualShipDate IS NULL AND sf.shipmentDate <= :endDate3))',
      { endDate: toEndDateEnd(endDate), endDate2: toEndDateEnd(endDate), endDate3: toEndDateEnd(endDate) }
    );

  const raw = (countryCode !== undefined && countryCode !== null ? String(countryCode).trim() : getScopedCountryCode()) || '';
  const code = normalizeCountryCode(raw);
  if (code) {
    qb.leftJoin('biz_customers', 'cust', 'cust.customer_name = o.sell_to_country').andWhere('cust.country = :countryCode', {
      countryCode: code
    });
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
  const params: any[] = [new Date(startDate), toEndDateEnd(endDate)];
  const raw = (countryCode !== undefined && countryCode !== null ? String(countryCode).trim() : getScopedCountryCode()) || '';
  const code = normalizeCountryCode(raw);
  let sql = `SELECT DISTINCT c.container_number FROM biz_containers c
LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
LEFT JOIN biz_customers cust ON cust.customer_name = o.sell_to_country
WHERE (o.expected_ship_date >= $1 OR (o.expected_ship_date IS NULL AND o.actual_ship_date >= $1) OR (o.expected_ship_date IS NULL AND o.actual_ship_date IS NULL AND sf.shipment_date >= $1))
AND (o.expected_ship_date <= $2 OR (o.expected_ship_date IS NULL AND o.actual_ship_date <= $2) OR (o.expected_ship_date IS NULL AND o.actual_ship_date IS NULL AND sf.shipment_date <= $2))`;
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

