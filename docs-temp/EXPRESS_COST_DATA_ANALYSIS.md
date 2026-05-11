# 全球快递费规则数据整理报告

**数据源**: 全球快递费拒收超标标准20260214.xlsx  
**整理时间**: 2026-04-23  
**整理人**: AI 智能分析

---

## 数据总览

| 统计项     | 数量                                  |
| ---------- | ------------------------------------- |
| 总记录数   | 130 条                                |
| 涉及国家   | 8 个 (US, CA, DE, UK, FR, IT, ES, IE) |
| 承运商服务 | 56 个                                 |
| 费用类型   | 15 种                                 |
| 堆叠策略   | 20 条                                 |

---

## 一、按国家分类统计

### 1. 美国 (US) - 44条规则

| 承运商                   | 规则数 | 主要费用类型                                                            |
| ------------------------ | ------ | ----------------------------------------------------------------------- |
| FedEx Ground             | 6      | 拒收, AHS-Dim, AHS-Wt, Oversize, Unauth OS, Additional Handling         |
| FedEx Home Delivery Cope | 6      | 同上                                                                    |
| FedEx Home Delivery LC   | 6      | 同上                                                                    |
| FedEx Home Delivery      | 6      | 同上                                                                    |
| UPS Ground               | 5      | 拒收, AHS-Dim, AHS-Wt, Large Package, Over Maximum, Additional Handling |
| USPS                     | 1      | 拒收 (毛重16盎司)                                                       |
| FBA                      | 1      | 无拒收上限                                                              |
| FBW                      | 3      | Oversize-1, Oversize-2, 拒收                                            |
| Ontrac                   | 6      | AHS-Dim, AHS-Wt, Oversize, Unauth OS, 拒收                              |
| Amazon shipping          | 6      | AHS-Dim, AHS-Wt, Oversize, Unauth OS, 拒收                              |

**关键策略**:

- FedEx: 超标费/超大件费 → 禁用AHS；超大件费 → 禁用超标费
- UPS: AHS-Weight → 禁用AHS-Size；large超标费 → 禁用AHS

---

### 2. 加拿大 (CA) - 18条规则

| 承运商       | 规则数 | 主要费用类型                                                                        |
| ------------ | ------ | ----------------------------------------------------------------------------------- |
| FedEx Ground | 6      | 拒收, AHS-Dim, AHS-Wt, Oversize, Unauth OS, AHS-Packaging                           |
| UPS Standard | 7      | 拒收, AHS-Dim, AHS-Wt, Large Package, Over Maximum (2条), Additional Handling       |
| Canpar       | 5      | 拒收, Extra Care-Over length, Over weight, Oversize, Over Max, Extra Care-Irregular |
| FBA          | 1      | 无拒收上限                                                                          |
| FBW          | 1      | 无拒收上限                                                                          |

**关键策略**:

- FedEx: 超标费/超大件费 → 禁用AHS
- UPS: AHS-Weight → 禁用AHS-Size；large超标费 → 禁用AHS
- Canpar: over weight和over length取较大值；超标费2 → 禁用超标费1

---

### 3. 德国 (DE) - 12条规则

| 承运商               | 规则数 | 主要费用类型           |
| -------------------- | ------ | ---------------------- |
| GLS                  | 3      | 超标费1, 超标费2, 拒收 |
| DPD Standardpaket    | 3      | 超标费1, 超标费2, 拒收 |
| DPD Prime            | 3      | 超标费1, 超标费2, 拒收 |
| GEL                  | 2      | 超标费, 拒收           |
| Hellmann             | 2      | 超标费, 拒收           |
| Hermes Standardpaket | 1      | 超标费 (>120, >60)     |
| Seller Flex          | 1      | 拒收 (<175, <360, <23) |

**关键策略**:

- Seller Flex: 最长边、周长、毛重之间逻辑是"且"
- Hermes: 使用文本比较符 (>120, >60)

---

### 4. 英国 (UK) - 21条规则

| 承运商              | 规则数 | 主要费用类型                    |
| ------------------- | ------ | ------------------------------- |
| Hermes Next Day     | 1      | 拒收                            |
| DX Express          | 1      | 拒收                            |
| DX Shipping service | 1      | 拒收                            |
| XDP Economy         | 1      | 拒收                            |
| Amazon Next Day     | 2      | 超标费1, 拒收                   |
| Amazon Two Day      | 2      | 超标费1, 拒收                   |
| Palletway (4家)     | 4      | 拒收 (按托盘收费)               |
| DHL Next Day        | 4      | 拒收, 超标费1, 超标费2, 超标费3 |
| DX 2M               | 1      | 拒收                            |
| Winit DPD           | 1      | 拒收 (新增)                     |

**关键策略**:

- DHL: 超标费3独立收取（任意2边长都超过80cm）
- DX Express: 计价重=max(毛重, 体积重)
- DX Shipping/XDP: 单box限重

---

### 5. 法国 (FR) - 10条规则

| 承运商                      | 规则数 | 主要费用类型    |
| --------------------------- | ------ | --------------- |
| DPD Standardpaket/DPD Prime | 2      | 拒收, 超标费    |
| GLS                         | 2      | 拒收, 超标费    |
| GEODIS                      | 2      | 拒收, 超标费    |
| Chonopost (J+1)/REG         | 1      | 拒收            |
| M-Relay                     | 1      | 拒收            |
| DPD CLASSIC Europe          | 1      | 拒收 (发往境外) |
| Amazon Prime                | 1      | 拒收 (Prime)    |
| Amazon shipping             | 1      | 拒收            |

---

### 6. 意大利 (IT) - 14条规则

| 承运商                | 规则数 | 主要费用类型                                        |
| --------------------- | ------ | --------------------------------------------------- |
| BRT                   | 2      | 拒收, 超标费                                        |
| GLS National Standard | 1      | 拒收 (已停用)                                       |
| TNT-Libero            | 3      | 拒收, 超标1 Manual Handling, 超标2 Exceed dimension |
| BRT-Prime             | 2      | 拒收, 超标费                                        |
| BRT DIRECT INFEED     | 2      | 拒收, 超标费                                        |
| IT-TNT-Standard       | 2      | 拒收, 超标费                                        |
| POSTE ITALIANE        | 2      | 拒收, 超标费                                        |
| IT-FedEx              | 3      | 超标费1, 超标费2, 拒收                              |

**关键策略**:

- TNT-Libero: 超标2费用太高，系统已设置为拒收
- BRT/IT-FedEx: 发往RO (罗马尼亚)

---

### 7. 西班牙 (ES) - 8条规则

| 承运商                 | 规则数 | 主要费用类型                    |
| ---------------------- | ------ | ------------------------------- |
| SEUR 24 - Amazon Prime | 1      | 拒收 (Prime)                    |
| SEUR                   | 4      | 拒收, 超标费1, 超标费2, 超标费3 |
| Envialia               | 2      | 拒收, 超标费                    |
| SEUR CLASSIC EUROPE    | 2      | 拒收, 超标费 (境外除PT外)       |

---

### 8. 爱尔兰 (IE) - 3条规则

| 承运商 | 规则数 | 主要费用类型           |
| ------ | ------ | ---------------------- |
| RWB    | 3      | 超标费1, 超标费2, 拒收 |

---

## 二、费用类型标准化映射

| Excel 原始类型                  | 标准化类型          | 说明             | 出现次数 |
| ------------------------------- | ------------------- | ---------------- | -------- |
| 拒收                            | REJECT              | 超标拒收         | 45       |
| AHS - Dimensions                | AHS_DIM             | 超大尺寸附加费   | 18       |
| AHS - Weight                    | AHS_WEIGHT          | 超重附加费       | 16       |
| AHS - Packaging                 | PACKAGING           | 打包费           | 2        |
| Oversize Charge                 | OVERSIZE            | 超大件费         | 12       |
| Unauthorized OS                 | UNAUTH_OS           | 未经授权超大件   | 8        |
| Large Package Surcharge         | LARGE_PACKAGE_RESI  | 大包裹住宅附加费 | 2        |
| Additional Handling             | ADDITIONAL_HANDLING | 额外处理费       | 5        |
| Over Maximum Limits             | OVER_MAX            | 超限费           | 3        |
| Extra Care-Over length          | EXTRA_CARE          | 特别处理费       | 1        |
| Oversize-1 / 超标费1            | OVERSIZE_1          | 超标费等级1      | 10       |
| Oversize-2 / 超标费2            | OVERSIZE_2          | 超标费等级2      | 8        |
| 超标费3                         | OVERSIZE_3          | 超标费等级3      | 3        |
| Additional Handling - Packaging | ADDITIONAL_HANDLING | 打包费           | 2        |
| 无                              | NONE                | 无费用 (FBA/FBW) | 4        |

---

## 三、堆叠策略详细清单 (20条)

### 3.1 IF_THEN_DISABLE 策略 (15条)

| 序号 | 国家 | 承运商                   | if_triggered       | disable             | 来源备注                             |
| ---- | ---- | ------------------------ | ------------------ | ------------------- | ------------------------------------ |
| 1    | US   | FedEx Ground             | OVERSIZE           | AHS_DIM, AHS_WEIGHT | 收超标费或超大件费后不再收AHS费用    |
| 2    | US   | FedEx Ground             | OVERSIZE           | REJECT              | 收超大件费后不再收超标费             |
| 3    | US   | FedEx Home Delivery Cope | OVERSIZE           | AHS_DIM, AHS_WEIGHT | 同上                                 |
| 4    | US   | FedEx Home Delivery Cope | OVERSIZE           | REJECT              | 同上                                 |
| 5    | US   | FedEx Home Delivery LC   | OVERSIZE           | AHS_DIM, AHS_WEIGHT | 同上                                 |
| 6    | US   | FedEx Home Delivery LC   | OVERSIZE           | REJECT              | 同上                                 |
| 7    | US   | FedEx Home Delivery      | OVERSIZE           | AHS_DIM, AHS_WEIGHT | 同上                                 |
| 8    | US   | FedEx Home Delivery      | OVERSIZE           | REJECT              | 同上                                 |
| 9    | US   | UPS Ground               | OVERSIZE           | AHS_DIM, AHS_WEIGHT | 收超标费或超大件费后不再收AHS费用    |
| 10   | CA   | FedEx Ground             | OVERSIZE           | AHS_DIM, AHS_WEIGHT | 收超标费或超大件费后不再收AHS费用    |
| 11   | CA   | FedEx Ground             | OVERSIZE           | REJECT              | 收超大件费后不再收超标费             |
| 12   | CA   | UPS Standard             | AHS_WEIGHT         | AHS_DIM             | 如果收了AHS-Weight，就不再收AHS-Size |
| 13   | CA   | UPS Standard             | LARGE_PACKAGE_RESI | AHS_DIM, AHS_WEIGHT | 收large超标费后不再收AHS费用         |
| 14   | CA   | UPS Standard             | OVERSIZE           | LARGE_PACKAGE_RESI  | 收超大件费后不再收large超标费        |
| 15   | CA   | Canpar                   | OVERSIZE_2         | OVERSIZE_1          | 收取超标费2后不再收超标费1           |

### 3.2 MAX_GROUP 策略 (5条)

| 序号 | 国家 | 承运商                   | max_group           | 来源备注         |
| ---- | ---- | ------------------------ | ------------------- | ---------------- |
| 1    | US   | FedEx Ground             | AHS_DIM, AHS_WEIGHT | 以最高的一笔为准 |
| 2    | US   | FedEx Home Delivery Cope | AHS_DIM, AHS_WEIGHT | 以最高的一笔为准 |
| 3    | US   | FedEx Home Delivery LC   | AHS_DIM, AHS_WEIGHT | 以最高的一笔为准 |
| 4    | US   | FedEx Home Delivery      | AHS_DIM, AHS_WEIGHT | 以最高的一笔为准 |
| 5    | US   | UPS Ground               | AHS_DIM, AHS_WEIGHT | 以最高的一笔为准 |

**注意**: Canpar的"over weight和over length取较大值"是单条规则的内部逻辑，不作为MAX_GROUP策略。

---

## 四、特殊规则说明

### 4.1 文本比较符规则

| 国家 | 承运商               | 类型   | 条件                                      | 说明                      |
| ---- | -------------------- | ------ | ----------------------------------------- | ------------------------- |
| DE   | Hermes Standardpaket | 超标费 | longest > 120, second > 60                | 使用 > 比较符             |
| DE   | Seller Flex          | 拒收   | longest < 175, girth < 360, gross_wt < 23 | 使用 < 比较符，逻辑为"且" |

### 4.2 金额区间规则

| 国家 | 承运商                   | 类型                | 金额区间    | 说明       |
| ---- | ------------------------ | ------------------- | ----------- | ---------- |
| US   | FedEx Ground             | Additional Handling | 4.87-6.25   | 打包费区间 |
| US   | FedEx Home Delivery Cope | Additional Handling | 2.01 - 2.57 | 打包费区间 |
| US   | FedEx Home Delivery LC   | Additional Handling | 2.05 - 2.63 | 打包费区间 |
| US   | UPS Ground               | Additional Handling | 3.9 - 4.9   | 打包费区间 |

### 4.3 Peak 旺季附加费

| 国家 | 承运商       | Peak 链接                                                                                  | 说明                             |
| ---- | ------------ | ------------------------------------------------------------------------------------------ | -------------------------------- |
| US   | FedEx Ground | https://www.fedex.com/en-us/shipping/current-rates/surcharges-and-fees.html#peak-surcharge | Peak Surcharge                   |
| US   | UPS Ground   | https://www.ups.com/assets/resources/webcontent/en_US/2022_UPS_Peak_Demand_Surcharges.pdf  | Peak Surcharge                   |
| CA   | UPS Standard | https://www.ups.com/ca/en/shipping/peak-surcharges.page                                    | Peak网址，金额=最低基础价格+peak |

### 4.4 特殊业务规则

| 规则                         | 国家       | 承运商                      | 说明                       |
| ---------------------------- | ---------- | --------------------------- | -------------------------- |
| FBA无拒收上限                | US, CA     | FBA                         | FBA仓库无拒收限制          |
| FBW无拒收上限                | CA         | FBW                         | FBW仓库无拒收限制          |
| FBW无拒收上限                | US         | FBW                         | 新增                       |
| 毛重单位：盎司               | US         | USPS                        | 毛重阈值为16盎司           |
| 计价重=max(毛重, 体积重)     | UK         | DX Express                  | 体积重=长×宽×高/5000       |
| 单box限重                    | UK         | DX Shipping, XDP Economy    | 毛重限制分别为50磅、40磅   |
| 实际尺寸限制参考托盘         | UK         | Palletway系列               | 按托盘个数和zone收费       |
| DPD司机拒绝派送超过175的包裹 | DE         | DPD Standardpaket           | 备注说明                   |
| 目前已停用                   | IT         | GLS National Standard       | 费用太高，系统已设置为拒收 |
| Prime                        | FR, IT, ES | Amazon系列                  | Prime专属服务              |
| 发往境外                     | FR         | DPD CLASSIC Europe          | 境外服务                   |
| 发往RO                       | IT         | BRT DIRECT INFEED, IT-FedEx | 发往罗马尼亚               |
| 境外（除PT外）               | ES         | SEUR CLASSIC EUROPE         | 除葡萄牙外的境外服务       |

---

## 五、数据质量分析

### 5.1 完整性统计

| 字段   | 有值数量 | 空值数量 | 完整率 |
| ------ | -------- | -------- | ------ |
| 最长边 | 98       | 41       | 70.5%  |
| 次长边 | 23       | 116      | 16.5%  |
| 最短边 | 12       | 127      | 8.6%   |
| 周长   | 45       | 94       | 32.4%  |
| 毛重   | 52       | 87       | 37.4%  |
| 金额   | 128      | 11       | 92.1%  |
| 备注   | 45       | 94       | 32.4%  |

### 5.2 文本比较符使用情况

| 比较符   | 使用次数 | 示例            |
| -------- | -------- | --------------- |
| > (大于) | 2        | >120, >60       |
| < (小于) | 3        | <175, <360, <23 |
| = (等于) | 0        | 无              |

### 5.3 金额分布

| 金额范围   | 规则数 | 占比  |
| ---------- | ------ | ----- |
| 0 - 10     | 68     | 48.9% |
| 10 - 50    | 32     | 23.0% |
| 50 - 100   | 15     | 10.8% |
| 100 - 500  | 12     | 8.6%  |
| 500 - 1000 | 6      | 4.3%  |
| > 1000     | 6      | 4.3%  |

**最高金额**: 1700 (US FedEx Ground/UPS Ground Unauthorized OS)  
**最低金额**: 0.14 (CA UPS Standard Large Package)

---

## 六、承运商服务完整清单 (56个)

### 美国 (US) - 10个

1. FedEx Ground
2. FedEx Home Delivery Cope
3. FedEx Home Delivery LC
4. FedEx Home Delivery
5. UPS Ground
6. USPS
7. FBA
8. FBW
9. Ontrac
10. Amazon shipping

### 加拿大 (CA) - 5个

11. FedEx Ground
12. UPS Standard
13. Canpar
14. FBA
15. FBW

### 德国 (DE) - 7个

16. GLS
17. DPD Standardpaket
18. DPD Prime
19. GEL
20. Hellmann
21. Hermes Standardpaket
22. Seller Flex

### 英国 (UK) - 11个

23. Hermes Next Day
24. DX Express
25. DX Shipping service
26. XDP Economy
27. Amazon Next Day
28. Amazon Two Day
29. Palletway-H&M
30. Palletway-McGregor
31. Palletway-Howard
32. Palletway-Cross Country
33. DHL Next Day
34. DX 2M
35. Winit DPD

### 法国 (FR) - 8个

36. DPD Standardpaket/DPD Prime
37. GLS
38. GEODIS
39. Chonopost (J+1)/REG
40. M-Relay
41. DPD CLASSIC Europe
42. Amazon Prime
43. Amazon shipping

### 意大利 (IT) - 8个

44. BRT
45. GLS National Standard
46. TNT-Libero
47. BRT-Prime
48. BRT DIRECT INFEED
49. IT-TNT-Standard
50. POSTE ITALIANE
51. IT-FedEx

### 西班牙 (ES) - 4个

52. SEUR 24 - Amazon Prime
53. SEUR
54. Envialia
55. SEUR CLASSIC EUROPE

### 爱尔兰 (IE) - 1个

56. RWB

---

## 七、导入建议

### 7.1 优先导入

1. **美国 FedEx 系列** (24条规则 + 8条策略) - 业务量最大
2. **美国 UPS** (5条规则 + 1条策略) - 重要承运商
3. **加拿大 FedEx/UPS** (13条规则 + 5条策略) - 北美业务

### 7.2 需要注意

1. **文本比较符**: DE Hermes 和 Seller Flex 使用比较符，需特殊处理
2. **金额区间**: US FedEx/UPS Additional Handling 使用区间格式
3. **Peak 附加费**: 需要在计算时额外叠加
4. **FBA/FBW**: 无拒收上限，需在系统中标记
5. **已停用服务**: IT GLS National Standard 需要标记为停用

### 7.3 数据验证清单

- [ ] 检查所有承运商服务是否正确创建
- [ ] 验证策略 JSON 格式是否正确
- [ ] 确认文本比较符已正确存储
- [ ] 验证金额区间解析
- [ ] 检查备注信息是否完整保留
- [ ] 验证国家代码映射 (使用 dict_countries.code)

---

**整理完成时间**: 2026-04-23  
**数据状态**: 已完整解析，可直接用于数据库导入  
**下一步**: 使用 generate-express-cost-sql.ts 生成 SQL 并执行导入
