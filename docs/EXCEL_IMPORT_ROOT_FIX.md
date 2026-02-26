# Excel导入根本性修复说明

**修复目标**: 确保Excel数据能够**一次正确导入**，无需后续SQL补数据

---

## 🔍 根本问题分析

### 问题1: 还空箱记录缺失
**原因**: `splitRowToTables`函数中，`empty_returns`表的数据映射**顺序问题**
- 虽然字段映射存在
- 但在处理港口操作时可能跳过了其他表的处理

### 问题2: 途经港信息缺失
**原因**: 原逻辑只创建单条`destination`类型港口记录
- 不支持`origin`（起运港）
- 不支持`transit`（途经港）

### 问题3: 日期字段为空
**原因**: 日期解析函数支持的格式有限
- 只支持简单格式
- 不支持常见的Excel日期格式

---

## ✅ 根本性修复方案

### 修复1: 重构`splitRowToTables`函数

**关键改动**:

1. **先处理所有字段映射**（包括还空箱）
   ```typescript
   // 先处理FIELD_MAPPINGS中的所有字段
   FIELD_MAPPINGS.forEach(mapping => {
     // 处理每个表的字段，包括empty_returns
     if (tables[mapping.table]) {
       tables[mapping.table][mapping.field] = value
     }
   })
   ```

2. **再单独处理港口操作**（支持多港经停）
   ```typescript
   // 分别生成origin、transit、destination三条记录
   const portOperations = [
     { portType: 'origin', ... },
     { portType: 'transit', ... },
     { portType: 'destination', ... }
   ]
   ```

3. **添加详细调试日志**
   ```typescript
   console.log('[splitRowToTables] 还空箱字段:', Object.keys(tables.empty_returns))
   console.log('[splitRowToTables] 还空箱数据:', tables.empty_returns)
   ```

### 修复2: 增强日期解析函数

**支持的日期格式**:
```
✅ YYYY-MM-DD HH:mm:ss  (2025-06-29 20:52:47)
✅ YYYY-MM-DD HH:mm     (2025-06-29 20:52)
✅ YYYY-MM-DD           (2025-06-29)
✅ YYYY/MM/DD HH:mm:ss  (2025/06/29 20:52:47)
✅ YYYY/MM/DD           (2025/06/29)
✅ YYYYMMDD             (20250629)
✅ DD-MM-YYYY / DD/MM/YYYY
✅ Excel日期数字（自动转换）
```

### 修复3: 后端支持数组格式港口操作

**改动**:
```typescript
// 支持数组形式的港口操作
if (Array.isArray(portData)) {
  for (const port of portData) {
    // 处理每条港口记录
  }
}
```

### 修复4: 增强日志记录

**前端日志**:
```
[splitRowToTables] 映射字段: 还箱日期 -> empty_returns.returnTime 2025-06-29T12:52:47.000Z
[splitRowToTables] 还空箱字段: ['containerNumber', 'returnTime', 'lastReturnDate']
[splitRowToTables] 还空箱数据: { containerNumber: 'FANU3376528', returnTime: '...', ... }
```

**后端日志**:
```
[Import] 处理还空箱: FANU3376528
[Import] 还空箱数据详情: { containerNumber: 'FANU3376528', returnTime: '2025-06-29T12:52:47.000Z', ... }
[Import] 新增还空箱记录: FANU3376528
```

---

## 🚀 使用方法

### 步骤1: 确保代码已更新

确保以下文件已修改：
- ✅ `frontend/src/views/import/ExcelImport.vue`
- ✅ `backend/src/controllers/import.controller.ts`

### 步骤2: 重启服务

```bash
# 后端
cd backend
npm run dev

# 前端（新终端）
cd frontend
npm run dev
```

### 步骤3: 导入Excel

1. 打开 http://localhost:5173/import
2. 上传Excel文件
3. 点击"解析Excel"
4. **打开浏览器控制台（F12）**，查看调试日志
5. 确认以下内容：
   - `[splitRowToTables] 还空箱字段: [...]` 应显示字段
   - `[splitRowToTables] 还空箱数据: {...}` 应显示数据
   - `[splitRowToTables] 港口操作数量: 3` 应有3条记录
6. 点击"导入数据库"
7. 查看导入结果

### 步骤4: 验证数据

```bash
pwsh -File scripts/verify-data.ps1
```

---

## 📊 预期结果

### 正确导入后的数据

#### 还空箱表
```sql
SELECT * FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528';
-- ✅ 应有1条记录
-- ✅ returnTime = '2025-06-29 20:52:47'
```

#### 港口操作表
```sql
SELECT port_type, port_name, port_sequence 
FROM process_port_operations 
WHERE container_number = 'FANU3376528'
ORDER BY port_sequence;
-- ✅ 应有3条记录
-- ✅ origin: 宁宁 (sequence=1)
-- ✅ transit: 温哥华 (sequence=2)
-- ✅ destination: 多伦多 (sequence=3)
```

#### 海运表
```sql
SELECT shipment_date, eta, ata, mother_shipment_date
FROM process_sea_freight
WHERE container_number = 'FANU3376528';
-- ✅ eta = '2025-05-09 00:00:00'
-- ✅ ata = '2025-05-17 00:18:00'
-- ✅ shipment_date = '2025-04-07'
```

---

## 🔍 故障排查

### 问题1: 还空箱记录仍然缺失

**检查步骤**:
1. 浏览器控制台是否显示 `[splitRowToTables] 还空箱数据: {...}`？
2. Excel中是否有"还箱日期"列？
3. "还箱日期"值是否为空？

**解决方法**:
- 如果控制台没有显示还空箱数据，说明Excel中该列为空
- 检查Excel文件，确保"还箱日期"列有值

### 问题2: 途经港未导入

**检查步骤**:
1. 控制台是否显示 `[splitRowToTables] 添加途经港: 温哥华`？
2. `[splitRowToTables] 港口操作数量: 3`？

**解决方法**:
- 检查Excel中"途经港"列是否有值
- 确认"途经港到达日期"格式正确

### 问题3: 日期字段为空

**检查步骤**:
1. 控制台是否有 `parseDate` 警告？
2. Excel中日期格式是否符合规范？

**解决方法**:
- 参考上文"支持的日期格式"
- 修改Excel日期格式为 `YYYY-MM-DD HH:mm:ss`

---

## 📝 Excel数据要求

### 必填字段（单条记录）

| 列名 | 示例 | 说明 |
|------|------|------|
| 集装箱号 | FANU3376528 | 必填 |
| 备货单号 | 24DSC4914 | 必填 |

### 可选字段（还空箱）

| 列名 | 示例 | 格式 |
|------|------|------|
| 还箱日期 | 2025-06-29 20:52:47 | 必填（如果状态为已还箱）|
| 最晚还箱日期 | 2025-05-30 | YYYY-MM-DD |
| 计划还箱日期 | 2025-05-28 | YYYY-MM-DD |
| 还箱地点 | 多伦多码头 | 文本 |

### 港口操作字段

| 列名 | 示例 | 说明 |
|------|------|------|
| 起运港 | 宁宁 | 自动生成origin记录 |
| 途经港 | 温哥华 | 自动生成transit记录 |
| 途经港到达日期 | 2025-05-05 05:34:00 | 关联到transit记录 |
| 目的港 | 多伦多 | 自动生成destination记录 |
| 预计到港日期 | 2025-05-09 00:00:00 | 关联到destination记录 |
| 目的港到达日期 | 2025-05-17 00:18:00 | 关联到destination记录 |

---

## 🎯 核心改进

### 修复前
- ❌ 港口操作只有1条记录（destination）
- ❌ 还空箱记录可能丢失
- ❌ 日期解析失败
- ❌ 需要后续SQL补数据

### 修复后
- ✅ 港口操作自动生成3条记录
- ✅ 还空箱数据正确映射
- ✅ 日期解析支持多种格式
- ✅ **一次导入即可完成，无需后续处理**

---

**修复完成**: 2026-02-26
**修复方式**: 根本性修复导入逻辑
**适用版本**: LogiX v1.0
