import { AppDataSource } from '../src/database';

async function checkStatusDistribution() {
  await AppDataSource.initialize();
  
  const result = await AppDataSource.query(`
    SELECT 
      logistics_status,
      COUNT(*) as count
    FROM biz_containers
    GROUP BY logistics_status
    ORDER BY logistics_status
  `);
  
  console.log('状态分布统计:');
  console.table(result);
  
  console.log('\n已还箱货柜详细数据:');
  const returnedEmpty = await AppDataSource.query(`
    SELECT 
      c.container_number,
      c.logistics_status,
      er.return_time,
      wo.wms_status,
      wo.ebs_status,
      wo.wms_confirm_date
    FROM biz_containers c
    LEFT JOIN process_empty_returns er ON c.container_number = er.container_number
    LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
    WHERE c.logistics_status = 'returned_empty'
    LIMIT 5
  `);
  console.table(returnedEmpty);
  
  await AppDataSource.destroy();
}

checkStatusDistribution().catch(console.error);
