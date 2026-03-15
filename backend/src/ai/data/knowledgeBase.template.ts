/**
 * AI 知识库模板
 * AI Knowledge Base Template
 * 
 * 使用说明：
 * 1. 在前端知识库管理页面创建和编辑知识条目
 * 2. 点击"导出模板"按钮获取代码格式
 * 3. 将导出的代码复制到 backend/src/ai/data/knowledgeBase.ts 中
 * 4. 重启后端服务使更改生效
 * 
 * 知识条目结构说明：
 * - id: 唯一标识符（建议使用英文简短名称）
 * - category: 分类（用于分组显示）
 * - title: 标题（简洁明了）
 * - keywords: 关键词数组（用于搜索匹配，多个关键词用逗号分隔）
 * - content: 内容（支持 Markdown 格式）
 */

// ==================== 模板示例 ====================

// 物流状态示例
{
  id: 'logistics-status',
  category: '物流状态',
  title: '物流状态流转',
  keywords: ['状态', '流转', '桑基图', '物流状态', 'state', 'status'],
  content: `## 物流状态流转
LogiX 系统使用 7 层流转架构：
not_shipped → shipped → in_transit → at_port → picked_up → unloaded → returned_empty

各状态含义：
- not_shipped: 未出运
- shipped: 已出运（已装船）
- in_transit: 在途（航行中）
- at_port: 已到港（已到目的港/中转港）
- picked_up: 已提柜（已提箱）
- unloaded: 已卸柜（已卸到仓库）
- returned_empty: 已还空箱`
}

// 筛选条件示例
{
  id: 'filter-conditions',
  category: '筛选条件',
  title: '筛选条件说明',
  keywords: ['筛选', '过滤', '按到港', '按ETA', '按计划提柜', 'filter', 'condition'],
  content: `## 筛选条件说明

### 按到港维度
- 今日到港：当天 ATA（实际到港日）的货柜
- 之前未提柜：今日之前已到港但尚未提柜
- 之前已提柜：今日之前已到港且已提柜

### 按 ETA 维度
- 已逾期：ETA < 今日
- 3日内：今日 ≤ ETA ≤ 3天
- 7日内：3天 < ETA ≤ 7天
- 7日后：ETA > 7天

### 按计划提柜维度
- 已逾期：计划提柜日 < 今日
- 今日计划：计划提柜日 = 今日
- 3日内：今日 < 计划提柜日 ≤ 3天
- 7日内：3天 < 计划提柜日 ≤ 7天`
}

// 滞港费示例
{
  id: 'demurrage-rules',
  category: '滞港费',
  title: '滞港费计算规则',
  keywords: ['滞港费', '堆存费', 'demurrage', 'storage', 'free_days', '免费天数'],
  content: `## 滞港费计算规则

### 标准匹配条件（四个字段必须同时满足）
1. 进口国信息（货柜表中的 destination_country）
2. 目的港（destination_port）
3. 船公司（shipping_company）
4. 货代公司（freight_forwarder）
5. 附加条件：必须为最新有效期内记录

### 多行费用项处理
满足条件的标准可能存在多行，每行代表不同的收费项目

### 收费标志
- 标记=Y：该项费用不收取（跳过计算）
- 标记=N：该项费用要收取（执行计算）

### 计算方式
- 按到港：从 ETA 或 ATA 开始计算
- 按卸船：从卸船时间开始计算`
}

// 时间概念示例
{
  id: 'time-concepts',
  category: '时间概念',
  title: '时间概念说明',
  keywords: ['历时', '倒计时', '超期', '时间', 'eta', 'ata', 'duration'],
  content: `## 时间概念说明

### 三个核心概念
1. **历时**：衡量历史衔接效率（蓝色）
2. **倒计时**：未来日期显示（橙色/绿色）
3. **超期**：风险预警指标（红色脉冲）

### 关键日期字段
- ETA (Estimated Time of Arrival)：预计到港时间
- ATA (Actual Time of Arrival)：实际到港时间
- 计划提柜日：用户维护的预计提柜日期
- 最晚提柜日：由滞港费标准计算得出
- 最晚还箱日：由滞港费标准计算得出`
}

// 港口操作示例
{
  id: 'multi-port',
  category: '港口操作',
  title: '多港经停场景',
  keywords: ['多港', '中转港', '目的港', '经停', 'port', 'transit', 'destination'],
  content: `## 多港经停场景

### 港口类型 (port_type)
- origin: 起运港
- transit: 中转港
- destination: 目的港

### 港口操作表 (port_operations)
支持多港经停场景，通过以下字段实现：
- port_type：港口类型
- port_sequence：港口顺序

### 统计规则
只统计目的港类型(port_type='destination')的记录，必须排除中转港(port_type='transit')的记录。`
}

// 数据结构示例
{
  id: 'table-structure',
  category: '数据结构',
  title: '数据库表结构',
  keywords: ['表', '表结构', '数据库', 'table', 'schema', '字段'],
  content: `## 数据库表结构

### 7 层流转架构
1. 备货单 (biz_replenishment_orders)
2. 货柜 (biz_containers)
3. 海运 (process_sea_freight)
4. 港口操作 (process_port_operations)
5. 拖卡运输 (process_trucking_transport)
6. 仓库操作 (process_warehouse_operations)
7. 还空箱 (process_empty_returns)

### 核心字段
- 货柜表主键：container_number（集装箱号）
- 备货单主键：order_number（备货单号）
- 外键关系：containers.order_number → replenishment_orders.order_number`
}

// ==================== 新建知识条目指南 ====================

/**
 * 在前端知识库管理页面创建新知识条目的步骤：
 * 
 * 1. 点击"新建知识"按钮
 * 2. 选择或输入分类
 * 3. 填写标题（简洁明了）
 * 4. 填写关键词（用逗号分隔，用于搜索匹配）
 * 5. 填写内容（支持 Markdown 格式）
 * 6. 点击"添加"保存
 * 7. 点击"导出模板"获取代码
 * 8. 将代码复制到后端 knowledgeBase.ts 文件中
 * 9. 重启后端服务
 * 
 * 建议的分类：
 * - 物流状态
 * - 筛选条件
 * - 滞港费
 * - 时间概念
 * - 港口操作
 * - 数据结构
 * - 可视化
 * - 数据筛选
 * - 物流跟踪
 * - 外部集成
 */
