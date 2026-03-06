import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'logix_db',
  user: 'logix_user',
  password: 'LogiX@2024!Secure'
});

async function testArrivalStatistics() {
  try {
    await client.connect();

    console.log('\n========================================');
    console.log('测试修正后的到港统计逻辑');
    console.log('========================================\n');

    // 测试1: 今日到港
    const result1 = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND po.ata_dest_port IS NOT NULL
      AND DATE(po.ata_dest_port) = CURRENT_DATE
    `);
    console.log(`1. 今日到港: ${result1.rows[0].count}`);

    // 测试2: 今日之前到港未提柜
    const result2 = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND po.ata_dest_port IS NOT NULL
      AND DATE(po.ata_dest_port) < CURRENT_DATE
      AND c.logistics_status NOT IN ('picked_up', 'unloaded', 'returned_empty')
    `);
    console.log(`2. 今日之前到港未提柜: ${result2.rows[0].count}`);

    // 测试3: 今日之前到港已提柜
    const result3 = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND po.ata_dest_port IS NOT NULL
      AND DATE(po.ata_dest_port) < CURRENT_DATE
      AND c.logistics_status IN ('picked_up', 'unloaded', 'returned_empty')
    `);
    console.log(`3. 今日之前到港已提柜: ${result3.rows[0].count}`);

    // 测试4: 已到中转港（新增分类）
    const result4 = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND po.ata_dest_port IS NULL
      AND po.eta_dest_port IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM process_port_operations po2
        WHERE po2.container_number = c.container_number
        AND po2.port_type = 'transit'
      )
    `);
    console.log(`4. 已到中转港: ${result4.rows[0].count}`);

    // 测试5: 今日之前到港无ATA（修正后的逻辑）
    const result5 = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND po.ata_dest_port IS NULL
      AND po.eta_dest_port IS NULL
      AND c.logistics_status IN ('at_port', 'picked_up', 'unloaded', 'returned_empty')
      AND NOT EXISTS (
        SELECT 1 FROM process_port_operations po2
        WHERE po2.container_number = c.container_number
        AND po2.port_type = 'transit'
      )
    `);
    console.log(`5. 今日之前到港无ATA: ${result5.rows[0].count}`);

    const total = parseInt(result1.rows[0].count) + parseInt(result2.rows[0].count) + parseInt(result3.rows[0].count) + parseInt(result4.rows[0].count) + parseInt(result5.rows[0].count);
    console.log(`\n总计: ${total}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testArrivalStatistics();
