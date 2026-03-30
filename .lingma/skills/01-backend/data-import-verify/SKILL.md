---
name: data-import-verify
description: 验证数据导入完整性并清理测试数据。使用此skill检查货柜、备货单、海运及流程表的数据导入状态，或清理测试数据。
---

# 数据导入验证

## 验证脚本

运行数据导入完整性验证脚本，检查各表记录数和关联关系：

```bash
cd d:/Gihub/logix && docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db < scripts/verify-import-data.sql
```

验证内容包括：
1. 核心表记录数统计（备货单、货柜、海运、港口操作、拖卡运输、仓库操作、还空箱）
2. 备货单与货柜关联检查
3. 货柜与海运信息关联检查
4. 货柜物流状态分布
5. 各表详细数据检查
6. 数据完整性问题检查

## 清理测试数据

运行清理脚本删除测试数据（使用事务确保完整性）：

```bash
cd d:/Gihub/logix && docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db < scripts/cleanup-test-data.sql
```

清理顺序：
1. 流程子表（港口操作、拖卡运输、仓库操作、还空箱）
2. 备货单
3. 货柜
4. 海运信息

## 脚本位置

- 验证脚本：`scripts/verify-import-data.sql`
- 清理脚本：`scripts/cleanup-test-data.sql`

## 注意事项

- 清理前请确认数据为测试数据
- 清理脚本使用事务确保外键完整性
- 港口操作表字段名：`eta`/`ata`（非 `eta_dest_port`/`ata_dest_port`）
- 海运表字段名：`shipping_company_id`/`freight_forwarder_id`（非 `shipping_company`/`freight_forwarder`）
