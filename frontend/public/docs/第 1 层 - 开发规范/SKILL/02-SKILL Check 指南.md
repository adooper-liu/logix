# SKILL Check 使用指南

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高  

---

## 什么是 SKILL Check

SKILL Check 是代码质量自动检查工具，确保代码符合 SKILL 原则。

### 检查项目

| 项目 | 标准值 | 说明 |
|------|-------|------|
| 文件行数 | ≤300 行 | 单文件不得超过 300 行 |
| 方法行数 | ≤50 行 | 单个方法不得超过 50 行 |
| JSDoc 覆盖 | 100% | 所有公共函数必须有文档 |
| 函数参数 | ≤4 个 | 超过需要封装 |
| TODO 数量 | - | 统计待办事项 |
| FIXME 数量 | 0 | 必须修复所有已知问题 |

---

## 使用方法

### 安装

```bash
cd backend
npm install
```

### 运行检查

```bash
cd backend
npm run skill:check
```

### 输出示例

```
================================
SKILL 原则代码质量检查
================================

正在检查 6 个服务文件...

ContainerFilterService.ts
  行数：125 (OK)
  函数数：3
  JSDoc: 3/3 (OK)

IntelligentSchedulingService.ts
  行数：2371 (FAIL) - 超过 300 行限制
  函数数：62
  JSDoc: 45/62 (FAIL) - 17 个函数缺少文档

================================
检查结果
================================

总体统计:
  总文件数：6
  OK 通过：4
  FAIL 失败：2
  平均行数：209
  TODO 数量：2
  FIXME 数量：0

FAIL 发现 2 个文件不符合 SKILL 原则
================================
```

---

## 常见问题

### Q1: 文件行数超过 300 行怎么办？

**A**: 拆分成多个小文件

```typescript
// 错误：大文件
class IntelligentSchedulingService {
  // 2371 行，什么都做
}

// 正确：拆分
class ContainerFilterService { /* 125 行 */ }
class SchedulingSorter { /* 188 行 */ }
class CostCalculator { /* 156 行 */ }
```

### Q2: 方法行数超过 50 行怎么办？

**A**: 提取子方法

```typescript
// 错误：长方法
async schedule() {
  // 1. 获取数据（30 行）
  // 2. 筛选容器（40 行）
  // 3. 排序（35 行）
  // 4. 计算成本（25 行）
  // 总共 130 行
}

// 正确：拆分
async schedule() {
  const data = await this.fetchData();      // 委托
  const filtered = this.filter(data);       // 委托
  const sorted = this.sort(filtered);       // 委托
  return this.calculateCost(sorted);        // 委托
}
```

### Q3: JSDoc 缺失怎么办？

**A**: 补充完整文档

```typescript
// 错误：缺少文档
function calculateFee(container, days) {
  return container.dailyRate * days;
}

// 正确：完整 JSDoc
/**
 * 计算滞港费用
 * 
 * @param container - 容器对象
 * @param days - 超期天数
 * @returns 费用金额（美元）
 */
function calculateFee(container: Container, days: number): number {
  return container.dailyRate * days;
}
```

---

## CI/CD 集成

### GitHub Actions

```yaml
name: SKILL Check

on: [push, pull_request]

jobs:
  skill-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd backend && npm install
      
      - name: Run SKILL Check
        run: cd backend && npm run skill:check
```

### Git Hooks

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running SKILL Check..."
cd backend && npm run skill:check

if [ $? -ne 0 ]; then
  echo "SKILL Check failed!"
  exit 1
fi

echo "SKILL Check passed!"
exit 0
```

---

## 最佳实践

### 1. 频繁运行

每次提交前都运行：

```bash
git add .
npm run skill:check  # 先检查
git commit -m "feat: xxx"
```

### 2. 小步提交

不要堆积大量变更：

```bash
# 错误：一次性提交太多
git commit -m "update many files"

# 正确：小步提交
git commit -m "refactor: split ContainerService"
git commit -m "docs: add JSDoc for utils"
```

### 3. 持续改进

发现问题立即修复：

```bash
# 看到 FAIL 立即处理
# 不要拖延到以后
```

---

## 相关文档

- [SKILL 原则详解](01-SKILL 原则.md) - 了解五大原则
- [开发流程](03-开发流程.md) - 七步开发法
- [SKILL 编写规范](04-SKILL 编写规范.md) - 文档模板

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高  
**审核状态**: 已验证
