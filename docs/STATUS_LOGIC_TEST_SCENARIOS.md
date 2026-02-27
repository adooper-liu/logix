# 物流状态逻辑测试场景

## 测试目的

验证新的状态自动更新逻辑是否正确处理各种场景，特别是"有途经港但没有到达日期"的情况。

---

## 测试场景

### 场景 1: 有中转港，无到达日期

**Excel 数据**：
```
途经港: 上海
途经港到达日期: (空)
目的港: 萨凡纳
目的港到达日期: (空)
预计到港日期: 2026-03-06 07:00:00
物流状态（Excel）: 已出运
```

**期望结果**：
- `logistics_status`: `shipped` (已出运)
- `currentPortType`: `transit`
- 前端显示: "已出运"

**理由**：有中转港记录但没有到达时间，说明货物已经出运但在中转途中，应该显示为"已出运"。

---

### 场景 2: 有中转港 + 到达日期

**Excel 数据**：
```
途经港: 上海
途经港到达日期: 2026-02-02 09:37:00
目的港: 萨凡纳
目的港到达日期: (空)
```

**期望结果**：
- `logistics_status`: `at_port` (已到港)
- `currentPortType`: `transit`
- 前端显示: "到达中转港"

**理由**：中转港有到达时间，状态应为 `at_port`，前端根据 `port_type='transit'` 显示"到达中转港"。

---

### 场景 3: 有目的港 + 到达日期

**Excel 数据**：
```
途经港: (无)
目的港: 萨凡纳
目的港到达日期: 2026-03-07 10:30:00
预计到港日期: 2026-03-06 07:00:00
```

**期望结果**：
- `logistics_status`: `at_port` (已到港)
- `currentPortType`: `destination`
- 前端显示: "到达目的港"

**理由**：目的港有实际到达时间，状态应为 `at_port`，前端显示"到达目的港"。

---

### 场景 4: 有目的港，无到达日期

**Excel 数据**：
```
途经港: (无)
目的港: 萨凡纳
目的港到达日期: (空)
预计到港日期: 2026-03-06 07:00:00
出运日期: 2026-01-11 00:00:00
```

**期望结果**：
- `logistics_status`: `in_transit` (在途)
- `currentPortType`: `destination`
- 前端显示: "在途"

**理由**：有目的港记录但无到达时间，说明货物已出运并在前往目的港途中，应该显示为"在途"。

---

### 场景 5: 只有起运港，无其他港口

**Excel 数据**：
```
起运港: 南京
途经港: (无)
目的港: (无)
出运日期: 2026-01-11 00:00:00
```

**期望结果**：
- `logistics_status`: `shipped` (已出运)
- `currentPortType`: `origin`
- 前端显示: "已出运"

**理由**：只有出运信息，应该显示为"已出运"。

---

### 场景 6: 无任何港口信息

**Excel 数据**：
```
起运港: (无)
途经港: (无)
目的港: (无)
```

**期望结果**：
- `logistics_status`: `not_shipped` (未出运)
- `currentPortType`: `null`
- 前端显示: "未出运"

**理由**：没有任何出运信息，保持默认状态"未出运"。

---

## 状态判断优先级表

| 条件 | 结果状态 | 前端显示 | 场景编号 |
|------|---------|---------|---------|
| 目的港有 `ata_dest_port` | `at_port` | "到达目的港" | 场景 3 |
| 中转港有 `transit_arrival_date` | `at_port` | "到达中转港" | 场景 2 |
| 有目的港记录（无到达时间） | `in_transit` | "在途" | 场景 4 |
| 有中转港记录（无到达时间） | `shipped` | "已出运" | 场景 1 |
| 有出运日期 | `shipped` | "已出运" | 场景 5 |
| 无任何信息 | `not_shipped` | "未出运" | 场景 6 |

---

## 验证方法

### 方法 1: 查看后端日志

运行 `backend` 服务，查看日志输出：

```bash
cd backend
npm run dev
```

**期望看到的日志**：

```
[Container] MRKU4821517 Has transit port record, status = shipped
[Container] MRKU4821517 Will update logistics_status from not_shipped to shipped
[Container] MRKU4821517 Auto-applied logistics_status = shipped
```

### 方法 2: 查询数据库

```sql
SELECT
  container_number,
  logistics_status,
  port_type,
  port_name,
  transit_arrival_date,
  ata_dest_port
FROM biz_containers c
LEFT JOIN process_port_operations po ON c.container_number = po.container_number
WHERE c.container_number = 'MRKU4821517';
```

**期望结果**：

```
container_number | logistics_status | port_type | port_name | transit_arrival_date | ata_dest_port
MRKU4821517      | shipped          | transit    | 上海      | NULL                 | NULL
```

### 方法 3: 前端页面查看

1. 启动前端服务：
   ```bash
   cd frontend
   npm run dev
   ```

2. 访问 `http://localhost:5173/#/shipments`

3. 查找货柜 `MRKU4821517`，确认：
   - 物流状态列显示："已出运"
   - 位置列显示："上海 (中转)"

---

## 实施检查清单

- [x] 1. 创建状态机文档（`LOGISTICS_STATUS_STATE_MACHINE.md`）
- [x] 2. 修改 `container.controller.ts` 中的状态判断逻辑
- [ ] 3. 重启 backend 服务
- [ ] 4. 导入测试数据（MRKU4821517 货柜）
- [ ] 5. 验证后端日志输出
- [ ] 6. 查询数据库确认状态
- [ ] 7. 检查前端页面显示
- [ ] 8. 测试其他场景（场景 2-6）
- [ ] 9. 记录测试结果

---

## 回滚方案

如果新逻辑有问题，可以回滚到之前的逻辑：

```typescript
// 旧逻辑（只检查到达时间）
const hasArrivalTime = po.portType === 'transit'
  ? !!po.transitArrivalDate
  : !!po.ataDestPort;

if (hasArrivalTime && container.logisticsStatus !== 'at_port') {
  container.logisticsStatus = 'at_port';
}
```

---

**文档版本**：1.0
**创建日期**：2026-02-27
