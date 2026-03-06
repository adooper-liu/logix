import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'logix_db',
  user: 'logix_user',
  password: 'LogiX@2024!Secure'
});

async function analyzeArrivalFixed2() {
  try {
    await client.connect();

    console.log('\n========================================');
    console.log('按到港统计完整分类分析（修正版2）');
    console.log('========================================\n');

    // 总体目标：所有有目的港记录的货柜
    const totalDestResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
    `);
    console.log(`1. 总目标：所有有目的港记录的货柜`);
    console.log(`   数量: ${totalDestResult.rows[0].count}\n`);

    // 分类1：今日到港（目的港有ATA且ATA=今日）
    const arrivedTodayResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
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
    console.log(`2. 今日到港（目的港有ATA且ATA=今日）`);
    console.log(`   数量: ${arrivedTodayResult.rows[0].count}\n`);

    // 分类2：今日之前到港且未提柜（目的港有ATA且ATA<今日且未提柜）
    const arrivedBeforeNotPickedUpResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
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
    console.log(`3. 今日之前到港且未提柜（目的港ATA<今日）`);
    console.log(`   数量: ${arrivedBeforeNotPickedUpResult.rows[0].count}\n`);

    // 分类3：今日之前到港且已提柜（目的港有ATA且ATA<今日且已提柜）
    const arrivedBeforePickedUpResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
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
    console.log(`4. 今日之前到港且已提柜（目的港ATA<今日）`);
    console.log(`   数量: ${arrivedBeforePickedUpResult.rows[0].count}\n`);

    // 分类4：已到中转港（有中转港记录，目的港无ATA，有ETA）
    const arrivedTransitResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
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
      AND po.eta_dest_port IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM process_port_operations po2
        WHERE po2.container_number = c.container_number
        AND po2.port_type = 'transit'
      )
    `);
    console.log(`5. 已到中转港（有中转港记录，目的港无ATA，有ETA）`);
    console.log(`   数量: ${arrivedTransitResult.rows[0].count}\n`);

    // 分类5：逾期未到港（ETA<今日且未到港，无中转港）
    const overdueNotArrivedResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND po.eta_dest_port IS NOT NULL
      AND DATE(po.eta_dest_port) < CURRENT_DATE
      AND po.ata_dest_port IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM process_port_operations po2
        WHERE po2.container_number = c.container_number
        AND po2.port_type = 'transit'
      )
    `);
    console.log(`6. 逾期未到港（ETA<今日且未到港，无中转港）`);
    console.log(`   数量: ${overdueNotArrivedResult.rows[0].count}\n`);

    // 分类6：预计在途（ETA>=今日且未到港，无中转港）
    const inTransitResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND po.eta_dest_port IS NOT NULL
      AND DATE(po.eta_dest_port) >= CURRENT_DATE
      AND po.ata_dest_port IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM process_port_operations po2
        WHERE po2.container_number = c.container_number
        AND po2.port_type = 'transit'
      )
    `);
    console.log(`7. 预计在途（ETA>=今日且未到港，无中转港）`);
    console.log(`   数量: ${inTransitResult.rows[0].count}\n`);

    // 分类7：今日之前到港但无ATA（目的港无ATA无ETA，无中转港）
    const arrivedBeforeNoATAResult = await client.query(`
      SELECT COUNT(DISTINCT c.container_number) as count
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
      AND po.eta_dest_port IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM process_port_operations po2
        WHERE po2.container_number = c.container_number
        AND po2.port_type = 'transit'
      )
    `);
    console.log(`8. 今日之前到港但无ATA（目的港无ATA无ETA，无中转港）`);
    console.log(`   数量: ${arrivedBeforeNoATAResult.rows[0].count}\n`);

    // 验证总和
    const total = parseInt(totalDestResult.rows[0].count);
    const arrivedToday = parseInt(arrivedTodayResult.rows[0].count);
    const arrivedBeforeNotPickedUp = parseInt(arrivedBeforeNotPickedUpResult.rows[0].count);
    const arrivedBeforePickedUp = parseInt(arrivedBeforePickedUpResult.rows[0].count);
    const arrivedTransit = parseInt(arrivedTransitResult.rows[0].count);
    const arrivedBeforeNoATA = parseInt(arrivedBeforeNoATAResult.rows[0].count);
    const overdueNotArrived = parseInt(overdueNotArrivedResult.rows[0].count);
    const inTransitCount = parseInt(inTransitResult.rows[0].count);

    console.log('========================================');
    console.log('汇总验证');
    console.log('========================================');
    console.log(`总数 (1):                          ${total}`);
    console.log(`今日到港 (2):                      ${arrivedToday}`);
    console.log(`今日之前到港未提柜 (3):            ${arrivedBeforeNotPickedUp}`);
    console.log(`今日之前到港已提柜 (4):            ${arrivedBeforePickedUp}`);
    console.log(`已到中转港 (5):                    ${arrivedTransit}`);
    console.log(`逾期未到港 (6):                    ${overdueNotArrived}`);
    console.log(`预计在途 (7):                      ${inTransitCount}`);
    console.log(`今日之前到港无ATA (8):             ${arrivedBeforeNoATA}`);
    console.log(`----------------------------------------`);
    const sum = arrivedToday + arrivedBeforeNotPickedUp + arrivedBeforePickedUp + arrivedTransit + arrivedBeforeNoATA + overdueNotArrived + inTransitCount;
    console.log(`分类汇总 (2+3+4+5+6+7+8):         ${sum}`);
    console.log(`差异:                              ${total - sum}`);
    console.log('========================================\n');

    // 分析有ETA的已到中转港柜子的ETA分布
    console.log('========================================');
    console.log('已到中转港柜子的ETA分布');
    console.log('========================================\n');

    const transitETADistribution = await client.query(`
      SELECT
        CASE
          WHEN DATE(po.eta_dest_port) < CURRENT_DATE THEN 'ETA<今日（逾期）'
          WHEN DATE(po.eta_dest_port) = CURRENT_DATE THEN 'ETA=今日'
          WHEN DATE(po.eta_dest_port) BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days' THEN '0-3天内'
          WHEN DATE(po.eta_dest_port) BETWEEN CURRENT_DATE + INTERVAL '3 days' AND CURRENT_DATE + INTERVAL '6 days' THEN '3-7天内'
          WHEN DATE(po.eta_dest_port) > CURRENT_DATE + INTERVAL '6 days' THEN '7天后'
        END as eta_group,
        COUNT(DISTINCT c.container_number) as count
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
      AND po.eta_dest_port IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM process_port_operations po2
        WHERE po2.container_number = c.container_number
        AND po2.port_type = 'transit'
      )
      GROUP BY eta_group
      ORDER BY eta_group
    `);

    transitETADistribution.rows.forEach(row => {
      console.log(`${row.eta_group}: ${row.count}个柜子`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

analyzeArrivalFixed2();
