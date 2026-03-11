/**
 * 主服务入口
 * Main Service Entry Point
 */

import { httpServer, io } from './app.js';
import { config } from './config/index.js';
import { log } from './utils/logger.js';
import { logisticsPathService } from './services/logisticsPath.service.js';
import { initDatabase, closeDatabase } from './database/index.js';
import { containerStatusScheduler } from './schedulers/containerStatus.scheduler.js';
import { demurrageWriteBackScheduler } from './schedulers/demurrageWriteBack.scheduler.js';

/**
 * 启动服务器
 */
async function startServer() {
  try {
    // 初始化数据库连接
    log.info('Initializing database connection...');
    await initDatabase();

    // 启动货柜状态调度器
    log.info('Starting container status scheduler...');
    const schedulerInterval = parseInt(process.env.STATUS_SCHEDULER_INTERVAL || '60', 10);
    containerStatusScheduler.start(schedulerInterval);
    log.info(`✅ Container status scheduler started with ${schedulerInterval} minute interval`);

    // 启动滞港费日期批量写回调度器（last_free_date 为空、last_return_date 为空）
    log.info('Starting demurrage write-back scheduler...');
    const demurrageWriteBackInterval = parseInt(process.env.DEMURRAGE_WRITEBACK_SCHEDULER_INTERVAL || '360', 10);
    demurrageWriteBackScheduler.start(demurrageWriteBackInterval);
    log.info(`✅ Demurrage write-back scheduler started with ${demurrageWriteBackInterval} minute interval`);

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

let isShuttingDown = false;

/**
 * 优雅关闭
 * 顺序：1) 停止调度器并等待正在执行的任务 2) 关闭 Socket.IO 与 HTTP 3) 关闭数据库
 */
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    log.warn('Shutdown already in progress, ignoring duplicate signal');
    return;
  }
  isShuttingDown = true;

  log.info(`\n⚠️  Received ${signal}, shutting down gracefully...`);

  try {
    // 1. 先停止调度器，并等待正在执行的异步任务完成（避免关闭连接池后仍在使用）
    log.info('Stopping container status scheduler...');
    await containerStatusScheduler.stopAsync();
    log.info('✅ Container status scheduler stopped');

    log.info('Stopping demurrage write-back scheduler...');
    await demurrageWriteBackScheduler.stopAsync();
    log.info('✅ Demurrage write-back scheduler stopped');

    // 2. 关闭 Socket.IO 与 HTTP 服务器
    await new Promise<void>(resolve => {
      io.close(() => {
        log.info('✅ Socket.IO closed');
        resolve();
      });
    });

    await new Promise<void>(resolve => {
      httpServer.close(() => {
        log.info('✅ HTTP server closed');
        resolve();
      });
    });

    // 3. 最后关闭数据库连接池
    await closeDatabase();
    log.info('✅ Database connection closed');

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
