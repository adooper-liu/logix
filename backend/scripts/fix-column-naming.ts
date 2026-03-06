import { AppDataSource } from '../src/database/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixDatabaseNaming() {
  try {
    console.log('Starting database naming fix...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database connected');
    }

    // Read SQL file
    const sqlPath = path.join(__dirname, '../migrations/fix-container-number-column.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL to fix column naming...');
    const result = await AppDataSource.query(sql);
    console.log('SQL execution result:', result);
    console.log('✅ Database naming fix completed successfully');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database naming fix failed:', error);
    process.exit(1);
  }
}

fixDatabaseNaming();
