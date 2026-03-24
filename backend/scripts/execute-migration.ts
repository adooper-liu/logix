import { migrationService } from '../src/services/migration.service';
import { initDatabase, closeDatabase } from '../src/database';

async function main() {
  try {
    console.log('开始执行数据库迁移...');
    
    // 初始化数据库连接
    await initDatabase();
    console.log('✅ 数据库连接成功');
    
    // 确保迁移日志表存在
    await migrationService.ensureMigrationLogTable();
    
    // 执行指定的迁移脚本
    const result = await migrationService.executeMigration('add_transport_fee_to_trucking_port_mapping.sql');
    
    if (result.success) {
      console.log(`✅ 迁移执行成功: ${result.filename}`);
      console.log(`执行时间: ${result.duration}ms`);
    } else {
      console.log(`❌ 迁移执行失败: ${result.filename}`);
      console.log(`错误信息: ${result.error}`);
    }
  } catch (error) {
    console.error('执行迁移时发生错误:', error);
  } finally {
    // 关闭数据库连接
    try {
      await closeDatabase();
      console.log('✅ 数据库连接已关闭');
    } catch (error) {
      console.error('关闭数据库连接时发生错误:', error);
    }
  }
}

main();
