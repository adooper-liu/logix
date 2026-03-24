import { AppDataSource } from '../src/database';
import { initDatabase, closeDatabase } from '../src/database';

async function main() {
  try {
    // 初始化数据库连接
    await initDatabase();
    console.log('✅ 数据库连接成功');
    
    // 检查 biz_replenishment_orders 表的结构
    console.log('\n=== 检查 biz_replenishment_orders 表结构 ===');
    const columns = await AppDataSource.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'biz_replenishment_orders'
       ORDER BY ordinal_position`
    );
    console.log('biz_replenishment_orders 表字段:');
    columns.forEach((column: any) => {
      console.log(`   ${column.column_name} (${column.data_type})`);
    });
    
    // 检查待排产货柜的备货单信息
    console.log('\n=== 检查待排产货柜的备货单信息 ===');
    const orders = await AppDataSource.query(
      `SELECT c.container_number, 
              ro.order_number, 
              ro.sell_to_country, 
              ro.customer_code, 
              ro.customer_name
       FROM biz_containers c
       LEFT JOIN biz_replenishment_orders ro ON ro.container_number = c.container_number
       WHERE c.schedule_status = 'initial'
       LIMIT 10`
    );
    
    console.log(`找到 ${orders.length} 个备货单:`);
    orders.forEach((order: any, index: number) => {
      console.log(`${index + 1}. 货柜号: ${order.container_number}`);
      console.log(`   备货单号: ${order.order_number}`);
      console.log(`   销售国家: ${order.sell_to_country}`);
      console.log(`   客户代码: ${order.customer_code}`);
      console.log(`   客户名称: ${order.customer_name}`);
    });
    
    // 检查 biz_customers 表中是否有 GB 相关的记录
    console.log('\n=== 检查 biz_customers 表中的 GB 相关记录 ===');
    const customers = await AppDataSource.query(
      `SELECT customer_code, customer_name, country
       FROM biz_customers
       WHERE country = 'GB' OR customer_name LIKE '%GB%' OR customer_code LIKE '%GB%'
       LIMIT 10`
    );
    
    console.log(`找到 ${customers.length} 个 GB 相关的客户记录:`);
    customers.forEach((customer: any, index: number) => {
      console.log(`${index + 1}. 客户代码: ${customer.customer_code}`);
      console.log(`   客户名称: ${customer.customer_name}`);
      console.log(`   国家: ${customer.country}`);
    });
    
    // 检查 dict_trucking_port_mapping 表中是否有 GB 相关的记录
    console.log('\n=== 检查 dict_trucking_port_mapping 表中的 GB 相关记录 ===');
    const portMappings = await AppDataSource.query(
      `SELECT id, country, trucking_company_id, trucking_company_name, port_code, port_name
       FROM dict_trucking_port_mapping
       WHERE country = 'GB'
       LIMIT 10`
    );
    
    console.log(`找到 ${portMappings.length} 个 GB 相关的港口映射记录:`);
    portMappings.forEach((mapping: any, index: number) => {
      console.log(`${index + 1}. 国家: ${mapping.country}`);
      console.log(`   车队: ${mapping.trucking_company_name} (${mapping.trucking_company_id})`);
      console.log(`   港口: ${mapping.port_name} (${mapping.port_code})`);
    });
    
    // 检查 dict_warehouse_trucking_mapping 表中是否有 GB 相关的记录
    console.log('\n=== 检查 dict_warehouse_trucking_mapping 表中的 GB 相关记录 ===');
    const warehouseMappings = await AppDataSource.query(
      `SELECT id, country, warehouse_code, warehouse_name, trucking_company_id, trucking_company_name
       FROM dict_warehouse_trucking_mapping
       WHERE country = 'GB'
       LIMIT 10`
    );
    
    console.log(`找到 ${warehouseMappings.length} 个 GB 相关的仓库映射记录:`);
    warehouseMappings.forEach((mapping: any, index: number) => {
      console.log(`${index + 1}. 国家: ${mapping.country}`);
      console.log(`   仓库: ${mapping.warehouse_name} (${mapping.warehouse_code})`);
      console.log(`   车队: ${mapping.trucking_company_name} (${mapping.trucking_company_id})`);
    });
    
  } catch (error) {
    console.error('检查备货单信息时发生错误:', error);
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
