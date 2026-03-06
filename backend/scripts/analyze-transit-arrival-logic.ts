import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'logix_db',
  user: 'logix_user',
  password: 'LogiX@2024!Secure'
});

async function analyzeTransitArrivalLogic() {
  try {
    await client.connect();

    console.log('\n========================================');
    console.log('分析"今日之前到港无ATA"柜子的港口情况');
    console.log('========================================\n');

    // 查询这46个柜子的所有港口记录
    const containers = await client.query(`
      SELECT c.container_number, c.logistics_status,
             po.port_type, po.port_sequence, po.port_name,
             po.eta_dest_port, po.ata_dest_port,
             o.order_number
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      LEFT JOIN biz_replenishment_orders o ON c.order_number = o.order_number
      WHERE c.container_number IN (
        'CAAU9304575', 'CAIU4622771', 'CAIU7554752', 'CLKU5013554', 'FFAU1712851',
        'FFAU4028185', 'FFAU5830805', 'HASU4262160', 'HASU5047624', 'HMMU4141780',
        'HMMU4257933', 'HMMU4650339', 'HMMU4742266', 'HMMU4744171', 'HMMU4744633',
        'HMMU4754159', 'KOCU4449845', 'KOCU5018502', 'MRKU3444614', 'MRKU5262054',
        'MRSU3733332', 'MRSU7893030', 'MSBU5432170', 'MSDU7009798', 'MSDU7885255',
        'MSKU0675165', 'MSKU1175837', 'MSKU9538841', 'MSMU4245230', 'MSMU4283923',
        'MSMU4405786', 'MSMU5896909', 'MSMU6090081', 'MSMU6525688', 'MSMU6975303',
        'MSMU7907303', 'MSMU8076713', 'MSMU8485434', 'SELU4095577', 'TCLU6435185',
        'TEMU7092534', 'TEMU8463033', 'TIIU4429744', 'TRHU8205011', 'TXGU8883825',
        'UETU7670557'
      )
      ORDER BY c.container_number, po.port_sequence
    `);

    console.log('港口记录详情:');
    console.log('柜号 | 港口类型 | 序号 | 港口名称 | ATA | ETA');
    console.log('---|---|---|---|---|---');
    containers.rows.forEach(row => {
      console.log(`${row.container_number} | ${row.port_type} | ${row.port_sequence} | ${row.port_name} | ${row.ata_dest_port || 'NULL'} | ${row.eta_dest_port || 'NULL'}`);
    });

    // 统计每个柜子的港口记录类型
    console.log('\n========================================');
    console.log('每个柜子的港口记录统计');
    console.log('========================================\n');

    const containerStats = await client.query(`
      SELECT c.container_number, c.logistics_status,
             COUNT(*) as total_ports,
             COUNT(CASE WHEN po.port_type = 'transit' THEN 1 END) as transit_count,
             COUNT(CASE WHEN po.port_type = 'destination' THEN 1 END) as dest_count,
             COUNT(CASE WHEN po.port_type = 'destination' AND po.ata_dest_port IS NOT NULL THEN 1 END) as dest_ata_count,
             MAX(CASE WHEN po.port_type = 'destination' THEN po.eta_dest_port END) as dest_eta
      FROM biz_containers c
      INNER JOIN process_port_operations po ON c.container_number = po.container_number
      WHERE c.container_number IN (
        'CAAU9304575', 'CAIU4622771', 'CAIU7554752', 'CLKU5013554', 'FFAU1712851',
        'FFAU4028185', 'FFAU5830805', 'HASU4262160', 'HASU5047624', 'HMMU4141780',
        'HMMU4257933', 'HMMU4650339', 'HMMU4742266', 'HMMU4744171', 'HMMU4744633',
        'HMMU4754159', 'KOCU4449845', 'KOCU5018502', 'MRKU3444614', 'MRKU5262054',
        'MRSU3733332', 'MRSU7893030', 'MSBU5432170', 'MSDU7009798', 'MSDU7885255',
        'MSKU0675165', 'MSKU1175837', 'MSKU9538841', 'MSMU4245230', 'MSMU4283923',
        'MSMU4405786', 'MSMU5896909', 'MSMU6090081', 'MSMU6525688', 'MSMU6975303',
        'MSMU7907303', 'MSMU8076713', 'MSMU8485434', 'SELU4095577', 'TCLU6435185',
        'TEMU7092534', 'TEMU8463033', 'TIIU4429744', 'TRHU8205011', 'TXGU8883825',
        'UETU7670557'
      )
      GROUP BY c.container_number, c.logistics_status
      ORDER BY c.container_number
    `);

    console.log('柜号 | 物流状态 | 总港口数 | 中转港数 | 目的港数 | 目的港有ATA | 目的港ETA');
    console.log('---|---|---|---|---|---|---');
    containerStats.rows.forEach(row => {
      console.log(`${row.container_number} | ${row.logistics_status} | ${row.total_ports} | ${row.transit_count} | ${row.dest_count} | ${row.dest_ata_count} | ${row.dest_eta || 'NULL'}`);
    });

    // 提出修正方案
    console.log('\n========================================');
    console.log('修正方案建议');
    console.log('========================================\n');
    console.log('问题分析:');
    console.log('  - 这46个柜子的logistics_status=at_port，但实际只到达中转港');
    console.log('  - 它们有目的港记录且有ETA，但目的港没有ATA（还没到）');
    console.log('  - 当前错误归入"今日之前到港无ATA"（指目的港）');
    console.log('');
    console.log('修正方案A: 增加新分类"已到中转港"');
    console.log('  - 分类条件: logistics_status=at_port AND 存在中转港记录 AND 目的港无ATA');
    console.log('  - 优点: 清晰区分中转和目的港状态');
    console.log('  - 缺点: 增加分类数量，需要相应的前端显示支持');
    console.log('');
    console.log('修正方案B: 归入"预计在途"（按ETA分组）');
    console.log('  - 分类条件: 有目的港ETA AND 目的港无ATA');
    console.log('  - 优点: 不增加分类，按ETA分组统计更合理');
    console.log('  - 缺点: 与logistics_status=at_port语义冲突');
    console.log('');
    console.log('推荐: 方案A，增加"已到中转港"分类，避免语义混淆');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

analyzeTransitArrivalLogic();
