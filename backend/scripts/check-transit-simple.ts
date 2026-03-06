import { Client } from 'pg';
const client = new Client({
  host: 'localhost', port: 5432, database: 'logix_db',
  user: 'logix_user', password: 'LogiX@2024!Secure'
});
client.connect().then(() => {
  return client.query(`
    SELECT
      c.container_number,
      c.logistics_status,
      po_dest.port_name as dest_port_name,
      po_dest.ata_dest_port as dest_ata,
      po_dest.eta_dest_port as dest_eta,
      po_transit.port_name as transit_port_name,
      po_transit.ata_dest_port as transit_ata,
      po_transit.eta_dest_port as transit_eta
    FROM biz_containers c
    INNER JOIN process_port_operations po_dest ON c.container_number = po_dest.container_number
      AND po_dest.port_type = 'destination'
      AND po_dest.port_sequence = (
        SELECT MAX(p2.port_sequence)
        FROM process_port_operations p2
        WHERE p2.container_number = c.container_number
        AND p2.port_type = 'destination'
      )
    LEFT JOIN process_port_operations po_transit ON c.container_number = po_transit.container_number
      AND po_transit.port_type = 'transit'
    WHERE po_dest.ata_dest_port IS NULL
    AND c.logistics_status = 'at_port'
    ORDER BY c.container_number
  `);
}).then(result => {
  console.log('\n"今日之前到港无ATA"分类分析：');
  console.log('='.repeat(120));
  console.log('柜子号'.padEnd(15) + '目的港'.padEnd(20) + '目的港ATA'.padEnd(15) + '中转港'.padEnd(20) + '中转港ATA'.padEnd(15));
  console.log('='.repeat(120));
  let hasTransit = 0, noTransit = 0, transitWithATA = 0;
  result.rows.forEach(row => {
    if (row.transit_port_name) {
      hasTransit++;
      const transitATA = row.transit_ata ? row.transit_ata.toISOString().split('T')[0] : 'NULL';
      console.log(row.container_number.padEnd(15) + (row.dest_port_name || 'N/A').padEnd(20) + 'NULL'.padEnd(15) + row.transit_port_name.padEnd(20) + transitATA.padEnd(15));
      if (row.transit_ata) transitWithATA++;
    } else {
      noTransit++;
    }
  });
  console.log('='.repeat(120));
  console.log('有中转港记录: ' + hasTransit + ' 个');
  console.log('有中转港ATA: ' + transitWithATA + ' 个');
  console.log('无中转港记录: ' + noTransit + ' 个');
  console.log('总计: ' + result.rows.length + ' 个');
  client.end();
}).catch(err => { console.error(err); client.end(); });
