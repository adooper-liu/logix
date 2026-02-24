/**
 * 主服务入口
 * Main Service Entry Point
 */

import { httpServer, io } from './app.js';
import { config } from './config/index.js';
import { log } from './utils/logger.js';
import { logisticsPathService } from './services/logisticsPath.service.js';
import { initDatabase, closeDatabase } from './database/index.js';

/**
 * 启动服务器
 */
async function startServer() {
  try {
    // 初始化数据库连接
    log.info('Initializing database connection...');
    await initDatabase();

    // 检查微服务健康状态
    log.info('Checking microservices health...');
    try {
      await logisticsPathService.healthCheck();
      log.info('✅ Logistics Path microservice is healthy');
    } catch (error) {
      log.warn('⚠️  Logistics Path microservice is unavailable:', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      log.warn('⚠️  Starting main service anyway...');
    }

    // 启动 HTTP 服务器
    httpServer.listen(config.port, () => {
      log.info('╔══════════════════════════════════════════════════════════╗');
      log.info('║        LogiX Main Service Started                        ║');
      log.info('╚══════════════════════════════════════════════════════════╝');
      log.info('');
      log.info(`🌍 Environment:    ${config.nodeEnv}`);
      log.info(`🔌 Port:           ${config.port}`);
      log.info(`🔗 API URL:        http://localhost:${config.port}${config.apiPrefix}`);
      log.info(`🏥 Health Check:   http://localhost:${config.port}/health`);
      log.info(`ℹ️  Service Info:   http://localhost:${config.port}/info`);
      log.info('');
      log.info(`🔗 Microservices:`);
      log.info(`   - Logistics Path: ${config.logisticsPath.url}`);
      log.info('');
      log.info('══════════════════════════════════════════════════════════');
      log.info('✅ Server is ready to accept connections');
    });

  } catch (error) {
    log.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * 优雅关闭
 */
async function gracefulShutdown(signal: string) {
  log.info(`\n⚠️  Received ${signal}, shutting down gracefully...`);

  try {
    // 关闭 Socket.IO
    io.close(() => {
      log.info('✅ Socket.IO closed');
    });

    // 关闭 HTTP 服务器
    httpServer.close(() => {
      log.info('✅ HTTP server closed');
    });

    // 关闭数据库连接
    await closeDatabase();

    // 等待所有连接关闭
    await new Promise(resolve => setTimeout(resolve, 1000));

    log.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    log.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// 监听进程信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获的异常处理
process.on('uncaughtException', (error: Error) => {
  log.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// 启动服务器
startServer();
