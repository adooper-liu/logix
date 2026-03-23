# D-常见问题 FAQ 🔧

**创建日期**: 2026-03-23  
**用途**: 新人入门、问题解决

---

## 📋 目录

1. [环境搭建问题](#1-环境搭建问题)
2. [开发流程问题](#2-开发流程问题)
3. [业务逻辑问题](#3-业务逻辑问题)
4. [技术难点问答](#4-技术难点问答)

---

## 1. 环境搭建问题

### Q1: 如何启动后端服务？

```bash
cd backend
npm install
npm run dev
```

服务启动后访问 `http://localhost:3000`

### Q2: 如何启动前端服务？

```bash
cd frontend
npm install
npm run dev
```

服务启动后访问 `http://localhost:5173`

### Q3: 数据库连接失败怎么办？

1. 检查 `.env` 文件配置
2. 确认 PostgreSQL 服务已启动
3. 验证用户名密码正确

```bash
# 测试数据库连接
psql -h localhost -U logix_user -d logix_db
```

### Q4: 前端依赖安装失败？

```bash
# 清理缓存后重试
rm -rf node_modules package-lock.json
npm install
```

### Q5: 如何查看后端日志？

```bash
# 开发环境日志
tail -f backend/logs/development.log

# 错误日志
tail -f backend/logs/error.log
```

---

## 2. 开发流程问题

### Q6: 如何添加一个新的数据库表？

1. 在 `backend/03_create_tables.sql` 中添加表结构
2. 运行 SQL 创建表
3. 在 `backend/src/entities/` 中创建对应实体
4. 在 `backend/src/database/index.ts` 中注册实体

### Q7: 如何添加一个新的 API 接口？

1. 在对应 Controller 中添加方法
2. 在对应 Routes 中注册路由
3. 在前端 `services/` 中添加调用方法
4. 在前端 `types/` 中添加类型定义

### Q8: 如何运行数据库 Migration？

```bash
cd backend
npm run migration:run
```

### Q9: 如何重置数据库？

```bash
# 停止服务
npm run schema:drop    # 删除所有表
npm run migration:run # 重新创建
```

### Q10: 如何导入测试数据？

```bash
# 使用 Excel 导入
curl -X POST "http://localhost:3000/api/v1/import/containers" \
  -F "file=@test_data/containers.xlsx"
```

---

## 3. 业务逻辑问题

### Q11: 什么是物流状态机？

物流状态机定义货柜的生命周期状态：

```
not_shipped → shipped → in_transit → at_port → picked_up → unloaded → returned_empty
```

参考文档: [06-物流状态机](../05-专属领域知识/06-物流状态机.md)

### Q12: 滞港费如何计算？

滞港费 = (实际天数 - 免费天数) × 日费率

参考文档: [05-滞港费计算](../05-专属领域知识/05-滞港费计算.md)

### Q13: 智能排柜如何工作？

1. 获取待排产货柜
2. 按 ETA 排序（先到先得）
3. 计算计划日期
4. 校验容量约束
5. 保存计划

参考文档: [02-智能排柜系统](../05-专属领域知识/02-智能排柜系统.md)

### Q14: 甘特图有哪些筛选维度？

- 按到港
- 按 ETA
- 按计划提柜
- 按最晚提柜

参考文档: [03-甘特图可视化](../05-专属领域知识/03-甘特图可视化.md)

### Q15: 飞驼数据如何同步？

飞驼通过 API 推送数据，后端接收后：
1. 解析状态事件
2. 更新核心字段
3. 重新计算物流状态

参考文档: [01-飞驼系统集成](../05-专属领域知识/01-飞驼系统集成.md)

---

## 4. 技术难点问答

### Q16: TypeORM 实体命名与数据库不一致？

**问题**: 字段名自动转换导致查询失败

**解决**: 在 `@Column` 装饰器中显式指定 `name` 参数

```typescript
// ❌ 错误
@Column()
containerNumber: string;

// ✅ 正确
@Column({ name: 'container_number' })
containerNumber: string;
```

### Q17: 日期筛选结果不正确？

**问题**: JavaScript Date 对象有时区问题

**解决**: 使用字符串格式传递日期参数

```typescript
// ❌ 错误
const startDate = new Date('2026-01-01');

// ✅ 正确
const startDate = '2026-01-01';
```

### Q18: 筛选条件映射错误？

**问题**: 前后端筛选条件不匹配

**解决**: 使用统一的常量定义

参考文档: [筛选条件统一常量方案](筛选条件统一常量方案.md)

### Q19: Excel 导入失败？

**检查项**:
1. 文件格式是否为 .xlsx 或 .xls
2. 是否包含必要的列
3. 数据类型是否正确
4. 是否有重复的主键

### Q20: 如何优化慢查询？

1. 使用 EXPLAIN 分析查询计划
2. 添加适当索引
3. 使用批量查询替代循环
4. 考虑分页查询

```sql
-- 分析查询
EXPLAIN ANALYZE SELECT * FROM biz_containers 
WHERE destination_port = 'USLAX';
```

### Q21: 前端组件加载失败？

**检查项**:
1. 组件路径是否正确
2. 是否正确导出组件
3. 是否正确注册路由

### Q22: 如何处理并发冲突？

**方案**:
1. 使用数据库事务
2. 添加乐观锁（version 字段）
3. 使用分布式锁（Redis）

### Q23: 如何确保数据一致性？

**最佳实践**:
1. 事务中执行相关操作
2. 前后端双重验证
3. 定期数据校验

### Q24: 如何添加新的预警规则？

1. 在 `alertService.ts` 中添加规则逻辑
2. 配置预警触发条件
3. 在前端添加对应的警告标识

参考文档: [04-智能预警系统](../05-专属领域知识/04-智能预警系统.md)

### Q25: 前端如何处理国际化？

```typescript
// 使用 t 函数
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

<template>
  <span>{{ t('container.status') }}</span>
</template>
```

---

## 📚 相关文档

- [06-技术与开发规范](../06-技术与开发规范.md)
- [07-SKILL 体系与 AI 集成](../07-SKILL体系与AI集成.md)
- [附录 B-API 端点速查表](./B-API端点速查表.md)
- [附录 C-错误代码大全](./C-错误代码大全.md)

---

**返回**: [README](./README.md)
