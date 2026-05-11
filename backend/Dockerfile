# Backend Dockerfile — 多阶段构建（生产）
# 构建上下文为仓库根目录：docker compose build 使用 context: .
# 目录布局与本地 tsc 一致：/workspace/backend + /workspace/shared（rootDir: ".."）

FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /workspace
COPY shared /workspace/shared

WORKDIR /workspace/backend
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/tsconfig.docker.json ./
COPY backend/src ./src

RUN npm ci
RUN npx tsc --project tsconfig.docker.json
RUN npm prune --omit=dev && npm cache clean --force

FROM node:20-alpine AS runner

RUN apk add --no-cache dumb-init

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

COPY --from=builder /workspace/backend/node_modules ./node_modules
COPY --from=builder /workspace/backend/dist ./dist
COPY backend/package*.json ./
COPY backend/.env ./.env

RUN mkdir -p logs && chown -R nodejs:nodejs logs

USER nodejs

EXPOSE 3001

ENV NODE_ENV=production \
    PORT=3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/backend/src/server.js"]
