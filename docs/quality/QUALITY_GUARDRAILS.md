# LogiX 质量保障机制（新手版）

> 目标：让每一次提交都“可验证、可回滚、可解释”。
> 核心原则：**真正的保障来自自动化门禁 + 可执行检查**，不是“口头承诺”。

---

## 1. 为什么需要这份机制

没有自动化门禁时，团队容易出现这些问题：

- 本地“看起来没问题”，合并后才发现跑不起来
- 文档说“已完成”，但代码和测试结果不一致
- 同一个问题反复出现（尤其是路由、类型、测试环境、密钥泄露）

这份机制的价值是：

- **提前发现问题**：在 PR 阶段就拦住
- **减少返工**：避免合并后再修
- **降低风险**：把“经验”变成“脚本”

---

## 2. 三层门禁（记住这三层就够了）

### L1：本地自检（开发者自己跑）

目的：5-10 分钟内发现常见问题。

必跑命令（后端）：

```bash
npm run test:backend
npm run type-check:backend
npm run lint:backend
```

### L2：PR 阻断门禁（CI 必须通过）

目的：合并前必须“硬性达标”。

阻断项：

- 后端单测
- 后端类型检查
- 后端 ESLint

任何一项失败，PR 不能合并。

### L3：PR 非阻断门禁（CI 可见但先不拦）

目的：先建立可见性，再逐步提升到阻断。

当前非阻断项：

- 后端 integration 测试

说明：等稳定后（例如 14 天成功率 >= 95%）再升级为阻断。

---

## 3. “改哪儿，查哪儿”（变更感知规则）

不是每次都跑全量重检查，而是按改动路径触发额外检查：

- 改了 `backend/src/services/statistics/**` 或筛选相关代码
  - 必跑：`npm run verify:stats-filter`
- 改了 `backend/tests/integration/**` 或 integration 配置
  - 必跑：`npm run test:backend:integration`
- 改了 `frontend/src/services/api.ts`（请求治理核心）
  - 至少要在 PR 描述中附上手工 smoke 结果（关键页面）

这样做的好处：

- 速度快（不总是全量）
- 风险高的改动会被重点检查

---

## 4. 新手日常流程（直接照做）

1. 写代码  
2. 本地先跑 L1 三条命令  
3. 提 PR  
4. 看 CI：阻断项必须绿，非阻断项看趋势  
5. 若失败，按日志修复后重跑

---

## 5. 失败时怎么处理（不慌版）

### 场景 A：后端 type-check 失败

- 先看第一条 TS 错误（通常后续是连锁报错）
- 修完后只重跑：

```bash
npm run type-check:backend
```

### 场景 B：integration 失败（DB/Redis 连接）

- 确认 `backend/.env.test` 凭据正确
- 本地重跑：

```bash
cd backend
npm run test:integration -- --detectOpenHandles --forceExit
```

### 场景 C：统计对账检查失败

- 说明统计逻辑或筛选口径可能不一致
- 优先检查近期改动是否触达 `statistics/**` 与筛选分支

---

## 6. 红线（触发即禁止合并）

- 阻断门禁失败
- 扫描到密钥/Token 泄露
- PR 描述声称“通过”，但 CI 结果不匹配

---

## 7. 这份机制对应的自动化文件

- `./.github/workflows/quality-guardrails.yml`

它会自动做三件事：

1. 跑阻断门禁（后端 test + type-check + lint）
2. 根据改动路径决定是否跑额外检查
3. 跑 integration（目前非阻断）

---

## 8. 升级计划（不是一成不变）

- 当 integration 稳定后，去掉 `continue-on-error`
- 当前端历史类型问题清完后，把前端 type-check 加入阻断门禁

---

## 9. 一句话总结

**保障不是“写了文档”，而是“文档里的规则被 CI 自动执行”。**
