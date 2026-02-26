# Excel导入功能使用指南

**更新日期**: 2026-02-26
**功能**: 一次正确导入Excel数据，无需后续SQL修复

---

## ✨ 核心特性

- ✅ 支持多港经停（起运港、途经港、目的港）
- ✅ 自动生成3条港口操作记录
- ✅ 完整的还空箱记录导入
- ✅ 多种日期格式支持
- ✅ 详细的调试日志

---

## 🚀 快速开始

### 1. 准备Excel文件

**必填字段**:
- 集装箱号
- 备货单号

**还空箱必填字段**（如果物流状态为"已还箱"）:
- 还箱日期

**港口操作字段**（自动生成3条记录）:
- 起运港 → 自动生成 `origin` 类型
- 途经港 → 自动生成 `transit` 类型
- 目的港 → 自动生成 `destination` 类型

### 2. 导入步骤

1. **打开导入页面**
   - 访问 http://localhost:5173/import

2. **上传Excel文件**
   - 拖拽或选择文件
   - 支持格式：`.xlsx`, `.xls`

3. **解析Excel**
   - 点击"解析Excel"
   - 查看预览数据

4. **检查数据**（重要！）
   - **打开浏览器控制台（F12）**
   - 查看以下日志：
     ```
     [splitRowToTables] 港口操作数量: 3
     [splitRowToTables] 还空箱字段: [...]
     [splitRowToTables] 还空箱数据: {...}
     ```
   - 确认数据正确

5. **导入数据库**
   - 点击"导入数据库"
   - 等待完成

6. **验证结果**
   - 查看导入结果摘要
   - 如有错误，查看详情

### 3. 验证数据

```bash
# 运行验证脚本
pwsh -File scripts/verify-data.ps1
```

---

## 📝 Excel字段映射

### 必填字段

| Excel列名 | 数据库表 | 字段 | 必填 |
|-----------|---------|------|------|
| 集装箱号 | containers | containerNumber | ✅ |
| 备货单号 | replenishment_orders | orderNumber | ✅ |
| 还箱日期 | empty_returns | returnTime | ✅* |

*当物流状态为"已还箱"时必填

### 港口操作字段（自动生成3条记录）

| Excel列名 | 港口类型 | 数据库字段 | 示例 |
|-----------|---------|-----------|------|
| 起运港 | origin | portCode/portName | 宁宁 |
| 途经港 | transit | portCode/portName | 温哥华 |
| 途经港到达日期 | transit | transitArrivalDate | 2025-05-05 05:34:00 |
| 目的港 | destination | portCode/portName | 多伦多 |
| 预计到港日期 | destination | etaDestPort | 2025-05-09 00:00:00 |
| 目的港到达日期 | destination | ataDestPort | 2025-05-17 00:18:00 |

### 日期字段格式

```
✅ 2025-06-29 20:52:47
✅ 2025-06-29
✅ 2025/06/29
✅ 20250629
✅ Excel日期数字
```

---

## 🔍 故障排查

### 问题: 还空箱记录未导入

**检查**:
1. 控制台是否显示 `[splitRowToTables] 还空箱数据: {...}`？
2. Excel中"还箱日期"列是否有值？

**解决**:
- 确保Excel中"还箱日期"列有值
- 检查日期格式是否符合规范

### 问题: 途经港未导入

**检查**:
1. 控制台是否显示 `[splitRowToTables] 港口操作数量: 3`？
2. Excel中"途经港"列是否有值？

**解决**:
- 确保Excel中"途经港"列有值
- 检查"途经港到达日期"格式

### 问题: 日期字段为空

**检查**:
1. 控制台是否有 `parseDate` 警告？
2. Excel中日期格式是否正确？

**解决**:
- 修改Excel日期格式为 `YYYY-MM-DD HH:mm:ss`
- 或使用简单的 `YYYY-MM-DD` 格式

---

## 📊 导入结果验证

### 检查还空箱记录

```sql
SELECT * FROM process_empty_returns
WHERE "containerNumber" = 'FANU3376528';
-- ✅ 应有1条记录
```

### 检查港口操作记录

```sql
SELECT port_type, port_name, port_sequence
FROM process_port_operations
WHERE container_number = 'FANU3376528'
ORDER BY port_sequence;
-- ✅ 应有3条记录：
--    1. origin: 宁宁
--    2. transit: 温哥华
--    3. destination: 多伦多
```

### 检查海运表日期

```sql
SELECT eta, ata, shipment_date
FROM process_sea_freight
WHERE container_number = 'FANU3376528';
-- ✅ eta、ata、shipment_date 不应为NULL
```

---

## 📞 技术支持

### 查看日志

- **前端**: 浏览器控制台（F12）
- **后端**: `backend/logs/app.log`

### 常见问题

Q: 支持批量导入吗？
A: 是的，单次最多导入1000条

Q: 导入失败会回滚吗？
A: 是的，使用事务保证数据一致性

Q: 可以重复导入同一个货柜吗？
A: 可以，会更新已有记录

---

**最后更新**: 2026-02-26
**功能状态**: ✅ 生产就绪
