# 🚀 Phase 2: 服务拆分 - 实施清单

**创建日期：** 2026-03-27  
**阶段：** 准备阶段  
**风险等级：** 🟡 中偏高  
**策略：** 小步快跑，测试先行

---

## 📋 准备工作清单

### **【必做】测试保护网建立**

#### **1. 集成测试框架**

```bash
# 创建集成测试目录
mkdir -p backend/tests/integration/scheduling

# 创建测试文件
touch backend/tests/integration/scheduling/intelligent-scheduling.e2e.test.ts
```

**测试覆盖：**

- [ ] **batchSchedule 完整流程测试**
  - [ ] 待排产货柜筛选
  - [ ] 仓库和车队选择
  - [ ] 成本计算
  - [ ] 档期扣减
  - [ ] 历史记录保存

- [ ] **savePreviewResults 确认保存测试**
  - [ ] 预览数据验证
  - [ ] 档期扣减正确性
  - [ ] 还箱日期计算
  - [ ] 费用明细保存

- [ ] **边界条件测试**
  - [ ] 空数据集
  - [ ] 单个货柜
  - [ ] 大批量货柜（压力测试）
  - [ ] 档期已满场景

---

#### **2. 性能基线建立**

```typescript
// 性能测试脚本
describe('Performance Baseline', () => {
  it('batchSchedule should complete within 5 seconds for 10 containers', async () => {
    const startTime = Date.now();
    await service.batchSchedule({ limit: 10 });
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
  });

  it('single container scheduling should complete within 500ms', async () => {
    const startTime = Date.now();
    await service.scheduleSingle(containerNumber);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(500);
  });
});
```

**基线指标：**

- [ ] 批量排产（10 个货柜）：< 5 秒
- [ ] 单次排产：< 500 毫秒
- [ ] 档期查询：< 100 毫秒
- [ ] 成本计算：< 200 毫秒

---

#### **3. 回滚方案准备**

```bash
# Git 分支策略
git checkout -b feature/phase2-service-split     # 开发分支
git checkout -b backup/pre-phase2-backup         # 备份分支（回滚点）

# 快速回滚脚本
touch backend/scripts/rollback-phase2.sh
```

**回滚脚本内容：**

```bash
#!/bin/bash
echo "🔄 Rolling back to pre-Phase 2 state..."

# 恢复备份分支
git checkout main
git reset --hard backup/pre-phase2-backup

# 重启服务
npm run restart

echo "✅ Rollback complete!"
```

---

### **【必做】技术准备**

#### **1. 依赖注入模式确认**

```typescript
// 推荐模式：使用 TypeORM Repository
import { Repository } from 'typeorm';
import { AppDataSource } from '../../database';

export class ContainerFilterService {
  private containerRepo: Repository<Container>;

  constructor() {
    this.containerRepo = AppDataSource.getRepository(Container);
  }

  async filter(options: FilterOptions): Promise<Container[]> {
    // 实现逻辑
  }
}
```

**优点：**

- ✅ 与现有代码风格一致
- ✅ 易于测试（可 Mock）
- ✅ 无需引入额外依赖

---

#### **2. 服务间接口定义**

```typescript
// 统一定义接口类型
export interface IContainerFilterService {
  filter(options: FilterOptions): Promise<Container[]>;
}

export interface ISchedulingSorter {
  sort(containers: Container[], options: SortOptions): Promise<SchedulingResult[]>;
}

export interface IWarehouseSelectorService {
  selectOptimal(containers: Container[], options: SelectionOptions): Promise<Warehouse[]>;
}

// ... 其他服务接口
```

---

#### **3. 日志监控规范**

```typescript
// 统一日志格式
logger.info('[ContainerFilterService] Filtering containers:', {
  portCodes: options.portCodes,
  minFreeDays: options.minFreeDays,
  count: result.length
});

logger.error('[ContainerFilterService] Filter failed:', {
  error: error.message,
  stack: error.stack
});
```

**关键节点埋点：**

- [ ] 服务方法入口
- [ ] 数据库查询前后
- [ ] 异常捕获点
- [ ] 性能关键路径

---

## 📝 Phase 2 执行步骤

### **Step 1: 提取 ContainerFilterService** (60-90 min)

**任务清单：**

```markdown
□ 1.1 创建服务文件 (15 min)

- 定义类结构
- 导入依赖
- 构造函数初始化

□ 1.2 复制筛选逻辑 (20 min)

- 读取原始代码（Line ~600-800）
- 逐块复制到新服务
- 确保 TypeScript 编译通过

□ 1.3 编写单元测试 (25 min)

- Mock 测试数据
- 测试筛选规则
- 边界条件测试

□ 1.4 重构原服务调用 (15 min)

- 导入 ContainerFilterService
- 替换 filterContainers 调用
- 验证功能一致

□ 1.5 清理优化 (15 min)

- 删除重复代码
- 更新注释
- 运行测试验证
```

**验收标准：**

- [ ] 所有测试通过
- [ ] 代码编译无误
- [ ] 功能行为一致
- [ ] 性能无明显下降

---

### **Step 2: 提取 SchedulingSorter** (45-60 min)

**任务清单：**

```markdown
□ 2.1 创建服务文件 (10 min)

□ 2.2 复制排序逻辑 (15 min)

- 纯函数，相对简单
- 注意比较器逻辑

□ 2.3 编写单元测试 (20 min)

- 排序规则验证
- 边界情况测试

□ 2.4 重构调用 (10 min)

- 替换为服务调用
- 验证排序结果一致

□ 2.5 清理优化 (5 min)
```

**特点：**

- ✅ 纯函数逻辑 - 无副作用
- ✅ 风险较低 - 算法独立
- ✅ 立即可验证

---

### **Step 3: 提取 WarehouseSelectorService** (90-120 min)

**任务清单：**

```markdown
□ 3.1 创建服务文件 (20 min)

□ 3.2 复制仓库选择逻辑 (30 min)

- 映射关系检查
- 档期可用性验证
- 优先级排序

□ 3.3 编写集成测试 (40 min)

- 真实数据库测试
- 映射链验证
- 档期扣减测试

□ 3.4 重构调用 (20 min)

□ 3.5 清理优化 (10 min)
```

**风险点：**

- ⚠️ 数据库依赖 - 需要真实连接
- ⚠️ 档期逻辑复杂 - 容易遗漏边界

---

### **Step 4: 提取 TruckingSelectorService** (90-120 min)

**任务清单：** 类似 Step 3

**风险点：**

- ⚠️ 多目标优化 - 综合评分逻辑
- ⚠️ 保底分配 - 特殊业务规则

---

### **Step 5: 提取 OccupancyCalculator** (120-150 min)

**任务清单：**

```markdown
□ 5.1 创建服务文件 (20 min)

□ 5.2 复制档期计算逻辑 (40 min)

- 仓库档期计算
- 车队档期计算
- 还箱档期计算

□ 5.3 编写集成测试 (50 min)

- 计算准确性验证
- 档期扣减原子性
- 并发场景测试

□ 5.4 重构调用 (25 min)

□ 5.5 清理优化 (15 min)
```

**风险等级：** 🔴 高

**关键验证：**

- [ ] 仓库档期计算准确性
- [ ] 车队档期计算准确性
- [ ] 还箱档期计算准确性
- [ ] 档期扣减原子性
- [ ] 并发场景一致性

---

### **Step 6: 提取 CostEstimationService** (90-120 min)

**任务清单：**

```markdown
□ 6.1 创建服务文件 (20 min)

□ 6.2 复制成本计算逻辑 (40 min)

- 滞港费计算
- 运输费计算
- 总费用汇总

□ 6.3 编写集成测试 (40 min)

- 计算准确性验证
- Drop off 模式特殊处理
- 边界条件测试

□ 6.4 重构调用 (20 min)

□ 6.5 清理优化 (10 min)
```

**风险等级：** 🔴 高

**关键验证：**

- [ ] 滞港费计算准确性
- [ ] 运输费计算准确性
- [ ] 总费用汇总准确性
- [ ] Drop off 模式特殊处理

---

## 📊 质量检查清单

### **每个 Step 完成后检查**

```markdown
□ **代码质量**

- [ ] TypeScript 编译通过
- [ ] ESLint 无警告
- [ ] 代码格式化完成

□ **测试覆盖**

- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 性能测试达标

□ **功能验证**

- [ ] 与原逻辑行为一致
- [ ] 边界条件处理正确
- [ ] 异常处理完整

□ **文档完善**

- [ ] JSDoc 注释完整
- [ ] 执行报告已编写
- [ ] README 已更新

□ **SKILL 符合度**

- [ ] 单一职责原则
- [ ] 知识沉淀完整
- [ ] 索引清晰明确
```

---

## 🎯 启动条件

### **必须满足的条件**

- [ ] **集成测试框架搭建完成**
- [ ] **主流程测试用例编写完成**
- [ ] **性能基线建立完成**
- [ ] **回滚方案准备就绪**
- [ ] **团队评审通过方案**

### **建议满足的条件**

- [ ] **至少 2 人熟悉代码**
- [ ] **有充足的测试时间**
- [ ] **业务低峰期执行**
- [ ] **监控告警配置完成**

---

## 🚦 决策点

### **Go/No-Go 决策**

**在开始每个 Step 前，请确认：**

```
□ 当前 Step 的测试已准备充分
□ 上一个 Step 已稳定运行 > 24 小时
□ 团队成员可用（遇到问题可讨论）
□ 有充足的执行时间（不被打断）

如果以上都是 ✅，则 Go！
如果有任何 ❌，则 No-Go，先解决问题！
```

---

## 📞 支持与资源

### **相关文档**

- [Phase 1 总结报告](./phase1-complete-summary-report.md)
- [智能排产深度解读](../../docs/排产功能深度解读报告.md)
- [重构实施指南](./REFACTORING_PLAN.md)

### **关键文件**

- [`intelligentScheduling.service.ts`](../src/services/intelligentScheduling.service.ts) - 待拆分源文件
- [`scheduling.config.ts`](../src/config/scheduling.config.ts) - 配置文件

### **联系方式**

- 💬 Team Chat - 日常讨论
- 📧 tech-team@logix.com - 正式沟通
- 🗓️ 周会 - 进度同步

---

## 🎊 成功标准

### **Phase 2 完成标志**

1. ✅ **6 个服务全部拆分完成**
2. ✅ **所有测试通过（覆盖率 > 80%）**
3. ✅ **性能指标达标或优于原系统**
4. ✅ **文档完整（每个服务都有文档）**
5. ✅ **团队培训完成**
6. ✅ **生产环境稳定运行 > 1 周**

---

**准备好了吗？让我们开始吧！** 🚀
