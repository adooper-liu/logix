/**
 * 数据库连接（接主库）
 * 从 ext_container_status_events 读取真实数据
 */

import pg from 'pg';

const { Pool } = pg;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const user = process.env.DB_USERNAME || 'postgres';
  const password = process.env.DB_PASSWORD || 'postgres';
  const database = process.env.DB_DATABASE || 'logix_db';
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
    pool.on('error', (err) => console.error('[LogisticsPath] DB pool error:', err));
  }
  return pool;
}

export async function query<T = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export function isDatabaseConfigured(): boolean {
  return !!(process.env.DATABASE_URL || process.env.DB_HOST || process.env.DB_USERNAME);
}
