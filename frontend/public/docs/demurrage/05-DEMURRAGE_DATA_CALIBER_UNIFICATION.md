# 货柜与滞港费标准口径统一方案

> 确保货柜数据与滞港费标准在导入、新建时使用同一套编码，实现四项匹配（客户、港口、船公司、货代）的准确对接。

---

## 一、口径不一致的根因

| 维度 | 货柜侧来源 | 标准侧来源 | 典型不一致 |
|------|------------|------------|------------|
| 目的港 | process_port_operations.port_code<br>process_sea_freight.port_of_discharge | ext_demurrage_standards.destination_port_code | 货柜存「萨凡纳」，标准存「USSAV」 |
| 船公司 | process_sea_freight.shipping_company_id | ext_demurrage_standards.shipping_company_code | 货柜存「MAERSK」，标准存「Sup-004597」 |
| 货代 | process_sea_freight.freight_forwarder_id | ext_demurrage_standards.origin_forwarder_code | 货柜存内部 ID，标准存「Sup-019017」 |
| 客户/境外公司 | biz_replenishment_orders.sell_to_country<br>biz_customers.overseas_company_code | ext_demurrage_standards.foreign_company_code | 货柜存「AOSOM LLC」，标准存「83」 |

**核心原则**：以**字典表**为唯一编码源，货柜与标准均引用字典表的 `*_code` 字段。

---

## 二、统一口径的架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      字典表（唯一编码源）                          │
├─────────────────────────────────────────────────────────────────┤
│ dict_ports.port_code              (USSAV, USLAX, CNTAO...)       │
│ dict_shipping_companies.company_code  (Sup-004597, Sup-004594)   │
│ dict_freight_forwarders.forwarder_code (Sup-019017, Sup-011699)  │
│ dict_overseas_companies.company_code  (83, US001)                │
└─────────────────────────────────────────────────────────────────┘
         ▲                                    ▲
         │ 引用                               │ 引用
         │                                    │
┌────────┴────────┐                 ┌────────┴────────┐
│ 货柜侧流程表     │                 │ 滞港费标准表     │
│ port_code       │                 │ destination_port_code │
│ shipping_company_id │             │ shipping_company_code  │
│ freight_forwarder_id│             │ origin_forwarder_code  │
│ (备货单→客户→overseas_company_code)│ foreign_company_code   │
└─────────────────┘                 └──────────────────────┘
```

---

## 三、导入时的口径统一

### 3.1 货柜/海运/港口导入

**数据流**：Excel 名称 → 字典映射 → 标准 code → 写入流程表

| 步骤 | 说明 | 实现方式 |
|------|------|----------|
| 1 | 解析 Excel 中的港口名、船公司名、货代名 | 按列读取 |
| 2 | 调用 `GET /api/v1/dict-mapping/universal/code?dictType=PORT&name=萨凡纳` | 返回 `port_code: USSAV` |
| 3 | 批量映射：`POST /api/v1/dict-mapping/universal/batch` | 一次解析多行 |
| 4 | 写入 process_port_operations.port_code、process_sea_freight.shipping_company_id 等 | 使用返回的 code |

**字段对应**：

| Excel/外部名称 | 字典表 | 目标字段 | 货柜侧写入位置 |
|----------------|--------|----------|----------------|
| 目的港名称 | dict_ports | port_code | process_port_operations.port_code |
| 船公司名称 | dict_shipping_companies | company_code | process_sea_freight.shipping_company_id |
| 货代名称 | dict_freight_forwarders | forwarder_code | process_sea_freight.freight_forwarder_id |
| 海外公司/客户 | dict_overseas_companies | company_code | 备货单关联客户 → 客户.overseas_company_code |

### 3.2 滞港费标准导入

**数据流**：Excel 编码/名称 → 校验或映射 → 写入 ext_demurrage_standards

| 步骤 | 说明 | 实现方式 |
|------|------|----------|
| 1 | Excel 中「目的港.编码」优先使用，若为空则用「目的港.名称」查 dict_ports | 映射到 destination_port_code |
| 2 | 「船公司.编码」优先，否则用名称查 dict_shipping_companies | 映射到 shipping_company_code |
| 3 | 「起运港货代公司.编码」优先，否则用名称查 dict_freight_forwarders | 映射到 origin_forwarder_code |
| 4 | 「海外公司.编码」优先，否则用名称查 dict_overseas_companies | 映射到 foreign_company_code |
| 5 | 校验：写入前检查 code 是否存在于对应字典表 | 不存在则拒绝或写入映射表 |

**关键**：滞港费标准 Excel 中的「编码」列（如 Sup-004597、USSAV）应与 dict 表一致；若 Excel 只有名称，必须在导入时做名称→编码映射。

### 3.3 映射表与兜底

项目已有 `dict_port_name_mapping`、`/dict-mapping/universal` 等能力：

- **dict_port_name_mapping**：港口中文名/旧代码 → port_code
- **universal-dict-mapping**：支持 PORT、SHIPPING_COMPANY、FREIGHT_FORWARDER 等类型的名称→code 查询

**兜底策略**：导入时若名称无法映射到 code，可：
1. **拒绝导入**并提示「XX 未在字典中，请先维护」
2. **自动创建映射**：调用 `POST /dict-mapping/universal` 新增 name→code，再写入业务表
3. **暂存名称**：写入 `*_name` 字段，code 留空，后续人工维护映射后补全

---

## 四、新建时的口径统一

### 4.1 表单控件

新建货柜、海运、港口操作、滞港费标准时，四项匹配字段应使用**下拉选择**而非自由输入：

| 字段 | 数据源 | 控件 |
|------|--------|------|
| 目的港 | GET /dict/ports 或 dict_ports | el-select，options 为 port_code + port_name |
| 船公司 | GET /dict/shipping-companies | el-select，options 为 company_code + company_name |
| 货代 | GET /dict/freight-forwarders | el-select，options 为 forwarder_code + forwarder_name |
| 海外公司/客户 | dict_overseas_companies 或 biz_customers | el-select，options 为 company_code + company_name |

**展示**：下拉显示「名称」，提交时传「code」。

### 4.2 校验规则

- 提交前校验：`port_code`、`shipping_company_id`、`freight_forwarder_id`、`foreign_company_code` 必须在对应字典表中存在
- 外键约束（若已建）：process_sea_freight.shipping_company_id → dict_shipping_companies.company_code

---

## 五、实施检查清单

### 导入侧

- [ ] 货柜 Excel 导入：港口、船公司、货代列增加「名称→code」映射步骤
- [ ] 滞港费标准导入：编码列优先，名称列做映射兜底；导入前校验 code 存在性
- [ ] 飞驼/外部同步：写入 port_code 等时，先通过映射将外部名称转为 dict code

### 字典侧

- [ ] 确保 dict_ports、dict_shipping_companies、dict_freight_forwarders、dict_overseas_companies 与业务方使用的编码一致
- [ ] 滞港费标准 Excel 中的 Sup-xxx、USSAV 等编码需与 dict 表对齐，或通过 dict 表维护别名映射

### 新建侧

- [ ] 港口、船公司、货代、海外公司的新建表单改为字典下拉选择
- [ ] 滞港费标准新建表单四项字段使用字典下拉

### 匹配逻辑

- [ ] 当前已支持 code 与 name 双向匹配（兜底），长期应统一为仅用 code 匹配，减少歧义

---

## 六、快速修复现有数据

对已导入的**名称型**数据，可执行一次性脚本：

1. **港口**：`port_code = '萨凡纳'` → 查 dict_ports 或 dict_port_name_mapping 得 USSAV，UPDATE 为 port_code = 'USSAV'
2. **船公司**：`shipping_company_id = 'MAERSK'` → 查 dict_shipping_companies 得 Sup-xxx（如马士基对应编码），UPDATE
3. **货代**：同理建立 forwarder_name → forwarder_code 映射后批量更新
4. **客户**：biz_customers.overseas_company_code 与 dict_overseas_companies 对齐；备货单通过 customer_code 间接关联

---

## 七、参考

- 字典映射 API：`backend/src/routes/universal-dict-mapping.routes.ts`
- 滞港费标准导入：`frontend/public/docs/demurrage/04-DEMURRAGE_STANDARDS_EXCEL_IMPORT.md`
- 项目结构：`.cursor/rules/logix-project-map.mdc`
