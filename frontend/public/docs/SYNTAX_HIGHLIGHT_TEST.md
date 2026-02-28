# Shiki 语法高亮测试

本文档用于测试 Shiki 语法高亮功能。

## Bash 代码块

```bash
curl -X POST http://localhost:3000/api/external/sync/MRKU4896861 \
  -H "Content-Type: application/json" \
  -d '{"dataSource": "Feituo"}'
```

```bash
npm install shiki
cd frontend && npm run dev
```

## TypeScript 代码块

```typescript
import { Entity, PrimaryColumn, Column } from 'typeorm'

@Entity('biz_containers')
export class Container {
  @PrimaryColumn()
  containerNumber: string

  @Column({ name: 'order_number' })
  orderNumber: string

  @Column({ type: 'varchar', length: 10 })
  logisticsStatus: string
}
```

## SQL 代码块

```sql
SELECT 
    c.container_number,
    c.logistics_status,
    p.port_name,
    p.port_type
FROM biz_containers c
LEFT JOIN port_operations p ON c.container_number = p.container_number
WHERE c.logistics_status = 'in_transit'
    AND p.port_type = 'destination';
```

## JSON 代码块

```json
{
  "containerNumber": "MRKU4896861",
  "orderNumber": "PO20240228001",
  "logisticsStatus": "in_transit",
  "portOperations": [
    {
      "portCode": "USLGB",
      "portName": "Los Angeles",
      "portType": "destination"
    }
  ]
}
```

## Python 代码块

```python
def calculate_demurrage(eta, ata, free_days, daily_rate):
    """计算滞港费"""
    if not ata:
        return 0
    import datetime
    arrival_date = datetime.datetime.strptime(ata, '%Y-%m-%d')
    free_date = arrival_date + datetime.timedelta(days=free_days)
    today = datetime.datetime.now()
    if today <= free_date:
        return 0
    extra_days = (today - free_date).days
    return extra_days * daily_rate
```

## YAML 代码块

```yaml
server:
  port: 3001
  host: 0.0.0.0

database:
  host: localhost
  port: 5432
  username: logix_user
  database: logix_db

logging:
  level: info
  format: json
```

## JavaScript 代码块

```javascript
const express = require('express')
const app = express()

app.use(express.json())

app.get('/api/containers', async (req, res) => {
  const containers = await Container.find()
  res.json(containers)
})

app.listen(3001, () => {
  console.log('Server is running on port 3001')
})
```

## 行内代码测试

这是一个行内代码示例：`const x = 10` 和 `npm install shiki`。

## 对比

### 使用 Shiki 高亮后：
- 关键字有颜色区分（如 `import`, `const`, `function`）
- 字符串有独特的颜色（如 `'container_number'`, `"Feituo"`）
- 注释显示为灰色（如 `// 查询所有货柜`）
- 数字有特定的颜色
- 更易读、更专业

### 未使用高亮前：
- 所有代码都是浅灰色
- 无法区分关键字、字符串、注释
- 难以阅读和理解

## 结论

✅ Shiki 语法高亮已成功集成！
✅ 支持多种编程语言
✅ 代码更易读、更专业
