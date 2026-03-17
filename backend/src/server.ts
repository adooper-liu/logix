/**
 * 主服务入口
 * Main Service Entry Point
 */

import 'reflect-metadata';
import { httpServer, io } from './app.js';
import { config } from './config/index.js';
import { closeDatabase, initDatabase } from './database/index.js';
import { containerStatusScheduler } from './schedulers/containerStatus.scheduler.js';
import { demurrageWriteBackScheduler } from './schedulers/demurrageWriteBack.scheduler.js';
import { logisticsPathService } from './services/logisticsPath.service.js';
import { log } from './utils/logger.js';
import { flowEngine } from './ai/utils/flowEngine.js';

/**
 * 启动服务器（带性能监控）
 */
async function startServer() {
  const totalStartTime = Date.now();

  try {
    // 初始化数据库连接
    const dbStartTime = Date.now();
    log.info('Initializing database connection...');
    await initDatabase();
    log.info(`✅ Database initialized in ${Date.now() - dbStartTime}ms`);

    // 初始化 FlowEngine：从数据库加载流程定义
    const flowEngineStartTime = Date.now();
    log.info('Initializing FlowEngine...');
    await flowEngine.initialize();
    log.info(`✅ FlowEngine initialized in ${Date.now() - flowEngineStartTime}ms`);

    // 启动货柜状态调度器（优化：延迟 5 秒首次执行）
    const statusSchedulerStartTime = Date.now();
    log.info('Starting container status scheduler (optimized: delayed start)...');
    const schedulerInterval = parseInt(process.env.STATUS_SCHEDULER_INTERVAL || '60', 10);
    const schedulerDelay = parseInt(process.env.STATUS_SCHEDULER_DELAY || '5', 10);
    containerStatusScheduler.start(schedulerInterval, schedulerDelay);
    log.info(
      `✅ Container status scheduler started with ${schedulerInterval} minute interval, first execution in ${schedulerDelay}s (${Date.now() - statusSchedulerStartTime}ms)`
    );

    // 启动滞港费日期批量写回调度器（优化：延迟 15 秒首次执行，避免资源竞争）
    const demurrageSchedulerStartTime = Date.now();
    log.info('Starting demurrage write-back scheduler (optimized: delayed start)...');
    const demurrageWriteBackInterval = parseInt(
      process.env.DEMURRAGE_WRITEBACK_SCHEDULER_INTERVAL || '360',
      10
    );
    const demurrageWriteBackDelay = parseInt(
      process.env.DEMURRAGE_WRITEBACK_SCHEDULER_DELAY || '15',
      10
    );
    demurrageWriteBackScheduler.start(demurrageWriteBackInterval, demurrageWriteBackDelay);
    log.info(
      `✅ Demurrage write-back scheduler started with ${demurrageWriteBackInterval} minute interval, first execution in ${demurrageWriteBackDelay}s (${Date.now() - demurrageSchedulerStartTime}ms)`
    );

    // 检查微服务健康状态（带超时控制）
    const healthCheckStartTime = Date.now();
    log.info('Checking microservices health...');
    try {
      const healthCheckTimeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10);
      const healthCheckPromise = logisticsPathService.healthCheck();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Health check timeout after ${healthCheckTimeout}ms`)),
          healthCheckTimeout
        )
      );

      await Promise.race([healthCheckPromise, timeoutPromise]);
      log.info(
        `✅ Logistics Path microservice is healthy (${Date.now() - healthCheckStartTime}ms)`
      );
    } catch (error) {
      log.warn('⚠️  Logistics Path microservice is unavailable:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${Date.now() - healthCheckStartTime}ms`
      });
      log.warn('⚠️  Starting main service anyway...');
    }

    // 启动 HTTP 服务器
    httpServer.listen(config.port, () => {
      const totalStartupTime = Date.now() - totalStartTime;
      log.info('╔══════════════════════════════════════════════════════════╗');
      log.info('║        LogiX Main Service Started                        ║');
      log.info('╚══════════════════════════════════════════════════════════╝');
      log.info('');
      log.info(`🚀 Total startup time: ${totalStartupTime}ms`);
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
    await new Promise<void>((resolve) => {
      io.close(() => {
        log.info('✅ Socket.IO closed');
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
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
