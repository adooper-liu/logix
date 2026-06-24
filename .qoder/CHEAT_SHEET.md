# LogiX 速查卡

## 核心原则

1. **单一职责** - 函数≤50行，文件≤300行
2. **类型安全** - 禁止any
3. **数据库优先** - SQL → Entity → Service → API
4. **依赖倒置** - 面向接口
5. **纯函数优先** - 业务逻辑无副作用

## 禁止事项

- any类型
- console.log提交代码
- Controller写业务逻辑
- 硬编码魔法数字

## 提交前检查

```bash
npm run validate      # TypeScript + ESLint + 命名规范
npm test -- --coverage
grep -r "TODO\|FIXME" src/
```

## 模块目录结构

```
backend/src/domain/{module}/
├── {Module}Entity.ts
├── {Module}Validator.ts
├── {Module}Calculator.ts    # 纯函数
├── {Module}Resolver.ts
└── __tests__/{Module}.test.ts
```

## 核心表

**业务表**: biz_containers, biz_replenishment_orders, biz_customers, biz_container_skus  
**流程表**: process_sea_freight, process_port_operations, process_trucking_transport, process_warehouse_operations, process_empty_return  
**映射表**: dict_port_warehouse_mapping, dict_warehouse_trucking_mapping, dict_trucking_port_mapping

## 状态机优先级

还空箱 > WMS卸柜 > 提柜 > 目的港ATA > 中转港ATA > 海运出运 > 未出运

## 常用命令

```bash
npm run type-check
npm run lint:fix
npm test -- {pattern}
git checkout -b refactor/{module}
```

## 查找问题

```bash
# 大文件
find backend/src -name "*.ts" -exec wc -l {} + | sort -rn | head -10

# any类型
grep -rn ": any" backend/src --include="*.ts"

# TODO
grep -rn "TODO\|FIXME" backend/src --include="*.ts"
```

## 质量目标

| 指标 | 当前 | 目标 |
|------|------|------|
| 文件行数 | 450 | ≤300 |
| 函数行数 | 80 | ≤50 |
| any使用 | 25次 | 0次 |
| 测试覆盖 | 30% | ≥75% |
