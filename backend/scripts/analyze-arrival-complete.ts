import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'logix_db',
  user: 'logix_user',
  password: 'LogiX@2024!Secure'
});

async function analyzeArrivalComplete() {
  try {
    await client.connect();

    console.log('\n========================================');
    console.log('按到港统计完整分类（包含所有货柜）');
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
    console.log(`总数: ${totalDestResult.rows[0].count} 个货柜\n`);

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
    console.log(`1. 今日到港（有ATA且ATA=今日）: ${arrivedTodayResult.rows[0].count}`);

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
    console.log(`2. 今日之前到港未提柜（ATA<今日且status!=picked_up等）: ${arrivedBeforeNotPickedUpResult.rows[0].count}`);

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
    console.log(`3. 今日之前到港已提柜（ATA<今日且status=picked_up等）: ${arrivedBeforePickedUpResult.rows[0].count}`);

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
    console.log(`4. 今日之前到港无ATA（无ATA但status=at_port等）: ${arrivedBeforeNoATAResult.rows[0].count}`);

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
    console.log(`5. 逾期未到港（ETA<今日且未到港）: ${overdueNotArrivedResult.rows[0].count}`);

    // 分类6：预计在途（ETA>=今日且未到港）
    const etaInTransitResult = await client.query(`
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
      AND c.logistics_status IN ('shipped', 'in_transit')
    `);
    console.log(`6. 预计在途（ETA>=今日且未到港）: ${etaInTransitResult.rows[0].count}`);

    // 分类7：无ETA无ATA的未出运货柜
    const noEtaNoATAResult = await client.query(`
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
      AND po.eta_dest_port IS NULL
      AND po.ata_dest_port IS NULL
      AND c.logistics_status NOT IN ('at_port', 'picked_up', 'unloaded', 'returned_empty')
    `);
    console.log(`7. 无ETA无ATA（未出运货柜）: ${noEtaNoATAResult.rows[0].count}\n`);

    // 验证总和
    const total = parseInt(totalDestResult.rows[0].count);
    const arrivedToday = parseInt(arrivedTodayResult.rows[0].count);
    const arrivedBeforeNotPickedUp = parseInt(arrivedBeforeNotPickedUpResult.rows[0].count);
    const arrivedBeforePickedUp = parseInt(arrivedBeforePickedUpResult.rows[0].count);
    const arrivedBeforeNoATA = parseInt(arrivedBeforeNoATAResult.rows[0].count);
    const overdueNotArrived = parseInt(overdueNotArrivedResult.rows[0].count);
    const etaInTransit = parseInt(etaInTransitResult.rows[0].count);
    const noEtaNoATA = parseInt(noEtaNoATAResult.rows[0].count);

    const sum = arrivedToday + arrivedBeforeNotPickedUp + arrivedBeforePickedUp +
                arrivedBeforeNoATA + overdueNotArrived + etaInTransit + noEtaNoATA;

    console.log('========================================');
    console.log('汇总验证');
    console.log('========================================');
    console.log(`总数:                              ${total}`);
    console.log(`分类汇总:                          ${sum}`);
    console.log(`差异:                              ${total - sum}`);
    console.log('========================================\n');

    // 输出SQL查询文档
    console.log('========================================');
    console.log('按到港统计SQL查询（按到港维度）');
    console.log('========================================\n');

    console.log('-- 总数：所有有目的港记录的货柜');
    console.log('SELECT COUNT(DISTINCT c.container_number)');
    console.log('FROM biz_containers c');
    console.log('INNER JOIN process_port_operations po ON c.container_number = po.container_number');
    console.log('WHERE po.port_type = \'destination\'');
    console.log('AND po.port_sequence = (');
    console.log('  SELECT MAX(po2.port_sequence)');
    console.log('  FROM process_port_operations po2');
    console.log('  WHERE po2.container_number = po.container_number');
    console.log('  AND po2.port_type = \'destination\'');
    console.log(');\n');

    console.log('-- 分类1：今日到港');
    console.log('SELECT COUNT(DISTINCT c.container_number)');
    console.log('FROM biz_containers c');
    console.log('INNER JOIN process_port_operations po ON c.container_number = po.container_number');
    console.log('WHERE po.port_type = \'destination\'');
    console.log('AND po.port_sequence = (');
    console.log('  SELECT MAX(po2.port_sequence)');
    console.log('  FROM process_port_operations po2');
    console.log('  WHERE po2.container_number = po.container_number');
    console.log('  AND po2.port_type = \'destination\'');
    console.log(')');
    console.log('AND po.ata_dest_port IS NOT NULL');
    console.log('AND DATE(po.ata_dest_port) = CURRENT_DATE;\n');

    console.log('-- 分类2：今日之前到港未提柜');
    console.log('SELECT COUNT(DISTINCT c.container_number)');
    console.log('FROM biz_containers c');
    console.log('INNER JOIN process_port_operations po ON c.container_number = po.container_number');
    console.log('WHERE po.port_type = \'destination\'');
    console.log('AND po.port_sequence = (');
    console.log('  SELECT MAX(po2.port_sequence)');
    console.log('  FROM process_port_operations po2');
    console.log('  WHERE po2.container_number = po.container_number');
    console.log('  AND po2.port_type = \'destination\'');
    console.log(')');
    console.log('AND po.ata_dest_port IS NOT NULL');
    console.log('AND DATE(po.ata_dest_port) < CURRENT_DATE');
    console.log('AND c.logistics_status NOT IN (\'picked_up\', \'unloaded\', \'returned_empty\');\n');

    console.log('-- 分类3：今日之前到港已提柜');
    console.log('SELECT COUNT(DISTINCT c.container_number)');
    console.log('FROM biz_containers c');
    console.log('INNER JOIN process_port_operations po ON c.container_number = po.container_number');
    console.log('WHERE po.port_type = \'destination\'');
    console.log('AND po.port_sequence = (');
    console.log('  SELECT MAX(po2.port_sequence)');
    console.log('  FROM process_port_operations po2');
    console.log('  WHERE po2.container_number = po.container_number');
    console.log('  AND po2.port_type = \'destination\'');
    console.log(')');
    console.log('AND po.ata_dest_port IS NOT NULL');
    console.log('AND DATE(po.ata_dest_port) < CURRENT_DATE');
    console.log('AND c.logistics_status IN (\'picked_up\', \'unloaded\', \'returned_empty\');\n');

    console.log('-- 分类4：今日之前到港无ATA');
    console.log('SELECT COUNT(DISTINCT c.container_number)');
    console.log('FROM biz_containers c');
    console.log('INNER JOIN process_port_operations po ON c.container_number = po.container_number');
    console.log('WHERE po.port_type = \'destination\'');
    console.log('AND po.port_sequence = (');
    console.log('  SELECT MAX(po2.port_sequence)');
    console.log('  FROM process_port_operations po2');
    console.log('  WHERE po2.container_number = po.container_number');
    console.log('  AND po2.port_type = \'destination\'');
    console.log(')');
    console.log('AND po.ata_dest_port IS NULL');
    console.log('AND c.logistics_status IN (\'at_port\', \'picked_up\', \'unloaded\', \'returned_empty\');\n');

    console.log('-- 分类5：逾期未到港');
    console.log('SELECT COUNT(DISTINCT c.container_number)');
    console.log('FROM biz_containers c');
    console.log('INNER JOIN process_port_operations po ON c.container_number = po.container_number');
    console.log('WHERE po.port_type = \'destination\'');
    console.log('AND po.port_sequence = (');
    console.log('  SELECT MAX(po2.port_sequence)');
    console.log('  FROM process_port_operations po2');
    console.log('  WHERE po2.container_number = po.container_number');
    console.log('  AND po2.port_type = \'destination\'');
    console.log(')');
    console.log('AND po.eta_dest_port IS NOT NULL');
    console.log('AND DATE(po.eta_dest_port) < CURRENT_DATE');
    console.log('AND po.ata_dest_port IS NULL');
    console.log('AND c.logistics_status IN (\'shipped\', \'in_transit\');\n');

    console.log('-- 分类6：预计在途（ETA>=今日且未到港）');
    console.log('SELECT COUNT(DISTINCT c.container_number)');
    console.log('FROM biz_containers c');
    console.log('INNER JOIN process_port_operations po ON c.container_number = po.container_number');
    console.log('WHERE po.port_type = \'destination\'');
    console.log('AND po.port_sequence = (');
    console.log('  SELECT MAX(po2.port_sequence)');
    console.log('  FROM process_port_operations po2');
    console.log('  WHERE po2.container_number = po.container_number');
    console.log('  AND po2.port_type = \'destination\'');
    console.log(')');
    console.log('AND po.eta_dest_port IS NOT NULL');
    console.log('AND DATE(po.eta_dest_port) >= CURRENT_DATE');
    console.log('AND po.ata_dest_port IS NULL');
    console.log('AND c.logistics_status IN (\'shipped\', \'in_transit\');\n');

    console.log('-- 分类7：无ETA无ATA');
    console.log('SELECT COUNT(DISTINCT c.container_number)');
    console.log('FROM biz_containers c');
    console.log('INNER JOIN process_port_operations po ON c.container_number = po.container_number');
    console.log('WHERE po.port_type = \'destination\'');
    console.log('AND po.port_sequence = (');
    console.log('  SELECT MAX(po2.port_sequence)');
    console.log('  FROM process_port_operations po2');
    console.log('  WHERE po2.container_number = po.container_number');
    console.log('  AND po2.port_type = \'destination\'');
    console.log(')');
    console.log('AND po.eta_dest_port IS NULL');
    console.log('AND po.ata_dest_port IS NULL');
    console.log('AND c.logistics_status NOT IN (\'at_port\', \'picked_up\', \'unloaded\', \'returned_empty\');\n');

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

analyzeArrivalComplete();
