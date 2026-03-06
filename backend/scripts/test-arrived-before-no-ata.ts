import { AppDataSource } from '../src/database/index.js';

async function testQuery() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const containerRepository = AppDataSource.getRepository('Container');

    // 测试简化版本的SQL
    const testSql = `
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.ata_dest_port IS NULL
      AND c.logistics_status = 'at_port'
    `;

    console.log('Testing SQL:', testSql);
    const result = await containerRepository.query(testSql);
    console.log('Test result:', result);

    // 测试完整版本的SQL
    const fullSql = `
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      LEFT JOIN replenishment_orders o ON c.order_number = o.order_number
      LEFT JOIN sea_freight sf ON c.container_number = sf.container_number
      WHERE po.port_type = 'destination'
      AND po.ata_dest_port IS NULL
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND c.logistics_status = 'at_port'
      AND NOT EXISTS (
        SELECT 1
        FROM process_port_operations transit_po
        WHERE transit_po.container_number = c.container_number
        AND transit_po.port_type = 'transit'
        AND transit_po.ata_dest_port IS NOT NULL
      )
    `;

    console.log('Testing full SQL...');
    const fullResult = await containerRepository.query(fullSql);
    console.log('Full result:', fullResult);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testQuery();
