import { AppDataSource } from '../src/database';
import { initDatabase, closeDatabase } from '../src/database';

async function main() {
  try {
    // 初始化数据库连接
    await initDatabase();
    console.log('✅ 数据库连接成功');
    
    // 检查 dict_trucking_companies 表结构
    console.log('\n=== 检查 dict_trucking_companies 表结构 ===');
    const truckingColumns = await AppDataSource.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'dict_trucking_companies'
       ORDER BY ordinal_position`
    );
    console.log('dict_trucking_companies 表字段:');
    truckingColumns.forEach((column: any) => {
      console.log(`   ${column.column_name} (${column.data_type})`);
    });
    
    // 检查 dict_warehouses 表结构
    console.log('\n=== 检查 dict_warehouses 表结构 ===');
    const warehouseColumns = await AppDataSource.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'dict_warehouses'
       ORDER BY ordinal_position`
    );
    console.log('dict_warehouses 表字段:');
    warehouseColumns.forEach((column: any) => {
      console.log(`   ${column.column_name} (${column.data_type})`);
    });
    
    // 检查 dict_trucking_port_mapping 表结构
    console.log('\n=== 检查 dict_trucking_port_mapping 表结构 ===');
    const portMappingColumns = await AppDataSource.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'dict_trucking_port_mapping'
       ORDER BY ordinal_position`
    );
    console.log('dict_trucking_port_mapping 表字段:');
    portMappingColumns.forEach((column: any) => {
      console.log(`   ${column.column_name} (${column.data_type})`);
    });
    
    // 检查 dict_warehouse_trucking_mapping 表结构
    console.log('\n=== 检查 dict_warehouse_trucking_mapping 表结构 ===');
    const warehouseMappingColumns = await AppDataSource.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'dict_warehouse_trucking_mapping'
       ORDER BY ordinal_position`
    );
    console.log('dict_warehouse_trucking_mapping 表字段:');
    warehouseMappingColumns.forEach((column: any) => {
      console.log(`   ${column.column_name} (${column.data_type})`);
    });
    
  } catch (error) {
    console.error('检查表结构时发生错误:', error);
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
