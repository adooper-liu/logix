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
- eta: 预计到港日期
- ata: 实际到港日期
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
- ata: 实际到港时间
- gate_in_time: 进场时间
- gate_out_time: 出场时间
- ...等

### 字段更新优先级
1. 飞驼API（最高优先级）
2. Excel导入
3. 系统计算

### 数据源标记
所有字段更新记录数据来源：Feituo / Excel / System`
  },

  // ==================== 排产功能 ====================
  {
    id: 'scheduling-feature',
    category: '排产功能',
    title: '智能排产功能',
    keywords: ['排产', '智能排产', 'scheduling', '一键排产', 'batch'],
    content: `## 智能排产功能

### 功能入口
- Shipments 页面：「一键排产」按钮
- Scheduling 页面：/scheduling 独立排产管理页面

### 排产流程（6步）
1. 查询待排产货柜（schedule_status = initial/issued）
2. 按 ATA/ETA 排序（先到先得）
3. 计算计划日期：清关日→提柜日→送仓日
4. 选择资源：仓库产能/车队档期
5. 写回数据到数据库

### 待排产货柜条件
- schedule_status 为 'initial' 或 'issued'
- 必须有目的港 ATA 或 ETA
- 可按日期范围过滤
- 可按国家筛选

### 单柜排产失败原因
- 无目的港操作记录
- 无到港日期（ATA/ETA）
- 无可用仓库
- 仓库产能不足
- 无可用车队

### 排产结果字段
- 柜号、状态（成功/失败）
- 目的港、仓库名称
- ETA、ATA
- 计划提柜日、计划送仓日、计划还箱日`
  },

  // ==================== 排产规则 ====================
  {
    id: 'scheduling-rules',
    category: '排产功能',
    title: '排产计算规则',
    keywords: ['排产规则', '先到先得', '产能', '滞港费'],
    content: `## 排产计算规则

### 核心原则：先到先得
- 按清关可放行日（ATA > ETA）排序
- 同日内按 last_free_date 升序
- 优先处理急单

### 计划日期计算
1. 清关计划日 = ETA（或 ATA）
2. 提柜日 = 清关日 + 1（或 last_free_date）
3. 送仓日 = 提柜日 + 运输天数
4. 还箱日 = 卸柜日 + 7天（或 lastReturnDate）

### 约束校验
- 仓库产能：检查 ext_warehouse_daily_occupancy
- 车队档期：检查 ext_trucking_slot_occupancy
- 滞港费约束：计划提柜日 ≤ 最晚提柜日

### 卸柜方式
- **Live load（直提）**：提柜日当天仓库有卸柜产能，货柜直接送到仓库并当日卸柜（提=送=卸同日），还箱日也同卸柜日
- **Drop off（落箱）**：提柜日当天仓库无卸柜产能，使用堆场作为临时缓冲

### 堆场能力来源（优先级）
1. **仓库自己的堆箱能力**：优先使用仓库堆箱来缓解卸柜压力
2. **车队堆场能力**：当仓库堆箱不足时，使用车队堆场作为缓冲

### 仓库是否支持 Drop off
- 由仓库属性 supportDropOff 或 supportStackYard 决定
- 如果仓库**不支持** Drop off → 只能使用 Live load
- 如果仓库**支持** Drop off → 可以选择使用 Drop off 或 Live load

### 手工指定卸柜方式
- 用户可以手工指定使用 Live load
- 如果指定了 Live load → 即使仓库支持 Drop off 也不能用 Drop off
- 这是排产计算后的结果标记

### 设计原则
- 放堆场**不是必选项**，而是临时缓冲机制
- 用于平衡「能力压力」与「费用成本」双重考量
- 优先考虑仓库自身堆箱能力，不足时再使用车队堆场

### 滞港费按需写回
- 排产前对本次待排产货柜计算滞港费
- 将 lastPickupDateComputed 合并到容器
- 确保计划提柜日 ≤ 最晚提柜日`
  },

  // ==================== 客户类型 ====================
  {
    id: 'customer-types',
    category: '数据筛选',
    title: '客户类型说明',
    keywords: ['客户', '客户类型', 'PLATFORM', 'SUBSIDIARY', 'OTHER'],
    content: `## 客户类型说明

### 客户分类
LogiX 数据库中客户分为三类：

1. **平台客户 (PLATFORM)**
   - WAYFAIR、AMAZON、TARGET 等电商平台
   - 共 7 家

2. **集团内部子公司 (SUBSIDIARY)**
   - AoSOM/MH 集团海外子公司
   - 包括：AOSOM_US、MH_UK、MH_DE 等 9 家

3. **其他客户 (OTHER)**
   - 非平台、非子公司的外部客户

### 数据关联
- 客户表：biz_customers
- 客户类型：dict_customer_types (PLATFORM/SUBSIDIARY/OTHER)
- 海外公司：dict_overseas_companies
- 关联字段：customer_type_code、overseas_company_code、customer_category`
  },

  // ==================== 项目概述 ====================
  {
    id: 'project-overview',
    category: '项目信息',
    title: 'LogiX项目概述',
    keywords: ['项目', '概述', '核心价值', '定位'],
    content: `## LogiX项目概述

### 项目定位
一个完整的**国际物流管理系统**，采用现代化的微服务架构，提供从备货单创建到最终还空箱的全流程跟踪与管理。

### 核心价值
1. **全流程可视化** - 33 种物流状态实时追踪
2. **智能调度** - 基于状态机的自动排程
3. **数据集成** - 飞驼 API 无缝对接
4. **多维度分析** - 甘特图、桑基图、统计卡片

### 系统架构
- **前端层**: Vue 3 + Element Plus (端口: 5173)
- **主服务层**: Express + TypeORM (端口: 3001)
- **物流路径微服务**: Apollo GraphQL (端口: 4000)
- **数据层**: PostgreSQL/TimescaleDB + Redis`
  },

  // ==================== 技术栈 ====================
  {
    id: 'tech-stack',
    category: '技术信息',
    title: '技术栈详解',
    keywords: ['技术栈', '后端', '前端', '微服务'],
    content: `## 技术栈详解

### 后端技术栈
- Node.js 18+、TypeScript 5.3+、Express 4.18+
- TypeORM 0.3+、PostgreSQL 14+、TimescaleDB
- Redis 7+、Socket.IO 4.6+、Winston 3.11+

### 前端技术栈
- Vue 3 3.4+、TypeScript 5.3+、Element Plus 2.4.4
- Pinia 2.1.7、Vue Router 4.2.5、Axios 1.6.2
- ECharts 5.4.3、Apollo Client

### 微服务技术栈
- Apollo Server 4.10+、Express 4.18+`
  },

  // ==================== 核心功能 ====================
  {
    id: 'core-features',
    category: '功能模块',
    title: '核心功能模块',
    keywords: ['功能', '模块', '集装箱管理', '状态可视化'],
    content: `## 核心功能模块

### 1. 集装箱全生命周期管理
- 备货单创建 → 货柜分配 → 提空箱 → 装货 → 进港 → 装船 → 海运运输 → 抵港卸船 → 清关 → 提货运送 → 仓库卸货 → 还空箱 → 流程完成

### 2. 物流状态可视化
- 33 种标准状态，包括初始状态、集装箱操作、运输中、港口操作、交付、完成、异常状态
- 完整的状态流转规则

### 3. 外部数据适配器
- FeiTuoAdapter (主要数据源)
- LogisticsPathAdapter (备用数据源)
- CustomApiAdapter (扩展适配器)
- 支持统一接口标准、自动故障转移、健康检查机制

### 4. 甘特图可视化
- 简单甘特图：按目的港分组，日视图（7/15/30 天切换）
- 完整甘特图：多泳道（到港/提柜/还箱等维度），可配置，复杂筛选

### 5. 统计与监控
- 统计卡片：总集装箱数、在途数量、异常数量、已完成数量
- 倒计时卡片：最晚提柜倒计时、最晚还箱倒计时、免费期倒计时
- 监控系统：Prometheus + Grafana，服务健康状态，性能指标监控，实时告警`
  },

  // ==================== 数据库设计 ====================
  {
    id: 'database-design',
    category: '数据结构',
    title: '数据库设计',
    keywords: ['数据库', '表结构', '实体关系', '命名规范'],
    content: `## 数据库设计

### 表结构概览（共 30 张表）
- **字典表**: 7 张（港口、船公司、柜型等）
- **业务表**: 2 张（备货单、货柜）
- **流程表**: 5 张（海运、港口操作、拖车、仓库、还箱）
- **飞驼扩展表**: 4 张（状态事件、装载记录、HOLD、费用）
- **扩展表**: 2 张（滞港费标准、记录）
- **其他辅助表**: 10 张（国家、客户、SKU 等）

### 核心实体关系
- biz_replenishment_orders → biz_containers
- biz_containers → process_sea_freight
- biz_containers → process_port_operations
- biz_containers → process_trucking_transport
- biz_containers → process_warehouse_operations
- biz_containers → process_empty_return

### 命名规范
- 数据库表名：前缀 + snake_case (如 biz_containers)
- 数据库字段：snake_case (如 container_number)
- 实体属性：camelCase + @Column (如 containerNumber)
- API 映射：与数据库一致`
  },

  // ==================== 开发规范 ====================
  {
    id: 'dev-standards',
    category: '开发规范',
    title: '开发规范',
    keywords: ['开发规范', '核心原则', '命名规则', '代码风格'],
    content: `## 开发规范

### 核心原则
1. **数据库优先** - 表结构是唯一基准
2. **禁止临时补丁** - 不用 SQL UPDATE 修补数据
3. **开发顺序** - SQL → 实体 → API → 前端
4. **日期口径统一** - 所有展示使用顶部日期范围

### 命名规则
- 实体类：PascalCase
- 实体属性：camelCase
- 数据库表：snake_case
- 数据库字段：snake_case

### 代码风格
- 缩进：2 空格
- 引号：单引号
- 后端：加分号，行宽 ~120
- 前端：无分号，行宽 ~100
- 禁止：console.log、硬编码中文、硬编码色值

### 组件拆分
- 单一职责：一个文件只做一类事
- 文件大小：Vue < 300 行，TS < 200 行
- 命名体现职责：ContainerDetails, useContainerData`
  },

  // ==================== 文档体系 ====================
  {
    id: 'docs-system',
    category: '项目信息',
    title: '文档体系',
    keywords: ['文档', '体系', '分类', '维护规范'],
    content: `## 文档体系

### 文档分类

#### 正式文档（frontend/public/docs/）
- **特征**: 长期有效、持续更新
- **目录**: 11 个分类，70+ 文档
- **示例**: 开发规范、架构设计、API 文档

#### 临时文档（frontend/public/docs/09-misc/）
- **特征**: 特定场景、可能过期
- **用途**: 修复记录、迁移记录、验证报告
- **清理**: 定期整合或删除

### 核心文档索引
- **01-standards/**: 9 文档（命名规范、代码规范）
- **02-architecture/**: 5 文档（物流流程完整说明）
- **03-database/**: 3 文档（数据库主表关系）
- **05-state-machine/**: 3 文档（物流状态机）
- **06-statistics/**: 12 文档（甘特图显示逻辑）
- **08-deployment/**: 4 文档（TimescaleDB指南）
- **11-project/**: 18 文档（项目行动指南）

### 文档维护规范
1. **新增文档**: 先分类，再编号命名
2. **更新文档**: 标注版本号和更新日期
3. **删除文档**: 确认价值，整合内容
4. **定期维护**: 每月检查临时文档`
  },

  // ==================== 快速开始 ====================
  {
    id: 'quick-start',
    category: '项目信息',
    title: '快速开始指南',
    keywords: ['快速开始', '环境要求', '安装步骤', 'Docker部署'],
    content: `## 快速开始指南

### 环境要求
- Node.js >= 18.x
- PostgreSQL >= 14.x 或 TimescaleDB
- Redis >= 7.x
- npm >= 9.x

### 安装步骤
1. 克隆项目：git clone <repository-url> && cd logix
2. 安装后端依赖：cd backend && npm install
3. 安装前端依赖：cd ../frontend && npm install
4. 配置数据库：cp backend/.env.example backend/.env
5. 初始化数据库：psql -U postgres -f 03_create_tables.sql
6. 启动服务：
   - 后端：cd backend && npm run dev (端口 3001)
   - 前端：cd frontend && npm run dev (端口 5173)

### Docker 部署
- 使用 Docker Compose 启动完整环境：docker-compose -f docker-compose.timescaledb.yml up -d
- 查看日志：docker-compose logs -f backend
- 停止服务：docker-compose -f docker-compose.timescaledb.yml down`
  },

  // ==================== 数据服务 ====================
  {
    id: 'data-service',
    category: '数据服务',
    title: '数据服务重构方案',
    keywords: ['数据服务', 'ContainerQueryBuilder', 'ContainerDataService', '重构', '查询优化'],
    content: `## 数据服务重构方案

### 背景
为了统一货柜数据查询逻辑，减少代码重复，进行了数据服务重构。

### 核心组件

#### 1. ContainerQueryBuilder
- 位置：backend/src/services/statistics/common/ContainerQueryBuilder.ts
- 功能：构建统一的货柜查询
- 方法：
  - createListQuery：创建列表查询（含分页）
  - createBaseQuery：创建基础查询

#### 2. ContainerDataService
- 位置：backend/src/services/ContainerDataService.ts
- 功能：分层数据服务
- 方法：
  - getContainersForList：列表页面数据
  - getContainersForStats：统计页面数据
  - getContainerDetail：详情页面数据

### 查询流程
1. Controller 调用 ContainerDataService
2. ContainerDataService 使用 ContainerQueryBuilder 构建查询
3. 查询结果通过 enrichContainersList 进行数据丰富
4. 返回给前端

### 字段验证
- containerNumber：货柜号
- order.actualShipDate：出运日期
- sf.shipmentDate：海运日期（备选）
- seaFreight：海运信息

### 关联关系
- biz_containers → process_sea_freight (bill_of_lading_number)
- biz_containers → biz_replenishment_orders (container_number)
- biz_containers → process_port_operations (container_number)`
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
