# 智能排柜 - UI 集成与测试部署详细计划

**创建日期**: 2026-03-17  
**优先级**: P0 - 核心功能闭环

---

## 📊 当前状态详细分析

### 1. 前端 UI 集成（60% - 进行中）

#### ✅ 已完成组件（4/6）

| 组件 | 文件 | 进度 | 功能状态 |
|------|------|------|----------|
| **成本优化面板** | `CostOptimizationPanel.vue` | 100% | ✅ 完整功能 |
| **卸柜方案选择器** | `UnloadOptionSelector.vue` | 100% | ✅ 完整功能 |
| **成本明细展示** | `CostBreakdownDisplay.vue` | 100% | ✅ 完整功能 |
| **成本饼图** | `CostPieChart.vue` | 100% | ✅ 完整功能 |
| **智能日历能力展示** | ❌ 未开发 | 0% | ⏹️ 待开发 |
| **手动设置能力界面** | ❌ 未开发 | 0% | ⏹️ 待开发 |

#### 📁 现有组件详细功能

##### 1. CostOptimizationPanel.vue

**位置**: [`frontend/src/views/scheduling/components/CostOptimizationPanel.vue`](file://d:\Gihub\logix\frontend\src\views\scheduling\components\CostOptimizationPanel.vue)

**功能**:
```vue
<script setup lang="ts">
import { costOptimizationService } from '@/services/costOptimization'
import UnloadOptionSelector from './UnloadOptionSelector.vue'
import CostBreakdownDisplay from './CostBreakdownDisplay.vue'
import CostPieChart from './CostPieChart.vue'

// 核心功能
- 显示当前排产方案成本
- 显示最优方案成本
- 显示可节省金额
- 提供优化建议
</script>
```

**API 调用**:
```typescript
// 评估成本
await costOptimizationService.evaluateCost(containerNumber, option)

// 对比方案
await costOptimizationService.compareOptions(containerNumber, options)

// 获取推荐方案
await costOptimizationService.getRecommendation(containerNumber)
```

##### 2. UnloadOptionSelector.vue

**功能**:
- ✅ 显示所有可行方案（Direct/Drop off/Expedited）
- ✅ 对比不同方案的卸柜日、仓库、策略
- ✅ 显示每个方案的预估成本
- ✅ 支持用户手动选择方案

##### 3. CostBreakdownDisplay.vue

**功能**:
```vue
<template>
  <el-descriptions title="成本明细" :column="2">
    <el-descriptions-item label="滞港费">
      ${{ data.demurrageCost.toFixed(2) }}
    </el-descriptions-item>
    <el-descriptions-item label="滞箱费">
      ${{ data.detentionCost.toFixed(2) }}
    </el-descriptions-item>
    <el-descriptions-item label="堆存费">
      ${{ data.storageCost.toFixed(2) }}
    </el-descriptions-item>
    <el-descriptions-item label="运输费">
      ${{ data.transportationCost.toFixed(2) }}
    </el-descriptions-item>
    <el-descriptions-item label="操作费">
      ${{ data.handlingCost.toFixed(2) }}
    </el-descriptions-item>
    <el-descriptions-item label="总成本" font-weight="bold">
      ${{ data.totalCost.toFixed(2) }}
    </el-descriptions-item>
  </el-descriptions>
</template>
```

##### 4. CostPieChart.vue

**功能**:
- ✅ 使用 ECharts 绘制成本饼图
- ✅ 显示各费用项占比
- ✅ 交互式 tooltip 显示详细金额
- ✅ 自动过滤 0 值项目

**图表配置**:
```typescript
series: [{
  name: '成本构成',
  type: 'pie',
  radius: '50%',
  data: [
    { value: demurrageCost, name: '滞港费' },
    { value: detentionCost, name: '滞箱费' },
    { value: storageCost, name: '堆存费' },
    { value: transportationCost, name: '运输费' },
    { value: handlingCost, name: '操作费' }
  ].filter(item => item.value > 0)
}]
```

#### ⏳ 待开发组件（2 个）

##### 5. 智能日历能力展示组件（新增）

**文件名**: `CalendarCapacityView.vue`

**功能需求**:
```vue
<template>
  <div class="calendar-capacity-view">
    <!-- 日历视图显示每日能力 -->
    <FullCalendar 
      :options="calendarOptions"
      :events="capacityEvents"
    />
    
    <!-- 能力图例 -->
    <div class="legend">
      <span class="legend-item weekday">工作日：{{ weekdayCapacity }}</span>
      <span class="legend-item weekend">周末：0</span>
      <span class="legend-item holiday">节假日：{{ holidayCapacity }}</span>
      <span class="legend-item manual">手动设置：{{ manualCapacity }}</span>
    </div>
    
    <!-- 详情面板 -->
    <el-dialog v-model="dialogVisible" title="每日能力详情">
      <el-descriptions :column="2">
        <el-descriptions-item label="日期">{{ selectedDate }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ dayType }}</el-descriptions-item>
        <el-descriptions-item label="基础能力">{{ baseCapacity }}</el-descriptions-item>
        <el-descriptions-item label="倍率">{{ multiplier }}</el-descriptions-item>
        <el-descriptions-item label="最终能力">{{ finalCapacity }}</el-descriptions-item>
        <el-descriptions-item label="已占用">{{ occupiedCapacity }}</el-descriptions-item>
        <el-descriptions-item label="剩余">{{ remainingCapacity }}</el-descriptions-item>
      </el-descriptions>
      
      <!-- 手动设置表单 -->
      <el-form :model="manualCapacityForm">
        <el-form-item label="手动设置能力">
          <el-input-number v-model="manualCapacityForm.capacity" :min="0" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveManualCapacity">保存</el-button>
          <el-button @click="resetToCalendarRule">恢复日历规则</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { calendarCapacityService } from '@/services/calendarCapacity'

// API 服务
const calendarCapacityService = {
  // 获取日期范围内的能力数据
  async getCapacityRange(startDate: string, endDate: string) {
    return api.get(`/api/capacity/range?start=${startDate}&end=${endDate}`)
  },
  
  // 设置手动能力
  async setManualCapacity(date: string, capacity: number, reason?: string) {
    return api.post('/api/capacity/manual', { date, capacity, reason })
  },
  
  // 恢复日历规则
  async resetToCalendarRule(date: string) {
    return api.delete(`/api/capacity/manual/${date}`)
  }
}

// 日历配置
const calendarOptions = {
  plugins: [dayGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  locale: 'zh-cn',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,dayGridWeek'
  },
  dateClick: handleDateClick,
  eventClick: handleEventClick
}

// 加载能力数据
const loadCapacityData = async () => {
  const result = await calendarCapacityService.getCapacityRange(
    '2026-03-17',
    '2026-04-17'
  )
  
  // 转换为日历事件
  capacityEvents.value = result.data.map((item: any) => ({
    title: `${item.remaining}/${item.capacity}`,
    start: item.date,
    backgroundColor: getColorByCapacity(item)
  }))
}

// 处理日期点击
const handleDateClick = (info: any) => {
  dialogVisible.value = true
  selectedDate.value = info.dateStr
}
</script>

<style scoped lang="scss">
.calendar-capacity-view {
  .legend {
    display: flex;
    gap: 16px;
    margin: 16px 0;
    
    .legend-item {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 13px;
      
      &.weekday { background: #67c23a; color: white; }
      &.weekend { background: #f56c6c; color: white; }
      &.holiday { background: #e6a23c; color: white; }
      &.manual { background: #409eff; color: white; }
    }
  }
}
</style>
```

**依赖安装**:
```bash
npm install @fullcalendar/vue3 @fullcalendar/daygrid @fullcalendar/interaction
```

##### 6. 手动设置能力界面（新增）

**文件名**: `ManualCapacitySetting.vue`

**功能需求**:
```vue
<template>
  <div class="manual-capacity-setting">
    <el-card title="手动设置每日能力">
      <!-- 批量设置 -->
      <el-form :model="batchForm" label-width="120px">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="batchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        
        <el-form-item label="应用日期">
          <el-checkbox-group v-model="batchForm.applyDays">
            <el-checkbox label="monday">周一</el-checkbox>
            <el-checkbox label="tuesday">周二</el-checkbox>
            <el-checkbox label="wednesday">周三</el-checkbox>
            <el-checkbox label="thursday">周四</el-checkbox>
            <el-checkbox label="friday">周五</el-checkbox>
            <el-checkbox label="saturday">周六</el-checkbox>
            <el-checkbox label="sunday">周日</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        
        <el-form-item label="设置能力">
          <el-input-number v-model="batchForm.capacity" :min="0" />
        </el-form-item>
        
        <el-form-item label="原因">
          <el-input 
            v-model="batchForm.reason" 
            type="textarea"
            placeholder="如：春节假期、设备维护等"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="applyBatchSetting">批量应用</el-button>
        </el-form-item>
      </el-form>
      
      <!-- 已手动设置的日期列表 -->
      <el-table :data="manualSettings" style="margin-top: 16px">
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="capacity" label="能力值" width="100" />
        <el-table-column prop="reason" label="原因" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button size="small" @click="editSetting(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteSetting(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
const batchForm = ref({
  dateRange: [],
  applyDays: ['saturday', 'sunday'], // 默认周末
  capacity: 0,
  reason: ''
})

const applyBatchSetting = async () => {
  // 批量设置逻辑
}
</script>
```

#### 🎯 完成标准

从 60% → 100% 需要完成：

- [ ] 开发 `CalendarCapacityView.vue` (8 小时)
- [ ] 开发 `ManualCapacitySetting.vue` (4 小时)
- [ ] 集成到 `SchedulingVisual.vue` (4 小时)
- [ ] 添加路由和导航 (2 小时)
- [ ] 端到端测试 (4 小时)
- [ ] Bug 修复和优化 (4 小时)

**小计**: 26 小时 ≈ 3-4 个工作日

---

### 2. 端到端测试（20% - 待开始）

#### 📝 测试场景设计

##### 场景 1: 单柜排产 + 成本优化

**测试步骤**:
```gherkin
Feature: 单柜排产成本优化
  
  Scenario: 为单个货柜生成排产计划并优化成本
    Given 有一个货柜 "TEST1234567" 到达 LAX 港
    And 免费期截止日为 2026-03-25
    When 用户请求排产
    Then 系统应生成 3 种方案 (Direct/Drop off/Expedited)
    And 显示每种方案的成本明细
    And 推荐成本最低的方案
    And 成本计算准确无误
```

**验证点**:
- ✅ 生成 3 种不同类型的方案
- ✅ 每种方案的卸柜日、仓库、策略正确
- ✅ 成本明细包含所有费用项
- ✅ 最优方案推荐逻辑正确
- ✅ 响应时间 < 1 秒

**测试脚本**:
```typescript
// tests/e2e/single-container-optimization.test.ts
describe('单柜排产成本优化', () => {
  it('应生成多种方案并推荐最优解', async () => {
    // 1. 准备测试数据
    const container = await createTestContainer({
      containerNumber: 'TEST1234567',
      portCode: 'USLAX',
      etaDestPort: '2026-03-18',
      lastFreeDate: '2026-03-25'
    })
    
    // 2. 调用排产 API
    const response = await api.post('/api/scheduling/batch', {
      containerNumbers: ['TEST1234567'],
      forceSchedule: true
    })
    
    // 3. 验证返回结果
    expect(response.data.success).toBe(true)
    expect(response.data.results[0].success).toBe(true)
    
    // 4. 验证生成了多种方案
    const options = response.data.results[0].options
    expect(options.length).toBeGreaterThanOrEqual(3)
    
    // 5. 验证成本计算
    const costs = options.map(o => o.totalCost)
    expect(costs.every(c => typeof c === 'number')).toBe(true)
    
    // 6. 验证最优方案被推荐
    const recommended = response.data.results[0].recommendedOption
    expect(recommended).toBeDefined()
    expect(recommended.totalCost).toBeLessThanOrEqual(Math.min(...costs))
  })
})
```

##### 场景 2: 批量排产成本对比

**测试步骤**:
```gherkin
Feature: 批量排产成本对比
  
  Scenario: 批量排产并对比优化前后的成本
    Given 有 10 个货柜需要排产
    When 执行批量排产
    Then 系统应为每个货柜生成排产计划
    And 计算总成本
    And 显示相比人工排产可节省的金额
```

**验证点**:
- ✅ 批量处理 10 个货柜
- ✅ 每个货柜都有排产计划
- ✅ 总成本计算正确
- ✅ 成本优化率 >= 10%
- ✅ 响应时间 < 5 秒

**测试脚本**:
```typescript
// tests/e2e/batch-optimization.test.ts
describe('批量排产成本对比', () => {
  it('应优化批量排产并降低成本', async () => {
    // 1. 创建 10 个测试货柜
    const containers = await Promise.all(
      Array.from({ length: 10 }).map((_, i) => 
        createTestContainer({
          containerNumber: `BATCH${i.toString().padStart(7, '0')}`,
          portCode: 'USLAX',
          etaDestPort: '2026-03-18'
        })
      )
    )
    
    // 2. 执行批量排产
    const response = await api.post('/api/scheduling/batch', {
      containerNumbers: containers.map(c => c.containerNumber),
      limit: 10
    })
    
    // 3. 验证所有货柜都排产成功
    expect(response.data.successCount).toBe(10)
    expect(response.data.failedCount).toBe(0)
    
    // 4. 计算总成本
    const totalCost = response.data.results.reduce(
      (sum, r) => sum + r.recommendedOption.totalCost, 
      0
    )
    
    // 5. 验证成本优化效果
    const baselineCost = 1500 // 假设人工排产总成本
    const savings = baselineCost - totalCost
    const savingsRate = savings / baselineCost
    
    expect(savingsRate).toBeGreaterThanOrEqual(0.1) // >= 10%
  })
})
```

##### 场景 3: 周末限制

**测试步骤**:
```gherkin
Feature: 周末限制
  
  Scenario: 排产自动跳过周末
    Given 货柜在周五到达
    And 提柜日需要在到达后 1 天
    When 执行排产
    Then 提柜日应为下周一（跳过周六、周日）
```

**验证点**:
- ✅ 识别周末（周六、周日）
- ✅ 提柜日自动跳过周末
- ✅ 周末 capacity = 0
- ✅ 工作日 capacity = daily_unload_capacity

**测试脚本**:
```typescript
// tests/e2e/weekend-restriction.test.ts
describe('周末限制', () => {
  it('应自动跳过周末安排提柜日', async () => {
    // 1. 创建周五到达的货柜
    const container = await createTestContainer({
      containerNumber: 'WEEKEND123',
      ataDestPort: '2026-03-20' // 周五
    })
    
    // 2. 执行排产
    const response = await api.post('/api/scheduling/schedule', {
      containerNumbers: ['WEEKEND123']
    })
    
    // 3. 验证提柜日是下周一
    const result = response.data.results[0]
    const pickupDate = new Date(result.plannedData.plannedPickupDate)
    const dayOfWeek = pickupDate.getDay()
    
    expect(dayOfWeek).toBe(1) // 1 = 周一
  })
  
  it('周末的仓库能力应为 0', async () => {
    // 1. 查询周末的档期数据
    const response = await api.get(
      '/api/scheduling/occupancy/warehouse?' +
      'startDate=2026-03-21&endDate=2026-03-22' // 周六、周日
    )
    
    // 2. 验证 capacity = 0
    response.data.data.forEach((day: any) => {
      expect(day.capacity).toBe(0)
      expect(day.remaining).toBe(0)
    })
  })
})
```

##### 场景 4: 手动覆盖能力

**测试步骤**:
```gherkin
Feature: 手动覆盖能力
  
  Scenario: 手动设置圣诞节关闭
    Given 圣诞节（12 月 25 日）是工作日
    When 用户手动设置 capacity = 0
    Then 排产应避开 12 月 25 日
    And 手动设置优先于日历规则
```

**验证点**:
- ✅ 可以手动设置特定日期的能力
- ✅ 手动设置的值被保存
- ✅ 排产时优先使用手动设置的值
- ✅ 可以恢复日历规则

**测试脚本**:
```typescript
// tests/e2e/manual-override.test.ts
describe('手动覆盖能力', () => {
  it('应手动设置节日关闭并影响排产', async () => {
    // 1. 手动设置圣诞节关闭
    await api.post('/api/capacity/manual', {
      date: '2026-12-25',
      capacity: 0,
      reason: '圣诞节关闭'
    })
    
    // 2. 创建需要在圣诞节附近排产的货柜
    const container = await createTestContainer({
      containerNumber: 'XMAS123',
      etaDestPort: '2026-12-24'
    })
    
    // 3. 执行排产
    const response = await api.post('/api/scheduling/schedule', {
      containerNumbers: ['XMAS123']
    })
    
    // 4. 验证排产避开了 12-25
    const result = response.data.results[0]
    const unloadDate = new Date(result.plannedData.plannedUnloadDate)
    
    expect(unloadDate.toISOString().split('T')[0]).not.toBe('2026-12-25')
  })
})
```

#### 🧪 测试覆盖率要求

| 测试类型 | 目标覆盖率 | 当前覆盖率 | 状态 |
|---------|-----------|-----------|------|
| 单元测试 | > 80% | ~75% | ⏳ 进行中 |
| 集成测试 | > 70% | ~20% | ⏹️ 待开始 |
| E2E 测试 | > 60% | 0% | ⏹️ 待开始 |

#### 📋 测试执行清单

- [ ] 编写单柜排产测试脚本 (4 小时)
- [ ] 编写批量排产测试脚本 (4 小时)
- [ ] 编写周末限制测试脚本 (2 小时)
- [ ] 编写手动覆盖测试脚本 (2 小时)
- [ ] 执行所有 E2E 测试 (4 小时)
- [ ] 修复测试发现的 Bug (8 小时)
- [ ] 回归测试 (4 小时)

**小计**: 28 小时 ≈ 3-4 个工作日

---

### 3. 生产部署（0% - 未开始）

#### 📦 部署前置条件

**数据库迁移**:
```bash
# Phase 1 - 成本优化配置
psql -U postgres -d logix -f migrations/add_cost_optimization_config.sql

# Phase 2 - 映射关系增强
psql -U postgres -d logix -f migrations/add_cost_optimization_mapping_fields.sql

# Phase 3 - 日历化能力
psql -U postgres -d logix -f migrations/add_calendar_based_capacity.sql

# 验证迁移结果
psql -U postgres -d logix -c "SELECT COUNT(*) FROM dict_scheduling_config"
psql -U postgres -d logix -c "SELECT COUNT(*) FROM ext_warehouse_daily_occupancy"
```

**后端构建**:
```bash
cd backend
npm install
npm run build
npm test  # 确保所有测试通过
```

**前端构建**:
```bash
cd frontend
npm install
npm run build
npm run test:e2e  # 执行 E2E 测试
```

#### 🚀 部署流程

##### 阶段 1: 测试环境部署（预计 2 小时）

**步骤**:
```bash
# 1. 部署到测试环境
docker-compose -f docker-compose.test.yml up -d

# 2. 执行数据库迁移
docker-compose -f docker-compose.test.yml exec backend \
  psql -U postgres -d logix -f migrations/add_cost_optimization_config.sql

# 3. 健康检查
curl http://localhost:3000/api/health
curl http://localhost:3000/api/scheduling/config

# 4. 运行冒烟测试
npm run test:smoke -- --env=test
```

**验证清单**:
- [ ] 后端服务启动成功
- [ ] 前端服务启动成功
- [ ] 数据库连接正常
- [ ] 所有配置项已加载
- [ ] 基础 API 可访问

##### 阶段 2: 预发布环境部署（预计 2 小时）

**步骤**:
```bash
# 1. 同步生产数据到预发布环境
pg_dump -U postgres logix_prod | psql -U postgres logix_staging

# 2. 部署新版本
docker-compose -f docker-compose.staging.yml up -d

# 3. 执行完整回归测试
npm run test:regression -- --env=staging

# 4. 性能测试
npm run test:performance -- --env=staging
```

**性能指标验证**:
- [ ] 单柜方案生成 < 500ms
- [ ] 成本评估 < 200ms
- [ ] 批量排产（10 柜） < 5s
- [ ] API 可用性 > 99.9%

##### 阶段 3: 生产环境部署（预计 4 小时）

**步骤**:
```bash
# 1. 备份生产数据库
pg_dump -U postgres logix_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 灰度发布（先部署 50% 流量）
kubectl set image deployment/logix-backend \
  logix-backend=logix-backend:v1.0.0 \
  --record

# 3. 监控关键指标
kubectl top pods
kubectl logs -f deployment/logix-backend

# 4. 全量发布（如果灰度成功）
kubectl scale deployment/logix-backend --replicas=3

# 5. 验证生产环境
curl https://api.logix.com/api/health
```

**回滚方案**:
```bash
# 如果出现问题，立即回滚
kubectl rollout undo deployment/logix-backend

# 恢复数据库备份
psql -U postgres logix_prod < backup_YYYYMMDD_HHMMSS.sql
```

#### 📊 监控指标

**技术指标**:
- API 响应时间（P95 < 500ms）
- API 错误率（< 0.1%）
- 数据库连接池使用率（< 80%）
- CPU 使用率（< 70%）
- 内存使用率（< 80%）

**业务指标**:
- 每日排产货柜数量
- 平均成本优化率
- 用户选择最优方案的比例
- 系统推荐接受率

**监控工具**:
```yaml
# prometheus/alerts.yml
groups:
  - name: scheduling
    rules:
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(api_response_time_bucket[5m])) > 0.5
        for: 5m
        
      - alert: LowOptimizationRate
        expr: avg(cost_optimization_rate) < 0.1
        for: 1h
```

#### 📝 部署文档

需要创建的文档:
- [ ] 《生产部署操作手册》 (4 小时)
- [ ] 《回滚操作指南》 (2 小时)
- [ ] 《监控系统配置指南》 (4 小时)
- [ ] 《常见问题排查手册》 (4 小时)

**小计**: 14 小时 ≈ 2 个工作日

---

## 🎯 总体时间估算

### 阶段 1: UI 完善（3-4 天）

| 任务 | 工时 | 负责人 |
|------|------|--------|
| CalendarCapacityView 开发 | 8h | Frontend |
| ManualCapacitySetting 开发 | 4h | Frontend |
| 集成到主页面 | 4h | Frontend |
| 路由和导航 | 2h | Frontend |
| 测试和 Bug 修复 | 8h | Frontend + QA |
| **小计** | **26h** | |

### 阶段 2: E2E 测试（3-4 天）

| 任务 | 工时 | 负责人 |
|------|------|--------|
| 编写测试脚本 | 12h | QA |
| 执行测试 | 4h | QA |
| Bug 修复 | 8h | Backend + Frontend |
| 回归测试 | 4h | QA |
| **小计** | **28h** | |

### 阶段 3: 生产部署（2-3 天）

| 任务 | 工时 | 负责人 |
|------|------|--------|
| 部署文档编写 | 14h | DevOps |
| 测试环境部署 | 2h | DevOps |
| 预发布环境部署 | 2h | DevOps |
| 生产环境部署 | 4h | DevOps |
| 监控配置 | 4h | DevOps |
| **小计** | **26h** | |

---

## 📅 推荐时间表

### Week 1 (2026-03-17 ~ 2026-03-21)

- **周一~周三**: UI 组件开发（Calendar + Manual Setting）
- **周四~周五**: UI 集成测试

**里程碑**: UI 集成达到 100%

### Week 2 (2026-03-24 ~ 2026-03-28)

- **周一~周三**: E2E 测试脚本编写和执行
- **周四~周五**: Bug 修复和优化

**里程碑**: E2E 测试通过率 > 90%

### Week 3 (2026-03-31 ~ 2026-04-04)

- **周一**: 部署文档编写
- **周二~周三**: 测试环境 + 预发布环境部署
- **周四~周五**: 生产环境部署 + 用户培训

**里程碑**: 生产环境上线

---

## 🔗 相关资源

### 代码资源

- **UI 组件目录**: [`frontend/src/views/scheduling/components/`](file://d:\Gihub\logix\frontend\src\views\scheduling\components)
- **成本优化服务**: [`frontend/src/services/costOptimization.ts`](file://d:\Gihub\logix\frontend\src\services\costOptimization.ts)
- **主页面**: [`frontend/src/views/scheduling/SchedulingVisual.vue`](file://d:\Gihub\logix\frontend\src\views\scheduling\SchedulingVisual.vue)

### 文档资源

- [Phase 2 执行指南](file://d:\Gihub\logix\docs\Phase3\任务 3.5-Phase2-执行指南.md)
- [Phase 3 执行指南](file://d:\Gihub\logix\docs\Phase3\任务 3.5-Phase3-执行指南.md)
- [SQL 迁移兼容性修复](file://d:\Gihub\logix\docs\Phase3\SQL%20迁移兼容性修复说明.md)
- [开发进度与下一步计划](file://d:\Gihub\logix\docs\Phase3\智能排柜 - 开发进度与下一步计划.md)

---

## 🎉 总结

### 当前状态

- ✅ **后端功能**: 100% 完成（Phase 1-3）
- ✅ **前端基础组件**: 100% 完成（4/6）
- ⏳ **前端完整集成**: 60% → 100%（需 3-4 天）
- ⏹️ **E2E 测试**: 20% → 100%（需 3-4 天）
- ⏹️ **生产部署**: 0% → 100%（需 2-3 天）

### 关键路径

```
UI 完善 (3-4 天) → E2E 测试 (3-4 天) → 生产部署 (2-3 天)
总计：8-11 个工作日 ≈ 2 周
```

### 预期上线时间

**如果一切顺利**: 2026-04-04 前完成生产部署

**保守估计**: 2026-04-11 前完成（预留 1 周 buffer）

---

**文档状态**: ✅ **草稿完成**  
**创建人**: AI Development Team  
**最后更新**: 2026-03-17  
**下一步**: 开始 UI 组件开发（CalendarCapacityView.vue）
