/**
 * 数据库配置
 * Database Configuration
 */

export const databaseConfig = {
  // PostgreSQL 配置
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'logix_db',

  // 连接池配置
  poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
  poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),

  // 同步配置(开发环境) - 根据环境变量决定是否自动同步
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.NODE_ENV === 'development',

  // SSL配置(生产环境)
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
};

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10)
};

export const elasticsearchConfig = {
  node: process.env.ES_NODE || 'http://localhost:9200',
  username: process.env.ES_USERNAME || undefined,
  password: process.env.ES_PASSWORD || undefined
};
