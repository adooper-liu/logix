/**
 * 执行车队 partnership_level 字段迁移
 * 
 * 使用方式：node scripts/run-partnership-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 开始执行数据库迁移：添加 partnership_level 字段\n');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'logix_user',
    password: 'LogiX@2024!Secure',
    database: 'logix_db'
  });

  try {
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, 'add-trucking-partnership-level.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL 文件不存在：${sqlPath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // 执行 SQL
    console.log('正在执行 SQL 脚本...');
    await client.query(sqlContent);
    console.log('✅ SQL 执行成功\n');

    // 验证结果
    console.log('验证结果...');
    const result = await client.query(`
      SELECT 
        company_code,
        company_name,
        daily_capacity,
        COALESCE(partnership_level, 'NULL') as partnership_level,
        status
      FROM dict_trucking_companies
      ORDER BY partnership_level NULLS LAST, company_code
      LIMIT 10
    `);

    console.log('\n前 10 个车队数据:');
    console.table(result.rows);

    // 统计分布
    const stats = await client.query(`
      SELECT 
        COALESCE(partnership_level, 'NULL') as level,
        COUNT(*) as count
      FROM dict_trucking_companies
      GROUP BY partnership_level
      ORDER BY count DESC
    `);

    console.log('\n车队等级分布统计:');
    console.table(stats.rows);

    // 检查字段是否存在
    const columnCheck = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'dict_trucking_companies'
        AND column_name = 'partnership_level'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('\n✅ 字段验证通过:');
      console.table(columnCheck.rows);
    } else {
      console.warn('\n⚠️ 警告：字段似乎未成功添加，请检查数据库');
    }

    await client.end();
    console.log('\n✅ 数据库迁移执行完成！\n');
    console.log('下一步:');
    console.log('1. 重启后端服务：npm run dev');
    console.log('2. 测试排产功能');
    console.log('3. 查看日志中的关系评分\n');

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    if (error.detail) {
      console.error('详情:', error.detail);
    }
    if (error.stack && process.env.DEBUG) {
      console.error('堆栈跟踪:', error.stack);
    }
    process.exit(1);
  }
}

// 执行迁移
runMigration().catch(err => {
  console.error('未捕获的错误:', err);
  process.exit(1);
});
