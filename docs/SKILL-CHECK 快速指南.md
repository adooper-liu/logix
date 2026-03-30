# SKILL Check 快速使用指南

**版本：** v1.0  
**最后更新：** 2026-03-30

---

## 🚀 快速开始

### **一句话使用**

```bash
cd backend
npm run skill:check
```

---

## 📋 完整使用流程

### **1. 进入正确的目录**

```bash
# ✅ 正确：进入 backend 目录
cd backend

# ❌ 错误：在根目录运行（会找不到脚本）
cd d:\Gihub\logix
npm run skill:check  # 会报错：Missing script
```

---

### **2. 运行检查**

```bash
# 方式 1: 使用 npm 脚本（推荐）
cd backend
npm run skill:check

# 方式 2: 直接运行脚本
cd backend
node scripts/check-skill-compliance.js
```

---

### **3. 查看结果**

**成功示例：**

```
================================
SKILL 原则代码质量检查
================================

正在检查 6 个服务文件...

ContainerFilterService.ts
  行数：125
  函数数：3
  JSDoc: 3/3

SchedulingSorter.ts
  行数：188
  函数数：4
  JSDoc: 4/4

================================
检查结果
================================

总体统计:
  总文件数：6
  ✅ 通过：6
  ❌ 失败：0
  平均行数：209
  TODO 数量：2
  FIXME 数量：0

================================
✅ 恭喜！所有文件都符合 SKILL 原则！
================================
```

---

**失败示例：**

```
================================
检查结果
================================

demurrage.service.ts
  行数：3773
  函数数：17
  JSDoc: 14/17
  错误:
    - Line 1: 文件行数过多 (3773 > 300)
    - Line 299: 函数 "calculateSingleDemurrage" 行数过多 (91 > 50)
  警告:
    - Line 168: 公共函数 "addDays" 缺少 JSDoc 注释

================================
❌ 发现 1 个文件需要改进
请根据上述报告进行重构优化
================================
```

---

## 🔍 检查内容

### **强制检查项**

| 检查项           | 标准值  | 说明                   |
| ---------------- | ------- | ---------------------- |
| **文件行数**     | ≤300 行 | 单文件不得超过 300 行  |
| **方法行数**     | ≤50 行  | 单个方法不得超过 50 行 |
| **JSDoc 完整性** | 100%    | 公共函数必须有 JSDoc   |

### **警告项**

| 检查项         | 标准值 | 说明            |
| -------------- | ------ | --------------- |
| **函数参数**   | ≤4 个  | 超过 4 个会警告 |
| **TODO 数量**  | ≤5 个  | 超过 5 个会警告 |
| **FIXME 数量** | 0 个   | 有 FIXME 会警告 |

---

## 🛠️ 常见问题

### **Q1: 提示 "Missing script: skill:check"**

**原因：** 不在 backend 目录

**解决：**

```bash
cd backend
npm run skill:check
```

---

### **Q2: 提示 "Cannot find module 'scripts/check-skill-compliance.js'"**

**原因：** 脚本文件不存在

**解决：**

```bash
# 检查文件是否存在
ls scripts/check-skill-compliance.js

# 如果不存在，从根目录复制
cp ../scripts/check-skill-compliance.js scripts/
```

---

### **Q3: 文件行数超标怎么办？**

**解决：** 拆分大文件

```typescript
// ❌ 修改前：1000 行的大文件
export class IntelligentSchedulingService {
  // 60+ 方法混在一起
}

// ✅ 修改后：拆分为 6 个小文件
export class ContainerFilterService {
  /* 125 行 */
}
export class SchedulingSorter {
  /* 188 行 */
}
export class WarehouseSelectorService {
  /* 287 行 */
}
export class TruckingSelectorService {
  /* 412 行 */
}
export class OccupancyCalculator {
  /* 287 行 */
}
export class CostEstimationService {
  /* 207 行 */
}
```

---

### **Q4: 方法行数超标怎么办？**

**解决：** 提取子方法

```typescript
// ❌ 修改前：100 行的方法
async processContainers() {
  // 50 行筛选逻辑
  // 30 行排序逻辑
  // 20 行保存逻辑
}

// ✅ 修改后：拆分为 3 个小方法
async processContainers() {
  const filtered = this.filter(containers);
  const sorted = this.sort(filtered);
  await this.save(sorted);
}

filter(containers: Container[]): Container[] { /* 50 行 */ }
sort(containers: Container[]): Container[] { /* 30 行 */ }
save(containers: Container[]): Promise<void> { /* 20 行 */ }
```

---

### **Q5: 缺少 JSDoc 怎么办？**

**解决：** 添加 JSDoc 注释

````typescript
/**
 * 方法名称
 *
 * 一句话描述职责
 *
 * @param paramName - 参数说明
 * @returns 返回值说明
 *
 * @example
 * ```typescript
 * const result = await service.method({...});
 * ```
 */
async methodName(paramName: Type): Promise<ReturnType> {
  // ...
}
````

---

## 📊 解读报告

### **关键指标**

```
总体统计:
  总文件数：20          ← 检查的文件总数
  ✅ 通过：15            ← 符合 SKILL 原则的文件数
  ❌ 失败：5             ← 需要改进的文件数
  平均行数：884          ← 平均每个文件的行数
  TODO 数量：0           ← TODO 注释总数
  FIXME 数量：0          ← FIXME 注释总数
```

### **错误类型**

```
错误:
  - Line 1: 文件行数过多 (862 > 300)
    ↑              ↑        ↑
    |              |        └─ 标准值
    |              └─ 实际值
    └─ 问题描述

  - Line 299: 函数 "xxx" 行数过多 (91 > 50)
    ↑              ↑         ↑        ↑
    |              |         |        └─ 标准值
    |              |         └─ 实际值
    |              └─ 函数名
    └─ 行号
```

---

## 🎯 最佳实践

### **1. 开发过程中经常运行**

```bash
# 每完成一个小功能就运行一次
git commit -m "feat: 添加 xxx 功能"
npm run skill:check  # 确保符合标准
```

---

### **2. 提交前必须运行**

```bash
# 提交代码前的标准流程
npm test -- --coverage  # 测试覆盖率
npm run lint            # Lint 检查
npm run skill:check     # SKILL 检查
npm run type-check      # TypeScript 编译
```

---

### **3. CI/CD 自动运行**

GitHub Actions 会在以下情况自动运行：

- Push 到 main/develop 分支
- 创建 Pull Request

**检查不通过 → PR 无法合并！**

---

## 📈 改进建议

### **针对大文件**

| 当前行数    | 建议措施 |
| ----------- | -------- |
| 300-500 行  | 尽快拆分 |
| 500-1000 行 | 立即拆分 |
| >1000 行    | 紧急拆分 |

### **针对长方法**

| 当前行数   | 建议措施 |
| ---------- | -------- |
| 50-100 行  | 考虑拆分 |
| 100-200 行 | 必须拆分 |
| >200 行    | 立即拆分 |

---

## 🎊 成功案例

### **Phase 2 服务拆分**

**拆分前：**

- `intelligentScheduling.service.ts`: 2,371 行

**拆分后：**

- `ContainerFilterService.ts`: 125 行 ✅
- `SchedulingSorter.ts`: 188 行 ✅
- `WarehouseSelectorService.ts`: 287 行 ✅
- `TruckingSelectorService.ts`: 412 行 ❌ (需拆分)
- `OccupancyCalculator.ts`: 287 行 ✅
- `CostEstimationService.ts`: 207 行 ✅

**结果：** 5/6 符合 SKILL 原则！

---

## 🔗 相关文档

- 📄 [skill.md](../skill.md) - SKILL 原则完整规范
- 📄 [SKILL 执行指南.md](SKILL 执行指南.md) - 详细使用教程
- 📄 [PULL_REQUEST_TEMPLATE.md](../.github/PULL_REQUEST_TEMPLATE.md) - PR 检查清单

---

## 💡 小贴士

### **快速修复命令**

```bash
# 格式化代码（有助于发现长函数）
npm run format

# 自动修复 ESLint 问题
npm run lint -- --fix

# 查看可用脚本
npm run
```

### **IDE 集成**

**VS Code:**

- 安装 `ESLint` 插件
- 安装 `Prettier` 插件
- 设置保存时自动格式化

**WebStorm:**

- 启用 ESLint
- 启用 Prettier
- 设置 File Watcher

---

**让 SKILL Check 成为您的编码习惯！** 🚀
