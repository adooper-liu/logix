import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'logix_db',
  user: 'logix_user',
  password: 'LogiX@2024!Secure'
});

async function checkTransitInfo() {
  try {
    await client.connect();

    const query = `
      SELECT
        c.container_number,
        c.logistics_status,
        -- 目的港信息
        po_dest.port_name as dest_port_name,
        po_dest.ata_dest_port as dest_ata,
        po_dest.eta_dest_port as dest_eta,
        po_dest.port_sequence as dest_sequence,
        -- 中转港信息
        po_transit.port_name as transit_port_name,
        po_transit.ata_dest_port as transit_ata,
        po_transit.eta_dest_port as transit_eta,
        po_transit.port_sequence as transit_sequence
      FROM biz_containers c
      -- 主要目的港
      INNER JOIN process_port_operations po_dest ON c.container_number = po_dest.container_number
        AND po_dest.port_type = 'destination'
        AND po_dest.port_sequence = (
          SELECT MAX(p2.port_sequence)
          FROM process_port_operations p2
          WHERE p2.container_number = c.container_number
          AND p2.port_type = 'destination'
        )
      -- 是否有中转港记录
      LEFT JOIN process_port_operations po_transit ON c.container_number = po_transit.container_number
        AND po_transit.port_type = 'transit'
      WHERE po_dest.ata_dest_port IS NULL
      AND c.logistics_status = 'at_port'
      ORDER BY c.container_number
    `;

    const result = await client.query(query);

    console.log('\n"今日之前到港无ATA"分类分析：');
    console.log('='.repeat(120));
    console.log('柜子号'.padEnd(15) + '目的港'.padEnd(20) + '目的港ATA'.padEnd(15) + '中转港'.padEnd(20) + '中转港ATA'.padEnd(15));
    console.log('='.repeat(120));

    let hasTransit = 0;
    let noTransit = 0;
    let transitWithATA = 0;

    result.rows.forEach(row => {
      if (row.transit_port_name) {
        hasTransit++;
        const transitATA = row.transit_ata ? row.transit_ata.toISOString().split('T')[0] : 'NULL';
        console.log(
          row.container_number.padEnd(15) +
          (row.dest_port_name || 'N/A').padEnd(20) +
          'NULL'.padEnd(15) +
          row.transit_port_name.padEnd(20) +
          transitATA.padEnd(15)
        );
        if (row.transit_ata) {
          transitWithATA++;
        }
      } else {
        noTransit++;
      }
    });

    console.log('='.repeat(120));
    console.log('有中转港记录: ' + hasTransit + ' 个');
    console.log('有中转港ATA: ' + transitWithATA + ' 个');
    console.log('无中转港记录: ' + noTransit + ' 个');
    console.log('总计: ' + result.rows.length + ' 个');

    console.log('\n分析结论：');
    console.log('- 如果柜子有中转港记录且有中转港ATA，说明实际已到中转港，但尚未到目的港');
    console.log('- 这类柜子应该归类为"已到中转港"或归入"预计在途"分类中');
    console.log('- 当前归类为"今日之前到港无ATA"是错误的，因为目的港尚未到达');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkTransitInfo();
