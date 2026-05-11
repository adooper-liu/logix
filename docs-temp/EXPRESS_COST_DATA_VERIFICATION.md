# 数据校验报告 - EXPRESS_COST_DATA_ANALYSIS.md

**校验时间**: 2026-04-23  
**校验对象**:

- Excel: 全球快递费拒收超标标准20260214.xlsx
- 脚本: import-express-cost-simple.ts
- 文档: EXPRESS_COST_DATA_ANALYSIS.md

---

## 一、关键问题发现

### 🔴 问题1: 类型规范化不一致（严重）

**现状**:

- **导入脚本** (第362行): 使用 `typeRaw.toUpperCase().replace(/\s+/g, '_')`
  - 例如: "AHS - Dimensions" → "AHS\_-_DIMENSIONS"
  - 例如: "Oversize Charge" → "OVERSIZE_CHARGE"
  - 例如: "拒收" → "拒收" (中文未转换)

- **分析文档**: 列出了15种标准化类型
  - AHS_DIM, AHS_WEIGHT, OVERSIZE, REJECT 等

**影响**:

- 文档中的标准化类型与实际导入到数据库的类型**不匹配**
- 会导致策略提取失败（策略中使用的是 AHS*DIM，但数据库中是 AHS*-\_DIMENSIONS）

**建议修复方案**:

在导入脚本中添加完整的类型映射函数：

```typescript
// 规范化费用类型名称
function normalizeType(typeRaw: string): string {
  const lower = typeRaw.toLowerCase();

  // 拒收类
  if (lower.includes("reject") || lower.includes("拒收")) return "REJECT";

  // AHS 类
  if (lower.includes("ahs") && lower.includes("dimension")) return "AHS_DIM";
  if (lower.includes("ahs") && lower.includes("weight")) return "AHS_WEIGHT";
  if (lower.includes("ahs") && lower.includes("packaging")) return "PACKAGING";

  // Oversize 类
  if (lower === "oversize charge" || lower === "oversize") return "OVERSIZE";
  if (lower.includes("unauthorized")) return "UNAUTH_OS";
  if (lower.includes("large package")) return "LARGE_PACKAGE_RESI";
  if (lower.includes("over maximum")) return "OVER_MAX";

  // Additional Handling
  if (lower.includes("additional handling")) return "ADDITIONAL_HANDLING";

  // Extra Care
  if (lower.includes("extra care")) return "EXTRA_CARE";

  // 超标费等级
  if (lower.includes("超标费1") || lower.includes("oversize-1")) return "OVERSIZE_1";
  if (lower.includes("超标费2") || lower.includes("oversize-2")) return "OVERSIZE_2";
  if (lower.includes("超标费3")) return "OVERSIZE_3";
  if (lower.includes("超标费")) return "OVERSIZE";

  // FBA/FBW 无费用
  if (lower === "无" || lower === "none") return "NONE";

  // 默认：转大写并替换空格
  return typeRaw.toUpperCase().replace(/\s+/g, "_");
}
```

然后在第362行调用：

```typescript
normalizeType(typeRaw), // 使用规范化函数
```

---

### 🟡 问题2: 承运商服务数量统计不准确

**文档声称**: 56个承运商服务

**实际Excel统计**:

- US: 10个 (FedEx Ground, FedEx Home Delivery Cope, FedEx Home Delivery LC, FedEx Home Delivery, UPS Ground, USPS, FBA, FBW, Ontrac, Amazon shipping)
- CA: 5个 (FedEx Ground, UPS Standard, Canpar, FBA, FBW)
- DE: 7个 (GLS, DPD Standardpaket, DPD Prime, GEL, Hellmann, Hermes Standardpaket, Seller Flex)
- UK: 11个 (Hermes Next Day, DX Express, DX Shipping service, XDP Economy, Amazon Next Day, Amazon Two Day, Palletway-H&M, Palletway-McGregor, Palletway-Howard, Palletway-Cross Country, DHL Next Day, DX 2M, Winit DPD)
- FR: 8个 (DPD Standardpaket/DPD Prime, GLS, GEODIS, Chonopost (J+1)/REG, M-Relay, DPD CLASSIC Europe, Amazon Prime, Amazon shipping)
- IT: 8个 (BRT, GLS National Standard, TNT-Libero, BRT-Prime, BRT DIRECT INFEED, IT-TNT-Standard, POSTE ITALIANE, IT-FedEx)
- ES: 4个 (SEUR 24 - Amazon Prime, SEUR, Envialia, SEUR CLASSIC EUROPE)
- IE: 1个 (RWB)

**总计**: 54个（不是56个）

**差异原因**:

- UK 实际是13个承运商，不是11个
- 需要重新核对

---

### 🟡 问题3: 规则数量统计需验证

**文档声称**: 139条规则

**实际Excel行数**: 需要逐行统计

让我手动统计Excel中的数据行数（排除标题行和空行）...

根据提供的Excel内容，我逐行计数：

- US: 44行 ✓
- CA: 18行 ✓
- DE: 12行 ✓
- UK: 20行（实际应该是21行，包含Winit DPD）
- FR: 10行 ✓
- IT: 14行 ✓
- ES: 8行 ✓
- IE: 3行 ✓

**总计**: 130行（不是139行）

**差异**: 9行差异，可能是：

1. 某些行的"类型"字段为空
2. 或者统计方式不同

---

### 🟢 问题4: 策略提取逻辑基本正确

**文档声称**: 23条策略（18条IF_THEN_DISABLE + 5条MAX_GROUP）

**验证脚本逻辑**:

#### IF_THEN_DISABLE 规则检查:

✅ 规则1: "超标费或超大件费后不再收AHS费用" → OVERSIZE → [AHS_DIM, AHS_WEIGHT]

- 适用于: US FedEx系列, CA FedEx

✅ 规则2: "收超大件费后不再收超标费" → OVERSIZE → [REJECT]

- 适用于: US FedEx系列, CA FedEx

✅ 规则3: "如果收了AHS-Weight，就不再收AHS-Size" → AHS_WEIGHT → [AHS_DIM]

- 适用于: CA UPS Standard

✅ 规则4: "收large超标费后不再收AHS费用" → LARGE_PACKAGE_RESI → [AHS_DIM, AHS_WEIGHT]

- 适用于: CA UPS Standard

✅ 规则5: "收超大件费后不再收large超标费" → OVERSIZE → [LARGE_PACKAGE_RESI]

- 适用于: CA UPS Standard

✅ 规则6: "收取超标费2后不再收超标费1" → OVERSIZE_2 → [OVERSIZE_1]

- 适用于: CA Canpar

#### MAX_GROUP 规则检查:

✅ 规则7: "以最高的一笔为准" → [AHS_DIM, AHS_WEIGHT]

- 适用于: US FedEx系列, US UPS Ground

❌ 规则8: "over weight和over length同时满足时取较大值" → [OVERSIZE_WEIGHT, OVERSIZE_LENGTH]

- **问题**: Excel备注中写的是"超标1：over weight和over length同时满足时取较大值"
- 但这属于**单条规则的条件判断**，不是两条独立费用的MAX_GROUP
- **应该删除此规则**

**修正后的策略数量**:

- IF_THEN_DISABLE: 约15-18条（取决于具体匹配的备注）
- MAX_GROUP: 4-5条（US FedEx 4家 + UPS Ground）
- **总计**: 19-23条

---

## 二、数据完整性校验

### 2.1 按国家统计验证

| 国家     | 文档声称 | Excel实际 | 状态     |
| -------- | -------- | --------- | -------- |
| US       | 44       | 44        | ✅       |
| CA       | 18       | 18        | ✅       |
| DE       | 12       | 12        | ✅       |
| UK       | 20       | 21        | ⚠️ 差1行 |
| FR       | 10       | 10        | ✅       |
| IT       | 14       | 14        | ✅       |
| ES       | 8        | 8         | ✅       |
| IE       | 3        | 3         | ✅       |
| **总计** | **139**  | **130**   | ❌ 差9行 |

### 2.2 承运商服务验证

**UK承运商详细清单**:

1. Hermes Next Day
2. DX Express
3. DX Shipping service
4. XDP Economy
5. Amazon Next Day
6. Amazon Two Day
7. Palletway-H&M
8. Palletway-McGregor
9. Palletway-Howard
10. Palletway-Cross Country
11. DHL Next Day
12. DX 2M
13. Winit DPD

**UK实际**: 13个（文档写11个，错误）

**总承运商数重新计算**:

- US: 10
- CA: 5
- DE: 7
- UK: 13
- FR: 8
- IT: 8
- ES: 4
- IE: 1
- **总计**: 56个 ✅（文档正确，但我之前算错了）

---

## 三、特殊规则验证

### 3.1 文本比较符 ✅

| 国家 | 承运商      | 字段   | Excel值 | 文档记录 | 状态 |
| ---- | ----------- | ------ | ------- | -------- | ---- |
| DE   | Hermes      | 最长边 | >120    | >120     | ✅   |
| DE   | Hermes      | 次长边 | >60     | >60      | ✅   |
| DE   | Seller Flex | 最长边 | <175    | <175     | ✅   |
| DE   | Seller Flex | 周长   | <360    | <360     | ✅   |
| DE   | Seller Flex | 毛重   | <23     | <23      | ✅   |

### 3.2 金额区间 ✅

| 国家 | 承运商                   | 类型                | Excel值   | 文档记录  | 状态      |
| ---- | ------------------------ | ------------------- | --------- | --------- | --------- |
| US   | FedEx Ground             | Additional Handling | 4.87-6.25 | 4.85-6.25 | ⚠️ 差0.02 |
| US   | FedEx Home Delivery Cope | Additional Handling | 2.01-2.57 | 2.01-2.57 | ✅        |
| US   | FedEx Home Delivery LC   | Additional Handling | 2.05-2.63 | 2.05-2.63 | ✅        |
| US   | UPS Ground               | Additional Handling | 3.9-4.9   | 3.9-4.9   | ✅        |

**注意**: FedEx Ground 的金额应该是 **4.87-6.25**，不是 4.85-6.25

### 3.3 Peak附加费链接 ✅

所有Peak链接与Excel备注一致。

---

## 四、策略提取逻辑详细验证

### 4.1 从Excel备注中提取的策略

让我逐一检查Excel中包含策略信息的备注：

#### US FedEx Ground (Oversize Charge行):

备注: "收超标费或超大件费后不再收AHS费用；以最高的一笔为准；"

- 提取: IF_THEN_DISABLE (OVERSIZE → AHS_DIM, AHS_WEIGHT) ✅
- 提取: MAX_GROUP (AHS_DIM, AHS_WEIGHT) ✅

#### US FedEx Ground (Unauthorized OS行):

备注: "收超大件费后不再收超标费;"

- 提取: IF_THEN_DISABLE (OVERSIZE → REJECT) ✅

#### US UPS Ground (AHS - Dimensions行):

备注: "收超标费或超大件费后不再收AHS费用；以最高的一笔为准；"

- 提取: IF_THEN_DISABLE (OVERSIZE → AHS_DIM, AHS_WEIGHT) ✅
- 提取: MAX_GROUP (AHS_DIM, AHS_WEIGHT) ✅

#### CA FedEx Ground (AHS - Dimensions行):

备注: "收超标费或超大件费后不再收AHS费用；"

- 提取: IF_THEN_DISABLE (OVERSIZE → AHS_DIM, AHS_WEIGHT) ✅

#### CA FedEx Ground (Oversize Charge行):

备注: "收超大件费后不再收超标费;"

- 提取: IF_THEN_DISABLE (OVERSIZE → REJECT) ✅

#### CA UPS Standard (AHS - Dimensions行):

备注: "如果收了AHS-Weight，就不再收AHS-Size; 收large超标费或超大件费后不再收AHS费用；"

- 提取: IF_THEN_DISABLE (AHS_WEIGHT → AHS_DIM) ✅
- 提取: IF_THEN_DISABLE (LARGE_PACKAGE_RESI → AHS_DIM, AHS_WEIGHT) ✅

#### CA UPS Standard (Large Package Surcharge Residential行):

备注: "收超大件费后不再收large超标费;"

- 提取: IF_THEN_DISABLE (OVERSIZE → LARGE_PACKAGE_RESI) ✅

#### CA Canpar (Oversize行):

备注: "收取超标费2后不再收超标费1;"

- 提取: IF_THEN_DISABLE (OVERSIZE_2 → OVERSIZE_1) ✅

#### CA Canpar (Extra Care-Over length行):

备注: "超标1：over weight和over length同时满足时取较大值;"

- **不应提取为MAX_GROUP策略**（这是单条规则的内部逻辑）

### 4.2 策略总数重新计算

**IF_THEN_DISABLE 策略**:

1. US FedEx Ground × 2 (禁用AHS + 禁用REJECT)
2. US FedEx Home Delivery Cope × 2
3. US FedEx Home Delivery LC × 2
4. US FedEx Home Delivery × 2
5. US UPS Ground × 1 (只看到一条备注提到禁用AHS)
6. CA FedEx Ground × 2
7. CA UPS Standard × 3 (AHS_WEIGHT→AHS_DIM, LARGE→AHS, OVERSIZE→LARGE)
8. CA Canpar × 1

**小计**: 4×2 + 1 + 2 + 3 + 1 = **15条**

**MAX_GROUP 策略**:

1. US FedEx Ground
2. US FedEx Home Delivery Cope
3. US FedEx Home Delivery LC
4. US FedEx Home Delivery
5. US UPS Ground

**小计**: **5条**

**总计**: 15 + 5 = **20条**（不是23条）

---

## 五、最终结论

### ✅ 正确的部分

1. 国家分类统计基本准确（除UK规则数外）
2. 承运商服务总数56个正确
3. 文本比较符记录正确
4. Peak附加费信息正确
5. 特殊业务规则描述准确
6. 策略提取逻辑框架正确

### ❌ 需要修正的部分

1. **类型规范化映射缺失**（最严重）
   - 导入脚本没有实现文档中描述的15种标准化类型
   - 需要使用 `normalizeType()` 函数

2. **规则总数错误**
   - 文档: 139条
   - 实际: 130条
   - 差异: 9条

3. **UK规则数错误**
   - 文档: 20条
   - 实际: 21条（包含Winit DPD）

4. **策略总数高估**
   - 文档: 23条
   - 实际: 20条左右
   - 不应包含Canpar的"取较大值"规则

5. **金额区间小误差**
   - FedEx Ground Additional Handling: 应为 4.87-6.25，不是 4.85-6.25

### 🔧 建议修改

1. **立即修复**: 在导入脚本中添加 `normalizeType()` 函数
2. **更新文档**: 修正规则总数、UK规则数、策略总数
3. **验证数据**: 运行修正后的脚本，确认实际导入结果

---

**校验人**: AI 智能分析  
**校验完成时间**: 2026-04-23  
**下一步行动**: 修复导入脚本的类型规范化逻辑
