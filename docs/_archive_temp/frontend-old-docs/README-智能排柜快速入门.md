# 智能排柜系统 - 快速入门指南

**🚀 5 分钟快速了解项目全貌**

---

## 📌 一句话介绍

LogiX 智能排柜系统是一个基于规则引擎的物流自动化调度平台，可自动计算货柜的清关、提柜、送柜、卸柜、还箱日期，支持 Live load 和 Drop off 两种卸柜模式。

---

## 🎯 核心价值

- ✅ **自动化排产**: 从 ETA/ATA 自动推导 5 个关键节点日期
- ✅ **智能决策**: 根据车队是否有堆场自动判断卸柜方式
- ✅ **档期管理**: 精细化管控仓库日产能和车队送/还柜能力
- ✅ **约束优化**: 考虑 last_free_date、周末、产能等多重约束
- ✅ **可视化**: 直观的甘特图和资源配置界面

---

## 📚 文档导航（按角色）

### 👨‍💻 开发人员

| 文档 | 用途 | 阅读时间 |
|------|------|----------|
| [综合开发实施总纲](./智能排柜系统综合开发实施总纲.md) | **必读**：总体规划、架构、路线图 | 30 分钟 |
| [开发与优化方案](./智能排柜系统开发与优化方案.md) | 详细任务分解、技术方案 | 20 分钟 |
| [性能优化实战指南](./性能优化实战指南.md) | 性能调优、故障排查 | 15 分钟 |
| [测试指南](./智能排柜系统测试指南.md) | 测试用例、质量保障 | 15 分钟 |

### 🧪 测试人员

| 文档 | 用途 | 阅读时间 |
|------|------|----------|
| [测试指南](./智能排柜系统测试指南.md) | **必读**：完整测试策略和用例 | 20 分钟 |
| [功能完整文档](./智能排柜功能完整文档.md) | 了解业务逻辑和预期行为 | 15 分钟 |

### 📊 产品经理

| 文档 | 用途 | 阅读时间 |
|------|------|----------|
| [功能完整文档](./智能排柜功能完整文档.md) | **必读**：完整用户手册 | 25 分钟 |
| [开发进度总结](./智能排柜系统开发进度总结.md) | 了解项目状态和待办事项 | 10 分钟 |

### 🔧 运维工程师

| 文档 | 用途 | 阅读时间 |
|------|------|----------|
| [性能优化实战指南](./性能优化实战指南.md) | **必读**：监控、调优、应急预案 | 20 分钟 |
| [综合开发实施总纲](./智能排柜系统综合开发实施总纲.md) | 了解架构和部署计划 | 15 分钟 |

---

## 🔑 核心概念速查

### 1. 卸柜方式（2 种）

| 模式 | 适用场景 | 日期关系 | 特点 |
|------|----------|----------|------|
| **Live load** | 车队无堆场 | 提=送=卸 | 同一天完成所有动作 |
| **Drop off** | 车队有堆场 | 提<送=卸 | 可以分多天进行 |

**判断逻辑**:
```typescript
if (truckingCompany.hasYard === true) {
  mode = "Drop off";   // 可以灵活安排
} else {
  mode = "Live load";  // 必须当天完成
}
```

---

### 2. 五个关键日期

```
成本优化流程（新）:
1. 卸柜日是瓶颈 ← 先根据仓库产能确定候选卸柜日范围
2. 评估每个卸柜日的总成本
   ├─ 滞港费 = f(卸柜日，last_free_date, 阶梯费率)
   ├─ 堆存费 = f(是否需要外部堆场)
   └─ 运输费 = f(Live load vs Drop off)
3. 选择总成本最低的方案
4. 根据最优卸柜日反推其他日期
   - 提柜日 = 确保不产生滞港费的最晚日期
   - 送柜日 = 提柜日 (Live load) 或 卸柜日 (Drop off)
   - 还箱日 = 卸柜日 (Live load) 或 卸柜日 +1 (Drop off)
```

**核心逻辑**: 
- ✅ **卸柜日是关键**：先确定候选卸柜日，再评估成本
- ✅ **成本驱动决策**: 比较滞港费 vs 堆存费
- ✅ **送柜日和还箱日由卸柜日和模式推导**

---

### 3. 三级映射链

```
港口 (Port) → 车队 (Trucking) → 仓库 (Warehouse)

示例:
Vancouver → TRUCK001 → CA-S003
```

**数据库表**:
- `dict_trucking_port_mapping`: 港口→车队
- `dict_warehouse_trucking_mapping`: 车队→仓库

---

### 4. 档期管理（3 类）

| 档期类型 | 表名 | 扣减时机 |
|----------|------|----------|
| **仓库日产能** | ext_warehouse_daily_occupancy | 卸柜日 |
| **车队送柜档期** | ext_trucking_slot_occupancy | 提柜日 |
| **车队还箱档期** | ext_trucking_return_slot_occupancy | 还箱日 (仅 Drop off) |

---

## ⚡ 快速开始

### 环境准备

```bash
# 必需环境
Node.js >= 18
PostgreSQL >= 14
Redis >= 6 (可选，用于缓存)

# 安装依赖
cd backend && npm install
cd ../frontend && npm install
```

---

### 启动开发环境

```bash
# 终端 1: 启动后端
cd backend
npm run dev
# 访问：http://localhost:3000

# 终端 2: 启动前端
cd frontend
npm run dev
# 访问：http://localhost:5173
```

---

### 运行第一个排产

```bash
# 单柜模拟
curl -X POST http://localhost:3000/api/v1/scheduling/simulate \
  -H "Content-Type: application/json" \
  -d '{"containerNumber":"TEST001"}'

# 批量排产
curl -X POST http://localhost:3000/api/v1/scheduling/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-03-01",
    "endDate": "2026-03-31",
    "country": "CA",
    "limit": 10
  }'
```

---

### 运行测试

```bash
# 单元测试
cd backend
npm test

# 集成测试
npm run test:integration

# E2E 测试
npm run test:e2e

# 性能测试
k6 run tests/performance/k6-scheduling.js
```

---

## 📊 项目健康度

```
当前状态：85% ████████████░░░░
                    
├─ 数据库设计    100% ✅
├─ 后端服务      95%  ⚠️
├─ 前端界面      60%  ⚠️
├─ 测试覆盖      15%  ❌
└─ 文档完整性    100% ✅
```

**本周优先级 (P0)**:
- [ ] 后端服务测试与修复
- [ ] 前端基础功能完善
- [ ] 单元测试覆盖率 > 50%

---

## 🎯 核心 KPI

| 指标 | 目标值 | 当前值 | 状态 |
|------|--------|--------|------|
| 单柜排产响应时间 | < 500ms | - | ⏳ |
| 批量排产 (10 柜) | < 5s | - | ⏳ |
| 单元测试覆盖率 | > 80% | 15% | ❌ |
| 排产成功率 | > 95% | - | ⏳ |

---

## 🔍 常见问题速查

### Q1: 如何判断卸柜方式？

**A**: 查看车队的 `has_yard` 字段：
- `has_yard = true` → Drop off
- `has_yard = false` → Live load

---

### Q2: 档期如何扣减？

**A**: 三个步骤：
1. 扣减仓库日产能（卸柜日）
2. 扣减车队送柜档期（提柜日）
3. 扣减车队还箱档期（仅 Drop off 模式）

---

### Q3: 周末如何处理？

**A**: 由配置项 `skip_weekends` 控制：
- `skip_weekends = true`: 自动跳过周六、周日
- `skip_weekends = false`: 周末也可排产

---

### Q4: 如何查看排产性能？

**A**: 查看性能监控日志：
```bash
tail -f backend/logs/app.log | grep "PERF"
```

---

### Q5: 排产失败怎么办？

**A**: 检查错误信息：
- "无目的港操作记录" → 检查 portOperations
- "无到港日期" → 检查 ETA/ATA
- "无映射关系中的仓库" → 配置 mapping 表
- "仓库产能不足" → 增加 dailyCapacity

---

## 📞 获取帮助

### 技术支持渠道

1. **文档查询**: `frontend/public/docs/` 目录
2. **代码问题**: 查看源码注释和 TypeScript 类型定义
3. **紧急问题**: emergency@logix.com
4. **产品咨询**: product@logix.com

### 快速诊断命令

```bash
# 检查后端状态
curl http://localhost:3000/health

# 查看数据库连接
psql -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# 检查 Redis 缓存
redis-cli INFO stats | grep hit_rate

# 查看实时日志
tail -f backend/logs/app.log
```

---

## 🚀 下一步

### 今日任务（立即执行）

```bash
# 1. 重启后端
cd backend && npm run dev

# 2. 测试单柜排产
curl -X POST http://localhost:3000/api/v1/scheduling/simulate \
  -d '{"containerNumber":"TEST001"}'

# 3. 查看详细文档
open frontend/public/docs/智能排柜系统综合开发实施总纲.md
```

### 本周目标（截止 3-22）

- ✅ 完成 P0 任务清单
- ✅ 单元测试覆盖率 > 50%
- ✅ 输出首份测试报告

---

## 📚 附录

### A. 核心文件位置

```
backend/
├── src/services/intelligentScheduling.service.ts  # 核心算法
├── src/controllers/scheduling.controller.ts        # API 接口
└── src/entities/                                   # TypeORM 实体

frontend/
├── src/views/scheduling/SchedulingVisual.vue       # 主界面
└── public/docs/                                    # 文档目录
```

### B. 关键 API 端点

```
GET  /api/v1/containers/scheduling-overview   # 排产概览
POST /api/v1/scheduling/schedule              # 批量排产
POST /api/v1/scheduling/simulate              # 单柜模拟
GET  /api/v1/scheduling/occupancy/stats       # 档期统计
```

### C. 推荐学习路径

**Day 1**: 
- 阅读《功能完整文档》了解业务
- 运行单柜模拟熟悉流程

**Day 2**: 
- 阅读《综合开发实施总纲》了解架构
- 运行集成测试验证功能

**Day 3**: 
- 深入源码学习核心算法
- 尝试优化和改进

---

**祝您使用愉快！** 🎉

**LogiX 项目开发团队**  
2026-03-17
