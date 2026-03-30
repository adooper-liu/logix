---
name: TypeORM EXISTS Subquery Solution
project: logix
description: Use EXISTS subqueries in TypeORM to fix PostgreSQL errors with SELECT DISTINCT + ORDER BY and duplicate JOIN issues in count queries
---

# TypeORM EXISTS Subquery Solution

## Problem Description

When using TypeORM with PostgreSQL for complex queries involving LEFT JOINs, two common errors occur:

1. **Error 42P10**: `SELECT DISTINCT ... ORDER BY "container"."updated_at"` - PostgreSQL doesn't allow ORDER BY columns that aren't in the SELECT list when using DISTINCT
2. **Error 42712**: `table name "order" specified more than once` - When building count queries, repeated leftJoin() calls cause alias conflicts

## Root Cause

### Problem 1: DISTINCT + ORDER BY Incompatibility
- TypeORM's pagination generates `SELECT DISTINCT container.containerNumber` to handle LEFT JOINs
- But ORDER BY uses `container.updatedAt` which isn't in the SELECT list
- PostgreSQL strictly prohibits this pattern

### Problem 2: Duplicate JOIN in Count Queries
- When calculating totals, we often build a separate count query
- If date filters and search conditions each add their own leftJoin('order'), the "order" alias gets duplicated
- TypeORM doesn't deduplicate JOINs, causing SQL syntax errors

## Solution: EXISTS Subqueries

Instead of LEFT JOINing related tables, use EXISTS subqueries in WHERE clauses:

```typescript
// Instead of:
query.leftJoin('container.replenishmentOrders', 'order')
  .where('order.expectedShipDate >= :date', { date })

// Use:
query.whereExists(subQb => {
  subQb.select('1')
    .from('biz_replenishment_orders', 'ro')
    .where('ro.container_number = container.containerNumber')
    .andWhere('ro.expected_ship_date >= :date', { date });
});
```

### Benefits

1. **No JOIN in main query** - Avoids DISTINCT + ORDER BY issues
2. **No alias conflicts** - Each EXISTS is self-contained
3. **Reusable conditions** - The same EXISTS logic works for both data query and count query
4. **Better performance** - EXISTS often performs better than LEFT JOIN for existence checks

## Implementation

### Date Filtering with EXISTS

```typescript
// In DateFilterBuilder.ts
static addDateFiltersAsExists(
  query: SelectQueryBuilder<any>,
  startDate?: string,
  endDate?: string
): SelectQueryBuilder<any> {
  if (!startDate && !endDate) return query;

  const parts: string[] = [];
  const params: Record<string, unknown> = {};

  if (startDate) {
    parts.push(
      '(ro.expected_ship_date >= :startDate OR (ro.expected_ship_date IS NULL AND ro.actual_ship_date >= :startDate2) OR (ro.expected_ship_date IS NULL AND ro.actual_ship_date IS NULL AND sf2.shipment_date >= :startDate3))'
    );
    const s = new Date(startDate);
    params.startDate = s;
    params.startDate2 = s;
    params.startDate3 = s;
  }
  if (endDate) {
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999);
    parts.push(
      '(ro.expected_ship_date <= :endDate OR (ro.expected_ship_date IS NULL AND ro.actual_ship_date <= :endDate2) OR (ro.expected_ship_date IS NULL AND ro.actual_ship_date IS NULL AND sf2.shipment_date <= :endDate3))'
    );
    params.endDate = endDateObj;
    params.endDate2 = endDateObj;
    params.endDate3 = endDateObj;
  }

  const whereClause = parts.join(' AND ');

  query.andWhere(
    `EXISTS (
      SELECT 1 FROM biz_replenishment_orders ro
      LEFT JOIN process_sea_freight sf2 ON sf2.bill_of_lading_number = "container"."bill_of_lading_number"
      WHERE ro.container_number = "container"."container_number"
      AND ${whereClause}
    )`,
    params
  );
  return query;
}
```

### Count Query with Clone

```typescript
// In ContainerDataService.ts
async getContainersForList(params: ListParams) {
  const qb = ContainerQueryBuilder.createListQuery(this.containerRepository, params);
  
  // Get data
  const containers = await qb
    .skip((params.page - 1) * params.pageSize)
    .take(params.pageSize)
    .getMany();
  
  // Use clone().getCount() to ensure identical conditions
  const total = await qb.clone().getCount();
  
  return { items: containers, total };
}
```

## Key Principles

1. **Avoid LEFT JOIN in list queries** - Use EXISTS for filtering
2. **Use qb.clone().getCount()** - Ensure count and data queries have identical conditions
3. **Separate enrichment** - Do LEFT JOINs only in enrich step, not in main list query
4. **Test both paths** - With and without date filters

## Debugging Tips

If you encounter similar errors:

1. **Check SQL logs** - Enable TypeORM logging to see generated SQL
2. **Test in psql** - Copy the generated SQL and test directly in PostgreSQL
3. **Simplify query** - Remove conditions one by one to isolate the problem
4. **Verify alias usage** - Ensure no table alias is used multiple times in JOINs

## Related Files

- `backend/src/services/statistics/common/ContainerQueryBuilder.ts`
- `backend/src/services/statistics/common/DateFilterBuilder.ts`
- `backend/src/services/ContainerDataService.ts`
- `backend/src/services/statistics/common/DateRangeSubquery.ts` (for subquery templates)
