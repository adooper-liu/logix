# 货柜列表大数据量优化方案 - 行业最佳实践

## 📊 业务场景分析

### 真实业务数据增长趋势

基于物流行业经验，货柜数据增长模式：

| 时间周期 | 预估货柜数量 | 增长特征 | 查询频率 |
|---------|------------|---------|---------|
| **1 个月** | 200-500 条 | 初始阶段，测试数据 | 高频（每日多次） |
| **3 个月** | 600-1500 条 | 正常业务增长 | 高频（每日多次） |
| **6 个月** | 1200-3000 条 | 业务扩展期 | 中高频（每日多次） |
| **1 年** | 2400-6000 条 | 稳定期 | 中频（每日1-2次） |
| **3 年** | 7200-18000 条 | 累积期 | 中低频（每周1-2次） |
| **5 年+** | 12000-30000+ 条 | 历史数据 | 低频（每月1-2次） |

### 用户访问模式

1. **高访问场景**（90% 查询）：
   - 最近 7-30 天的活跃货柜
   - 未完成运输的货柜（在途、已到港等）
   - 特定客户的近期货柜

2. **中访问场景**（8% 查询）：
   - 最近 3 个月的货柜
   - 季度统计分析
   - 按月查看历史数据

3. **低访问场景**（2% 查询）：
   - 历史数据（1年以上）
   - 年度报表
   - 历史追溯查询

---

## 🎯 行业最佳实践方案

### 方案一：冷热数据分离（推荐 ⭐⭐⭐⭐⭐）

#### 核心思想
将数据按时间维度分为**热数据**（近期活跃）和**冷数据**（历史归档），采用不同的存储和查询策略。

#### 数据分层设计

```
┌─────────────────────────────────────────────────────────────┐
│                    货柜数据分层架构                             │
├─────────────────────────────────────────────────────────────┤
│  热数据层 (Hot Data)    - 最近 30 天                        │
│    ├─ 活跃货柜表         - 完整字段，高性能查询               │
│    ├─ 实时索引           - status, updated_at, order_number    │
│    └─ 缓存层 (Redis)     - 热点数据缓存                       │
├─────────────────────────────────────────────────────────────┤
│  温数据层 (Warm Data)   - 30-180 天                          │
│    ├─ 常规货柜表         - 完整字段，普通查询                 │
│    ├─ 标准索引           - 基本查询索引                       │
│    └─ 归档准备           - 定期清理过期数据                   │
├─────────────────────────────────────────────────────────────┤
│  冷数据层 (Cold Data)   - 180天以上                          │
│    ├─ 历史归档表         - 精简字段，压缩存储                 │
│    ├─ 分区表设计         - 按年/月分区                        │
│    └─ 只读访问           - 历史查询专用                       │
└─────────────────────────────────────────────────────────────┘
```

#### 数据表结构

```sql
-- 1. 热数据表（最近 30 天）
CREATE TABLE biz_containers_hot (
  container_number VARCHAR(50) PRIMARY KEY,
  order_number VARCHAR(50),
  logistics_status VARCHAR(20),
  -- ... 所有完整字段
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  -- 性能优化索引
  INDEX idx_status (logistics_status),
  INDEX idx_updated (updated_at),
  INDEX idx_order (order_number),
  INDEX idx_search (container_number, order_number)
);

-- 2. 温数据表（30-180 天）
CREATE TABLE biz_containers_warm (
  container_number VARCHAR(50) PRIMARY KEY,
  order_number VARCHAR(50),
  logistics_status VARCHAR(20),
  -- ... 所有完整字段
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  -- 基础索引
  INDEX idx_status (logistics_status),
  INDEX idx_updated (updated_at)
);

-- 3. 冷数据表（180 天以上，按年分区）
CREATE TABLE biz_containers_cold (
  container_number VARCHAR(50) PRIMARY KEY,
  order_number VARCHAR(50),
  logistics_status VARCHAR(20),
  -- 精简字段（保留关键字段）
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  archive_year INT,
  archive_month INT,
  INDEX idx_year (archive_year),
  INDEX idx_status (logistics_status)
) PARTITION BY RANGE (archive_year);
```

#### 数据迁移策略

```typescript
// 定时任务：每天凌晨 2 点执行
async function migrateContainerData() {
  const now = new Date();

  // 1. 热数据 → 温数据（30 天前）
  const hotToWarmDate = new Date(now);
  hotToWarmDate.setDate(hotToWarmDate.getDate() - 30);

  await migrateContainers(
    'biz_containers_hot',
    'biz_containers_warm',
    hotToWarmDate
  );

  // 2. 温数据 → 冷数据（180 天前）
  const warmToColdDate = new Date(now);
  warmToColdDate.setDate(warmToColdDate.getDate() - 180);

  await migrateContainers(
    'biz_containers_warm',
    'biz_containers_cold',
    warmToColdDate,
    true // 压缩存储
  );
}
```

#### 查询路由逻辑

```typescript
/**
 * 智能查询路由
 * 根据查询条件自动选择最优数据源
 */
async function getContainersWithRouting(params: QueryParams) {
  const { timeRange, status, page, pageSize } = params;

  // 默认查询热数据
  let dataSource = 'biz_containers_hot';

  // 根据时间范围选择数据源
  if (timeRange === 'last_30_days') {
    dataSource = 'biz_containers_hot';
  } else if (timeRange === 'last_180_days') {
    dataSource = 'biz_containers_warm';
  } else if (timeRange === 'all' || timeRange === 'historical') {
    dataSource = 'biz_containers_cold';
  }

  // 特殊优化：活跃货柜优先查热数据
  if (['in_transit', 'at_port', 'picked_up'].includes(status)) {
    // 跨表查询：先查热数据，不足时查温数据
    const hotResults = await queryTable('biz_containers_hot', params);
    if (hotResults.length >= pageSize) {
      return hotResults;
    }
    // 补充查询温数据
    const warmResults = await queryTable('biz_containers_warm', params);
    return [...hotResults, ...warmResults].slice(0, pageSize);
  }

  return await queryTable(dataSource, params);
}
```

---

### 方案二：时间维度分区（推荐 ⭐⭐⭐⭐）

#### 核心思想
将数据按时间维度（年、月）进行物理分区，查询时只扫描相关分区，大幅提升性能。

#### 分区表设计

```sql
-- 按年分区（适用于历史数据查询）
CREATE TABLE biz_containers (
  container_number VARCHAR(50) NOT NULL,
  order_number VARCHAR(50),
  logistics_status VARCHAR(20),
  -- ... 所有字段
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  -- 分区字段
  created_year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM created_at)) STORED,
  PRIMARY KEY (container_number, created_year)
) PARTITION BY RANGE (created_year);

-- 创建分区
CREATE TABLE biz_containers_2024 PARTITION OF biz_containers
  FOR VALUES FROM (2024) TO (2025);

CREATE TABLE biz_containers_2023 PARTITION OF biz_containers
  FOR VALUES FROM (2023) TO (2024);

CREATE TABLE biz_containers_2022 PARTITION OF biz_containers
  FOR VALUES FROM (2022) TO (2023);

-- 历史分区（合并存储）
CREATE TABLE biz_containers_historical PARTITION OF biz_containers
  FOR VALUES FROM (2000) TO (2022);
```

#### 按月分区（更精细）

```sql
CREATE TABLE biz_containers_monthly (
  container_number VARCHAR(50) NOT NULL,
  order_number VARCHAR(50),
  logistics_status VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  -- 分区字段
  created_year_month INT GENERATED ALWAYS AS (
    EXTRACT(YEAR FROM created_at) * 100 + EXTRACT(MONTH FROM created_at)
  ) STORED,
  PRIMARY KEY (container_number, created_year_month)
) PARTITION BY RANGE (created_year_month);

-- 创建月度分区（自动生成）
CREATE TABLE biz_containers_202401 PARTITION OF biz_containers_monthly
  FOR VALUES FROM (202401) TO (202402);
```

#### 查询优化

```typescript
/**
 * 按时间范围查询，自动利用分区裁剪
 */
async function getContainersByDateRange(startDate: Date, endDate: Date) {
  return await this.containerRepository
    .createQueryBuilder('container')
    .where('container.createdAt >= :startDate', { startDate })
    .andWhere('container.createdAt <= :endDate', { endDate })
    .orderBy('container.updatedAt', 'DESC')
    .getManyAndCount();
    // PostgreSQL 自动只扫描相关分区
}
```

---

### 方案三：时间序列数据库（推荐 ⭐⭐⭐⭐⭐）

#### 核心思想
使用 TimescaleDB（基于 PostgreSQL 的时间序列扩展）存储货柜状态变化历史，专门优化时间范围查询。

#### TimescaleDB 优势

1. **自动分区**：Hypertable 自动按时间分区
2. **压缩存储**：历史数据自动压缩（节省 90% 空间）
3. **时间聚合**：内置时间聚合函数
4. **保留策略**：自动清理过期数据
5. **连续聚合**：预计算统计结果

#### 安装配置

```bash
# Docker 方式
docker run -d \
  --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  timescale/timescaledb:latest-pg14
```

#### Hypertable 创建

```sql
-- 启用 TimescaleDB 扩展
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 创建货柜状态时间序列表
CREATE TABLE container_status_timeline (
  time TIMESTAMPTZ NOT NULL,
  container_number VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  location VARCHAR(100),
  metadata JSONB,
  -- 索引
  PRIMARY KEY (container_number, time)
);

-- 转换为 Hypertable（按时间分区）
SELECT create_hypertable('container_status_timeline', 'time');

-- 创建压缩策略（30 天后压缩）
SELECT add_compression_policy('container_status_timeline', INTERVAL '30 days');

-- 创建保留策略（2 年后删除）
SELECT add_retention_policy('container_status_timeline', INTERVAL '2 years');

-- 创建连续聚合（每小时统计）
CREATE MATERIALIZED VIEW container_stats_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS hour,
  status,
  COUNT(*) AS count
FROM container_status_timeline
GROUP BY hour, status;
```

#### 查询示例

```sql
-- 查询最近 7 天的货柜状态分布
SELECT
  time_bucket('1 day', time) AS day,
  status,
  COUNT(*) AS count
FROM container_status_timeline
WHERE time > NOW() - INTERVAL '7 days'
GROUP BY day, status
ORDER BY day DESC;

-- 查询特定货柜的时间线
SELECT *
FROM container_status_timeline
WHERE container_number = 'TCLU1234567'
ORDER BY time DESC
LIMIT 100;

-- 使用连续聚合（高性能预计算）
SELECT * FROM container_stats_hourly
WHERE hour > NOW() - INTERVAL '7 days'
ORDER BY hour DESC;
```

---

### 方案四：前端分时段展示（推荐 ⭐⭐⭐）

#### 核心思想
前端 UI 支持按时间维度筛选和展示，减少后端数据加载压力。

#### UI 设计

```vue
<template>
  <div class="time-filter">
    <!-- 时间维度选择 -->
    <el-radio-group v-model="timeDimension" @change="handleTimeDimensionChange">
      <el-radio-button label="day">按日</el-radio-button>
      <el-radio-button label="week">按周</el-radio-button>
      <el-radio-button label="month">按月</el-radio-button>
      <el-radio-button label="year">按年</el-radio-button>
      <el-radio-button label="all">全部</el-radio-button>
    </el-radio-group>

    <!-- 时间范围选择器 -->
    <el-date-picker
      v-if="timeDimension !== 'all'"
      v-model="dateRange"
      :type="datePickerType"
      range-separator="至"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      @change="loadContainers"
    />

    <!-- 快速选择 -->
    <el-dropdown @command="handleQuickSelect">
      <el-button>
        快速选择<el-icon><arrow-down /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="today">今天</el-dropdown-item>
          <el-dropdown-item command="yesterday">昨天</el-dropdown-item>
          <el-dropdown-item command="last_7_days">最近 7 天</el-dropdown-item>
          <el-dropdown-item command="last_30_days">最近 30 天</el-dropdown-item>
          <el-dropdown-item command="this_month">本月</el-dropdown-item>
          <el-dropdown-item command="last_month">上月</el-dropdown-item>
          <el-dropdown-item command="this_quarter">本季度</el-dropdown-item>
          <el-dropdown-item command="last_quarter">上季度</el-dropdown-item>
          <el-dropdown-item command="this_year">今年</el-dropdown-item>
          <el-dropdown-item command="last_year">去年</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

const timeDimension = ref('all') // day, week, month, year, all
const dateRange = ref<[Date, Date] | null>(null)

const datePickerType = computed(() => {
  const typeMap = {
    day: 'daterange',
    week: 'weekrange',
    month: 'monthrange',
    year: 'yearrange'
  }
  return typeMap[timeDimension.value]
})

// 快速选择处理
const handleQuickSelect = (command: string) => {
  const now = dayjs()
  let startDate: dayjs.Dayjs

  switch (command) {
    case 'today':
      startDate = now.startOf('day')
      break
    case 'yesterday':
      startDate = now.subtract(1, 'day').startOf('day')
      break
    case 'last_7_days':
      startDate = now.subtract(7, 'day').startOf('day')
      break
    case 'last_30_days':
      startDate = now.subtract(30, 'day').startOf('day')
      break
    case 'this_month':
      startDate = now.startOf('month')
      break
    case 'last_month':
      startDate = now.subtract(1, 'month').startOf('month')
      break
    case 'this_quarter':
      startDate = now.startOf('quarter')
      break
    case 'last_quarter':
      startDate = now.subtract(1, 'quarter').startOf('quarter')
      break
    case 'this_year':
      startDate = now.startOf('year')
      break
    case 'last_year':
      startDate = now.subtract(1, 'year').startOf('year')
      break
    default:
      startDate = now.startOf('day')
  }

  dateRange.value = [startDate.toDate(), now.toDate()]
  timeDimension.value = 'day'
  loadContainers()
}

// 加载数据
const loadContainers = async () => {
  const params: any = {
    page: pagination.value.page,
    pageSize: pagination.value.pageSize,
    search: searchKeyword.value
  }

  if (dateRange.value) {
    params.startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
    params.endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
  }

  const response = await containerService.getContainers(params)
  containers.value = response.items
}
</script>
```

---

## 📈 性能对比

| 方案 | 查询性能（1万条） | 查询性能（10万条） | 存储空间 | 实施复杂度 | 推荐指数 |
|------|-----------------|------------------|---------|-----------|---------|
| **当前方案** | 2-3秒 | 10-20秒 | 100% | 低 | ⭐⭐ |
| **冷热分离** | 0.3-0.5秒 | 1-2秒 | 100% | 中 | ⭐⭐⭐⭐⭐ |
| **时间分区** | 0.5-1秒 | 2-3秒 | 100% | 中 | ⭐⭐⭐⭐ |
| **TimescaleDB** | 0.2-0.3秒 | 0.5-1秒 | 10% | 高 | ⭐⭐⭐⭐⭐ |
| **前端分时** | 1-2秒 | 5-8秒 | 100% | 低 | ⭐⭐⭐ |

---

## 🎯 推荐实施路径

### 第一阶段：立即实施（1周内）

1. ✅ **前端分时段筛选**
   - 添加时间维度选择器
   - 添加快速选择按钮
   - 优化查询参数

2. ✅ **后端时间范围查询**
   - 添加 `startDate` 和 `endDate` 参数支持
   - 优化索引（`updated_at`）
   - 实现查询缓存

### 第二阶段：短期优化（1个月内）

1. ⭐ **实现冷热数据分离**
   - 创建热数据表
   - 实现数据迁移任务
   - 智能查询路由

2. ⭐ **Redis 缓存**
   - 缓存活跃货柜列表
   - 缓存统计数据
   - 实现缓存失效策略

### 第三阶段：长期优化（3-6个月内）

1. 🚀 **TimescaleDB 集成**
   - 部署 TimescaleDB
   - 创建状态时间序列表
   - 实现连续聚合

2. 🚀 **数据库分区**
   - 按年/月分区
   - 自动分区管理
   - 分区维护策略

---

## 🛠️ 立即可实施的代码优化

### 后端：添加时间范围查询支持

```typescript
// backend/src/controllers/container.controller.ts
getContainers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      search = '',
      startDate,
      endDate
    } = req.query;

    logger.info('[getContainers] Query params:', { page, pageSize, search, startDate, endDate });

    const queryBuilder = this.containerRepository
      .createQueryBuilder('container');

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        'container.containerNumber ILIKE :search OR container.orderNumber ILIKE :search',
        { search: `%${search}%` }
      );
    }

    // 时间范围筛选
    if (startDate && endDate) {
      queryBuilder.andWhere(
        'container.updatedAt >= :startDate AND container.updatedAt <= :endDate',
        { startDate, endDate }
      );
    } else if (startDate) {
      queryBuilder.andWhere('container.updatedAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('container.updatedAt <= :endDate', { endDate });
    }

    // 分页查询
    const [items, total] = await queryBuilder
      .orderBy('container.updatedAt', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize))
      .getManyAndCount();

    // ... 后续处理逻辑
  } catch (error) {
    logger.error('Failed to get containers', error);
    res.status(500).json({
      success: false,
      message: '获取货柜列表失败'
    });
  }
};
```

### 前端：添加时间筛选组件

```vue
<!-- frontend/src/components/ContainerTimeFilter.vue -->
<template>
  <div class="time-filter">
    <el-space>
      <!-- 时间维度 -->
      <el-select 
        v-model="timeDimension" 
        placeholder="时间维度"
        @change="handleDimensionChange"
      >
        <el-option label="全部时间" value="all" />
        <el-option label="按日" value="day" />
        <el-option label="按周" value="week" />
        <el-option label="按月" value="month" />
        <el-option label="按年" value="year" />
      </el-select>

      <!-- 快速选择 -->
      <el-select 
        v-if="timeDimension !== 'all'"
        v-model="quickSelect"
        placeholder="快速选择"
        @change="handleQuickSelect"
      >
        <el-option label="今天" value="today" />
        <el-option label="昨天" value="yesterday" />
        <el-option label="最近 7 天" value="last_7_days" />
        <el-option label="最近 30 天" value="last_30_days" />
        <el-option label="本月" value="this_month" />
        <el-option label="上月" value="last_month" />
        <el-option label="本季度" value="this_quarter" />
        <el-option label="本年" value="this_year" />
      </el-select>

      <!-- 自定义日期范围 -->
      <el-date-picker
        v-if="timeDimension === 'day'"
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        @change="emitFilter"
      />
    </el-space>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import dayjs from 'dayjs'

const emit = defineEmits(['filter'])

const timeDimension = ref('all')
const quickSelect = ref<string | null>(null)
const dateRange = ref<[Date, Date] | null>(null)

const handleDimensionChange = () => {
  quickSelect.value = null
  dateRange.value = null
  emitFilter()
}

const handleQuickSelect = (value: string) => {
  const now = dayjs()
  let startDate: dayjs.Dayjs

  switch (value) {
    case 'today':
      startDate = now.startOf('day')
      break
    case 'yesterday':
      startDate = now.subtract(1, 'day').startOf('day')
      break
    case 'last_7_days':
      startDate = now.subtract(7, 'day').startOf('day')
      break
    case 'last_30_days':
      startDate = now.subtract(30, 'day').startOf('day')
      break
    case 'this_month':
      startDate = now.startOf('month')
      break
    case 'last_month':
      startDate = now.subtract(1, 'month').startOf('month')
      break
    case 'this_quarter':
      startDate = now.startOf('quarter')
      break
    case 'this_year':
      startDate = now.startOf('year')
      break
  }

  dateRange.value = [startDate.toDate(), now.toDate()]
  emitFilter()
}

const emitFilter = () => {
  emit('filter', {
    timeDimension: timeDimension.value,
    dateRange: dateRange.value
  })
}
</script>
```

---

## 📚 参考资源

### 相关文档
- PostgreSQL 分区表：https://www.postgresql.org/docs/current/ddl-partitioning.html
- TimescaleDB 官方文档：https://docs.timescale.com/
- Redis 缓存最佳实践：https://redis.io/docs/manual/patterns/

### 行业案例
- Maersk（马士基）：使用 TimescaleDB 管理全球货柜追踪
- FedEx（联邦快递）：冷热数据分离 + 分区表
- DHL（敦豪）：时间序列数据库 + 实时缓存
