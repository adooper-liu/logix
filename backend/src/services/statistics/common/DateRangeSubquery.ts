/**
 * 出运日期范围子查询 - 统一组件
 * 所有按「出运日期在 [startDate, endDate] 内」筛选的统计均由此组件提供，避免重复实现。
 */

import { SelectQueryBuilder } from 'typeorm';
import { Repository } from 'typeorm';
import { Container } from '../../../entities/Container';
import { DateFilterBuilder } from './DateFilterBuilder';
import { ContainerQueryBuilder } from './ContainerQueryBuilder';

/** 出运日期 endDate 使用当天 23:59:59.999 */
function toEndDateEnd(endDate: string): Date {
  const d = new Date(endDate);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * TypeORM 版：创建「出运日期在 [startDate, endDate] 内」的货柜号子查询
 * 用于 mainQuery.andWhere('container.containerNumber IN (subquery)').setParameters(subquery.getParameters())
 */
export function createDateRangeSubQuery(
  containerRepository: Repository<Container>,
  startDate: string,
  endDate: string
): SelectQueryBuilder<Container> {
  return containerRepository
    .createQueryBuilder('c')
    .select('DISTINCT c.containerNumber')
    .leftJoin('c.replenishmentOrders', 'o')
    .leftJoin('c.seaFreight', 'sf')
    .where(
      '(o.actualShipDate >= :startDate OR (o.actualShipDate IS NULL AND sf.shipmentDate >= :startDate))',
      { startDate: new Date(startDate) }
    )
    .andWhere(
      '(o.actualShipDate <= :endDate OR (o.actualShipDate IS NULL AND sf.shipmentDate <= :endDate))',
      { endDate: toEndDateEnd(endDate) }
    );
}

/**
 * Raw SQL 版：返回子查询 SQL 与参数（占位符 $1=startDate, $2=endDate）
 * 用于与模板 SQL 组合：WHERE t.container_number IN (sql)
 */
export function getDateRangeSubqueryRaw(startDate: string, endDate: string): { sql: string; params: any[] } {
  const sql = `SELECT c.container_number FROM biz_containers c
LEFT JOIN biz_replenishment_orders o ON o.container_number = c.container_number
LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
WHERE (o.actual_ship_date >= $1 OR (o.actual_ship_date IS NULL AND sf.shipment_date >= $1))
AND (o.actual_ship_date <= $2 OR (o.actual_ship_date IS NULL AND sf.shipment_date <= $2))`;
  return { sql, params: [new Date(startDate), toEndDateEnd(endDate)] };
}

/**
 * 为已带 order/sf 的 TypeORM 查询应用出运日期筛选
 * - 若提供 startDate 且 endDate：用 IN (子查询)，并合并 extraParams
 * - 否则：调用 DateFilterBuilder.addDateFilters
 */
export function applyDateFilterToQuery(
  query: SelectQueryBuilder<any>,
  containerRepository: Repository<Container>,
  startDate?: string,
  endDate?: string,
  extraParams?: Record<string, unknown>
): void {
  if (startDate && endDate) {
    const subQuery = createDateRangeSubQuery(containerRepository, startDate, endDate);
    query.andWhere(`container.containerNumber IN (${subQuery.getQuery()})`).setParameters({
      ...subQuery.getParameters(),
      ...(extraParams || {})
    });
  } else {
    ContainerQueryBuilder.addDateFilters(query, startDate, endDate);
  }
}

