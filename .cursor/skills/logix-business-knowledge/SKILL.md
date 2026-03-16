---
name: logix-business-knowledge
description: Manage and query LogiX project business knowledge. Use when you need to access business rules, process flows, and domain knowledge for the LogiX logistics management system.
---

# LogiX 业务知识技能

> 📚 **Skills 索引**: 本技能提供 LogiX 项目的业务知识查询功能，其他专用技能请参考 [Skills 索引](../README.md)
>
> - 🔗 **logix-development** - LogiX 项目开发技能
> - 🔗 **database-query** - 数据库查询专用技能
> - 🔗 **document-processing** - Excel/PDF 文档处理技能
> - 🔗 **code-review** - 代码质量审查技能

## 🎯 核心功能

### 1. 业务知识查询

```
✅ 快速检索：基于关键词匹配和分数排序
✅ 分类浏览：按业务类别浏览知识
✅ 详细内容：获取完整的业务知识详情
✅ 实时更新：与知识库保持同步
```

### 2. 知识管理

```
✅ 自动更新：支持从文件和API导入
✅ 智能合并：自动合并重复内容
✅ 备份机制：更新前自动备份
✅ 统计分析：提供知识库统计信息
```

---

## 📚 业务知识分类

### 1. 物流状态流转

**核心内容**：
- 7层流转架构：not_shipped → shipped → in_transit → at_port → picked_up → unloaded → returned_empty
- 各状态含义和转换规则
- 多港经停场景处理

**适用场景**：
- 理解物流状态变化
- 排查状态异常
- 开发状态相关功能

### 2. 筛选条件

**核心内容**：
- 按到港维度：今日到港、之前未提柜、之前已提柜
- 按ETA维度：已逾期、3日内、7日内、7日后
- 按计划提柜维度：已逾期、今日计划、3日内、7日内
- 按最晚提柜维度：已超时、即将超时、预警、时间充裕
- 按最晚还箱维度：已超时、即将超时、预警、时间充裕

**适用场景**：
- 开发筛选功能
- 理解数据过滤逻辑
- 排查筛选相关问题

### 3. 滞港费计算

**核心内容**：
- 标准匹配条件：进口国、目的港、船公司、货代公司、有效期
- 多行费用项处理
- 收费标志：Y（不收取）、N（要收取）
- 计算方式：按到港、按卸船
- 预测模式 vs 实际模式

**适用场景**：
- 开发滞港费计算功能
- 排查费用计算问题
- 理解费用规则

### 4. 时间概念

**核心内容**：
- 历时：衡量历史衔接效率
- 倒计时：未来日期显示
- 超期：风险预警指标
- 关键日期字段：ETA、ATA、计划提柜日、最晚提柜日、最晚还箱日

**适用场景**：
- 开发时间相关功能
- 理解时间计算逻辑
- 排查时间显示问题

### 5. 甘特图功能

**核心内容**：
- 泳道类型：按到港、按提柜计划、按最晚提柜、按最晚还箱
- 日期取值优先级：实际到港日 → 修正ETA → 预计到港日 → 港口操作记录 → 海运表ETA
- 筛选逻辑：根据不同泳道类型应用不同的筛选条件

**适用场景**：
- 开发甘特图功能
- 理解甘特图逻辑
- 排查甘特图显示问题

### 6. 全局国家筛选

**核心内容**：
- 机制说明：顶部国家选择器选择目标国家，系统只显示该国家的数据
- 实现方式：前端选择器 → appStore存储 → 请求头传递 → 后端中间件处理 → 数据过滤
- 数据关联：备货单.sell_to_country → 客户.customer_name → 客户.country

**适用场景**：
- 开发国家筛选功能
- 理解数据过滤机制
- 排查国家筛选问题

### 7. 物流路径

**核心内容**：
- 节点类型：订舱确认、已开船、已到港、已靠泊、已卸船、清关完成、可提柜、已提柜、已入仓、已还箱
- 超期预警：未实际到港时提示"ETA已超期未到港"，已实际到港时提示"最晚提柜日已过"
- 历时计算：当前节点开始时间 - 上一节点结束时间
- 超期计算：当前时间 - 当前节点开始时间 - 标准耗时

**适用场景**：
- 开发物流路径功能
- 理解路径节点逻辑
- 排查路径显示问题

### 8. 飞驼API集成

**核心内容**：
- 数据同步：飞驼API实时同步物流状态
- 状态映射：飞驼状态代码 → 系统核心字段更新
- 字段更新优先级：飞驼API（最高）→ Excel导入 → 系统计算
- 数据源标记：所有字段更新记录数据来源

**适用场景**：
- 开发飞驼API集成
- 理解数据同步机制
- 排查同步问题

### 9. 智能排产

**核心内容**：
- 功能入口：Shipments页面的「一键排产」按钮、Scheduling独立排产管理页面
- 排产流程：查询待排产货柜 → 按ATA/ETA排序 → 计算计划日期 → 选择资源 → 写回数据
- 待排产货柜条件：schedule_status为initial/issued，有目的港ATA或ETA
- 卸柜方式：Live load（直提）、Drop off（落箱）
- 堆场能力来源：仓库自己的堆箱能力 → 车队堆场能力

**适用场景**：
- 开发排产功能
- 理解排产逻辑
- 排查排产问题

### 10. 客户类型

**核心内容**：
- 平台客户 (PLATFORM)：WAYFAIR、AMAZON、TARGET等电商平台
- 集团内部子公司 (SUBSIDIARY)：AoSOM/MH集团海外子公司
- 其他客户 (OTHER)：非平台、非子公司的外部客户

**适用场景**：
- 开发客户相关功能
- 理解客户分类逻辑
- 排查客户数据问题

---

## 🛠️ 使用指南

### 查询业务知识

**基本查询**：
```typescript
// 导入知识库服务
import { searchKnowledge, getKnowledgeByCategory, getAllCategories } from '../services/knowledge';

// 按关键词查询
const results = searchKnowledge('滞港费计算');

// 按分类查询
const logisticsStatus = getKnowledgeByCategory('物流状态');

// 获取所有分类
const categories = getAllCategories();
```

**高级查询**：
```typescript
// 使用知识库管理器
import { knowledgeManager } from '../ai/utils/knowledgeManager';

// 获取知识库统计
const stats = knowledgeManager.getStatistics();

// 合并知识库
await knowledgeManager.mergeKnowledgeBase(newItems);

// 导出知识库
await knowledgeManager.exportToFile('knowledge-backup.ts');
```

### 知识库更新

**从文件导入**：
```typescript
await knowledgeManager.importFromFile('new-knowledge.ts');
```

**从API导入**：
```typescript
await knowledgeManager.importFromApi('https://api.example.com/knowledge');
```

**清理知识库**：
```typescript
await knowledgeManager.cleanupKnowledgeBase();
```

---

## 🎓 常见问题

### 1. 知识库文件位置

**位置**：`backend/src/ai/data/knowledgeBase.ts`

**结构**：
- `KnowledgeItem` 接口定义
- `knowledgeBase` 数组存储知识条目
- `searchKnowledge` 函数用于检索
- `getKnowledgeByCategory` 函数按分类获取
- `getAllCategories` 函数获取所有分类

### 2. 知识库管理器

**位置**：`backend/src/ai/utils/knowledgeManager.ts`

**功能**：
- 管理知识库的自动更新
- 支持从文件和API导入
- 提供知识库统计信息
- 自动备份和清理功能

### 3. 知识条目结构

```typescript
interface KnowledgeItem {
  id: string;           // 唯一标识符
  category: string;     // 分类
  title: string;        // 标题
  keywords: string[];   // 关键词
  content: string;      // 内容
}
```

### 4. 检索算法

**评分规则**：
- 标题完全匹配：+10分
- 关键词匹配：+5分/个
- 内容包含：+1分

**结果排序**：
- 按分数降序排序
- 返回前5个最相关的结果

---

## 📚 参考文档

### 核心文件

- [知识库数据文件](../../backend/src/ai/data/knowledgeBase.ts)
- [知识库管理器](../../backend/src/ai/utils/knowledgeManager.ts)
- [AI控制器](../../backend/src/ai/controllers/ai.controller.ts)（包含知识库API）

### 相关技能

- **logix-development** - LogiX 项目开发技能
- **database-query** - 数据库查询专用技能
- **code-review** - 代码质量审查技能

### 业务文档

- [物流流程完整说明](../../frontend/public/docs/02-architecture/02-物流流程完整说明.md)
- [物流状态机](../../frontend/public/docs/05-state-machine/02-物流状态机.md)
- [甘特图调度机制](../../frontend/public/docs/11-project/07-甘特图调度与货柜资源关联机制.md)
- [智能排产与五节点调度最终开发方案](../../frontend/public/docs/11-project/10-智能排产与五节点调度最终开发方案.md)

---

## 🆘 遇到问题怎么办

### 1. 知识库更新失败

```bash
# 检查文件权限
ls -la backend/src/ai/data/knowledgeBase.ts

# 检查文件格式
cat backend/src/ai/data/knowledgeBase.ts

# 查看日志
npm run logs
```

### 2. 检索结果不准确

```bash
# 检查关键词设置
grep -n "keywords" backend/src/ai/data/knowledgeBase.ts

# 检查检索函数
cat backend/src/ai/data/knowledgeBase.ts | grep -A 30 "searchKnowledge"
```

### 3. 知识库内容过时

```bash
# 手动更新知识库
node -e "const { knowledgeManager } = require('./backend/src/ai/utils/knowledgeManager'); knowledgeManager.updateKnowledgeBase(newItems);"

# 或使用API更新
curl -X POST http://localhost:3001/api/v1/ai/knowledge -H "Content-Type: application/json" -d '{"items": [...]}'
```

---

## 📅 最后更新

| 版本 | 日期       | 更新内容                                                      |
| ---- | ---------- | ------------------------------------------------------------- |
| 1.0  | 2026-03-16 | 初始版本，基于 LogiX 项目业务知识，整合知识库管理功能         |

---

**记住**：业务知识是系统开发的基础，准确理解和应用这些知识将大大提高开发效率和系统质量！💪✨