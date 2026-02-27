# 通用字典映射系统 - 完整使用指南

## 一、设计理念

### 1.1 问题本质

在任何企业信息系统中,都存在**多名称到标准代码映射**的问题:

| 领域 | 问题描述 |
|------|---------|
| **港口** | "青岛"、"青岛港"、"CNQNG" → 统一为 `CNQNG` |
| **国家** | "中国"、"China"、"CN" → 统一为 `CN` |
| **船公司** | "马士基"、"MAERSK"、"Maersk Line" → 统一为 `MAERSK` |
| **柜型** | "40HQ"、"40英尺高柜"、"40ft HC" → 统一为 `40HQ` |
| **货代** | "宁波天图翼联"、"天图物流" → 统一为标准代码 |
| **仓库** | "AOSOM CA-1"、"洛杉矶1号仓" → 统一为标准代码 |

### 1.2 通用性设计

本系统采用**通用字典映射框架**,核心特点:

✅ **类型无关** - 不限定具体字典类型,可扩展到任何字典表
✅ **多语言支持** - 支持中文名、英文名、本地语言名称
✅ **历史兼容** - 支持旧代码、旧名称的平滑过渡
✅ **别名管理** - 一个标准代码可对应多个别名
✅ **灵活查询** - 支持精确匹配、模糊搜索、批量查询
✅ **高性能** - 前端缓存 + 数据库索引优化

### 1.3 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    通用字典映射系统                          │
│                   Universal Dictionary Mapping              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    dict_universal_mapping                    │
│                                                             │
│  字段:                                                       │
│  ├─ dict_type         - 字典类型(枚举)                      │
│  ├─ target_table      - 目标表名                            │
│  ├─ target_field      - 目标字段                            │
│  ├─ standard_code     - 标准代码                            │
│  ├─ name_cn           - 中文名称                            │
│  ├─ name_en           - 英文名称                            │
│  ├─ old_code          - 旧版代码                            │
│  ├─ is_primary        - 是否主名称                          │
│  └─ alias_names[]     - 别名数组                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  dict_ports  │ dict_...    │ dict_...     │  ...其他表    │
│  (港口字典)  │  (其他字典)  │             │              │
│  port_code   │  code       │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## 二、支持的所有字典类型

### 2.1 内置类型

| DictType | 说明 | 目标表 | 示例 |
|----------|------|--------|------|
| `PORT` | 港口 | `dict_ports` | 青岛 → CNQNG |
| `COUNTRY` | 国家 | `dict_countries` | 中国 → CN |
| `SHIPPING_COMPANY` | 船公司 | `dict_shipping_companies` | 马士基 → MAERSK |
| `CONTAINER_TYPE` | 柜型 | `dict_container_types` | 40HQ → 40HQ |
| `FREIGHT_FORWARDER` | 货代公司 | `dict_freight_forwarders` | 宁波天图 → 标准代码 |
| `CUSTOMS_BROKER` | 清关公司 | `dict_customs_brokers` | Sen Mart → 标准代码 |
| `TRUCKING_COMPANY` | 拖车公司 | `dict_trucking_companies` | Flying Fish → 标准代码 |
| `WAREHOUSE` | 仓库 | `dict_warehouses` | AOSOM CA-1 → 标准代码 |
| `CUSTOMER` | 客户 | `biz_customers` | Amazon → 标准代码 |

### 2.2 扩展新类型

只需在 `DictType` 枚举中添加新类型:

```typescript
export enum DictType {
  // ... 现有类型
  PRODUCT = 'PRODUCT',           // 产品
  SUPPLIER = 'SUPPLIER',         // 供应商
  PAYMENT_TERM = 'PAYMENT_TERM'  // 付款条款
}
```

然后在数据库中添加映射数据即可:

```sql
INSERT INTO dict_universal_mapping (dict_type, target_table, target_field, standard_code, name_cn)
VALUES ('PRODUCT', 'dict_products', 'product_code', 'PRD001', '产品A');
```

## 三、API 接口详解

### 3.1 获取标准代码

**请求:**
```http
GET /api/dict-mapping/universal/code?dictType=PORT&name=青岛
```

**响应:**
```json
{
  "success": true,
  "data": {
    "standard_code": "CNQNG",
    "standard_name": "Qingdao",
    "name_cn": "青岛",
    "name_en": "Qingdao",
    "is_primary": true
  }
}
```

**支持的输入格式:**
- 中文名称: "青岛"、"上海"、"洛杉矶"
- 英文名称: "Qingdao"、"Shanghai"、"Los Angeles"
- 标准代码: "CNQNG"、"CNSHG"、"USLAX"
- 旧代码: "青岛港" (如果设置了 `old_code`)

### 3.2 批量获取标准代码

**请求:**
```http
POST /api/dict-mapping/universal/batch
Content-Type: application/json

{
  "dictType": "PORT",
  "names": ["青岛", "宁波", "洛杉矶", "未知的港口"]
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "青岛": "CNQNG",
    "宁波": "CNNGB",
    "洛杉矶": "USLAX",
    "未知的港口": null  // 找不到则为null
  },
  "dict_type": "PORT"
}
```

### 3.3 获取指定类型的所有映射

**请求:**
```http
GET /api/dict-mapping/universal/type/PORT
```

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "standard_code": "CNQNG",
      "standard_name": "Qingdao",
      "name_cn": "青岛",
      "name_en": "Qingdao",
      "is_primary": true,
      "sort_order": 4
    },
    ...
  ],
  "dict_type": "PORT",
  "total": 50
}
```

### 3.4 获取所有字典类型

**请求:**
```http
GET /api/dict-mapping/universal/types
```

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "dict_type": "PORT",
      "mapping_count": 50,
      "first_sort": 1
    },
    {
      "dict_type": "COUNTRY",
      "mapping_count": 10,
      "first_sort": 1
    },
    ...
  ]
}
```

### 3.5 模糊搜索

**请求:**
```http
GET /api/dict-mapping/universal/search/PORT?keyword=青
```

**响应:**
```json
{
  "success": true,
  "data": [
    {
      "standard_code": "CNQNG",
      "standard_name": "Qingdao",
      "name_cn": "青岛",
      "name_en": "Qingdao",
      "similarity_score": 1.0
    },
    {
      "standard_code": "CNTAI",
      "standard_name": "Taicang",
      "name_cn": "太仓",
      "name_en": "Taicang",
      "similarity_score": 0.8
    }
  ],
  "keyword": "青",
  "total": 2
}
```

### 3.6 添加新映射

**请求:**
```http
POST /api/dict-mapping/universal
Content-Type: application/json

{
  "dict_type": "PORT",
  "target_table": "dict_ports",
  "target_field": "port_code",
  "standard_code": "JPYKO",
  "standard_name": "Yokohama",
  "name_cn": "横滨",
  "name_en": "Yokohama",
  "is_primary": true,
  "sort_order": 500
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": 999,
    "dict_type": "PORT",
    "standard_code": "JPYKO",
    ...
  },
  "message": "映射添加成功"
}
```

### 3.7 批量添加映射

**请求:**
```http
POST /api/dict-mapping/universal/batch-add
Content-Type: application/json

{
  "mappings": [
    {
      "dict_type": "PORT",
      "target_table": "dict_ports",
      "target_field": "port_code",
      "standard_code": "JPYKO",
      "name_cn": "横滨",
      "name_en": "Yokohama"
    },
    {
      "dict_type": "PORT",
      "target_table": "dict_ports",
      "target_field": "port_code",
      "standard_code": "JPOSA",
      "name_cn": "大阪",
      "name_en": "Osaka"
    }
  ]
}
```

**响应:**
```json
{
  "success": true,
  "data": [
    { "success": true, "data": { ... } },
    { "success": true, "data": { ... } }
  ],
  "summary": {
    "total": 2,
    "success": 2,
    "failed": 0
  },
  "message": "批量添加完成: 成功 2 条, 失败 0 条"
}
```

### 3.8 更新映射

**请求:**
```http
PUT /api/dict-mapping/universal/999
Content-Type: application/json

{
  "name_cn": "横滨港",
  "name_en": "Yokohama Port"
}
```

### 3.9 删除映射

**请求:**
```http
DELETE /api/dict-mapping/universal/999
```

### 3.10 获取统计信息

**请求:**
```http
GET /api/dict-mapping/universal/stats/summary
```

**响应:**
```json
{
  "success": true,
  "data": {
    "by_type": [
      {
        "dict_type": "PORT",
        "total_count": 50,
        "primary_count": 45,
        "active_count": 48,
        "first_created": "2026-01-01",
        "last_updated": "2026-02-27"
      },
      ...
    ],
    "summary": {
      "total_mappings": 150,
      "total_types": 5,
      "active_mappings": 145
    }
  }
}
```

## 四、前端使用

### 4.1 基础使用

```typescript
import { getStandardCode, DictType } from '@/services/universalDictMapping'

// 获取港口代码
const result = await getStandardCode(DictType.PORT, '青岛')
if (result.success && result.data) {
  console.log('标准代码:', result.data.standard_code) // CNQNG
}
```

### 4.2 批量转换

```typescript
import { getStandardCodesBatch, DictType } from '@/services/universalDictMapping'

// 批量转换港口名称
const result = await getStandardCodesBatch(DictType.PORT, [
  '青岛', '宁波', '洛杉矶'
])
if (result.success && result.data) {
  console.log('映射结果:', result.data)
  // { "青岛": "CNQNG", "宁波": "CNNGB", "洛杉矶": "USLAX" }
}
```

### 4.3 缓存优化

```typescript
import {
  getStandardCodeCached,
  preloadAllCommonMappings
} from '@/services/universalDictMapping'

// 预加载常用字典映射
await preloadAllCommonMappings()

// 后续查询会使用缓存,性能更好
const portCode = await getStandardCodeCached(DictType.PORT, '青岛')
```

### 4.4 便捷方法

```typescript
import {
  getPortCode,
  getCountryCode,
  getShippingCompanyCode
} from '@/services/universalDictMapping'

// 专用方法,更简洁
const portCode = await getPortCode('青岛')
const countryCode = await getCountryCode('中国')
const shippingCompanyCode = await getShippingCompanyCode('马士基')
```

### 4.5 Excel 导入集成

```typescript
import { getStandardCodesCached, DictType } from '@/services/universalDictMapping'

// 在 Excel 导入时批量转换
const row = {
  '起运港': '青岛',
  '目的港': '洛杉矶',
  '船公司': '马士基'
}

// 批量获取标准代码
const mappings = await getStandardCodesCached(DictType.PORT, [
  row['起运港'],
  row['目的港']
])

const shippingMapping = await getStandardCodeCached(
  DictType.SHIPPING_COMPANY,
  row['船公司']
)

// 使用标准代码保存到数据库
saveToDatabase({
  port_of_loading: mappings[row['起运港']],
  port_of_discharge: mappings[row['目的港']],
  shipping_company_id: shippingMapping
})
```

## 五、数据库函数

### 5.1 get_standard_code

```sql
SELECT get_standard_code('PORT', '青岛');
-- 返回: CNQNG
```

### 5.2 get_standard_codes_batch

```sql
SELECT get_standard_codes_batch('PORT', ARRAY['青岛', '宁波', '洛杉矶']);
-- 返回: {"青岛": "CNQNG", "宁波": "CNNGB", "洛杉矶": "USLAX"}::JSONB
```

### 5.3 get_all_mappings_by_type

```sql
SELECT * FROM get_all_mappings_by_type('PORT');
-- 返回该类型的所有映射
```

### 5.4 search_mappings_fuzzy

```sql
SELECT * FROM search_mappings_fuzzy('PORT', '青');
-- 返回模糊匹配结果,按相似度排序
```

## 六、管理功能

### 6.1 映射管理界面

可以创建一个管理界面来管理所有字典映射:

```vue
<template>
  <div class="dict-mapping-manager">
    <!-- 字典类型选择 -->
    <el-select v-model="selectedType" @change="loadMappings">
      <el-option
        v-for="type in dictTypes"
        :key="type.dict_type"
        :label="type.dict_type"
        :value="type.dict_type"
      />
    </el-select>

    <!-- 映射列表 -->
    <el-table :data="mappings">
      <el-table-column prop="name_cn" label="中文名称" />
      <el-table-column prop="standard_code" label="标准代码" />
      <el-table-column prop="name_en" label="英文名称" />
      <el-table-column label="操作">
        <template #default="{ row }">
          <el-button @click="editMapping(row)">编辑</el-button>
          <el-button @click="deleteMapping(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加映射 -->
    <el-button @click="showAddDialog">添加映射</el-button>
  </div>
</template>
```

### 6.2 数据导入导出

```typescript
// 导出映射为 Excel
export async function exportMappings(dictType: string) {
  const result = await getMappingsByType(dictType)
  const data = result.data.map(m => ({
    '字典类型': m.dict_type,
    '标准代码': m.standard_code,
    '中文名称': m.name_cn,
    '英文名称': m.name_en,
    '是否主名称': m.is_primary
  }))

  // 使用 xlsx 库导出
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '映射数据')
  XLSX.writeFile(workbook, `${dictType}_mappings.xlsx`)
}

// 从 Excel 导入映射
export async function importMappings(file: File, dictType: string) {
  const data = await parseExcel(file)
  const mappings = data.map(row => ({
    dict_type: dictType,
    target_table: getTargetTable(dictType),
    target_field: getTargetField(dictType),
    standard_code: row['标准代码'],
    name_cn: row['中文名称'],
    name_en: row['英文名称'],
    is_primary: row['是否主名称'] === 'TRUE'
  }))

  return await addMappingsBatch(mappings)
}
```

## 七、性能优化

### 7.1 缓存策略

- **前端缓存**: 组件挂载时预加载,内存存储
- **Redis缓存** (可选): 后端可添加 Redis 缓存层
- **数据库索引**: 已创建多个索引优化查询

### 7.2 批量操作

尽量使用批量 API 减少请求次数:

```typescript
// ❌ 不推荐: 多次单独查询
for (const name of portNames) {
  await getStandardCode(DictType.PORT, name)
}

// ✅ 推荐: 批量查询
await getStandardCodesBatch(DictType.PORT, portNames)
```

### 7.3 预加载策略

在应用初始化时预加载常用字典:

```typescript
// main.ts 或 App.vue
onMounted(async () => {
  await preloadAllCommonMappings()
})
```

## 八、最佳实践

### 8.1 命名规范

- **标准代码**: 使用国际标准(如 IATA、UN/LOCODE)
- **中文名称**: 使用官方或行业通用名称
- **英文名称**: 使用标准英文名称

### 8.2 别名管理

当一个实体有多个名称时:

```sql
-- 主名称
INSERT INTO dict_universal_mapping (dict_type, standard_code, name_cn, is_primary)
VALUES ('PORT', 'CNQNG', '青岛', TRUE);

-- 别名
INSERT INTO dict_universal_mapping (dict_type, standard_code, name_cn, is_primary)
VALUES ('PORT', 'CNQNG', '青岛港', FALSE);
```

### 8.3 历史数据兼容

```sql
INSERT INTO dict_universal_mapping (
  dict_type,
  standard_code,
  name_cn,
  old_code
)
VALUES ('PORT', 'CNQNG', '青岛', '旧青岛代码');
```

### 8.4 定期维护

- 定期检查未找到映射的名称,添加新映射
- 清理不活跃的映射(`is_active = FALSE`)
- 更新映射统计信息,监控使用情况

## 九、扩展示例

### 9.1 添加产品字典映射

```typescript
// 1. 添加枚举
export enum DictType {
  // ... 现有类型
  PRODUCT = 'PRODUCT'
}

// 2. 添加数据库记录
INSERT INTO dict_universal_mapping (
  dict_type,
  target_table,
  target_field,
  standard_code,
  name_cn,
  name_en,
  sort_order
) VALUES
('PRODUCT', 'dict_products', 'product_code', 'PRD001', '办公椅', 'Office Chair', 1),
('PRODUCT', 'dict_products', 'product_code', 'PRD002', '书桌', 'Writing Desk', 2);

// 3. 使用
const productCode = await getStandardCodeCached(DictType.PRODUCT, '办公椅')
```

### 9.2 添加供应商字典映射

```typescript
export enum DictType {
  // ... 现有类型
  SUPPLIER = 'SUPPLIER'
}

// 使用
const supplierCode = await getStandardCodeCached(DictType.SUPPLIER, '宁波供应商A')
```

## 十、总结

通用字典映射系统的核心价值:

| 特性 | 说明 |
|------|------|
| **通用性** | 不限定字典类型,可扩展到任何需要映射的场景 |
| **灵活性** | 支持多语言、别名、旧代码兼容 |
| **高性能** | 前端缓存 + 数据库索引优化 |
| **易用性** | 简洁的 API,便捷的方法,批量操作支持 |
| **可维护性** | 统一管理,易于扩展和维护 |

这个框架解决了企业系统中普遍存在的"多名称映射"问题,是数据标准化和数据质量保障的基础设施。
