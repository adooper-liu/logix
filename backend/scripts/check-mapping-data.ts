import { AppDataSource } from '../src/database';
import { initDatabase, closeDatabase } from '../src/database';

async function main() {
  try {
    // 初始化数据库连接
    await initDatabase();
    console.log('✅ 数据库连接成功');
    
    // 检查 dict_trucking_port_mapping 表
    console.log('\n=== 检查 dict_trucking_port_mapping 表 ===');
    const portMappingCount = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM dict_trucking_port_mapping WHERE is_active = true'
    );
    console.log(`活跃记录数: ${portMappingCount[0]?.count || 0}`);
    
    // 检查 dict_warehouse_trucking_mapping 表
    console.log('\n=== 检查 dict_warehouse_trucking_mapping 表 ===');
    const warehouseMappingCount = await AppDataSource.query(
      'SELECT COUNT(*) as count FROM dict_warehouse_trucking_mapping WHERE is_active = true'
    );
    console.log(`活跃记录数: ${warehouseMappingCount[0]?.count || 0}`);
    
    // 检查两个表的车队交集
    console.log('\n=== 检查车队交集 ===');
    const truckingCompaniesInPort = await AppDataSource.query(
      'SELECT DISTINCT trucking_company_id FROM dict_trucking_port_mapping WHERE is_active = true'
    );
    const truckingCompaniesInWarehouse = await AppDataSource.query(
      'SELECT DISTINCT trucking_company_id FROM dict_warehouse_trucking_mapping WHERE is_active = true'
    );
    
    const portTruckingIds = new Set(truckingCompaniesInPort.map((row: any) => row.trucking_company_id));
    const warehouseTruckingIds = new Set(truckingCompaniesInWarehouse.map((row: any) => row.trucking_company_id));
    
    const commonTruckingIds = new Set([...portTruckingIds].filter(id => warehouseTruckingIds.has(id)));
    
    console.log(`港口映射中的车队数: ${portTruckingIds.size}`);
    console.log(`仓库映射中的车队数: ${warehouseTruckingIds.size}`);
    console.log(`两个表共有的车队数: ${commonTruckingIds.size}`);
    
    // 检查是否有货柜需要排产
    console.log('\n=== 检查待排产货柜 ===');
    const containerCount = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM biz_containers c
       WHERE c.schedule_status = 'initial'
       AND EXISTS (
         SELECT 1 FROM process_port_operations po
         WHERE po.container_number = c.container_number AND po.port_type = 'destination'
       )`
    );
    console.log(`待排产货柜数: ${containerCount[0]?.count || 0}`);
    
  } catch (error) {
    console.error('检查映射数据时发生错误:', error);
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
