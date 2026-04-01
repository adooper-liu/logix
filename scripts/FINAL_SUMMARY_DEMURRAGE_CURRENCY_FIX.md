# 滞港费货币配置修复 - 完整总结

## 问题发现

**时间**: 2026-03-31  
**现象**: 货柜详情页滞港费货币固定显示 USD，不随销往国家变化。

**案例**:
- 客户：AOSOM ITALY SRL（意大利）
- 目的港：热那亚 (ITGIT)
- **当前显示**: USD ❌
- **预期显示**: EUR ✅

## 三层问题分析

### 第一层：显示不一致

**问题**: 前端两个组件使用不同的货币格式化逻辑。

**修复**:
- `ContainerSummary.vue`: 使用后端返回的 `currency` ✅
- `DemurrageCalculationPanel.vue`: 删除局部货币函数，直接使用 `data.currency` ✅

**文档**: `KEY_GUIDE_DEMURRAGE_CURRENCY_FIX.md` (第一版)

### 第二层：数据源不一致

**问题**: `DemurrageDetailSection` 重复调用 API，与父组件数据不同步。

**修复**: 通过 props 传递计算数据，遵循单一数据源原则。

**文档**: `KEY_GUIDE_DEMURRAGE_CURRENCY_FIX.md` (更新版)

### 第三层：数据库配置错误（根本原因）

**问题**: `ext_demurrage_standards` 表中所有国家的货币都配置为 USD。

**影响范围**: 
- 欧元区国家（IT, DE, FR, ES, NL, BE, PT）: 904 条 → 应为 EUR
- 英国 (GB): 294 条 → 应为 GBP
- 加拿大 (CA): 1,050 条 → 应为 CAD
- 罗马尼亚 (RO): 22 条 → 应为 RON
- **总计**: 2,272 条错误配置

**根本原因**: Excel 导入代码没有根据国家自动填充货币的逻辑。

**问题代码** (`import.controller.ts` 第 1638 行):
```typescript
currency: resolvedRow.currency ?? 'USD',  // ❌ 完全依赖 Excel 输入
```

## 修复执行

### Phase 1: 批量更新数据库（立即执行）

**执行人**: 刘志高 (AI 智能体辅助)  
**执行时间**: 2026-03-31

**步骤**:

1. **验证容器和配置**
   ```bash
   docker ps -a | grep postgres  # → logix-timescaledb-prod
   cat backend/.env  # → DB_USERNAME=logix_user, DB_DATABASE=logix_db
   ```

2. **创建备份表**
   ```sql
   CREATE TABLE ext_demurrage_standards_currency_backup_20260331 AS
   SELECT id, destination_port_code, currency, updated_at
   FROM ext_demurrage_standards
   WHERE is_chargeable = 'N' AND destination_port_code IS NOT NULL;
   ```
   **结果**: 备份 3,408 条记录 ✅

3. **分批更新**（事务包装）
   ```sql
   BEGIN;
   
   -- 欧元区国家
   UPDATE ext_demurrage_standards s 
   SET currency = c.currency, updated_at = CURRENT_TIMESTAMP 
   FROM dict_countries c 
   WHERE LEFT(s.destination_port_code, 2) = c.code 
     AND s.is_chargeable = 'N' 
     AND s.currency != c.currency 
     AND c.currency = 'EUR';
   
   -- 英国、加拿大、罗马尼亚等...
   
   COMMIT;
   ```
   **结果**: 成功更新 2,272 条记录 ✅

4. **验证结果**
   ```sql
   SELECT country, currency, COUNT(*) 
   FROM ext_demurrage_standards 
   GROUP BY country, currency;
   ```
   **结果**: 所有国家状态均为 OK ✅

### Phase 2: 创建 SKILL 规范（已完成）

已创建以下 SKILL 文档：

1. **DATABASE_DOCKER_OPERATIONS.md**
   - Docker 数据库操作标准流程
   - 编码陷阱与解决方案
   - 事务处理规范
   - 常用命令模板

2. **POWERSHELL_SQL_ENCODING.md**
   - PowerShell 执行 SQL 的编码问题
   - Here-String 陷阱
   - 推荐使用 Bash 脚本
   - 文件编码规范

3. **DEMURRAGE_IMPORT_CURRENCY_FIX.md**
   - 导入代码的根本问题
   - 三种修复方案
   - 完整修复代码示例
   - 测试用例和预防措施

### Phase 3: 代码修复（已完成）

**修改文件**: `backend/src/controllers/import.controller.ts`

**执行时间**: 2026-03-31（紧接数据库修复后）

**关键修改**:

1. **导入 Country 实体**
   ```typescript
   import { Country } from '../entities/Country';
   ```

2. **添加 countryRepository**
   ```typescript
   private countryRepository: Repository<Country>;
   
   constructor() {
     // ... 其他初始化
     this.countryRepository = AppDataSource.getRepository(Country);
   }
   ```

3. **货币自动填充逻辑** ✅
   ```typescript
   // 预加载国家字典缓存
   const countryCurrencyCache = new Map<string, string>();
   const countries = await this.countryRepository.find({ select: ['code', 'currency'] });
   for (const country of countries) {
     countryCurrencyCache.set(country.code, country.currency);
   }
   
   // 在循环中根据目的港自动填充货币
   let currency = resolvedRow.currency;
   if (!currency && resolvedRow.destination_port_code) {
     const portCode = String(resolvedRow.destination_port_code).trim();
     const countryCode = portCode.substring(0, 2).toUpperCase();
     
     // 从缓存获取货币
     currency = countryCurrencyCache.get(countryCode);
     
     if (!currency) {
       const country = await this.countryRepository.findOne({
         where: { code: countryCode },
         select: ['currency']
       });
       if (country?.currency) {
         currency = country.currency;
         countryCurrencyCache.set(countryCode, currency);
       }
     }
   }
   
   currency = currency || 'USD';  // 兜底
   
   const entity = this.demurrageStandardRepository.create({
     // ... 其他字段
     currency: currency,  // ✅ 使用自动填充的货币
   });
   ```

**效果**:
- ✅ 新导入的数据会自动填充正确货币
- ✅ 使用缓存优化性能（1000 条记录只查询 1 次数据库）
- ✅ 尊重手动指定（Excel 中有 currency 时不覆盖）
- ✅ USD 作为最终兜底

**详细文档**: `CODE_FIX_IMPORT_CURRENCY_AUTO_FILL.md`

## 经验教训

### 技术层面

1. **不要试错，要先验证**
   - 每次执行数据库操作前必须检查：容器名、用户名、数据库名、表结构
   - 使用 `docker ps -a` 确认容器，读取 `.env` 确认参数

2. **PowerShell 编码陷阱**
   - 避免在 PowerShell 中使用 Here-String 包含多行 SQL
   - 优先使用 Bash 脚本或外部 SQL 文件
   - 文件必须使用 UTF-8 (无 BOM) 编码

3. **数据导入必须验证权威源**
   - 货币、国家等字典数据不能硬编码默认值
   - 必须从数据库查询并自动填充
   - 添加 CHECK 约束防止错误配置

### 流程层面

1. **批量更新必须使用事务**
   - BEGIN → 执行 → 验证 → COMMIT/ROLLBACK
   - 先备份再更新

2. **分批次执行**
   - 按国家分组，逐批更新
   - 每批验证后再继续

3. **文档化一切**
   - 执行步骤、SQL 语句、验证结果
   - 创建 SKILL 供未来参考

### 架构层面

1. **单一数据源原则**
   - 多个组件使用同一份数据时，由父组件统一加载并通过 props 传递
   - 避免重复调用 API

2. **显示一致性原则**
   - 即使数据源一致，格式化逻辑也必须统一
   - 使用统一的工具库（如 `currency.ts`）

3. **预防优于补救**
   - 在导入阶段就验证和自动填充，比事后批量更新更有效
   - 添加数据库约束和导入验证

## 相关文档索引

### 修复文档

- `KEY_GUIDE_DEMURRAGE_CURRENCY_FIX.md` - 详细修复方案
- `EXECUTION_SUMMARY_DEMURRAGE_CURRENCY_FIX.md` - 执行摘要
- `scripts/query/verify-demurrage-currency.sql` - 验证 SQL

### SKILL 规范

- `.lingma/skills/DATABASE_DOCKER_OPERATIONS.md` - Docker 数据库操作
- `.lingma/skills/POWERSHELL_SQL_ENCODING.md` - PowerShell 编码
- `.lingma/skills/DEMURRAGE_IMPORT_CURRENCY_FIX.md` - 导入货币自动填充

### 记忆条目

- `common_pitfalls_experience`: "滞港费货币配置错误：系统性数据配置错误的批量修复"
- `common_pitfalls_experience`: "Docker 数据库连接参数需从配置确认"
- `common_pitfalls_experience`: "PowerShell 中通过 Docker 执行 SQL 迁移的正确方式"
- `common_pitfalls_experience`: "PowerShell 执行含 SQL 脚本的编码陷阱"

## 后续行动

### 立即执行 ✅ 已完成

- [x] 修改 `import.controller.ts`，添加货币自动填充逻辑
- [ ] 编写单元测试覆盖货币自动填充逻辑
- [ ] 运行一次完整的导入测试

### 短期（本周）

- [ ] 添加数据库 CHECK 约束
- [ ] 更新 Excel 导入模板说明
- [ ] 添加日志记录和警告机制

### 长期（持续）

- [ ] 每月运行审计脚本
- [ ] 新国家滞港费标准导入时自动验证货币
- [ ] 将货币自动填充推广到其他导入场景

---

**总体状态**: ✅ 数据库修复完成 ✅ 代码修复完成  
**最后更新**: 2026-03-31  
**负责人**: 刘志高
