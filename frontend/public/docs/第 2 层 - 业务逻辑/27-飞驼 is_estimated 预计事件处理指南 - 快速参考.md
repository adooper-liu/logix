# 飞驼 is_estimated 预计事件处理 - 快速参考

## 🎯 一句话总结

**只有实际发生的事件 (isEstimated=false) 才能更新核心时间字段，预计事件 (isEstimated=true) 绝对不能更新。**

---

## 📊 快速决策表

| 场景     | isEstimated | 是否更新核心字段 | 理由     |
| -------- | ----------- | ---------------- | -------- |
| 实际提柜 | `false`     | ✅ **更新**      | 这是事实 |
| 预计提柜 | `true`      | ❌ **不更新**    | 这是预测 |
| 实际还箱 | `false`     | ✅ **更新**      | 这是事实 |
| 预计还箱 | `true`      | ❌ **不更新**    | 这是预测 |
| 实际到港 | `false`     | ✅ **更新**      | 这是事实 |
| 预计到港 | `true`      | ❌ **不更新**    | 这是预测 |

---

## 💻 代码检查点

### ✅ 正确的检查

```typescript
// 只处理非预计事件
if (!status.isEstimated && status.occurredAt) {
  await this.updateCoreFieldsFromStatus(...);
}
```

### ❌ 错误的检查

```typescript
// ❌ 禁止：即使是预计也要更新
if ((!status.isEstimated || isFinalStatus) && status.occurredAt) {
  await this.updateCoreFieldsFromStatus(...);
}
```

---

## 🔍 排查问题的正确姿势

### ✅ 正确的排查路径

1. **直接查询数据库**

   ```bash
   # 查原始事件
   node -e "SELECT * FROM ext_feituo_status_events WHERE container_number='HMMU6232153'"

   # 查核心字段
   node -e "SELECT gate_out_time FROM process_port_operations WHERE container_number='HMMU6232153'"
   ```

2. **对比 is_estimated 值**
   - `is_estimated: true` → 预计事件
   - `is_estimated: false` → 实际事件

3. **验证更新逻辑**
   - 检查代码是否有 `!status.isEstimated` 判断

### ❌ 浪费时间的错误路径

- ❌ 分析导入映射配置 (无关)
- ❌ 检查状态机计算逻辑 (无关)
- ❌ 研究 Controller 写入逻辑 (无关)
- ❌ 怀疑数据来源不一致 (可能一致)

---

## 📝 完整文档

详细文档见：[27-飞驼 is_estimated 预计事件处理指南.md](./27-飞驼 is_estimated 预计事件处理指南.md)

包含:

- ✅ 问题现象与完整排查过程
- ✅ is_estimated 的产生流程详解
- ✅ 应用逻辑与代码实现
- ✅ 可能出现的问题与解决方案
- ✅ 经验教训与最佳实践
- ✅ 测试验证方法

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**作者**: 刘志高
