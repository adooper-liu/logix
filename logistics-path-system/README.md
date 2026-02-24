# 物流状态可视化系统 (Logistics Path Visualization System)

基于"数据中台 + 微前端 + 组件化"架构的物流状态可视化时间轴系统。

## 项目概述

本项目实现了完整的物流状态可视化路径功能，包括：

- **数据驱动**：前端完全由后端返回的 StatusEvent 数据生成
- **状态机校验**：前端验证状态流转合法性
- **渐进式增强**：支持已完成/进行中/未开始状态展示
- **异常处理**：支持扣留、延误等异常状态高亮

## 技术栈

### 前端
- Vue 3 + TypeScript
- GraphQL Apollo Client
- 状态机模式

### 后端
- Node.js + TypeScript
- GraphQL (Apollo Server)
- Express.js

### 共享类型
- TypeScript 跨平台类型定义

## 项目结构

```
logistics-path-system/
├── frontend/              # 前端应用
│   └── src/
│       ├── components/    # Vue 组件
│       │   └── LogisticsPath.vue
│       ├── views/         # 页面视图
│       │   └── LogisticsPathView.vue
│       ├── types/         # 类型定义
│       │   ├── Logistics.ts
│       │   └── StateMachine.ts
│       └── utils/         # 工具函数
│           └── pathValidator.ts
├── backend/               # 后端应用
│   └── src/
│       ├── graphql/       # GraphQL Schema
│       │   └── logistics.schema.ts
│       ├── resolvers/     # GraphQL 解析器
│       │   └── logistics.resolvers.ts
│       ├── types/         # 后端类型
│       └── utils/         # 工具函数
│           └── pathValidator.ts
└── shared/                # 共享类型
    ├── types/             # 共享类型定义
    │   └── index.ts
    └── constants/         # 共享常量
        └── statusMappings.ts
```

## 核心功能

### 1. 标准化状态枚举

支持 33 种标准状态：

- 初始状态：未出运 (NOT_SHIPPED)
- 集装箱操作：提空箱、进港、装船、离港
- 运输中：航行、中转港抵达/离开、抵港
- 港口操作：卸船、可提货、出港
- 交付：送达、拆箱、还空箱
- 完成：已完成 (COMPLETED)
- 异常/扣留：海关扣留、船公司扣留、码头扣留、费用扣留、弃货、延误、滞期、逾期、拥堵

### 2. 状态机转换规则

100+ 状态流转规则，确保状态流转合法性。例如：
- 装船 (LOADED) → 离港 (DEPARTED)
- 离港 (DEPARTED) → 航行中 (SAILING)
- 航行中 (SAILING) → 抵港 (ARRIVED)

### 3. GraphQL API

#### 查询 (Query)

```graphql
query GetStatusPath($containerNumber: String!) {
  getStatusPathByContainer(containerNumber: $containerNumber) {
    id
    containerNumber
    nodes {
      id
      status
      description
      timestamp
      location {
        name
        code
        country
      }
      nodeStatus
      isAlert
    }
    overallStatus
    eta
    startedAt
    completedAt
  }
}
```

#### 变更 (Mutation)

```graphql
mutation SyncExternalData($source: String!, $data: JSON!, $containerNumber: String!) {
  syncExternalData(source: $source, data: $data, containerNumber: $containerNumber) {
    id
    containerNumber
    overallStatus
    nodes {
      id
      status
      description
    }
  }
}
```

### 4. 前端组件

#### LogisticsPath 组件

核心可视化组件，展示物流状态时间轴：

```vue
<LogisticsPath
  :path="statusPath"
  @node-click="handleNodeClick"
/>
```

**特性：**
- 节点状态颜色区分（绿色-已完成、蓝色-进行中、灰色-未开始）
- 异常状态高亮（红色+闪烁动画）
- 延误信息显示
- 点击查看节点详情

#### LogisticsPathView 视图

完整页面视图，包含：

- 控制面板（刷新、模拟数据切换、验证信息显示）
- 加载/错误/空状态处理
- 路径验证结果展示
- 运输进度条
- 节点详情面板

### 5. 数据验证

前端和后端共享验证逻辑：

- 时间顺序检查
- 状态流转合法性验证
- 重复状态检测
- 异常状态识别

## 使用示例

### 前端集成

```typescript
import { ref } from 'vue';
import { useQuery } from '@apollo/client';
import LogisticsPath from '@/components/LogisticsPath.vue';
import { GET_STATUS_PATH } from '@/graphql/queries';

const { data, loading, error } = useQuery(GET_STATUS_PATH, {
  variables: { containerNumber: 'CNTR123456' }
});

<LogisticsPath v-if="data" :path="data.getStatusPathByContainer" />
```

### 后端调用

```typescript
const { getStatusPathByContainer } = await server.executeOperation({
  query: `
    query($containerNumber: String!) {
      getStatusPathByContainer(containerNumber: $containerNumber) {
        id
        containerNumber
        nodes {
          id
          status
          description
          timestamp
        }
        overallStatus
      }
    }
  `,
  variables: { containerNumber: 'CNTR123456' }
});
```

## 数据模型

### StatusPath（物流路径）

```typescript
interface StatusPath {
  id: string;
  containerNumber: string;
  nodes: StatusNode[];        // 状态节点列表
  overallStatus: PathStatus;    // 整体状态
  eta: Date | null;            // 预计到达时间
  startedAt: Date | null;      // 开始时间
  completedAt: Date | null;    // 完成时间
}
```

### StatusNode（状态节点）

```typescript
interface StatusNode {
  id: string;
  status: StandardStatus;       // 标准状态
  description: string;         // 状态描述
  timestamp: Date;             // 发生时间
  location: Location | null;   // 地理位置信息
  nodeStatus: NodeStatus;      // 节点状态（已完成/进行中/未开始）
  isAlert: boolean;            // 是否异常
  rawData: Record<string, any>; // 原始数据
}
```

## 状态流转示例

```
未出运 → 提空箱 → 进港 → 装船 → 离港 → 航行中 → 抵港 → 卸船 → 可提货 → 出港 → 送达 → 拆箱 → 还空箱 → 已完成
```

异常流转示例：

```
... → 卸船 → 海关扣留 → 可提货 → ... (扣留解除后继续)
... → 可提货 → 费用扣留 → 弃货 → 还空箱 (扣留未解除)
```

## 扩展性

### 添加新的外部数据源

1. 在 `shared/constants/statusMappings.ts` 添加新的状态映射
2. 在后端创建对应的适配器
3. 更新 GraphQL 解析器

### 添加新的状态

1. 在 `shared/types/index.ts` 扩展 `StandardStatus` 枚举
2. 在状态机中添加新的转换规则
3. 更新状态标签和图标映射

## 注意事项

1. 所有类型定义在 `shared/` 目录下，前后端共享
2. 状态机转换规则前后端保持一致
3. 时间节点按 UTC 时间存储，前端渲染时转换为本地时间
4. 异常状态需要特别处理（高亮、动画、通知）

## 未来计划

- [ ] WebSocket 实时推送状态更新
- [ ] 地图组件集成（显示节点地理位置）
- [ ] 延误分析和预警系统
- [ ] 多语言支持
- [ ] 主题定制（暗色模式）
- [ ] 导出功能（PDF、Excel）
- [ ] 批量路径对比

## 许可证

MIT License
