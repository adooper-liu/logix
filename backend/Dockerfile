# Backend Dockerfile
# 多阶段构建 - 生产环境优化

# 阶段1: 依赖安装
FROM node:18-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 阶段2: 构建
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

# 安装所有依赖 (包括开发依赖)
RUN npm ci

# 构建 TypeScript
RUN npm run build

# 阶段3: 生产运行
FROM node:18-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 从 deps 阶段复制生产依赖
COPY --from=deps /app/node_modules ./node_modules

# 从 builder 阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 复制其他必要文件
COPY package*.json ./
COPY .env.example ./.env.example

# 创建日志目录
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# 切换到非 root 用户
USER nodejs

EXPOSE 3001

ENV NODE_ENV=production \
    PORT=3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
