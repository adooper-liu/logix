import { AppDataSource } from '../database';

async function migrate() {
  await AppDataSource.initialize();
  
  try {
    await AppDataSource.query(
      "ALTER TABLE dict_warehouse_trucking_mapping ADD COLUMN IF NOT EXISTS transport_fee DECIMAL(10,2) DEFAULT 0"
    );
    console.log('✅ 添加 transport_fee 字段成功');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️ 字段已存在，跳过');
    } else {
      console.error('❌ 错误:', error.message);
    }
  }
  
  await AppDataSource.destroy();
  process.exit(0);
}

migrate();
