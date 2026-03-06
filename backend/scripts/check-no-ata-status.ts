import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'logix_db',
  user: 'logix_user',
  password: 'LogiX@2024!Secure'
});

async function checkNoATAStatus() {
  try {
    await client.connect();

    console.log('\n========================================');
    console.log('今日之前到港无ATA（46个货柜）的物流状态');
    console.log('========================================\n');

    // 按状态分组统计
    const statusResult = await client.query(`
      SELECT c.logistics_status, COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND po.ata_dest_port IS NULL
      AND c.logistics_status IN ('at_port', 'picked_up', 'unloaded', 'returned_empty')
      GROUP BY c.logistics_status
      ORDER BY count DESC
    `);

    console.log('按状态分组统计:');
    statusResult.rows.forEach((row: any) => {
      console.log(`  ${row.logistics_status}: ${row.count} 个`);
    });

    console.log('\n详细货柜列表:');
    const detailResult = await client.query(`
      SELECT DISTINCT c.container_number, c.logistics_status,
             po.port_name, po.eta_dest_port, po.ata_dest_port,
             o.actual_ship_date, o.order_number
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      LEFT JOIN biz_replenishment_orders o ON c.order_number = o.order_number
      WHERE po.port_type = 'destination'
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND po.ata_dest_port IS NULL
      AND c.logistics_status IN ('at_port', 'picked_up', 'unloaded', 'returned_empty')
      ORDER BY c.logistics_status, c.container_number
      LIMIT 50
    `);

    console.log(`集装箱号\t\t物流状态\t\t目的港\t\tETA\t\tATA\t\t出运日期\t\t备货单号`);
    console.log(''.padEnd(120, '-'));

    detailResult.rows.forEach((row: any) => {
      const container = row.container_number.padEnd(20);
      const status = row.logistics_status.padEnd(16);
      const port = (row.port_name || 'N/A').padEnd(10);
      const eta = row.eta_dest_port ? row.eta_dest_port.toISOString().split('T')[0] : 'NULL'.padEnd(10);
      const ata = 'NULL'.padEnd(10);
      const shipDate = row.actual_ship_date ? row.actual_ship_date.toISOString().split('T')[0] : 'NULL'.padEnd(10);
      const order = row.order_number || 'N/A';

      console.log(`${container}${status}${port}${eta}${ata}${shipDate}\t\t${order}`);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkNoATAStatus();
