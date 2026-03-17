# LogiX 帮助文档中心

欢迎使用 LogiX 帮助文档！

## 📢 重要通知

**文档重组计划**: 我们正在进行文档体系的全面优化，目标是构建更清晰、简洁、有效的文档系统。

- 📄 [查看文档整理与更新方案](./DOCUMENT_REORGANIZATION_PLAN.md)
- 🎯 **目标**: 文档查找时间从 5-10 分钟降至 1-3 分钟
- 📅 **完成时间**: 2026-03-20
- ✅ **状态**: 进行中

---

## 📖 文档访问方式

LogiX 提供两种文档访问方式：

### 1. 帮助文档页面（推荐）

- 访问路径：`/help`
- 特点：侧边栏导航、搜索功能、文档分类
- 适用：浏览和查找文档

### 2. 直接链接访问

- 访问路径：`/docs/*`（如 `/docs/help/时间概念说明 - 历时倒计时超期.md`）
- 特点：直接打开文档、支持分享链接
- 适用：特定文档的直接访问

**提示**：所有文档链接都支持在浏览器中直接访问，系统会自动使用 Markdown 渲染器显示格式化后的内容。

---

## 🚀 快速开始（新用户必读）

| 文档                                               | 预计时间 | 用途               |
| -------------------------------------------------- | -------- | ------------------ |
| [5 分钟快速启动](./10-guides/05-快速开始.md) ⭐    | 5 分钟   | 一键启动开发环境   |
| [开发环境完整指南](./10-guides/03-开发环境指南.md) | 10 分钟  | 了解服务地址和配置 |
| [常见问题 FAQ](./11-project/FAQ.md) 🔥 NEW         | 随时查阅 | 解决高频问题       |

---

## 📚 核心文档分类

### 时间概念与物流显示 ⭐⭐⭐

- [时间概念说明：历时、倒计时、超期](./help/时间概念说明 - 历时倒计时超期.md) ⭐⭐⭐
  - 了解历时、倒计时、超期的定义和区别
  - 学习如何解读物流路径和关键日期的时间显示
  - 掌握最佳实践，优化物流流程

- [物流节点历时与超期标签说明](./logistics/物流节点历时与超期标签说明.md)
  - 物流路径节点的时间显示逻辑
  - 历时与超期的计算方式

- [关键日期显示逻辑说明](./logistics/关键日期显示逻辑说明.md)
  - 关键日期时间线的时间显示
  - 倒计时、历时、超期的判断规则

### 滞港费专题 💰

- [滞港费计算模式说明](./demurrage/09-FRONTEND_MODE_ADAPTATION.md)
  - 实际模式 vs 预测模式
  - 计算来源标注

- [滞港费计算完整指南](./demurrage/README.md)
  - 计算逻辑、标准导入、数据口径
  - 聚合预警、TopN 优化

### 智能排产与调度 🎯

- [五节点调度与可视化方案](./11-project/04-五节点调度与可视化方案.md) ⭐⭐⭐
  - 清关、拖卡、卸柜、还箱、查验五节点
  - 计划调度、实际执行、异常预警

- [智能排柜算法方案](./11-project/06-智能排柜算法方案.md)
  - 规则引擎、资源约束、算法实现

- [甘特图调度与资源关联](./11-project/07-甘特图调度与货柜资源关联机制.md)
  - 泳道与落格规则、校验规则、覆盖规则

### 飞驼数据集成 🔌

- [飞驼数据集成立体指南](./11-project/10-飞驼数据Excel导入打通指南.md) ⭐⭐
  - Excel导入 + API 对接 + 状态码映射
- [飞驼节点状态码解读](./11-project/09-飞驼节点状态码解读与接入整合方案.md)
  - transportEvents/equipmentEvents/shipmentEvents 映射

### 开发规范与架构 🏗️

- [开发前必读规则](../.MUST_READ_BEFORE_DEVELOPMENT.md) ⭐⭐⭐
  - 核心原则：数据库优先、代码优先、数据完整性
  - 命名规范、7 层流转架构

- [架构说明](./02-architecture/01-架构说明.md)
  - 前后端技术栈、微服务架构

- [物流流程完整说明](./02-architecture/02-物流流程完整说明.md)
  - 从备货到还箱的完整业务流程

- [多订单货柜设计](./02-architecture/03-多订单货柜设计.md)
  - 一个货柜对应多个备货单的设计

### 数据库与部署 💾

- [数据库主表关系](./03-database/01-数据库主表关系.md)
  - 25 张核心表的关系图

- [TimescaleDB 指南](./08-deployment/01-TimescaleDB 指南.md)
  - 安装、配置、时序表、超表

- [后端服务启动优化](./09-deployment/05-backend-startup-opt.md) 🔥 NEW
  - 解决调度器资源竞争问题
  - 启动时间从 45 秒降至 30 秒内

---

## 📊 按角色查找文档

### 我是新用户

1. [5 分钟快速启动](./10-guides/05-快速开始.md)
2. [时间概念说明](./help/时间概念说明 - 历时倒计时超期.md)
3. [常见问题 FAQ](./11-project/FAQ.md)

### 我是前端开发

1. [开发前必读规则](../.MUST_READ_BEFORE_DEVELOPMENT.md)
2. [前端文档](./10-guides/04-前端文档.md)
3. [命名规范](./01-standards/03-命名规范.md)
4. [颜色系统指南](./01-standards/06-颜色系统指南.md)

### 我是后端开发

1. [开发前必读规则](../.MUST_READ_BEFORE_DEVELOPMENT.md)
2. [后端快速参考](./10-guides/01-后端快速参考.md)
3. [后端完整文档](./10-guides/02-后端文档.md)
4. [API集成指南](./04-api/01-外部数据集成指南.md)

### 我是产品/运营

1. [项目行动指南](./11-project/00-项目行动指南.md)
2. [五节点调度方案](./11-project/04-五节点调度与可视化方案.md)
3. [滞港费计算模式](./demurrage/09-FRONTEND_MODE_ADAPTATION.md)
4. [甘特图使用指南](./06-statistics/10-甘特图车道与货柜卡片对比.md)

### 我是 DBA/运维

1. [数据库管理指南](./backend/DATABASE_MANAGEMENT_GUIDE.md)
2. [TimescaleDB 完整指南](./08-deployment/01-TimescaleDB 指南.md)
3. [监控用户指南](./08-deployment/03-监控用户指南.md)
4. [后端启动优化](./09-deployment/05-backend-startup-opt.md)

---

## 🔥 最新更新（2026-03-16）

| 文档                                                                | 类型       | 说明                 |
| ------------------------------------------------------------------- | ---------- | -------------------- |
| [文档整理与更新方案](./DOCUMENT_REORGANIZATION_PLAN.md)             | 🆕 NEW     | 文档体系全面优化计划 |
| [后端服务启动优化](./09-deployment/05-backend-startup-opt.md)       | 🆕 NEW     | 解决滚动重启问题     |
| [AI赋能清单](./11-project/21-AI赋能清单.md)                         | 🔄 UPDATED | AI 技术应用场景分析  |
| [甘特图资源动态展示方案](./11-project/19-甘特图资源动态展示方案.md) | 🔄 UPDATED | 资源占用可视化       |

---

## 📋 完整文档索引

### 开发规范（01-standards）

- [代码规范](./01-standards/01-代码规范.md)
- [命名规范](./01-standards/03-命名规范.md)
- [命名快速参考](./01-standards/04-命名快速参考.md)
- [Lint 使用指南](./01-standards/05-Lint 使用指南.md)
- [颜色系统指南](./01-standards/06-颜色系统指南.md)
- [国际化指南](./01-standards/08-国际化指南.md)

### 架构设计（02-architecture）

- [架构说明](./02-architecture/01-架构说明.md)
- [物流流程完整说明](./02-architecture/02-物流流程完整说明.md)
- [多订单货柜设计](./02-architecture/03-多订单货柜设计.md)
- [全球国家过滤设计](./02-architecture/04-全球国家过滤设计.md)
- [统一状态机实现](./02-architecture/05-统一状态机实现.md)

### 数据库（03-database）

- [数据库主表关系](./03-database/01-数据库主表关系.md)
- [Excel状态映射](./03-database/02-Excel状态映射.md)

### API集成（04-api）

- [外部数据集成指南](./04-api/01-外部数据集成指南.md)
- [外部数据快速开始](./04-api/02-外部数据快速开始.md)

### 状态机（05-state-machine）

- [物流状态机完整文档](./05-state-machine/01-物流状态机完整文档.md)
- [物流状态机](./05-state-machine/02-物流状态机.md)
- [业务状态机与飞驼](./05-state-machine/03-业务状态机与飞驼.md)

### 统计分析（06-statistics）

- [倒计时卡片逻辑](./06-statistics/02-倒计时卡片逻辑.md)
- [甘特图系列](./06-statistics/) - 多篇甘特图相关文档

### 性能优化（07-performance）

- [性能优化决策](./07-performance/01-性能优化决策.md)
- [性能优化指南](./07-performance/02-性能优化指南.md)
- [性能优化实现](./07-performance/03-性能优化实现.md)

### 部署运维（08-deployment）

- [TimescaleDB 指南](./08-deployment/01-TimescaleDB 指南.md)
- [TimescaleDB 快速参考](./08-deployment/02-TimescaleDB 快速参考.md)
- [监控用户指南](./08-deployment/03-监控用户指南.md)
- [监控真实数据指南](./08-deployment/04-监控真实数据指南.md)

### 杂项（09-misc）

- 包含 Excel导入、字典映射、故障排除等 18 篇文档

### 使用指南（10-guides）

- [后端快速参考](./10-guides/01-后端快速参考.md)
- [后端完整文档](./10-guides/02-后端文档.md) ⭐ 52KB
- [开发环境指南](./10-guides/03-开发环境指南.md)
- [前端文档](./10-guides/04-前端文档.md)
- [快速开始](./10-guides/05-快速开始.md)

### 项目管理（11-project）

- [项目行动指南](./11-project/00-项目行动指南.md) ⭐⭐⭐
- [文档索引](./11-project/02-文档索引.md)
- [五节点调度方案](./11-project/04-五节点调度与可视化方案.md) ⭐⭐⭐
- [智能排柜算法](./11-project/06-智能排柜算法方案.md)
- [飞驼数据系列](./11-project/) - 10+ 篇飞驼相关文档
- [AI赋能清单](./11-project/21-AI赋能清单.md)

### 滞港费专题（demurrage）

- [滞港费 README](./demurrage/README.md)
- [计算模式说明](./demurrage/08-DEMURRAGE_CALCULATION_MODES.md)
- [标准 Excel导入](./demurrage/04-DEMURRAGE_STANDARDS_EXCEL_IMPORT.md)
- [数据口径统一](./demurrage/05-DEMURRAGE_DATA_CALIBER_UNIFICATION.md)
- 共 11 篇专业文档

### 物流专题（logistics）

- [物流节点历时与超期](./logistics/物流节点历时与超期标签说明.md)
- [关键日期显示逻辑](./logistics/关键日期显示逻辑说明.md)

### 帮助说明（help）

- [时间概念说明](./help/时间概念说明 - 历时倒计时超期.md) ⭐⭐⭐

---

## 🛠️ 工具与资源

### 开发工具

- **开发环境启动**: `start-logix-dev.ps1`
- **生产环境启动**: `prod-start.bat`
- **数据库管理**: Adminer (http://localhost:8080), pgAdmin (http://localhost:5050)

### 服务地址

| 服务    | 地址                  | 用途        |
| ------- | --------------------- | ----------- |
| 前端    | http://localhost:5173 | Vue 3 界面  |
| 后端    | http://localhost:3001 | Node.js API |
| 数据库  | localhost:5432        | TimescaleDB |
| Redis   | localhost:6379        | 缓存        |
| Grafana | http://localhost:3000 | 监控面板    |

### 外部链接

- [Vue 3 官方文档](https://vuejs.org/)
- [Element Plus 文档](https://element-plus.org/)
- [TimescaleDB 文档](https://docs.timescale.com/)
- [飞驼API 文档](https://doc.freightower.com/)

---

## 📞 获取帮助

### 常见问题

- 查看 [常见问题 FAQ](./11-project/FAQ.md)
- 查看各文档的故障排查章节

### 技术支持

- **技术问题**: support@logix.com
- **产品反馈**: feedback@logix.com
- **文档建议**: docs@logix.com

### 文档维护

- **维护负责人**: Lingma
- **更新频率**: 每周审查
- **反馈响应**: 24 小时内

---

**最后更新**: 2026-03-16  
**文档总数**: 83 篇（优化后约 50 篇）  
**平均查找时间**: 5-10 分钟（优化后 1-3 分钟）
