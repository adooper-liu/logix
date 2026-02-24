/**
 * 日志工具
 * Logger Utility
 */

import winston from 'winston';
import { config } from '../config/index';

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// 控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// 创建 logger 实例
export const logger = winston.createLogger({
  level: config.log.level,
  format: logFormat,
  defaultMeta: { service: 'logix-main-service' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: consoleFormat
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: `${config.log.filePath}/error.log`,
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: `${config.log.filePath}/combined.log`,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// 生产环境不输出到控制台
if (config.nodeEnv === 'production') {
  logger.transports.forEach(transport => {
    if (transport instanceof winston.transports.Console) {
      logger.remove(transport);
    }
  });
}

// 导出便捷方法
export const log = {
  info: (message: string, meta?: any) => logger.info(message, meta),
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta)
};
