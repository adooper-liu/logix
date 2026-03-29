# 高费用货柜性能优化方案

## 一、写回时保存 destination_port

### 设计思路

在 `batchComputeAndSaveRecords` 写回 `ext_demurrage_records` 时，将货柜目的港一并写入，高费用货柜读取时直接使用，避免二次查询。

### 实现要点

| 层级 | 修改 |
|------|------|
| **数据库** | `ext_demurrage_records` 新增 `destination_port VARCHAR(100)` |
| **实体** | `ExtDemurrageRecord` 新增 `destinationPort` 字段 |
| **写回** | `saveCalculationToRecords` 增加可选参数 `destinationPort`；`batchComputeAndSaveRecords` 在循环前批量预取目的港，写回时传入 |
| **读取** | `getTopContainersFromRecords` 的 SELECT 增加 `MAX(r.destination_port)`，优先使用；仅当 `destination_port` 为空（旧数据）时才回退到 `getDestinationPortsForContainers` |

### 迁移

```bash
psql -h localhost -U logix_user -d logix_db -f backend/migrations/add_destination_port_to_demurrage_records.sql
```

### 效果

- **缓存路径**：从 2 次查询（记录聚合 + 港口批量查询）→ 1 次查询（记录聚合含 destination_port）
- **旧数据**：`destination_port` 为 NULL 时自动回退到港口批量查询，兼容历史记录

---

## 二、实时路径优化

### 1. 并发计算

原逻辑：串行执行 `calculateForContainer(cn)`，最多 500 次。

优化：每批 10 个并发执行，`Promise.all` 等待一批完成后再处理下一批。

```typescript
const CONCURRENCY = 10;
for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
  const batch = toProcess.slice(i, i + CONCURRENCY);
  const batchResults = await Promise.all(batch.map(cn => calculateForContainer(cn)));
  // ...
}
```

### 2. 降低处理上限

- 原：`limit = Math.min(500, totalInRange)`
- 新：`limit = Math.min(200, totalInRange)`
- 理由：优先依赖缓存；实时路径作为兜底，减少超时风险

### 3. 效果预期

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 串行等待 | 500 × T | 20 批 × T（每批 10 并发） |
| 理论耗时 | 500T | ~50T（假设 T 为单柜耗时） |
| 处理上限 | 500 | 200 |

---

## 三、建议

1. **执行迁移**：部署前执行 `add_destination_port_to_demurrage_records.sql`
2. **定时任务**：写回任务会逐步填充 `destination_port`，历史数据会随下次写回自动补齐
3. **监控**：若仍出现超时，可进一步降低 `limit` 或 `CONCURRENCY`
