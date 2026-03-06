import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'logix_db',
  user: 'logix_user',
  password: 'LogiX@2024!Secure'
});

async function checkTables() {
  try {
    await client.connect();

    const res = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%container%' ORDER BY tablename"
    );
    console.log('Container tables:');
    res.rows.forEach((r: any) => {
      console.log('  -', r.tablename);
    });

  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();
