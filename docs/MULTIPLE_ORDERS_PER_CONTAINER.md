# 多备货单合柜实施方案

## 需求背景

根据业务需求，需要支持以下场景：

- **一个货柜号可以有多个备货单号**
- **一个备货单号是唯一**
- **多个货柜可以合并为一个提单号**

前端页面 `http://localhost:5173/#/shipments/MRSU8056445` 的"货柜信息 -> 货物信息"中需要显示汇总数据：
- 毛重合计 (KG)
- 净重合计 (KG)
- 体积合计 (CBM)
- 箱数合计

---

## 数据库关系

### 当前结构

```
biz_replenishment_orders (备货单表)
├── order_number (主键，唯一)
├── container_number (关联货柜号，一个备货单属于一个货柜)
└── ...其他字段

biz_containers (货柜表)
├── container_number (主键)
├── order_number (关联备货单号，目前只有一个字段)
└── ...其他字段
```

**问题**：当前 `biz_containers` 表只有一个 `order_number` 字段，无法直接关联多个备货单。

### 解决方案

不修改数据库结构，通过查询逻辑实现：

1. 查询所有 `container_number = {货柜号}` 的备货单
2. 在后端汇总所有备货单的数据
3. 前端显示汇总信息和备货单明细列表

---

## 后端实现

### 修改文件

**文件**: `backend/src/controllers/container.controller.ts`

### 关键修改

#### 1. 查询所有关联的备货单

```typescript
// 查询所有关联到该货柜的备货单（可能多个）
const allOrders = await this.orderRepository
  .createQueryBuilder('order')
  .where('order.containerNumber = :id', { id })
  .getMany();
```

#### 2. 计算汇总数据

```typescript
// 计算汇总数据（如果多个备货单，需要合计）
const summary = {
  totalGrossWeight: 0,
  totalNetWeight: 0,
  totalCbm: 0,
  totalBoxes: 0,
  shipmentTotalValue: 0,
  fobAmount: 0,
  cifAmount: 0,
  negotiationAmount: 0,
  orderCount: allOrders.length
};

allOrders.forEach((order: ReplenishmentOrder) => {
  summary.totalGrossWeight += order.totalGrossWeight || 0;
  summary.totalNetWeight += order.totalNetWeight || 0;
  summary.totalCbm += order.totalCbm || 0;
  summary.totalBoxes += order.totalBoxes || 0;
  summary.shipmentTotalValue += order.shipmentTotalValue || 0;
  summary.fobAmount += order.fobAmount || 0;
  summary.cifAmount += order.cifAmount || 0;
  summary.negotiationAmount += order.negotiationAmount || 0;
});
```

#### 3. 返回数据结构

```typescript
{
  containerNumber: 'MRSU8056445',
  orderNumber: '25DSA06527',  // 第一个备货单号（保持兼容）
  allOrders: [                 // 所有备货单
    {
      orderNumber: '25DSA06527',
      totalGrossWeight: 1000,
      totalCbm: 50,
      totalBoxes: 200,
      ...
    },
    {
      orderNumber: '25DSA06528',
      totalGrossWeight: 1500,
      totalCbm: 75,
      totalBoxes: 300,
      ...
    }
  ],
  summary: {                    // 汇总数据
    totalGrossWeight: 2500,
    totalNetWeight: 2300,
    totalCbm: 125,
    totalBoxes: 500,
    shipmentTotalValue: 50000,
    fobAmount: 48000,
    cifAmount: 49000,
    negotiationAmount: 0,
    orderCount: 2
  },
  ...
}
```

---

## 前端实现

### 修改文件

**文件**: `frontend/src/views/shipments/ContainerDetail.vue`

### 关键修改

#### 1. 页面头部显示汇总数据

```vue
<div class="info-item">
  <span class="label">备货单数</span>
  <span class="value">{{ containerData.summary?.orderCount || 1 }} 个</span>
</div>
<div class="info-item">
  <span class="label">毛重合计</span>
  <span class="value">{{ containerData.summary?.totalGrossWeight || containerData.order?.totalGrossWeight || '-' }} KG</span>
</div>
<div class="info-item">
  <span class="label">净重合计</span>
  <span class="value">{{ containerData.summary?.totalNetWeight || containerData.order?.totalNetWeight || '-' }} KG</span>
</div>
<div class="info-item">
  <span class="label">体积合计</span>
  <span class="value">{{ containerData.summary?.totalCbm || containerData.order?.totalCbm || '-' }} CBM</span>
</div>
<div class="info-item">
  <span class="label">箱数合计</span>
  <span class="value">{{ containerData.summary?.totalBoxes || containerData.order?.totalBoxes || '-' }}</span>
</div>
<div class="info-item">
  <span class="label">出运总价</span>
  <span class="value">${{ containerData.summary?.shipmentTotalValue || containerData.order?.shipmentTotalValue || '-' }}</span>
</div>
```

#### 2. 备货单信息页签

显示汇总信息和明细列表：

```vue
<el-tab-pane label="备货单信息" name="order">
  <div class="tab-content">
    <!-- 备货单汇总信息 -->
    <h3>备货单汇总</h3>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="备货单数量">{{ containerData.summary?.orderCount || 0 }} 个</el-descriptions-item>
      <el-descriptions-item label="毛重合计">{{ containerData.summary?.totalGrossWeight || 0 }} KG</el-descriptions-item>
      <el-descriptions-item label="净重合计">{{ containerData.summary?.totalNetWeight || 0 }} KG</el-descriptions-item>
      <el-descriptions-item label="体积合计">{{ containerData.summary?.totalCbm || 0 }} CBM</el-descriptions-item>
      <el-descriptions-item label="箱数合计">{{ containerData.summary?.totalBoxes || 0 }}</el-descriptions-item>
      <el-descriptions-item label="出运总价">${{ containerData.summary?.shipmentTotalValue || 0 }}</el-descriptions-item>
      <el-descriptions-item label="FOB金额">${{ containerData.summary?.fobAmount || 0 }}</el-descriptions-item>
      <el-descriptions-item label="CIF金额">${{ containerData.summary?.cifAmount || 0 }}</el-descriptions-item>
    </el-descriptions>

    <!-- 多个备货单列表 -->
    <h3>备货单明细</h3>
    <el-table :data="containerData.allOrders || [containerData.order]" border stripe>
      <el-table-column prop="orderNumber" label="备货单号" width="140" />
      <el-table-column prop="mainOrderNumber" label="主备货单号" width="140" />
      <el-table-column prop="sellToCountry" label="销往国家" width="120" />
      <el-table-column prop="customerName" label="客户名称" width="150" />
      <el-table-column prop="orderStatus" label="订单状态" width="100" />
      <el-table-column prop="procurementTradeMode" label="采购贸易模式" width="120" />
      <el-table-column prop="priceTerms" label="价格条款" width="80" />
      <el-table-column prop="wayfairSpo" label="Wayfair SPO" width="120" />
      <el-table-column prop="totalBoxes" label="箱数" width="80" align="right" />
      <el-table-column prop="totalCbm" label="体积(CBM)" width="100" align="right" />
      <el-table-column prop="totalGrossWeight" label="毛重(KG)" width="100" align="right" />
      <el-table-column prop="shipmentTotalValue" label="出运总价" width="100" align="right" />
      <el-table-column prop="orderDate" label="订单日期" width="110" />
    </el-table>

    <!-- 第一个备货单的详细信息（保持向后兼容） -->
    <template v-if="containerData.allOrders && containerData.allOrders.length > 0">
      <h3>第一个备货单详情</h3>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="备货单号">{{ containerData.allOrders[0].orderNumber }}</el-descriptions-item>
        <el-descriptions-item label="主备货单号">{{ containerData.allOrders[0].mainOrderNumber || '-' }}</el-descriptions-item>
        <el-descriptions-item label="订单日期">{{ formatDateOnly(containerData.allOrders[0].orderDate) }}</el-descriptions-item>
        <el-descriptions-item label="预计出运日期">{{ formatDateOnly(containerData.allOrders[0].expectedShipDate) }}</el-descriptions-item>
        <el-descriptions-item label="实际出运日期">{{ formatDateOnly(containerData.allOrders[0].actualShipDate) }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ containerData.allOrders[0].createdBy || '-' }}</el-descriptions-item>
      </el-descriptions>
    </template>
  </div>
</el-tab-pane>
```

#### 3. 货柜信息页签

显示多个备货单号和汇总数据：

```vue
<el-descriptions-item label="备货单号">
  <template v-if="containerData.allOrders && containerData.allOrders.length > 1">
    {{ containerData.allOrders.map(o => o.orderNumber).join(', ') }}
  </template>
  <template v-else>
    {{ containerData.orderNumber || '-' }}
  </template>
</el-descriptions-item>
<el-descriptions-item label="备货单数量">{{ containerData.summary?.orderCount || 1 }} 个</el-descriptions-item>

<h3>货物汇总信息（多个备货单合计）</h3>
<el-descriptions :column="2" border>
  <el-descriptions-item label="毛重合计">{{ containerData.summary?.totalGrossWeight || containerData.grossWeight || '-' }} KG</el-descriptions-item>
  <el-descriptions-item label="净重合计">{{ containerData.summary?.totalNetWeight || containerData.netWeight || '-' }} KG</el-descriptions-item>
  <el-descriptions-item label="体积合计">{{ containerData.summary?.totalCbm || containerData.cbm || '-' }} CBM</el-descriptions-item>
  <el-descriptions-item label="箱数合计">{{ containerData.summary?.totalBoxes || containerData.packages || '-' }}</el-descriptions-item>
  <el-descriptions-item label="出运总价">${{ containerData.summary?.shipmentTotalValue || '-' }}</el-descriptions-item>
  <el-descriptions-item label="FOB金额">${{ containerData.summary?.fobAmount || '-' }}</el-descriptions-item>
  <el-descriptions-item label="CIF金额">${{ containerData.summary?.cifAmount || '-' }}</el-descriptions-item>
  <el-descriptions-item label="议付金额">${{ containerData.summary?.negotiationAmount || '-' }}</el-descriptions-item>
</el-descriptions>
```

---

## Excel 导入支持

### 导入逻辑

当Excel中有多个备货单关联同一个货柜号时：

1. 创建货柜记录（如果不存在）
2. 为每个备货单创建 `biz_replenishment_orders` 记录，设置相同的 `container_number`
3. 汇总所有备货单的数据到 `biz_containers` 表（可选）

### Excel 字段映射

```
备货单号1: 25DSA06527, 集装箱号: MRSU8056445
备货单号2: 25DSA06528, 集装箱号: MRSU8056445
```

导入后：

```
biz_replenishment_orders:
├── order_number: 25DSA06527, container_number: MRSU8056445
└── order_number: 25DSA06528, container_number: MRSU8056445

biz_containers:
└── container_number: MRSU8056445, order_number: 25DSA06527 (第一个)
```

---

## 显示效果

### 页面头部

```
┌─────────────────────────────────────────────┐
│ 集装箱号: MRSU8056445              │
│                                      │
│ 备货单数    2 个                     │
│ 毛重合计    2500 KG                 │
│ 净重合计    2300 KG                 │
│ 体积合计    125 CBM                 │
│ 箱数合计    500                      │
│ 出运总价    $50,000                  │
└─────────────────────────────────────────────┘
```

### 备货单信息页签

```
┌─────────────────────────────────────────────┐
│ 备货单汇总                          │
│ ────────────────────────────────────      │
│ 备货单数量    2 个                 │
│ 毛重合计      2500 KG             │
│ 净重合计      2300 KG             │
│ 体积合计      125 CBM             │
│ 箱数合计      500                  │
│ 出运总价      $50,000             │
│                                      │
│ 备货单明细                          │
│ ┌────────────────────────────────────┐  │
│ │ 备货单号  | 主备货单 | 客户  │  │
│ ├────────────────────────────────────┤  │
│ │ 25DSA06527| -         | AOSOM│  │
│ │ 25DSA06528| 25DSA...  | AMAZON│  │
│ └────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### 货柜信息页签

```
┌─────────────────────────────────────────────┐
│ 集装箱号    MRSU8056445           │
│ 备货单号    25DSA06527, 25DSA06528 │
│ 备货单数量  2 个                   │
│ ...                                  │
│                                      │
│ 货物汇总信息（多个备货单合计）      │
│ ────────────────────────────────────      │
│ 毛重合计      2500 KG             │
│ 净重合计      2300 KG             │
│ 体积合计      125 CBM             │
│ 箱数合计      500                  │
│ 出运总价      $50,000             │
└─────────────────────────────────────────────┘
```

---

## 测试场景

### 场景 1: 一个货柜关联一个备货单

**数据**：
- 货柜号：MRSU8056445
- 备货单号：25DSA06527

**期望结果**：
- 备货单数：1 个
- 毛重合计：1000 KG（直接显示备货单数据）
- 备货单列表：显示一个备货单

### 场景 2: 一个货柜关联多个备货单

**数据**：
- 货柜号：MRSU8056445
- 备货单1：25DSA06527（毛重：1000 KG，体积：50 CBM，箱数：200）
- 备货单2：25DSA06528（毛重：1500 KG，体积：75 CBM，箱数：300）

**期望结果**：
- 备货单数：2 个
- 毛重合计：2500 KG（1000 + 1500）
- 体积合计：125 CBM（50 + 75）
- 箱数合计：500（200 + 300）
- 备货单列表：显示两个备货单

---

## API 返回示例

### GET /api/v1/containers/{containerNumber}

```json
{
  "success": true,
  "data": {
    "containerNumber": "MRSU8056445",
    "orderNumber": "25DSA06527",
    "containerTypeCode": "40HQ",
    "sealNumber": "123456",
    "grossWeight": null,
    "netWeight": null,
    "cbm": null,
    "packages": null,
    "logisticsStatus": "shipped",
    "containerSize": 40,
    "allOrders": [
      {
        "orderNumber": "25DSA06527",
        "mainOrderNumber": null,
        "sellToCountry": "AOSOM LLC",
        "customerName": "AOSOM US",
        "orderStatus": "已出运",
        "procurementTradeMode": "B2B：需换单",
        "priceTerms": "FOB",
        "totalBoxes": 200,
        "totalCbm": 50,
        "totalGrossWeight": 1000,
        "totalNetWeight": 950,
        "shipmentTotalValue": 20000,
        "fobAmount": 19000,
        "cifAmount": 19500,
        "negotiationAmount": 0,
        "orderDate": "2026-01-15",
        "expectedShipDate": "2026-02-01",
        "actualShipDate": "2026-02-10"
      },
      {
        "orderNumber": "25DSA06528",
        "mainOrderNumber": "25DSA06527",
        "sellToCountry": "AMAZON",
        "customerName": "AMAZON US",
        "orderStatus": "已出运",
        "procurementTradeMode": "B2B：需换单",
        "priceTerms": "FOB",
        "totalBoxes": 300,
        "totalCbm": 75,
        "totalGrossWeight": 1500,
        "totalNetWeight": 1450,
        "shipmentTotalValue": 30000,
        "fobAmount": 29000,
        "cifAmount": 29500,
        "negotiationAmount": 0,
        "orderDate": "2026-01-20",
        "expectedShipDate": "2026-02-01",
        "actualShipDate": "2026-02-10"
      }
    ],
    "summary": {
      "orderCount": 2,
      "totalGrossWeight": 2500,
      "totalNetWeight": 2400,
      "totalCbm": 125,
      "totalBoxes": 500,
      "shipmentTotalValue": 50000,
      "fobAmount": 48000,
      "cifAmount": 49000,
      "negotiationAmount": 0
    },
    "portOperations": [...],
    "seaFreight": {...}
  }
}
```

---

## 注意事项

### 1. 向后兼容性

- 保持 `orderNumber` 字段，设置为第一个备货单号
- 保持 `order` 对象，关联到第一个备货单
- 新增 `allOrders` 数组，包含所有备货单
- 新增 `summary` 对象，包含汇总数据

### 2. 数据一致性

- 当只有一个备货单时，`summary` 数据与 `order` 数据一致
- 当有多个备货单时，`summary` 数据为所有备货单的合计

### 3. 性能考虑

- 当前实现通过 `container_number` 查询所有备货单
- 如果备货单数量很大（例如超过100个），可能需要分页

### 4. Excel 导入

- 当前 Excel 导入逻辑需要支持同一货柜号对应多行备货单
- 需要验证导入时的数据处理逻辑

---

## 后续优化建议

### 1. 数据库结构优化

如果频繁需要查询"一个货柜的所有备货单"，可以考虑：

```sql
-- 创建索引
CREATE INDEX idx_replenishment_container_number
ON biz_replenishment_orders(container_number);

-- 或者创建关联表
CREATE TABLE container_orders (
  container_number VARCHAR(50),
  order_number VARCHAR(50),
  sequence_number INT,
  PRIMARY KEY (container_number, order_number),
  FOREIGN KEY (container_number) REFERENCES biz_containers(container_number),
  FOREIGN KEY (order_number) REFERENCES biz_replenishment_orders(order_number)
);
```

### 2. 提单号支持

如果需要支持"多个货柜合并为一个提单号"，可以考虑：

```sql
-- 在 biz_replenishment_orders 表中新增字段
ALTER TABLE biz_replenishment_orders
ADD COLUMN bill_of_lading_number VARCHAR(50);

-- 或者在 biz_sea_freight 表中支持多个货柜
-- (当前 design 可能已经支持)
```

### 3. 缓存汇总数据

如果汇总计算频繁，可以考虑：

```sql
-- 在 biz_containers 表中缓存汇总数据
ALTER TABLE biz_containers
ADD COLUMN total_gross_weight_cache DECIMAL(10, 2),
ADD COLUMN total_cbm_cache DECIMAL(8, 2),
ADD COLUMN total_boxes_cache INT,
ADD COLUMN order_count_cache INT;

-- 触发器自动更新
```

---

**文档版本**: 1.0
**创建日期**: 2026-02-27
**最后更新**: 2026-02-27
