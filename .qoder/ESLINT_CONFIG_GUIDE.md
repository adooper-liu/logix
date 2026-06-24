# ESLint 配置

## 核心规则

### TypeScript

```javascript
'@typescript-eslint/no-explicit-any': 'error'           // 禁止any
'@typescript-eslint/no-floating-promises': 'error'      // 必须处理Promise
'@typescript-eslint/typedef': ['warn', {                 // 强制类型注解
  parameter: true,
  propertyDeclaration: true
}]
```

### 复杂度控制

```javascript
'max-lines-per-function': ['warn', { max: 50 }]         // 函数≤50行
'max-lines': ['warn', { max: 300 }]                     // 文件≤300行
'complexity': ['warn', 10]                              // 圈复杂度≤10
'max-depth': ['warn', 4]                                // 嵌套≤4层
'max-nested-callbacks': ['warn', 3]                     // 回调≤3层
```

### 代码风格

```javascript
'no-console': 'error'                                   // 禁止console.log
'no-non-null-assertion': 'warn'                         // 警告使用!
```

## 常用命令

```bash
npm run lint          # 检查
npm run lint:fix      # 自动修复
npx eslint src --format html --output-file report.html  # 生成报告
```

## 常见问题处理

### any类型

```typescript
// 逐步替换，紧急情况下临时禁用
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = await fetchData(); // TODO: 定义具体类型
```

### 长函数拆分

```typescript
// ❌ 错误
async function processContainer(container: Container) {
  // 50+ 行代码
}

// ✅ 正确
async function processContainer(container: Container) {
  validateContainer(container);
  const cost = await calculateCost(container);
  await updateStatus(container);
}
```

### 降低圈复杂度

```typescript
// ❌ 高复杂度
function getDiscount(user: User, order: Order): number {
  if (user.isVip && order.total > 1000 && order.items.length > 5) {
    return 0.2;
  }
  // ...
}

// ✅ 提取条件
function getDiscount(user: User, order: Order): number {
  if (isVipWithLargeOrder(user, order)) {
    return getVipDiscount(order);
  }
  return 0;
}
```

### Promise处理

```typescript
// ❌ floating promise
containers.forEach(c => updateStatus(c.id));

// ✅ 等待所有
await Promise.all(containers.map(c => updateStatus(c.id)));
```

## 监控指标

```bash
# any类型数量
grep -rn ": any" backend/src --include="*.ts" | wc -l

# 长函数
find backend/src -name "*.ts" -exec awk '/^.*function.*\{$/,/^\}$/ {if (++count > 50) print FILENAME ":" NR}' {} +

# 高复杂度
npx eslint backend/src --rule 'complexity: error' 2>&1 | grep "complexity"
```

## 目标

| 指标 | 当前 | 目标 |
|------|------|------|
| any使用 | ~100次 | 0次 |
| 长函数 | ~50个 | 0个 |
| 高复杂度 | ~30个 | 0个 |
| console.log | ~20处 | 0处 |
