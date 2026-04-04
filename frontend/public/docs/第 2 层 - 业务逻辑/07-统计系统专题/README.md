# 统计系统专题

**创建时间**: 2026-04-01  
**最后更新**: 2026-04-01  
**作者**: 刘志高  
**状态**: 完整文档体系

---

## 概述

统计系统是 LogiX 物流系统的数据分析核心，提供多维度货柜统计、状态分布、月度货量等功能，支持业务决策和运营监控。

### 核心价值

1. **多维度统计**: 按到港、ETA、计划提柜、最晚提柜、最晚还箱等 5 个维度统计
2. **实时预警**: 识别超期、即将超期等风险货柜
3. **状态分布**: 完整的货柜生命周期分布
4. **月度货量**: 业务趋势分析和预测
5. **高性能**: SQL 子查询模板优化，批量查询

---

## 文档结构

```
07-统计系统专题/
│
├── 核心文档（必读）
│   ├── 01-统计系统架构完整指南.md ← 新手入门，建立系统概念
│   │   └── ✅ 统计维度详解
│   │   └── ✅ 核心组件职责
│   │   └── ✅ 数据流与业务流程
│   │   └── ✅ SQL 子查询模板
│   │
│   ├── 02-统计服务实现指南.md ← 核心逻辑
│   │   └── ✅ 5 大统计服务
│   │   └── ✅ SQL 模板类
│   │   └── ✅ 查询构建器
│   │   └── ✅ 测试覆盖
│   │
│   ├── 03-前端统计组件使用指南.md ← 实战配置
│   │   └── ✅ 筛选条件映射
│   │   └── ✅ 统计卡片组件
│   │   └── ✅ 甘特图统计面板
│   │   └── ✅ 倒计时 Composable
│   │   │   └── 滞港费计算与写回机制 ← 专项 NEW
│       └── ✅ last_free_date 自动计算
│       └── ✅ 写回库机制
│       └── ✅ 定时任务
│       └── ✅ 数据一致性
│
├── 历史与参考（按需查阅）📚
│   ├── 02-统计.md (原) ← 基础概念 + 快速参考
│   └── 11-统计使用计算日期.md ← 写回机制设计文档
│
└── README.md ← 本文档（导航）
    └── 学习路径、快速查找表、使用建议
```

---

## 🎯 学习路径

### 初学者路径（快速上手）

```
Step 1: 阅读 01-系统架构指南 (1-1.5 小时)
       ↓ 理解 5 大统计维度
       ↓ 掌握核心组件职责
       ↓ 了解数据流和业务流程

Step 2: 阅读 02-统计服务实现 (2-3 小时)
       ↓ 理解每个统计服务的实现
       ↓ 掌握 SQL 子查询模板
       ↓ 了解查询构建器使用

Step 3: 阅读 03-前端组件使用 (1-2 小时)
       ↓ 学会筛选条件映射
       ↓ 掌握统计卡片使用
       ↓ 学会甘特图统计面板

Step 4: 实战演练 (0.5-1 小时)
       ↓ 调用统计 API
       ↓ 处理筛选条件
       ↓ 查看统计结果
```

**预计时间**: 4.5-6.5 小时

---

### 进阶者路径（按需查阅）

```
需要新增统计维度 → 查阅 01-架构 → 一、统计维度
       ↓ 理解维度定义
       ↓ 设计 SQL 模板

需要修改统计逻辑 → 查阅 02-服务实现 → 对应服务
       ↓ 检查 SQL 模板
       ↓ 验证测试结果

需要优化性能 → 查阅 02-服务实现 → 四、性能优化
       ↓ 批量查询
       ↓ 索引优化

需要了解写回机制 → 查阅 04-滞港费计算与写回
       ↓ last_free_date 自动计算
       ↓ 写回库触发时机
```

**预计时间**: 按需查阅

---

### 问题排查路径（快速定位）

```
Step 1: 打开 02-统计.md → 五、实施坑点
       ↓ 根据错误现象找到对应章节

Step 2: 执行 SQL 验证脚本
       ↓ 检查子查询模板
       ↓ 验证统计结果

Step 3: 查看日志定位根因
       ↓ [Statistics] 前缀日志
       ↓ [DemurrageWriteBack] 前缀日志
```

**预计时间**: 10-30 分钟

---

## 📊 核心知识体系

### 一、统计维度详解

#### 1.1 按到港统计

```
已到目的港
├── 今日到港 (arrivalToday)
├── 之前未提柜 (arrivedBeforeTodayNotPickedUp)
└── 之前已提柜 (arrivedBeforeTodayPickedUp)

已到中转港 (transit)
├── ETA 逾期 (transitOverdue)
├── ETA 3 日内 (transitWithin3Days)
├── ETA 7 日内 (transitWithin7Days)
└── ETA 7 日后 (transitOver7Days)

预计到港 (无中转)
├── ETA 逾期 (expectedArrivalOverdue)
├── ETA 3 日内 (expectedArrivalWithin3Days)
├── ETA 7 日内 (expectedArrivalWithin7Days)
└── ETA 7 日后 (expectedArrivalOver7Days)
```

**关键字段**: `ata_dest_port`, `eta_dest_port`, `port_type='destination'`

---

#### 1.2 按 ETA 统计

```
在途 (shipped/in_transit)
├── 逾期未到 (overdue)
├── 3 日内到港 (within3Days)
├── 7 日内到港 (within7Days)
└── 7 日后到港 (over7Days)
```

**关键字段**: `eta_dest_port`, `shipment_date`

---

#### 1.3 按计划提柜统计

```
有计划提柜日
├── 逾期 (overduePlanned)
├── 今日 (todayPlanned)
├── 3 日内 (plannedWithin3Days)
└── 7 日内 (plannedWithin7Days)

无计划提柜日 (pendingArrangement)
```

**关键字段**: `planned_pickup_date`, `process_trucking_transport.pickup_date`

---

#### 1.4 按最晚提柜统计 ⭐

```
有最后免费日
├── 已超时 (expired) - last_free_date < today
├── 即将超时 (urgent) - today <= last_free_date <= 3 days
├── 预警 (warning) - 3 days < last_free_date <= 7 days
└── 正常 (normal) - last_free_date > 7 days

无最后免费日 (noLastFreeDate)
```

**关键字段**: `process_port_operations.last_free_date`（可自动计算写回）

---

#### 1.5 按最晚还箱统计 ⭐

```
有最后还箱日
├── 已超时 (returnExpired)
├── 即将超时 (returnUrgent)
├── 预警 (returnWarning)
└── 正常 (returnNormal)

无最后还箱日 (noLastReturnDate)
```

**关键字段**: `process_empty_return.last_return_date`（可自动计算写回）

---

### 二、核心组件职责

#### 6 大核心服务

| 服务                               | 职责                     | 关键方法                     |
| ---------------------------------- | ------------------------ | ---------------------------- |
| **ContainerStatisticsService**     | 统计统一入口，委托子服务 | getStatistics()              |
| **ArrivalStatisticsService**       | 按到港统计               | getArrivalStatistics()       |
| **EtaStatisticsService**           | 按 ETA 统计              | getEtaStatistics()           |
| **PlannedPickupStatisticsService** | 按计划提柜统计           | getPlannedPickupStatistics() |
| **LastPickupStatisticsService**    | 按最晚提柜统计           | getLastPickupStatistics()    |
| **LastReturnStatisticsService**    | 按最晚还箱统计           | getLastReturnStatistics()    |

---

#### SQL 模板类

| 模板类                           | 文件                              | 说明                |
| -------------------------------- | --------------------------------- | ------------------- |
| `ArrivalSubqueryTemplates`       | ArrivalSubqueryTemplates.ts       | 按到港统计 SQL 模板 |
| `PlannedPickupSubqueryTemplates` | PlannedPickupSubqueryTemplates.ts | 按计划提柜 SQL 模板 |
| `LastPickupSubqueryTemplates`    | LastPickupSubqueryTemplates.ts    | 按最晚提柜 SQL 模板 |

---

#### 查询构建器

| 构建器                      | 文件                                | 说明               |
| --------------------------- | ----------------------------------- | ------------------ |
| `DateFilterBuilder`         | common/DateFilterBuilder.ts         | 日期过滤构建器     |
| `DateRangeSubquery`         | common/DateRangeSubquery.ts         | 日期范围子查询     |
| `ContainerQueryBuilder`     | common/ContainerQueryBuilder.ts     | 货柜查询构建器     |
| `PortOperationQueryBuilder` | common/PortOperationQueryBuilder.ts | 港口操作查询构建器 |

---

### 三、数据流

```
用户访问 Shipments 页面
        ↓
前端调用 ContainerService.getStatistics()
        ↓
后端 ContainerStatisticsService.getStatistics()
        ↓
根据维度委托给对应子服务：
├─ 按到港 → ArrivalStatisticsService
├─ 按 ETA → EtaStatisticsService
├─ 按计划提柜 → PlannedPickupStatisticsService
├─ 按最晚提柜 → LastPickupStatisticsService
└─ 按最晚还箱 → LastReturnStatisticsService
        ↓
子服务使用 SQL 子查询模板统计
        ↓
返回统计结果
        ↓
前端展示统计卡片
```

---

### 四、SQL 子查询模板

#### 示例：今日到港

```sql
SELECT COUNT(DISTINCT c.container_number) as count
FROM biz_containers c
INNER JOIN process_port_operations po
  ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND po.ata_dest_port = $1
  AND po.port_sequence = (
    SELECT MAX(port_sequence)
    FROM process_port_operations
    WHERE container_number = c.container_number
      AND port_type = 'destination'
  )
```

**关键点**:

- ✅ 使用 `port_sequence` 确保取最新一条港口操作
- ✅ 使用 `port_type='destination'` 过滤中转港
- ✅ 使用 `DISTINCT` 避免重复计数

---

### 五、写回机制 ⭐

#### last_free_date 自动计算与写回

**触发时机**:

1. 用户打开滞港费详情时（`calculateForContainer` 返回后，异步写回）
2. 定时任务：每 6 小时批量计算并写回

**写回条件**:

- ✅ `process_port_operations.last_free_date IS NULL`
- ✅ demurrage 计算出 `lastPickupDateComputed`
- ✅ 无实际提柜日（`pickup_date IS NULL`）

**写回策略**:

- ✅ 不覆盖人工维护（仅当 DB 值为空时写回）
- ✅ 幂等（多次计算，结果一致时可重复写回）
- ✅ 可配置（通过开关控制是否启用）

---

## 🔍 快速查找表

### 常见问题快速定位

| 问题类型                 | 推荐文档            | 章节           |
| ------------------------ | ------------------- | -------------- |
| **统计数量与列表不一致** | 02-统计.md          | 五、1 节       |
| **日期边界问题**         | 02-统计.md          | 五、1 节       |
| **中转港误统计**         | 02-统计.md          | 五、1 节       |
| **性能问题**             | 02-服务实现·四      | 性能优化       |
| **last_free_date 为空**  | 04-滞港费计算与写回 | 三、写回机制   |
| **统计卡片值不一致**     | 04-滞港费计算与写回 | 五、数据一致性 |

---

### 常见错误码定位

| 错误现象     | 根因                   | 解决文档                       |
| ------------ | ---------------------- | ------------------------------ |
| **统计偏少** | port_type 未过滤       | 02-统计.md → 五、1 节          |
| **统计偏多** | 未使用 DISTINCT        | 02-服务实现·四                 |
| **日期错位** | JS Date 转 timestamptz | 02-统计.md → 五、1 节          |
| **写回失败** | DB 字段约束            | 04-滞港费计算与写回 → 六、2 节 |

---

### API 接口速查

| 端点                              | 方法 | 说明               | 文档                                                           |
| --------------------------------- | ---- | ------------------ | -------------------------------------------------------------- |
| `/containers/statistics`          | GET  | 获取统计概览       | [02-服务实现](./02-统计服务实现指南.md#一API 接口)             |
| `/containers/statistics/detailed` | GET  | 详细统计（含分布） | [02-服务实现](./02-统计服务实现指南.md#一API 接口)             |
| `/demurrage/batch-write-back`     | POST | 手动触发批量写回   | [04-滞港费计算与写回](./04-滞港费计算与写回机制.md#三定时任务) |

---

## 📚 文档统计

### 数量统计

| 类别           | 文档数   | 总大小     |
| -------------- | -------- | ---------- |
| **核心文档**   | 4 篇     | ~80KB      |
| **历史与参考** | 2 篇     | ~17KB      |
| **导航文档**   | 1 篇     | ~15KB      |
| **总计**       | **7 篇** | **~112KB** |

---

### 编号分布

```
01:  系统架构 (1 篇) ⭐ 必读
02:  服务实现 (1 篇) 🛠️ 开发必备
03:  前端组件 (1 篇) 💻 前端使用
04:  写回机制 (1 篇) 💰 专项参考
02-统计.md:  基础概念 (1 篇) 📖 快速参考
11-统计使用计算日期.md:  设计文档 (1 篇) 📝 历史记录
README: 导航文档 (1 篇) 🗺️
```

---

## 🎓 使用建议

### 第一次使用

1. **从 01-系统架构开始**
   - 花 1-1.5 小时理解 5 大统计维度
   - 掌握核心组件职责
   - 了解数据流和业务流程

2. **然后看 02-服务实现**
   - 理解每个统计服务的实现
   - 掌握 SQL 子查询模板
   - 了解查询构建器使用

3. **最后看 03-前端组件**
   - 学会筛选条件映射
   - 掌握统计卡片使用
   - 学会甘特图统计面板

---

### 日常使用

1. **遇到统计问题** → 查阅 02-统计.md → 五、实施坑点
2. **遇到性能问题** → 查阅 02-服务实现 → 四、性能优化
3. **遇到数据不一致** → 查阅 04-滞港费计算与写回 → 五、数据一致性
4. **需要新增维度** → 查阅 01-系统架构 → 一、统计维度

---

### 开发新功能时

1. **需要新增统计维度**
   - 参考 01-架构的维度定义
   - 创建对应的 SQL 模板
   - 编写单元测试

2. **需要修改统计逻辑**
   - 参考 02-服务实现的实现
   - 验证测试结果
   - 更新文档

3. **需要优化性能**
   - 参考 02-服务实现的性能优化
   - 使用批量查询
   - 添加索引

---

## 🔄 维护机制

### 文档更新

- **责任人**: 刘志高
- **更新周期**: 每季度审查一次
- **更新流程**:
  1. 收集使用反馈
  2. 识别过时内容
  3. 更新核心文档
  4. 标记历史变更

---

### 新增文档

如需新增文档，遵循以下编号规则：

```
新增主题 → 使用下一个可用编号（如 05、06）
补充内容 → 使用小数编号（如 01.1）
临时文档 → 使用 T 前缀（T01、T02）
```

---

## 📞 反馈与建议

### 发现问题

如发现问题或有不明白的地方：

1. **记录问题**: 详细描述问题和场景
2. **查阅文档**: 先尝试自己解决
3. **提出反馈**: 联系文档维护者
4. **共同改进**: 提交修改建议

---

### 联系方式

- **文档维护者**: 刘志高
- **邮箱**: [待填写]
- **Slack**: [待填写]
- **文档位置**: `frontend/public/docs/第 2 层 - 业务逻辑/07-统计系统专题/`

---

## ✨ 文档演进历史

### v1.0 (2026-04-01) - 文档体系统一

- ✅ 将统计相关文档统一到 `07-统计系统专题` 文件夹
- ✅ 重新编号为连续序列（01-04）
- ✅ 明确各文档定位（核心/历史/参考）
- ✅ 创建统一的 README 导航
- ✅ 添加快速查找表和交叉引用

---

**文档状态**: ✅ 完整文档体系已建成  
**维护者**: 刘志高  
**最后更新**: 2026-04-01
