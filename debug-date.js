const { AppDataSource } = require('./backend/src/database');

async function main() {
  await AppDataSource.initialize();

  // 检查货柜与备货单的关联
  const result = await AppDataSource.query(`
    SELECT c.container_number, c.logistics_status, o.order_number, o.expected_ship_date, o.actual_ship_date, o.sell_to_country
    FROM biz_containers c
    LEFT JOIN biz_replenishment_orders o ON c.order_number = o.order_number
    WHERE c.container_number IN ('ECMU5397691', 'ECMU5381817', 'ECMU5399797', 'ECMU5400183', 'ECMU5399586')
  `);

  console.log('Container-Order relationships:');
  console.log(JSON.stringify(result, null, 2));

  // 检查 expected_ship_date 在 2026-01-01 到 2026-01-31 范围内的货柜
  const result2 = await AppDataSource.query(`
    SELECT c.container_number, o.order_number, o.expected_ship_date, o.actual_ship_date, sf.shipment_date
    FROM biz_containers c
    LEFT JOIN biz_replenishment_orders o ON c.order_number = o.order_number
    LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
    WHERE (o.expected_ship_date >= '2026-01-01' AND o.expected_ship_date <= '2026-01-31 23:59:59')
       OR (o.expected_ship_date IS NULL AND o.actual_ship_date >= '2026-01-01' AND o.actual_ship_date <= '2026-01-31 23:59:59')
       OR (o.expected_ship_date IS NULL AND o.actual_ship_date IS NULL AND sf.shipment_date >= '2026-01-01' AND sf.shipment_date <= '2026-01-31 23:59:59')
    LIMIT 10
  `);

  console.log('\nContainers in date range 2026-01-01 to 2026-01-31:');
  console.log(JSON.stringify(result2, null, 2));

  process.exit(0);
}

main().catch(console.error);
