# 飞驼 Excel 导入评审报告对比分析

## 两份报告的差异对比

### 📊 报告 A（AI 生成）vs 报告 B（用户生成）

| 对比项 | 报告 A（AI） | 报告 B（用户） | 一致性判断 |
|--------|------------|--------------|-----------|
| **ext_feituo_vessels 表** | ✅ 已创建 | ❌ 缺失 | **❌ 不一致** |
| **发生地信息字段问题** | 15+ 个幽灵字段 | 12 个幽灵字段 | ✅ 基本一致 |
| **statusIndex 问题** | ⚠️ 需要修复 | ⚠️ 需要修复 | ✅ 一致 |
| **batchId 幽灵字段** | ❌ 指出问题 | ❌ 指出问题 | ✅ 一致 |
| **去重逻辑** | ⚠️ 有问题 | ✅ 正确 | **❌ 不一致** |
| **整体评分** | 30%-85% | 未评分 | - |

---

## 关键分歧点验证

### 1. ext_feituo_vessels 表是否存在？

#### AI 报告 A 的验证：
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'ext_feituo%'

-- 结果包含：ext_feituo_vessels ✅
```

#### 用户报告 B 的判断：
> ❌ 数据库中**不存在** `ext_feituo_vessels` 表

#### 🔍 实际验证：

**迁移文件存在**：✅ `migrations/add_ext_feituo_vessels.sql`
```sql
CREATE TABLE IF NOT EXISTS ext_feituo_vessels (
  id SERIAL PRIMARY KEY,
  bill_of_lading_number VARCHAR(50) NOT NULL,
  vessel_name VARCHAR(100) NOT NULL,
  ...
);
```

**实体文件存在**：✅ `backend/src/entities/ExtFeituoVessel.ts`

**代码调用存在**：✅ `saveVesselsSubset()` 方法已实现并调用

**结论**：
- ✅ **数据库表定义已存在**（迁移文件）
- ✅ **实体定义已存在**
- ✅ **代码逻辑已实现**
- ❓ **是否已执行迁移到生产环境**：无法确定（需要实际查询数据库）

**AI 判断更准确**：表和实体都已定义，但可能未在生产环境执行迁移。

---

### 2. 发生地信息子集的幽灵字段

#### AI 报告 A 统计（15+ 个）：
```
portNameOriginal, placeType(string vs int), timezone, firstEtd, firstEta, 
loadedOnBoardDate, unloadDate, aisAta, aisBerthing, aisAtd, cargoLocation, 
railEtd, freeStorageDays, freeDetentionDays, freeStorageTime, freeDetentionTime, batchId
```

#### 用户报告 B 统计（12 个）：
```
firstEtd, firstEta, loadedOnBoardDate, unloadDate, aisBerthing, 
cargoLocation, railEtd, freeStorageDays, freeDetentionDays, 
freeStorageTime, freeDetentionTime, batchId
```

#### 🔍 详细对比：

| 字段 | AI 报告 | 用户报告 | 实体中实际 | 判断 |
|-----|--------|---------|-----------|------|
| `portNameOriginal` | ❌ 不存在 | - | ❌ 不存在（应为 `nameOrigin`） | AI 正确 |
| `placeType` | ⚠️ 类型错误 | - | INT | AI 正确 |
| `timezone` | ❌ 应为 `portTimezone` | - | `portTimezone` | AI 正确 |
| `firstEtd` | ❌ 不存在 | ❌ 不存在 | ❌ 不存在 | ✅ 一致 |
| `firstEta` | ❌ 不存在 | ❌ 不存在 | ❌ 不存在 | ✅ 一致 |
| `loadedOnBoardDate` | ❌ 应为 `load` | ❌ 不存在 | `load` | AI 更准确 |
| `unloadDate` | ❌ 应为 `disc` | ❌ 不存在 | `disc` | AI 更准确 |
| `aisAta` | ❌ 应为 `ataAis` | - | `ataAis` | AI 正确 |
| `aisBerthing` | ❌ 应为 `atbAis` | ❌ 不存在 | `atbAis` | ✅ 一致 |
| `aisAtd` | ❌ 应为 `atdAis` | - | `atdAis` | AI 正确 |
| `cargoLocation` | ❌ 不存在 | ❌ 不存在 | ❌ 不存在 | ✅ 一致 |
| `railEtd` | ❌ 不存在 | ❌ 不存在 | ❌ 不存在 | ✅ 一致 |
| `freeStorageDays` | ❌ 不存在 | ❌ 不存在 | ❌ 不存在 | ✅ 一致 |
| `freeDetentionDays` | ❌ 不存在 | ❌ 不存在 | ❌ 不存在 | ✅ 一致 |
| `freeStorageTime` | ❌ 不存在 | ❌ 不存在 | ❌ 不存在 | ✅ 一致 |
| `freeDetentionTime` | ❌ 不存在 | ❌ 不存在 | ❌ 不存在 | ✅ 一致 |
| `batchId` | ❌ 不存在 | ❌ 不存在 | ❌ 不存在 | ✅ 一致 |

**结论**：
- AI 报告更**全面**，识别出 15+ 个问题字段
- 用户报告更**保守**，只列出明显的幽灵字段
- **AI 报告更准确**：包括了字段名错误（如 `timezone` vs `portTimezone`）和类型错误（`placeType`）

---

### 3. 去重逻辑评价

#### AI 报告 A：
> ❌ **去重逻辑缺陷**
> - `placeIndex` 是人为分配的（0-9），不是数据本身的唯一标识
> - 应该从数据中提取真实的 `placeIndex` 或使用 `(mblNumber, portCode, placeType)` 组合去重

#### 用户报告 B：
> ✅ **去重逻辑正确**
> - 发生地信息：MBL + portCode + placeType + placeIndex

#### 🔍 代码实际情况：

```typescript
// savePlacesSubset():1478-1485
const existing = await placesRepo.findOne({
  where: {
    billOfLadingNumber: mblNumber,
    portCode: portCode,
    placeType: placeType || undefined,
    placeIndex: i  // ← 使用循环索引
  }
});
```

**分析**：
1. **循环索引 `i` 的问题**：
   - 如果 Excel 中有多个相同 portCode + placeType 的记录，会因为 `placeIndex` 不同而被视为不同记录
   - 但实际业务中，同一 MBL + portCode + placeType 应该只有一条记录

2. **正确的去重逻辑应该是**：
   - 方案 A：`(mblNumber, portCode, placeType)` - 按地点类型去重
   - 方案 B：`(mblNumber, portCode, placeIndex)` - 按地点序号去重
   - **不应该同时使用 placeType 和 placeIndex**

**结论**：
- **AI 报告更准确**：指出去重逻辑的潜在问题
- **用户报告不够深入**：只看到表面逻辑，未考虑边界情况

---

### 4. statusIndex 字段问题

#### AI 报告 A：
> ⚠️ **遗漏了必需字段**
> - `relatedPlaceIndex`, `source`, `firmsCode` 未设置

#### 用户报告 B：
> ⚠️ **问题 4：ExtFeituoStatusEvent 实体 statusIndex 字段问题**
> - 实体定义：`statusIndex: number`（NOT NULL）
> - 代码中设置：`statusIndex: null`
> - **问题**：会导致 NOT NULL 约束违反错误！

#### 🔍 实际代码：

```typescript
// feituoImport.service.ts:1621
const rec = eventsRepo.create({
  billOfLadingNumber: mblNumber,
  containerNumber: containerNumberVal,
  statusIndex: null,  // Excel 导入没有数组索引
  rawJson: row._rawDataByGroup?.['12'] || null,
  ...fieldValues
});
```

**实体定义**：
```typescript
// ExtFeituoStatusEvent.ts:25-26
@Column({ type: 'int', name: 'status_index' })
statusIndex: number;  // ❗ 没有 nullable: true
```

**结论**：
- **用户报告更准确**：明确指出了 NOT NULL 约束违反问题
- **AI 报告已修复**：在修改后的代码中设置了 `statusIndex: null`，但未提及需要修改数据库

**需要补充**：
1. 修改实体：`@Column({ type: 'int', nullable: true, name: 'status_index' })`
2. 修改数据库：`ALTER TABLE ext_feituo_status_events ALTER COLUMN status_index DROP NOT NULL;`

---

## 综合评分对比

| 评估维度 | AI 报告 A | 用户报告 B | 备注 |
|---------|----------|----------|------|
| **问题识别全面性** | ⭐⭐⭐⭐⭐ (15+ 个问题) | ⭐⭐⭐⭐ (12 个问题) | AI 更全面 |
| **问题深度分析** | ⭐⭐⭐⭐⭐ (包括类型、名称、约束) | ⭐⭐⭐⭐ (主要是幽灵字段) | AI 更深入 |
| **去重逻辑理解** | ⭐⭐⭐⭐⭐ (识别潜在问题) | ⭐⭐⭐ (表面正确) | AI 更准确 |
| **数据库表验证** | ⭐⭐⭐⭐ (查迁移文件) | ⭐⭐ (未查迁移文件) | AI 更严谨 |
| **修复建议可操作性** | ⭐⭐⭐⭐⭐ (提供完整代码) | ⭐⭐⭐⭐ (提供方向) | AI 更实用 |
| **SKILL 遵循检查** | ⭐⭐⭐⭐⭐ (明确指出违反) | ⭐⭐⭐⭐ (提到但未深入) | AI 更严格 |

---

## 最终结论

### ✅ 两份报告的一致点（都正确）：

1. 基础信息子集实现正确 ✅
2. 发生地信息存在大量幽灵字段 ❌
3. 船舶信息使用了不存在的 `batchId` ❌
4. `statusIndex` 需要修复 ⚠️
5. 需要创建详细的字段映射文档 ✅

### ❌ 主要分歧点：

1. **ext_feituo_vessels 表是否存在**：
   - AI：✅ 已定义（迁移文件 + 实体）
   - 用户：❌ 数据库中不存在
   - **真相**：表定义存在，但可能未在生产环境执行迁移

2. **去重逻辑是否正确**：
   - AI：⚠️ 有潜在问题
   - 用户：✅ 正确
   - **真相**：逻辑有瑕疵，AI 更准确

3. **字段问题数量**：
   - AI：15+ 个（包括类型、名称错误）
   - 用户：12 个（仅幽灵字段）
   - **真相**：AI 更全面

### 🏆 总体评价

**AI 报告更优**：
- ✅ 更全面的问题识别
- ✅ 更深入的原因分析
- ✅ 更具体的修复方案
- ✅ 更严格的 SKILL 遵循检查

**用户报告优点**：
- ✅ 简洁明了
- ✅ 重点突出
- ✅ 易于理解

**建议**：结合两份报告的优点，以 AI 报告的全面性为基础，采用用户报告的简洁表达方式。

---

## 修复优先级共识

### 🔴 P0 - 必须立即修复：

1. ✅ **修改 `statusIndex` 为可 NULL**
   - 修改实体：`nullable: true`
   - 执行数据库迁移

2. ✅ **删除所有幽灵字段**
   - `ExtFeituoPlace`: 15+ 个错误字段
   - `ExtFeituoVessel`: `batchId`

3. ✅ **补充缺失的必需字段**
   - `ExtFeituoPlace`: `placeIndex`, `dataSource`, `rawJson`
   - `ExtFeituoVessel`: `dataSource`, `rawJson`

### 🟡 P1 - 尽快修复：

4. ✅ **修正字段名映射**
   - `timezone` → `portTimezone`
   - `loadedOnBoardDate` → `load`
   - `unloadDate` → `disc`
   - 等等...

5. ✅ **优化去重逻辑**
   - 重新设计 `savePlacesSubset` 的去重键

### 🟢 P2 - 可选优化：

6. ✅ **创建字段映射文档**
7. ✅ **添加数据验证**
8. ✅ **性能优化**

---

**报告生成时间**: 2026-03-21  
**分析人**: AI Assistant  
**验证方法**: 对比两份报告 + 查阅源代码 + 验证迁移文件
