/**
 * 错误处理中间件
 * Error Handling Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger.js';

// 自定义错误类
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if ((error as any).code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service Unavailable';
  }

  // 记录错误日志
  log.error('Error occurred:', {
    statusCode,
    message: error.message,
    path: req.path,
    method: req.method,
    stack: error.stack
  });

  // 返回错误响应
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(config.nodeEnv === 'development' && { stack: error.stack })
  });
};

// 404 处理
export const notFoundHandler = (req: Request, res: Response) => {
  log.warn('Route not found:', { path: req.path, method: req.method });

  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path
  });
};

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development'
};
