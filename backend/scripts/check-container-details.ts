import { AppDataSource } from '../src/database';
import { initDatabase, closeDatabase } from '../src/database';

async function main() {
  try {
    // 初始化数据库连接
    await initDatabase();
    console.log('✅ 数据库连接成功');
    
    // 检查待排产货柜的详细信息，包括 replenishmentOrders 和 customer
    console.log('\n=== 检查待排产货柜详情 ===');
    const containers = await AppDataSource.query(
      `SELECT c.container_number, 
              ro.sell_to_country, 
              cu.customer_name, 
              cu.country as customer_country, 
              po.port_code, 
              po.port_name
       FROM biz_containers c
       LEFT JOIN biz_replenishment_orders ro ON ro.container_number = c.container_number
       LEFT JOIN biz_customers cu ON ro.customer_code = cu.customer_code
       LEFT JOIN process_port_operations po ON po.container_number = c.container_number
       WHERE c.schedule_status = 'initial' AND po.port_type = 'destination'
       LIMIT 5`
    );
    
    console.log(`找到 ${containers.length} 个待排产货柜:`);
    for (const container of containers) {
      console.log(`\n货柜号: ${container.container_number}`);
      console.log(`销售国家: ${container.sell_to_country}`);
      console.log(`客户名称: ${container.customer_name}`);
      console.log(`客户国家: ${container.customer_country}`);
      console.log(`目的港: ${container.port_name} (${container.port_code})`);
      
      // 检查港口→车队映射
      if (container.port_code && container.customer_country) {
        const portMappings = await AppDataSource.query(
          `SELECT trucking_company_id, trucking_company_name
           FROM dict_trucking_port_mapping
           WHERE port_code = $1 AND country = $2 AND is_active = true`,
          [container.port_code, container.customer_country]
        );
        
        console.log(`港口 ${container.port_code} 在 ${container.customer_country} 的车队映射数: ${portMappings.length}`);
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
            [truckingCompanyIds, container.customer_country]
          );
          
          console.log(`这些车队在 ${container.customer_country} 的仓库映射数: ${warehouseMappings.length}`);
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
      } else {
        console.log('❌ 缺少必要的信息:');
        if (!container.port_code) console.log('   - 目的港代码为空');
        if (!container.customer_country) console.log('   - 客户国家为空');
      }
    }
    
  } catch (error) {
    console.error('检查货柜详情时发生错误:', error);
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
