---
name: logix-quick-start-refactoring
description: LogiX 重构快速启动指南 - 5分钟开始、模块化拆分、测试编写
version: 1.0.0
updated: 2026-06-23
trigger: manual
tags: [refactoring, quick-start, modular, testing]
---

# LogiX 重构快速启动指南

## 🚀 5分钟开始重构

### Step 1: 阅读核心文档（10分钟）

按顺序阅读以下文档：

1. 开发规则 - ../../rules/logix-development-rules.mdc
2. 业务知识手册 - ../01-business/logix-business-knowledge/Skill.md
3. 模块化架构指南 - ../00-core/logix-modular-architecture/Skill.md

---

### Step 2: 选择第一个重构目标（5分钟）

**推荐从最简单的模块开始**：

#### 选项A：滞港费计算（推荐新手）
- **当前文件**: `backend/src/services/demurrage.service.ts` (486行)
- **重构目标**: 拆分为 3 个小模块
- **预计工时**: 4-6 小时
- **难度**: ⭐⭐

#### 选项B：货柜状态机（推荐中级）
- **当前文件**: `backend/src/services/containerStatus.service.ts`
- **重构目标**: 提取纯函数状态计算器
- **预计工时**: 4 小时
- **难度**: ⭐⭐⭐

#### 选项C：智能排柜引擎（推荐高级）
- **当前文件**: `backend/src/services/schedulingCostOptimizer.service.ts` (1731行)
- **重构目标**: 拆分为 5 个独立模块
- **预计工时**: 16 小时
- **难度**: ⭐⭐⭐⭐⭐

---

### Step 3: 创建 Git 分支（1分钟）

```bash
# 基于主分支创建重构分支
git checkout main
git pull origin main
git checkout -b refactor/demurrage-calculator

# 或者
git checkout -b refactor/container-status
git checkout -b refactor/scheduling-engine
```

---

### Step 4: 编写测试（30分钟）

**先写测试，再重构代码**

#### 示例：滞港费计算测试

```typescript
// backend/src/domain/demurrage/__tests__/DemurrageCalculator.test.ts

import { calculateDemurrage } from '../DemurrageCalculator';

describe('calculateDemurrage', () => {
  test('should return 0 when not overdue', () => {
    const result = calculateDemurrage({
      lastFreeDate: new Date('2026-07-01'),
      currentDate: new Date('2026-06-25'),
      dailyRate: 100
    });
    
    expect(result.overdueDays).toBe(0);
    expect(result.totalAmount).toBe(0);
    expect(result.isOverdue).toBe(false);
  });

  test('should calculate correct amount when overdue 5 days', () => {
    const result = calculateDemurrage({
      lastFreeDate: new Date('2026-06-20'),
      currentDate: new Date('2026-06-25'),
      dailyRate: 100
    });
    
    expect(result.overdueDays).toBe(5);
    expect(result.totalAmount).toBe(500);
    expect(result.isOverdue).toBe(true);
  });

  test('should handle negative days gracefully', () => {
    const result = calculateDemurrage({
      lastFreeDate: new Date('2026-07-01'),
      currentDate: new Date('2026-06-25'),
      dailyRate: 100
    });
    
    expect(result.overdueDays).toBe(0); // 不应为负数
    expect(result.totalAmount).toBe(0);
  });
});
```

**运行测试**：

```bash
cd backend
npm test -- DemurrageCalculator.test.ts
```

---

### Step 5: 实现新模块（2小时）

#### 创建目录结构

```bash
mkdir -p backend/src/domain/demurrage
mkdir -p backend/src/domain/demurrage/__tests__
```

#### 实现纯函数

```typescript
// backend/src/domain/demurrage/DemurrageCalculator.ts

import { differenceInDays } from 'date-fns';

export interface DemurrageInput {
  lastFreeDate: Date;
  currentDate: Date;
  dailyRate: number;
}

export interface DemurrageResult {
  overdueDays: number;
  totalAmount: number;
  isOverdue: boolean;
}

/**
 * 计算滞港费（纯函数）
 * @param input 输入参数
 * @returns 计算结果
 */
export function calculateDemurrage(input: DemurrageInput): DemurrageResult {
  const overdueDays = Math.max(
    0,
    differenceInDays(input.currentDate, input.lastFreeDate)
  );
  
  return {
    overdueDays,
    totalAmount: overdueDays * input.dailyRate,
    isOverdue: overdueDays > 0
  };
}
```

#### 实现日期解析器

```typescript
// backend/src/domain/demurrage/LastFreeDateResolver.ts

import { addDays } from 'date-fns';
import { PortOperation } from '../../entities/PortOperation';

export class LastFreeDateResolver {
  /**
   * 解析最后免费日期
   * @param portOperation 港口操作记录
   * @returns 最后免费日期
   */
  resolve(portOperation: PortOperation): Date {
    // 如果已有 last_free_date，直接返回
    if (portOperation.lastFreeDate) {
      return portOperation.lastFreeDate;
    }
    
    // 根据模式推算
    const baseDate = portOperation.lastFreeDateMode === 'BY_ARRIVAL'
      ? portOperation.eta
      : portOperation.dischargedTime;
    
    const freeDays = portOperation.lastFreeDateMode === 'BY_ARRIVAL'
      ? portOperation.freeStorageDays || 0
      : portOperation.freeDetentionDays || 0;
    
    return addDays(baseDate, freeDays);
  }
}
```

---

### Step 6: 修改原Service调用新模块（30分钟）

```typescript
// backend/src/services/demurrage.service.ts

import { Injectable } from '@nestjs/common';
import { LastFreeDateResolver } from '../domain/demurrage/LastFreeDateResolver';
import { calculateDemurrage } from '../domain/demurrage/DemurrageCalculator';

@Injectable()
export class DemurrageService {
  private readonly dateResolver = new LastFreeDateResolver();
  
  async calculate(containerId: string): Promise<DemurrageResult> {
    // 1. 查询数据
    const container = await this.containerRepo.findOne(containerId);
    const portOp = await this.portRepo.findByContainer(containerId);
    
    // 2. 解析最后免费日期
    const lastFreeDate = this.dateResolver.resolve(portOp);
    
    // 3. 获取费率
    const dailyRate = await this.getDailyRate(container);
    
    // 4. 计算滞港费（调用纯函数）
    const result = calculateDemurrage({
      lastFreeDate,
      currentDate: new Date(),
      dailyRate
    });
    
    return result;
  }
  
  private async getDailyRate(container: Container): Promise<number> {
    // 从配置表读取费率
    // ...
  }
}
```

---

### Step 7: 运行测试确保通过（10分钟）

```bash
cd backend
npm test

# 或运行特定测试
npm test -- demurrage
```

**预期输出**：

```
 PASS  src/domain/demurrage/__tests__/DemurrageCalculator.test.ts
  calculateDemurrage
    ✓ should return 0 when not overdue (2ms)
    ✓ should calculate correct amount when overdue 5 days (1ms)
    ✓ should handle negative days gracefully (1ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

---

### Step 8: 提交代码（5分钟）

```bash
# 查看变更
git status
git diff

# 添加文件
git add backend/src/domain/demurrage/
git add backend/src/services/demurrage.service.ts

# 提交（遵循约定式提交规范）
git commit -m "refactor: extract demurrage calculation to domain layer

- Create DemurrageCalculator pure function
- Create LastFreeDateResolver class
- Update DemurrageService to use new modules
- Add unit tests for calculator

BREAKING CHANGE: None (backward compatible)"

# 推送到远程分支
git push origin refactor/demurrage-calculator
```

---

### Step 9: 创建 Pull Request（10分钟）

1. 访问 GitHub/GitLab
2. 点击 "New Pull Request"
3. 选择分支：`refactor/demurrage-calculator` → `main`
4. 填写PR描述：

```markdown
## 重构内容

将滞港费计算逻辑从 Service 层提取到 Domain 层

### 变更说明

1. 新建 `DemurrageCalculator` 纯函数
2. 新建 `LastFreeDateResolver` 类
3. 更新 `DemurrageService` 调用新模块
4. 添加单元测试（覆盖率 100%）

### 测试结果

✅ 所有单元测试通过
✅ ESLint 无警告
✅ TypeScript 类型检查通过

### 影响范围

- 仅内部重构，API 不变
- 向后兼容，无破坏性变更

### Code Review 重点

- [ ] 纯函数设计是否合理？
- [ ] 错误处理是否完善？
- [ ] 测试用例是否覆盖边界情况？
```

5. 指派 Reviewer
6. 等待审核通过

---

### Step 10: 合并代码（Reviewer完成后）

```bash
# Reviewer 批准后，合并到主分支
git checkout main
git pull origin main
git merge refactor/demurrage-calculator
git push origin main

# 删除远程分支
git push origin --delete refactor/demurrage-calculator

# 删除本地分支
git branch -d refactor/demurrage-calculator
```

---

## 检查清单

- [ ] 文件 ≤ 100行
- [ ] 函数 ≤ 50行
- [ ] 无 any 类型
- [ ] 测试覆盖率 ≥ 80%
- [ ] ESLint 通过
- [ ] TypeScript 编译通过
- [ ] API 兼容


**版本**: v1.0  
**创建时间**: 2026-06-23  
**适用对象**: 所有LogiX开发者
