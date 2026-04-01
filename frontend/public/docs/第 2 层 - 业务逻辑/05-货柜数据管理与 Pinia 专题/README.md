# 货柜数据管理与 Pinia 专题

**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高  
**状态**: 正式文档体系

---

## 📋 概述

本专题整合货柜数据管理和 Pinia 状态管理的完整知识体系，包括：

- **货柜数据结构**: biz_containers 主表与关联表设计
- **TypeScript 类型**: 完整的接口定义和类型系统
- **Pinia Store**: app Store（全局国家筛选）与 ganttFilters Store（甘特图筛选）
- **ContainerService**: 统一的 API 服务层
- **Composables**: useContainerDetail、useContainerCountdown 等组合式函数
- **状态同步**: 后端 ContainerStatusService 自动更新机制

---

## 📁 文件夹结构

```
05-货柜数据管理与 Pinia 专题/
│
├── 核心文档（必读）⭐
│   ├── 01-货柜数据结构完整指南.md ← 新手入门，建立数据模型概念
│   │   └── ✅ biz_containers 表结构详解
│   │   └── ✅ 关联表 ER 图与查询示例
│   │   └── ✅ TypeScript 类型定义
│   │   └── ✅ gantt_derived 快照结构
│   │
│   ├── 02-Pinia 状态管理完整指南.md ← 核心机制
│   │   └── ✅ app Store（全局国家筛选）
│   │   └── ✅ ganttFilters Store（甘特图筛选）
│   │   └── ✅ 持久化机制
│   │   └── ✅ 请求拦截器配置
│   │
│   └── 03-货柜服务 API 实战指南.md ← 实战应用
│       └── ✅ ContainerService 完整方法
│       └── ✅ Composables 使用模式
│       └── ✅ 常见问题排查
│
└── 历史归档（参考）📜
    └── 06-货柜与 Pinia 原始文档.md ← 历史文档（已迁移）
```

---

## 🎯 学习路径

### 初学者路径（快速上手）

```
Step 1: 阅读 01-数据结构完整指南
       ↓ 理解 biz_containers 主表
       ↓ 掌握关联表关系

Step 2: 阅读 02-Pinia 状态管理指南
       ↓ 理解 app Store 作用
       ↓ 掌握 ganttFilters Store 用法

Step 3: 阅读 03-API 实战指南
       ↓ 学习 ContainerService 调用
       ↓ 掌握 Composables 模式
```

**预计时间**: 2-3 小时

---

### 进阶者路径（深入理解）

```
Step 1: 直接查阅 03-API 实战指南
       ↓ 重点看 Composables 模式
       ↓ 学习实际项目中的用法

Step 2: 针对问题查阅 01-数据结构
       ├── 表结构 → 01-数据结构 → 一、表结构
       ├── 类型定义 → 01-数据结构 → 二、TypeScript
       └── 关联查询 → 01-数据结构 → 三、数据流

Step 3: 深入研究 02-Pinia
       ↓ 理解持久化机制
       ↓ 掌握 watch 自动保存原理
```

**预计时间**: 按需查阅

---

### 问题排查路径（快速定位）

```
Step 1: 打开 03-API 实战指南
       ↓ 查看"常见问题排查"章节

Step 2: 根据错误现象定位
       ├── 401 错误 → 三、1 节
       ├── 缓存问题 → 三、2 节
       └── 国家筛选失效 → 三、3 节

Step 3: 执行 SQL 验证
       ↓ 使用提供的排查脚本
```

**预计时间**: 10-30 分钟

---

## 📚 核心知识体系

### 一、货柜数据结构

#### 数据库表链

```
biz_replenishment_orders (备货单)
         ↓ 1:N
biz_containers (货柜主表，PK: container_number)
         ↓ 1:N
         ├─ process_sea_freight (海运)
         ├─ process_port_operations (港口操作)
         ├─ process_trucking_transport (拖车运输)
         ├─ process_warehouse_operations (仓库操作)
         └─ process_empty_return (还空箱)
```

---

#### 核心字段

| 字段               | 类型         | 说明             | 用途           |
| ------------------ | ------------ | ---------------- | -------------- |
| `container_number` | VARCHAR(100) | 集装箱号（主键） | 全局唯一标识   |
| `logistics_status` | VARCHAR(20)  | 7 层简化状态     | 状态机计算结果 |
| `gantt_derived`    | JSONB        | 甘特图五阶段快照 | 前端渲染依据   |
| `schedule_status`  | VARCHAR(20)  | 排产状态         | 智能排柜引擎   |

---

#### gantt_derived 快照结构

```typescript
interface GanttDerived {
  phase: 1 | 2 | 3 | 4 | 5 // 五阶段
  phaseLabel: string // 清关/提柜/卸柜/还箱/完成
  primaryNode: GanttNodeKey | null // 主节点 key
  nodes: GanttDerivedNode[] // 节点数组
  ruleVersion: string // 规则版本
  derivedAt: string // 计算时间
}

// 五阶段
// 1. 清关 (customs)
// 2. 提柜 (pickup)
// 3. 卸柜 (unload)
// 4. 还箱 (return)
// 5. 完成
```

---

### 二、Pinia 状态管理体系

#### 1. app Store（全局国家筛选）

**文件**: `store/app.ts`

```typescript
export const useAppStore = defineStore('app', () => {
  const scopedCountryCode = ref<string | null>(null)

  function setScopedCountryCode(code: string | null) {
    // 标准化 + 持久化
    scopedCountryCode.value = normalizeCountryCode(code)
    localStorage.setItem('logix_scoped_country_code', code)
  }

  return { scopedCountryCode, setScopedCountryCode }
})
```

**用途**:

- 全局国家筛选
- 所有 API 请求自动带上 `X-Country-Code` header
- localStorage 持久化

---

#### 2. ganttFilters Store（甘特图筛选）

**文件**: `store/ganttFilters.ts`

```typescript
export interface GanttFilterState {
  startDate: string;
  endDate: string;
  filterCondition: string;
  filterLabel: string;
  selectedContainers: string[];
  timeDimension: 'arrival'|'pickup'|'lastPickup'|'return';
}

export const useGanttFilterStore = defineStore('ganttFilters', () => {
  // 状态（从 localStorage 初始化）
  const startDate = ref('');
  const filterCondition = ref('');
  const timeDimension = ref('arrival');

  // ⭐ 自动持久化 ⭐
  watch([startDate, ...], () => {
    persist();  // 保存到 localStorage
  });

  return {
    startDate, filterCondition, timeDimension,
    setFilters, clearFilters, initFromQuery, inferTimeDimension
  };
});
```

**用途**:

- 甘特图筛选条件管理
- URL 参数初始化
- localStorage 持久化
- 时间维度自动推断

---

### 三、ContainerService API

#### 请求拦截器配置

```typescript
this.api.interceptors.request.use(config => {
  // 1. Token 认证
  config.headers.Authorization = `Bearer ${token}`

  // 2. ⭐ 国家筛选 ⭐
  if (appStore.scopedCountryCode) {
    config.headers['X-Country-Code'] = appStore.scopedCountryCode
  }

  // 3. ⭐ 防止缓存 ⭐
  if (config.method === 'get') {
    config.headers['Cache-Control'] = 'no-cache'
    config.headers['Pragma'] = 'no-cache'
  }

  return config
})
```

---

#### 核心方法清单

| 方法                                        | 说明           | 参数                   |
| ------------------------------------------- | -------------- | ---------------------- |
| `getContainers(filters)`                    | 获取货柜列表   | ContainerFilters       |
| `getContainerById(id)`                      | 获取单个详情   | containerNumber        |
| `createContainer(data)`                     | 创建货柜       | Container              |
| `updateContainer(id, data)`                 | 更新货柜       | id, Partial<Container> |
| `deleteContainer(id)`                       | 删除货柜       | id                     |
| `getStatistics()`                           | 获取统计       | -                      |
| `getStatisticsDetailed(params)`             | 详细统计       | StatisticsParams       |
| `getContainersByFilterCondition(condition)` | 按条件筛选     | filterCondition        |
| `writeBackDemurrageDatesForContainer(id)`   | 写回滞港费日期 | containerNumber        |
| `batchWriteBackDemurrageDates(params)`      | 批量写回       | BatchDemurrageParams   |

---

### 四、Composables 模式

#### useContainerDetail

**文件**: `composables/useContainerDetail.ts`

```typescript
export function useContainerDetail() {
  const route = useRoute()
  const router = useRouter()

  // 从路由参数获取货柜号
  const containerNumber = computed(() => {
    const p = route.params.containerNumber as string
    return p ? decodeURIComponent(p) : ''
  })

  // 加载数据
  const containerData = ref<Container | null>(null)
  const loading = ref(false)

  async function loadContainerData() {
    loading.value = true
    try {
      const result = await containerService.getContainerById(containerNumber.value)
      containerData.value = result.data
    } finally {
      loading.value = false
    }
  }

  return { containerNumber, containerData, loading, loadContainerData }
}
```

**使用场景**: 货柜详情页、货柜卡片组件

---

#### useContainerCountdown

**文件**: `composables/useContainerCountdown.ts`

```typescript
export function useContainerCountdown() {
  function getCountdownInfo(container: Container): CountdownInfo {
    const lastFreeDate = container.portOperations?.[0]?.lastFreeDate

    if (!lastFreeDate) {
      return { status: 'no_data', daysLeft: null }
    }

    const diffDays = calculateDiffDays(lastFreeDate)

    if (diffDays < 0) {
      return { status: 'expired', daysLeft: diffDays } // 超期
    } else if (diffDays <= 2) {
      return { status: 'urgent', daysLeft: diffDays } // 紧急
    } else {
      return { status: 'normal', daysLeft: diffDays } // 正常
    }
  }

  return { getCountdownInfo }
}
```

**使用场景**: 滞港费预警卡片、最晚提柜日统计

---

## 🔍 快速查找表

### 常见问题快速定位

| 问题类型                 | 推荐文档          | 章节                   |
| ------------------------ | ----------------- | ---------------------- |
| **数据类型定义**         | 01-数据结构指南   | 二、TypeScript 类型    |
| **表结构查询**           | 01-数据结构指南   | 一、数据库表结构       |
| **国家筛选设置**         | 02-Pinia 状态管理 | 一、app Store          |
| **甘特图筛选**           | 02-Pinia 状态管理 | 二、ganttFilters Store |
| **API 调用失败**         | 03-API 实战指南   | 三、1 节               |
| **数据不刷新**           | 03-API 实战指南   | 三、2 节               |
| **gantt_derived 未更新** | 01-数据结构指南   | 五、2 节               |

---

### 常见错误码定位

| 错误现象             | 根因               | 解决文档               |
| -------------------- | ------------------ | ---------------------- |
| **401 Unauthorized** | Token 失效         | 03-API 实战 → 三、1 节 |
| **列表为空**         | 国家筛选导致       | 02-Pinia → 一、4 节    |
| **数据被缓存**       | 缺少 Cache-Control | 03-API 实战 → 三、2 节 |
| **路由参数乱码**     | URL 编码问题       | 01-数据结构 → 五、3 节 |
| **持久化失效**       | watch 未注册       | 02-Pinia → 二、3 节    |

---

## 📊 文档统计

### 数量统计

| 类别         | 文档数   | 总大小    |
| ------------ | -------- | --------- |
| **核心文档** | 3 篇     | ~70KB     |
| **历史归档** | 1 篇     | ~9KB      |
| **总计**     | **4 篇** | **~79KB** |

---

### 编号分布

```
01-03:  核心文档 (3 篇) ⭐ 必读
06:     历史归档 (1 篇) 📜 参考
```

---

## 🎓 使用建议

### 第一次使用

1. **从 01-数据结构开始**
   - 花 1 小时理解表结构
   - 掌握 container_number 主键概念
   - 了解 gantt_derived 作用

2. **然后看 02-Pinia 状态管理**
   - 理解 app Store 的全局筛选作用
   - 掌握 ganttFilters Store 的持久化机制

3. **最后看 03-API 实战指南**
   - 学习 ContainerService 调用
   - 掌握 Composables 使用模式

---

### 日常使用

1. **遇到数据问题时**
   - 先查 01-数据结构确认表结构
   - 使用 SQL 验证脚本排查

2. **遇到状态管理问题时**
   - 查阅 02-Pinia 状态管理
   - 检查 localStorage 和 watch 机制

3. **遇到 API 调用问题时**
   - 查阅 03-API 实战指南
   - 使用排查步骤逐步验证

---

### 开发新功能时

1. **需要新增字段**
   - 参考 01-数据结构的表结构设计
   - 更新 TypeScript 类型定义
   - 修改后端实体和前端接口

2. **需要新增 Store**
   - 参考 02-Pinia 的设计模式
   - 实现持久化和自动保存

3. **需要新增 API**
   - 参考 03-API 实战的方法签名
   - 保持错误处理一致性

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
新增主题 → 使用下一个可用编号（如 04、05）
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
- **文档位置**: `frontend/public/docs/第 2 层 - 业务逻辑/05-货柜数据管理与 Pinia 专题/`

---

## ✨ 文档演进历史

### v1.0 (2026-03-31)

- ✅ 创建独立的货柜数据管理与 Pinia 专题文件夹
- ✅ 重新编号所有文档 (01-03 核心 + 06 历史)
- ✅ 整合重复内容，建立清晰体系
- ✅ 建立明确的导航和学习路径
- ✅ 提供快速查找表和排查指南

---

**文档状态**: ✅ 已完成  
**维护者**: 刘志高  
**最后更新**: 2026-03-31
