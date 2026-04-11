# SKILL 原则详解

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高

---

## S - Single Responsibility（单一职责）

**定义**: 一个类、函数或模块应该只有一个引起它变化的原因。

### 强制要求

| 要求     | 标准值  | 说明                   |
| -------- | ------- | ---------------------- |
| 文件行数 | ≤300 行 | 单文件不得超过 300 行  |
| 方法行数 | ≤50 行  | 单个方法不得超过 50 行 |
| 函数参数 | ≤4 个   | 超过 4 个需要考虑封装  |
| 嵌套层级 | ≤3 层   | 过深需要拆分逻辑       |

### 禁止行为

- God Class（上帝类）- 什么都做
- God Function（上帝函数）- 几百行一个函数
- 混合业务逻辑和技术细节
- 一个文件做多件不相关的事

### 示例

```typescript
// 错误：违反单一职责
// 文件：backend/src/services/intelligentScheduling.service.ts
class IntelligentSchedulingService {
  // 3024 行，60+ 方法混在一起
  filterContainers() {
    /* ... */
  }
  sortSchedule() {
    /* ... */
  }
  calculateCost() {
    /* ... */
  }
  updateStatus() {
    /* ... */
  }
  // ... 还有 50+ 方法
}

// 正确：符合单一职责
// 文件：backend/src/services/ContainerFilterService.ts
class ContainerFilterService {
  // 只负责筛选，124 行
  filterByDate() {
    /* ... */
  }
  filterByPort() {
    /* ... */
  }
}

// 文件：backend/src/services/SchedulingSorter.ts
class SchedulingSorter {
  // 只负责排序，181 行
  sortByETA() {
    /* ... */
  }
  sortByPriority() {
    /* ... */
  }
}
```

---

## K - Knowledge Accumulation（知识沉淀）

**定义**: 将开发过程中的业务知识、踩坑经验系统化记录下来。

### 强制要求

1. **JSDoc 完整**
   - 所有公共函数必须有 JSDoc
   - 包含参数说明和返回值
   - 复杂逻辑需要示例

2. **执行报告**
   - 重要功能需要执行报告
   - 记录决策过程和替代方案
   - 包含验证结果

3. **踩坑记录**
   - 遇到的问题及解决方案
   - 避免后人重复踩坑
   - 包含错误代码和正确代码对比

### 示例

```typescript
/**
 * 计算容器的滞港费用
 *
 * @param container - 容器对象
 * @param freePeriodDays - 免费期天数（默认 7 天）
 * @returns 滞港费用（美元）
 *
 * @example
 * const fee = calculateDemurrage(container, 7);
 *
 * @remarks
 * 计算逻辑:
 * 1. 从 process_port_operations 获取 last_free_date
 * 2. 从 process_sea_freight 获取 actual_discharge_date
 * 3. 超期天数 = max(0, today - last_free_date)
 * 4. 费用 = 超期天数 * daily_rate
 *
 * @throws Error 当 last_free_date 不存在时抛出
 */
function calculateDemurrage(container: Container, freePeriodDays: number): number {
  // 实现代码
}
```

---

## I - Indexed（索引清晰）

**定义**: 命名语义化，接口明确，便于查找和理解。

### 命名规范

#### 数据库层

```sql
-- 表名：前缀 + snake_case
biz_containers          -- 业务表
process_sea_freight     -- 流程表
dict_ports              -- 字典表

-- 字段名：snake_case
container_number        -- 容器编号
actual_ship_date        -- 实际出运日期
eta_dest_port           -- 目的港预计到港
```

#### 实体层

```typescript
// 属性名：camelCase + @Column 映射
@Entity('biz_containers')
class Container {
  @Column({ name: 'container_number' })
  containerNumber: string

  @Column({ name: 'actual_ship_date' })
  actualShipDate: Date
}
```

#### API 层

```typescript
// 请求体：snake_case（与数据库一致）
interface ContainerRequest {
  container_number: string // snake_case
  bill_of_lading_number: string
}

// 响应体：camelCase（TypeScript 习惯）
interface ContainerResponse {
  containerNumber: string // camelCase
  billOfLadingNumber: string
}
```

### 文件命名

**强制要求**：

1. **文档文件使用中文命名**

   ```
   正确：SKILL-001-时间线标签显示规则.md
   正确：01-状态机.md
   错误：SKILL-001-timeline-label-rules.md（英文）
   错误：01-status-machine.md（英文）
   ```

2. **组件文件使用 PascalCase.vue**

   ```typescript
   // 组件：PascalCase.vue
   ContainerDetails.vue
   ContainerList.vue
   SimpleGanttChart.vue

   // 组合式函数：use + PascalCase
   useContainerData.ts
   useContainerStats.ts

   // 服务类：PascalCase + Service/Repository
   ContainerService.ts
   ContainerRepository.ts

   // 工具函数：camelCase + 功能描述
   dateFormatter.ts
   statusCalculator.ts
   ```

---

## L - Living Documentation（活文档）

**定义**: 文档随代码演进，测试即文档，持续更新。

### 实践方法

1. **测试驱动开发**
   - 先写测试，再写代码
   - 测试用例即使用文档
   - 保证测试覆盖率 >80%

2. **文档版本控制**
   - 文档与代码一起提交
   - 变更必须有文档更新
   - 使用 Git 追踪历史

3. **持续更新机制**
   - 定期审查文档准确性
   - 发现错误立即修正
   - 删除过时的内容

### 示例

```typescript
// 测试用例即文档
describe('ContainerStatusService', () => {
  describe('calculateLogisticsStatus', () => {
    it('应该返回已还箱状态（优先级最高）', () => {
      // 场景：容器已还箱
      const container = createContainer({
        gate_return_time: new Date('2026-03-30'),
        ata_dest_port: null,
      })

      // 执行
      const status = service.calculateLogisticsStatus(container)

      // 验证
      expect(status).toBe('RETURNED_EMPTY')
    })

    it('应该返回 WMS 卸柜状态（优先级第二）', () => {
      // 场景：有卸货时间
      const container = createContainer({
        wms_unload_time: new Date('2026-03-30'),
        gate_return_time: null,
      })

      const status = service.calculateLogisticsStatus(container)
      expect(status).toBe('WMS_UNLOADED')
    })
  })
})
```

---

## L - Learning Oriented（面向学习）

**定义**: 示例丰富，新人友好，降低学习成本。

### 实践方法

1. **提供完整示例**
   - 不只是代码片段
   - 包含完整的上下文
   - 可以复制粘贴运行

2. **新人友好设计**
   - 假设读者没有背景知识
   - 解释专业术语
   - 提供逐步指导

3. **错误案例对比**
   - 展示常见错误
   - 说明为什么错
   - 给出正确做法

### 示例结构

```markdown
## 业务场景

描述要解决的业务问题。

## 核心规则

列出关键的业务规则和约束。

## 代码实现

提供完整的代码示例。

## 显示效果

说明最终的用户可见效果。

## 常见错误

列举容易犯的错误和避免方法。

## 相关文件

列出相关的文档和代码文件。
```

---

## 检查清单

### 代码审查

- [ ] 文件行数 ≤300 行
- [ ] 方法行数 ≤50 行
- [ ] 函数参数 ≤4 个
- [ ] 嵌套层级 ≤3 层
- [ ] JSDoc 完整
- [ ] 命名语义化
- [ ] 职责单一

### 文档审查

- [ ] 无 emoji 表情
- [ ] 无装饰性符号
- [ ] 使用 ASCII 箭头
- [ ] 状态标记用文字
- [ ] 基于真实场景
- [ ] 代码可运行
- [ ] 路径准确

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-04-10  
**作者**: 刘志高  
**审核状态**: 已验证
