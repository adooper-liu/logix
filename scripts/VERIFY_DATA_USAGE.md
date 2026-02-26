# LogiX 数据一致性验证脚本使用指南

## 📁 文件说明

- `verify_excel_data_consistency.sql` - 主SQL验证脚本
- `verify-data.ps1` - PowerShell执行脚本
- `verify-data.bat` - Windows批处理执行脚本

## 🚀 快速使用

### 方法1：直接执行PowerShell脚本（推荐）

```powershell
pwsh -File d:/Gihub/logix/scripts/verify-data.ps1
```

### 方法2：自定义参数执行

```powershell
# 修改脚本中的默认值后执行
pwsh -File d:/Gihub/logix/scripts/verify-data.ps1 `
  -OrderNumber "24DSC4914" `
  -ContainerNumber "FANU3376528" `
  -BillOfLading "HLCUNG12501WPWJ9"
```

### 方法3：直接执行SQL

```powershell
pwsh -Command "Get-Content 'd:/Gihub/logix/scripts/verify_excel_data_consistency.sql' -Raw | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db"
```

### 方法4：在psql中执行

```bash
docker exec -it logix-timescaledb-prod psql -U logix_user -d logix_db
\i /scripts/verify_excel_data_consistency.sql
```

## 📋 验证结果说明

脚本执行后输出以下内容：

### 1. 备货单信息
- 备货单号、主备货单号
- 销往国家、客户名称
- 备货单状态、查验状态
- 价格条款、箱数/体积/毛重
- 各类金额、贸易模式

### 2. 货柜信息
- 集装箱号、柜型
- 物流状态（7层流转）
- 查验状态、开箱状态

### 3. 海运信息
- 提单号、船公司、航次
- 起运港、目的港、途经港
- ETA/ATA等时间节点
- MBL/HBL/AMS单据号

### 4. 港口操作信息
- 港口类型（origin/transit/destination）
- 预计到港/实际到港日期
- 清关状态、ISF申报状态
- 免堆期/免费天数

### 5. 拖卡运输信息
- 预提状态、运输方式
- 提柜/送仓时间
- 卸柜方式

### 6. 仓库操作信息
- 仓库组、计划/实际仓库
- WMS/EBS入库状态
- 卸柜时间

### 7. 还空箱信息
- 还箱日期（重要）
- 最晚还箱日期
- 还箱码头

### 8. 港口字典映射
- 港口编码与名称对照

### 9. 关联关系验证
- ✅ 货柜-备货单关联
- ✅ 货柜-提单号关联
- ❌ 物流状态一致性检查

### 10. 数据完整性汇总
- 各表数据完整率百分比
- 已填充字段数/总字段数

## 🔍 问题诊断

根据验证结果分析数据问题：

| 问题类型 | 检查位置 | 示例 |
|---------|---------|------|
| 还空箱记录缺失 | 还空箱信息 + 关联关系验证 | 物流状态=已还箱但无还空箱记录 |
| 途经港信息缺失 | 港口操作信息 | 只有destination记录，无transit记录 |
| 时间节点为空 | 各模块时间字段 | ETA/ATA/提柜/送仓/卸柜/还箱日期为NULL |
| 字典数据不匹配 | 港口字典映射 | 编码存在但名称为空 |

## 📝 验证不同备货单

修改 `verify_excel_data_consistency.sql` 文件顶部的参数：

```sql
-- 修改这三行
WHERE order_number = '你的备货单号';
WHERE container_number = '你的货柜号';
WHERE "containerNumber" = '你的货柜号';
WHERE bill_of_lading_number = '你的提单号';
```

共需修改7处WHERE条件。

## ⚠️ 注意事项

1. 容器必须运行：`docker ps | grep logix-timescaledb-prod`
2. 字段名区分大小写：PostgreSQL列名需用双引号包裹（如 `"containerNumber"`）
3. 脚本输出中文可能乱码：不影响数据验证，可设置终端UTF-8编码

## 📞 使用示例

验证备货单 24DSC4914：

```powershell
# 执行验证
pwsh -Command "Get-Content 'd:/Gihub/logix/scripts/verify_excel_data_consistency.sql' -Raw | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db"

# 查看关键问题
- ✅ 备货单信息：52%完整（13/25字段）
- ❌ 还空箱记录：0%完整（记录不存在）
- ⚠️ 港口操作：10%完整（4/40字段）
```

---

创建日期：2026-02-26
适用版本：LogiX v1.0
