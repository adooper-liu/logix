# LogiX 帮助文档中心

欢迎使用 LogiX 帮助文档！

---

## 文档访问方式

LogiX 提供两种文档访问方式：

### 1. 帮助文档页面（推荐）

- 访问路径：`/help`
- 特点：侧边栏导航、搜索功能、文档分类

### 2. 直接链接访问

- 访问路径：`/docs/*`
- 特点：直接打开文档、支持分享链接

---

## 快速开始（新用户必读）

| 文档 | 预计时间 | 用途 |
|------|----------|------|
| [5 分钟快速启动](./10-guides/05-快速开始.md) | 5 分钟 | 一键启动开发环境 |
| [开发环境完整指南](./10-guides/03-开发环境指南.md) | 10 分钟 | 了解服务地址和配置 |
| [开发环境准备](./10-guides/开发环境准备.md) | 15 分钟 | 完整环境配置说明 |

---

## 核心文档分类

### 开发规范与架构

- [开发前必读规则](../.MUST_READ_BEFORE_DEVELOPMENT.md)
  - 核心原则：数据库优先、代码优先、数据完整性
  - 命名规范、7 层流转架构

- [项目结构速查](./10-guides/项目结构速查.md)
  - 目录结构、数据库表、API 路由

- [开发流程指南](./10-guides/开发流程指南.md)
  - 数据库变更、实体定义、API 开发

### 数据库与部署

- [数据库主表关系](./03-database/01-数据库主表关系.md)
  - 核心表的关系图

- [TimescaleDB 指南](./08-deployment/01-TimescaleDB 指南.md)
  - 安装、配置、时序表

- [后端服务启动优化](./backend/05-backend-startup-opt.md)
  - 解决调度器资源竞争问题

### 时间概念

- [时间概念说明：历时、倒计时、超期](./help/时间概念说明 - 历时倒计时超期.md)
  - 了解历时、倒计时、超期的定义和区别

### 滞港费

- [滞港费计算完整指南](./demurrage/README.md)
  - 计算逻辑、标准导入、数据口径

### 智能排产

- [五节点调度与可视化方案](./11-project/04-五节点调度与可视化方案.md)
  - 清关、拖卡、卸柜、还箱、查验五节点

---

## 按角色查找文档

### 新用户

1. [5 分钟快速启动](./10-guides/05-快速开始.md)
2. [开发环境准备](./10-guides/开发环境准备.md)
3. [测试指南](./10-guides/测试指南.md)

### 前端开发

1. [开发前必读规则](../.MUST_READ_BEFORE_DEVELOPMENT.md)
2. [前端文档](./10-guides/04-前端文档.md)
3. [测试指南](./10-guides/测试指南.md)

### 后端开发

1. [开发前必读规则](../.MUST_READ_BEFORE_DEVELOPMENT.md)
2. [后端快速参考](./10-guides/01-后端快速参考.md)
3. [后端完整文档](./10-guides/02-后端文档.md)

### 运维

1. [TimescaleDB 指南](./08-deployment/01-TimescaleDB 指南.md)
2. [监控用户指南](./08-deployment/03-监控用户指南.md)

---

## 工具与资源

### 开发工具

- 开发环境启动: `start-logix-dev.ps1`
- 生产环境启动: `prod-start.bat`
- 数据库管理: Adminer (http://localhost:8080), pgAdmin (http://localhost:5050)

### 服务地址

| 服务 | 地址 | 用途 |
|------|------|------|
| 前端 | http://localhost:5173 | Vue 3 界面 |
| 后端 | http://localhost:3001 | Node.js API |
| 数据库 | localhost:5432 | TimescaleDB |
| Redis | localhost:6379 | 缓存 |
| Grafana | http://localhost:3000 | 监控面板 |

### 外部链接

- [Vue 3 官方文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [TimescaleDB 文档](https://docs.timescale.com/)

---

## 获取帮助

### 常见问题

- 查看 [排错指南](./10-guides/排错指南.md)
- 查看各文档的故障排查章节

### SKILL 工具

- 使用 CodeBuddy SKILL 进行 AI 辅助开发
- 参考 [SKILL工具使用](./10-guides/SKILL工具使用.md)

---

**最后更新**: 2026-03-27
