# 🚀 Phase 2: 服务拆分 - 快速启动指南

**目标读者：** 执行工程师  
**预计时间：** 3-5 分钟阅读 + 6-8 小时执行  
**前置条件：** 已完成准备工作清单

---

## ⚡ 5 分钟快速启动

### **Step 0: 环境检查（2 分钟）**

```bash
# 1. 确认当前分支
git branch
# ✅ 应该在 feature/phase2-service-split 分支

# 2. 安装依赖
npm install

# 3. 运行现有测试
npm test -- scheduling.config.test.ts
# ✅ 应该全部通过（19 个测试）

# 4. 确认数据库连接
npm run test:e2e
# ✅ 应该能连接数据库
```

---

### **Step 1: 开始第一个服务拆分（60-90 分钟）**

**选择 ContainerFilterService 作为起点**（风险最低）

#### **1.1 创建服务文件（15 分钟）**

```bash
# 创建文件
touch backend/src/services/ContainerFilterService.ts
```

```typescript
// backend/src/services/ContainerFilterService.ts
import { Repository } from 'typeorm';
import { AppDataSource } from '../database';
import { Container } from '../entities/Container';
import { logger } from '../utils/logger';

/**
 * 货柜筛选服务
 * 负责根据各种条件筛选待排产的货柜
 */
export class ContainerFilterService {
  private containerRepo: Repository<Container>;

  constructor() {
    this.containerRepo = AppDataSource.getRepository(Container);
  }

  /**
   * 筛选待排产货柜
   * @param options 筛选条件
   * @returns 符合条件的货柜列表
   */
  async filter(options: FilterOptions): Promise<Container[]> {
    logger.info('[ContainerFilterService] Filtering containers:', options);

    // TODO: 从 intelligentScheduling.service.ts 复制筛选逻辑到这里

    return [];
  }
}

interface FilterOptions {
  portCodes?: string[];
  minFreeDays?: number;
  // ... 其他条件
}
```

---

#### **1.2 复制原始逻辑（20 分钟）**

**打开源文件对比：**

```bash
# 终端 1: 打开源文件
code backend/src/services/intelligentScheduling.service.ts

# 终端 2: 打开新服务文件
code backend/src/services/ContainerFilterService.ts
```

**找到筛选逻辑位置：**

```bash
# 搜索关键词
grep -n "filterContainers" backend/src/services/intelligentScheduling.service.ts
# 定位到方法定义行号
```

**逐块复制（不要修改逻辑）：**

```typescript
// 从原文件复制整个 filterContainers 方法
async filterContainers(
  portCodes: string[],
  minFreeDays: number
): Promise<Container[]> {
  // ... 完整实现
}
```

---

#### **1.3 编写单元测试（25 分钟）**

```bash
# 创建测试文件
touch backend/src/services/ContainerFilterService.test.ts
```

```typescript
// backend/src/services/ContainerFilterService.test.ts
import { ContainerFilterService } from './ContainerFilterService';

describe('ContainerFilterService', () => {
  let service: ContainerFilterService;

  beforeEach(() => {
    service = new ContainerFilterService();
  });

  describe('filter', () => {
    it('should filter containers by port codes', async () => {
      // Arrange
      const options = {
        portCodes: ['USLAX'],
        minFreeDays: 3
      };

      // Act
      const result = await service.filter(options);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty port codes', async () => {
      const options = {
        portCodes: [],
        minFreeDays: 3
      };

      const result = await service.filter(options);

      expect(result).toEqual([]);
    });

    // TODO: 添加更多测试用例
  });
});
```

**运行测试：**

```bash
npm test -- ContainerFilterService.test.ts
```

---

#### **1.4 重构原服务调用（15 分钟）**

**在 intelligentScheduling.service.ts 中：**

```typescript
// Step 1: 导入新服务
import { ContainerFilterService } from './ContainerFilterService';

// Step 2: 在服务类中添加属性
export class IntelligentSchedulingService {
  private containerFilterService: ContainerFilterService;

  constructor() {
    this.containerFilterService = new ContainerFilterService();
  }

  // Step 3: 替换调用
  async batchSchedule(request: ScheduleRequest) {
    // 原代码：
    // const containers = await this.filterContainers(portCodes, minFreeDays);

    // 新代码：
    const containers = await this.containerFilterService.filter({
      portCodes,
      minFreeDays
    });

    // ... 后续逻辑不变
  }
}
```

---

#### **1.5 清理与验证（15 分钟）**

```bash
# 1. 编译检查
npx tsc --noEmit

# 2. 运行所有测试
npm test

# 3. 功能验证（手动测试）
# 打开前端，执行一次排产操作
# 确认功能正常
```

---

### **Step 2: 提交并庆祝（5 分钟）**

```bash
# Git 提交
git add .
git commit -m "feat: 提取 ContainerFilterService (Phase 2-Step 1)"

# 推送到远程
git push origin feature/phase2-service-split

# 🎉 完成第一个服务拆分！
```

---

## 📋 每日执行清单

### **每天开始前的检查**

```markdown
□ 昨晚的睡眠充足（> 7 小时）
□ 今天不被会议打断（已设置勿扰）
□ 有充足的咖啡/茶 ☕
□ 团队成员可联系（Slack/微信在线）
□ 备份分支已创建
```

### **每个 Step 完成后检查**

```markdown
□ 代码编译通过
□ 所有测试通过
□ 功能验证正常
□ Git 已提交
□ 文档已更新
□ 休息一下（走动、喝水、远眺）
```

---

## 🆘 常见问题速查

### **Q1: TypeScript 编译错误**

```bash
# 错误示例
error TS2304: Cannot find name 'FilterOptions'.

# 解决方案
// 确保接口定义在使用前已导入或声明
import { FilterOptions } from './interfaces';
```

---

### **Q2: 测试失败**

```bash
# 查看具体错误信息
npm test -- --verbose

# 常见原因
□ Mock 数据不完整
□ 数据库连接失败
□ 依赖未注入
```

---

### **Q3: 功能不一致**

```bash
# 调试步骤
1. 对比原代码和新代码逻辑
2. 添加详细日志
3. 单步调试（VSCode Debug）
4. 检查边界条件处理
```

---

### **Q4: 性能下降**

```bash
# 排查方法
1. 使用 performance.now() 计时
2. 检查是否有重复查询
3. 确认索引是否生效
4. 对比原代码 SQL 执行计划
```

---

## 🎯 进度追踪表

### **Phase 2 Steps 完成情况**

| Step  | 服务名称                 | 状态      | 开始时间 | 完成时间 | 实际耗时 |
| ----- | ------------------------ | --------- | -------- | -------- | -------- |
| **1** | ContainerFilterService   | ⏳ 待开始 | -        | -        | -        |
| **2** | SchedulingSorter         | ⏳ 待开始 | -        | -        | -        |
| **3** | WarehouseSelectorService | ⏳ 待开始 | -        | -        | -        |
| **4** | TruckingSelectorService  | ⏳ 待开始 | -        | -        | -        |
| **5** | OccupancyCalculator      | ⏳ 待开始 | -        | -        | -        |
| **6** | CostEstimationService    | ⏳ 待开始 | -        | -        | -        |

---

### **每日站会模板**

```markdown
## YYYY-MM-DD 站会

### 昨天完成

- [ ] Step X: XXXXService

### 今天计划

- [ ] 开始 Step Y: YYYYService

### 遇到的困难

- [ ] 无 / 具体问题

### 需要的帮助

- [ ] 无 / 需要 XXX 支持
```

---

## 🎊 里程碑庆祝

### **完成 Step 1 后**

```
✅ 第一个服务拆分成功！
🎉 证明小步快跑策略可行！
💪 为后续 5 个服务树立标杆！
```

**建议奖励：**

- ☕ 一杯喜欢的咖啡
- 🚶 户外散步 10 分钟
- 🎵 听一首喜欢的歌
- 📱 给朋友分享喜悦

---

### **完成 Step 3 后**

```
✅ 已经完成一半！
🎯 仓库和车队选择服务攻克！
🚀 最复杂的部分已过！
```

**建议奖励：**

- 🍔 一顿美食
- 🎬 一场电影
- 🛍️ 小礼物犒劳自己

---

### **完成全部 6 个 Step 后**

```
🏆 Phase 2 圆满完成！
🎊 6 个服务全部拆分成功！
⭐ 小步快跑策略再次验证！
```

**建议奖励：**

- 🎁 大礼物（游戏机、书籍等）
- 🏖️ 一天假期
- 📸 团队合影留念

---

## 📞 紧急联系

### **技术支持**

- 💬 AI 助手 - 随时提问
- 📚 技术文档 - 查看相关 SKILL
- 🔍 Stack Overflow - 搜索类似问题

### **团队支持**

- 👨‍💻 Tech Lead - 架构决策
- 👥 同事 - 代码审查
- 📧 tech-team@logix.com - 正式沟通

---

## 🌟 成功心态

### **记住这几点**

1. **小步快跑** - 每次只改一点，不求完美
2. **测试保护** - 先写测试，再改代码
3. **随时回滚** - 有问题就回退，不硬撑
4. **及时休息** - 每 45 分钟休息一下
5. **庆祝进步** - 每个小成就都值得庆祝

---

### **遇到困难时**

```
停下来，深呼吸，问自己：
1. 这个问题真的紧急吗？
2. 最坏的结果是什么？
3. 有什么资源可以帮助我？
4. 如果是同事遇到，我会怎么建议？

然后：
✅ 寻求帮助（不丢人）
✅ 暂时放下（明天再说）
✅ 分解问题（各个击破）
```

---

**准备好了吗？让我们开始吧！** 🚀

**记住：你不是一个人在战斗，整个团队都在你身后！** 💪
