const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'logix_user',
  password: 'LogiX@2024!Secure',
  database: 'logix_db'
});

async function main() {
  await client.connect();

  // 1. 查询 ext_feituo_status_events 表
  console.log('=== ext_feituo_status_events 数据 ===\n');
  const events = await client.query(`
    SELECT container_number, bill_of_lading_number, event_code, event_time,
           description_cn, event_place, is_estimated, port_code, data_source
    FROM ext_feituo_status_events
    ORDER BY container_number, event_time
    LIMIT 20
  `);

  for (const row of events.rows) {
    console.log(`Container: ${row.container_number}`);
    console.log(`  BOL: ${row.bill_of_lading_number}`);
    console.log(`  Code: ${row.event_code}, Time: ${row.event_time}, Desc: ${row.description_cn}`);
    console.log(`  Place: ${row.event_place}, IsEst: ${row.is_estimated}`);
    console.log(`  PortCode: ${row.port_code}, Source: ${row.data_source}`);
    console.log('---');
  }

  // 2. 统计总数
  const countResult = await client.query('SELECT COUNT(*) as total FROM ext_feituo_status_events');
  console.log(`\n总计: ${countResult.rows[0].total} 条记录`);

  // 3. 按货柜统计
  console.log('\n=== 各货柜状态事件数量 ===');
  const stats = await client.query(`
    SELECT container_number, COUNT(*) as cnt
    FROM ext_feituo_status_events
    GROUP BY container_number
    ORDER BY cnt DESC
    LIMIT 10
  `);
  for (const row of stats.rows) {
    console.log(`  ${row.container_number}: ${row.cnt} 条`);
  }

  // 4. 检查相关业务表数据
  console.log('\n=== 相关业务表数据 ===');

  const containers = await client.query(`
    SELECT container_number, logistics_status, bill_of_lading_number
    FROM biz_containers
    ORDER BY container_number
    LIMIT 10
  `);
  console.log('\nbiz_containers:');
  for (const row of containers.rows) {
    console.log(`  ${row.container_number}: status=${row.logistics_status}, BOL=${row.bill_of_lading_number}`);
  }

  const portOps = await client.query(`
    SELECT container_number, port_type, port_name, ata, eta, dest_port_unload_date
    FROM process_port_operations
    WHERE port_type = 'destination'
    ORDER BY container_number
    LIMIT 10
  `);
  console.log('\nprocess_port_operations (destination):');
  for (const row of portOps.rows) {
    console.log(`  ${row.container_number}: port=${row.port_name}, ATA=${row.ata}, ETA=${row.eta}`);
  }

  const statusEvents = await client.query(`
    SELECT container_number, status_code, occurred_at, description
    FROM container_status_events
    ORDER BY container_number, occurred_at
    LIMIT 10
  `);
  console.log('\ncontainer_status_events:');
  for (const row of statusEvents.rows) {
    console.log(`  ${row.container_number}: ${row.status_code} @ ${row.occurred_at}`);
  }

  await client.end();
}

main().catch(console.error);
