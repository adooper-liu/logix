# Node.js 版本升级记录

## 升级信息

**升级时间**: 2026-04-12
**升级原因**: 部分依赖包要求 Node.js >= 20
**升级范围**: Node.js 18 → Node.js 20

---

## 修改内容

### 1. 后端 Dockerfile

**文件**: `backend/Dockerfile`

```diff
- FROM node:18-alpine AS deps
+ FROM node:20-alpine AS deps

- FROM node:18-alpine AS builder
+ FROM node:20-alpine AS builder

- FROM node:18-alpine AS runner
+ FROM node:20-alpine AS runner
```

### 2. 后端 package.json

**文件**: `backend/package.json`

```diff
   "engines": {
-    "node": ">=18.0.0"
+    "node": ">=20.0.0"
   }
```

---

## 兼容性检查

### ✅ 已确认兼容

1. **TypeScript**: 完全兼容 Node 20
2. **NestJS 11.x**: 官方支持 Node 20+
3. **TypeORM**: 完全兼容
4. **Express**: 完全兼容
5. **所有核心依赖**: 均支持 Node 20

### ⚠️ 注意事项

1. **开发环境**: 需要确保本地安装的 Node.js 版本 >= 20
   ```powershell
   # 检查当前版本
   node --version

   # 如果版本过低,使用 nvm 升级
   nvm install 20
   nvm use 20
   ```

2. **Docker 构建**: 镜像会自动使用 Node 20-alpine

3. **依赖重新安装**: 升级后建议清理并重新安装依赖
   ```bash
   # 后端
   cd backend
   rm -rf node_modules package-lock.json
   npm install

   # 前端
   cd ../frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

---

## 验证步骤

### 1. 检查 Node 版本

```powershell
node --version
# 应该输出: v20.x.x
```

### 2. 重新安装依赖

```powershell
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

### 3. 启动开发环境

```powershell
.\start-logix-dev.ps1
```

### 4. 运行测试

```powershell
# 后端测试
cd backend
npm run test

# 前端测试
cd ../frontend
npm run test
```

### 5. Docker 构建测试

```powershell
# 重新构建后端镜像
docker-compose -f docker-compose.timescaledb.prod.yml build --no-cache backend

# 启动服务
docker-compose -f docker-compose.timescaledb.prod.yml -f docker-compose.admin-tools.yml --env-file .env up -d
```

---

## 回滚方案

如果升级后出现问题,可以快速回滚到 Node 18:

### 1. 恢复 Dockerfile

```diff
- FROM node:20-alpine AS deps
+ FROM node:18-alpine AS deps

- FROM node:20-alpine AS builder
+ FROM node:18-alpine AS builder

- FROM node:20-alpine AS runner
+ FROM node:18-alpine AS runner
```

### 2. 恢复 package.json

```diff
   "engines": {
-    "node": ">=20.0.0"
+    "node": ">=18.0.0"
   }
```

### 3. 切换 Node 版本

```powershell
nvm use 18
```

### 4. 重新安装依赖

```powershell
cd backend
rm -rf node_modules package-lock.json
npm install
```

---

## 常见问题

### Q1: 升级后某些依赖报错?

**A**: 清理缓存并重新安装:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Q2: TypeScript 编译失败?

**A**: 检查 TypeScript 版本是否兼容 Node 20:
```bash
npx tsc --version
# 应该是 5.x
```

### Q3: Docker 构建时依赖安装失败?

**A**: 清除 Docker 缓存:
```bash
docker builder prune -a
docker-compose build --no-cache backend
```

### Q4: 开发环境启动后后端无法连接数据库?

**A**: 检查 `.env.dev` 文件中的数据库配置是否正确,确保 TimescaleDB 容器正在运行:
```powershell
docker ps | Select-String timescaledb
```

---

## 相关文档

- [Node.js 20 发布说明](https://nodejs.org/en/blog/announcements/v20-release-announce)
- [NestJS 兼容性](https://docs.nestjs.com/faq/nodejs-version)
- [TypeScript Node 版本支持](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)

---

**维护者**: LogiX 团队
**最后更新**: 2026-04-12
