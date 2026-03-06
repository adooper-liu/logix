import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'logix_db',
  user: 'logix_user',
  password: 'LogiX@2024!Secure'
});

async function analyzeArrivalClassification() {
  try {
    await client.connect();

    console.log('\n========================================');
    console.log('按到港统计完整分类分析');
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

    // 分类1：今日到港
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
    console.log(`2. 今日到港（有ATA且ATA=今日）`);
    console.log(`   数量: ${arrivedTodayResult.rows[0].count}\n`);

    // 分类2：今日之前到港且未提柜
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
    console.log(`3. 今日之前到港且未提柜`);
    console.log(`   数量: ${arrivedBeforeNotPickedUpResult.rows[0].count}\n`);

    // 分类3：今日之前到港且已提柜
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
    console.log(`4. 今日之前到港且已提柜`);
    console.log(`   数量: ${arrivedBeforePickedUpResult.rows[0].count}\n`);

    // 分类4：今日之前到港但无ATA
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
      AND c.logistics_status IN ('at_port', 'picked_up', 'unloaded', 'returned_empty')
    `);
    console.log(`5. 今日之前到港但无ATA`);
    console.log(`   数量: ${arrivedBeforeNoATAResult.rows[0].count}\n`);

    // 分类5：逾期未到港
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
      AND c.logistics_status IN ('shipped', 'in_transit')
    `);
    console.log(`6. 逾期未到港（ETA<今日且未到港）`);
    console.log(`   数量: ${overdueNotArrivedResult.rows[0].count}\n`);

    // 验证总和
    const total = parseInt(totalDestResult.rows[0].count);
    const arrivedToday = parseInt(arrivedTodayResult.rows[0].count);
    const arrivedBeforeNotPickedUp = parseInt(arrivedBeforeNotPickedUpResult.rows[0].count);
    const arrivedBeforePickedUp = parseInt(arrivedBeforePickedUpResult.rows[0].count);
    const arrivedBeforeNoATA = parseInt(arrivedBeforeNoATAResult.rows[0].count);
    const overdueNotArrived = parseInt(overdueNotArrivedResult.rows[0].count);

    console.log('========================================');
    console.log('汇总验证');
    console.log('========================================');
    console.log(`总数 (1):                          ${total}`);
    console.log(`今日到港 (2):                      ${arrivedToday}`);
    console.log(`今日之前到港未提柜 (3):            ${arrivedBeforeNotPickedUp}`);
    console.log(`今日之前到港已提柜 (4):            ${arrivedBeforePickedUp}`);
    console.log(`今日之前到港无ATA (5):             ${arrivedBeforeNoATA}`);
    console.log(`逾期未到港 (6):                    ${overdueNotArrived}`);
    console.log(`----------------------------------------`);
    console.log(`分类汇总 (2+3+4+5):               ${arrivedToday + arrivedBeforeNotPickedUp + arrivedBeforePickedUp + arrivedBeforeNoATA}`);
    console.log(`全部汇总 (2+3+4+5+6):             ${arrivedToday + arrivedBeforeNotPickedUp + arrivedBeforePickedUp + arrivedBeforeNoATA + overdueNotArrived}`);
    console.log(`差异:                              ${total - (arrivedToday + arrivedBeforeNotPickedUp + arrivedBeforePickedUp + arrivedBeforeNoATA + overdueNotArrived)}`);
    console.log('========================================\n');

    // 分析缺失的货柜
    console.log('========================================');
    console.log('查找缺失的货柜（有目的港记录但未计入任何分类）');
    console.log('========================================');
    const missingContainersResult = await client.query(`
      SELECT DISTINCT c.container_number, c.logistics_status, po.ata_dest_port, po.eta_dest_port
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE po.port_type = 'destination'
      AND po.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po.container_number
        AND po2.port_type = 'destination'
      )
      AND NOT (
        -- 今日到港
        (po.ata_dest_port IS NOT NULL AND DATE(po.ata_dest_port) = CURRENT_DATE)
        OR
        -- 今日之前到港且未提柜
        (po.ata_dest_port IS NOT NULL AND DATE(po.ata_dest_port) < CURRENT_DATE AND c.logistics_status NOT IN ('picked_up', 'unloaded', 'returned_empty'))
        OR
        -- 今日之前到港且已提柜
        (po.ata_dest_port IS NOT NULL AND DATE(po.ata_dest_port) < CURRENT_DATE AND c.logistics_status IN ('picked_up', 'unloaded', 'returned_empty'))
        OR
        -- 今日之前到港但无ATA
        (po.ata_dest_port IS NULL AND c.logistics_status IN ('at_port', 'picked_up', 'unloaded', 'returned_empty'))
        OR
        -- 逾期未到港
        (po.eta_dest_port IS NOT NULL AND DATE(po.eta_dest_port) < CURRENT_DATE AND po.ata_dest_port IS NULL AND c.logistics_status IN ('shipped', 'in_transit'))
      )
      LIMIT 20
    `);

    if (missingContainersResult.rows.length > 0) {
      console.log('找到以下未分类的货柜:');
      missingContainersResult.rows.forEach(row => {
        console.log(`  - ${row.container_number}: status=${row.logistics_status}, ATA=${row.ata_dest_port || 'NULL'}, ETA=${row.eta_dest_port || 'NULL'}`);
      });
    } else {
      console.log('没有找到未分类的货柜，所有货柜都已正确分类！');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

analyzeArrivalClassification();
