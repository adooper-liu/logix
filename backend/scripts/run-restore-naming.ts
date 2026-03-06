const { AppDataSource } = require('../src/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Starting snake_case naming restoration...');
    
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('Database connected');
    }

    // Read SQL file
    const sqlPath = path.join(__dirname, '../migrations/restore_snake_case_naming.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute SQL
    await AppDataSource.query(sql);
    console.log('Migration completed successfully');
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
