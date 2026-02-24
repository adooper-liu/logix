/**
 * 应用配置
 * Application Configuration
 */

import dotenv from 'dotenv';
import path from 'path';

// 根据环境加载不同的env文件
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'production' ? '.env' : '.env.dev';

// 加载环境变量（优先从backend目录加载）
dotenv.config({
  path: path.resolve(process.cwd(), envFile)
});

// 如果找不到开发环境配置，尝试根目录的.env
if (env !== 'production') {
  const rootEnvPath = path.resolve(process.cwd(), '../.env');
  try {
    dotenv.config({ path: rootEnvPath });
  } catch {
    // 忽略根目录.env可能不存在的情况
  }
}

export const config = {
  // 应用配置
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  // 微服务配置
  logisticsPath: {
    url: process.env.LOGISTICS_PATH_SERVICE_URL || 'http://localhost:4000',
    timeout: 30000,
    retryAttempts: 3
  },

  // 飞驼API配置
  feituo: {
    apiEndpoint: process.env.FEITUO_API_ENDPOINT || 'https://api.feituo.com/v1',
    apiKey: process.env.FEITUO_API_KEY || '',
    timeout: 30000,
    retryAttempts: 3
  },

  // 适配器配置
  adapters: {
    defaultSource: process.env.DEFAULT_ADAPTER_SOURCE || 'logistics_path',
    healthCheckInterval: parseInt(process.env.ADAPTER_HEALTH_CHECK_INTERVAL || '60000', 10),
    enableAutoFailover: process.env.ADAPTER_ENABLE_AUTO_FAILOVER !== 'false'
  },

  // CORS 配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  },

  // Socket.IO 配置
  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  },

  // 日志配置
  log: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs'
  },

  // 速率限制配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15分钟
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },

  // 健康检查配置
  healthCheck: {
    interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000', 10) // 1分钟
  }
};

// 验证必要的环境变量
const requiredEnvVars = ['PORT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
}
