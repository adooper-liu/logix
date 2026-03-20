/**
 * 备货单 ↔ biz_customers 关联条件（列表 EXISTS / 统计子查询 / TypeORM join 共用）
 * sell_to_country 多为子公司名称，大小写与空格需容错；订单侧 customer_name 可作备用路径。
 */

/** Raw SQL：别名 ro + cust（列表 EXISTS） */
export const RAW_RO_CUSTOMER_JOIN_ON = `(
  (ro.sell_to_country IS NOT NULL AND LOWER(TRIM(ro.sell_to_country)) = LOWER(TRIM(cust.customer_name)))
  OR (ro.customer_name IS NOT NULL AND LOWER(TRIM(ro.customer_name)) = LOWER(TRIM(cust.customer_name)))
  OR (ro.customer_code IS NOT NULL AND LOWER(TRIM(ro.customer_code)) = LOWER(TRIM(cust.customer_code)))
)`;

/** Raw SQL：别名 o + cust（getDateRangeSubqueryRaw） */
export const RAW_O_CUSTOMER_JOIN_ON = `(
  (o.sell_to_country IS NOT NULL AND LOWER(TRIM(o.sell_to_country)) = LOWER(TRIM(cust.customer_name)))
  OR (o.customer_name IS NOT NULL AND LOWER(TRIM(o.customer_name)) = LOWER(TRIM(cust.customer_name)))
  OR (o.customer_code IS NOT NULL AND LOWER(TRIM(o.customer_code)) = LOWER(TRIM(cust.customer_code)))
)`;

/** TypeORM join：别名 o + cust（createDateRangeSubQuery） */
export const TYPEORM_O_CUSTOMER_JOIN_ON = `(
  (o.sellToCountry IS NOT NULL AND LOWER(TRIM(cust.customerName)) = LOWER(TRIM(o.sellToCountry)))
  OR (o.customerName IS NOT NULL AND LOWER(TRIM(cust.customerName)) = LOWER(TRIM(o.customerName)))
  OR (o.customerCode IS NOT NULL AND LOWER(TRIM(cust.customerCode)) = LOWER(TRIM(o.customerCode)))
)`;

/** TypeORM join：别名 order + cust（addCountryFilters） */
export const TYPEORM_ORDER_CUSTOMER_JOIN_ON = `(
  (order.sellToCountry IS NOT NULL AND LOWER(TRIM(cust.customerName)) = LOWER(TRIM(order.sellToCountry)))
  OR (order.customerName IS NOT NULL AND LOWER(TRIM(cust.customerName)) = LOWER(TRIM(order.customerName)))
  OR (order.customerCode IS NOT NULL AND LOWER(TRIM(cust.customerCode)) = LOWER(TRIM(order.customerCode)))
)`;
