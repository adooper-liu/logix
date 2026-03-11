/**
 * 预加载 .env，供 node -r 使用，确保在导入 database 等模块之前完成
 * 用法: node -r ./scripts/load-env.cjs node_modules/.bin/tsx scripts/xxx.ts
 */
const path = require('path');
const dotenv = require('dotenv');

const backendDir = path.join(__dirname, '..');
dotenv.config({ path: path.join(backendDir, '..', '.env') });
dotenv.config({ path: path.join(backendDir, '.env.dev'), override: true });
if (process.env.DB_HOST === 'postgres') {
  process.env.DB_HOST = 'localhost';
}
