/**
 * 执行数据库迁移脚本
 * Execute database migration script
 */

import { AppDataSource } from '../src/database/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function executeMigration() {
  try {
    console.log('Starting database migration...');
    console.log('===================================');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected\n');
    }

    // Read SQL file
    const sqlPath = path.join(__dirname, '../migrations/fix-container-number-column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL migration script...');
    console.log('SQL file:', sqlPath);
    console.log('');

    // Split SQL by $$ blocks and execute
    const statements = sql.split(/DO \$\$/g).filter(s => s.trim());
    const finalSelect = statements[statements.length - 1];

    // Execute each DO block
    for (let i = 0; i < statements.length - 1; i++) {
      const block = `DO $$$${statements[i]}`;
      console.log(`Executing DO block ${i + 1}/${statements.length - 1}...`);
      try {
        await AppDataSource.query(block);
        console.log(`✅ DO block ${i + 1} executed\n`);
      } catch (error: any) {
        console.error(`❌ DO block ${i + 1} failed:`, error.message);
        throw error;
      }
    }

    // Execute final SELECT
    if (finalSelect) {
      console.log('Verifying migration results...');
      const result = await AppDataSource.query(finalSelect);
      console.log('Column structure after migration:');
      console.table(result);
    }

    console.log('\n===================================');
    console.log('✅ Migration completed successfully!');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('\n===================================');
    console.error('❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

executeMigration();
