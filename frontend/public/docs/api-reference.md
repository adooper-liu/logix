# LogiX API参考

## 基础信息

**Base URL**: `http://localhost:3001/api/v1`  
**认证方式**: Bearer Token（JWT）  
**响应格式**: JSON  
**日期格式**: ISO 8601 (`2026-06-23T10:30:00.000Z`)

---

## 通用响应结构

### 成功响应
```json
{
  "statusCode": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2026-06-23T10:30:00.000Z"
}
```

### 错误响应
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-06-23T10:30:00.000Z"
}
```

### 分页响应
```json
{
  "statusCode": 200,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

---

## Containers API

### GET /containers - 货柜列表
**Query Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |
| status | string | 否 | 物流状态过滤 |
| startDate | string | 否 | 开始日期（actual_ship_date） |
| endDate | string | 否 | 结束日期 |

**示例**:
```bash
GET /containers?page=1&pageSize=20&status=picked_up&startDate=2026-06-01&endDate=2026-06-30
```

**响应**:
```json
{
  "data": {
    "items": [
      {
        "containerNumber": "MSKU1234567",
        "logisticsStatus": "picked_up",
        "etaDestPort": "2026-06-20T00:00:00.000Z",
        "ataDestPort": "2026-06-19T08:30:00.000Z"
      }
    ],
    "total": 150,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### GET /containers/:containerNumber - 货柜详情
**Path Parameters**:
- `containerNumber`: 柜号

**响应**:
```json
{
  "data": {
    "containerNumber": "MSKU1234567",
    "billOfLadingNumber": "BL123456",
    "logisticsStatus": "at_port",
    "etaDestPort": "2026-06-20T00:00:00.000Z",
    "ataDestPort": "2026-06-19T08:30:00.000Z",
    "portOperations": {
      "lastFreeDate": "2026-06-26",
      "availableTime": "2026-06-20T10:00:00.000Z"
    },
    "truckingTransport": {
      "pickupDate": null,
      "plannedPickupDate": "2026-06-22"
    }
  }
}
```

---

### POST /containers - 创建货柜
**Request Body**:
```json
{
  "container_number": "MSKU1234567",
  "bill_of_lading_number": "BL123456",
  "eta_dest_port": "2026-06-20"
}
```

**注意**: 请求体使用snake_case，后端自动转换为camelCase

---

### PUT /containers/:containerNumber - 更新货柜
**Request Body**:
```json
{
  "eta_dest_port": "2026-06-21"
}
```

---

### DELETE /containers/:containerNumber - 删除货柜
**注意**: 软删除，不物理删除数据

---

### GET /containers/statistics - 货柜统计
**Query Parameters**: 同列表接口

**响应**:
```json
{
  "data": {
    "total": 1000,
    "byStatus": {
      "not_shipped": 200,
      "shipped": 300,
      "at_port": 250,
      "picked_up": 150,
      "unloaded": 80,
      "returned_empty": 20
    },
    "demurrageAlerts": {
      "critical": 5,
      "high": 12,
      "medium": 25
    }
  }
}
```

---

### POST /containers/update-statuses/batch - 批量更新状态
**Request Body**:
```json
{
  "container_numbers": ["MSKU1234567", "MSKU7654321"],
  "status": "picked_up"
}
```

---

## Demurrage API

### POST /demurrage/calculate - 计算滞港费
**Request Body**:
```json
{
  "container_number": "MSKU1234567",
  "mode": "actual"  // actual or forecast
}
```

**响应**:
```json
{
  "data": {
    "containerNumber": "MSKU1234567",
    "mode": "actual",
    "startDate": "2026-06-15",
    "endDate": "2026-06-25",
    "freeDays": 7,
    "overdueDays": 3,
    "totalFee": 300,
    "currency": "USD",
    "breakdown": [
      {
        "tier": 1,
        "days": 3,
        "rate": 100,
        "amount": 300
      }
    ]
  }
}
```

---

### GET /demurrage/alerts - 滞港费预警列表
**Query Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| severity | string | 否 | 预警级别（critical/high/medium/low） |

**响应**:
```json
{
  "data": [
    {
      "containerNumber": "MSKU1234567",
      "alertType": "DEMURRAGE_EXPIRED",
      "severity": "critical",
      "daysOverdue": 5,
      "estimatedFee": 1500
    }
  ]
}
```

---

## Scheduling API

### POST /scheduling/intelligent - 智能排柜
**Request Body**:
```json
{
  "container_number": "MSKU1234567",
  "force_reschedule": false
}
```

**响应**:
```json
{
  "data": {
    "containerNumber": "MSKU1234567",
    "truckingCompanyCode": "TRUCK-CA-001",
    "warehouseCode": "CA-S003",
    "plannedPickupDate": "2026-06-22",
    "unloadModePlan": "Drop",
    "estimatedCost": 850
  }
}
```

---

### GET /scheduling/mappings - 查询映射关系
**Query Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| country_code | string | 是 | 国家代码 |

**响应**:
```json
{
  "data": [
    {
      "countryCode": "CA",
      "warehouseCode": "CA-S003",
      "truckingCompanyCode": "TRUCK-CA-001",
      "priority": 1,
      "isActive": true
    }
  ]
}
```

---

## FeiTuo API

### POST /feituo/sync/:containerNumber - 同步飞驼数据
**Path Parameters**:
- `containerNumber`: 柜号

**响应**:
```json
{
  "data": {
    "containerNumber": "MSKU1234567",
    "eventsSynced": 15,
    "statusUpdated": true,
    "newStatus": "at_port"
  }
}
```

---

### GET /feituo/events/:containerNumber - 查询飞驼事件
**Path Parameters**:
- `containerNumber`: 柜号

**响应**:
```json
{
  "data": [
    {
      "statusCode": "PCAB",
      "eventTime": "2026-06-19T08:30:00.000Z",
      "location": "Los Angeles Port",
      "isEstimated": false
    }
  ]
}
```

---

## Import API

### POST /import/excel - Excel导入
**Content-Type**: `multipart/form-data`

**Form Data**:
| 字段 | 类型 | 说明 |
|------|------|------|
| file | File | Excel文件 |
| import_type | string | 导入类型（container/port_operation等） |

**响应**:
```json
{
  "data": {
    "batchId": "batch-123",
    "totalRecords": 100,
    "successCount": 95,
    "failureCount": 5,
    "errors": [
      {
        "row": 10,
        "field": "container_number",
        "message": "Invalid format"
      }
    ]
  }
}
```

---

### GET /import/batch/:batchId - 查询导入批次状态
**Path Parameters**:
- `batchId`: 批次ID

**响应**:
```json
{
  "data": {
    "batchId": "batch-123",
    "status": "completed",
    "importTime": "2026-06-23T10:30:00.000Z",
    "recordCount": 100,
    "successCount": 95,
    "failureCount": 5
  }
}
```

---

## Dict API

### GET /dict/countries - 国家字典
**响应**:
```json
{
  "data": [
    {
      "code": "US",
      "nameCn": "美国",
      "nameEn": "United States",
      "region": "North America"
    }
  ]
}
```

### GET /dict/warehouses - 仓库字典
**Query Parameters**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| country | string | 否 | 按国家过滤 |

---

## 错误码

| 状态码 | 含义 | 常见原因 |
|--------|------|---------|
| 400 | Bad Request | 参数验证失败 |
| 401 | Unauthorized | Token过期或无效 |
| 403 | Forbidden | 权限不足 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 数据冲突（如重复柜号） |
| 500 | Internal Server Error | 服务器内部错误 |

---

## 认证

### 获取Token
```bash
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**响应**:
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  }
}
```

### 使用Token
```bash
GET /containers
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## 参考文档

- 路由定义: `backend/src/routes/index.ts`
- Controller: `backend/src/controllers/*.controller.ts`
- DTO定义: `backend/src/dto/*.dto.ts`

---

**维护者**: LogiX Team  
**最后更新**: 2026-06-23
