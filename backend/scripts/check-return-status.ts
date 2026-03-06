import { AppDataSource } from './src/database';

async function checkReturnStatus() {
  await AppDataSource.initialize();
  
  const result = await AppDataSource.query(`
    SELECT 
      c.container_number,
      c.logistics_status as current_status,
      er.return_time,
      wo.wms_status,
      wo.ebs_status,
      wo.wms_confirm_date,
      CASE 
        WHEN er.return_time IS NOT NULL THEN '已还箱'
        WHEN wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL THEN '已卸柜'
        ELSE '其他'
      END as expected_status
    FROM biz_containers c
    LEFT JOIN process_empty_returns er ON c.container_number = er.container_number
    LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
    WHERE er.return_time IS NOT NULL
    LIMIT 20
  `);
  
  console.log('已还箱货柜数据:');
  console.table(result);
  
  // 检查当前状态为已卸柜的货柜中，哪些实际有还箱记录
  const unloadedWithReturn = await AppDataSource.query(`
    SELECT 
      c.container_number,
      c.logistics_status as current_status,
      er.return_time,
      wo.wms_status,
      wo.ebs_status,
      wo.wms_confirm_date
    FROM biz_containers c
    LEFT JOIN process_empty_returns er ON c.container_number = er.container_number
    LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
    WHERE c.logistics_status = 'unloaded'
    AND er.return_time IS NOT NULL
    LIMIT 20
  `);
  
  console.log('\n状态错误的货柜 (应该是已还箱,但状态是已卸柜):');
  console.table(unloadedWithReturn);
  
  await AppDataSource.destroy();
}

checkReturnStatus().catch(console.error);
