import { AppDataSource } from '../src/database';
import { initDatabase, closeDatabase } from '../src/database';

async function main() {
  try {
    // 初始化数据库连接
    await initDatabase();
    console.log('✅ 数据库连接成功');
    
    // 检查 biz_containers 表结构
    console.log('\n=== 检查 biz_containers 表结构 ===');
    const containerColumns = await AppDataSource.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'biz_containers'
       ORDER BY ordinal_position`
    );
    console.log('biz_containers 表字段:');
    containerColumns.forEach((column: any) => {
      console.log(`   ${column.column_name} (${column.data_type})`);
    });
    
    // 检查 process_port_operations 表结构
    console.log('\n=== 检查 process_port_operations 表结构 ===');
    const portColumns = await AppDataSource.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'process_port_operations'
       ORDER BY ordinal_position`
    );
    console.log('process_port_operations 表字段:');
    portColumns.forEach((column: any) => {
      console.log(`   ${column.column_name} (${column.data_type})`);
    });
    
    // 检查待排产货柜的详细信息
    console.log('\n=== 检查待排产货柜详情 ===');
    const containers = await AppDataSource.query(
      `SELECT c.container_number, c.sell_to_country as country, 
              po.port_code, po.port_name
       FROM biz_containers c
       JOIN process_port_operations po ON po.container_number = c.container_number
       WHERE c.schedule_status = 'initial' AND po.port_type = 'destination'
       LIMIT 10`
    );
    
    console.log(`找到 ${containers.length} 个待排产货柜:`);
    containers.forEach((container: any, index: number) => {
      console.log(`${index + 1}. 货柜号: ${container.container_number}`);
      console.log(`   国家: ${container.country}`);
      console.log(`   目的港: ${container.port_name} (${container.port_code})`);
    });
    
    // 检查每个货柜的映射关系
    for (const container of containers) {
      console.log(`\n=== 检查货柜 ${container.container_number} 的映射关系 ===`);
      
      // 检查港口→车队映射
      const portMappings = await AppDataSource.query(
        `SELECT trucking_company_id, trucking_company_name
         FROM dict_trucking_port_mapping
         WHERE port_code = $1 AND country = $2 AND is_active = true`,
        [container.port_code, container.country]
      );
      
      console.log(`港口 ${container.port_code} 在 ${container.country} 的车队映射数: ${portMappings.length}`);
      if (portMappings.length > 0) {
        console.log('映射的车队:');
        portMappings.forEach((mapping: any, index: number) => {
          console.log(`   ${index + 1}. ${mapping.trucking_company_name} (${mapping.trucking_company_id})`);
        });
        
        // 提取车队 ID
        const truckingCompanyIds = portMappings.map((m: any) => m.trucking_company_id);
        
        // 检查车队→仓库映射
        const warehouseMappings = await AppDataSource.query(
          `SELECT warehouse_code, warehouse_name
           FROM dict_warehouse_trucking_mapping
           WHERE trucking_company_id = ANY($1) AND country = $2 AND is_active = true`,
          [truckingCompanyIds, container.country]
        );
        
        console.log(`这些车队在 ${container.country} 的仓库映射数: ${warehouseMappings.length}`);
        if (warehouseMappings.length > 0) {
          console.log('映射的仓库:');
          warehouseMappings.forEach((mapping: any, index: number) => {
            console.log(`   ${index + 1}. ${mapping.warehouse_name} (${mapping.warehouse_code})`);
          });
        } else {
          console.log('❌ 没有找到对应的仓库映射');
        }
      } else {
        console.log('❌ 没有找到对应的港口→车队映射');
      }
    }
    
  } catch (error) {
    console.error('检查排产问题时发生错误:', error);
  } finally {
    // 关闭数据库连接
    try {
      await closeDatabase();
      console.log('\n✅ 数据库连接已关闭');
    } catch (error) {
      console.error('关闭数据库连接时发生错误:', error);
    }
  }
}

main();
