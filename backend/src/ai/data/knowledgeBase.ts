/**
 * AI 知识库
 * AI Knowledge Base
 * 
 * 存储物流系统的业务知识，供 AI 对话时检索使用
 */

export interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  content: string;
}

export const knowledgeBase: KnowledgeItem[] = [
  // ==================== 物流状态流转 ====================
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
- returned_empty: 已还空箱

注意：一个货柜可能有多个港口操作记录（中转港、卸货港等），物流状态反映主要流程。`
  },

  // ==================== 筛选条件说明 ====================
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
- 7日内：3天 < 计划提柜日 ≤ 7天

### 按最晚提柜维度
- 已超时：最晚提柜日 < 今日
- 即将超时：今日 ≤ 最晚提柜日 ≤ 3天
- 预警：3天 < 最晚提柜日 ≤ 7天
- 时间充裕：最晚提柜日 > 7天
- 缺最后免费日：没有最晚提柜日信息

### 按最晚还箱维度
- 已超时：最晚还箱日 < 今日
- 即将超时：今日 ≤ 最晚还箱日 ≤ 3天
- 预警：3天 < 最晚还箱日 ≤ 7天
- 时间充裕：最晚还箱日 > 7天`
  },

  // ==================== 滞港费计算规则 ====================
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
5. 附加条件：必须为最新有效期内记录（生效日期≤当前日期 且（结束日期为空 OR 结束日期>=当前日期））

### 多行费用项处理
- 满足条件的标准可能存在多行，每行代表不同的收费项目
- 每项有各自的免费天数与收费计算方式
- 需要分别计算每项费用，然后合计

### 收费标志
- 标记=Y：该项费用不收取（跳过计算）
- 标记=N：该项费用要收取（执行计算）

### 计算方式（免费天数开始日期）
- 按到港：免费天数从目的港预计到港时间（ETA）或实际到港时间（ATA）开始计算
- 按卸船：免费天数从卸船时间开始计算

### 预测模式 vs 实际模式
- actual 模式：使用实际到港日（ATA）计算
- forecast 模式：使用计划提柜日计算（预测模式）`
  },

  // ==================== 时间概念 ====================
  {
    id: 'time-concepts',
    category: '时间概念',
    title: '时间概念说明',
    keywords: ['历时', '倒计时', '超期', '时间', 'eta', 'ata', 'duration'],
    content: `## 时间概念说明

### 三个核心概念
1. **历时**：衡量历史衔接效率
   - 计算方式：当前节点开始时间 - 上一节点结束时间
   - 用途：分析流程效率
   - 显示样式：蓝色中性样式，标记为"历时 X天X小时"

2. **倒计时**：未来日期显示
   - 计算方式：目标日期 - 当前日期
   - 用途：规划提醒
   - 显示样式：
     - 橙色：3天内（紧急）
     - 绿色：>3天（安全）

3. **超期**：风险预警指标
   - 计算方式：当前时间 - 当前节点开始时间 - 标准耗时
   - 用途：人工干预提醒
   - 显示样式：红色脉冲动画，标记为"超期 X天X小时"

### 关键日期字段
- ETA (Estimated Time of Arrival)：预计到港时间
- ATA (Actual Time of Arrival)：实际到港时间
- ETA Correction：修正 ETA
- 计划提柜日：用户维护的预计提柜日期
- 最晚提柜日：由滞港费标准计算得出（起算日+免费天数-1）
- 最晚还箱日：由滞港费标准计算得出

### 标准耗时配置
- 最晚提柜：7天（168小时）
- 最晚还箱：7天（168小时）`
  },

  // ==================== 多港经停 ====================
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
- port_sequence：港口顺序（用于区分同类型多个港口）

### 关键时间字段（共25个时间节点）
- eta_dest_port: 预计到港日期
- ata_dest_port: 实际到港日期
- customs_status: 清关状态
- isf_status: ISF申报状态
- last_free_date: 最后免费日期
- ...等

### 统计规则
只统计目的港类型(port_type='destination')的记录，必须排除中转港(port_type='transit')的记录。
对于有多港经停的货柜，只统计主要目的港（port_type='destination'中port_sequence最大的记录）。`
  },

  // ==================== 数据表结构 ====================
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

### 字典表
- dict_ports: 港口字典
- dict_shipping_companies: 船公司字典
- dict_container_types: 柜型字典
- dict_freight_forwarders: 货代公司字典
- dict_customs_brokers: 清关公司字典
- dict_trucking_companies: 拖车公司字典
- dict_warehouses: 仓库字典

### 核心字段
- 货柜表主键：container_number（集装箱号）
- 备货单主键：order_number（备货单号）
- 外键关系：containers.order_number → replenishment_orders.order_number`
  },

  // ==================== 甘特图 ====================
  {
    id: 'gantt-chart',
    category: '可视化',
    title: '甘特图功能',
    keywords: ['甘特图', 'gantt', '可视化', 'timeline'],
    content: `## 甘特图功能

### 泳道类型
1. 按到港：显示货柜的实际/预计到港日期
2. 按提柜计划：显示计划提柜日
3. 按最晚提柜：显示最晚提柜日
4. 按最晚还箱：显示最晚还箱日

### 日期取值优先级（按到港）
1. container.ataDestPort（实际到港日）
2. container.etaCorrection（修正ETA）
3. container.etaDestPort（预计到港日）
4. portOperations中destination类型的记录
5. seaFreight.eta（海运表的目的港ETA）

### 筛选逻辑
- 按到港：只包含 currentPortType !== 'transit' 的货柜
- 按计划提柜：只统计有 plannedPickupDate 且未提柜的货柜
- 按最晚提柜：已到目的港且未提柜，且无拖卡运输记录
- 按最晚还箱：已提柜或有拖卡运输记录，且未还箱`
  },

  // ==================== 全局国家筛选 ====================
  {
    id: 'country-filter',
    category: '数据筛选',
    title: '全局国家筛选机制',
    keywords: ['国家', '筛选', 'country', 'filter', 'global'],
    content: `## 全局国家筛选机制

### 机制说明
- 顶部国家选择器选择目标国家
- 选择后系统只显示该国家的数据
- 数据链：containers → replenishment_orders.sell_to_country → customers.customer_name → customers.country

### 实现方式
- 前端：Layout.vue 顶部国家选择器，appStore 保存 scopedCountryCode 到 localStorage
- 请求头：X-Country-Code header 自动添加
- 后端：scopedCountryMiddleware 中间件从 header 读取并写入请求上下文
- 过滤：DateFilterBuilder.addCountryFilters() 使用 getScopedCountryCode() 添加国家过滤条件

### 数据关联
备货单.sell_to_country → 客户.customer_name → 客户.country`
  },

  // ==================== 物流路径 ====================
  {
    id: 'logistics-path',
    category: '物流跟踪',
    title: '物流路径显示',
    keywords: ['物流路径', '节点', 'path', 'milestone', 'tracking'],
    content: `## 物流路径显示

### 节点类型
- BOOKING_CONFIRMED: 订舱确认
- DEPARTED: 已开船
- ARRIVED: 已到港
- BERTHED: 已靠泊
- DISCHARGED: 已卸船
- CUSTOMS_CLEARED: 清关完成
- AVAILABLE: 可提柜
- PICKED_UP: 已提柜
- IN_WAREHOUSE: 已入仓
- RETURNED: 已还箱

### 超期预警
- 未实际到港时：提示"ETA已超期未到港"
- 已实际到港时：提示"最晚提柜日已过"

### 历时计算
- 衡量历史衔接效率：当前节点开始时间 - 上一节点结束时间
- 所有节点都显示历时，用于分析流程效率

### 超期计算
- 风险预警指标：当前时间 - 当前节点开始时间 - 标准耗时
- 仅当前正在进行的节点显示超期`
  },

  // ==================== 飞驼API集成 ====================
  {
    id: 'feituo-integration',
    category: '外部集成',
    title: '飞驼API集成',
    keywords: ['飞驼', 'feituo', 'API', 'external', '同步'],
    content: `## 飞驼API集成

### 数据同步
- 飞驼API实时同步物流状态
- 飞驼专用字段：statusCode, statusOccurredAt, locationNameEn, locationNameCn 等
- 飞驼字段由API写入，Excel导入不处理

### 状态映射
飞驼状态代码 → 系统核心字段更新：
- ata_dest_port: 实际到港时间
- gate_in_time: 进场时间
- gate_out_time: 出场时间
- ...等

### 字段更新优先级
1. 飞驼API（最高优先级）
2. Excel导入
3. 系统计算

### 数据源标记
所有字段更新记录数据来源：Feituo / Excel / System`
  }
];

/**
 * 知识库检索
 */
export function searchKnowledge(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const results: { item: KnowledgeItem; score: number }[] = [];

  for (const item of knowledgeBase) {
    let score = 0;

    // 标题完全匹配
    if (item.title.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    // 关键词匹配
    for (const keyword of item.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 5;
      }
    }

    // 内容包含
    if (item.content.toLowerCase().includes(lowerQuery)) {
      score += 1;
    }

    if (score > 0) {
      results.push({ item, score });
    }
  }

  // 按分数排序，返回前5个最相关的
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 5).map(r => r.item.content);
}

/**
 * 按类别获取知识
 */
export function getKnowledgeByCategory(category: string): KnowledgeItem[] {
  return knowledgeBase.filter(item => item.category === category);
}

/**
 * 获取所有类别
 */
export function getAllCategories(): string[] {
  return [...new Set(knowledgeBase.map(item => item.category))];
}
