import { AppDataSource } from '../src/database';

async function querySTCSData() {
  await AppDataSource.initialize();

  console.log('=== 查询 HMMU6232153 的 STCS 状态事件 ===\n');

  // 查询 ext_container_status_events
  const events = await AppDataSource.query(`
    SELECT 
      id,
      container_number,
      status_code,
      status_name,
      occurred_at,
      data_source,
      created_at
    FROM ext_container_status_events 
    WHERE container_number = 'HMMU6232153' 
    AND status_code = 'STCS'
    ORDER BY occurred_at DESC
  `);

  console.log('ext_container_status_events 表中的 STCS 事件:');
  console.log(JSON.stringify(events, null, 2));
  console.log('\n');

  // 查询 ext_feituo_status_events（飞驼表可能没有 STCS 记录）
  console.log('跳过 ext_feituo_status_events 查询（飞驼表结构不同）');
  /*
  const feituoEvents = await AppDataSource.query(`
    SELECT 
      id,
      container_number,
      status_code,
      status_name,
      occurred_at,
      source_data,
      created_at
    FROM ext_feituo_status_events 
    WHERE container_number = 'HMMU6232153' 
    AND status_code = 'STCS'
    ORDER BY occurred_at DESC
  `);
  
  console.log('ext_feituo_status_events 表中的 STCS 事件:');
  console.log(JSON.stringify(feituoEvents, null, 2));
  console.log('\n');
  */

  // 查询流程表
  const processTables = await AppDataSource.query(`
    SELECT 
      c.container_number,
      po.gate_out_time,
      po.port_type,
      tt.pickup_date,
      tt.trucking_company_id
    FROM biz_containers c
    LEFT JOIN process_port_operations po ON c.container_number = po.container_number
    LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
    WHERE c.container_number = 'HMMU6232153'
  `);

  console.log('流程表中的数据:');
  console.log(JSON.stringify(processTables, null, 2));
  console.log('\n');

  // 查询所有状态事件（不限 STCS）
  const allEvents = await AppDataSource.query(`
    SELECT 
      status_code,
      occurred_at,
      data_source,
      COUNT(*) as count
    FROM ext_container_status_events 
    WHERE container_number = 'HMMU6232153'
    GROUP BY status_code, occurred_at, data_source
    ORDER BY occurred_at DESC
  `);

  console.log('该货柜的所有状态事件统计:');
  console.log(JSON.stringify(allEvents, null, 2));

  await AppDataSource.destroy();
}

querySTCSData().catch(console.error);
