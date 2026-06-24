# LogiX 文档索引

## 文档列表

| 文档 | 用途 | 关键词 |
|------|------|--------|
| [business-handbook.md](./business-handbook.md) | 业务知识手册 - 28张表、4大业务流程 | 表结构、业务流程、字典表 |
| [architecture-guide.md](./architecture-guide.md) | 架构设计指南 - 模块划分、数据流 | 模块、分层、依赖注入 |
| [development-standards.md](./development-standards.md) | 开发规范 - 命名、编码、前端规范 | 命名规范、snake_case、Composition API |
| [database-schema.md](./database-schema.md) | 数据库结构 - 表定义、字段说明 | 表名、字段类型、关联关系 |
| [api-reference.md](./api-reference.md) | API参考 - 接口列表、请求参数 | REST API、路由、DTO |
| [state-machine.md](./state-machine.md) | 状态机定义 - 7层状态、优先级 | logistics_status、calculateLogisticsStatus |
| [demurrage-calculation.md](./demurrage-calculation.md) | 滞港费计算 - 公式、场景模拟 | LFD、free days、阶梯费率 |
| [intelligent-scheduling.md](./intelligent-scheduling.md) | 智能排柜 - 引擎逻辑、映射规则 | warehouse selector、trucking mapping |
| [feituo-integration.md](./feituo-integration.md) | 飞驼集成 - API映射、状态码 | FeiTuoAdapter、status_code |

## 快速开始

### 新增功能
1. 阅读 `development-standards.md` - 了解编码规范
2. 查阅 `database-schema.md` - 确认表结构
3. 参考 `architecture-guide.md` - 设计模块

### 修复Bug
1. 查阅 `state-machine.md` - 理解状态流转
2. 查看 `api-reference.md` - 确认API返回
3. 核对 `database-schema.md` - 验证字段名

### 业务咨询
- 滞港费 → `demurrage-calculation.md`
- 智能排柜 → `intelligent-scheduling.md`
- 飞驼数据 → `feituo-integration.md`

---

**维护者**: LogiX Team  
**最后更新**: 2026-06-23
