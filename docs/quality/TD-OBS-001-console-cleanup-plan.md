# TD-OBS-001 console.log 清理计划

## 文档信息

- **创建时间**: 2026-04-09
- **优先级**: P1
- **状态**: 计划制定中

---

## 一、现状统计

### 后端 console 使用

| 模块                                    | 文件数 | console 数量 | 说明                          |
| --------------------------------------- | ------ | ------------ | ----------------------------- |
| services/statistics/                    | 3+     | 25+          | 统计服务(大量调试日志)        |
| services/containerStatistics.service.ts | 1      | 4            | 货柜统计                      |
| utils/smartCalendarCapacity.ts          | 1      | 4            | 智能日历产能(logger 未初始化) |
| ai/data/knowledgeBase.ts                | 1      | 1            | 注释中的示例代码              |
| **小计**                                | **6+** | **34+**      | -                             |

### 前端 console 使用

| 模块                              | 文件数 | console 数量 | 说明         |
| --------------------------------- | ------ | ------------ | ------------ |
| services/universalDictMapping.ts  | 1      | 12           | 字典映射服务 |
| services/dictMapping.ts           | 1      | 4            | 港口映射服务 |
| services/costOptimizer.service.ts | 1      | 3            | 成本优化服务 |
| **小计**                          | **3**  | **19**       | -            |

### 已处理 (Phase 2)

- ✅ `services/retryInterceptor.ts` - 已替换为 logger
- ✅ `services/concurrencyControl.ts` - 已替换为 logger

---

## 二、清理策略

### 方案 A: 全面清理 (推荐) ⭐

**步骤**:

1. **第一步**: 后端统计服务 (最高优先级)
   - `StatusDistribution.service.ts`
   - `ArrivalStatistics.service.ts`
   - `EtaStatistics.service.ts`
   - `containerStatistics.service.ts`
2. **第二步**: 前端服务层
   - `universalDictMapping.ts`
   - `dictMapping.ts`
   - `costOptimizer.service.ts`

3. **第三步**: 工具类
   - `smartCalendarCapacity.ts` (需先初始化 logger)

4. **第四步**: 测试文件
   - 测试文件中的 console 可保留(用于调试)

**优点**:

- 彻底解决 console 问题
- 统一日志系统

**缺点**:

- 工作量大(约 50+ 处修改)
- 需要逐个文件验证

**工作量**: 中等(2-3天)

---

### 方案 B: 渐进式清理

**步骤**:

1. 优先处理生产环境关键路径
2. 逐步清理其他文件
3. 添加 ESLint 规则禁止新增 console

**优点**:

- 风险低
- 可分阶段完成

**缺点**:

- 耗时长
- 可能遗漏

---

### 方案 C: 仅关键路径

**范围**:

- 仅处理对外 API 相关服务
- 保留内部工具和测试文件的 console

**优点**:

- 快速见效
- 工作量小

**缺点**:

- 不彻底
- 仍有规范违背

---

## 三、推荐方案: 方案 A

### Phase 1: 后端统计服务 (今天)

**目标文件**:

1. `backend/src/services/statistics/StatusDistribution.service.ts`
2. `backend/src/services/statistics/ArrivalStatistics.service.ts`
3. `backend/src/services/statistics/EtaStatistics.service.ts`
4. `backend/src/services/containerStatistics.service.ts`

**预计修改**: ~30 处

---

### Phase 2: 前端服务层 (明天)

**目标文件**:

1. `frontend/src/services/universalDictMapping.ts`
2. `frontend/src/services/dictMapping.ts`
3. `frontend/src/services/costOptimizer.service.ts`

**预计修改**: ~19 处

---

### Phase 3: 工具类和其他 (后天)

**目标文件**:

1. `backend/src/utils/smartCalendarCapacity.ts`
2. 其他零星文件

**预计修改**: ~5 处

---

## 四、替换规则

### 后端

```typescript
// 修改前
console.error("[ServiceName] Error message:", error);
console.warn("[ServiceName] Warning message");
console.log("[ServiceName] Debug info:", data);

// 修改后
import { logger } from "../utils/logger";

logger.error("[ServiceName] Error message", { error });
logger.warn("[ServiceName] Warning message");
logger.debug("[ServiceName] Debug info", { data });
```

### 前端

```typescript
// 修改前
console.error("[ServiceName] Error:", error);
console.log("[ServiceName] Info:", data);

// 修改后
import { logger } from "@/utils/logger";

logger.error("[ServiceName] Error", { error });
logger.info("[ServiceName] Info", { data });
```

---

## 五、注意事项

1. **logger 级别选择**:
   - `console.error` → `logger.error`
   - `console.warn` → `logger.warn`
   - `console.log` (错误/异常) → `logger.error`
   - `console.log` (重要信息) → `logger.info`
   - `console.log` (调试信息) → `logger.debug`
   - `console.info` → `logger.info`
   - `console.debug` → `logger.debug`

2. **参数格式**:
   - 保持原有消息内容
   - 额外数据作为第二个参数传入对象

3. **测试文件**:
   - 测试文件中的 console 可保留(用于调试输出)
   - 或在 `.eslintrc.js` 中排除测试文件

4. **验证**:
   - 每个文件修改后运行 `npm run lint`
   - 确保无新的 lint 错误

---

## 六、成功标准

1. ✅ 所有生产代码(非测试)中的 console 全部替换为 logger
2. ✅ `npm run lint:backend` 无 console 相关警告
3. ✅ `npm run lint:frontend` 无 console 相关警告
4. ✅ 功能测试通过

---

## 七、风险评估

| 风险                | 概率 | 影响 | 缓解措施                    |
| ------------------- | ---- | ---- | --------------------------- |
| logger 导入路径错误 | 低   | 中   | 仔细检查导入语句            |
| 日志级别选择不当    | 中   | 低   | 参考现有代码模式            |
| 遗漏某些文件        | 中   | 低   | 使用 grep 全面搜索          |
| 影响性能            | 低   | 低   | logger 在生产环境过滤 debug |

---

## 八、执行计划

### Day 1: 后端统计服务

- [ ] StatusDistribution.service.ts
- [ ] ArrivalStatistics.service.ts
- [ ] EtaStatistics.service.ts
- [ ] containerStatistics.service.ts
- [ ] 验证: npm run lint:backend

### Day 2: 前端服务层

- [ ] universalDictMapping.ts
- [ ] dictMapping.ts
- [ ] costOptimizer.service.ts
- [ ] 验证: npm run lint:frontend

### Day 3: 收尾

- [ ] smartCalendarCapacity.ts
- [ ] 其他零星文件
- [ ] 全局验证: npm run lint
- [ ] 更新 DEVELOPMENT_DEBT.md

---

**计划制定完成** ✅
