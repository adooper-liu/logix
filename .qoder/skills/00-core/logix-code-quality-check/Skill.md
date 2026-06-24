---
name: logix-code-quality-check
description: LogiX 代码质量检查 - ESLint规则、类型安全、异步操作、函数复杂度
version: 1.0.0
updated: 2026-06-23
trigger: manual
tags: [quality, eslint, typescript, check]
---

# LogiX 代码质量检查

## 用途

在 AI 生成代码后，自动运行质量检查，确保代码符合 LogiX 开发规范。

---

## 触发条件

当 AI 完成以下任务时，自动运行本 Skill：
- 创建新的 Service/Controller/Entity
- 重构现有代码
- 修复 Bug
- 添加新功能

---

## 检查清单

### 1. 类型安全检查

**检查项**：
- [ ] 是否有 `any` 类型使用？
- [ ] 所有变量、参数、返回值是否有明确类型？
- [ ] 外部数据是否进行了校验？

**修复模板**：

```typescript
// ❌ 检测到 any 类型
const data: any = await fetchData();

// ✅ 修复：定义接口
interface ExternalData {
  code?: string;
  name?: string;
  [key: string]: unknown;
}
const data: ExternalData = await fetchData();

// ✅ 修复：使用泛型
async function fetchData<T>(): Promise<T> {
  // ...
}
```

---

### 2. 异步操作检查

**检查项**：
- [ ] 是否有 floating promises（未等待的异步调用）？
- [ ] 循环中的异步操作是否正确处理？
- [ ] 事件处理器中的异步是否有错误处理？

**修复模板**：

```typescript
// ❌ 检测到 floating promise
containers.forEach(c => updateStatus(c.id));

// ✅ 修复方案1：Promise.all（并行）
await Promise.all(
  containers.map(c => updateStatus(c.id))
);

// ✅ 修复方案2：for...of（串行）
for (const container of containers) {
  await updateStatus(container.id);
}

// ✅ 修复方案3：显式忽略
void sendNotification(container.id);
```

---

### 3. 函数复杂度检查

**检查项**：
- [ ] 单个函数是否超过 50 行？
- [ ] 圈复杂度是否超过 10？
- [ ] 嵌套深度是否超过 4 层？

**修复模板**：

```typescript
// ❌ 检测到长函数（100+ 行）
async function processContainer(container: Container) {
  // 验证数据（20行）
  // 计算费用（30行）
  // 更新状态（20行）
  // 发送通知（15行）
  // 记录日志（15行）
}

// ✅ 修复：拆分为小函数
async function processContainer(container: Container) {
  validateContainer(container);           // < 50 行
  const cost = await calculateCost(container);  // < 50 行
  await updateStatus(container);          // < 50 行
  await sendNotification(container);      // < 50 行
  await logOperation(container);          // < 50 行
}
```

---

### 4. 代码风格检查

**检查项**：
- [ ] 是否有 `console.log`？
- [ ] 是否有硬编码魔法数字？
- [ ] 命名是否符合规范？

**修复模板**：

```typescript
// ❌ 检测到 console.log
console.log('debug:', data);

// ✅ 修复：使用 logger
import { logger } from '../utils/logger';
logger.debug('Processing data:', { containerNumber });

// ❌ 检测到魔法数字
if (days > 15) { ... }

// ✅ 修复：使用常量
const FREE_DAYS_LIMIT = 15;
if (days > FREE_DAYS_LIMIT) { ... }
```

---

### 5. 架构设计检查

**检查项**：
- [ ] Controller 是否只包含参数校验和 Service 调用？
- [ ] Service 之间是否有循环依赖？
- [ ] 是否使用了接口而非具体实现？

**修复模板**：

```typescript
// ❌ 检测到 Controller 中有业务逻辑
@Controller()
class ContainerController {
  async getContainers(req: Request, res: Response) {
    const containers = await this.containerRepo.find({ ... });
    const filtered = containers.filter(c => c.status === 'active');
    res.json(filtered);
  }
}

// ✅ 修复：业务逻辑移到 Service
@Controller()
class ContainerController {
  constructor(private containerService: ContainerService) {}
  
  async getContainers(req: Request, res: Response) {
    const containers = await this.containerService.getActiveContainers();
    res.json(containers);
  }
}

// Service 中
@Injectable()
class ContainerService {
  async getActiveContainers(): Promise<Container[]> {
    const containers = await this.containerRepo.find();
    return containers.filter(c => c.status === 'active');
  }
}
```

---

## 自动化检查流程

### Step 1: 运行 ESLint

```bash
cd backend
npm run lint
```

**如果失败**：
- 查看错误信息
- 根据上述修复模板逐个修复
- 重新运行直到通过

### Step 2: 运行 TypeScript 检查

```bash
cd backend
npm run type-check
```

**如果失败**：
- 修复类型错误
- 确保所有变量有明确类型

### Step 3: 人工审查

**检查项**：
- [ ] 代码是否遵循单一职责原则？
- [ ] 模块间是否低耦合？
- [ ] 是否有清晰的注释？
- [ ] 是否有单元测试？

---

## 常见问题与解决方案

### Q1: ESLint 报错太多，无法一次性修复

**A**: 采用增量修复策略：

```bash
# Step 1: 自动修复可修复的问题
npm run lint:fix

# Step 2: 按文件逐个修复
npx eslint src/services/container.service.ts

# Step 3: 按规则类型修复
npx eslint src --rule '@typescript-eslint/no-explicit-any: error'
```

### Q2: 如何处理外部 API 返回的未知数据？

**A**: 使用运行时校验：

```typescript
import { z } from 'zod';

// 定义 Schema
const ExternalDataSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
});

// 校验并转换
async function fetchExternalData() {
  const rawData = await api.get('/external');
  
  // 运行时校验
  const validated = ExternalDataSchema.parse(rawData);
  
  // 转换为内部类型
  return transformToInternal(validated);
}
```

### Q3: 如何降低圈复杂度？

**A**: 提取函数或使用策略模式：

```typescript
// ❌ 高复杂度（多个 if-else）
function getDiscount(user: User, order: Order): number {
  if (user.isVip) {
    if (order.total > 1000) {
      if (order.items.length > 5) {
        return 0.2;
      }
      return 0.15;
    }
    return 0.1;
  }
  if (order.total > 500) {
    return 0.05;
  }
  return 0;
}

// ✅ 修复：提取函数
function getDiscount(user: User, order: Order): number {
  if (isVipWithLargeOrder(user, order)) {
    return getVipDiscount(order);
  }
  if (isRegularWithMediumOrder(order)) {
    return 0.05;
  }
  return 0;
}

function isVipWithLargeOrder(user: User, order: Order): boolean {
  return user.isVip && order.total > 1000;
}

function getVipDiscount(order: Order): number {
  return order.items.length > 5 ? 0.2 : 0.15;
}
```

---

## 质量指标目标

| 指标 | 目标值 | 检查方式 |
|------|--------|----------|
| `any` 类型使用 | 0 次 | ESLint |
| Floating Promises | 0 个 | ESLint |
| 函数行数 | ≤ 50 行 | ESLint |
| 圈复杂度 | ≤ 10 | ESLint |
| 嵌套深度 | ≤ 4 层 | ESLint |
| console.log | 0 个 | ESLint |
| 测试覆盖率 | ≥ 60% | Jest/Vitest |

---

## 使用示例

### 场景1：生成新 Service 后

```
AI: "我已经创建了 ContainerService"

AI (自动): "现在运行代码质量检查..."

AI 执行:
1. 检查是否有 any 类型 → 发现 2 处
2. 检查 floating promises → 发现 1 处
3. 检查函数长度 → 发现 1 个函数超过 50 行

AI 修复:
1. 为外部数据定义接口
2. 添加 await 关键字
3. 拆分长函数为 3 个小函数

AI: "代码质量检查完成，已修复所有问题。"
```

### 场景2：重构旧代码后

```
用户: "重构 DemurrageService"

AI: "重构完成"

AI (自动): "运行代码质量检查..."

AI 执行:
1. 运行 npm run lint → 通过
2. 运行 npm run type-check → 通过
3. 人工审查 → 通过

AI: "✅ 代码质量检查全部通过！"
```

---

**版本**: v1.0  
**最后更新**: 2026-06-23  
**参考**: `.qoder/rules/logix-development-rules.mdc`
