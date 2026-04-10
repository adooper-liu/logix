# 🎯 LogiX 技能地图

**版本：** v2.0  
**更新日期：** 2026-03-27  
**状态：** ✅ 已重构

---

## 🚀 快速入口

**统一索引：** [📋 INDEX.md](../INDEX.md) - **推荐起点**  
**验证报告：** [🔍 SKILL_VERIFICATION_REPORT.md](../SKILL_VERIFICATION_REPORT.md) - **可信可用**

---

## 🗺️ 欢迎使用 LogiX 技能体系

本技能地图帮助你快速找到项目开发所需的最佳实践和规范指南。

**查找技能就像查地图一样简单！**

---

## 📚 技能分类导航

### 🔰 核心技能（所有开发者必读）

| 技能 | 说明 | 重要性 |
|------|------|--------|
| [📘 开发范式总纲](./logix-dev-paradigm.md) | 五维分析法、SKILL 原则、开发流程 | ⭐⭐⭐⭐⭐ **必读** |
| [📖 使用指南](./USAGE_GUIDE.md) | 如何使用技能文件 | ⭐⭐⭐⭐ |
| [🔧 维护清单](./MAINTENANCE.md) | 文档维护规范 | ⭐⭐⭐ |

---

### 💻 后端技能

#### 数据库相关

| 技能 | 说明 | 使用场景 | 成熟度 |
|------|------|----------|--------|
| [数据库查询](./01-backend/database-query/) | PostgreSQL/TimescaleDB 规范 | 编写 SQL、数据分析 | ✅ 推荐 |
| [Table Design](./01-backend/postgresql-table-design/) | PostgreSQL 表设计最佳实践 | 新建表结构 | ✅ 推荐 |
| [TypeORM EXISTS 子查询](./01-backend/typeorm-exists-subquery-solution/) | 解决 DISTINCT + ORDER BY 问题 | 复杂查询优化 | ✅ 推荐 |

#### 数据处理

| 技能 | 说明 | 使用场景 | 成熟度 |
|------|------|----------|--------|
| [Excel 导入要求](./01-backend/excel-import-requirements/) | Excel 导入规范 | 货柜、备货单导入 | ✅ 推荐 |
| [数据验证](./01-backend/data-import-verify/) | 验证导入完整性 | 导入后检查 | ✅ 推荐 |
| [文档处理](./01-backend/document-processing/) | Excel/PDF处理 | 文件上传导出 | ✅ 推荐 |

---

### 🎨 前端技能

#### Vue 开发

| 技能 | 说明 | 使用场景 | 成熟度 |
|------|------|----------|--------|
| [Vue 最佳实践](./02-frontend/vue-best-practices/) | Composition API + `<script setup>` | 组件开发、重构 | ✅ 推荐 |
| [Vue 测试](./02-frontend/vue-testing-best-practices/) | Vitest + Vue Test Utils | 单元测试、E2E 测试 | ✅ 推荐 |

#### UI/UX

| 技能 | 说明 | 使用场景 | 成熟度 |
|------|------|----------|--------|
| [Ant Design Vue](./02-frontend/antd-guidelines.md) | AntD 组件使用规范 | 界面开发 | ⭐⭐⭐ |
| [响应式设计](./02-frontend/responsive-design.md) | 移动端适配 | 响应式布局 | ⭐⭐⭐ |

---

### ⚙️ 运维技能

#### Docker & 部署

| 技能 | 说明 | 使用场景 | 成熟度 |
|------|------|----------|--------|
| [Docker 脚本](./03-devops/docker-scripts/) | Docker 命令封装 | 本地开发环境 | 🧪 实验中 |
| [部署指南](./03-devops/deployment-guide/) | 生产环境部署 | 上线发布 | 🧪 实验中 |

---

### ✅ 质量保障

#### 代码审查

| 技能 | 说明 | 使用场景 | 成熟度 |
|------|------|----------|--------|
| [代码审查](./04-quality/code-review/) | Code Review 规范 | PR 审查、质量检查 | ✅ 推荐 |
| [质量门禁](./04-quality/logix-quality-gates/) | 合并前检查、技术债治理 | 合并前验证、CI 配置 | ✅ 推荐 |

#### Git 规范

| 技能 | 说明 | 使用场景 | 成熟度 |
|------|------|----------|--------|
| [提交信息](./04-quality/commit-message/) | Git Commit Message 规范 | 代码提交 | ✅ 推荐 |

#### 测试

| 技能 | 说明 | 使用场景 | 成熟度 |
|------|------|----------|--------|
| [测试指南](./04-quality/testing-guidelines/) | 测试编写规范 | 单元测试、集成测试 | 🧪 实验中 |

---

### 🏭 领域知识

#### 智能排产

| 技能 | 说明 | 使用场景 | 成熟度 |
|------|------|----------|--------|
| [日期计算](./05-domain/scheduling/date-calculation.md) | 排产日期算法 | 提柜日、送仓日计算 | ✅ 推荐 |
| [滞港费计算](./05-domain/scheduling/demurrage-calculation/) | 成本优化算法 | 费用计算、预览 | ✅ 推荐 |
| [排产历史记录](./05-domain/scheduling/history-tracking.md) | 历史追溯方案 | 审计、分析 | ✅ 推荐 |

#### 物流追踪

| 技能 | 说明 | 使用场景 | 成熟度 |
|------|------|----------|--------|
| [飞驼 ETA 验证](./05-domain/logistics/feituo-eta-validation.md) | ETA 数据校验 | 到港时间验证 | ✅ 推荐 |
| [物流状态机](./05-domain/logistics/status-machine.md) | 状态流转规则 | 物流跟踪 | ⭐⭐⭐ |

#### 清关管理

| 技能 | 说明 | 使用场景 | 成熟度 |
|------|------|----------|--------|
| [清关验证](./05-domain/customs/validation-rules.md) | 清关状态验证 | 清关功能 | 🧪 实验中 |

---

## 🚀 快速开始路径

### 👶 新人入职（第 1 周）

```
Day 1: 阅读 [开发范式总纲](./logix-dev-paradigm.md)
       └─> 理解五维分析法
       └─> 掌握 SKILL 原则

Day 2: 学习岗位相关技能
       后端 → [数据库查询](./01-backend/database-query/)
       前端 → [Vue 最佳实践](./02-frontend/vue-best-practices/)

Day 3: 实践 [代码审查](./04-quality/code-review/)
       └─> 参与 PR 审查
       └─> 应用审查 checklist

Day 4-5: 第一个功能开发
         └─> 应用所学技能
         └─> 编写测试
         └─> 提交代码
```

---

### 🔍 按需查找（问题解决）

**遇到问题时：**

1. **数据库查询慢？**
   → [数据库查询 - 性能优化](./01-backend/database-query/#性能优化)

2. **Vue 组件太复杂？**
   → [Vue 最佳实践 - 组件拆分](./02-frontend/vue-best-practices/#组件设计)

3. **如何写 Commit Message？**
   → [提交信息规范](./04-quality/commit-message/)

4. **滞港费计算不对？**
   → [滞港费计算技能](./05-domain/scheduling/demurrage-calculation/)

---

## 📊 技能成熟度说明

| 等级 | 标识 | 说明 | 推荐度 |
|------|------|------|--------|
| **经过验证** | ✅ Recommended | 已在多个项目中验证，强烈推荐 | ⭐⭐⭐⭐⭐ |
| **谨慎使用** | ⚠️ Use with care | 基本验证，特定场景适用 | ⭐⭐⭐⭐ |
| **实验阶段** | 🧪 Experimental | 未经充分验证，慎用 | ⭐⭐⭐ |
| **已知问题** | ❌ Deprecated | 已知有问题，不推荐 | ⭐⭐ |
| **已废弃** | 🚫 Obsolete | 完全废弃，勿用 | ⭐ |

---

## 🔗 相关资源

### 内部资源

- [项目 README](../../README.md)
- [开发环境配置](../../docs/开发环境配置.md)
- [API 文档](../../docs/API 文档索引.md)

### 外部资源

- [Vue 3 官方文档](https://vuejs.org/)
- [TypeORM 文档](https://typeorm.io/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

---

## 📝 更新记录

### v2.0 (2026-03-27) - 🔧 重构版

**重大变更：**
- ✅ 消除 45% 冗余文件
- ✅ 建立清晰分类体系
- ✅ 创建统一技能地图
- ✅ 制定维护规范

**新增内容：**
- 📚 快速开始路径
- 🎯 成熟度评级
- 🔗 资源链接

---

### v1.0 (之前版本) - 📦 原始版

**特点：**
- 文件分散
- 重复较多
- 缺少组织

---

## 🎯 下一步行动

### 对于使用者

1. **收藏本页** - 作为日常参考
2. **按图索骥** - 根据需要查找技能
3. **反馈建议** - 帮助改进技能体系

### 对于维护者

1. **季度审查** - 每季度末审查技能
2. **月度检查** - 每月最后一周检查质量
3. **持续改进** - 收集反馈，不断优化

---

## 📞 联系与支持

**问题反馈：**
- GitHub Issues: [提交问题](https://github.com/logix/issues)
- 团队讨论：每周技术分享会

**技能贡献：**
1. Fork 项目
2. 添加新技能文档
3. 提交 PR
4. 团队审查合并

---

**维护者：** LogiX Development Team  
**最后更新：** 2026-03-27  
**下一个审查日期：** 2026-06-27

---

<!-- 自动生成的技能地图 -->
<!-- 使用 JavaScript 或 Python 脚本可定期更新此页面 -->
