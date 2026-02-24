/**
 * Express 应用配置
 * Express Application Configuration
 */

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/index.js';
import { log } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { apiRateLimit } from './middleware/rateLimit.middleware.js';
import routes from './routes/index.js';

// 创建 Express 应用
const app: Application = express();
const httpServer = createServer(app);

// Socket.IO 配置
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.socket.corsOrigin,
    methods: ['GET', 'POST']
  }
});

// Socket.IO 连接处理
io.on('connection', (socket) => {
  log.info('Client connected:', { socketId: socket.id });

  socket.on('disconnect', () => {
    log.info('Client disconnected:', { socketId: socket.id });
  });

  socket.on('join-room', (room: string) => {
    socket.join(room);
    log.info('Socket joined room:', { socketId: socket.id, room });
  });

  socket.on('leave-room', (room: string) => {
    socket.leave(room);
    log.info('Socket left room:', { socketId: socket.id, room });
  });
});

// 安全中间件
app.use(helmet());

// CORS 配置
app.use(cors({
  origin: config.cors.origin,
  credentials: true
}));

// 压缩响应
app.use(compression());

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 日志中间件
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// 速率限制
app.use(apiRateLimit);

// 请求日志
app.use((req: Request, _res: Response, next) => {
  log.info('Incoming request:', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// 健康检查（不使用速率限制）
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uptime: process.uptime(),
    services: {
      logisticsPath: config.logisticsPath.url
    }
  });
});

// 服务信息
app.get('/info', (req: Request, res: Response) => {
  res.json({
    name: 'LogiX Main Service',
    version: '1.0.0',
    description: '主服务 - 集成物流路径可视化微服务',
    environment: config.nodeEnv,
    port: config.port,
    apiPrefix: config.apiPrefix
  });
});

// API 路由
app.use(config.apiPrefix, routes);

// 404 处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 导出应用和服务器实例
export { app, httpServer };
