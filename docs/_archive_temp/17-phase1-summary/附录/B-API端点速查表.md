# B-API 端点速查表 🔧

**创建日期**: 2026-03-23  
**用途**: 调用 API 时快速查找

---

## 📋 目录

1. [容器管理 API](#1-容器管理-api)
2. [备货单管理 API](#2-备货单管理-api)
3. [字典管理 API](#3-字典管理-api)
4. [统计查询 API](#4-统计查询-api)
5. [数据导入 API](#5-数据导入-api)
6. [滞港费 API](#6-滞港费-api)
7. [排产调度 API](#7-排产调度-api)

---

## 1. 容器管理 API

### 1.1 基础 CRUD

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/containers` | 获取货柜列表（分页） |
| GET | `/api/v1/containers/:containerNumber` | 获取单个货柜详情 |
| POST | `/api/v1/containers` | 创建货柜 |
| PUT | `/api/v1/containers/:containerNumber` | 更新货柜 |
| DELETE | `/api/v1/containers/:containerNumber` | 删除货柜 |

### 1.2 货柜操作

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/containers/:containerNumber/status-events` | 获取状态事件列表 |
| GET | `/api/v1/containers/:containerNumber/logistics-path` | 获取物流路径 |
| GET | `/api/v1/containers/:containerNumber/statistics` | 获取统计信息 |

### 1.3 请求示例

```bash
# 获取货柜列表
curl -X GET "http://localhost:3000/api/v1/containers?page=1&limit=20" \
  -H "Content-Type: application/json"

# 获取货柜详情
curl -X GET "http://localhost:3000/api/v1/containers/CXDU1234567" \
  -H "Content-Type: application/json"

# 筛选货柜
curl -X GET "http://localhost:3000/api/v1/containers?status=in_transit&destinationPort=USLAX" \
  -H "Content-Type: application/json"
```

---

## 2. 备货单管理 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/replenishment-orders` | 获取备货单列表 |
| GET | `/api/v1/replenishment-orders/:orderNumber` | 获取备货单详情 |
| POST | `/api/v1/replenishment-orders` | 创建备货单 |
| PUT | `/api/v1/replenishment-orders/:orderNumber` | 更新备货单 |
| DELETE | `/api/v1/replenishment-orders/:orderNumber` | 删除备货单 |

---

## 3. 字典管理 API

### 3.1 基础字典

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/dict/ports` | 获取港口字典 |
| GET | `/api/v1/dict/shipping-companies` | 获取船公司字典 |
| GET | `/api/v1/dict/freight-forwarders` | 获取货代公司字典 |
| GET | `/api/v1/dict/overseas-companies` | 获取海外公司字典 |
| GET | `/api/v1/dict/warehouses` | 获取仓库字典 |
| GET | `/api/v1/dict/trucking-companies` | 获取拖车公司字典 |
| GET | `/api/v1/dict/customs-brokers` | 获取清关公司字典 |

### 3.2 映射字典

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/dict-mapping/port/:portName` | 按中文名获取港口编码 |
| POST | `/api/v1/dict-mapping/port/batch` | 批量获取港口编码 |
| GET | `/api/v1/dict-mapping/port/all` | 获取所有港口映射 |

### 3.3 通用字典

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/universal-dict/types` | 获取字典类型列表 |
| GET | `/api/v1/universal-dict/type/:dictType` | 获取指定类型字典 |
| POST | `/api/v1/universal-dict/` | 添加字典映射 |
| PUT | `/api/v1/universal-dict/:id` | 更新字典映射 |

---

## 4. 统计查询 API

### 4.1 容器统计

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/statistics/containers/by-destination` | 按目的港统计 |
| GET | `/api/v1/statistics/containers/by-status` | 按状态统计 |
| GET | `/api/v1/statistics/containers/arrived-today` | 今日到港统计 |
| GET | `/api/v1/statistics/containers/arrived-before` | 之前已到统计 |

### 4.2 ETA 统计

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/statistics/containers/eta-overdue` | ETA逾期统计 |
| GET | `/api/v1/statistics/containers/eta-within-3days` | 3日内到港统计 |
| GET | `/api/v1/statistics/containers/eta-within-7days` | 7日内到港统计 |

### 4.3 计划提柜统计

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/statistics/containers/planned-overdue` | 计划提柜逾期 |
| GET | `/api/v1/statistics/containers/planned-today` | 今日计划提柜 |
| GET | `/api/v1/statistics/containers/planned-within-3days` | 3日内计划提柜 |
| GET | `/api/v1/statistics/containers/planned-within-7days` | 7日内计划提柜 |

---

## 5. 数据导入 API

### 5.1 Excel 导入

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/import/containers` | 导入货柜数据 |
| POST | `/api/v1/import/replenishment-orders` | 导入备货单数据 |
| POST | `/api/v1/import/sea-freight` | 导入海运数据 |
| POST | `/api/v1/import/port-operations` | 导入港口操作数据 |
| POST | `/api/v1/import/trucking-transport` | 导入拖卡运输数据 |
| POST | `/api/v1/import/warehouse-operations` | 导入仓库操作数据 |
| POST | `/api/v1/import/empty-returns` | 导入还空箱数据 |

### 5.2 导入格式

```bash
# 导入货柜
curl -X POST "http://localhost:3000/api/v1/import/containers" \
  -F "file=@containers.xlsx" \
  -F "mode=upsert"
```

**参数说明**:
- `mode`: `upsert`（更新或插入）或 `replace`（替换）
- `file`: Excel 文件（.xlsx, .xls）

---

## 6. 滞港费 API

### 6.1 滞港费标准

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/demurrage/standards` | 获取滞港费标准列表 |
| POST | `/demurrage/standards` | 创建滞港费标准 |

### 6.2 滞港费计算

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/demurrage/calculate/:containerNumber` | 计算单个货柜滞港费 |
| POST | `/demurrage/batch-compute-records` | 批量计算滞港费 |
| GET | `/demurrage/diagnose/:containerNumber` | 诊断滞港费匹配 |

### 6.3 滞港费汇总

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/demurrage/summary` | 获取滞港费汇总 |
| GET | `/demurrage/top-containers` | 获取滞港费最高货柜 |

### 6.4 滞港费回写

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/demurrage/write-back/:containerNumber` | 回写单个货柜滞港费 |
| POST | `/demurrage/batch-write-back` | 批量回写滞港费 |

---

## 7. 排产调度 API

### 7.1 批量排产

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/scheduling/batch-schedule` | 批量排产 |
| GET | `/api/v1/scheduling/overview` | 获取排产概览 |

### 7.2 排产预览

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/scheduling/:id/schedule-preview` | 排产预览 |

### 7.3 资源管理

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/scheduling/resources/yards` | 获取堆场列表 |
| PUT | `/api/v1/scheduling/resources/warehouse/:code` | 更新仓库容量 |
| PUT | `/api/v1/scheduling/resources/trucking/:code` | 更新车队容量 |

### 7.4 容量查询

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/v1/scheduling/resources/occupancy/warehouse` | 仓库占用情况 |
| GET | `/api/v1/scheduling/resources/occupancy/trucking` | 车队占用情况 |

### 7.5 成本优化

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/scheduling/evaluate-cost` | 评估成本 |
| POST | `/api/v1/scheduling/compare-options` | 对比方案 |
| GET | `/api/v1/scheduling/recommend-option/:id` | 获取推荐方案 |

---

## 8. 外部数据 API

### 8.1 飞驼同步

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/external-data/sync/:containerNumber` | 同步单个货柜 |
| POST | `/api/v1/external-data/sync/batch` | 批量同步 |
| GET | `/api/v1/external-data/events/:containerNumber` | 获取状态事件 |

### 8.2 数据清理

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/external-data/cleanup` | 清理过期数据 |
| DELETE | `/api/v1/external-data/events/:containerNumber` | 删除货柜事件 |

---

## 9. 通用参数

### 9.1 分页参数

```bash
GET /api/v1/containers?page=1&limit=20
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 |
| offset | number | 0 | 偏移量 |

### 9.2 筛选参数

```bash
GET /api/v1/containers?status=in_transit&destinationPort=USLAX&startDate=2026-01-01
```

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 物流状态 |
| destinationPort | string | 目的港 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

### 9.3 排序参数

```bash
GET /api/v1/containers?sortField=etaDestPort&sortOrder=asc
```

| 参数 | 类型 | 说明 |
|------|------|------|
| sortField | string | 排序字段 |
| sortOrder | asc/desc | 排序方向 |

---

## 10. 响应格式

### 10.1 成功响应

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### 10.2 错误响应

```json
{
  "success": false,
  "message": "错误信息",
  "error": "详细错误"
}
```

---

## 📚 相关文档

- [数据导入系统完整文档](../数据导入系统完整文档.md)
- [智能排柜系统完整文档](../智能排柜系统完整文档.md)
- [滞港费计算文档](../05-专属领域知识/05-滞港费计算.md)

---

**返回**: [README](./README.md)
