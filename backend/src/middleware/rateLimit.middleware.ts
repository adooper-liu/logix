/**
 * 速率限制中间件
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

// 创建速率限制器
export const apiRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  // 跳过健康检查
  skip: (req) => req.path === '/health'
});

// 严格的速率限制器（用于敏感操作）
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10,
  message: {
    success: false,
    error: 'Rate limit exceeded for this operation'
  }
});
