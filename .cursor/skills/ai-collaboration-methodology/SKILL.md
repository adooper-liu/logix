---
name: ai-collaboration-methodology
description: AI协作开发方法论 - 需求理解、技能调用、错误排查、SOP流程。用于开发/排查时按流程执行，避免重复问题。
---

# AI 协作开发方法论

> 📚 完整文档：[18-AI协作开发方法论与问题复盘.md](../../../frontend/public/docs/11-project/18-AI协作开发方法论与问题复盘.md)

---

## 一、技能调用流程（标准操作）

```
用户需求
    ↓
1. 判断任务类型（功能开发 / Bug 修复 / 数据迁移 / 文档 / 配置）
    ↓
2. 读取对应技能（开发→logix-development；数据库→database-query；导入→excel-import-requirements）
    ↓
3. 查阅 Rules（logix-project-map 查表/API；logix-development-standards 查规范）
    ↓
4. 定位代码/文档（Grep、SemanticSearch、Read）
    ↓
5. 执行修改（遵循开发顺序：SQL → 实体 → API → 前端）
    ↓
6. 验证（ReadLints、npm run lint / type-check）
```

---

## 二、需求理解：四步法

| 步骤 | 动作 | 产出 |
|------|------|------|
| **1. 明确意图** | 用户说的是「要做什么」还是「解释/排查」？ | 避免过度编辑 |
| **2. 拆解范围** | 涉及哪些层：DB / 实体 / API / 前端？ | 影响分析清单 |
| **3. 查现有实现** | 搜索相关代码、文档、映射表 | 不重复造轮子 |
| **4. 对齐规范** | 对照 logix-development-standards | 符合项目约定 |

### 需求理解检查清单

- [ ] 用户是要「改代码」还是「问问题」？
- [ ] 涉及哪些模块（智能排产 / 导入 / 统计 / 甘特图 / …）？
- [ ] 是否有文档可参考？
- [ ] 命名是否与数据库一致（snake_case）？
- [ ] 日期口径是否统一（actual_ship_date / shipment_date）？

---

## 三、错误排查：速查表

### 3.1 错误分类与排查路径

| 错误类型 | 典型表现 | 排查思路 | 常见根因 |
|----------|----------|----------|----------|
| **数据库不存在** | `relation "xxx" does not exist` | 查 migrations 是否有建表脚本 | 迁移未执行 |
| **API 无响应/超时** | ERR_CONNECTION_RESET | 后端日志、全量处理超时 | 未分批 |
| **业务逻辑错误** | 提<送、日期在过去 | 查文档 04、10 对照业务规则 | 写死逻辑 |
| **映射/字段错误** | 无可用车队、无可用仓库 | 查 dict_*_mapping 表 | 映射表空 |
| **命名不一致** | dailyCapacity vs dailyUnloadCapacity | 查实体定义 | 字段名写错 |

### 3.2 智能排产专项排查

| message | 排查顺序 | 解决动作 |
|---------|----------|----------|
| 无目的港操作记录 | process_port_operations port_type='destination' | 补数据或修查询 |
| 无到港日期 | ata_dest_port、eta_dest_port | 补数据 |
| 无可用仓库 | dict_warehouses、dict_warehouse_trucking_mapping | 配置映射 |
| 无可用车队 | dict_warehouse_trucking_mapping + trucking_port_mapping | 配置映射+回退 |
| relation "ext_xxx" does not exist | migrations/*.sql | 执行迁移 |

---

## 四、智能排产：Message → 动作

| 用户 Message | 识别动作 | 处理 |
|--------------|----------|------|
| "没有待排产的货柜" | 排查API返回0 | 检查schedule_status、port_type过滤条件 |
| "API 500错误" | 查日志 | 检查SQL查询、添加try-catch |
| "字段名错误" | 查实体 | dailyCapacity → dailyUnloadCapacity |
| "无可用车队" | 查映射表 | warehouse→trucking映射、trucking→port映射 |

---

## 五、避免重复问题清单

- [ ] 新表/新列需注明执行哪个 migrations/*.sql
- [ ] 长耗时 API 需支持 limit/skip 或分批
- [ ] 映射类逻辑需加回退路径
- [ ] 边界条件（日期下限、空值、表无数据）需显式处理
- [ ] 需求澄清：术语、优先级先确认再实现

---

## 六、SOP 速查

### 新增功能 SOP
```
1. 读 logix-development 技能
2. 查 logix-project-map 确认表/API
3. 数据库：03_create_tables.sql + migrations/xxx.sql
4. 实体：entities/ + index.ts
5. 后端：Service → Controller → Routes
6. 前端：services → views → components
7. npm run lint / type-check
```

### 修复 Bug SOP
```
1. 看错误 message / 堆栈
2. 分类：DB / API / 业务逻辑 / 映射
3. 按错误分类表定位
4. 修改 + 验证
```

### 需求澄清 SOP
```
1. 用户是否要改代码？（避免过度编辑）
2. 术语是否明确？（如「提升」「直接送」）
3. 优先级是否明确？（ETA vs ATA）
4. 有文档可依则先读再答
```

---

## 七、参考文档

| 文档 | 用途 |
|------|------|
| [16-一键排产功能与问题排查](../../../frontend/public/docs/11-project/16-一键排产功能与问题排查.md) | 排产数据流、失败原因 |
| [17-智能排产页面问题与优化](../../../frontend/public/docs/11-project/17-智能排产页面问题与优化.md) | Scheduling 页问题 |
| [04-五节点调度与可视化方案](../../../frontend/public/docs/11-project/04-五节点调度与可视化方案.md) | 卸柜方式、仓库能力 |
| [10-智能排柜与五节点调度最终开发方案](../../../frontend/public/docs/11-project/10-智能排柜与五节点调度最终开发方案.md) | 排柜架构 |

---

**最后更新**: 2026-03-14
