# API 文档

LogiX 后端 API 接口文档。

## 基础信息

- 基础路径: `/api/v1`
- 响应格式: `{ success: boolean, data?: any, message?: string }`

## 货柜 API

### 列表查询

```
GET /containers
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码，默认 1 |
| limit | number | 每页数量，默认 20 |
| status | string | 物流状态筛选 |
| country | string | 目的国筛选 |
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

**响应**:

```json
{
  "success": true,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "limit": 20
  }
}
```

### 详情查询

```
GET /containers/:id
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 货柜号 |

**响应**:

```json
{
  "success": true,
  "data": {
    "containerNumber": "XXXXX",
    "logisticsStatus": "at_port",
    ...
  }
}
```

### 创建

```
POST /containers
```

**请求体**:

```json
{
  "container_number": "XXXXX",
  "container_type_code": "40HC",
  "destination_port": "CNSGH"
}
```

### 更新

```
PATCH /containers/:id
```

**请求体**:

```json
{
  "logistics_status": "picked_up",
  "eta_dest_port": "2024-03-15"
}
```

### 删除

```
DELETE /containers/:id
```

## 统计 API

### 按到港统计

```
GET /containers/statistics/arrival
```

**参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| startDate | string | 开始日期 |
| endDate | string | 结束日期 |

**响应**:

```json
{
  "success": true,
  "data": {
    "arrivedToday": 10,
    "arrivedBeforeNotPickedUp": 50,
    "arrivedBeforePickedUp": 30,
    "total": 90
  }
}
```

### 按 ETA 统计

```
GET /containers/statistics/eta
```

**响应**:

```json
{
  "success": true,
  "data": {
    "overdue": 5,
    "within3Days": 15,
    "within7Days": 20,
    "other": 10
  }
}
```

### 按计划提柜统计

```
GET /containers/statistics/planned
```

**响应**:

```json
{
  "success": true,
  "data": {
    "overdue": 3,
    "today": 8,
    "within3Days": 12,
    "within7Days": 15,
    "noPlan": 20
  }
}
```

## 备货单 API

### 列表

```
GET /replenishment-orders
```

### 详情

```
GET /replenishment-orders/:id
```

### 创建

```
POST /replenishment-orders
```

## 字典 API

### 获取所有类型

```
GET /dict-manage/types
```

### 获取字典数据

```
GET /dict-manage/:type
```

**类型**: countries, ports, container_types, shipping_companies 等

### 新增字典

```
POST /dict-manage/:type
```

### 更新字典

```
PUT /dict-manage/:type/:id
```

### 删除字典

```
DELETE /dict-manage/:type/:id
```

## 滞港费 API

### 计算滞港费

```
POST /demurrage/calculate
```

**请求体**:

```json
{
  "containerNumber": "XXXXX",
  "calculationMode": "actual"
}
```

### 获取滞港费详情

```
GET /demurrage/:containerNumber
```

## 错误响应

### 格式

```json
{
  "success": false,
  "message": "错误信息",
  "code": "ERROR_CODE"
}
```

### 状态码

| 状态码 | 说明 |
|--------|------|
| 400 | 参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

## 认证

API 使用 Header 传递认证信息：

```
X-Country-Code: CN    # 国家筛选
Authorization: Bearer <token>  # 认证令牌
```
