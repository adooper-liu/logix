# API 文档更新 - Demurrage Service 新增方法

## 概述

本文档记录了 `demurrage.service.ts` 中新增的预测方法，用于智能排柜系统的成本优化功能。

## 新增方法

### 1. predictDemurrageForUnloadDate

**功能**: 预测在指定卸柜日产生的滞港费

**参数**:
- `containerNumber: string` - 柜号
- `proposedUnloadDate: Date` - 拟安排的卸柜日

**返回值**:
```typescript
{
  lastFreeDate: Date;          // 免费期截止日
  proposedUnloadDate: Date;    // 拟安排的卸柜日
  demurrageDays: number;       // 滞港费计费天数
  demurrageCost: number;       // 预估滞港费
  tierBreakdown: Array<{       // 费用明细（阶梯费率）
    fromDay: number;           // 起始天数
    toDay: number;             // 结束天数
    days: number;              // 天数
    ratePerDay: number;        // 每天费率
    subtotal: number;          // 小计
  }>;
  currency: string;            // 货币类型
}
```

**使用场景**:
- 在排产前评估不同卸柜日的滞港费
- 用于成本优化算法选择最优卸柜日
- 为用户提供成本预估

### 2. predictDetentionForReturnDate

**功能**: 预测在指定还箱日产生的滞箱费

**参数**:
- `containerNumber: string` - 柜号
- `proposedReturnDate: Date` - 拟安排的还箱日
- `pickupDateActual?: Date` - 实际提柜日（可选，不传则从数据库读取）

**返回值**:
```typescript
{
  lastFreeDate: Date;          // 免费期截止日
  proposedReturnDate: Date;    // 拟安排的还箱日
  detentionDays: number;       // 滞箱费计费天数
  detentionCost: number;       // 预估滞箱费
  tierBreakdown: Array<{       // 费用明细（阶梯费率）
    fromDay: number;           // 起始天数
    toDay: number;             // 结束天数
    days: number;              // 天数
    ratePerDay: number;        // 每天费率
    subtotal: number;          // 小计
  }>;
  currency: string;            // 货币类型
}
```

**使用场景**:
- 在排产前评估不同还箱日的滞箱费
- 用于成本优化算法选择最优还箱日
- 为用户提供成本预估

## 算法说明

### 免费期计算

两个方法都支持四种免费天数基准模式：
1. **自然日** - 使用自然日历天数计算
2. **工作日** - 仅计算工作日（排除周末）
3. **自然 + 工作** - 免费期使用自然日，计费期使用工作日
4. **工作 + 自然** - 免费期使用工作日，计费期使用自然日

### 计费天数计算

1. **滞港费**:
   - 起算日: ATA 或 卸船日（根据计算基准）
   - 免费期: 从起算日开始计算 N 天
   - 计费期: 从免费期次日到拟议卸柜日

2. **滞箱费**:
   - 起算日: 实际提柜日
   - 免费期: 从起算日开始计算 N 天
   - 计费期: 从免费期次日到拟议还箱日

## 错误处理

- **未找到标准**: 抛出错误 "No demurrage standards found for container {containerNumber}"
- **未找到起算日**: 抛出错误 "No start date found for demurrage calculation for container {containerNumber}"
- **无实际提柜日**: 友好返回 0 费用（滞箱费计算）
- **日期无效**: 抛出错误

## 集成示例

### 在智能排柜服务中使用

```typescript
// 导入 demurrageService
import { DemurrageService } from './demurrage.service';

// 评估卸柜方案
async evaluateUnloadOption(option: UnloadOption) {
  // 预测滞港费
  const demurrage = await this.demurrageService.predictDemurrageForUnloadDate(
    option.containerNumber,
    option.unloadDate
  );
  
  // 预测滞箱费（如果有实际提柜日）
  const detention = await this.demurrageService.predictDetentionForReturnDate(
    option.containerNumber,
    option.returnDate,
    option.pickupDateActual
  );
  
  // 计算总成本
  const totalCost = demurrage.demurrageCost + detention.detentionCost;
  
  return {
    ...option,
    demurrageCost: demurrage.demurrageCost,
    detentionCost: detention.detentionCost,
    totalCost
  };
}
```

## 性能考虑

- **数据库查询**: 使用索引优化，查询效率高
- **计算逻辑**: 复用现有纯函数，计算速度快
- **内存使用**: 合理的内存使用，适合批量处理

## 依赖关系

- **ExtDemurrageStandard**: 滞港费/滞箱费标准表
- **PortOperation**: 港口操作记录表（获取 ATA 等日期）
- **Container**: 货柜基本信息
- **dateTimeUtils**: 日期处理工具函数

## 版本信息

- **新增时间**: 2026-03-17
- **所属阶段**: Phase 1（基础准备）
- **关联文档**: 智能排柜系统重构与优化方案.md
