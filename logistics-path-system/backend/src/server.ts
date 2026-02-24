/**
 * 物流路径可视化微服务入口
 * Logistics Path Visualization Microservice Entry Point
 */

import express from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from './graphql/logistics.schema.js';
import { resolvers } from './resolvers/logistics.resolvers.js';

const PORT = process.env.PORT || 4000;
const GRAPHQL_PATH = '/graphql';

// 创建 Express 应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 创建可执行 schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// 创建 Apollo Server
const server = new ApolloServer({
  schema,
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    return error;
  }
});

// 启动服务器
async function startServer() {
  await server.start();

  app.use(
    GRAPHQL_PATH,
    expressMiddleware(server)
  );

  // 健康检查端点
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'logistics-path-service',
      timestamp: new Date().toISOString()
    });
  });

  // 根路径
  app.get('/', (req, res) => {
    res.json({
      service: 'LogiX Logistics Path Microservice',
      version: '1.0.0',
      graphql: `http://localhost:${PORT}${GRAPHQL_PATH}`,
      health: `http://localhost:${PORT}/health`
    });
  });

  app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║     Logistics Path Microservice Started                   ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`🌍 GraphQL:      http://localhost:${PORT}${GRAPHQL_PATH}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`📚 Apollo Studio: https://studio.apollographql.com/sandbox?endpoint=${encodeURIComponent(`http://localhost:${PORT}${GRAPHQL_PATH}`)}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Server is ready to accept connections');
  });
}

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 启动
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
