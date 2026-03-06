import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'logix_db',
  user: 'logix_user',
  password: 'LogiX@2024!Secure'
});

async function testTransitETADistribution() {
  try {
    await client.connect();

    console.log('\n========================================');
    console.log('已到中转港按ETA分布统计测试');
    console.log('========================================\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const plus3Days = new Date(today);
    plus3Days.setDate(plus3Days.getDate() + 3);
    const plus7Days = new Date(today);
    plus7Days.setDate(plus7Days.getDate() + 7);

    // 1. 已到中转港总数
    const totalTransitResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.ata_dest_port IS NULL
      AND po.eta_dest_port IS NOT NULL
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND EXISTS (
        SELECT 1
        FROM process_port_operations transit_po
        WHERE transit_po.container_number = c.container_number
        AND transit_po.port_type = 'transit'
      )
    `);

    console.log(`已到中转港总数: ${totalTransitResult.rows[0].count}`);

    // 2. 已逾期（ETA < 今日）
    const overdueResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.ata_dest_port IS NULL
      AND po.eta_dest_port IS NOT NULL
      AND DATE(po.eta_dest_port) < $1
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND EXISTS (
        SELECT 1
        FROM process_port_operations transit_po
        WHERE transit_po.container_number = c.container_number
        AND transit_po.port_type = 'transit'
      )
    `, [today]);

    console.log(`已逾期（ETA < 今日）: ${overdueResult.rows[0].count}`);

    // 3. 3天内预计到港（ETA 在 0-3 天内）
    const within3DaysResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.ata_dest_port IS NULL
      AND po.eta_dest_port IS NOT NULL
      AND DATE(po.eta_dest_port) >= $1
      AND DATE(po.eta_dest_port) <= $2
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND EXISTS (
        SELECT 1
        FROM process_port_operations transit_po
        WHERE transit_po.container_number = c.container_number
        AND transit_po.port_type = 'transit'
      )
    `, [today, plus3Days]);

    console.log(`3天内预计到港: ${within3DaysResult.rows[0].count}`);

    // 4. 7天内预计到港（ETA 在 3-7 天内）
    const within7DaysResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.ata_dest_port IS NULL
      AND po.eta_dest_port IS NOT NULL
      AND DATE(po.eta_dest_port) > $1
      AND DATE(po.eta_dest_port) <= $2
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND EXISTS (
        SELECT 1
        FROM process_port_operations transit_po
        WHERE transit_po.container_number = c.container_number
        AND transit_po.port_type = 'transit'
      )
    `, [plus3Days, plus7Days]);

    console.log(`7天内预计到港: ${within7DaysResult.rows[0].count}`);

    // 5. 7天后预计到港（ETA > 7 天）
    const over7DaysResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.ata_dest_port IS NULL
      AND po.eta_dest_port IS NOT NULL
      AND DATE(po.eta_dest_port) > $1
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND EXISTS (
        SELECT 1
        FROM process_port_operations transit_po
        WHERE transit_po.container_number = c.container_number
        AND transit_po.port_type = 'transit'
      )
    `, [plus7Days]);

    console.log(`7天后预计到港: ${over7DaysResult.rows[0].count}`);

    // 6. 无ETA记录
    const noETAResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.ata_dest_port IS NULL
      AND po.eta_dest_port IS NULL
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND EXISTS (
        SELECT 1
        FROM process_port_operations transit_po
        WHERE transit_po.container_number = c.container_number
        AND transit_po.port_type = 'transit'
      )
    `);

    console.log(`无ETA记录: ${noETAResult.rows[0].count}`);

    // 汇总验证
    const total = parseInt(totalTransitResult.rows[0].count);
    const overdue = parseInt(overdueResult.rows[0].count);
    const within3 = parseInt(within3DaysResult.rows[0].count);
    const within7 = parseInt(within7DaysResult.rows[0].count);
    const over7 = parseInt(over7DaysResult.rows[0].count);
    const noETA = parseInt(noETAResult.rows[0].count);

    console.log('\n========================================');
    console.log('汇总验证');
    console.log('========================================');
    console.log(`总计: ${total}`);
    console.log(`已逾期: ${overdue}`);
    console.log(`3天内: ${within3}`);
    console.log(`7天内: ${within7}`);
    console.log(`7天后: ${over7}`);
    console.log(`无ETA: ${noETA}`);
    console.log(`----------------------------------------`);
    const sum = overdue + within3 + within7 + over7 + noETA;
    console.log(`分类汇总: ${sum}`);
    console.log(`差异: ${total - sum}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testTransitETADistribution();
